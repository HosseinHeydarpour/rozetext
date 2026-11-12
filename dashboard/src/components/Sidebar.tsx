import { Box, Stack, Typography } from '@mui/material'
import { SpaceDashboardRounded, ArticleRounded, PeopleAltRounded, DownloadRounded } from '@mui/icons-material'
import { longDateFa } from '../lib/format'

interface SidebarProps {
  generatedAt: string
}

const nav = [
  { label: 'نمای کلی', href: '#overview', icon: <SpaceDashboardRounded fontSize="small" />, active: true },
  { label: 'محتوا', href: '#content', icon: <ArticleRounded fontSize="small" />, active: false },
  { label: 'مخاطب', href: '#audience', icon: <PeopleAltRounded fontSize="small" />, active: false },
  { label: 'گزارش‌ها', href: '#reports', icon: <DownloadRounded fontSize="small" />, active: false },
]

export default function Sidebar({ generatedAt }: SidebarProps) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[236px] shrink-0 flex-col justify-between border-e border-line px-5 py-7 lg:flex">
      <div>
        <Stack direction="row" spacing={1.5} className="items-center">
          <Box
            sx={{
              width: 38,
              height: 38,
              bgcolor: 'text.primary',
              color: 'background.paper',
              display: 'grid',
              placeItems: 'center',
              fontFamily: '"Noto Naskh Arabic", serif',
              fontSize: 20,
            }}
          >
            ر
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontSize: 21, lineHeight: 1.2 }}>
              روزتکست
            </Typography>
            <Typography variant="caption" color="text.secondary">
              داشبورد رشد
            </Typography>
          </Box>
        </Stack>

        <nav className="mt-10">
          <Stack spacing={0.5}>
            {nav.map((item) => (
              <Box
                key={item.label}
                component="a"
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors ${
                  item.active ? 'bg-ink text-paper' : 'text-muted hover:bg-surface hover:text-ink'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Box>
            ))}
          </Stack>
        </nav>
      </div>

      <Box className="border-t border-line pt-4">
        <Typography variant="caption" className="block text-muted">
          منبع داده
        </Typography>
        <Typography variant="body2" className="mt-1">
          Meta Business Suite
        </Typography>
        <Typography variant="caption" className="mt-3 block text-muted">
          آخرین همگام‌سازی
        </Typography>
        <Typography variant="body2" className="mt-1">
          {longDateFa(generatedAt)}
        </Typography>
      </Box>
    </aside>
  )
}
