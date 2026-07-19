import { afterEach, describe, expect, test, vi } from "vitest";
import {
  fetchAlias,
  fetchAvatar,
  fetchComment,
  fetchHistory,
  fetchPlayer,
  fetchRatingSync,
} from "../playerApi";

const PLAYER_ID = BigInt(123);

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetch(status: number, body: string | Blob) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      status,
      text: () => Promise.resolve(typeof body === "string" ? body : ""),
      json: () =>
        Promise.resolve(typeof body === "string" ? JSON.parse(body) : null),
      blob: () => Promise.resolve(body instanceof Blob ? body : new Blob()),
      ok: status >= 200 && status < 300,
    }),
  );
}

describe("fetchPlayer", () => {
  test("fetches player data and formats ratings", async () => {
    mockFetch(
      200,
      JSON.stringify({
        id: "123",
        name: "TestPlayer",
        ratings: [{ char_short: "SO", rating: 1500.123456, match_count: 10 }],
        platform: "PC",
        status: "Public",
        top_global: 0,
        tags: [],
      }),
    );

    const result = await fetchPlayer(PLAYER_ID);

    expect(result.name).toBe("TestPlayer");
    expect(result.ratings[0].rating).toBe(1500.12);
  });

  test("returns id=0 for a nonexistent player", async () => {
    mockFetch(200, JSON.stringify({ id: "0", ratings: [] }));

    const result = await fetchPlayer(PLAYER_ID);

    expect(result.id).toBe("0");
  });
});

describe("fetchHistory", () => {
  test("returns history and tags", async () => {
    mockFetch(
      200,
      JSON.stringify({
        history: [{ floor: "0", timestamp: "2024-01-01", opponent_id: "456" }],
        tags: { "456": [{ tag: "Legend", style: "{}" }] },
      }),
    );

    const result = await fetchHistory(PLAYER_ID, "SO", undefined, undefined);

    expect(result?.history).toHaveLength(1);
    expect(result?.tags["456"][0].tag).toBe("Legend");
  });

  test("returns an empty array when history is empty", async () => {
    mockFetch(200, JSON.stringify({ history: [], tags: {} }));

    const result = await fetchHistory(PLAYER_ID, "SO", undefined, undefined);

    expect(result?.history).toHaveLength(0);
  });

  test("returns null for a non-200 status", async () => {
    mockFetch(404, "Not Found");

    const result = await fetchHistory(PLAYER_ID, "SO", undefined, undefined);

    expect(result).toBeNull();
  });
});

describe("fetchAlias", () => {
  test("returns the alias list excluding the current name", async () => {
    mockFetch(200, JSON.stringify(["TestPlayer", "OldName", "AnotherName"]));

    const result = await fetchAlias(PLAYER_ID, "TestPlayer");

    expect(result).toEqual(["OldName", "AnotherName"]);
  });

  test("returns an empty array for a non-200 status", async () => {
    mockFetch(404, "Not Found");

    const result = await fetchAlias(PLAYER_ID, "TestPlayer");

    expect(result).toEqual([]);
  });
});

describe("fetchAvatar", () => {
  test("returns an object URL on 200", async () => {
    const blob = new Blob(["img"], { type: "image/png" });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ status: 200, blob: () => Promise.resolve(blob) }),
    );
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn().mockReturnValue("blob:fake-url"),
    });

    const result = await fetchAvatar(PLAYER_ID);

    expect(result).toBe("blob:fake-url");
  });

  test("returns null on non-200", async () => {
    mockFetch(404, "Not Found");

    const result = await fetchAvatar(PLAYER_ID);

    expect(result).toBeNull();
  });
});

describe("fetchComment", () => {
  test("returns the comment string on 200", async () => {
    mockFetch(200, "Hello World");

    const result = await fetchComment(PLAYER_ID);

    expect(result).toBe("Hello World");
  });

  test("returns null on non-200", async () => {
    mockFetch(404, "Not Found");

    const result = await fetchComment(PLAYER_ID);

    expect(result).toBeNull();
  });
});

describe("fetchRatingSync", () => {
  test("returns ok:true on success", async () => {
    mockFetch(200, "OK");

    const result = await fetchRatingSync(PLAYER_ID);

    expect(result).toEqual({ ok: true });
  });

  test("returns ok:false with an error message on failure", async () => {
    mockFetch(400, "Rate limit exceeded");

    const result = await fetchRatingSync(PLAYER_ID);

    expect(result).toEqual({ ok: false, error: "Rate limit exceeded" });
  });

  test("returns ok:false on a network error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error")),
    );

    const result = await fetchRatingSync(PLAYER_ID);

    expect(result).toEqual({ ok: false, error: "Failed to connect to server" });
  });
});
