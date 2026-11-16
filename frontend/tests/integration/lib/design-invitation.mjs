import assert from "node:assert/strict";

export async function checkDesignInvitation(browser, { baseURL, prefix, game, design }) {
  const { call, navigate, evaluate, waitFor } = browser;
  const url = `${baseURL}${prefix}`;
  async function clear(name) {
    await call("Network.deleteCookies", { name: `${game}-${name}`, url, path: prefix || "/" });
  }
  async function set(name, value) {
    await call("Network.setCookie", { name: `${game}-${name}`, value, url, path: prefix || "/" });
  }
  async function language(value) {
    await call("Network.setExtraHTTPHeaders", { headers: { "Accept-Language": value } });
  }
  const documentDesign = game === "ggst" ? 'document.documentElement.dataset.designPreference' : 'document.documentElement.dataset.design';
  await clear("language");
  await clear("design");
  await language("ko-KR,ja;q=0.8,en;q=0.5");
  await call("Emulation.setDeviceMetricsOverride", { width: 320, height: 900, deviceScaleFactor: 1, mobile: true });
  await navigate(`${url}/settings`);
  await waitFor('!!document.querySelector("dialog[open]")');
  assert.equal(await evaluate('document.documentElement.lang'), "ko");
  assert.equal(await evaluate(documentDesign), "classic");
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  assert.ok(await evaluate('document.querySelector("dialog p").textContent.includes("설정")'));
  await evaluate(`document.querySelector('dialog button[value="${design}"]').click()`);
  await waitFor(`!document.querySelector("dialog[open]") && ${documentDesign} === "${design}" && document.cookie.includes("${game}-design=${design}")`);
  assert.equal(await evaluate(`document.cookie.includes("${game}-language=")`), false, "design choice must not pin the detected language");
  await language("ja-JP,en;q=0.8");
  await navigate(`${url}/settings`);
  await waitFor('document.documentElement.lang === "ja"');
  assert.equal(await evaluate('!!document.querySelector("dialog[open]")'), false);
  await set("language", "en");
  await language("ko-KR");
  await navigate(`${url}/settings`);
  assert.equal(await evaluate('document.documentElement.lang'), "en", "saved language overrides browser");
  for (const locale of ["en", "ko", "ja"]) {
    await set("language", locale);
    await navigate(`${url}/settings`);
    const links = await evaluate(`Array.from(document.querySelectorAll("header a")).map(a=>({href:a.getAttribute("href"),label:a.getAttribute("aria-label")}))`);
    const about = links.findIndex(a=>a.href.endsWith("/about"));
    assert.equal(links[about+1].href,"https://discord.gg/vY4mE8exXB");
    assert.equal(links[about+2].href,"https://patreon.com/nemasu");
    assert.ok(links[about+3].href.endsWith("/settings"));
    for (const width of [320,390,800,801,1000,1100,1101,1280,1281,1440]) {
      await call("Emulation.setDeviceMetricsOverride", {width,height:900,deviceScaleFactor:1,mobile:width<600});
      assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'),true,`${locale} header at ${width}px`);
      assert.equal(await evaluate('Array.from(document.querySelectorAll("header a")).every(a=>{const r=a.getBoundingClientRect(); return r.left>=0&&r.right<=innerWidth})'),true,`${locale} header links fit at ${width}px`);
    }
  }
  await clear("language");
  await clear("design");
  await language("de-DE,fr;q=0.8");
  await navigate(`${url}/settings`);
  await waitFor('!!document.querySelector("dialog[open]")');
  assert.equal(await evaluate('document.documentElement.lang'), "en");
  await evaluate('document.querySelector("dialog button[value=classic]").click()');
  await waitFor(`!document.querySelector("dialog[open]") && document.cookie.includes("${game}-design=classic")`);
  await navigate(`${url}/settings`);
  assert.equal(await evaluate('!!document.querySelector("dialog[open]")'), false);
  await clear("design");
  await navigate(`${url}/settings`);
  await waitFor('!!document.querySelector("dialog[open]")');
  await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await waitFor(`!document.querySelector("dialog[open]") && document.cookie.includes("${game}-design=classic")`);
  await set("language", "en");
  await set("design", "classic");
  await call("Network.setExtraHTTPHeaders", { headers: {} });
  console.log(`${game}: fresh-visit invitation, accept/decline/Escape persistence, browser language and cookie overrides passed.`);
}
