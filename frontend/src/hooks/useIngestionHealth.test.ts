import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { StorageUtils } from "../utils/storage";
import { useIngestionHealth } from "./useIngestionHealth";

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  StorageUtils.setAutoUpdate(null);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useIngestionHealth", () => {
  test("returns null when the health check succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve("") }),
    );
    const { result } = renderHook(() => useIngestionHealth());

    await waitFor(() => expect(result.current).toBeNull());
  });

  test("returns the response body when the health check fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        text: () => Promise.resolve("ingestion stalled"),
      }),
    );
    const { result } = renderHook(() => useIngestionHealth());

    await waitFor(() => expect(result.current).toBe("ingestion stalled"));
  });

  test("returns a fallback message when the request throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );
    const { result } = renderHook(() => useIngestionHealth());

    await waitFor(() =>
      expect(result.current).toBe(
        "Could not check whether matches are updating.",
      ),
    );
  });

  test("does not poll again when auto-update is disabled", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, text: () => Promise.resolve("") });
    vi.stubGlobal("fetch", fetchMock);
    renderHook(() => useIngestionHealth());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(60000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("polls every 60 seconds when auto-update is enabled", async () => {
    StorageUtils.setAutoUpdate(true);
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, text: () => Promise.resolve("") });
    vi.stubGlobal("fetch", fetchMock);
    renderHook(() => useIngestionHealth());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(60000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
