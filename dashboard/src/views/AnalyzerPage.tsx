'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material'
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import DeleteSweepRoundedIcon from '@mui/icons-material/DeleteSweepRounded'
import ReelsTable from '@/components/analyzer/ReelsTable'
import TextEditorDialog from '@/components/analyzer/TextEditorDialog'
import ImportCsvDialog from '@/components/analyzer/ImportCsvDialog'
import ConfirmResetDialog from '@/components/analyzer/ConfirmResetDialog'
import ReportDialog, { type ReportFormat } from '@/components/analyzer/ReportDialog'
import { fa, faCompact, stampFa } from '@/lib/format'
import { parseCsv } from '@/lib/csv'
import { accountRows, buildReport, buildReportMarkdown, mergeCsv, summarize, type ReelsDb } from '@/lib/reels'

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
  const [editor, setEditor] = useState<{ id: string; field: 'content' | 'prediction' } | null>(null)
  const [csvOpen, setCsvOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
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
    await persist(next, field === 'content' ? 'متن ریلز ذخیره شد.' : 'پیش‌بینی ذخیره شد.')
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

  const resetAccount = async () => {
    if (!db) return
    const next = clone()
    const account = next.accounts[next.active_account]
    account.items = {}
    account.last_updated = stamp()
    setResetOpen(false)
    await persist(next, 'داده پاک شد.')
  }

  const downloadReport = (format: ReportFormat) => {
    if (!db || rows.length === 0) {
      setToast({ severity: 'info', message: 'ریلی برای گزارش وجود ندارد.' })
      return
    }
    const sorted = [...rows].sort((a, b) => b.views - a.views)
    const body = format === 'md' ? buildReportMarkdown('رز تکست', sorted) : buildReport('رز تکست', sorted)
    const blob = new Blob([body], { type: format === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `rozetext-reels-${new Date().toISOString().slice(0, 10)}.${format}`
    link.click()
    URL.revokeObjectURL(link.href)
    setReportOpen(false)
    setToast({ severity: 'success', message: `گزارش ${format.toUpperCase()} ساخته شد.` })
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
            مدیریت و تحلیل ریل‌های رز تکست؛ همان چرخهٔ ایمپورت، ویرایش و گزارش نسخهٔ دسکتاپ.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1, alignItems: 'center' }}>
          <Button size="small" variant="outlined" startIcon={<UploadFileRoundedIcon />} onClick={() => setCsvOpen(true)} disabled={!db}>
            ایمپورت CSV
          </Button>
          <Button size="small" variant="outlined" startIcon={<DeleteSweepRoundedIcon />} color="error" onClick={() => setResetOpen(true)} disabled={!db}>
            پاک‌کردن داده
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button size="small" variant="contained" startIcon={<DownloadRoundedIcon />} onClick={() => setReportOpen(true)} disabled={!db}>
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
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Chip size="small" label={`جدید: ${fa.format(stats.newCount)}`} color="success" />
              <Chip size="small" label={`آپدیت‌شده: ${fa.format(stats.updatedCount)}`} color="warning" />
              <Chip size="small" label={`فلپ دستی: ${fa.format(stats.flopped)}`} />
            </Stack>
            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="caption" color="text.secondary">
              آخرین ذخیره: {activeAccount?.last_updated ? stampFa(activeAccount.last_updated) : '—'}
            </Typography>
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
        onEdit={(id, field) => setEditor({ id, field })}
        onToggleFlop={(id) => void toggleFlop(id)}
      />

      {editor && editing ? (
        <TextEditorDialog
          key={`${editor.id}-${editor.field}`}
          open
          title={editor.field === 'content' ? `متن ریلز — ${editor.id}` : `پیش‌بینی — ${editor.id}`}
          initial={editing[editor.field] ?? ''}
          onSave={(value) => void updateItem(editor.id, editor.field, value)}
          onClose={() => setEditor(null)}
        />
      ) : null}

      <ImportCsvDialog open={csvOpen} onClose={() => setCsvOpen(false)} onImport={(text, name) => void importCsv(text, name)} />
      <ReportDialog open={reportOpen} count={rows.length} onClose={() => setReportOpen(false)} onDownload={downloadReport} />
      <ConfirmResetDialog open={resetOpen} onConfirm={() => void resetAccount()} onClose={() => setResetOpen(false)} />

      <Snackbar open={saving} message="در حال ذخیره…" anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} />
    </Box>
  )
}
