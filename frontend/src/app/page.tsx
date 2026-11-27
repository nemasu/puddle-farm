import { ClassicLayout } from "../components/classic/ClassicLayout";
import { LegendContent } from "../components/classic/LegendContent";
import { LadderLayout } from "../components/ladder/LadderLayout";
import { LadderLegendContent } from "../components/ladder/LegendContent";
import type { PageSearchParams } from "../lib/pagination";
import { getRequestPresentation } from "../lib/server/site-preferences";
import { localizedMetadata } from "../lib/server-metadata";

export async function generateMetadata() {
  const { messages } = await getRequestPresentation();
  return localizedMetadata({ title: messages.metadata.title });
}

export default async function LegendPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  const presentation = await getRequestPresentation();
  return presentation.design === "ladder" ? (
    <LadderLayout language={presentation.language}>
      <LadderLegendContent
        language={presentation.language}
        params={await searchParams}
      />
    </LadderLayout>
  ) : (
    <ClassicLayout>
      <LegendContent />
    </ClassicLayout>
  );
}
