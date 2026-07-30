import { useParams } from "react-router-dom";
import type {
  RankingFetchResult,
  UseRankingConfig,
  UseRankingResult,
} from "./useRanking";
import { useRanking, useRankingPromise } from "./useRanking";

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT;

function buildConfig(char_short: string | undefined): UseRankingConfig {
  return {
    buildFetchUrl: (count, offset) =>
      `${API_ENDPOINT}/top_char/${char_short}?count=${count}&offset=${offset}`,
    buildNavPath: (count, offset) => `/top/${char_short}/${count}/${offset}`,
  };
}

export function useTopPlayerRankingPromise(): Promise<RankingFetchResult> {
  const { char_short } = useParams();
  return useRankingPromise(buildConfig(char_short));
}

export function useTopPlayerRanking(
  rankingPromise: Promise<RankingFetchResult>,
): UseRankingResult {
  const { char_short } = useParams();
  return useRanking(buildConfig(char_short), rankingPromise);
}
