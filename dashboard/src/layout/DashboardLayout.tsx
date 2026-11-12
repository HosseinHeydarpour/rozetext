'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  AppBar,
  Avatar,
  Box,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import MenuRoundedIcon from '@mui/icons-material/MenuRounded'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded'
import SpaceDashboardRoundedIcon from '@mui/icons-material/SpaceDashboardRounded'
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded'
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded'
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded'
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded'
import ThemeToggle from '@/components/ThemeToggle'
import { longDateFa, clockFa } from '@/lib/format'
import snapshotJson from '@/data/snapshot.json'
import type { Snapshot } from '@/lib/types'

const snapshot = snapshotJson as unknown as Snapshot
const DRAWER_WIDTH = 252

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
  const [mobileOpen, setMobileOpen] = useState(false)
  const [contentOpen, setContentOpen] = useState(pathname.startsWith('/content'))

  const title = useMemo(() => titles[pathname] ?? 'نمای کلی', [pathname])

  const isActive = (to: string) => (to === '/' ? pathname === '/' : pathname === to)
  const inSection = (to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to))

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1, py: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
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
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            رز تکست
          </Typography>
          <Typography variant="caption" color="text.secondary">
            داشبورد رشد
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      <List disablePadding>
        {navItems.map((item) => {
          const selected = isActive(item.to)
          const open = item.children ? contentOpen : false
          return (
            <Box key={item.to}>
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                {item.children ? (
                  <ListItemButton
                    onClick={() => setContentOpen((value) => !value)}
                    selected={inSection(item.to)}
                    sx={{ borderRadius: 2, width: '100%', textAlign: 'start' }}
                  >
                    <ListItemIcon sx={{ minWidth: 38, color: inSection(item.to) ? 'primary.main' : 'text.secondary' }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      sx={{ '& .MuiListItemText-primary': { fontWeight: inSection(item.to) ? 700 : 500, fontSize: 14 } }}
                    />
                    {open ? <ExpandLessRoundedIcon fontSize="small" /> : <ExpandMoreRoundedIcon fontSize="small" />}
                  </ListItemButton>
                ) : (
                  <ListItemButton
                    component={Link}
                    href={item.to}
                    selected={selected}
                    onClick={() => setMobileOpen(false)}
                    sx={{ borderRadius: 2, width: '100%' }}
                  >
                    <ListItemIcon sx={{ minWidth: 38, color: selected ? 'primary.main' : 'text.secondary' }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      sx={{ '& .MuiListItemText-primary': { fontWeight: selected ? 700 : 500, fontSize: 14 } }}
                    />
                  </ListItemButton>
                )}
              </ListItem>
              {item.children ? (
                <Collapse in={open} timeout="auto" unmountOnExit>
                  <List disablePadding sx={{ pr: 3 }}>
                    {item.children.map((child) => (
                      <ListItem key={child.to} disablePadding sx={{ mb: 0.5 }}>
                        <ListItemButton
                          component={Link}
                          href={child.to}
                          selected={isActive(child.to)}
                          onClick={() => setMobileOpen(false)}
                          sx={{ borderRadius: 2, py: 0.6 }}
                        >
                          <ListItemIcon sx={{ minWidth: 30, color: isActive(child.to) ? 'primary.main' : 'text.secondary' }}>
                            {child.icon}
                          </ListItemIcon>
                          <ListItemText
                            primary={child.label}
                            sx={{ '& .MuiListItemText-primary': { fontWeight: isActive(child.to) ? 700 : 500, fontSize: 13 } }}
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

      <Box sx={{ mt: 'auto' }}>
        <Divider sx={{ my: 2 }} />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 1 }}>
          منبع داده
        </Typography>
        <Typography variant="body2" sx={{ px: 1, mt: 0.5 }}>
          Meta Business Suite
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 1, mt: 1.5 }}>
          آخرین همگام‌سازی
        </Typography>
        <Typography variant="body2" sx={{ px: 1, mt: 0.5 }}>
          {longDateFa(snapshot.generated_at)}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 1, mt: 0.5 }}>
          ساعت {clockFa(snapshot.generated_at)}
        </Typography>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Drawer
        variant="permanent"
        anchor="right"
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
        open
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
        <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Toolbar sx={{ gap: 1, minHeight: 64 }}>
            <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ display: { md: 'none' } }} aria-label="باز کردن منو">
              <MenuRoundedIcon />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Tooltip title="تاریخ آخرین همگام‌سازی داده">
              <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                {longDateFa(snapshot.generated_at)}
              </Typography>
            </Tooltip>
            <ThemeToggle />
            <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', color: 'primary.contrastText', fontSize: 16, fontWeight: 700 }}>ر</Avatar>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, sm: 3 }, width: '100%', maxWidth: 1600, mx: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  )
}
