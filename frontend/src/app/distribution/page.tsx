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
import { LadderDistributionContent } from "../../components/ladder/DistributionContent";
import type { DistributionResponse } from "../../interfaces/API";
import { getPageCopy } from "../../lib/i18n/classic";
import { readJson } from "../../lib/server/api";
import { getRequestPresentation } from "../../lib/server/site-preferences";
import { localizedMetadata } from "../../lib/server-metadata";
import { Utils } from "../../utils/Utils";

const classicMetadata: Metadata = {
  title: "Rating Distribution | Guilty Gear Strive | Puddle Farm",
  description: "Guilty Gear Strive player rating and rank distribution.",
};

export async function generateMetadata(): Promise<Metadata> {
  const presentation = await getRequestPresentation();
  return await localizedMetadata(
    getPageCopy<Metadata>(presentation, classicMetadata, (messages) => ({
      title: `${messages.distribution.title} | Puddle Farm`,
      description: messages.distribution.description,
    })),
  );
}
export default async function DistributionPage() {
  const presentation = await getRequestPresentation();
  const japanese = presentation.language === "ja";
  const messages = presentation.messages.distribution;
  let data: DistributionResponse | null;
  try {
    data = await readJson<DistributionResponse>("/distribution");
  } catch {
    data = null;
  }
  if (presentation.design === "ladder")
    return (
      <LadderDistributionContent data={data} language={presentation.language} />
    );
  const entries =
    data?.data.distribution_rating.filter((entry) => entry.upper_bound !== 1) ??
    [];
  return (
    <Box sx={{ m: { xs: 1, sm: 5 }, maxWidth: 700 }}>
      <Typography component="h1" variant="h4" gutterBottom sx={{ mt: 4 }}>
        {japanese ? messages.title : "Rank Distribution"}
      </Typography>
      <Typography sx={{ mb: 2 }}>
        {japanese
          ? messages.explanation
          : "This table shows the current distribution of players across different ranks."}
      </Typography>
      {!data ? (
        <LoadFailure subject="rank distribution" />
      ) : (
        <>
          <DistributionChart
            entries={entries}
            language={japanese ? "ja" : "en"}
          />
          {data.data.distribution_rating
            .filter((row) => row.upper_bound === 1)
            .map((row) => (
              <Typography key={row.lower_bound} sx={{ mb: "8px" }}>
                {japanese ? messages.placement : "Players in Placement"}:{" "}
                {row.count}
              </Typography>
            ))}
          {!entries.length && <Typography>{messages.empty}</Typography>}
          <TableContainer component={Paper}>
            <Table aria-label="Rank distribution">
              <TableHead>
                <TableRow>
                  <TableCell>{japanese ? messages.rank : "Rank"}</TableCell>
                  <TableCell>{japanese ? messages.count : "Count"}</TableCell>
                  <TableCell>
                    {japanese ? messages.percentage : "Percentage"}
                  </TableCell>
                  <TableCell>
                    {japanese ? messages.percentile : "Percentile"}
                  </TableCell>
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
            {presentation.messages.popularity.updated}
            <br />
            {presentation.messages.popularity.checked}:{" "}
            <PlayerDateTime value={data.timestamp} />
          </Typography>
        </>
      )}
      <Typography variant="h6" component="h2" gutterBottom sx={{ mt: 4 }}>
        {japanese ? messages.thresholds : "Rank Thresholds"}
      </Typography>
      <Typography sx={{ mb: 4 }}>{messages.thresholdNote}</Typography>
      <TableContainer component={Paper} sx={{ mb: 6 }}>
        <Table aria-label="Rank thresholds">
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell>{japanese ? messages.rank : "Rank"}</TableCell>
              <TableCell>
                {japanese ? messages.minimum : "Minimum Rating"}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>{Utils.displayRankIcon(0, "64px", true)}</TableCell>
              <TableCell>Imperius</TableCell>
              <TableCell>{japanese ? messages.top100 : "Top 100"}</TableCell>
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
