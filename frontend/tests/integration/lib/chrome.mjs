import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

// CDP driver for browser checks using the locally installed Chrome.
export async function withChrome(check) {
  const profile = await mkdtemp(join(tmpdir(), "ggst-chrome-"));
  const chrome = spawn(process.env.CHROME_BIN ?? "google-chrome", [
    "--headless", "--no-sandbox", "--disable-dev-shm-usage", "--no-first-run",
    "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });
  let socket;
  try {
    const endpoint = await new Promise((resolve, reject) => {
      let stderr = "";
      const timeout = setTimeout(() => reject(new Error(`Chrome startup timed out: ${stderr}`)), 10_000);
      chrome.once("error", (error) => { clearTimeout(timeout); reject(error); });
      chrome.stderr.on("data", (chunk) => {
        stderr += chunk;
        const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if (match) { clearTimeout(timeout); resolve(match[1]); }
      });
    });
    socket = new WebSocket(endpoint);
    await once(socket, "open");
    let sequence = 0;
    const pending = new Map();
    const errors = [];
    const requests = [];
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const handler = pending.get(message.id);
        if (handler) {
          pending.delete(message.id);
          clearTimeout(handler.timeout);
          message.error ? handler.reject(new Error(JSON.stringify(message.error))) : handler.resolve(message.result);
        }
      }
      if (message.method === "Runtime.exceptionThrown") errors.push(JSON.stringify(message.params));
      if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") errors.push(JSON.stringify(message.params));
      if (message.method === "Network.requestWillBeSent") requests.push(message.params.request.url);
    });
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
      const id = ++sequence;
      const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Chrome command timed out: ${method}`)); }, 10_000);
      pending.set(id, { resolve, reject, timeout });
      socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
    const { targetId } = await send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    const call = (method, params) => send(method, params, sessionId);
    await call("Runtime.enable");
    await call("Page.enable");
    await call("Network.enable");
    async function evaluate(expression) {
      const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    }
    async function waitFor(expression) {
      for (let attempt = 0; attempt < 100; attempt++) {
        try { if (await evaluate(expression)) return; } catch { /* navigation can destroy the old execution context */ }
        await delay(100);
      }
      const snapshot = await evaluate('({url:location.href,active:document.activeElement?.outerHTML?.slice(0,300),content:document.querySelector("main")?.textContent?.slice(0,2000)})');
      throw new Error(`Browser condition timed out: ${expression}\n${JSON.stringify(snapshot)}`);
    }
    async function navigate(url) {
      await call("Page.navigate", { url });
      await waitFor(`location.href === ${JSON.stringify(url)} && document.readyState === "complete" && !!document.querySelector("main")`);
    }
    await check({ call, evaluate, waitFor, navigate, errors, requests });
  } finally {
    socket?.close();
    if (chrome.exitCode === null && chrome.signalCode === null) {
      chrome.kill("SIGTERM");
      await once(chrome, "exit");
    }
    await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
}
