import { proxyActivities, sleep, continueAsNew } from '@temporalio/workflow';
import type * as activities from './activities';

const { fetchBarometricPressure, sendHeadacheAlert } = proxyActivities<typeof activities>({
  startToCloseTimeout: '30 seconds',
  retry: {
    maximumAttempts: 3,
  },
});

const CHECKS_PER_MONTH = 180; // 30 days × 6 checks/day (every 4 hours)

export async function pressureWatchWorkflow(
  lat: number,
  lon: number,
  pressureDropThreshold: number,
  previousPressure: number | null,
): Promise<void> {
  let lastPressure = previousPressure;

  for (let i = 0; i < CHECKS_PER_MONTH; i++) {
    const currentPressure = await fetchBarometricPressure(lat, lon);

    if (lastPressure !== null) {
      const drop = lastPressure - currentPressure;
      if (drop > pressureDropThreshold) {
        await sendHeadacheAlert(
          `⚠️ Barometric pressure is dropping fast. It dropped from ${lastPressure} to ${currentPressure} hPa. Consider taking Advil now before a headache hits.`,
        );
      }
    }

    lastPressure = currentPressure;
    await sleep('4 hours');
  }

  // Reset workflow history monthly while carrying the last reading forward
  await continueAsNew<typeof pressureWatchWorkflow>(lat, lon, pressureDropThreshold, lastPressure);
}
