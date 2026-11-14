import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import type { RankingEntry } from "../../lib/rankings";
import { Utils } from "../../utils/Utils";
import { Tag } from "../Tag";
import { LinkButton } from "./LinkButton";

export function RankingTable({
  ranks,
  legend = false,
}: {
  ranks: RankingEntry[];
  legend?: boolean;
}) {
  return (
    <TableContainer component={Paper}>
      <Table
        size="small"
        aria-label={legend ? "Legend leaderboard" : "Player leaderboard"}
      >
        <TableHead>
          <TableRow>
            <TableCell sx={{ px: 0, mx: 0, width: 32 }} />
            <TableCell>Player</TableCell>
            <TableCell>Char</TableCell>
            <TableCell>Rating</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {ranks.map((player) => (
            <TableRow key={`${player.id}-${player.char_short}`}>
              <TableCell sx={{ px: 0, mx: 0, width: 32, textAlign: "center" }}>
                {player.rank}
              </TableCell>
              <TableCell sx={{ maxWidth: { xs: 140, sm: "none" } }}>
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
                {player.tags.map((tag) => (
                  <Tag
                    key={tag.tag}
                    style={tag.style}
                    sx={{ fontSize: "0.9rem", position: "unset" }}
                  >
                    {tag.tag}
                  </Tag>
                ))}
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
                  {Utils.displayRankIcon(
                    player.rating,
                    "32px",
                    legend || player.is_legend,
                  )}
                  <Box component="span" title={String(player.rating)}>
                    {Utils.displayRating(player.rating)}
                  </Box>
                </Box>
              </TableCell>
            </TableRow>
          ))}
          {ranks.length === 0 && (
            <TableRow>
              <TableCell colSpan={4}>
                {legend ? "No Legend players found." : "No players found."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
