import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
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
  TextField,
  Toolbar,
} from "@mui/material";
import {
  type MouseEvent,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { useCharacterNames } from "../hooks/useCharacterNames";
import { useSearchNavigation } from "../hooks/useSearchNavigation";
import { StorageUtils } from "../utils/Storage";

interface Page {
  name: string;
  link?: string;
  list?: { key: string; name: string; link: string }[];
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
  const navigateToSearch = useSearchNavigation();

  const [anchorElNav, setAnchorElNav] = useState<HTMLElement | null>(null);

  const [characterElNav, setCharacterElNav] = useState<HTMLElement | null>(
    null,
  );

  const [searchQuery, setSearchQuery] = useState("");

  const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT;

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

  const [healthMessage, setHealthMessage] = useState<string | null>(null);

  const handleSearchChange = (event: {
    target: { value: SetStateAction<string> };
  }) => {
    setSearchQuery(event.target.value);
  };

  const handleSearchKeyDown = (event: { key: string }) => {
    if (event.key === "Enter") {
      navigateToSearch(searchQuery, false);
    }
  };

  const handleSearchClick = () => {
    navigateToSearch(searchQuery, false);
  };

  const handleExactSearchClick = () => {
    navigateToSearch(searchQuery, true);
  };

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${API_ENDPOINT}/health`);
        const message = await response.text();
        if (!response.ok) {
          setHealthMessage(message || "API health check failed."); // Set message if not OK
        } else {
          if (message.startsWith("Daily Update Running.")) {
            setHealthMessage(
              "Daily Update Running. Match data may be delayed.",
            );
          } else {
            setHealthMessage(null);
          }
        }
      } catch (error) {
        console.error("Error fetching health status:", error);
        setHealthMessage("Could not connect to the API."); // Set message on fetch error
      }
    };

    checkHealth();

    // Read preferences
    const preferences = StorageUtils.getPreferences();
    let intervalId: ReturnType<typeof setInterval> | null = null;

    // Only set interval if autoUpdate is enabled
    if (preferences.autoUpdate) {
      intervalId = setInterval(checkHealth, 60000); // Check every 60 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

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
      {healthMessage && (
        <Alert severity="warning" sx={{ borderRadius: 0 }}>
          <AlertTitle>Warning</AlertTitle>
          {healthMessage}
        </Alert>
      )}
      <AppBar position="static" style={{ backgroundImage: "none" }}>
        <Container>
          <Toolbar variant="dense" disableGutters>
            <Box sx={{ flexGrow: 1, display: { xs: "flex", md: "none" } }}>
              {/* Mobile view */}
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
                {" "}
                {/* Mobile view - menu */}
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
                      {page.list?.map((char) => (
                        <MenuItem
                          component={Link}
                          to={char.link}
                          key={char.name}
                          sx={{ my: 1, color: "white", display: "block" }}
                          onClick={handleCloseNavMenu}
                        >
                          <Box sx={{ display: { width: 80 } }}>{char.name}</Box>
                        </MenuItem>
                      ))}
                    </Box>
                  ) : (
                    <MenuItem
                      key={page.name}
                      component={Link}
                      to={page.link ?? "/"}
                      sx={{ my: 1, color: "white", display: "block" }}
                      onClick={handleCloseNavMenu}
                    >
                      {page.name}
                    </MenuItem>
                  ),
                )}
              </Menu>
              {/* Mobile View - Search */}
              <TextField
                size="small"
                id="search_string"
                variant="outlined"
                label="Search..."
                style={{ marginTop: 10 }}
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
              />
              <Box>
                <SearchIcon
                  style={{
                    marginTop: 5,
                    fontSize: 25,
                    display: "block",
                    cursor: "pointer",
                  }}
                  onClick={handleSearchClick}
                />
                <ZoomInIcon
                  style={{ fontSize: 25, cursor: "pointer" }}
                  onClick={handleExactSearchClick}
                />
              </Box>
            </Box>
            <Box sx={{ flexGrow: 1, display: { xs: "none", md: "flex" } }}>
              {/* Desktop view */}
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
                    {/* Desktop view - character menu*/}
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
                        {page.list?.map((char) => (
                          <MenuItem
                            component={Link}
                            to={char.link}
                            key={char.name}
                            onClick={handleCloseCharNavMenu}
                          >
                            <Box sx={{ display: { width: 80 } }}>
                              {char.name}
                            </Box>
                          </MenuItem>
                        ))}
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
            <Box sx={{ display: { xs: "none", md: "flex" } }}>
              {" "}
              {/* Desktop view - right box */}
              {/* Desktop View - Search */}
              <TextField
                size="small"
                id="search_string"
                variant="outlined"
                label="Search..."
                style={{ marginTop: 10 }}
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
              />
              <Box>
                <SearchIcon
                  style={{
                    marginTop: 5,
                    fontSize: 25,
                    display: "block",
                    cursor: "pointer",
                  }}
                  onClick={handleSearchClick}
                />
                <ZoomInIcon
                  style={{ fontSize: 25, cursor: "pointer" }}
                  onClick={handleExactSearchClick}
                />
              </Box>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
    </>
  );
}
export default NavBar;
