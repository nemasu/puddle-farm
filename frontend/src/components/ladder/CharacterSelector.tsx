import { getMessages } from "../../lib/i18n";
import { characterLabel } from "../../lib/ladder-characters";
import { getCharacters } from "../../lib/server/characters";
import type { Language } from "../../lib/site-preferences";
import { CharacterForm } from "./CharacterForm";
import styles from "./ladder.module.css";

export async function CharacterSelector({
  language,
  character = "",
}: {
  language: Language;
  character?: string;
}) {
  const messages = getMessages(language).ladder;
  const characters = await getCharacters().catch(() => ({}));
  return (
    <CharacterForm>
      <div className={styles.filterRow}>
        <div className={styles.characterField}>
          <label htmlFor="ranking-character">{messages.character}</label>
          <select
            id="ranking-character"
            name="character"
            defaultValue={character}
          >
            <option value="">{messages.allGlobal}</option>
            {Object.entries(characters).map(([short, name]) => (
              <option key={short} value={short}>
                {characterLabel(short, name, language)}
              </option>
            ))}
          </select>
        </div>
        <button type="submit">{messages.chooseCharacter}</button>
      </div>
    </CharacterForm>
  );
}
