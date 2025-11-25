import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { otpSchema, OTPFormData } from '../../lib/validations'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface OTPStepProps {
  email: string
  onSubmit: (otp: string) => void
  onResend: () => void
  onBack: () => void
  isLoading: boolean
}

export default function OTPStep({ email, onSubmit, onResend, onBack, isLoading }: OTPStepProps) {
  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OTPFormData>({
    resolver: zodResolver(otpSchema),
  })

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [countdown])

  const onFormSubmit = (data: OTPFormData) => {
    onSubmit(data.otp)
  }

  const handleResend = () => {
    setCountdown(60)
    setCanResend(false)
    onResend()
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Info Message */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-success-500/10 border border-success-500/20 backdrop-blur-md rounded-2xl p-5"
      >
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-success-500/20 border border-success-500/30 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.2)]">
              <svg
                className="w-5 h-5 text-success-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-base font-bold text-white mb-1">
              Código enviado!
            </p>
            <p className="text-sm text-white/60">
              Enviamos um código de 6 dígitos para{' '}
              <span className="font-semibold text-white">{email}</span>
            </p>
          </div>
        </div>
      </motion.div>

      {/* OTP Form */}
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-white/60 mb-2 ml-1">
            Código de verificação
          </label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-primary-DEFAULT transition-colors duration-300">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <input
              {...register('otp')}
              type="text"
              placeholder="000000"
              maxLength={6}
              autoFocus
              autoComplete="one-time-code"
              className="w-full bg-carbon/50 backdrop-blur-md border border-subtle text-white placeholder-white/20 rounded-xl pl-12 pr-4 py-4 focus:bg-white/5 focus:border-primary-DEFAULT/50 focus:ring-1 focus:ring-primary-DEFAULT/50 transition-all duration-300 outline-none text-center text-2xl font-bold tracking-[0.5em] shadow-inner"
            />
            {/* Input Glow Effect */}
            <div className="absolute inset-0 rounded-xl bg-primary-DEFAULT/5 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity duration-300 blur-lg -z-10"></div>
          </div>
          {errors.otp?.message && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-neon-orange mt-2 flex items-center gap-2 font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {errors.otp.message}
            </motion.p>
          )}
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isLoading}
          className="w-full relative overflow-hidden group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white rounded-xl py-4 font-medium transition-all duration-300"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
          {isLoading ? (
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white"></div>
              <span className="opacity-80">Verificando...</span>
            </div>
          ) : (
            <span className="relative z-10">Verificar e entrar</span>
          )}
        </motion.button>
      </form>

      {/* Resend & Back */}
      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={onBack}
          className="text-white/40 hover:text-white font-medium transition-all duration-200 flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-white/5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Voltar
        </button>

        {canResend ? (
          <button
            type="button"
            onClick={handleResend}
            className="text-primary-DEFAULT hover:text-primary-glow font-medium transition-all duration-200 flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-primary-DEFAULT/10"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reenviar código
          </button>
        ) : (
          <span className="text-white/30 font-medium flex items-center gap-2 px-4 py-2">
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Reenviar em {countdown}s
          </span>
        )}
      </div>
    </motion.div>
  )
}
