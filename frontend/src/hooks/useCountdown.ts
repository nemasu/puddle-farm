import { useEffect, useState } from "react";
import type { EpochMs } from "../utils/time";

export interface UseCountdownResult {
  secondsLeft: number;
}

function computeSecondsLeft(targetTimestamp: EpochMs): number {
  return Math.floor((targetTimestamp - Date.now()) / 1000);
}

export function useCountdown(targetTimestamp: EpochMs): UseCountdownResult {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    computeSecondsLeft(targetTimestamp),
  );

  useEffect(() => {
    setSecondsLeft(computeSecondsLeft(targetTimestamp));

    const id = setInterval(() => {
      setSecondsLeft(computeSecondsLeft(targetTimestamp));
    }, 1000);

    return () => clearInterval(id);
  }, [targetTimestamp]);

  return { secondsLeft };
}
