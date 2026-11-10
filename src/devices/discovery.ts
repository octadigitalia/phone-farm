import { AdbBridge } from './adb.js';
import { db } from '../database/client.js';

export interface DeviceRecord {
  serial: string;
  model?: string | null;
  android_version?: string | null;
  status: 'online' | 'offline' | 'busy' | 'unauthorized';
  screen_size?: string | null;
  battery_level?: number | null;
  proxy_id?: string | null;
  proxy_name?: string | null;
  assigned_label?: string | null;
  last_seen_at?: string | null;
  created_at: string;
}

export class DeviceDiscovery {
  private static monitorTimer: NodeJS.Timeout | null = null;

  static async scanDevices(): Promise<DeviceRecord[]> {
    const rawDevices = await AdbBridge.listDevices();
    const onlineSerials = new Set<string>();

    for (const d of rawDevices) {
      onlineSerials.add(d.serial);
      const isAuthorized = d.state === 'device';
      const status = isAuthorized ? 'online' : (d.state as any);

      let version: string | null = null;
      let battery: number | null = null;
      let screenSize: string | null = null;

      if (isAuthorized) {
        try {
          version = await AdbBridge.getAndroidVersion(d.serial);
          battery = await AdbBridge.getBatteryLevel(d.serial);
          const size = await AdbBridge.getScreenSize(d.serial);
          if (size) screenSize = `${size.width}x${size.height}`;
        } catch {}
      }

      // Upsert in database
      const existing = db.prepare('SELECT serial, assigned_label, proxy_id FROM devices WHERE serial = ?').get(d.serial) as any;
      if (!existing) {
        db.prepare(`
          INSERT INTO devices (serial, model, android_version, status, screen_size, battery_level, last_seen_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(d.serial, d.model || 'Unknown', version, status, screenSize, battery);
      } else {
        db.prepare(`
          UPDATE devices 
          SET status = ?, model = COALESCE(?, model), android_version = COALESCE(?, android_version),
              screen_size = COALESCE(?, screen_size), battery_level = COALESCE(?, battery_level),
              last_seen_at = datetime('now')
          WHERE serial = ?
        `).run(status, d.model || null, version, screenSize, battery, d.serial);
      }
    }

    // Mark devices not present in this scan as offline
    const allKnown = db.prepare('SELECT serial FROM devices').all() as { serial: string }[];
    for (const known of allKnown) {
      if (!onlineSerials.has(known.serial)) {
        db.prepare("UPDATE devices SET status = 'offline' WHERE serial = ?").run(known.serial);
      }
    }

    return this.getDevices();
  }

  static getDevices(): DeviceRecord[] {
    return db.prepare(`
      SELECT d.*, p.name AS proxy_name 
      FROM devices d 
      LEFT JOIN proxies p ON d.proxy_id = p.id 
      ORDER BY d.created_at ASC
    `).all() as DeviceRecord[];
  }

  static updateDeviceLabel(serial: string, label: string): void {
    db.prepare('UPDATE devices SET assigned_label = ? WHERE serial = ?').run(label, serial);
  }

  /**
   * Continuous background monitoring for real-time battery and connection status
   */
  static startMonitoring(intervalMs = 4000) {
    if (this.monitorTimer) return;
    this.monitorTimer = setInterval(async () => {
      try {
        const devices = this.getDevices().filter((d) => d.status === 'online' || d.status === 'busy');
        for (const dev of devices) {
          const battery = await AdbBridge.getBatteryLevel(dev.serial);
          if (battery !== null && battery !== dev.battery_level) {
            db.prepare('UPDATE devices SET battery_level = ?, last_seen_at = datetime(\'now\') WHERE serial = ?').run(battery, dev.serial);
          }
        }
      } catch {}
    }, intervalMs);
  }
}
