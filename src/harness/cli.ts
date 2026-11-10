import { createHarnessMcpServer } from './mcp-server.js';
import { DeviceDiscovery } from '../devices/discovery.js';

async function main() {
  try {
    await DeviceDiscovery.scanDevices();
  } catch (err) {
    console.error('Initial device scan error:', err);
  }

  const server = createHarnessMcpServer();
  await server.start({
    transportType: 'stdio',
  });
}

main().catch((err) => {
  console.error('Fatal Harness MCP error:', err);
  process.exit(1);
});
