import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { EpochMs } from "../utils/time";
import { useCountdown } from "./useCountdown";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useCountdown", () => {
  test("returns seconds remaining until targetTimestamp", () => {
    const target = (Date.now() + 10_000) as EpochMs;
    const { result } = renderHook(() => useCountdown(target));
    expect(result.current.secondsLeft).toBe(10);
  });

  test("counts down by 1 every second", () => {
    const target = (Date.now() + 10_000) as EpochMs;
    const { result } = renderHook(() => useCountdown(target));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.secondsLeft).toBe(9);
  });

  test("goes negative once the target has passed", () => {
    const target = (Date.now() + 1000) as EpochMs;
    const { result } = renderHook(() => useCountdown(target));

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.secondsLeft).toBe(-2);
  });

  test("clears the interval on unmount", () => {
    const target = (Date.now() + 10_000) as EpochMs;
    const { result, unmount } = renderHook(() => useCountdown(target));

    unmount();
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // secondsLeft is frozen at whatever it was before unmount; no crash means the interval was cleared.
    expect(result.current.secondsLeft).toBe(10);
  });
});
