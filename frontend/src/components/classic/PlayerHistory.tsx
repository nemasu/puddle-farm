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
import type { PlayerResponse, TagResponse } from "../../interfaces/API";
import type { GroupedMatch, MatchWithRating } from "../../interfaces/Player";
import type { Pagination } from "../../lib/pagination";
import { getPlayerHistory } from "../../lib/server/player";
import { Utils } from "../../utils/Utils";
import { Tag } from "../Tag";
import { HistoryDisclosure } from "./HistoryDisclosure";
import { LinkButton } from "./LinkButton";
import { PlayerDateTime, PlayerRatingChange } from "./PlayerFormatting";

function MatchDetails({ matches }: { matches: MatchWithRating[] }) {
  return (
    <Table size="small" aria-label="Individual matches">
      <TableHead>
        <TableRow>
          <TableCell>Timestamp</TableCell>
          <TableCell align="right">Rating</TableCell>
          <TableCell align="right">Opponent Rating</TableCell>
          <TableCell align="right">Winner?</TableCell>
          <TableCell align="right">Rating Change</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {matches.map((match) => (
          <TableRow key={match.timestamp}>
            <TableCell>
              <PlayerDateTime value={match.timestamp} />
            </TableCell>
            <TableCell align="right">
              {Utils.displayRating(match.own_rating_value)}
            </TableCell>
            <TableCell align="right">
              {Utils.displayRating(match.opponent_rating_value)}
            </TableCell>
            <TableCell align="right">{match.result_win ? "Y" : "N"}</TableCell>
            <TableCell align="right">
              {Utils.formatRatingChange(match.ratingChange)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function Opponent({
  group,
  tags,
}: {
  group: GroupedMatch;
  tags?: TagResponse[];
}) {
  return (
    <>
      <LinkButton
        href={`/player/${group.opponent_id}/${encodeURIComponent(group.opponent_character_short)}`}
        sx={{
          justifyContent: "flex-start",
          minWidth: "auto",
          whiteSpace: "normal",
          wordBreak: "break-word",
          textAlign: "left",
        }}
      >
        {group.opponent_name}
      </LinkButton>
      {tags?.map((tag) => (
        <Tag
          key={tag.tag}
          style={JSON.parse(tag.style)}
          sx={{ fontSize: "0.9rem", position: "unset" }}
        >
          {tag.tag}
        </Tag>
      ))}
    </>
  );
}

function HistoryGroup({
  group,
  tags,
  card,
}: {
  group: GroupedMatch;
  tags?: TagResponse[];
  card?: boolean;
}) {
  const oldest = group.matches[group.matches.length - 1];
  const summary = card ? (
    <>
      <Opponent group={group} tags={tags} />
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1.5,
          px: 1,
          py: 0.5,
          alignItems: "center",
        }}
      >
        <Typography variant="body2">
          <PlayerDateTime value={group.timestamp} />
        </Typography>
        <Typography variant="body2">
          {Utils.displayRating(oldest.own_rating_value)}
        </Typography>
        <Typography variant="body2">
          {group.wins} - {group.losses}
        </Typography>
        <Typography variant="body2">
          {group.opponent_character_short}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {Utils.displayRankIcon(
            oldest.opponent_rating_value,
            "20px",
            oldest.opponent_is_legend,
          )}
          {Utils.displayRating(oldest.opponent_rating_value)}
        </Box>
        <PlayerRatingChange change={group.ratingChange} />
      </Box>
    </>
  ) : (
    <>
      <TableCell component="th" scope="row">
        <PlayerDateTime value={group.timestamp} />
      </TableCell>
      <TableCell align="right">
        {Utils.displayRating(oldest.own_rating_value)}
      </TableCell>
      <TableCell>
        <Opponent group={group} tags={tags} />
      </TableCell>
      <TableCell align="right">{group.matches[0].opponent_character}</TableCell>
      <TableCell align="right">
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
          }}
        >
          {Utils.displayRankIcon(
            oldest.opponent_rating_value,
            "32px",
            oldest.opponent_is_legend,
          )}
          {Utils.displayRating(oldest.opponent_rating_value)}
        </Box>
      </TableCell>
      <TableCell align="right">
        {group.wins} - {group.losses}
      </TableCell>
      <TableCell align="right">
        <PlayerRatingChange change={group.ratingChange} />
      </TableCell>
    </>
  );
  return (
    <HistoryDisclosure card={card} summary={summary}>
      <Box sx={{ overflowX: "auto" }}>
        <MatchDetails matches={group.matches} />
      </Box>
    </HistoryDisclosure>
  );
}

function HistoryPagination({
  id,
  character,
  pagination,
  showNext,
}: {
  id: bigint;
  character: string;
  pagination: Pagination;
  showNext: boolean;
}) {
  const { count, offset } = pagination;
  const base = `/player/${id}/${encodeURIComponent(character)}/${count}`;
  return (
    <Box sx={{ mx: { xs: 1, lg: 3 }, my: 2 }}>
      <LinkButton href={`${base}/${Math.max(0, offset - count)}`}>
        Prev
      </LinkButton>
      {showNext && Number.isSafeInteger(offset + count) && (
        <LinkButton href={`${base}/${offset + count}`}>Next</LinkButton>
      )}
    </Box>
  );
}

export async function PlayerHistory({
  player,
  character,
  pagination,
}: {
  player: PlayerResponse;
  character: string;
  pagination: Pagination;
}) {
  let data: Awaited<ReturnType<typeof getPlayerHistory>>;
  try {
    data = await getPlayerHistory(player, character, pagination);
  } catch (error) {
    console.error("Could not load player history:", error);
    return (
      <Typography role="alert" color="error">
        Could not load match history. Please try again later.
      </Typography>
    );
  }
  const navigation = (
    <HistoryPagination
      id={player.id}
      character={character}
      pagination={pagination}
      showNext={data.showNext}
    />
  );
  return (
    <section aria-label="Match history">
      {navigation}
      {!data.groups.length && <Typography>No matches found.</Typography>}
      <Box sx={{ display: { xs: "block", lg: "none" } }}>
        {data.groups.map((group) => (
          <HistoryGroup
            key={`${group.timestamp}-${group.opponent_id}`}
            group={group}
            tags={data.tags[group.opponent_id.toString()]}
            card
          />
        ))}
      </Box>
      <Box sx={{ display: { xs: "none", lg: "block" } }}>
        <TableContainer component={Paper}>
          <Table size="small" aria-label="Match history">
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell width="170px">Timestamp</TableCell>
                <TableCell width="120px" align="right">
                  Rating
                </TableCell>
                <TableCell>Opponent</TableCell>
                <TableCell align="right">Character</TableCell>
                <TableCell width="120px" align="right">
                  Rating
                </TableCell>
                <TableCell align="right">Result</TableCell>
                <TableCell align="right">Change</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.groups.map((group) => (
                <HistoryGroup
                  key={`${group.timestamp}-${group.opponent_id}`}
                  group={group}
                  tags={data.tags[group.opponent_id.toString()]}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
      {navigation}
    </section>
  );
}
