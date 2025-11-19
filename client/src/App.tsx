import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { Session } from '@supabase/supabase-js'
import LoginForm from './components/auth/LoginForm'
import Dashboard from './components/Dashboard'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary-500/20 to-accent-500/20 rounded-full blur-3xl animate-float"></div>
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-success-500/20 to-primary-500/20 rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}}></div>
        </div>
        <div className="relative z-10 text-center">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-accent-500 rounded-full blur-2xl opacity-60 animate-pulse"></div>
            <div className="relative animate-spin rounded-full h-20 w-20 border-4 border-white/20 border-t-primary-400"></div>
          </div>
          <p className="text-white/70 text-lg font-semibold">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <LoginForm />
  }

  return <Dashboard />
}

export default App
