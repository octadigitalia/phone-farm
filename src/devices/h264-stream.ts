import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'node:http';
import { spawn, type ChildProcess } from 'node:child_process';
import { ADB_EXECUTABLE, AdbBridge } from './adb.js';

class NalSplitter {
  private buffer = Buffer.alloc(0);
  private onNal: (nal: Buffer, type: number) => void;

  constructor(onNal: (nal: Buffer, type: number) => void) {
    this.onNal = onNal;
  }

  public feed(chunk: Buffer) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    const len = this.buffer.length;
    let startIdx = -1;

    // Locate the first Annex B start code (00 00 01 or 00 00 00 01)
    for (let i = 0; i < len - 3; i++) {
      if (
        this.buffer[i] === 0 &&
        this.buffer[i + 1] === 0 &&
        (this.buffer[i + 2] === 1 || (this.buffer[i + 2] === 0 && this.buffer[i + 3] === 1))
      ) {
        startIdx = i;
        break;
      }
    }

    if (startIdx === -1) {
      if (len > 4) this.buffer = this.buffer.subarray(len - 4);
      return;
    }

    let pos = startIdx;
    while (pos < len - 3) {
      let nextStart = -1;
      for (let i = pos + 3; i < len - 3; i++) {
        if (
          this.buffer[i] === 0 &&
          this.buffer[i + 1] === 0 &&
          (this.buffer[i + 2] === 1 || (this.buffer[i + 2] === 0 && this.buffer[i + 3] === 1))
        ) {
          nextStart = i;
          break;
        }
      }

      if (nextStart !== -1) {
        const nal = this.buffer.subarray(pos, nextStart);
        const scLen = nal[2] === 1 ? 3 : 4;
        const type = nal[scLen] & 0x1f;
        this.onNal(Buffer.from(nal), type);
        pos = nextStart;
      } else {
        break;
      }
    }

    this.buffer = this.buffer.subarray(pos);
  }

  public reset() {
    this.buffer = Buffer.alloc(0);
  }
}

// Access Unit Assembler: Assembles all slices belonging to the SAME picture frame
// into a single atomic buffer before feeding to JMuxer / WebSockets.
// Prevents grey screen blocks, slice desynchronization, and macroblock smearing!
class AccessUnitAssembler {
  private pendingNals: Buffer[] = [];
  private hasKeyframe = false;
  private onFrame: (frameBuffer: Buffer, isKeyframe: boolean) => void;

  constructor(onFrame: (frameBuffer: Buffer, isKeyframe: boolean) => void) {
    this.onFrame = onFrame;
  }

  public addNal(nal: Buffer, type: number) {
    let isNewFrame = false;

    // SPS (7), PPS (8), AUD (9), SEI (6)
    if (type === 7 || type === 8 || type === 9) {
      if (this.pendingNals.length > 0) isNewFrame = true;
    } else if (type === 1 || type === 5) {
      const scLen = nal[2] === 1 ? 3 : 4;
      if (nal.length > scLen + 1) {
        // In H.264, first_mb_in_slice is ue(v). If first_mb == 0, its first bit is 1.
        const isFirstMb = (nal[scLen + 1] & 0x80) !== 0;
        const hasExistingSlice = this.pendingNals.some(n => {
          const l = n[2] === 1 ? 3 : 4;
          const t = n[l] & 0x1f;
          return t === 1 || t === 5;
        });
        if (isFirstMb && hasExistingSlice) {
          isNewFrame = true;
        }
      }
    }

    if (isNewFrame) {
      this.flush();
    }

    this.pendingNals.push(nal);
    if (type === 5) this.hasKeyframe = true;
  }

  public flush() {
    if (this.pendingNals.length === 0) return;
    const frame = Buffer.concat(this.pendingNals);
    const isKey = this.hasKeyframe;
    this.pendingNals = [];
    this.hasKeyframe = false;
    this.onFrame(frame, isKey);
  }

  public reset() {
    this.pendingNals = [];
    this.hasKeyframe = false;
  }
}

interface StreamSession {
  serial: string;
  child: ChildProcess | null;
  clients: Set<WebSocket>;
  splitter: NalSplitter | null;
  assembler: AccessUnitAssembler | null;
  spsBuffer: Buffer | null;
  ppsBuffer: Buffer | null;
  latestKeyframe: Buffer | null;
  stopTimer: NodeJS.Timeout | null;
  heartbeatTimer: NodeJS.Timeout | null;
  lastDataTime: number;
}

const sessions = new Map<string, StreamSession>();

async function getOrCreateSession(serial: string): Promise<StreamSession> {
  let session = sessions.get(serial);
  if (!session) {
    session = {
      serial,
      child: null,
      clients: new Set(),
      splitter: null,
      assembler: null,
      spsBuffer: null,
      ppsBuffer: null,
      latestKeyframe: null,
      stopTimer: null,
      heartbeatTimer: null,
      lastDataTime: 0,
    };
    sessions.set(serial, session);
  }
  return session;
}

