'use client'

import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter'
import { prefixer } from 'stylis'
import rtlPlugin from 'stylis-plugin-rtl'
import { CssBaseline, ThemeProvider } from '@mui/material'
import DashboardLayout from '@/layout/DashboardLayout'
import { theme } from '@/theme'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ key: 'muirtl', stylisPlugins: [prefixer, rtlPlugin] }}>
      <ThemeProvider theme={theme} defaultMode="light" modeStorageKey="rozetext-mode">
        <CssBaseline enableColorScheme />
        <DashboardLayout>{children}</DashboardLayout>
      </ThemeProvider>
    </AppRouterCacheProvider>
  )
}
