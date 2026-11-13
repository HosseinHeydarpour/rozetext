'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  MenuItem,
  Slider,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import GraphicEqRoundedIcon from '@mui/icons-material/GraphicEqRounded'
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded'
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded'
import { BACKGROUNDS, CANVAS_HEIGHT, CANVAS_WIDTH, COVER_FONT, COVER_OFFSET, DEFAULT_SAFE_AREA, THEMES, drawPost, type CreatorKind, type CreatorMode, type CreatorSettings, type HighlightEffect, type SafeArea } from '@/lib/creator'

const STORAGE_KEY = 'rozetext-creator'

const DEFAULT_BODY = `گاهی دلم برای بچگی‌هام خیلی تنگ میشه...
برای عصرهایی که می‌رفتیم سر کوچه و با بچه‌های همسایه بازی می‌کردیم
نه گوشی بود، نه این‌همه فاصله بین آدم‌ها
حالا که بزرگ شدم، آرزوی همون بچگی رو دارم
*کاش عجله نکنیم*`

const DEFAULT_HOOK = `من منتظر جبران
هیچکس نیستم...`

interface StoredSettings {
  textColor: string
  safeArea: SafeArea
  highlight: HighlightEffect
  align: 'center' | 'right'
  textColorCustom: boolean
}

