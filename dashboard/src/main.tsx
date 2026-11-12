import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CacheProvider } from '@emotion/react'
import createCache from '@emotion/cache'
import { prefixer } from 'stylis'
import rtlPlugin from 'stylis-plugin-rtl'
import { CssBaseline, ThemeProvider } from '@mui/material'
import '@fontsource/vazirmatn/400.css'
import '@fontsource/vazirmatn/500.css'
import '@fontsource/vazirmatn/700.css'
import '@fontsource/noto-naskh-arabic/400.css'
import '@fontsource/noto-naskh-arabic/700.css'
import './index.css'
import App from './App'
import { theme } from './theme'

const cacheRtl = createCache({ key: 'muirtl', stylisPlugins: [prefixer, rtlPlugin] })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CacheProvider value={cacheRtl}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </CacheProvider>
  </StrictMode>,
)
