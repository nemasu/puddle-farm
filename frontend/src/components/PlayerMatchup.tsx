import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  type SelectChangeEvent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import type { MatchupResponse } from "../interfaces/API";
import type { MatchupProps, Matchups } from "../interfaces/PlayerMatchups";
import { Utils } from "../utils/Utils";

const TIERS = [
  { label: "S", color: "#FFD700", minWR: 65 },
  { label: "A", color: "#4CAF50", minWR: 55 },
  { label: "B", color: "#2196F3", minWR: 45 },
  { label: "C", color: "#FF9800", minWR: 35 },
  { label: "D", color: "#f44336", minWR: 0 },
];

const MIN_GAMES = 5;

const Matchup = ({ API_ENDPOINT, char_short, player_id }: MatchupProps) => {
  const [orderBy, setOrderBy] = useState<string | null>(null);
  const [order, setOrder] = useState<"asc" | "desc" | undefined>(undefined);
  const [duration, setDuration] = useState<string>("12");
  const [matchups, setMatchups] = useState<Matchups | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [globalWRMap, setGlobalWRMap] = useState<
    Map<string, { wins: number; total_games: number }>
  >(new Map());
  const [customWeeks, setCustomWeeks] = useState<string>("");
  const [tempWeeks, setTempWeeks] = useState<string>("");
  const [openDialog, setOpenDialog] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "tierlist">("table");

  const _handleCustomWeeksChange = (event: ChangeEvent<HTMLInputElement>) => {
    setCustomWeeks(event.target.value);
  };

  const handleOpenDialog = () => {
    setTempWeeks(customWeeks);
    setOpenDialog(true);
  };

  const handleTempWeeksChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTempWeeks(event.target.value);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleApplyCustomWeeks = () => {
    const weeks = parseInt(tempWeeks, 10);
    if (!Number.isNaN(weeks) && weeks > 0) {
      setCustomWeeks(tempWeeks);
      setDuration(tempWeeks);
      handleCloseDialog();
    }
  };

  useEffect(() => {
    const fetchMatchups = async () => {
      if (duration === undefined || duration === "") {
        return;
      }

      setLoading(true);
      try {
        const [playerRes, globalRes] = await Promise.all([
          fetch(
            API_ENDPOINT +
              "/matchups/" +
              player_id +
              "/" +
              char_short +
              "/" +
              duration,
          ),
          fetch(`${API_ENDPOINT}/matchups`),
        ]);

        if (playerRes.status === 200) {
          const matchups_result = await playerRes.json();
          if (matchups_result !== null) {
            let total_wins = 0;
            let total_games = 0;
            for (const mkey in matchups_result.matchups) {
              total_wins += matchups_result.matchups[mkey].wins;
              total_games += matchups_result.matchups[mkey].total_games;
            }
            matchups_result.total_wins = total_wins;
            matchups_result.total_games = total_games;
            setMatchups(matchups_result);
          }
        }

        if (globalRes.status === 200) {
          const globalData: MatchupResponse = await globalRes.json();
          const charEntry = globalData.data_all.find(
            (c) => c.char_short === char_short,
          );
          const map = new Map<string, { wins: number; total_games: number }>();
          charEntry?.matchups.forEach((m) => {
            map.set(m.char_short, { wins: m.wins, total_games: m.total_games });
          });
          setGlobalWRMap(map);
        }
      } catch (error) {
        console.error("Error fetching matchups:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatchups();
  }, [duration, char_short, player_id, API_ENDPOINT]);

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleDurationChange = (event: SelectChangeEvent) => {
    setDuration(event.target.value);
  };

  const sortedMatchups = useMemo(() => {
    if (!matchups?.matchups) return [];

    if (order === null || orderBy === null) {
      return [...matchups.matchups];
    }

    return [...matchups.matchups].sort((a, b) => {
      const aValue = (() => {
        switch (orderBy) {
          case "character":
            return a.char_name;
          case "winrate":
            return (a.wins / a.total_games) * 100;
          case "wins":
            return a.wins;
          case "total":
            return a.total_games;
          default:
            return 0;
        }
      })();

      const bValue = (() => {
        switch (orderBy) {
          case "character":
            return b.char_name;
          case "winrate":
            return (b.wins / b.total_games) * 100;
          case "wins":
            return b.wins;
          case "total":
            return b.total_games;
          default:
            return 0;
        }
      })();

      if (order === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return bValue > aValue ? 1 : -1;
      }
    });
  }, [matchups, orderBy, order]);

  const tierListContent = useMemo(() => {
    if (!matchups?.matchups) return null;

    const enoughData = matchups.matchups.filter(
      (m) => m.total_games >= MIN_GAMES,
    );
    const tooFewGames = matchups.matchups.filter(
      (m) => m.total_games < MIN_GAMES,
    );

    return (
      <Box sx={{ mt: 2 }}>
        {TIERS.map((tier, tierIndex) => {
          const upperWR =
            tierIndex === 0 ? Infinity : TIERS[tierIndex - 1].minWR;
          const chars = enoughData.filter((m) => {
            const wr = (m.wins / m.total_games) * 100;
            return wr >= tier.minWR && wr < upperWR;
          });

          return (
            <Box
              key={tier.label}
              sx={{ display: "flex", alignItems: "flex-start", mb: 0.5 }}
            >
              <Box
                sx={{
                  minWidth: 40,
                  height: 40,
                  backgroundColor: tier.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mr: 1,
                  borderRadius: 1,
                  flexShrink: 0,
                }}
              >
                <Typography
                  sx={{ fontWeight: "bold", color: "black", fontSize: 16 }}
                >
                  {tier.label}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 0.5,
                  alignItems: "center",
                  minHeight: 40,
                }}
              >
                {chars.length === 0 ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ alignSelf: "center", fontStyle: "italic" }}
                  >
                    —
                  </Typography>
                ) : (
                  chars.map((m) => {
                    const wr = (m.wins / m.total_games) * 100;
                    return (
                      <Tooltip
                        key={m.char_short}
                        title={`${m.char_name}: ${wr.toFixed(1)}% (${m.wins}/${m.total_games})`}
                        arrow
                      >
                        <Box
                          sx={{
                            px: 1,
                            py: 0.5,
                            border: `1px solid ${tier.color}`,
                            borderRadius: 1,
                            cursor: "default",
                            lineHeight: 1.2,
                          }}
                        >
                          <Typography sx={{ fontSize: 11, fontWeight: "bold" }}>
                            {m.char_short}
                          </Typography>
                          <Typography sx={{ fontSize: 10, color: tier.color }}>
                            {wr.toFixed(0)}%
                          </Typography>
                        </Box>
                      </Tooltip>
                    );
                  })
                )}
              </Box>
            </Box>
          );
        })}
        {tooFewGames.length > 0 && (
          <Box sx={{ display: "flex", alignItems: "flex-start", mt: 1 }}>
            <Box
              sx={{
                minWidth: 40,
                height: 40,
                backgroundColor: "#9E9E9E",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mr: 1,
                borderRadius: 1,
                flexShrink: 0,
              }}
            >
              <Typography
                sx={{ fontWeight: "bold", color: "black", fontSize: 16 }}
              >
                ?
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 0.5,
                alignItems: "center",
                minHeight: 40,
              }}
            >
              {tooFewGames.map((m) => (
                <Tooltip
                  key={m.char_short}
                  title={`${m.char_name}: ${m.total_games} game${m.total_games === 1 ? "" : "s"} (too few)`}
                  arrow
                >
                  <Box
                    sx={{
                      px: 1,
                      py: 0.5,
                      border: "1px solid #9E9E9E",
                      borderRadius: 1,
                      cursor: "default",
                      lineHeight: 1.2,
                    }}
                  >
                    <Typography sx={{ fontSize: 11, fontWeight: "bold" }}>
                      {m.char_short}
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: "#9E9E9E" }}>
                      {m.total_games}g
                    </Typography>
                  </Box>
                </Tooltip>
              ))}
            </Box>
          </Box>
        )}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 1, display: "block" }}
        >
          Tiers based on personal win rate: S≥65%, A≥55%, B≥45%, C≥35%,
          D&lt;35%. ? = fewer than {MIN_GAMES} games.
        </Typography>
      </Box>
    );
  }, [matchups]);

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  if (!matchups) {
    return <Typography>No data available</Typography>;
  }

  return (
    <>
      {matchups ? (
        <>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              marginTop: 10,
              marginBottom: 2,
            }}
          >
            <Typography variant="h6">Matchup Table</Typography>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_e, val) => {
                if (val) setViewMode(val);
              }}
              size="small"
            >
              <ToggleButton value="table">Table</ToggleButton>
              <ToggleButton value="tierlist">Tier List</ToggleButton>
            </ToggleButtonGroup>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Duration</InputLabel>
              <Select
                value={duration}
                label="Duration"
                onChange={handleDurationChange}
              >
                <MenuItem value="4">1 Month</MenuItem>
                <MenuItem value="12">3 Months</MenuItem>
                <MenuItem value="24">6 Months</MenuItem>
                <MenuItem value="520">All Time</MenuItem>
                <MenuItem value={customWeeks} onClick={handleOpenDialog}>
                  Custom...
                </MenuItem>
              </Select>
              <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                disableScrollLock={true}
              >
                <DialogTitle>Custom Duration</DialogTitle>
                <DialogContent>
                  <TextField
                    autoFocus={false}
                    label="Number of Weeks"
                    type="number"
                    value={tempWeeks}
                    onChange={handleTempWeeksChange}
                    slotProps={{ htmlInput: { min: 1 } }}
                  />
                </DialogContent>
                <DialogActions>
                  <Button onClick={handleCloseDialog}>Cancel</Button>
                  <Button onClick={handleApplyCustomWeeks}>Apply</Button>
                </DialogActions>
              </Dialog>
            </FormControl>
          </Box>
          <Typography variant="body1">
            {duration === "520"
              ? "This includes all games played."
              : `This includes all games played in the past ${duration} week${duration === "1" ? "" : "s"}.`}
          </Typography>
          <Typography sx={{ p: 2 }} variant="body1">
            Win Rate
          </Typography>
          <Box component={Paper} sx={{ maxWidth: 350 }}>
            <Typography sx={{ p: 2 }} variant="body1">
              {matchups.total_games === 0 ? (
                "No games played during this period."
              ) : (
                <>
                  {Utils.colorChangeForPercent(
                    (
                      (matchups.total_wins / matchups.total_games) *
                      100
                    ).toFixed(2),
                  )}
                  {` ( ${matchups.total_wins} / ${matchups.total_games} )`}
                </>
              )}
            </Typography>
          </Box>
          {viewMode === "table" ? (
            <TableContainer component={Paper} sx={{ maxWidth: 500 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === "character"}
                        direction={orderBy === "character" ? order : "asc"}
                        onClick={() => handleRequestSort("character")}
                      >
                        Character
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ position: "sticky", top: 0, zIndex: 1 }}>
                      <TableSortLabel
                        active={orderBy === "winrate"}
                        direction={orderBy === "winrate" ? order : "asc"}
                        onClick={() => handleRequestSort("winrate")}
                      >
                        WR
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ position: "sticky", top: 0, zIndex: 1 }}>
                      <TableSortLabel
                        active={orderBy === "wins"}
                        direction={orderBy === "wins" ? order : "asc"}
                        onClick={() => handleRequestSort("wins")}
                      >
                        Wins
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ position: "sticky", top: 0, zIndex: 1 }}>
                      <TableSortLabel
                        active={orderBy === "total"}
                        direction={orderBy === "total" ? order : "asc"}
                        onClick={() => handleRequestSort("total")}
                      >
                        Total
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ position: "sticky", top: 0, zIndex: 1 }}>
                      Global WR
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedMatchups.map((matchup) => {
                    const globalEntry = globalWRMap.get(matchup.char_short);
                    const globalWRStr =
                      globalEntry && globalEntry.total_games > 0
                        ? (
                            (globalEntry.wins / globalEntry.total_games) *
                            100
                          ).toFixed(2)
                        : null;
                    return (
                      <TableRow key={matchup.char_short}>
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
                          {matchup.char_name} ({matchup.char_short})
                        </TableCell>
                        <TableCell>
                          {Utils.colorChangeForPercent(
                            (
                              (matchup.wins / matchup.total_games) *
                              100
                            ).toFixed(2),
                          )}
                        </TableCell>
                        <TableCell>{matchup.wins}</TableCell>
                        <TableCell>{matchup.total_games}</TableCell>
                        <TableCell>
                          {globalWRStr !== null
                            ? Utils.colorChangeForPercent(globalWRStr)
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            tierListContent
          )}
        </>
      ) : null}
    </>
  );
};

export default Matchup;
