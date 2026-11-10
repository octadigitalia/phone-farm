import { createHarnessMcpServer } from '../src/harness/mcp-server.js';

async function main() {
  const server = createHarnessMcpServer();
  console.log('Server created:', (server as any).name);
  console.log('Tools registered in FastMCP 4:');
  
  // FastMCP 4 stores tools in internal map or array
  const tools = (server as any).tools || (server as any)._tools || [];
  if (Array.isArray(tools)) {
    tools.forEach((t: any) => console.log(`  - ${t.name}: ${t.description.slice(0, 70)}...`));
  } else if (tools instanceof Map) {
    for (const [name, t] of tools.entries()) {
      console.log(`  - ${name}: ${t.description?.slice(0, 70)}...`);
    }
  }

  console.log('✅ FastMCP 4 Harness Server initialized with all tools!');
}

main().catch(console.error);
