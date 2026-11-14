import type {
  PlayerGamesResponse,
  PlayerRankResponse,
  PlayerResponse,
  Supporter,
} from "../../../src/interfaces/API";
import { parseApiJson } from "../../../src/lib/api-json";

test("API player IDs are bigint for safe/unsafe numbers and decimal strings", () => {
  const players = parseApiJson<PlayerResponse[]>(
    '[{"id":0},{"id":123},{"id":9007199254740993},{"id":"9223372036854775807"}]',
  );
  expect(players.map((player) => player.id)).toEqual([
    0n,
    123n,
    9007199254740993n,
    9223372036854775807n,
  ]);
});

test("nested opponent IDs and admin IDs are bigint; text and ratings keep their types", () => {
  const data = parseApiJson<{
    player: PlayerResponse;
    games: PlayerGamesResponse;
    aliases: { player_id: bigint; current_name: string };
  }>(
    "{" +
      '"player":{"id":"9007199254740993","name":"123","ratings":[{"rating":1800.5,"top_defeated":{"id":42}}]},' +
      '"games":{"history":[{"opponent_id":"9007199254740994"}],"tags":{"9007199254740994":[]}},' +
      '"aliases":{"player_id":"9007199254740993","current_name":"456"}}',
  );
  expect(data.player.id).toBe(9007199254740993n);
  expect(data.player.ratings[0].top_defeated.id).toBe(42n);
  expect(data.player.ratings[0].rating).toBe(1800.5);
  expect(data.player.name).toBe("123");
  expect(data.games.history[0].opponent_id).toBe(9007199254740994n);
  expect(data.games.tags["9007199254740994"]).toEqual([]);
  expect(data.aliases.player_id).toBe(9007199254740993n);
  expect(data.aliases.current_name).toBe("456");
});

test("ranking and supporter IDs keep exact bigint values", () => {
  const data = parseApiJson<{
    ranks: PlayerRankResponse[];
    supporters: Supporter[];
  }>(
    '{"ranks":[{"id":9007199254740993}],"supporters":[{"id":9007199254740994}]}',
  );
  expect(data.ranks[0].id).toBe(9007199254740993n);
  expect(data.supporters[0].id).toBe(9007199254740994n);
});

test.each(['{"id":1.5}', '{"id":1e18}', '{"opponent_id":"not-a-number"}'])(
  "rejects malformed ID input %s rather than rounding/coercing it",
  (text) => {
    expect(() => parseApiJson(text)).toThrow(TypeError);
  },
);
