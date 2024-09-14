import MenuIcon from '@mui/icons-material/Menu';
import { Button } from '@mui/material';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Toolbar from '@mui/material/Toolbar';
import { JSONParse, JSONStringify } from 'json-with-bigint';
import React, { useEffect, useState } from 'react';
import { Link } from "react-router-dom";
import Themes from './Themes';

var pages = [
  {name:'Top', link:'./top_global'},
  {name:'Characters', list:[]},
];

function resetCharacters() {
  pages[1].list = [];
}

const themes = Array.from(Themes.keys());

function NavBar() {
  const [anchorElNav, setAnchorElNav] = React.useState(null);

  const [characterElNav, setCharacterElNav] = React.useState(null);

  const [themeElNav, setThemeElNav] = React.useState(null);

  const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

  const [characters, setCharacters] = useState([]);

  useEffect(() => {
    const fetchCharacterList = async () => {
      try {

        const response = await fetch(API_ENDPOINT
          + '/characters');
          
        const result = await response.text().then(body => {
          
          var parsed = JSONParse(body);

          resetCharacters();
          for( var key in parsed ) {
            pages[1].list.push({key:key, name:parsed[key][1], link:'/top/' + parsed[key][0]});
          }
          
          setCharacters(parsed);

          return parsed;
        });

      } catch (error) {
        console.error('Error fetching character list:', error);
      }
    };

    fetchCharacterList();
  }, []);

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

  const handleOpenThemeNavMenu = (event) => {
    setThemeElNav(event.currentTarget);
  };
  const handleCloseThemeNavMenu = (char) => {
    setThemeElNav(null);
    
    if( Array.from(themes.values()).includes(char) ) {
      localStorage.setItem('theme', char);
      window.location.reload();
    }
  };

  return (
    <AppBar position="static" style={{backgroundImage: "none"}}>
      <Container maxWidth="md">
        <Toolbar disableGutters>
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
                  <Box key={page.name} style={{display: 'flex', flexWrap: 'wrap', maxWidth: '500px'}}>
                      {page['list'].map((char) => (
                        <MenuItem
                          component={Link}
                          to={char.link}
                          key={char.name}
                          sx={{ my: 1, color: 'white', display: 'block' }}
                          onClick={handleCloseNavMenu}
                          >
                          
                          {char.name}
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
            <Button m={0} 
              component={Link} 
              onClick={handleOpenThemeNavMenu}
              sx={{ my: 1, color: 'white', display: 'block' }
            }> {/* Mobile view - theme button */}
              Theme
            </Button>
            <Menu
              id="menu-charbar"
              anchorEl={themeElNav}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              open={Boolean(themeElNav)}
              onClose={handleCloseThemeNavMenu}
              sx={{ display: { xs: 'flex', md: 'none' } }}
            >
              <Box style={{display: 'flex', flexWrap: 'wrap', maxWidth: '500px'}}>
              {themes.map((char) => (
                <MenuItem component={Link} key={char} onClick={() => handleCloseThemeNavMenu(char)}>
                  {char}
                </MenuItem>
              ))}
              </Box>
            </Menu>
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
                    Characters
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
                    <Box style={{display: 'flex', flexWrap: 'wrap', maxWidth: '500px'}}>
                    {page['list'].map((char) => (
                      <MenuItem component={Link} to={char.link} key={char.name} onClick={handleCloseCharNavMenu}>
                        {char.name}
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
            <Button m={0}
                component={Link} 
                onClick={handleOpenThemeNavMenu}
                sx={{ my: 1, color: 'white', display: 'block' }
            }>
              Theme
            </Button> {/* Desktop view - theme button */}
            <Menu
              id="menu-charbar"
              anchorEl={themeElNav}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              open={Boolean(themeElNav)}
              onClose={handleCloseThemeNavMenu}
              sx={{ display: { xs: 'none', md: 'flex' } }}
            >
              <Box style={{display: 'flex', flexWrap: 'wrap', maxWidth: '500px'}}>
              {themes.map((char) => (
                <MenuItem component={Link} key={char} onClick={() => handleCloseThemeNavMenu(char)}>
                  {char}
                </MenuItem>
              ))}
              </Box>
            </Menu>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
export default NavBar;