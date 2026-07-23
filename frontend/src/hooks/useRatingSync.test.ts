import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { fetchRatingSync } from "../utils/playerApi";
import { useRatingSync } from "./useRatingSync";

vi.mock("../utils/playerApi");

const mockedFetchRatingSync = vi.mocked(fetchRatingSync);

beforeEach(() => {
  mockedFetchRatingSync.mockReset();
});

describe("useRatingSync", () => {
  test("does nothing when player_id is 0", async () => {
    const onSuccess = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useRatingSync(BigInt(0), onSuccess));

    await act(async () => {
      await result.current.handleRatingSync();
    });

    expect(mockedFetchRatingSync).not.toHaveBeenCalled();
  });

  test("calls onSuccess and clears loading on success", async () => {
    mockedFetchRatingSync.mockResolvedValue({ ok: true });
    const onSuccess = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useRatingSync(BigInt(1), onSuccess));

    await act(async () => {
      await result.current.handleRatingSync();
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(result.current.syncLoading).toBe(false);
    expect(result.current.syncError).toBeNull();
  });

  test("sets syncError and does not call onSuccess on failure", async () => {
    mockedFetchRatingSync.mockResolvedValue({
      ok: false,
      error: "Rate limit exceeded",
    });
    const onSuccess = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useRatingSync(BigInt(1), onSuccess));

    await act(async () => {
      await result.current.handleRatingSync();
    });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.syncError).toBe("Rate limit exceeded");
    expect(result.current.syncLoading).toBe(false);
  });

  test("ignores a call while a sync is already in progress", async () => {
    let resolveFirst: (v: { ok: true }) => void = () => {};
    mockedFetchRatingSync.mockReturnValue(
      new Promise((resolve) => {
        resolveFirst = resolve;
      }),
    );
    const onSuccess = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useRatingSync(BigInt(1), onSuccess));

    let firstCall: Promise<void>;
    act(() => {
      firstCall = result.current.handleRatingSync();
    });
    await act(async () => {
      await result.current.handleRatingSync();
    });

    expect(mockedFetchRatingSync).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirst({ ok: true });
      await firstCall;
    });
  });

  test("allows a second sync after the first one has completed", async () => {
    mockedFetchRatingSync.mockResolvedValue({ ok: true });
    const onSuccess = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useRatingSync(BigInt(1), onSuccess));

    await act(async () => {
      await result.current.handleRatingSync();
    });
    expect(result.current.syncLoading).toBe(false);

    await act(async () => {
      await result.current.handleRatingSync();
    });

    expect(mockedFetchRatingSync).toHaveBeenCalledTimes(2);
    expect(onSuccess).toHaveBeenCalledTimes(2);
    expect(result.current.syncLoading).toBe(false);
  });

  test("clearSyncError resets syncError to null", async () => {
    mockedFetchRatingSync.mockResolvedValue({ ok: false, error: "boom" });
    const onSuccess = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useRatingSync(BigInt(1), onSuccess));

    await act(async () => {
      await result.current.handleRatingSync();
    });
    expect(result.current.syncError).toBe("boom");

    act(() => {
      result.current.clearSyncError();
    });
    expect(result.current.syncError).toBeNull();
  });
});
