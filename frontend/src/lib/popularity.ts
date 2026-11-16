import { firstParam, type PageSearchParams } from "./pagination";

export type SortColumn = "character" | "popularity";
export type SortState =
  | { column: "character"; direction: "reversed" }
  | { column: "popularity"; direction: "asc" | "desc" }
  | null;

export function nextSortState(
  current: SortState,
  clicked: SortColumn,
): SortState {
  if (clicked === "character") {
    return current?.column === "character"
      ? null
      : { column: "character", direction: "reversed" };
  }
  if (current === null || current.column !== "popularity") {
    return { column: "popularity", direction: "desc" };
  }
  return current.direction === "desc"
    ? { column: "popularity", direction: "asc" }
    : null;
}

export function sortPopularityData<T extends { name: string; value: number }>(
  items: T[],
  sortState: SortState,
): T[] {
  if (sortState === null) {
    return items;
  }
  if (sortState.column === "character") {
    return [...items].reverse();
  }
  const sorted = [...items].sort((a, b) => a.value - b.value);
  return sortState.direction === "asc" ? sorted : sorted.reverse();
}

export function parsePopularitySort(value?: string): SortState {
  return value === "character-reversed"
    ? { column: "character", direction: "reversed" }
    : value === "popularity-asc" || value === "popularity-desc"
      ? {
          column: "popularity",
          direction: value === "popularity-asc" ? "asc" : "desc",
        }
      : null;
}

export function popularitySortHref(
  query: PageSearchParams,
  kind: "player" | "character",
  column: SortColumn,
): string {
  const key = `${kind}Sort`;
  const next = nextSortState(
    parsePopularitySort(firstParam(query[key])),
    column,
  );
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(query))
    if (firstParam(value) !== undefined)
      params.set(name, firstParam(value) ?? "");
  if (next) params.set(key, `${next.column}-${next.direction}`);
  else params.delete(key);
  return `/popularity${params.size ? `?${params}` : ""}`;
}
