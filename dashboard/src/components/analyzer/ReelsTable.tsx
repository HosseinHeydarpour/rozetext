'use client'

import { useMemo, useState } from 'react'
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
import { DataGrid, type GridColDef, type GridRowClassNameParams, type GridSortModel, type GridValidRowModel } from '@mui/x-data-grid'
import { alpha } from '@mui/material/styles'
import { faIR } from '@mui/x-data-grid/locales'
import type { GridLocaleText } from '@mui/x-data-grid'
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
  onSelectionToggle: (id: string) => void
  selectionMode: boolean
  selected: string[]
  loading?: boolean
}

function Tik({ value }: { value: string }) {
  if (!value) return <Typography variant="caption" color="text.disabled">—</Typography>
  return (
    <Tooltip title={value}>
      <Typography
        variant="body2"
        sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', lineHeight: 2 }}
      >
        {value}
      </Typography>
    </Tooltip>
  )
}

export default function ReelsTable({
  rows,
  onEdit,
  onToggleFlop,
  onSelectionToggle,
  selectionMode,
  selected,
  loading,
}: ReelsTableProps) {
  const [tier, setTier] = useState<TierFilter>('all')
  const [search, setSearch] = useState('')
  const [sortModel, setSortModel] = useState<GridSortModel>([{ field: 'views', sort: 'desc' }])
  const sortDesc = sortModel[0]?.sort !== 'asc'

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (tier !== 'all' && row.tier !== tier) return false
      if (!needle) return true
      return (
        row.caption.toLowerCase().includes(needle) ||
        row.content.toLowerCase().includes(needle) ||
        row.reelCode.toLowerCase().includes(needle)
      )
    })
  }, [rows, tier, search])

  const columns = useMemo<GridColDef<ReelRow>[]>(
    () => [
      {
        field: 'reelCode',
        headerName: 'کد ریل',
        width: 108,
        renderCell: (params) => (
          <Typography
            component="a"
            href={params.row.url}
            target="_blank"
            rel="noreferrer"
            variant="body2"
            sx={{ color: 'primary.main', fontFamily: 'monospace', direction: 'ltr' }}
            onClick={(event) => event.stopPropagation()}
          >
            {params.value}
          </Typography>
        ),
      },
      {
        field: 'date',
        headerName: 'تاریخ',
        width: 118,
        valueFormatter: (value: string) => usDateFa(value),
      },
      {
        field: 'views',
        headerName: 'ویو',
        width: 96,
        align: 'center',
        headerAlign: 'center',
        valueFormatter: (value: number) => fa.format(value),
      },
      {
        field: 'followers',
        headerName: 'فالو +',
        width: 88,
        align: 'center',
        headerAlign: 'center',
        valueFormatter: (value: number) => `+${fa.format(value)}`,
      },
      {
        field: 'share',
        headerName: 'شیر',
        width: 82,
        align: 'center',
        headerAlign: 'center',
        valueFormatter: (value: number) => fa.format(value),
      },
      {
        field: 'save',
        headerName: 'سیو',
        width: 82,
        align: 'center',
        headerAlign: 'center',
        valueFormatter: (value: number) => fa.format(value),
      },
      {
        field: 'tier',
        headerName: 'عملکرد',
        width: 92,
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
        flex: 1.4,
        minWidth: 220,
        sortable: false,
        renderCell: (params) => <Tik value={params.row.caption} />,
      },
      {
        field: 'content',
        headerName: 'محتوای دستی',
        flex: 1.2,
        minWidth: 190,
        sortable: false,
        renderCell: (params) => (
          <Box
            onClick={(event) => {
              event.stopPropagation()
              onEdit(params.row.id, 'content')
            }}
            sx={{ cursor: 'pointer', width: '100%', '&:hover': { color: 'primary.main' } }}
          >
            <Tik value={params.row.content} />
          </Box>
        ),
      },
      {
        field: 'prediction',
        headerName: 'پیش‌بینی',
        flex: 1,
        minWidth: 160,
        sortable: false,
        renderCell: (params) => (
          <Box
            onClick={(event) => {
              event.stopPropagation()
              onEdit(params.row.id, 'prediction')
            }}
            sx={{ cursor: 'pointer', width: '100%', '&:hover': { color: 'primary.main' } }}
          >
            <Tik value={params.row.prediction} />
          </Box>
        ),
      },
      {
        field: 'is_flopped',
        headerName: 'فلپ',
        width: 78,
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
    <Card variant="outlined">
      <Stack spacing={1.5} sx={{ p: 2, pb: 1 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' } }}>
          <TextField
            size="small"
            placeholder="جستجو در کپشن، محتوا یا کد ریل"
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
          <Button
            size="small"
            variant="outlined"
            onClick={() => setSortModel([{ field: 'views', sort: sortDesc ? 'asc' : 'desc' }])}
          >
            مرتب‌سازی ویو {sortDesc ? '↓' : '↑'}
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          {selectionMode ? (
            <Chip size="small" color="primary" label={`${fa.format(selected.length)} ریل انتخاب‌شده`} />
          ) : null}
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {selectionMode
            ? 'حالت انتخاب روشن است؛ با کلیک روی هر ردیف کد ریل به لیست اضافه می‌شود.'
            : 'برای ویرایش محتوا یا پیش‌بینی روی همان ستون کلیک کنید. کد ریل در تب جدید باز می‌شود.'}
        </Typography>
      </Stack>

      <Box sx={{ height: 680, width: '100%' }}>
        <DataGrid
          rows={filtered}
          columns={columns}
          loading={loading}
          localeText={localeText}
          disableRowSelectionOnClick
          rowHeight={56}
          columnHeaderHeight={46}
          pageSizeOptions={[25, 50, 100]}
          pagination
          initialState={{ pagination: { paginationModel: { page: 0, pageSize: 25 } } }}
          sortModel={sortModel}
          onSortModelChange={setSortModel}
          sortingOrder={['desc', 'asc']}
          getRowClassName={(params: GridRowClassNameParams<GridValidRowModel & ReelRow>) =>
            params.row.is_new ? 'row-new' : params.row.is_updated ? 'row-updated' : ''
          }
          onRowClick={(params) => {
            if (selectionMode) onSelectionToggle(params.row.id)
          }}
          sx={(theme) => ({
            border: 0,
            '& .MuiDataGrid-columnHeaders': { bgcolor: 'action.hover' },
            '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700, fontSize: 12 },
            '& .MuiDataGrid-cell': { alignItems: 'center' },
            '& .row-new': { bgcolor: alpha(theme.palette.success.main, 0.14) },
            '& .row-updated': { bgcolor: alpha(theme.palette.warning.main, 0.12) },
          })}
        />
      </Box>
    </Card>
  )
}
