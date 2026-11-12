import type { Metadata } from 'next'
import '@/index.css'
import Providers from './providers'

export const metadata: Metadata = {
  title: 'رز تکست — داشبورد',
  description: 'داشبورد رشد و تحلیل ریل‌های اینستاگرام رز تکست',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
