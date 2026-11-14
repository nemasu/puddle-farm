import type { DistributionResult } from "../../../src/interfaces/API";
import { combineRankData } from "../../../src/lib/distribution";

test("combined ranks sum subdivisions and preserve cumulative percentile semantics", () => {
  const entries: DistributionResult[] = [
    {
      lower_bound: 1,
      upper_bound: 1000,
      count: 10,
      percentage: 20,
      percentile: 90,
    },
    {
      lower_bound: 1000,
      upper_bound: 4200,
      count: 15,
      percentage: 30,
      percentile: 70,
    },
    {
      lower_bound: 4200,
      upper_bound: 5400,
      count: 20,
      percentage: 40,
      percentile: 40,
    },
  ];
  const original = structuredClone(entries);
  const result = combineRankData(entries);
  expect(result.Iron).toMatchObject({
    count: 25,
    percentage: 50,
    percentile: 100,
  });
  expect(result.Bronze).toMatchObject({
    count: 20,
    percentage: 40,
    percentile: 50,
  });
  expect(entries).toEqual(original);
});
