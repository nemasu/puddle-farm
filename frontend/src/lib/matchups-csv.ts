import type { MatchupResponse } from "../interfaces/API";

export function matchupsCsv(data: MatchupResponse): string {
  const rows: (string | number)[][] = [
    [
      "Dataset",
      "Character",
      "Character Code",
      "Opponent",
      "Opponent Code",
      "Wins",
      "Total Games",
      "Win Rate (%)",
      "Last Updated",
    ],
  ];
  for (const [label, characters] of [
    ["All Players", data.data_all],
    ["Vanquisher I Ignis and Above", data.data_vanq],
  ] as const) {
    for (const character of characters)
      for (const matchup of character.matchups)
        rows.push([
          label,
          character.char_name,
          character.char_short,
          matchup.char_name,
          matchup.char_short,
          matchup.wins,
          matchup.total_games,
          matchup.total_games > 0
            ? (matchup.wins / matchup.total_games) * 100
            : "N/A",
          data.last_update,
        ]);
  }
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\r\n")
  );
}
