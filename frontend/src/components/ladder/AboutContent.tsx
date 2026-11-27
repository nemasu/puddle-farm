import type { Supporter } from "../../interfaces/API";
import { getMessages } from "../../lib/i18n";
import type { Language } from "../../lib/site-preferences";
import { Utils } from "../../utils/Utils";
import { AppLink as Link } from "../AppLink";
import { Credits } from "../Credits";
import { PlayerLink } from "../classic/PlayerLink";
import styles from "./about.module.css";
import shared from "./ladder.module.css";

export function LadderAboutContent({
  supporters,
  language,
}: {
  supporters: Supporter[] | null;
  language: Language;
}) {
  const messages = getMessages(language).about;
  return (
    <section className={shared.content} aria-labelledby="about-title">
      <div className={shared.sectionHeading}>
        <p>{messages.section}</p>
        <h1 id="about-title">
          {messages.heading} <span>{messages.accent}</span>
        </h1>
      </div>
      <dl className={styles.info}>
        <div>
          <dt>{messages.what}</dt>
          <dd>
            <p>{messages.whatText}</p>
            <p>{messages.disclaimer}</p>
            <a
              href="https://www.guiltygear.com/ggst/en/"
              target="_blank"
              rel="noopener noreferrer"
            >
              {messages.game} ↗
            </a>
          </dd>
        </div>
        <div>
          <dt>{messages.rating}</dt>
          <dd>{messages.ratingText}</dd>
        </div>
        <div>
          <dt>{messages.sync}</dt>
          <dd>
            <p>{messages.syncText}</p>
            <strong>{messages.syncLimit}</strong>
          </dd>
        </div>
        <div>
          <dt>{messages.contact}</dt>
          <dd>
            <p>{messages.contactText}</p>
            <a
              href="https://discord.gg/vY4mE8exXB"
              target="_blank"
              rel="noopener noreferrer"
            >
              Discord ↗
            </a>
          </dd>
        </div>
      </dl>
      <section className={styles.supporters} aria-labelledby="supporters-title">
        <h2 id="supporters-title">{messages.supporters}</h2>
        <p>{messages.thanks}</p>
        {supporters === null ? (
          <p className={shared.error} role="alert">
            {messages.supporterError}
          </p>
        ) : !supporters.length ? (
          <p className={shared.note}>{messages.supporterEmpty}</p>
        ) : (
          <ul>
            {supporters.map((supporter) => (
              <li key={supporter.id}>
                <PlayerLink playerId={supporter.id}>
                  {supporter.name}
                </PlayerLink>
                {supporter.tags?.map((tag) => (
                  <span
                    key={tag.tag}
                    className={styles.tag}
                    style={JSON.parse(tag.style)}
                  >
                    {tag.tag}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className={styles.supporters} aria-labelledby="credits-title">
        <h2 id="credits-title">{messages.credits}</h2>
        <Credits language={language} />
      </section>
      <section aria-labelledby="rank-guide-title">
        <h2 className={styles.guideTitle} id="rank-guide-title">
          {messages.ranks}
        </h2>
        <p className={shared.note}>{messages.rankText}</p>
        <ul className={styles.guide}>
          <li>
            {Utils.displayRankIcon(0, "48px", true)}
            <span>
              <b>Imperius</b>
              <small>{getMessages(language).distribution.top100}</small>
            </span>
          </li>
          {Utils.getRankThresholds().map((rank) => (
            <li key={rank.rating}>
              {Utils.displayRankIcon(rank.rating, "48px")}
              <span>
                <b>{rank.name}</b>
                <small>{Utils.formatRankThresholdRating(rank)}</small>
              </span>
            </li>
          ))}
        </ul>
        <Link href="/distribution">{messages.moreRanks} →</Link>
      </section>
    </section>
  );
}
