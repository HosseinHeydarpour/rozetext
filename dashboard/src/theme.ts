import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  direction: 'rtl',
  palette: {
    mode: 'light',
    background: { default: '#F3EDE2', paper: '#FBF8F2' },
    primary: { main: '#8E2F2F', contrastText: '#FBF8F2' },
    secondary: { main: '#17130F' },
    text: { primary: '#17130F', secondary: '#6E6257' },
    divider: '#DCD2C3',
  },
  shape: { borderRadius: 4 },
  typography: {
    fontFamily: 'Vazirmatn, system-ui, sans-serif',
    h1: { fontFamily: '"Noto Naskh Arabic", serif', fontWeight: 700 },
    h2: { fontFamily: '"Noto Naskh Arabic", serif', fontWeight: 700 },
    h3: { fontFamily: '"Noto Naskh Arabic", serif', fontWeight: 700 },
    h4: { fontFamily: '"Noto Naskh Arabic", serif', fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 500 },
    body2: { lineHeight: 1.8 },
  },
  components: {
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 4 } },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          textTransform: 'none',
          borderColor: '#DCD2C3',
          color: '#6E6257',
          '&.Mui-selected': { backgroundColor: '#17130F', color: '#FBF8F2' },
          '&.Mui-selected:hover': { backgroundColor: '#17130F' },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: { root: { borderColor: '#DCD2C3' } },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 4 } },
    },
  },
})
