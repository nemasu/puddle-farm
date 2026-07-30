import type { RankingFetchResult, UseRankingResult } from "./useRanking";
import { useRanking, useRankingPromise } from "./useRanking";

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT;

const config = {
  buildFetchUrl: (count: number, offset: number) =>
    `${API_ENDPOINT}/top?count=${count}&offset=${offset}`,
  buildNavPath: (count: number, offset: number) =>
    `/top_global/${count}/${offset}`,
};

export function useTopGlobalRankingPromise(): Promise<RankingFetchResult> {
  return useRankingPromise(config);
}

export function useTopGlobalRanking(
  rankingPromise: Promise<RankingFetchResult>,
): UseRankingResult {
  return useRanking(config, rankingPromise);
}
