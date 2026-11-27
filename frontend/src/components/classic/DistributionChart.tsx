"use client";

import { Box, Button } from "@mui/material";
import { linearAxis } from "@puddle-farm/svg-chart";
import { useEffect, useRef, useState } from "react";
import type { DistributionResult } from "../../interfaces/API";
import { combineRankData } from "../../lib/distribution";
import { getMessages } from "../../lib/i18n";
import type { Design, Language } from "../../lib/site-preferences";
import { Utils } from "../../utils/Utils";
import { useDarkLadderTheme } from "../ladder/LadderThemeProvider";

const LEFT = 70;
const RIGHT = 18;
const TOP = 36;
const BASELINE = 232;
const HEIGHT = 350;

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
  const dark = useDarkLadderTheme();
  const ink = design === "ladder" && !dark ? "#111" : "#fff";
  const grid = design === "ladder" && !dark ? "#1113" : "#ffffff26";
  const svg = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(900);
  useEffect(() => {
    const element = svg.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const [combined, setCombined] = useState(false);
  const bars = combined
    ? Object.entries(combineRankData(entries))
        .sort(([, a], [, b]) => a.lower_bound - b.lower_bound)
        .map(([label, { lower_bound, count }]) => ({
          key: lower_bound,
          label,
          count,
          color: Utils.getRankColor(
            label === "Vanquisher" ? "Vanquisher III Vindex" : `${label} 3`,
          ),
        }))
    : entries.map(({ lower_bound, count }) => {
        const label = Utils.getRankDisplayName(lower_bound);
        return {
          key: lower_bound,
          label,
          count,
          color: Utils.getRankColor(label),
        };
      });
  const { maximum, ticks } = linearAxis(
    0,
    Math.max(0, ...bars.map(({ count }) => count)),
  );
  const slot = (width - LEFT - RIGHT) / Math.max(1, bars.length);
  const number = new Intl.NumberFormat(language);
  const y = (value: number) => BASELINE - (value / maximum) * (BASELINE - TOP);

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
      <Box sx={{ mb: 4, minWidth: 0, overflowX: "auto" }}>
        <Box
          component="svg"
          className="rank-distribution-plot"
          ref={svg}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label={messages.title}
          sx={{
            display: "block",
            width: "100%",
            minWidth: Math.max(320, LEFT + RIGHT + bars.length * 26),
            height: HEIGHT,
            fill: ink,
            fontSize: 12,
          }}
        >
          <text x={width / 2} y={20} textAnchor="middle">
            {messages.title}
          </text>
          <text
            transform={`translate(14 ${(TOP + BASELINE) / 2}) rotate(-90)`}
            textAnchor="middle"
          >
            {messages.numberPlayers}
          </text>
          <text
            x={LEFT + (width - LEFT - RIGHT) / 2}
            y={HEIGHT - 7}
            textAnchor="middle"
          >
            {messages.rank}
          </text>
          {ticks.map((value) => (
            <g key={value}>
              <line
                x1={LEFT}
                x2={width - RIGHT}
                y1={y(value)}
                y2={y(value)}
                stroke={grid}
              />
              <text x={LEFT - 8} y={y(value) + 4} textAnchor="end">
                {number.format(value)}
              </text>
            </g>
          ))}
          {bars.map(({ key, label, count, color }, index) => {
            const x = LEFT + index * slot;
            const barTop = y(count);
            const center = x + slot / 2;
            return (
              <g key={key}>
                <rect
                  data-rank-bar=""
                  x={x + slot * 0.12}
                  y={barTop}
                  width={slot * 0.76}
                  height={BASELINE - barTop}
                  fill={color}
                />
                <text
                  transform={`translate(${center} ${BASELINE + 13}) rotate(-45)`}
                  textAnchor="end"
                >
                  {label}
                </text>
                <rect
                  x={x}
                  y={TOP}
                  width={slot}
                  height={BASELINE - TOP}
                  fill="transparent"
                >
                  <title>{`${label} · ${number.format(count)} ${messages.players}`}</title>
                </rect>
              </g>
            );
          })}
        </Box>
      </Box>
    </>
  );
}
