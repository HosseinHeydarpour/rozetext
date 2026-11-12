'use client'

import { Box, Chip, Grid, Stack } from '@mui/material'
import PageHeader from '../components/PageHeader'
import PostsGrid from '../components/PostsGrid'
import TopPostsCard from '../components/TopPostsCard'
import snapshotJson from '../data/snapshot.json'
import type { Snapshot } from '../lib/types'
import { fa, faCompact } from '../lib/format'

const snapshot = snapshotJson as unknown as Snapshot

export default function ContentPage() {
  return (
    <Box>
      <PageHeader
        title="محتوا"
        subtitle={`${fa.format(snapshot.account.posts)} ریلز ثبت‌شده؛ ${fa.format(snapshot.recentContent.length)} پست آخر با واچ‌تایم.`}
        actions={
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Chip label={`${faCompact.format(snapshot.kpis.viewsTotal)} ویو کل`} variant="outlined" />
            <Chip label={`${faCompact.format(snapshot.kpis.savesTotal)} سیو کل`} variant="outlined" />
            <Chip label={`نرخ سیو ${(snapshot.kpis.saveRate * 100).toFixed(2)}٪`} color="primary" />
          </Stack>
        }
      />

      <PostsGrid rows={snapshot.recentContent} height={640} />

      <Grid container spacing={2} sx={{ mt: 0.5 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <TopPostsCard title="بیشترین سیو" posts={snapshot.topBySaves} metric="saves" />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TopPostsCard title="بیشترین ویو" posts={snapshot.topByViews} metric="views" />
        </Grid>
      </Grid>
    </Box>
  )
}
