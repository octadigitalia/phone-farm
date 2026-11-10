import { initDatabase } from './database/client.js';
import { DeviceDiscovery } from './devices/discovery.js';
import { farmWorker } from './scheduler/worker.js';
import { createServer } from './api/server.js';
import { attachWebSocketStreamServer } from './devices/h264-stream.js';

async function main() {
  console.log('----------------------------------------------------');
  console.log('🤖 Android Phone Farm Orchestrator & Worker v1.0.0');
  console.log('----------------------------------------------------');

  // 1. Init SQLite database
  console.log('[Database] Inicializando banco SQLite local...');
  initDatabase();

  // 2. Discover devices via ADB
  console.log('[ADB] Escaneando dispositivos USB/Wi-Fi...');
  try {
    const devices = await DeviceDiscovery.scanDevices();
    console.log(`[ADB] ${devices.length} dispositivo(s) detectado(s).`);
    devices.forEach((d) => {
      console.log(`  📱 [${d.serial}] ${d.model || 'Unknown'} (Android ${d.android_version || '?'}) - ${d.status.toUpperCase()}`);
    });
    // Start continuous battery and health monitoring in background
    DeviceDiscovery.startMonitoring(4000);
  } catch (err: any) {
    console.warn(`[ADB] Aviso ao escanear dispositivos: ${err.message}`);
  }

  // 3. Start Scheduler Worker (Queue processing with singleton lock)
  farmWorker.start();

  // 4. Start Fastify Web Dashboard
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3300;
  const app = createServer();

  try {
    await app.listen({ port, host: '0.0.0.0' });
    attachWebSocketStreamServer(app.server);
    console.log(`\n🚀 Dashboard da Farm rodando em: http://localhost:${port}`);
    console.log(`   📡 Streaming H.264 fluido ativo via WebSocket em: ws://localhost:${port}/stream/:serial`);
    console.log('   Pressione Ctrl+C para encerrar.\n');
  } catch (err) {
    console.error('Erro ao iniciar servidor HTTP:', err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
