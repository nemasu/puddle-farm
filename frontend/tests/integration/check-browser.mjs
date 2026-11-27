import { checkDesignDefaults } from "./lib/design-defaults.mjs";
// Run after npm run build. Uses a locally installed Chrome.
import {checkJapaneseBrowser,checkJapaneseWithoutScripts} from "./lib/japanese.mjs";
import {checkReviewFixesBrowser} from "./lib/review-fixes.mjs";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { withChrome } from "./lib/chrome.mjs";
import { withNextFixture } from "./lib/fixture.mjs";
import { checkLadderAboutBrowser, checkLadderAboutWithoutScripts } from "./lib/ladder-about.mjs";
import { checkLadderDistributionBrowser, checkLadderDistributionWithoutScripts } from "./lib/ladder-distribution.mjs";
import { checkLadderMatchupsBrowser, checkLadderMatchupsWithoutScripts } from "./lib/ladder-matchups.mjs";
import { checkLadderPopularityBrowser, checkLadderPopularityWithoutScripts } from "./lib/ladder-popularity.mjs";
import { checkLadderStatsBrowser, checkLadderStatsWithoutScripts } from "./lib/ladder-stats.mjs";
import { checkLadderPlayerBrowser, checkLadderPlayerWithoutScripts } from "./lib/ladder-player.mjs";
import { checkLadderRankingsBrowser, checkLadderRankingsWithoutScripts } from "./lib/ladder-rankings.mjs";
import { checkLadderBrowser, checkLadderWithoutScripts } from "./lib/ladder.mjs";
import { checkLadderThemeBrowser, checkSitePreferencesBrowser, checkSitePreferencesWithoutScripts } from "./lib/site-preferences.mjs";
import { checkPlayerTransition } from "./lib/player-transition.mjs";
import { checkPlayerBrowser, checkPlayerWithoutScripts } from "./lib/player-browser.mjs";
import { checkPublicBrowser, checkPublicWithoutScripts } from "./lib/public-browser.mjs";

