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
import { type MouseEvent, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCharacterNames } from "../hooks/useCharacterNames";
import { useIngestionHealth } from "../hooks/useIngestionHealth";
import { useSearchNavigation } from "../hooks/useSearchNavigation";
import { SearchBox } from "./SearchBox";

interface Page {
  name: string;
  link?: string;
  list?: { key: string; name: string; link: string }[];
}

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
          to={char.link}
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

const pages: Page[] = [
  { name: "Legend", link: "/" },
  { name: "Top", link: "./top_global" },
  { name: "Characters", list: [] },
  { name: "Popularity", link: "./popularity" },
  { name: "Matchup", link: "./matchup" },
  { name: "Distribution", link: "./distribution" },
  { name: "About", link: "./about" },
  { name: "Settings", link: "./settings" },
  { name: "Stats", link: "./stats" },
];

function NavBar() {
  const [searchParams] = useSearchParams();
  const navigateToSearch = useSearchNavigation();

  const [anchorElNav, setAnchorElNav] = useState<HTMLElement | null>(null);

  const [characterElNav, setCharacterElNav] = useState<HTMLElement | null>(
    null,
  );

  const characterNames = useCharacterNames();

  const navPages = useMemo(() => {
    const characterList = characterNames
      ? Object.entries(characterNames).map(([charShort, charLong]) => ({
          key: charShort,
          name: charLong,
          link: `/top/${charShort}`,
        }))
      : [];
    return pages.map((page) =>
      page.name === "Characters" ? { ...page, list: characterList } : page,
    );
  }, [characterNames]);

  const [searchQuery, setSearchQuery] = useState("");

  const ingestionMessage = useIngestionHealth();

  const onSearch = (q: string) => {
    const currentExact = searchParams.get("exact") === "true";
    navigateToSearch(q, currentExact);
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
          <AlertTitle>Warning</AlertTitle>
          {ingestionMessage}
        </Alert>
      )}
      <AppBar position="static" style={{ backgroundImage: "none" }}>
        <Container>
          <Toolbar variant="dense" disableGutters>
            <Box
              sx={{
                flexGrow: 1,
                display: { xs: "flex", md: "none" },
                alignItems: "center",
              }}
            >
              <IconButton
                size="large"
                aria-label="Menu"
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
                      to={page.link ?? "/"}
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
                  query={searchQuery}
                  onQueryChange={setSearchQuery}
                  onSearch={onSearch}
                />
              </Box>
            </Box>
            <Box sx={{ flexGrow: 1, display: { xs: "none", md: "flex" } }}>
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
                    to={page.link ?? "/"}
                    onClick={handleCloseCharNavMenu}
                    sx={{
                      my: 1,
                      color: "white",
                      display: "block",
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
export default NavBar;
