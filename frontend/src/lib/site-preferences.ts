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
  acceptLanguage: string | null = null,
): SitePreferences {
  return {
    language:
      parseLanguage(get(SITE_COOKIES.language)) ??
      detectBrowserLanguage(acceptLanguage),
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

/** Choose the first supported browser language, respecting quality weights. */
export function detectBrowserLanguage(
  acceptLanguage: string | null = null,
): Language {
  const preferences = (acceptLanguage ?? "").split(",").map((entry) => {
    const [tag, ...parameters] = entry.trim().toLowerCase().split(";");
    const quality = parameters.find((part) => part.trim().startsWith("q="));
    const weight = quality ? Number(quality.trim().slice(2)) : 1;
    return { language: parseLanguage(tag.split("-")[0]), weight };
  });
  return (
    preferences
      .filter(
        (entry) =>
          entry.language &&
          Number.isFinite(entry.weight) &&
          entry.weight > 0 &&
          entry.weight <= 1,
      )
      .sort((a, b) => b.weight - a.weight)[0]?.language ?? "en"
  );
}
