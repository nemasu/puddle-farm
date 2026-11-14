import type { DistributionResult } from "../interfaces/API";
import { Utils } from "../utils/Utils";
export const combineRankData = (data: DistributionResult[]) => {
  const combined: {
    [key: string]: {
      count: number;
      percentage: number;
      percentile: number;
      lower_bound: number;
    };
  } = {};

  data.forEach((entry) => {
    const rankName = Utils.getRankDisplayName(entry.lower_bound);
    const baseRank = rankName.split(" ")[0]; // Get 'Gold' from 'Gold 1'

    if (!combined[baseRank]) {
      combined[baseRank] = {
        count: 0,
        percentage: 0,
        percentile: 0,
        lower_bound: entry.lower_bound,
      };
    }

    combined[baseRank].count += entry.count;
    combined[baseRank].percentage += entry.percentage;
  });

  // Calculate percentiles for combined data
  const combinedArray = Object.entries(combined).map(([name, data]) => ({
    name,
    count: data.count,
    percentage: data.percentage,
    lower_bound: data.lower_bound,
  }));

  // Sort by lower_bound to calculate cumulative percentiles
  combinedArray.sort((a, b) => a.lower_bound - b.lower_bound);

  let cumulativePercentage = 0;
  combinedArray.forEach((item) => {
    combined[item.name].percentile = 100 - cumulativePercentage;
    cumulativePercentage += item.percentage;
  });

  return combined;
};
