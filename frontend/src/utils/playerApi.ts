import { API_ENDPOINT } from "../lib/api-endpoint";

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
