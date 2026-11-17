import type { Language } from "./site-preferences";

type CharacterArt = {
  en: string;
  ko: string;
  art: string;
  x: number;
  y: number;
  scale: number;
};

// Korean display names: https://www.guiltygear.com/kr/character/
const characters: Record<string, CharacterArt> = {
  SO: { en: "Sol Badguy", ko: "솔", art: "sol", x: 818, y: 249, scale: 1 },
  KY: { en: "Ky Kiske", ko: "카이", art: "ky", x: 870, y: 228, scale: 1 },
  MA: { en: "May", ko: "메이", art: "may", x: 747, y: 462, scale: 1 },
  AX: { en: "Axl Low", ko: "액슬", art: "axl", x: 910, y: 245, scale: 1 },
  CH: {
    en: "Chipp Zanuff",
    ko: "치프",
    art: "chipp",
    x: 840,
    y: 225,
    scale: 1,
  },
  PO: {
    en: "Potemkin",
    ko: "포템킨",
    art: "potemkin",
    x: 932,
    y: 304,
    scale: 1,
  },
  FA: { en: "Faust", ko: "파우스트", art: "faust", x: 927, y: 262, scale: 1 },
  MI: {
    en: "Millia Rage",
    ko: "밀리아",
    art: "millia",
    x: 793,
    y: 212,
    scale: 1,
  },
  ZA: { en: "Zato-1", ko: "자토", art: "zato1", x: 772, y: 335, scale: 1 },
  RA: {
    en: "Ramlethal Valentine",
    ko: "램리썰",
    art: "ramlethal",
    x: 771,
    y: 371,
    scale: 1,
  },
  LE: { en: "Leo Whitefang", ko: "레오", art: "leo", x: 882, y: 444, scale: 1 },
  NA: {
    en: "Nagoriyuki",
    ko: "나고리유키",
    art: "nagoriyuki",
    x: 871,
    y: 462,
    scale: 1,
  },
  GI: {
    en: "Giovanna",
    ko: "지오바나",
    art: "giovanna",
    x: 825,
    y: 400,
    scale: 1,
  },
  AN: { en: "Anji Mito", ko: "안지", art: "anji", x: 770, y: 265, scale: 1 },
  IN: { en: "I-No", ko: "이노", art: "ino", x: 700, y: 340, scale: 1 },
  GO: {
    en: "Goldlewis Dickinson",
    ko: "골드루이스",
    art: "goldlewis",
    x: 853,
    y: 170,
    scale: 1,
  },
  JC: { en: "Jack-O", ko: "잭 오", art: "jacko", x: 779, y: 352, scale: 1 },
  HA: {
    en: "Happy Chaos",
    ko: "해피 케이오스",
    art: "happychaos",
    x: 715,
    y: 372,
    scale: 1,
  },
  BA: { en: "Baiken", ko: "바이켄", art: "baiken", x: 818, y: 525, scale: 1 },
  TE: {
    en: "Testament",
    ko: "테스타먼트",
    art: "testament",
    x: 990,
    y: 290,
    scale: 1,
  },
  BI: { en: "Bridget", ko: "브리짓", art: "bridget", x: 823, y: 318, scale: 1 },
  SI: { en: "Sin Kiske", ko: "신", art: "sin", x: 848, y: 304, scale: 1 },
  BE: { en: "Bedman?", ko: "베드맨?", art: "bedman", x: 462, y: 729, scale: 1 },
  AS: {
    en: "Asuka R#",
    ko: "아스카 R♯",
    art: "asuka",
    x: 889,
    y: 355,
    scale: 1,
  },
  JN: { en: "Johnny", ko: "죠니", art: "johnny", x: 749, y: 291, scale: 1 },
  EL: {
    en: "Elphelt Valentine",
    ko: "엘페르트",
    art: "elphelt",
    x: 733,
    y: 255,
    scale: 1,
  },
  AB: { en: "A.B.A", ko: "아바", art: "aba", x: 795, y: 485, scale: 1.4 },
  SL: { en: "Slayer", ko: "슬레이어", art: "slayer", x: 676, y: 310, scale: 1 },
  DI: {
    en: "Queen Dizzy",
    ko: "퀸 디지",
    art: "dizzy",
    x: 860,
    y: 510,
    scale: 1,
  },
  VE: { en: "Venom", ko: "베놈", art: "venom", x: 615, y: 495, scale: 1 },
  UN: { en: "Unika", ko: "유니카", art: "unika", x: 556, y: 255, scale: 1 },
  LU: { en: "Lucy", ko: "루시", art: "lucy", x: 455, y: 675, scale: 1 },
  JA: { en: "Jam Kuradoberi", ko: "잼", art: "jam", x: 693, y: 515, scale: 1 },
  RK: {
    en: "Robo-Ky",
    ko: "로보카이",
    art: "roboky",
    x: 782,
    y: 533,
    scale: 1,
  },
};

export function getCharacterArt(short: string): CharacterArt | undefined {
  return Object.hasOwn(characters, short) ? characters[short] : undefined;
}

// Japanese display names: https://www.guiltygear.com/jp/character/
const japaneseNames: Record<string, string> = {
  SO: "ソル",
  KY: "カイ",
  MA: "メイ",
  AX: "アクセル",
  CH: "チップ",
  PO: "ポチョムキン",
  FA: "ファウスト",
  MI: "ミリア",
  ZA: "ザトー",
  RA: "ラムレザル",
  LE: "レオ",
  NA: "名残雪",
  GI: "ジオヴァーナ",
  AN: "闇慈",
  IN: "イノ",
  GO: "ゴールドルイス",
  JC: "ジャック・オー",
  HA: "ハッピーケイオス",
  BA: "梅喧",
  TE: "テスタメント",
  BI: "ブリジット",
  SI: "シン",
  BE: "ベッドマン？",
  AS: "飛鳥＝R♯",
  JN: "ジョニー",
  EL: "エルフェルト",
  AB: "アバ",
  SL: "スレイヤー",
  DI: "ディズィー",
  VE: "ヴェノム",
  UN: "ユニカ",
  LU: "ルーシー",
  JA: "紗夢",
  RK: "ロボカイ",
};

export function characterLabel(
  short: string,
  name: string,
  language: Language,
): string {
  const character = getCharacterArt(short);
  return language === "ja"
    ? Object.hasOwn(japaneseNames, short)
      ? japaneseNames[short]
      : name || short
    : character
      ? character[language]
      : name || short;
}
