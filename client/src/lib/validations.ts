import { z } from 'zod'

export const emailSchema = z.object({
  email: z
    .string()
    .min(1, 'E-mail é obrigatório')
    .email('E-mail inválido')
    .toLowerCase()
    .trim(),
})

export const otpSchema = z.object({
  otp: z
    .string()
    .min(6, 'Código deve ter 6 dígitos')
    .max(6, 'Código deve ter 6 dígitos')
    .regex(/^\d+$/, 'Código deve conter apenas números'),
})

export type EmailFormData = z.infer<typeof emailSchema>
export type OTPFormData = z.infer<typeof otpSchema>
