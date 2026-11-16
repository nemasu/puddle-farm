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
import { getClassicMessages } from "../../lib/i18n/classic";
import { characterLabel } from "../../lib/ladder-characters";
import type { RankingEntry } from "../../lib/rankings";
import { getRequestPresentation } from "../../lib/server/site-preferences";
import { Utils } from "../../utils/Utils";
import { AppLink as Link } from "../AppLink";
import { Tag } from "../Tag";
import { LinkButton } from "./LinkButton";

export async function RankingTable({
  ranks,
  legend = false,
}: {
  ranks: RankingEntry[];
  legend?: boolean;
}) {
  const { language } = await getRequestPresentation();
  const messages = getClassicMessages(language);
  return (
    <TableContainer component={Paper}>
      <Table
        size="small"
        aria-label={legend ? "Legend leaderboard" : "Player leaderboard"}
      >
        <TableHead>
          <TableRow>
            <TableCell sx={{ px: 0, mx: 0, width: 32 }} />
            <TableCell>{messages.ladder.player}</TableCell>
            <TableCell>{messages.ladder.character}</TableCell>
            <TableCell>{messages.ladder.rating}</TableCell>
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
                {legend ? messages.ladder.empty : messages.ladder.emptyRanking}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
