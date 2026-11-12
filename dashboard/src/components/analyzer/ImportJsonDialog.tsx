'use client'

import { useRef, useState } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material'

interface ImportJsonDialogProps {
  open: boolean
  onClose: () => void
  onImport: (text: string) => void
}

const sample = '[{"reelsId": "DcB517Qqp0z", "content": "متن دلخواه"}]'

export default function ImportJsonDialog({ open, onClose, onImport }: ImportJsonDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>ایمپورت محتوای دستی (JSON)</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            آرایه‌ای از آبجکت‌ها با کلید شناسه (`reelsId`، `reelId` یا `id`) و `content`. فقط ریل‌های موجود آپدیت می‌شوند.
          </Typography>
          <TextField
            multiline
            minRows={8}
            fullWidth
            placeholder={sample}
            value={text}
            onChange={(event) => setText(event.target.value)}
            slotProps={{ input: { sx: { direction: 'ltr', fontFamily: 'monospace', fontSize: 12 } } }}
          />
          <input
            ref={inputRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={async (event) => {
              const file = event.target.files?.[0]
              if (file) setText(await file.text())
            }}
          />
          <Button size="small" variant="text" onClick={() => inputRef.current?.click()} sx={{ alignSelf: 'flex-start' }}>
            بارگذاری از فایل
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>انصراف</Button>
        <Button
          variant="contained"
          disabled={!text.trim()}
          onClick={() => {
            onImport(text)
            setText('')
          }}
        >
          اعمال
        </Button>
      </DialogActions>
    </Dialog>
  )
}
