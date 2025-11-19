# 🤖 WhatsApp Bot - Brasil TV

Bot WhatsApp com Claude AI, autenticação Supabase e dashboard React moderno.

## ✨ Funcionalidades

- ✅ **Autenticação Segura**: Login com OTP via email (Supabase)
- ✅ **Dashboard React**: Interface moderna para gerenciar o bot
- ✅ **Proteção Admin**: Apenas administradores autorizados podem acessar
- ✅ **Tempo Real**: WebSocket para status ao vivo do WhatsApp
- ✅ Recebe mensagens de texto, áudio, vídeo e imagens no WhatsApp
- ✅ Transcreve áudio/vídeo usando Google Gemini
- ✅ Processa mensagens com Claude AI (Haiku 4.5)
- ✅ Sistema de pausa manual/global de conversas
- ✅ Tools: Text-to-Speech (ElevenLabs) e Email (Resend)
- ✅ Configuração dinâmica do agente via interface

## 🚀 Início Rápido

### 1. Instalar dependências
```bash
npm install
```

### 2. Executar o projeto

**Abra 2 terminais:**

**Terminal 1 - Backend (porta 3000):**
```bash
npm run dev:server
```

**Terminal 2 - Frontend React (porta 5173):**
```bash
npm run dev:client
```

### 3. Acessar o dashboard

1. Abra: **http://localhost:5173**
2. Faça login com: **junioborgesmc@gmail.com**
3. Digite o código OTP recebido por email (6 dígitos)
4. Veja o QR Code do WhatsApp e escaneie!

## 📋 Estrutura das Portas

```
Frontend (React)  →  http://localhost:5173  (Dashboard com autenticação)
Backend (Express) →  http://localhost:3000  (API REST + WebSocket)
WebSocket         →  ws://localhost:3000    (Status em tempo real)
```

## 🔒 Autenticação

O projeto usa **Supabase Auth com OTP por email**:

1. Usuário insere email
2. Recebe código de 6 dígitos por email
3. Sistema valida código
4. Verifica se usuário é administrador
5. Libera acesso ao QR Code

**Administrador atual:**
- **junioborgesmc@gmail.com** ✅

Para adicionar mais admins, veja [AUTHENTICATION.md](./AUTHENTICATION.md)

## 📚 Documentação Completa

- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Guia detalhado de configuração e arquitetura
- **[AUTHENTICATION.md](./AUTHENTICATION.md)** - Como gerenciar administradores
- **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Configuração do Supabase

### ✏️ Editar o prompt do agente (Flávio)

- O **system prompt oficial** do bot fica em `config/agent-config.json:2`, no campo `systemPrompt`.
- O backend lê esse campo via `src/services/agentConfig.ts` e passa para o Claude (tanto em desenvolvimento quanto em produção).
- Para mudar o comportamento do Flávio, edite **somente** esse arquivo ou use a rota `POST /api/config/agent` (via dashboard/API); o restante do código apenas consome esse valor.

## 📂 Estrutura do Projeto

```
whatsapp-bot-clean/
├── client/                         # Frontend React (Porta 5173)
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/              # LoginForm, EmailStep, OTPStep
│   │   │   ├── Dashboard.tsx      # 🆕 Dashboard com QR Code
│   │   │   └── ProtectedRoute.tsx
│   │   ├── lib/
│   │   │   └── supabase.ts        # Cliente Supabase
│   │   ├── hooks/
│   │   │   └── useAuth.ts         # Hook de autenticação
│   │   └── App.tsx                # App principal
│   └── index.html
│
├── src/                            # Backend Node.js (Porta 3000)
│   ├── middleware/
│   │   └── auth.ts                # 🆕 Middlewares de autenticação
│   ├── services/
│   │   ├── whatsapp.ts            # WhatsApp (Baileys)
│   │   ├── gemini.ts              # Transcrição de mídia
│   │   ├── llm.ts                 # Cliente Claude
│   │   ├── conversationManager.ts # Gerenciador de conversas
│   │   └── agentConfig.ts         # Configuração dinâmica
│   ├── server/
│   │   ├── index.ts               # Servidor Express + Socket.IO
│   │   └── routes/
│   │       ├── qr.ts              # 🔒 Rota protegida do QR Code
│   │       ├── bot.ts             # Controle do bot
│   │       ├── status.ts          # Status do bot
│   │       └── conversations.ts   # Conversas
│   ├── mcp/tools/
│   │   ├── elevenlabs-tts.ts      # Text-to-Speech
│   │   └── resend-email.ts        # Envio de email
│   └── index.ts                   # Entry point
│
├── .env                            # Variáveis backend
├── .env.local                      # Variáveis frontend
├── vite.config.ts                  # Config Vite (proxy)
├── package.json
└── tsconfig.json
```

## 🛠️ Comandos npm

### Desenvolvimento
```bash
npm run dev:server   # Iniciar backend (porta 3000)
npm run dev:client   # Iniciar frontend (porta 5173)
npm run dev          # Alias para dev:server (legacy)
```

### Build
```bash
npm run build        # Build completo (TypeScript + Vite)
npm run build:client # Build apenas frontend
```

### Produção
```bash
npm start            # Executar versão compilada
```

## Comandos do WhatsApp

Envie mensagens manuais para o bot com esses comandos:

- `@stop` - Pausa global (todas as conversas)
- `@play` - Retoma global
- `@continue` - Retoma conversa específica

**Nota:** Ao enviar qualquer mensagem manual para um contato, o bot pausa automaticamente aquela conversa.

## 🎨 Dashboard React

O novo dashboard possui interface moderna com:

### Tela de Login
- Autenticação em 2 etapas
- Email → Código OTP (6 dígitos)
- Validação em tempo real

### Dashboard Principal
Após autenticado, você verá:

**Quando WhatsApp desconectado:**
- 📱 QR Code grande e responsivo
- ⏱️ Atualização automática a cada 15 segundos
- 📋 Instruções passo a passo
- 🔄 Status em tempo real via WebSocket

**Quando WhatsApp conectado:**
- ✅ Indicador de "Bot Ativo"
- 🟢 Status "Conectado" no header
- 🔌 Botão para desconectar WhatsApp
- 🚪 Botão de Logout

## 🔧 Tecnologias

### Frontend
- **React 19** - UI moderna e reativa
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização utilitária
- **Vite** - Build tool rápido
- **Supabase JS** - Client de autenticação
- **Socket.IO Client** - WebSocket em tempo real

### Backend
- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **Socket.IO** - WebSocket server
- **TypeScript** - Tipagem estática
- **Baileys** - WhatsApp Web API
- **Supabase** - Auth e banco de dados

### AI & Services
- **Claude AI** (@anthropic-ai/sdk) - Respostas inteligentes
- **Gemini** (@google/genai) - Transcrição de áudio/vídeo
- **ElevenLabs** - Text-to-Speech
- **Resend** - Envio de emails
