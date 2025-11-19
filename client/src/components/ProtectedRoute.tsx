import { useEffect, useState, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { Session } from '@supabase/supabase-js'
import LoginForm from './auth/LoginForm'

interface ProtectedRouteProps {
  children: ReactNode
}

/**
 * Componente que protege rotas, exigindo autenticação
 *
 * Uso:
 *
 * <ProtectedRoute>
 *   <Dashboard />
 * </ProtectedRoute>
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }

  if (!session) {
    return <LoginForm />
  }

  return <>{children}</>
}
