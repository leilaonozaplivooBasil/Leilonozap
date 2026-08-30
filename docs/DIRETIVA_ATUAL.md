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

## Estado agora

**Nenhuma diretiva em vigor.** DIR-1 a DIR-13 concluídas (ver
`docs/RELATORIOS_EXECUCAO.md` e `docs/HISTORICO_DIRETIVAS.md`). CRM e
Financeiro têm a lógica, os dados e a leitura (RLS) corretos — "Faturamento
Total" confirmado em R$ 1.317,56 (Preview e produção) depois da DIR-12. Os
3 hooks de comissão que faltavam (PDV dinheiro/saldo, saldo de comissão na
Loja, Livoo) foram ligados a `financial_income` na DIR-13, e a aprovação
manual de pedido (`updateOrderStatus.js`) não deixa mais uma venda virar
"paga" sem calcular comissão nem avisar o financeiro.

**Efeito colateral da DIR-13 a observar:** o dropdown manual de
`CatalogOrdersAdmin.jsx` que deixava o admin marcar um pedido "Aguardando
Pagamento" como "Pago" na mão agora é recusado (mensagem explicando o
porquê). Se esse botão for realmente necessário pra confirmar pagamento
fora do sistema (ex.: transferência bancária manual), isso precisa de uma
diretiva própria pra construir uma rota nova que calcule comissão e
registre receita — não só destravar o PATCH de novo.

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
- **Comissão de leilão em `financial_income`** (achado na DIR-13,
  explicitamente adiado pelo dono): a comissão retida do leilão (25% a
  cada martelo) já é calculada e paga de verdade em `commission_records`,
  mas nunca aparece no Financeiro/CRM. Decidir se e quando isso deve
  passar a contar como receita.
- **Backfill histórico de adesão/seller_adhesion legado** (achado na
  DIR-13): receita real de adesão de vendedor e plano parceiro anterior a
  ~21-28/08/2026 mora em tabelas com semântica diferente
  (`partner_plan_purchases`, `contrato_assinaturas`, saldo de vendedor do
  Base44) — recuperar isso não é um backfill simples, é decisão de
  negócio se vale o esforço de "traduzir" esse histórico.

**Nenhuma implementação nova começa até uma diretiva nova ser registrada
aqui,** no formato de `docs/PADRAO_DIRETIVAS.md`.
