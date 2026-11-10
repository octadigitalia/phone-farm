import Fastify from 'fastify';
import formbody from '@fastify/formbody';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

import { DeviceDiscovery } from '../devices/discovery.js';
import { ProxyManager } from '../devices/proxy.js';
import { TaskQueue } from '../scheduler/queue.js';
import { ScheduleManager } from '../scheduler/schedules.js';
import { PluginRegistry } from '../plugins/registry.js';
import { AdbBridge } from '../devices/adb.js';
import { deviceStreamer } from '../devices/streamer.js';
import { db } from '../database/client.js';
import { DeviceLockManager } from '../harness/lock-manager.js';
import { renderDashboardHtml, renderStatsHtml, renderExecutionsTable, renderSchedulesTable } from './views/dashboard.js';

export function createServer() {
  const app = Fastify({ logger: false });

  app.register(formbody);

  const publicDir = path.resolve(process.cwd(), 'data', 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  app.register(fastifyStatic, {
    root: publicDir,
    prefix: '/public/',
  });

  // Home Dashboard
  app.get('/', async (req, reply) => {
    const devices = DeviceDiscovery.getDevices();
    const proxies = ProxyManager.getAllProxies();
    const executions = TaskQueue.getRecentExecutions(30);
    const schedules = ScheduleManager.listSchedules();
    const plugins = PluginRegistry.getAllPlugins();

    const html = renderDashboardHtml({ devices, proxies, executions, schedules, plugins });
    reply.type('text/html').send(html);
  });

  // HTMX Poll Endpoints for Real-Time Live Updates
  app.get('/api/dashboard/stats', async (req, reply) => {
    const devices = DeviceDiscovery.getDevices();
    const proxies = ProxyManager.getAllProxies();
    reply.type('text/html').send(renderStatsHtml(devices, proxies));
  });

  app.get('/api/dashboard/schedules', async (req, reply) => {
    const schedules = ScheduleManager.listSchedules();
    reply.type('text/html').send(renderSchedulesTable(schedules));
  });

  app.get('/api/dashboard/battery-status', async (req, reply) => {
    const devices = DeviceDiscovery.getDevices();
    const batteryList = devices.map((d) => ({
      serial: d.serial,
      battery: d.battery_level,
      status: d.status,
    }));
    reply.send(batteryList);
  });

  app.get('/api/dashboard/executions', async (req, reply) => {
    const executions = TaskQueue.getRecentExecutions(30);
    reply.type('text/html').send(renderExecutionsTable(executions));
  });

  // Device scan
  app.post('/api/devices/scan', async (req, reply) => {
    try {
      await DeviceDiscovery.scanDevices();
    } catch (err: any) {
      console.error('Scan error:', err);
    }
    reply.redirect('/');
  });

  // Ultra-fast In-Memory Screen Streaming (~180ms responses, 0ms read from RAM cache)
  app.get('/api/devices/:serial/screen', async (req, reply) => {
    const { serial } = (req.params as any) || {};
    if (!serial) return reply.status(400).send('Serial required');

    try {
      const buffer = await deviceStreamer.getLatestFrame(serial);
      reply
        .header('Cache-Control', 'no-cache, no-store, must-revalidate')
        .header('Pragma', 'no-cache')
        .header('Expires', '0')
        .type('image/png')
        .send(buffer);
    } catch (err: any) {
      reply.status(500).send(`Erro de captura: ${err.message}`);
    }
  });

  // Launch Native Scrcpy 60 FPS Window on Desktop
  app.post('/api/devices/launch-scrcpy', async (req, reply) => {
    const { serial } = (req.body as any) || {};
    if (serial) {
      try {
        const device = DeviceDiscovery.getDevices().find((d) => d.serial === serial);
        const title = device ? `${device.assigned_label || device.model} (${serial})` : serial;
        (deviceStreamer.constructor as any).launchNativeScrcpy(serial, title);
      } catch (err: any) {
        console.error('Scrcpy launch error:', err);
      }
    }
    reply.redirect('/');
  });

  // Interactive Touch Tap
  app.post('/api/devices/tap', async (req, reply) => {
    const { serial, normX, normY } = (req.body as any) || {};
    if (serial && typeof normX === 'number' && typeof normY === 'number') {
      try {
        DeviceLockManager.touchManual(serial);
        await AdbBridge.tapNormalized(serial, normX, normY);
        return reply.send({ ok: true });
      } catch (err: any) {
        return reply.status(500).send({ error: err.message });
      }
    }
    reply.status(400).send({ error: 'Invalid parameters' });
  });

  // Interactive Touch Swipe / Scroll
  app.post('/api/devices/swipe', async (req, reply) => {
    const { serial, startX, startY, endX, endY, duration } = (req.body as any) || {};
    if (serial && typeof startX === 'number' && typeof startY === 'number') {
      try {
        DeviceLockManager.touchManual(serial);
        await AdbBridge.swipeNormalized(serial, startX, startY, endX, endY, duration || 300);
        return reply.send({ ok: true });
      } catch (err: any) {
        return reply.status(500).send({ error: err.message });
      }
    }
    reply.status(400).send({ error: 'Invalid parameters' });
  });

  // Virtual Key Press
  app.post('/api/devices/key', async (req, reply) => {
    const { serial, key } = (req.body as any) || {};
    if (serial && key) {
      try {
        DeviceLockManager.touchManual(serial);
        if (key === 'back') await AdbBridge.pressBack(serial);
        else if (key === 'home') await AdbBridge.pressHome(serial);
        else if (key === 'recents') await AdbBridge.pressRecents(serial);
        else if (key === 'wake') await AdbBridge.wakeUp(serial);
        else if (key === 'power') await AdbBridge.keyEvent(serial, 26); // KEYCODE_POWER
        return reply.send({ ok: true });
      } catch (err: any) {
        return reply.status(500).send({ error: err.message });
      }
    }
    reply.status(400).send({ error: 'Invalid parameters' });
  });

  // Device Lock Status API
  app.get('/api/devices/locks', async (_req, reply) => {
    return reply.send(DeviceLockManager.getAll());
  });

  // Device Lock Force Reset (Manual Override button on dashboard)
  app.post('/api/devices/locks/reset', async (req, reply) => {
    const { serial } = (req.body as any) || {};
    if (serial) {
      DeviceLockManager.forceReset(serial);
      return reply.send({ ok: true, message: `Dispositivo ${serial} liberado manualmente.` });
    }
    return reply.status(400).send({ error: 'Serial required' });
  });

  // Set or remove proxy for device
  app.post('/api/devices/set-proxy', async (req, reply) => {
    const { serial, proxyId } = (req.body as any) || {};
    if (serial) {
      try {
        if (!proxyId) {
          await ProxyManager.removeProxyFromDevice(serial);
        } else {
          await ProxyManager.applyProxyToDevice(serial, proxyId);
        }
      } catch (err: any) {
        console.error('Proxy apply error:', err);
      }
    }
    reply.redirect('/');
  });

  // Check IP directly on device
  app.post('/api/devices/check-ip', async (req, reply) => {
    const { serial } = (req.body as any) || {};
    let ip = 'N/A';
    if (serial) {
      try {
        ip = await AdbBridge.getDevicePublicIp(serial);
      } catch (err: any) {
        ip = `Erro: ${err.message}`;
      }
    }
    reply.type('text/html').send(`
      <!DOCTYPE html>
      <html>
      <body style="background:#05070b; color:white; font-family:sans-serif; padding:40px; text-align:center;">
        <h2>🌐 IP Público do Aparelho (${serial}):</h2>
        <p style="font-size:2.5rem; font-family:monospace; color:#38bdf8; margin:20px 0; font-weight:bold;">${ip}</p>
        <a href="/" style="color:#a855f7; text-decoration:underline; font-weight:bold;">← Voltar ao Painel da Farm</a>
      </body>
      </html>
    `);
  });

  // Create Proxy
  app.post('/api/proxies/create', async (req, reply) => {
    const body = req.body as any;
    if (body.name && body.host && body.port) {
      ProxyManager.createProxy({
        id: crypto.randomUUID(),
        name: body.name,
        protocol: body.protocol || 'http',
        host: body.host.trim(),
        port: parseInt(body.port, 10),
        username: body.username?.trim() || undefined,
        password: body.password?.trim() || undefined,
      });
    }
    reply.redirect('/');
  });

  // Test Proxy
  app.post('/api/proxies/test', async (req, reply) => {
    const { id } = (req.body as any) || {};
    if (id) {
      const proxy = ProxyManager.getProxyById(id);
      if (proxy) {
        await ProxyManager.testProxyDirect(proxy);
      }
    }
    reply.redirect('/');
  });

  // Delete Proxy
  app.post('/api/proxies/delete', async (req, reply) => {
    const { id } = (req.body as any) || {};
    if (id) {
      ProxyManager.deleteProxy(id);
    }
    reply.redirect('/');
  });

  // Universal Task Runner
  app.post('/api/tasks/run-generic', async (req, reply) => {
    const { serial, pluginTask } = (req.body as any) || {};
    if (serial && pluginTask) {
      const [pluginId, taskId] = pluginTask.split(':');
      const task = PluginRegistry.getTask(pluginId, taskId);
      if (task) {
        TaskQueue.enqueue({
          deviceSerial: serial,
          pluginId,
          taskType: taskId,
          payload: task.defaultPayload,
        });
      }
    }
    reply.redirect('/');
  });

  // Schedules Management Endpoints
  app.post('/api/schedules/create', async (req, reply) => {
    const body = req.body as any;
    if (body.deviceSerial && body.pluginTask && body.timingType) {
      const [pluginId, taskType] = body.pluginTask.split(':');
      const task = PluginRegistry.getTask(pluginId, taskType);
      ScheduleManager.createSchedule({
        deviceSerial: body.deviceSerial,
        pluginId,
        taskType,
        payload: task?.defaultPayload || {},
        timingType: body.timingType,
        timingConfig: body.timingConfig || (body.timingType === 'daily' ? '12:00' : '60'),
      });
    }
    reply.redirect('/');
  });

  app.post('/api/schedules/toggle', async (req, reply) => {
    const { id } = (req.body as any) || {};
    if (id) ScheduleManager.toggleStatus(id);
    reply.redirect('/');
  });

  app.post('/api/schedules/delete', async (req, reply) => {
    const { id } = (req.body as any) || {};
    if (id) ScheduleManager.deleteSchedule(id);
    reply.redirect('/');
  });

  // Live Real-Time Logs API (for Drawer / Modal)
  app.get('/api/executions/:id/live-logs', async (req, reply) => {
    const { id } = (req.params as any) || {};
    if (!id) return reply.status(400).send({ error: 'ID required' });

    const execution = db.prepare(`
      SELECT e.*, d.assigned_label, d.model 
      FROM executions e 
      LEFT JOIN devices d ON e.device_serial = d.serial 
      WHERE e.id = ?
    `).get(id) as any;

    const logs = TaskQueue.getExecutionLogs(id);

    return reply.send({
      id,
      deviceSerial: execution?.device_serial || '',
      deviceLabel: execution?.assigned_label || execution?.model || execution?.device_serial || '',
      pluginId: execution?.plugin_id || '',
      taskType: execution?.task_type || '',
      status: execution?.status || 'unknown',
      errorMessage: execution?.error_message || null,
      startedAt: execution?.started_at || execution?.created_at,
      finishedAt: execution?.finished_at,
      finished: execution ? ['succeeded', 'failed', 'stopped'].includes(execution.status) : true,
      logs: logs.map(l => ({ time: l.created_at, line: l.line }))
    });
  });

  // View Execution Logs (Full Page fallback)
  app.get('/api/executions/logs', async (req, reply) => {
    const { id } = (req.query as any) || {};
    if (!id) return reply.status(400).send('ID required');

    const logs = TaskQueue.getExecutionLogs(id);
    reply.type('text/html').send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Logs da Execução</title>
        <style>
          body { background: #05070b; color: #10b981; font-family: monospace; padding: 25px; font-size: 13px; }
          .header { color: #94a3b8; border-bottom: 1px solid #1e293b; padding-bottom: 12px; margin-bottom: 20px; }
          .line { padding: 4px 0; }
          .time { color: #64748b; margin-right: 12px; }
        </style>
        <meta http-equiv="refresh" content="2">
      </head>
      <body>
        <div class="header">
          <strong>Logs em Tempo Real (auto-refresh a cada 2s)</strong> | Execution ID: ${id}
          <div style="margin-top: 6px;"><a href="/" style="color:#38bdf8;">← Voltar ao Painel</a></div>
        </div>
        <div>
          ${
            logs.length === 0
              ? '<span style="color:#64748b;">Aguardando início dos logs...</span>'
              : logs
                  .map((l) => `<div class="line"><span class="time">[${l.created_at}]</span>${l.line}</div>`)
                  .join('')
          }
        </div>
      </body>
      </html>
    `);
  });

  // Save Recorded Screen Video
  app.post('/api/save-recording', async (req, reply) => {
    const recordingsDir = path.resolve(process.cwd(), 'recordings');
    if (!fs.existsSync(recordingsDir)) {
      fs.mkdirSync(recordingsDir, { recursive: true });
    }
    const filename = `recording_${Date.now()}.webm`;
    const dest = path.join(recordingsDir, filename);

    const chunks: Buffer[] = [];
    for await (const chunk of req.raw) {
      chunks.push(chunk);
    }
    const fullBuffer = Buffer.concat(chunks);
    fs.writeFileSync(dest, fullBuffer);

    return { success: true, filename, path: dest, size: fullBuffer.length };
  });

  return app;
}
