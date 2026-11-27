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
  Select,
  type SelectChangeEvent,
  TextField,
  Typography,
} from "@mui/material";
import { SvgLineChart } from "@puddle-farm/svg-chart";
import { type ChangeEvent, useEffect, useState } from "react";
import type { RatingsResponse } from "../interfaces/API";
import type { RatingChartProps } from "../interfaces/Player";
import { formatDisplayTime } from "../lib/display-preferences";
import { getMessages } from "../lib/i18n";
import { Utils } from "../utils/Utils";
import { usePreferencesContext } from "./DisplayPreferences";
import { useDarkLadderTheme } from "./ladder/LadderThemeProvider";

type RatingHistory = {
  points: { x: number; y: number; timestamp: string }[];
  thresholds: { label: string; value: number; color: string }[];
};

const RATING_COLOR = "#ef5350";

const DARK_THRESHOLD_COLORS: Readonly<Record<string, string>> = {
  "#6820a0": "#9a61cf",
  "#9050d8": "#b078e5",
  "#3080c0": "#559acb",
  "#158060": "#47a88a",
  "#804018": "#be8052",
  "#404858": "#74839f",
  "rgba(54, 162, 235, 0.6)": "#64c0ee",
};

const RatingChart = ({
  player_id,
  char_short,
  API_ENDPOINT,
  latest_rating,
  total_games,
  initialHistory,
  language = "en",
}: RatingChartProps) => {
  const messages = getMessages(language).player;
  const preferences = usePreferencesContext()?.preferences;
  const dark = useDarkLadderTheme();
  const [history, setHistory] = useState<RatingHistory | null>(null);
  const initialDuration = String(
    initialHistory === undefined ? 100 : Math.min(100, total_games),
  );
  const [duration, setDuration] = useState<string>(initialDuration);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [customGames, setCustomGames] = useState<string>("");
  const [tempGames, setTempGames] = useState<string>("");
  const [openDialog, setOpenDialog] = useState(false);
  const [showPreVanquisher, setShowPreVanquisher] = useState(false);
  const [noPreVanquisherData, setNoPreVanquisherData] = useState(false);

  const isVanquisherPlayer = latest_rating > 10000000;

  const handleDurationChange = (event: SelectChangeEvent) => {
    setDuration(event.target.value);
  };

  const handleOpenDialog = () => {
    setTempGames(customGames);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleTempGamesChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTempGames(event.target.value);
  };

  const handleApplyCustomGames = () => {
    const games = parseInt(tempGames, 10);
    if (!Number.isNaN(games) && games > 0) {
      setCustomGames(tempGames);
      setDuration(tempGames);
      handleCloseDialog();
    }
  };

  useEffect(() => {
    setShowPreVanquisher(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const fetchChartData = async () => {
      if (duration === undefined || duration === "") {
        return;
      }

      if (showPreVanquisher && total_games <= 0) {
        return;
      }

      setNoPreVanquisherData(false);
      setLoadError(null);

      const apiDuration = showPreVanquisher ? total_games : duration;
      const query = showPreVanquisher ? "?pre_vanquisher=true" : "";
      let rating_history_result: RatingsResponse[] | null;
      if (
        initialHistory !== undefined &&
        duration === initialDuration &&
        !showPreVanquisher
      ) {
        rating_history_result =
          initialHistory === null ? null : [...initialHistory];
      } else {
        const response = await fetch(
          `${API_ENDPOINT}/ratings/${player_id}/${char_short}/${apiDuration}${query}`,
          { signal: controller.signal },
        );
        if (!response.ok)
          throw new Error(`Rating history returned HTTP ${response.status}`);
        rating_history_result = await response.json();
      }
      if (!active) return;
      if (rating_history_result === null) {
        setLoadError(messages.chartError);
        return;
      }
      if (char_short != null) {
        rating_history_result.reverse();

        if (!showPreVanquisher) {
          //Add current rating to the end
          rating_history_result.push({
            timestamp: "Now",
            rating: latest_rating,
          });
        }

        const durationLimit = parseInt(duration, 10);
        const displayData: RatingsResponse[] = showPreVanquisher
          ? rating_history_result
              .filter((item: RatingsResponse) => item.rating <= 10000000)
              .slice(-durationLimit)
          : rating_history_result;

        if (showPreVanquisher && displayData.length === 0) {
          setNoPreVanquisherData(true);
          setHistory(null);
          return;
        }
        setNoPreVanquisherData(false);

        const hasVanquisher = displayData.some(
          (item: RatingsResponse) => item.rating > 10000000,
        );
        const hasNormal = displayData.some(
          (item: RatingsResponse) => item.rating <= 10000000,
        );

        let minRating = Infinity;
        let maxRating = -Infinity;
        let maxRawRating = -Infinity;
        const points = displayData.map(({ timestamp, rating }, index) => {
          const converted = Utils.convertRating(rating);
          minRating = Math.min(minRating, converted);
          maxRating = Math.max(maxRating, converted);
          maxRawRating = Math.max(maxRawRating, rating);
          return { x: index, y: converted, timestamp };
        });

        const allThresholds = Utils.getRankThresholds();
        const currentRankIndex = allThresholds.findIndex(
          (t) => maxRawRating >= t.rating,
        );
        const rawNextRank =
          currentRankIndex > 0 ? allThresholds[currentRankIndex - 1] : null;

        // Diamond 3 promotes to Vanquisher at 45,000 RP, not at the 10,000,000 magic number.
        const VANQUISHER_PROMOTION_RP = 45000;
        const nextRankLine =
          rawNextRank === null
            ? null
            : rawNextRank.rating >= 10000000 && !hasVanquisher
              ? {
                  name: rawNextRank.name,
                  color: rawNextRank.color,
                  convertedRating: VANQUISHER_PROMOTION_RP,
                }
              : {
                  name: rawNextRank.name,
                  color: rawNextRank.color,
                  convertedRating: Utils.convertRating(rawNextRank.rating),
                };

        if (!showPreVanquisher) {
          // if the user has less than 100 games, select his total game number
          if (total_games < 100) {
            setDuration(total_games.toString());
          }

          // Clamp duration to total_games if not in available options (on character change for example)
          const items =
            total_games < 100
              ? [total_games]
              : [...Array(Math.floor(total_games / 100)).keys()]
                  .map((i) => (i + 1) * 100)
                  .concat(total_games % 100 === 0 ? [] : [total_games]);
          const currentDuration = parseInt(duration, 10);
          if (
            !items.includes(currentDuration) &&
            currentDuration !== parseInt(tempGames, 10)
          ) {
            // second check keep custom game count working
            setDuration(total_games.toString());
          }
        }

        const thresholds = allThresholds
          .filter((rank) => {
            if (rawNextRank && rank.rating === rawNextRank.rating) return false;
            const rankIsVanquisher = rank.rating > 10000000;
            if (rankIsVanquisher ? !hasVanquisher : !hasNormal) return false;
            const value = Utils.convertRating(rank.rating);
            return value >= minRating && value <= maxRating;
          })
          .map((rank) => ({
            label: rank.name,
            value: Utils.convertRating(rank.rating),
            color: rank.color,
          }));
        if (nextRankLine) {
          thresholds.push({
            label: nextRankLine.name,
            value: nextRankLine.convertedRating,
            color: nextRankLine.color,
          });
        }
        setHistory({ points, thresholds });
      }
    };
    void fetchChartData().catch((error) => {
      if (active) {
        console.error("Could not load rating history:", error);
        setLoadError(messages.chartError);
      }
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [
    player_id,
    char_short,
    API_ENDPOINT,
    latest_rating,
    duration,
    showPreVanquisher,
    total_games,
    tempGames,
    initialHistory,
    initialDuration,
    messages,
  ]);

  const chartTitle = showPreVanquisher
    ? messages.preHistory
    : `${messages.chart} (${duration} ${messages.games})`;
  const thresholds = history?.thresholds.map((threshold) => ({
    ...threshold,
    color: dark
      ? (DARK_THRESHOLD_COLORS[threshold.color] ?? threshold.color)
      : threshold.color,
  }));
  const number = new Intl.NumberFormat(language);

  function formatTimestamp(timestamp: string) {
    if (timestamp === "Now") return messages.now;
    return preferences
      ? formatDisplayTime(timestamp, preferences)
      : Utils.formatUTCToLocal(timestamp);
  }

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          mt: 5,
          flexWrap: "wrap",
        }}
      >
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>{messages.gameCount}</InputLabel>
          <Select
            value={duration}
            label={messages.gameCount}
            onChange={handleDurationChange}
          >
            {(total_games < 100
              ? [total_games]
              : [...Array(Math.floor(total_games / 100)).keys()]
                  .map((i) => (i + 1) * 100)
                  .concat(total_games % 100 === 0 ? [] : [total_games])
            ).map((nbGame) => (
              <MenuItem key={nbGame} value={nbGame}>
                {nbGame}
              </MenuItem>
            ))}
            <MenuItem value={customGames} onClick={handleOpenDialog}>
              {messages.custom}
            </MenuItem>
          </Select>
        </FormControl>

        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          disableScrollLock={true}
        >
          <DialogTitle>{messages.customGames}</DialogTitle>
          <DialogContent>
            <TextField
              sx={{ mt: 1 }}
              autoFocus={false}
              label={messages.numberGames}
              type="number"
              value={tempGames}
              onChange={handleTempGamesChange}
              slotProps={{ htmlInput: { min: 1 } }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>{messages.cancel}</Button>
            <Button onClick={handleApplyCustomGames}>{messages.apply}</Button>
          </DialogActions>
        </Dialog>

        {isVanquisherPlayer && (
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setHistory(null);
              setNoPreVanquisherData(false);
              setShowPreVanquisher((v) => !v);
            }}
          >
            {showPreVanquisher ? messages.showHistory : messages.showPreHistory}
          </Button>
        )}
      </Box>

      {loadError ? (
        <Typography role="alert" color="error">
          {loadError}
        </Typography>
      ) : showPreVanquisher && noPreVanquisherData ? (
        <Typography>{messages.noPreHistory}</Typography>
      ) : history ? (
        <Box
          sx={(theme) => ({
            "--svg-chart-height": "min(45vw, 440px)",
            "--svg-chart-mobile-height": "220px",
            "--svg-chart-line": RATING_COLOR,
            "--svg-chart-axis-text": dark
              ? "#f5f2f5"
              : theme.palette.text.secondary,
            "--svg-chart-grid": dark ? "#ffffff26" : theme.palette.divider,
            "--svg-chart-tooltip-bg": theme.palette.background.paper,
            "--svg-chart-tooltip-text": theme.palette.text.primary,
          })}
        >
          <Typography variant="body2" align="center" sx={{ mt: 2 }}>
            {chartTitle}
          </Typography>
          <Box
            data-rating-legend=""
            sx={{
              display: "flex",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: 1.5,
              mt: 1,
            }}
          >
            {[
              { label: messages.rating, color: RATING_COLOR },
              ...(thresholds ?? []),
            ].map(({ label, color }) => (
              <Box
                key={label}
                sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}
              >
                <Box
                  component="span"
                  sx={{ width: 16, height: 2, backgroundColor: color }}
                />
                <Typography variant="caption">{label}</Typography>
              </Box>
            ))}
          </Box>
          <SvgLineChart
            className="player-rating-plot"
            points={history.points}
            referenceLines={thresholds}
            label={chartTitle}
            formatY={number.format}
            tooltip={({ x, y }) => (
              <>
                <div>{formatTimestamp(history.points[x].timestamp)}</div>
                <div>
                  {messages.rating} {number.format(y)}
                </div>
              </>
            )}
            showPoints
          />
        </Box>
      ) : (
        <Typography>{messages.loading}</Typography>
      )}
    </>
  );
};

export default RatingChart;
