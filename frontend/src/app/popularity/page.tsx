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
import type { PopularityResult } from "../../interfaces/API";
import { firstParam, type PageSearchParams } from "../../lib/pagination";
import {
  nextSortState,
  type SortState,
  sortPopularityData,
} from "../../lib/popularity";
import { readJson } from "../../lib/server/api";
import { Utils } from "../../utils/Utils";

export const metadata: Metadata = {
  title: "Character Popularity | Guilty Gear Strive | Puddle Farm",
  description: "Guilty Gear Strive character popularity in ranked play.",
};

function parseSort(value?: string): SortState {
  return value === "character-reversed"
    ? { column: "character", direction: "reversed" }
    : value === "popularity-asc" || value === "popularity-desc"
      ? {
          column: "popularity",
          direction: value === "popularity-asc" ? "asc" : "desc",
        }
      : null;
}

export default async function PopularityPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  const query = await searchParams;
  let data: PopularityResult | null;
  try {
    data = await readJson<PopularityResult>("/popularity");
  } catch {
    data = null;
  }
  return (
    <Box sx={{ m: { xs: 1, sm: 5 } }}>
      <Typography component="h1" variant="h4" gutterBottom align="center">
        Popularity
      </Typography>
      {!data ? (
        <LoadFailure subject="popularity statistics" />
      ) : (
        <>
          {(["player", "character"] as const).map((kind) => {
            const key = `${kind}Sort`;
            const state = parseSort(firstParam(query[key]));
            const entries =
              kind === "player" ? data.per_player : data.per_character;
            const total =
              kind === "player"
                ? data.per_player_total
                : data.per_character_total;
            const sortHref = (column: "character" | "popularity") => {
              const next = nextSortState(state, column);
              const params = new URLSearchParams();
              for (const [name, value] of Object.entries(query))
                if (firstParam(value) !== undefined)
                  params.set(name, firstParam(value) ?? "");
              if (next) params.set(key, `${next.column}-${next.direction}`);
              else params.delete(key);
              return `/popularity${params.size ? `?${params}` : ""}`;
            };
            return (
              <section key={kind} aria-label={`Popularity per ${kind}`}>
                <Typography
                  variant="h5"
                  component="h2"
                  sx={{ fontWeight: "bold", mb: 1 }}
                >
                  Character Popularity Per{" "}
                  {kind === "player" ? "Player" : "Character"} (Past Month)
                </Typography>
                <Typography sx={{ mb: 4 }}>
                  {kind === "player" ? (
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
                            Character
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
                            Popularity
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
                            {row.name}
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
                  Total games per {kind}:{" "}
                  {Utils.formatNumber(kind === "player" ? total : total * 2)}
                </Box>
              </section>
            );
          })}
          <Typography>Statistics are updated once a day.</Typography>
          <Typography>
            Last updated: <PlayerDateTime value={data.last_update} />
          </Typography>
        </>
      )}
    </Box>
  );
}
