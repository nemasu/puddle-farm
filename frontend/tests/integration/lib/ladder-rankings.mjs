import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { writeFile } from "node:fs/promises";

export async function checkLadderRankingsSsr({ read, state }) {
  for (const language of ["en", "ko"]) {
    const cookie = `ggst-language=${language}; ggst-design=ladder`;
    for (const path of ["/top_global/2/0", "/top/SO/2/0"]) {
      const { document, response } = await read(path, "Sol", cookie);
      assert.equal(response.status, 200);
      assert.equal(document.querySelector('[data-site-design]').dataset.siteDesign, "ladder");
      if(path.startsWith('/top_global')) {
        assert.equal(document.querySelector('#ranking-title').textContent,'GLOBAL RANKINGS');
        assert.equal(document.querySelector('#ranking-title span').textContent,'RANKINGS');
        assert.deepEqual([...document.querySelectorAll('main > section:first-child ul b')].map(el=>el.textContent),['1,234','800','100','5,678']);
        assert.equal(document.querySelector('main nav a[href="/search"]'),null);
        assert.equal(document.querySelector('main nav a[href="/"]'),null);
      }
      assert.equal(document.querySelectorAll("main table thead th").length, 4, "deviation is not a ranking column");
      assert.equal(document.querySelectorAll("main tbody tr").length, 2);
      assert.ok(document.querySelector('main a[href="/player/9007199254740993/SO"]'));
      assert.ok(document.querySelector(`main a[href="${path.slice(0, -1)}2"]`), "pagination uses the original URL scheme");
      assert.equal(document.querySelector('input[name=page]').value, "1");
    }
    const jumped = await read("/top_global/2/0?page=3", "Sol", cookie);
    assert.equal(jumped.response.status, 307);
    assert.equal(jumped.response.headers.get("location"), "/top_global/2/4");
    const malformed = await read("/top_global/0/0", "Sol", cookie);
    assert.equal(malformed.response.status, 307);
    const unknown = await read("/top/UNKNOWN", "Sol", cookie);
    assert.equal(unknown.response.status, 307);
    const query = '솔 & a/b? <script>';
    const search = await read(`/search?${new URLSearchParams({ q: query, exact: "true" })}`, "Sol", cookie);
    assert.equal(search.document.querySelector('[data-site-design]').dataset.siteDesign, "ladder");
    assert.equal(search.document.querySelectorAll("main table thead th").length, 3, "search results do not invent ranks");
    assert.ok(search.document.querySelector('main a[href="/player/9007199254740993/SO"]'));
    assert.ok(search.document.querySelector("main tbody").textContent.includes(`Search <Player>: ${query}`));
    assert.equal(search.document.querySelector('#player-query').value, query);
    assert.ok(search.document.querySelector('input[name=exact]').checked);
    assert.ok(state.requests.includes(`/api/player/search?${new URLSearchParams({ search_string: query, exact: "true" })}`));
    const blank = await read("/search", "Sol", cookie);
    assert.equal(blank.document.querySelector('main table'), null);
  }
  const cookie = "ggst-language=ko; ggst-design=ladder";
  state.mode = "empty";
  const empty = await read("/top_global", "Sol", cookie);
  assert.ok(empty.document.querySelector("main tbody").textContent.includes("플레이어가 없습니다"));
  assert.deepEqual([...empty.document.querySelectorAll('main > section:first-child ul b')].map(el=>el.textContent),['0','0','0','0']);
  const noResults = await read("/search?q=missing", "Sol", cookie);
  assert.ok(noResults.document.querySelector("main tbody").textContent.includes("검색 결과가 없습니다"));
  state.mode = "failure";
  for (const path of ["/top_global", "/search?q=unavailable"]) {
    const failed = await read(path, "Sol", cookie);
    assert.ok(failed.document.querySelector('main [role=alert]'));
    if(path.startsWith('/top_global')) assert.deepEqual([...failed.document.querySelectorAll('main > section:first-child ul b')].map(el=>el.textContent),['—','—','—','—']);
  }
  state.mode = "success";
}

async function choose(call, baseURL, language, design) {
  for (const [name, value] of [["ggst-language", language], ["ggst-design", design]]) {
    await call("Network.setCookie", { name, value, url: `${baseURL}/`, path: "/" });
  }
}

