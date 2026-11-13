'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Card,
  Chip,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import type { GridColDef, GridRowClassNameParams, GridSortModel, GridValidRowModel } from '@mui/x-data-grid'
import { DataGrid } from '@mui/x-data-grid'
import { faIR } from '@mui/x-data-grid/locales'
import type { GridLocaleText } from '@mui/x-data-grid'
import { alpha } from '@mui/material/styles'
import { fa, usDateFa } from '@/lib/format'
import { tierLabel, type ReelRow } from '@/lib/reels'

const localeText: Partial<GridLocaleText> = {
  ...faIR.components.MuiDataGrid.defaultProps.localeText,
  paginationDisplayedRows: ({ from, to, count }) =>
    count === -1 ? `${fa.format(from)}–${fa.format(to)}` : `${fa.format(from)}–${fa.format(to)} از ${fa.format(count)}`,
}

type TierFilter = 'all' | ReelRow['tier']

interface ReelsTableProps {
  rows: ReelRow[]
  onEdit: (id: string, field: 'content' | 'prediction') => void
  onToggleFlop: (id: string) => void
  loading?: boolean
  initialSearch?: string
}

function Tik({ value }: { value: string }) {
  if (!value) {
    return (
      <Typography variant="caption" color="text.disabled">
        —
      </Typography>
    )
  }
  return (
    <Tooltip title={value}>
      <Typography
        variant="body2"
        sx={{
          display: 'block',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          lineHeight: 1.6,
          maxWidth: '100%',
        }}
      >
        {value}
      </Typography>
    </Tooltip>
  )
}

