"use client";

import { Box, Button } from "@mui/material";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from "chart.js";
import { useState } from "react";
import { Bar } from "react-chartjs-2";
import type { DistributionResult } from "../../interfaces/API";
import { combineRankData } from "../../lib/distribution";
import { getMessages } from "../../lib/i18n";
import type { Design, Language } from "../../lib/site-preferences";
import { Utils } from "../../utils/Utils";

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
);

export function DistributionChart({
  entries,
  language = "en",
  design = "classic",
}: {
  entries: DistributionResult[];
  language?: Language;
  design?: Design;
}) {
  const messages = getMessages(language).distribution;
  const ink = design === "ladder" ? "#111" : "#fff";
  const [combined, setCombined] = useState(false);
  const groups = Object.entries(combineRankData(entries)).sort(
    ([, a], [, b]) => a.lower_bound - b.lower_bound,
  );
  const labels = combined
    ? groups.map(([name]) => name)
    : entries.map((row) => Utils.getRankDisplayName(row.lower_bound));
  const values = combined
    ? groups.map(([, row]) => row.count)
    : entries.map((row) => row.count);
  const colors = labels.map((name) =>
    Utils.getRankColor(
      combined
        ? name === "Vanquisher"
          ? "Vanquisher III Vindex"
          : `${name} 3`
        : name,
    ),
  );
  return (
    <>
      <Button
        variant="outlined"
        aria-pressed={combined}
        onClick={() => setCombined(!combined)}
        sx={{ mb: 4 }}
      >
        {combined ? messages.subdivisions : messages.combine}
      </Button>
      <Box sx={{ mb: 4, height: 350, minWidth: 0, width: "100%" }}>
        <Bar
          data={{
            labels,
            datasets: [
              {
                label: messages.players,
                data: values,
                backgroundColor: colors,
                borderColor: colors,
                borderWidth: 1,
              },
            ],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              title: {
                display: true,
                text: messages.title,
                color: ink,
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                title: { display: true, text: messages.numberPlayers },
                ticks: { color: ink, font: { size: 12 } },
              },
              x: {
                title: { display: true, text: messages.rank },
                ticks: {
                  color: ink,
                  font: { size: 12 },
                  maxRotation: 45,
                  minRotation: 45,
                },
              },
            },
          }}
        />
      </Box>
    </>
  );
}
