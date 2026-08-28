# Política de Segurança e Hardening (SECURITY.md)

## 1. Diretrizes de Segurança do Quero Meu Delivery V2

### 1.1 Autenticação e Gestão de Sessões
- **Tokens Criptograficamente Seguros:** Tokens de 256 bits gerados via `crypto.randomBytes(32).toString('hex')`.
- **Armazenamento de Hash:** O banco de dados armazena apenas `sha256(token)`. Em caso de dump do banco, as sessões ativas não podem ser utilizadas.
- **Cookies Seguros:**
  - `HttpOnly: true` (imune a roubo via JavaScript / XSS).
  - `SameSite: 'lax'` (protege contra CSRF em requisições de terceiros).
  - `Secure: true` ativado automaticamente quando `NODE_ENV === 'production'`.
  - `Max-Age: 7 dias` com renovação deslizante opcional.

### 1.2 Hashing de Senhas
- Algoritmo `bcryptjs` com custo de salt 12.
- Pepper opcional em variável de ambiente `PASSWORD_PEPPER`.
- Mínimo de 10 caracteres para contas administrativas.
- Bloqueio temporário (Rate Limiting) após tentativas consecutivas de falha.

### 1.3 Proteção Contra Manipulação de Preços
- O cliente nunca envia preços ao backend.
- Toda validação de preços de itens, regras de grupos de adicionais (mínimo, máximo, opções obrigatórias) e cupons de desconto é calculada pelo servidor em centavos (`integer`) dentro de uma transação isolada.

### 1.4 Proteção de Dados e LGPD
- **Sem IDs Sequenciais Públicos:** Acompanhamento de pedidos feito por `tracking_token` UUIDv4.
- Telemetria de motoboys exposta apenas para o pedido ativo do cliente associado.
- Anonimização e exclusão de conta de clientes implementada em `/api/customer/delete-account`.

### 1.5 Rate Limiting e Headers HTTP
- `Helmet` ativo com CSP, X-Frame-Options, X-Content-Type-Options e Referrer-Policy.
- Rate Limiting diferenciado:
  - Rotas de Autenticação (`/api/auth/*`): 10 req / 15 min por IP.
  - Rotas de Criação de Pedidos (`/api/public/orders`): 20 req / 15 min por IP.
  - Rotas Gerais da API: 120 req / 1 min por IP.

### 1.6 Webhook Security (n8n, Mercado Pago, Evolution API)
- Validação de assinatura HMAC SHA-256 no cabeçalho `X-Webhook-Signature`.
- Rejeição imediata de webhooks com assinatura inválida ou sem segredo configurado.
