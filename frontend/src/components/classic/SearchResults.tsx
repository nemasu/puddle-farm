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
import { getClassicMessages } from "../../lib/i18n/classic";
import { characterLabel } from "../../lib/ladder-characters";
import { getSearchResults } from "../../lib/server/search";
import { getRequestPresentation } from "../../lib/server/site-preferences";
import { Utils } from "../../utils/Utils";
import { AppLink as Link } from "../AppLink";
import { LinkButton } from "./LinkButton";

export async function SearchResults({
  query,
  exact,
}: {
  query: string;
  exact: boolean;
}) {
  const { language } = await getRequestPresentation();
  const messages = getClassicMessages(language);
  let players: Awaited<ReturnType<typeof getSearchResults>>;
  try {
    players = await getSearchResults(query, exact);
  } catch (error) {
    console.error("Could not load search results:", error);
    return (
      <Typography role="alert" color="error" align="center" sx={{ m: 4 }}>
        {messages.ladder.searchError}
      </Typography>
    );
  }
  if (!players.length)
    return (
      <Typography align="center" sx={{ m: 4 }}>
        {messages.ladder.searchEmpty}
      </Typography>
    );
  return (
    <TableContainer component={Paper}>
      <Table size="small" aria-label="Search results">
        <TableHead>
          <TableRow>
            <TableCell>{messages.ladder.player}</TableCell>
            <TableCell>{messages.ladder.character}</TableCell>
            <TableCell>{messages.ladder.rating}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {players.map((player) => (
            <TableRow key={`${player.id}-${player.char_short}`}>
              <TableCell>
                <LinkButton
                  href={`/player/${player.id}/${encodeURIComponent(player.char_short)}`}
                  sx={{
                    justifyContent: "flex-start",
                    minWidth: "auto",
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                    textAlign: "left",
                  }}
                >
                  {player.name}
                </LinkButton>
              </TableCell>
              <TableCell>
                <Link href={`/top/${encodeURIComponent(player.char_short)}`}>
                  {language === "ja"
                    ? characterLabel(
                        player.char_short,
                        player.char_short,
                        language,
                      )
                    : player.char_short}
                </Link>
              </TableCell>
              <TableCell>
                <Box
                  component="span"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {Utils.displayRankIcon(player.rating, "32px")}
                  <Box component="span">
                    {Utils.displayRating(player.rating)}
                  </Box>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
