'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Link as MuiLink,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded'
import TopicRoundedIcon from '@mui/icons-material/TopicRounded'
import { fa } from '@/lib/format'

interface Slot {
  rank?: number
  window?: string
  start?: string
  archetype?: string
  tier?: number
  activity?: number
  activity_share?: number
  shortcode?: string
  score?: number
  theme?: string
  theme_fit?: number
  caption?: string
  content?: string
  source_url?: string
  reasons?: string[]
}

interface Day {
  date: string
  plan: {
    capacity: number
    generated_at: string | null
    activity_fetched_at: string | null
    slots: Slot[]
    unscheduled: { shortcode?: string; score?: number; reason?: string }[]
  } | null
}

interface ScheduleResponse {
  from: string
  today: string
  days: Day[]
  planFiles: string[]
}

const WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه']

const weekdayFa = (iso: string) => {
  const date = new Date(`${iso}T12:00:00Z`)
  return WEEKDAYS[date.getUTCDay()]
}

const dayFa = (iso: string) => new Intl.DateTimeFormat('fa-IR', { day: 'numeric' }).format(new Date(`${iso}T12:00:00Z`))
const monthFa = (iso: string) => new Intl.DateTimeFormat('fa-IR', { month: 'long' }).format(new Date(`${iso}T12:00:00Z`))
const fullDayFa = (iso: string) =>
  new Intl.DateTimeFormat('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${iso}T12:00:00Z`))

const shiftDate = (iso: string, days: number) => {
  const date = new Date(`${iso}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export default function SchedulePage() {
  const [data, setData] = useState<ScheduleResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [from, setFrom] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    const query = from ? `?from=${from}` : ''
    fetch(`/api/schedule${query}`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('خواندن برنامهٔ انتشار ناموفق بود.')
        return (await response.json()) as ScheduleResponse
      })
      .then((body) => {
        setData(body)
        setError(null)
        setSelected((current) => (current && body.days.some((day) => day.date === current) ? current : body.days[0]?.date ?? null))
      })
      .catch((cause) => setError(String((cause as Error).message ?? cause)))
      .finally(() => setLoading(false))
  }, [from])

  const days = data?.days ?? []
  const total = useMemo(() => days.reduce((sum, day) => sum + (day.plan?.slots.length ?? 0), 0), [days])
  const current = days.find((day) => day.date === selected) ?? days[0] ?? null

  return (
    <Box>
      <Stack spacing={2} sx={{ mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { md: 'flex-end' } }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
              محتوای آماده انتشار
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              متن‌های تأییدشدهٔ شکار، چیده‌شده در بازه‌های فعال مخاطب. {fa.format(total)} محتوا در این هفته.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Button
              size="small"
              startIcon={<ChevronRightRoundedIcon />}
              onClick={() => setFrom(shiftDate(from ?? data?.from ?? new Date().toISOString().slice(0, 10), -7))}
            >
              هفتهٔ قبل
            </Button>
            <Button size="small" variant="outlined" onClick={() => setFrom(null)} disabled={!from}>
              این هفته
            </Button>
            <Button
              size="small"
              endIcon={<ChevronLeftRoundedIcon />}
              onClick={() => setFrom(shiftDate(from ?? data?.from ?? new Date().toISOString().slice(0, 10), 7))}
            >
              هفتهٔ بعد
            </Button>
          </Stack>
        </Stack>

        {error ? <Alert severity="error">{error}</Alert> : null}

        <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 0.5 }}>
          {days.map((day) => {
            const active = day.date === selected
            const count = day.plan?.slots.length ?? 0
            const isToday = day.date === data?.today
            return (
              <Box
                key={day.date}
                onClick={() => setSelected(day.date)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') setSelected(day.date)
                }}
                sx={(t) => ({
                  flex: '1 0 140px',
                  minWidth: 140,
                  cursor: 'pointer',
                  borderRadius: 2,
                  border: 1,
                  p: 1.5,
                  bgcolor: active ? 'action.selected' : 'background.paper',
                  borderColor: active ? 'primary.main' : 'divider',
                  boxShadow: active ? `0 0 0 1px ${t.palette.primary.main}` : 'none',
                  transition: 'background-color .15s, border-color .15s',
                  '&:hover': { borderColor: 'primary.light' },
                })}
              >
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: active ? 'primary.main' : 'text.secondary' }}>
                    {weekdayFa(day.date)}
                  </Typography>
                  {isToday ? <Chip size="small" label="امروز" sx={{ height: 18, fontSize: 10 }} /> : null}
                </Stack>
                <Typography sx={{ fontSize: 22, fontWeight: 700, lineHeight: 1.4, color: count ? 'text.primary' : 'text.disabled' }}>
                  {dayFa(day.date)}
                </Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{monthFa(day.date)}</Typography>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 1 }}>
                  <ScheduleRoundedIcon sx={{ fontSize: 14, color: count ? 'primary.main' : 'text.disabled' }} />
                  <Typography sx={{ fontSize: 11, color: count ? 'text.primary' : 'text.disabled' }}>
                    {count ? `${fa.format(count)} محتوا` : 'برنامه ندارد'}
                  </Typography>
                </Stack>
              </Box>
            )
          })}
        </Box>
      </Stack>

      {loading && !data ? (
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              در حال خواندن برنامه…
            </Typography>
          </CardContent>
        </Card>
      ) : null}

      {current ? (
        <Card>
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 2 }}>
              <Box>
                <Typography sx={{ fontSize: 18, fontWeight: 700 }}>{fullDayFa(current.date)}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {current.plan
                    ? `ساخته‌شده در ${new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(current.plan.generated_at ?? current.date))}`
                    : 'برای این روز برنامه‌ای ساخته نشده است.'}
                </Typography>
              </Box>
              {current.plan ? (
                <Stack direction="row" spacing={1}>
                  <Chip size="small" variant="outlined" label={`ظرفیت: ${fa.format(current.plan.capacity)}`} />
                  {current.plan.unscheduled.length ? (
                    <Chip size="small" color="warning" variant="outlined" label={`${fa.format(current.plan.unscheduled.length)} بدون جای خالی`} />
                  ) : null}
                </Stack>
              ) : null}
            </Stack>

            {!current.plan ? (
              <Alert severity="info" icon={false}>
                <Stack spacing={1}>
                  <Typography variant="body2">هنوز برنامه‌ای برای این روز ساخته نشده است. بعد از تأیید متن‌ها این دستور را اجرا کن:</Typography>
                  <Box
                    dir="ltr"
                    sx={{ fontFamily: 'monospace', fontSize: 12, bgcolor: 'action.hover', borderRadius: 1, px: 1.5, py: 1, alignSelf: 'flex-start' }}
                  >
                    {`npm run plan:content -- --date=${current.date}`}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    خروجی در <Box component="span" dir="ltr" sx={{ fontFamily: 'monospace' }}>data/content-hunt/plans</Box> ذخیره می‌شود.
                  </Typography>
                </Stack>
              </Alert>
            ) : (
              <Grid container spacing={2}>
                {current.plan.slots.map((slot) => (
                  <Grid key={`${slot.shortcode}-${slot.start}`} size={{ xs: 12, md: 6, xl: 4 }}>
                    <Card variant="outlined" sx={{ height: '100%', boxShadow: 'none' }}>
                      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <Box
                              sx={{
                                width: 28,
                                height: 28,
                                borderRadius: 1,
                                display: 'grid',
                                placeItems: 'center',
                                bgcolor: 'primary.main',
                                color: 'primary.contrastText',
                                fontSize: 12,
                                fontWeight: 700,
                              }}
                            >
                              {fa.format(slot.rank ?? 0)}
                            </Box>
                            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{slot.window ?? slot.start ?? '—'}</Typography>
                          </Stack>
                          {typeof slot.score === 'number' ? (
                            <Chip size="small" color={slot.score >= 80 ? 'success' : slot.score >= 70 ? 'warning' : 'default'} label={`امتیاز ${fa.format(slot.score)}`} />
                          ) : null}
                        </Stack>

                        <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                          {slot.archetype ? <Chip size="small" variant="outlined" icon={<TopicRoundedIcon />} label={slot.archetype} /> : null}
                          {slot.theme ? <Chip size="small" variant="outlined" label={slot.theme} /> : null}
                          {typeof slot.activity === 'number' ? (
                            <Chip size="small" variant="outlined" label={`${fa.format(slot.activity)} فالوور فعال`} />
                          ) : null}
                        </Stack>

                        <Divider />

                        <Tooltip title={slot.content ?? ''}>
                          <Typography
                            sx={{
                              fontSize: 13,
                              lineHeight: 1.9,
                              display: '-webkit-box',
                              WebkitLineClamp: 4,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              whiteSpace: 'pre-line',
                            }}
                          >
                            {slot.content || 'متن ثبت نشده'}
                          </Typography>
                        </Tooltip>

                        {slot.caption ? (
                          <Typography
                            sx={{
                              fontSize: 11,
                              color: 'text.secondary',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            کپشن: {slot.caption}
                          </Typography>
                        ) : null}

                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 'auto' }}>
                          {slot.shortcode ? (
                            <Typography sx={{ fontSize: 11, color: 'text.secondary', direction: 'ltr', fontFamily: 'monospace' }}>{slot.shortcode}</Typography>
                          ) : null}
                          <Box sx={{ flexGrow: 1 }} />
                          {slot.source_url ? (
                            <MuiLink
                              href={slot.source_url}
                              target="_blank"
                              rel="noreferrer"
                              sx={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                            >
                              منبع <OpenInNewRoundedIcon sx={{ fontSize: 14 }} />
                            </MuiLink>
                          ) : null}
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}

                {current.plan.unscheduled.length ? (
                  <Grid size={{ xs: 12 }}>
                    <Divider sx={{ my: 1 }} />
                    <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1 }}>تأییدشده اما بدون جای خالی</Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                      {current.plan.unscheduled.map((item) => (
                        <Chip
                          key={`${item.shortcode}-${item.score}`}
                          size="small"
                          variant="outlined"
                          label={`${item.shortcode ?? '—'} · امتیاز ${fa.format(item.score ?? 0)}`}
                        />
                      ))}
                    </Stack>
                  </Grid>
                ) : null}
              </Grid>
            )}
          </CardContent>
        </Card>
      ) : null}
    </Box>
  )
}
