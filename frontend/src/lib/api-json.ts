import { JSONParse } from "../utils/jsonParse";

const PLAYER_ID_FIELDS = new Set(["id", "player_id", "opponent_id"]);

export function parseApiJson<T>(text: string): T {
  return JSONParse(text, (key, value) => {
    if (!PLAYER_ID_FIELDS.has(key) || typeof value === "bigint") return value;
    if (
      (typeof value === "number" && Number.isSafeInteger(value)) ||
      (typeof value === "string" && /^-?\d+$/.test(value))
    )
      return BigInt(value);
    throw new TypeError(`Invalid player ID in ${key}`);
  }) as T;
}
