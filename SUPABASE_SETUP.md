# Configuração do Supabase para Autenticação OTP

Guia passo a passo para configurar o Supabase para usar autenticação via e-mail OTP.

## Acesso Rápido

**URL do Projeto:** https://supabase.com/dashboard/project/lnrvzopgabdijhqyzscc

**Credenciais (já configuradas):**
- URL: `https://lnrvzopgabdijhqyzscc.supabase.co`
- Anon Key: Configurada em `.env.local`

---

## Passo 1: Configurar Provider de E-mail

1. Acesse: **Authentication → Providers**
2. Clique em **Email** na lista de providers
3. Configure as seguintes opções:

### Configurações Essenciais:

```
✓ Enable Email provider
  └─ Marque esta opção para habilitar login via e-mail

✓ Enable email OTP
  └─ IMPORTANTE: Marque para habilitar One-Time Password

✗ Confirm email
  └─ IMPORTANTE: DESMARQUE esta opção
  └─ Isso permite signup instantâneo sem confirmação

✓ Enable Signup
  └─ Permite que novos usuários se cadastrem
```

4. Clique em **Save** no final da página

---

## Passo 2: Configurar Template de E-mail

1. Acesse: **Authentication → Email Templates**
2. Selecione: **Magic Link** (usado para OTP)
3. Edite o template:

### Template Sugerido (Português):

```html
<h2>Código de Acesso - WhatsApp Bot</h2>

<p>Olá!</p>

<p>Use o código abaixo para fazer login no WhatsApp Bot:</p>

<div style="background-color: #f0f0f0; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
  <h1 style="font-size: 36px; font-weight: bold; color: #6366f1; margin: 0; letter-spacing: 8px;">
    {{ .Token }}
  </h1>
</div>

<p><strong>Este código é válido por 60 minutos.</strong></p>

<p>Se você não solicitou este código, ignore este e-mail.</p>

<hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">

<p style="font-size: 12px; color: #666;">
  WhatsApp Bot - Sistema de Autenticação
</p>
```

### Template Sugerido (Inglês):

```html
<h2>Access Code - WhatsApp Bot</h2>

<p>Hello!</p>

<p>Use the code below to log in to WhatsApp Bot:</p>

<div style="background-color: #f0f0f0; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
  <h1 style="font-size: 36px; font-weight: bold; color: #6366f1; margin: 0; letter-spacing: 8px;">
    {{ .Token }}
  </h1>
</div>

<p><strong>This code is valid for 60 minutes.</strong></p>

<p>If you didn't request this code, please ignore this email.</p>

<hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">

<p style="font-size: 12px; color: #666;">
  WhatsApp Bot - Authentication System
</p>
```

4. Clique em **Save**

---

## Passo 3: Configurar URLs Permitidas

1. Acesse: **Authentication → URL Configuration**
2. Adicione as seguintes URLs:

### Site URL:
```
http://localhost:5173
```

### Redirect URLs:
```
http://localhost:5173/**
http://localhost:3000/**
```

Para produção, adicione também:
```
https://seu-dominio.com/**
```

3. Clique em **Save**

---

## Passo 4: Configurar Rate Limiting (Opcional mas Recomendado)

1. Acesse: **Authentication → Rate Limits**
2. Configure os limites:

```
Email OTP per hour: 10
  └─ Máximo de 10 códigos OTP por hora por IP

OTP verify attempts: 5
  └─ Máximo de 5 tentativas de verificação por código
```

---

## Passo 5: Verificar Configuração de E-mail (SMTP)

Por padrão, o Supabase usa seu próprio servidor SMTP, mas você pode configurar o seu:

1. Acesse: **Project Settings → Auth**
2. Role até **SMTP Settings**

### Opção 1: Usar SMTP do Supabase (Padrão)
- Nenhuma configuração necessária
- Limite: ~3 e-mails por hora no plano gratuito
- Pode cair em spam

### Opção 2: Configurar SMTP Personalizado (Recomendado para Produção)

Exemplos de providers:

#### Gmail:
```
Host: smtp.gmail.com
Port: 587
Username: seu-email@gmail.com
Password: [Senha de App do Gmail]
Sender email: seu-email@gmail.com
Sender name: WhatsApp Bot
```

