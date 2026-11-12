'use client'

import { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from '@mui/material'
import { LineChart } from '@mui/x-charts/LineChart'
import { BarChart } from '@mui/x-charts/BarChart'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import PostsGrid from '../components/PostsGrid'
import TopPostsCard from '../components/TopPostsCard'
import snapshotJson from '../data/snapshot.json'
import type { RangeKey, Snapshot } from '../lib/types'
import { dateFa, fa, faCompact, faCompactExact, parseCompact, pct } from '../lib/format'

const snapshot = snapshotJson as unknown as Snapshot
const ORDER: RangeKey[] = ['yesterday', 'last-7-days', 'last-28-days', 'last-90-days', 'this-week', 'this-month', 'this-year']

export default function Overview() {
  const theme = useTheme()
  const [range, setRange] = useState<RangeKey>('last-28-days')
  const rangeData = snapshot.ranges[range]
  const is28 = range === 'last-28-days'

  const views = rangeData.series.views
  const viewLabels = views.map((point, index) => (index % 5 === 0 || index === views.length - 1 ? dateFa(point.date) : ''))
  const interactions = rangeData.series.interactions

  const followsValues = snapshot.follows.daily.map((point) => point.value)
  const followsLabels = snapshot.follows.daily.map((point, index) =>
    index % 5 === 0 || index === snapshot.follows.daily.length - 1 ? dateFa(point.date) : '',
  )
  const followsCount = parseCompact(snapshot.follows.total)
  const unfollowsCount = parseCompact(snapshot.follows.unfollows)

  return (
    <Box>
      <PageHeader
        title="نمای کلی"
        subtitle={`عملکرد @${snapshot.account.username} در ${rangeData.label}؛ همهٔ اعداد از دادهٔ اکسپورت‌شده می‌آیند.`}
        actions={
          <Stack spacing={1} sx={{ alignItems: 'flex-end', width: { xs: '100%', md: 'auto' } }}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={range}
              onChange={(_, value: RangeKey | null) => value && setRange(value)}
              sx={{ flexWrap: 'wrap', gap: 0.5 }}
            >
              {ORDER.map((key) => (
                <ToggleButton key={key} value={key} sx={{ px: 1.2, py: 0.4, fontSize: 12 }}>
                  {snapshot.ranges[key].label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary">
              آخرین داده: {dateFa(snapshot.generated_at)}
            </Typography>
          </Stack>
        }
      />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            title="فالوور"
            value={fa.format(snapshot.account.followers)}
            caption="فالوور کل"
            chipLabel={`+${faCompactExact(followsCount ?? 0)} در ۲۸ روز`}
            chipColor="success"
            data={followsValues}
            color={theme.palette.primary.main}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            title="ویو"
            value={faCompact.format(rangeData.totals.views)}
            caption={`بازهٔ ${rangeData.label}`}
            chipLabel={is28 && snapshot.kpis.nonFollowersPct != null ? `${pct(snapshot.kpis.nonFollowersPct)} غیرفالوور` : 'سهم غیرفالوور: ۲۸ روز'}
            chipColor="primary"
            data={views.map((point) => point.value)}
            color={theme.palette.primary.main}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            title="تعامل"
            value={faCompact.format(rangeData.totals.interactions)}
            caption={`بازهٔ ${rangeData.label}`}
            chipLabel={is28 && snapshot.kpis.accountsEngaged ? `${faCompact.format(snapshot.kpis.accountsEngaged)} اکانت` : 'اکانت‌های درگیر: ۲۸ روز'}
            chipColor="info"
            data={interactions.map((point) => point.value)}
            color={theme.palette.secondary.main}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            title="نرخ سیو"
            value={pct(snapshot.kpis.saveRate * 100)}
            caption="از مجموع ۵۱۲ ریلز"
            chipLabel={`میانگین ${fa.format(Math.round(snapshot.kpis.savesTotal / Math.max(snapshot.account.posts, 1)))} سیو`}
            chipColor="primary"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card variant="outlined">
            <CardHeader
              title={`ویو در ${rangeData.label}`}
             
              subheader={`${dateFa(views[0]?.date ?? '')} تا ${dateFa(views[views.length - 1]?.date ?? '')}`}
              action={<Chip size="small" label={faCompact.format(rangeData.totals.views)} variant="outlined" />}
            />
            <CardContent sx={{ pt: 0 }}>
              <LineChart
                height={310}
                xAxis={[{ scaleType: 'point', data: viewLabels, tickLabelStyle: { fontSize: 10 } }]}
                yAxis={[{ valueFormatter: (value: number) => faCompact.format(value) }]}
                series={[
                  {
                    data: views.map((point) => point.value),
                    label: 'ویو',
                    color: theme.palette.primary.main,
                    area: true,
                    showMark: false,
                  },
                ]}
                grid={{ horizontal: true }}
                hideLegend
                margin={{ left: 70, right: 20, top: 20, bottom: 40 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardHeader
              title="رشد فالوور"
             
              subheader={`${followsCount ? faCompactExact(followsCount) : 'بی‌داده'} فالو · ${unfollowsCount ? fa.format(unfollowsCount) : 'بی‌داده'} آنفالو`}
            />
            <CardContent sx={{ pt: 0 }}>
              <BarChart
                height={260}
                xAxis={[{ scaleType: 'band', data: followsLabels, tickLabelStyle: { fontSize: 10 } }]}
                yAxis={[{ valueFormatter: (value: number) => faCompact.format(value) }]}
                series={[
                  {
                    data: followsValues,
                    label: 'فالو',
                    color: theme.palette.secondary.main,
                  },
                ]}
                grid={{ horizontal: true }}
                hideLegend
                margin={{ left: 60, right: 10, top: 20, bottom: 40 }}
              />
              <Typography variant="caption" color="text.secondary">
                روزانه از بخش Trends؛ هر ستون یک روز.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <PostsGrid rows={snapshot.recentContent.slice(0, 5)} hideFooter />
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <TopPostsCard title="پست‌های برتر بر اساس سیو" posts={snapshot.topBySaves} metric="saves" />
        </Grid>
      </Grid>
    </Box>
  )
}
