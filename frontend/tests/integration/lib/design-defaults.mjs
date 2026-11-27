import assert from "node:assert/strict";

export async function checkDesignDefaults(browser, { baseURL, prefix, game, design }) {
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
  await navigate(`${url}/settings`);
  await waitFor(`${documentDesign} === "${design}"`);
  assert.equal(await evaluate('document.documentElement.lang'), "ko");
  assert.equal(await evaluate('!!document.querySelector("dialog")'), false);
  await language("ja-JP,en;q=0.8");
  await navigate(`${url}/settings`);
  assert.equal(await evaluate('document.documentElement.lang'), "ja");
  assert.equal(await evaluate(documentDesign), design);
  for (const saved of ["classic", design, "invalid"]) {
    await set("design", saved);
    await navigate(`${url}/settings`);
    assert.equal(await evaluate(documentDesign), saved === "invalid" ? design : saved);
    assert.equal(await evaluate('!!document.querySelector("dialog")'), false);
  }
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
  assert.equal(await evaluate('document.documentElement.lang'), "en");
  assert.equal(await evaluate(documentDesign), design);
  assert.equal(await evaluate('!!document.querySelector("dialog")'), false);
  await set("language", "en");
  await set("design", "classic");
  await call("Network.setExtraHTTPHeaders", { headers: {} });
  console.log(`${game}: default design, saved choices, no invitation, browser language and cookie overrides passed.`);
}
