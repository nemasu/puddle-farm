import { describe, expect, test } from "vitest";
import type { DurationMs, EpochMs } from "./time";
import { addDuration, parseUtcTimestamp } from "./time";

describe("parseUtcTimestamp", () => {
  test("parses a UTC timestamp string as epoch milliseconds", () => {
    const ms = parseUtcTimestamp("2026-01-01 00:00:00");
    expect(ms).toBe(Date.parse("2026-01-01T00:00:00.000Z"));
  });

  test("returns null for an invalid timestamp string", () => {
    expect(parseUtcTimestamp("not-a-date")).toBeNull();
  });
});

describe("addDuration", () => {
  test("adds a duration to an epoch timestamp", () => {
    const epoch = 1_000 as EpochMs;
    const duration = 500 as DurationMs;
    expect(addDuration(epoch, duration)).toBe(1_500);
  });
});
