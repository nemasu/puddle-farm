import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  Paper,
  Typography,
} from "@mui/material";
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
);

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT;

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

export default function HourlyPlayersChart() {
  const [range, setRange] = useState<Range>("30d");
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
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
  }, [range]);

  const points = state.status === "loaded" ? state.points : [];
  const labels = points.map(({ timestamp }) =>
    new Date(timestamp * 1000).toLocaleString(),
  );

  return (
    <Box sx={{ m: 4, maxWidth: "1000px" }}>
      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
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
          <Typography variant="h5">
            Hourly distinct players seen in ranked
          </Typography>
          <ButtonGroup size="small" aria-label="Player history range">
            {RANGES.map(([value, label]) => (
              <Button
                key={value}
                aria-pressed={range === value}
                variant={range === value ? "contained" : "outlined"}
                onClick={() => setRange(value)}
              >
                {label}
              </Button>
            ))}
          </ButtonGroup>
        </Box>
        {state.status === "loading" ? (
          <Typography color="text.secondary">
            Loading player history…
          </Typography>
        ) : state.status === "failed" ? (
          <Alert severity="error">Could not load hourly player history.</Alert>
        ) : points.length === 0 ? (
          <Typography color="text.secondary">
            No hourly player history is available for this range.
          </Typography>
        ) : (
          <Box sx={{ height: { xs: 260, sm: 360 }, position: "relative" }}>
            <Line
              data={{
                labels,
                datasets: [
                  {
                    label: "Players",
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
                      label: (item: TooltipItem<"line">) =>
                        `${Number(item.raw).toLocaleString()} players`,
                    },
                  },
                },
                scales: {
                  x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } },
                  y: { beginAtZero: true, ticks: { precision: 0 } },
                },
              }}
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
}
