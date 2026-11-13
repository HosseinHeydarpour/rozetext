export const CANVAS_WIDTH = 1080
export const CANVAS_HEIGHT = 1920

/**
 * Instagram reels safe area, measured on a 1080x1920 frame:
 * the header (avatar, name) eats the top, the caption and the action rail eat the
 * bottom, and the like/comment/share buttons sit on the right edge.
 */
export const SAFE_AREA = { top: 260, bottom: 340, right: 200, left: 60 }

export type CreatorMode = 'dark' | 'light'
export type CreatorKind = 'cover' | 'text'

export interface CreatorTheme {
  name: string
  text: string
  textOpacity: number
  coverText: string
  coverTextOpacity: number
  accent: string
  onAccent: string
  font: string
  weight: number
  fontSize: number
  lineHeight: number
  background: string
}

/** Values taken from the "Dark/Light - Post" frames of the Rozetext Figma file. */
export const THEMES: Record<CreatorMode, CreatorTheme> = {
  light: {
    name: 'لایت',
    text: '#292929',
    textOpacity: 0.9,
    coverText: '#181818',
    coverTextOpacity: 0.8,
    accent: '#8B2635',
    onAccent: '#FFFFFF',
    font: 'IRLotus',
    weight: 700,
    fontSize: 55,
    lineHeight: 92,
    background: '#F3EDE2',
  },
  dark: {
    name: 'دارک',
    text: '#F4C466',
    textOpacity: 0.95,
    coverText: '#FFF7EE',
    coverTextOpacity: 0.95,
    accent: '#F4C466',
    onAccent: '#1B1B1B',
    font: 'IRLotus',
    weight: 700,
    fontSize: 55,
    lineHeight: 92,
    background: '#141414',
  },
}

/** Background art exported from the same Figma frames, one per mode and kind. */
export const BACKGROUNDS: Record<CreatorMode, Record<CreatorKind, string>> = {
  light: { cover: '/creator/light-cover.png', text: '/creator/light-text.png' },
  dark: { cover: '/creator/dark-cover.png', text: '/creator/dark-text.png' },
}

export const COVER_OFFSET = -170

export const COVER_FONT = { family: 'IRTitr', weight: 400, fontSize: 92, lineHeight: 150 }

export interface CreatorSettings {
  mode: CreatorMode
  kind: CreatorKind
  align: 'center' | 'right'
  body: string
  hook: string
  fontSize: number
  lineHeight: number
  offsetY: number
  background: string
  backgroundImage: string | null
  showSafeArea: boolean
}

interface Row {
  text: string
  ranges: { start: number; end: number }[]
}

/** `*word*` marks a highlighted run; the markers are not drawn. */
function parseLine(line: string) {
  let text = ''
  const ranges: { start: number; end: number }[] = []
  let inHighlight = false
  let current: { start: number; end: number } | null = null

  for (const char of line) {
    if (char === '*') {
      if (!inHighlight) {
        current = { start: text.length, end: text.length }
        ranges.push(current)
      }
      inHighlight = !inHighlight
      continue
    }
    text += char
    if (inHighlight && current) current.end = text.length
  }
  return { text, ranges: ranges.filter((range) => range.end > range.start) }
}

function wrapText(ctx: CanvasRenderingContext2D, line: string, maxWidth: number): Row[] {
  const { text, ranges } = parseLine(line)
  const words: { text: string; start: number; end: number }[] = []
  let offset = 0
  for (const word of text.split(' ')) {
    words.push({ text: word, start: offset, end: offset + word.length })
    offset += word.length + 1
  }

  const rows: Row[] = []
  let current: typeof words = []
  const flush = () => {
    if (!current.length) return
    const start = current[0].start
    const end = current[current.length - 1].end
    rows.push({
      text: text.slice(start, end),
      ranges: ranges
        .filter((range) => range.start < end && range.end > start)
        .map((range) => ({ start: Math.max(range.start, start) - start, end: Math.min(range.end, end) - start })),
    })
    current = []
  }

  for (const word of words) {
    const candidate = [...current, word].map((item) => item.text).join(' ')
    if (current.length && ctx.measureText(candidate).width > maxWidth) flush()
    current.push(word)
  }
  flush()
  return rows
}

