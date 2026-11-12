import { createTheme } from '@mui/material/styles'

const peyda = 'Peyda, Vazirmatn, system-ui, sans-serif'

const lightPalette = {
  mode: 'light' as const,
  primary: { main: '#8E3B46', light: '#B56A74', dark: '#63252D', contrastText: '#FFFFFF' },
  secondary: { main: '#2F6B5F', light: '#5F978B', dark: '#1E4A41', contrastText: '#FFFFFF' },
  background: { default: '#F6F4F0', paper: '#FFFFFF' },
  text: { primary: '#1B1A17', secondary: '#6B6862' },
  divider: 'rgba(27, 26, 23, 0.10)',
  success: { main: '#2E7D32' },
  error: { main: '#C62828' },
  warning: { main: '#B26A00' },
  info: { main: '#2F6B5F' },
}

const darkPalette = {
  mode: 'dark' as const,
  primary: { main: '#E7A0A8', light: '#F2C3C8', dark: '#B97680', contrastText: '#2A1013' },
  secondary: { main: '#8CC7B9', light: '#B3DED5', dark: '#5F9C8F', contrastText: '#0E211D' },
  background: { default: '#0F1115', paper: '#171A21' },
  text: { primary: '#F3F1ED', secondary: '#A8A49C' },
  divider: 'rgba(255, 255, 255, 0.10)',
  success: { main: '#7CCB80' },
  error: { main: '#F08A8A' },
  warning: { main: '#E2B25F' },
  info: { main: '#8CC7B9' },
}

export const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'data-mui-color-scheme',
  },
  colorSchemes: {
    light: { palette: lightPalette },
    dark: { palette: darkPalette },
  },
  direction: 'rtl',
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: peyda,
    fontWeightLight: 400,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    h1: { fontFamily: peyda, fontWeight: 700 },
    h2: { fontFamily: peyda, fontWeight: 700 },
    h3: { fontFamily: peyda, fontWeight: 700 },
    h4: { fontFamily: peyda, fontWeight: 700 },
    h5: { fontFamily: peyda, fontWeight: 700 },
    h6: { fontFamily: peyda, fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 500 },
    body2: { lineHeight: 1.9 },
  },
  components: {
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderColor: 'var(--mui-palette-divider)',
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 10 } },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 8 } },
    },
    MuiCardHeader: {
      defaultProps: { slotProps: { title: { variant: 'h6' } } },
    },
  },
})
