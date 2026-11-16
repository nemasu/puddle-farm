import { firstParam, type PageSearchParams } from "./pagination";
import type { RankingEntry } from "./rankings";

export function filterLegend(ranks: RankingEntry[], params: PageSearchParams) {
  const query = (firstParam(params.q) ?? "").trim().slice(0, 200);
  const requestedCharacter = firstParam(params.character) ?? "";
  const character = ranks.some((rank) => rank.char_short === requestedCharacter)
    ? requestedCharacter
    : "";
  return {
    query,
    character,
    ranks: ranks.filter(
      (rank) =>
        (!character || rank.char_short === character) &&
        (!query || rank.name.toLowerCase().includes(query.toLowerCase())),
    ),
  };
}
