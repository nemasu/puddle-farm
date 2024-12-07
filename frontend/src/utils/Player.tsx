import { PlayerResponse } from "../interfaces/API";

function getCurrentPlayerRating(player: PlayerResponse, char_short: string) {
  for (var key in player.ratings) {
    if (player.ratings[key].char_short === char_short) {
      return { rating: player.ratings[key].rating, deviation: player.ratings[key].deviation };
    }
  }
}

export function groupMatches(data: any[], player: PlayerResponse, char_short: string, has_offset: boolean) {
  const groupedData = [];
  let currentGroup = null;
  let lastValidGroup = null;
  let lastValidMatch = null;
  data.reverse();

  let limit;
  if (has_offset) {
    limit = data.length - 1;
  } else {
    limit = data.length;
  }

  for (let i = 0; i < limit; i++) {
    const match = data[i];
    match.opponent_id = BigInt(match.opponent_id);

    if (
      currentGroup &&
      (currentGroup.opponent_id === match.opponent_id) &&
      (currentGroup.opponent_character_short === match.opponent_character_short)
    ) {
      // Continue the current group if the opponent and character are the same as the previous match
      currentGroup.matches.push(match);
      currentGroup.wins += match.result_win ? 1 : 0;
      currentGroup.losses += match.result_win ? 0 : 1;
      if (match.own_rating_value !== 0) {
        if (lastValidMatch) {
          const ratingChange = parseFloat((match.own_rating_value - lastValidMatch.own_rating_value).toString());
          currentGroup.ratingChange += ratingChange;
          lastValidMatch.ratingChange = ratingChange.toFixed(2);
        }
      }
    } else {
      if (currentGroup) {
        // Only calculate rating change if the last match in the current group is valid
        // This will not calculate the rating change for the most recent match for the group before a hidden group
        if (lastValidMatch && match.own_rating_value !== 0 && currentGroup.matches[0].own_rating_value !== 0) {
          const lastChange = match.own_rating_value - lastValidMatch.own_rating_value;
          currentGroup.ratingChange += lastChange;
          currentGroup.matches.reverse();
          currentGroup.matches[0].ratingChange = lastChange.toFixed(2);
        } else {
          currentGroup.matches.reverse();
        }
      }

      // Start a new group
      currentGroup = {
        opponent_id: match.opponent_id,
        opponent_name: match.opponent_name,
        opponent_character_short: match.opponent_character_short,
        floor: match.floor,
        matches: [match],
        wins: match.result_win ? 1 : 0,
        losses: match.result_win ? 0 : 1,
        odds: match.odds,
        ratingChange: 0,
        timestamp: match.timestamp,
      };

      //This calculates the rating change for the most recent match for the group before a hidden group
      if (currentGroup !== lastValidGroup
        && match.own_rating_value !== 0
        && lastValidGroup
        && !lastValidGroup.matches[0].ratingChange) {

        const lastChange = match.own_rating_value - lastValidMatch.own_rating_value;
        lastValidGroup.ratingChange += lastChange;
        lastValidGroup.matches[0].ratingChange = lastChange.toFixed(2);
      }

      if (match.own_rating_value !== 0) {
        lastValidGroup = currentGroup;
      }

      groupedData.push(currentGroup);
    }

    // Update lastValidMatch if the current match is valid
    if (match.own_rating_value !== 0) {
      lastValidMatch = match;
    }
  }

  groupedData.reverse();
  groupedData[0].matches.reverse();

  let player_rating: { rating?: number } = {};
  if (has_offset) {
    player_rating.rating = data[data.length - 1].own_rating_value;
  } else {
    const currentRating = getCurrentPlayerRating(player, char_short);
    player_rating = currentRating ? { rating: currentRating.rating } : { rating: undefined };
  }

  // Calculate the final rating change with the first good match
  for (let i = 0; i < groupedData.length; i++) {
    if (groupedData[i].matches[0].own_rating_value !== 0) {
      const lastChange = player_rating.rating !== undefined ? player_rating.rating - groupedData[i].matches[0].own_rating_value : 0;
      groupedData[i].ratingChange += lastChange;
      groupedData[i].matches[0].ratingChange = lastChange.toFixed(2);
      break;
    }
  }

  return groupedData;
}