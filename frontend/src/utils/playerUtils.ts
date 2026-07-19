import type { PlayerResponse, PlayerResponsePlayer } from "../interfaces/API";
import type { GroupedMatch } from "../interfaces/Player";

const DEFAULT_COUNT = 100;

export function isEmptyPlayer(player: PlayerResponse): boolean {
  return player.id === "0";
}

export function parsePlayerId(player_id: string | undefined): bigint {
  if (!player_id) return BigInt(0);
  if (player_id.match(/[a-zA-Z]/)) return BigInt(`0x${player_id}`);
  return BigInt(player_id);
}

export function filterHistory(
  history: GroupedMatch[],
  matchFilter: "all" | "ranked" | "tower",
): GroupedMatch[] {
  if (matchFilter === "ranked") return history.filter((m) => m.floor === "0");
  if (matchFilter === "tower") return history.filter((m) => m.floor !== "0");
  return history;
}

export function calcPrevOffset(
  count: string | undefined,
  offset: string | undefined,
): { count: number; offset: number } {
  const parsedCount = count ? parseInt(count, 10) : DEFAULT_COUNT;
  const c = parsedCount < 0 ? DEFAULT_COUNT : parsedCount;
  const o = Math.max(0, (offset ? parseInt(offset, 10) : 0) - c);
  return { count: c, offset: o };
}

export function findHighestRatedChar(ratings: PlayerResponsePlayer[]): string {
  let highest = -1;
  let result = "SO";
  for (const r of ratings) {
    if (Number(r.rating) > highest) {
      highest = Number(r.rating);
      result = r.char_short;
    }
  }
  return result;
}

export function findCharData(
  ratings: PlayerResponsePlayer[],
  char_short: string,
): PlayerResponsePlayer | null {
  return ratings.find((r) => r.char_short === char_short) ?? null;
}

export function shouldShowNext(
  historyLength: number,
  count: string | undefined,
): boolean {
  return historyLength >= (count ? Number(count) : DEFAULT_COUNT);
}

export function calcNextOffset(
  count: string | undefined,
  offset: string | undefined,
): { count: number; offset: number } {
  const c = count ? parseInt(count, 10) : DEFAULT_COUNT;
  const o = (offset ? parseInt(offset, 10) : 0) + c;
  return { count: c, offset: o };
}
