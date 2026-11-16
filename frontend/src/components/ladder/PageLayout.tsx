import type { ReactNode } from "react";
import { getRequestPresentation } from "../../lib/server/site-preferences";
import { ClassicLayout } from "../classic/ClassicLayout";
import { LadderLayout } from "./LadderLayout";

export async function LadderPageLayout({
  children,
  section = "rankings",
  legend = false,
}: {
  children: ReactNode;
  legend?: boolean;
  section?: "rankings" | "stats" | "about" | "settings" | "terms" | "missing";
}) {
  const presentation = await getRequestPresentation();
  return presentation.design === "ladder" ? (
    <LadderLayout
      language={presentation.language}
      legend={legend}
      section={section}
    >
      {children}
    </LadderLayout>
  ) : (
    <ClassicLayout>{children}</ClassicLayout>
  );
}
