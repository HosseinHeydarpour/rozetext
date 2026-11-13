'use client'

import { Box, Card, CardContent, CardHeader, Chip, Grid, LinearProgress, Stack, Typography, useTheme } from '@mui/material'
import { BarChart } from '@mui/x-charts/BarChart'
import { PieChart } from '@mui/x-charts/PieChart'
import PageHeader from '../components/PageHeader'
import { fa, pct } from '../lib/format'
import { useSnapshot } from '../lib/use-snapshot'


export default function AudiencePage() {
  const theme = useTheme()
  const { snapshot } = useSnapshot()
  const { demographics } = snapshot

  return (
    <Box>
      <PageHeader
        title="مخاطب"
        subtitle={`${fa.format(snapshot.account.followers)} فالوور؛ ${fa.format(demographics.cities.length)} شهر و ${fa.format(demographics.countries.length)} کشور در داده‌ها.`}
        actions={<Chip label="دموگرافیک از Meta Business Suite" />}
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title="جنسیت" />
            <CardContent>
              <PieChart
                height={240}
                series={[
                  {
                    data: [
                      { id: 0, value: demographics.women, label: 'زن', color: theme.palette.info.main },
                      { id: 1, value: demographics.men, label: 'مرد', color: theme.palette.primary.main },
                    ],
                    innerRadius: 62,
                    paddingAngle: 2,
                    cornerRadius: 4,
                    highlightScope: { fade: 'global', highlight: 'item' },
                  },
                ]}
                margin={{ left: 0, right: 0, top: 8, bottom: 8 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title="سن و جنسیت" />
            <CardContent sx={{ pt: 0 }}>
              <BarChart
                height={300}
                xAxis={[{ scaleType: 'band', data: demographics.ageGender.map((bucket) => bucket.bucket) }]}
                yAxis={[{ valueFormatter: (value: number) => pct(value) }]}
                series={[
                  { data: demographics.ageGender.map((bucket) => bucket.men), label: 'مرد', color: theme.palette.primary.main },
                  { data: demographics.ageGender.map((bucket) => bucket.women), label: 'زن', color: theme.palette.info.main },
                ]}
                grid={{ horizontal: true }}
                margin={{ left: 55, right: 20, top: 20, bottom: 40 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
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

        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
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

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
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
