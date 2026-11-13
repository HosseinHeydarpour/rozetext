'use client'

import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'

interface ConfirmResetDialogProps {
  open: boolean
  onConfirm: () => void
  onClose: () => void
}

export default function ConfirmResetDialog({ open, onConfirm, onClose }: ConfirmResetDialogProps) {
  const [value, setValue] = useState('')

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>پاک‌کردن دادهٔ ریل‌ها</DialogTitle>
      <DialogContent>
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            همهٔ ریل‌های ذخیره‌شده در دیتابیس حذف می‌شوند. این کار برگشت‌پذیر نیست.
          </Typography>
          <TextField
            autoFocus
            label="برای تأیید DELETE بنویسید"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            size="small"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>انصراف</Button>
        <Button
          color="error"
          variant="contained"
          disabled={value !== 'DELETE'}
          onClick={() => {
            onConfirm()
            setValue('')
          }}
        >
          پاک کن
        </Button>
      </DialogActions>
    </Dialog>
  )
}
