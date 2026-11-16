// Run after npm run build. These assertions inspect HTML without browser scripts.
import {checkJapaneseSsr} from "./lib/japanese.mjs";
import {checkReviewFixes} from "./lib/review-fixes.mjs";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import { withNextFixture } from "./lib/fixture.mjs";
import { checkPublicSsr } from "./lib/public-ssr.mjs";
import { checkLadderAboutSsr } from "./lib/ladder-about.mjs";
import { checkLadderDistributionSsr } from "./lib/ladder-distribution.mjs";
import { checkLadderMatchupsSsr } from "./lib/ladder-matchups.mjs";
import { checkLadderPopularitySsr } from "./lib/ladder-popularity.mjs";
import { checkLadderStatsSsr } from "./lib/ladder-stats.mjs";
import { checkLadderPlayerSsr } from "./lib/ladder-player.mjs";
import { checkLadderRankingsSsr } from "./lib/ladder-rankings.mjs";
import { checkLadderSsr } from "./lib/ladder.mjs";
import { checkSitePreferencesSsr } from "./lib/site-preferences.mjs";
import { checkMatchupStreaming } from "./lib/matchup-streaming.mjs";

await withNextFixture(async ({ state, baseURL }) => {
  for (const [acceptLanguage,cookie,expected] of [["ko-KR,en;q=.8","","ko"],["ja-JP,en;q=.8","","ja"],["fr-FR","","en"],["ko-KR","ggst-language=en","en"]]) {
    const response = await fetch(`${baseURL}/settings`, {headers:{"Accept-Language":acceptLanguage,Cookie:cookie}});
    assert.match(await response.text(),new RegExp(`<html[^>]*lang="${expected}"`));
  }
  const healthStart = state.requests.length;
  const health = await fetch(`${baseURL}/health`);
  assert.equal(health.status, 200);
  assert.equal(await health.text(), "healthy\n");
  assert.equal(health.headers.get("cache-control"), "no-store");
  assert.equal(state.requests.length, healthStart, "health probes must never call Rust");
  const robots = await fetch(`${baseURL}/robots.txt`);
  assert.equal(robots.status, 200);
  assert.equal(await robots.text(), await readFile(new URL("../../public/robots.txt", import.meta.url), "utf8"));
  assert.equal(health.headers.get("x-frame-options"), "SAMEORIGIN");
  assert.equal(health.headers.get("x-content-type-options"), "nosniff");
  assert.equal(health.headers.get("x-accel-buffering"), "no");
  async function read(path, theme = "Sol", extraCookies = "") {
    const response = await fetch(`${baseURL}${path}`, {
      headers: { Cookie: `ggst-theme=${theme}; ${extraCookies}` }, redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    const html = await response.text();
    return { response, html, document: new JSDOM(html).window.document };
  }
  async function page(path, theme) {
    const result = await read(path, theme);
    assert.equal(result.response.status, 200, path);
    return result.document;
  }
  async function redirects(path, location) {
    const { response } = await read(path);
    assert.equal(response.status, 307, `redirect status for ${path}`);
    assert.equal(response.headers.get("Location"), location, path);
  }

  await checkReviewFixes({read,state,baseURL});
  await checkSitePreferencesSsr({ read });
  await checkJapaneseSsr({read,state});
  await checkLadderSsr({ read, state, baseURL });
  await checkLadderRankingsSsr({ read, state });
  await checkLadderPlayerSsr({read,state,baseURL});
  await checkLadderStatsSsr({read,state,baseURL});
  await checkLadderPopularitySsr({read,state});
  await checkLadderMatchupsSsr({read,state,baseURL});
  await checkLadderDistributionSsr({read,state});
  await checkLadderAboutSsr({read,state});

  const document = await page("");
  assert.match(document.querySelector("main table").textContent, /SSR <Player>/);
  assert.ok(document.querySelector('main a[href="/player/76561198000000001/SO"]'));
  assert.match(document.querySelector("main").textContent, /Supporter/);
  assert.match(document.title, /Legend Leaderboard/);
  assert.equal(document.querySelector('link[rel="icon"]').getAttribute("href"), "/favicon.ico");
  assert.equal((await fetch(`${baseURL}/RatingIcon.png`)).status, 200);
  assert.match(document.querySelector("main").innerHTML, /\/RatingIcon\.png/);
  assert.match(document.querySelector("footer").textContent, /Terms & Privacy/);
  assert.match((await page("/")).querySelector("main").textContent, /SSR <Player>/);
  assert.match((await page("/does/not/exist")).querySelector("main").textContent, /SSR <Player>/);
  const alias = await page("/legend", "Ky");
  const styles = (doc) => Array.from(doc.querySelectorAll("style"), (style) => style.textContent).join("");
  assert.notEqual(styles(document), styles(alias), "theme cookie must affect SSR styles");
  for (const path of ["/api/not-a-route", "/missing.js"]) {
    assert.equal((await read(path)).response.status, 404, `missing API/asset: ${path}`);
  }

  const first = await page("/top_global/2/0");
  assert.equal(first.querySelectorAll("main tbody tr").length, 2);
  assert.ok(first.querySelector('main a[href="/player/9007199254740993/SO"]'));
  assert.match(first.title, /Global Leaderboard/);
  assert.match(first.querySelector("main").textContent, /Next update in: \d+:\d{2}:\d{2}/);
  assert.equal(first.querySelector('main nav a[href="/top_global/2/2"]').textContent, "Next");
  assert.equal(first.querySelector('main input[name="page"]').getAttribute("value"), "1");
  const last = await page("/top_global/2/4");
  assert.equal(last.querySelectorAll("main tbody tr").length, 1);
  assert.ok(last.querySelector('main a[href="/top_global/2/2"]'));
  assert.ok(!Array.from(last.querySelectorAll("main nav a")).some((link) => link.textContent === "Next"));
  assert.equal(last.querySelector('main input[name="page"]').getAttribute("value"), "3");
  assert.match((await page("/top_global")).querySelector("main table").textContent, /Ranked <Player> 1/);
  assert.match((await page("/top_global/2")).querySelector("main table").textContent, /Ranked <Player> 1/);

  const beforeCharacter = state.requests.length;
  const character = await page("/top/KY/2/2");
  assert.match(character.querySelector("main h1").textContent, /Ky Kiske Leaderboard/);
  assert.match(character.title, /Ky Kiske Leaderboard/);
  assert.match(character.querySelector("main table").textContent, /Ranked <Player> 3/);
  assert.ok(character.querySelector('main a[href="/top/KY/2/4"]'));
  assert.equal(state.requests.slice(beforeCharacter).filter((url) => url === "/api/characters").length, 1, "metadata and navigation share the character request");
  await redirects("/top_global/2/0?page=3", "/top_global/2/4");
  await redirects("/top/KY/2/2?page=1", "/top/KY/2/0");
  await redirects("/top_global/2/2?page=bad", "/top_global/2/2");
  for (const path of ["/top_global/0/0", "/top_global/2/-1", "/top_global/2x/0", "/top_global/9007199254740993/0"]) {
    const before = state.requests.length;
    await redirects(path, "/");
    assert.ok(!state.requests.slice(before).some((url) => url.startsWith("/api/top?")), "invalid pagination must not reach Rust");
  }
  await redirects("/top/UNKNOWN", "/");

  const query = "ソル & a/b?";
  const searchPath = `/search?${new URLSearchParams({ q: query, exact: "true" })}`;
  const beforeSearch = state.requests.length;
  const search = await page(searchPath);
  assert.match(search.title, /Player Search/);
  assert.equal(search.querySelector("main tbody a").textContent, `Search <Player>: ${query}`);
  assert.equal(search.querySelector("main tbody a").getAttribute("href"), "/player/9007199254740993/SO");
  assert.equal(search.querySelector('main input[name="q"]').value, query);
  assert.equal(search.querySelector('main input[name="exact"]').checked, true);
  assert.ok(state.requests.slice(beforeSearch).includes(`/api/player/search?${new URLSearchParams({ search_string: query, exact: "true" })}`));
  const beforeBlank = state.requests.length;
  assert.match((await page("/search")).querySelector("main").textContent, /No results found/);
  assert.ok(!state.requests.slice(beforeBlank).some((url) => url.startsWith("/api/player/search")), "empty search must not fetch");
  await page("/search?q=first&q=second&exact=false&exact=true");
  assert.ok(state.requests.includes("/api/player/search?search_string=first&exact=false"));

  const playerId = "9007199254740993";
  await redirects(`/player/${playerId}`, `/player/${playerId}/SO`);
  const beforePlayer = state.requests.length;
  const player = await page(`/player/${playerId}/SO/2/0`);
  assert.equal(player.querySelector("main h1").textContent, "Player <SSR>");
  assert.match(player.title, /Player <SSR> \(SO\) - 1800 DR/);
  const history = player.querySelector('section[aria-label="Match history"]');
  assert.match(history.textContent, /Opponent <1>/);
  assert.match(history.textContent, /Opponent tag/);
  assert.ok(history.querySelector('a[href="/player/76561198000000001/KY"]'));
  assert.ok(history.querySelector(`a[href="/player/${playerId}/SO/2/2"]`));
  const playerRequests = state.requests.slice(beforePlayer);
  assert.equal(playerRequests.filter((url) => url === `/api/player/${playerId}`).length, 1, "metadata and page share the player read");
  assert.ok(playerRequests.includes(`/api/player/${playerId}/SO/history?count=2&offset=0`));
  assert.ok(playerRequests.includes(`/api/ratings/${playerId}/SO/100`));
  assert.match(player.body.textContent, /Matchup Table/, "completed SSR includes the streamed matchup section");
  assert.equal(player.querySelector('img[alt="Player Avatar"]').getAttribute("src"), `/api/avatar/${playerId}`);
  const older = await page(`/player/${playerId}/SO/2/2`);
  assert.match(older.querySelector('section[aria-label="Match history"]').textContent, /Opponent <2>/);
  assert.ok(state.requests.includes(`/api/player/${playerId}/SO/history?count=3&offset=1`));
  const finalHistory = (await page(`/player/${playerId}/SO/2/4`)).querySelector('section[aria-label="Match history"]');
  assert.match(finalHistory.textContent, /Opponent <3>/);
  assert.ok(!Array.from(finalHistory.querySelectorAll("a")).some((link) => link.textContent === "Next"));
  const emptyHistory = await page(`/player/${playerId}/SO/2/50`);
  assert.match(emptyHistory.querySelector("main").textContent, /No matches found/);
  assert.match((await page(`/player/${playerId}/KY`)).querySelector("main").textContent, /Ky Kiske Rating/);
  assert.match((await page("/player/1a2b/SO")).querySelector("main h1").textContent, /Player <SSR>/);
  const beforeInvalidCharacter = state.requests.length;
  assert.match((await page(`/player/${playerId}/UNKNOWN`)).querySelector("main").textContent, /No ratings for this character/);
  assert.ok(!state.requests.slice(beforeInvalidCharacter).some((url) => url.includes("/history?")));
  for (const id of ["bad-id", "-1", "9223372036854775808", "999"]) {
    assert.equal((await read(`/player/${id}/SO`)).response.status, 404);
  }
  const beforeInvalidPagination = state.requests.length;
  assert.equal((await read(`/player/${playerId}/SO/0/0`)).response.status, 404);
  assert.ok(!state.requests.slice(beforeInvalidPagination).includes(`/api/player/${playerId}`), "invalid pagination must not trigger metadata reads either");
  state.playerEmpty = true;
  const beforePrivate = state.requests.length;
  assert.equal((await read(`/player/${playerId}/SO`)).response.status, 404);
  assert.ok(!state.requests.slice(beforePrivate).some((url) => /\/(history|alias|comment|avatar|ratings|matchups)/.test(url)), "empty player must not load dependent data");
  state.playerEmpty = false;
  state.historyFailure = true;
  const historyFailure = await page(`/player/${playerId}/SO`);
  assert.match(historyFailure.querySelector("main h1").textContent, /Player <SSR>/);
  assert.match(historyFailure.querySelector('main [role="alert"]').textContent, /Could not load match history/);
  state.historyFailure = false;
  state.slowProfile = true;
  const streaming = await fetch(`${baseURL}/player/${playerId}/SO/2/0`, { headers: { Cookie: "ggst-theme=Sol" } });
  const reader = streaming.body.getReader();
  const decoder = new TextDecoder();
  let initial = "";
  while (!initial.includes("Opponent &lt;1&gt;")) {
    const chunk = await reader.read();
    assert.ok(!chunk.done, "core history must be rendered");
    initial += decoder.decode(chunk.value);
  }
  assert.ok(state.pendingProfile > 0, "optional profile calls must not delay core history");
  while (!(await reader.read()).done) { /* consume the remaining optional sections */ }
  state.slowProfile = false;
  await checkMatchupStreaming({ baseURL, state }, `/player/${playerId}/SO/2/0`);

  await checkPublicSsr({ page, read, baseURL, state });
  state.mode = "empty";
  assert.match((await page("")).querySelector("main").textContent, /No Legend players found/);
  assert.match((await page("/top_global")).querySelector("main").textContent, /No players found/);
  assert.match((await page("/search?q=nobody")).querySelector("main").textContent, /No results found/);
  state.mode = "failure";
  for (const path of ["", "/top_global", "/top/SO", "/search?q=test", `/player/${playerId}/SO`]) {
    const failed = await page(path);
    assert.match(failed.querySelector('main [role="alert"]').textContent, /Could not load/);
    assert.doesNotMatch(failed.querySelector("main").textContent, /No results found/);
  }
  state.mode = "success";
  state.healthWarning = "Ingestion stalled";
  assert.match((await page("")).querySelector('[role="alert"]').textContent, /Ingestion stalled/);
  console.log("SSR checks passed: all public pages, player history, saved preferences/time zones, CSV exports, exact IDs, metadata, redirects, optional streaming, and empty/failure states.");
});
