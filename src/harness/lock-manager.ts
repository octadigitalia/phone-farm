import { db } from '../database/client.js';
import type { LockActor, LockState, DeviceLockInfo } from './types.js';

export class DeviceLockManager {
  private static locks = new Map<string, DeviceLockInfo>();

  /**
   * Retrieves the current lock status of a device, automatically clearing expired locks.
   */
  static getLock(serial: string): DeviceLockInfo {
    const existing = this.locks.get(serial);
    const now = Date.now();

    if (existing) {
      if (existing.expiresAt > 0 && now > existing.expiresAt) {
        // Expired
        this.locks.delete(serial);
        this.syncDbStatus(serial, 'online');
      } else {
        return existing;
      }
    }

    return {
      serial,
      state: 'idle',
      owner: 'none',
      reason: 'Livre para comandos',
      acquiredAt: 0,
      expiresAt: 0,
    };
  }

  /**
   * Check if a specific actor is allowed to execute on the device.
   */
  static check(serial: string, actor: LockActor): { allowed: boolean; reason?: string; lock: DeviceLockInfo } {
    const current = this.getLock(serial);

    if (current.state === 'idle') {
      return { allowed: true, lock: current };
    }

    // If the same actor already holds the lock, allow it (re-entrant)
    if (
      (actor === 'manual' && current.state === 'manual_override') ||
      (actor === 'script' && current.state === 'script_running') ||
      (actor === 'agent' && current.state === 'agent_active')
    ) {
      return { allowed: true, lock: current };
    }

    // Manual intervention has override capability unless explicitly locked by admin
    if (actor === 'manual') {
      // Manual touches are allowed but will warn or take over if requested
      return { allowed: true, lock: current };
    }

    // Otherwise, conflict!
    const conflictDescriptions: Record<LockState, string> = {
      idle: 'Dispositivo livre',
      script_running: `Ocupado por plugin/script agendado (${current.owner}: "${current.reason}")`,
      agent_active: `Ocupado por Agente de IA (${current.owner}: "${current.reason}")`,
      manual_override: `Usuário interagindo manualmente no painel (${current.reason})`,
    };

    return {
      allowed: false,
      reason: conflictDescriptions[current.state] || 'Dispositivo ocupado',
      lock: current,
    };
  }

  /**
   * Acquire a lock for an actor.
   */
  static acquire(
    serial: string,
    actor: LockActor,
    reason: string,
    ttlMs: number = 60000,
    owner?: string
  ): { success: boolean; reason?: string; lock: DeviceLockInfo } {
    const check = this.check(serial, actor);

    if (!check.allowed && actor !== 'manual') {
      return { success: false, reason: check.reason, lock: check.lock };
    }

    const stateMap: Record<LockActor, LockState> = {
      manual: 'manual_override',
      script: 'script_running',
      agent: 'agent_active',
    };

    const state = stateMap[actor];
    const now = Date.now();
    const lockInfo: DeviceLockInfo = {
      serial,
      state,
      owner: owner || `${actor}:${serial}`,
      reason,
      acquiredAt: now,
      expiresAt: now + ttlMs,
    };

    this.locks.set(serial, lockInfo);
    this.syncDbStatus(serial, state === 'idle' ? 'online' : 'busy');

    return { success: true, lock: lockInfo };
  }

  /**
   * Record a human manual touch from the web dashboard.
   * Gives a rolling 15s window where manual interaction takes priority.
   */
  static touchManual(serial: string): void {
    const current = this.getLock(serial);
    // Don't override an in-progress script unless forced, but if idle or manual, refresh
    if (current.state === 'idle' || current.state === 'manual_override') {
      this.acquire(serial, 'manual', 'Interação ativa no dashboard', 15000, 'dashboard-user');
    }
  }

  /**
   * Release a lock.
   */
  static release(serial: string, actor: LockActor, force: boolean = false): boolean {
    const current = this.getLock(serial);

    if (current.state === 'idle') return true;

    // Check ownership unless forced
    const stateMap: Record<LockActor, LockState> = {
      manual: 'manual_override',
      script: 'script_running',
      agent: 'agent_active',
    };

    if (!force && current.state !== stateMap[actor]) {
      // Not owner
      return false;
    }

    this.locks.delete(serial);
    this.syncDbStatus(serial, 'online');
    return true;
  }

  /**
   * Force reset all locks on a device (e.g. via dashboard button "Intervir / Liberar").
   */
  static forceReset(serial: string): void {
    this.locks.delete(serial);
    this.syncDbStatus(serial, 'online');
  }

  /**
   * Returns all active locks for the dashboard and API.
   */
  static getAll(): Record<string, DeviceLockInfo> {
    const result: Record<string, DeviceLockInfo> = {};
    const now = Date.now();

    for (const [serial, lock] of this.locks.entries()) {
      if (lock.expiresAt > 0 && now > lock.expiresAt) {
        this.locks.delete(serial);
        this.syncDbStatus(serial, 'online');
      } else {
        result[serial] = lock;
      }
    }

    return result;
  }

  private static syncDbStatus(serial: string, status: 'online' | 'busy' | 'offline') {
    try {
      db.prepare('UPDATE devices SET status = ? WHERE serial = ?').run(status, serial);
    } catch {}
  }
}
