'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Terminal, LogOut } from 'lucide-react'

interface HeaderProps {
  userName: string
}

export function Header({ userName }: HeaderProps) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="h-14 border-b flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2">
        <Terminal className="w-4 h-4" />
        <span className="font-semibold text-sm">API Platform</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">{userName}</span>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </header>
  )
}
