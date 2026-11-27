"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import styles from "./chart.module.css";

type Point = { x: number; y: number };
type AxisTick = { value: number; label: string };
type XAxis = (start: number, end: number, tickLimit: number) => AxisTick[];
type ReferenceLine = { value: number; label: string; color: string };

const LEFT = 54;
const RIGHT = 18;
const TOP = 16;
const BOTTOM = 28;
const HOUR = 3600;
const DAY = 24 * HOUR;
const NO_REFERENCE_LINES: readonly ReferenceLine[] = [];

export function linearAxis(low: number, high: number) {
  const target = (high - low || 1) / 5;
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const factor = [1, 2, 5, 10].find((value) => value * magnitude >= target) ?? 10;
  const step = Math.max(Number.isInteger(low) && Number.isInteger(high) ? 1 : 0, factor * magnitude);
  const flat = low === high && low !== 0;
  const first = Math.floor(low / step) - (flat ? 1 : 0);
  const last = Math.max(first + 1, Math.ceil(high / step) + (flat ? 1 : 0));
  return {
    minimum: first * step,
    maximum: last * step,
    ticks: Array.from({ length: last - first + 1 }, (_, index) => (first + index) * step),
  };
}

export function hourlyTimeAxis(locale: string, timeZone: string): XAxis {
  return (start, end, tickLimit) => {
    const span = end - start;
    const targetHours = (span / HOUR + 1) / tickLimit;
    const tickHours =
      [1, 2, 3, 4, 6, 8, 12, 24, 48, 72, 120, 168, 336, 672].find(
        (hours) => hours >= targetHours,
      ) ?? Math.ceil(targetHours / 672) * 672;
    const formatter = new Intl.DateTimeFormat(locale, {
      timeZone,
      ...(span < DAY
        ? { hour: "numeric", minute: "2-digit" }
        : {
            month: "short",
            day: "numeric",
            hour: tickHours < 24 ? "numeric" : undefined,
            year: span >= 180 * DAY ? "2-digit" : undefined,
          }),
    });
    const step = tickHours * HOUR;
    return Array.from({ length: Math.floor(span / step) + 1 }, (_, index) => {
      const value = start + index * step;
      return { value, label: formatter.format(value * 1000) };
    });
  };
}

