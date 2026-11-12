'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
} from '@mui/material'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import { LineChart } from '@mui/x-charts/LineChart'
import { PieChart } from '@mui/x-charts/PieChart'
import StatCard from '@/components/StatCard'
import snapshotJson from '@/data/snapshot.json'
import type { RangeKey, Snapshot } from '@/lib/types'
import { dateFa, fa, faCompact, faCompactExact, longDateFa, parseCompact, pct, sourceDateFa } from '@/lib/format'

const snapshot = snapshotJson as unknown as Snapshot
const ORDER: RangeKey[] = ['yesterday', 'last-7-days', 'last-28-days', 'last-90-days', 'this-week', 'this-month', 'this-year']

const toNumber = (value: string) => Number(String(value).replace(/[^\d]/g, '')) || 0
const tierOf = (views: number) => (views >= 300000 ? 'وایرال' : views >= 10000 ? 'متوسط' : 'ضعیف')
const tierColor = (views: number) => (views >= 300000 ? 'success' : views >= 10000 ? 'warning' : 'default') as 'success' | 'warning' | 'default'

const ringSx = {
  '& .MuiCircularProgress-circle': { stroke: 'rgba(255, 255, 255, 0.28)' },
  '& .MuiCircularProgress-circleDeterminate': { stroke: '#FFFFFF', strokeLinecap: 'round' },
} as const

