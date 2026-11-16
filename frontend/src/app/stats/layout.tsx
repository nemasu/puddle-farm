import type { ReactNode } from "react";
import { LadderPageLayout } from "../../components/ladder/PageLayout";
export default function StatsLayout({ children }: { children: ReactNode }) {
  return <LadderPageLayout section="stats">{children}</LadderPageLayout>;
}
