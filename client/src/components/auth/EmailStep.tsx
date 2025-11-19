import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { emailSchema, EmailFormData } from '../../lib/validations'
import Input from '../ui/Input'
import Button from '../ui/Button'

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
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-white/90 mb-2">
          E-mail
        </label>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
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
            className="w-full bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-white/40 rounded-xl pl-12 pr-4 py-4 focus:bg-white/15 focus:border-primary-400 focus:ring-2 focus:ring-primary-400/50 transition-all duration-300 outline-none"
          />
        </div>
        {errors.email?.message && (
          <p className="text-sm text-red-400 mt-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {errors.email.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full btn-primary py-4 text-base font-bold"
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            Enviando código...
          </div>
        ) : (
          'Enviar código'
        )}
      </button>

      <p className="text-sm text-center text-white/50 flex items-center justify-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Enviaremos um código de verificação para o seu e-mail
      </p>
    </form>
  )
}
