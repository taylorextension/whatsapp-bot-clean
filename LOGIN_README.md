# Sistema de Login com Supabase OTP

Tela de login moderna e elegante com autenticação via código OTP enviado por e-mail, integrada ao Supabase.

## Características

- Design moderno com Tailwind CSS
- Autenticação via OTP (One-Time Password) por e-mail
- Validação de formulários com React Hook Form + Zod
- Feedback visual com toasts e animações suaves
- TypeScript para segurança de tipos
- Totalmente responsivo

## Configuração do Supabase

### 1. Acessar o Dashboard do Supabase

Acesse: https://supabase.com/dashboard/project/lnrvzopgabdijhqyzscc

### 2. Configurar Autenticação

Navegue até: **Authentication → Providers → Email**

Configure as seguintes opções:

```
✓ Enable Email provider
✓ Enable email OTP
✗ Confirm email (DESABILITAR)
✓ Enable Signup (Allow new users to sign up)
```

### 3. Configurar Template de E-mail (Opcional)

Navegue até: **Authentication → Email Templates → Magic Link**

Personalize o template do e-mail com seu código OTP:

```html
<h2>Seu código de acesso</h2>
<p>Use o código abaixo para fazer login:</p>
<h1 style="font-size: 32px; font-weight: bold;">{{ .Token }}</h1>
<p>Este código expira em 60 minutos.</p>
```

### 4. Configurar URLs de Redirecionamento (Opcional)

Navegue até: **Authentication → URL Configuration**

Adicione as URLs permitidas:
```
http://localhost:5173
http://localhost:3000
```

## Como Usar

### 1. Instalar Dependências

Se ainda não instalou:

```bash
npm install
```

### 2. Iniciar o Servidor de Desenvolvimento

```bash
npm run dev:client
```

O frontend estará disponível em: http://localhost:5173

### 3. Testar o Fluxo de Autenticação

1. Acesse http://localhost:5173
2. Digite seu e-mail
3. Clique em "Enviar código"
4. Verifique seu e-mail e copie o código de 6 dígitos
5. Cole o código na tela de verificação
6. Clique em "Verificar e entrar"

## Estrutura do Projeto

```
client/
├── index.html                 # HTML principal
├── src/
│   ├── main.tsx              # Ponto de entrada React
│   ├── App.tsx               # Componente principal
│   ├── index.css             # Estilos globais Tailwind
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx      # Orquestrador do fluxo de login
│   │   │   ├── EmailStep.tsx      # Etapa 1: Solicitar código
│   │   │   ├── OTPStep.tsx        # Etapa 2: Verificar código
│   │   │   └── AuthLayout.tsx     # Layout da tela de auth
│   │   └── ui/
│   │       ├── Button.tsx         # Componente de botão
│   │       ├── Input.tsx          # Componente de input
│   │       └── Toast.tsx          # Componente de notificação
│   ├── lib/
│   │   ├── supabase.ts           # Cliente Supabase
│   │   └── validations.ts        # Schemas Zod
│   └── hooks/
│       └── useAuth.ts            # Hook de autenticação
```

## Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev:client    # Inicia o frontend (Vite)
npm run dev:server    # Inicia o backend (Node.js)
npm run dev          # Inicia apenas o backend

# Build
npm run build:client  # Build do frontend para produção
npm run build        # Build do backend

# Preview
npm run preview:client  # Preview do build do frontend
```

## Fluxo de Autenticação

### 1. Etapa de E-mail (EmailStep)
- Usuário insere o e-mail
- Validação com Zod (formato de e-mail)
- Supabase envia código OTP para o e-mail
- Transição para a próxima etapa

### 2. Etapa de OTP (OTPStep)
- Usuário insere o código de 6 dígitos recebido
- Validação com Zod (6 dígitos numéricos)
- Countdown de 60 segundos para reenvio
- Supabase verifica o código
- Autenticação bem-sucedida → acesso liberado

## Tecnologias Utilizadas

- **React 19.2** - Biblioteca UI
- **TypeScript 5.3** - Type safety
- **Vite 7.2** - Build tool
- **Tailwind CSS 4.1** - Estilização
- **Supabase 2.81** - Backend e autenticação
- **React Hook Form 7.66** - Gerenciamento de formulários
- **Zod 4.1** - Validação de schemas
- **@hookform/resolvers** - Integração Zod + React Hook Form

## Segurança

- Credenciais do Supabase armazenadas em `.env.local` (não versionado)
- Anon key segura para operações client-side
- OTP expira em 60 minutos
- Validação de entrada em todos os formulários
- Proteção contra injeção de código

## Customização

### Cores

Edite `tailwind.config.js` para alterar a paleta de cores:

```js
colors: {
  primary: {
    500: '#6366f1',  // Cor principal
    600: '#4f46e5',
    // ...
  },
}
```

### Animações

Edite `tailwind.config.js` para customizar animações:

```js
animation: {
  'fade-in': 'fadeIn 0.3s ease-in-out',
  'slide-up': 'slideUp 0.4s ease-out',
}
```

### Validações

Edite `client/src/lib/validations.ts` para ajustar regras de validação.

## Problemas Comuns

### E-mail não chega

1. Verifique a caixa de spam
2. Confirme que o Email OTP está habilitado no Supabase
3. Verifique os logs em: Authentication → Logs no dashboard

### Código inválido

- O código OTP expira em 60 minutos
- Use o botão "Reenviar código" para receber um novo
- Certifique-se de copiar todos os 6 dígitos

### Erro de CORS

- Adicione `http://localhost:5173` nas URLs permitidas do Supabase
- Verifique a configuração de CORS no backend Express

## Suporte

Para problemas ou dúvidas, consulte a documentação oficial:
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Vite Docs](https://vite.dev)
- [React Hook Form](https://react-hook-form.com)
- [Tailwind CSS](https://tailwindcss.com)

## Próximos Passos

- [ ] Adicionar proteção de rate limiting
- [ ] Implementar refresh token automático
- [ ] Adicionar modo escuro
- [ ] Internacionalização (i18n)
- [ ] Adicionar mais providers (Google, GitHub, etc.)
- [ ] Implementar recuperação de sessão
