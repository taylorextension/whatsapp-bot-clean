# Guia de Configuração - WhatsApp Bot com Autenticação

Este guia mostra como configurar e executar o WhatsApp Bot com autenticação Supabase.

## Pré-requisitos

- Node.js 18+ instalado
- Conta no Supabase
- Editor de código (VS Code recomendado)

## Instalação

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Você já tem os arquivos `.env` e `.env.local` configurados:

**`.env`** (Backend):
```env
SUPABASE_URL=https://lnrvzopgabdijhqyzscc.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SERVER_PORT=3000
```

**`.env.local`** (Frontend):
```env
VITE_SUPABASE_URL=https://lnrvzopgabdijhqyzscc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

## Executar o Projeto

### Opção 1: Dois terminais separados (Recomendado para desenvolvimento)

**Terminal 1 - Backend (Porta 3000)**:
```bash
npm run dev:server
```

**Terminal 2 - Frontend (Porta 5173)**:
```bash
npm run dev:client
```

### Opção 2: Um único terminal

```bash
# Windows (PowerShell)
Start-Process npm -ArgumentList "run","dev:server"
Start-Process npm -ArgumentList "run","dev:client"

# Linux/Mac
npm run dev:server & npm run dev:client
```

## Acessar o Dashboard

1. Abra o navegador em: **http://localhost:5173**
2. Faça login com: **junioborgesmc@gmail.com**
3. Insira o código OTP recebido por email
4. Você verá o dashboard com o QR Code do WhatsApp!

## Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Porta 5173)                     │
│                                                              │
│  ┌──────────────┐  Login   ┌─────────────────────────────┐ │
│  │  LoginForm   │ ────────>│  Supabase Auth (OTP)        │ │
│  └──────────────┘          └─────────────────────────────┘ │
│         │                              │                    │
│         │ Autenticado                  │ JWT Token          │
│         ▼                              ▼                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Dashboard Component                      │  │
│  │  - Exibe QR Code (via /api/qr com token)            │  │
│  │  - Conecta ao WebSocket (status em tempo real)       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Porta 3000)                      │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Express Server                                        │ │
│  │                                                        │ │
│  │  GET /api/qr (requireAdmin) ──────> Middleware       │ │
│  │                                          │             │ │
│  │                                          ▼             │ │
│  │                              ┌──────────────────────┐ │ │
│  │                              │ Verifica:           │ │ │
│  │                              │ 1. Token válido?    │ │ │
│  │                              │ 2. É admin?         │ │ │
│  │                              └──────────────────────┘ │ │
│  │                                          │             │ │
│  │                              ┌───────────┴─────────┐  │ │
│  │                              ▼                     ▼  │ │
│  │                         ✅ Retorna QR      ❌ 401/403 │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Socket.IO Server (WebSocket)                          │ │
│  │  - Eventos: qr-code, status-update, ready, etc.       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  WhatsApp Service (Baileys)                            │ │
│  │  - Gera QR Code                                        │ │
│  │  - Gerencia conexão WhatsApp                           │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE (Cloud)                          │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Auth (OTP via Email)                                  │ │
│  │  - Envia códigos de 6 dígitos                         │ │
│  │  - Gerencia sessões JWT                               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Database (PostgreSQL)                                 │ │
│  │                                                        │ │
│  │  Tabela: admin_users                                   │ │
│  │  ├─ email: junioborgesmc@gmail.com                    │ │
│  │  ├─ is_active: true                                    │ │
│  │  └─ created_at: 2025-11-14                            │ │
│  │                                                        │ │
│  │  Função: is_user_admin(email) → boolean               │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Fluxo de Autenticação

```
1. Usuário acessa http://localhost:5173
   └─> Mostra LoginForm

2. Usuário insere email: junioborgesmc@gmail.com
   └─> Frontend chama: supabase.auth.signInWithOtp({ email })

3. Supabase envia email com código OTP (6 dígitos)
   └─> Usuário recebe email

4. Usuário insere código OTP
   └─> Frontend chama: supabase.auth.verifyOtp({ email, token })

5. Supabase valida código
   └─> Se válido: retorna JWT token + session

6. App.tsx detecta sessão ativa
   └─> Renderiza <Dashboard />

7. Dashboard faz requisição GET /api/qr
   └─> Headers: Authorization: Bearer <JWT_TOKEN>

8. Backend (middleware auth.ts):
   a) Extrai token do header
   b) Valida com Supabase: supabase.auth.getUser(token)
   c) Verifica se email está em admin_users
   d) Se tudo OK: permite acesso

9. Rota /api/qr retorna QR Code
   └─> Dashboard exibe QR Code na tela

10. WebSocket mantém status em tempo real
    └─> Quando WhatsApp conecta: muda para tela "Bot Ativo"
