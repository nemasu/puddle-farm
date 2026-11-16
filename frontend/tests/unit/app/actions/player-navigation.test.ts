import { resolvePlayerDestination } from "../../../../src/app/actions/player-navigation";
import type { PlayerResponse } from "../../../../src/interfaces/API";
import { getPlayer } from "../../../../src/lib/server/player";

jest.mock("../../../../src/lib/server/player", () => ({
  getPlayer: jest.fn(),
}));
const id = 9007199254740993n;

it("resolves an exact bigint ID to its highest-rated character", async () => {
  jest.mocked(getPlayer).mockResolvedValue({
    id,
    ratings: [
      { char_short: "KY", rating: 1500 },
      { char_short: "SO", rating: 2000 },
    ],
  } as PlayerResponse);
  expect(await resolvePlayerDestination(id)).toBe(`/player/${id}/SO`);
  expect(getPlayer).toHaveBeenCalledWith(id);
});

it("preserves the ordinary player route for missing ratings", async () => {
  jest
    .mocked(getPlayer)
    .mockResolvedValue({ id, ratings: [] } as unknown as PlayerResponse);
  expect(await resolvePlayerDestination(id)).toBe(`/player/${id}`);
});

it("preserves the ordinary error handling when the API cannot resolve the player", async () => {
  jest.mocked(getPlayer).mockRejectedValue(new Error("Unavailable"));
  expect(await resolvePlayerDestination(id)).toBe(`/player/${id}`);
});

it.each([-1n, 9223372036854775808n, "../admin" as unknown as bigint])(
  "rejects invalid action ID %p before an API call",
  async (value) => {
    jest.mocked(getPlayer).mockClear();
    expect(await resolvePlayerDestination(value)).toBe("/");
    expect(getPlayer).not.toHaveBeenCalled();
  },
);
