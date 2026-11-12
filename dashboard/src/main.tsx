import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CacheProvider } from '@emotion/react'
import createCache from '@emotion/cache'
import { prefixer } from 'stylis'
import rtlPlugin from 'stylis-plugin-rtl'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { theme } from './theme'

const cacheRtl = createCache({ key: 'muirtl', stylisPlugins: [prefixer, rtlPlugin] })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CacheProvider value={cacheRtl}>
      <ThemeProvider theme={theme} defaultMode="light" modeStorageKey="rozetext-mode">
        <CssBaseline enableColorScheme />
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </CacheProvider>
  </StrictMode>,
)
