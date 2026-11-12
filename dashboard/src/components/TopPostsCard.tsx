import { Card, CardHeader, CardContent, List, ListItem, Typography, Chip, Stack, Box } from '@mui/material'
import type { PostMetric } from '../lib/types'
import { excerpt, fa, faCompact } from '../lib/format'

interface TopPostsCardProps {
  title: string
  posts: PostMetric[]
  metric: 'saves' | 'views'
}

export default function TopPostsCard({ title, posts, metric }: TopPostsCardProps) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardHeader title={title} />
      <CardContent sx={{ pt: 0 }}>
        <List disablePadding>
          {posts.slice(0, 5).map((post, index) => (
            <ListItem key={post.id} disableGutters alignItems="flex-start" sx={{ py: 1.2, borderBottom: index < 4 ? 1 : 0, borderColor: 'divider' }}>
              <Stack direction="row" spacing={1.5} sx={{ width: '100%', alignItems: 'flex-start' }}>
                <Typography sx={{ color: 'primary.main', fontWeight: 700, minWidth: 18 }}>{fa.format(index + 1)}</Typography>
                <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      lineHeight: 1.8,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {excerpt(post.caption, 92)}
                  </Typography>
                  <Stack direction="row" spacing={1.5} sx={{ mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {faCompact.format(post.saves ?? 0)} سیو
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {faCompact.format(post.views ?? 0)} ویو
                    </Typography>
                  </Stack>
                </Box>
                <Chip size="small" label={faCompact.format(post[metric] ?? 0)} variant="outlined" />
              </Stack>
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  )
}
