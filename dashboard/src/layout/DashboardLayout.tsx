import { useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  AppBar,
  Avatar,
  Box,
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
import SpaceDashboardRoundedIcon from '@mui/icons-material/SpaceDashboardRounded'
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded'
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded'
import ThemeToggle from '../components/ThemeToggle'
import { longDateFa, clockFa } from '../lib/format'
import snapshotJson from '../data/snapshot.json'
import type { Snapshot } from '../lib/types'

const snapshot = snapshotJson as unknown as Snapshot
const DRAWER_WIDTH = 248

const navItems = [
  { to: '/', label: 'نمای کلی', title: 'نمای کلی', icon: <SpaceDashboardRoundedIcon /> },
  { to: '/content', label: 'محتوا', title: 'محتوا', icon: <ArticleRoundedIcon /> },
  { to: '/audience', label: 'مخاطب', title: 'مخاطب', icon: <PeopleAltRoundedIcon /> },
]

export default function DashboardLayout() {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const current = useMemo(() => navItems.find((item) => item.to === location.pathname) ?? navItems[0], [location.pathname])

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
            fontSize: 22,
            fontWeight: 900,
            flexShrink: 0,
          }}
        >
          ر
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            روزتکست
          </Typography>
          <Typography variant="caption" color="text.secondary">
            داشبورد رشد
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      <List disablePadding>
        {navItems.map((item) => {
          const selected = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
          return (
            <ListItem key={item.to} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={NavLink}
                to={item.to}
                selected={selected}
                onClick={() => setMobileOpen(false)}
                sx={{ borderRadius: 2 }}
              >
                <ListItemIcon sx={{ minWidth: 38, color: selected ? 'primary.main' : 'text.secondary' }}>{item.icon}</ListItemIcon>
                <ListItemText
                  primary={item.label}
                  sx={{ '& .MuiListItemText-primary': { fontWeight: selected ? 700 : 500, fontSize: 14 } }}
                />
              </ListItemButton>
            </ListItem>
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
        <AppBar
          position="sticky"
          color="inherit"
          elevation={0}
          sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
        >
          <Toolbar sx={{ gap: 1, minHeight: 64 }}>
            <IconButton
              edge="start"
              onClick={() => setMobileOpen(true)}
              sx={{ display: { md: 'none' } }}
              aria-label="باز کردن منو"
            >
              <MenuRoundedIcon />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
              {current.title}
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Tooltip title="تازه‌سازی داده">
              <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                {longDateFa(snapshot.generated_at)}
              </Typography>
            </Tooltip>
            <ThemeToggle />
            <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', color: 'primary.contrastText', fontSize: 16, fontWeight: 700 }}>
              ر
            </Avatar>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, sm: 3 }, width: '100%', maxWidth: 1600, mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
