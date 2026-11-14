import { fetchRatingSync } from "../../../src/utils/playerApi";

const PLAYER_ID = BigInt(123);

afterEach(() => {
  jest.restoreAllMocks();
});

function mockFetch(status: number, body: string | Blob) {
  jest.spyOn(globalThis, "fetch").mockImplementation(
    jest.fn().mockResolvedValue({
      status,
      text: () => Promise.resolve(typeof body === "string" ? body : ""),
      json: () =>
        Promise.resolve(typeof body === "string" ? JSON.parse(body) : null),
      blob: () => Promise.resolve(body instanceof Blob ? body : new Blob()),
      ok: status >= 200 && status < 300,
    }),
  );
}

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
    jest
      .spyOn(globalThis, "fetch")
      .mockImplementation(
        jest.fn().mockRejectedValue(new Error("Network error")),
      );

    const result = await fetchRatingSync(PLAYER_ID);

    expect(result).toEqual({ ok: false, error: "Failed to connect to server" });
  });
});
