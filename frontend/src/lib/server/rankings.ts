import "server-only";

import type { RankResponse } from "../../interfaces/API";
import type { Pagination } from "../pagination";
import { normalizeRanking } from "../rankings";
import { readJson } from "./api";

export async function getLegendRanking() {
  return normalizeRanking(
    await readJson<RankResponse>("/top_legend?count=100"),
  );
}

export async function getRanking(
  { count, offset }: Pagination,
  character?: string,
) {
  const endpoint = character
    ? `/top_char/${encodeURIComponent(character)}`
    : "/top";
  return normalizeRanking(
    await readJson<RankResponse>(`${endpoint}?count=${count}&offset=${offset}`),
  );
}
