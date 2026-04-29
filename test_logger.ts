import 'dotenv/config';
import { logMcpAccess } from './src/db/logger.js';

async function run() {
  console.log('Testing logMcpAccess...');
  try {
    await logMcpAccess(
      'TestModel',
      'TestClient',
      'TestEndpoint',
      'TestTool',
      { teste: "sucesso", detalhes: "testando db logger inline insert" },
      'TestConnection'
    );
    console.log('logMcpAccess finished. Check DB/logs!');
  } catch (err) {
    console.error('Error testing:', err);
  } finally {
    process.exit(0);
  }
}

run();
