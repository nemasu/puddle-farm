import "server-only";

import { readApiResponse } from "./api";

export async function getIngestionStatus(
  fallback: string,
): Promise<string | null> {
  try {
    const response = await readApiResponse("/ingestion/health");
    return response.ok ? null : response.body || fallback;
  } catch {
    return fallback;
  }
}
