import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { fetchAlias, fetchAvatar, fetchComment } from "../utils/playerApi";
import { usePlayerProfile } from "./usePlayerProfile";

vi.mock("../utils/playerApi");

const mockedFetchAlias = vi.mocked(fetchAlias);
const mockedFetchAvatar = vi.mocked(fetchAvatar);
const mockedFetchComment = vi.mocked(fetchComment);

const PLAYER_ID = BigInt(1);

beforeEach(() => {
  mockedFetchAlias.mockReset();
  mockedFetchAvatar.mockReset();
  mockedFetchComment.mockReset();
});

describe("usePlayerProfile", () => {
  test("starts with empty state", () => {
    const { result } = renderHook(() => usePlayerProfile(PLAYER_ID));

    expect(result.current.alias).toEqual([]);
    expect(result.current.avatar).toBeNull();
    expect(result.current.comment).toBeNull();
  });

  test("loadProfile fetches alias/avatar/comment and updates state", async () => {
    mockedFetchAlias.mockResolvedValue(["OldName"]);
    mockedFetchAvatar.mockResolvedValue("blob:avatar-url");
    mockedFetchComment.mockResolvedValue("Hello");

    const { result } = renderHook(() => usePlayerProfile(PLAYER_ID));

    await act(async () => {
      await result.current.loadProfile("TestPlayer");
    });

    expect(mockedFetchAlias).toHaveBeenCalledWith(PLAYER_ID, "TestPlayer");
    expect(mockedFetchAvatar).toHaveBeenCalledWith(PLAYER_ID);
    expect(mockedFetchComment).toHaveBeenCalledWith(PLAYER_ID);
    expect(result.current.alias).toEqual(["OldName"]);
    expect(result.current.avatar).toBe("blob:avatar-url");
    expect(result.current.comment).toBe("Hello");
  });

  test("fetches alias/avatar/comment in parallel, not sequentially", async () => {
    let resolveAlias: (v: string[]) => void = () => {};
    mockedFetchAlias.mockReturnValue(
      new Promise((resolve) => {
        resolveAlias = resolve;
      }),
    );
    mockedFetchAvatar.mockResolvedValue(null);
    mockedFetchComment.mockResolvedValue(null);

    const { result } = renderHook(() => usePlayerProfile(PLAYER_ID));

    let loadPromise: Promise<void>;
    act(() => {
      loadPromise = result.current.loadProfile("TestPlayer");
    });

    // Sequential code would never reach fetchAvatar/fetchComment while
    // fetchAlias is still pending. If these were already called, the
    // implementation is running the three fetches concurrently.
    await Promise.resolve();
    expect(mockedFetchAvatar).toHaveBeenCalledTimes(1);
    expect(mockedFetchComment).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveAlias([]);
      await loadPromise;
    });
  });

  test("keeps the successful results when one fetch rejects", async () => {
    mockedFetchAlias.mockResolvedValue(["OldName"]);
    mockedFetchAvatar.mockRejectedValue(new Error("avatar fetch failed"));
    mockedFetchComment.mockResolvedValue("Hello");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { result } = renderHook(() => usePlayerProfile(PLAYER_ID));

    await act(async () => {
      await result.current.loadProfile("TestPlayer");
    });

    expect(result.current.alias).toEqual(["OldName"]);
    expect(result.current.avatar).toBeNull();
    expect(result.current.comment).toBe("Hello");

    consoleError.mockRestore();
  });

  test("resetProfile restores the empty state", async () => {
    mockedFetchAlias.mockResolvedValue(["OldName"]);
    mockedFetchAvatar.mockResolvedValue("blob:avatar-url");
    mockedFetchComment.mockResolvedValue("Hello");

    const { result } = renderHook(() => usePlayerProfile(PLAYER_ID));
    await act(async () => {
      await result.current.loadProfile("TestPlayer");
    });
    expect(result.current.alias).toEqual(["OldName"]);

    act(() => {
      result.current.resetProfile();
    });

    expect(result.current.alias).toEqual([]);
    expect(result.current.avatar).toBeNull();
    expect(result.current.comment).toBeNull();
  });
});
