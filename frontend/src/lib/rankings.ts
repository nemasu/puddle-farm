import type { CSSProperties } from "react";
import type { PlayerRankResponse, RankResponse } from "../interfaces/API";
import { type EpochMs, parseUtcTimestamp } from "../utils/time";

export interface RankingTag {
  tag: string;
  style: CSSProperties;
}

export interface RankingEntry extends Omit<PlayerRankResponse, "tags"> {
  tags: RankingTag[];
}

export interface RankingFetchResult {
  ranks: RankingEntry[];
  lastUpdateMs: EpochMs | null;
}

export function normalizeRanking(data: RankResponse): RankingFetchResult {
  return {
    ranks: data.ranks.map((entry) => ({
      ...entry,
      tags: (entry.tags ?? []).map((tag) => ({
        tag: tag.tag,
        style: JSON.parse(tag.style) as CSSProperties,
      })),
    })),
    lastUpdateMs: data.last_update ? parseUtcTimestamp(data.last_update) : null,
  };
}

const DEFAULT_COUNT = 100;

export function computePageInput(count: number, offset: number): string {
  return String(Math.floor(offset / count) + 1);
}

export function computeShowNext(rankingLength: number, count: number): boolean {
  // Leaderboard pagination stops at the API's 1000-row cap.
  return !(rankingLength < count || rankingLength === 1000);
}

export function computePrevPage(
  count: number,
  offset: number,
): { count: number; offset: number } {
  let navCount = count;
  let navOffset = offset - navCount;
  if (navCount < 0) navCount = DEFAULT_COUNT;
  if (navOffset < 0) navOffset = 0;
  return { count: navCount, offset: navOffset };
}

export function computeNextPage(
  count: number,
  offset: number,
): { count: number; offset: number } {
  return { count, offset: offset + count };
}

export function computeGoToPage(
  count: number,
  page: number,
): { count: number; offset: number } | null {
  if (Number.isNaN(page) || page <= 0) {
    return null;
  }
  return { count, offset: (page - 1) * count };
}
