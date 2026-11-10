import type { PluginDefinition, TaskDefinition } from './types.js';
import { TikTokPlugin } from './tiktok/index.js';

export class PluginRegistry {
  private static plugins = new Map<string, PluginDefinition>();

  static register(plugin: PluginDefinition) {
    this.plugins.set(plugin.id, plugin);
  }

  static getPlugin(id: string): PluginDefinition | undefined {
    return this.plugins.get(id);
  }

  static getAllPlugins(): PluginDefinition[] {
    return Array.from(this.plugins.values());
  }

  static getTask(pluginId: string, taskId: string): TaskDefinition | undefined {
    const plugin = this.getPlugin(pluginId);
    return plugin?.tasks.find((t) => t.id === taskId);
  }
}

// Register built-in plugins
PluginRegistry.register(TikTokPlugin);
