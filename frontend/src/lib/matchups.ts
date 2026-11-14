import type { MatchupCharResponse, MatchupEntry } from "../interfaces/API";
import type { CharWinRates } from "../interfaces/Matchup";
export const calculateAverageWinRate = (matchups: MatchupEntry[]) => {
  const totalWins = matchups.reduce((sum, m) => sum + m.wins, 0);
  const totalGames = matchups.reduce((sum, m) => sum + m.total_games, 0);
  return totalGames > 0 ? (totalWins / totalGames) * 100 : 0;
};

export const getCharacterWinRates = (
  matchupData: MatchupCharResponse[],
): CharWinRates[] => {
  if (!matchupData) return [];

  return matchupData
    .map((row) => ({
      charName: row.char_name,
      charShort: row.char_short,
      winRate: calculateAverageWinRate(row.matchups),
    }))
    .sort((a, b) => b.winRate - a.winRate);
};
