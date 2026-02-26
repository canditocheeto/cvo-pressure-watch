import { Connection, Client } from '@temporalio/client';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const connection = await Connection.connect({
    address: process.env.TEMPORAL_ADDRESS!,
    tls: true,
    apiKey: process.env.TEMPORAL_API_KEY!,
  });

  const client = new Client({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE!,
  });

  const handle = await client.workflow.start('testAlertWorkflow', {
    taskQueue: 'cvo-pressure-watch',
    workflowId: `test-alert-${Date.now()}`,
    args: [],
  });

  console.log(`Started test workflow: ${handle.workflowId}`);
  const result = await handle.result();
  console.log(`Result: ${result}`);
}

main().catch((err) => {
  console.error('Test alert failed:', err);
  process.exit(1);
});
