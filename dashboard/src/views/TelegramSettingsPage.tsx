'use client'

import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from '@mui/material'
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded'
import KeyRoundedIcon from '@mui/icons-material/KeyRounded'
import TerminalRoundedIcon from '@mui/icons-material/TerminalRounded'

interface TelegramResponse {
  tokenSet: boolean
  ownerSet: boolean
  ownerMasked: string | null
  model: string | null
  health: { ok: boolean; username?: string; name?: string; error?: string }
  skills: { name: string; label: string; summary: string; when: string; steps: string[] }[]
  command: string
}

export default function TelegramSettingsPage() {
  const [data, setData] = useState<TelegramResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/telegram', { cache: 'no-store' })
      .then((response) => response.json())
      .then((body: TelegramResponse) => setData(body))
      .catch((cause) => setError(String((cause as Error).message ?? cause)))
  }, [])

  return (
    <Box>
      <Stack spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            ربات تلگرام
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            پل بین تلگرام و اسکیل‌های همین پروژه؛ هر دکمه یک اسکیل را در یک نشست OpenCode اجرا می‌کند.
          </Typography>
        </Box>
        {error ? <Alert severity="error">{error}</Alert> : null}
      </Stack>

      <Stack spacing={3}>
        <Card>
          <CardHeader title="وضعیت اتصال" subheader="از روی .env خوانده می‌شود؛ مقدار توکن هرگز نمایش داده نمی‌شود." />
          <CardContent sx={{ pt: 0 }}>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Chip
                icon={<KeyRoundedIcon />}
                color={data?.tokenSet ? 'success' : 'error'}
                variant={data?.tokenSet ? 'filled' : 'outlined'}
                label={data?.tokenSet ? 'توکن تنظیم شده' : 'توکن تنظیم نشده'}
              />
              <Chip
                icon={<SmartToyRoundedIcon />}
                color={data?.health.ok ? 'success' : 'default'}
                variant="outlined"
                label={data?.health.ok ? `ربات: @${data.health.username}` : 'ربات در دسترس نیست'}
              />
              <Chip icon={<TerminalRoundedIcon />} variant="outlined" label={data?.model ?? 'مدل پیش‌فرض'} />
              {data?.ownerSet ? <Chip variant="outlined" label={`فقط چت ${data.ownerMasked}`} /> : <Chip color="warning" variant="outlined" label="چت مجاز تعیین نشده" />}
            </Stack>

            {data?.health.error ? (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {data.health.error}
              </Alert>
            ) : null}

            <Divider sx={{ my: 2 }} />

            <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1 }}>اجرا</Typography>
            <Box dir="ltr" sx={{ fontFamily: 'monospace', fontSize: 12, bgcolor: 'action.hover', borderRadius: 1, px: 1.5, py: 1, alignSelf: 'flex-start', display: 'inline-block' }}>
              {data?.command ?? 'npm run bot'}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              ربات به‌صورت یک پروسهٔ جدا روی همین ماشین اجرا می‌شود؛ وضعیت این صفحه فقط اتصال توکن را بررسی می‌کند.
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="اسکیل‌های روی ربات" subheader={`${data?.skills.length ?? 0} دکمه`} />
          <CardContent sx={{ pt: 0 }}>
            <Stack spacing={2}>
              {(data?.skills ?? []).map((skill) => (
                <Box key={skill.name} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{skill.label}</Typography>
                    <Box dir="ltr" sx={{ fontFamily: 'monospace', fontSize: 11, color: 'text.secondary' }}>
                      {skill.name}
                    </Box>
                  </Stack>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 1, lineHeight: 1.9 }}>{skill.summary}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>کی اجرا شود: {skill.when}</Typography>
                  <Stack component="ol" spacing={0.75} sx={{ mt: 1.5, pr: 2.5, m: 0 }}>
                    {skill.steps.map((step) => (
                      <Typography key={step} component="li" sx={{ fontSize: 12, lineHeight: 1.9, color: 'text.secondary' }}>
                        {step}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              ))}
              {!data?.skills.length && !error ? (
                <Typography variant="body2" color="text.secondary">
                  فهرست اسکیل‌ها خوانده نشد.
                </Typography>
              ) : null}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  )
}
