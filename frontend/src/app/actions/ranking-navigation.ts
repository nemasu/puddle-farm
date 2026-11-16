"use server";

import { redirect } from "next/navigation";
import { getCharacters } from "../../lib/server/characters";

export async function selectRankingCharacter(form: FormData): Promise<void> {
  const character = form.get("character");
  let valid = false;
  if (typeof character === "string" && character) {
    try {
      valid = Object.hasOwn(await getCharacters(), character);
    } catch {
      // Keep the global leaderboard available if the character menu cannot load.
    }
  }
  const path = valid
    ? `/top/${encodeURIComponent(character as string)}`
    : "/top_global";
  redirect(path);
}
