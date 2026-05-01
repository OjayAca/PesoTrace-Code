# SQL migrations (manual / external runner)

PesoTrace ships the canonical schema in [`../schema.sql`](../schema.sql). For production changes after the initial import:

1. Add a new file here using a **timestamp prefix**, e.g. `20260430120000_add_column.sql`.
2. Each file should be **idempotent where practical** (e.g. `ADD COLUMN` guarded by procedure or documented as run-once).
3. Apply files **in lexical order** on each environment (staging before production).
4. Keep the same migration committed to git before applying to shared databases.

For larger teams, consider replacing this folder with Flyway, Liquibase, or `node` migration runner — the important part is **ordered, reviewed DDL** rather than ad-hoc production edits.
