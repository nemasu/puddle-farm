"use client";

import { Alert, alpha, Box, Button, Paper, Typography } from "@mui/material";
import { hourlyTimeAxis, SvgLineChart } from "@puddle-farm/svg-chart";
import { useEffect, useState } from "react";
import type {
  HourlyPlayerPoint,
  HourlyPlayersResponse,
} from "../interfaces/API";
import { API_ENDPOINT } from "../lib/api-endpoint";
import { getMessages } from "../lib/i18n";
import type { Design, Language } from "../lib/site-preferences";
import { useDisplayPreferences } from "./DisplayPreferences";
import { useDarkLadderTheme } from "./ladder/LadderThemeProvider";

const RANGES = [
  ["24h", "24h"],
  ["7d", "7d"],
  ["30d", "30d"],
  ["1y", "1y"],
  ["all", "All"],
] as const;

type Range = (typeof RANGES)[number][0];
type LoadState =
  | { status: "loading" }
  | { status: "loaded"; points: HourlyPlayerPoint[] }
  | { status: "failed" };

export default function HourlyPlayersChart({
  initialPoints,
  language = "en",
  design = "classic",
}: {
  initialPoints?: HourlyPlayerPoint[] | null;
  language?: Language;
  design?: Design;
}) {
  const messages = getMessages(language).stats;
  const preferences = useDisplayPreferences();
  const dark = useDarkLadderTheme();
  const [range, setRange] = useState<Range>("30d");
  const [state, setState] = useState<LoadState>(
    initialPoints === undefined
      ? { status: "loading" }
      : initialPoints === null
        ? { status: "failed" }
        : { status: "loaded", points: initialPoints },
  );

  useEffect(() => {
    if (initialPoints !== undefined && range === "30d") {
      setState(
        initialPoints === null
          ? { status: "failed" }
          : { status: "loaded", points: initialPoints },
      );
      return;
    }
    const controller = new AbortController();
    setState({ status: "loading" });
    fetch(`${API_ENDPOINT}/stats/hourly-players?range=${range}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as HourlyPlayersResponse;
      })
      .then(({ points }) => setState({ status: "loaded", points }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setState({ status: "failed" });
      });
    return () => controller.abort();
  }, [range, initialPoints]);

  const points = state.status === "loaded" ? state.points : [];
  const timeZone = preferences.useLocalTime ? preferences.timeZone : "UTC";
  const number = new Intl.NumberFormat(language);
  const date = new Intl.DateTimeFormat(language, {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <Box sx={{ m: design === "ladder" ? 0 : 4, maxWidth: "1000px" }}>
      <Paper sx={{ p: design === "ladder" ? 0 : { xs: 2, sm: 3 } }}>
        <Box
          sx={{
            alignItems: { xs: "flex-start", sm: "center" },
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <Typography variant="h5">{messages.hourly}</Typography>
          <Box
            sx={{
              display: "flex",
              gap: 0.5,
              flexWrap: "wrap",
            }}
          >
            {RANGES.map(([value, label]) => (
              <Button
                key={value}
                aria-pressed={range === value}
                variant="outlined"
                sx={(theme) => ({
                  "&:hover, &[aria-pressed='true']": {
                    backgroundColor: alpha(
                      theme.palette.primary.main,
                      theme.palette.action.hoverOpacity,
                    ),
                    borderColor: "var(--variant-outlinedColor, currentColor)",
                  },
                })}
                onClick={() => setRange(value)}
              >
                {language === "en"
                  ? label
                  : {
                      "24h": messages.range24h,
                      "7d": messages.range7d,
                      "30d": messages.range30d,
                      "1y": messages.range1y,
                      all: messages.all,
                    }[value]}
              </Button>
            ))}
          </Box>
        </Box>
        <Box sx={{ minHeight: { xs: 260, sm: 360 } }} aria-live="polite">
          {state.status === "loading" ? (
            <Typography color="text.secondary">{messages.loading}</Typography>
          ) : state.status === "failed" ? (
            <Alert severity="error">{messages.hourlyError}</Alert>
          ) : points.length === 0 ? (
            <Typography color="text.secondary">{messages.empty}</Typography>
          ) : (
            <Box
              sx={(theme) => ({
                "--svg-chart-height": "360px",
                "--svg-chart-mobile-height": "260px",
                "--svg-chart-axis-text": dark
                  ? "#b9b4c1"
                  : theme.palette.text.secondary,
                "--svg-chart-grid": dark ? "#ffffff26" : theme.palette.divider,
                "--svg-chart-area": "rgba(239, 83, 80, 0.22)",
                "--svg-chart-tooltip-bg": theme.palette.background.paper,
                "--svg-chart-tooltip-text": theme.palette.text.primary,
              })}
            >
              <SvgLineChart
                key={range}
                className="hourly-players-plot"
                points={points.map(({ timestamp, players }) => ({
                  x: timestamp,
                  y: players,
                }))}
                label={messages.hourly}
                xAxis={hourlyTimeAxis(language, timeZone)}
                formatY={number.format}
                tooltip={({ x, y }) => (
                  <>
                    <div>
                      {date.format(x * 1000)}
                      {preferences.useLocalTime ? "" : " UTC"}
                    </div>
                    <div>
                      {number.format(y)}{" "}
                      {language === "en" ? "players" : messages.chartPlayers}
                    </div>
                  </>
                )}
                stepped
              />
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
