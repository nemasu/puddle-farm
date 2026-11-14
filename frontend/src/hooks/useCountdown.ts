import { useEffect, useState } from "react";

export interface UseCountdownResult {
  secondsLeft: number;
}

function computeSecondsLeft(targetTimestamp: number): number {
  return Math.floor((targetTimestamp - Date.now()) / 1000);
}

export function useCountdown(
  targetTimestamp: number,
  renderedAt?: number,
): UseCountdownResult {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.floor((targetTimestamp - (renderedAt ?? Date.now())) / 1000),
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
