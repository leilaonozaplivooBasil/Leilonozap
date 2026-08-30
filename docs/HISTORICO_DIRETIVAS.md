# HISTÓRICO DE DIRETIVAS DE ENGENHARIA — Leilão NoZap

> Registro **append-only** de toda diretiva formal de engenharia — instrução
> estruturada com objetivo, escopo e restrições explícitas, vinda do dono ou
> da OpenAI, que autorizou uma rodada de trabalho. Nunca reescrito, nunca
> podado. Quando uma diretiva é substituída, a versão anterior sai de
> `docs/DIRETIVA_ATUAL.md` e vira uma entrada aqui.
>
> **Formato fixo:** `docs/PADRAO_DIRETIVAS.md`. Este arquivo guarda só a
> ESPECIFICAÇÃO de cada diretiva (o que foi autorizado); o resultado de cada
> uma está em `docs/RELATORIOS_EXECUCAO.md`, no relatório `REL-N`
> correspondente.
>
> **Isto não é o diário da conversa** — `docs/DIARIO.md` continua sendo o
> registro integral de tudo que foi falado, decidido e corrigido, incluindo
> os pedidos do dia a dia que não vieram no formato de diretiva formal (ex.:
> os PONTOs 115 a 121 da frente de Gestão de Pedidos). Este arquivo indexa
> só as diretivas **estruturadas** — mais fácil de auditar em sequência.

---

## DIR-1 — Auditoria somente-leitura das PRs #86/#87

