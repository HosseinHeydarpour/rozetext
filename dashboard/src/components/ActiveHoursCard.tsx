'use client'

import { useMemo, useState } from 'react'
import { Box, Card, CardHeader, CardContent, Chip, Stack, ToggleButton, ToggleButtonGroup, Typography, useTheme } from '@mui/material'
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded'
import { BarChart } from '@mui/x-charts/BarChart'
import { fa, hourFa } from '@/lib/format'
import type { Snapshot } from '@/lib/types'

const DAYS: { key: string; label: string }[] = [
  { key: 'Sa', label: 'شنبه' },
  { key: 'Su', label: 'یکشنبه' },
  { key: 'M', label: 'دوشنبه' },
  { key: 'Tu', label: 'سه‌شنبه' },
  { key: 'W', label: 'چهارشنبه' },
  { key: 'Th', label: 'پنجشنبه' },
  { key: 'F', label: 'جمعه' },
]

const dayLabel = (key: string) => DAYS.find((day) => day.key === key)?.label ?? key

export default function ActiveHoursCard({ snapshot }: { snapshot: Snapshot }) {
  const theme = useTheme()
  const days = snapshot.activeTimes ?? {}
  const available = useMemo(() => DAYS.filter((day) => days[day.key] && Object.keys(days[day.key]).length > 0), [days])
  const best = snapshot.activeTimesBest
  const [selected, setSelected] = useState<string>(() => (best?.day && days[best.day] ? best.day : available[0]?.key ?? 'M'))

  const hours = days[selected] ?? {}
  const entries = Object.entries(hours)
  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader title="ساعت‌های فعال مخاطب" />
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            داده‌ای برای این بخش در اکسپورت فعلی نیست.
          </Typography>
        </CardContent>
      </Card>
    )
  }

  const peak = entries.reduce((top, entry) => (entry[1] > top[1] ? entry : top), entries[0])

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title="ساعت‌های فعال مخاطب"
        subheader="فالوور فعال در هر بازهٔ سه‌ساعته، به وقت تهران"
        action={
          best ? (
            <Chip
              size="small"
              color="primary"
              variant="outlined"
              icon={<ScheduleRoundedIcon />}
              label={`بهترین زمان: ${dayLabel(best.day)} · ساعت ${hourFa(best.hour)} — ${fa.format(best.value)}`}
            />
          ) : null
        }
      />
      <CardContent sx={{ pt: 0 }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={selected}
          onChange={(_, value: string | null) => value && setSelected(value)}
          sx={{ mb: 2, flexWrap: 'wrap' }}
        >
          {available.map((day) => (
            <ToggleButton key={day.key} value={day.key} sx={{ px: 1.5, fontSize: 12 }}>
              {day.label}
              {best?.day === day.key ? ' ★' : ''}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <BarChart
          height={260}
          xAxis={[{ scaleType: 'band', data: entries.map(([hour]) => hourFa(hour)), tickLabelStyle: { display: 'none' } }]}
          yAxis={[{ valueFormatter: (value: number) => fa.format(value), tickLabelStyle: { fontSize: 11, fill: theme.palette.text.disabled } }]}
          series={[
            {
              data: entries.map(([hour, value]) => value),
              label: 'فالوور فعال',
              color: theme.palette.primary.main,
              valueFormatter: (value: number | null) => (value == null ? '—' : fa.format(value)),
            },
          ]}
          grid={{ horizontal: true }}
          hideLegend
          margin={{ left: 12, right: 16, top: 12, bottom: 8 }}
          sx={{
            '& .MuiChartsGrid-line': { strokeDasharray: '4 4', stroke: theme.palette.divider },
            '& .MuiBarElement-root': { rx: 2 },
          }}
        />
        <Box
          style={{ paddingLeft: 72, paddingRight: 16, direction: 'ltr' }}
          sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}
        >
          {entries.map(([hour]) => (
            <Typography key={hour} sx={{ fontSize: 11, color: 'text.disabled' }}>
              {hourFa(hour)}
            </Typography>
          ))}
        </Box>

        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
          <Chip size="small" variant="outlined" label={`اوج روز: ساعت ${hourFa(peak[0])} با ${fa.format(peak[1])} فالوور`} />
          <Chip size="small" variant="outlined" label={`${fa.format(entries.length)} بازهٔ ثبت‌شده`} />
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="caption" color="text.secondary">
            منبع: Account insights
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  )
}
