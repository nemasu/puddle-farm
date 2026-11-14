import {
  computeGoToPage,
  computeNextPage,
  computePageInput,
  computePrevPage,
  computeShowNext,
} from "../../../src/lib/rankings";

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