export default function Overview() {
  const theme = useTheme()
  const [range, setRange] = useState<RangeKey>('last-28-days')
  const rangeData = snapshot.ranges[range]
  const views = rangeData.series.views
  const interactions = rangeData.series.interactions

  const followsCount = parseCompact(snapshot.follows.total)
  const best = snapshot.topByViews[0]
  const recent = snapshot.recentContent.slice(0, 5)

  const ageSlices = snapshot.demographics.ageGender.map((bucket, index) => ({
    id: index,
    label: bucket.bucket,
    value: Math.round((bucket.men + bucket.women) * 10) / 10,
    color: ['#007867', '#00A76F', '#5BE49B', '#00B8D9', '#FFAB00', '#FF5630'][index % 6],
  }))

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Welcome banner */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card
            sx={(t) => ({
              position: 'relative',
              overflow: 'hidden',
              minHeight: 280,
              background: `linear-gradient(120deg, #FFFFFF 0%, ${t.palette.primary.light}33 55%, ${t.palette.primary.main}33 100%)`,
              ...t.applyStyles('dark', {
                background: 'linear-gradient(120deg, #212B36 0%, rgba(0,167,111,0.18) 60%, rgba(0,167,111,0.34) 100%)',
              }),
            })}
          >
            <Box sx={{ p: { xs: 3, md: 5 }, maxWidth: { xs: '100%', sm: 430 }, position: 'relative', zIndex: 1 }}>
              <Typography
                sx={(t) => ({
                  fontSize: 24,
                  fontWeight: 700,
                  lineHeight: 1.6,
                  color: '#004B50',
                  ...t.applyStyles('dark', { color: '#C8FAD6' }),
                })}
              >
                خوش برگشتی 👋
                <br />
                رز تکست
              </Typography>
              <Typography
                sx={(t) => ({
                  fontSize: 14,
                  mt: 1.5,
                  color: '#004B50',
                  ...t.applyStyles('dark', { color: 'rgba(200,250,214,0.80)' }),
                })}
              >
                {`${faCompact.format(rangeData.totals.views)} ویو و ${faCompact.format(rangeData.totals.interactions)} تعامل در ${rangeData.label}؛ همه از اکسپورت متا.`}
              </Typography>
              <Button
                component={Link}
                href="/content/analyzer"
                variant="contained"
                sx={{ mt: 3, px: 2.5, height: 36 }}
              >
                تحلیل کن
              </Button>
            </Box>

            <Box aria-hidden sx={{ position: 'absolute', insetInlineEnd: -30, bottom: -70, width: 300, height: 300, display: { xs: 'none', sm: 'block' } }}>
              <Box sx={(t) => ({ position: 'absolute', inset: 0, borderRadius: '50%', background: `radial-gradient(circle at 40% 40%, ${t.palette.primary.light}55, transparent 62%)` })} />
              <Box
                sx={(t) => ({
                  position: 'absolute',
                  insetInlineEnd: 60,
                  top: 60,
                  width: 190,
                  height: 150,
                  borderRadius: 4,
                  border: '10px solid',
                  borderColor: 'rgba(255,255,255,0.85)',
                  ...t.applyStyles('dark', { borderColor: 'rgba(200,250,214,0.28)' }),
                  transform: 'rotate(-10deg)',
                  boxShadow: '0 24px 48px rgba(0,75,80,0.14)',
                })}
              />
            </Box>
          </Card>
        </Grid>

        {/* Featured reel */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ minHeight: 280, color: '#FFFFFF', background: 'linear-gradient(160deg, #004B50 0%, #007867 60%, #00A76F 100%)' }}>
            <CardContent sx={{ height: '100%', minHeight: 280, display: 'flex', flexDirection: 'column' }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#5BE49B', letterSpacing: '0.04em' }}>ریل برگزیده</Typography>
              <Typography
                sx={{
                  fontSize: 20,
                  fontWeight: 700,
                  mt: 1,
                  lineHeight: 1.7,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {best?.caption ?? 'ریلی ثبت نشده'}
              </Typography>
              <Box sx={{ mt: 'auto' }}>
                <Typography sx={{ fontSize: 14, opacity: 0.9 }}>{faCompact.format(best?.views ?? 0)} ویو</Typography>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  بیشترین ویو در ریل‌های ثبت‌شده
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* KPI cards */}
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard
            title="فالوور"
            value={fa.format(snapshot.account.followers)}
            trendLabel={followsCount ? `+${faCompactExact(followsCount)} در ۲۸ روز` : 'دادهٔ رشد موجود نیست'}
            data={snapshot.follows.daily.map((point) => point.value)}
            color={theme.palette.primary.main}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard
            title={`ویو ${rangeData.label}`}
            value={faCompact.format(rangeData.totals.views)}
            trendLabel={`${pct(snapshot.kpis.nonFollowersPct ?? 0)} غیرفالوور`}
            data={views.map((point) => point.value)}
            color={theme.palette.info.main}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard
            title={`تعامل ${rangeData.label}`}
            value={faCompact.format(rangeData.totals.interactions)}
            trendLabel={`${faCompact.format(snapshot.kpis.accountsEngaged ?? 0)} اکانت`}
            data={interactions.map((point) => point.value)}
            color={theme.palette.warning.main}
          />
        </Grid>

        {/* Age donut */}
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title="ترکیب سنی مخاطب" />
            <CardContent sx={{ pt: 0 }}>
              <Box sx={{ position: 'relative', height: 260 }}>
                <PieChart
                  height={260}
                  series={[
                    {
                      data: ageSlices,
                      innerRadius: 80,
                      outerRadius: 116,
                      paddingAngle: 2,
                      cornerRadius: 4,
                      highlightScope: { fade: 'global', highlight: 'item' },
                    },
                  ]}
                  margin={{ left: 0, right: 0, top: 4, bottom: 4 }}
                  hideLegend
                />
                <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary' }}>کل</Typography>
                    <Typography sx={{ fontSize: 24, fontWeight: 700 }}>{fa.format(snapshot.account.followers)}</Typography>
                  </Box>
                </Box>
              </Box>
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1.5, justifyContent: 'center', mt: 1 }}>
                {ageSlices.map((slice) => (
                  <Stack key={slice.id} direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: slice.color }} />
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }} dir="ltr">
                      {slice.label}
                    </Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>{pct(slice.value)}</Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Views chart */}
        <Grid size={{ xs: 12, md: 6, lg: 8 }}>
          <Card sx={{ height: '100%' }}>
            <CardHeader
              title={`ویو در ${rangeData.label}`}
              subheader={`${dateFa(views[0]?.date ?? '')} تا ${dateFa(views[views.length - 1]?.date ?? '')}`}
              action={
                <TextField
                  select
                  size="small"
                  value={range}
                  onChange={(event) => setRange(event.target.value as RangeKey)}
                  sx={{ width: 128, '& .MuiOutlinedInput-root': { height: 34, fontSize: 13 } }}
                >
                  {ORDER.map((key) => (
                    <MenuItem key={key} value={key} sx={{ fontSize: 13 }}>
                      {snapshot.ranges[key].label}
                    </MenuItem>
                  ))}
                </TextField>
              }
            />
            <CardContent sx={{ pt: 0 }}>
              <LineChart
                height={300}
                xAxis={[
                  {
                    scaleType: 'point',
                    data: views.map((point) => point.date),
                    tickLabelStyle: { display: 'none' },
                  },
                ]}
                yAxis={[
                  {
                    valueFormatter: (value: number) => faCompact.format(value),
                    tickLabelStyle: { fontSize: 11, fill: theme.palette.text.disabled },
                    width: 74,
                  },
                ]}
                series={[
                  {
                    data: views.map((point) => point.value),
                    label: 'ویو',
                    color: theme.palette.primary.main,
                    showMark: false,
                    curve: 'monotoneX',
                  },
                ]}
                grid={{ horizontal: true }}
                hideLegend
                margin={{ left: 8, right: 20, top: 16, bottom: 8 }}
                sx={{
                  '& .MuiLineElement-root': { strokeWidth: 2 },
                  '& .MuiChartsGrid-line': { strokeDasharray: '4 4', stroke: theme.palette.divider },
                }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5, ps: '82px', pe: '20px' }}>
                {[0, Math.floor(views.length / 4), Math.floor(views.length / 2), Math.floor((views.length * 3) / 4), views.length - 1].map((index) => (
                  <Typography key={index} sx={{ fontSize: 11, color: 'text.disabled' }}>
                    {dateFa(views[index]?.date ?? null)}
                  </Typography>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent reels */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ height: '100%' }}>
            <CardHeader
              title="ریل‌های اخیر"
              action={
                <Button component={Link} href="/content" size="small" endIcon={<ArrowForwardRoundedIcon fontSize="small" />}>
                  همه
                </Button>
              }
            />
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>کد ریل</TableCell>
                    <TableCell>تاریخ</TableCell>
                    <TableCell align="center">ویو</TableCell>
                    <TableCell align="center">سیو</TableCell>
                    <TableCell align="center">وضعیت</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recent.map((row) => {
                    const viewCount = toNumber(row.views)
                    const saveCount = toNumber(row.saves)
                    return (
                      <TableRow key={row.title} hover>
                        <TableCell sx={{ maxWidth: 250 }}>
                          <Typography
                            sx={{
                              fontSize: 13,
                              fontWeight: 600,
                              display: '-webkit-box',
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {row.title}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary', fontSize: 13 }}>{sourceDateFa(row.date_published)}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600 }}>
                          {viewCount ? fa.format(viewCount) : '—'}
                        </TableCell>
                        <TableCell align="center">{saveCount ? fa.format(saveCount) : '—'}</TableCell>
                        <TableCell align="center">
                          <Chip size="small" label={tierOf(viewCount)} color={tierColor(viewCount)} variant={viewCount >= 10000 ? 'filled' : 'outlined'} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

        {/* Top reels */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title="برترین ریل‌ها" subheader="بر اساس سیو" />
            <CardContent sx={{ pt: 0 }}>
              <Stack divider={<Divider flexItem />} spacing={2}>
                {snapshot.topBySaves.slice(0, 5).map((post, index) => (
                  <Stack key={post.id} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <Avatar
                      sx={{
                        width: 34,
                        height: 34,
                        fontSize: 13,
                        fontWeight: 700,
                        flexShrink: 0,
                        bgcolor: index === 0 ? 'primary.main' : 'action.hover',
                        color: index === 0 ? 'primary.contrastText' : 'text.primary',
                      }}
                    >
                      {fa.format(index + 1)}
                    </Avatar>
                    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                      <Typography
                        sx={{ fontSize: 13, fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                      >
                        {post.caption}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 0.25 }}>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{faCompact.format(post.saves ?? 0)} سیو</Typography>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>·</Typography>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{faCompact.format(post.views ?? 0)} ویو</Typography>
                      </Stack>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Cities */}
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title="شهرهای مخاطب" subheader="درصد فالوور" />
            <CardContent sx={{ pt: 0 }}>
              <Stack spacing={2}>
                {snapshot.demographics.cities.slice(0, 5).map((city) => (
                  <Box key={city.name}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{city.name}</Typography>
                      <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{pct(city.pct)}</Typography>
                    </Stack>
                    <Box sx={{ mt: 0.75, height: 6, borderRadius: 99, bgcolor: 'action.hover', overflow: 'hidden' }}>
                      <Box sx={{ width: `${city.pct}%`, height: '100%', bgcolor: 'primary.main', borderRadius: 99 }} />
                    </Box>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Countries */}
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title="کشورهای مخاطب" subheader="درصد فالوور" />
            <CardContent sx={{ pt: 0 }}>
              <Stack spacing={2}>
                {snapshot.demographics.countries.slice(0, 5).map((country) => (
                  <Box key={country.name}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{country.name}</Typography>
                      <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{pct(country.pct)}</Typography>
                    </Stack>
                    <Box sx={{ mt: 0.75, height: 6, borderRadius: 99, bgcolor: 'action.hover', overflow: 'hidden' }}>
                      <Box sx={{ width: `${country.pct}%`, height: '100%', bgcolor: 'info.main', borderRadius: 99 }} />
                    </Box>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Ring cards */}
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <Stack spacing={3} sx={{ height: '100%' }}>
            <Card sx={{ flex: 1, bgcolor: '#007867', color: '#FFFFFF', backgroundImage: 'none' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2.5, height: '100%' }}>
                <Box sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
                  <CircularProgress variant="determinate" value={Math.min(100, (snapshot.kpis.saveRate ?? 0) * 1000)} size={80} thickness={4} sx={ringSx} />
                  <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{pct((snapshot.kpis.saveRate ?? 0) * 100)}</Typography>
                  </Box>
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 24, fontWeight: 700 }}>{faCompact.format(snapshot.kpis.savesTotal)}</Typography>
                  <Typography sx={{ fontSize: 14, opacity: 0.85 }}>سیو کل</Typography>
                </Box>
              </CardContent>
            </Card>

            <Card sx={{ flex: 1, bgcolor: '#006C9C', color: '#FFFFFF', backgroundImage: 'none' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2.5, height: '100%' }}>
                <Box sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
                  <CircularProgress variant="determinate" value={snapshot.kpis.followersPct ?? 0} size={80} thickness={4} sx={ringSx} />
                  <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{pct(snapshot.kpis.followersPct ?? 0)}</Typography>
                  </Box>
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 24, fontWeight: 700 }}>{fa.format(snapshot.kpis.profileVisits ?? 0)}</Typography>
                  <Typography sx={{ fontSize: 14, opacity: 0.85 }}>بازدید پروفایل</Typography>
                </Box>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
        دادهٔ {longDateFa(snapshot.generated_at)} · Meta Business Suite · {fa.format(snapshot.account.posts)} ریل ثبت‌شده
      </Typography>
    </Box>
  )
}
