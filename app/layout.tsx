import type { Metadata } from 'next'
import './globals.css'

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
      <body>{children}</body>
    </html>
  )
}
