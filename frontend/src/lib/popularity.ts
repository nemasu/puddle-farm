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
