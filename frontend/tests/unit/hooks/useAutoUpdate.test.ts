import { act, renderHook } from "@testing-library/react";
import { useAutoUpdate } from "../../../src/hooks/useAutoUpdate";
import { StorageUtils } from "../../../src/utils/storage";

beforeEach(() => {
  jest.useFakeTimers();
  StorageUtils.setAutoUpdate(null);
});

afterEach(() => {
  jest.useRealTimers();
});

describe("useAutoUpdate", () => {
  test("returns null and never calls onUpdate when auto-update is disabled", () => {
    const onUpdate = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutoUpdate(onUpdate));

    expect(result.current).toBeNull();

    act(() => {
      jest.advanceTimersByTime(120000);
    });
    expect(onUpdate).not.toHaveBeenCalled();
  });

  test("starts the countdown at 120 when auto-update is enabled", () => {
    StorageUtils.setAutoUpdate(true);
    const onUpdate = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutoUpdate(onUpdate));

    expect(result.current).toBe(120);
  });

  test("counts down by 1 every second", () => {
    StorageUtils.setAutoUpdate(true);
    const onUpdate = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutoUpdate(onUpdate));

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(119);
  });

  test("calls onUpdate and resets to 120 after 120 seconds", async () => {
    StorageUtils.setAutoUpdate(true);
    const onUpdate = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutoUpdate(onUpdate));

    await act(async () => {
      await jest.advanceTimersByTimeAsync(120000);
    });
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(120);
  });

  test("does not call onUpdate again while a previous call is still pending", async () => {
    StorageUtils.setAutoUpdate(true);
    let resolveUpdate: () => void = () => {};
    const onUpdate = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveUpdate = resolve;
        }),
    );
    renderHook(() => useAutoUpdate(onUpdate));

    await act(async () => {
      await jest.advanceTimersByTimeAsync(120000);
    });
    expect(onUpdate).toHaveBeenCalledTimes(1);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });
    expect(onUpdate).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveUpdate();
      await Promise.resolve();
    });
  });

  test("clears timers on unmount", () => {
    StorageUtils.setAutoUpdate(true);
    const onUpdate = jest.fn().mockResolvedValue(undefined);
    const { unmount } = renderHook(() => useAutoUpdate(onUpdate));

    unmount();
    act(() => {
      jest.advanceTimersByTime(120000);
    });
    expect(onUpdate).not.toHaveBeenCalled();
  });
});
