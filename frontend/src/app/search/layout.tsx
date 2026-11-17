import type { ReactNode } from "react";
import { LadderPageLayout } from "../../components/ladder/PageLayout";

export default function SearchLayout({ children }: { children: ReactNode }) {
  return <LadderPageLayout section="search">{children}</LadderPageLayout>;
}