async function startSessionProcess(session: StreamSession) {
  if (session.child) return;

  const serial = session.serial;
  console.log(`[H264 Stream] Iniciando encoder H.264 com Frame Unit Assembly para ${serial}...`);

  // Terminate any old screenrecord instances
  try {
    await AdbBridge.shell(serial, 'killall -9 screenrecord 2>/dev/null || true');
  } catch {}

  // Keep phone screen awake
  try {
    await AdbBridge.shell(serial, 'svc power stayon usb 2>/dev/null || true');
  } catch {}

  // Compute optimal resolution maintaining aspect ratio (divisible by 16)
  let sizeArg = '720x1560';
  try {
    const size = await AdbBridge.getScreenSize(serial);
    if (size && size.width > 0 && size.height > 0) {
      const scale = 720 / size.width;
      const targetW = Math.round((size.width * scale) / 16) * 16;
      const targetH = Math.round((size.height * scale) / 16) * 16;
      sizeArg = `${targetW}x${targetH}`;
    }
  } catch {}

  console.log(`[H264 Stream] Parâmetros de codificação: ${sizeArg} @ 8Mbps contínuo`);

  // Frame Assembler ensures complete pictures are dispatched atomically
  const assembler = new AccessUnitAssembler((frameBuffer: Buffer, isKeyframe: boolean) => {
    session.lastDataTime = Date.now();

    if (isKeyframe) {
      // Prepend SPS + PPS to keyframe so any new client decodes immediately
      if (session.spsBuffer && session.ppsBuffer) {
        session.latestKeyframe = Buffer.concat([session.spsBuffer, session.ppsBuffer, frameBuffer]);
      } else {
        session.latestKeyframe = frameBuffer;
      }
    }

    // Broadcast complete frame unit to all connected clients
    for (const ws of session.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(frameBuffer);
      }
    }
  });

  session.assembler = assembler;

  session.splitter = new NalSplitter((nal: Buffer, type: number) => {
    // Cache SPS & PPS metadata
    if (type === 7) session.spsBuffer = nal;
    else if (type === 8) session.ppsBuffer = nal;

    assembler.addNal(nal, type);
  });

  // 8 Mbps bitrate is optimal: avoids 64KB kernel pipe overflows while providing razor-sharp video
  const child = spawn(
    ADB_EXECUTABLE,
    [
      '-s',
      serial,
      'exec-out',
      'screenrecord',
      '--output-format=h264',
      '--size',
      sizeArg,
      '--bit-rate',
      '8M',
      '--time-limit',
      '0',
      '-',
    ],
    { windowsHide: true }
  );

  session.child = child;
  session.lastDataTime = Date.now();

  // Force instant initial keyframe emission
  setTimeout(() => {
    AdbBridge.wakeUp(serial).catch(() => {});
  }, 100);

  // Heartbeat to prevent display idle during static views
  if (!session.heartbeatTimer) {
    session.heartbeatTimer = setInterval(() => {
      if (session.clients.size > 0) {
        const idleMs = Date.now() - session.lastDataTime;
        if (idleMs > 2000) {
          AdbBridge.wakeUp(serial).catch(() => {});
        }
      }
    }, 2000);
  }

  child.stdout?.on('data', (chunk: Buffer) => {
    session.splitter?.feed(chunk);
  });

  child.stderr?.on('data', (err) => {
    const msg = err.toString().trim();
    if (msg) console.warn(`[H264 Stream stderr ${serial}]:`, msg);
  });

  child.on('close', (code) => {
    console.log(`[H264 Stream] Processo fechado para ${serial} (código ${code})`);
    session.child = null;
    session.splitter = null;
    session.assembler = null;

    if (session.clients.size > 0) {
      setTimeout(() => {
        if (session.clients.size > 0 && !session.child) {
          startSessionProcess(session);
        }
      }, 300);
    }
  });

  child.on('error', (err) => {
    console.error(`[H264 Stream] Erro no subprocesso de ${serial}:`, err);
    session.child = null;
    session.splitter = null;
    session.assembler = null;
  });
}

function stopSessionProcess(session: StreamSession) {
  if (session.heartbeatTimer) {
    clearInterval(session.heartbeatTimer);
    session.heartbeatTimer = null;
  }

  if (session.child) {
    console.log(`[H264 Stream] Encerrando stream H.264 para ${session.serial}`);
    try {
      session.child.kill('SIGKILL');
    } catch {}
    session.child = null;
  }
  session.splitter = null;
  session.assembler = null;
  session.spsBuffer = null;
  session.ppsBuffer = null;
  session.latestKeyframe = null;
}

export function attachWebSocketStreamServer(server: Server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', async (ws: WebSocket, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const match = url.pathname.match(/\/stream\/([^\/]+)/);
    if (!match) {
      ws.close(1008, 'Invalid stream path');
      return;
    }

    const serial = decodeURIComponent(match[1]);
    console.log(`[H264 Stream] Novo cliente WebSocket conectado para tela de: ${serial}`);

    const session = await getOrCreateSession(serial);

    if (session.stopTimer) {
      clearTimeout(session.stopTimer);
      session.stopTimer = null;
    }

    session.clients.add(ws);

    // If stream is already active, immediately dispatch the complete Keyframe package (SPS + PPS + IDR)
    if (session.child && ws.readyState === WebSocket.OPEN) {
      if (session.latestKeyframe) {
        ws.send(session.latestKeyframe);
      } else if (session.spsBuffer && session.ppsBuffer) {
        ws.send(Buffer.concat([session.spsBuffer, session.ppsBuffer]));
      }
      AdbBridge.wakeUp(serial).catch(() => {});
    } else {
      await startSessionProcess(session);
    }

    ws.on('close', () => {
      console.log(`[H264 Stream] Cliente desconectado da tela de ${serial}`);
      session.clients.delete(ws);

      if (session.clients.size === 0) {
        session.stopTimer = setTimeout(() => {
          if (session.clients.size === 0) {
            stopSessionProcess(session);
          }
        }, 15000); // 15s grace period preserves encoder between tab switches
      }
    });

    ws.on('error', (err) => {
      console.warn(`[H264 Stream] Erro no WebSocket de ${serial}:`, err.message);
      session.clients.delete(ws);
    });
  });

  return wss;
}
