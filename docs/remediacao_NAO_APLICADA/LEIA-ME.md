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

| Arquivo | O quê | Risco | Autorização |
|---|---|---|---|
| `01_diagnostico_pre.sql` | fotografa o estado antes | ZERO — só leitura | não precisa |
| `02_revogar_9_rpcs.sql` | tira EXECUTE de `PUBLIC`/`anon`/`authenticated` em 9 funções | BAIXO | **do dono** |
| `03_verificacao_pos.sql` | prova que fechou e que o servidor continua alcançando | ZERO — só leitura | não precisa |
| `04_rollback.sql` | devolve exatamente o estado anterior | BAIXO | do dono |

Sempre: `01` → ler → `02` → `03` → testar as telas → só então seguir em frente.
Se qualquer tela quebrar, `04` devolve.
