'use client'

import { useRef, useState } from 'react'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material'

interface ImportCsvDialogProps {
  open: boolean
  onClose: () => void
  onImport: (text: string, fileName: string) => void
}

export default function ImportCsvDialog({ open, onClose, onImport }: ImportCsvDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>ایمپورت CSV متا</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            ستون‌های لینک، تاریخ، ویو، فالو، شیر، سیو و کپشن خوانده می‌شوند. محتوای دستی و علامت فلپ حفظ می‌شود.
          </Typography>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <Button variant="outlined" onClick={() => inputRef.current?.click()}>
            انتخاب فایل CSV
          </Button>
          {file ? (
            <Alert severity="info" icon={false}>
              {file.name} — {file.size.toLocaleString('fa-IR')} بایت
            </Alert>
          ) : (
            <Typography variant="caption" color="text.secondary">
              فایلی انتخاب نشده است.
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>انصراف</Button>
        <Button
          variant="contained"
          disabled={!file}
          onClick={async () => {
            if (!file) return
            onImport(await file.text(), file.name)
            setFile(null)
          }}
        >
          ایمپورت
        </Button>
      </DialogActions>
    </Dialog>
  )
}