export async function checkLadderRankingsBrowser({ call, evaluate, waitFor, navigate }, { baseURL, state }) {
  await choose(call, baseURL, "ko", "ladder");
  await navigate(`${baseURL}/top_global/2/0`);
  await evaluate('window.__rankingPage = 1; document.querySelector(\'main a[href="/top_global/2/2"]\').click()');
  await waitFor('location.pathname === "/top_global/2/2" && document.querySelector("main tbody").textContent.includes("Ranked <Player> 3")');
  assert.equal(await evaluate('window.__rankingPage'), 1);
  await evaluate('const page=document.querySelector("main input[name=page]"); page.value="3"; page.form.requestSubmit()');
  await waitFor('location.pathname === "/top_global/2/4" && document.querySelector("main tbody").textContent.includes("Ranked <Player> 5")');
  state.rankingResponses = [];
  try {
    await evaluate('document.querySelector("#ranking-character").value="KY"; window.__characterNavigation = 1');
    await click(call, 'main form button[type=submit]');
    for (let i=0; i<100 && !state.rankingResponses.length; i++) await delay(50);
    assert.ok(state.rankingResponses.length, "target character ranking request must be held");
    await delay(150);
    assert.ok(await evaluate('document.querySelector("main tbody")?.textContent.includes("Ranked <Player> 5")'), `keep the current ranking visible while the new character loads: ${JSON.stringify(await evaluate('({url:location.href, marker:window.__characterNavigation, body:document.body.textContent.slice(0,500)})'))}`);
  } finally {
    for (const finish of state.rankingResponses) finish();
    delete state.rankingResponses;
  }
  await waitFor('location.pathname === "/top/KY" && document.querySelector("main h2").textContent.includes("카이")');
  assert.equal(await evaluate('document.querySelector("#ranking-character").value'), "KY");
  await navigate(`${baseURL}/search`);
  const query = "솔 & a/b?";
  await evaluate('document.querySelector("#player-query").focus()');
  await call("Input.insertText", { text: query });
  await click(call, 'input[name=exact]');
  await waitFor(`document.querySelector('main tbody')?.textContent.includes(${JSON.stringify(query)}) && new URLSearchParams(location.search).get('exact') === 'true'`);
  await click(call, 'input[name=exact]');
  await waitFor('!new URLSearchParams(location.search).has("exact") && !document.querySelector("input[name=exact]").checked');
  await evaluate('history.back()');
  await waitFor('new URLSearchParams(location.search).get("exact") === "true" && document.querySelector("input[name=exact]").checked');
  for (const language of ["en", "ko"]) {
    await choose(call, baseURL, language, "ladder");
    for (const path of ["/top_global/2/0", "/top/KY/2/0", `/search?${new URLSearchParams({ q: query })}`]) {
      for (const width of [1440, 390, 320]) {
        await call("Emulation.setDeviceMetricsOverride", { width, height: 1100, deviceScaleFactor: 1, mobile: width < 600 });
        await navigate(`${baseURL}${path}`);
        await evaluate('document.fonts.ready.then(()=>true); scrollTo(0,0)');
        assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, `${language} ${path} overflow at ${width}px`);
        if (language === "ko" && width !== 320) {
          const shot = await call("Page.captureScreenshot", { format: "png" });
          await writeFile(`/tmp/puddle-public-ladder-${path.startsWith("/search") ? "search" : path.startsWith("/top/") ? "character" : "global"}-${width}.png`, Buffer.from(shot.data, "base64"));
        }
      }
    }
  }
  await choose(call, baseURL, "ko", "classic");
  await navigate(`${baseURL}/top_global/2/0`);
  assert.equal(await evaluate('document.querySelector("[data-site-design]").dataset.siteDesign'), "classic");
  await choose(call, baseURL, "en", "classic");
}

async function click(call, selector) {
  const { root } = await call("DOM.getDocument");
  const { nodeId } = await call("DOM.querySelector", { nodeId: root.nodeId, selector });
  await call("DOM.scrollIntoViewIfNeeded", { nodeId });
  const { model } = await call("DOM.getBoxModel", { nodeId });
  const x=(model.content[0]+model.content[4])/2, y=(model.content[1]+model.content[5])/2;
  await call("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
  await call("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
}

export async function checkLadderRankingsWithoutScripts({ call, evaluate, waitFor, navigate }, { baseURL }) {
  await choose(call, baseURL, "ko", "ladder");
  await navigate(`${baseURL}/top_global/2/0`);
  await click(call, 'main a[href="/top_global/2/2"]');
  await waitFor('location.pathname === "/top_global/2/2" && document.querySelector("main tbody").textContent.includes("Ranked <Player> 3")');
  const { root } = await call("DOM.getDocument");
  const { nodeId } = await call("DOM.querySelector", { nodeId: root.nodeId, selector: 'main input[name=page]' });
  await call("DOM.setAttributeValue", { nodeId, name: "value", value: "3" });
  await click(call, 'main nav form button[type=submit]');
  await waitFor('location.pathname === "/top_global/2/4"');
  await navigate(`${baseURL}/search?q=native`);
  await click(call, 'input[name=exact]');
  await click(call, 'main form button[type=submit]');
  await waitFor('new URLSearchParams(location.search).get("exact") === "true" && document.querySelector("main tbody").textContent.includes("Search <Player>: native")');
  await navigate(`${baseURL}/top_global`);
  const doc = await call("DOM.getDocument");
  const option = await call("DOM.querySelector", { nodeId: doc.root.nodeId, selector: '#ranking-character option[value="SO"]' });
  await call("DOM.setAttributeValue", { nodeId: option.nodeId, name: "selected", value: "" });
  await click(call, 'main form button[type=submit]');
  await waitFor('location.pathname === "/top/SO" && document.querySelector("main table")?.textContent.includes("Ranked <Player>")');
  await choose(call, baseURL, "en", "classic");
}