#### SendGrid:
```
Host: smtp.sendgrid.net
Port: 587
Username: apikey
Password: [Sua API Key do SendGrid]
Sender email: noreply@seu-dominio.com
Sender name: WhatsApp Bot
```

#### AWS SES:
```
Host: email-smtp.us-east-1.amazonaws.com
Port: 587
Username: [Seu SMTP Username]
Password: [Seu SMTP Password]
Sender email: noreply@seu-dominio.com
Sender name: WhatsApp Bot
```

---

## Passo 6: Testar Configuração

### Via Interface:

1. Abra: http://localhost:5173
2. Digite seu e-mail
3. Clique em "Enviar código"
4. Verifique seu e-mail (incluindo spam)
5. Digite o código recebido
6. Clique em "Verificar e entrar"

### Via API (curl):

```bash
# 1. Solicitar OTP
curl -X POST 'https://lnrvzopgabdijhqyzscc.supabase.co/auth/v1/otp' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seu-email@example.com"
  }'

# 2. Verificar OTP
curl -X POST 'https://lnrvzopgabdijhqyzscc.supabase.co/auth/v1/verify' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email",
    "email": "seu-email@example.com",
    "token": "123456"
  }'
```

---

## Passo 7: Monitorar Logs

1. Acesse: **Authentication → Logs**
2. Visualize tentativas de login
3. Identifique erros comuns:

### Erros Comuns:

| Erro | Causa | Solução |
|------|-------|---------|
| `Email rate limit exceeded` | Muitos e-mails enviados | Aguarde ou aumente o rate limit |
| `Invalid email OTP` | Código incorreto | Solicite novo código |
| `Token expired` | Código expirado (>60min) | Solicite novo código |
| `Email not allowed` | E-mail em blacklist | Remova da blacklist em Settings |

---

## Configurações Avançadas

### Desabilitar Novos Signups (Opcional)

Para permitir apenas usuários pré-aprovados:

1. Acesse: **Authentication → Providers → Email**
2. Desmarque: **Enable Signup**
3. Adicione usuários manualmente em: **Authentication → Users**

### Adicionar Metadata ao Usuário

Configure metadados customizados:

```typescript
const { data, error } = await supabase.auth.signInWithOtp({
  email: 'usuario@example.com',
  options: {
    data: {
      display_name: 'João Silva',
      role: 'admin',
    }
  }
})
```

### Hooks de Autenticação (Webhook)

Configure webhooks para eventos de auth:

1. Acesse: **Database → Webhooks**
2. Crie um webhook para a tabela `auth.users`
3. Configure eventos: `INSERT`, `UPDATE`, `DELETE`

---

## Checklist Final

- [ ] Email provider habilitado
- [ ] Email OTP habilitado
- [ ] Confirm email DESABILITADO
- [ ] Template de e-mail configurado
- [ ] URLs permitidas adicionadas
- [ ] Rate limiting configurado
- [ ] SMTP configurado (opcional)
- [ ] Teste realizado com sucesso
- [ ] Logs verificados

---

## Solução de Problemas

### E-mail não chega

1. Verifique spam/lixo eletrônico
2. Confirme que Email OTP está habilitado
3. Verifique logs em Authentication → Logs
4. Se usar SMTP próprio, teste as credenciais
5. Verifique rate limits

### "Email rate limit exceeded"

- **Causa:** Muitos e-mails enviados rapidamente
- **Solução:** Aguarde 1 hora ou ajuste rate limits

### "Invalid login credentials"

- **Causa:** Código OTP incorreto ou expirado
- **Solução:** Solicite novo código

### E-mail cai em spam

- **Solução 1:** Configure SMTP personalizado
- **Solução 2:** Configure SPF/DKIM no seu domínio
- **Solução 3:** Use serviço dedicado (SendGrid, AWS SES)

---

## Recursos Adicionais

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Email OTP Guide](https://supabase.com/docs/guides/auth/auth-email-otp)
- [SMTP Configuration](https://supabase.com/docs/guides/auth/auth-smtp)
- [Rate Limiting](https://supabase.com/docs/guides/platform/going-into-prod#rate-limiting)

---

## Suporte

Se encontrar problemas:

1. Verifique os logs no dashboard
2. Consulte a documentação oficial
3. Abra um ticket no Discord do Supabase
4. Verifique o status em: https://status.supabase.com/
