import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { DurationMs, EpochMs } from "../utils/time";
import { ONE_DAY_MS, parseUtcTimestamp } from "../utils/time";
import { UpdateCountdown } from "./UpdateCountdown";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("UpdateCountdown", () => {
  test("shows the remaining time before the window elapses", () => {
    render(
      <UpdateCountdown
        lastUpdateMs={parseUtcTimestamp("2025-12-31 00:00:01") as EpochMs}
        intervalMs={ONE_DAY_MS}
      />,
    );
    expect(screen.getByText("Next update in: 0:00:01")).toBeDefined();
  });

  test('shows "Updating..." once the window has elapsed', () => {
    render(
      <UpdateCountdown
        lastUpdateMs={parseUtcTimestamp("2025-12-30 00:00:00") as EpochMs}
        intervalMs={ONE_DAY_MS}
      />,
    );
    expect(screen.getByText("Updating...")).toBeDefined();
  });

  test("respects a different interval, e.g. a 1-hour window", () => {
    render(
      <UpdateCountdown
        lastUpdateMs={parseUtcTimestamp("2025-12-31 23:00:01") as EpochMs}
        intervalMs={3600_000 as DurationMs}
      />,
    );
    expect(screen.getByText("Next update in: 0:00:01")).toBeDefined();
  });
});
