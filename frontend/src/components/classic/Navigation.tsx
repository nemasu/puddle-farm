import { characterLabel } from "../../lib/ladder-characters";
import { CLASSIC_NAVIGATION } from "../../lib/navigation";
import { getCharacters } from "../../lib/server/characters";
import { getIngestionStatus } from "../../lib/server/ingestion";
import { getRequestPresentation } from "../../lib/server/site-preferences";
import NavigationControls from "./NavigationControls";

export async function Navigation() {
  const { language, messages } = await getRequestPresentation();
  const [rawCharacters, initialMessage] = await Promise.all([
    loadCharacters(),
    getIngestionStatus(messages.common.ingestionError),
  ]);
  const characterNames = Object.fromEntries(
    Object.entries(rawCharacters).map(([short, name]) => [
      short,
      language === "ja" ? characterLabel(short, name, language) : name,
    ]),
  );
  return (
    <>
      <NavigationControls
        language={language}
        characterNames={characterNames}
        initialIngestionMessage={initialMessage}
      />
      <noscript>
        <nav
          aria-label={messages.common.noScriptNavigation}
          style={{ padding: "12px" }}
        >
          {CLASSIC_NAVIGATION.filter((page) => page.link).map((page) => (
            <a
              key={page.key}
              href={`${page.link}`}
              style={{
                color: "inherit",
                display: "inline-block",
                margin: "4px 8px",
              }}
            >
              {messages.navigation[page.key]}
            </a>
          ))}
          <details>
            <summary>{messages.navigation.characters}</summary>
            {Object.entries(characterNames).map(([short, name]) => (
              <a
                key={short}
                href={`/top/${encodeURIComponent(short)}`}
                style={{
                  color: "inherit",
                  display: "inline-block",
                  margin: "4px 8px",
                }}
              >
                {name}
              </a>
            ))}
          </details>
          <form action="/search" method="get">
            <label>
              {messages.common.searchPlayers} <input name="q" type="search" />
            </label>
            <button type="submit">{messages.common.search}</button>
          </form>
        </nav>
      </noscript>
    </>
  );
}

async function loadCharacters(): Promise<Record<string, string>> {
  try {
    return await getCharacters();
  } catch (error) {
    console.error("Could not load the character menu:", error);
  }
  return {};
}