export default function CreatorPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const [settings, setSettings] = useState<CreatorSettings>({
    mode: 'dark',
    kind: 'text',
    align: 'center',
    highlight: 'box',
    body: DEFAULT_BODY,
    hook: DEFAULT_HOOK,
    fontSize: THEMES.dark.fontSize,
    lineHeight: THEMES.dark.lineHeight,
    offsetY: 0,
    textColor: THEMES.dark.text,
    safeArea: { ...DEFAULT_SAFE_AREA },
    background: THEMES.dark.background,
    backgroundImage: BACKGROUNDS.dark.text,
    showSafeArea: true,
  })
  const [reel, setReel] = useState<{ url: string; code: string } | null>(null)
  const [audioNote, setAudioNote] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [backgroundVersion, setBackgroundVersion] = useState(0)
  const [customColor, setCustomColor] = useState(false)

  const theme = THEMES[settings.mode]

  // restore the saved creator setup (colour, safe area, effect, alignment) after mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const stored = JSON.parse(raw) as Partial<StoredSettings>
      setSettings((current) => ({
        ...current,
        textColor: stored.textColor ?? current.textColor,
        safeArea: { ...current.safeArea, ...(stored.safeArea ?? {}) },
        highlight: stored.highlight ?? current.highlight,
        align: stored.align ?? current.align,
      }))
      setCustomColor(Boolean(stored.textColorCustom))
    } catch {
      // a broken saved value should never block the editor
    }
  }, [])

  useEffect(() => {
    const payload: StoredSettings = {
      textColor: settings.textColor,
      safeArea: settings.safeArea,
      highlight: settings.highlight,
      align: settings.align,
      textColorCustom: customColor,
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [settings.textColor, settings.safeArea, settings.highlight, settings.align, customColor])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      document.fonts.load(`700 55px IRLotus`).catch(() => null),
      document.fonts.load(`400 92px IRTitr`).catch(() => null),
    ]).then(() => {
      if (!cancelled) setReady(true)
    })
    fetch('/api/reels', { cache: 'no-store' })
      .then((response) => response.json())
      .then((db) => {
        const items = Object.values(db?.accounts?.[db.active_account]?.items ?? {}) as { url?: string; last_stats?: { views?: number } }[]
        const best = items
          .filter((item) => item.url)
          .sort((a, b) => (b.last_stats?.views ?? 0) - (a.last_stats?.views ?? 0))[0]
        if (best?.url) {
          const code = best.url.match(/reel\/([^/?#]+)/)?.[1] ?? ''
          setReel({ url: best.url, code })
        }
      })
      .catch(() => null)
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (settings.backgroundImage) {
      const image = new Image()
      image.src = settings.backgroundImage
      image.onload = () => {
        imageRef.current = image
        setReady(true)
        setBackgroundVersion((value) => value + 1)
      }
      image.onerror = () => {
        imageRef.current = null
        setReady(true)
        setBackgroundVersion((value) => value + 1)
      }
    } else {
      imageRef.current = null
      setBackgroundVersion((value) => value + 1)
    }
  }, [settings.backgroundImage])

  useEffect(() => {
    if (!canvasRef.current) return
    const context = canvasRef.current.getContext('2d')
    if (!context) return
    if (!ready) return
    drawPost(context, settings, { backgroundImage: imageRef.current })
  }, [settings, ready, backgroundVersion])

  const patch = (values: Partial<CreatorSettings>) => setSettings((current) => ({ ...current, ...values }))

  const switchMode = (mode: CreatorMode) => {
    patch({
      mode,
      fontSize: settings.kind === 'cover' ? COVER_FONT.fontSize : THEMES[mode].fontSize,
      lineHeight: settings.kind === 'cover' ? COVER_FONT.lineHeight : THEMES[mode].lineHeight,
      backgroundImage: BACKGROUNDS[mode][settings.kind],
      textColor: customColor ? settings.textColor : THEMES[mode].text,
    })
  }

  const switchKind = (kind: CreatorKind) => {
    patch({
      kind,
      fontSize: kind === 'cover' ? COVER_FONT.fontSize : THEMES[settings.mode].fontSize,
      lineHeight: kind === 'cover' ? COVER_FONT.lineHeight : THEMES[settings.mode].lineHeight,
      offsetY: kind === 'cover' ? COVER_OFFSET : 0,
      backgroundImage: BACKGROUNDS[settings.mode][kind],
    })
  }

  const download = () => {
    const source = canvasRef.current
    if (!source) return
    // render a clean frame without the safe-area guide before exporting
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = CANVAS_WIDTH
    exportCanvas.height = CANVAS_HEIGHT
    const context = exportCanvas.getContext('2d')
    if (!context) return
    drawPost(context, { ...settings, showSafeArea: false }, { backgroundImage: imageRef.current, preview: false })
    exportCanvas.toBlob((blob) => {
      if (!blob) return
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `rozetext-${settings.mode}-${settings.kind}-${Date.now()}.png`
      link.click()
      URL.revokeObjectURL(link.href)
    }, 'image/png')
  }

  const previewScale = 0.36
  const meta = useMemo(
    () => [
      { label: 'فونت متن', value: settings.kind === 'cover' ? COVER_FONT.family : theme.font },
      { label: 'حالت', value: theme.name },
      { label: 'رنگ هایلایت', value: theme.accent },
    ],
    [settings.kind, theme],
  )

  return (
    <Box>
      <Stack spacing={2} sx={{ mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { md: 'flex-end' } }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
              محتوا ساز
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              پست ۱۰۸۰×۱۹۲۰ برای ریلز و کاور؛ خروجی PNG با همان چیدمانی که می‌بینی.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <ToggleButtonGroup exclusive size="small" value={settings.mode} onChange={(_, value: CreatorMode | null) => value && switchMode(value)}>
              <ToggleButton value="light" sx={{ px: 2, fontSize: 12 }}>
                لایت
              </ToggleButton>
              <ToggleButton value="dark" sx={{ px: 2, fontSize: 12 }}>
                دارک
              </ToggleButton>
            </ToggleButtonGroup>
            <Button size="small" variant="contained" startIcon={<DownloadRoundedIcon />} onClick={download}>
              خروجی PNG
            </Button>
          </Stack>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {meta.map((item) => (
            <Chip key={item.label} size="small" variant="outlined" label={`${item.label}: ${item.value}`} />
          ))}
          <Chip size="small" variant="outlined" label={`سایز: ${CANVAS_WIDTH}×${CANVAS_HEIGHT}`} />
        </Stack>
      </Stack>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Card>
            <CardHeader title="تنظیمات" subheader="تغییرها همان لحظه روی پیش‌نمایش اعمال می‌شود." />
            <CardContent sx={{ pt: 0 }}>
              <Stack spacing={2.5}>
                <ToggleButtonGroup exclusive fullWidth size="small" value={settings.kind} onChange={(_, value: CreatorKind | null) => value && switchKind(value)}>
                  <ToggleButton value="text" sx={{ fontSize: 12 }}>
                    متن تکست‌گرافی
                  </ToggleButton>
                  <ToggleButton value="cover" sx={{ fontSize: 12 }}>
                    کاور
                  </ToggleButton>
                </ToggleButtonGroup>

                <Stack spacing={1}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>تراز متن</Typography>
                  <ToggleButtonGroup
                    exclusive
                    fullWidth
                    size="small"
                    value={settings.align}
                    onChange={(_, value: 'center' | 'right' | null) => value && patch({ align: value })}
                  >
                    <ToggleButton value="center" sx={{ fontSize: 12 }}>
                      وسط‌چین
                    </ToggleButton>
                    <ToggleButton value="right" sx={{ fontSize: 12 }}>
                      راست‌چین
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Stack>

                <Stack spacing={1}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>افکت هایلایت</Typography>
                  <ToggleButtonGroup
                    exclusive
                    fullWidth
                    size="small"
                    value={settings.highlight}
                    onChange={(_, value: HighlightEffect | null) => value && patch({ highlight: value })}
                  >
                    <ToggleButton value="box" sx={{ fontSize: 12 }}>
                      باکس رنگی
                    </ToggleButton>
                    <ToggleButton value="text" sx={{ fontSize: 12 }}>
                      فقط رنگ متن
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Stack>

                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, flexGrow: 1 }}>رنگ متن</Typography>
                  <Box
                    component="input"
                    type="color"
                    value={settings.textColor}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                      setCustomColor(true)
                      patch({ textColor: event.target.value })
                    }}
                    sx={{ width: 44, height: 32, p: 0.5, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', cursor: 'pointer' }}
                    aria-label="رنگ متن"
                  />
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', direction: 'ltr' }}>{settings.textColor}</Typography>
                  <Button
                    size="small"
                    onClick={() => {
                      setCustomColor(false)
                      patch({ textColor: theme.text })
                    }}
                    disabled={!customColor}
                  >
                    پیش‌فرض
                  </Button>
                </Stack>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: -1.5 }}>رنگ انتخابی در همین مرورگر ذخیره می‌شود.</Typography>

                <Stack spacing={1}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>محدودهٔ امن</Typography>
                    <Button
                      size="small"
                      onClick={() => patch({ safeArea: { ...DEFAULT_SAFE_AREA } })}
                      sx={{ fontSize: 11, minWidth: 0 }}
                    >
                      بازنشانی
                    </Button>
                  </Stack>
                  <Grid container spacing={1.5}>
                    {(
                      [
                        ['top', 'بالا'],
                        ['bottom', 'پایین'],
                        ['right', 'راست'],
                        ['left', 'چپ'],
                      ] as [keyof SafeArea, string][]
                    ).map(([edge, label]) => (
                      <Grid key={edge} size={6}>
                        <TextField
                          type="number"
                          size="small"
                          label={label}
                          value={settings.safeArea[edge]}
                          onChange={(event) =>
                            patch({
                              safeArea: { ...settings.safeArea, [edge]: Math.max(0, Math.min(600, Number(event.target.value) || 0)) },
                            })
                          }
                          slotProps={{ htmlInput: { min: 0, max: 600, step: 10 } }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Stack>

                {settings.kind === 'cover' ? (
                  <TextField
                    label="متن کاور (هوک ریلز)"
                    value={settings.hook}
                    onChange={(event) => patch({ hook: event.target.value })}
                    multiline
                    minRows={2}
                    helperText="هر خط را با Enter جدا کن؛ کاور با فونت IRTitr رندر می‌شود."
                  />
                ) : (
                  <TextField
                    label="متن پست"
                    value={settings.body}
                    onChange={(event) => patch({ body: event.target.value })}
                    multiline
                    minRows={8}
                    helperText="برای هایلایت، بخش مورد نظر را بین دو ستاره بگذار: *این جمله*"
                    slotProps={{ input: { sx: { lineHeight: 2 } } }}
                  />
                )}

                <Stack spacing={1}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>اندازهٔ فونت</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{settings.fontSize}px</Typography>
                  </Stack>
                  <Slider size="small" min={32} max={110} step={1} value={settings.fontSize} onChange={(_, value) => patch({ fontSize: value as number })} />
                </Stack>

                <Stack spacing={1}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>ارتفاع خط</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{settings.lineHeight}px</Typography>
                  </Stack>
                  <Slider size="small" min={60} max={180} step={1} value={settings.lineHeight} onChange={(_, value) => patch({ lineHeight: value as number })} />
                </Stack>

                <Stack spacing={1}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>موقعیت عمودی</Typography>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{settings.offsetY > 0 ? `+${settings.offsetY}` : settings.offsetY}px</Typography>
                  </Stack>
                  <Slider size="small" min={-420} max={420} step={10} value={settings.offsetY} onChange={(_, value) => patch({ offsetY: value as number })} />
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                    مرزهای امن از پنل بالا تنظیم می‌شوند؛ خط‌چین قرمز در پیش‌نمایش همان محدوده است.
                  </Typography>
                </Stack>

                <Divider />

                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Button size="small" variant="outlined" startIcon={<UploadFileRoundedIcon />} onClick={() => fileRef.current?.click()}>
                    تصویر پس‌زمینه
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = () => patch({ backgroundImage: String(reader.result) })
                      reader.readAsDataURL(file)
                    }}
                  />
                  <Button
                    size="small"
                    startIcon={<RestartAltRoundedIcon />}
                    onClick={() => patch({ backgroundImage: BACKGROUNDS[settings.mode][settings.kind] })}
                    disabled={!settings.backgroundImage}
                  >
                    حذف تصویر
                  </Button>
                </Stack>

                <FormControlLabel
                  control={<Switch checked={settings.showSafeArea} onChange={(event) => patch({ showSafeArea: event.target.checked })} />}
                  label="نمایش کادر امن اینستاگرام در پیش‌نمایش"
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 7 }}>
          <Card>
            <CardHeader title="پیش‌نمایش" subheader={`${theme.name} · ${settings.kind === 'cover' ? 'کاور' : 'متن تکست‌گرافی'}`} />
            <CardContent sx={{ pt: 0, display: 'flex', justifyContent: 'center' }}>
              <Box
                sx={{
                  width: CANVAS_WIDTH * previewScale,
                  borderRadius: 2,
                  overflow: 'hidden',
                  lineHeight: 0,
                  boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
                  bgcolor: '#000',
                }}
              >
                <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} style={{ width: '100%', height: 'auto', display: 'block' }} />
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardHeader
              title="مدیریت صدای ریلز"
              subheader="صدا از لینک ریلز جدا می‌شود و متن تکست‌گرافی روی آن می‌نشیند."
              action={<Chip size="small" color="warning" label="فاز بعدی" />}
            />
            <CardContent sx={{ pt: 0 }}>
              <Stack spacing={2}>
                <TextField
                  label="لینک ریلز"
                  value={reel?.url ?? ''}
                  onChange={(event) => setReel({ url: event.target.value, code: event.target.value.match(/reel\/([^/?#]+)/)?.[1] ?? '' })}
                  helperText={reel ? `کد ریل: ${reel.code} — از دیتابیس تحلیلور` : 'در حال خواندن لینک از دیتابیس…'}
                  slotProps={{ input: { sx: { direction: 'ltr' } } }}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Button
                    variant="outlined"
                    startIcon={<GraphicEqRoundedIcon />}
                    onClick={() =>
                      setAudioNote(
                        'استخراج صدا هنوز به ffmpeg و نشست اینستاگرام وصل نشده است؛ این بخش در فاز بعدی فعال می‌شود و تا آن زمان هیچ فایلی ساخته نمی‌شود.',
                      )
                    }
                  >
                    جدا سازی صدا
                  </Button>
                  <Button variant="contained" disabled>
                    ساخت ویدیو
                  </Button>
                </Stack>
                {audioNote ? <Alert severity="info">{audioNote}</Alert> : null}
                <Divider />
                <Stack spacing={1.5}>
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>متن آماده برای ساخت ویدیو</Typography>
                  <TextField
                    size="small"
                    label="هوک تستی"
                    value={settings.hook}
                    onChange={(event) => patch({ hook: event.target.value })}
                    multiline
                    minRows={1}
                  />
                  <TextField
                    size="small"
                    label="متن تستی"
                    value={settings.body}
                    onChange={(event) => patch({ body: event.target.value })}
                    multiline
                    minRows={3}
                  />
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                    همان متنی که در پیش‌نمایش می‌بینی، روی صدای ریل بالا سوار می‌شود.
                  </Typography>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
