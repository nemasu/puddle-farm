import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { GroupedMatch } from "../interfaces/Player";
import { useAutoUpdate } from "./useAutoUpdate";
import { usePlayerData } from "./usePlayerData";
import { usePlayerFetch } from "./usePlayerFetch";
import { useRatingSync } from "./useRatingSync";

vi.mock("react-router-dom", () => ({
  useParams: vi.fn(),
}));
vi.mock("./usePlayerFetch");
vi.mock("./useRatingSync");
vi.mock("./useAutoUpdate");

const mockedUsePlayerFetch = vi.mocked(usePlayerFetch);
const mockedUseRatingSync = vi.mocked(useRatingSync);
const mockedUseAutoUpdate = vi.mocked(useAutoUpdate);

function makeGroupedMatch(overrides: Partial<GroupedMatch> = {}): GroupedMatch {
  return {
    floor: "0",
    losses: 0,
    matches: [],
    odds: 50,
    opponent_character_short: "SO",
    opponent_id: "1",
    opponent_name: "Opponent",
    ratingChange: 0,
    timestamp: "2024-01-01T00:00:00",
    wins: 1,
    ...overrides,
  };
}

const reloadPlayer = vi.fn().mockResolvedValue(undefined);
const history: GroupedMatch[] = [
  makeGroupedMatch({ floor: "0", opponent_id: "1" }),
  makeGroupedMatch({ floor: "3", opponent_id: "2" }),
];

beforeEach(async () => {
  mockedUsePlayerFetch.mockClear();
  mockedUseRatingSync.mockClear();
  mockedUseAutoUpdate.mockClear();

  const { useParams } = await import("react-router-dom");
  vi.mocked(useParams).mockReturnValue({
    player_id: "1",
    char_short: "SO",
    count: undefined,
    offset: undefined,
  } satisfies ReturnType<typeof useParams>);

  mockedUsePlayerFetch.mockReturnValue({
    player: null,
    currentCharData: null,
    history,
    tags: {},
    showNext: true,
    loading: false,
    alias: [],
    avatar: null,
    comment: null,
    reloadPlayer,
  } satisfies ReturnType<typeof usePlayerFetch>);

  mockedUseRatingSync.mockReturnValue({
    syncLoading: false,
    syncError: null,
    handleRatingSync: vi.fn(),
    clearSyncError: vi.fn(),
  } satisfies ReturnType<typeof useRatingSync>);

  mockedUseAutoUpdate.mockReturnValue(null);
});

describe("usePlayerData", () => {
  test("passes parsed player_id and route params through to usePlayerFetch", () => {
    renderHook(() => usePlayerData());

    expect(mockedUsePlayerFetch).toHaveBeenCalledWith(
      BigInt(1),
      "SO",
      undefined,
      undefined,
    );
  });

  test("wires the same reloadPlayer into both useRatingSync and useAutoUpdate", () => {
    renderHook(() => usePlayerData());

    expect(mockedUseRatingSync).toHaveBeenCalledWith(BigInt(1), reloadPlayer);
    expect(mockedUseAutoUpdate).toHaveBeenCalledWith(reloadPlayer);
  });

  test("defaults matchFilter to 'all' so filteredHistory passes history through unchanged", () => {
    const { result } = renderHook(() => usePlayerData());

    expect(result.current.filteredHistory).toEqual(history);
  });
});
