import { useEffect, useState } from "react";
import { StorageUtils } from "../utils/storage";

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT;

export function useIngestionHealth(): string | null {
  const [message, setMessage] = useState<string | null>(null);

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

    check();

    if (!StorageUtils.getAutoUpdate()) return;

    const intervalId = setInterval(check, 60000);
    return () => clearInterval(intervalId);
  }, []);

  return message;
}
