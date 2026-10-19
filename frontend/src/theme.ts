import { createTheme } from '@mui/material/styles';

const MONO = '"Helvetica Neue", Inter, "Segoe UI", Arial, sans-serif';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#e7e5e4' },
    secondary: { main: '#a8a29e' },
    background: { default: '#0a0a0a', paper: '#141414' },
    text: { primary: '#f5f5f4', secondary: '#8a8a8a' },
    divider: '#2a2a2a',
    error: { main: '#d4d4d4' },
    warning: { main: '#c8c8c8' },
    info: { main: '#9ca3af' },
    success: { main: '#a3a3a3' },
  },
  shape: { borderRadius: 2 },
  typography: {
    fontFamily: MONO,
    button: { textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 600, fontSize: 12 },
    h4: { textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 },
    h5: { textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800 },
    h6: { textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 },
    subtitle1: { textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700 },
    subtitle2: { textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 },
  },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 0 },
        contained: { borderRadius: 0 },
        outlined: { borderRadius: 0, borderColor: '#3f3f3f' },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 0 },
        notchedOutline: { borderColor: '#333' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 1, fontWeight: 600, letterSpacing: '0.06em' },
        outlined: { borderColor: '#3f3f3f' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { backgroundImage: 'none', boxShadow: 'none', borderBottom: '1px solid #262626' },
        colorInherit: { backgroundColor: '#0f0f0f', color: '#f5f5f4' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: '1px solid #262626',
          backgroundImage: 'none',
          transition: 'border-color 120ms ease',
          '&:hover': { borderColor: '#e7e5e4' },
        },
      },
    },
  },
});

export const boardTheme = theme;
