# Migrações do Supabase — como não perder uma em produção

## A regra que importa

**O nome do arquivo precisa ser `<dígitos>_nome.sql`.** Dígitos puros, nada de letra.

```
✅ 20260828_minha_migracao.sql
✅ 20260828143000_minha_migracao.sql
❌ 20260828b_minha_migracao.sql     ← o CLI IGNORA este arquivo
```

Duas migrações no mesmo dia? Desempate pela **hora**, nunca por letra:

```
20260828143000_primeira.sql
20260828150000_segunda.sql
```

Um teste no CI (`tests/nomesDeMigracao.test.mjs`) reprova o PR se o nome estiver
fora do padrão, então não dá pra esquecer — mas é bom saber o porquê.

---

## Por que essa regra existe — incidente de 27–28/08/2026

O `supabase db push` só enxerga arquivo com timestamp em dígitos puros. Qualquer
outro nome ele **pula**, imprimindo uma linha discreta (`Skipping migration ...`)
e devolvendo **exit 0**. Deploy verde, migração inexistente no banco.

Foi o que aconteceu com os PRs **#132** e **#134**:

| Arquivo | O que criava |
|---|---|
| `20260827b_financial_income_cost_center.sql` | tabela `financial_income`, coluna `cost_center` |
| `20260827c_recurring_group_id.sql` | coluna `recurring_group_id` |

A letra (`b`, `c`) era só um jeito natural de desempatar duas migrações do mesmo
dia. O CLI descartou as duas. O código foi para produção em 27/08 às 17:30
gravando numa tabela e em colunas que **não existiam**:

- **Receita não registrada.** `registrarReceita()` é chamada em 8 pontos (comissão
  de arremate, comissão da Loja, venda no PDV, adesão, plano parceiro). Como a
  tabela não existia, cada chamada levava 404. Não quebrou pagamento — o helper é
  best-effort de propósito — mas nada foi gravado.
- **Cron falhando calado todo dia.** `gerarGastosFixos` roda às 06:00 e pede
  `recurring_group_id` no `select`. O PostgREST recusa a query inteira quando a
  coluna não existe, e a função sai no `success: false` sem gerar nada. O bug que
  esse cron foi criado para resolver continuou acontecendo.

Descoberto ~25 horas depois, por conferência manual.

---

## A segunda causa, mais grave: o deploy automático nunca funcionou

`.github/workflows/deploy-migrations.yml` existe desde 21/08/2026 justamente para
aplicar migração sozinho e acabar com o "colar SQL na mão e esquecer".

**Ele nunca aplicou nada.** As 8 execuções entre 21/08 e 28/08 falharam, todas no
mesmo ponto:

```
##[error]Failed to resolve latest Supabase CLI release: rate limit exceeded
```

A causa era `version: latest` no `supabase/setup-cli`. Para saber qual é a última
release, a action consulta a API do GitHub — sem autenticação, dividindo o limite
de 60 requisições/hora por IP com todos os outros runners. O job morria aí, antes
de chegar no `db push`.

Ou seja, o incidente teve duas camadas independentes: a migração seria pulada pelo
nome **e** o workflow nem chegava a rodar. Corrigir uma só não resolveria.

**Corrigido em 28/08:** versão fixa (`2.116.0`) em vez de `latest`, `GITHUB_TOKEN`
como cinto de segurança, e um passo final que confere se algum arquivo foi pulado —
para o deploy ficar vermelho em vez de mentir que deu certo.

---

## Os 10 arquivos fora do padrão que continuam aqui

Estes já estão aplicados em produção (coladas no SQL Editor à mão) e **não devem
ser renomeados**:

```
20260821c_estorno_carteira.sql
20260821d_reserva_ledger_trava_devolucao.sql
20260821e_estoque_baixa_atomica.sql
20260821f_estoque_check_nao_negativo.sql
20260821g_estoque_reservas.sql
20260822a_whatsapp_router_idempotencia.sql
20260822b_ai_conversas.sql
20260822c_heloim_solicitacoes.sql
20260827b_financial_income_cost_center.sql
20260827c_recurring_group_id.sql
```

Renomear faria o CLI vê-los como novos e tentar aplicar de novo. A maioria é
idempotente e sobreviveria, mas `20260821c_estorno_carteira.sql` tem um
`UPDATE ... SET` — correção pontual de dados, que rodando duas vezes faz estrago.

Eles estão numa lista de exceção fechada dentro de
`scripts/checar-nomes-migracoes.mjs`. Um nome novo fora do padrão continua sendo
reprovado, mesmo parecido com estes.

---

## Pendência: o histórico remoto está dessincronizado

O banco tem versões registradas que não existem como arquivo aqui:

```
20260526214416  20260527002613  20260527041849  20260821205547  20260822180101
```

São migrações aplicadas direto pelo painel. Enquanto estiverem no histórico, o
`db push` recusa antes de aplicar qualquer coisa:

```
Remote migration versions not found in local migrations directory.
```

**Como resolver** (uma vez só, com o CLI logado no projeto):

```bash
supabase migration repair --status reverted \
  20260526214416 20260527002613 20260527041849 20260821205547 20260822180101
```

Isso remove as cinco do histórico. Como não existe arquivo local correspondente, o
CLI não tenta aplicar nada em seguida — só para de reclamar. O que essas migrações
já fizeram no banco continua lá, intacto.

Depois disso, `db push` volta a funcionar e o deploy automático passa a valer de
verdade.

---

## Conferir se uma migração entrou

Não confie no workflow verde sozinho. Para qualquer coisa que importa, confira no
SQL Editor:

```sql
-- a tabela existe?
select count(*) from information_schema.tables
 where table_schema='public' and table_name='minha_tabela';

-- a coluna existe?
select count(*) from information_schema.columns
 where table_schema='public' and table_name='minha_tabela' and column_name='minha_coluna';
```

`1` = entrou. `0` = não entrou, independentemente do que o CI disse.

---

## Terceira causa: tabela nova sem política de RLS não é lida pelo client

Descoberto em 30/08/2026 (DIR-12): `financial_income` (criada em 27/08, DIR-7)
tinha `enable row level security` mas **nenhuma política de leitura**. Toda
tabela antiga do projeto ganhou essa política manualmente, fora do controle de
versão, quando o banco foi montado a partir do Base44 — só 3 migrations do
repositório inteiro criam política explícita:

```
20260805_system_logs_politica_insert.sql
20260806_contrato_assinaturas.sql
20260806_oportunidades_do_dia.sql
```

Sem política, `select` pela chave anon/publishable (é o que o front usa,
`src/api/supabaseClient.js`) **não dá erro** — PostgREST só devolve lista
vazia. Parece "sem dado", mas o dado está lá (confirme com
`select count(*) from public.<tabela>;` direto no SQL Editor, que roda com
privilégio de serviço e ignora RLS).

**Regra pra qualquer tabela nova a partir de agora:** depois de criar a
tabela e ligar RLS, sempre criar pelo menos uma política de leitura na MESMA
migration (`create policy ... for select using (true)` quando o controle de
acesso já é feito na camada de aplicação, como é o padrão deste projeto — ver
`contrato_assinaturas_select` como referência). Escrita continua exclusiva do
`service_role` sempre que possível (as rotas de `api/` já fazem isso).

Verificar se uma tabela tem política de leitura:

```sql
select policyname, cmd, qual from pg_policies where tablename = 'minha_tabela';
```

Zero linhas com `cmd = 'SELECT'` (ou `ALL`) = client não lê nada dessa
tabela, mesmo com dado real dentro.
