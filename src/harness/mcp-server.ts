import { FastMCP, imageContent, UserError } from 'fastmcp';
import { z } from 'zod';
import { DeviceDiscovery } from '../devices/discovery.js';
import { AndroidHarness } from './android-harness.js';
import { DeviceLockManager } from './lock-manager.js';
import { TaskQueue } from '../scheduler/queue.js';

export function createHarnessMcpServer(): FastMCP {
  const server = new FastMCP({
    name: 'Android Phone Farm Harness MCP',
    version: '2.0.0',
  });

  // Helper to ensure device is available and lock is acquired for an agent action
  function checkAndLock(serial: string, actionName: string) {
    const lockCheck = DeviceLockManager.acquire(serial, 'agent', actionName, 45000);
    if (!lockCheck.success) {
      throw new UserError(`[Dispositivo Bloqueado] O aparelho ${serial} não está acessível no momento: ${lockCheck.reason}`);
    }
    return lockCheck.lock;
  }

  // 1. List Devices
  server.addTool({
    name: 'farm_list_devices',
    description: 'Lista todos os celulares Android conectados na Farm com status, modelo, versão, bateria, proxy e estado de lock (se está livre, ocupado por script ou ocupado por agente).',
    parameters: z.object({}),
    execute: async () => {
      const devices = DeviceDiscovery.getDevices();
      const locks = DeviceLockManager.getAll();

      const summary = devices.map((d) => {
        const lock = locks[d.serial] || { state: 'idle', reason: 'Livre' };
        return {
          serial: d.serial,
          model: d.model,
          android_version: d.android_version,
          battery: d.battery_level ? `${d.battery_level}%` : 'N/A',
          status: d.status,
          lock_state: lock.state,
          lock_reason: lock.reason,
          proxy_id: d.proxy_id || 'Direct (No Proxy)',
        };
      });

      return JSON.stringify(summary, null, 2);
    },
  });

  // 2. Get Device Screen (Visual Multimodal Screenshot)
  server.addTool({
    name: 'farm_get_screenshot',
    description: 'Captura a tela atual de um dispositivo Android como imagem PNG visual direta para o modelo analisar.',
    parameters: z.object({
      serial: z.string().describe('Serial do aparelho Android (ex: emulator-5554 ou RQCX12345)'),
    }),
    execute: async (args) => {
      const buffer = await AndroidHarness.getScreenshotBuffer(args.serial);
      const img = await imageContent({ buffer });
      return {
        content: [img],
      };
    },
  });

  // 3. Get UI Tree (Compact Structured Element Hierarchy)
  server.addTool({
    name: 'farm_get_ui_tree',
    description: 'Extrai a árvore de elementos visíveis da interface atual (textos, botões, campos de digitação e IDs) com as coordenadas exatas do centro de cada elemento [x, y]. Extremamente eficiente e econômico em tokens.',
    parameters: z.object({
      serial: z.string().describe('Serial do aparelho Android'),
    }),
    execute: async (args) => {
      const elements = await AndroidHarness.getCompactElements(args.serial);
      return JSON.stringify(elements, null, 2);
    },
  });

  // 4. Tap (Touch)
  server.addTool({
    name: 'farm_tap',
    description: 'Executa um toque na tela. Pode ser por coordenadas exatas (x, y) OU automaticamente por busca de elemento (por texto visível, resource-id ou descrição).',
    parameters: z.object({
      serial: z.string().describe('Serial do aparelho Android'),
      x: z.number().optional().describe('Coordenada X absoluta'),
      y: z.number().optional().describe('Coordenada Y absoluta'),
      text: z.string().optional().describe('Texto do elemento para clicar automaticamente (busca na tela)'),
      id: z.string().optional().describe('Resource ID do elemento para clicar'),
      desc: z.string().optional().describe('Content description do elemento para clicar'),
    }),
    execute: async (args) => {
      checkAndLock(args.serial, `farm_tap`);

      try {
        if (args.text) {
          return await AndroidHarness.tapByText(args.serial, args.text);
        }
        if (args.id) {
          return await AndroidHarness.tapById(args.serial, args.id);
        }
        if (args.desc) {
          return await AndroidHarness.tapByDesc(args.serial, args.desc);
        }
        if (typeof args.x === 'number' && typeof args.y === 'number') {
          await AndroidHarness.tap(args.serial, args.x, args.y);
          return `Toque executado em (${args.x}, ${args.y}) no aparelho ${args.serial}`;
        }
        throw new UserError('Você deve fornecer coordenadas (x, y) ou um seletor (text, id, desc).');
      } finally {
        DeviceLockManager.release(args.serial, 'agent');
      }
    },
  });

  // 5. Type Text
  server.addTool({
    name: 'farm_type',
    description: 'Digita texto no campo atualmente ativo/focado no celular Android. Trata automaticamente espaços e caracteres especiais.',
    parameters: z.object({
      serial: z.string().describe('Serial do aparelho Android'),
      text: z.string().describe('Texto a ser digitado'),
    }),
    execute: async (args) => {
      checkAndLock(args.serial, `farm_type: "${args.text}"`);

      try {
        await AndroidHarness.type(args.serial, args.text);
        return `Texto digitado com sucesso no dispositivo ${args.serial}`;
      } finally {
        DeviceLockManager.release(args.serial, 'agent');
      }
    },
  });

  // 6. Swipe / Scroll
  server.addTool({
    name: 'farm_swipe',
    description: 'Executa rolagem/deslize na tela do celular em uma direção cardeal (up, down, left, right). "up" rola para ver mais conteúdo abaixo.',
    parameters: z.object({
      serial: z.string().describe('Serial do aparelho Android'),
      direction: z.enum(['up', 'down', 'left', 'right']).describe('Direção do deslize'),
      durationMs: z.number().optional().default(300).describe('Duração do gesto em milissegundos'),
    }),
    execute: async (args) => {
      checkAndLock(args.serial, `farm_swipe: ${args.direction}`);

      try {
        await AndroidHarness.swipe(args.serial, args.direction, args.durationMs);
        return `Deslize na direção ${args.direction} executado no dispositivo ${args.serial}`;
      } finally {
        DeviceLockManager.release(args.serial, 'agent');
      }
    },
  });

  // 7. Navigation / Hardware Key
  server.addTool({
    name: 'farm_key',
    description: 'Pressiona botões de sistema/físicos: HOME, BACK, RECENTS (multitarefa), ENTER, POWER, etc.',
    parameters: z.object({
      serial: z.string().describe('Serial do aparelho Android'),
      key: z.enum(['HOME', 'BACK', 'RECENTS', 'ENTER', 'POWER', 'VOLUME_UP', 'VOLUME_DOWN']).describe('Botão a ser pressionado'),
    }),
    execute: async (args) => {
      checkAndLock(args.serial, `farm_key: ${args.key}`);

      try {
        await AndroidHarness.pressKey(args.serial, args.key);
        return `Tecla ${args.key} acionada no dispositivo ${args.serial}`;
      } finally {
        DeviceLockManager.release(args.serial, 'agent');
      }
    },
  });

  // 8. Launch or Terminate App
  server.addTool({
    name: 'farm_app',
    description: 'Abre ou encerra aplicativos no celular. Suporta apelidos amigáveis como "whatsapp", "instagram", "tiktok", "youtube", "chrome", "settings" ou o nome completo do pacote Android.',
    parameters: z.object({
      serial: z.string().describe('Serial do aparelho Android'),
      action: z.enum(['launch', 'terminate']).describe('Ação desejada: "launch" para abrir ou "terminate" para fechar'),
      app: z.string().describe('Nome do app ou pacote (ex: "whatsapp" ou "com.whatsapp")'),
    }),
    execute: async (args) => {
      checkAndLock(args.serial, `farm_app: ${args.action} ${args.app}`);

      try {
        if (args.action === 'launch') {
          return await AndroidHarness.launchApp(args.serial, args.app);
        } else {
          return await AndroidHarness.terminateApp(args.serial, args.app);
        }
      } finally {
        DeviceLockManager.release(args.serial, 'agent');
      }
    },
  });

  // 9. Session Lock (Acquire & Release)
  server.addTool({
    name: 'farm_session_lock',
    description: 'Reserva um aparelho para uma sessão contínua de vários passos de um agente, impedindo que scripts agendados ou outros processos interfiram até que a sessão seja liberada.',
    parameters: z.object({
      serial: z.string().describe('Serial do aparelho Android'),
      action: z.enum(['acquire', 'release']).describe('Ação: acquire (reservar) ou release (liberar)'),
      reason: z.string().optional().describe('Motivo da reserva para visualização no dashboard'),
      ttlSeconds: z.number().optional().default(120).describe('Tempo limite em segundos para liberação automática caso o agente caia'),
    }),
    execute: async (args) => {
      if (args.action === 'acquire') {
        const res = DeviceLockManager.acquire(
          args.serial,
          'agent',
          args.reason || 'Sessão agêntica multi-passo',
          (args.ttlSeconds || 120) * 1000
        );
        if (!res.success) {
          throw new UserError(`Não foi possível reservar o aparelho ${args.serial}: ${res.reason}`);
        }
        return `Aparelho ${args.serial} reservado com sucesso para o agente por até ${args.ttlSeconds}s.`;
      } else {
        DeviceLockManager.release(args.serial, 'agent', true);
        return `Aparelho ${args.serial} liberado com sucesso.`;
      }
    },
  });

  return server;
}
