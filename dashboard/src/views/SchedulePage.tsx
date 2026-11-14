'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
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
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded'
import TopicRoundedIcon from '@mui/icons-material/TopicRounded'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded'
import { fa } from '@/lib/format'
import {
  BACKGROUNDS,
  COVER_FONT,
  COVER_OFFSET,
  DEFAULT_SAFE_AREA,
  THEMES,
  deriveHook,
  downloadBlob,
  loadImage,
  renderPostBlob,
  type CreatorSettings,
} from '@/lib/creator'

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
  const [building, setBuilding] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ severity: 'success' | 'info' | 'error'; message: string } | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

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
  }, [from, reloadKey])

  const days = data?.days ?? []
  const total = useMemo(() => days.reduce((sum, day) => sum + (day.plan?.slots.length ?? 0), 0), [days])
  const current = days.find((day) => day.date === selected) ?? days[0] ?? null

  const buildPlan = async () => {
    if (!current) return
    setBuilding(true)
    try {
      const response = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ date: current.date }),
      })
      const body = (await response.json()) as { ok: boolean; error?: string; reason?: string; plan?: { slots?: unknown[] } }
      if (!body.ok) {
        setNotice({ severity: body.reason === 'no-candidates' ? 'info' : 'error', message: body.error ?? 'ساخت برنامه ناموفق بود.' })
        return
      }
      setNotice({ severity: 'success', message: `برنامهٔ ${current.date} ساخته شد.` })
      setReloadKey((value) => value + 1)
    } catch (cause) {
      setNotice({ severity: 'error', message: String((cause as Error).message ?? cause) })
    } finally {
      setBuilding(false)
    }
  }

  const exportDay = async (day: Day) => {
    const slots = day.plan?.slots ?? []
    if (slots.length === 0) return
    setExporting(day.date)
    try {
      await Promise.all([document.fonts.load('700 55px IRLotus'), document.fonts.load('400 92px IRTitr')])
      const base: CreatorSettings = {
        mode: 'dark',
        kind: 'text',
        align: 'center',
        highlight: 'box',
        fitInside: true,
        body: '',
        hook: '',
        fontSize: THEMES.dark.fontSize,
        lineHeight: THEMES.dark.lineHeight,
        offsetY: 0,
        offsetX: 0,
        textColor: THEMES.dark.text,
        highlightColor: THEMES.dark.accent,
        safeArea: { ...DEFAULT_SAFE_AREA },
        background: THEMES.dark.background,
        backgroundImage: BACKGROUNDS.dark.text,
        showSafeArea: false,
      }

      for (const [index, slot] of slots.entries()) {
        const content = slot.content ?? ''
        if (!content.trim()) continue
        const order = String(index + 1).padStart(2, '0')

        const cover = await renderPostBlob({
          ...base,
          kind: 'cover',
          hook: deriveHook(content),
          fontSize: COVER_FONT.fontSize,
          lineHeight: COVER_FONT.lineHeight,
          offsetY: COVER_OFFSET,
          backgroundImage: BACKGROUNDS.dark.cover,
        })
        downloadBlob(cover, `${day.date}-${order}-cover.png`)
        await new Promise((resolve) => setTimeout(resolve, 350))

        const post = await renderPostBlob({ ...base, kind: 'text', body: content })
        downloadBlob(post, `${day.date}-${order}-text.png`)
        await new Promise((resolve) => setTimeout(resolve, 350))
      }
      setNotice({ severity: 'success', message: `${fa.format(slots.length * 2)} تصویر برای ${fullDayFa(day.date)} ساخته شد.` })
    } catch (cause) {
      setNotice({ severity: 'error', message: String((cause as Error).message ?? cause) })
    } finally {
      setExporting(null)
    }
  }

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
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Chip size="small" variant="outlined" label={`ظرفیت: ${fa.format(current.plan.capacity)}`} />
                  {current.plan.unscheduled.length ? (
                    <Chip size="small" color="warning" variant="outlined" label={`${fa.format(current.plan.unscheduled.length)} بدون جای خالی`} />
                  ) : null}
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<DownloadRoundedIcon />}
                    onClick={() => void exportDay(current)}
                    disabled={exporting === current.date || current.plan.slots.length === 0}
                  >
                    {exporting === current.date ? 'در حال ساخت…' : 'خروجی کل روز'}
                  </Button>
                </Stack>
              ) : (
                <Button size="small" variant="contained" startIcon={<ReplayRoundedIcon />} onClick={() => void buildPlan()} disabled={building}>
                  {building ? 'در حال ساخت…' : 'ساخت برنامهٔ این روز'}
                </Button>
              )}
            </Stack>

            {!current.plan ? (
              <Alert severity="info" icon={false}>
                <Stack spacing={1}>
                  <Typography variant="body2">
                    برای این روز هنوز چیزی چیده نشده است. برنامه وقتی ساخته می‌شود که اسکیل شکار متن، چند متن را تأیید کرده و در دیتابیس گذاشته باشد؛
                    بعد از آن، دکمهٔ «ساخت برنامهٔ این روز» متن‌ها را روی ساعت‌های فعال مخاطب می‌چیند.
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    اگر می‌خواهی از ترمینال اجرا کنی:{' '}
                    <Box component="span" dir="ltr" sx={{ fontFamily: 'monospace' }}>
                      npm run plan:content -- --date={current.date}
                    </Box>
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
                          {slot.shortcode ? (
                            <Button
                              size="small"
                              component={Link}
                              href={`/content/creator?date=${current.date}&shortcode=${encodeURIComponent(slot.shortcode)}`}
                              startIcon={<AutoAwesomeRoundedIcon />}
                              sx={{ fontSize: 12 }}
                            >
                              ساخت پست
                            </Button>
                          ) : null}
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

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={6000}
        onClose={() => setNotice(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert severity={notice?.severity ?? 'info'} onClose={() => setNotice(null)} sx={{ maxWidth: 520 }}>
          {notice?.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
