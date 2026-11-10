import { db } from '../database/client.js';
import { AdbBridge } from '../devices/adb.js';
import { PluginRegistry } from '../plugins/registry.js';
import { DeviceLockManager } from '../harness/lock-manager.js';
import { TaskQueue, type ExecutionRecord } from './queue.js';
import { ScheduleManager } from './schedules.js';

class FarmWorker {
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;
  private activeControllers = new Map<string, AbortController>(); // executionId -> AbortController

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[Worker] Farm worker scheduler iniciado.');
    this.tick();
  }

  stop() {
    this.isRunning = false;
    if (this.timer) clearTimeout(this.timer);
    for (const [id, controller] of this.activeControllers) {
      controller.abort();
    }
    this.activeControllers.clear();
  }

  private async tick() {
    try {
      // 1. Check and trigger due recurring schedules
      ScheduleManager.checkAndTriggerDueSchedules();
      // 2. Process task queue
      await this.processQueue();
    } catch (err) {
      console.error('[Worker] Erro no loop de processamento:', err);
    } finally {
      if (this.isRunning) {
        this.timer = setTimeout(() => this.tick(), 1500);
      }
    }
  }

  private async processQueue() {
    // 1. Get all queued executions
    const queued = db.prepare(`
      SELECT * FROM executions 
      WHERE status = 'queued' 
      ORDER BY created_at ASC
    `).all() as ExecutionRecord[];

    if (queued.length === 0) return;

    // 2. Get list of devices currently executing a task (Singleton Device Lock)
    const busyDevices = new Set<string>(
      (db.prepare("SELECT DISTINCT device_serial FROM executions WHERE status = 'running'").all() as any[]).map(
        (r) => r.device_serial
      )
    );

    for (const job of queued) {
      // If this device is already running a job or locked by an agent / manual user, skip for now!
      if (busyDevices.has(job.device_serial)) {
        continue;
      }

      const lockCheck = DeviceLockManager.check(job.device_serial, 'script');
      if (!lockCheck.allowed) {
        continue; // Device locked by an agent or manual interaction
      }

      // Claim the device for this job
      busyDevices.add(job.device_serial);
      this.runJob(job).catch((err) => {
        console.error(`[Worker] Erro não tratado no job ${job.id}:`, err);
      });
    }
  }

  private async runJob(job: ExecutionRecord) {
    const task = PluginRegistry.getTask(job.plugin_id, job.task_type);
    if (!task) {
      db.prepare(`
        UPDATE executions 
        SET status = 'failed', error_message = ?, finished_at = datetime('now') 
        WHERE id = ?
      `).run(`Plugin ou tarefa não encontrada: ${job.plugin_id}.${job.task_type}`, job.id);
      return;
    }

    // Mark execution as running and device as busy
    db.prepare(`
      UPDATE executions 
      SET status = 'running', started_at = datetime('now') 
      WHERE id = ?
    `).run(job.id);

    db.prepare("UPDATE devices SET status = 'busy' WHERE serial = ?").run(job.device_serial);
    DeviceLockManager.acquire(job.device_serial, 'script', `Plugin: ${job.plugin_id}.${job.task_type}`, 300000, `worker:${job.id}`);

    const abortController = new AbortController();
    this.activeControllers.set(job.id, abortController);

    const logFn = async (line: string) => {
      console.log(`[Job ${job.id.slice(0, 8)}] ${line}`);
      TaskQueue.appendLog(job.id, line);
    };

    const sleepFn = (ms: number) => {
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(resolve, ms);
        abortController.signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Execução cancelada'));
        });
      });
    };

    let payload: any = {};
    try {
      payload = JSON.parse(job.payload_json || '{}');
    } catch {}

    try {
      await logFn(`Iniciando tarefa "${task.name}" no dispositivo ${job.device_serial}`);
      await task.execute(
        {
          executionId: job.id,
          deviceSerial: job.device_serial,
          signal: abortController.signal,
          log: logFn,
          sleep: sleepFn,
          adb: AdbBridge,
        },
        payload
      );

      db.prepare(`
        UPDATE executions 
        SET status = 'succeeded', finished_at = datetime('now') 
        WHERE id = ?
      `).run(job.id);
      await logFn('Tarefa finalizada com sucesso.');
    } catch (err: any) {
      const errorMsg = err.message || String(err);
      const isAbort = abortController.signal.aborted;
      const finalStatus = isAbort ? 'stopped' : 'failed';

      db.prepare(`
        UPDATE executions 
        SET status = ?, error_message = ?, finished_at = datetime('now') 
        WHERE id = ?
      `).run(finalStatus, errorMsg, job.id);
      await logFn(`Tarefa encerrada (${finalStatus}): ${errorMsg}`);
    } finally {
      this.activeControllers.delete(job.id);
      DeviceLockManager.release(job.device_serial, 'script', true);
      db.prepare("UPDATE devices SET status = 'online' WHERE serial = ?").run(job.device_serial);
    }
  }

  cancelJob(executionId: string): boolean {
    const controller = this.activeControllers.get(executionId);
    if (controller) {
      controller.abort();
      return true;
    }
    // If it was still queued, just mark it stopped
    const res = db.prepare("UPDATE executions SET status = 'stopped' WHERE id = ? AND status = 'queued'").run(executionId);
    return res.changes > 0;
  }
}

export const farmWorker = new FarmWorker();