/** Renders a single series of points in ascending X order. */
export function SvgLineChart({
  points,
  label,
  xAxis,
  formatY,
  tooltip,
  stepped = false,
  showPoints = false,
  referenceLines = NO_REFERENCE_LINES,
  className,
}: {
  points: readonly Point[];
  label: string;
  xAxis?: XAxis;
  formatY: (value: number) => string;
  tooltip: (point: Point) => ReactNode;
  stepped?: boolean;
  showPoints?: boolean;
  referenceLines?: readonly ReferenceLine[];
  className?: string;
}) {
  const hasPoints = points.length > 0;
  const svg = useRef<SVGSVGElement>(null);
  const [{ width, height }, setSize] = useState({ width: 900, height: 280 });
  const [active, setActive] = useState<number>();
  useEffect(() => {
    if (!svg.current || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });
    observer.observe(svg.current);
    return () => observer.disconnect();
  }, [hasPoints]);

  const plotWidth = Math.max(1, width - LEFT - RIGHT);
  const plotHeight = Math.max(1, height - TOP - BOTTOM);
  const start = points[0]?.x ?? 0;
  const end = points.at(-1)?.x ?? start;
  const span = end - start;
  const plot = useMemo(() => {
    let low = points[0]?.y ?? 0;
    let high = low;
    for (const point of points) {
      low = Math.min(low, point.y);
      high = Math.max(high, point.y);
    }
    for (const reference of referenceLines) {
      low = Math.min(low, reference.value);
      high = Math.max(high, reference.value);
    }
    const { minimum, maximum, ticks } = linearAxis(low, high);
    const x = (value: number) => LEFT + plotWidth * (span ? (value - start) / span : 0.5);
    const y = (value: number) =>
      TOP + plotHeight * ((maximum - value) / (maximum - minimum));
    const line = points.map((point, index) => {
      const pointX = x(point.x);
      const pointY = y(point.y);
      if (index === 0) return `M ${pointX} ${pointY}`;
      return stepped ? `H ${pointX} V ${pointY}` : `L ${pointX} ${pointY}`;
    }).join(" ");
    return {
      x,
      y,
      line,
      baseline: y(Math.min(maximum, Math.max(minimum, 0))),
      ticks,
    };
  }, [points, plotWidth, plotHeight, referenceLines, span, start, stepped]);

  const tickLimit = Math.min(8, Math.max(2, Math.floor(plotWidth / 90) + 1));
  const ticks = useMemo(() => xAxis?.(start, end, tickLimit) ?? [], [xAxis, start, end, tickLimit]);
  const point = active === undefined ? undefined : points[active];
  const pointX = point ? plot.x(point.x) : 0;
  const pointY = point ? plot.y(point.y) : 0;
  const tooltipAbove = pointY > height / 2;

  function inspect(value: number) {
    let first = 0;
    let last = points.length - 1;
    while (first < last) {
      const middle = Math.floor((first + last) / 2);
      if (points[middle].x < value) first = middle + 1;
      else last = middle;
    }
    const previous = points[first - 1];
    setActive(previous && value - previous.x < points[first].x - value ? first - 1 : first);
  }

  if (!hasPoints) return null;
  return (
    <div className={className ? `${styles.plot} ${className}` : styles.plot}>
      <svg
        className={styles.svg}
        ref={svg}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={label}
      >
        <g className={styles.labels}>
          {plot.ticks.map((value) => {
            const y = plot.y(value);
            return (
              <g key={value}>
                <line className={styles.grid} x1={LEFT} x2={width - RIGHT} y1={y} y2={y} />
                <text x={LEFT - 8} y={y + 4} textAnchor="end">{formatY(value)}</text>
              </g>
            );
          })}
          {ticks.map(({ value, label }) => {
            const x = plot.x(value);
            return (
              <text key={value} x={x} y={height - 8} textAnchor={x > width - 48 ? "end" : "middle"}>
                {label}
              </text>
            );
          })}
        </g>
        {referenceLines.map(({ value, label, color }) => (
          <line
            key={`${value}:${label}`}
            data-reference-line=""
            x1={LEFT}
            x2={width - RIGHT}
            y1={plot.y(value)}
            y2={plot.y(value)}
            stroke={color}
          />
        ))}
        {points.length === 1 ? (
          <circle className={styles.point} cx={plot.x(start)} cy={plot.y(points[0].y)} r={2} />
        ) : (
          <>
            <path className={styles.area} d={`${plot.line} V ${plot.baseline} H ${plot.x(start)} Z`} />
            <path className={styles.line} d={plot.line} />
          </>
        )}
        {showPoints && points.length > 1 && plotWidth / (points.length - 1) >= 6 &&
          points.map(({ x, y }, index) => (
            <circle key={index} className={styles.point} cx={plot.x(x)} cy={plot.y(y)} r={3} />
          ))}
        {point && <circle className={styles.point} cx={pointX} cy={pointY} r={4} />}
        <rect
          x={LEFT}
          y={TOP}
          width={plotWidth}
          height={plotHeight}
          fill="transparent"
          onPointerMove={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect();
            inspect(start + ((event.clientX - bounds.left) / bounds.width) * span);
          }}
          onPointerLeave={() => setActive(undefined)}
        />
      </svg>
      {point && (
        <div
          className={styles.tooltip}
          role="tooltip"
          style={{
            left: `clamp(min(50%, 8rem), ${(pointX / width) * 100}%, max(50%, 100% - 8rem))`,
            top: pointY + (tooltipAbove ? -8 : 8),
            transform: tooltipAbove ? "translate(-50%, -100%)" : "translateX(-50%)",
          }}
        >
          {tooltip(point)}
        </div>
      )}
    </div>
  );
}
