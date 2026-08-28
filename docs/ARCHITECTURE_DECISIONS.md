# Decisões de Arquitetura de Software (ADR)

## ADR-001: Arquitetura Monolítica Modular (Node.js 22 + Express 5 + Vite + React 19)
- **Contexto:** Facilidade de deploy na Hostinger como Node Web App sem necessidade de orquestração Kubernetes ou microsserviços pesados.
- **Decisão:** Unificar API e Web App sob o mesmo processo Express em produção (`dist/server.cjs`), servindo tanto a API REST (`/api/*`) quanto a SPA React via Vite middleware em desenvolvimento e arquivos estáticos otimizados em produção.
- **Consequência:** Alta performance, zero complexidade de rede, build autocontido e início rápido.

## ADR-002: Isolamento Multi-tenant Lógico por `store_id`
- **Contexto:** A plataforma deve atender dezenas a centenas de lojas sob o mesmo banco de dados PostgreSQL/Supabase.
- **Decisão:** Todas as tabelas de domínio possuem `store_id`. O middleware do backend resolve a loja pelo cabeçalho `x-store-slug`, subdomínio, domínio personalizado ou parâmetro autenticado.
- **Consequência:** Isolamento estrito de dados, impedindo vazamento entre lojistas.

## ADR-003: Validação de Valores Monetários 100% no Servidor em Centavos
- **Contexto:** Vulnerabilidades no front-end permitiam manipulação de preços de itens e adicionais.
- **Decisão:** O front-end envia apenas `{ productId, quantity, optionIds, notes }`. O servidor consulta o catálogo no banco, valida grupos de adicionais (mínimo, máximo, obrigatórios), calcula o total em centavos (`integer`) e armazena snapshots imutáveis.
- **Consequência:** Zero risco de fraude financeira.

## ADR-004: Autenticação Baseada em Sessões Seguras (HttpOnly Cookies + Hashed Tokens)
- **Contexto:** JWT em localStorage é vulnerável a XSS e não permite revogação instantânea em caso de desligamento de funcionário.
- **Decisão:** Tokens criptográficos aleatórios (32 bytes hex) com hash SHA-256 no banco de dados (`sessions`), enviados em cookies `HttpOnly`, `SameSite=Lax`, `Secure` (em produção).
- **Consequência:** Suporte a logout real, revogação instantânea de acessos e imunidade a leitura de scripts JS.

## ADR-005: Acesso Público de Rastreamento por Token Opaco (UUIDv4)
- **Contexto:** IDs sequenciais permitem enumerar pedidos e expor dados sensíveis (LGPD).
- **Decisão:** Cada pedido possui um `tracking_token` (UUIDv4 criptograficamente seguro). URLs públicas de consulta utilizam `/tracking/:token`.
- **Consequência:** Proteção total contra IDOR e enumeração de clientes.

## ADR-006: Outbox Pattern e Webhooks Assinados para n8n e Evolution API
- **Contexto:** Falhas temporárias de rede não podem perder mensagens de notificação no WhatsApp.
- **Decisão:** Criação de `outbox_events` na mesma transação atômica do pedido. Processador em background despacha com retries, backoff exponencial e assinatura HMAC SHA-256.
- **Consequência:** Confiabilidade garantida e rastreabilidade de falhas.
