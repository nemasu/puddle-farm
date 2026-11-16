import type { Language } from "../lib/site-preferences";
import type { MatchupEntry } from "./API";
export interface MatchupProps {
  API_ENDPOINT: string;
  char_short: string | undefined;
  player_id: bigint;
  language?: Language;
  initialData?: Matchups | null;
  initialGlobal?: MatchupEntry[] | null;
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
