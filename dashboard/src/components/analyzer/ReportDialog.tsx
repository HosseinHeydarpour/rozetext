'use client'

import { useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Radio,
  Stack,
  Typography,
} from '@mui/material'
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded'
import CodeRoundedIcon from '@mui/icons-material/CodeRounded'

export type ReportFormat = 'txt' | 'md'

interface ReportDialogProps {
  open: boolean
  count: number
  onClose: () => void
  onDownload: (format: ReportFormat) => void
}

const formats = [
  {
    value: 'txt' as const,
    title: 'متن ساده (TXT)',
    description: 'همان قالب گزارش نسخهٔ دسکتاپ؛ برای آرشیو و خواندن سریع.',
    icon: <DescriptionRoundedIcon />,
  },
  {
    value: 'md' as const,
    title: 'مارک‌داون (MD)',
    description: 'همراه با جدول خلاصه و بخش جزئیات؛ برای گیت‌هاب، آبسیدین یا نوشن.',
    icon: <CodeRoundedIcon />,
  },
]

export default function ReportDialog({ open, count, onClose, onDownload }: ReportDialogProps) {
  const [format, setFormat] = useState<ReportFormat>('md')

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>خروجی گزارش</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {count.toLocaleString('fa-IR')} ریل در گزارش نوشته می‌شود.
        </Typography>
        <Stack spacing={1}>
          {formats.map((item) => (
            <Box
              key={item.value}
              onClick={() => setFormat(item.value)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1.5,
                borderRadius: 2,
                border: 1,
                cursor: 'pointer',
                borderColor: format === item.value ? 'primary.main' : 'divider',
                bgcolor: format === item.value ? 'action.selected' : 'transparent',
              }}
            >
              <Radio checked={format === item.value} size="small" sx={{ p: 0 }} />
              <Box sx={{ color: format === item.value ? 'primary.main' : 'text.secondary' }}>{item.icon}</Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{item.title}</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.6 }}>{item.description}</Typography>
              </Box>
            </Box>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>انصراف</Button>
        <Button variant="contained" onClick={() => onDownload(format)}>
          دانلود
        </Button>
      </DialogActions>
    </Dialog>
  )
}
