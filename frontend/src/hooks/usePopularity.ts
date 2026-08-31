import { useRef } from "react";
import type { PopularityResult } from "../interfaces/API";

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT;

export function fetchPopularity(): Promise<PopularityResult | undefined> {
  return fetch(`${API_ENDPOINT}/popularity`)
    .then((res) => res.json())
    .catch(() => undefined);
}

export function usePopularityPromise(): Promise<PopularityResult | undefined> {
  const cacheRef = useRef<Promise<PopularityResult | undefined> | null>(null);
  if (!cacheRef.current) {
    cacheRef.current = fetchPopularity();
  }
  return cacheRef.current;
}
