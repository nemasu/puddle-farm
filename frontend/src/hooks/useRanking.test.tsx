import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { NotFoundError } from "../errors/NotFoundError";
import {
  computeGoToPage,
  computeNextPage,
  computePageInput,
  computePrevPage,
  computeShowNext,
  fetchRanking,
  useRankingPromise,
} from "./useRanking";

let mockParams: Record<string, string | undefined> = {};

vi.mock("react-router-dom", () => ({
  useParams: () => mockParams,
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

const config = {
  buildFetchUrl: (count: number, offset: number) =>
    `/api/top?count=${count}&offset=${offset}`,
};

describe("fetchRanking", () => {
  test("returns parsed ranking entries with tag styles on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              ranks: [
                {
                  rank: 1,
                  id: "1",
                  name: "Alice",
                  rating: 1500,
                  deviation: 50,
                  char_short: "SO",
                  char_long: "Sol",
                  is_legend: false,
                  tags: [{ tag: "Champ", style: '{"color":"red"}' }],
                },
              ],
            }),
          ),
      }),
    );

    const result = await fetchRanking(config, 100, 0);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Alice");
    expect(result[0].tags[0].style).toEqual({ color: "red" });
  });

  test("returns an empty array when ranks is empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ ranks: [] })),
      }),
    );

    const result = await fetchRanking(config, 100, 0);

    expect(result).toEqual([]);
  });

  test("throws NotFoundError on a 404 response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ status: 404, ok: false }),
    );

    await expect(fetchRanking(config, 100, 0)).rejects.toThrow(NotFoundError);
  });

  test("throws an Error with the response body text on a non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 500,
        ok: false,
        text: () => Promise.resolve("server exploded"),
      }),
    );

    await expect(fetchRanking(config, 100, 0)).rejects.toThrow(
      "server exploded",
    );
  });

  test("throws a generic status-based Error when the response body is empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 500,
        ok: false,
        text: () => Promise.resolve(""),
      }),
    );

    await expect(fetchRanking(config, 100, 0)).rejects.toThrow("Error 500");
  });
});

function stubFetchResolvedWithEmptyRanks() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ ranks: [] })),
    }),
  );
}

describe("useRankingPromise", () => {
  beforeEach(() => {
    mockParams = { count: "50", offset: "0" };
    vi.stubGlobal("scrollTo", vi.fn());
  });

  test("fetches the URL built from the initial count/offset", () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ ranks: [] })),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useRankingPromise(config));

    expect(fetchMock).toHaveBeenCalledWith("/api/top?count=50&offset=0");
  });

  test("returns the same promise across rerenders when params are unchanged", () => {
    stubFetchResolvedWithEmptyRanks();

    const { result, rerender } = renderHook(() => useRankingPromise(config));
    const firstPromise = result.current;

    rerender();

    expect(result.current).toBe(firstPromise);
  });

  test("creates a new promise when offset changes", () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ ranks: [] })),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result, rerender } = renderHook(() => useRankingPromise(config));
    const firstPromise = result.current;

    mockParams = { count: "50", offset: "50" };
    rerender();

    expect(result.current).not.toBe(firstPromise);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("creates a new promise when the built URL changes even though count/offset stay the same", () => {
    // Regression test: a char_short switch on TopPlayer leaves count/offset
    // unchanged but changes the fetch URL. The cache key must track the URL,
    // not just count/offset, or the old character's ranking keeps showing.
    let charShort = "SO";
    const dynamicConfig = {
      buildFetchUrl: (count: number, offset: number) =>
        `/api/top_char/${charShort}?count=${count}&offset=${offset}`,
    };
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ ranks: [] })),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result, rerender } = renderHook(() =>
      useRankingPromise(dynamicConfig),
    );
    const firstPromise = result.current;

    charShort = "KY";
    rerender();

    expect(result.current).not.toBe(firstPromise);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("computePageInput", () => {
  test("computes the page number from offset and count", () => {
    expect(computePageInput(50, 0)).toBe("1");
    expect(computePageInput(50, 100)).toBe("3");
  });
});

describe("computeShowNext", () => {
  test("is false when fewer results than page size come back", () => {
    expect(computeShowNext(30, 50)).toBe(false);
  });

  test("is true when a full page comes back", () => {
    expect(computeShowNext(50, 50)).toBe(true);
  });

  test("is false when the backend's 1000-rank cap is hit, even on a full page", () => {
    expect(computeShowNext(1000, 1000)).toBe(false);
  });
});

describe("computePrevPage", () => {
  test("shifts offset back by count", () => {
    expect(computePrevPage(50, 100)).toEqual({ count: 50, offset: 50 });
  });

  test("clamps offset to 0 instead of going negative", () => {
    expect(computePrevPage(50, 20)).toEqual({ count: 50, offset: 0 });
  });

  test("falls back to the default count when count is negative", () => {
    expect(computePrevPage(-5, 10)).toEqual({ count: 100, offset: 15 });
  });
});

describe("computeNextPage", () => {
  test("shifts offset forward by count", () => {
    expect(computeNextPage(50, 100)).toEqual({ count: 50, offset: 150 });
  });
});

describe("computeGoToPage", () => {
  test("computes offset from a 1-based page number", () => {
    expect(computeGoToPage(50, 3)).toEqual({ count: 50, offset: 100 });
  });

  test("returns null for a zero page", () => {
    expect(computeGoToPage(50, 0)).toBeNull();
  });

  test("returns null for a negative page", () => {
    expect(computeGoToPage(50, -1)).toBeNull();
  });

  test("returns null for NaN", () => {
    expect(computeGoToPage(50, Number.NaN)).toBeNull();
  });
});
