import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Box, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import snapshotJson from './data/snapshot.json'
import type { RangeKey, Snapshot } from './lib/types'
import { dateFa, excerpt, fa, faCompact, faCompactExact, longDateFa, parseCompact, pct } from './lib/format'
import LineChart from './components/LineChart'
import Sidebar from './components/Sidebar'
import PostsTable from './components/PostsTable'
import AgeGender from './components/AgeGender'

const snapshot = snapshotJson as unknown as Snapshot
const ORDER: RangeKey[] = [
  'yesterday',
  'last-7-days',
  'last-28-days',
  'last-90-days',
  'this-week',
  'this-month',
  'this-year',
]

function MiniBars({ values }: { values: number[] }) {
  const max = Math.max(...values, 1)
  return (
    <Box className="flex h-12 items-end gap-[2px]" dir="ltr">
      {values.map((value, index) => (
        <Box
          key={index}
          sx={{
            flex: 1,
            height: `${Math.max((value / max) * 100, 2)}%`,
            bgcolor: 'text.primary',
            opacity: 0.75,
          }}
        />
      ))}
    </Box>
  )
}

function KpiCard({ children, span }: { children: ReactNode; span: string }) {
  return (
    <Paper
      variant="outlined"
      className={span}
      sx={{ borderColor: 'divider', bgcolor: 'background.paper', p: 3, minHeight: 168 }}
    >
      {children}
    </Paper>
  )
}

