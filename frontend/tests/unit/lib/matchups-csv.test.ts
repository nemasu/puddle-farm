import type { MatchupResponse } from "../../../src/interfaces/API";
import { calculateAverageWinRate } from "../../../src/lib/matchups";
import { matchupsCsv } from "../../../src/lib/matchups-csv";

test("CSV retains both datasets, quotes, UTF-8 BOM, zero-game cells and timestamps", () => {
  const entries = [
    {
      char_name: 'A "quoted" character',
      char_short: "SO",
      matchups: [
        { char_name: "Ky", char_short: "KY", wins: 0, total_games: 0 },
      ],
    },
  ];
  const csv = matchupsCsv({
    data_all: entries,
    data_vanq: entries,
    last_update: "2026-11-13",
  });
  expect(csv.charCodeAt(0)).toBe(0xfeff);
  expect(csv).toContain('"A ""quoted"" character"');
  expect(csv).toContain('"Vanquisher I Ignis and Above"');
  expect(csv).toContain('"N/A","2026-11-13"');
});
test("average win rate weights games instead of averaging per-opponent percentages", () => {
  const entries = [
    { wins: 1, total_games: 1 },
    { wins: 0, total_games: 9 },
  ] as MatchupResponse["data_all"][number]["matchups"];
  expect(calculateAverageWinRate(entries)).toBe(10);
  expect(calculateAverageWinRate([])).toBe(0);
});
