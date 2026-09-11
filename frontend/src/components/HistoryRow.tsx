import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import {
  Box,
  Button,
  Collapse,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { TagResponse } from "../interfaces/API";
import type { GroupedMatch, MatchWithRating } from "../interfaces/Player";
import { Utils } from "../utils/Utils";
import { RatingChangeLabel } from "./RatingChangeLabel";
import { Tag } from "./Tag";

function MatchDetailTable({ matches }: { matches: MatchWithRating[] }) {
  return (
    <Table size="small">
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
        {matches.map((item) => (
          <TableRow key={item.timestamp}>
            <TableCell component="th" scope="row">
              {Utils.formatUTCToLocal(item.timestamp)}
            </TableCell>
            <TableCell align="right">
              {Utils.displayRating(item.own_rating_value)}
            </TableCell>
            <TableCell align="right">
              {Utils.displayRating(item.opponent_rating_value)}
            </TableCell>
            <TableCell align="right">{item.result_win ? "Y" : "N"}</TableCell>
            <TableCell align="right">
              {Utils.formatRatingChange(item.ratingChange)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function HistoryRow(props: { item?: GroupedMatch; tags?: TagResponse[] }) {
  const [open, setOpen] = useState(false);

  const { item, tags } = props;

  if (!item) return null;

  return (
    <>
      <TableRow sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          {Utils.formatUTCToLocal(item.timestamp)}
        </TableCell>
        <TableCell align="right">
          <Box component={"span"}>
            {Utils.displayRating(
              item.matches[item.matches.length - 1].own_rating_value,
            )}
          </Box>
        </TableCell>
        <TableCell>
          <Button
            component={Link}
            sx={{ justifyContent: "flex-start", minWidth: "auto" }}
            to={`/player/${item.opponent_id}/${item.matches[0].opponent_character_short}`}
          >
            {item.opponent_name}
          </Button>
          <Box>
            {tags?.map((e: TagResponse) => (
              <Tag
                key={e.tag}
                style={JSON.parse(e.style)}
                sx={{ fontSize: "0.9rem", position: "unset" }}
              >
                {e.tag}
              </Tag>
            ))}
          </Box>
        </TableCell>
        <TableCell align="right">
          {item.matches[0].opponent_character}
        </TableCell>
        <TableCell align="right">
          <Box component={"span"}>
            {Utils.displayRankIcon(
              item.matches[item.matches.length - 1].opponent_rating_value,
              "32px",
              item.matches[item.matches.length - 1].opponent_is_legend,
            )}{" "}
            {Utils.displayRating(
              item.matches[item.matches.length - 1].opponent_rating_value,
            )}
          </Box>
        </TableCell>
        <TableCell align="right">
          {item.wins} - {item.losses}
        </TableCell>
        <TableCell align="right">
          <RatingChangeLabel change={item.ratingChange} />
        </TableCell>
      </TableRow>
      <TableRow id={item.timestamp}>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <MatchDetailTable matches={item.matches} />
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default HistoryRow;
