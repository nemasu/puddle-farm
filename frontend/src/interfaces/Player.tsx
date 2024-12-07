export interface GroupedMatch {
  floor: string; // Floor of the match (e.g., "Celestial", "99")
  losses: number; // Number of losses in this set of matches
  matches: any[]; // Array of individual match details (not provided in the inspection)
  odds: number; // Player's odds of winning the set
  opponent_character_short: string; // Opponent's character (short name)
  opponent_id: BigInt; // Opponent's ID
  opponent_name: string; // Opponent's name
  ratingChange: number; // Change in rating after this set of matches
  timestamp: string; // Timestamp of the match set
  wins: number; // Number of wins in this set of matches
}

export interface LineChartData {
  labels: string[];
  datasets: LineChartDataSet[];
}

export interface LineChartDataSet {
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
}

export interface ClaimDialogProps {
  playerId: BigInt;
  API_ENDPOINT: string;
}