import { notFound } from "next/navigation";
import { LegendContent } from "../../components/classic/LegendContent";

export default async function UnknownPage({
  params,
}: {
  params: Promise<{ unmatched: string[] }>;
}) {
  const { unmatched } = await params;
  // Unknown page URLs show Legend; missing API routes and assets return 404.
  if (
    ["api", "_next"].includes(unmatched[0]) ||
    unmatched.at(-1)?.includes(".")
  )
    notFound();
  return <LegendContent />;
}
