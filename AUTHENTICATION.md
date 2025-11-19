# Autenticação e Controle de Acesso - WhatsApp Bot

Este documento explica como funciona a autenticação no WhatsApp Bot e como gerenciar usuários administradores.

## Visão Geral

O sistema utiliza **Supabase Auth** com **OTP (One-Time Password)** via email para autenticação. Apenas usuários administradores autorizados podem acessar o dashboard e escanear o QR code do WhatsApp.

## Arquitetura

### Frontend (Client)
- **Localização**: `client/src/`
- **Tela de Login**: `client/src/components/auth/LoginForm.tsx`
- **Hook de Auth**: `client/src/hooks/useAuth.ts`
- **Proteção de Rotas**: `client/src/components/ProtectedRoute.tsx`

### Backend (Server)
- **Middleware de Auth**: `src/middleware/auth.ts`
- **Rotas Protegidas**: `src/server/routes/qr.ts` (QR Code)

### Banco de Dados (Supabase)
- **Tabela**: `public.admin_users`
- **Função**: `public.is_user_admin(user_email TEXT)`

## Fluxo de Autenticação

```
1. Usuário acessa o dashboard
   ↓
2. Fornece email na tela de login
   ↓
3. Recebe código OTP por email (6 dígitos)
   ↓
4. Insere o código OTP
   ↓
5. Sistema verifica:
   - Token válido? ✅
   - Email está na tabela admin_users? ✅
   ↓
6. Acesso concedido ao QR Code
```

## Middlewares Disponíveis

### 1. `requireAuth`
Verifica apenas se o usuário está autenticado (possui token válido).

```typescript
import { requireAuth } from '../middleware/auth';

router.get('/protected', requireAuth, (req, res) => {
  // req.user contém os dados do usuário
});
```

### 2. `requireAdmin`
Verifica se o usuário está autenticado **E** é administrador.

```typescript
import { requireAdmin } from '../middleware/auth';

router.get('/admin-only', requireAdmin, (req, res) => {
  // Apenas admins chegam aqui
});
```

### 3. `optionalAuth`
Não bloqueia requisições sem token, mas valida se presente.

```typescript
import { optionalAuth } from '../middleware/auth';

router.get('/public', optionalAuth, (req, res) => {
  // req.user existe se token foi fornecido
});
```

## Gerenciar Administradores

### Adicionar um novo administrador

**Opção 1: Via SQL (Supabase Dashboard)**

1. Acesse: https://supabase.com/dashboard/project/lnrvzopgabdijhqyzscc
2. Vá em **SQL Editor**
3. Execute:

```sql
INSERT INTO public.admin_users (email, is_active)
VALUES ('novo-admin@example.com', true)
ON CONFLICT (email) DO UPDATE SET is_active = true;
```

**Opção 2: Via Supabase JS Client**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service_role key!
);

await supabase
  .from('admin_users')
  .insert({ email: 'novo-admin@example.com', is_active: true });
