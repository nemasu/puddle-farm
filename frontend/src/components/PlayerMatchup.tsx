"use client";

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
import type { MatchupEntry, MatchupResponse } from "../interfaces/API";
import type { MatchupProps, Matchups } from "../interfaces/PlayerMatchups";
import { getMessages } from "../lib/i18n";
import { characterLabel } from "../lib/ladder-characters";
import { PercentChangeLabel } from "./PercentChangeLabel";

const TIERS = [
  { label: "S", color: "#FFD700", minWR: 65 },
  { label: "A", color: "#4CAF50", minWR: 55 },
  { label: "B", color: "#2196F3", minWR: 45 },
  { label: "C", color: "#FF9800", minWR: 35 },
  { label: "D", color: "#f44336", minWR: 0 },
];

const MIN_GAMES = 5;

function withTotals(data: Matchups | null): Matchups | null {
  if (!data) return null;
  return {
    ...data,
    total_wins: data.matchups.reduce((sum, item) => sum + item.wins, 0),
    total_games: data.matchups.reduce((sum, item) => sum + item.total_games, 0),
  };
}
function globalMap(entries: MatchupEntry[] | null | undefined) {
  return new Map(
    (entries ?? []).map((entry) => [
      entry.char_short,
      { wins: entry.wins, total_games: entry.total_games },
    ]),
  );
}
const Matchup = ({
  API_ENDPOINT,
  char_short,
  player_id,
  initialData,
  initialGlobal,
  language = "en",
}: MatchupProps) => {
  const messages = getMessages(language).player;
  const [orderBy, setOrderBy] = useState<string | null>(null);
  const [order, setOrder] = useState<"asc" | "desc" | undefined>(undefined);
  const [duration, setDuration] = useState<string>("12");
  const [matchups, setMatchups] = useState<Matchups | null>(() =>
    withTotals(initialData ?? null),
  );
  const [loading, setLoading] = useState<boolean>(initialData === undefined);
  const [globalWRMap, setGlobalWRMap] = useState<
    Map<string, { wins: number; total_games: number }>
  >(() => globalMap(initialGlobal));
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
    if (initialData !== undefined && duration === "12") {
      setMatchups(withTotals(initialData));
      setGlobalWRMap(globalMap(initialGlobal));
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    let active = true;
    const fetchMatchups = async () => {
      if (!duration) return;
      setLoading(true);
      try {
        const personal = fetch(
          `${API_ENDPOINT}/matchups/${player_id}/${char_short}/${duration}`,
          { signal: controller.signal },
        ).then(async (response) => {
          if (!response.ok)
            throw new Error(`Matchups returned HTTP ${response.status}`);
          return response.json() as Promise<Matchups>;
        });
        const globals =
          initialGlobal !== undefined
            ? Promise.resolve(initialGlobal)
            : fetch(`${API_ENDPOINT}/matchups`, {
                signal: controller.signal,
              }).then(async (response) => {
                if (!response.ok) return null;
                const data: MatchupResponse = await response.json();
                return (
                  data.data_all.find((entry) => entry.char_short === char_short)
                    ?.matchups ?? null
                );
              });
        const [data, entries] = await Promise.all([personal, globals]);
        if (active) {
          setMatchups(withTotals(data));
          setGlobalWRMap(globalMap(entries));
        }
      } catch (error) {
        if (active) {
          console.error("Error fetching matchups:", error);
          setMatchups(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchMatchups();
    return () => {
      active = false;
      controller.abort();
    };
  }, [
    duration,
    char_short,
    player_id,
    API_ENDPOINT,
    initialData,
    initialGlobal,
  ]);

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
          case "losses":
            return a.total_games - a.wins;
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
          case "losses":
            return b.total_games - b.wins;
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
                        title={`${characterLabel(m.char_short, m.char_name, language)}: ${wr.toFixed(1)}% (${m.wins}/${m.total_games})`}
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
                  title={`${characterLabel(m.char_short, m.char_name, language)}: ${m.total_games} game${m.total_games === 1 ? "" : "s"} (${messages.fewGames})`}
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
          {messages.tierNote}
        </Typography>
      </Box>
    );
  }, [matchups, language, messages]);

  if (loading) {
    return <Typography>{messages.loading}</Typography>;
  }

  if (!matchups) {
    return <Typography>{messages.noData}</Typography>;
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
              flexWrap: "wrap",
              marginTop: 10,
              marginBottom: 2,
            }}
          >
            <Typography variant="h6">{messages.matchups}</Typography>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_e, val) => {
                if (val) setViewMode(val);
              }}
              size="small"
            >
              <ToggleButton value="table">{messages.table}</ToggleButton>
              <ToggleButton value="tierlist">{messages.tierList}</ToggleButton>
            </ToggleButtonGroup>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>{messages.duration}</InputLabel>
              <Select
                value={duration}
                label={messages.duration}
                onChange={handleDurationChange}
              >
                <MenuItem value="4">{messages.month}</MenuItem>
                <MenuItem value="12">{messages.threeMonths}</MenuItem>
                <MenuItem value="24">{messages.sixMonths}</MenuItem>
                <MenuItem value="520">{messages.allTime}</MenuItem>
                <MenuItem value={customWeeks} onClick={handleOpenDialog}>
                  {messages.custom}
                </MenuItem>
              </Select>
              <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                disableScrollLock={true}
              >
                <DialogTitle>{messages.customDuration}</DialogTitle>
                <DialogContent>
                  <TextField
                    sx={{ mt: 1 }}
                    autoFocus={false}
                    label={messages.numberWeeks}
                    type="number"
                    value={tempWeeks}
                    onChange={handleTempWeeksChange}
                    slotProps={{ htmlInput: { min: 1 } }}
                  />
                </DialogContent>
                <DialogActions>
                  <Button onClick={handleCloseDialog}>{messages.cancel}</Button>
                  <Button onClick={handleApplyCustomWeeks}>
                    {messages.apply}
                  </Button>
                </DialogActions>
              </Dialog>
            </FormControl>
          </Box>
          <Typography variant="body1">
            {duration === "520"
              ? messages.allGames
              : language === "en"
                ? `This includes all games played in the past ${duration} week${duration === "1" ? "" : "s"}.`
                : `${messages.pastWeeks} ${duration}`}
          </Typography>
          <Typography sx={{ p: 2 }} variant="body1">
            {messages.winRate}
          </Typography>
          <Box component={Paper} sx={{ maxWidth: 350 }}>
            <Typography sx={{ p: 2 }} variant="body1">
              {matchups.total_games === 0 ? (
                messages.noGames
              ) : (
                <>
                  <PercentChangeLabel
                    percent={(matchups.total_wins / matchups.total_games) * 100}
                  />
                  {` ( ${matchups.total_wins} / ${matchups.total_games} )`}
                </>
              )}
            </Typography>
          </Box>
          {viewMode === "table" ? (
            <TableContainer component={Paper} sx={{ maxWidth: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === "character"}
                        direction={orderBy === "character" ? order : "asc"}
                        onClick={() => handleRequestSort("character")}
                      >
                        {messages.character}
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ position: "sticky", top: 0, zIndex: 1 }}>
                      <TableSortLabel
                        active={orderBy === "winrate"}
                        direction={orderBy === "winrate" ? order : "asc"}
                        onClick={() => handleRequestSort("winrate")}
                      >
                        {messages.shortWR}
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ position: "sticky", top: 0, zIndex: 1 }}>
                      <TableSortLabel
                        active={orderBy === "wins"}
                        direction={orderBy === "wins" ? order : "asc"}
                        onClick={() => handleRequestSort("wins")}
                      >
                        {messages.wins}
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ position: "sticky", top: 0, zIndex: 1 }}>
                      <TableSortLabel
                        active={orderBy === "losses"}
                        direction={orderBy === "losses" ? order : "asc"}
                        onClick={() => handleRequestSort("losses")}
                      >
                        {messages.losses}
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ position: "sticky", top: 0, zIndex: 1 }}>
                      <TableSortLabel
                        active={orderBy === "total"}
                        direction={orderBy === "total" ? order : "asc"}
                        onClick={() => handleRequestSort("total")}
                      >
                        {messages.total}
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ position: "sticky", top: 0, zIndex: 1 }}>
                      {messages.globalWR}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedMatchups.map((matchup) => {
                    const globalEntry = globalWRMap.get(matchup.char_short);
                    const globalWR =
                      globalEntry && globalEntry.total_games > 0
                        ? (globalEntry.wins / globalEntry.total_games) * 100
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
                          {characterLabel(
                            matchup.char_short,
                            matchup.char_name,
                            language,
                          )}{" "}
                          ({matchup.char_short})
                        </TableCell>
                        <TableCell>
                          <PercentChangeLabel
                            percent={(matchup.wins / matchup.total_games) * 100}
                          />
                        </TableCell>
                        <TableCell>{matchup.wins}</TableCell>
                        <TableCell>
                          {matchup.total_games - matchup.wins}
                        </TableCell>
                        <TableCell>{matchup.total_games}</TableCell>
                        <TableCell>
                          {globalWR !== null ? (
                            <PercentChangeLabel percent={globalWR} />
                          ) : (
                            "—"
                          )}
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
