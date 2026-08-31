import { describe, expect, test } from "vitest";
import { nextSortState, sortPopularityData } from "./Popularity";

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
