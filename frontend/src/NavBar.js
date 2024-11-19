import MenuIcon from '@mui/icons-material/Menu';
import { Button } from '@mui/material';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Toolbar from '@mui/material/Toolbar';
import { JSONParse } from 'json-with-bigint';
import React, { useEffect, useState } from 'react';
import { Link } from "react-router-dom";
import TextField from '@mui/material/TextField';
import SearchIcon from '@mui/icons-material/Search';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import { useNavigate } from 'react-router-dom';

var pages = [
  { name: 'Top', link: './top_global' },
  { name: 'Characters', list: [] },
  { name: 'Popularity', link: './popularity' },
  { name: 'Matchup', link: './matchup' },
  { name: 'About', link: './about' },
  { name: 'Settings', link: './settings' },
  { name: 'Stats', link: './stats' },
];

function resetCharacters() {
  pages[1].list = [];
}

function NavBar() {

  const navigate = useNavigate();

  const [anchorElNav, setAnchorElNav] = React.useState(null);

  const [characterElNav, setCharacterElNav] = React.useState(null);

  const [searchString, setSearchString] = useState('');

  const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

  // eslint-disable-next-line
  const [characters, setCharacters] = useState([]);

  const handleSearchChange = (event) => {
    setSearchString(event.target.value);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Enter') {
      navigate(`/search/${searchString}`);
    }
  };

  const handleSearchClick = () => {
    navigate(`/search/${searchString}`);
  };

  const handleExactSearchClick = () => {
    navigate(`/search/${searchString}/exact`);
  };

  useEffect(() => {
    const fetchCharacterList = async () => {
      try {

        const response = await fetch(API_ENDPOINT
          + '/characters');

        // eslint-disable-next-line
        const result = await response.text().then(body => {

          var parsed = JSONParse(body);

          resetCharacters();
          for (var key in parsed) {
            pages[1].list.push({ key: key, name: parsed[key][1], link: '/top/' + parsed[key][0] });
          }

          setCharacters(parsed);

          return parsed;
        });

      } catch (error) {
        console.error('Error fetching character list:', error);
      }
    };

    fetchCharacterList();
  }, [API_ENDPOINT]);

  const handleOpenNavMenu = (event) => {
    setAnchorElNav(event.currentTarget);
  };
  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const handleOpenCharNavMenu = (event) => {
    setCharacterElNav(event.currentTarget);
  };
  const handleCloseCharNavMenu = () => {
    setCharacterElNav(null);
  };

  return (
    <AppBar position="static" style={{ backgroundImage: "none" }}>
      <Container maxWidth="md">
        <Toolbar variant='dense' disableGutters>
          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>{/* Mobile view */}
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
                vertical: 'bottom',
                horizontal: 'left',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
              sx={{ display: { xs: 'block', md: 'none' } }}
            > {/* Mobile view - menu */}
              {pages.map((page) => (
                //If the page has a 'list' attribute that is an array, render a submenu
                'list' in page ? (
                  <Box key={page.name} style={{ display: 'flex', flexWrap: 'wrap', maxWidth: '450px', borderBottom: '1px solid', borderTop: '1px solid' }}>
                    {page['list'].map((char) => (
                      <MenuItem
                        component={Link}
                        to={char.link}
                        key={char.name}
                        sx={{ my: 1, color: 'white', display: 'block' }}
                        onClick={handleCloseNavMenu}
                      >
                        <Box sx={{ display: { width: 80 } }}>{char.name}</Box>
                      </MenuItem>
                    ))}
                  </Box>
                ) : (
                  <MenuItem key={page.name}
                    component={Link}
                    to={page.link}
                    sx={{ my: 1, color: 'white', display: 'block' }}
                    onClick={handleCloseNavMenu}
                  >
                    {page.name}
                  </MenuItem>
                )
              ))}
            </Menu>
            {/* Mobile View - Search */}
            <TextField size="small" id="search_string" variant="outlined" label="Search..." style={{ marginTop: 10 }} value={searchString} onChange={handleSearchChange} onKeyDown={handleSearchKeyDown} />
            <Box>
              <SearchIcon style={{ marginTop: 5, fontSize: 25, display: 'block', cursor: 'pointer' }} onClick={handleSearchClick} />
              <ZoomInIcon style={{ fontSize: 25, cursor: 'pointer' }} onClick={handleExactSearchClick} />
            </Box>
          </Box>
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>{/* Desktop view */}
            {pages.map((page) => (
              //If the page has a 'list' attribute that is an array, render a submenu
              'list' in page ? (
                <Box key={page.name}>
                  <Button m={0} key={page.name}
                    component={Link}
                    to={page.link}
                    onClick={handleOpenCharNavMenu}
                    sx={{ my: 1, color: 'white', display: 'block' }
                    }>
                    {page.name}
                  </Button> {/* Desktop view - character menu*/}
                  <Menu
                    id="menu-charbar"
                    anchorEl={characterElNav}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'left',
                    }}
                    keepMounted
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'left',
                    }}
                    open={Boolean(characterElNav)}
                    onClose={handleCloseCharNavMenu}
                    sx={{ display: { xs: 'none', md: 'flex' } }}
                  >
                    <Box style={{ display: 'flex', flexWrap: 'wrap', maxWidth: '450px' }}>
                      {page['list'].map((char) => (
                        <MenuItem component={Link} to={char.link} key={char.name} onClick={handleCloseCharNavMenu}>
                          <Box sx={{ display: { width: 80 } }}>{char.name}</Box>
                        </MenuItem>
                      ))}
                    </Box>
                  </Menu>
                </Box>

              ) : (
                <MenuItem key={page.name}
                  component={Link}
                  to={page.link}
                  onClick={handleCloseCharNavMenu}
                  sx={{ my: 1, color: 'white', display: 'block' }
                  }> {/* Desktop view  - button*/}
                  {page.name}
                </MenuItem>
              )
            ))}
          </Box>
          <Box sx={{ display: { xs: 'none', md: 'flex' } }}> {/* Desktop view - right box */}
            {/* Desktop View - Search */}
            <TextField size="small" id="search_string" variant="outlined" label="Search..." style={{ marginTop: 10 }} value={searchString} onChange={handleSearchChange} onKeyDown={handleSearchKeyDown} />
            <Box>
              <SearchIcon style={{ marginTop: 5, fontSize: 25, display: 'block', cursor: 'pointer' }} onClick={handleSearchClick} />
              <ZoomInIcon style={{ fontSize: 25, cursor: 'pointer' }} onClick={handleExactSearchClick} />
            </Box>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
export default NavBar;