**Emitida por:** OpenAI, via prompt estruturado colado pelo dono no chat.
**Data:** 21/08/2026.
**Objetivo:** investigação técnica completa das branches `openai/catalog-status-sync`
(PR #86) e `openai/catalog-status-sync-preview` (PR #87), causa-raiz de 3
regressões reportadas pelo dono (checkbox de conferência, Jornada/status
dessincronizados, "Erro ao atualizar etapa da entrega") + 2 melhorias
(imagem do produto, etiqueta Melhor Envio).
**Escopo autorizado:** leitura de código, comparação entre branches,
diagnóstico com evidência (arquivo/linha).
**Fora do escopo / proibido:** qualquer alteração de código.
**Regras fixas:** somente leitura.
**Status:** EXECUTADA. Ver `REL-1`.

---

## DIR-2 — Comando de implementação no Preview (PR #87)

**Emitida por:** OpenAI, comentário no PR #87 (`leilaonozaplivooBasil`,
comment id `5376504779`), autorizada pelo dono no chat ("execute exatamente
o que foi definido, não mexa em produção").
**Data:** 21/08/2026.
**Objetivo:** corrigir a Jornada Operacional da Gestão de Pedidos **só no
Preview** (PR #87), preservando produção intacta. Diagnóstico da OpenAI:
Edge Function `preview-api` volta HTTP 401 antes de entrar na função, desde
a v2 dela — problema de autenticação do harness, não de lógica de negócio.
**Escopo autorizado:** correção de código só na branch
`openai/catalog-status-sync-preview`; reverter customização indevida de
`select.jsx`; ajustes de UI/jornada/imagem; correção do harness de
autenticação do Preview.
**Fora do escopo / proibido:** tocar `main`; mergear PR #87; tocar
Supabase/Vercel de produção; dinheiro/frete/RLS geral/pg_cron; alterar
`select.jsx` global (resolver vocabulário localmente).
**Regras fixas:** se precisar de acesso que não existe (Edge Function,
variável Vercel), documentar e parar — não inventar.
**Status:** EXECUTADA. Ver `REL-2`.

---

## DIR-3 — Estrutura de governança de diretivas

**Emitida por:** dono (Luiz), diretamente.
**Data:** 21/08/2026.
**Objetivo:** criar `docs/DIRETIVA_ATUAL.md`, este arquivo, e
`docs/ARQUITETURA.md`, preservando todo o conteúdo existente de handoff e
diário.
**Escopo autorizado:** criação/atualização de documentação.
**Fora do escopo / proibido:** qualquer alteração de funcionalidade, banco,
produção ou regra de negócio.
**Regras fixas:** depois desta rodada, toda implementação futura espera uma
diretiva nova e explícita.
**Status:** EXECUTADA. Ver `REL-3`.

---

## DIR-4 — Padronização de diretivas e relatórios de execução

**Emitida por:** dono (Luiz), diretamente.
**Data:** 21/08/2026.
**Objetivo:** refinar a estrutura de governança criada na DIR-3, definindo
um formato fixo (template) pra diretivas e pra relatórios de execução, pra
toda rodada futura seguir o mesmo padrão.
**Escopo autorizado:** criação de `docs/PADRAO_DIRETIVAS.md`; reestruturação
de `docs/HISTORICO_DIRETIVAS.md` pra separar especificação de execução;
criação de `docs/RELATORIOS_EXECUCAO.md`.
**Fora do escopo / proibido:** qualquer alteração de código ou produção.
**Regras fixas:** nenhuma além da DIR-3 (documentação pura).
**Status:** EXECUTADA. Ver `REL-4`.

---

## DIR-5 — Super_admin bloqueado em painéis administrativos

**Emitida por:** dono (Luiz), diretamente, reportando bloqueio ao vivo em
`/Financial`.
**Data:** 21/08/2026.
**Objetivo:** analisar todas as telas com o mesmo padrão de bloqueio
("Acesso restrito a administradores"), corrigir o que estiver errado, e
organizar essa lógica de forma melhor.
**Escopo autorizado:** correção de código nas telas com esse padrão de
bloqueio; criação de uma fonte única pro conceito de "administrador".
**Fora do escopo / proibido:** banco, produção, regra de negócio financeira;
conferências de UI cosméticas fora do padrão de bloqueio de página.
**Regras fixas:** análise sênior antes da correção; reportar no formato do
Protocolo-Mestre antes do merge/deploy.
**Status:** EXECUTADA. Ver `REL-5`.

---

## DIR-6 — Modernização do módulo Financeiro (Fase 1)

**Emitida por:** dono (Luiz), diretamente.
**Data:** 21/08/2026.
**Objetivo:** Fase 1 de 3 — correções rápidas de baixo risco no Financeiro
(edição de gastos acessível, fim de PATCH redundante), antes de qualquer
mudança de arquitetura de dados. Decisão de arquitetura pra Fase 2 já
tomada: livro-razão de entradas (Opção B), pela necessidade de números
auditáveis por um profissional de contabilidade.
**Escopo autorizado:** correções na tela Financeiro que não envolvem
banco/esquema novo.
**Fora do escopo / proibido:** criar tabela nova ou sincronizar receita
real nesta rodada — isso é Fase 2, diretiva própria.
**Regras fixas:** nenhuma além da DIR-5.
**Status:** CONCLUÍDA. PR #130 mergeado por squash em `main` (commit
`5fb996f2`), CI verde. Ver `REL-6`.

---

## DIR-7 — Modernização do módulo Financeiro (Fase 2: receita real + centro de custo)

**Emitida por:** dono (Luiz), diretamente, depois de pedir análise do Nibo
(Conciliador Open Finance) e do ContaAzul pra trazer o que fizer sentido.
**Data:** 27/08/2026.
**Objetivo:** Fase 2 de 3. Livro-razão de receita (`financial_income`,
gravado no momento da confirmação, espelhando `financial_expenses`) +
centro de custo (dimensão nova, separada de categoria, presente nos dois
lados do livro). Visão Geral cruza receita x despesa por categoria e por
centro de custo.
**Escopo autorizado:** migration da tabela `financial_income` e da coluna
`cost_center`; entidade `FinancialIncome` espelhando `FinancialExpense`;
hook de gravação automática só em transação com origem clara (venda
confirmada, depósito confirmado); UI de centro de custo, receita e Visão
Geral.
**Fora do escopo / proibido:** conciliação bancária via Open Finance/API
paga de terceiro (Fase 3); "match" automático de recebimento avulso sem
origem clara; alterar produção sem autorização.
**Regras fixas:** nenhuma além da DIR-5/DIR-6.
**Status:** CONCLUÍDA. PR #132 mergeado por squash em `main` (commit
`b38b84df`), CI verde. Ver `REL-7`.

---

## DIR-8 — Recorrência de gasto fixo não gera lançamento novo

**Emitida por:** dono (Luiz), reportando ao vivo (print da Aline logada no
Financeiro): gasto "Fixo Mensal" (Consórcio Nacional Volkswagen, vencimento
21/07/2026) numa única linha "Vencido há 37 dia(s)", em vez de mostrar
quantos meses estão em aberto.
**Data:** 27/08/2026.
**Objetivo:** `expense_type: 'fixo'` e `recurring_day` eram só campos
salvos — nenhum código gerava o lançamento do mês seguinte. Job diário
gera um lançamento pendente por mês faltando, com backfill dos meses
perdidos.
**Escopo autorizado:** coluna `recurring_group_id` em `financial_expenses`
com backfill; função pura testável de meses faltando; cron novo via Vercel
Cron; limite de segurança no backfill.
**Fora do escopo / proibido:** gasto "parcelado"; geração automática de
receita (é a DIR-7); alterar produção sem autorização.
**Regras fixas:** nenhuma além da DIR-5/6/7.
**Status:** CONCLUÍDA. Mesma PR #132, mergeado por squash em `main`
(commit `b38b84df`), CI verde. Ver `REL-8`.

---

## DIR-9 — Centro de custo customizável ("+ Novo")

