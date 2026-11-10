import { AdbBridge } from './adb.js';

class DeviceStreamer {
  private latestFrames = new Map<string, { buffer: Buffer; timestamp: number }>();
  private activeLoops = new Map<string, boolean>();
  private lastAccessTime = new Map<string, number>();

  /**
   * Get the latest available frame buffer for this device immediately from RAM.
   * If the stream is dormant, it activates the capture loop.
   */
  async getLatestFrame(serial: string): Promise<Buffer> {
    this.lastAccessTime.set(serial, Date.now());

    // Start background capture loop if not running
    if (!this.activeLoops.get(serial)) {
      this.startCaptureLoop(serial);
    }

    const cached = this.latestFrames.get(serial);
    if (cached) {
      return cached.buffer;
    }

    // If cache is empty on first hit, grab frame directly and update cache
    const fresh = await AdbBridge.captureScreenshotBuffer(serial);
    this.latestFrames.set(serial, { buffer: fresh, timestamp: Date.now() });
    return fresh;
  }

  private async startCaptureLoop(serial: string) {
    if (this.activeLoops.get(serial)) return;
    this.activeLoops.set(serial, true);

    while (this.activeLoops.get(serial)) {
      const lastAccess = this.lastAccessTime.get(serial) || 0;
      // Sleep / pause capture if no client requested a frame in the last 15 seconds
      if (Date.now() - lastAccess > 15000) {
        this.activeLoops.set(serial, false);
        break;
      }

      try {
        const buffer = await AdbBridge.captureScreenshotBuffer(serial);
        if (buffer && buffer.length > 5000) {
          this.latestFrames.set(serial, { buffer, timestamp: Date.now() });
        }
      } catch (err) {
        await new Promise((r) => setTimeout(r, 800));
      }

      // Fast pacing loop: 100ms interval
      await new Promise((r) => setTimeout(r, 100));
    }
  }
}

export const deviceStreamer = new DeviceStreamer();
