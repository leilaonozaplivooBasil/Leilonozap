# DIRETIVA ATUAL — Leilão NoZap

> Este arquivo contém **só a diretiva de engenharia em vigor agora** — o que
> está autorizado a acontecer nesta rodada, e nada além disso. Quando uma
> diretiva nova for definida (pelo dono ou pela OpenAI), este arquivo é
> **substituído** pelo conteúdo da diretiva nova; a versão anterior não se
> perde — vai para `docs/HISTORICO_DIRETIVAS.md` no mesmo commit, e o
> resultado dela para `docs/RELATORIOS_EXECUCAO.md`.
>
> Formato fixo desta diretiva e de toda diretiva futura:
> `docs/PADRAO_DIRETIVAS.md`.

---

## DIR-12 — RLS sem política de leitura em `financial_income`

**Emitida por:** Claude, via achado técnico (leitura de código + precedente
já registrado no próprio repositório — mesma falha documentada em
`supabase/migrations/20260805_system_logs_politica_insert.sql` e
`20260806_contrato_assinaturas.sql`), confirmado pelo dono com prints
mostrando "Faturamento Total: R$ 0,00" tanto no Preview quanto em produção
(`leilaonozap.net`), mesmo depois do backfill já confirmado direto no banco
(REL-11: 33 linhas, R$ 1.317,56).
**Data:** 30/08/2026.
**Objetivo:** a migration que criou `financial_income` (DIR-7) ligou RLS
(`enable row level security`) mas nunca criou política de leitura — nem na
migration, nem manualmente depois, diferente de toda tabela antiga do
projeto (que ganhou essa política fora do controle de versão quando o
banco foi montado). PostgREST, com RLS ligada e zero política aplicável,
devolve lista vazia pro client sem erro — o dado real sempre esteve na
tabela, só não tinha permissão de leitura pela chave anon/publishable que
o front usa (`src/api/supabaseClient.js`). Isso explica o zero tanto no
"Faturamento Total" do CRM quanto em qualquer outra tela que leia
`financial_income` direto do client (ex.: aba "Receitas" do Financeiro).
**Escopo autorizado:** uma migration SQL criando
`CREATE POLICY ... FOR SELECT USING (true)` em `financial_income`, mesmo
padrão já usado em `contrato_assinaturas_select`.
**Fora do escopo / proibido:** RLS de qualquer outra tabela; a regra de
reconhecimento de receita (DIR-7); o cálculo do CRM/Financeiro em si (já
estava correto — só faltava a permissão de leitura no banco).
**Regras fixas:** nenhuma além da DIR-5 a DIR-11. Mesma ressalva da DIR-11:
o deploy automático de migração continua quebrado (pendência abaixo), então
esta migration também precisa ser conferida/aplicada manualmente no SQL
Editor até o segredo `SUPABASE_ACCESS_TOKEN` ser corrigido.
**Status:** EM VIGOR — aguardando o dono aplicar a migration manualmente no
SQL Editor (mesmo passo da DIR-11) e confirmar.

---

## Estado agora

CRM e Financeiro (Fase 1 e Fase 2 completas + backfill do histórico real)
têm a lógica e os dados corretos, mas a leitura de `financial_income` pelo
client está bloqueada pela falta de política de RLS (ver DIR-12 acima) —
por isso ainda aparece R$ 0,00 até a migration da DIR-12 ser aplicada.

**Achado crítico de infraestrutura, fora do escopo de código, aguardando o
dono (ver `REL-11`):** o deploy automático de migração
(`.github/workflows/deploy-migrations.yml`) nunca funcionou — 9
execuções, 9 falhas, `supabase db push` nunca rodou uma vez na história do
repositório. Causa atual: o segredo `SUPABASE_ACCESS_TOKEN` no GitHub está
com formato inválido. Enquanto isso não for corrigido, toda migration
nova precisa ser conferida e, se faltar, colada manualmente no SQL Editor
do Supabase (ver `supabase/migrations/LEIA-ME.md` pra saber como conferir).
Passo pro dono corrigir de vez: gerar um token novo em
`supabase.com/dashboard/account/tokens` (formato `sbp_...`) e atualizar o
segredo em `Settings → Secrets and variables → Actions` do repositório.

Pendências ainda abertas, sem diretiva própria no momento:
- `REL-2`: confirmação do 401 na Edge Function `preview-api`, do lado da
  OpenAI.
- Fase 3 do Financeiro (conciliação automática, decisão sobre Open
  Finance).
- Fase 2 do CRM (persistência automática em `customers`, unificação de
  "Vendedor").
- Migration `20260828_financial_expenses_payment_account.sql` (de outra
  frente, não desta sessão) — status em produção não confirmado; mesmo
  risco do pipeline quebrado pode se aplicar a ela também.

**Nenhuma implementação nova começa até uma diretiva nova ser registrada
aqui,** no formato de `docs/PADRAO_DIRETIVAS.md`.
