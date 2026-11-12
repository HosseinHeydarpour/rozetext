'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  AppBar,
  Avatar,
  Box,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import MenuRoundedIcon from '@mui/icons-material/MenuRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded'
import SpaceDashboardRoundedIcon from '@mui/icons-material/SpaceDashboardRounded'
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded'
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded'
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded'
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded'
import ThemeToggle from '@/components/ThemeToggle'
import { longDateFa } from '@/lib/format'
import snapshotJson from '@/data/snapshot.json'
import type { Snapshot } from '@/lib/types'

const snapshot = snapshotJson as unknown as Snapshot
const DRAWER_WIDTH = 280
const HEADER_HEIGHT = 80

type NavItem = {
  to: string
  label: string
  icon: React.ReactNode
  children?: { to: string; label: string; icon: React.ReactNode }[]
}

const navItems: NavItem[] = [
  { to: '/', label: 'نمای کلی', icon: <SpaceDashboardRoundedIcon /> },
  {
    to: '/content',
    label: 'محتوا',
    icon: <ArticleRoundedIcon />,
    children: [
      { to: '/content/analyzer', label: 'آنالیزور', icon: <InsightsRoundedIcon fontSize="small" /> },
      { to: '/content', label: 'پست‌ها', icon: <GridViewRoundedIcon fontSize="small" /> },
    ],
  },
  { to: '/audience', label: 'مخاطب', icon: <PeopleAltRoundedIcon /> },
]

