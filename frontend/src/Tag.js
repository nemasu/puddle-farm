import { styled } from '@mui/material';
import Box from '@mui/material/Box';

//This is to apply the custom tag CSS class to the Box component
//These are common styles to all tags
const Tag = styled(Box)(({ theme }) => ({
  borderRadius: '8px',
  padding: '6px 8px',
  display: 'inline-block',
  marginLeft: '3px',
  marginRight: '3px',
  top: '-4px',
  position: 'relative',
  fontSize: '1rem',
}));

export { Tag };