import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { User } from '@supabase/supabase-js'

/**
 * Hook para acessar informações do usuário autenticado
 *
 * Uso:
 *
 * const { user, loading, signOut } = useUser()
 *
 * if (loading) return <LoadingSpinner />
 * if (!user) return <LoginForm />
 *
 * return <div>Bem-vindo, {user.email}!</div>
 */
export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Obter usuário atual
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    // Escutar mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return {
    user,
    loading,
    isAuthenticated: !!user,
    signOut,
  }
}
