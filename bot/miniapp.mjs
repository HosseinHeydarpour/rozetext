import { spawn } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { SKILLS } from './skills.mjs'

const DIR = path.join(import.meta.dirname, 'miniapp')
const FONTS = path.resolve(import.meta.dirname, '..', 'dashboard', 'public', 'fonts')

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.woff2': 'font/woff2',
}

const FILES = {
  '/': path.join(DIR, 'index.html'),
  '/styles.css': path.join(DIR, 'styles.css'),
  '/app.js': path.join(DIR, 'app.js'),
  '/fonts/Peyda-Medium.woff2': path.join(FONTS, 'Peyda-Medium.woff2'),
  '/fonts/Peyda-Bold.woff2': path.join(FONTS, 'Peyda-Bold.woff2'),
}

export function serve(handle, port) {
  const server = http.createServer((request, response) => {
    if (request.method !== 'GET') {
      response.writeHead(405).end()
      return
    }

    const { pathname } = new URL(request.url, 'http://localhost')

    if (pathname === '/skills.json') {
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
      response.end(JSON.stringify({ handle, skills: SKILLS }))
      return
    }

    const file = FILES[pathname]
    if (!file) {
      response.writeHead(404).end()
      return
    }

    fs.readFile(file, (error, body) => {
      if (error) {
        response.writeHead(404).end()
        return
      }
      response.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' })
      response.end(body)
    })
  })

  return new Promise((resolve, reject) => {
    server.on('error', reject)
    server.listen(port, '127.0.0.1', () => resolve(server))
  })
}

export function tunnel(port) {
  return new Promise((resolve) => {
    const child = spawn('cloudflared', ['tunnel', '--url', `http://127.0.0.1:${port}`, '--no-autoupdate'], {
      windowsHide: true,
    })

    let settled = false
    const finish = (url) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (!url) child.kill()
      resolve(url)
    }

    const timer = setTimeout(() => finish(null), 30000)
    timer.unref()

    const scan = (chunk) => {
      const match = String(chunk).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)
      if (match) finish(match[0])
    }

    child.stdout.on('data', scan)
    child.stderr.on('data', scan)
    child.on('error', () => finish(null))
    child.on('exit', () => finish(null))
  })
}
