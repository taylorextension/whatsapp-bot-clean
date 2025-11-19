import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { AuthError } from '@supabase/supabase-js'

interface UseAuthReturn {
  sendOTP: (email: string) => Promise<{ error: AuthError | null }>
  verifyOTP: (email: string, token: string) => Promise<{ error: AuthError | null }>
  isLoading: boolean
}

export function useAuth(): UseAuthReturn {
  const [isLoading, setIsLoading] = useState(false)

  const sendOTP = async (email: string) => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      })
      return { error }
    } finally {
      setIsLoading(false)
    }
  }

  const verifyOTP = async (email: string, token: string) => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      })
      return { error }
    } finally {
      setIsLoading(false)
    }
  }

  return {
    sendOTP,
    verifyOTP,
    isLoading,
  }
}