**Emitida por:** dono (Luiz), diretamente, ao lado do print do formulário de
gasto: "ao lado do centro de custo, acrescentar botão + Nova pra quando
faltar eu mesmo poder adicionar e crescer a ferramenta".
**Data:** 27/08/2026.
**Objetivo:** lista de centro de custo era fixa — dar ao dono o mesmo poder
que já existe em Categoria, digitar um centro de custo novo direto no
formulário.
**Escopo autorizado:** botão "+ Novo" em `ExpenseFormModal.jsx` (mesmo
padrão de Categoria); `FinancialOverview.jsx` passa a incluir na Visão
Geral qualquer centro de custo já lançado, não só os 3 da lista fixa.
**Fora do escopo / proibido:** tela de administração de centros de custo;
mexer em `financial_income` (DIR-7).
**Regras fixas:** nenhuma além da DIR-5/6/7/8.
**Status:** CONCLUÍDA. PR #134 mergeado por squash em `main` (commit
`4ebecf54`), CI verde. Ver `REL-9`.

---

## DIR-10 — CRM: dono vê o negócio inteiro, rede vê só a própria rede (Fase 1)

**Emitida por:** dono (Luiz), diretamente, depois de pedir análise sênior do
CRM (print com quase todos os cards zerados apesar de vendas, usuários e
estoque reais).
**Data:** 27/08/2026.
**Objetivo:** 5 causas raiz independentes pros zeros, confirmadas por
leitura de código: escopo de rede aplicado até pro dono; campo de venda
errado (`licensee_id` sozinho); "Volume em Negociação" chamando função de
servidor inexistente; "Produtos em Estoque" sem filtro `catalog_active`;
"Arrematantes" checando coluna TEXT como se fosse objeto. Regra confirmada
com o dono: rede continua vendo só a própria rede; só `super_admin` vê o
negócio inteiro. Achados adicionais no Preview corrigidos na mesma PR:
"Valor de Mercado em Estoque" usava preço de venda, não custo real;
"Faturamento Total" somava valor cheio da venda, não a comissão real
(mesmo erro da DIR-7) — trocado por somar `financial_income`; tooltip ⓘ em
todo card, pedido do dono ("painel precisa ser intuitivo").
**Escopo autorizado:** bypass do filtro de rede pra `super_admin`; correção
do campo de venda pra visão de rede; troca da função de negociação
inexistente; filtro de estoque correto; cálculo de arrematante por dado
real; correção de estoque/faturamento pro valor real; tooltips explicativos.
**Fora do escopo / proibido:** persistência automática em `customers`;
unificação da tabela `sellers` com o papel calculado; RLS do Supabase.
**Regras fixas:** nenhuma além da DIR-5 a DIR-9.
**Status:** CONCLUÍDA. PR #145 mergeado por squash em `main` (commit
`67039789`), CI verde. Ver `REL-10`.

---

## DIR-11 — Backfill de financial_income com o histórico real

