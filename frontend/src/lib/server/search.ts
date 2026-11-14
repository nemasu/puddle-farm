import "server-only";

import type { SearchResponse } from "../../interfaces/API";
import { readJson } from "./api";

export async function getSearchResults(query: string, exact: boolean) {
  if (!query) return [];
  const params = new URLSearchParams({
    search_string: query,
    exact: String(exact),
  });
  const response = await readJson<SearchResponse>(`/player/search?${params}`);
  return response.results ?? [];
}
