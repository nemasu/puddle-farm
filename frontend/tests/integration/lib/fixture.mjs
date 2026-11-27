import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { once } from "node:events";
import { createServer, request as proxyRequest } from "node:http";
import { respondPlayerFixture } from "./player-fixture.mjs";
import { respondPublicFixture } from "./public-fixture.mjs";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const frontendRoot = fileURLToPath(new URL("../../../", import.meta.url));
const execute = promisify(execFile);

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return server.address().port;
}

function numericIds(value) {
  // Fixture IDs are deliberately raw JSON integers, as in the Rust responses.
  return JSON.stringify(value).replace(/"id":"(\d+)"/g, '"id":$1');
}

export async function withNextFixture(check) {
  const state = { mode: "success", healthWarning: null, requests: [], playerSyncs: 0, syncFailure: false, historyFailure: false, playerEmpty: false, slowProfile: false, pendingProfile: 0 };
  const lastUpdate = new Date().toISOString().slice(0, 19).replace("T", " ");
  const fixture = createServer((request, response) => {
    state.requests.push(request.url);
    const url = new URL(request.url, "http://fixture");
    if (request.method === "POST" && /^\/api\/profile_refresh\/\d+$/.test(url.pathname)) {
      state.profileRefreshed = true;
      response.writeHead(204).end();
      return;
    }
    response.setHeader("Content-Type", "application/json");
    if (url.pathname === "/api/ingestion/health") {
      response.setHeader("Content-Type", "text/plain");
      response.writeHead(state.healthWarning ? 503 : 200).end(state.healthWarning ?? "healthy");
      return;
    }
    if (url.pathname === "/api/characters") {
      const send = () => response.end(JSON.stringify(state.characterNames ?? [["SO", "Sol Badguy"], ["KY", "Ky Kiske"]]));
      if (state.characterResponses) state.characterResponses.push(send);
      else send();
      return;
    }
    if (respondPublicFixture(url, response, state)) return;
    if (respondPlayerFixture(url, response, state)) return;
    const isLegend = url.pathname === "/api/top_legend";
    const isRanking = isLegend || url.pathname === "/api/top" || url.pathname.startsWith("/api/top_char/");
    const isSearch = url.pathname === "/api/player/search";
    if (!isRanking && !isSearch) {
      response.writeHead(404).end("{}");
      return;
    }
    if (state.mode === "failure") {
      response.writeHead(503).end('{"error":"unavailable"}');
      return;
    }
    if (url.pathname.includes("/top_char/") && !["SO", "KY"].includes(url.pathname.split("/").at(-1))) {
      response.writeHead(404).end("Character not found");
      return;
    }
    if (isSearch) {
      response.end(numericIds({ results: state.mode === "empty" ? [] : [{
        id: "9007199254740993", name: `Search <Player>: ${url.searchParams.get("search_string")}`,
        char_short: "SO", char_long: "Sol Badguy", rating: 1800, deviation: 50,
      }] }));
      return;
    }
    const count = Number(url.searchParams.get("count") ?? 100);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const character = url.pathname.includes("/top_char/") ? url.pathname.split("/").at(-1) : "SO";
    const ranks = Array.from({ length: 5 }, (_, index) => ({
      id: isLegend ? String(76561198000000001n + BigInt(index)) : String(9007199254740993n + BigInt(index)),
      rank: index + 1, name: isLegend ? `SSR <Player>${index ? ` ${index + 1}` : ""}` : `Ranked <Player> ${index + 1}`,
      char_short: isLegend && index % 2 ? "KY" : character,
      char_long: isLegend && index % 2 ? "Ky Kiske" : character === "SO" ? "Sol Badguy" : "Ky Kiske",
      rating: 10001800 - index * 100, is_legend: index === 0,
      tags: index === 0 ? [{ tag: "Supporter", style: '{"color":"red"}' }] : [],
    }));
    const body = numericIds({ ranks: state.mode === "empty" ? [] : ranks.slice(offset, offset + count), last_update: lastUpdate });
    if (state.rankingResponses && url.pathname.includes("/top_char/")) state.rankingResponses.push(() => response.end(body));
    else response.end(body);
  });
  const fixturePort = await listen(fixture);
  const reservation = createServer();
  const appPort = await listen(reservation);
  await new Promise((resolve) => reservation.close(resolve));
  const healthReservation = createServer();
  const healthPort = await listen(healthReservation);
  await new Promise((resolve) => healthReservation.close(resolve));
  let logs = "";
  const image = process.env.GGST_TEST_CONTAINER_IMAGE;
  const engine = process.env.GGST_CONTAINER_ENGINE ?? "podman";
  const containerName = `ggst-next-test-${process.pid}-${appPort}`;
  const apiOrigin = `http://127.0.0.1:${fixturePort}`;
  const command = image ? engine : process.execPath;
  const args = image ? [
    "run", "--rm", "--name", containerName, "--network=host",
    "--read-only", "--user=1000:1000", "--cap-drop=ALL", "--security-opt=no-new-privileges",
    "--memory=1g", "--cpus=2",
    "--tmpfs=/tmp:rw,nosuid,nodev,mode=1777",
    "--tmpfs=/app/.next/cache:rw,nosuid,nodev,mode=1777",
    "--env", `PORT=${appPort}`, "--env", "HOSTNAME=0.0.0.0",
    "--env", `FRONTEND_HEALTH_PORT=${healthPort}`, "--env", "FRONTEND_WORKERS=2",
    "--env", `GGST_API_INTERNAL_URL=${apiOrigin}`, image,
  ] : ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(appPort)];
  const server = spawn(command, args, {
    cwd: frontendRoot,
    env: { ...process.env, GGST_API_INTERNAL_URL: apiOrigin },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (chunk) => { logs += chunk; });
  server.stderr.on("data", (chunk) => { logs += chunk; });
  // Simulate production gateway routing for browser images, sync and range reads.
  const gateway = createServer((incoming, outgoing) => {
    const port = incoming.url.startsWith("/api/") ? fixturePort : appPort;
    const path = incoming.url === "/robots.txt" ? "/robots.txt" : incoming.url;
    const proxy = proxyRequest({ hostname: "127.0.0.1", port, path, method: incoming.method, headers: incoming.headers }, (response) => {
      outgoing.writeHead(response.statusCode, response.headers);
      response.pipe(outgoing);
    });
    proxy.on("error", () => { if (!outgoing.headersSent) outgoing.writeHead(502); outgoing.end(); });
    incoming.pipe(proxy);
  });
  const gatewayPort = await listen(gateway);
  const baseURL = `http://127.0.0.1:${gatewayPort}`;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (server.exitCode !== null) throw new Error(`Next.js exited early:\n${logs}`);
      try {
        const response = await fetch(`${baseURL}/favicon.ico`, { signal: AbortSignal.timeout(1000) });
        if (response.ok) {
          const health = image ? await fetch(`http://127.0.0.1:${healthPort}/health`, { signal: AbortSignal.timeout(1000) }) : null;
          if (!image || health.ok) { ready = true; break; }
        }
        await delay(100);
      } catch { await delay(100); }
    }
    if (!ready) throw new Error(`Next.js did not start:\n${logs}`);
    // Kubernetes probes do not depend on image-format HEALTHCHECK metadata.
    if (image) await execute(engine, ["exec", containerName, "node", "-e",
      "fetch('http://127.0.0.1:' + process.env.FRONTEND_HEALTH_PORT + '/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]);
    await check({ state, baseURL });
  } catch (error) {
    console.error(logs);
    throw error;
  } finally {
    const gatewayClosed = new Promise((resolve) => gateway.close(resolve));
    gateway.closeAllConnections();
    await gatewayClosed;
    if (image) await execute(engine, ["stop", "--time", "5", containerName]).catch(() => {});
    if (server.exitCode === null && server.signalCode === null) {
      server.kill("SIGTERM");
      await once(server, "exit");
    }
    await new Promise((resolve) => fixture.close(resolve));
  }
}
