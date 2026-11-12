'use client'

import { useState } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material'

interface TextEditorDialogProps {
  open: boolean
  title: string
  initial: string
  onSave: (value: string) => void
  onClose: () => void
}

/** Parent remounts this with a `key` per reel, so `initial` needs no sync effect. */
export default function TextEditorDialog({ open, title, initial, onSave, onClose }: TextEditorDialogProps) {
  const [value, setValue] = useState(initial)

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={8}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          sx={{ mt: 1 }}
        />
        <Typography variant="caption" color="text.secondary">
          خالی‌کردن فیلد هم ذخیره می‌شود.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>انصراف</Button>
        <Button variant="contained" onClick={() => onSave(value.trim())}>
          ذخیره
        </Button>
      </DialogActions>
    </Dialog>
  )
}
