'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRole } from '@/hooks/useRole'
import { canDo } from '@/lib/permissions'
import { SuggestionPanel } from '@/components/suggestions/SuggestionPanel'
import { approveSuggestionAction } from '@/app/actions/approveSuggestion'
import { rejectSuggestionAction } from '@/app/actions/rejectSuggestion'
import { withdrawSuggestionAction } from '@/app/actions/withdrawSuggestion'
import type { Suggestion } from '@/types'

export default function SuggestionsPage() {
  const router = useRouter()
  const { role, loading } = useRole()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | undefined>()

  useEffect(() => {
    if (!loading && role && !canDo(role, 'suggest')) {
      router.push('/')
      return
    }
    if (!loading && role) {
      async function load() {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        setCurrentUserId(user?.id)
        const { data } = await supabase
          .from('suggestions')
          .select('*')
          .order('created_at', { ascending: false })
        if (data) setSuggestions(data as Suggestion[])
      }
      load()
    }
  }, [role, loading])

  if (loading || !role) return null

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl font-semibold mb-6">Suggestions</h1>
        <SuggestionPanel
          suggestions={suggestions}
          role={role}
          currentUserId={currentUserId}
          onApprove={(id) => approveSuggestionAction(id)}
          onReject={(id, note) => rejectSuggestionAction(id, note)}
          onWithdraw={(id) => withdrawSuggestionAction(id)}
          onBrowse={() => router.push('/')}
        />
      </div>
    </main>
  )
}
