import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

const id = "9007199254740993";

export async function checkPlayerBrowser({ call, evaluate, waitFor, navigate, requests }, { state, baseURL }) {
  await call("Emulation.setDeviceMetricsOverride", { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
  const before = requests.length;
  await navigate(`${baseURL}/player/${id}/SO/2/0`);
  await waitFor('!!document.querySelector("main canvas") && document.querySelector("main h1")?.textContent === "Player <SSR>"');
  assert.ok(!requests.slice(before).some((url) => /\/api\/(player|ratings|matchups|alias|comment)\//.test(url)), "SSR player datasets must not refetch on mount");
  assert.equal(await evaluate('document.querySelector("main img[alt=\\"Player Avatar\\"]").getAttribute("src")'), `/api/avatar/${id}`);
  await evaluate('Array.from(document.querySelectorAll("section[aria-label=\\"Match history\\"] button[aria-label=\\"expand row\\"]")).find(button => button.getClientRects().length).click()');
  await waitFor('!!document.querySelector("section table[aria-label=\\"Individual matches\\"]")');
  assert.equal(await evaluate('document.querySelector("section table[aria-label=\\"Individual matches\\"] tbody").children.length'), 2);
  await evaluate(`document.querySelector('section a[href="/player/${id}/SO/2/2"]').click()`);
  await waitFor(`location.pathname === "/player/${id}/SO/2/2" && document.querySelector('section[aria-label="Match history"]').textContent.includes("Opponent <2>")`);
  await evaluate(`document.querySelector('a[href="/player/${id}/KY"]').click()`);
  await waitFor('document.querySelector("main h2")?.textContent.includes("Ky Kiske Rating") && !!document.querySelector("main canvas")');
  assert.ok(!requests.slice(before).some((url) => url.includes(`/api/ratings/${id}/KY/25`)), "new character must use its server seed");
  await evaluate(`document.querySelector('a[href="/player/${id}/SO"]').click()`);
  await waitFor('document.querySelector("main h2")?.textContent.includes("Sol Badguy Rating") && !!document.querySelector("main canvas")');

  await evaluate('Array.from(document.querySelectorAll("main button")).find(button => button.textContent.trim() === "Show Pre-Vanquisher History").click()');
  await waitFor('Array.from(document.querySelectorAll("main button")).some(button => button.textContent.trim() === "Show Vanquisher History") && !!document.querySelector("main canvas")');
  assert.ok(state.requests.includes(`/api/ratings/${id}/SO/200?pre_vanquisher=true`));
  await evaluate('Array.from(document.querySelectorAll("main button")).find(button => button.textContent.trim() === "Show Vanquisher History").click()');
  await waitFor('!!document.querySelector("main canvas")');

  await evaluate('document.querySelectorAll("main [role=combobox]")[0].dispatchEvent(new MouseEvent("mousedown", { bubbles:true, button:0 }))');
  await waitFor('Array.from(document.querySelectorAll("[role=option]")).some(option => option.textContent.trim() === "Custom...")');
  await evaluate('Array.from(document.querySelectorAll("[role=option]")).find(option => option.textContent.trim() === "Custom...").click()');
  await waitFor('!!document.querySelector("[role=dialog] input[type=number]")');
  await evaluate('document.querySelector("[role=dialog] input[type=number]").focus()');
  await call("Input.insertText", { text: "50" });
  await evaluate('Array.from(document.querySelectorAll("[role=dialog] button")).find(button => button.textContent === "Apply").click()');
  await waitFor('!document.querySelector("[role=dialog]") && !!document.querySelector("main canvas")');
  assert.ok(state.requests.includes(`/api/ratings/${id}/SO/50`));

  await evaluate('document.querySelectorAll("main [role=combobox]")[1].dispatchEvent(new MouseEvent("mousedown", { bubbles:true, button:0 }))');
  await waitFor('Array.from(document.querySelectorAll("[role=option]")).some(option => option.textContent.trim() === "1 Month")');
  await evaluate('Array.from(document.querySelectorAll("[role=option]")).find(option => option.textContent.trim() === "1 Month").click()');
  await waitFor('document.querySelector("main").textContent.includes("Matchup Table")');
  assert.ok(state.requests.includes(`/api/matchups/${id}/SO/4`));
  await evaluate('Array.from(document.querySelectorAll("main button")).find(button => button.textContent.trim() === "Tier List").click()');
  await waitFor('document.querySelector("main").textContent.includes("Tiers based on personal win rate")');
  await evaluate('Array.from(document.querySelectorAll("main button")).find(button => button.textContent.trim() === "Table").click()');

  state.syncFailure = true;
  await evaluate('document.querySelector("button[aria-label=\\"Sync ratings from game\\"]").click()');
  await waitFor('document.querySelector("[role=dialog]")?.textContent.includes("Sync unavailable")');
  await evaluate('Array.from(document.querySelectorAll("[role=dialog] button")).find(button => button.textContent === "OK").click()');
  state.syncFailure = false;
  await evaluate('document.querySelector("button[aria-label=\\"Sync ratings from game\\"]").click()');
  await waitFor('document.querySelector("main h2")?.textContent.includes("1810")');
  assert.equal(state.playerSyncs, 1, "successful sync must refresh the server-rendered rating");
  await evaluate("scrollTo(0, 0)");
  await waitFor("scrollY === 0");
  assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true);
  await writeFile("/tmp/puddle-public-player-desktop.png", Buffer.from((await call("Page.captureScreenshot", { format: "png" })).data, "base64"));
  await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate("scrollTo(0, 0)");
  await waitFor("scrollY === 0");
  assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true);
  await writeFile("/tmp/puddle-public-player-mobile.png", Buffer.from((await call("Page.captureScreenshot", { format: "png" })).data, "base64"));
}

export async function checkPlayerWithoutScripts({ call, evaluate, waitFor, navigate }, { baseURL }) {
  await navigate(`${baseURL}/player/${id}/SO/2/0`);
  assert.equal(await evaluate('document.querySelector("main h1").textContent'), "Player <SSR>");
  assert.match(await evaluate('document.querySelector("section[aria-label=\\"Match history\\"]").textContent'), /Opponent <1>/);
  assert.ok(await evaluate('document.querySelector("main").textContent.includes("Matchup Table") || !!document.querySelector("main noscript a[href=\\"/matchup\\"]")'), "Optional streamed matchups have a native fallback without scripts");
  const { root } = await call("DOM.getDocument");
  const { nodeId } = await call("DOM.querySelector", { nodeId: root.nodeId, selector: 'section[aria-label="Match history"] details summary' });
  await call("DOM.scrollIntoViewIfNeeded", { nodeId });
  const { model } = await call("DOM.getBoxModel", { nodeId });
  const x = (model.content[0] + model.content[4]) / 2;
  const y = (model.content[1] + model.content[5]) / 2;
  await call("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
  await call("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
  await waitFor('!!document.querySelector("section details[open] table[aria-label=\\"Individual matches\\"]")');
  assert.equal(await evaluate('document.querySelector("section details[open] tbody").children.length'), 2);
}
