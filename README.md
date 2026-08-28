# Quero Meu Delivery (QMD) V2

Plataforma profissional de cardápio digital, gestão de pedidos e delivery multiempresa, construída com arquitetura segura, mobile-first e preparada para produção.

---

## 🚀 Tecnologias Utilizadas

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion, Lucide Icons
- **Backend**: Node.js, Express, Zod (validação de esquemas), Helmet, Rate Limiting, Cookie Parser
- **Segurança**:
  - Senhas com hash criptográfico (PBKDF2/SHA-256)
  - Sessões `HttpOnly` com proteção contra CSRF e XSS
  - Cálculo de valores e adicionais estritamente no backend
  - Tokens opacos UUIDv4 para rastreamento público (prevenção contra IDOR)
  - Fila de eventos *Outbox Pattern* para integrações assíncronas resilientes (n8n, Evolution API, Webhooks)

---

## 📦 Como Rodar o Projeto Localmente

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente (opcional)
Copie o arquivo de exemplo:
```bash
cp .env.example .env
```

### 3. Iniciar o servidor de desenvolvimento
```bash
npm run dev
```
Acesse a aplicação em `http://localhost:3000`.

### 4. Build de Produção
```bash
npm run build
npm start
```

---

## 🔑 Credenciais de Teste Pré-Configuradas

| Perfil | E-mail | Senha | Acesso |
| :--- | :--- | :--- | :--- |
| **Dono / Gestor (Admin)** | `dono@burgercraft.com.br` | `BurgerCraft@2026` | Painel de controle, métricas, pedidos e cardápio |
| **Entregador / Motoboy** | `motoboy@burgercraft.com.br` | `Motoboy@2026` | App mobile com rotas GPS e status de entregas |
| **Cliente Padrão** | `cliente@exemplo.com.br` | `Cliente@2026` | Histórico de pedidos e privacidade LGPD |

---

## 📂 Estrutura do Projeto

```
├── server.ts              # Servidor Express com Vite Middleware
├── server/
│   ├── db/               # Banco de dados e schema
│   ├── routes/           # Rotas públicas, autenticação, admin e driver
│   ├── services/         # Regras de negócio (pedidos, auth, outbox)
│   └── types/            # Tipagens do backend
├── src/
│   ├── components/       # Componentes reutilizáveis (Header, Modais, Toolbar)
│   ├── context/          # AuthContext e CartContext
│   ├── pages/            # Cardápio, Rastreamento, Admin, Motoboy e Cliente
│   └── types.ts          # Interfaces e contratos do frontend
└── metadata.json         # Metadados e permissões da plataforma
```
