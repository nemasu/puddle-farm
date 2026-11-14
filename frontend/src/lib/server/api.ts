import "server-only";

import { cache } from "react";
import { parseApiJson } from "../api-json";

const REQUEST_TIMEOUT_MS = 10_000;

export class ApiError extends Error {
  constructor(public readonly status: number) {
    super(`The API returned HTTP ${status}.`);
  }
}

// The origin is configured at runtime; no backend is contacted during builds.
export const readApiResponse = cache(async (path: string) => {
  const origin = process.env.GGST_API_INTERNAL_URL ?? "http://127.0.0.1:8001";
  const response = await fetch(`${origin.replace(/\/$/, "")}/api${path}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  return {
    ok: response.ok,
    status: response.status,
    body: await response.text(),
  };
});

export async function readApi(path: string): Promise<string> {
  const response = await readApiResponse(path);
  if (!response.ok) throw new ApiError(response.status);
  return response.body;
}

export async function readJson<T>(path: string): Promise<T> {
  // Parse backend IDs without losing precision above Number.MAX_SAFE_INTEGER.
  return parseApiJson<T>(await readApi(path));
}
