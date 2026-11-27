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

it("filters by character while preserving IDs and ranks", () => {
  const result = filterLegend(entries, { character: "SO" });
  expect(result.ranks.map((row) => [row.id, row.rank])).toEqual([
    [9007199254740993n, 1],
    [9007199254740995n, 3],
  ]);
  expect(result.character).toBe("SO");
});

it("ignores old name search parameters", () => {
  expect(filterLegend(entries, { q: "missing-player" }).ranks).toEqual(entries);
});

it("ignores unknown characters and uses the first character parameter", () => {
  expect(filterLegend(entries, { character: "unknown" }).ranks).toEqual(
    entries,
  );
  expect(filterLegend(entries, { character: ["KY", "SO"] }).ranks).toEqual([
    entries[1],
  ]);
});

it("uses exact character IDs for art and translated names with an unknown-character fallback", () => {
  expect(characterLabel("SO", "Sol", "ko")).toBe("솔");
  expect(characterLabel("JC", "Jack-O'", "en")).toBe("Jack-O");
  expect(getCharacterArt("SO")?.art).toBe("sol");
  expect(getCharacterArt("__proto__")).toBeUndefined();
  expect(characterLabel("XX", "New Character", "ko")).toBe("New Character");
  expect(characterLabel("XX", "", "en")).toBe("XX");
});
