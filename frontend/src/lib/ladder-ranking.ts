import { firstParam, type PageSearchParams } from "./pagination";
import type { RankingEntry } from "./rankings";

export function filterLegend(ranks: RankingEntry[], params: PageSearchParams) {
  const requestedCharacter = firstParam(params.character) ?? "";
  const character = ranks.some((rank) => rank.char_short === requestedCharacter)
    ? requestedCharacter
    : "";
  return {
    character,
    ranks: character
      ? ranks.filter((rank) => rank.char_short === character)
      : ranks,
  };
}
