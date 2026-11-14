import { getRanking } from "../../../../src/lib/server/rankings";

jest.mock("server-only", () => ({}));
afterEach(() => jest.restoreAllMocks());

describe("getRanking", () => {
  test("returns parsed ranking entries with tag styles on success", async () => {
    jest.spyOn(globalThis, "fetch").mockImplementation(
      jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              ranks: [
                {
                  rank: 1,
                  id: "1",
                  name: "Alice",
                  rating: 1500,
                  deviation: 50,
                  char_short: "SO",
                  char_long: "Sol",
                  is_legend: false,
                  tags: [{ tag: "Champ", style: '{"color":"red"}' }],
                },
              ],
              last_update: "2026-01-01 00:00:00",
            }),
          ),
      }),
    );

    const result = await getRanking({ count: 100, offset: 0 });

    expect(result.ranks).toHaveLength(1);
    expect(result.ranks[0].name).toBe("Alice");
    expect(result.ranks[0].id).toBe(1n);
    expect(result.ranks[0].tags[0].style).toEqual({ color: "red" });
    expect(result.lastUpdateMs).toBe(Date.parse("2026-01-01T00:00:00.000Z"));
  });

  test("returns an empty ranks array when ranks is empty", async () => {
    jest.spyOn(globalThis, "fetch").mockImplementation(
      jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        text: () =>
          Promise.resolve(JSON.stringify({ ranks: [], last_update: null })),
      }),
    );

    const result = await getRanking({ count: 100, offset: 0 });

    expect(result.ranks).toEqual([]);
  });

  test("returns null lastUpdateMs when the response has a null last_update", async () => {
    jest.spyOn(globalThis, "fetch").mockImplementation(
      jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        text: () =>
          Promise.resolve(JSON.stringify({ ranks: [], last_update: null })),
      }),
    );

    const result = await getRanking({ count: 100, offset: 0 });

    expect(result.lastUpdateMs).toBeNull();
  });

  test("returns null lastUpdateMs when last_update is absent from the response", async () => {
    jest.spyOn(globalThis, "fetch").mockImplementation(
      jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ ranks: [] })),
      }),
    );

    const result = await getRanking({ count: 100, offset: 0 });

    expect(result.lastUpdateMs).toBeNull();
  });

  test("returns null lastUpdateMs instead of rejecting when last_update is malformed", async () => {
    jest.spyOn(globalThis, "fetch").mockImplementation(
      jest.fn().mockResolvedValue({
        status: 200,
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({ ranks: [], last_update: "not-a-date" }),
          ),
      }),
    );

    const result = await getRanking({ count: 100, offset: 0 });

    expect(result.lastUpdateMs).toBeNull();
  });

  test("retains the HTTP status on a 404 response", async () => {
    jest.spyOn(globalThis, "fetch").mockImplementation(
      jest.fn().mockResolvedValue({
        status: 404,
        ok: false,
        text: async () => "Not found",
      }),
    );

    await expect(getRanking({ count: 100, offset: 0 })).rejects.toMatchObject({
      status: 404,
    });
  });

  test("reports a non-ok response as an HTTP API error", async () => {
    jest.spyOn(globalThis, "fetch").mockImplementation(
      jest.fn().mockResolvedValue({
        status: 500,
        ok: false,
        text: () => Promise.resolve("server exploded"),
      }),
    );

    await expect(getRanking({ count: 100, offset: 0 })).rejects.toThrow(
      "The API returned HTTP 500.",
    );
  });

  test("throws a generic status-based Error when the response body is empty", async () => {
    jest.spyOn(globalThis, "fetch").mockImplementation(
      jest.fn().mockResolvedValue({
        status: 500,
        ok: false,
        text: () => Promise.resolve(""),
      }),
    );

    await expect(getRanking({ count: 100, offset: 0 })).rejects.toThrow(
      "The API returned HTTP 500.",
    );
  });
});
