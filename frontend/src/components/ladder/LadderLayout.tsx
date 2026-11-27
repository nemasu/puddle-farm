import localFont from "next/font/local";
import Image from "next/image";
import type { ReactNode } from "react";
import { getMessages } from "../../lib/i18n";
import { getIngestionStatus } from "../../lib/server/ingestion";
import { getRequestPresentation } from "../../lib/server/site-preferences";
import type { Language } from "../../lib/site-preferences";
import { FooterExtras } from "../../site";
import { AppLink as Link } from "../AppLink";
import { IngestionStatus } from "./IngestionStatus";
import { LadderThemeProvider } from "./LadderThemeProvider";
import styles from "./ladder.module.css";

const displayFont = localFont({
  src: "./fonts/BlackHanSans-Regular.ttf",
  display: "swap",
  variable: "--ladder-display-font",
});

export async function LadderLayout({
  children,
  language,
  legend = true,
  section = "rankings",
}: {
  children: ReactNode;
  language: Language;
  legend?: boolean;
  section?:
    | "rankings"
    | "stats"
    | "activity"
    | "search"
    | "about"
    | "settings"
    | "terms"
    | "missing";
}) {
  const messages = getMessages(language);
  const { ladderTheme } = await getRequestPresentation();
  const initialMessage = await getIngestionStatus(
    messages.common.ingestionError,
  );
  return (
    <div
      className={`${styles.site} ${displayFont.variable}`}
      data-site-design="ladder"
      data-ladder-theme={ladderTheme}
      id="top"
    >
      <a className={styles.skip} href="#ladder-main">
        {messages.common.skipToContent}
      </a>
      <header className={styles.topbar}>
        <Link className={styles.brand} href="/">
          PUDDLE <span>FARM</span>
        </Link>
        <div className={styles.topbarInner}>
          <nav className={styles.games} aria-label={messages.common.games}>
            <Link href="/" aria-current="true" className={styles.activeGame}>
              GGST
            </Link>
          </nav>
          <nav className={styles.tabs} aria-label={messages.common.menu}>
            <Link
              className={section === "rankings" ? styles.activeTab : undefined}
              href="/"
              aria-current={legend ? "page" : undefined}
            >
              {messages.ladder.rankings}
            </Link>
            <Link
              href="/popularity"
              className={section === "stats" ? styles.activeTab : undefined}
            >
              {messages.ladder.characterStats}
            </Link>
            <Link
              href="/search"
              className={section === "search" ? styles.activeTab : undefined}
              aria-current={section === "search" ? "page" : undefined}
            >
              {messages.common.search}
            </Link>
            <Link
              href="/stats"
              className={section === "activity" ? styles.activeTab : undefined}
              aria-current={section === "activity" ? "page" : undefined}
            >
              {messages.ladder.activity}
            </Link>
            <Link
              href="/about"
              className={section === "about" ? styles.activeTab : undefined}
              aria-current={section === "about" ? "page" : undefined}
            >
              {messages.navigation.about}
            </Link>
          </nav>
          <div className={styles.social}>
            <a
              href="https://discord.gg/vY4mE8exXB"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={messages.common.discord}
            >
              <Image
                src="/discord-mark-white.svg"
                width={26}
                height={20}
                alt=""
              />
            </a>
            <a
              href="https://patreon.com/nemasu"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={messages.common.patreon}
            >
              <Image
                src="/patreon-mark-white.svg"
                width={24}
                height={24}
                alt=""
              />
            </a>
          </div>
          <Link
            className={styles.settings}
            href="/settings"
            aria-label={messages.navigation.settings}
          >
            {language === "ja"
              ? "日本語"
              : language === "ko"
                ? "한국어"
                : "English"}
            <span aria-hidden="true"> / </span>
            {messages.navigation.settings}
          </Link>
        </div>
      </header>
      <IngestionStatus initialMessage={initialMessage} language={language} />
      <main id="ladder-main">
        <LadderThemeProvider preference={ladderTheme}>
          {children}
        </LadderThemeProvider>
      </main>
      <footer className={styles.footer}>
        <Link className={styles.footerBrand} href="/">
          PUDDLE <span>FARM</span>
        </Link>
        <p>{messages.footer.contribute}</p>
        <div className={styles.footerLinks}>
          <a
            href="https://github.com/nemasu/puddle-farm"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={messages.footer.github}
          >
            GitHub
          </a>
          <a
            href="https://discord.gg/vY4mE8exXB"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={messages.common.discord}
          >
            Discord
          </a>
          <a
            href="https://patreon.com/nemasu"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={messages.common.patreon}
          >
            Patreon
          </a>
          <Link href="/terms">{messages.footer.terms}</Link>
          <Link href="/settings">{messages.navigation.settings}</Link>
        </div>
        <FooterExtras />
        <p>{messages.footer.disclaimer}</p>
        <a className={styles.topLink} href="#top">
          ▲ {messages.ladder.backToTop}
        </a>
      </footer>
    </div>
  );
}
