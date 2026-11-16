"use client";

import MenuIcon from "@mui/icons-material/Menu";
import {
  Alert,
  AlertTitle,
  AppBar,
  Box,
  Button,
  Container,
  IconButton,
  Menu,
  MenuItem,
  type SxProps,
  type Theme,
  Toolbar,
} from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { type MouseEvent, useMemo, useState } from "react";
import { useIngestionHealth } from "../../hooks/useIngestionHealth";
import { getMessages } from "../../lib/i18n";
import { CLASSIC_NAVIGATION } from "../../lib/navigation";
import { buildSearchPath } from "../../lib/search";
import type { Language } from "../../lib/site-preferences";
import { AppLink as Link } from "../AppLink";
import { useDisplayPreferences } from "../DisplayPreferences";
import { SearchBox } from "../SearchBox";

function CharacterMenuItems({
  characters,
  onItemClick,
  itemSx,
  boxSx,
}: {
  characters: { key: string; name: string; link: string }[];
  onItemClick: () => void;
  itemSx?: SxProps<Theme>;
  boxSx?: SxProps<Theme>;
}) {
  return (
    <>
      {characters.map((char) => (
        <MenuItem
          component={Link}
          href={char.link}
          prefetch={false}
          key={char.name}
          sx={itemSx}
          onClick={onItemClick}
        >
          <Box sx={boxSx}>{char.name}</Box>
        </MenuItem>
      ))}
    </>
  );
}

function NavigationControls({
  characterNames,
  initialIngestionMessage,
  language,
}: {
  language: Language;
  characterNames: Record<string, string>;
  initialIngestionMessage: string | null;
}) {
  const messages = getMessages(language);
  const searchParams = useSearchParams();
  const router = useRouter();

  const [anchorElNav, setAnchorElNav] = useState<HTMLElement | null>(null);

  const [characterElNav, setCharacterElNav] = useState<HTMLElement | null>(
    null,
  );

  const navPages = useMemo(() => {
    const characterList = characterNames
      ? Object.entries(characterNames).map(([charShort, charLong]) => ({
          key: charShort,
          name: charLong,
          link: `/top/${charShort}`,
        }))
      : [];
    return CLASSIC_NAVIGATION.map((page) => ({
      ...page,
      name: messages.navigation[page.key],
      ...(page.key === "characters" ? { list: characterList } : {}),
    }));
  }, [characterNames, messages]);

  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") ?? "");

  const preferences = useDisplayPreferences();
  const ingestionMessage = useIngestionHealth(
    initialIngestionMessage,
    preferences.autoUpdate,
  );

  const onSearch = (q: string) => {
    const currentExact = searchParams.get("exact") === "true";
    router.push(buildSearchPath(q, currentExact));
  };

  const handleOpenNavMenu = (event: MouseEvent<HTMLElement>) => {
    setAnchorElNav(event.currentTarget);
  };
  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const handleOpenCharNavMenu = (event: MouseEvent<HTMLElement>) => {
    setCharacterElNav(event.currentTarget);
  };
  const handleCloseCharNavMenu = () => {
    setCharacterElNav(null);
  };

  return (
    <>
      {ingestionMessage && (
        <Alert severity="warning" sx={{ borderRadius: 0 }}>
          <AlertTitle>{messages.common.warning}</AlertTitle>
          {ingestionMessage}
        </Alert>
      )}
      <AppBar position="static" style={{ backgroundImage: "none" }}>
        <Container>
          <Toolbar variant="dense" disableGutters sx={{ flexWrap: "wrap" }}>
            <Box
              sx={{
                flexGrow: 1,
                display: { xs: "flex", md: "none" },
                alignItems: "center",
              }}
            >
              <IconButton
                size="large"
                aria-label={messages.common.menu}
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleOpenNavMenu}
                color="inherit"
              >
                <MenuIcon /> {/* Mobile view - menu icon */}
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorElNav}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "left",
                }}
                keepMounted
                transformOrigin={{
                  vertical: "top",
                  horizontal: "left",
                }}
                open={Boolean(anchorElNav)}
                onClose={handleCloseNavMenu}
                sx={{ display: { xs: "block", md: "none" } }}
              >
                {navPages.map((page) =>
                  //If the page has a 'list' attribute that is an array, render a submenu
                  "list" in page ? (
                    <Box
                      key={page.name}
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        maxWidth: "450px",
                        borderBottom: "1px solid",
                        borderTop: "1px solid",
                      }}
                    >
                      <CharacterMenuItems
                        characters={page.list ?? []}
                        onItemClick={handleCloseNavMenu}
                        itemSx={{ color: "white" }}
                        boxSx={{ width: 80 }}
                      />
                    </Box>
                  ) : (
                    <MenuItem
                      key={page.name}
                      component={Link}
                      href={page.link ?? "/"}
                      sx={{ color: "white" }}
                      onClick={handleCloseNavMenu}
                    >
                      {page.name}
                    </MenuItem>
                  ),
                )}
              </Menu>
              <Box sx={{ padding: 1 }}>
                <SearchBox
                  language={language}
                  action="/search"
                  exact={searchParams.get("exact") === "true"}
                  query={searchQuery}
                  onQueryChange={setSearchQuery}
                  onSearch={onSearch}
                />
              </Box>
            </Box>
            <Box
              sx={{
                flexGrow: 1,
                flexWrap: "wrap",
                display: { xs: "none", md: "flex" },
              }}
            >
              {navPages.map((page) =>
                //If the page has a 'list' attribute that is an array, render a submenu
                "list" in page ? (
                  <Box key={page.name}>
                    <Button
                      key={page.name}
                      onClick={handleOpenCharNavMenu}
                      sx={{
                        margin: 0,
                        my: 1,
                        color: "white",
                        display: "block",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        textTransform: "none",
                        fontSize: "1rem",
                        fontWeight: 400,
                        px: 2,
                      }}
                    >
                      {page.name}
                    </Button>{" "}
                    <Menu
                      id="menu-charbar"
                      anchorEl={characterElNav}
                      anchorOrigin={{
                        vertical: "bottom",
                        horizontal: "left",
                      }}
                      keepMounted
                      transformOrigin={{
                        vertical: "top",
                        horizontal: "left",
                      }}
                      open={Boolean(characterElNav)}
                      onClose={handleCloseCharNavMenu}
                      sx={{ display: { xs: "none", md: "flex" } }}
                    >
                      <Box
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          maxWidth: "450px",
                        }}
                      >
                        <CharacterMenuItems
                          characters={page.list ?? []}
                          onItemClick={handleCloseCharNavMenu}
                          boxSx={{ display: { width: 80 } }}
                        />
                      </Box>
                    </Menu>
                  </Box>
                ) : (
                  <Button
                    key={page.name}
                    component={Link}
                    href={page.link ?? "/"}
                    onClick={handleCloseCharNavMenu}
                    sx={{
                      my: 1,
                      color: "white",
                      display: "block",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      textTransform: "none",
                      fontSize: "1rem",
                      fontWeight: 400,
                      px: 2,
                    }}
                  >
                    {page.name}
                  </Button>
                ),
              )}
            </Box>
            <Box sx={{ display: { xs: "none", md: "flex" }, padding: 1 }}>
              <SearchBox
                language={language}
                action="/search"
                exact={searchParams.get("exact") === "true"}
                query={searchQuery}
                onQueryChange={setSearchQuery}
                onSearch={onSearch}
              />
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
    </>
  );
}
export default NavigationControls;
