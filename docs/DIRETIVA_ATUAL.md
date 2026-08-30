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

## DIR-14 — Comissão de leilão em financial_income + volume de depósito no CRM

**Emitida por:** dono (Luiz), via pergunta direta (`AskUserQuestion`) depois
de ver "Faturamento Total: R$ 1.317,56" continuar sem a receita de leilão:
"Sim, incluir agora (a partir de hoje + histórico)" — reabrindo a decisão
da DIR-13, que tinha adiado isso. No mesmo momento, pediu também (mensagem
direta): "quero saber tudo que entra no CRM, também depósito em carteira
digital, pra saber volume financeiro".
**Data:** 30/08/2026.
**Objetivo:**
1. A comissão retida do leilão (25% do valor do arremate a cada martelo,
   ou os 30% inteiros quando não tem indicador) é receita real da empresa
   — decisão expressa do dono já documentada em `finalizeAuctionCore.js`
   (PONTO 100, 21/08/2026): "é saldo real e sacável... a conta é dele".
   Já era calculada e creditada corretamente em `commission_records`
   (`role='leilao_retido'`), só nunca tinha sido ligada a
   `financial_income` — por isso nunca aparecia no Financeiro/CRM.
2. O dono quer visibilidade do volume TOTAL que entra na plataforma
   (depósito em carteira digital), separado da receita — não misturado no
   "Faturamento Total" (regra da DIR-7 continua valendo: depósito não é
   receita, só vira receita quando gasto numa compra).
**Escopo autorizado:**
1. `api/_lib/finalizeAuctionCore.js` (`reterFatiaDaRede`) — chama
   `registrarReceita` logo após confirmar o crédito na conta oficial
   (categoria `comissao_leilao`, cost center `Leilões`).
2. Migration de backfill (`commission_records` onde
   `sale_type='leilao' and role='leilao_retido'` → `financial_income`,
   idempotente por `sale_id`), recuperando os ~55 leilões já arrematados.
3. Novo card "Depósitos em Carteira Digital" no CRM (`CrmClientesTab.jsx` +
   `CrmStatsCards.jsx`), somando `wallet_deposit`/`commission_deposit`/
   `operacao_deposit` do escopo (rede ou plataforma inteira, conforme
   super_admin) — com tooltip deixando claro que NÃO é receita.
**Fora do escopo / proibido:** mudar a regra de reconhecimento de receita
da DIR-7 (depósito continua fora do "Faturamento Total"); backfill
histórico de adesão/seller_adhesion legado (mesma pendência da DIR-13,
ainda sem decisão).
**Regras fixas:** nenhuma além da DIR-5 a DIR-13.
**Status:** EM VIGOR — código e migration prontos; falta o dono aplicar a
migration manualmente no SQL Editor (pipeline automático ainda quebrado,
mesma pendência da DIR-11/DIR-12) e confirmar.

---

## Estado agora

CRM e Financeiro têm a lógica, os dados e a leitura (RLS) corretos.
"Faturamento Total" vai passar a incluir também a comissão retida do
leilão assim que a migration da DIR-14 for aplicada — ver instruções no
chat. Volume de depósito em carteira digital agora tem card próprio no
CRM, sem entrar na receita.

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

**Efeito colateral da DIR-13 a observar:** o dropdown manual de
`CatalogOrdersAdmin.jsx` que deixava o admin marcar um pedido "Aguardando
Pagamento" como "Pago" na mão agora é recusado (mensagem explicando o
porquê). Se esse botão for realmente necessário pra confirmar pagamento
fora do sistema (ex.: transferência bancária manual), isso precisa de uma
diretiva própria pra construir uma rota nova que calcule comissão e
registre receita — não só destravar o PATCH de novo.

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
- **Backfill histórico de adesão/seller_adhesion legado** (achado na
  DIR-13): receita real de adesão de vendedor e plano parceiro anterior a
  ~21-28/08/2026 mora em tabelas com semântica diferente
  (`partner_plan_purchases`, `contrato_assinaturas`, saldo de vendedor do
  Base44) — recuperar isso não é um backfill simples, é decisão de
  negócio se vale o esforço de "traduzir" esse histórico.

**Nenhuma implementação nova começa até uma diretiva nova ser registrada
aqui,** no formato de `docs/PADRAO_DIRETIVAS.md`.
