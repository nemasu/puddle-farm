import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import type { Metadata } from "next";
import { DistributionChart } from "../../components/classic/DistributionChart";
import { LoadFailure } from "../../components/classic/LoadFailure";
import { PlayerDateTime } from "../../components/classic/PlayerFormatting";
import type { DistributionResponse } from "../../interfaces/API";
import { readJson } from "../../lib/server/api";
import { Utils } from "../../utils/Utils";

export const metadata: Metadata = {
  title: "Rating Distribution | Guilty Gear Strive | Puddle Farm",
  description: "Guilty Gear Strive player rating and rank distribution.",
};

export default async function DistributionPage() {
  let data: DistributionResponse | null;
  try {
    data = await readJson<DistributionResponse>("/distribution");
  } catch {
    data = null;
  }
  const entries =
    data?.data.distribution_rating.filter((entry) => entry.upper_bound !== 1) ??
    [];
  return (
    <Box sx={{ m: { xs: 1, sm: 5 }, maxWidth: 700 }}>
      <Typography component="h1" variant="h4" gutterBottom sx={{ mt: 4 }}>
        Rank Distribution
      </Typography>
      <Typography sx={{ mb: 2 }}>
        This table shows the current distribution of players across different
        ranks.
      </Typography>
      {!data ? (
        <LoadFailure subject="rank distribution" />
      ) : (
        <>
          <DistributionChart entries={entries} />
          {data.data.distribution_rating
            .filter((row) => row.upper_bound === 1)
            .map((row) => (
              <Typography key={row.lower_bound} sx={{ mb: "8px" }}>
                Players in Placement: {row.count}
              </Typography>
            ))}
          {!entries.length && (
            <Typography>No rank distribution data available.</Typography>
          )}
          <TableContainer component={Paper}>
            <Table aria-label="Rank distribution">
              <TableHead>
                <TableRow>
                  <TableCell>Rank</TableCell>
                  <TableCell>Count</TableCell>
                  <TableCell>Percentage</TableCell>
                  <TableCell>Percentile</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((row) => (
                  <TableRow key={row.lower_bound}>
                    <TableCell>
                      {Utils.getRankDisplayName(row.lower_bound)}
                    </TableCell>
                    <TableCell>{row.count}</TableCell>
                    <TableCell>{row.percentage.toFixed(2)}%</TableCell>
                    <TableCell>{row.percentile.toFixed(2)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography sx={{ my: 5 }}>
            Statistics are updated once a day.
            <br />
            Last updated: <PlayerDateTime value={data.timestamp} />
          </Typography>
        </>
      )}
      <Typography variant="h6" component="h2" gutterBottom sx={{ mt: 4 }}>
        Rank Thresholds
      </Typography>
      <Typography sx={{ mb: 4 }}>
        Rating requirements for each rank tier.
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 6 }}>
        <Table aria-label="Rank thresholds">
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>Rank</TableCell>
              <TableCell>Minimum Rating</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>{Utils.displayRankIcon(0, "64px", true)}</TableCell>
              <TableCell>Imperius</TableCell>
              <TableCell>Top 100</TableCell>
            </TableRow>
            {Utils.getRankThresholds().map((row) => (
              <TableRow key={row.rating}>
                <TableCell>
                  {Utils.displayRankIcon(row.rating, "64px")}
                </TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>{Utils.formatRankThresholdRating(row)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
