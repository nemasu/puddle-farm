import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import type { Metadata } from "next";
import { LoadFailure } from "../../components/classic/LoadFailure";
import { PlayerDateTime } from "../../components/classic/PlayerFormatting";
import { SortLink } from "../../components/classic/SortLink";
import { LadderPopularityContent } from "../../components/ladder/PopularityContent";
import type { PopularityResult } from "../../interfaces/API";
import { getClassicMessages, getPageCopy } from "../../lib/i18n/classic";
import { characterLabel } from "../../lib/ladder-characters";
import { firstParam, type PageSearchParams } from "../../lib/pagination";
import {
  parsePopularitySort,
  popularitySortHref,
  sortPopularityData,
} from "../../lib/popularity";
import { readJson } from "../../lib/server/api";
import { getCharacters } from "../../lib/server/characters";
import { getRequestPresentation } from "../../lib/server/site-preferences";
import { Utils } from "../../utils/Utils";

const classicMetadata: Metadata = {
  title: "Character Popularity | Guilty Gear Strive | Puddle Farm",
  description: "Guilty Gear Strive character popularity in ranked play.",
};

export async function generateMetadata(): Promise<Metadata> {
  const presentation = await getRequestPresentation();
  return getPageCopy<Metadata>(presentation, classicMetadata, (messages) => ({
    title: `${messages.popularity.title} | Puddle Farm`,
    description: messages.popularity.description,
  }));
}

export default async function PopularityPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  const query = await searchParams;
  const presentation = await getRequestPresentation();
  const japanese = presentation.language === "ja";
  const messages = getClassicMessages(presentation.language).popularity;
  const [data, names] = await Promise.all([
    readJson<PopularityResult>("/popularity").catch(() => null),
    japanese && presentation.design === "classic"
      ? getCharacters().catch(() => ({}))
      : Promise.resolve({}),
  ]);
  const codes = new Map(
    Object.entries(names).map(([short, name]) => [name, short]),
  );
  if (presentation.design === "ladder")
    return (
      <LadderPopularityContent
        data={data}
        query={query}
        language={presentation.language}
      />
    );
  return (
    <Box sx={{ m: { xs: 1, sm: 5 } }}>
      <Typography component="h1" variant="h4" gutterBottom align="center">
        {japanese ? messages.title : "Popularity"}
      </Typography>
      {!data ? (
        <LoadFailure subject="popularity statistics" />
      ) : (
        <>
          {(["player", "character"] as const).map((kind) => {
            const key = `${kind}Sort`;
            const state = parsePopularitySort(firstParam(query[key]));
            const entries =
              kind === "player" ? data.per_player : data.per_character;
            const total =
              kind === "player"
                ? data.per_player_total
                : data.per_character_total;
            const sortHref = (column: "character" | "popularity") =>
              popularitySortHref(query, kind, column);
            return (
              <section key={kind} aria-label={`Popularity per ${kind}`}>
                <Typography
                  variant="h5"
                  component="h2"
                  sx={{ fontWeight: "bold", mb: 1 }}
                >
                  {japanese ? (
                    `${kind === "player" ? messages.perPlayer : messages.perCharacter}（${messages.period}）`
                  ) : (
                    <>
                      Character Popularity Per{" "}
                      {kind === "player" ? "Player" : "Character"} (Past Month)
                    </>
                  )}
                </Typography>
                <Typography sx={{ mb: 4 }}>
                  {japanese ? (
                    kind === "player" ? (
                      messages.playerExplanation
                    ) : (
                      messages.characterExplanation
                    )
                  ) : kind === "player" ? (
                    <>
                      This table shows the popularity of each character for each
                      player in the last month.
                      <br />
                      For example: If a character has a popularity of 10%, it
                      means that 10% of the players have used that character.
                      <br />
                      It adds up to over 100% because players can use multiple
                      characters.
                    </>
                  ) : (
                    <>
                      This table shows the game count per character in the last
                      month.
                      <br />
                      For example: If a character has a popularity of 10%, it
                      means that 10% of the games are with that character.
                    </>
                  )}
                </Typography>
                <TableContainer component={Paper} sx={{ maxWidth: 400, mb: 4 }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          <SortLink
                            href={sortHref("character")}
                            active={state?.column === "character"}
                            direction={
                              state?.column === "character" ? "desc" : "asc"
                            }
                          >
                            {messages.character}
                          </SortLink>
                        </TableCell>
                        <TableCell>
                          <SortLink
                            href={sortHref("popularity")}
                            active={state?.column === "popularity"}
                            direction={
                              state?.column === "popularity"
                                ? state.direction
                                : "desc"
                            }
                          >
                            {japanese ? messages.title : "Popularity"}
                          </SortLink>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortPopularityData(entries, state).map((row) => (
                        <TableRow key={row.name}>
                          <TableCell
                            component="th"
                            scope="row"
                            sx={{
                              position: "sticky",
                              left: 0,
                              background: "black",
                              zIndex: 1,
                            }}
                          >
                            {japanese
                              ? characterLabel(
                                  codes.get(row.name) ?? "",
                                  row.name,
                                  "ja",
                                )
                              : row.name}
                          </TableCell>
                          <TableCell>
                            <Tooltip
                              title={`${row.value} ${kind === "player" ? "Players" : "Games"}`}
                              arrow
                            >
                              <span>
                                {(total > 0
                                  ? ((row.value / total) * 100) /
                                    (kind === "character" ? 2 : 1)
                                  : 0
                                ).toFixed(2)}
                                %
                              </span>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {!entries.length && (
                  <Typography>No popularity data available.</Typography>
                )}
                <Box sx={{ mb: 4 }}>
                  {japanese
                    ? kind === "player"
                      ? messages.samplePlayers
                      : messages.sampleSelections
                    : `Total games per ${kind}`}
                  : {Utils.formatNumber(kind === "player" ? total : total * 2)}
                </Box>
              </section>
            );
          })}
          <Typography>{messages.updated}</Typography>
          <Typography>
            {messages.checked}: <PlayerDateTime value={data.last_update} />
          </Typography>
        </>
      )}
    </Box>
  );
}
