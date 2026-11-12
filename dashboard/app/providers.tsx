'use client'

import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter'
import { CssBaseline, ThemeProvider } from '@mui/material'
import DashboardLayout from '@/layout/DashboardLayout'
import { theme } from '@/theme'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ key: 'muirtl', stylisPlugins: [] }}>
      <ThemeProvider theme={theme} defaultMode="light" modeStorageKey="rozetext-mode">
        <CssBaseline enableColorScheme />
        <DashboardLayout>{children}</DashboardLayout>
      </ThemeProvider>
    </AppRouterCacheProvider>
  )
}
