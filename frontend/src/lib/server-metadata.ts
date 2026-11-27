import "server-only";
import type { Metadata } from "next";
import { pageMetadata } from "./metadata";
import { getRequestPresentation } from "./server/site-preferences";
export async function localizedMetadata(input: Metadata): Promise<Metadata> {
  return pageMetadata(input, (await getRequestPresentation()).language);
}