**Emitida por:** dono (Luiz), diretamente, depois de ver "Faturamento
Total: R$ 0,00" no Preview da DIR-10 e pedir pra "puxar tudo dado real:
pagamento das lojas, depósitos, venda e etc".
**Data:** 28/08/2026.
**Objetivo:** `financial_income` (DIR-7) nasceu vazia de propósito — grava
só a partir de agora. Migration única e idempotente que popula o
livro-razão com o histórico real de `catalog_sales`, usando A MESMA regra
já em vigor no código ao vivo (DIR-7): comissão de venda liquidada (não o
valor cheio) e taxa sem repasse (valor cheio). Depósito de saldo/carteira/
operação, passaporte, frete de vendedor e reposição de estoque continuam
FORA — mesmo motivo da DIR-7, não foi reaberto.
**Escopo autorizado:** uma migration SQL (`INSERT ... SELECT` a partir de
`catalog_sales`, com `NOT EXISTS` por `sale_id`).
**Fora do escopo / proibido:** incluir depósito/passaporte/frete/reposição
no backfill; mudar a regra de reconhecimento de receita da DIR-7.
**Regras fixas:** nenhuma além da DIR-5 a DIR-10.
**Status:** CONCLUÍDA — com um detalhe importante. A migration foi
mergeada (PR #145, commit `67039789`), mas o deploy automático
(`.github/workflows/deploy-migrations.yml`) estava quebrado nesse momento
(`SUPABASE_ACCESS_TOKEN` com formato inválido — achado à parte, ver
`REL-11`). O dono aplicou o SQL manualmente no SQL Editor do Supabase em
30/08/2026, confirmado: 33 linhas inseridas, R$ 1.317,56 de receita real.
Ver `REL-11`.

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
**Regras fixas:** nenhuma além da DIR-5 a DIR-11.
**Status:** CONCLUÍDA. Migration `20260830_financial_income_rls_select.sql`
commitada e aplicada manualmente pelo dono no SQL Editor do Supabase no
mesmo dia — confirmado por consulta direta (`pg_policies` passou de 0 pra
1 linha, `cmd = SELECT`). CRM voltou a mostrar "Faturamento Total: R$
1.317,56" em Preview e produção. Ver `REL-12`.

---

## DIR-13 — Hooks ao vivo faltando + fechar buraco de "paid" sem regra

**Emitida por:** Claude, via achado técnico (workflow de investigação com 3
agentes independentes, pedido do dono depois de ver que nenhuma linha nova
entrou em `financial_income` desde 25/08 mesmo com venda acontecendo) +
decisão do dono, via pergunta direta: (1) comissão de leilão em
`financial_income` — **não mexer agora**; (2) `updateOrderStatus.js`
marcando venda como paga sem regra nenhuma — **bloquear e redirecionar
pro fluxo real**.
**Data:** 30/08/2026.
**Objetivo:** achados 4 caminhos de pagamento reais, já em produção, que
nunca chamam `registrarReceita` (`api/_lib/financialIncome.js`): PDV pago
em dinheiro/saldo de comissão/saldo de operação (`createPdvOrder.js`),
compra na Loja Virtual paga com saldo de comissão do próprio cliente
(`payWithBalance.js`), venda do canal Livoo (`livooWebhook.js`), e
aprovação manual de pedido (`updateOrderStatus.js` — pior caso: nem
calcula comissão nem baixa estoque, só troca o `status`). Isso explica por
que nada novo entrou em `financial_income` desde 25/08/2026 mesmo com
venda real acontecendo — o hook ao vivo cobre só 3 dos ~7 caminhos que
existem (Mercado Pago webhook, arremate por saldo, PDV via PIX/cartão).
**Escopo autorizado:**
1. `createPdvOrder.js`, `payWithBalance.js`, `livooWebhook.js` — adicionar
   chamada a `registrarReceita` no mesmo ponto em que a comissão já é
   calculada e gravada em `commission_total`, mesmo padrão já usado em
   `pdvSettle.js`/`settleAuctionWithBalance.js`.
2. `updateOrderStatus.js` — bloquear a transição pra `status: 'paid'`
   quando a venda ainda não estava paga (mesmo princípio do PONTO 115 em
   `entityWrite.js`: "virar paga" tem rota própria, que já calcula
   comissão e regista receita — esta rota administra fulfillment depois
   que a venda já está paga, não decide que dinheiro entrou).
**Fora do escopo / proibido:** comissão de leilão/arremate em
`financial_income` (adiado, decisão do dono); backfill histórico de
adesão/seller_adhesion do sistema legado (Base44); qualquer mudança na
regra de reconhecimento de receita da DIR-7; qualquer mudança em
`finalizeAuctionCore.js`/`commission_records`.
**Regras fixas:** nenhuma além da DIR-5 a DIR-12.
**Status:** CONCLUÍDA (escopo autorizado). PR ainda não mergeada nesta
sessão — commit direto na branch de trabalho. Comissão de leilão e
backfill histórico de adesão ficam pendência à parte, sem diretiva
própria. Ver `REL-13`.

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
   idempotente por `sale_id`).
3. **Correção de escopo, mesma diretiva, mesmo dia:** o dono viu o card de
   depósito isolado e disse explicitamente "eu quero tudo, tudo, tudo" —
   um número somando depósito + venda bruta de Loja/PDV + venda bruta de
   leilão, comparável ao que via no Painel de Alavancagem (rede própria).
   Trocado o card único "Depósitos em Carteira Digital" por um grupo de 3
   cards: **"Volume Financeiro Total"** (depósito + venda bruta, em
   destaque), e dois cards de detalhe ao lado ("— Depósitos em carteira" e
   "— Venda bruta (Loja + Leilão)"). Tooltip de cada um deixa claro que
   isto é VOLUME, não receita — "Faturamento Total" continua intacto,
   sem depósito nem valor bruto, porque alimenta o cálculo de imposto do
   Simples Nacional (`src/lib/simplesNacional.js`) e não pode misturar.
**Fora do escopo / proibido:** mudar a regra de reconhecimento de receita
da DIR-7 (depósito e venda bruta continuam fora do "Faturamento Total");
backfill histórico de adesão/seller_adhesion legado (mesma pendência da
DIR-13, ainda sem decisão).
**Regras fixas:** nenhuma além da DIR-5 a DIR-13.
**Status:** CONCLUÍDA. Migration aplicada manualmente pelo dono no SQL
Editor e confirmada por consulta direta: `comissao_loja` 33 linhas/
R$ 1.317,56 + `comissao_leilao` 11 linhas/R$ 49,61 = **R$ 1.367,17** de
Faturamento Total. Cards de Volume Financeiro Total commitados no código.
Ver `REL-14`.
