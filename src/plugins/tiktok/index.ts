import type { PluginDefinition } from '../types.js';

export const TikTokPlugin: PluginDefinition = {
  id: 'tiktok',
  name: 'TikTok Automation',
  description: 'Workflows for TikTok feed browsing, video engagement and warm-up',
  tasks: [
    {
      id: 'scroll_feed',
      name: 'Scroll & Watch Feed',
      description: 'Opens TikTok and watches a specified number of videos with natural delays',
      defaultPayload: {
        videoCount: 5,
        delayPerVideoSec: 4,
      },
      execute: async (ctx, payload) => {
        const count = payload.videoCount || 5;
        const delayMs = (payload.delayPerVideoSec || 4) * 1000;

        await ctx.log(`[TikTok] Acordando o dispositivo ${ctx.deviceSerial}...`);
        await ctx.adb.wakeUp(ctx.deviceSerial);

        await ctx.log('[TikTok] Abrindo o app TikTok...');
        await ctx.adb.launchApp(ctx.deviceSerial, 'com.zhiliaoapp.musically');
        await ctx.sleep(5000);

        // Get screen size to adjust swipe coordinates dynamically
        const size = await ctx.adb.getScreenSize(ctx.deviceSerial);
        const midX = size ? Math.round(size.width / 2) : 540;
        const startY = size ? Math.round(size.height * 0.75) : 1700;
        const endY = size ? Math.round(size.height * 0.2) : 400;

        for (let i = 1; i <= count; i++) {
          if (ctx.signal.aborted) {
            await ctx.log('[TikTok] Execução interrompida pelo usuário.');
            return;
          }

          await ctx.log(`[TikTok] Assistindo vídeo ${i}/${count} (${delayMs / 1000}s)...`);
          await ctx.sleep(delayMs);

          if (i < count) {
            await ctx.log(`[TikTok] Rolando para o próximo vídeo (${i} ➜ ${i + 1})...`);
            await ctx.adb.swipe(ctx.deviceSerial, midX, startY, midX, endY, 250);
            await ctx.sleep(800);
          }
        }

        await ctx.log(`[TikTok] Fluxo concluído! Total de ${count} vídeos assistidos.`);
      },
    },
    {
      id: 'warmup_account',
      name: 'Account Warmup (Watch + Random Likes)',
      description: 'Browses videos and occasionally likes to build account activity history',
      defaultPayload: {
        videoCount: 8,
        likeChancePercent: 30,
      },
      execute: async (ctx, payload) => {
        const count = payload.videoCount || 8;
        const likeChance = payload.likeChancePercent || 30;

        await ctx.log(`[Warmup] Iniciando aquecimento da conta no dispositivo ${ctx.deviceSerial}`);
        await ctx.adb.launchApp(ctx.deviceSerial, 'com.zhiliaoapp.musically');
        await ctx.sleep(5000);

        const size = await ctx.adb.getScreenSize(ctx.deviceSerial);
        const midX = size ? Math.round(size.width / 2) : 540;
        const midY = size ? Math.round(size.height / 2) : 1100;
        const startY = size ? Math.round(size.height * 0.75) : 1700;
        const endY = size ? Math.round(size.height * 0.2) : 400;

        for (let i = 1; i <= count; i++) {
          if (ctx.signal.aborted) return;

          const randomWatchTime = 3000 + Math.random() * 4000;
          await ctx.log(`[Warmup] Assistindo vídeo ${i} por ${(randomWatchTime / 1000).toFixed(1)}s...`);
          await ctx.sleep(randomWatchTime);

          // Random like (double tap)
          const roll = Math.random() * 100;
          if (roll <= likeChance) {
            await ctx.log(`[Warmup] ❤️ Curtindo vídeo ${i} (toque duplo)...`);
            await ctx.adb.tap(ctx.deviceSerial, midX, midY);
            await ctx.sleep(100);
            await ctx.adb.tap(ctx.deviceSerial, midX, midY);
            await ctx.sleep(1000);
          }

          if (i < count) {
            await ctx.adb.swipe(ctx.deviceSerial, midX, startY, midX, endY, 250);
            await ctx.sleep(1000);
          }
        }

        await ctx.log('[Warmup] Aquecimento concluído com sucesso!');
      },
    },
  ],
};
