import crypto from 'node:crypto';
import { db } from '../database/client.js';
import { TaskQueue } from './queue.js';

export interface ScheduleRecord {
  id: string;
  device_serial: string;
  plugin_id: string;
  task_type: string;
  payload_json: string;
  timing_type: 'interval' | 'daily' | 'once';
  timing_config: string; // e.g. "30" (minutes) or "14:00" (daily)
  status: 'active' | 'paused' | 'completed';
  next_run_at: string;
  created_at: string;
}

export class ScheduleManager {
  static listSchedules(): (ScheduleRecord & { assigned_label?: string; model?: string })[] {
    return db.prepare(`
      SELECT s.*, d.assigned_label, d.model
      FROM schedules s
      LEFT JOIN devices d ON s.device_serial = d.serial
      ORDER BY s.created_at DESC
    `).all() as any[];
  }

  static createSchedule(params: {
    deviceSerial: string;
    pluginId: string;
    taskType: string;
    payload?: any;
    timingType: 'interval' | 'daily' | 'once';
    timingConfig: string; // "30", "60", "120" (min) or "14:30" (daily)
  }): string {
    const id = crypto.randomUUID();
    const payloadStr = JSON.stringify(params.payload || {});
    const nextRun = this.calculateNextRun(params.timingType, params.timingConfig);

    db.prepare(`
      INSERT INTO schedules (id, device_serial, plugin_id, task_type, payload_json, timing_type, timing_config, status, next_run_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `).run(
      id,
      params.deviceSerial,
      params.pluginId,
      params.taskType,
      payloadStr,
      params.timingType,
      params.timingConfig,
      nextRun
    );

    return id;
  }

  static toggleStatus(id: string): 'active' | 'paused' | null {
    const schedule = db.prepare('SELECT status, timing_type, timing_config FROM schedules WHERE id = ?').get(id) as any;
    if (!schedule) return null;

    const newStatus = schedule.status === 'active' ? 'paused' : 'active';
    let nextRun = undefined;
    if (newStatus === 'active') {
      nextRun = this.calculateNextRun(schedule.timing_type, schedule.timing_config);
      db.prepare('UPDATE schedules SET status = ?, next_run_at = ? WHERE id = ?').run(newStatus, nextRun, id);
    } else {
      db.prepare('UPDATE schedules SET status = ? WHERE id = ?').run(newStatus, id);
    }

    return newStatus;
  }

  static deleteSchedule(id: string): boolean {
    const res = db.prepare('DELETE FROM schedules WHERE id = ?').run(id);
    return res.changes > 0;
  }

  static checkAndTriggerDueSchedules(): number {
    const nowIso = new Date().toISOString();
    // Get all active schedules that are due
    const dueSchedules = db.prepare(`
      SELECT * FROM schedules 
      WHERE status = 'active' AND next_run_at <= ?
    `).all(nowIso) as ScheduleRecord[];

    let triggeredCount = 0;

    for (const schedule of dueSchedules) {
      let payload = {};
      try {
        payload = JSON.parse(schedule.payload_json || '{}');
      } catch {}

      // Enqueue the task
      TaskQueue.enqueue({
        deviceSerial: schedule.device_serial,
        pluginId: schedule.plugin_id,
        taskType: schedule.task_type,
        payload,
        scheduleId: schedule.id,
      });

      triggeredCount++;

      // Compute next run or mark completed
      if (schedule.timing_type === 'once') {
        db.prepare("UPDATE schedules SET status = 'completed' WHERE id = ?").run(schedule.id);
      } else {
        const nextRun = this.calculateNextRun(schedule.timing_type, schedule.timing_config);
        db.prepare('UPDATE schedules SET next_run_at = ? WHERE id = ?').run(nextRun, schedule.id);
      }
    }

    return triggeredCount;
  }

  private static calculateNextRun(timingType: string, timingConfig: string): string {
    const now = new Date();

    if (timingType === 'interval') {
      const minutes = parseInt(timingConfig, 10) || 60;
      return new Date(now.getTime() + minutes * 60 * 1000).toISOString();
    }

    if (timingType === 'daily') {
      // e.g. "14:30"
      const [hhStr, mmStr] = timingConfig.split(':');
      const targetHour = parseInt(hhStr || '12', 10);
      const targetMin = parseInt(mmStr || '0', 10);

      const target = new Date(now);
      target.setHours(targetHour, targetMin, 0, 0);

      // If target time already passed today, schedule for tomorrow
      if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1);
      }
      return target.toISOString();
    }

    // Default: in 1 minute
    return new Date(now.getTime() + 60 * 1000).toISOString();
  }
}
