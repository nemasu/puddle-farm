import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { ClassicProvider } from "../components/classic/ClassicProvider";
import { Footer } from "../components/classic/Footer";
import { Navigation } from "../components/classic/Navigation";
import GameNavBar from "../components/GameNavBar";
import { readPreferenceSeed } from "../lib/display-preferences";
import { THEME_COOKIE } from "../lib/theme-preference";
import { BrowserIntegrations } from "../site";

// Every page uses request-time preference cookies and live, uncached API data.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Legend Leaderboard | Guilty Gear Strive | Puddle Farm",
  description:
    "Current Guilty Gear Strive Legend rankings, player ratings, and match history.",
  icons: {
    icon: "/favicon.ico",
    apple: "/logo192.png",
  },
  manifest: "/manifest.json",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const theme = cookieStore.get(THEME_COOKIE)?.value;
  const preferences = readPreferenceSeed(
    (name) => cookieStore.get(name)?.value,
  );
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider>
          <ClassicProvider
            initialTheme={theme}
            initialPreferences={preferences}
          >
            <GameNavBar />
            <Navigation />
            <main>{children}</main>
            <Footer />
            <BrowserIntegrations />
          </ClassicProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
