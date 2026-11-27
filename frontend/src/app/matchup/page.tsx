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
import { LadderMatchupContent } from "../../components/ladder/MatchupContent";
import { PercentChangeLabel } from "../../components/PercentChangeLabel";
import type { MatchupResponse } from "../../interfaces/API";
import { getClassicMessages, getPageCopy } from "../../lib/i18n/classic";
import { characterLabel } from "../../lib/ladder-characters";
import { getCharacterWinRates } from "../../lib/matchups";
import type { PageSearchParams } from "../../lib/pagination";
import { readJson } from "../../lib/server/api";
import { getRequestPresentation } from "../../lib/server/site-preferences";
import { localizedMetadata } from "../../lib/server-metadata";

const classicMetadata: Metadata = {
  title: "Character Matchup Win Rates | Guilty Gear Strive | Puddle Farm",
  description: "Guilty Gear Strive character matchup win rates.",
};

export async function generateMetadata(): Promise<Metadata> {
  const presentation = await getRequestPresentation();
  return await localizedMetadata(
    getPageCopy<Metadata>(presentation, classicMetadata, (messages) => ({
      title: `${messages.matchup.title} | Puddle Farm`,
      description: messages.matchup.description,
    })),
  );
}

export default async function MatchupPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  const presentation = await getRequestPresentation();
  const japanese = presentation.language === "ja";
  const messages = getClassicMessages(presentation.language).matchup;
  let data: MatchupResponse | null;
  try {
    data = await readJson<MatchupResponse>("/matchups");
  } catch {
    data = null;
  }
  if (presentation.design === "ladder")
    return (
      <LadderMatchupContent
        data={data}
        query={await searchParams}
        language={presentation.language}
      />
    );
  return (
    <Box sx={{ m: 2 }}>
      <Paper elevation={2} sx={{ p: { xs: 1, sm: 3 } }}>
        <Typography component="h1" variant="h5" gutterBottom>
          {japanese ? messages.title : "Matchup Tables"}
        </Typography>
        <Typography>
          {japanese ? (
            <>
              {messages.period}
              <br />
              勝率は勝利数を総試合数で割って計算します。
            </>
          ) : (
            <>
              Timeframe is the past month.
              <br />
              Win rates are calculated by the number of wins divided by the
              total number of games played.
            </>
          )}
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
              {messages.export}
            </Button>
            {[
              [japanese ? messages.all : "All Players", data.data_all],
              [
                japanese ? messages.vanquisher : "Vanquisher I Ignis and Above",
                data.data_vanq,
              ],
            ].map(([title, rows]) => {
              const characters = rows as MatchupResponse["data_all"];
              return (
                <section key={String(title)} aria-label={String(title)}>
                  <MatchupMatrix
                    data={characters}
                    title={String(title)}
                    language={presentation.language}
                  />
                  {!characters.length && (
                    <Typography>{messages.empty}</Typography>
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
                          <TableCell>{messages.character}</TableCell>
                          <TableCell align="right">
                            {japanese ? "平均勝率" : "Average Win Rate"}
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {getCharacterWinRates(characters).map((row) => (
                          <TableRow key={row.charShort}>
                            <TableCell>
                              {japanese
                                ? characterLabel(
                                    row.charShort,
                                    row.charName,
                                    "ja",
                                  )
                                : row.charName}{" "}
                              ({row.charShort})
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
      <Typography sx={{ mt: 5 }}>{messages.updated}</Typography>
      {data?.last_update && (
        <Typography>
          {messages.checked}: <PlayerDateTime value={data.last_update} />
        </Typography>
      )}
    </Box>
  );
}
