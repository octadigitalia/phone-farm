import crypto from 'node:crypto';
import { db } from '../database/client.js';

export interface ExecutionRecord {
  id: string;
  schedule_id?: string | null;
  device_serial: string;
  plugin_id: string;
  task_type: string;
  payload_json: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'stopped';
  started_at?: string | null;
  finished_at?: string | null;
  error_message?: string | null;
  created_at: string;
}

export class TaskQueue {
  static enqueue(params: {
    deviceSerial: string;
    pluginId: string;
    taskType: string;
    payload?: any;
    scheduleId?: string;
  }): string {
    const id = crypto.randomUUID();
    const payloadStr = JSON.stringify(params.payload || {});

    db.prepare(`
      INSERT INTO executions (id, schedule_id, device_serial, plugin_id, task_type, payload_json, status)
      VALUES (?, ?, ?, ?, ?, ?, 'queued')
    `).run(id, params.scheduleId || null, params.deviceSerial, params.pluginId, params.taskType, payloadStr);

    return id;
  }

  static getRecentExecutions(limit: number = 20): (ExecutionRecord & { assigned_label?: string; model?: string })[] {
    return db.prepare(`
      SELECT e.*, d.assigned_label, d.model 
      FROM executions e
      LEFT JOIN devices d ON e.device_serial = d.serial
      ORDER BY e.created_at DESC
      LIMIT ?
    `).all(limit) as any;
  }

  static getExecutionLogs(executionId: string): { id: number; line: string; created_at: string }[] {
    return db.prepare('SELECT id, line, created_at FROM execution_logs WHERE execution_id = ? ORDER BY id ASC').all(executionId) as any;
  }

  static appendLog(executionId: string, line: string): void {
    db.prepare('INSERT INTO execution_logs (execution_id, line) VALUES (?, ?)').run(executionId, line);
  }
}
