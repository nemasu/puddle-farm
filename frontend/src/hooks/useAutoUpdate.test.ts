import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { StorageUtils } from "../utils/Storage";
import { useAutoUpdate } from "./useAutoUpdate";

beforeEach(() => {
  vi.useFakeTimers();
  StorageUtils.setAutoUpdate(null);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useAutoUpdate", () => {
  test("returns null and never calls onUpdate when auto-update is disabled", () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutoUpdate(onUpdate));

    expect(result.current).toBeNull();

    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(onUpdate).not.toHaveBeenCalled();
  });

  test("starts the countdown at 60 when auto-update is enabled", () => {
    StorageUtils.setAutoUpdate(true);
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutoUpdate(onUpdate));

    expect(result.current).toBe(60);
  });

  test("counts down by 1 every second", () => {
    StorageUtils.setAutoUpdate(true);
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutoUpdate(onUpdate));

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(59);
  });

  test("calls onUpdate and resets to 60 after 60 seconds", async () => {
    StorageUtils.setAutoUpdate(true);
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutoUpdate(onUpdate));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000);
    });
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(60);
  });

  test("does not call onUpdate again while a previous call is still pending", async () => {
    StorageUtils.setAutoUpdate(true);
    let resolveUpdate: () => void = () => {};
    const onUpdate = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveUpdate = resolve;
        }),
    );
    renderHook(() => useAutoUpdate(onUpdate));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000);
    });
    expect(onUpdate).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(onUpdate).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveUpdate();
      await Promise.resolve();
    });
  });

  test("clears timers on unmount", () => {
    StorageUtils.setAutoUpdate(true);
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const { unmount } = renderHook(() => useAutoUpdate(onUpdate));

    unmount();
    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(onUpdate).not.toHaveBeenCalled();
  });
});
