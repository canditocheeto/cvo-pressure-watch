import { NativeConnection, Worker } from '@temporalio/worker';
import * as activities from './activities';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config();

async function main() {
  // Connect to Temporal Cloud using API key auth (Bearer token), no mTLS
  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_ADDRESS!,
    tls: true,
    apiKey: process.env.TEMPORAL_API_KEY!,
  });

  const worker = await Worker.create({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE!,
    taskQueue: 'cvo-pressure-watch',
    workflowsPath: path.resolve(__dirname, './workflows'),
    activities,
  });

  console.log('Worker started, polling task queue: cvo-pressure-watch');
  await worker.run();
}

main().catch((err) => {
  console.error('Worker failed:', err);
  process.exit(1);
});
