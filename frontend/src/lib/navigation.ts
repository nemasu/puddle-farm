import type { Messages } from "./i18n/en";

export const CLASSIC_NAVIGATION: {
  key: keyof Messages["navigation"];
  link?: string;
}[] = [
  { key: "legend", link: "/" },
  { key: "top", link: "/top_global" },
  { key: "characters" },
  { key: "popularity", link: "/popularity" },
  { key: "matchup", link: "/matchup" },
  { key: "distribution", link: "/distribution" },
  { key: "about", link: "/about" },
  { key: "settings", link: "/settings" },
  { key: "stats", link: "/stats" },
];
