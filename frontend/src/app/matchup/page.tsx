import {
  Box,
  Button,
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
import { LoadFailure } from "../../components/classic/LoadFailure";
import MatchupMatrix from "../../components/classic/MatchupMatrix";
import { PlayerDateTime } from "../../components/classic/PlayerFormatting";
import { PercentChangeLabel } from "../../components/PercentChangeLabel";
import type { MatchupResponse } from "../../interfaces/API";
import { getCharacterWinRates } from "../../lib/matchups";
import { readJson } from "../../lib/server/api";

export const metadata: Metadata = {
  title: "Character Matchup Win Rates | Guilty Gear Strive | Puddle Farm",
  description: "Guilty Gear Strive character matchup win rates.",
};

export default async function MatchupPage() {
  let data: MatchupResponse | null;
  try {
    data = await readJson<MatchupResponse>("/matchups");
  } catch {
    data = null;
  }
  return (
    <Box sx={{ m: 2 }}>
      <Paper elevation={2} sx={{ p: { xs: 1, sm: 3 } }}>
        <Typography component="h1" variant="h5" gutterBottom>
          Matchup Tables
        </Typography>
        <Typography>
          Timeframe is the past month.
          <br />
          Win rates are calculated by the number of wins divided by the total
          number of games played.
        </Typography>
        {!data ? (
          <LoadFailure subject="matchup statistics" />
        ) : (
          <>
            <Button
              component="a"
              href="/matchup/export"
              download="ggst-matchups.csv"
              variant="outlined"
              sx={{ mt: 2 }}
            >
              Export as CSV
            </Button>
            {[
              ["All Players", data.data_all],
              ["Vanquisher I Ignis and Above", data.data_vanq],
            ].map(([title, rows]) => {
              const characters = rows as MatchupResponse["data_all"];
              return (
                <section key={String(title)} aria-label={String(title)}>
                  <MatchupMatrix data={characters} title={String(title)} />
                  {!characters.length && (
                    <Typography>No matchup data available.</Typography>
                  )}
                  <TableContainer
                    component={Paper}
                    sx={{ mt: "20px", maxWidth: "500px" }}
                  >
                    <Table
                      size="small"
                      aria-label={`${title} average win rates`}
                    >
                      <TableHead>
                        <TableRow>
                          <TableCell>Character</TableCell>
                          <TableCell align="right">Average Win Rate</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {getCharacterWinRates(characters).map((row) => (
                          <TableRow key={row.charShort}>
                            <TableCell>
                              {row.charName} ({row.charShort})
                            </TableCell>
                            <TableCell align="right">
                              <PercentChangeLabel percent={row.winRate} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </section>
              );
            })}
          </>
        )}
      </Paper>
      <Typography sx={{ mt: 5 }}>Statistics are updated once a day.</Typography>
      {data?.last_update && (
        <Typography>
          Last updated: <PlayerDateTime value={data.last_update} />
        </Typography>
      )}
    </Box>
  );
}