function drawBackground(ctx: CanvasRenderingContext2D, settings: CreatorSettings) {
  const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
  if (settings.mode === 'dark') {
    gradient.addColorStop(0, '#1B1B1B')
    gradient.addColorStop(1, '#0C0C0C')
  } else {
    gradient.addColorStop(0, '#FAF6EF')
    gradient.addColorStop(1, '#EDE3D4')
  }
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
}

function drawSafeArea(ctx: CanvasRenderingContext2D) {
  ctx.save()
  ctx.strokeStyle = 'rgba(255, 60, 60, 0.55)'
  ctx.setLineDash([24, 18])
  ctx.lineWidth = 4
  ctx.strokeRect(SAFE_AREA.left, SAFE_AREA.top, CANVAS_WIDTH - SAFE_AREA.left - SAFE_AREA.right, CANVAS_HEIGHT - SAFE_AREA.top - SAFE_AREA.bottom)
  ctx.restore()
}

export interface DrawOptions {
  backgroundImage?: HTMLImageElement | null
  preview?: boolean
}

export function drawPost(ctx: CanvasRenderingContext2D, settings: CreatorSettings, options: DrawOptions = {}) {
  const theme = THEMES[settings.mode]
  const isCover = settings.kind === 'cover'
  const family = isCover ? 'IRTitr' : theme.font
  const weight = isCover ? 400 : theme.weight
  const { fontSize, lineHeight } = settings
  const text = isCover ? settings.hook : settings.body
  const textColor = isCover ? theme.coverText : theme.text
  const textOpacity = isCover ? theme.coverTextOpacity : theme.textOpacity

  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  if (options.backgroundImage?.complete) ctx.drawImage(options.backgroundImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  else drawBackground(ctx, settings)

  ctx.save()
  ctx.font = `${weight} ${fontSize}px ${family}`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  ctx.direction = 'rtl'

  const blockLeft = SAFE_AREA.left
  const blockRight = CANVAS_WIDTH - SAFE_AREA.right
  const blockCenter = (blockLeft + blockRight) / 2
  const isRight = settings.align === 'right'
  const maxWidth = blockRight - blockLeft

  const rows = text.split('\n').flatMap((line) => wrapText(ctx, line, maxWidth))
  const blockHeight = Math.max(rows.length, 1) * lineHeight
  const top = SAFE_AREA.top + 40
  const bottom = CANVAS_HEIGHT - SAFE_AREA.bottom - 40
  const center = Math.min(Math.max((top + bottom) / 2 + settings.offsetY, top + blockHeight / 2), bottom - blockHeight / 2)
  const startY = center - blockHeight / 2 + lineHeight / 2

  ctx.textAlign = isRight ? 'right' : 'center'
  const anchorX = isRight ? blockRight : blockCenter

  rows.forEach((row, index) => {
    if (!row.text) return
    const y = startY + index * lineHeight
    const width = ctx.measureText(row.text).width
    const lineRight = isRight ? blockRight : blockCenter + width / 2

    // the asterisk markers are drawn from real glyph positions: measure the prefix, then the run
    row.ranges.forEach((range) => {
      const before = ctx.measureText(row.text.slice(0, range.start)).width
      const runWidth = ctx.measureText(row.text.slice(range.start, range.end)).width
      const pad = fontSize * 0.3
      ctx.save()
      ctx.globalAlpha = 0.95
      ctx.fillStyle = theme.accent
      ctx.fillRect(lineRight - before - runWidth - pad * 0.5, y - lineHeight / 2 + lineHeight * 0.14, runWidth + pad, lineHeight * 0.72)
      ctx.restore()
    })

    ctx.globalAlpha = textOpacity
    ctx.fillStyle = textColor
    ctx.fillText(row.text, anchorX, y)

    row.ranges.forEach((range) => {
      const before = ctx.measureText(row.text.slice(0, range.start)).width
      const runWidth = ctx.measureText(row.text.slice(range.start, range.end)).width
      ctx.save()
      ctx.beginPath()
      const pad = fontSize * 0.55
      ctx.rect(lineRight - before - runWidth - pad, y - lineHeight / 2, runWidth + pad * 2, lineHeight)
      ctx.clip()
      ctx.globalAlpha = 1
      ctx.fillStyle = theme.onAccent
      ctx.fillText(row.text, anchorX, y)
      ctx.restore()
    })
  })

  ctx.restore()
  ctx.globalAlpha = 1
  if (settings.showSafeArea && options.preview !== false) drawSafeArea(ctx)
}
