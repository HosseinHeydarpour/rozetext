'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  InputAdornment,
  Link as MuiLink,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import { fa, faCompact } from '@/lib/format'

interface BenchmarkAccount {
  handle: string
  name: string
  cluster: string
  followersLabel: string
  followers: number | null
  posts: number | null
  following: number | null
  avgViews: string
  topViews: string
  archetypes: string[]
  style: string
  url: string
  verified: boolean
  verifiedAt: string | null
  avatar: string | null
}

interface BenchmarkResponse {
  meta: { total_accounts?: number; last_updated?: string; last_run_at?: string }
  clusters: string[]
  accounts: BenchmarkAccount[]
}

export default function BenchmarkPage() {
  const [data, setData] = useState<BenchmarkResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'followers' | 'posts' | 'name'>('followers')

  useEffect(() => {
    fetch('/api/benchmark', { cache: 'no-store' })
      .then((response) => response.json())
      .then((body: BenchmarkResponse) => setData(body))
      .catch(() => setData({ meta: {}, clusters: [], accounts: [] }))
      .finally(() => setLoading(false))
  }, [])

  const rows = useMemo(() => {
    const accounts = data?.accounts ?? []
    const needle = search.trim().toLowerCase()
    return accounts
      .filter((account) => {
        if (!needle) return true
        return (
          account.handle.toLowerCase().includes(needle) ||
          account.name.toLowerCase().includes(needle) ||
          account.cluster.toLowerCase().includes(needle) ||
          account.style.toLowerCase().includes(needle)
        )
      })
      .sort((a, b) => {
        if (sort === 'name') return a.name.localeCompare(b.name, 'fa')
        if (sort === 'posts') return (b.posts ?? 0) - (a.posts ?? 0)
        return (b.followers ?? 0) - (a.followers ?? 0)
      })
  }, [data, search, sort])

  const kpis = useMemo(() => {
    const accounts = data?.accounts ?? []
    const followers = accounts.map((account) => account.followers ?? 0).sort((a, b) => a - b)
    const total = followers.reduce((sum, value) => sum + value, 0)
    const median = followers.length ? followers[Math.floor(followers.length / 2)] : 0
    return [
      { label: 'اکانت‌های مرجع', value: fa.format(accounts.length) },
      { label: 'مجموع فالوور', value: faCompact.format(total) },
      { label: 'میانهٔ فالوور', value: faCompact.format(median) },
      { label: 'بیشترین فالوور', value: faCompact.format(followers[followers.length - 1] ?? 0) },
    ]
  }, [data])

  return (
    <Box>
      <Stack spacing={2} sx={{ mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { md: 'flex-end' } }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
              اکانت‌های مرجع
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {fa.format(data?.accounts.length ?? 0)} پیج هم‌حوزه، با آمار زندهٔ اینستاگرام؛ برای مقایسه با ریل‌های رز تکست.
            </Typography>
          </Box>
          <Chip
            size="small"
            color="primary"
            variant="outlined"
            icon={<VerifiedRoundedIcon />}
            label={
              data?.meta.last_updated
                ? `آخرین بررسی: ${new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(data.meta.last_updated))}`
                : 'در حال خواندن'
            }
          />
        </Stack>

        <Grid container spacing={2}>
          {kpis.map((kpi) => (
            <Grid key={kpi.label} size={{ xs: 6, md: 3 }}>
              <Card>
                <CardContent sx={{ py: 2 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary' }}>{kpi.label}</Typography>
                  <Typography sx={{ fontSize: 24, fontWeight: 700, mt: 0.5 }}>{kpi.value}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            size="small"
            placeholder="جستجو در نام، هندل، خوشه یا سبک محتوا"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ minWidth: 320 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <Box sx={{ flexGrow: 1 }} />
          <TextField
            select
            size="small"
            label="مرتب‌سازی"
            value={sort}
            onChange={(event) => setSort(event.target.value as typeof sort)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="followers">بیشترین فالوور</MenuItem>
            <MenuItem value="posts">بیشترین پست</MenuItem>
            <MenuItem value="name">الفبا</MenuItem>
          </TextField>
        </Stack>
      </Stack>

      {loading ? (
        <Typography variant="body2" color="text.secondary">
          در حال خواندن دیتابیس…
        </Typography>
      ) : null}

      {!loading && rows.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              اکانتی با این فیلتر پیدا نشد.
            </Typography>
          </CardContent>
        </Card>
      ) : null}

      <Grid container spacing={3}>
        {rows.map((account) => (
          <Grid key={account.handle} size={{ xs: 12, sm: 6, lg: 4, xl: 3 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%' }}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Avatar src={account.avatar ?? undefined} alt={account.name} sx={{ width: 52, height: 52, bgcolor: 'primary.main' }}>
                    {account.name.slice(0, 1)}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                      <Typography sx={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {account.name}
                      </Typography>
                      {account.verified ? <VerifiedRoundedIcon sx={{ fontSize: 16, color: 'primary.main' }} /> : null}
                    </Stack>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', direction: 'ltr', textAlign: 'right' }}>
                      {account.handle}
                    </Typography>
                  </Box>
                  <Tooltip title="بازکردن پیج در اینستاگرام">
                    <MuiLink
                      href={account.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`پروفایل ${account.handle}`}
                      sx={{ color: 'text.secondary', display: 'flex' }}
                    >
                      <OpenInNewRoundedIcon fontSize="small" />
                    </MuiLink>
                  </Tooltip>
                </Stack>

                {account.cluster ? (
                  <Chip size="small" label={account.cluster} sx={{ alignSelf: 'flex-start', maxWidth: '100%' }} />
                ) : null}

                <Grid container spacing={1}>
                  <Grid size={4}>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>فالوور</Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                      {account.followers ? faCompact.format(account.followers) : account.followersLabel || '—'}
                    </Typography>
                  </Grid>
                  <Grid size={4}>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>پست</Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                      {account.posts ? fa.format(account.posts) : '—'}
                    </Typography>
                  </Grid>
                  <Grid size={4}>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>فالووینگ</Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                      {account.following ? fa.format(account.following) : '—'}
                    </Typography>
                  </Grid>
                </Grid>

                <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 1.25 }}>
                  <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>میانگین ویو</Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 600, direction: 'ltr' }}>{account.avgViews || '—'}</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', mt: 0.5 }}>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>رکورد ویو</Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{account.topViews || '—'}</Typography>
                  </Stack>
                </Box>

                <Tooltip title={account.style}>
                  <Typography
                    sx={{
                      fontSize: 12,
                      color: 'text.secondary',
                      lineHeight: 1.7,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {account.style || 'سبک محتوا ثبت نشده'}
                  </Typography>
                </Tooltip>

                <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, mt: 'auto' }}>
                  {account.archetypes.map((archetype) => (
                    <Chip key={archetype} size="small" variant="outlined" label={archetype} sx={{ fontSize: 10, height: 20 }} />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
        منبع: <Box component="span" dir="ltr" sx={{ fontFamily: 'monospace' }}>data/benchmark-accounts/benchmark_accounts.json</Box>{' '}
        ·{' '}
        <MuiLink component={Link} href="/content/analyzer" underline="hover">
          مقایسه با ریل‌های خودت
        </MuiLink>
      </Typography>
    </Box>
  )
}
