import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CharacterNamesProvider, useCharacterNames } from "./useCharacterNames";

function wrapper({ children }: { children: ReactNode }) {
  return <CharacterNamesProvider>{children}</CharacterNamesProvider>;
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve([
          ["SO", "Sol"],
          ["KY", "Ky"],
        ]),
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useCharacterNames", () => {
  test("returns null before the provider's fetch resolves", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => {})),
    );

    const { result } = renderHook(() => useCharacterNames(), { wrapper });

    expect(result.current).toBeNull();
  });

  test("returns the char_short -> char_long map once the provider's fetch resolves", async () => {
    const { result } = renderHook(() => useCharacterNames(), { wrapper });

    await waitFor(() => expect(result.current).not.toBeNull());

    expect(result.current).toEqual({ SO: "Sol", KY: "Ky" });
  });

  test("returns null when rendered outside a CharacterNamesProvider", () => {
    const { result } = renderHook(() => useCharacterNames());

    expect(result.current).toBeNull();
  });

  test("logs the error and keeps returning null when fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { result } = renderHook(() => useCharacterNames(), { wrapper });

    await waitFor(() => expect(consoleErrorSpy).toHaveBeenCalled());

    expect(result.current).toBeNull();

    consoleErrorSpy.mockRestore();
  });
});
