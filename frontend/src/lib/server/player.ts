import "server-only";

import { cache } from "react";
import type {
  MatchupResponse,
  PlayerGamesResponse,
  PlayerResponse,
  RatingsResponse,
} from "../../interfaces/API";
import type { Matchups } from "../../interfaces/PlayerMatchups";
import type { Pagination } from "../pagination";
import { buildPlayerHistory, historyRequest, normalizePlayer } from "../player";
import { readApiResponse, readJson } from "./api";

export const getPlayer = cache(async (id: bigint) =>
  normalizePlayer(await readJson<PlayerResponse>(`/player/${id}`)),
);

export async function getPlayerHistory(
  player: PlayerResponse,
  character: string,
  pagination: Pagination,
) {
  const request = historyRequest(pagination);
  const data = await readJson<PlayerGamesResponse>(
    `/player/${player.id}/${encodeURIComponent(character)}/history?count=${request.count}&offset=${request.offset}`,
  );
  return buildPlayerHistory(data, player, character, pagination);
}

export async function optionalJson<T>(path: string): Promise<T | null> {
  try {
    return await readJson<T>(path);
  } catch {
    return null;
  }
}

export async function getPlayerComment(id: bigint): Promise<string | null> {
  try {
    const response = await readApiResponse(`/comment/${id}`);
    return response.ok ? response.body : null;
  } catch {
    return null;
  }
}

export async function getPlayerChartData(
  id: bigint,
  character: string,
  games: number,
) {
  return optionalJson<RatingsResponse[]>(
    `/ratings/${id}/${encodeURIComponent(character)}/${Math.min(100, games)}`,
  );
}

export const getPlayerMatchupData = cache(
  async (id: bigint, character: string) => {
    const [personal, global] = await Promise.all([
      optionalJson<Matchups>(
        `/matchups/${id}/${encodeURIComponent(character)}/12`,
      ),
      optionalJson<MatchupResponse>("/matchups"),
    ]);
    return {
      personal,
      global:
        global?.data_all.find((entry) => entry.char_short === character)
          ?.matchups ?? null,
    };
  },
);
