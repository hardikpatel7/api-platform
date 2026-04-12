import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { JetBrains_Mono } from 'next/font/google'
import './globals.css'

const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'API Platform',
  description: 'API documentation platform for teams building with AI and MCP',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${GeistSans.variable} ${jetbrainsMono.variable} font-sans`}>{children}</body>
    </html>
  )
}
