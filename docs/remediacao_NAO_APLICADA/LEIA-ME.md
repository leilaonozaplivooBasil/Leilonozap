# ⛔ REMEDIAÇÃO PROPOSTA — NADA AQUI FOI APLICADO

Esta pasta guarda SQL **preparado e não executado**.

**Por que não está em `supabase/migrations/`:** aquela pasta parece um pipeline
de migration e não é — nenhum arquivo dela jamais foi aplicado pelo CLI do
Supabase (não existe `supabase/config.toml`, 31 dos 32 arquivos estão fora do
formato de 14 dígitos que o CLI aceita, e as 3 migrations registradas em produção
não correspondem a arquivo nenhum do repositório). Colocar remediação lá
aumentaria a confusão que a auditoria encontrou.

Aqui não roda nada sozinho. Cada arquivo é aplicado à mão, por decisão do dono,
na ordem indicada, e sempre com o diagnóstico antes e a verificação depois.

## Ordem

| Ordem | Arquivo | O quê | Risco | Autorização |
|---|---|---|---|---|
| 1 | `00_dano_A14_leitura.sql` | mede o estrago dos dois motores concorrentes | ZERO — só leitura | não precisa |
| 2 | `01_diagnostico_pre.sql` | fotografa as permissões antes | ZERO — só leitura | não precisa |
| 3 | `02b_desligar_pg_cron.sql` | **desliga o segundo motor de encerramento** | MÉDIO | **do dono** |
| 4 | `02_revogar_9_rpcs.sql` | tira EXECUTE de `PUBLIC`/`anon`/`authenticated` em 9 funções | BAIXO | **do dono** |
| 5 | `03_verificacao_pos.sql` | prova que fechou e que o servidor alcança | ZERO — só leitura | não precisa |
| — | `04_rollback.sql` | devolve as permissões | BAIXO | do dono |
| — | `04b_rollback_pg_cron.sql` | religa o job (emergência) | BAIXO | do dono |

### ⚠️ O `02b` VEM ANTES DO `02`. A ordem não é preferência.

O `pg_cron` roda `SELECT public.expire_auctions()` **a cada minuto desde 30/06**
— 75.365 execuções — enquanto a Vercel roda `finalizeExpiredAuctions` também a
cada minuto. São **dois motores de encerramento concorrendo em produção**, e só
um liquida. Revogar o `EXECUTE` sem desligar o job não resolve: o `pg_cron` roda
com o dono do job, que provavelmente não perde a permissão. A gente teria fechado
a porta de entrada errada achando que resolveu.

E o `00` vem antes de tudo porque, depois de desligar o job, o padrão muda e não
dá mais para medir o que já passou.

Sempre: `00` → `01` → ler os dois → `02b` → acompanhar 30 min → `02` → `03` →
testar as telas. Qualquer coisa fora do esperado: `04b` (motor) ou `04`
(permissões) devolve.
