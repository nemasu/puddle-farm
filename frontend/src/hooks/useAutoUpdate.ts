import { useEffect, useRef, useState } from "react";
import { StorageUtils } from "../utils/Storage";

export function useAutoUpdate(onUpdate: () => Promise<void>): number | null {
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const updatingRef = useRef(false);

  useEffect(() => {
    if (!StorageUtils.getAutoUpdate()) return;
    countdownRef.current = 60;
    setCountdown(60);

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
        countdownRef.current = 60;
        setCountdown(60);
      }
    }, 1000);

    return () => clearInterval(tick);
  }, [onUpdate]);

  return countdown;
}
