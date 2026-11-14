'use client'

/**
 * Optional output folder. Chromium's File System Access API lets the dashboard write
 * straight into a folder the user picks, with no download prompts. The handle lives in
 * IndexedDB, so the choice survives a reload; permission may need one click to renew.
 */

interface DirectoryHandle {
  name: string
  queryPermission(options: { mode: 'readwrite' }): Promise<PermissionState>
  requestPermission(options: { mode: 'readwrite' }): Promise<PermissionState>
  getFileHandle(name: string, options?: { create?: boolean }): Promise<{ createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void> }> }>
}

declare global {
  interface Window {
    showDirectoryPicker?: (options?: { mode?: 'readwrite' }) => Promise<DirectoryHandle>
  }
}

const DB_NAME = 'rozetext-output'
const STORE = 'handles'
const KEY = 'dir'

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

const withStore = async <T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) => {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const request = run(db.transaction(STORE, mode).objectStore(STORE))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export const canPickFolder = () => typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'

export async function pickOutputFolder(): Promise<string | null> {
  if (!canPickFolder()) return null
  const handle = await window.showDirectoryPicker?.({ mode: 'readwrite' })
  if (!handle) return null
  await withStore('readwrite', (store) => store.put(handle, KEY))
  return handle.name
}

export async function getOutputFolderName(): Promise<string | null> {
  try {
    const handle = await withStore<DirectoryHandle | undefined>('readonly', (store) => store.get(KEY))
    return handle?.name ?? null
  } catch {
    return null
  }
}

export async function clearOutputFolder(): Promise<void> {
  await withStore('readwrite', (store) => store.delete(KEY)).catch(() => null)
}

const ensurePermission = async (handle: DirectoryHandle) => {
  const state = await handle.queryPermission({ mode: 'readwrite' })
  if (state === 'granted') return true
  return (await handle.requestPermission({ mode: 'readwrite' })) === 'granted'
}

/** Renews the remembered folder's permission. Browsers drop it between sessions, and the prompt needs a click. */
export async function ensureOutputFolder(): Promise<string | null> {
  try {
    const handle = await withStore<DirectoryHandle | undefined>('readonly', (store) => store.get(KEY))
    if (!handle) return null
    return (await ensurePermission(handle)) ? handle.name : null
  } catch {
    return null
  }
}

const download = (blob: Blob, fileName: string) => {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 4000)
}

/** Writes into the chosen folder when possible, otherwise falls back to a download. */
export async function saveFile(blob: Blob, fileName: string): Promise<'folder' | 'download'> {
  try {
    const handle = await withStore<DirectoryHandle | undefined>('readonly', (store) => store.get(KEY))
    if (handle && (await ensurePermission(handle))) {
      const file = await handle.getFileHandle(fileName, { create: true })
      const writable = await file.createWritable()
      await writable.write(blob)
      await writable.close()
      return 'folder'
    }
  } catch {
    // any failure here should still give the user the file
  }
  download(blob, fileName)
  return 'download'
}
