export type SeriesPoint = { date: string; value: number }

export type RangeKey =
  | 'yesterday'
  | 'last-7-days'
  | 'last-28-days'
  | 'last-90-days'
  | 'this-week'
  | 'this-month'
  | 'this-year'

export interface RangeData {
  label: string
  series: {
    views: SeriesPoint[]
    reach: SeriesPoint[]
    interactions: SeriesPoint[]
    linkClicks: SeriesPoint[]
  }
  totals: { views: number; reach: number; interactions: number; linkClicks: number }
}

export interface RecentContent {
  title: string
  date_published: string
  views: string
  reach: string
  likes: string
  comments: string
  shares: string
  saves: string
  follows: string
  watch_time: string
  avg_play_time: string
  three_second_views: string
}

export interface PostMetric {
  id: string
  caption: string
  publishedAt: string
  permalink: string
  type: string
  views: number | null
  reach: number | null
  likes: number | null
  comments: number | null
  shares: number | null
  saves: number | null
  follows: number | null
}

export interface Snapshot {
  generated_at: string
  account: { username: string; followers: number; posts: number }
  kpis: {
    views28: number
    interactions28: number
    reach28: number
    savesTotal: number
    viewsTotal: number
    saveRate: number
    followersPct: number | null
    nonFollowersPct: number | null
    viewers28: number | null
    profileVisits: number | null
    accountsEngaged: number | null
  }
  ranges: Record<RangeKey, RangeData>
  follows: {
    total: string | null
    unfollows: string | null
    followersLifetime: string | null
    daily: { date: string | null; value: number }[]
  }
  demographics: {
    ageGender: { bucket: string; men: number; women: number }[]
    cities: { name: string; pct: number }[]
    countries: { name: string; pct: number }[]
    men: number
    women: number
  }
  formats: { posts: number; stories: number }
  recentContent: RecentContent[]
  topBySaves: PostMetric[]
  topByViews: PostMetric[]
  activeTimes: Record<string, Record<string, number>>
  activeTimesBest: { day: string; hour: string; value: number } | null
}
