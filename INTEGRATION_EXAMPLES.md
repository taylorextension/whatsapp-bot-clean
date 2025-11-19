# Exemplos de Integração do Sistema de Login

Este documento mostra como integrar o sistema de autenticação com o resto da sua aplicação.

## 1. Proteger Rotas Completas

Use o componente `ProtectedRoute` para exigir autenticação:

```tsx
// src/App.tsx
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'

function App() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  )
}
```

## 2. Usar Informações do Usuário

Use o hook `useUser` para acessar dados do usuário:

```tsx
// src/pages/Dashboard.tsx
import { useUser } from '../hooks/useUser'

function Dashboard() {
  const { user, loading, signOut } = useUser()

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div>
      <h1>Bem-vindo, {user?.email}!</h1>
      <p>User ID: {user?.id}</p>
      <button onClick={signOut}>Sair</button>
    </div>
  )
}
```

## 3. Verificar Autenticação Condicionalmente

```tsx
import { useUser } from '../hooks/useUser'

function Navbar() {
  const { isAuthenticated, user, signOut } = useUser()

  return (
    <nav>
      {isAuthenticated ? (
        <>
          <span>Olá, {user?.email}</span>
          <button onClick={signOut}>Sair</button>
        </>
      ) : (
        <a href="/login">Entrar</a>
      )}
    </nav>
  )
}
```

## 4. Fazer Requisições Autenticadas

O Supabase automaticamente adiciona o token JWT às requisições:

```tsx
import { supabase } from '../lib/supabase'

async function fetchUserData() {
  // O token é enviado automaticamente
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .single()

  if (error) {
    console.error('Erro:', error)
    return null
  }

  return data
}
```

## 5. Escutar Eventos de Autenticação

```tsx
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

function App() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        switch (event) {
          case 'SIGNED_IN':
            console.log('Usuário autenticado:', session?.user.email)
            // Redirecionar para dashboard, carregar dados, etc.
            break
          case 'SIGNED_OUT':
            console.log('Usuário desconectado')
            // Limpar cache, redirecionar para login, etc.
            break
          case 'TOKEN_REFRESHED':
            console.log('Token atualizado')
            break
          case 'USER_UPDATED':
            console.log('Usuário atualizado')
            break
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return <YourApp />
}
```

## 6. Criar Middleware de Autenticação (Backend)

Para proteger endpoints do Express:

```typescript
// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase'

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' })
  }

  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return res.status(401).json({ error: 'Token inválido' })
  }

  // Adicionar usuário à requisição
  req.user = user
  next()
}
```

Uso no Express:

```typescript
// src/server/index.ts
import { requireAuth } from './middleware/auth'

app.get('/api/protected', requireAuth, (req, res) => {
  res.json({
    message: 'Dados protegidos',
    user: req.user
  })
})
```

## 7. Integrar com React Router (Opcional)

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useUser } from './hooks/useUser'
import LoginForm from './components/auth/LoginForm'
import Dashboard from './pages/Dashboard'

function PrivateRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated, loading } = useUser()

  if (loading) {
    return <LoadingSpinner />
  }

  return isAuthenticated ? children : <Navigate to="/login" />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  )
}
```

## 8. Armazenar Dados do Usuário no Supabase

Crie uma tabela de perfis:

```sql
-- No Supabase SQL Editor
create table user_profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  display_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS (Row Level Security)
alter table user_profiles enable row level security;

-- Políticas de segurança
create policy "Usuários podem ver seus próprios perfis"
  on user_profiles for select
  using (auth.uid() = id);

create policy "Usuários podem atualizar seus próprios perfis"
  on user_profiles for update
  using (auth.uid() = id);
```

Hook para gerenciar perfil:

```tsx
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useUser } from './useUser'

interface UserProfile {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
}

export function useUserProfile() {
  const { user } = useUser()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }

    async function loadProfile() {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Erro ao carregar perfil:', error)
      } else {
        setProfile(data)
      }
      setLoading(false)
    }

    loadProfile()
  }, [user])

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: 'Usuário não autenticado' }

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (!error && data) {
      setProfile(data)
    }

    return { data, error }
  }

  return { profile, loading, updateProfile }
}
```

## 9. Refresh Token Automático

O Supabase já gerencia refresh tokens automaticamente, mas você pode configurar:

```tsx
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,  // Refresh automático (padrão: true)
    persistSession: true,     // Persistir sessão no localStorage
    detectSessionInUrl: false, // Detectar sessão na URL (para magic links)
  },
})
```

## 10. Logout Global

Desconectar de todos os dispositivos:

```tsx
const signOutEverywhere = async () => {
  // Isso invalida todos os tokens de refresh
  await supabase.auth.signOut({ scope: 'global' })
}
```

## Boas Práticas

1. **Sempre use HTTPS em produção**
2. **Nunca exponha a Service Role Key no frontend**
3. **Use Row Level Security (RLS) no Supabase**
4. **Valide dados no backend também**
5. **Implemente rate limiting**
6. **Monitore tentativas de login falhadas**
7. **Use tokens de curta duração**
8. **Implemente logs de auditoria**

## Recursos Adicionais

- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers)
- [React Context para Auth](https://react.dev/learn/passing-data-deeply-with-context)
- [Protected Routes Patterns](https://reactrouter.com/en/main/start/tutorial#protected-routes)
