import { CLASSIC_NAVIGATION } from "../../lib/navigation";
import { readApiResponse } from "../../lib/server/api";
import { getCharacters } from "../../lib/server/characters";
import NavigationControls from "./NavigationControls";

export async function Navigation() {
  const [characterNames, initialMessage] = await Promise.all([
    loadCharacters(),
    loadIngestionStatus(),
  ]);
  return (
    <>
      <NavigationControls
        characterNames={characterNames}
        initialIngestionMessage={initialMessage}
      />
      <noscript>
        <nav
          aria-label="Navigation without JavaScript"
          style={{ padding: "12px" }}
        >
          {CLASSIC_NAVIGATION.filter((page) => page.link).map((page) => (
            <a
              key={page.name}
              href={`${page.link}`}
              style={{
                color: "inherit",
                display: "inline-block",
                margin: "4px 8px",
              }}
            >
              {page.name}
            </a>
          ))}
          <details>
            <summary>Characters</summary>
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
              Search Player Names <input name="q" type="search" />
            </label>
            <button type="submit">Search</button>
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

async function loadIngestionStatus(): Promise<string | null> {
  try {
    const response = await readApiResponse("/ingestion/health");
    return response.ok
      ? null
      : response.body || "Could not check whether matches are updating.";
  } catch {
    return "Could not check whether matches are updating.";
  }
}
