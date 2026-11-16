export function respondPublicFixture(url, response, state) {
  const path = url.pathname;
  if (!["/api/stats", "/api/stats/hourly-players", "/api/popularity", "/api/distribution", "/api/supporters"].includes(path)) return false;
  if (path === "/api/stats/hourly-players" && state.hourlyResponses) {
    state.hourlyResponses.push(() => respondPublicFixture(url,response,{...state,hourlyResponses:null}));
    return true;
  }
  if (state.mode === "failure") { response.writeHead(503).end("Unavailable"); return true; }
  const timestamp = "2026-11-13 10:00:00";
  const empty = state.mode === "empty";
  if (path === "/api/stats") {
    const stats = { timestamp };
    for (const [kind, total] of [["players", 1234], ["games", 5678]]) {
      stats[`total_${kind}`] = empty ? 0 : total;
      for (const [period, count] of [["month", 800], ["week", 400], ["day", 100], ["hour", 50]]) stats[`one_${period}_${kind}`] = empty ? 0 : count;
    }
    response.end(JSON.stringify(stats));
  } else if (path === "/api/stats/hourly-players") {
    response.end(JSON.stringify({ points: empty ? [] : [{ timestamp: 1794560400, players: 123 }, { timestamp: 1794564000, players: 124 }] }));
  } else if (path === "/api/popularity") {
    response.end(JSON.stringify({ per_player: empty ? [] : [{ name: "Sol", value: 20 }, { name: "Ky", value: 50 }, { name: "May", value: 30 }], per_character: empty ? [] : [{ name: "Sol", value: 40 }, { name: "Ky", value: 100 }, { name: "May", value: 60 }], per_player_total: empty ? 0 : 100, per_character_total: empty ? 0 : 100, last_update: timestamp }));
  } else if (path === "/api/distribution") {
    response.end(JSON.stringify({ timestamp, data: { one_month_players: 50, distribution_rating: empty ? [] : [
      { lower_bound: 0, upper_bound: 1, count: 5, percentage: 10, percentile: 100 },
      { lower_bound: 1, upper_bound: 1000, count: 10, percentage: 20, percentile: 90 },
      { lower_bound: 1000, upper_bound: 4200, count: 15, percentage: 30, percentile: 70 },
      { lower_bound: 4200, upper_bound: 5400, count: 20, percentage: 40, percentile: 40 },
    ] } }));
  } else if (path === "/api/supporters") {
    response.end(empty ? "[]" : '[{"id":9007199254740993,"name":"Supporter <One>","tags":[{"tag":"Patron","style":"{\\"color\\":\\"red\\"}"}]}]');
  }
  return true;
}
