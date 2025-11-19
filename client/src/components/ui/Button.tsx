import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  isLoading?: boolean
  variant?: 'primary' | 'secondary' | 'ghost'
  fullWidth?: boolean
}

export default function Button({
  children,
  isLoading = false,
  variant = 'primary',
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'px-6 py-2.5 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'

  const variants = {
    primary: 'btn-primary',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900',
    ghost: 'text-primary-600 hover:bg-primary-50',
  }

  const widthClass = fullWidth ? 'w-full' : ''

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${widthClass} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  )
}
