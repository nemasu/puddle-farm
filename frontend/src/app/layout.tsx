import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { ClassicProvider } from "../components/classic/ClassicProvider";
import { DesignInvitation } from "../components/DesignInvitation";
import { readPreferenceSeed } from "../lib/display-preferences";
import { getRequestPresentation } from "../lib/server/site-preferences";
import { THEME_COOKIE } from "../lib/theme-preference";
import { BrowserIntegrations } from "../site";

// Every page uses request-time preference cookies and live, uncached API data.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { messages } = await getRequestPresentation();
  return {
    title: messages.metadata.title,
    description: messages.metadata.description,
    icons: {
      icon: "/favicon.ico",
      apple: "/logo192.png",
    },
    manifest: "/manifest.json",
  };
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const presentation = await getRequestPresentation();
  const cookieStore = await cookies();
  const theme = cookieStore.get(THEME_COOKIE)?.value;
  const preferences = readPreferenceSeed(
    (name) => cookieStore.get(name)?.value,
  );
  return (
    <html
      lang={presentation.language}
      data-design-preference={presentation.designPreference}
      data-preferred-design={presentation.preferredDesign}
    >
      <body>
        <AppRouterCacheProvider>
          <ClassicProvider
            initialTheme={theme}
            initialPreferences={preferences}
          >
            {children}
            <DesignInvitation
              enabled={!presentation.hasDesignPreference}
              copy={presentation.messages.designInvitation}
            />
            <BrowserIntegrations />
          </ClassicProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