export default function App() {
  const [range, setRange] = useState<RangeKey>('last-28-days')
  const rangeData = snapshot.ranges[range]

  const followValues = useMemo(() => snapshot.follows.daily.map((point) => point.value), [])
  const followsCount = parseCompact(snapshot.follows.total)
  const unfollowsCount = parseCompact(snapshot.follows.unfollows)
  const lifetimeFollowers = parseCompact(snapshot.follows.followersLifetime)
  const hours = useMemo(() => Object.entries(snapshot.activeTimes), [])
  const maxHour = Math.max(...hours.map(([, value]) => value), 1)

  const firstDate = rangeData.series.views[0]?.date
  const lastDate = rangeData.series.views[rangeData.series.views.length - 1]?.date
  const is28 = range === 'last-28-days'
  const noDar = ['yesterday', 'this-week', 'this-month', 'this-year']
  const chartTitle = noDar.includes(range) ? `ویو ${rangeData.label}` : `ویو در ${rangeData.label}`
  const headline =
    range === 'yesterday'
      ? 'آنچه پیج دیروز انجام داد'
      : range === 'this-week' || range === 'this-month' || range === 'this-year'
        ? `آنچه پیج ${rangeData.label} انجام داد`
        : `آنچه پیج در ${rangeData.label} گذشته انجام داد`

  return (
    <div className="flex min-h-screen">
      <Sidebar generatedAt={snapshot.generated_at} />

      <main className="min-w-0 flex-1 px-5 pb-10 pt-6 sm:px-8 lg:px-12">
        <div className="mb-8 flex items-center justify-between border-b border-line pb-4 lg:hidden">
          <Stack direction="row" spacing={1.5} className="items-center">
            <Box
              sx={{
                width: 32,
                height: 32,
                bgcolor: 'text.primary',
                color: 'background.paper',
                display: 'grid',
                placeItems: 'center',
                fontFamily: '"Noto Naskh Arabic", serif',
                fontSize: 18,
              }}
            >
              ر
            </Box>
            <Typography variant="h4" sx={{ fontSize: 19 }}>
              روزتکست
            </Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            دادهٔ محلی
          </Typography>
        </div>

        <header className="flex flex-col gap-6 border-b border-line pb-7 md:flex-row md:items-end md:justify-between">
          <Box className="w-full max-w-[760px] text-right">
            <Typography
              variant="overline"
              className="block tracking-[0.18em] text-muted"
              sx={{ width: '100%' }}
            >
              داشبورد رشد · {snapshot.account.username}
            </Typography>
            <Typography
              component="h1"
              sx={{
                fontFamily: '"Noto Naskh Arabic", serif',
                fontSize: { xs: 40, md: 56 },
                fontWeight: 700,
                lineHeight: 1.08,
                mt: 1,
              }}
            >
              {headline}
            </Typography>
            <Typography className="mt-3 max-w-[560px] text-[14px] leading-7 text-muted">
              ۵۱۲ ریلز، {fa.format(snapshot.account.followers)} فالوور و {faCompact.format(snapshot.kpis.viewsTotal)} ویو
              ثبت‌شده. این صفحه فقط از دادهٔ واقعیِ اکسپورت‌شده می‌خواند؛ عدد تخمینی جایی ندارد.
            </Typography>
          </Box>

          <Stack spacing={1} className="shrink-0 text-left md:text-right">
            <Typography variant="caption" className="text-muted">
              آخرین داده
            </Typography>
            <Typography variant="body2">
              {longDateFa(snapshot.generated_at)}
            </Typography>
            <Typography variant="caption" className="text-muted">
              {fa.format(snapshot.account.posts)} ریلز · {fa.format(snapshot.account.followers)} فالوور
            </Typography>
          </Stack>
        </header>

        <section id="overview" className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-12">
          <KpiCard span="md:col-span-4">
            <Typography variant="caption" className="text-muted">
              فالوور
            </Typography>
            <Typography className="num mt-1 leading-none" sx={{ fontSize: 52 }}>
              {fa.format(snapshot.account.followers)}
            </Typography>
            <Stack direction="row" className="mt-3 items-baseline gap-3">
              <Typography variant="body2">
                <span className="num">{followsCount ? faCompactExact(followsCount) : 'بی‌داده'}</span> فالو
              </Typography>
              <Typography variant="caption" className="text-muted">
                ۲۸ روز گذشته
              </Typography>
            </Stack>
            <Box className="mt-4">
              <MiniBars values={followValues} />
            </Box>
          </KpiCard>

          <KpiCard span="md:col-span-3">
            <Typography variant="caption" className="text-muted">
              ویو · {rangeData.label}
            </Typography>
            <Typography className="num mt-1 leading-none" sx={{ fontSize: 38 }}>
              {faCompact.format(rangeData.totals.views)}
            </Typography>
            <Typography variant="caption" className="mt-3 block text-muted">
              {is28 && snapshot.kpis.nonFollowersPct != null ? `${pct(snapshot.kpis.nonFollowersPct)} غیرفالوور` : 'سهم غیرفالوور: ۲۸ روز'}
            </Typography>
            <Typography variant="caption" className="mt-1 block text-muted">
              {firstDate && lastDate ? `${dateFa(firstDate)} تا ${dateFa(lastDate)}` : 'بی‌داده'}
            </Typography>
          </KpiCard>

          <KpiCard span="md:col-span-3">
            <Typography variant="caption" className="text-muted">
              تعامل · {rangeData.label}
            </Typography>
            <Typography className="num mt-1 leading-none" sx={{ fontSize: 36 }}>
              {faCompact.format(rangeData.totals.interactions)}
            </Typography>
            <Typography variant="caption" className="mt-3 block text-muted">
              {is28 && snapshot.kpis.accountsEngaged
                ? `${faCompact.format(snapshot.kpis.accountsEngaged)} اکانت درگیر`
                : 'اکانت‌های درگیر: فقط ۲۸ روز'}
            </Typography>
          </KpiCard>

          <KpiCard span="md:col-span-2">
            <Typography variant="caption" className="text-muted">
              نرخ سیو (کل)
            </Typography>
            <Typography className="num mt-1 leading-none" sx={{ fontSize: 36, color: 'primary.main' }}>
              {pct(snapshot.kpis.saveRate * 100)}
            </Typography>
            <Typography variant="caption" className="mt-3 block text-muted">
              {faCompact.format(snapshot.kpis.savesTotal)} سیو از {faCompact.format(snapshot.kpis.viewsTotal)} ویو
            </Typography>
            <Typography variant="caption" className="mt-1 block text-muted">
              میانگین هر ریلز {fa.format(Math.round(snapshot.kpis.savesTotal / Math.max(snapshot.account.posts, 1)))} سیو
            </Typography>
          </KpiCard>
        </section>

        <section className="mt-12 border-t border-line pt-7">
          <Stack direction={{ xs: 'column', md: 'row' }} className="items-start justify-between gap-4">
            <Box>
              <Typography variant="overline" className="tracking-[0.18em] text-muted">
                روند
              </Typography>
              <Typography variant="h2" sx={{ fontSize: 30, mt: 0.5 }}>
                {chartTitle}
              </Typography>
            </Box>
            <ToggleButtonGroup
              value={range}
              exclusive
              size="small"
              onChange={(_, value: RangeKey | null) => value && setRange(value)}
              sx={{ flexWrap: 'wrap', gap: 0.5 }}
            >
              {ORDER.map((key) => (
                <ToggleButton key={key} value={key} sx={{ px: 1.4, py: 0.5, fontSize: 12 }}>
                  {snapshot.ranges[key].label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Stack>

          <div className="mt-7 grid grid-cols-1 gap-8 lg:grid-cols-12">
            <Box className="lg:col-span-8">
              <LineChart data={rangeData.series.views} />
              {range === 'this-year' && (
                <Typography variant="caption" className="mt-2 block text-muted">
                  اینستاگرام برای بازهٔ «امسال» حداکثر ۹۰ روز داده می‌دهد.
                </Typography>
              )}
            </Box>

            <Box className="lg:col-span-4">
              <Typography variant="h4" sx={{ fontSize: 21 }}>
                رشد فالوور
              </Typography>
              <Stack direction="row" className="mt-3 items-baseline gap-4">
                <Typography className="num" sx={{ fontSize: 34 }}>
                  {followsCount ? faCompactExact(followsCount) : 'بی‌داده'}
                </Typography>
                <Typography variant="caption" className="text-muted">
                  فالو در ۲۸ روز
                </Typography>
              </Stack>
              <Typography variant="body2" className="mt-1 text-muted">
                {unfollowsCount ? fa.format(unfollowsCount) : 'بی‌داده'} آنفالو · فالوور کل{' '}
                {lifetimeFollowers ? fa.format(lifetimeFollowers) : 'بی‌داده'}
              </Typography>
              <Box className="mt-5">
                <MiniBars values={followValues} />
              </Box>
              <Typography variant="caption" className="mt-3 block text-muted">
                روزانه، از بخش Trends؛ ارزش هر ستون یک روز است.
              </Typography>
            </Box>
          </div>
        </section>

        <section id="content" className="mt-12 border-t border-line pt-7">
          <Typography variant="overline" className="tracking-[0.18em] text-muted">
            محتوا
          </Typography>
          <Typography variant="h2" sx={{ fontSize: 30, mt: 0.5 }}>
            چه چیزی کار کرد
          </Typography>

          <div className="mt-7 grid grid-cols-1 gap-6 xl:grid-cols-12">
            <Box className="xl:col-span-8">
              <PostsTable rows={snapshot.recentContent} />
            </Box>

            <Paper
              variant="outlined"
              className="xl:col-span-4"
              sx={{ borderColor: 'divider', bgcolor: 'background.paper', p: 3 }}
            >
              <Typography variant="h4" sx={{ fontSize: 21 }}>
                پست‌های برتر بر اساس سیو
              </Typography>
              <Typography variant="caption" className="mt-1 block text-muted">
                از میان {fa.format(snapshot.account.posts)} ریلز
              </Typography>

              <Stack spacing={2.6} className="mt-5">
                {snapshot.topBySaves.slice(0, 5).map((post, index) => (
                  <Box key={post.id}>
                    <Stack direction="row" spacing={2} className="items-start">
                      <Typography className="num shrink-0" sx={{ fontSize: 20, lineHeight: 1.4 }}>
                        {fa.format(index + 1)}
                      </Typography>
                      <Box className="min-w-0">
                        <Typography
                          variant="body2"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            lineHeight: 1.9,
                          }}
                        >
                          {excerpt(post.caption, 90)}
                        </Typography>
                        <Stack direction="row" spacing={3} className="mt-1.5">
                          <Typography variant="caption" className="num text-muted">
                            {faCompact.format(post.saves ?? 0)} سیو
                          </Typography>
                          <Typography variant="caption" className="num text-muted">
                            {faCompact.format(post.views ?? 0)} ویو
                          </Typography>
                        </Stack>
                      </Box>
                    </Stack>
                    {index < 4 && <Box className="mt-2.5 border-b border-line/70" />}
                  </Box>
                ))}
              </Stack>

              <Box className="mt-5 border-t border-line pt-3">
                <Typography variant="caption" className="text-muted">
                  محتوای منتشرشده در ۲۸ روز
                </Typography>
                <Stack direction="row" className="mt-1.5 items-baseline justify-between">
                  <Typography variant="body2" className="num">
                    {fa.format(snapshot.formats.posts)} پست
                  </Typography>
                  <Typography variant="body2" className="num text-muted">
                    {fa.format(snapshot.formats.stories)} استوری
                  </Typography>
                </Stack>
                <Box className="mt-2 flex h-1.5 w-full overflow-hidden bg-line/40">
                  <Box
                    sx={{
                      width: `${(snapshot.formats.posts / Math.max(snapshot.formats.posts + snapshot.formats.stories, 1)) * 100}%`,
                      bgcolor: 'text.primary',
                    }}
                  />
                  <Box sx={{ flex: 1, bgcolor: 'primary.main' }} />
                </Box>
              </Box>
            </Paper>
          </div>
        </section>

        <section id="audience" className="mt-12 border-t border-line pt-7">
          <Typography variant="overline" className="tracking-[0.18em] text-muted">
            مخاطب
          </Typography>
          <Typography variant="h2" sx={{ fontSize: 30, mt: 0.5 }}>
            چه کسانی تماشا می‌کنند
          </Typography>

          <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-12">
            <Box className="lg:col-span-5">
              <AgeGender data={snapshot.demographics} />
            </Box>

            <Paper
              variant="outlined"
              className="lg:col-span-4"
              sx={{ borderColor: 'divider', bgcolor: 'background.paper', p: 3 }}
            >
              <Typography variant="h4" sx={{ fontSize: 21 }}>
                شهرها
              </Typography>
              <Stack spacing={2.2} className="mt-5">
                {snapshot.demographics.cities.slice(0, 6).map((city) => (
                  <Box key={city.name}>
                    <Stack direction="row" className="items-baseline justify-between">
                      <Typography variant="body2">{city.name}</Typography>
                      <Typography variant="caption" className="num text-muted">
                        {pct(city.pct)}
                      </Typography>
                    </Stack>
                    <Box className="mt-1 h-[3px] w-full bg-line/40">
                      <Box sx={{ width: `${city.pct}%`, height: '100%', bgcolor: 'text.primary' }} />
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Paper>

            <Paper
              variant="outlined"
              className="lg:col-span-3"
              sx={{ borderColor: 'divider', bgcolor: 'background.paper', p: 3 }}
            >
              <Typography variant="h4" sx={{ fontSize: 21 }}>
                کشورها
              </Typography>
              <Stack spacing={2.2} className="mt-5">
                {snapshot.demographics.countries.slice(0, 5).map((country) => (
                  <Box key={country.name}>
                    <Stack direction="row" className="items-baseline justify-between">
                      <Typography variant="body2">{country.name}</Typography>
                      <Typography variant="caption" className="num text-muted">
                        {pct(country.pct)}
                      </Typography>
                    </Stack>
                    <Box className="mt-1 h-[3px] w-full bg-line/40">
                      <Box sx={{ width: `${country.pct}%`, height: '100%', bgcolor: 'text.primary' }} />
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Paper>
          </div>

          <Paper
            variant="outlined"
            className="mt-6"
            sx={{ borderColor: 'divider', bgcolor: 'background.paper', px: 3, py: 2.5 }}
          >
            <Stack direction={{ xs: 'column', md: 'row' }} className="items-start justify-between gap-4">
              <Box>
                <Typography variant="h4" sx={{ fontSize: 19 }}>
                  ساعت‌های فعال مخاطب
                </Typography>
                <Typography variant="caption" className="text-muted">
                  دوشنبه، از Account insights
                </Typography>
              </Box>
              <Box className="flex flex-1 items-end justify-around gap-4" dir="ltr">
                {hours.map(([hour, value]) => (
                  <Box key={hour} className="text-center">
                    <Box
                      sx={{
                        width: 10,
                        height: `${Math.max((value / maxHour) * 56, 4)}px`,
                        bgcolor: 'text.primary',
                        opacity: 0.8,
                        mx: 'auto',
                      }}
                    />
                    <Typography variant="caption" className="mt-1 block text-muted" sx={{ fontSize: 10 }}>
                      {hour}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Stack>
          </Paper>
        </section>

        <footer id="reports" className="mt-14 flex flex-col gap-2 border-t border-line py-6 sm:flex-row sm:items-center sm:justify-between">
          <Typography variant="caption" className="text-muted">
            داده‌ها: Meta Business Suite و Instagram Insights · {fa.format(snapshot.account.posts)} ریلز
          </Typography>
          <Typography variant="caption" className="text-muted">
            پروتوتایپ داشبورد · {dateFa(snapshot.generated_at)}
          </Typography>
        </footer>
      </main>
    </div>
  )
}
