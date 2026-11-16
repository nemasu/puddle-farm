import { notFound } from "next/navigation";
import { LegendContent } from "../../components/classic/LegendContent";
import { LadderLegendContent } from "../../components/ladder/LegendContent";
import type { PageSearchParams } from "../../lib/pagination";
import { getRequestPresentation } from "../../lib/server/site-preferences";

export default async function UnknownPage({
  params,
  searchParams,
}: {
  params: Promise<{ unmatched: string[] }>;
  searchParams: Promise<PageSearchParams>;
}) {
  const { unmatched } = await params;
  // Unknown page URLs show Legend; missing API routes and assets return 404.
  if (
    ["api", "_next"].includes(unmatched[0]) ||
    unmatched.at(-1)?.includes(".")
  )
    notFound();
  const { design, language } = await getRequestPresentation();
  return design === "ladder" ? (
    <LadderLegendContent language={language} params={await searchParams} />
  ) : (
    <LegendContent />
  );
}
