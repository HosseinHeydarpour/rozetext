const webApp = window.Telegram?.WebApp
const list = document.getElementById('list')
const status = document.getElementById('status')
const sub = document.getElementById('sub')

webApp?.ready()
webApp?.expand()
applyTheme()

function applyTheme() {
  const root = document.documentElement
  const params = webApp?.themeParams ?? {}
  const dark = webApp
    ? webApp.colorScheme === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches
  root.dataset.theme = dark ? 'dark' : 'light'

  const vars = {
    '--bg': params.bg_color,
    '--card': params.section_bg_color ?? params.secondary_bg_color,
    '--text': params.text_color,
    '--muted': params.hint_color,
    '--line': params.section_separator_color,
  }
  for (const [name, value] of Object.entries(vars)) {
    if (value) root.style.setProperty(name, value)
    else root.style.removeProperty(name)
  }
}

webApp?.onEvent?.('themeChanged', applyTheme)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (!webApp) applyTheme()
})

function card(skill, handle) {
  const item = document.createElement('li')
  item.className = 'skill'

  const title = document.createElement('h2')
  title.className = 'title'
  title.textContent = skill.label

  const english = document.createElement('p')
  english.className = 'en'
  english.textContent = skill.name

  const summary = document.createElement('p')
  summary.className = 'summary'
  summary.textContent = skill.summary

  const label = document.createElement('p')
  label.className = 'label'
  label.textContent = 'چه وقت'

  const when = document.createElement('p')
  when.className = 'when'
  when.textContent = skill.when

  const steps = document.createElement('ol')
  steps.className = 'steps'
  for (const step of skill.steps) {
    const line = document.createElement('li')
    line.textContent = step
    steps.append(line)
  }

  const pick = document.createElement('button')
  pick.type = 'button'
  pick.className = 'pick'
  pick.textContent = 'انتخاب این اسکیل'
  pick.addEventListener('click', () => {
    webApp?.HapticFeedback?.impactOccurred?.('light')
    const url = `https://t.me/${handle}?start=sk_${skill.name}`
    if (webApp?.openTelegramLink) webApp.openTelegramLink(url)
    else window.location.href = url
  })

  item.append(title, english, summary, label, when, steps, pick)
  return item
}

async function load() {
  const response = await fetch('skills.json')
  if (!response.ok) throw new Error(String(response.status))
  const data = await response.json()

  if (!data.skills?.length) {
    status.textContent = 'اسکیلی پیدا نشد.'
    return
  }

  sub.textContent = `${new Intl.NumberFormat('fa-IR').format(data.skills.length)} اسکیل، فقط برای rozetext`
  for (const skill of data.skills) list.append(card(skill, data.handle))
  status.hidden = true
  list.hidden = false
}

load().catch(() => {
  status.dataset.error = 'true'
  status.textContent = 'لیست نیامد. یک‌بار ببند و دوباره باز کن.'
})
