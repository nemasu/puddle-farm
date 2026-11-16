import type { MatchupCharResponse, MatchupEntry } from "../interfaces/API";
import { characterLabel } from "./ladder-characters";
import { firstParam, type PageSearchParams } from "./pagination";
import type { Language } from "./site-preferences";

export type MatrixSort = { column: string; direction: "asc" | "desc" } | null;
export type MatrixKind = "all" | "vanquisher";

export function matrixColumns(rows: MatchupCharResponse[]) {
  const columns = new Map<
    string,
    Pick<MatchupEntry, "char_short" | "char_name">
  >();
  for (const row of rows)
    for (const entry of row.matchups)
      if (!columns.has(entry.char_short)) columns.set(entry.char_short, entry);
  return [...columns.values()];
}
export function matchupRate(entry: MatchupEntry | undefined): number | null {
  return entry && entry.total_games > 0
    ? (entry.wins / entry.total_games) * 100
    : null;
}
export function matrixSort(
  query: PageSearchParams,
  kind: MatrixKind,
  columns: ReturnType<typeof matrixColumns>,
): MatrixSort {
  const value = firstParam(query[`${kind}Sort`]);
  const match = value?.match(/^(.+)-(asc|desc)$/);
  return match &&
    (match[1] === "character" ||
      columns.some((column) => column.char_short === match[1]))
    ? { column: match[1], direction: match[2] as "asc" | "desc" }
    : null;
}
export function matrixSortHref(
  query: PageSearchParams,
  kind: MatrixKind,
  column: string,
  current: MatrixSort,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query))
    if (firstParam(value) !== undefined)
      params.set(key, firstParam(value) ?? "");
  params.set(
    `${kind}Sort`,
    `${column}-${current?.column === column && current.direction === "asc" ? "desc" : "asc"}`,
  );
  return `/matchup?${params}`;
}
export function sortMatrixRows(
  rows: MatchupCharResponse[],
  sort: MatrixSort,
  language: Language,
): MatchupCharResponse[] {
  if (!sort) return rows;
  return [...rows].sort((a, b) => {
    if (sort.column === "character") {
      const result = characterLabel(
        a.char_short,
        a.char_name,
        language,
      ).localeCompare(
        characterLabel(b.char_short, b.char_name, language),
        language,
      );
      return sort.direction === "asc" ? result : -result;
    }
    const ar = matchupRate(
      a.matchups.find((entry) => entry.char_short === sort.column),
    );
    const br = matchupRate(
      b.matchups.find((entry) => entry.char_short === sort.column),
    );
    if (ar === null) return br === null ? 0 : 1;
    if (br === null) return -1;
    return sort.direction === "asc" ? ar - br : br - ar;
  });
}
