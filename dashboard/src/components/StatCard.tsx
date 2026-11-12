'use client'

import { Box, Card, CardContent, Stack, Typography } from '@mui/material'
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded'
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded'
import { SparkLineChart } from '@mui/x-charts/SparkLineChart'

export interface StatCardProps {
  title: string
  value: string
  trendLabel: string
  trendDirection?: 'up' | 'down' | 'flat'
  data: number[]
  plotType?: 'line' | 'bar'
  color?: string
}

export default function StatCard({ title, value, trendLabel, trendDirection = 'up', data, plotType = 'bar', color }: StatCardProps) {
  const Icon = trendDirection === 'down' ? TrendingDownRoundedIcon : TrendingUpRoundedIcon
  const tone = trendDirection === 'down' ? 'error.main' : 'success.main'

  return (
    <Card sx={{ height: '100%', minHeight: 166 }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary' }}>{title}</Typography>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Icon sx={{ fontSize: 20, color: tone }} />
          <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{trendLabel}</Typography>
        </Stack>

        <Stack direction="row" sx={{ alignItems: 'flex-end', justifyContent: 'space-between', gap: 1, mt: 0.5 }}>
          <Typography sx={{ fontSize: 32, fontWeight: 700, lineHeight: 1.4 }}>{value}</Typography>
          <Box sx={{ width: 88, height: 44, flexShrink: 0 }}>
            <SparkLineChart
              data={data.length ? data : [0]}
              height={44}
              plotType={plotType}
              color={color ?? 'primary.main'}
              showTooltip
              sx={{ '& .MuiChartsAxis-root': { display: 'none' } }}
            />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}
