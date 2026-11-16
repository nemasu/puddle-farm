import type { ReactNode } from "react";
import { getRequestPresentation } from "../../lib/server/site-preferences";
import GameNavBar from "../GameNavBar";
import { Footer } from "./Footer";
import { Navigation } from "./Navigation";

export async function ClassicLayout({ children }: { children: ReactNode }) {
  const { language } = await getRequestPresentation();
  return (
    <div data-site-design="classic">
      <GameNavBar language={language} />
      <Navigation />
      <main>{children}</main>
      <Footer language={language} />
    </div>
  );
}
