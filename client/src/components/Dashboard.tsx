import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { io, Socket } from 'socket.io-client'
import { motion, AnimatePresence } from 'framer-motion'

interface QRCodeData {
  qr: string
  timestamp: string
}

interface StatusData {
  ready?: boolean
  state?: string
  bot?: {
    ready: boolean
  }
}

export default function Dashboard() {
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [status, setStatus] = useState<string>('Conectando...')
  const [socket, setSocket] = useState<Socket | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')

  // Função para buscar QR Code com autenticação
  const fetchQRCode = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setError('Sessão expirada. Faça login novamente.')
        return
      }

      const response = await fetch('/api/qr', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.status === 401) {
        setError('Não autorizado. Faça login novamente.')
        await supabase.auth.signOut()
        return
      }

      if (response.status === 403) {
        setError('Você não tem permissão para acessar o QR Code. Entre em contato com o administrador.')
        return
      }

      const data = await response.json()

      if (data.qr) {
        setQrCode(data.qr)
        setError(null)
      } else if (data.status === 'pending') {
        setStatus('Aguardando QR code...')
      }
    } catch (err: any) {
      console.error('Erro ao buscar QR code:', err)
      setError('Erro ao carregar QR code. Tentando novamente...')
    }
  }

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.email) {
        setUserEmail(session.user.email)
      }
    }
    getUser()
  }, [])

  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_API_URL || window.location.origin, {
      transports: ['websocket', 'polling']
    })

    newSocket.on('connect', () => {
      console.log('✅ WebSocket conectado')
    })

    newSocket.on('status-update', (data: StatusData) => {
      handleStatusUpdate(data)
    })

    newSocket.on('qr-code', (data: QRCodeData) => {
      setQrCode(data.qr)
      setStatus('Escaneie o QR Code')
      setError(null)
    })

    newSocket.on('ready', () => {
      setIsConnected(true)
      setStatus('Conectado')
      setQrCode(null)
    })

    newSocket.on('disconnected', (data: any) => {
      setIsConnected(false)
      setStatus('Desconectado')
      fetchQRCode()
    })

    setSocket(newSocket)
    fetchStatus()
    fetchQRCode()

    const qrInterval = setInterval(() => {
      if (!isConnected) {
        fetchQRCode()
      }
    }, 15000)

    return () => {
      newSocket.close()
      clearInterval(qrInterval)
    }
  }, [])

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/status')
      const data = await response.json()
      handleStatusUpdate(data)
    } catch (err) {
      console.error('Erro ao buscar status:', err)
    }
  }

  const handleStatusUpdate = (data: StatusData) => {
    const ready =
      typeof data.ready === 'boolean'
        ? data.ready
        : data.bot?.ready ?? false

    const state = data.state ?? (ready ? 'open' : 'close')

    if (ready) {
      setIsConnected(true)
      setStatus('Conectado')
      setQrCode(null)
    } else {
      setIsConnected(false)
      if (state === 'connecting' || state === 'open') {
        setStatus('Conectando...')
      } else {
        setStatus('Aguardando QR Code')
      }
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen bg-obsidian text-white relative overflow-hidden font-sans selection:bg-primary-DEFAULT selection:text-white">
      {/* Noise Overlay */}
      <div className="noise-overlay"></div>

      {/* Nebula Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-primary-DEFAULT/5 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="border-b border-white/5 bg-obsidian/50 backdrop-blur-xl sticky top-0 z-50"
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-carbon to-obsidian border border-white/10 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-primary-DEFAULT" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">WhatsApp Bot</h1>
                <p className="text-xs text-white/40 font-medium">Brasil TV</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Status Badge */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-md border transition-all duration-300 ${isConnected
                  ? 'bg-success-500/10 text-success-400 border-success-500/20'
                  : 'bg-white/5 text-white/40 border-white/10'
                }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-success-400 animate-pulse' : 'bg-white/40'
                  }`}></span>
                {isConnected ? 'Conectado' : status}
              </div>

              {/* User Info */}
              {userEmail && (
                <div className="hidden sm:block text-right">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold">Logado como</p>
                  <p className="text-xs font-medium text-white/80">{userEmail}</p>
                </div>
              )}

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="text-xs text-white/40 hover:text-white transition-colors duration-200 px-3 py-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12 relative z-10 min-h-[calc(100vh-80px)] flex items-center justify-center">
        <AnimatePresence mode="wait">
          {isConnected ? (
            // Dashboard - WhatsApp Conectado
            <motion.div
              key="connected"
              initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-4xl w-full"
            >
              <div className="text-center mb-16">
                <div className="relative inline-block mb-8 group">
                  <div className="absolute inset-0 bg-success-500/20 rounded-full blur-3xl opacity-40 group-hover:opacity-60 transition-opacity duration-500"></div>
                  <div className="relative w-32 h-32 bg-gradient-to-br from-carbon to-obsidian border border-white/10 rounded-3xl flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform duration-500">
                    <svg className="w-16 h-16 text-success-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent mb-4 tracking-tight">
                  Sistema Operacional
                </h2>
                <p className="text-white/40 text-lg font-medium">
                  O bot está ativo e processando mensagens
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="glass-card p-8 rounded-2xl group hover:border-white/20 transition-colors duration-300"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-success-500/10 border border-success-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-7 h-7 text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white/40 mb-1 uppercase tracking-wider">Status do Sistema</p>
                      <p className="text-xl font-bold text-white">Online</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="glass-card p-8 rounded-2xl group hover:border-white/20 transition-colors duration-300"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-primary-DEFAULT/10 border border-primary-DEFAULT/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-7 h-7 text-primary-DEFAULT" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white/40 mb-1 uppercase tracking-wider">Conexão</p>
                      <p className="text-xl font-bold text-white">Estável</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          ) : (
            // QR Code Screen
            <motion.div
              key="qrcode"
              initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-xl w-full"
            >
              <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent mb-4 tracking-tight">
                  Conectar Dispositivo
                </h2>
                <p className="text-white/40 text-lg font-medium">
                  Escaneie o código QR para iniciar a sessão
                </p>
              </div>

              {/* QR Code Card */}
              <div className="glass-card p-1 rounded-3xl relative group">
                {/* Border Beam */}
                <div className="absolute inset-0 rounded-3xl border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]">
                  <div className="absolute aspect-square w-full bg-[conic-gradient(from_0deg,transparent_0_340deg,white_360deg)] opacity-20 animate-border-beam top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
                </div>

                <div className="bg-carbon/80 backdrop-blur-xl rounded-[22px] p-8 min-h-[400px] flex items-center justify-center relative overflow-hidden">
                  {/* Inner Glow */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary-DEFAULT/20 blur-[100px] rounded-full pointer-events-none"></div>

                  {error ? (
                    <div className="text-center relative z-10">
                      <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-red-400 font-medium">{error}</p>
                    </div>
                  ) : qrCode ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative z-10 bg-white p-4 rounded-xl shadow-2xl"
                    >
                      <img src={qrCode} alt="QR Code" className="w-full max-w-[280px] rounded-lg" />
                    </motion.div>
                  ) : (
                    <div className="text-center relative z-10">
                      <div className="relative inline-block mb-6">
                        <div className="w-16 h-16 border-4 border-white/10 border-t-primary-DEFAULT rounded-full animate-spin"></div>
                      </div>
                      <p className="text-white/40 font-medium text-sm uppercase tracking-widest">Gerando QR Code...</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
