export const SITE_COOKIES = {
  language: "ggst-language",
  design: "ggst-design",
} as const;

export type Language = "en" | "ko" | "ja";
export type Design = "classic" | "ladder";
export type SitePreferences = {
  language: Language;
  designPreference: Design;
};

export const AVAILABLE_DESIGNS: readonly Design[] = ["classic", "ladder"];

export function parseLanguage(value: unknown): Language | null {
  return value === "en" || value === "ko" || value === "ja" ? value : null;
}

export function parseDesignPreference(value: unknown): Design | null {
  return value === "classic" || value === "ladder" ? value : null;
}

export function parseSitePreferences(
  language: unknown,
  design: unknown,
): SitePreferences | null {
  const parsedLanguage = parseLanguage(language);
  const designPreference = parseDesignPreference(design);
  return parsedLanguage && designPreference
    ? { language: parsedLanguage, designPreference }
    : null;
}

export function readSitePreferences(
  get: (name: string) => string | undefined,
): SitePreferences {
  return {
    language: parseLanguage(get(SITE_COOKIES.language)) ?? "en",
    designPreference:
      parseDesignPreference(get(SITE_COOKIES.design)) ?? "classic",
  };
}

export function resolveDesign({ designPreference }: SitePreferences): Design {
  return designPreference;
}

export function activeDesign(preferences: SitePreferences): Design {
  const preferred = resolveDesign(preferences);
  return AVAILABLE_DESIGNS.includes(preferred) ? preferred : "classic";
}
