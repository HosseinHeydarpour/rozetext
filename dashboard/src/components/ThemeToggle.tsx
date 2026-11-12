import { IconButton, Tooltip } from '@mui/material'
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded'
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded'
import { useColorScheme } from '@mui/material/styles'

export default function ThemeToggle() {
  const { mode, setMode } = useColorScheme()
  const isDark = mode === 'dark'
  return (
    <Tooltip title={isDark ? 'حالت روشن' : 'حالت تیره'}>
      <IconButton onClick={() => setMode(isDark ? 'light' : 'dark')} color="inherit" aria-label="تغییر حالت روشن و تیره">
        {isDark ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
      </IconButton>
    </Tooltip>
  )
}
