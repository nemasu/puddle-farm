export interface MatchupProps {
  matchups: Matchups;
}

export interface Matchup {
  char_name: string;
  char_short: string;
  wins: number;
  total_games: number;
}

export interface Matchups {
  matchups: Matchup[];
  total_wins: number;
  total_games: number;
}
