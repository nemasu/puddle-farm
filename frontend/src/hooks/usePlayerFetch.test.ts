import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { PlayerResponse } from "../interfaces/API";
import { fetchPlayer } from "../utils/playerApi";
import { useMatchHistory } from "./useMatchHistory";
import { usePlayerFetch } from "./usePlayerFetch";
import { usePlayerProfile } from "./usePlayerProfile";

vi.mock("../utils/playerApi");
vi.mock("./useMatchHistory");
vi.mock("./usePlayerProfile");

const mockedFetchPlayer = vi.mocked(fetchPlayer);
const mockedUseMatchHistory = vi.mocked(useMatchHistory);
const mockedUsePlayerProfile = vi.mocked(usePlayerProfile);

const loadHistory = vi.fn().mockResolvedValue(undefined);
const resetHistory = vi.fn();
const loadProfile = vi.fn().mockResolvedValue(undefined);
const resetProfile = vi.fn();

const PLAYER_ID = BigInt(1);
const realPlayer = {
  id: "1",
  name: "Test",
  ratings: [{ char_short: "SO", rating: 1500 }],
} as unknown as PlayerResponse;
const emptyPlayer = { id: "0", ratings: [] } as unknown as PlayerResponse;

beforeEach(() => {
  mockedFetchPlayer.mockReset();
  loadHistory.mockReset().mockResolvedValue(undefined);
  resetHistory.mockReset();
  loadProfile.mockReset().mockResolvedValue(undefined);
  resetProfile.mockReset();

  mockedUseMatchHistory.mockReset().mockReturnValue({
    history: [],
    tags: {},
    showNext: true,
    loadHistory,
    resetHistory,
  } satisfies ReturnType<typeof useMatchHistory>);
  mockedUsePlayerProfile.mockReset().mockReturnValue({
    alias: [],
    avatar: null,
    comment: null,
    loadProfile,
    resetProfile,
  } satisfies ReturnType<typeof usePlayerProfile>);
});

describe("usePlayerFetch", () => {
  test("wires player_id/char_short/count/offset into useMatchHistory and usePlayerProfile", async () => {
    mockedFetchPlayer.mockResolvedValue(realPlayer);

    const { result } = renderHook(() =>
      usePlayerFetch(PLAYER_ID, "SO", "100", "50"),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockedUseMatchHistory).toHaveBeenCalledWith(
      PLAYER_ID,
      "SO",
      "100",
      "50",
    );
    expect(mockedUsePlayerProfile).toHaveBeenCalledWith(PLAYER_ID);
  });

  test("loads history and profile together on mount (profile is not dropped)", async () => {
    mockedFetchPlayer.mockResolvedValue(realPlayer);

    const { result } = renderHook(() =>
      usePlayerFetch(PLAYER_ID, "SO", undefined, undefined),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(loadHistory).toHaveBeenCalledWith(realPlayer);
    expect(loadProfile).toHaveBeenCalledWith("Test");
    expect(result.current.currentCharData).toEqual({
      char_short: "SO",
      rating: 1500,
    });
  });

  test("resets currentCharData to null when char_short matches no rating", async () => {
    mockedFetchPlayer.mockResolvedValue(realPlayer);

    const { result, rerender } = renderHook(
      ({ char_short }: { char_short: string }) =>
        usePlayerFetch(PLAYER_ID, char_short, undefined, undefined),
      { initialProps: { char_short: "SO" } },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.currentCharData).toEqual({
      char_short: "SO",
      rating: 1500,
    });

    rerender({ char_short: "KY" });
    await waitFor(() => expect(result.current.currentCharData).toBeNull());
  });

  test("resets history/profile and skips loading them for an empty player", async () => {
    mockedFetchPlayer.mockResolvedValue(emptyPlayer);

    const { result } = renderHook(() =>
      usePlayerFetch(PLAYER_ID, "SO", undefined, undefined),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(resetHistory).toHaveBeenCalledTimes(1);
    expect(resetProfile).toHaveBeenCalledTimes(1);
    expect(loadHistory).not.toHaveBeenCalled();
    expect(loadProfile).not.toHaveBeenCalled();
    expect(result.current.currentCharData).toBeNull();
  });

  test("skips history/profile when char_short is undefined", async () => {
    mockedFetchPlayer.mockResolvedValue(realPlayer);

    const { result } = renderHook(() =>
      usePlayerFetch(PLAYER_ID, undefined, undefined, undefined),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(loadHistory).not.toHaveBeenCalled();
    expect(loadProfile).not.toHaveBeenCalled();
  });

  test("reloadPlayer() refetches history and profile exactly once each (no dropped profile, no duplicate fetch)", async () => {
    mockedFetchPlayer.mockResolvedValue(realPlayer);

    const { result } = renderHook(() =>
      usePlayerFetch(PLAYER_ID, "SO", undefined, undefined),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockedFetchPlayer.mockClear();
    loadHistory.mockClear();
    loadProfile.mockClear();

    await act(async () => {
      await result.current.reloadPlayer();
    });

    expect(mockedFetchPlayer).toHaveBeenCalledTimes(1);
    expect(loadHistory).toHaveBeenCalledTimes(1);
    expect(loadProfile).toHaveBeenCalledTimes(1);
  });

  test("waits for both loadHistory and loadProfile to settle even if one rejects", async () => {
    mockedFetchPlayer.mockResolvedValue(realPlayer);
    loadHistory.mockRejectedValue(new Error("history fetch failed"));
    let resolveProfile: () => void = () => {};
    loadProfile.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveProfile = resolve;
      }),
    );
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { result } = renderHook(() =>
      usePlayerFetch(PLAYER_ID, "SO", undefined, undefined),
    );

    await waitFor(() => expect(loadProfile).toHaveBeenCalled());
    // loadProfile is still pending here: with fail-fast Promise.all, the
    // loadHistory rejection would already have flipped loading to false.
    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveProfile();
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    consoleError.mockRestore();
  });

  test("loading is true while fetching and false again after an error", async () => {
    mockedFetchPlayer.mockRejectedValue(new Error("network error"));
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { result } = renderHook(() =>
      usePlayerFetch(PLAYER_ID, "SO", undefined, undefined),
    );

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    consoleError.mockRestore();
  });
});
