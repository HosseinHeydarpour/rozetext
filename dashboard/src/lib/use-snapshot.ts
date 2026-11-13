'use client'

import { useEffect, useState } from 'react'
import snapshotJson from '@/data/snapshot.json'
import type { Snapshot } from '@/lib/types'

const initial = snapshotJson as unknown as Snapshot

let cache: Snapshot | null = null
let inflight: Promise<Snapshot> | null = null
const listeners = new Set<(snapshot: Snapshot) => void>()

function publish(next: Snapshot) {
  cache = next
  for (const listener of listeners) listener(next)
}

async function fetchSnapshot() {
  const response = await fetch('/api/snapshot', { cache: 'no-store' })
  if (!response.ok) throw new Error('خواندن snapshot ناموفق بود.')
  const body = (await response.json()) as Snapshot
  publish(body)
  return body
}

export function useSnapshot() {
  const [snapshot, setSnapshot] = useState<Snapshot>(cache ?? initial)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listeners.add(setSnapshot)
    if (!cache) {
      inflight = inflight ?? fetchSnapshot().finally(() => {
        inflight = null
      })
      inflight.catch(() => null)
    }
    return () => {
      listeners.delete(setSnapshot)
    }
  }, [])

  const refresh = async () => {
    setRefreshing(true)
    setError(null)
    try {
      const response = await fetch('/api/refresh', { method: 'POST' })
      const body = (await response.json()) as { ok: boolean; snapshot?: Snapshot; error?: string }
      if (!response.ok || !body.ok || !body.snapshot) throw new Error(body.error ?? 'به‌روزرسانی ناموفق بود.')
      publish(body.snapshot)
    } catch (cause) {
      setError(String((cause as Error).message ?? cause))
    } finally {
      setRefreshing(false)
    }
  }

  return { snapshot, refresh, refreshing, error }
}
