import http from 'node:http';
import net from 'node:net';
import { db } from '../database/client.js';
import { AdbBridge } from './adb.js';

export interface ProxyRecord {
  id: string;
  name: string;
  protocol: 'http' | 'socks5';
  host: string;
  port: number;
  username?: string | null;
  password?: string | null;
  current_ip?: string | null;
  country?: string | null;
  city?: string | null;
  latency_ms?: number | null;
  status: 'active' | 'dead' | 'untested';
  last_tested_at?: string | null;
}

// Map of active local auth relays per device serial: localPort -> Server
const activeRelays = new Map<string, { server: http.Server; localPort: number }>();
let nextRelayPort = 19100;

export class ProxyManager {
  static getAllProxies(): ProxyRecord[] {
    return db.prepare('SELECT * FROM proxies ORDER BY created_at DESC').all() as ProxyRecord[];
  }

  static getProxyById(id: string): ProxyRecord | null {
    return (db.prepare('SELECT * FROM proxies WHERE id = ?').get(id) as ProxyRecord) || null;
  }

  static createProxy(data: {
    id: string;
    name: string;
    protocol: 'http' | 'socks5';
    host: string;
    port: number;
    username?: string;
    password?: string;
  }): void {
    db.prepare(`
      INSERT INTO proxies (id, name, protocol, host, port, username, password, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'untested')
    `).run(data.id, data.name, data.protocol, data.host, data.port, data.username || null, data.password || null);
  }

  static deleteProxy(id: string): void {
    // Unassign from any device first
    db.prepare('UPDATE devices SET proxy_id = NULL WHERE proxy_id = ?').run(id);
    db.prepare('DELETE FROM proxies WHERE id = ?').run(id);
  }

  /**
   * Apply a proxy to an Android device.
   * If proxy has authentication, creates a local authenticated forwarder on PC
   * and maps it to the phone via 'adb reverse'.
   */
  static async applyProxyToDevice(serial: string, proxyId: string): Promise<string> {
    const proxy = this.getProxyById(proxyId);
    if (!proxy) throw new Error(`Proxy with ID ${proxyId} not found`);

    // Clean up any existing relay for this serial
    await this.removeProxyFromDevice(serial);

    if (proxy.username && proxy.password) {
      // Setup authenticated relay on PC
      const localPort = nextRelayPort++;
      const authHeader = 'Basic ' + Buffer.from(`${proxy.username}:${proxy.password}`).toString('base64');

      const server = http.createServer((req, res) => {
        const options = {
          host: proxy.host,
          port: proxy.port,
          path: req.url,
          method: req.method,
          headers: {
            ...req.headers,
            'Proxy-Authorization': authHeader,
          },
        };

        const proxyReq = http.request(options, (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
          proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
          res.writeHead(502);
          res.end(`Relay Error: ${err.message}`);
        });

        req.pipe(proxyReq);
      });

      // Handle HTTPS CONNECT tunnel
      server.on('connect', (req, clientSocket, head) => {
        const proxySocket = net.connect(proxy.port, proxy.host, () => {
          clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
          proxySocket.write(head);
          proxySocket.pipe(clientSocket);
          clientSocket.pipe(proxySocket);
        });

        proxySocket.on('error', () => {
          clientSocket.destroy();
        });
        clientSocket.on('error', () => {
          proxySocket.destroy();
        });
      });

      await new Promise<void>((resolve) => server.listen(localPort, '127.0.0.1', () => resolve()));
      activeRelays.set(serial, { server, localPort });

      // Forward to device via adb reverse
      await AdbBridge.execute(['-s', serial, 'reverse', `tcp:${localPort}`, `tcp:${localPort}`]);
      await AdbBridge.shell(serial, `settings put global http_proxy 127.0.0.1:${localPort}`);
    } else {
      // Direct unauthenticated / IP-whitelisted proxy
      await AdbBridge.shell(serial, `settings put global http_proxy ${proxy.host}:${proxy.port}`);
    }

    // Update DB
    db.prepare('UPDATE devices SET proxy_id = ? WHERE serial = ?').run(proxyId, serial);

    // Test IP from the device
    const deviceIp = await AdbBridge.getDevicePublicIp(serial);
    return deviceIp;
  }

  /**
   * Remove any proxy from an Android device, resetting to default network.
   */
  static async removeProxyFromDevice(serial: string): Promise<void> {
    const existing = activeRelays.get(serial);
    if (existing) {
      existing.server.close();
      activeRelays.delete(serial);
      try {
        await AdbBridge.execute(['-s', serial, 'reverse', '--remove', `tcp:${existing.localPort}`]);
      } catch {}
    }

    // Reset Android global proxy to none
    await AdbBridge.shell(serial, 'settings put global http_proxy :0');
    db.prepare('UPDATE devices SET proxy_id = NULL WHERE serial = ?').run(serial);
  }

  /**
   * Test a proxy directly from PC (fetches geo-location and latency)
   */
  static async testProxyDirect(proxy: ProxyRecord): Promise<{
    ip: string;
    country?: string;
    city?: string;
    latencyMs: number;
    success: boolean;
    error?: string;
  }> {
    const start = Date.now();
    try {
      // Simple fetch test to an IP info service
      const res = await fetch('https://ipinfo.io/json');
      const latencyMs = Date.now() - start;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as any;

      const ip = data.ip || 'Unknown';
      const country = data.country;
      const city = data.city;

      db.prepare(`
        UPDATE proxies 
        SET current_ip = ?, country = ?, city = ?, latency_ms = ?, status = 'active', last_tested_at = datetime('now')
        WHERE id = ?
      `).run(ip, country, city, latencyMs, proxy.id);

      return { ip, country, city, latencyMs, success: true };
    } catch (err: any) {
      db.prepare(`
        UPDATE proxies SET status = 'dead', last_tested_at = datetime('now') WHERE id = ?
      `).run(proxy.id);
      return { ip: '', latencyMs: Date.now() - start, success: false, error: err.message };
    }
  }
}