await withNextFixture(async ({ baseURL, state }) => withChrome(async ({ call, evaluate, waitFor, navigate, errors, requests }) => {
  await call("Page.addScriptToEvaluateOnNewDocument", { source: 'if (!localStorage.getItem("theme")) localStorage.setItem("theme", "Ky");' });
  await checkDesignDefaults({call,evaluate,waitFor,navigate}, {baseURL, prefix:"", game:"ggst", design:"ladder"});
  await checkLadderThemeBrowser({ call, evaluate, waitFor, navigate }, { baseURL });
  await call("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await navigate(`${baseURL}/`);
  await waitFor('document.cookie.includes("ggst-theme=Ky") && document.querySelector("main table")?.textContent.includes("SSR <Player>")');
  await navigate(`${baseURL}/top_global/2/0`);
  await waitFor('document.querySelectorAll("main tbody tr").length === 2');
  await evaluate('window.__migrationMarker = 123; document.querySelector("main a[href=\\"/top_global/2/2\\"]").click()');
  await waitFor('location.pathname === "/top_global/2/2" && document.querySelector("main tbody")?.textContent.includes("Ranked <Player> 3")');
  assert.equal(await evaluate("window.__migrationMarker"), 123, "ranking links should use client navigation");
  assert.equal(await evaluate('document.querySelector("main input[name=page]").value'), "2");
  await evaluate('const page = document.querySelector("main input[name=page]"); page.value = "3"; page.form.requestSubmit()');
  await waitFor('location.pathname === "/top_global/2/4" && document.querySelector("main tbody")?.textContent.includes("Ranked <Player> 5")');
  assert.equal(await evaluate('document.querySelector("main input[name=page]").value'), "3");
  await navigate(`${baseURL}/top/KY/2/0`);
  await waitFor('document.querySelector("main h1")?.textContent === "Ky Kiske Leaderboard"');
  await evaluate('Array.from(document.querySelectorAll("button")).find(button => button.textContent.trim() === "Characters").click()');
  await waitFor('Array.from(document.querySelectorAll("a[href=\\"/top/SO\\"]")).some(link => link.getClientRects().length)');
  await evaluate('Array.from(document.querySelectorAll("a[href=\\"/top/SO\\"]")).find(link => link.getClientRects().length).click()');
  await waitFor('location.pathname === "/top/SO" && document.querySelector("main h1")?.textContent === "Sol Badguy Leaderboard"');

  const query = "ソル & a/b?";
  await navigate(`${baseURL}/search?${new URLSearchParams({ q: query })}`);
  await evaluate('document.querySelector("main input[name=exact]").click()');
  await waitFor('new URLSearchParams(location.search).get("exact") === "true" && document.querySelector("main input[name=exact]").checked');
  assert.equal(await evaluate('document.querySelector("main tbody a").textContent'), `Search <Player>: ${query}`);
  await evaluate("history.back()");
  await waitFor('!new URLSearchParams(location.search).has("exact") && !document.querySelector("main input[name=exact]").checked');
  await evaluate("history.forward()");
  await waitFor('new URLSearchParams(location.search).get("exact") === "true" && document.querySelector("main input[name=exact]").checked');

  // Native keyboard input also verifies the hydrated navbar's submit handler.
  await evaluate('const input = Array.from(document.querySelectorAll("input[aria-label=\\"Search Player Names\\"]")).find(input => input.getClientRects().length); input.focus(); input.select()');
  await call("Input.insertText", { text: "another / name" });
  await waitFor('Array.from(document.querySelectorAll("input[name=q]")).some(input => input.value === "another / name")');
  await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" });
  await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await waitFor('new URLSearchParams(location.search).get("q") === "another / name" && document.querySelector("main tbody a")?.textContent.includes("another / name")');
  assert.equal(await evaluate('new URLSearchParams(location.search).get("exact")'), "true");
  assert.ok(state.requests.some((url) => url === "/api/player/search?search_string=another+%2F+name&exact=true"));
  assert.equal(requests.some((url) => new URL(url).pathname.startsWith("/api/")), false, "initial content must not refetch through browser API effects");

  await navigate(`${baseURL}/top_global/2/0`);
  assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true);
  const desktop = await call("Page.captureScreenshot", { format: "png" });
  await writeFile("/tmp/puddle-public-rankings-desktop.png", Buffer.from(desktop.data, "base64"));
  await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true);
  const mobile = await call("Page.captureScreenshot", { format: "png" });
  await writeFile("/tmp/puddle-public-rankings-mobile.png", Buffer.from(mobile.data, "base64"));

  await checkPlayerTransition({ call, evaluate, waitFor, navigate }, { baseURL, state });

  await checkPublicBrowser({ call, evaluate, waitFor, navigate, requests }, { state, baseURL });
  await checkPlayerBrowser({ call, evaluate, waitFor, navigate, requests }, { state, baseURL });

  await checkSitePreferencesBrowser({ call, evaluate, waitFor, navigate }, { baseURL });

  await checkLadderBrowser({ call, evaluate, waitFor, navigate }, { baseURL });

  await checkLadderRankingsBrowser({ call, evaluate, waitFor, navigate }, { baseURL, state });

  await checkLadderPlayerBrowser({call,evaluate,waitFor,navigate,requests},{baseURL,state});

  await checkLadderStatsBrowser({call,evaluate,waitFor,navigate,requests},{baseURL,state});

  await checkLadderPopularityBrowser({call,evaluate,waitFor,navigate,requests},{baseURL,state});

  await checkLadderMatchupsBrowser({call,evaluate,waitFor,navigate,requests},{baseURL,state});

  await checkLadderDistributionBrowser({call,evaluate,waitFor,navigate},{baseURL});

  await checkLadderAboutBrowser({call,evaluate,waitFor,navigate},{baseURL,state});

  await checkJapaneseBrowser({call,evaluate,navigate,waitFor},{baseURL});

  await checkReviewFixesBrowser({call,evaluate,navigate,waitFor},{baseURL});

  // Real browser navigation with JavaScript disabled, including native forms.
  await call("Emulation.setScriptExecutionDisabled", { value: true });
  await navigate(`${baseURL}/top_global/2/0`);
  assert.equal(await evaluate('document.querySelectorAll("main tbody tr").length'), 2);
  assert.ok(await evaluate('document.querySelector("nav[aria-label=\\"Navigation without JavaScript\\"]").getBoundingClientRect().height > 0'));
  const { root } = await call("DOM.getDocument");
  const { nodeId } = await call("DOM.querySelector", { nodeId: root.nodeId, selector: 'main input[name="page"]' });
  await call("DOM.setAttributeValue", { nodeId, name: "value", value: "3" });
  await call("DOM.focus", { nodeId });
  await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" });
  await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await waitFor('location.pathname === "/top_global/2/4" && document.querySelector("main tbody")?.textContent.includes("Ranked <Player> 5")');

  await navigate(`${baseURL}/search?q=noscript`);
  const doc = await call("DOM.getDocument");
  const checkbox = await call("DOM.querySelector", { nodeId: doc.root.nodeId, selector: 'main input[name="exact"]' });
  await call("DOM.focus", { nodeId: checkbox.nodeId });
  await call("Input.dispatchKeyEvent", { type: "rawKeyDown", key: " ", code: "Space", windowsVirtualKeyCode: 32 });
  await call("Input.dispatchKeyEvent", { type: "keyUp", key: " ", code: "Space", windowsVirtualKeyCode: 32 });
  const button = await call("DOM.querySelector", { nodeId: doc.root.nodeId, selector: 'main button[type="submit"]' });
  const { model } = await call("DOM.getBoxModel", { nodeId: button.nodeId });
  const x = (model.content[0] + model.content[4]) / 2;
  const y = (model.content[1] + model.content[5]) / 2;
  await call("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
  await call("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
  await waitFor('new URLSearchParams(location.search).get("exact") === "true" && document.querySelector("main tbody a")?.textContent.includes("noscript")');
  await checkPlayerWithoutScripts({ call, evaluate, waitFor, navigate }, { state, baseURL });
  await checkPublicWithoutScripts({ call, evaluate, waitFor, navigate }, { state, baseURL });
  await checkSitePreferencesWithoutScripts({ call, evaluate, waitFor, navigate }, { baseURL });
  await checkLadderWithoutScripts({ call, evaluate, waitFor, navigate }, { baseURL });
  await checkLadderAboutWithoutScripts({call,evaluate,navigate},{baseURL});
  await checkLadderDistributionWithoutScripts({call,evaluate,navigate},{baseURL});
  await checkLadderMatchupsWithoutScripts({call,evaluate,waitFor,navigate},{baseURL});
  await checkLadderPopularityWithoutScripts({call,evaluate,waitFor,navigate},{baseURL,state});
  await checkLadderStatsWithoutScripts({call,evaluate,navigate},{baseURL});
  await checkLadderPlayerWithoutScripts({call,evaluate,waitFor,navigate},{baseURL});
  await checkLadderRankingsWithoutScripts({ call, evaluate, waitFor, navigate }, { baseURL });
  await checkJapaneseWithoutScripts({call,evaluate,navigate},{baseURL});
  assert.deepEqual(errors, [], "console/hydration errors");
  console.log("Browser checks passed: public/player pages, charts/matrix controls, preferences/theme persistence, client navigation, responsive layout, and JavaScript-disabled content/forms/sorting.");
}));
