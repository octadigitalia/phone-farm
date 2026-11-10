import { exec, execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

// Auto-detect ADB location: local bin, PATH or standard SDK
function resolveAdbPath(): string {
  const localBin = path.resolve(process.cwd(), 'bin', 'adb.exe');
  if (fs.existsSync(localBin)) {
    return localBin;
  }

  const candidates = [
    'adb',
    path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk', 'platform-tools', 'adb.exe'),
    path.join(process.env.PROGRAMFILES || '', 'Android', 'platform-tools', 'adb.exe'),
  ];

  for (const c of candidates) {
    if (c === 'adb') continue;
    if (fs.existsSync(c)) {
      return c;
    }
  }
  return 'adb';
}

export const ADB_EXECUTABLE = resolveAdbPath();

export interface DeviceInfo {
  serial: string;
  state: 'device' | 'unauthorized' | 'offline' | 'unknown';
  model?: string;
  product?: string;
  device?: string;
}

export class AdbBridge {
  static async execute(args: string[]): Promise<string> {
    try {
      const { stdout } = await execFileAsync(ADB_EXECUTABLE, args, { maxBuffer: 10 * 1024 * 1024 });
      return stdout.trim();
    } catch (err: any) {
      throw new Error(`ADB error (${args.join(' ')}): ${err.stderr || err.message}`);
    }
  }

  static async shell(serial: string, command: string): Promise<string> {
    return this.execute(['-s', serial, 'shell', command]);
  }

  static async listDevices(): Promise<DeviceInfo[]> {
    const raw = await this.execute(['devices', '-l']);
    const lines = raw.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('List of devices'));
    
    return lines.map((line) => {
      const parts = line.split(/\s+/);
      const serial = parts[0];
      const state = (parts[1] as any) || 'unknown';
      
      const modelMatch = line.match(/model:(\S+)/);
      const productMatch = line.match(/product:(\S+)/);
      const deviceMatch = line.match(/device:(\S+)/);

      return {
        serial,
        state,
        model: modelMatch ? modelMatch[1].replace(/_/g, ' ') : undefined,
        product: productMatch ? productMatch[1] : undefined,
        device: deviceMatch ? deviceMatch[1] : undefined,
      };
    });
  }

  static async getAndroidVersion(serial: string): Promise<string> {
    try {
      return await this.shell(serial, 'getprop ro.build.version.release');
    } catch {
      return 'Unknown';
    }
  }

  static async getBatteryLevel(serial: string): Promise<number | null> {
    try {
      const out = await this.shell(serial, 'dumpsys battery');
      const match = out.match(/level:\s*(\d+)/);
      return match ? parseInt(match[1], 10) : null;
    } catch {
      return null;
    }
  }

  static async getScreenSize(serial: string): Promise<{ width: number; height: number } | null> {
    try {
      const out = await this.shell(serial, 'wm size');
      const match = out.match(/Physical size:\s*(\d+)x(\d+)/);
      if (match) {
        return { width: parseInt(match[1], 10), height: parseInt(match[2], 10) };
      }
      return null;
    } catch {
      return null;
    }
  }

  static async tap(serial: string, x: number, y: number): Promise<void> {
    await this.shell(serial, `input tap ${Math.round(x)} ${Math.round(y)}`);
  }

  static async tapNormalized(serial: string, normX: number, normY: number): Promise<void> {
    const size = await this.getScreenSize(serial);
    const width = size ? size.width : 1080;
    const height = size ? size.height : 2340;
    const realX = Math.round(normX * width);
    const realY = Math.round(normY * height);
    await this.tap(serial, realX, realY);
  }

  static async pressBack(serial: string): Promise<void> {
    await this.keyEvent(serial, 4); // KEYCODE_BACK
  }

  static async pressHome(serial: string): Promise<void> {
    await this.keyEvent(serial, 3); // KEYCODE_HOME
  }

  static async pressRecents(serial: string): Promise<void> {
    await this.keyEvent(serial, 187); // KEYCODE_APP_SWITCH
  }

  static async swipe(
    serial: string,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    durationMs: number = 300
  ): Promise<void> {
    await this.shell(serial, `input swipe ${Math.round(startX)} ${Math.round(startY)} ${Math.round(endX)} ${Math.round(endY)} ${durationMs}`);
  }

  static async swipeNormalized(
    serial: string,
    normStartX: number,
    normStartY: number,
    normEndX: number,
    normEndY: number,
    durationMs: number = 300
  ): Promise<void> {
    const size = await this.getScreenSize(serial);
    const width = size ? size.width : 1080;
    const height = size ? size.height : 2340;
    const sX = Math.round(normStartX * width);
    const sY = Math.round(normStartY * height);
    const eX = Math.round(normEndX * width);
    const eY = Math.round(normEndY * height);
    await this.swipe(serial, sX, sY, eX, eY, durationMs);
  }

  static async typeText(serial: string, text: string): Promise<void> {
    // Sanitize string for input text shell command
    const safeText = text.replace(/ /g, '%s').replace(/['"]/g, '');
    await this.shell(serial, `input text "${safeText}"`);
  }

  static async keyEvent(serial: string, keyCode: number | string): Promise<void> {
    await this.shell(serial, `input keyevent ${keyCode}`);
  }

  static async wakeUp(serial: string): Promise<void> {
    await this.shell(serial, 'input keyevent KEYCODE_WAKEUP');
  }

  static async launchApp(serial: string, packageName: string): Promise<void> {
    await this.shell(serial, `monkey -p ${packageName} -c android.intent.category.LAUNCHER 1`);
  }

  static async terminateApp(serial: string, packageName: string): Promise<void> {
    await this.shell(serial, `am force-stop ${packageName}`);
  }

  static async captureScreenshotBuffer(serial: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const child = spawn(ADB_EXECUTABLE, ['-s', serial, 'exec-out', 'screencap', '-p']);
      const chunks: Buffer[] = [];
      child.stdout.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      child.stderr.on('data', (err) => console.error('Screenshot stderr:', err.toString()));
      child.on('close', (code) => {
        if (code === 0) {
          resolve(Buffer.concat(chunks));
        } else {
          reject(new Error(`screencap failed with exit code ${code}`));
        }
      });
      child.on('error', reject);
    });
  }

  static async takeScreenshot(serial: string, destinationFilePath: string): Promise<void> {
    const buffer = await this.captureScreenshotBuffer(serial);
    const dir = path.dirname(destinationFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(destinationFilePath, buffer);
  }

  static async dumpUiHierarchy(serial: string): Promise<string> {
    const tempRemotePath = '/sdcard/window_dump.xml';
    await this.shell(serial, `uiautomator dump ${tempRemotePath}`);
    const xml = await this.shell(serial, `cat ${tempRemotePath}`);
    return xml;
  }

  static async getDevicePublicIp(serial: string): Promise<string> {
    try {
      // Test using curl or toybox/wget inside device shell
      const out = await this.shell(serial, 'curl -s -m 5 https://api.ipify.org || toybox wget -q -O - -T 5 https://api.ipify.org');
      const ip = out.trim();
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
        return ip;
      }
      return out || 'Error fetching IP';
    } catch (err: any) {
      return `Offline / Error: ${err.message}`;
    }
  }
}
