# Políticas de Backup e Restauração (BACKUP-RESTORE.md)

## 1. Rotina de Backup Automatizada (PostgreSQL / Supabase)
- **Snapshot Diário:** Realizado via `pg_dump` ou backup automatizado do Supabase.
- **Comando de Dump Manual:**
  ```bash
  pg_dump -h db.supabase.co -U postgres -d postgres -F c -b -v -f "qmd_backup_$(date +%Y%m%d_%H%M%S).dump"
  ```

## 2. Procedimento de Restauração (Disaster Recovery)
```bash
pg_restore -h db.supabase.co -U postgres -d postgres -v "qmd_backup_YYYYMMDD_HHMMSS.dump"
```
