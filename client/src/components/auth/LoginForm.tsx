import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../ui/Toast'
import AuthLayout from './AuthLayout'
import EmailStep from './EmailStep'
import OTPStep from './OTPStep'

type AuthStep = 'email' | 'otp'

export default function LoginForm() {
  const [step, setStep] = useState<AuthStep>('email')
  const [email, setEmail] = useState('')
  const { sendOTP, verifyOTP, isLoading } = useAuth()
  const { showToast, ToastContainer } = useToast()

  const handleEmailSubmit = async (submittedEmail: string) => {
    const { error } = await sendOTP(submittedEmail)

    if (error) {
      showToast(
        error.message || 'Erro ao enviar código. Tente novamente.',
        'error'
      )
      return
    }

    setEmail(submittedEmail)
    setStep('otp')
    showToast('Código enviado com sucesso! Verifique seu e-mail.', 'success')
  }

  const handleOTPSubmit = async (otp: string) => {
    const { error } = await verifyOTP(email, otp)

    if (error) {
      const errorMessage =
        error.message === 'Token has expired or is invalid'
          ? 'Código inválido ou expirado. Tente novamente.'
          : error.message || 'Erro ao verificar código. Tente novamente.'

      showToast(errorMessage, 'error')
      return
    }

    showToast('Login realizado com sucesso!', 'success')
  }

  const handleResend = async () => {
    const { error } = await sendOTP(email)

    if (error) {
      showToast(
        error.message || 'Erro ao reenviar código. Tente novamente.',
        'error'
      )
      return
    }

    showToast('Código reenviado com sucesso!', 'success')
  }

  const handleBack = () => {
    setStep('email')
    setEmail('')
  }

  return (
    <>
      <AuthLayout>
        {step === 'email' ? (
          <EmailStep onSubmit={handleEmailSubmit} isLoading={isLoading} />
        ) : (
          <OTPStep
            email={email}
            onSubmit={handleOTPSubmit}
            onResend={handleResend}
            onBack={handleBack}
            isLoading={isLoading}
          />
        )}
      </AuthLayout>
      <ToastContainer />
    </>
  )
}