const titles: Record<string, string> = {
  '/': 'نمای کلی',
  '/content': 'محتوا',
  '/content/analyzer': 'آنالیزور محتوا',
  '/audience': 'مخاطب',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [contentOpen, setContentOpen] = useState(pathname.startsWith('/content'))
  const [query, setQuery] = useState('')

  const title = useMemo(() => titles[pathname] ?? 'نمای کلی', [pathname])
  const isActive = (to: string) => (to === '/' ? pathname === '/' : pathname === to)
  const inSection = (to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to))

  const submitSearch = () => {
    const value = query.trim()
    if (!value) return
    router.push(`/content/analyzer?q=${encodeURIComponent(value)}`)
    setQuery('')
    setMobileOpen(false)
  }

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', px: 3, py: 3 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1.5,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            display: 'grid',
            placeItems: 'center',
            fontSize: 20,
            fontWeight: 900,
            flexShrink: 0,
          }}
        >
          ر
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 16, lineHeight: 1.4 }}>رز تکست</Typography>
          <Typography variant="caption" color="text.secondary">
            داشبورد رشد
          </Typography>
        </Box>
      </Stack>

      <Box sx={{ px: 3, pb: 1 }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'text.disabled' }}>منو</Typography>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 2 }}>
        <List disablePadding>
          {navItems.map((item) => {
            const selected = isActive(item.to)
            const open = item.children ? contentOpen : false
            const parentActive = item.children ? inSection(item.to) : selected
            return (
              <Box key={item.to}>
                <ListItem disablePadding>
                  {item.children ? (
                    <ListItemButton
                      onClick={() => setContentOpen((value) => !value)}
                      selected={parentActive}
                      sx={{ px: 1.5, py: 1, mb: 0.5 }}
                    >
                      <ListItemIcon sx={{ minWidth: 36, color: parentActive ? 'primary.main' : 'text.secondary' }}>{item.icon}</ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        sx={{ '& .MuiListItemText-primary': { fontSize: 14, fontWeight: parentActive ? 700 : 600 } }}
                      />
                      {open ? <ExpandLessRoundedIcon fontSize="small" /> : <ExpandMoreRoundedIcon fontSize="small" />}
                    </ListItemButton>
                  ) : (
                    <ListItemButton
                      component={Link}
                      href={item.to}
                      selected={selected}
                      onClick={() => setMobileOpen(false)}
                      sx={{ px: 1.5, py: 1, mb: 0.5 }}
                    >
                      <ListItemIcon sx={{ minWidth: 36, color: selected ? 'primary.main' : 'text.secondary' }}>{item.icon}</ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        sx={{ '& .MuiListItemText-primary': { fontSize: 14, fontWeight: selected ? 700 : 600 } }}
                      />
                    </ListItemButton>
                  )}
                </ListItem>
                {item.children ? (
                  <Collapse in={open} timeout="auto" unmountOnExit>
                    <List disablePadding sx={{ pr: 2, pb: 0.5 }}>
                      {item.children.map((child) => (
                        <ListItem key={child.to} disablePadding>
                          <ListItemButton
                            component={Link}
                            href={child.to}
                            selected={isActive(child.to)}
                            onClick={() => setMobileOpen(false)}
                            sx={{ px: 1.5, minHeight: 40, mb: 0.5 }}
                          >
                            <ListItemIcon sx={{ minWidth: 30, color: isActive(child.to) ? 'primary.main' : 'text.secondary' }}>
                              {child.icon}
                            </ListItemIcon>
                            <ListItemText
                              primary={child.label}
                              sx={{ '& .MuiListItemText-primary': { fontSize: 13, fontWeight: isActive(child.to) ? 700 : 600 } }}
                            />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </Collapse>
                ) : null}
              </Box>
            )
          })}
        </List>
      </Box>

      <Box sx={{ p: 2 }}>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          منبع داده
        </Typography>
        <Typography sx={{ fontSize: 13, fontWeight: 600, mt: 0.25 }}>Meta Business Suite</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          آخرین همگام‌سازی
        </Typography>
        <Typography sx={{ fontSize: 13, fontWeight: 600, mt: 0.25 }}>{longDateFa(snapshot.generated_at)}</Typography>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Drawer
        variant="permanent"
        anchor="right"
        open
        sx={{
          display: { xs: 'none', md: 'block' },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            position: 'relative',
            borderLeft: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          },
        }}
      >
        {drawer}
      </Drawer>

      <Drawer
        variant="temporary"
        anchor="right"
        open={!isDesktop && mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
      >
        {drawer}
      </Drawer>

      <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <AppBar
          position="sticky"
          color="transparent"
          elevation={0}
          sx={{
            height: HEADER_HEIGHT,
            bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(33, 43, 54, 0.80)' : 'rgba(255, 255, 255, 0.80)'),
            backdropFilter: 'blur(6px)',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Toolbar sx={{ height: HEADER_HEIGHT, minHeight: `${HEADER_HEIGHT}px !important`, gap: 1.5, px: { xs: 2, md: 3 } }}>
            <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ display: { md: 'none' } }} aria-label="باز کردن منو">
              <MenuRoundedIcon />
            </IconButton>

            <TextField
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submitSearch()
              }}
              placeholder="جستجو…"
              size="small"
              aria-label="جستجو در ریل‌ها"
              sx={{
                width: { xs: 160, sm: 240 },
                '& .MuiOutlinedInput-root': {
                  height: 40,
                  bgcolor: 'transparent',
                  '& fieldset': { borderColor: 'transparent' },
                  '&:hover fieldset': { borderColor: 'divider' },
                  '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                },
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Box
                        sx={{
                          px: 0.75,
                          py: 0.25,
                          borderRadius: 1,
                          bgcolor: 'action.hover',
                          color: 'text.secondary',
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        ⏎
                      </Box>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Box sx={{ flexGrow: 1 }} />

            <Tooltip title="تاریخ آخرین همگام‌سازی">
              <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                {longDateFa(snapshot.generated_at)}
              </Typography>
            </Tooltip>
            <ThemeToggle />
            <Box sx={{ p: 0.5, borderRadius: '50%', bgcolor: 'action.hover' }}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', color: 'primary.contrastText', fontSize: 15, fontWeight: 700 }}>
                ر
              </Avatar>
            </Box>
          </Toolbar>
        </AppBar>

        <Box sx={{ px: { xs: 2, md: 3 }, pb: 1, pt: 0.5, display: { xs: 'block', md: 'none' } }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
        </Box>

        <Box component="main" sx={{ flexGrow: 1, width: '100%' }}>
          <Box sx={{ maxWidth: 1230, mx: 'auto', px: { xs: 2, md: 3 }, py: 3 }}>{children}</Box>
        </Box>
      </Box>
    </Box>
  )
}
