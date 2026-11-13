import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const REEL_URL = /^https:\/\/(www\.)?instagram\.com\/(reel|p|tv)\/[A-Za-z0-9_-]+/

const run = (command: string, args: string[], timeout: number) =>
  new Promise<string>((resolve, reject) => {
    execFile(command, args, { timeout, windowsHide: true, maxBuffer: 8 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) reject(new Error(stderr?.trim().split('\n').slice(-3).join(' ') || error.message))
      else resolve(stdout)
    })
  })

/**
 * One-click clip: pulls the reel's audio with yt-dlp, then ffmpeg glues the rendered
 * cover over it. `format: 'audio'` returns just the extracted track.
 */
export async function POST(request: Request) {
  let payload: { url?: string; image?: string; format?: 'video' | 'audio' }
  try {
    payload = (await request.json()) as typeof payload
  } catch {
    return NextResponse.json({ error: 'بدنهٔ درخواست خوانده نشد.' }, { status: 400 })
  }

  const url = payload.url?.trim() ?? ''
  if (!REEL_URL.test(url)) {
    return NextResponse.json({ error: 'لینک ریل معتبر نیست؛ باید با instagram.com/reel/ شروع شود.' }, { status: 400 })
  }

  const format = payload.format === 'audio' ? 'audio' : 'video'
  const work = await mkdtemp(path.join(os.tmpdir(), 'rozetext-clip-'))

  try {
    const audioPath = path.join(work, 'audio.m4a')
    await run('yt-dlp', ['--no-playlist', '-f', 'bestaudio/best', '-x', '--audio-format', 'm4a', '-o', audioPath, url], 180_000)

    const audio = await readFile(audioPath)
    if (format === 'audio') {
      return new Response(audio, {
        headers: {
          'content-type': 'audio/mp4',
          'content-disposition': `attachment; filename="rozetext-audio-${Date.now()}.m4a"`,
          'content-length': String(audio.length),
        },
      })
    }

    const image = payload.image ?? ''
    const base64 = image.includes(',') ? image.slice(image.indexOf(',') + 1) : image
    if (!base64) {
      return NextResponse.json({ error: 'تصویر کاور ارسال نشد.' }, { status: 400 })
    }
    const imagePath = path.join(work, 'cover.png')
    await writeFile(imagePath, Buffer.from(base64, 'base64'))

    const videoPath = path.join(work, 'clip.mp4')
    await run(
      'ffmpeg',
      [
        '-y',
        '-loop', '1',
        '-i', imagePath,
        '-i', audioPath,
        '-c:v', 'libx264',
        '-tune', 'stillimage',
        '-pix_fmt', 'yuv420p',
        '-r', '30',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest',
        '-movflags', '+faststart',
        videoPath,
      ],
      240_000,
    )

    const video = await readFile(videoPath)
    return new Response(video, {
      headers: {
        'content-type': 'video/mp4',
        'content-disposition': `attachment; filename="rozetext-clip-${Date.now()}.mp4"`,
        'content-length': String(video.length),
      },
    })
  } catch (error) {
    return NextResponse.json({ error: String((error as Error).message ?? error) }, { status: 500 })
  } finally {
    await rm(work, { recursive: true, force: true }).catch(() => null)
  }
}
