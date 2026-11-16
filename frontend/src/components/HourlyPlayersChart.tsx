"use client";

import { Alert, alpha, Box, Button, Paper, Typography } from "@mui/material";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type TooltipItem,
} from "chart.js";
import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import type {
  HourlyPlayerPoint,
  HourlyPlayersResponse,
} from "../interfaces/API";
import { API_ENDPOINT } from "../lib/api-endpoint";
import { getMessages } from "../lib/i18n";
import type { Design, Language } from "../lib/site-preferences";
import { usePreferencesContext } from "./DisplayPreferences";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
);

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
  const preferences = usePreferencesContext()?.preferences;
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
  const timeZone = preferences
    ? preferences.useLocalTime
      ? preferences.timeZone
      : "UTC"
    : undefined;
  const tickFormatter = new Intl.DateTimeFormat(
    language,
    range === "24h"
      ? { hour: "numeric", minute: "2-digit", timeZone }
      : range === "7d" || range === "30d"
        ? { month: "short", day: "numeric", timeZone }
        : { month: "short", year: "numeric", timeZone },
  );
  const labels = points.map(({ timestamp }) =>
    tickFormatter.format(new Date(timestamp * 1000)),
  );

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
            <Box sx={{ height: { xs: 260, sm: 360 }, position: "relative" }}>
              <Line
                data={{
                  labels,
                  datasets: [
                    {
                      label: messages.chartPlayers,
                      data: points.map(({ players }) => players),
                      borderColor: "#ef5350",
                      backgroundColor: "rgba(239, 83, 80, 0.22)",
                      borderWidth: 2,
                      fill: true,
                      pointRadius: 0,
                      pointHoverRadius: 4,
                      stepped: "before",
                      tension: 0,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: { intersect: false, mode: "index" },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        title: (items) => {
                          const point = points[items[0]?.dataIndex];
                          return point
                            ? new Date(point.timestamp * 1000).toLocaleString(
                                language,
                                { timeZone },
                              )
                            : "";
                        },
                        label: (item: TooltipItem<"line">) =>
                          `${Number(item.raw).toLocaleString(language)} ${language === "en" ? "players" : messages.chartPlayers}`,
                      },
                    },
                  },
                  scales: {
                    x: {
                      grid: { display: false },
                      ticks: { maxTicksLimit: 8, maxRotation: 0 },
                    },
                    y: { beginAtZero: true, ticks: { precision: 0 } },
                  },
                }}
              />
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
