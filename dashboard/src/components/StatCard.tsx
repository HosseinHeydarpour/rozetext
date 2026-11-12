import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import { SparkLineChart } from '@mui/x-charts/SparkLineChart'

export interface StatCardProps {
  title: string
  value: string
  caption: string
  chipLabel: string
  chipColor?: 'success' | 'default' | 'primary' | 'info'
  data?: number[]
  color?: string
}

export default function StatCard({ title, value, caption, chipLabel, chipColor = 'default', data, color }: StatCardProps) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="h4" component="p" sx={{ fontWeight: 700 }}>
            {value}
          </Typography>
          <Chip size="small" label={chipLabel} color={chipColor} variant={chipColor === 'default' ? 'outlined' : 'filled'} />
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
          {caption}
        </Typography>
        {data && data.length > 0 ? (
          <Box sx={{ width: '100%', height: 56, mt: 'auto', pt: 1 }}>
            <SparkLineChart data={data} height={56} color={color ?? 'primary'} area showTooltip />
          </Box>
        ) : (
          <Box sx={{ mt: 'auto', pt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              نرخ از مجموع ریلزهای ثبت‌شده محاسبه شده است.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
