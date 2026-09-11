import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import {
  Box,
  Button,
  Collapse,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
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
          <TableCell sx={{ px: 0.5 }}>Time</TableCell>
          <TableCell align="right" sx={{ px: 0.5 }}>
            Rating
          </TableCell>
          <TableCell align="right" sx={{ px: 0.5 }}>
            Opp Rating
          </TableCell>
          <TableCell align="right" sx={{ px: 0.5 }}>
            Win?
          </TableCell>
          <TableCell align="right" sx={{ px: 0.5 }}>
            Change
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {matches.map((item) => (
          <TableRow key={item.timestamp}>
            <TableCell component="th" scope="row" sx={{ px: 0.5 }}>
              {Utils.formatUTCToLocal(item.timestamp)}
            </TableCell>
            <TableCell align="right" sx={{ px: 0.5 }}>
              {Utils.displayRating(item.own_rating_value)}
            </TableCell>
            <TableCell align="right" sx={{ px: 0.5 }}>
              {Utils.displayRating(item.opponent_rating_value)}
            </TableCell>
            <TableCell align="right" sx={{ px: 0.5 }}>
              {item.result_win ? "Y" : "N"}
            </TableCell>
            <TableCell align="right" sx={{ px: 0.5 }}>
              {Utils.formatRatingChange(item.ratingChange)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// labeled value: small labeled value, wraps naturally in a flex row
function LabeledValue({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        flex: "1 1 100px",
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          lineHeight: 1.1,
          border: 0,
          clip: "rect(0 0 0 0)",
          height: "1px",
          margin: -1,
          overflow: "hidden",
          padding: 0,
          position: "absolute",
          whiteSpace: "nowrap",
          width: "1px",
        }}
      >
        {label}
      </Typography>
      <Typography variant="body2" sx={{ lineHeight: 1.2 }}>
        {children}
      </Typography>
    </Box>
  );
}

function HistoryCard(props: { item?: GroupedMatch; tags?: TagResponse[] }) {
  const [open, setOpen] = useState(false);

  const { item, tags } = props;

  if (!item) return null;

  const lastMatch = item.matches[item.matches.length - 1];

  return (
    <Box component={Paper} sx={{ p: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <IconButton
          aria-label="expand row"
          size="small"
          onClick={() => setOpen(!open)}
        >
          {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
        </IconButton>
        <Button
          component={Link}
          sx={{ justifyContent: "flex-start", minWidth: "auto" }}
          to={`/player/${item.opponent_id}/${item.matches[0].opponent_character_short}`}
        >
          {item.opponent_name}
        </Button>
        {tags?.map((e: TagResponse) => (
          <Tag
            key={e.tag}
            style={JSON.parse(e.style)}
            sx={{ fontSize: "0.9rem" }}
          >
            {e.tag}
          </Tag>
        ))}
      </Box>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "flex-start",
          gap: 1.5,
          px: 1,
          py: 0.5,
          alignItems: "center",
        }}
      >
        <LabeledValue label="Time">
          {Utils.formatUTCToLocal(item.timestamp)}
        </LabeledValue>
        <LabeledValue label="Rating">
          {Utils.displayRating(lastMatch.own_rating_value)}
        </LabeledValue>
        <LabeledValue label="Result">
          {item.wins} - {item.losses}
        </LabeledValue>
        <LabeledValue label="Char">
          {item.matches[0].opponent_character_short}
        </LabeledValue>
        <LabeledValue label="Opp Rating">
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {Utils.displayRankIcon(
              lastMatch.opponent_rating_value,
              "20px",
              lastMatch.opponent_is_legend,
            )}
            {Utils.displayRating(lastMatch.opponent_rating_value)}
          </Box>
        </LabeledValue>
        <LabeledValue label="Change">
          <RatingChangeLabel change={item.ratingChange} />
        </LabeledValue>
      </Box>

      <Collapse in={open} timeout="auto" unmountOnExit>
        <MatchDetailTable matches={item.matches} />
      </Collapse>
    </Box>
  );
}

export default HistoryCard;
