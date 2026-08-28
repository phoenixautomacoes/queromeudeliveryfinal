# Auditoria do Estado Atual (Fase 0)

**Projeto:** Quero Meu Delivery (QMD)
**Repositório Base:** `phoenixautomacoes/queromeudelivery-app`
**Commit Base:** `962cb668a353e81bf24216b836fdfdad00fd4182`
**Data:** 28 de Agosto de 2026
**Arquiteto Responsável:** Phoenix Digital Architecture Team

---

## 1. Contexto e Descoberta

O repositório original continha exclusivamente artefatos compilados e empacotados para distribuição (`dist/`, bundles minificados de frontend e backend em `server/index.mjs`), sem a estrutura modular de código-fonte (`QMD-BASE`).

### 1.1 Inventário de Arquivos Encontrados
- `server/index.mjs` (bundle Node.js compilado)
- `server/index.mjs.map` (sourcemap com referências ao schema e rotas da versão prévia)
- `public/assets/*.js`, `public/assets/*.css` (bundles Vite/React compilados)
- `public/sw.js` (Service Worker básico)

---

## 2. Vulnerabilidades e Falhas de Arquitetura Identificadas no Legado

Ao analisar os sourcemaps e o comportamento legado, foram identificadas graves vulnerabilidades que violavam princípios básicos de segurança e isolamento:

1. **Cálculo de Preço Controlado pelo Cliente (CRÍTICO):**
   O frontend enviava `selectedOptions` com propriedades de preço (`price`, `additionalPrice`), e o servidor persistia esses valores sem recalcular a partir da tabela oficial de adicionais. Um invasor podia alterar o preço de um hambúrguer para R$ 0,01 alterando o payload JSON.

2. **Falta de Isolamento Multiempresa (`store_id` não validado):**
   O `store_id` era recebido diretamente do payload HTTP sem conferência de propriedade com o token de sessão ou com o domínio/slug acessado.

3. **Autenticação Insegura e Chaves Padrão:**
   - Presença de `fallback-secret` hardcoded.
   - Senha padrão `admin123` sem política de troca obrigatória.
   - Recuperação de senha retornava o token ou a nova senha diretamente na resposta HTTP JSON.
   - JWT armazenado em `localStorage` vulnerável a ataques XSS.

4. **Autenticação de Motoboy por Telefone:**
   O motoboy se autenticava apenas fornecendo o número de telefone sem senha, OTP ou credencial de sessão assinada.

5. **Exposição de Dados por IDs Sequenciais (Insecure Direct Object Reference - IDOR):**
   Pedidos e localizações eram consultados via `/api/orders/:id` numérico, permitindo scraping de todos os clientes e entregas.

6. **Concorrência e Falta de Transação Atômica em Cupons e Estoque:**
   Cupons de uso limitado sofriam de *Race Conditions*, permitindo resgates simultâneos acima do limite permitido (`max_uses`).

7. **Falta de Idempotência:**
   Cliques duplos no botão de "Finalizar Pedido" geravam pedidos duplicados no banco de dados e no WhatsApp.

8. **Ausência de Máquina de Estados Determinística:**
   Qualquer usuário podia transicionar pedidos para status arbitrários sem checagem de permissão (ex: cliente cancelando pedido já em rota).

9. **WhatsApp `wa.me` como Único Meio de Pedido:**
   O pedido não tinha garantia de registro prévio e dependia exclusivamente do cliente enviar a mensagem no WhatsApp.

---

## 3. Plano de Reconstrução V2

1. **Monorepo Limpo e Tipado:** Express 5 + React 19 + TypeScript + Vite + Drizzle ORM.
2. **Multi-tenant Seguro:** Resolução de `store_id` pelo backend (slug/domínio) com isolamento rigoroso em todas as tabelas.
3. **Cálculo 100% Server-side:** Transação atômica em centavos, validação de regras de opções e cupom com bloqueio de concorrência.
4. **Sessões HTTP-Only:** Cookies seguros com hashing SHA-256 no banco e RBAC (`super_admin`, `owner`, `manager`, `kitchen`, `cashier`, `driver`, `customer`).
5. **Acompanhamento por Token Opaco (UUIDv4):** Proteção contra IDOR.
6. **Outbox Pattern e Webhooks:** Disparo de eventos confiáveis para n8n e Evolution API com assinatura HMAC.
7. **PWA Completo & Offline First:** Performance, acessibilidade WCAG AA e temas customizáveis via CSS variables por loja.
