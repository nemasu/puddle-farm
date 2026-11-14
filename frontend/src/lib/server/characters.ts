import "server-only";

import { readJson } from "./api";

export async function getCharacters(): Promise<Record<string, string>> {
  return Object.fromEntries(await readJson<[string, string][]>("/characters"));
}
