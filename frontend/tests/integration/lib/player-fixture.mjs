export function respondPlayerFixture(url, response, state) {
  const path = url.pathname;
  if (!/^\/api\/(player\/\d+|alias\/\d+|comment\/\d+|avatar\/\d+|ratings\/\d+|rating_sync\/\d+|matchups(?:\/|$))/.test(path)) return false;
  if (path.startsWith("/api/rating_sync/")) {
    response.setHeader("Content-Type", "text/plain");
    if (state.syncFailure) response.writeHead(503).end("Sync unavailable");
    else { state.playerSyncs++; response.end("OK"); }
    return true;
  }
  const pendingCore = /^\/api\/player\/\d+$/.test(path) ? state.playerResponses : path.endsWith("/history") ? state.historyResponses : null;
  if (pendingCore) {
    pendingCore.push(() => respondPlayerFixture(url, response, { ...state, playerResponses: null, historyResponses: null }));
    return true;
  }
  if (state.mode === "failure") { response.writeHead(503).end("Unavailable"); return true; }
  if (path.startsWith("/api/avatar/")) {
    response.setHeader("Content-Type", "image/png");
    response.end(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6X2AAAAAASUVORK5CYII=", "base64"));
    return true;
  }
  if (path.startsWith("/api/alias/") || path.startsWith("/api/comment/")) {
    const body = path.includes("/alias/") ? JSON.stringify(["Player <SSR>", "Old Alias"]) : "Hello <comment>";
    if (state.slowProfile) {
      state.pendingProfile++;
      const finish = () => { state.pendingProfile--; response.end(body); };
      if (state.profileResponses) state.profileResponses.push(finish);
      else setTimeout(finish, 500);
    } else response.end(body);
    return true;
  }
  const id = path.match(/\/player\/(\d+)/)?.[1];
  if (/\/player\/\d+$/.test(path)) {
    if (id === "999") { response.writeHead(404).end("Player not found"); return true; }
    const top = { timestamp: "2026-11-13 10:00:00", value: 10001900 };
    response.end(JSON.stringify({
      id: state.playerEmpty ? "0" : id, name: "Player <SSR>", platform: "PC", top_global: 2, tags: [{ tag: "Player tag", style: '{"color":"cyan"}' }],
      ratings: state.playerEmpty ? [] : [
        { rating: 10001800 + state.playerSyncs * 10, char_short: "SO", character: "Sol Badguy", match_count: 200, top_char: 1, is_legend: true, top_rating: top, top_defeated: { timestamp: top.timestamp, value: 10001700, id: "76561198000000001", name: "Top <Opponent>", char_short: "KY" } },
        { rating: 2000, char_short: "KY", character: "Ky Kiske", match_count: 25, top_char: 3, is_legend: false, top_rating: { ...top, value: 2100 }, top_defeated: { ...top, id: "0", name: "N/A", char_short: "SO", value: 0 } },
      ],
    }));
    return true;
  }
  if (path.endsWith("/history")) {
    if (state.historyFailure) { response.writeHead(503).end("History unavailable"); return true; }
    const character = path.split("/").at(-2);
    const history = Array.from({ length: 5 }, (_, index) => ({
      timestamp: `2026-11-13 10:00:0${5 - index}`, floor: index < 2 ? "0" : "10",
      own_rating_value: (character === "SO" ? 10001790 : 1990) - index * 10,
      opponent_id: String(76561198000000001n + BigInt(Math.floor(index / 2))),
      opponent_name: `Opponent <${Math.floor(index / 2) + 1}>`, opponent_platform: "PC",
      opponent_character: "Ky Kiske", opponent_character_short: "KY", opponent_rating_value: 1700,
      result_win: index % 2 === 0, odds: 0.5, opponent_is_legend: false,
    }));
    const count = Number(url.searchParams.get("count"));
    const offset = Number(url.searchParams.get("offset"));
    response.end(JSON.stringify({ history: state.mode === "empty" ? [] : history.slice(offset, offset + count), tags: { "76561198000000001": [{ tag: "Opponent tag", style: '{"color":"cyan"}' }] } }));
    return true;
  }
  if (path.startsWith("/api/ratings/")) {
    const pre = url.searchParams.get("pre_vanquisher") === "true";
    response.end(JSON.stringify(state.mode === "empty" ? [] : [
      { timestamp: "2026-11-13 10:00:03", rating: pre ? 44000 : 10001700 },
      { timestamp: "2026-11-13 10:00:02", rating: pre ? 43000 : 10001600 },
    ]));
    return true;
  }
  const matchups = [{ char_name: "Ky Kiske", char_short: "KY", wins: 3, total_games: 5 }, { char_name: "Sol Badguy", char_short: "SO", wins: 8, total_games: 10 }];
  const endMatchups = (body) => {
    const kind = path.endsWith("/matchups") ? "global" : "personal";
    if (state.matchupGate?.held !== kind) { response.end(body); return; }
    state.matchupGate.responses.push(() => response.end(body));
  };
  if (path === "/api/matchups") {
    const characters = state.mode === "empty" ? [] : [
      { char_name: "Sol Badguy", char_short: "SO", matchups },
      { char_name: "Ky Kiske", char_short: "KY", matchups: [{ char_name: "Ky Kiske", char_short: "KY", wins: 5, total_games: 10 }, { char_name: "Sol Badguy", char_short: "SO", wins: 4, total_games: 10 }] },
    ];
    endMatchups(JSON.stringify(state.globalMatchupData ?? { data_all: characters, data_vanq: characters, last_update: "2026-11-13 10:00:00" }));
  }
  else endMatchups(JSON.stringify({ matchups: state.mode === "empty" ? [] : matchups }));
  return true;
}
