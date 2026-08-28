# Manual de Operação e Monitoramento (OPERATIONS.md)

## 1. Endpoints de Saúde e Observabilidade
- **Liveness:** `GET /api/health` — Retorna `{ status: "ok", timestamp: ... }`
- **Readiness:** `GET /api/health/ready` — Verifica conectividade com o banco de dados PostgreSQL/Supabase.
- **Versão:** `GET /api/health/version` — Retorna versão atual do release.

## 2. Gestão de Logs
- Logs estruturados em formato JSON com níveis `info`, `warn`, `error`.
- Ocultação automática de campos sensíveis (`password`, `token`, `secret`, `card_number`).

## 3. Rotinas de Manutenção
- Limpeza de sessões expiradas (`sessions` com `expires_at < NOW()`).
- Limpeza de eventos da outbox concluídos com mais de 30 dias.
