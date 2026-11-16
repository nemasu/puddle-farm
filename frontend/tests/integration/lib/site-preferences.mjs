import assert from "node:assert/strict";

export async function checkSitePreferencesSsr({ read }) {
  for (const [language, preference, preferred] of [
    ["ja", "classic", "classic"], ["ja", "ladder", "ladder"],
    ["en", "classic", "classic"], ["ko", "classic", "classic"],
    ["en", "ladder", "ladder"], ["ko", "ladder", "ladder"],
  ]) {
    const { response, document } = await read("/settings", "Sol", `ggst-language=${language}; ggst-design=${preference}`);
    assert.equal(response.status, 200);
    assert.equal(document.documentElement.lang, language);
    assert.equal(document.documentElement.dataset.designPreference, preference);
    assert.equal(document.documentElement.dataset.preferredDesign, preferred);
    assert.equal(document.querySelector("[data-site-design]").dataset.siteDesign, preferred, "settings follows the selected design");
    assert.equal(document.querySelector("#site-language").value, language);
    assert.equal(document.querySelector("#site-design").value, preferred);
    assert.deepEqual([...document.querySelectorAll('#site-design option')].map(option=>option.value),['classic','ladder']);
    assert.equal(document.querySelector('#design-availability'),null);
    assert.equal(document.querySelector("main h1").textContent.trim(), language === "ja" ? "言語とデザイン" : language === "ko" ? "언어 및 디자인" : "Language & Design");
    assert.ok(document.title.includes(language === "ja" ? "設定" : language === "ko" ? "설정" : "Settings"));
    assert.ok(document.querySelector("footer").textContent.includes(language === "ja" ? "利用規約" : language === "ko" ? "이용약관" : "Terms & Privacy"));
    assert.ok(document.querySelector('#site-language').closest('form').querySelector('input[name^="$ACTION_ID_"]'), "native form must have a server action");
  }
  const [english, korean] = await Promise.all([
    read("/", "Sol", "ggst-language=en; ggst-design=classic"),
    read("/", "Sol", "ggst-language=ko; ggst-design=classic"),
  ]);
  assert.equal(english.document.documentElement.lang, "en");
  assert.equal(korean.document.documentElement.lang, "ko");
  assert.ok(korean.document.querySelector('a[href="/settings"]').textContent.includes("설정"));
  assert.ok(korean.document.querySelector("main table").textContent.includes("SSR <Player>"), "backend player names must retain their original text");
  const invalid = await read("/settings", "Sol", "ggst-language=unsupported; ggst-design=unknown");
  assert.equal(invalid.document.documentElement.lang, "en");
  assert.equal(invalid.document.documentElement.dataset.designPreference, "classic");
}

export async function checkSitePreferencesBrowser({ call, evaluate, waitFor, navigate }, { baseURL }) {
  const appearanceCookies = () => evaluate('document.cookie.split("; ").filter(value => /^(ggst-theme|ggst-local-time|ggst-plain-ratings|ggst-auto-update|ggst-timezone)=/.test(value)).sort()');
  await navigate(`${baseURL}/settings`);
  const appearance = await appearanceCookies();
  for (const [language, design, preferred] of [
    ["ja", "ladder", "ladder"], ["ja", "classic", "classic"],
    ["ko", "ladder", "ladder"], ["ko", "classic", "classic"],
    ["en", "classic", "classic"], ["en", "ladder", "ladder"],
    ["ko", "ladder", "ladder"], ["en", "classic", "classic"],
  ]) {
    await evaluate(`(() => {
      document.querySelector('#site-language').value = ${JSON.stringify(language)};
      document.querySelector('#site-design').value = ${JSON.stringify(design)};
      document.querySelector('#site-language').form.requestSubmit();
    })()`);
    await waitFor(`document.documentElement.lang === ${JSON.stringify(language)} && document.documentElement.dataset.designPreference === ${JSON.stringify(design)} && document.documentElement.dataset.preferredDesign === ${JSON.stringify(preferred)}`);
    assert.equal(await evaluate('document.querySelector("[data-site-design]").dataset.siteDesign'), preferred);
    assert.equal(await evaluate('document.querySelector("main h1").textContent.trim()'), language === "ja" ? "言語とデザイン" : language === "ko" ? "언어 및 디자인" : "Language & Design");
    assert.deepEqual(await appearanceCookies(), appearance, "language/design saves must not overwrite character theme or display preferences");
    await navigate(`${baseURL}/`);
    assert.equal(await evaluate('document.documentElement.lang'), language, "preference must persist on direct navigation");
    await navigate(`${baseURL}/settings`);
    assert.equal(await evaluate('document.querySelector("#site-design").value'), design);
    if (language === "ko") {
      for (const width of [1280, 390]) {
        await call("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: width < 600 });
        assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, `Korean settings overflow at ${width}px`);
      }
    }
  }
}

export async function checkSitePreferencesWithoutScripts({ call, evaluate, waitFor, navigate }, { baseURL }) {
  await navigate(`${baseURL}/settings`);
  for (const [language, design] of [["ja", "ladder"], ["ja", "classic"], ["ko", "ladder"], ["en", "classic"]]) {
    const { root } = await call("DOM.getDocument");
    for (const [id, value] of [["site-language", language], ["site-design", design]]) {
      const selected = await call("DOM.querySelector", { nodeId: root.nodeId, selector: `#${id} option[selected]` });
      if (selected.nodeId) await call("DOM.removeAttribute", { nodeId: selected.nodeId, name: "selected" });
      const option = await call("DOM.querySelector", { nodeId: root.nodeId, selector: `#${id} option[value="${value}"]` });
      await call("DOM.setAttributeValue", { nodeId: option.nodeId, name: "selected", value: "" });
    }
    const button = await call("DOM.querySelector", { nodeId: root.nodeId, selector: "main form button[type=submit]" });
    await call("DOM.scrollIntoViewIfNeeded", { nodeId: button.nodeId });
    const { model } = await call("DOM.getBoxModel", { nodeId: button.nodeId });
    const x = (model.content[0] + model.content[4]) / 2;
    const y = (model.content[1] + model.content[5]) / 2;
    await call("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
    await call("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
    await waitFor(`document.documentElement.lang === ${JSON.stringify(language)} && document.documentElement.dataset.designPreference === ${JSON.stringify(design)}`);
    await navigate(`${baseURL}/settings`);
    assert.equal(await evaluate('document.documentElement.lang'), language, "native save must persist without JavaScript");
  }
}
