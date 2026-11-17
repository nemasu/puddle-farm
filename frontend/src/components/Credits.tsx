import { getMessages } from "../lib/i18n";
import type { Language } from "../lib/site-preferences";

export function Credits({ language }: { language: Language }) {
  const messages = getMessages(language).about;
  return (
    <ul
      className="credits-list"
      aria-label={messages.credits}
      style={{ listStyle: "disc", paddingLeft: "1.5rem" }}
    >
      <li>
        <strong>{messages.ladderDesign}:</strong> {messages.ladderDesigner}
      </li>
      <li>
        <strong>{messages.development}:</strong>{" "}
        {language === "en" ? (
          <>
            {messages.contributors}{" "}
            <a href="https://github.com/nemasu/puddle-farm/graphs/contributors?all=1">
              GitHub
            </a>
          </>
        ) : (
          <a href="https://github.com/nemasu/puddle-farm/graphs/contributors?all=1">
            {messages.contributors}
          </a>
        )}
      </li>
      <li>
        <strong>{messages.classicDesign}:</strong> {messages.classicOriginal}{" "}
        <a href="https://x.com/shiburizu">@shiburizu</a>
      </li>
      <li>
        {messages.ratingInspirationBefore}
        <a href="https://x.com/sov_gott_games">Felix</a>
        {messages.ratingInspirationAfter}
      </li>
    </ul>
  );
}
