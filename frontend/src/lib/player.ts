import type { PlayerGamesResponse, PlayerResponse } from "../interfaces/API";
import { groupMatches } from "../utils/player";
import { type Pagination, parsePagination } from "./pagination";

export function parsePlayerRoute(rawId: string, segments: string[] = []) {
  const id = normalizePlayerId(rawId);
  const pagination = parsePagination(segments.slice(1));
  if (
    id === null ||
    segments.length > 3 ||
    !pagination ||
    !Number.isSafeInteger(pagination.count + 1)
  )
    return null;
  return { id, character: segments[0], pagination };
}

export function normalizePlayerId(value: string): bigint | null {
  let id: bigint;
  if (/^\d{1,19}$/.test(value)) id = BigInt(value);
  else if (/^(?:0x)?[0-9a-f]{1,16}$/i.test(value))
    id = BigInt(`0x${value.replace(/^0x/i, "")}`);
  else return null;
  return id <= 9223372036854775807n ? id : null;
}

export function normalizePlayer(player: PlayerResponse): PlayerResponse {
  return {
    ...player,
    ratings: player.ratings.map((rating) => ({
      ...rating,
      rating: Number(Number(rating.rating).toFixed(2)),
    })),
  };
}

export function historyRequest({ count, offset }: Pagination): Pagination {
  return offset > 0
    ? { count: count + 1, offset: offset - 1 }
    : { count, offset };
}

export function buildPlayerHistory(
  data: PlayerGamesResponse,
  player: PlayerResponse,
  character: string,
  pagination: Pagination,
) {
  const overlap = pagination.offset > 0 ? 1 : 0;
  // groupMatches mutates its input; never mutate a cached/previous response.
  const matches = data.history.map((match) => ({
    ...match,
  }));
  return {
    groups:
      matches.length > overlap
        ? groupMatches(matches, player, character, overlap > 0)
        : [],
    tags: data.tags,
    showNext: matches.length - overlap >= pagination.count,
  };
}
