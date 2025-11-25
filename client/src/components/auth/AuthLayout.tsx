import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface AuthLayoutProps {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-obsidian text-white">
      {/* Noise Overlay */}
      <div className="noise-overlay"></div>

      {/* Nebula Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-primary-DEFAULT/10 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card relative z-10 w-full max-w-md p-8 rounded-2xl overflow-hidden group"
      >
        {/* Border Beam Effect */}
        <div className="absolute inset-0 rounded-2xl border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]">
          <div className="absolute aspect-square w-full bg-[conic-gradient(from_0deg,transparent_0_340deg,white_360deg)] opacity-20 animate-border-beam top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
        </div>

        {/* Logo/Branding */}
        <div className="text-center mb-10 relative z-20">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="relative inline-block mb-6"
          >
            <div className="absolute inset-0 bg-primary-DEFAULT rounded-2xl blur-xl opacity-20 animate-pulse"></div>
            <div className="relative w-16 h-16 bg-gradient-to-br from-carbon to-obsidian border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl">
              <svg
                className="w-8 h-8 text-primary-DEFAULT drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent mb-2 tracking-tight"
          >
            WhatsApp Bot
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-sm text-white/40 font-medium"
          >
            Acesse o painel de controle
          </motion.p>
        </div>

        {/* Content */}
        <div className="relative z-20">
          {children}
        </div>
      </motion.div>
    </div>
  )
}
