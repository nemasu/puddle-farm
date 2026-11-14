import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

export async function checkPublicBrowser({ call, evaluate, waitFor, navigate, requests }, { baseURL, state }) {
  await call("Emulation.setTimezoneOverride", { timezoneId: "Asia/Tokyo" });
  await call("Emulation.setDeviceMetricsOverride", { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
  const beforeStats = requests.length;
  await navigate(`${baseURL}/stats`);
  await waitFor('document.cookie.includes("ggst-timezone=Asia%2FTokyo") && !!document.querySelector("main canvas")');
  await delay(200);
  assert.ok(!requests.slice(beforeStats).some((url) => url.includes("/api/stats")), "hourly chart must use its server seed");
  await evaluate('Array.from(document.querySelectorAll("main button")).find(button => button.textContent.trim() === "24h").click()');
  await waitFor('document.querySelector("main button[aria-pressed=true]")?.textContent === "24h" && !!document.querySelector("main canvas")');
  assert.ok(state.requests.includes("/api/stats/hourly-players?range=24h"));

  await navigate(`${baseURL}/popularity`);
  await evaluate('document.querySelector("section[aria-label=\\"Popularity per player\\"] th:nth-child(2) a").click()');
  await waitFor('new URLSearchParams(location.search).get("playerSort") === "popularity-desc" && document.querySelector("section tbody th")?.textContent === "Ky"');
  await navigate(`${baseURL}/matchup`);
  await evaluate('document.querySelector("section table th [role=button]").click()');
  await waitFor('document.querySelector("section table tbody th")?.textContent.includes("Ky Kiske")');
  await navigate(`${baseURL}/distribution`);
  await waitFor('!!document.querySelector("main canvas")');
  await evaluate('Array.from(document.querySelectorAll("main button")).find(button => button.textContent.trim() === "Combine Ranks").click()');
  await waitFor('Array.from(document.querySelectorAll("main button")).some(button => button.textContent.trim() === "Show Subdivisions")');

  await navigate(`${baseURL}/settings`);
  for (const name of ["useLocalTime", "disableRatingColors", "autoUpdate"]) {
    await evaluate(`document.querySelector('input[name="${name}"]').click()`);
    await waitFor(`document.cookie.includes('${{ useLocalTime: "ggst-local-time", disableRatingColors: "ggst-plain-ratings", autoUpdate: "ggst-auto-update" }[name]}=true')`);
  }
  await evaluate('document.querySelector("input[name=autoUpdate]").click()');
  await waitFor('document.cookie.includes("ggst-auto-update=false")');
  await evaluate('Array.from(document.querySelectorAll("main button")).find(button => button.textContent === "Sol").click()');
  await waitFor('document.readyState === "complete" && document.cookie.includes("ggst-theme=Sol") && document.querySelector("main button[aria-pressed=true]")?.textContent === "Sol"');
  assert.ok(await evaluate('document.querySelector("input[name=useLocalTime]").checked && document.querySelector("input[name=disableRatingColors]").checked'));
  await navigate(`${baseURL}/player/9007199254740993/SO/2/0`);
  await waitFor('Array.from(document.querySelectorAll("main time")).some(time => time.textContent === "2026-11-13 19:00:00")');
  assert.equal(await evaluate('document.querySelector("table[aria-label=\\"Match history\\"] > tbody > tr:first-child > td:last-child").textContent'), "20");

  for (const path of ["stats", "popularity", "matchup", "distribution", "about", "terms", "settings"]) {
    for (const width of [1280, 390]) {
      await call("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: width === 390 });
      await navigate(`${baseURL}/${path}`);
      if (["stats", "distribution"].includes(path)) await delay(1200);
      await evaluate("scrollTo(0,0)");
      assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true, `${path} at ${width}px`);
      await writeFile(`/tmp/puddle-public-${path}-${width}.png`, Buffer.from((await call("Page.captureScreenshot", { format: "png" })).data, "base64"));
    }
  }
}

export async function checkPublicWithoutScripts({ call, evaluate, waitFor, navigate }, { baseURL }) {
  await navigate(`${baseURL}/popularity`);
  const { root } = await call("DOM.getDocument");
  const { nodeId } = await call("DOM.querySelector", { nodeId: root.nodeId, selector: 'section a[href*="playerSort=character-reversed"]' });
  await call("DOM.scrollIntoViewIfNeeded", { nodeId });
  const { model } = await call("DOM.getBoxModel", { nodeId });
  const x = (model.content[0] + model.content[4]) / 2;
  const y = (model.content[1] + model.content[5]) / 2;
  await call("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
  await call("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
  await waitFor('new URLSearchParams(location.search).get("playerSort") === "character-reversed" && document.querySelector("section tbody th")?.textContent === "May"');
  await navigate(`${baseURL}/stats`);
  assert.match(await evaluate('document.querySelector("main").textContent'), /1,234/);
  assert.ok(await evaluate('Array.from(document.querySelectorAll("main time")).some(time => time.textContent === "2026-11-13 19:00:00")'));
  await navigate(`${baseURL}/distribution`);
  assert.equal(await evaluate('document.querySelectorAll("table[aria-label=\\"Rank distribution\\"] tbody tr").length'), 3);
  await navigate(`${baseURL}/settings`);
  assert.ok(await evaluate('document.querySelector("input[name=useLocalTime]").checked && document.querySelector("input[name=disableRatingColors]").checked'));
}
