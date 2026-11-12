import { Card, CardHeader, CardContent, Typography, Box } from '@mui/material'
import { DataGrid, type GridColDef, type GridLocaleText } from '@mui/x-data-grid'
import { faIR } from '@mui/x-data-grid/locales'
import type { RecentContent } from '../lib/types'
import { cellNumber, fa, sourceDateFa } from '../lib/format'

interface PostsGridProps {
  rows: RecentContent[]
  hideFooter?: boolean
  height?: number
}

const columns: GridColDef[] = [
  {
    field: 'title',
    headerName: 'عنوان',
    flex: 2,
    minWidth: 260,
    renderCell: (params) => (
      <Typography
        variant="body2"
        sx={{
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 1,
          WebkitBoxOrient: 'vertical',
          lineHeight: 1.8,
        }}
      >
        {params.value}
      </Typography>
    ),
  },
  {
    field: 'date_published',
    headerName: 'تاریخ',
    width: 110,
    valueFormatter: (value: string) => sourceDateFa(value),
  },
  { field: 'views', headerName: 'ویو', width: 92, align: 'center', headerAlign: 'center', valueFormatter: (value: string) => cellNumber(value) },
  { field: 'reach', headerName: 'ریچ', width: 92, align: 'center', headerAlign: 'center', valueFormatter: (value: string) => cellNumber(value) },
  { field: 'likes', headerName: 'لایک', width: 82, align: 'center', headerAlign: 'center', valueFormatter: (value: string) => cellNumber(value) },
  { field: 'comments', headerName: 'کامنت', width: 82, align: 'center', headerAlign: 'center', valueFormatter: (value: string) => cellNumber(value) },
  { field: 'shares', headerName: 'شیر', width: 78, align: 'center', headerAlign: 'center', valueFormatter: (value: string) => cellNumber(value) },
  { field: 'saves', headerName: 'سیو', width: 78, align: 'center', headerAlign: 'center', valueFormatter: (value: string) => cellNumber(value) },
  {
    field: 'watch_time',
    headerName: 'واچ‌تایم',
    width: 110,
    align: 'center',
    headerAlign: 'center',
    valueFormatter: (value: string) => (/^[‑-]+$/.test(value) ? 'بی‌داده' : value),
  },
]

const localeText: Partial<GridLocaleText> = {
  ...faIR.components.MuiDataGrid.defaultProps.localeText,
  paginationDisplayedRows: ({ from, to, count }) =>
    count === -1
      ? `${fa.format(from)}–${fa.format(to)}`
      : `${fa.format(from)}–${fa.format(to)} از ${fa.format(count)}`,
}

export default function PostsGrid({ rows, hideFooter = false, height = 620 }: PostsGridProps) {
  return (
    <Card variant="outlined" sx={{ height: hideFooter ? 'auto' : height, display: 'flex', flexDirection: 'column' }}>
      <CardHeader title="پست‌های اخیر" sx={{ pb: 0 }} />
      <CardContent sx={{ flexGrow: 1, minHeight: 0, p: 0, '&:last-child': { pb: 0 } }}>
        <Box sx={{ height: hideFooter ? 360 : '100%', width: '100%' }}>
          <DataGrid
            rows={rows.map((row, index) => ({ ...row, id: index }))}
            columns={columns}
            localeText={localeText}
            hideFooter={hideFooter}
            disableRowSelectionOnClick
            density="compact"
            rowHeight={52}
            columnHeaderHeight={44}
            pageSizeOptions={[10, 25]}
            initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }}
            sx={{
              border: 0,
              '& .MuiDataGrid-columnHeaders': { bgcolor: 'action.hover' },
              '& .MuiDataGrid-cell': { alignItems: 'center' },
              '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700, fontSize: 12 },
            }}
          />
        </Box>
      </CardContent>
    </Card>
  )
}
