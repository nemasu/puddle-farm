import {
  Box,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
} from "@mui/material";
import { Suspense, use, useMemo, useState } from "react";
import { usePopularityPromise } from "../hooks/usePopularity";
import type { PopularityResult, PopularityResultChar } from "../interfaces/API";
import { Utils } from "./../utils/Utils";

export type SortColumn = "character" | "popularity";
export type SortState =
  | { column: "character"; direction: "reversed" }
  | { column: "popularity"; direction: "asc" | "desc" }
  | null;

export function nextSortState(
  current: SortState,
  clicked: SortColumn,
): SortState {
  if (clicked === "character") {
    return current?.column === "character"
      ? null
      : { column: "character", direction: "reversed" };
  }
  if (current === null || current.column !== "popularity") {
    return { column: "popularity", direction: "desc" };
  }
  return current.direction === "desc"
    ? { column: "popularity", direction: "asc" }
    : null;
}

export function sortPopularityData<T extends { name: string; value: number }>(
  items: T[],
  sortState: SortState,
): T[] {
  if (sortState === null) {
    return items;
  }
  if (sortState.column === "character") {
    return [...items].reverse();
  }
  const sorted = [...items].sort((a, b) => a.value - b.value);
  return sortState.direction === "asc" ? sorted : sorted.reverse();
}

const PopularityTable = ({
  data,
  percentage,
  countLabel,
}: {
  data: PopularityResultChar[];
  percentage: (value: number) => number;
  countLabel: string;
}) => {
  const [sortState, setSortState] = useState<SortState>(null);

  const sorted = useMemo(
    () => sortPopularityData(data, sortState),
    [data, sortState],
  );

  return (
    <TableContainer component={Paper} sx={{ maxWidth: 400, marginBottom: 4 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>
              <TableSortLabel
                active={sortState?.column === "character"}
                direction={sortState?.column === "character" ? "desc" : "asc"}
                onClick={() =>
                  setSortState(nextSortState(sortState, "character"))
                }
              >
                Character
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortState?.column === "popularity"}
                direction={
                  sortState?.column === "popularity"
                    ? sortState.direction
                    : "desc"
                }
                onClick={() =>
                  setSortState(nextSortState(sortState, "popularity"))
                }
              >
                Popularity
              </TableSortLabel>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((e) => (
            <TableRow key={e.name}>
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
                {e.name}
              </TableCell>
              <TableCell>
                <Tooltip title={`${e.value} ${countLabel}`} arrow>
                  <span>{percentage(e.value).toFixed(2)}%</span>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const PopularityContent = ({
  data,
}: {
  data: Promise<PopularityResult | undefined>;
}) => {
  const popularity = use(data);

  return (
    <Box sx={{ m: { xs: 1, sm: 5 } }}>
      <Typography variant="h4" gutterBottom align="center">
        Popularity
      </Typography>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: "bold", marginBottom: 1 }}>
          Character Popularity Per Player (Past Month)
        </Typography>
        <Box sx={{ mb: 4 }}>
          <Typography variant="body1">
            This table shows the popularity of each character for each player in
            the last month.
            <br />
            For example: If a character has a popularity of 10%, it means that
            10% of the players have used that character.
            <br />
            It adds up to over 100% because players can use multiple characters.
          </Typography>
        </Box>
        <PopularityTable
          data={popularity?.per_player ?? []}
          percentage={(value) =>
            popularity ? (value / popularity.per_player_total) * 100 : 0
          }
          countLabel="Players"
        />
        <Box>
          Total games per player:{" "}
          {popularity && Utils.formatNumber(popularity.per_player_total)}
        </Box>
      </Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: "bold", marginBottom: 1 }}>
          Character Popularity Per Character (Past Month)
        </Typography>
        <Box sx={{ mb: 4 }}>
          <Typography variant="body1">
            This table shows the game count per character in the last month.
            <br />
            For example: If a character has a popularity of 10%, it means that
            10% of the games are with that character.
            <br />
          </Typography>
        </Box>
        <PopularityTable
          data={popularity?.per_character ?? []}
          percentage={(value) =>
            popularity
              ? ((value / popularity.per_character_total) * 100) / 2
              : 0
          }
          countLabel="Games"
        />
        <Box>
          Total games per character:{" "}
          {popularity && Utils.formatNumber(popularity.per_character_total * 2)}
        </Box>
      </Box>
      <Box>
        <Typography>Statistics are updated once a day.</Typography>
        {popularity && (
          <Typography variant="body1">
            Last updated: {Utils.formatUTCToLocal(popularity.last_update)}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

const Popularity = () => {
  const popularityPromise = usePopularityPromise();

  return (
    <>
      <title>Popularity | Puddle Farm</title>
      <Suspense
        fallback={
          <CircularProgress
            size={60}
            variant="indeterminate"
            disableShrink={true}
            sx={{ position: "absolute", top: "-1px", color: "white" }}
          />
        }
      >
        <PopularityContent data={popularityPromise} />
      </Suspense>
    </>
  );
};

export default Popularity;
