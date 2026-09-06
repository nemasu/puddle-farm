import { createTheme, type Theme } from "@mui/material";

declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    platform: true;
    char_rank: true;
    global_rank: true;
    pageHeader: true;
    playerName: true;
  }
}

export type CharacterName =
  | "Sol"
  | "Ky"
  | "Ramlethal"
  | "Nagoriyuki"
  | "Bridget"
  | "Bedman?"
  | "Johnny";

type HexColor = `#${string}`;
type ThemeColor = HexColor | "white" | "black" | `rgba(${string})`;

interface CharacterThemeConfig {
  name: CharacterName;
  primaryMain: HexColor;
  secondaryMain: HexColor;
  backgroundDefault: HexColor;
  playerNameColor: ThemeColor;
  pageHeaderColor: ThemeColor;
  platformBg: HexColor;
  charRankBg: HexColor;
  globalRankBg: HexColor;
  globalRankColor: ThemeColor;
  buttonColor: HexColor;
  appBarBg: HexColor;
  dialogBg: HexColor;
}

function createCharacterTheme(config: CharacterThemeConfig): Theme {
  return createTheme({
    palette: {
      mode: "dark",
      primary: { main: config.primaryMain },
      secondary: { main: config.secondaryMain },
      background: { default: config.backgroundDefault },
    },
    components: {
      MuiTypography: {
        styleOverrides: {
          root: {
            variants: [
              {
                props: { variant: "playerName" },
                style: {
                  color: config.playerNameColor,
                  padding: "5px",
                  paddingRight: "12px",
                  paddingLeft: "12px",
                  display: "inline-block",
                },
              },
              {
                props: { variant: "pageHeader" },
                style: {
                  display: "block",
                  fontSize: 34,
                  color: config.pageHeaderColor,
                },
              },
              {
                props: { variant: "platform" },
                style: {
                  fontSize: ".8rem",
                  backgroundColor: config.platformBg,
                  color: "white",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  display: "inline-block",
                  marginLeft: "8px",
                },
              },
              {
                props: { variant: "char_rank" },
                style: {
                  fontSize: ".8rem",
                  backgroundColor: config.charRankBg,
                  color: "white",
                  fontWeight: "bold",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  display: "inline-block",
                  marginLeft: "8px",
                  verticalAlign: "middle",
                },
              },
              {
                props: { variant: "global_rank" },
                style: {
                  fontSize: ".8rem",
                  backgroundColor: config.globalRankBg,
                  color: config.globalRankColor,
                  fontWeight: "bold",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  display: "inline-block",
                  marginLeft: "8px",
                },
              },
            ],
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            color: config.buttonColor,
            borderWidth: "4px",
            textTransform: "none",
          },
        },
      },
      MuiAppBar: {
        styleOverrides: { root: { backgroundColor: config.appBarBg } },
      },
      MuiDialog: {
        styleOverrides: { paper: { background: config.dialogBg } },
      },
    },
  });
}

const characterThemeConfigs: CharacterThemeConfig[] = [
  {
    name: "Sol",
    primaryMain: "#D2B45E",
    secondaryMain: "#9B3725",
    backgroundDefault: "#262A2C",
    playerNameColor: "white",
    pageHeaderColor: "white",
    platformBg: "#363636",
    charRankBg: "#9B3725",
    globalRankBg: "#FFB42C",
    globalRankColor: "rgba(0, 0, 0, 0.7)",
    buttonColor: "#FFB42C",
    appBarBg: "#2E2C2F",
    dialogBg: "#171717",
  },
  {
    name: "Ky",
    primaryMain: "#217DBB",
    secondaryMain: "#DDDBD5",
    backgroundDefault: "#282E30",
    playerNameColor: "black",
    pageHeaderColor: "#217DBB",
    platformBg: "#363636",
    charRankBg: "#217DBB",
    globalRankBg: "#CF8545",
    globalRankColor: "rgba(0, 0, 0, 0.7)",
    buttonColor: "#CF8545",
    appBarBg: "#217DBB",
    dialogBg: "#282E30",
  },
  {
    name: "Ramlethal",
    primaryMain: "#611A16",
    secondaryMain: "#E4E1DA",
    backgroundDefault: "#383733",
    playerNameColor: "black",
    pageHeaderColor: "#383733",
    platformBg: "#383733",
    charRankBg: "#611A16",
    globalRankBg: "#A4FD33",
    globalRankColor: "rgba(0, 0, 0, 0.7)",
    buttonColor: "#A4FD33",
    appBarBg: "#611A16",
    dialogBg: "#383733",
  },
  {
    name: "Nagoriyuki",
    primaryMain: "#60304f",
    secondaryMain: "#DDDBD5",
    backgroundDefault: "#282E30",
    playerNameColor: "black",
    pageHeaderColor: "#DA2A46",
    platformBg: "#363636",
    charRankBg: "#60304f",
    globalRankBg: "#DA2A46",
    globalRankColor: "rgba(0, 0, 0, 0.7)",
    buttonColor: "#DA2A46",
    appBarBg: "#60304f",
    dialogBg: "#282E30",
  },
  {
    name: "Bridget",
    primaryMain: "#799BB6",
    secondaryMain: "#799BB6",
    backgroundDefault: "#35312E",
    playerNameColor: "white",
    pageHeaderColor: "#D6D4CE",
    platformBg: "#383733",
    charRankBg: "#5777A3",
    globalRankBg: "#A94F44",
    globalRankColor: "rgba(0, 0, 0, 0.7)",
    buttonColor: "#F5C74C",
    appBarBg: "#5777A3",
    dialogBg: "#383733",
  },
  {
    name: "Bedman?",
    primaryMain: "#471d37",
    secondaryMain: "#A83B5E",
    backgroundDefault: "#171717",
    playerNameColor: "white",
    pageHeaderColor: "white",
    platformBg: "#363636",
    charRankBg: "#D02F28",
    globalRankBg: "#471d37",
    globalRankColor: "white",
    buttonColor: "#D02F28",
    appBarBg: "#471d37",
    dialogBg: "#171717",
  },
  {
    name: "Johnny",
    primaryMain: "#927757",
    secondaryMain: "#848280",
    backgroundDefault: "#464541",
    playerNameColor: "white",
    pageHeaderColor: "#D6D4CE",
    platformBg: "#383733",
    charRankBg: "#353235",
    globalRankBg: "#C4A160",
    globalRankColor: "rgba(0, 0, 0, 0.7)",
    buttonColor: "#C4A160",
    appBarBg: "#353235",
    dialogBg: "#383733",
  },
];

const Themes = Object.fromEntries(
  characterThemeConfigs.map((config) => [
    config.name,
    createCharacterTheme(config),
  ]),
) as Record<CharacterName, Theme>;

export const defaultCharacterName: CharacterName = "Sol";

export const defaultTheme = Themes[defaultCharacterName];

export const characterNames: CharacterName[] = characterThemeConfigs.map(
  (config) => config.name,
);

export function isCharacterName(name: string): name is CharacterName {
  return characterThemeConfigs.some((config) => config.name === name);
}

export default Themes;
