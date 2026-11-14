import assert from "node:assert/strict";

export async function checkPublicSsr({ page, read, baseURL, state }) {
  const beforeStats = state.requests.length;
  const stats = await page("/stats");
  assert.match(stats.querySelector("main").textContent, /Ranked Players/);
  assert.match(stats.querySelector("main").textContent, /1,234/);
  assert.match(stats.querySelector("main").textContent, /5,678/);
  assert.equal(stats.querySelectorAll('table[aria-label="Hourly player data"] tbody tr').length, 2);
  assert.equal(state.requests.slice(beforeStats).filter((url) => url === "/api/stats/hourly-players?range=30d").length, 1);
  const names = (doc, kind) => Array.from(doc.querySelectorAll(`section[aria-label="Popularity per ${kind}"] tbody tr`), (row) => row.cells[0].textContent);
  assert.deepEqual(names(await page("/popularity"), "player"), ["Sol", "Ky", "May"]);
  assert.deepEqual(names(await page("/popularity?playerSort=popularity-desc"), "player"), ["Ky", "May", "Sol"]);
  assert.deepEqual(names(await page("/popularity?playerSort=popularity-asc&characterSort=character-reversed"), "character"), ["May", "Ky", "Sol"]);
  const matchup = await page("/matchup");
  assert.match(matchup.querySelector('section[aria-label="All Players"]').textContent, /73.33%/);
  assert.match(matchup.querySelector("main").textContent, /Vanquisher I Ignis and Above/);
  assert.equal(matchup.querySelector('a[download]').getAttribute("href"), "/matchup/export");
  const csv = await fetch(`${baseURL}/matchup/export`);
  assert.equal(csv.status, 200);
  assert.match(csv.headers.get("Content-Disposition"), /attachment; filename="ggst-matchups.csv"/);
  const csvBytes = new Uint8Array(await csv.arrayBuffer());
  assert.deepEqual(Array.from(csvBytes.slice(0, 3)), [239, 187, 191]);
  assert.match(new TextDecoder().decode(csvBytes), /Vanquisher I Ignis and Above/);
  const distribution = await page("/distribution");
  assert.equal(distribution.querySelectorAll('table[aria-label="Rank distribution"] tbody tr').length, 3);
  assert.match(distribution.querySelector("main").textContent, /Players in Placement: 5/);
  assert.match(distribution.querySelector('table[aria-label="Rank thresholds"]').textContent, /Imperius/);
  const about = await page("/about");
  assert.match(about.querySelector("main").textContent, /Supporter <One>/);
  assert.ok(about.querySelector('main a[href="/player/9007199254740993"]'));
  assert.match((await page("/terms")).querySelector("main").textContent, /Terms of Service & Privacy Policy/);

  const flags = "ggst-local-time=true; ggst-plain-ratings=true; ggst-auto-update=true; ggst-timezone=Asia%2FTokyo; private-test-cookie=not-for-html";
  const settings = await read("/settings", "Ky", flags);
  assert.equal(settings.response.status, 200);
  for (const name of ["useLocalTime", "disableRatingColors", "autoUpdate"]) assert.ok(settings.document.querySelector(`input[name="${name}"]`).checked);
  assert.ok(settings.document.querySelector('button[aria-pressed="true"]').textContent.includes("Ky"));
  assert.ok(!settings.html.includes("not-for-html"));
  const player = await read("/player/9007199254740993/SO/2/0", "Sol", flags);
  assert.ok(Array.from(player.document.querySelectorAll("main time")).some((time) => time.textContent === "2026-11-13 19:00:00"));
  const change = player.document.querySelector('table[aria-label="Match history"] > tbody > tr:first-child > td:last-child');
  assert.equal(change.textContent, "20");
  assert.equal(change.querySelector("span"), null, "plain rating change must be plain in SSR HTML");
  const invalid = await read("/stats", "Sol", "ggst-local-time=true; ggst-timezone=bad-zone");
  assert.ok(Array.from(invalid.document.querySelectorAll("time")).some((time) => time.textContent === "2026-11-13 10:00:00"));

  state.mode = "empty";
  for (const path of ["/popularity", "/distribution", "/matchup", "/stats", "/about"]) {
    const document = await page(path);
    assert.doesNotMatch(document.querySelector("main").textContent, /NaN|Infinity/);
    assert.equal(document.querySelector('main [role="alert"]'), null);
  }
  state.mode = "failure";
  for (const path of ["/popularity", "/distribution", "/matchup", "/stats", "/about"]) {
    assert.match((await page(path)).querySelector('main [role="alert"]').textContent, /Could not load/);
  }
  assert.equal((await fetch(`${baseURL}/matchup/export`)).status, 503);
  state.mode = "success";
}
