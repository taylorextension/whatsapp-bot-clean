import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { io, Socket } from 'socket.io-client'

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
      // Obter sessão atual
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setError('Sessão expirada. Faça login novamente.')
        return
      }

      // Fazer requisição autenticada
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
        // QR ainda não foi gerado
        setStatus('Aguardando QR code...')
      }
    } catch (err: any) {
      console.error('Erro ao buscar QR code:', err)
      setError('Erro ao carregar QR code. Tentando novamente...')
    }
  }

  // Buscar email do usuário
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.email) {
        setUserEmail(session.user.email)
      }
    }
    getUser()
  }, [])

  // Inicializar WebSocket e buscar status
  useEffect(() => {
    // Conectar ao WebSocket
    const newSocket = io(import.meta.env.VITE_API_URL || window.location.origin, {
      transports: ['websocket', 'polling']
    })

    newSocket.on('connect', () => {
      console.log('✅ WebSocket conectado')
    })

    newSocket.on('status-update', (data: StatusData) => {
      console.log('📊 Status update:', data)
      handleStatusUpdate(data)
    })

    newSocket.on('qr-code', (data: QRCodeData) => {
      console.log('📱 Novo QR code recebido')
      setQrCode(data.qr)
      setStatus('Escaneie o QR Code')
      setError(null)
    })

    newSocket.on('ready', () => {
      console.log('✅ WhatsApp conectado!')
      setIsConnected(true)
      setStatus('Conectado')
      setQrCode(null)
    })

    newSocket.on('disconnected', (data: any) => {
      console.warn('⚠️ WhatsApp desconectado:', data?.reason)
      setIsConnected(false)
      setStatus('Desconectado')
      fetchQRCode()
    })

    setSocket(newSocket)

    // Buscar status inicial e QR code
    fetchStatus()
    fetchQRCode()

    // Polling para QR code (a cada 15 segundos)
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

  const handleDisconnectWhatsApp = async () => {
    try {
      const response = await fetch('/api/bot/logout', {
        method: 'POST'
      })

      if (response.ok) {
        setIsConnected(false)
        setStatus('Desconectado')
        setQrCode(null)
        // Aguardar um pouco e buscar novo QR
        setTimeout(() => {
          fetchQRCode()
        }, 2000)
      }
    } catch (err) {
      console.error('Erro ao desconectar WhatsApp:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary-500/20 to-accent-500/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-success-500/20 to-primary-500/20 rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}}></div>
      </div>

      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-xl sticky top-0 z-50 animate-slide-down">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-accent-500 rounded-2xl flex items-center justify-center animate-scale-in">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">WhatsApp Bot</h1>
                <p className="text-xs text-white/60">Brasil TV</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Status Badge */}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-md transition-all duration-300 ${
                isConnected
                  ? 'bg-success-500/20 text-success-100 border border-success-400/30'
                  : 'bg-white/10 text-white/70 border border-white/20'
              }`}>
                <span className={`w-2.5 h-2.5 rounded-full ${
                  isConnected ? 'bg-success-400 animate-pulse' : 'bg-white/40'
                }`}></span>
                {isConnected ? 'Conectado' : status}
              </div>

              {/* User Info */}
              {userEmail && (
                <div className="hidden sm:block text-right bg-white/5 backdrop-blur-md rounded-xl px-4 py-2 border border-white/10">
                  <p className="text-xs text-white/50">Logado como</p>
                  <p className="text-sm font-medium text-white/90">{userEmail}</p>
                </div>
              )}

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="text-sm text-white/70 hover:text-white transition-all duration-200 px-4 py-2 rounded-xl hover:bg-white/10 backdrop-blur-sm border border-transparent hover:border-white/20"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        {isConnected ? (
          // Dashboard - WhatsApp Conectado
          <div className="max-w-3xl mx-auto animate-fade-in">
            <div className="text-center mb-16">
              <div className="relative inline-block mb-8">
                <div className="absolute inset-0 bg-gradient-to-br from-success-400 to-emerald-500 rounded-3xl blur-2xl opacity-60 animate-pulse"></div>
                <div className="relative w-28 h-28 bg-gradient-to-br from-success-400 to-emerald-500 rounded-3xl flex items-center justify-center animate-scale-in">
                  <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h2 className="text-5xl font-black bg-gradient-to-r from-white via-success-100 to-white bg-clip-text text-transparent mb-4 animate-slide-up">
                Bot Ativo
              </h2>
              <p className="text-white/70 text-lg animate-slide-up" style={{animationDelay: '0.1s'}}>
                WhatsApp conectado e operando normalmente
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 mb-10 animate-slide-up" style={{animationDelay: '0.2s'}}>
              <div className="group relative bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 hover:bg-white/15 hover:border-white/30 transition-all duration-300 hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-br from-success-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center gap-5">
                  <div className="w-16 h-16 bg-gradient-to-br from-success-400 to-success-600 rounded-2xl flex items-center justify-center transition-shadow">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-base font-bold text-white mb-1">Status do Bot</p>
                    <p className="text-sm text-success-300 font-semibold">Operacional</p>
                  </div>
                </div>
              </div>

              <div className="group relative bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 hover:bg-white/15 hover:border-white/30 transition-all duration-300 hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center gap-5">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center transition-shadow">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-base font-bold text-white mb-1">WhatsApp</p>
                    <p className="text-sm text-primary-300 font-semibold">Conectado</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        ) : (
          // QR Code Screen
          <div className="max-w-xl mx-auto animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-5xl font-black bg-gradient-to-r from-white via-primary-100 to-white bg-clip-text text-transparent mb-4 animate-slide-up">
                Conectar WhatsApp
              </h2>
              <p className="text-white/70 text-lg animate-slide-up" style={{animationDelay: '0.1s'}}>
                Escaneie o código QR para conectar seu dispositivo
              </p>
            </div>

            {/* QR Code centralizado */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-10 animate-slide-up hover:bg-white/15 hover:border-white/30 transition-all duration-300" style={{animationDelay: '0.2s'}}>
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-10 min-h-[450px] flex items-center justify-center">
                {error ? (
                  <div className="text-center animate-scale-in">
                    <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-base text-red-600 font-semibold">{error}</p>
                  </div>
                ) : qrCode ? (
                  <div className="relative animate-scale-in">
                    <div className="absolute -inset-4 bg-gradient-to-r from-primary-400 to-accent-500 rounded-3xl blur-xl opacity-20 animate-pulse"></div>
                    <img src={qrCode} alt="QR Code" className="relative w-full max-w-[350px] rounded-2xl" />
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="relative inline-block mb-6">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-accent-500 rounded-full blur-xl opacity-40 animate-pulse"></div>
                      <div className="relative animate-spin rounded-full h-20 w-20 border-4 border-primary-200 border-t-primary-500"></div>
                    </div>
                    <p className="text-base text-gray-600 font-semibold">Aguardando QR code...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
