import type { Metadata } from "next";

const game = "GGST";
const gameName = "Guilty Gear Strive";
const copy = {
  en: {
    rankings: "Rankings",
    player: "Player profile",
    character: "Character",
    rank: "Rank",
    rating: "Rating",
    globalPosition: "Global position",
    characterPosition: "Character position",
    matches: "Matches",
    site: `${gameName} rankings, player profiles, match history, and statistics.`,
    profile: `${gameName} player profile, ratings, match history, and statistics.`,
    namedProfile: (name: string) =>
      `${name}'s ${gameName} player profile, ratings, match history, and statistics.`,
  },
  ja: {
    rankings: "ランキング",
    player: "プレイヤープロフィール",
    character: "キャラクター",
    rank: "ランク",
    rating: "レーティング",
    globalPosition: "総合順位",
    characterPosition: "キャラクター別順位",
    matches: "試合数",
    site: `${gameName}のランキング、プレイヤープロフィール、対戦履歴、統計。`,
    profile: `${gameName}のプレイヤープロフィール、レーティング、対戦履歴、統計。`,
    namedProfile: (name: string) =>
      `${name}の${gameName}プレイヤープロフィール、レーティング、対戦履歴、統計。`,
  },
  ko: {
    rankings: "랭킹",
    player: "플레이어 프로필",
    character: "캐릭터",
    rank: "등급",
    rating: "레이팅",
    globalPosition: "전체 순위",
    characterPosition: "캐릭터별 순위",
    matches: "경기 수",
    site: `${gameName} 랭킹, 플레이어 프로필, 경기 기록 및 통계.`,
    profile: `${gameName} 플레이어 프로필, 레이팅, 경기 기록 및 통계.`,
    namedProfile: (name: string) =>
      `${name}의 ${gameName} 플레이어 프로필, 레이팅, 경기 기록 및 통계.`,
  },
};
function messages(language: string) {
  return copy[language === "ja" || language === "ko" ? language : "en"];
}

/** Keep browser, Open Graph, and Twitter wording identical on each route. */
export function pageMetadata(input: Metadata, language = "en"): Metadata {
  const words = messages(language);
  const rawTitle =
    typeof input.title === "string"
      ? input.title
      : input.title && "absolute" in input.title
        ? input.title.absolute
        : input.title && "default" in input.title
          ? input.title.default
          : words.rankings;
  // Existing routes may still supply their previous branding suffix.
  const label = (rawTitle ?? words.rankings).replace(
    /(?: \| | · )(?:Guilty Gear Strive|GGST|Puddle Farm).*$/,
    "",
  );
  const title = `${label} · ${game} · Puddle Farm`;
  const description = input.description ?? words.site;
  const images = input.openGraph?.images ?? ["/logo192.png"];
  return {
    ...input,
    metadataBase: new URL(process.env.GGST_SITE_URL ?? "https://puddle.farm"),
    title: { absolute: title },
    description,
    openGraph: {
      ...input.openGraph,
      type: "website",
      siteName: "Puddle Farm",
      title,
      description,
      images,
    },
    twitter: { ...input.twitter, card: "summary", title, description, images },
  };
}

export function siteMetadata(language: string): Metadata {
  const words = messages(language);
  return pageMetadata(
    { title: words.rankings, description: words.site },
    language,
  );
}

type PlayerMetadata = {
  language: string;
  name?: string;
  character?: string;
  rank?: string;
  rating?: string;
  globalPosition?: number | null;
  characterPosition?: number | null;
  games?: number | null;
  url?: string;
  image?: string;
};

export function playerMetadata(player: PlayerMetadata): Metadata {
  const words = messages(player.language);
  const parts = [
    player.name ?? words.player,
    player.character,
    player.rank,
    player.rating,
  ].filter(Boolean);
  const description = [
    player.name ? words.namedProfile(player.name) : words.profile,
    player.character && `${words.character}: ${player.character}`,
    player.rank && `${words.rank}: ${player.rank}`,
    player.rating && `${words.rating}: ${player.rating}`,
    player.globalPosition != null &&
      player.globalPosition > 0 &&
      `${words.globalPosition}: #${player.globalPosition.toLocaleString(player.language)}`,
    player.characterPosition != null &&
      player.characterPosition > 0 &&
      `${words.characterPosition}: #${player.characterPosition.toLocaleString(player.language)}`,
    player.games != null &&
      player.games >= 0 &&
      `${words.matches}: ${player.games.toLocaleString(player.language)}`,
  ]
    .filter((value) => typeof value === "string" && value.length)
    .join(" · ");
  // Player names are user data: do not run the branding-suffix normalizer over them.
  const title = `${parts.join(" · ")} · ${game} · Puddle Farm`;
  const images = [
    {
      url: player.image ?? "/logo192.png",
      alt: player.name ?? words.player,
    },
  ];
  return {
    metadataBase: new URL(process.env.GGST_SITE_URL ?? "https://puddle.farm"),
    title: { absolute: title },
    description,
    ...(player.url ? { alternates: { canonical: player.url } } : {}),
    openGraph: {
      type: "website",
      siteName: "Puddle Farm",
      title,
      description,
      url: player.url,
      images,
    },
    twitter: { card: "summary", title, description, images },
  };
}
