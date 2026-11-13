'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
  FormControlLabel,
} from '@mui/material'
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import DeleteSweepRoundedIcon from '@mui/icons-material/DeleteSweepRounded'
import PlaylistAddCheckRoundedIcon from '@mui/icons-material/PlaylistAddCheckRounded'
import PageHeader from '@/components/PageHeader'
import ReelsTable from '@/components/analyzer/ReelsTable'
import TextEditorDialog from '@/components/analyzer/TextEditorDialog'
import ImportCsvDialog from '@/components/analyzer/ImportCsvDialog'
import ImportJsonDialog from '@/components/analyzer/ImportJsonDialog'
import SelectionDialog from '@/components/analyzer/SelectionDialog'
import ConfirmResetDialog from '@/components/analyzer/ConfirmResetDialog'
import { fa, faCompact, stampFa } from '@/lib/format'
import { parseCsv } from '@/lib/csv'
import {
  accountRows,
  applyContentJson,
  buildReport,
  mergeCsv,
  summarize,
  type ReelsDb,
} from '@/lib/reels'

type Toast = { severity: 'success' | 'error' | 'info'; message: string }

const stamp = () => {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

export default function AnalyzerPage() {
  const [db, setDb] = useState<ReelsDb | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [selectionOpen, setSelectionOpen] = useState(false)
  const [editor, setEditor] = useState<{ id: string; field: 'content' | 'prediction' } | null>(null)
  const [csvOpen, setCsvOpen] = useState(false)
  const [jsonOpen, setJsonOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [accountName, setAccountName] = useState('')
  const [initialSearch, setInitialSearch] = useState('')

  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get('q')
    if (query) setInitialSearch(query)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/reels', { cache: 'no-store' })
      if (!response.ok) throw new Error('خواندن دیتابیس ناموفق بود.')
      setDb((await response.json()) as ReelsDb)
    } catch (error) {
      setToast({ severity: 'error', message: String(error) })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const activeAccount = db?.accounts[db.active_account]
  const rows = useMemo(() => (activeAccount ? accountRows(activeAccount) : []), [activeAccount])
  const stats = useMemo(() => summarize(rows), [rows])

  const persist = async (next: ReelsDb, message?: string) => {
    setSaving(true)
    try {
      const response = await fetch('/api/reels', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(next),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'ذخیره ناموفق بود.')
      }
      setDb(next)
      if (message) setToast({ severity: 'success', message })
      return true
    } catch (error) {
      setToast({ severity: 'error', message: String(error) })
      return false
    } finally {
      setSaving(false)
    }
  }

  const clone = () => structuredClone(db as ReelsDb)

  const updateItem = async (id: string, field: 'content' | 'prediction', value: string) => {
    if (!db) return
    const next = clone()
    const item = next.accounts[next.active_account].items[id]
    if (!item) return
    item[field] = value
    next.accounts[next.active_account].last_updated = stamp()
    setEditor(null)
    await persist(next, field === 'content' ? 'محتوا ذخیره شد.' : 'پیش‌بینی ذخیره شد.')
  }

  const toggleFlop = async (id: string) => {
    if (!db) return
    const next = clone()
    const item = next.accounts[next.active_account].items[id]
    if (!item) return
    item.is_flopped = !item.is_flopped
    next.accounts[next.active_account].last_updated = stamp()
    await persist(next)
  }

  const importCsv = async (text: string, fileName: string) => {
    if (!db) return
    try {
      const result = mergeCsv(db, parseCsv(text))
      setCsvOpen(false)
      await persist(result.db, `«${fileName}»: ${fa.format(result.newCount)} ریل جدید، ${fa.format(result.updatedCount)} آپدیت.`)
    } catch (error) {
      setToast({ severity: 'error', message: String((error as Error).message ?? error) })
    }
  }

  const importJson = async (text: string) => {
    if (!db) return
    try {
      const result = applyContentJson(db, JSON.parse(text))
      setJsonOpen(false)
      await persist(result.db, `${fa.format(result.updated)} محتوا آپدیت شد، ${fa.format(result.notFound)} ریل پیدا نشد.`)
    } catch (error) {
      setToast({ severity: 'error', message: String((error as Error).message ?? error) })
    }
  }

  const resetAccount = async () => {
    if (!db) return
    const next = clone()
    const account = next.accounts[next.active_account]
    account.items = {}
    account.last_updated = stamp()
    setResetOpen(false)
    await persist(next, 'دادهٔ این حساب پاک شد.')
  }

  const createAccount = async () => {
    if (!db) return
    const name = accountName.trim()
    if (!name) return
    if (db.accounts[name]) {
      setToast({ severity: 'error', message: `حساب «${name}» از قبل وجود دارد.` })
      return
    }
    const next = clone()
    next.accounts[name] = { last_updated: 'Never', items: {} }
    next.active_account = name
    setAccountOpen(false)
    setAccountName('')
    await persist(next, `حساب «${name}» ساخته شد.`)
  }

  const switchAccount = async (name: string) => {
    if (!db || name === db.active_account) return
    const next = clone()
    next.active_account = name
    setSelected([])
    await persist(next)
  }

  const exportReport = () => {
    if (!db || rows.length === 0) {
      setToast({ severity: 'info', message: 'ریلی برای گزارش وجود ندارد.' })
      return
    }
    const sorted = [...rows].sort((a, b) => b.views - a.views)
    const report = buildReport(db.active_account, sorted)
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `reels-report-${db.active_account}-${new Date().toISOString().slice(0, 10)}.txt`
    link.click()
    URL.revokeObjectURL(link.href)
    setToast({ severity: 'success', message: 'گزارش ساخته شد.' })
  }

  const toggleSelectionMode = () => {
    setSelectionMode((value) => {
      if (value) setSelectionOpen(true)
      else setSelected([])
      return !value
    })
  }

  const kpis = [
    { label: 'ریل‌های ذخیره‌شده', value: fa.format(stats.count) },
    { label: 'مجموع ویو', value: faCompact.format(stats.total) },
    { label: 'میانهٔ ویو', value: fa.format(stats.median) },
    { label: 'وایرال (۳۰۰ هزار+)', value: fa.format(stats.viral) },
    { label: 'متوسط (۱۰ هزار+)', value: fa.format(stats.mid) },
    { label: 'ضعیف', value: fa.format(stats.flop) },
  ]

  const editing = editor && activeAccount ? activeAccount.items[editor.id] : null

  return (
    <Box>
      <Stack spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            آنالیزور محتوا
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            مدیریت و تحلیل ریل‌ها روی دیتابیس{' '}
            <Box component="span" dir="ltr" sx={{ fontFamily: 'monospace', fontSize: 13 }}>
              reels_database.json
            </Box>{' '}
            ؛ همان چرخهٔ ایمپورت، ویرایش و گزارش نسخهٔ دسکتاپ.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1, alignItems: 'center' }}>
          <TextField
            select
            size="small"
            label="حساب"
            value={db?.active_account ?? ''}
            onChange={(event) => void switchAccount(event.target.value)}
            sx={{ minWidth: 150, mt: 0.5 }}
            slotProps={{ inputLabel: { shrink: true } }}
            disabled={!db}
          >
            {db ? (
              Object.keys(db.accounts).map((name) => (
                <MenuItem key={name} value={name}>
                  <Box component="span" dir="ltr">
                    {name}
                  </Box>
                </MenuItem>
              ))
            ) : (
              <MenuItem value="">—</MenuItem>
            )}
          </TextField>
          <Button size="small" variant="outlined" startIcon={<AddRoundedIcon />} onClick={() => setAccountOpen(true)} disabled={!db}>
            حساب جدید
          </Button>
          <Button size="small" variant="outlined" startIcon={<UploadFileRoundedIcon />} onClick={() => setCsvOpen(true)} disabled={!db}>
            ایمپورت CSV
          </Button>
          <Button size="small" variant="outlined" startIcon={<UploadFileRoundedIcon />} onClick={() => setJsonOpen(true)} disabled={!db}>
            ایمپورت محتوا
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button size="small" variant="contained" startIcon={<DownloadRoundedIcon />} onClick={exportReport} disabled={!db}>
            گزارش
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {kpis.map((kpi) => (
          <Grid key={kpi.label} size={{ xs: 6, sm: 4, lg: 2 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ py: 2 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary' }}>{kpi.label}</Typography>
                <Typography sx={{ fontSize: 24, fontWeight: 700, mt: 0.5 }}>{kpi.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: 1.5 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' } }}>
            <FormControlLabel
              control={<Switch checked={selectionMode} onChange={toggleSelectionMode} />}
              label="حالت انتخاب"
            />
            {selectionMode ? (
              <Button size="small" startIcon={<PlaylistAddCheckRoundedIcon />} onClick={() => setSelectionOpen(true)}>
                نمایش {fa.format(selected.length)} کد
              </Button>
            ) : null}
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Chip size="small" label={`جدید: ${fa.format(stats.newCount)}`} color="success" />
              <Chip size="small" label={`آپدیت‌شده: ${fa.format(stats.updatedCount)}`} color="warning" />
              <Chip size="small" label={`فلپ دستی: ${fa.format(stats.flopped)}`} />
              <Chip size="small" label={`آخرین ذخیره: ${activeAccount?.last_updated ? stampFa(activeAccount.last_updated) : '—'}`} />
            </Stack>
            <Box sx={{ flexGrow: 1 }} />
            <Box sx={{ flexGrow: 1 }} />
            <Button size="small" color="error" startIcon={<DeleteSweepRoundedIcon />} onClick={() => setResetOpen(true)} disabled={!db}>
              پاک‌کردن داده
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {toast ? (
        <Alert severity={toast.severity} onClose={() => setToast(null)} sx={{ mb: 2 }}>
          {toast.message}
        </Alert>
      ) : null}

      <ReelsTable
        rows={rows}
        loading={loading || saving}
        initialSearch={initialSearch}
        selectionMode={selectionMode}
        selected={selected}
        onSelectionToggle={(id) => setSelected((current) => (current.includes(id) ? current : [...current, id]))}
        onEdit={(id, field) => setEditor({ id, field })}
        onToggleFlop={(id) => void toggleFlop(id)}
      />

      {editor && editing ? (
        <TextEditorDialog
          key={`${editor.id}-${editor.field}`}
          open
          title={editor.field === 'content' ? `محتوای دستی — ${editor.id}` : `پیش‌بینی — ${editor.id}`}
          initial={editing[editor.field] ?? ''}
          onSave={(value) => void updateItem(editor.id, editor.field, value)}
          onClose={() => setEditor(null)}
        />
      ) : null}

      <ImportCsvDialog open={csvOpen} onClose={() => setCsvOpen(false)} onImport={(text, name) => void importCsv(text, name)} />
      <ImportJsonDialog open={jsonOpen} onClose={() => setJsonOpen(false)} onImport={(text) => void importJson(text)} />
      <SelectionDialog open={selectionOpen} codes={selected} onClose={() => setSelectionOpen(false)} />
      <ConfirmResetDialog
        open={resetOpen}
        account={db?.active_account ?? ''}
        onConfirm={() => void resetAccount()}
        onClose={() => setResetOpen(false)}
      />

      <Dialog open={accountOpen} onClose={() => setAccountOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>حساب جدید</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="نام حساب"
            value={accountName}
            onChange={(event) => setAccountName(event.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAccountOpen(false)}>انصراف</Button>
          <Button variant="contained" disabled={!accountName.trim()} onClick={() => void createAccount()}>
            بساز
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={saving} message="در حال ذخیره…" anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} />
    </Box>
  )
}
