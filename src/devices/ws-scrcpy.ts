import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

class WsScrcpyService {
  private process: ChildProcess | null = null;
  private isStarting = false;

  async start(): Promise<void> {
    if (this.process || this.isStarting) return;
    this.isStarting = true;

    const wsScrcpyDist = path.resolve(process.cwd(), 'ws-scrcpy', 'dist', 'index.js');
    if (!fs.existsSync(wsScrcpyDist)) {
      console.warn('[ws-scrcpy] Dist não encontrado em:', wsScrcpyDist);
      this.isStarting = false;
      return;
    }

    // Ensure local bin folder (containing adb) is in PATH for ws-scrcpy process
    const localBinDir = path.resolve(process.cwd(), 'bin');
    const env = {
      ...process.env,
      PATH: `${process.env.PATH || ''};${localBinDir}`,
    };

    console.log('[ws-scrcpy] Iniciando servidor de streaming H.264 WebSockets na porta 8000...');
    try {
      this.process = spawn('node', [wsScrcpyDist], {
        cwd: path.resolve(process.cwd(), 'ws-scrcpy', 'dist'),
        env,
        stdio: 'pipe',
      });

      this.process.stdout?.on('data', (data) => {
        const text = data.toString().trim();
        if (text.includes('Listening on:') || text.includes('start server:')) {
          console.log(`[ws-scrcpy] ${text}`);
        }
      });

      this.process.stderr?.on('data', (data) => {
        const text = data.toString().trim();
        if (!text.includes('deprecated')) {
          console.error(`[ws-scrcpy error] ${text}`);
        }
      });

      this.process.on('close', (code) => {
        console.log(`[ws-scrcpy] Processo encerrado com código ${code}`);
        this.process = null;
      });
    } catch (err: any) {
      console.error('[ws-scrcpy] Falha ao iniciar:', err.message);
    } finally {
      this.isStarting = false;
    }
  }

  stop(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }
}

export const wsScrcpyService = new WsScrcpyService();
