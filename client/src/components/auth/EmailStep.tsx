import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { emailSchema, EmailFormData } from '../../lib/validations'
import { motion } from 'framer-motion'

interface EmailStepProps {
  onSubmit: (email: string) => void
  isLoading: boolean
}

export default function EmailStep({ onSubmit, isLoading }: EmailStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  })

  const onFormSubmit = (data: EmailFormData) => {
    onSubmit(data.email)
  }

  return (
    <motion.form
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4 }}
      onSubmit={handleSubmit(onFormSubmit)}
      className="space-y-6"
    >
      <div className="space-y-2">
        <label className="block text-sm font-medium text-white/60 mb-2 ml-1">
          E-mail
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
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <input
            {...register('email')}
            type="email"
            placeholder="seu@email.com"
            autoFocus
            autoComplete="email"
            className="w-full bg-carbon/50 backdrop-blur-md border border-subtle text-white placeholder-white/20 rounded-xl pl-12 pr-4 py-4 focus:bg-white/5 focus:border-primary-DEFAULT/50 focus:ring-1 focus:ring-primary-DEFAULT/50 transition-all duration-300 outline-none shadow-inner"
          />
          {/* Input Glow Effect */}
          <div className="absolute inset-0 rounded-xl bg-primary-DEFAULT/5 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity duration-300 blur-lg -z-10"></div>
        </div>
        {errors.email?.message && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-neon-orange mt-2 flex items-center gap-2 font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {errors.email.message}
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
            <span className="opacity-80">Enviando...</span>
          </div>
        ) : (
          <span className="relative z-10">Enviar código</span>
        )}
      </motion.button>

      <p className="text-xs text-center text-white/30 flex items-center justify-center gap-2">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Enviaremos um código de verificação para o seu e-mail
      </p>
    </motion.form>
  )
}
