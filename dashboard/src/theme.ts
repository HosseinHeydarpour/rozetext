import { createTheme } from '@mui/material/styles'

const peyda = 'Peyda, Vazirmatn, system-ui, sans-serif'

// Tokens lifted from the Figma file "Material UI Dashboard Screen (Community)".
const grey = {
  50: '#FCFDFD',
  100: '#F9FAFB',
  200: '#F4F6F8',
  300: '#DFE3E8',
  400: '#C4CDD5',
  500: '#919EAB',
  600: '#637381',
  700: '#454F5B',
  800: '#1C252E',
  900: '#141A21',
}

const lightPalette = {
  mode: 'light' as const,
  primary: { lighter: '#C8FAD6', light: '#5BE49B', main: '#00A76F', dark: '#007867', darker: '#004B50', contrastText: '#FFFFFF' },
  secondary: { lighter: '#EFD6FF', light: '#C684FF', main: '#8E33FF', dark: '#5119B7', darker: '#27097A', contrastText: '#FFFFFF' },
  info: { lighter: '#CAFDF5', light: '#61F3F3', main: '#00B8D9', dark: '#006C9C', darker: '#003768', contrastText: '#FFFFFF' },
  success: { lighter: '#D3FCD2', light: '#77ED8B', main: '#22C55E', dark: '#118D57', darker: '#065E49', contrastText: '#FFFFFF' },
  warning: { lighter: '#FFF5CC', light: '#FFD666', main: '#FFAB00', dark: '#B76E00', darker: '#7A4100', contrastText: '#212B36' },
  error: { lighter: '#FFE9D5', light: '#FFAC82', main: '#FF5630', dark: '#B71D18', darker: '#7A0916', contrastText: '#FFFFFF' },
  grey,
  background: { default: '#F4F6F8', paper: '#FFFFFF' },
  text: { primary: '#141A21', secondary: '#637381', disabled: '#919EAB' },
  divider: 'rgba(145, 158, 171, 0.20)',
  action: {
    active: '#637381',
    hover: 'rgba(145, 158, 171, 0.08)',
    selected: 'rgba(0, 167, 111, 0.08)',
    disabled: 'rgba(145, 158, 171, 0.5)',
    disabledBackground: 'rgba(145, 158, 171, 0.24)',
    focus: 'rgba(145, 158, 171, 0.12)',
  },
}

const darkPalette = {
  mode: 'dark' as const,
  primary: { lighter: '#C8FAD6', light: '#5BE49B', main: '#00A76F', dark: '#007867', darker: '#004B50', contrastText: '#FFFFFF' },
  secondary: { lighter: '#EFD6FF', light: '#C684FF', main: '#8E33FF', dark: '#5119B7', darker: '#27097A', contrastText: '#FFFFFF' },
  info: { lighter: '#CAFDF5', light: '#61F3F3', main: '#00B8D9', dark: '#006C9C', darker: '#003768', contrastText: '#FFFFFF' },
  success: { lighter: '#D3FCD2', light: '#77ED8B', main: '#22C55E', dark: '#118D57', darker: '#065E49', contrastText: '#FFFFFF' },
  warning: { lighter: '#FFF5CC', light: '#FFD666', main: '#FFAB00', dark: '#B76E00', darker: '#7A4100', contrastText: '#212B36' },
  error: { lighter: '#FFE9D5', light: '#FFAC82', main: '#FF5630', dark: '#B71D18', darker: '#7A0916', contrastText: '#FFFFFF' },
  grey,
  background: { default: '#161C24', paper: '#212B36' },
  text: { primary: '#FFFFFF', secondary: '#919EAB', disabled: '#637381' },
  divider: 'rgba(145, 158, 171, 0.24)',
  action: {
    active: '#919EAB',
    hover: 'rgba(145, 158, 171, 0.08)',
    selected: 'rgba(0, 167, 111, 0.16)',
    disabled: 'rgba(145, 158, 171, 0.48)',
    disabledBackground: 'rgba(145, 158, 171, 0.24)',
    focus: 'rgba(145, 158, 171, 0.12)',
  },
}

const cardShadow = '0 0 2px 0 rgba(145, 158, 171, 0.20), 0 12px 24px -4px rgba(145, 158, 171, 0.12)'
const cardShadowDark = '0 0 2px 0 rgba(0, 0, 0, 0.20), 0 12px 24px -4px rgba(0, 0, 0, 0.12)'

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'data-mui-color-scheme' },
  colorSchemes: { light: { palette: lightPalette }, dark: { palette: darkPalette } },
  direction: 'rtl',
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: peyda,
    fontWeightLight: 400,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    h3: { fontFamily: peyda, fontWeight: 700, fontSize: 32, lineHeight: 1.5 },
    h4: { fontFamily: peyda, fontWeight: 700, fontSize: 24, lineHeight: 1.5 },
    h5: { fontFamily: peyda, fontWeight: 700, fontSize: 20, lineHeight: 1.5 },
    h6: { fontFamily: peyda, fontWeight: 700, fontSize: 18, lineHeight: 1.55 },
    subtitle1: { fontWeight: 600, fontSize: 16 },
    subtitle2: { fontWeight: 600, fontSize: 14 },
    body1: { fontSize: 14, lineHeight: 1.6 },
    body2: { fontSize: 14, lineHeight: 1.6 },
    caption: { fontSize: 12, lineHeight: 1.5 },
    button: { textTransform: 'none', fontWeight: 700, fontSize: 14 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: 'var(--mui-palette-background-default)' },
      },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: ({ theme: t }) => ({
          borderRadius: 16,
          backgroundImage: 'none',
          boxShadow: t.palette.mode === 'dark' ? cardShadowDark : cardShadow,
        }),
      },
    },
    MuiCardHeader: {
      defaultProps: { slotProps: { title: { variant: 'h6' } } },
      styleOverrides: {
        root: { padding: 24 },
        title: { fontSize: 18, fontWeight: 700 },
        subheader: { fontSize: 14, marginTop: 4 },
      },
    },
    MuiCardContent: {
      styleOverrides: { root: { padding: 24, '&:last-child': { paddingBottom: 24 } } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 700, minHeight: 36 },
        sizeSmall: { minHeight: 30, fontSize: 13 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6, fontWeight: 600, fontSize: 12 },
        sizeSmall: { height: 24 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: { root: { borderRadius: 8, backgroundColor: 'var(--mui-palette-background-paper)' } },
    },
    MuiTabs: { styleOverrides: { root: { minHeight: 36 } } },
    MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, minHeight: 36 } } },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottomColor: 'var(--mui-palette-divider)', fontSize: 14 },
        head: { color: 'var(--mui-palette-text-secondary)', fontWeight: 600 },
      },
    },
    MuiLinearProgress: {
      styleOverrides: { root: { borderRadius: 99, height: 6, backgroundColor: 'rgba(145, 158, 171, 0.16)' } },
    },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 16, boxShadow: cardShadow } } },
    MuiTooltip: {
      styleOverrides: { tooltip: { borderRadius: 6, fontSize: 12, backgroundColor: '#212B36' } },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: { borderRadius: 8, minHeight: 44 },
      },
    },
  },
})
