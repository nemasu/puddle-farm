import { act, renderHook, waitFor } from "@testing-library/react";
import { useIngestionHealth } from "../../../src/hooks/useIngestionHealth";
import { StorageUtils } from "../../../src/utils/storage";

beforeEach(() => {
  jest.useFakeTimers({ advanceTimers: true });
  StorageUtils.setAutoUpdate(null);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("useIngestionHealth", () => {
  test("uses the SSR result without repeating the initial request", () => {
    const fetcher = jest.fn();
    jest.spyOn(globalThis, "fetch").mockImplementation(fetcher);
    const { result, rerender } = renderHook(
      ({ message }: { message: string | null }) => useIngestionHealth(message),
      { initialProps: { message: "ingestion stalled" as string | null } },
    );
    expect(result.current).toBe("ingestion stalled");
    expect(fetcher).not.toHaveBeenCalled();
    rerender({ message: null });
    expect(result.current).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  test("polls after the SSR result when auto-update is enabled", async () => {
    StorageUtils.setAutoUpdate(true);
    const fetcher = jest.fn().mockResolvedValue({
      ok: false,
      text: () => Promise.resolve("ingestion stalled"),
    });
    jest.spyOn(globalThis, "fetch").mockImplementation(fetcher);
    const { result } = renderHook(() => useIngestionHealth(null));
    expect(fetcher).not.toHaveBeenCalled();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(60000);
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.current).toBe("ingestion stalled");
  });

  test("returns null when the health check succeeds", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockImplementation(
        jest
          .fn()
          .mockResolvedValue({ ok: true, text: () => Promise.resolve("") }),
      );
    const { result } = renderHook(() => useIngestionHealth());

    await waitFor(() => expect(result.current).toBeNull());
  });

  test("returns the response body when the health check fails", async () => {
    jest.spyOn(globalThis, "fetch").mockImplementation(
      jest.fn().mockResolvedValue({
        ok: false,
        text: () => Promise.resolve("ingestion stalled"),
      }),
    );
    const { result } = renderHook(() => useIngestionHealth());

    await waitFor(() => expect(result.current).toBe("ingestion stalled"));
  });

  test("returns a fallback message when the request throws", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockImplementation(
        jest.fn().mockRejectedValue(new Error("network down")),
      );
    const { result } = renderHook(() => useIngestionHealth());

    await waitFor(() =>
      expect(result.current).toBe(
        "Could not check whether matches are updating.",
      ),
    );
  });

  test("does not poll again when auto-update is disabled", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, text: () => Promise.resolve("") });
    jest.spyOn(globalThis, "fetch").mockImplementation(fetchMock);
    renderHook(() => useIngestionHealth());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await jest.advanceTimersByTimeAsync(60000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("polls every 60 seconds when auto-update is enabled", async () => {
    StorageUtils.setAutoUpdate(true);
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, text: () => Promise.resolve("") });
    jest.spyOn(globalThis, "fetch").mockImplementation(fetchMock);
    renderHook(() => useIngestionHealth());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await jest.advanceTimersByTimeAsync(60000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
