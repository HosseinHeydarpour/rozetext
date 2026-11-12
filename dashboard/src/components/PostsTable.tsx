import { Box, Paper, Stack, Typography } from '@mui/material'
import type { RecentContent } from '../lib/types'
import { cellNumber, sourceDateFa } from '../lib/format'

interface PostsTableProps {
  rows: RecentContent[]
}

const headCell = 'py-3 text-right text-[11px] font-medium tracking-wide text-muted'
const bodyCell = 'py-3 text-right text-[13px]'

export default function PostsTable({ rows }: PostsTableProps) {
  return (
    <Paper variant="outlined" sx={{ borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Box className="flex items-baseline justify-between px-5 pb-3 pt-5">
        <Typography variant="h4" sx={{ fontSize: 22 }}>
          محتوای اخیر
        </Typography>
        <Typography variant="caption" color="text.secondary">
          ۱۲ پست آخر · واچ‌تایم از جدول Content
        </Typography>
      </Box>
      <Box className="no-scrollbar overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-y border-line">
              <th className={`${headCell} pr-5`}>عنوان</th>
              <th className={headCell}>تاریخ</th>
              <th className={headCell}>ویو</th>
              <th className={headCell}>سیو</th>
              <th className={headCell}>شیر</th>
              <th className={`${headCell} pl-5`}>واچ‌تایم</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className={`${bodyCell} px-5 py-8 text-center text-muted`}>
                  داده‌ای برای نمایش نیست
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={`${row.date_published}-${row.title.slice(0, 12)}`} className="border-b border-line/70 last:border-b-0">
                  <td className={`${bodyCell} max-w-[380px] pr-5`}>
                    <Typography
                      variant="body2"
                      sx={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', lineHeight: 1.9 }}
                    >
                      {row.title}
                    </Typography>
                  </td>
                  <td className={`${bodyCell} min-w-[110px] whitespace-nowrap text-muted`}>{sourceDateFa(row.date_published)}</td>
                  <td className={`${bodyCell} num`}>{cellNumber(row.views)}</td>
                  <td className={`${bodyCell} num`}>{cellNumber(row.saves)}</td>
                  <td className={`${bodyCell} num`}>{cellNumber(row.shares)}</td>
                  <td className={`${bodyCell} pl-5 text-muted`}>
                    {/^[‑-]+$/.test(row.watch_time) ? 'بی‌داده' : row.watch_time}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Box>
      <Stack direction="row" className="px-5 py-3" spacing={2}>
        <Typography variant="caption" color="text.secondary">
          ستون‌های ویو، سیو و شیر از اکسپورت پست‌ها؛ واچ‌تایم فقط برای پست‌های دارای ویدیو.
        </Typography>
      </Stack>
    </Paper>
  )
}
