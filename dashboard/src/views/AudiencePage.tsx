'use client'

import { Box, Card, CardContent, CardHeader, Chip, Grid, LinearProgress, Stack, Typography, useTheme } from '@mui/material'
import { BarChart } from '@mui/x-charts/BarChart'
import { PieChart } from '@mui/x-charts/PieChart'
import PageHeader from '../components/PageHeader'
import snapshotJson from '../data/snapshot.json'
import type { Snapshot } from '../lib/types'
import { fa, hourFa, pct } from '../lib/format'

const snapshot = snapshotJson as unknown as Snapshot

export default function AudiencePage() {
  const theme = useTheme()
  const { demographics } = snapshot

  return (
    <Box>
      <PageHeader
        title="مخاطب"
        subtitle={`${fa.format(snapshot.account.followers)} فالوور؛ ${fa.format(demographics.cities.length)} شهر و ${fa.format(demographics.countries.length)} کشور در داده‌ها.`}
        actions={<Chip label="دموگرافیک از Meta Business Suite" variant="outlined" />}
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardHeader title="جنسیت" />
            <CardContent>
              <PieChart
                height={240}
                series={[
                  {
                    data: [
                      { id: 0, value: demographics.women, label: 'زن', color: theme.palette.secondary.main },
                      { id: 1, value: demographics.men, label: 'مرد', color: theme.palette.primary.main },
                    ],
                    innerRadius: 46,
                    paddingAngle: 2,
                    cornerRadius: 4,
                    highlightScope: { fade: 'global', highlight: 'item' },
                  },
                ]}
                margin={{ left: 0, right: 0, top: 10, bottom: 10 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardHeader title="سن و جنسیت" />
            <CardContent sx={{ pt: 0 }}>
              <BarChart
                height={300}
                xAxis={[{ scaleType: 'band', data: demographics.ageGender.map((bucket) => bucket.bucket) }]}
                yAxis={[{ valueFormatter: (value: number) => pct(value) }]}
                series={[
                  { data: demographics.ageGender.map((bucket) => bucket.men), label: 'مرد', color: theme.palette.primary.main },
                  { data: demographics.ageGender.map((bucket) => bucket.women), label: 'زن', color: theme.palette.secondary.main },
                ]}
                grid={{ horizontal: true }}
                margin={{ left: 55, right: 20, top: 20, bottom: 40 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardHeader title="شهرها" subheader="بر اساس درصد فالوور" />
            <CardContent>
              <Stack spacing={1.6}>
                {demographics.cities.slice(0, 7).map((city) => (
                  <Box key={city.name}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Typography variant="body2">{city.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {pct(city.pct)}
                      </Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={city.pct} sx={{ height: 5, borderRadius: 1, mt: 0.5 }} />
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardHeader title="کشورها" subheader="بر اساس درصد فالوور" />
            <CardContent>
              <Stack spacing={1.6}>
                {demographics.countries.slice(0, 7).map((country) => (
                  <Box key={country.name}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Typography variant="body2">{country.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {pct(country.pct)}
                      </Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={country.pct} sx={{ height: 5, borderRadius: 1, mt: 0.5 }} />
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined">
            <CardHeader title="ساعت‌های فعال مخاطب" subheader="دوشنبه، به وقت تهران (ساعت ۰ تا ۲۳)" />
            <CardContent sx={{ pt: 0 }}>
              <BarChart
                height={220}
                xAxis={[{ scaleType: 'band', data: Object.keys(snapshot.activeTimes).map(hourFa) }]}
                yAxis={[{ valueFormatter: (value: number) => fa.format(value) }]}
                series={[{ data: Object.values(snapshot.activeTimes), label: 'فالوور', color: theme.palette.primary.main }]}
                grid={{ horizontal: true }}
                hideLegend
                margin={{ left: 60, right: 20, top: 10, bottom: 30 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardHeader title="فرمت محتوا" subheader="محتوای منتشرشده در ۲۸ روز" />
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Typography variant="body2">پست</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {fa.format(snapshot.formats.posts)}
                  </Typography>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Typography variant="body2">استوری</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {fa.format(snapshot.formats.stories)}
                  </Typography>
                </Stack>
                <Box sx={{ display: 'flex', height: 10, borderRadius: 1, overflow: 'hidden', bgcolor: 'action.hover' }}>
                  <Box
                    sx={{
                      width: `${(snapshot.formats.posts / Math.max(snapshot.formats.posts + snapshot.formats.stories, 1)) * 100}%`,
                      bgcolor: 'primary.main',
                    }}
                  />
                  <Box sx={{ flex: 1, bgcolor: 'secondary.main' }} />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
