import type { MatchupCharResponse } from "../../../src/interfaces/API";
import {
  matchupRate,
  matrixColumns,
  matrixSort,
  matrixSortHref,
  sortMatrixRows,
} from "../../../src/lib/matchup-matrix";

const rows: MatchupCharResponse[] = [
  {
    char_short: "SO",
    char_name: "Sol",
    matchups: [
      { char_short: "SO", char_name: "Sol", wins: 1, total_games: 2 },
      { char_short: "KY", char_name: "Ky", wins: 8, total_games: 10 },
    ],
  },
  {
    char_short: "KY",
    char_name: "Ky",
    matchups: [
      { char_short: "FUT", char_name: "Future", wins: 0, total_games: 0 },
      { char_short: "SO", char_name: "Sol", wins: 1, total_games: 10 },
    ],
  },
];
describe("matchup matrices", () => {
  test("columns include sparse opponents and retain first-seen order", () =>
    expect(matrixColumns(rows).map((row) => row.char_short)).toEqual([
      "SO",
      "KY",
      "FUT",
    ]));
  test("zero wins is a real rate; missing or unplayed matchups are not", () => {
    expect(matchupRate(undefined)).toBeNull();
    expect(matchupRate(rows[1].matchups[0])).toBeNull();
    expect(matchupRate({ ...rows[1].matchups[0], total_games: 5 })).toBe(0);
  });
  test("sorts by opponent code despite different row orders", () => {
    expect(
      sortMatrixRows(rows, { column: "SO", direction: "asc" }, "en").map(
        (row) => row.char_short,
      ),
    ).toEqual(["KY", "SO"]);
    expect(rows[0].char_short).toBe("SO");
  });
  test.each(["asc", "desc"] as const)(
    "missing opponents stay last in %s order",
    (direction) =>
      expect(
        sortMatrixRows(rows, { column: "KY", direction }, "en").map(
          (row) => row.char_short,
        ),
      ).toEqual(["SO", "KY"]),
  );
  test("character sorting follows the displayed names", () => {
    expect(
      sortMatrixRows(rows, { column: "character", direction: "asc" }, "en")[0]
        .char_short,
    ).toBe("KY");
    expect(
      sortMatrixRows(rows, { column: "character", direction: "asc" }, "ko")[0]
        .char_short,
    ).toBe("SO");
  });
  test.each(["UNKNOWN-desc", "SO-sideways", "__proto__-asc", ""])(
    "ignores invalid sort %s",
    (value) =>
      expect(
        matrixSort({ allSort: value }, "all", matrixColumns(rows)),
      ).toBeNull(),
  );
  test("parses valid sort and keeps dataset queries independent", () => {
    const state = matrixSort({ allSort: "SO-asc" }, "all", matrixColumns(rows));
    expect(state).toEqual({ column: "SO", direction: "asc" });
    const path = matrixSortHref(
      { allSort: "SO-asc", vanquisherSort: "KY-desc", q: "솔 & /?" },
      "all",
      "SO",
      state,
    );
    const params = new URL(path, "https://example.com").searchParams;
    expect(params.get("allSort")).toBe("SO-desc");
    expect(params.get("vanquisherSort")).toBe("KY-desc");
    expect(params.get("q")).toBe("솔 & /?");
  });
});
