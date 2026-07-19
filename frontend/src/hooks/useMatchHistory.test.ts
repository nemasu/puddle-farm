import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type {
  PlayerGamesResponse,
  PlayerResponse,
  PlayerSet,
} from "../interfaces/API";
import type { GroupedMatch } from "../interfaces/Player";
import { groupMatches } from "../utils/Player";
import { fetchHistory } from "../utils/playerApi";
import { useMatchHistory } from "./useMatchHistory";

vi.mock("../utils/playerApi");
vi.mock("../utils/Player");

const mockedFetchHistory = vi.mocked(fetchHistory);
const mockedGroupMatches = vi.mocked(groupMatches);

const PLAYER_ID = BigInt(1);
const player = { id: "1", name: "Test" } as PlayerResponse;

function makePlayerSet(overrides: Partial<PlayerSet> = {}): PlayerSet {
  return {
    timestamp: "2024-01-01T00:00:00",
    own_rating_value: 1500,
    own_rating_deviation: 50,
    floor: "0",
    opponent_name: "Opponent",
    opponent_platform: "PC",
    opponent_id: "2",
    opponent_character: "Sol",
    opponent_character_short: "SO",
    opponent_rating_value: 1500,
    opponent_rating_deviation: 50,
    result_win: true,
    odds: 50,
    opponent_is_legend: false,
    ...overrides,
  };
}

function makeGroupedMatch(overrides: Partial<GroupedMatch> = {}): GroupedMatch {
  return {
    floor: "0",
    losses: 0,
    matches: [],
    odds: 50,
    opponent_character_short: "SO",
    opponent_id: "2",
    opponent_name: "Opponent",
    ratingChange: 0,
    timestamp: "2024-01-01T00:00:00",
    wins: 1,
    ...overrides,
  };
}

function makeGamesResponse(
  overrides: Partial<PlayerGamesResponse> = {},
): PlayerGamesResponse {
  return { history: [], tags: {}, ...overrides };
}

beforeEach(() => {
  mockedFetchHistory.mockReset();
  mockedGroupMatches.mockReset();
});

describe("useMatchHistory", () => {
  test("starts with empty state", () => {
    const { result } = renderHook(() =>
      useMatchHistory(PLAYER_ID, "SO", undefined, undefined),
    );

    expect(result.current.history).toEqual([]);
    expect(result.current.tags).toEqual({});
    expect(result.current.showNext).toBe(true);
  });

  test("does nothing when char_short is undefined", async () => {
    const { result } = renderHook(() =>
      useMatchHistory(PLAYER_ID, undefined, undefined, undefined),
    );

    await act(async () => {
      await result.current.loadHistory(player);
    });

    expect(mockedFetchHistory).not.toHaveBeenCalled();
  });

  test("populates state from fetchHistory and groupMatches", async () => {
    const rawHistory = [makePlayerSet()];
    const grouped = [makeGroupedMatch()];
    mockedFetchHistory.mockResolvedValue(
      makeGamesResponse({ history: rawHistory, tags: { "2": [] } }),
    );
    mockedGroupMatches.mockReturnValue(grouped);

    const { result } = renderHook(() =>
      useMatchHistory(PLAYER_ID, "SO", "100", undefined),
    );

    await act(async () => {
      await result.current.loadHistory(player);
    });

    expect(mockedGroupMatches).toHaveBeenCalledWith(
      rawHistory,
      player,
      "SO",
      false,
    );
    expect(result.current.history).toEqual(grouped);
    expect(result.current.tags).toEqual({ "2": [] });
  });

  test("passes has_offset=true to groupMatches when paginating with an offset", async () => {
    const rawHistory = [makePlayerSet()];
    mockedFetchHistory.mockResolvedValue(
      makeGamesResponse({ history: rawHistory, tags: { "2": [] } }),
    );
    mockedGroupMatches.mockReturnValue([makeGroupedMatch()]);

    const { result } = renderHook(() =>
      useMatchHistory(PLAYER_ID, "SO", "100", "50"),
    );

    await act(async () => {
      await result.current.loadHistory(player);
    });

    expect(mockedGroupMatches).toHaveBeenCalledWith(
      rawHistory,
      player,
      "SO",
      true,
    );
  });

  test("sets empty history and tags when the result has no matches", async () => {
    mockedFetchHistory.mockResolvedValue(makeGamesResponse());

    const { result } = renderHook(() =>
      useMatchHistory(PLAYER_ID, "SO", "100", undefined),
    );

    await act(async () => {
      await result.current.loadHistory(player);
    });

    expect(mockedGroupMatches).not.toHaveBeenCalled();
    expect(result.current.history).toEqual([]);
    expect(result.current.tags).toEqual({});
  });

  test("leaves state untouched when fetchHistory returns null", async () => {
    const grouped = [makeGroupedMatch({ opponent_id: "9" })];
    mockedFetchHistory.mockResolvedValueOnce(
      makeGamesResponse({
        history: [makePlayerSet({ opponent_id: "9" })],
        tags: { "9": [] },
      }),
    );
    mockedGroupMatches.mockReturnValue(grouped);

    const { result } = renderHook(() =>
      useMatchHistory(PLAYER_ID, "SO", "100", undefined),
    );
    await act(async () => {
      await result.current.loadHistory(player);
    });
    expect(result.current.history).toEqual(grouped);

    mockedFetchHistory.mockResolvedValueOnce(null);
    mockedGroupMatches.mockClear();

    await act(async () => {
      await result.current.loadHistory(player);
    });

    expect(mockedGroupMatches).not.toHaveBeenCalled();
    expect(result.current.history).toEqual(grouped);
    expect(result.current.tags).toEqual({ "9": [] });
    expect(result.current.showNext).toBe(false);
  });

  test("resetHistory restores the empty state", async () => {
    mockedFetchHistory.mockResolvedValue(
      makeGamesResponse({ history: [makePlayerSet()], tags: { "2": [] } }),
    );
    mockedGroupMatches.mockReturnValue([makeGroupedMatch()]);

    const { result } = renderHook(() =>
      useMatchHistory(PLAYER_ID, "SO", "100", undefined),
    );
    await act(async () => {
      await result.current.loadHistory(player);
    });
    expect(result.current.history).toHaveLength(1);

    act(() => {
      result.current.resetHistory();
    });

    expect(result.current.history).toEqual([]);
    expect(result.current.tags).toEqual({});
    expect(result.current.showNext).toBe(true);
  });
});
