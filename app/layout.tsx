import type { Metadata, Viewport } from 'next'
import { Anton } from 'next/font/google'
import './globals.css'

const display = Anton({ weight: '400', subsets: ['latin'], variable: '--display' })

export const metadata: Metadata = {
  title: 'BRAIN UP',
  description: '생활 습관으로 뇌 캐릭터를 키우는 게임',
}
export const viewport: Viewport = { themeColor: '#0a0b0d' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={display.variable}>
      <body>{children}</body>
    </html>
  )
}