```

## Estrutura de Pastas

```
whatsapp-bot-clean/
├── client/                      # Frontend React (Porta 5173)
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/           # LoginForm, EmailStep, OTPStep
│   │   │   ├── Dashboard.tsx   # 🆕 Dashboard com QR Code
│   │   │   └── ProtectedRoute.tsx
│   │   ├── lib/
│   │   │   └── supabase.ts     # Cliente Supabase
│   │   ├── hooks/
│   │   │   └── useAuth.ts      # Hook de autenticação
│   │   └── App.tsx             # App principal
│   └── index.html
│
├── src/                         # Backend Node.js (Porta 3000)
│   ├── middleware/
│   │   └── auth.ts             # 🆕 Middlewares de autenticação
│   ├── server/
│   │   ├── routes/
│   │   │   ├── qr.ts           # 🔒 Rota protegida do QR Code
│   │   │   ├── bot.ts          # Controle do bot
│   │   │   ├── status.ts       # Status do bot
│   │   │   └── conversations.ts
│   │   └── index.ts            # Servidor Express + Socket.IO
│   ├── services/
│   │   └── whatsapp.ts         # Serviço WhatsApp (Baileys)
│   └── index.ts                # Entry point
│
├── .env                         # Variáveis backend
├── .env.local                   # Variáveis frontend
├── package.json
├── vite.config.ts              # Config Vite (proxy para porta 3000)
│
└── Docs/
    ├── AUTHENTICATION.md        # 📚 Guia de autenticação
    ├── SUPABASE_SETUP.md       # 📚 Configuração Supabase
    └── SETUP_GUIDE.md          # 📚 Este arquivo
```

## Portas Utilizadas

| Serviço | Porta | URL |
|---------|-------|-----|
| Frontend (Vite) | 5173 | http://localhost:5173 |
| Backend (Express) | 3000 | http://localhost:3000 |
| WebSocket (Socket.IO) | 3000 | ws://localhost:3000 |

## Proxy do Vite

O Vite está configurado para fazer proxy das requisições `/api` para o backend:

```typescript
// vite.config.ts
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
}
```

Isso significa que quando o frontend faz `fetch('/api/qr')`, o Vite redireciona para `http://localhost:3000/api/qr`.

## Comandos Úteis

### Desenvolvimento
```bash
# Iniciar backend
npm run dev:server

# Iniciar frontend
npm run dev:client

# Build do projeto completo
npm run build

# Build apenas do frontend
npm run build:client
```

### Produção
```bash
# Build
npm run build

# Executar
npm start
```

## Resolver Problemas Comuns

### Frontend não conecta ao backend

**Problema**: Requisições para `/api/qr` retornam 404.

**Solução**:
1. Verifique se o backend está rodando na porta 3000
2. Verifique o proxy no `vite.config.ts`
3. Abra DevTools → Network e veja se a requisição está sendo feita

### Erro 401 Unauthorized

**Problema**: Token inválido ou expirado.

**Solução**:
1. Faça logout e login novamente
2. Verifique se o token está sendo enviado no header:
   ```typescript
   headers: {
     'Authorization': `Bearer ${session.access_token}`
   }
   ```

### Erro 403 Forbidden

**Problema**: Usuário não é administrador.

**Solução**:
1. Verifique se seu email está na tabela `admin_users`:
   ```sql
   SELECT * FROM public.admin_users WHERE email = 'seu-email@gmail.com';
   ```
2. Se não estiver, adicione:
   ```sql
   INSERT INTO public.admin_users (email, is_active)
   VALUES ('seu-email@gmail.com', true);
   ```

### QR Code não aparece

**Problema**: Dashboard mostra "Aguardando QR code..." mas nunca exibe.

**Solução**:
1. Verifique se o backend WhatsApp está rodando
2. Abra DevTools → Console e veja se há erros
3. Verifique se a rota `/api/qr` está retornando dados:
   ```bash
   # Com seu token JWT
   curl -H "Authorization: Bearer SEU_TOKEN" http://localhost:3000/api/qr
   ```

### WebSocket não conecta

**Problema**: Status não atualiza em tempo real.

**Solução**:
1. Verifique se Socket.IO está rodando no backend
2. Abra DevTools → Network → WS e veja a conexão WebSocket
3. Verifique se a porta 3000 está acessível

## Segurança

### Rotas Protegidas

- ✅ `/api/qr` - Protegida com `requireAdmin`
- ⚠️ `/api/bot/*` - Considere adicionar proteção
- ⚠️ `/api/conversations` - Considere adicionar proteção

### Tokens JWT

- Tokens são gerenciados pelo Supabase
- Tempo de expiração padrão: 1 hora
- Renovação automática ativada (`autoRefreshToken: true`)

### CORS

Configurado para aceitar qualquer origem em desenvolvimento:
```env
CORS_ORIGIN=*
```

Em produção, configure para seu domínio:
```env
CORS_ORIGIN=https://seu-dominio.com
```

## Próximos Passos

1. **Adicionar mais administradores**:
   - Veja `AUTHENTICATION.md` para instruções

2. **Proteger outras rotas**:
   ```typescript
   import { requireAdmin } from '../../middleware/auth';

   router.post('/bot/toggle', requireAdmin, ...);
   router.get('/conversations', requireAdmin, ...);
   ```

3. **Configurar SMTP personalizado**:
   - Veja `SUPABASE_SETUP.md` para configurar Gmail, SendGrid ou AWS SES

4. **Deploy em produção**:
   - Configure variáveis de ambiente
   - Build: `npm run build`
   - Execute: `npm start`

## Suporte

Para mais informações, consulte:
- [AUTHENTICATION.md](./AUTHENTICATION.md) - Guia completo de autenticação
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Configuração do Supabase
- [Supabase Dashboard](https://supabase.com/dashboard/project/lnrvzopgabdijhqyzscc)

## Licença

ISC
