import { AdbBridge } from '../devices/adb.js';

export interface TaskContext {
  executionId: string;
  deviceSerial: string;
  signal: AbortSignal;
  log: (message: string) => Promise<void>;
  sleep: (ms: number) => Promise<void>;
  adb: typeof AdbBridge;
}

export interface TaskDefinition<TPayload = any> {
  id: string;
  name: string;
  description: string;
  defaultPayload: TPayload;
  execute: (context: TaskContext, payload: TPayload) => Promise<void>;
}

export interface PluginDefinition {
  id: string;
  name: string;
  description: string;
  tasks: TaskDefinition[];
}
