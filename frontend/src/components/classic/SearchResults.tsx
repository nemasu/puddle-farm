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
import { getSearchResults } from "../../lib/server/search";
import { Utils } from "../../utils/Utils";
import { LinkButton } from "./LinkButton";

export async function SearchResults({
  query,
  exact,
}: {
  query: string;
  exact: boolean;
}) {
  let players: Awaited<ReturnType<typeof getSearchResults>>;
  try {
    players = await getSearchResults(query, exact);
  } catch (error) {
    console.error("Could not load search results:", error);
    return (
      <Typography role="alert" color="error" align="center" sx={{ m: 4 }}>
        Could not load search results. Please try again later.
      </Typography>
    );
  }
  if (!players.length)
    return (
      <Typography align="center" sx={{ m: 4 }}>
        No results found.
      </Typography>
    );
  return (
    <TableContainer component={Paper}>
      <Table size="small" aria-label="Search results">
        <TableHead>
          <TableRow>
            <TableCell>Player</TableCell>
            <TableCell>Character</TableCell>
            <TableCell>Rating</TableCell>
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
              <TableCell>{player.char_short}</TableCell>
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
