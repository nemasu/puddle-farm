import {
  nextSortState,
  parsePopularitySort,
  popularitySortHref,
  sortPopularityData,
} from "../../../src/lib/popularity";

describe("nextSortState", () => {
  test("unsorted -> character click -> reversed", () => {
    expect(nextSortState(null, "character")).toEqual({
      column: "character",
      direction: "reversed",
    });
  });

  test("character reversed -> character click -> unsorted", () => {
    expect(
      nextSortState(
        { column: "character", direction: "reversed" },
        "character",
      ),
    ).toBeNull();
  });

  test("unsorted -> popularity click -> descending", () => {
    expect(nextSortState(null, "popularity")).toEqual({
      column: "popularity",
      direction: "desc",
    });
  });

  test("popularity descending -> popularity click -> ascending", () => {
    expect(
      nextSortState({ column: "popularity", direction: "desc" }, "popularity"),
    ).toEqual({ column: "popularity", direction: "asc" });
  });

  test("popularity ascending -> popularity click -> unsorted", () => {
    expect(
      nextSortState({ column: "popularity", direction: "asc" }, "popularity"),
    ).toBeNull();
  });

  test("sorted by character -> popularity click -> switches to popularity (exclusive)", () => {
    expect(
      nextSortState(
        { column: "character", direction: "reversed" },
        "popularity",
      ),
    ).toEqual({ column: "popularity", direction: "desc" });
  });

  test("sorted by popularity -> character click -> switches to character (exclusive)", () => {
    expect(
      nextSortState({ column: "popularity", direction: "asc" }, "character"),
    ).toEqual({ column: "character", direction: "reversed" });
  });
});

describe("sortPopularityData", () => {
  const items = [
    { name: "Sol", value: 30 },
    { name: "Ky", value: 10 },
    { name: "Ramlethal", value: 20 },
  ];

  test("returns items in original order when sortState is null", () => {
    expect(sortPopularityData(items, null)).toEqual(items);
  });

  test("sorts descending by popularity value", () => {
    expect(
      sortPopularityData(items, { column: "popularity", direction: "desc" }),
    ).toEqual([
      { name: "Sol", value: 30 },
      { name: "Ramlethal", value: 20 },
      { name: "Ky", value: 10 },
    ]);
  });

  test("sorts ascending by popularity value", () => {
    expect(
      sortPopularityData(items, { column: "popularity", direction: "asc" }),
    ).toEqual([
      { name: "Ky", value: 10 },
      { name: "Ramlethal", value: 20 },
      { name: "Sol", value: 30 },
    ]);
  });

  test("reverses the original (API) order for character column", () => {
    expect(
      sortPopularityData(items, { column: "character", direction: "reversed" }),
    ).toEqual([
      { name: "Ramlethal", value: 20 },
      { name: "Ky", value: 10 },
      { name: "Sol", value: 30 },
    ]);
  });

  test("does not mutate the original array", () => {
    const original = [...items];
    sortPopularityData(items, { column: "popularity", direction: "desc" });
    sortPopularityData(items, { column: "character", direction: "reversed" });
    expect(items).toEqual(original);
  });
});

describe("popularity URL sorting", () => {
  test.each([undefined, "invalid", "character-asc", "popularity-reversed"])(
    "ignores unsupported sort %s",
    (value) => {
      expect(parsePopularitySort(value)).toBeNull();
    },
  );
  test("parses supported sorts", () => {
    expect(parsePopularitySort("character-reversed")).toEqual({
      column: "character",
      direction: "reversed",
    });
    expect(parsePopularitySort("popularity-desc")).toEqual({
      column: "popularity",
      direction: "desc",
    });
    expect(parsePopularitySort("popularity-asc")).toEqual({
      column: "popularity",
      direction: "asc",
    });
  });
  test("changing one panel preserves the other and encoded query values", () => {
    const url = popularitySortHref(
      { characterSort: "character-reversed", q: ["솔 & /?", "ignored"] },
      "player",
      "popularity",
    );
    const parsed = new URL(url, "https://example.com");
    expect(parsed.pathname).toBe("/popularity");
    expect(parsed.searchParams.get("characterSort")).toBe("character-reversed");
    expect(parsed.searchParams.get("playerSort")).toBe("popularity-desc");
    expect(parsed.searchParams.get("q")).toBe("솔 & /?");
  });
  test("cycles back to API order without dropping the other panel", () => {
    expect(
      popularitySortHref(
        { playerSort: "popularity-asc", characterSort: "popularity-desc" },
        "player",
        "popularity",
      ),
    ).toBe("/popularity?characterSort=popularity-desc");
    expect(
      popularitySortHref(
        { characterSort: "character-reversed" },
        "character",
        "character",
      ),
    ).toBe("/popularity");
  });
});
