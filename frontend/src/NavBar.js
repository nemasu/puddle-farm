import React, { useState, useEffect } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuIcon from '@mui/icons-material/Menu';
import Container from '@mui/material/Container';
import MenuItem from '@mui/material/MenuItem';
import { Button } from '@mui/material';
import { Link } from "react-router-dom";
import { JSONParse, JSONStringify } from 'json-with-bigint';

var pages = [
  {name:'Top', link:'./top_global'},
  {name:'Characters', list:[]},
];

function resetCharacters() {
  pages[1].list = [];
}

function NavBar() {
  const [anchorElNav, setAnchorElNav] = React.useState(null);

  const [characterElNav, setCharacterElNav] = React.useState(null);

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

  return (
    <AppBar position="static" style={{backgroundImage: "none"}}>
      <Container maxWidth="md">
        <Toolbar disableGutters>
          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              aria-label="Menu"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              color="inherit"
            >
              <MenuIcon />
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
            >
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
          </Box>
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
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
                  </Button>
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
                }>
                  {page.name}
                </MenuItem>
              )
            ))}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
export default NavBar;