import type { ReactNode } from "react";
import { LadderPageLayout } from "../../components/ladder/PageLayout";
export default function AboutLayout({ children }: { children: ReactNode }) {
  return <LadderPageLayout section="about">{children}</LadderPageLayout>;
}
