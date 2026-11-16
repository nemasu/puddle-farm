import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

const firstId = "76561198000000001";

export async function checkLadderSsr({ read, state, baseURL }) {
  const korean = "ggst-language=ko; ggst-design=ladder";
  const home = await read("/", "Sol", korean);
  assert.equal(home.document.querySelector('[data-site-design]').dataset.siteDesign, "ladder");
  assert.equal(home.document.querySelector('header a').textContent.trim(), 'PUDDLE FARM');
  const menuLinks=[...home.document.querySelectorAll('header nav a')].map(link=>link.getAttribute('href'));
  assert.deepEqual(menuLinks.slice(-2), ['/search','/about']);
  assert.equal(home.document.querySelector("main table").getAttribute("aria-label"), "레전드 랭킹");
  assert.equal(home.document.querySelectorAll("main tbody tr").length, 5);
  assert.equal(home.document.querySelectorAll("main thead th").length, 4, "deviation column is removed");
  assert.ok(home.document.querySelector(`main a[href="/player/${firstId}/SO"]`));
  assert.ok(home.document.querySelector("main table").textContent.includes("SSR <Player>"));
  assert.ok(home.document.querySelector("main table").textContent.includes("1800"));
  assert.ok(!home.document.querySelector("main table").textContent.includes("10001800"), "rating offset must use the existing formatter");
  assert.ok(home.document.querySelector("main table").textContent.includes("솔"));
  assert.ok(home.document.querySelector('img[src="/ladder/characters/sol.webp"]'));
  assert.ok(!home.document.querySelector("main table script"), "player names remain escaped text");
  assert.equal((await fetch(`${baseURL}/ladder/characters/sol.webp`)).status, 200);
  const alias = await read("/legend", "Sol", "ggst-language=en; ggst-design=ladder");
  assert.equal(alias.document.querySelector('[data-site-design]').dataset.siteDesign, "ladder");
  assert.equal(alias.document.querySelector("main table").getAttribute("aria-label"), "Legend leaderboard");
  const classic = await read("/", "Sol", "ggst-language=ko; ggst-design=classic");
  assert.equal(classic.document.querySelector('[data-site-design]').dataset.siteDesign, "classic");
  const filtered = await read("/?character=KY&q=SSR", "Sol", korean);
  assert.deepEqual([...filtered.document.querySelectorAll("main tbody tr")].map(row => row.cells[0].firstElementChild.textContent.trim()), ["2", "4"]);
  const noMatches = await read("/?q=missing-player", "Sol", korean);
  assert.ok(noMatches.document.querySelector("main tbody").textContent.includes("조건에 맞는"));
  state.healthWarning = "Fixture ingestion warning";
  const warning = await read("/", "Sol", korean);
  assert.ok(warning.document.querySelector('[role=alert]').textContent.includes(state.healthWarning));
  state.healthWarning = null;
  state.mode = "empty";
  const empty = await read("/", "Sol", korean);
  assert.ok(empty.document.querySelector("main tbody").textContent.includes("레전드 플레이어가 없습니다"));
  state.mode = "failure";
  const failed = await read("/", "Sol", korean);
  assert.ok(failed.document.querySelector('main [role=alert]').textContent.includes("랭킹을 불러올 수 없습니다"));
  state.mode = "success";
}

async function choose(call, baseURL, language, design) {
  for (const [name, value] of [["ggst-language", language], ["ggst-design", design]]) {
    await call("Network.setCookie", { name, value, url: `${baseURL}/`, path: "/" });
  }
}

export async function checkLadderBrowser({ call, evaluate, waitFor, navigate }, { baseURL }) {
  await choose(call, baseURL, "ko", "ladder");
  await navigate(`${baseURL}/`);
  await waitFor('!!document.querySelector("[data-site-design=ladder] main table")');
  await evaluate('document.fonts.ready.then(() => true)');
  for (const width of [1440, 390, 320]) {
    await call("Emulation.setDeviceMetricsOverride", { width, height: 1100, deviceScaleFactor: 1, mobile: width < 600 });
    await evaluate("scrollTo(0, 0)");
    await waitFor('Array.from(document.querySelectorAll("main tbody tr:first-child img")).every(image => image.complete && image.naturalWidth > 0)');
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, `Ladder overflow at ${width}px`);
    const screenshot = await call("Page.captureScreenshot", { format: "png" });
    await writeFile(`/tmp/puddle-public-ladder-${width}.png`, Buffer.from(screenshot.data, "base64"));
  }
  await evaluate(`window.__ladderNavigation = 1; document.querySelector('main a[href="/player/${firstId}/SO"]').click()`);
  await waitFor('!!document.querySelector("[data-site-design=ladder] main h1")');
  assert.equal(await evaluate('window.__ladderNavigation'), 1, "player link uses Next navigation");
  assert.equal(await evaluate('document.documentElement.lang'), "ko");
  await choose(call, baseURL, "en", "ladder");
  await navigate(`${baseURL}/legend`);
  assert.equal(await evaluate('document.querySelector("main table").getAttribute("aria-label")'), "Legend leaderboard");
  await choose(call, baseURL, "ko", "classic");
  await navigate(`${baseURL}/`);
  assert.equal(await evaluate('document.querySelector("[data-site-design]").dataset.siteDesign'), "classic");
  await choose(call, baseURL, "en", "classic");
}

export async function checkLadderWithoutScripts({ call, evaluate, waitFor, navigate }, { baseURL }) {
  await choose(call, baseURL, "ko", "ladder");
  await navigate(`${baseURL}/`);
  assert.equal(await evaluate('document.querySelectorAll("main tbody tr").length'), 5);
  const { root } = await call("DOM.getDocument");
  const input = await call("DOM.querySelector", { nodeId: root.nodeId, selector: "#legend-query" });
  await call("DOM.setAttributeValue", { nodeId: input.nodeId, name: "value", value: "SSR <Player> 2" });
  const selected = await call("DOM.querySelector", { nodeId: root.nodeId, selector: "#legend-character option[selected]" });
  if (selected.nodeId) await call("DOM.removeAttribute", { nodeId: selected.nodeId, name: "selected" });
  const character = await call("DOM.querySelector", { nodeId: root.nodeId, selector: '#legend-character option[value="KY"]' });
  await call("DOM.setAttributeValue", { nodeId: character.nodeId, name: "selected", value: "" });
  const submit = await call("DOM.querySelector", { nodeId: root.nodeId, selector: "main form button[type=submit]" });
  await call("DOM.scrollIntoViewIfNeeded", { nodeId: submit.nodeId });
  const { model } = await call("DOM.getBoxModel", { nodeId: submit.nodeId });
  const x = (model.content[0] + model.content[4]) / 2;
  const y = (model.content[1] + model.content[5]) / 2;
  await call("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
  await call("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
  await waitFor('location.search.includes("character=KY") && document.querySelectorAll("main tbody tr").length === 1');
  assert.equal(await evaluate('document.querySelector("main tbody tr td").firstElementChild.textContent.trim()'), "2");
  await choose(call, baseURL, "en", "classic");
}
