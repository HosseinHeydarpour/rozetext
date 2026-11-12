import { Box, Typography } from '@mui/material'
import type { SeriesPoint } from '../lib/types'
import { dateFa, faCompact } from '../lib/format'

interface LineChartProps {
  data: SeriesPoint[]
  height?: number
  color?: string
  emptyLabel?: string
}

const WIDTH = 760
const PAD_X = 10
const PAD_TOP = 18
const PAD_BOTTOM = 30

export default function LineChart({ data, height = 230, color = '#17130F', emptyLabel = 'داده‌ای برای این بازه نیست' }: LineChartProps) {
  const points = data.filter((point) => Number.isFinite(point.value))
  if (points.length === 0) {
    return (
      <Box className="flex h-[200px] items-center justify-center border border-dashed border-line">
        <Typography variant="body2" color="text.secondary">
          {emptyLabel}
        </Typography>
      </Box>
    )
  }

  const max = Math.max(...points.map((point) => point.value)) * 1.08
  const innerHeight = height - PAD_TOP - PAD_BOTTOM
  const innerWidth = WIDTH - PAD_X * 2
  const x = (index: number) => PAD_X + (points.length === 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth)
  const y = (value: number) => PAD_TOP + innerHeight - (value / max) * innerHeight

  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index).toFixed(2)} ${y(point.value).toFixed(2)}`).join(' ')
  const area = `${line} L ${x(points.length - 1).toFixed(2)} ${PAD_TOP + innerHeight} L ${x(0).toFixed(2)} ${PAD_TOP + innerHeight} Z`
  const grid = [0, 0.25, 0.5, 0.75, 1]
  const labelIndex = points.length > 1 ? [0, Math.floor(points.length / 2), points.length - 1] : [0]

  return (
    <Box dir="ltr" sx={{ width: '100%' }}>
      <svg viewBox={`0 0 ${WIDTH} ${height}`} width="100%" style={{ display: 'block' }} role="img" aria-label="نمودار روند">
        {grid.map((step) => (
          <line
            key={step}
            x1={PAD_X}
            x2={WIDTH - PAD_X}
            y1={PAD_TOP + innerHeight * step}
            y2={PAD_TOP + innerHeight * step}
            stroke="#DCD2C3"
            strokeWidth={0.6}
          />
        ))}
        <path d={area} fill={color} fillOpacity={0.05} />
        <path d={line} fill="none" stroke={color} strokeWidth={1.8} vectorEffect="non-scaling-stroke" />
        {points.length === 1 && <circle cx={x(0)} cy={y(points[0].value)} r={3} fill={color} />}
        {points.length > 1 && (
          <circle cx={x(points.length - 1)} cy={y(points[points.length - 1].value)} r={3} fill={color} />
        )}
        <text x={PAD_X} y={PAD_TOP - 6} fontSize={10} fill="#6E6257" fontFamily="Vazirmatn, sans-serif">
          {faCompact.format(max)}
        </text>
        {labelIndex.map((index) => (
          <text
            key={index}
            x={x(index)}
            y={height - 8}
            fontSize={10}
            fill="#6E6257"
            textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}
            fontFamily="Vazirmatn, sans-serif"
          >
            {dateFa(points[index].date)}
          </text>
        ))}
      </svg>
    </Box>
  )
}
