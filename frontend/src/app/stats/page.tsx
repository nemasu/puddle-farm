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
import type {
  HourlyPlayersResponse,
  StatsResponse,
} from "../../interfaces/API";
import { readApiResponse, readJson } from "../../lib/server/api";

export const metadata: Metadata = {
  title: "Ranked Statistics | Guilty Gear Strive | Puddle Farm",
  description:
    "Guilty Gear Strive ranked match statistics and player activity.",
};

export default async function StatsPage() {
  const [stats, hourly, health] = await Promise.all([
    readJson<StatsResponse>("/stats").catch(() => null),
    readJson<HourlyPlayersResponse>("/stats/hourly-players?range=30d").catch(
      () => null,
    ),
    readApiResponse("/ingestion/health").catch(() => null),
  ]);
  return (
    <>
      <PageHeading>Stats</PageHeading>
      <HourlyPlayersChart initialPoints={hourly?.points ?? null} />
      {hourly && hourly.points.length > 0 && (
        <Box sx={{ m: 4, maxWidth: 1000 }}>
          <details>
            <summary>Hourly player data</summary>
            <TableContainer>
              <Table size="small" aria-label="Hourly player data">
                <TableHead>
                  <TableRow>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Players</TableCell>
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
        <StatsTables data={stats} />
      ) : (
        <LoadFailure subject="ranked statistics" />
      )}
      <Box sx={{ m: 4 }}>
        <Typography>
          Match updates:{" "}
          {health?.body || "Could not check whether matches are updating."}
        </Typography>
      </Box>
    </>
  );
}
