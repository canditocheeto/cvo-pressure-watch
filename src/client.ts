import { Connection, Client, WorkflowExecutionAlreadyStartedError } from '@temporalio/client';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  // Connect to Temporal Cloud using API key auth (Bearer token), no mTLS
  const connection = await Connection.connect({
    address: process.env.TEMPORAL_ADDRESS!,
    tls: true,
    apiKey: process.env.TEMPORAL_API_KEY!,
  });

  const client = new Client({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE!,
  });

  const lat = 44.22;
  const lon = -77.68;
  const pressureDropThreshold = 5; // hPa

  try {
    const handle = await client.workflow.start('pressureWatchWorkflow', {
      taskQueue: 'cvo-pressure-watch',
      workflowId: 'pressure-watch-location',
      args: [lat, lon, pressureDropThreshold, null],
    });

    console.log(`Started workflow: ${handle.workflowId}`);
    console.log(`Monitoring barometric pressure at (${lat}, ${lon})`);
    console.log(`Alert threshold: ${pressureDropThreshold} hPa drop per 4-hour window`);
  } catch (err) {
    if (err instanceof WorkflowExecutionAlreadyStartedError) {
      console.log('Workflow already running, skipping start.');
    } else {
      throw err;
    }
  }
}

main().catch((err) => {
  console.error('Client failed:', err);
  process.exit(1);
});
