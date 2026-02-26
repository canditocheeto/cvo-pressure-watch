import { proxyActivities, sleep, continueAsNew } from '@temporalio/workflow';
import type * as activities from './activities';

const { fetchBarometricPressure, sendHeadacheAlert } = proxyActivities<typeof activities>({
  startToCloseTimeout: '30 seconds',
  retry: {
    maximumAttempts: 3,
  },
});

export async function pressureWatchWorkflow(
  lat: number,
  lon: number,
  pressureDropThreshold: number,
  previousPressure: number | null,
): Promise<void> {
  const currentPressure = await fetchBarometricPressure(lat, lon);

  if (previousPressure !== null) {
    const drop = previousPressure - currentPressure;
    if (drop > pressureDropThreshold) {
      await sendHeadacheAlert(
        `⚠️ Barometric pressure is dropping fast. It dropped from ${previousPressure} to ${currentPressure} hPa. Consider taking Advil now before a headache hits.`,
      );
    }
  }

  await sleep('4 hours');

  await continueAsNew<typeof pressureWatchWorkflow>(lat, lon, pressureDropThreshold, currentPressure);
}
