import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('name')
    .eq('id', user.id)
    .single()

  const userName = profile?.name ?? user.email ?? 'User'

  return (
    <div className="flex flex-col h-screen">
      <Header userName={userName} />
      <div className="flex flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
