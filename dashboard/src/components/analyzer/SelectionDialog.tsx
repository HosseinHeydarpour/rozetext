'use client'

import { useState } from 'react'
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material'

interface SelectionDialogProps {
  open: boolean
  codes: string[]
  onClose: () => void
}

export default function SelectionDialog({ open, codes, onClose }: SelectionDialogProps) {
  const [copied, setCopied] = useState(false)

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>کدهای انتخاب‌شده ({codes.length.toLocaleString('fa-IR')} مورد)</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          <TextField
            multiline
            minRows={10}
            fullWidth
            value={JSON.stringify(codes, null, 2)}
            slotProps={{ input: { readOnly: true, sx: { direction: 'ltr', fontFamily: 'monospace', fontSize: 12 } } }}
          />
          {copied ? <Alert severity="success">در کلیپ‌بورد کپی شد.</Alert> : null}
          <Typography variant="caption" color="text.secondary">
            این لیست تا خاموش‌شدن حالت انتخاب نگه داشته می‌شود.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={async () => {
            await navigator.clipboard.writeText(JSON.stringify(codes, null, 2))
            setCopied(true)
          }}
        >
          کپی
        </Button>
        <Button variant="contained" onClick={onClose}>
          بستن
        </Button>
      </DialogActions>
    </Dialog>
  )
}
