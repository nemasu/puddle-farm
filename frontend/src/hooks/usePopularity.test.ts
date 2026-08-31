import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { fetchPopularity, usePopularityPromise } from "./usePopularity";

afterEach(() => {
  vi.unstubAllGlobals();
});

const SAMPLE_RESPONSE = {
  per_player: [{ name: "Sol", value: 10 }],
  per_player_total: 100,
  per_character: [{ name: "Sol", value: 5 }],
  per_character_total: 50,
  last_update: "2026-01-01 00:00:00",
};

describe("fetchPopularity", () => {
  test("returns parsed JSON on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve(SAMPLE_RESPONSE),
      }),
    );

    const result = await fetchPopularity();

    expect(result).toEqual(SAMPLE_RESPONSE);
  });

  test("returns undefined when fetch rejects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network error")),
    );

    const result = await fetchPopularity();

    expect(result).toBeUndefined();
  });
});

describe("usePopularityPromise", () => {
  test("returns the same promise across re-renders", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve(SAMPLE_RESPONSE),
      }),
    );

    const { result, rerender } = renderHook(() => usePopularityPromise());
    const firstPromise = result.current;

    rerender();

    expect(result.current).toBe(firstPromise);
  });

  test("only calls fetch once across re-renders", () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(SAMPLE_RESPONSE),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { rerender } = renderHook(() => usePopularityPromise());
    rerender();
    rerender();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
