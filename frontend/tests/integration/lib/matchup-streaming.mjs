import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";

export async function checkMatchupStreaming({ baseURL, state }, playerPath) {
  // Hold each endpoint independently; no timing race with a short fake delay.
  for (const held of ["personal", "global"]) {
    const gate = [];
    state.matchupGate = { held, responses: gate };
    try {
      const response = await fetch(`${baseURL}${playerPath}`, {
        headers: { Cookie: "ggst-theme=Sol" },
        signal: AbortSignal.timeout(5000),
      });
      assert.equal(response.status, 200);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let html = "";
      while (!html.includes("Opponent &lt;1&gt;") || !html.includes("Loading matchup statistics...")) {
        const { done, value } = await reader.read();
        assert.equal(done, false, `${held}: core history must arrive before matchups`);
        html += decoder.decode(value, { stream: true });
      }
      assert.ok(html.includes("Player &lt;SSR&gt;"), "Profile arrives with history");
      assert.ok(html.includes("Loading matchup statistics..."), "Local matchup fallback is present");
      assert.ok(!html.includes("Matchup Table"), "Optional matchup content is still pending");
      for (let attempt = 0; gate.length === 0 && attempt < 100; attempt++) await delay(10);
      assert.equal(gate.length, 1, `${held}: matchup response is still held when core history arrives`);
      gate.splice(0).forEach(release => release());
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
      }
      assert.ok(html.includes("Matchup Table"), "Matchup content streams after the response is released");
    } finally {
      state.matchupGate = null;
      gate.splice(0).forEach(release => release());
    }
  }
}
