export interface PlayerResponse {
  id: BigInt; // Player's ID
  name: string; // Player's name
  ratings: PlayerResponsePlayer[]; // Player's ratings for each character
  platform: string; // Player's platform (PS, XB, PC)
  status: string; // Player's status (Public, Private, Cheater)
  top_global: number; // Player's top global rank
  tags: TagResponse[];
}

export interface PlayerResponsePlayer {
  rating: number;
  deviation: number;
  char_short: string;
  character: string;
  match_count: number;
  top_char: number;
  top_defeated: TopDefeated;
  top_rating: TopRating;
}

export interface TopDefeated {
  timestamp: string;
  id: number;
  name: string;
  char_short: string;
  value: number;
  deviation: number;
}

export interface TopRating {
  timestamp: string;
  value: number;
  deviation: number;
}

export interface PlayerGamesResponse {
  history: PlayerSet[];
  tags: Record<string, TagResponse[]>; //player_id to tags
}

export interface TagResponse {
  tag: string;
  style: string;
}

export interface PlayerSet {
  timestamp: string;
  own_rating_value: number;
  own_rating_deviation: number;
  floor: string;
  opponent_name: string;
  opponent_platform: string;
  opponent_id: BigInt;
  opponent_character: string;
  opponent_character_short: string;
  opponent_rating_value: number;
  opponent_rating_deviation: number;
  result_win: boolean;
  odds: number;
}

export interface RankResponse {
  ranks: PlayerRankResponse[]; // List of player rankings
}

export interface PlayerRankResponse {
  rank: number; // Player's rank
  id: BigInt; // Player's ID
  name: string; // Player's name
  rating: number; // Player's rating
  deviation: number; // Player's rating deviation
  char_short: string; // Short name of the character
  char_long: string; // Full name of the character
  tags: TagResponse[];
}

export interface SearchResponse {
  results: PlayerSearchResponse[]; // List of search results
}

export interface PlayerSearchResponse {
  id: BigInt; // Player's ID
  name: string; // Player's name
  rating: number; // Player's rating
  deviation: number; // Player's rating deviation
  char_short: string; // Short name of the character
  char_long: string; // Full name of the character
}

export interface SettingsResponse {
  id: BigInt; // Player's ID
  name: string; // Player's name
  status: string; // Player's status (Public, Private, Cheater)
}

export interface RatingsResponse {
  timestamp: string; // Timestamp of the rating
  rating: number; // Player's rating at the time
}

export interface StatsResponse {
  timestamp: string; // Timestamp of the last update
  total_games: number; // Total number of games played
  one_month_games: number; // Number of games played in the last month
  one_week_games: number; // Number of games played in the last week
  one_day_games: number; // Number of games played in the last day
  one_hour_games: number; // Number of games played in the last hour
  total_players: number; // Total number of players
  one_month_players: number; // Number of players in the last month
  one_week_players: number; // Number of players in the last week
  one_day_players: number; // Number of players in the last day
  one_hour_players: number; // Number of players in the last hour
}

export interface PopularityResult {
  per_player: PopularityResultChar[]; // Character popularity per player
  per_character: PopularityResultChar[]; // Character popularity per character
  per_player_total: number; // Total number of players for popularity calculation
  per_character_total: number; // Total number of characters for popularity calculation
  last_update: string; // Timestamp of the last update
}

export interface PopularityResultChar {
  name: string; // Character name
  value: number; // Popularity value
}

export interface MatchupResponse {
  last_update: string; // Timestamp of the last update
  data_all: MatchupCharResponse[]; // Matchup data for all ranks
  data_vanq: MatchupCharResponse[]; // Matchup data for Vanquisher players
}

export interface MatchupCharResponse {
  char_name: string; // Character name
  char_short: string; // Short character name
  matchups: MatchupEntry[]; // List of matchups for this character
}

export interface MatchupEntry {
  char_name: string; // Opponent character name
  char_short: string; // Opponent short character name
  wins: number; // Number of wins against this opponent
  total_games: number; // Total number of games against this opponent
}

export interface Supporter {
  id: BigInt;
  name: string;
  tags: TagResponse[];
}

export interface TagResponse {
  tag: string;
  style: string;
}

export interface DistributionResult {
  /** Lower bound of the distribution range */
  lower_bound: number;
  /** Upper bound of the distribution range */
  upper_bound: number;
  /** Count of items in the distribution range */
  count: number;
  /** Percentage of items in the distribution range */
  percentage: number;
  /** Percentile of items in the distribution range */
  percentile: number;
}

export interface DistributionEntry {
  /** Player count for past month */
  one_month_players: number;
  /** Distribution rating data */
  distribution_rating: DistributionResult[];
}

export interface DistributionResponse {
  /** Timestamp of the distribution data */
  timestamp: string;
  /** Distribution entry data */
  data: DistributionEntry;
}

export interface RatingCalculationResponse {
  rating_a_new: number;
  drift_a_new: number;
  rating_b_new: number;
  drift_b_new: number;
  win_prob: number;
}