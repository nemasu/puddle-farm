import { Box, Button } from "@mui/material";
import {
  saveCharacterTheme,
  saveSitePreferences,
} from "../../app/actions/site-preferences";
import { getMessages } from "../../lib/i18n";
import {
  resolveDesign,
  type SitePreferences,
} from "../../lib/site-preferences";

import {
  characterNames,
  defaultCharacterName,
  isCharacterName,
} from "../../utils/themes";

export function SiteSettings({
  preferences,
}: {
  preferences: SitePreferences;
}) {
  const messages = getMessages(preferences.language).settings;
  return (
    <form
      action={saveSitePreferences}
      key={`${preferences.language}-${preferences.designPreference}`}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: 2,
          maxWidth: 520,
        }}
      >
        <label htmlFor="site-language">{messages.language}</label>
        <select
          id="site-language"
          name="language"
          defaultValue={preferences.language}
          style={{ font: "inherit", padding: 8, maxWidth: "100%" }}
        >
          <option value="en" lang="en">
            {messages.english}
          </option>
          <option value="ko" lang="ko">
            {messages.korean}
          </option>
          <option value="ja" lang="ja">
            {messages.japanese}
          </option>
        </select>
        <label htmlFor="site-design">{messages.design}</label>
        <select
          id="site-design"
          name="design"
          defaultValue={resolveDesign(preferences)}
          style={{ font: "inherit", padding: 8, maxWidth: "100%" }}
        >
          <option value="classic">{messages.classic}</option>
          <option value="ladder">{messages.ladder}</option>
        </select>
        <Button variant="outlined" type="submit" sx={{ justifySelf: "start" }}>
          {messages.save}
        </Button>
      </Box>
    </form>
  );
}

export function ThemeControls({ initialTheme }: { initialTheme?: string }) {
  const selected =
    initialTheme && isCharacterName(initialTheme)
      ? initialTheme
      : defaultCharacterName;

  return (
    <form action={saveCharacterTheme}>
      {characterNames.map((theme) => (
        <Button
          key={theme}
          type="submit"
          name="theme"
          value={theme}
          variant="outlined"
          aria-pressed={theme === selected}
          sx={{ m: 1 }}
        >
          {theme}
        </Button>
      ))}
    </form>
  );
}
