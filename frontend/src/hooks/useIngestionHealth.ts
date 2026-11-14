import { useEffect, useState } from "react";
import { API_ENDPOINT } from "../lib/api-endpoint";
import { StorageUtils } from "../utils/storage";

export function useIngestionHealth(
  initialMessage?: string | null,
  autoUpdate?: boolean,
): string | null {
  const [message, setMessage] = useState<string | null>(initialMessage ?? null);

  useEffect(() => {
    const check = async () => {
      try {
        const response = await fetch(`${API_ENDPOINT}/ingestion/health`);
        const text = await response.text();
        setMessage(
          response.ok
            ? null
            : text || "Could not check whether matches are updating.",
        );
      } catch (error) {
        console.error("Error checking match ingestion:", error);
        setMessage("Could not check whether matches are updating.");
      }
    };

    if (initialMessage === undefined) {
      check();
    } else {
      setMessage(initialMessage);
    }

    if (!(autoUpdate ?? StorageUtils.getAutoUpdate())) return;

    const intervalId = setInterval(check, 60000);
    return () => clearInterval(intervalId);
  }, [initialMessage, autoUpdate]);

  return message;
}
