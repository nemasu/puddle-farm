import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";

async function waitQueue(queue) {
  for (let i = 0; i < 100 && !queue.length; i++) await delay(50);
  assert.ok(queue.length, "expected a held core API request");
}

export async function checkPlayerTransition({ call, evaluate, waitFor, navigate }, { baseURL, state }) {
  await call("Emulation.setDeviceMetricsOverride", { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate(`${baseURL}/about`);
  await evaluate('scrollTo(0,0); window.__previousMain = document.querySelector("main"); window.__pageFrames = []; window.__recordFrames = true; (() => { const record = () => { if (!window.__recordFrames) return; const main = document.querySelector("main"); window.__pageFrames.push({ heading: main?.querySelector("h1")?.textContent || "", history: !!main?.querySelector(\'section[aria-label="Match history"]\') }); requestAnimationFrame(record); }; requestAnimationFrame(record); })()');
  state.playerResponses = [];
  state.historyResponses = [];
  state.slowProfile = true;
  state.profileResponses = [];
  const unchanged = async (phase) => {
    await delay(150);
    assert.equal(await evaluate('document.querySelector("main") === window.__previousMain && document.querySelector("main h1")?.textContent === "About"'), true, `About must remain visible while ${phase}`);
  };
  try {
    await evaluate('document.querySelector(\'main a[href="/player/9007199254740993"]\').click()');
    await waitQueue(state.playerResponses);
    await unchanged("resolving the default character");
    for (const finish of state.playerResponses.splice(0)) finish();
    await waitQueue(state.playerResponses);
    await unchanged("loading the canonical player route");
    for (const finish of state.playerResponses.splice(0)) finish();
    await waitQueue(state.historyResponses);
    await unchanged("loading core match history");
    for (const finish of state.historyResponses.splice(0)) finish();
    await waitFor('document.querySelector("main h1")?.textContent === "Player <SSR>" && !!document.querySelector(\'section[aria-label="Match history"]\')');
    assert.ok(state.pendingProfile > 0, "optional profile data must not delay the transition");
    await evaluate('window.__recordFrames = false');
    const frames = await evaluate('window.__pageFrames');
    assert.ok(frames.length > 0);
    assert.ok(frames.every(frame => frame.heading === "About" || (frame.heading === "Player <SSR>" && frame.history)), `no header-only/partial frame: ${JSON.stringify(frames.filter(frame => frame.heading !== "About"))}`);
  } finally {
    for (const key of ["playerResponses", "historyResponses", "profileResponses"]) {
      for (const finish of state[key] ?? []) finish();
      delete state[key];
    }
    state.slowProfile = false;
    await evaluate('window.__recordFrames = false');
  }
}