export default function ReelsTable({ rows, onEdit, onToggleFlop, loading, initialSearch = '' }: ReelsTableProps) {
  const [tier, setTier] = useState<TierFilter>('all')
  const [search, setSearch] = useState(initialSearch)
  const [sortDesc, setSortDesc] = useState(true)

  useEffect(() => {
    if (initialSearch) setSearch(initialSearch)
  }, [initialSearch])

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const list = rows.filter((row) => {
      if (tier !== 'all' && row.tier !== tier) return false
      if (!needle) return true
      return (
        row.caption.toLowerCase().includes(needle) ||
        row.content.toLowerCase().includes(needle) ||
        row.reelCode.toLowerCase().includes(needle)
      )
    })
    return [...list].sort((a, b) => (sortDesc ? b.views - a.views : a.views - b.views))
  }, [rows, tier, search, sortDesc])

  const columns = useMemo<GridColDef<ReelRow>[]>(
    () => [
      {
        field: 'reelCode',
        headerName: 'کد ریل',
        width: 120,
        sortable: false,
        headerAlign: 'right',
        renderCell: (params) => (
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0, width: '100%', overflow: 'hidden' }}>
            {params.row.is_new ? <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'success.main', flexShrink: 0 }} /> : null}
            {params.row.is_updated && !params.row.is_new ? (
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'warning.main', flexShrink: 0 }} />
            ) : null}
            <Typography
              component="a"
              href={params.row.url}
              target="_blank"
              rel="noreferrer"
              sx={{ color: 'primary.main', fontFamily: 'monospace', fontSize: 12, direction: 'ltr', whiteSpace: 'nowrap' }}
              onClick={(event) => event.stopPropagation()}
            >
              {params.value}
            </Typography>
          </Stack>
        ),
      },
      {
        field: 'date',
        headerName: 'تاریخ',
        width: 110,
        sortable: false,
        align: 'right',
        headerAlign: 'right',
        valueFormatter: (value: string) => usDateFa(value),
      },
      {
        field: 'views',
        headerName: 'ویو',
        width: 90,
        align: 'right',
        headerAlign: 'right',
        valueFormatter: (value: number) => fa.format(value),
      },
      {
        field: 'followers',
        headerName: 'فالو +',
        width: 78,
        align: 'right',
        headerAlign: 'right',
        valueFormatter: (value: number) => `+${fa.format(value)}`,
      },
      {
        field: 'share',
        headerName: 'شیر',
        width: 70,
        align: 'right',
        headerAlign: 'right',
        valueFormatter: (value: number) => fa.format(value),
      },
      {
        field: 'save',
        headerName: 'سیو',
        width: 70,
        align: 'right',
        headerAlign: 'right',
        valueFormatter: (value: number) => fa.format(value),
      },
      {
        field: 'tier',
        headerName: 'عملکرد',
        width: 78,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => (
          <Chip
            size="small"
            label={tierLabel[params.row.tier]}
            color={params.row.tier === 'VIRAL' ? 'success' : params.row.tier === 'MID' ? 'warning' : 'default'}
            variant={params.row.tier === 'FLOP' ? 'outlined' : 'filled'}
          />
        ),
      },
      {
        field: 'caption',
        headerName: 'کپشن',
        flex: 1.6,
        minWidth: 150,
        sortable: false,
        renderCell: (params) => <Tik value={params.row.caption} />,
      },
      {
        field: 'content',
        headerName: 'متن ریلز',
        flex: 1.3,
        minWidth: 130,
        sortable: false,
        renderCell: (params) => (
          <Box
            onClick={(event) => {
              event.stopPropagation()
              onEdit(params.row.id, 'content')
            }}
            sx={{ cursor: 'pointer', width: '100%', minWidth: 0, overflow: 'hidden', '&:hover': { color: 'primary.main' } }}
          >
            <Tik value={params.row.content} />
          </Box>
        ),
      },
      {
        field: 'prediction',
        headerName: 'پیش‌بینی',
        flex: 1,
        minWidth: 100,
        sortable: false,
        renderCell: (params) => (
          <Box
            onClick={(event) => {
              event.stopPropagation()
              onEdit(params.row.id, 'prediction')
            }}
            sx={{ cursor: 'pointer', width: '100%', minWidth: 0, overflow: 'hidden', '&:hover': { color: 'primary.main' } }}
          >
            <Tik value={params.row.prediction} />
          </Box>
        ),
      },
      {
        field: 'is_flopped',
        headerName: 'فلپ',
        width: 64,
        align: 'center',
        headerAlign: 'center',
        sortable: false,
        renderCell: (params) => (
          <Switch
            size="small"
            checked={params.row.is_flopped}
            onChange={() => onToggleFlop(params.row.id)}
            onClick={(event) => event.stopPropagation()}
            slotProps={{ input: { 'aria-label': `فلپ ${params.row.reelCode}` } }}
          />
        ),
      },
    ],
    [onEdit, onToggleFlop],
  )

  return (
    <Card>
      <Stack spacing={1.5} sx={{ p: 2, pb: 1 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' } }}>
          <TextField
            size="small"
            placeholder="جستجو در کپشن، متن ریلز یا کد ریل"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ minWidth: 260 }}
          />
          <ToggleButtonGroup exclusive size="small" value={tier} onChange={(_, value: TierFilter | null) => value && setTier(value)}>
            <ToggleButton value="all" sx={{ px: 1.4, fontSize: 12 }}>
              همه ({fa.format(rows.length)})
            </ToggleButton>
            <ToggleButton value="VIRAL" sx={{ px: 1.4, fontSize: 12 }}>
              وایرال
            </ToggleButton>
            <ToggleButton value="MID" sx={{ px: 1.4, fontSize: 12 }}>
              متوسط
            </ToggleButton>
            <ToggleButton value="FLOP" sx={{ px: 1.4, fontSize: 12 }}>
              ضعیف
            </ToggleButton>
          </ToggleButtonGroup>
          <Button size="small" variant="outlined" onClick={() => setSortDesc((value) => !value)}>
            مرتب‌سازی ویو {sortDesc ? '↓' : '↑'}
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          برای ویرایش متن ریلز یا پیش‌بینی روی همان ستون کلیک کنید. کد ریل در تب جدید باز می‌شود.
        </Typography>
      </Stack>

      <Box sx={{ height: 680, width: '100%' }}>
        <DataGrid
          rows={filtered}
          columns={columns}
          loading={loading}
          localeText={localeText}
          disableRowSelectionOnClick
          disableColumnSorting
          rowHeight={56}
          columnHeaderHeight={46}
          pageSizeOptions={[25, 50, 100]}
          pagination
          initialState={{ pagination: { paginationModel: { page: 0, pageSize: 25 } } }}
          getRowClassName={(params: GridRowClassNameParams<GridValidRowModel & ReelRow>) => (params.row.is_new ? 'row-new' : '')}
          sx={(theme) => ({
            border: 0,
            '& .MuiDataGrid-columnHeaders': { bgcolor: 'action.hover' },
            '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700, fontSize: 12 },
            '& .MuiDataGrid-cell': { alignItems: 'center', overflow: 'hidden' },
            '& .row-new': { bgcolor: alpha(theme.palette.success.main, 0.14) },
          })}
        />
      </Box>
    </Card>
  )
}
