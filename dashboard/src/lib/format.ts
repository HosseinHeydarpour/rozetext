export const fa = new Intl.NumberFormat('fa-IR')
export const faCompact = new Intl.NumberFormat('fa-IR', {
  notation: 'compact',
  maximumFractionDigits: 1,
})
export const faOneDecimal = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 })

export const pct = (value: number) => `${faOneDecimal.format(value)}٪`

export const parseCompact = (value: string | null) => {
  if (!value) return null
  const clean = value.replace(/,/g, '').trim()
  const match = clean.match(/^([\d.]+)\s*([KMB])?$/i)
  if (!match) return null
  const base = Number(match[1])
  if (!Number.isFinite(base)) return null
  const suffix = (match[2] || '').toUpperCase()
  const factor = suffix === 'K' ? 1e3 : suffix === 'M' ? 1e6 : suffix === 'B' ? 1e9 : 1
  return base * factor
}

export const faCompactExact = (value: number) => {
  if (value >= 1e6) return `${faOneDecimal.format(value / 1e6)} میلیون`
  if (value >= 1e3) return `${faOneDecimal.format(value / 1e3)} هزار`
  return fa.format(value)
}

export const dateFa = (iso: string | null) => {
  if (!iso) return 'بی‌داده'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'بی‌داده'
  return new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'short' }).format(date)
}

export const longDateFa = (iso: string) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'بی‌داده'
  return new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

export const clockFa = (iso: string) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'بی‌داده'
  return new Intl.DateTimeFormat('fa-IR', { hour: 'numeric', minute: '2-digit' }).format(date)
}

const MONTHS: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
}

export const sourceDateFa = (value: string) => {
  const match = value.match(/([A-Z][a-z]{2}) (\d{1,2}), (\d{1,2}):(\d{2})(am|pm)/)
  if (!match) return value
  let hour = Number(match[3]) % 12
  if (match[5] === 'pm') hour += 12
  const date = new Date(2026, MONTHS[match[1]], Number(match[2]), hour, Number(match[4]))
  return new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'short' }).format(date)
}

export const hourFa = (key: string) => {
  const match = key.match(/^(\d{1,2})(a|p)$/)
  if (!match) return key
  let hour = Number(match[1]) % 12
  if (match[2] === 'p') hour += 12
  return fa.format(hour)
}

export const toNumber = (value: string | number | null | undefined) => {
  if (value == null) return null
  const clean = String(value).replace(/[^\d.-]/g, '')
  if (!clean) return null
  const parsed = Number(clean)
  return Number.isFinite(parsed) ? parsed : null
}

export const cellNumber = (value: string | null | undefined) => {
  const parsed = toNumber(value)
  return parsed == null ? 'بی‌داده' : fa.format(parsed)
}

export const excerpt = (text: string, max = 78) => {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max)}…` : clean
}
