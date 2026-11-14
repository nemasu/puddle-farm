import { useEffect, useRef, useState } from "react";
import { StorageUtils } from "../utils/storage";

const AUTO_UPDATE_SECONDS = 120;

export function useAutoUpdate(
  onUpdate: () => Promise<void>,
  enabled?: boolean,
): number | null {
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const updatingRef = useRef(false);

  useEffect(() => {
    if (!(enabled ?? StorageUtils.getAutoUpdate())) {
      setCountdown(null);
      return;
    }
    countdownRef.current = AUTO_UPDATE_SECONDS;
    setCountdown(AUTO_UPDATE_SECONDS);

    const tick = setInterval(async () => {
      if (countdownRef.current !== null && countdownRef.current > 1) {
        countdownRef.current -= 1;
        setCountdown(countdownRef.current);
        return;
      }
      if (updatingRef.current) return;
      updatingRef.current = true;
      try {
        await onUpdate();
      } finally {
        updatingRef.current = false;
        countdownRef.current = AUTO_UPDATE_SECONDS;
        setCountdown(AUTO_UPDATE_SECONDS);
      }
    }, 1000);

    return () => clearInterval(tick);
  }, [onUpdate, enabled]);

  return countdown;
}
