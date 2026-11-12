import { Box, Paper, Stack, Typography } from '@mui/material'
import type { Snapshot } from '../lib/types'
import { pct } from '../lib/format'

interface AgeGenderProps {
  data: Snapshot['demographics']
}

export default function AgeGender({ data }: AgeGenderProps) {
  const max = Math.max(...data.ageGender.flatMap((bucket) => [bucket.men, bucket.women]), 1)

  return (
    <Paper variant="outlined" sx={{ borderColor: 'divider', bgcolor: 'background.paper', p: 3 }}>
      <Stack direction="row" className="mb-1 items-baseline justify-between">
        <Typography variant="h4" sx={{ fontSize: 22 }}>
          سن و جنسیت
        </Typography>
        <Typography variant="caption" color="text.secondary">
          فالوورهای اینستاگرام
        </Typography>
      </Stack>
      <Box className="mb-4 flex items-center gap-4">
        <Typography variant="caption" className="flex items-center gap-1.5 text-muted">
          <Box component="span" sx={{ width: 14, height: 2, bgcolor: 'text.primary', display: 'inline-block' }} />
          مرد {pct(data.men)}
        </Typography>
        <Typography variant="caption" className="flex items-center gap-1.5 text-muted">
          <Box component="span" sx={{ width: 14, height: 2, bgcolor: 'primary.main', display: 'inline-block' }} />
          زن {pct(data.women)}
        </Typography>
      </Box>
      <Stack spacing={2.2}>
        {data.ageGender.map((bucket) => (
          <Box key={bucket.bucket}>
            <Box className="mb-1.5 flex items-baseline justify-between">
              <Typography variant="body2" className="text-muted">
                {bucket.bucket}
              </Typography>
              <Typography variant="caption" className="num text-muted">
                {pct(bucket.men + bucket.women)}
              </Typography>
            </Box>
            <Box className="space-y-1">
              <Box className="h-1.5 w-full bg-line/40">
                <Box sx={{ width: `${(bucket.men / max) * 100}%`, height: '100%', bgcolor: 'text.primary' }} />
              </Box>
              <Box className="h-1.5 w-full bg-line/40">
                <Box sx={{ width: `${(bucket.women / max) * 100}%`, height: '100%', bgcolor: 'primary.main' }} />
              </Box>
            </Box>
          </Box>
        ))}
      </Stack>
    </Paper>
  )
}
