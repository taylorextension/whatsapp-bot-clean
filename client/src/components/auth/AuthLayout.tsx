import { ReactNode } from 'react'

interface AuthLayoutProps {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary-500/20 to-accent-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-success-500/20 to-primary-500/20 rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="card animate-scale-in relative z-10">
        {/* Logo/Branding */}
        <div className="text-center mb-10">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-accent-500 rounded-3xl blur-xl opacity-40 animate-pulse"></div>
            <div className="relative w-20 h-20 bg-gradient-to-br from-primary-400 to-accent-500 rounded-3xl flex items-center justify-center">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-white via-primary-100 to-white bg-clip-text text-transparent mb-2">
            WhatsApp Bot
          </h1>
          <p className="text-base text-white/60">
            Entre para acessar o painel de controle
          </p>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  )
}
