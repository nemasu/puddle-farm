import { describe, expect, test } from "vitest";
import type {
  PlayerResponse,
  PlayerResponsePlayer,
} from "../../interfaces/API";
import type { GroupedMatch } from "../../interfaces/Player";
import {
  calcNextOffset,
  calcPrevOffset,
  filterHistory,
  findCharData,
  findHighestRatedChar,
  isEmptyPlayer,
  parsePlayerId,
  shouldShowNext,
} from "../playerUtils";

describe("parsePlayerId", () => {
  test("converts a plain numeric string to BigInt", () => {
    expect(parsePlayerId("12345")).toBe(BigInt(12345));
  });

  test("converts a hex string (with letters) to BigInt", () => {
    expect(parsePlayerId("1a2b")).toBe(BigInt("0x1a2b"));
  });

  test("returns 0 when undefined", () => {
    expect(parsePlayerId(undefined)).toBe(BigInt(0));
  });
});

describe("filterHistory", () => {
  const ranked: GroupedMatch = { floor: "0" } as GroupedMatch;
  const tower: GroupedMatch = { floor: "3" } as GroupedMatch;

  test("returns all entries for 'all'", () => {
    expect(filterHistory([ranked, tower], "all")).toHaveLength(2);
  });

  test("returns only floor=0 entries for 'ranked'", () => {
    expect(filterHistory([ranked, tower], "ranked")).toEqual([ranked]);
  });

  test("returns only floor!=0 entries for 'tower'", () => {
    expect(filterHistory([ranked, tower], "tower")).toEqual([tower]);
  });
});

describe("calcPrevOffset", () => {
  test("computes the previous page offset from count and offset", () => {
    expect(calcPrevOffset("100", "200")).toEqual({ count: 100, offset: 100 });
  });

  test("never goes below offset 0", () => {
    expect(calcPrevOffset("100", "50")).toEqual({ count: 100, offset: 0 });
  });

  test("falls back to default 100 when count is negative", () => {
    expect(calcPrevOffset("-5", "50")).toEqual({ count: 100, offset: 0 });
  });

  test("uses default 100 when count is unspecified", () => {
    expect(calcPrevOffset(undefined, "100")).toEqual({ count: 100, offset: 0 });
  });
});

describe("findHighestRatedChar", () => {
  const makeRating = (char_short: string, rating: number) =>
    ({ char_short, rating }) as PlayerResponsePlayer;

  test("returns the char_short with the highest rating", () => {
    const ratings = [
      makeRating("SO", 1500),
      makeRating("KY", 1800),
      makeRating("MA", 1200),
    ];
    expect(findHighestRatedChar(ratings)).toBe("KY");
  });

  test("returns SO when empty", () => {
    expect(findHighestRatedChar([])).toBe("SO");
  });
});

describe("findCharData", () => {
  const makeRating = (char_short: string) =>
    ({ char_short }) as PlayerResponsePlayer;

  test("returns the entry matching char_short", () => {
    const ratings = [makeRating("SO"), makeRating("KY")];
    expect(findCharData(ratings, "KY")).toEqual(makeRating("KY"));
  });

  test("returns null when no match", () => {
    expect(findCharData([makeRating("SO")], "KY")).toBeNull();
  });
});

describe("shouldShowNext", () => {
  test("returns true when history length is at least count", () => {
    expect(shouldShowNext(100, "100")).toBe(true);
  });

  test("returns false when history length is below count", () => {
    expect(shouldShowNext(99, "100")).toBe(false);
  });

  test("uses default 100 when count is unspecified", () => {
    expect(shouldShowNext(100, undefined)).toBe(true);
    expect(shouldShowNext(99, undefined)).toBe(false);
  });
});

describe("isEmptyPlayer", () => {
  test("returns true when player.id is 0", () => {
    expect(isEmptyPlayer({ id: "0" } as PlayerResponse)).toBe(true);
  });

  test("returns false when player.id is not 0", () => {
    expect(isEmptyPlayer({ id: "12345" } as PlayerResponse)).toBe(false);
  });
});

describe("calcNextOffset", () => {
  test("computes the next page offset from count and offset", () => {
    expect(calcNextOffset("100", "0")).toEqual({ count: 100, offset: 100 });
  });

  test("uses count as offset when offset is unspecified", () => {
    expect(calcNextOffset("100", undefined)).toEqual({
      count: 100,
      offset: 100,
    });
  });

  test("uses default 100 when count is unspecified", () => {
    expect(calcNextOffset(undefined, "0")).toEqual({ count: 100, offset: 100 });
  });
});
