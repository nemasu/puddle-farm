import {
  firstParam,
  pageOffset,
  parsePagination,
} from "../../../src/lib/pagination";

describe("ranking pagination from public URLs", () => {
  test("preserves defaults and the optional count/offset path segments", () => {
    expect(parsePagination()).toEqual({ count: 100, offset: 0 });
    expect(parsePagination(["50"])).toEqual({ count: 50, offset: 0 });
    expect(parsePagination(["50", "125"])).toEqual({ count: 50, offset: 125 });
    expect(parsePagination(["1000", "0"])).toEqual({ count: 1000, offset: 0 });
  });

  test.each([
    ["0"],
    ["-1"],
    ["10garbage"],
    ["1.5"],
    ["NaN"],
    ["Infinity"],
    ["10", "-1"],
    ["10", "0", "extra"],
    ["9007199254740993"],
    ["10", "9007199254740993"],
  ])("rejects malformed or unsafe segments %j", (...segments) => {
    expect(parsePagination(segments)).toBeNull();
  });

  test("page jumps preserve the count and cannot overflow the offset", () => {
    expect(pageOffset("3", 50)).toBe(100);
    expect(pageOffset("1", 50)).toBe(0);
    for (const value of [
      "0",
      "-2",
      "1.5",
      "2x",
      "Infinity",
      "9007199254740993",
    ]) {
      expect(pageOffset(value, 50)).toBeNull();
    }
    expect(pageOffset(String(Number.MAX_SAFE_INTEGER), 100)).toBeNull();
    expect(pageOffset("2", 0)).toBeNull();
  });

  test("duplicate query values use the first value like the previous URLSearchParams", () => {
    expect(firstParam(["first", "second"])).toBe("first");
    expect(firstParam(undefined)).toBeUndefined();
  });
});
