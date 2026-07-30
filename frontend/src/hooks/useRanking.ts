import type React from "react";
import { startTransition, use, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { NotFoundError } from "../errors/NotFoundError";
import type { PlayerRankResponse, RankResponse } from "../interfaces/API";
import { JSONParse } from "../utils/JSONParse";
import type { EpochMs } from "../utils/time";
import { parseUtcTimestamp } from "../utils/time";

export interface RankingTag {
  tag: string;
  style: React.CSSProperties;
}

export interface RankingEntry extends Omit<PlayerRankResponse, "tags"> {
  tags: RankingTag[];
}

export interface RankingFetchResult {
  ranks: RankingEntry[];
  lastUpdateMs: EpochMs | null;
}

export interface UseRankingConfig {
  buildFetchUrl: (count: number, offset: number) => string;
  buildNavPath: (count: number, offset: number) => string;
}

export async function fetchRanking(
  config: Pick<UseRankingConfig, "buildFetchUrl">,
  count: number,
  offset: number,
): Promise<RankingFetchResult> {
  const url = config.buildFetchUrl(count, offset);
  const response = await fetch(url);

  if (response.status === 404) {
    throw new NotFoundError();
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Error ${response.status}`);
  }

  const body = await response.text();
  const parsed = JSONParse(body) as RankResponse;

  return {
    ranks: parsed.ranks.map((entry) => ({
      ...entry,
      tags: entry.tags.map((tag) => ({
        tag: tag.tag,
        style: JSON.parse(tag.style) as React.CSSProperties,
      })),
    })),
    lastUpdateMs:
      parsed.last_update != null ? parseUtcTimestamp(parsed.last_update) : null,
  };
}

const DEFAULT_COUNT = 100;

function parseCountOffset(
  count: string | undefined,
  offset: string | undefined,
): [number, number] {
  const parsedCount = count ? parseInt(count, 10) : DEFAULT_COUNT;
  const parsedOffset = offset ? parseInt(offset, 10) : 0;
  return [parsedCount, parsedOffset];
}

export function useRankingPromise(
  config: Pick<UseRankingConfig, "buildFetchUrl">,
): Promise<RankingFetchResult> {
  const { count, offset } = useParams();
  const [parsedCount, parsedOffset] = parseCountOffset(count, offset);
  const cacheKey = config.buildFetchUrl(parsedCount, parsedOffset);

  const cacheRef = useRef<{
    key: string;
    promise: Promise<RankingFetchResult>;
  } | null>(null);

  if (!cacheRef.current || cacheRef.current.key !== cacheKey) {
    cacheRef.current = {
      key: cacheKey,
      promise: fetchRanking(config, parsedCount, parsedOffset),
    };
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: trigger only
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [cacheKey]);

  return cacheRef.current.promise;
}

export function computePageInput(count: number, offset: number): string {
  return String(Math.floor(offset / count) + 1);
}

export function computeShowNext(rankingLength: number, count: number): boolean {
  // backend caps a single page at 1000 ranks
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

export interface UseRankingResult {
  ranking: RankingEntry[];
  lastUpdateMs: EpochMs | null;
  showNext: boolean;
  pageInput: string;
  setPageInput: (value: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onGoToPage: () => void;
}

export function useRanking(
  config: UseRankingConfig,
  rankingPromise: Promise<RankingFetchResult>,
): UseRankingResult {
  const navigate = useNavigate();
  const { count, offset } = useParams();
  const [parsedCount, parsedOffset] = parseCountOffset(count, offset);
  const cacheKey = config.buildFetchUrl(parsedCount, parsedOffset);
  const { ranks: ranking, lastUpdateMs } = use(rankingPromise);

  const [pageInput, setPageInput] = useState(() =>
    computePageInput(parsedCount, parsedOffset),
  );

  const prevCacheKeyRef = useRef(cacheKey);
  if (prevCacheKeyRef.current !== cacheKey) {
    prevCacheKeyRef.current = cacheKey;
    setPageInput(computePageInput(parsedCount, parsedOffset));
  }

  const showNext = computeShowNext(ranking.length, parsedCount);

  function onPrev() {
    const { count: navCount, offset: navOffset } = computePrevPage(
      parsedCount,
      parsedOffset,
    );
    startTransition(() => {
      navigate(config.buildNavPath(navCount, navOffset));
    });
  }

  function onNext() {
    const { count: navCount, offset: navOffset } = computeNextPage(
      parsedCount,
      parsedOffset,
    );
    startTransition(() => {
      navigate(config.buildNavPath(navCount, navOffset));
    });
  }

  function onGoToPage() {
    const page = parseInt(pageInput, 10);
    const result = computeGoToPage(parsedCount, page);
    if (result) {
      startTransition(() => {
        navigate(config.buildNavPath(result.count, result.offset));
      });
    }
  }

  return {
    ranking,
    lastUpdateMs,
    showNext,
    pageInput,
    setPageInput,
    onPrev,
    onNext,
    onGoToPage,
  };
}
