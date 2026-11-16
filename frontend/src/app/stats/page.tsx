import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import type { Metadata } from "next";
import { LoadFailure } from "../../components/classic/LoadFailure";
import { PageHeading } from "../../components/classic/PageHeading";
import { PlayerDateTime } from "../../components/classic/PlayerFormatting";
import { StatsTables } from "../../components/classic/StatsTables";
import HourlyPlayersChart from "../../components/HourlyPlayersChart";
import { LadderStatsContent } from "../../components/ladder/StatsContent";
import type {
  HourlyPlayersResponse,
  StatsResponse,
} from "../../interfaces/API";
import { getPageCopy } from "../../lib/i18n/classic";
import { readApiResponse, readJson } from "../../lib/server/api";
import { getRequestPresentation } from "../../lib/server/site-preferences";

const classicMetadata: Metadata = {
  title: "Ranked Statistics | Guilty Gear Strive | Puddle Farm",
  description:
    "Guilty Gear Strive ranked match statistics and player activity.",
};

export async function generateMetadata(): Promise<Metadata> {
  const presentation = await getRequestPresentation();
  return getPageCopy<Metadata>(presentation, classicMetadata, (messages) => ({
    title: `${messages.stats.title} | Puddle Farm`,
    description: messages.stats.description,
  }));
}

export default async function StatsPage() {
  const { design, language, messages } = await getRequestPresentation();
  if (design === "ladder") return <LadderStatsContent language={language} />;
  const [stats, hourly, health] = await Promise.all([
    readJson<StatsResponse>("/stats").catch(() => null),
    readJson<HourlyPlayersResponse>("/stats/hourly-players?range=30d").catch(
      () => null,
    ),
    readApiResponse("/ingestion/health").catch(() => null),
  ]);
  return (
    <>
      <PageHeading>
        {language === "ja" ? messages.stats.title : "Stats"}
      </PageHeading>
      <HourlyPlayersChart
        initialPoints={hourly?.points ?? null}
        language={language === "ja" ? "ja" : "en"}
      />
      {hourly && hourly.points.length > 0 && (
        <Box sx={{ m: 4, maxWidth: 1000 }}>
          <details>
            <summary>
              {language === "ja" ? messages.stats.hourly : "Hourly player data"}
            </summary>
            <TableContainer>
              <Table
                size="small"
                aria-label={
                  language === "ja"
                    ? messages.stats.hourly
                    : "Hourly player data"
                }
              >
                <TableHead>
                  <TableRow>
                    <TableCell>
                      {language === "ja"
                        ? messages.player.timestamp
                        : "Timestamp"}
                    </TableCell>
                    <TableCell>
                      {language === "ja"
                        ? messages.stats.chartPlayers
                        : "Players"}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {hourly.points.map((point) => (
                    <TableRow key={point.timestamp}>
                      <TableCell>
                        <PlayerDateTime
                          value={new Date(point.timestamp * 1000)
                            .toISOString()
                            .slice(0, 19)
                            .replace("T", " ")}
                        />
                      </TableCell>
                      <TableCell>{point.players}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </details>
        </Box>
      )}

      {stats ? (
        <StatsTables data={stats} language={language} />
      ) : (
        <LoadFailure subject="ranked statistics" />
      )}
      <Box sx={{ m: 4 }}>
        <Typography>
          {language === "ja" ? messages.stats.health : "Match updates"}:{" "}
          {health?.body || messages.common.ingestionError}
        </Typography>
      </Box>
    </>
  );
}
