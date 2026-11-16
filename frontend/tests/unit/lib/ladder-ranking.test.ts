import {
  characterLabel,
  getCharacterArt,
} from "../../../src/lib/ladder-characters";
import { filterLegend } from "../../../src/lib/ladder-ranking";
import type { RankingEntry } from "../../../src/lib/rankings";

const entries = [
  { id: 9007199254740993n, name: "Player <One>", char_short: "SO", rank: 1 },
  { id: 9007199254740994n, name: "플레이어 Two", char_short: "KY", rank: 2 },
  { id: 9007199254740995n, name: "Other Player", char_short: "SO", rank: 3 },
] as RankingEntry[];

it("combines character and case-insensitive name filters while preserving IDs and ranks", () => {
  const result = filterLegend(entries, { character: "SO", q: " PLAYER " });
  expect(result.ranks.map((row) => [row.id, row.rank])).toEqual([
    [9007199254740993n, 1],
    [9007199254740995n, 3],
  ]);
  expect(result.query).toBe("PLAYER");
});

it("matches Unicode player names and handles empty results", () => {
  expect(filterLegend(entries, { q: "플레이어" }).ranks).toEqual([entries[1]]);
  expect(
    filterLegend(entries, { character: "SO", q: "플레이어" }).ranks,
  ).toEqual([]);
});

it("ignores unknown characters, bounds query input, and uses the first query parameter", () => {
  expect(
    filterLegend(entries, { character: "unknown", q: ["One", "Other"] }).ranks,
  ).toEqual([entries[0]]);
  expect(filterLegend(entries, { q: "x".repeat(1000) }).query.length).toBe(200);
});

it("uses exact character IDs for art and translated names with an unknown-character fallback", () => {
  expect(characterLabel("SO", "Sol", "ko")).toBe("솔");
  expect(characterLabel("JC", "Jack-O'", "en")).toBe("Jack-O");
  expect(getCharacterArt("SO")?.art).toBe("sol");
  expect(getCharacterArt("__proto__")).toBeUndefined();
  expect(characterLabel("XX", "New Character", "ko")).toBe("New Character");
  expect(characterLabel("XX", "", "en")).toBe("XX");
});
