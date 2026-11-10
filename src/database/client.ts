import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'phone-farm.sqlite');
export const db = new Database(dbPath);

// Enable WAL mode for high concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS proxies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      protocol TEXT NOT NULL DEFAULT 'http', -- 'http' | 'socks5'
      host TEXT NOT NULL,
      port INTEGER NOT NULL,
      username TEXT,
      password TEXT,
      current_ip TEXT,
      country TEXT,
      city TEXT,
      latency_ms INTEGER,
      status TEXT NOT NULL DEFAULT 'untested', -- 'active' | 'dead' | 'untested'
      last_tested_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS devices (
      serial TEXT PRIMARY KEY,
      model TEXT,
      android_version TEXT,
      status TEXT NOT NULL DEFAULT 'offline', -- 'online' | 'offline' | 'busy' | 'unauthorized'
      screen_size TEXT,
      battery_level INTEGER,
      proxy_id TEXT REFERENCES proxies(id) ON DELETE SET NULL,
      assigned_label TEXT,
      last_seen_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      device_serial TEXT NOT NULL REFERENCES devices(serial) ON DELETE CASCADE,
      plugin_id TEXT NOT NULL,
      task_type TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}',
      timing_type TEXT NOT NULL DEFAULT 'now', -- 'now' | 'once' | 'interval' | 'daily'
      timing_config TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      next_run_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS executions (
      id TEXT PRIMARY KEY,
      schedule_id TEXT REFERENCES schedules(id) ON DELETE SET NULL,
      device_serial TEXT NOT NULL REFERENCES devices(serial) ON DELETE CASCADE,
      plugin_id TEXT NOT NULL,
      task_type TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'queued', -- 'queued' | 'running' | 'succeeded' | 'failed' | 'stopped'
      started_at TEXT,
      finished_at TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS execution_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      execution_id TEXT NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
      line TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_executions_device_status ON executions(device_serial, status);
    CREATE INDEX IF NOT EXISTS idx_executions_created_at ON executions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_logs_execution ON execution_logs(execution_id);
  `);
}