```

### Remover um administrador

```sql
DELETE FROM public.admin_users WHERE email = 'admin@example.com';
```

### Desativar temporariamente

```sql
UPDATE public.admin_users SET is_active = false WHERE email = 'admin@example.com';
```

### Reativar

```sql
UPDATE public.admin_users SET is_active = true WHERE email = 'admin@example.com';
```

### Listar todos os administradores

```sql
SELECT email, is_active, created_at FROM public.admin_users ORDER BY created_at DESC;
```

## Administradores Atuais

- **junioborgesmc@gmail.com** (Administrador Principal)

## Rotas Protegidas

| Rota | Middleware | Descrição |
|------|-----------|-----------|
| `GET /api/qr` | `requireAdmin` | Retorna QR Code do WhatsApp |
| `POST /api/bot/toggle` | Nenhum | Liga/desliga bot globalmente |
| `POST /api/bot/logout` | Nenhum | Desconecta WhatsApp |

> **Nota**: Considere adicionar `requireAdmin` em todas as rotas de controle do bot.

## Segurança

### Row Level Security (RLS)

A tabela `admin_users` possui RLS habilitado:

- **Leitura**: Qualquer usuário autenticado pode verificar se é admin
- **Escrita**: Apenas `service_role` pode inserir/atualizar/deletar

### Função `is_user_admin()`

```sql
CREATE OR REPLACE FUNCTION public.is_user_admin(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE email = user_email AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- Verifica se email está na tabela `admin_users`
- Verifica se `is_active = true`
- Retorna `true` ou `false`

## Configuração de Ambiente

### Backend (.env)

```env
SUPABASE_URL=https://lnrvzopgabdijhqyzscc.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
```

### Frontend (.env.local)

```env
VITE_SUPABASE_URL=https://lnrvzopgabdijhqyzscc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

## Como Testar

### 1. Testar Login

```bash
# Enviar OTP
curl -X POST 'https://lnrvzopgabdijhqyzscc.supabase.co/auth/v1/otp' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "junioborgesmc@gmail.com"}'

# Verificar OTP (código recebido por email)
curl -X POST 'https://lnrvzopgabdijhqyzscc.supabase.co/auth/v1/verify' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type": "email", "email": "junioborgesmc@gmail.com", "token": "123456"}'
```

### 2. Testar Rota Protegida

```bash
# Sem token (deve retornar 401)
curl http://localhost:3000/api/qr

# Com token inválido (deve retornar 401)
curl -H "Authorization: Bearer token-invalido" http://localhost:3000/api/qr

# Com token válido mas não-admin (deve retornar 403)
curl -H "Authorization: Bearer TOKEN_VALIDO" http://localhost:3000/api/qr

# Com token válido E admin (deve retornar QR)
curl -H "Authorization: Bearer TOKEN_ADMIN" http://localhost:3000/api/qr
```

## Resolução de Problemas

### Erro: "Admin privileges required"

**Causa**: Usuário está autenticado mas não está na tabela `admin_users`.

**Solução**: Adicione o email na tabela (veja "Adicionar um novo administrador").

### Erro: "Invalid or expired token"

**Causa**: Token JWT expirou ou é inválido.

**Solução**: Faça login novamente para obter novo token.

### Email OTP não chega

**Causas possíveis**:
1. Email na caixa de spam
2. Rate limit excedido (máx 10 emails/hora)
3. SMTP não configurado

**Soluções**:
1. Verifique spam/lixo eletrônico
2. Aguarde 1 hora
3. Configure SMTP personalizado (veja `SUPABASE_SETUP.md`)

## Próximos Passos

### Proteção Adicional Recomendada

Adicione `requireAdmin` nas seguintes rotas:

```typescript
// src/server/routes/bot.ts
router.post('/toggle', requireAdmin, ...);
router.post('/disconnect', requireAdmin, ...);
router.post('/logout', requireAdmin, ...);

// src/server/routes/conversations.ts
router.get('/', requireAdmin, ...);
router.post('/toggle', requireAdmin, ...);

// src/server/routes/status.ts
router.get('/', requireAdmin, ...);
```

### Sistema de Convite (Opcional)

Para permitir que admins convidem outros usuários:

```typescript
router.post('/invite-admin', requireAdmin, async (req, res) => {
  const { email } = req.body;

  // Criar usuário na tabela admin_users
  await supabase.from('admin_users').insert({ email });

  // Enviar email de convite
  // ... implementação
});
```

## Links Úteis

- [Supabase Dashboard](https://supabase.com/dashboard/project/lnrvzopgabdijhqyzscc)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [OTP Guide](https://supabase.com/docs/guides/auth/auth-email-otp)

## Suporte

Para problemas relacionados à autenticação:

1. Verifique os logs do servidor
2. Verifique logs do Supabase: **Authentication → Logs**
3. Consulte este documento
4. Abra uma issue se o problema persistir
