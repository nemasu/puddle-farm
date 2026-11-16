"use server";

import { parsePlayerRoute } from "../../lib/player";
import { getPlayer } from "../../lib/server/player";
import { findHighestRatedChar, isEmptyPlayer } from "../../utils/playerUtils";

export async function resolvePlayerDestination(
  playerId: bigint,
): Promise<string> {
  const route =
    typeof playerId === "bigint" ? parsePlayerRoute(playerId.toString()) : null;
  if (!route) return "/";
  const base = `/player/${route.id}`;
  try {
    const player = await getPlayer(route.id);
    return !isEmptyPlayer(player) && player.ratings.length
      ? `${base}/${encodeURIComponent(findHighestRatedChar(player.ratings))}`
      : base;
  } catch {
    // Let the player route render its normal missing/unavailable state.
    return base;
  }
}
