import type {
  PlayerGamesResponse,
  PlayerResponse,
  TagResponse,
} from "../interfaces/API";
import { JSONParse } from "../utils/JSONParse";

export const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT ?? "/api";

export async function fetchPlayer(player_id: bigint): Promise<PlayerResponse> {
  const res = await fetch(`${API_ENDPOINT}/player/${player_id}`);
  const data: PlayerResponse = await res.text().then((b) => JSONParse(b));
  for (const key in data.ratings) {
    data.ratings[key].rating = Number(
      Number(data.ratings[key].rating).toFixed(2),
    );
  }
  return data;
}

export async function fetchHistory(
  player_id: bigint,
  char_short: string,
  count: string | undefined,
  offset: string | undefined,
): Promise<PlayerGamesResponse | null> {
  const has_offset = !!offset && offset !== "0";
  const c = has_offset ? Number(count) + 1 : 100;
  const o = has_offset ? Number(offset) - 1 : 0;
  const url = `${API_ENDPOINT}/player/${player_id}/${char_short}/history?count=${c}&offset=${o}`;

  const res = await fetch(url);
  if (res.status !== 200) return null;

  const data = await res.text().then((b) => JSONParse(b));
  const tags: { [key: string]: TagResponse[] } = {};
  for (const [id, arr] of Object.entries(data.tags)) {
    tags[id] = (arr as TagResponse[]).map((t) => ({
      tag: t.tag,
      style: t.style,
    }));
  }
  return { history: data.history, tags };
}

export async function fetchAlias(
  player_id: bigint,
  currentName: string,
): Promise<string[]> {
  const res = await fetch(`${API_ENDPOINT}/alias/${player_id}`);
  if (res.status !== 200) return [];
  const data: string[] | null = await res.json();
  if (!data) return [];
  return data.filter((name) => name !== currentName);
}

export async function fetchAvatar(player_id: bigint): Promise<string | null> {
  const res = await fetch(`${API_ENDPOINT}/avatar/${player_id}`);
  if (res.status !== 200) return null;
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function fetchComment(player_id: bigint): Promise<string | null> {
  const res = await fetch(`${API_ENDPOINT}/comment/${player_id}`);
  if (res.status !== 200) return null;
  return res.text();
}

export async function fetchRatingSync(
  player_id: bigint,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${API_ENDPOINT}/rating_sync/${player_id}`);
    const text = await res.text();
    if (res.ok) return { ok: true };
    return { ok: false, error: text };
  } catch {
    return { ok: false, error: "Failed to connect to server" };
  }
}
