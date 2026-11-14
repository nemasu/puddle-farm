import type { PlayerResponse, PlayerSet } from "../../../src/interfaces/API";
import {
  buildPlayerHistory,
  historyRequest,
  normalizePlayerId,
} from "../../../src/lib/player";

describe("player route IDs", () => {
  test("preserves decimal and legacy hexadecimal IDs without Number coercion", () => {
    expect(normalizePlayerId("0")).toBe(0n);
    expect(normalizePlayerId("9007199254740993")).toBe(9007199254740993n);
    expect(normalizePlayerId("1a2b")).toBe(6699n);
    expect(normalizePlayerId("0x1A2B")).toBe(6699n);
    expect(normalizePlayerId("9223372036854775807")).toBe(9223372036854775807n);
  });
  test.each([
    "-1",
    "nope",
    "1e+30",
    "9223372036854775808",
    "ffffffffffffffff",
    "",
    "123/456",
  ])("rejects invalid or overflowing ID %s", (id) => {
    expect(normalizePlayerId(id)).toBeNull();
  });
});

const player = {
  ratings: [{ char_short: "SO", rating: 130 }],
} as PlayerResponse;
function match(rating: number, index: number): PlayerSet {
  return {
    timestamp: `2026-11-13 00:00:0${index}`,
    own_rating_value: rating,
    own_rating_deviation: 0,
    floor: "0",
    opponent_name: "Opponent",
    opponent_platform: "PC",
    opponent_id: 9007199254740993n,
    opponent_character: "Ky",
    opponent_character_short: "KY",
    opponent_rating_value: 100,
    opponent_rating_deviation: 0,
    result_win: true,
    odds: 0.5,
    opponent_is_legend: false,
  };
}

describe("server history pagination and grouping", () => {
  test("honors custom counts and fetches one overlap only for later pages", () => {
    expect(historyRequest({ count: 2, offset: 0 })).toEqual({
      count: 2,
      offset: 0,
    });
    expect(historyRequest({ count: 2, offset: 2 })).toEqual({
      count: 3,
      offset: 1,
    });
  });
  test("explicit zero offset retains every match and uses the current player rating", () => {
    const response = { history: [match(120, 2), match(110, 1)], tags: {} };
    const before = structuredClone(response);
    const result = buildPlayerHistory(response, player, "SO", {
      count: 2,
      offset: 0,
    });
    expect(result.groups[0].matches).toHaveLength(2);
    expect(result.groups[0].ratingChange).toBe(20);
    expect(result.showNext).toBe(true);
    expect(response).toEqual(before);
  });
  test("uses the overlap for rating change without displaying or counting it", () => {
    const response = {
      history: [match(110, 3), match(100, 2), match(90, 1)],
      tags: {},
    };
    const result = buildPlayerHistory(response, player, "SO", {
      count: 2,
      offset: 2,
    });
    expect(
      result.groups[0].matches.map((item) => item.own_rating_value),
    ).toEqual([100, 90]);
    expect(result.groups[0].ratingChange).toBe(20);
    expect(result.showNext).toBe(true);
    const last = buildPlayerHistory(
      { history: response.history.slice(0, 2), tags: {} },
      player,
      "SO",
      { count: 2, offset: 2 },
    );
    expect(last.groups[0].matches).toHaveLength(1);
    expect(last.showNext).toBe(false);
  });
  test("empty and overlap-only pages do not enter the nonempty grouping algorithm", () => {
    for (const history of [[], [match(110, 1)]]) {
      const result = buildPlayerHistory({ history, tags: {} }, player, "SO", {
        count: 2,
        offset: 2,
      });
      expect(result.groups).toEqual([]);
      expect(result.showNext).toBe(false);
    }
  });
});
