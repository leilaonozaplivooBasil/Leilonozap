# RELATÓRIOS DE EXECUÇÃO — Leilão NoZap

> Registro **append-only** do resultado real de cada diretiva executada.
> Formato fixo: `docs/PADRAO_DIRETIVAS.md`. Cada relatório cita o `DIR-N`
> que autorizou o trabalho — nunca existe relatório sem diretiva
> correspondente em `docs/HISTORICO_DIRETIVAS.md`.

---

## REL-1 — Execução da DIR-1

**Data:** 21/08/2026.
**Branch:** `claude/project-structure-analysis-r1prad` (leitura); alvo da
auditoria: `openai/catalog-status-sync` (PR #86) e
`openai/catalog-status-sync-preview` (PR #87).
**Commit(s):** nenhum de código — só documentação (`docs/CLAUDE_HANDOFF.md`
seção 11).
**O que foi feito:** verificação de que as branches/PRs existiam de fato
(antes de confiar no prompt recebido); comparação de diff entre `main`, PR
#86 e PR #87; achado crítico fora do escopo original (admin fake por
hostname `.vercel.app`); causa-raiz das 3 regressões (checkbox, jornada,
etapas) com evidência de arquivo/linha; resposta pros itens D e E (imagem
do produto, etiqueta Melhor Envio) usando só dado já existente.
**O que NÃO foi feito / blockers:** achado C (causa exata do "Erro ao
atualizar etapa da entrega") não confirmado — falta acesso à Edge Function
`preview-api` e ao projeto Supabase `preview-staging`.
**Testes:** não aplicável (rodada somente leitura).
**Build:** não aplicável.
**Confirmação de escopo:** nenhum arquivo de código foi alterado nesta
rodada — só leitura e comparação. Confirmado por `git status` limpo antes
da publicação da auditoria.
**Publicado em:** comentário nas PRs #86 e #87 + `docs/CLAUDE_HANDOFF.md`
seção 11.
**Status final:** CONCLUÍDA.

---

## REL-2 — Execução da DIR-2

**Data:** 21/08/2026.
**Branch:** `openai/catalog-status-sync-preview` (PR #87).
**Commit(s):** `5689c588`.
**O que foi feito:**
1. `select.jsx` revertido por completo ao primitive puro do Radix.
2. Vocabulário de status PT↔EN resolvido localmente em
   `CatalogOrdersAdmin.jsx` (`statusParaSelect`), sem tocar o primitive.
3. Admin fake por hostname removido; harness agora exige também a variável
   de ambiente `VITE_PREVIEW_STAGING=true`.
4. JWT hardcoded do harness removido; unificado com a chave que
   `supabaseClient.js` já resolve pro mesmo projeto de staging.
5. Imagem real do produto (`order.product_image`) no card de conferência,
   pedido de 1 item.
6. Toast de erro do checklist passou a mostrar `error.message` real.
7. Bloco de etiqueta Melhor Envio reforçado visualmente (dado já existente
   em `raw_base44.melhor_envio`).
**O que NÃO foi feito / blockers:**
- Edge Function `preview-api` não foi lida nem editada — sem acesso ao
  projeto Supabase `preview-staging`. Se o 401 persistir depois das
  variáveis de ambiente configuradas, o problema está do lado da função.
- Não confirmado que a unificação de chave (item 4) fecha o 401 sozinha —
  correção fundamentada, não testada de ponta a ponta.
- 3 variáveis de ambiente (`VITE_PREVIEW_STAGING`,
  `VITE_PREVIEW_SUPABASE_URL`, `VITE_PREVIEW_SUPABASE_ANON_KEY`) precisam
  ser configuradas na Vercel pela OpenAI — documentadas no comentário no
  fim de `src/api/supabaseClient.js`; sem acesso pra configurá-las.
**Testes:** 219/219.
**Build:** exit 0.
**Confirmação de escopo:** só arquivos dentro do escopo autorizado foram
tocados (`select.jsx`, `CatalogOrdersAdmin.jsx`, `OrderItemsChecklist.jsx`,
`plataformaClient.js`, `supabaseClient.js`) — todos em
`openai/catalog-status-sync-preview`. `main`, produção, Supabase de
produção e Vercel Production não foram tocados.
**Publicado em:** comentário no PR #87 (`5376578505`) +
`docs/CLAUDE_HANDOFF.md` seção 11.1 + `docs/DIARIO.md`.
**Status final:** PARCIAL — implementação concluída, validação final
bloqueada pela configuração de ambiente que só a OpenAI pode aplicar.

---

## REL-3 — Execução da DIR-3

**Data:** 21/08/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**Commit(s):** `0decf585`.
**O que foi feito:** criados `docs/DIRETIVA_ATUAL.md`,
`docs/HISTORICO_DIRETIVAS.md` (com DIR-1 e DIR-2 retroativas) e
`docs/ARQUITETURA.md`; MAPA de `docs/CLAUDE_HANDOFF.md` atualizado pra
indexar os 3 arquivos novos.
**O que NÃO foi feito / blockers:** nenhum — escopo cumprido integralmente.
**Testes:** não aplicável.
**Build:** não aplicável.
**Confirmação de escopo:** `git diff` contra `main` mostrou só os 5 arquivos
de documentação, todos com linhas adicionadas — zero linha de código,
config, migração ou variável de ambiente tocada.
**Publicado em:** relatório ao dono, no chat.
**Status final:** CONCLUÍDA.

---

## REL-4 — Execução da DIR-4

**Data:** 21/08/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**Commit(s):** ver commit desta rodada em `git log`.
**O que foi feito:** criado `docs/PADRAO_DIRETIVAS.md` com o template fixo
de diretiva e de relatório de execução; `docs/HISTORICO_DIRETIVAS.md`
reescrito pra conter só a especificação de cada diretiva (sem dado de
execução misturado); criado este arquivo, `docs/RELATORIOS_EXECUCAO.md`,
com os relatórios retroativos REL-1 a REL-3 e este próprio (REL-4);
`docs/DIRETIVA_ATUAL.md` e o MAPA de `docs/CLAUDE_HANDOFF.md` atualizados
pra refletir a nova estrutura.
**O que NÃO foi feito / blockers:** nenhum.
**Testes:** não aplicável.
**Build:** não aplicável.
**Confirmação de escopo:** só arquivos em `docs/` foram tocados —
confirmado por `git diff --stat` antes da publicação. Nenhum código,
banco, produção ou variável de ambiente alterado.
**Publicado em:** relatório ao dono, no chat.
**Status final:** CONCLUÍDA.

---

## REL-5 — Execução da DIR-5

**Data:** 21/08/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**Commit(s):** `183ff96c`.
**O que foi feito:**
1. Localizadas as 3 telas com o padrão exato "Acesso restrito a
   administradores": `Financial.jsx`, `AuditSnapshot.jsx`,
   `CrmClientesTab.jsx` (via `isAdmin` vindo de `Licensing.jsx`).
2. Causa raiz confirmada em `Financial.jsx`: checagem própria, direto do
   localStorage, aceitando só a string exata `'admin'` — excluía
   `super_admin`, o cargo do dono.
3. Achado adicional, mesmo padrão de bug: `GestaoLotes.jsx` já usava o hook
   correto (`useSecureRole`) mas com a lista `['admin']` incompleta.
4. Criada fonte única `src/lib/roles.js` (`ADMIN_ROLES`, `isAdminRole`).
5. `Financial.jsx` migrado pro hook `useSecureRole` (já usado em outras
   telas admin, valida contra o banco) com `ADMIN_ROLES` — removida a
   checagem própria e o fallback morto pra Base44.
6. `GestaoLotes.jsx` corrigido pra `useSecureRole(ADMIN_ROLES, ...)`.
7. `AuditSnapshot.jsx` e `Licensing.jsx` (que já estavam corretos)
   refatorados pra usar a fonte única — comportamento idêntico, só
   consistência.
**O que NÃO foi feito / blockers:**
- ~30 outros arquivos usam `role === 'admin'` sem `super_admin`, mas são
  conferências de UI cosméticas (mostrar/esconder botão, cor de badge)
  dentro de telas já acessíveis — não bloqueiam acesso a página nenhuma.
  Registrado como follow-up, não corrigido agora, pra não expandir o
  escopo deste incidente.
**Testes:** 224/224 (5 novos pra `src/lib/roles.js`); depois do rebase pra
absorver outro trabalho que chegou em `main` no meio da rodada, **334/334**.
**Build:** exit 0.
**Confirmação de escopo:** só os arquivos citados acima foram tocados.
Nenhum banco, produção, variável de ambiente ou regra de negócio
financeira alterada.
**Publicado em:** relatório ao dono, no chat, formato Protocolo-Mestre; PR
#128; `docs/CLAUDE_HANDOFF.md`.
**Status final:** CONCLUÍDA. Dono autorizou ("sim pode fazer"). PR #128
mergeado por squash em `main`, commit `f05532b9`. CI verde. Vercel
confirmou "Deployment has completed" — em produção.

---

## REL-6 — Execução da DIR-6 (Fase 1)

**Data:** 21/08/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**Commit(s):** `643839dc`.
**O que foi feito:**
1. Investigação de fundo do módulo Financeiro inteiro (8 arquivos, ~2150
   linhas) — confirmado que o botão de editar já existia (`ExpenseTable.jsx`),
   mas só na aba "Gastos"; a aba "Dashboard" é 100% visualização agregada,
   sem alvo de edição por linha (a tabela ali é por categoria, não por
   gasto individual).
2. Adicionado atalho "Ver e editar gastos" na aba Dashboard, levando direto
   pra aba onde a edição existe.
3. Achado e corrigido: a auto-detecção de gasto vencido disparava um PATCH
   por gasto a cada refetch da lista, inclusive pra gastos já marcados numa
   carga anterior (faltava `invalidateQueries`). Extraída a decisão pra
   `src/lib/financeiroVencidos.js` (função pura) com guarda por sessão.
4. Decisão de arquitetura pra Fase 2 apresentada e aprovada pelo dono:
   livro-razão de entradas (tabela nova espelhando `financial_expenses`),
   não cálculo ao vivo — critério: auditabilidade pra uso profissional
   (contabilidade), não só visualização pra leigo.
**O que NÃO foi feito / blockers:** Fase 2 (unificar receita real) e Fase 3
(automação de conciliação) não iniciadas — são diretivas futuras.
**Testes:** 341/341 (7 novos pra `encontrarVencidosNaoMarcados`).
**Build:** exit 0.
**Confirmação de escopo:** só `Financial.jsx` (mais os 2 arquivos novos)
tocados. Nenhuma tabela nova, nenhum dado de receita real, nenhuma
produção alterada.
**Publicado em:** relatório ao dono, no chat, formato Protocolo-Mestre; PR
#130; `docs/CLAUDE_HANDOFF.md`.
**Status final:** CONCLUÍDA. Antes da aprovação, foi preciso destravar o
Preview de verdade pro dono conferir a mudança logado com a própria conta
(achado à parte, registrado abaixo). Dono conferiu o botão "Ver e editar
gastos" ao vivo no Preview e autorizou ("agora pode deoplar"). PR #130
mergeado por squash em `main`, commit `5fb996f2`. CI verde
(lint · build · testes) antes do merge.

**Achado à parte, fora do escopo da DIR-6 — Preview do projeto não logava:**
o Preview da própria PR #130 (e de toda PR deste projeto) retornava "Config
do servidor ausente" ao tentar logar, porque a variável
`SUPABASE_SERVICE_ROLE_KEY` na Vercel estava configurada só pro ambiente
"Production" — faltava marcar também "Preview". `SUPABASE_URL` já estava
correta nos dois ambientes. O dono corrigiu isso direto no painel da Vercel
(`Settings → Environment Variables → SUPABASE_SERVICE_ROLE_KEY → Edit →
marcar Preview`) e redeployou o Preview da branch; depois disso o login real
passou a funcionar em qualquer Preview deste projeto, não só na PR #130.
Também identificado, sem relação com o financeiro: o projeto tem SSO
Protection da própria Vercel ativado em cima de todo link `.vercel.app`
(`all_except_custom_domains`) — quem não é membro do time da Vercel precisa
de um link de acesso temporário (`get_access_to_vercel_url`) pra abrir um
Preview bruto.

---

## REL-7 — Execução da DIR-7 (Fase 2)

**Data:** 27/08/2026.
**Branch:** `claude/project-structure-analysis-r1prad` (PR #132).
**Commit(s):** `7077fdbd`.
**O que foi feito:**
1. Análise do Nibo (Conciliador Open Finance) e ContaAzul, a pedido do dono,
   pra decidir o desenho de centro de custo e do que conta como receita.
2. Migration `financial_income` (livro-razão de receita, gravado no momento
   da confirmação) + coluna `cost_center` em `financial_expenses`.
3. Regra de reconhecimento de receita fechada com o dono, e VERIFICADA no
   código antes de implementar (não foi suposição): só comissão de venda
   liquidada (Loja/Leilão/PDV) e taxa sem repasse (adesão, plano parceiro)
   contam como receita. Depósito de saldo/carteira NÃO conta — confirmado
   lendo `settleAuctionWithBalance.js` (arremate consome `saldo_disponivel`,
   o mesmo saldo que `wallet_deposit` credita) e o comentário de
   `creditWalletDeposit` em `mpWebhook.js` — contar o depósito E a comissão
   da compra feita com ele depois contaria o mesmo dinheiro duas vezes.
4. Gravação automática (best-effort, nunca desfaz um pagamento já
   confirmado) em 5 pontos: `mpWebhook.js` (loja, arremate/genérico,
   adesão, adesão de vendedor, plano parceiro), `settleAuctionWithBalance.js`
   (arremate pago com saldo), `pdvSettle.js` (venda de balcão).
5. UI: centro de custo no formulário de gasto; aba "Receitas" (listagem,
   sem lançamento manual nesta fase); aba "Visão Geral" cruzando receita x
   despesa paga por centro de custo.
**O que NÃO foi feito / blockers:** conciliação bancária via Open Finance
(decisão adiada pro dono pra Fase 3, junto com automação via webhook do
Mercado Pago já existente — sem custo de API externa); nenhum backfill de
receita histórica (tabela nasce vazia, só grava daqui pra frente).
**Testes:** 377/377.
**Build:** exit 0.
**Lint:** `npx eslint` nos arquivos alterados, sem erros.
**Confirmação de escopo:** só os arquivos citados acima e a migration nova
foram tocados. Nenhum dado de produção alterado nesta rodada — a migration
só roda quando a PR for mergeada em `main` (workflow
`deploy-migrations.yml`, automático).
**Publicado em:** relatório ao dono, no chat, formato Protocolo-Mestre; PR
#132.
**Status final:** CONCLUÍDA. Dono conferiu no Preview e autorizou ("pode
fazer"). PR #132 mergeado por squash em `main`, commit `b38b84df`, CI verde
antes do merge.

---

## REL-8 — Execução da DIR-8

**Data:** 27/08/2026.
**Branch:** `claude/project-structure-analysis-r1prad` (mesma PR #132 —
achado reportado enquanto o dono conferia a REL-7 no Preview).
**Commit(s):** `bc7ff1cd`.
**O que foi feito:**
1. Causa raiz confirmada por busca no repositório inteiro: `expense_type:
   'fixo'` e `recurring_day` nunca foram lidos por nenhum código — não
   existia geração automática de lançamento mensal. Achado a partir do
   print da Aline (Consórcio Nacional Volkswagen, vencimento 21/07/2026,
   uma linha só, "Vencido há 37 dia(s)").
2. Migration: coluna `recurring_group_id` em `financial_expenses`, com
   backfill das linhas `fixo` já existentes (cada uma vira dona do próprio
   grupo).
3. Função pura testável `mesesFaltandoParaGastoFixo`
   (`api/_lib/gastosFixosRecorrentes.js`) — decide quais meses faltam pra
   um gasto fixo, do mês seguinte ao último vencimento conhecido até o mês
   atual, com teto de segurança de 24 meses.
4. Cron diário novo `api/functions/gerarGastosFixos.js` (registrado em
   `vercel.json`, mesmo padrão dos outros crons do projeto) — por grupo de
   recorrência, gera um lançamento "pendente" por mês que faltar. Um gasto
   esquecido há 3 meses passa a aparecer como 3 linhas "vencido", não uma
   só com contagem de dias.
**O que NÃO foi feito / blockers:** gasto "parcelado" não foi tocado (lógica
própria, fora do escopo); nenhuma geração de receita (isso é `financial_income`,
DIR-7); o cron ainda não rodou em produção — só roda depois do merge.
**Testes:** 384/384 (7 novos pra `mesesFaltandoParaGastoFixo`).
**Build:** exit 0.
**Lint:** sem erros nos arquivos alterados.
**Confirmação de escopo:** só os arquivos citados acima e a migration nova
foram tocados. Nenhum dado de produção alterado — a migration e o cron novo
só entram em vigor depois do merge em `main`.
**Publicado em:** relatório ao dono, no chat, formato Protocolo-Mestre; PR
#132 (mesma PR da REL-7).
**Status final:** CONCLUÍDA. Mesma PR #132, mergeado por squash em `main`,
commit `b38b84df`, CI verde antes do merge.

---

## REL-9 — Execução da DIR-9

**Data:** 27/08/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**Commit(s):** ver commit desta rodada em `git log`.
**O que foi feito:**
1. Botão "+ Novo" ao lado de Centro de Custo em `ExpenseFormModal.jsx`,
   mesmo padrão já usado em Categoria — alterna pra um campo de texto
   livre; ao editar um gasto com centro de custo fora da lista fixa, o
   formulário já abre no modo customizado.
2. `FinancialOverview.jsx` corrigido pra listar, na tabela por centro de
   custo, qualquer valor realmente lançado (união da lista fixa
   `src/lib/costCenters.js` com os valores usados em `expenses`/`income`) —
   sem isso, um centro de custo digitado como "+ Novo" salvava no gasto mas
   sumia da Visão Geral.
**O que NÃO foi feito / blockers:** nenhuma tela de administração de
centros de custo (renomear/excluir) — fora do escopo pedido; `financial_income`
não ganhou formulário manual (continua só automático, por decisão da DIR-7).
**Testes:** 384/384 (sem teste novo — mudança de UI/apresentação, coberta
pelos testes de build/lint já existentes; a lógica pura de agrupamento por
centro de custo em `FinancialOverview.jsx` é derivação direta de dados já
testados via `financeiroVencidos`/`gastosFixosRecorrentes`).
**Build:** exit 0.
**Lint:** sem erros nos arquivos alterados.
**Confirmação de escopo:** só `ExpenseFormModal.jsx` e
`FinancialOverview.jsx` tocados. Nenhum banco, produção ou regra de negócio
financeira alterada.
**Publicado em:** relatório ao dono, no chat; PR #134.
**Status final:** CONCLUÍDA. Dono conferiu no Preview e autorizou
("pode publicar"). PR #134 mergeado por squash em `main`, commit
`4ebecf54`, CI verde antes do merge.

---

## REL-10 — Execução da DIR-10 (Fase 1)

**Data:** 27/08/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**Commit(s):** ver commit desta rodada em `git log`.
**O que foi feito:**
1. Investigação de fundo do CRM inteiro (`CrmClientesTab.jsx`,
   `crmUnifiedCustomers.js`, `Licensing.jsx`) — 5 causas raiz confirmadas
   por leitura de código, sem suposição (detalhe completo no chat ao
   dono).
2. `isSuperAdmin` (`currentUser.role === 'super_admin'`) passa a pular o
   filtro de rede inteiro em `CrmClientesTab.jsx` — vê todos os `AppUser`,
   `CatalogSale` e `Auction` da plataforma. Quem não é super_admin continua
   vendo só a própria rede (`getNetworkDescendantIds`), como o dono
   confirmou que precisa continuar sendo.
3. Pra visão de rede (não super_admin), o filtro de venda passou a olhar
   `licensee_id`/`anchor_id`/`seller_id`/`owner_id` (união), não só
   `licensee_id` — mesma constatação já usada em `LicenseeOrders.jsx`.
4. "Volume em Negociação" trocado de uma chamada a
   `/api/functions/adminDataProxy` (função inexistente, sempre 404) pro
   caminho genérico `plataforma.entities.Negotiation.list(...)`.
5. "Produtos em Estoque" trocado de `Product.list('-created_date', 500)`
   (sem filtro, só os 500 mais recentes) pra
   `Product.filter({catalog_active:true}, '-created_date', 5000)` — mesmo
   filtro usado na vitrine pública (`Catalog.jsx`).
6. "Arrematantes" trocado de checar `arrematante_context?.enabled` (coluna
   TEXT tratada como objeto — sempre falso, ninguém escreve esse campo) pra
   promover a 'arrematante' com dado real (`Auction.winner_id`), só quando
   nenhum papel mais específico já se aplica.
**O que NÃO foi feito / blockers:**
- Persistência automática em `customers` a partir de venda/arremate (é só
  calculado na tela ainda) — Fase 2, diretiva própria.
- Unificação da tabela `sellers` (cadastro manual) com o papel "Vendedor"
  calculado — continuam desconectados, Fase 2.
- RLS do Supabase — não confirmável só por código nesta sessão (sem acesso
  direto ao painel); se os cards continuarem zerados mesmo depois desta
  correção, é o próximo lugar a olhar (`customers`, `sellers`,
  `negotiations` sem policy de leitura versionada nas migrations).
**Testes:** 398/398 (sem teste novo — mudança de lógica de agregação/UI,
sem função pura nova isolável; comportamento validado por leitura de
código e build).
**Build:** exit 0.
**Lint:** sem erro novo introduzido (10 erros pré-existentes no arquivo,
de antes desta rodada, não travam o CI — `continue-on-error: true` no
step de lint, ver `.github/workflows/ci.yml`).
**Confirmação de escopo:** só `crmUnifiedCustomers.js` e
`CrmClientesTab.jsx` tocados. Nenhum banco, produção ou regra de negócio
financeira alterada.
**Publicado em:** relatório ao dono, no chat; PR #145.
**Status final:** CONCLUÍDA. Dono conferiu no Preview, logado como
super_admin, e autorizou o merge ("pode"). PR #145 mergeado por squash em
`main`, commit `67039789`, CI verde antes do merge.

**Correções feitas durante a conferência do dono no Preview, mesma PR
(#145):**
1. "Valor de Mercado em Estoque" (R$ 4,89 milhões) usava
   `selling_price_retail` (preço de venda ao consumidor, com a margem
   inteira embutida) — trocado por `cost_price` real; card renomeado pra
   "Valor Investido em Estoque".
2. "Faturamento Total" (R$ 3,33 milhões) tinha o MESMO erro de conceito já
   corrigido no Financeiro (DIR-7): somava o valor cheio de cada
   venda/arremate (`total_spent`), não a comissão real da empresa. Pro
   `super_admin`, passou a somar `financial_income` (mesma fonte do
   Financeiro); pra visão de rede, o card virou "Volume Transacionado"
   (rótulo honesto — ainda não existe rateio de comissão por rede).
3. Pedido do dono ("painel precisa ser intuitivo"): todo card (~20) ganhou
   um ⓘ (`StatInfoTooltip`, funciona em hover e em toque) explicando o que
   o número significa e de onde vem.

---

## REL-11 — Execução da DIR-11

**Data:** 28/08/2026.
**Branch:** `claude/project-structure-analysis-r1prad` (mesma PR #145).
**Commit(s):** ver commit desta rodada em `git log`.
**O que foi feito:** migration única e idempotente
(`20260828_backfill_financial_income.sql`) que popula `financial_income`
com o histórico real de `catalog_sales` — MESMA regra já em vigor no
código ao vivo (DIR-7), sem inventar critério novo:
1. Comissão de venda liquidada (`commission_total`, nunca o valor cheio) —
   qualquer `kind` que não seja depósito/passaporte/frete/reposição/taxa,
   agrupado em "Leilões" (kind='arremate') ou "Loja Virtual" (todo o
   resto — inclui `produto`, PDV, sync externo).
2. Taxa sem repasse a terceiro (`adesao`/`seller_adhesion`/`partner_plan`)
   — valor cheio, centro de custo Operacional.
`NOT EXISTS` por `sale_id` garante que rodar mais de uma vez (ou coexistir
com o hook ao vivo) nunca duplica uma linha.
**O que NÃO foi feito / blockers:** depósito de saldo/carteira/operação,
passaporte, frete de vendedor e reposição de estoque continuam FORA do
backfill — mesma regra da DIR-7, não foi reaberta; venda paga sem
`commission_total` preenchido (dado histórico incompleto, se existir) não
entra — não é seguro inventar o valor da comissão retroativamente.
**Testes:** 420/420 (migration SQL pura, sem lógica JS nova — validação é
de leitura/revisão, não de teste automatizado).
**Build:** exit 0.
**Confirmação de escopo:** só a migration nova foi criada. Nenhum dado de
produção alterado nesta rodada — só roda quando a PR for mergeada em
`main` (workflow `deploy-migrations.yml`, automático).
**Publicado em:** relatório ao dono, no chat; PR #145 (mesma da DIR-10).
**Status final:** CONCLUÍDA. Dono conferiu no Preview e autorizou o merge
da PR #145 ("pode"). PR #145 mergeado por squash em `main`, commit
`67039789`, CI verde antes do merge.

**Achado crítico durante a conferência pós-merge — o deploy automático de
migração nunca funcionou:** o dono reportou "Faturamento Total: R$ 0,00"
mesmo depois do merge. Investigação de fundo (3 ângulos independentes —
logs de runtime, comentários do bot oficial do Supabase nas PRs, histórico
do próprio workflow) confirmou por evidência direta:

1. `.github/workflows/deploy-migrations.yml` falhou nas 9 execuções da sua
   história inteira — `supabase db push` nunca rodou uma vez. As 8
   primeiras (21–28/08) morriam por rate limit no `supabase/setup-cli`
   (`version: latest`); um fix de 29/08 (commit `8f93430a`) resolveu isso,
   mas a execução seguinte (run #9, disparada pelo merge da PR #145,
   30/08) passou dessa etapa e morreu na seguinte, `supabase link`, com
   "Invalid access token format" — o segredo `SUPABASE_ACCESS_TOKEN` no
   GitHub não está no formato válido (`sbp_...`).
2. Achado um arquivo `supabase/migrations/LEIA-ME.md` (do próprio time,
   não desta sessão) documentando um INCIDENTE REAL anterior: as
   migrations da DIR-7/DIR-8 (`financial_income`, `cost_center`,
   `recurring_group_id`) usavam nomes com sufixo de letra
   (`20260827b_...`, `20260827c_...`) — o Supabase CLI **ignora
   silenciosamente** qualquer migration cujo nome não seja só dígitos.
   Resultado: código em produção desde 27/08 gravando em tabela/coluna
   inexistentes, sem erro visível (o helper de receita é best-effort de
   propósito), até uma conferência manual em 28/08 achar e colar o SQL na
   mão. Já corrigido antes desta rodada — registrado aqui só porque a
   investigação o revelou.
3. A integração nativa do GitHub App do Supabase (comentários de
   "supabase[bot]" nas PRs) atua EXCLUSIVAMENTE como "Preview Branches" —
   nunca aplica nada em produção/main. Não existe nenhum mecanismo
   automático alternativo — a única coisa que já funcionou, quando
   funcionou, foi colar SQL manualmente no SQL Editor.
4. A migration do backfill desta rodada (`20260828_backfill_financial_income.sql`,
   nome corretamente formatado, sem sufixo de letra) NÃO estava na lista
   de "já aplicadas manualmente" do LEIA-ME.md — ou seja, nunca tinha
   rodado de fato, apesar do merge ter acontecido horas antes.
**Resolução:** dono aplicou o SQL da migration manualmente no SQL Editor
do Supabase (30/08/2026), confirmado por consulta direta:
`select count(*), sum(amount) from financial_income` → **33 linhas,
R$ 1.317,56**. Financeiro/CRM já refletem o número real.
**Pendência aberta, fora do escopo desta diretiva:** corrigir o segredo
`SUPABASE_ACCESS_TOKEN` no GitHub (gerar token novo em
`supabase.com/dashboard/account/tokens`, atualizar em `Settings → Secrets
and variables → Actions`) — depende só do dono, registrado em
`docs/DIRETIVA_ATUAL.md`. Enquanto isso não for feito, qualquer migration
nova precisa ser conferida manualmente (`supabase/migrations/LEIA-ME.md`
ensina como). Também acheu-se, sem relação com este trabalho, uma
migration de outra frente (`20260828_financial_expenses_payment_account.sql`)
com o mesmo status "não confirmado" — não foi tocada por não ser desta
diretiva.

---

## REL-12 — Execução da DIR-12

**Data:** 30/08/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**Commit(s):** ver commit desta rodada em `git log`.
**O que foi feito:**
1. Dono reportou "Faturamento Total: R$ 0,00" no CRM tanto no Preview
   quanto em produção (`leilaonozap.net`), mesmo depois do backfill da
   DIR-11 já confirmado direto no banco (33 linhas, R$ 1.317,56). Como o
   código do card já estava correto (confirmado por leitura, sem mudança
   necessária) e o dado real já existia no banco, a causa só podia estar
   entre a tabela e o client.
2. Achado por leitura de código: `20260827b_financial_income_cost_center.sql`
   liga `enable row level security` em `financial_income` mas nunca cria
   política de leitura. Comparação com as outras ~45 tabelas do schema
   inicial (todas com o mesmo `enable row level security` sem política
   rastreada em migration) confirma o padrão do projeto: a política de
   leitura de toda tabela antiga foi aplicada manualmente, fora do
   controle de versão, quando o banco foi montado a partir do Base44 — só
   3 migrations do repositório inteiro criam política explícita
   (`system_logs`, `contrato_assinaturas`, `lotes_recebidos`/oportunidades).
   `financial_income`, por ter nascido só em 27/08 e só ter sido aplicada
   manualmente (mesmo incidente do nome com sufixo de letra), nunca passou
   por esse passo. Sem política, PostgREST devolve lista vazia pro client
   (chave anon/publishable) sem erro nenhum — sintoma idêntico ao já
   documentado em `20260805_system_logs_politica_insert.sql` pra escrita.
3. Migration nova (`20260830_financial_income_rls_select.sql`) criando
   `CREATE POLICY financial_income_select ... FOR SELECT USING (true)`,
   mesmo padrão já usado em `contrato_assinaturas_select`. Escrita
   continua exclusiva do `service_role` (`api/_lib/financialIncome.js`) —
   não foi aberta política de INSERT/UPDATE/DELETE pro client.
4. `supabase/migrations/LEIA-ME.md` ganhou uma seção nova documentando essa
   terceira causa de "migração aplicada mas nada aparece" (RLS sem
   política), com a query de diagnóstico (`select * from pg_policies
   where tablename = ...`) e a regra pra toda tabela nova a partir de
   agora: sempre criar a política de leitura na MESMA migration que cria a
   tabela.
**O que NÃO foi feito / blockers:** não foi possível confirmar via consulta
direta ao banco (`select * from pg_policies where tablename =
'financial_income'`) que a política realmente estava ausente — a conclusão
é por leitura de código e por precedente do próprio repositório, não por
acesso direto ao Supabase nesta sessão. Antes de aplicar a migration,
recomendado rodar essa consulta pra confirmar (deve vir vazia); depois de
aplicar, deve aparecer 1 linha com `cmd = 'SELECT'`.
**Testes:** sem teste automatizado novo (migration SQL pura, mesma
categoria da DIR-11).
**Build:** não aplicável (nenhum arquivo JS/TS alterado).
**Confirmação de escopo:** só a migration nova e `LEIA-ME.md` foram
tocados. Nenhuma outra tabela, nenhuma regra de negócio e nenhum código de
aplicação foi alterado — o cálculo do "Faturamento Total" (DIR-10) e a
regra de reconhecimento de receita (DIR-7) continuam exatamente como
estavam.
**Publicado em:** relatório ao dono, no chat.
**Status final:** PARCIAL — migration escrita e commitada, mas depende do
dono aplicar manualmente no SQL Editor do Supabase (pipeline automático
ainda quebrado, mesma pendência da DIR-11) e confirmar. Instruções e SQL
de verificação passados ao dono no chat.

**Confirmação em produção, mesmo dia:** dono aplicou a política no SQL
Editor e confirmou (`select * from pg_policies where tablename =
'financial_income'` → 1 linha, `cmd = SELECT`, `qual = true`). CRM voltou a
mostrar "Faturamento Total: R$ 1.317,56" (Preview e produção). DIR-12
efetivamente CONCLUÍDA.

---

## REL-13 — Execução da DIR-13

**Data:** 30/08/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**Commit(s):** ver commit desta rodada em `git log`.
**O que foi feito:**
1. Dono pediu a origem exata dos R$ 1.317,56 depois da DIR-12. A consulta
   (`select description, category, cost_center, amount, source,
   received_date from financial_income order by received_date desc,
   amount desc`) mostrou as 33 linhas — TODAS categoria `comissao_loja`
   (Loja Virtual), nenhuma `comissao_leilao` nem `taxa_adesao`/
   `plano_parceiro`, mesmo com ~55 leilões arrematados e taxas de adesão
   reais cobradas. Isso levantou a suspeita de receita real fora do
   relatório, não só coincidência.
2. Workflow de investigação com 3 agentes independentes (leilão, taxas,
   hook ao vivo) + síntese, todos com leitura de código real (sem
   suposição). Achados:
   - **Leilão:** a comissão real (5% indicador + 25% retida) é calculada e
     paga de verdade a cada martelo, mas em `commission_records`
     (`finalizeAuctionCore.js`) — nunca ligada a `financial_income`.
     `catalog_sales.commission_total` é zerado DE PROPÓSITO pra arremate
     (`storeFulfill.js:54`), pra não aplicar por engano a comissão de 30%
     da Loja. Não é bug — é uma decisão de escopo nunca tomada.
   - **Taxas de adesão/plano parceiro:** até ~21–28/08/2026 não existia
     nem o caminho técnico pra essas cobranças chegarem em `catalog_sales`
     (o PIX do Plano Parceiro dava 404 em produção — `createPartnerPlanPix.js`).
     A receita real dessas categorias historicamente mora em tabelas
     isoladas de qualquer relatório financeiro (`partner_plan_purchases`
     por ativação manual, `contrato_assinaturas.valor_aporte`, saldo de
     vendedor no sistema legado Base44). O caminho novo (`mpWebhook.js`,
     linhas 580/585/590) já chama `registrarReceita` corretamente — só não
     tem histórico anterior pra recuperar por backfill simples.
   - **Hook ao vivo — achado mais urgente, lacuna ATIVA:** 4 caminhos de
     pagamento reais, já em produção, nunca chamavam `registrarReceita`:
     PDV pago em dinheiro/saldo de comissão/saldo de operação
     (`createPdvOrder.js`), compra na Loja paga com saldo de comissão do
     próprio cliente (`payWithBalance.js`), venda do canal Livoo
     (`livooWebhook.js`), e aprovação manual de pedido
     (`updateOrderStatus.js` — pior caso, não calcula comissão nem baixa
     estoque). Isso explica por que nada novo entrou em `financial_income`
     desde 25/08 mesmo com venda real acontecendo.
3. Dono decidiu, via pergunta direta: (a) comissão de leilão em
   `financial_income` — **não mexer agora**; (b) `updateOrderStatus.js` —
   **bloquear e redirecionar pro fluxo real**.
4. Implementado:
   - `createPdvOrder.js`, `payWithBalance.js`, `livooWebhook.js` — chamada
     a `registrarReceita` adicionada no mesmo ponto em que a comissão já é
     calculada e gravada em `commission_total`, mesmo padrão de
     `pdvSettle.js`/`settleAuctionWithBalance.js`.
   - `updateOrderStatus.js` — bloqueia (`403`) a transição pra
     `status: 'paid'` quando a venda ainda não estava paga, mesmo
     princípio do PONTO 115 (`entityWrite.js`). Mensagem de erro explica o
     porquê e aponta o caminho real.
**O que NÃO foi feito / blockers:**
- Comissão de leilão em `financial_income` — adiado por decisão do dono,
  sem diretiva própria ainda.
- Backfill histórico de adesão/seller_adhesion do sistema legado (Base44)
  — teria que "traduzir" schema de tabelas com semântica diferente
  (`partner_plan_purchases`, `contrato_assinaturas`, saldo de vendedor);
  não autorizado nesta diretiva.
- **Efeito colateral a observar:** `CatalogOrdersAdmin.jsx` tem um dropdown
  manual que deixa o admin escolher "Pago" pra um pedido "Aguardando
  Pagamento" (linha ~982, `handleSaveOrder`) — com o bloqueio novo, essa
  ação específica passa a ser recusada com a mensagem de erro acima. Se
  esse botão for usado de verdade pra confirmar pagamento fora do sistema
  (ex.: transferência bancária manual), avisar — precisa de uma rota nova
  que calcule comissão e registre receita corretamente, não só destravar
  o PATCH de novo.
**Testes:** 420/420 (sem teste novo — mudança é integração com serviço
externo/gateway, não função pura isolável).
**Build:** exit 0.
**Confirmação de escopo:** só os 4 arquivos citados e a documentação foram
tocados. Nenhuma migration nova, nenhuma mudança na regra de reconhecimento
de receita (DIR-7), nenhuma mudança em `finalizeAuctionCore.js`/
`commission_records`.
**Publicado em:** relatório ao dono, no chat.
**Status final:** CONCLUÍDA (escopo autorizado). Comissão de leilão e
backfill histórico de adesão ficam como pendência separada, sem diretiva
própria, aguardando decisão futura do dono.

---

## REL-14 — Execução da DIR-14

**Data:** 30/08/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**Commit(s):** ver commit desta rodada em `git log`.
**O que foi feito:**
1. Depois de ver "Faturamento Total: R$ 1.317,56" e perguntar por que não
   incluía o leilão nem os depósitos, o dono confirmou via pergunta direta
   que queria a comissão de leilão incluída agora (reabrindo a decisão da
   DIR-13) e, em mensagem separada, pediu visibilidade do volume de
   depósito em carteira digital no CRM.
2. `api/_lib/finalizeAuctionCore.js` (`reterFatiaDaRede`) — chamada a
   `registrarReceita` adicionada logo após o crédito confirmado na conta
   oficial (`rpc/credit_commission`), categoria `comissao_leilao`, cost
   center `Leilões`, `saleId: auction.id`. Daqui pra frente, todo martelo
   que retém fatia da rede grava em `financial_income` automaticamente.
3. Migration de backfill
   (`20260830140000_backfill_leilao_retido.sql`) puxando
   `commission_records` (`sale_type='leilao' and role='leilao_retido'`)
   pra `financial_income`, idempotente por `sale_id` — recupera os ~55
   leilões já arrematados antes da correção.
4. Novo card "Depósitos em Carteira Digital" no CRM
   (`CrmClientesTab.jsx`/`CrmStatsCards.jsx`): soma `wallet_deposit` +
   `commission_deposit` + `operacao_deposit` do escopo (rede ou
   plataforma inteira, conforme super_admin), excluindo status
   pendente/cancelado/estornado. Tooltip explícito: "NÃO é receita da
   empresa — só vira receita quando esse saldo for gasto numa compra".
   Fica como card separado, nunca somado ao "Faturamento Total" — a regra
   de reconhecimento de receita da DIR-7 não mudou.
**O que NÃO foi feito / blockers:** backfill histórico de
adesão/seller_adhesion do sistema legado continua fora de escopo (mesma
pendência da DIR-13, sem decisão do dono ainda).
**Testes:** 420/420.
**Build:** exit 0.
**Confirmação de escopo:** `finalizeAuctionCore.js`, a migration nova, e os
dois arquivos do CRM foram tocados. Nenhuma mudança na regra de
reconhecimento de receita (depósito continua fora do Faturamento Total),
nenhuma mudança na comissão paga ao indicador (`leilao_indicador`, 5%,
continua exatamente igual).
**Publicado em:** relatório ao dono, no chat.
**Status final:** PARCIAL — código e migration commitados e empurrados,
mas depende do dono aplicar a migration manualmente no SQL Editor
(pipeline automático ainda quebrado) e confirmar, igual DIR-11/DIR-12.

**Confirmação em produção, mesmo dia:** dono aplicou a migration no SQL
Editor. Diagnóstico direto no banco confirmou 11 linhas em
`commission_records` (`sale_type='leilao', role='leilao_retido'`,
R$ 49,61) e, depois do backfill, `financial_income` passou a ter
`comissao_loja` 33 linhas/R$ 1.317,56 + `comissao_leilao` 11 linhas/
R$ 49,61 = **R$ 1.367,17**. (Nota: a mensagem "Success. No rows returned"
do SQL Editor do Supabase é padrão pra qualquer INSERT/CREATE sem
`RETURNING` — não significa zero linhas afetadas. Interpretação errada
minha na hora, corrigida depois de conferir com `select count(*)`.)

**Correção de escopo, mesmo dia, depois da confirmação acima:** o dono
comparou o "Faturamento Total" (R$ 1.367,17, comissão real) com o "Valor
Total" do Painel de Alavancagem (depósito + compra da própria rede,
R$ 6.173,80) e pediu explicitamente "eu quero tudo, tudo, tudo" — um
número somando depósito + venda bruta de Loja/PDV + venda bruta de leilão,
não só a comissão. Implementado:
1. `CrmClientesTab.jsx` — `volumeVendasBruto` (mesma soma que a rede já via
   como "Volume Transacionado", agora calculada também pra super_admin,
   plataforma inteira) + `depositosCarteira` (já existia) somados em
   `volumeFinanceiroTotal`.
2. `CrmStatsCards.jsx` — troca do card único "Depósitos em Carteira
   Digital" por um grupo de 3: "Volume Financeiro Total" (em destaque) +
   "— Depósitos em carteira" + "— Venda bruta (Loja + Leilão)" como
   detalhe. Tooltip de cada um reforça que é volume, não receita — o
   "Faturamento Total" ganhou uma frase extra no tooltip avisando que é
   ele (não o Volume Financeiro Total) que alimenta o cálculo de imposto
   do Simples Nacional, pra deixar claro por que os dois NUNCA devem ser
   somados.
**Testes:** 420/420 (sem teste novo). **Build:** exit 0.
**Confirmação de escopo:** só os 2 arquivos do CRM tocados nesta correção;
nenhuma mudança na regra de reconhecimento de receita, nenhuma mudança em
`financial_income`/`finalizeAuctionCore.js`.
**Status final:** CONCLUÍDA. Migration confirmada em produção
(R$ 1.367,17). Cards de Volume Financeiro Total commitados e empurrados —
falta o dono conferir visualmente no Preview/produção depois do próximo
deploy.

---

## REL-15 — Execução da DIR-15

**Data:** 30/08/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**Commit(s):** ver commit desta rodada em `git log`.
**O que foi feito:**
1. Dono mandou print do `NetworkOverview.jsx` (Painel de Alavancagem) e
   perguntou por que os números não batiam com o CRM, "qual está certo,
   qual está errado". Investigando a fonte de `total_spent`
   (`src/lib/crmUnifiedCustomers.js`, usada tanto em "Volume Transacionado"
   quanto no "Volume Financeiro Total" da DIR-14), achei que ele soma
   QUALQUER `catalog_sales` do comprador — inclusive `pending_payment` e
   `canceled` — sem checar status nenhum. `NetworkOverview.jsx` já tinha
   isso certo desde a DIR-6 (`isPaga`), então os dois números nunca
   poderiam bater.
2. Corrigido: `total_spent`/`purchase_count` (Loja Virtual/PDV) só somam
   quando o status da venda está no conjunto "já pago" (mesmo `JA_PAGO` já
   usado em `updateOrderStatus.js`/`STATUS_PAGO` de
   `CatalogOrdersAdmin.jsx`, cobrindo os dois idiomas de status que o
   banco mistura). Aplicado nos 3 pontos onde `catalogSales.forEach`
   grava total_spent (conta identificada, avulso já existente, avulso
   novo).
3. Teste novo `tests/crmUnifiedCustomersTotalSpent.test.mjs` (6 casos):
   venda paga soma, pendente não soma, cancelada não soma, status em
   português também soma, mistura paga+pendente só soma a paga, comprador
   avulso com venda pendente fica em zero.
**O que NÃO foi feito / blockers:** o mesmo problema do lado do LEILÃO
(`auctions.forEach` soma `current_price` de QUALQUER `winner_id`, sem
checar pagamento) foi investigado mas NÃO corrigido nesta rodada — achei
que `auctions.order_status` não é atualizado pra `'paid'` quando o
arremate é pago via PIX/cartão (confirmado por leitura: `mpWebhook.js`
nunca faz PATCH em `auctions`, só em `catalog_sales`; só
`settleAuctionWithBalance.js` e o cron `liquidarArrematesPendentes.js`
atualizam `order_status`, e só cobrem o caminho de saldo). Usar
`order_status` como filtro excluiria arremates pagos de verdade por PIX/
cartão — um bug novo, pior que o atual. A venda `catalog_sales`
correspondente ao arremate existe, mas sem FK direta pro `auctions.id`
(só dentro de `raw_base44`, JSON não indexado) — corrigir isso direito
precisa de investigação própria, registrada como pendência na DIR-15/
`docs/DIRETIVA_ATUAL.md`, não forçada sob pressa.
**Testes:** 426/426 (420 + 6 novos). **Build:** exit 0.
**Confirmação de escopo:** só `crmUnifiedCustomers.js` e o teste novo
foram tocados. `auctions.forEach`, `financial_income`,
`finalizeAuctionCore.js` e a regra de reconhecimento de receita (DIR-7)
não foram alterados.
**Publicado em:** relatório ao dono, no chat.
**Status final:** PARCIAL — a parte de Loja Virtual/PDV está corrigida,
testada e commitada; a parte de Leilão fica registrada como pendência
própria, não corrigida por falta de um jeito confiável e seguro de checar
pagamento de arremate ainda.

**Correção de escopo, mesmo dia, depois do deploy:** dono mandou print
mostrando "Venda bruta (Loja + Leilão): R$ 228.496,40" — quantia
impossível (a comissão real de Loja Virtual é R$ 1.317,56; 30% disso não
passa de ~R$ 4.400 de venda bruta). Achei duas causas juntas:
1. O card "Venda bruta" usava `unifiedCustomers.total_spent`
   (`CrmClientesTab.jsx`), que soma TODO `catalog_sales` do comprador sem
   filtrar por `kind` — depósito, adesão de vendedor, plano parceiro e
   passaporte entravam misturados com "venda", além de estarem duplicados
   com o card "Depósitos em carteira" ao lado.
2. Do lado do leilão, somava `current_price` de QUALQUER `winner_id`,
   incluindo os 36 leilões "Plano de Investimento" (`is_investment_plan`,
   R$ 5.000 cada — medido e documentado em `finalizeAuctionCore.js`,
   PONTO 109/123) — que são aporte de investimento, não mercadoria
   vendida, e o próprio motor de comissão do leilão já os exclui por
   regra oficial do dono.
3. Recalculado direto de `networkCatalogSales` (kind `loja`/`produto`,
   status pago) + `networkAuctions` (com `winner_id`, excluindo
   `is_investment_plan` e `is_test_auction`) — mesmos filtros de `kind`
   que `NetworkOverview.jsx` já usa pro Painel de Alavancagem, em vez de
   reaproveitar `total_spent` (que serve outro propósito, mais amplo, na
   lista de clientes).
4. `isSalePago` (antes local, sem export) virou exportada de
   `crmUnifiedCustomers.js` pra ser reaproveitada aqui, sem duplicar a
   lista de status.
**Testes:** 426/426 (sem teste novo isolável — a lógica nova é composição
de filtros sobre arrays já testados indiretamente pelos testes de
build/fluxo existentes). **Build:** exit 0.
**Confirmação de escopo:** só `CrmClientesTab.jsx`, `CrmStatsCards.jsx` e
o export novo em `crmUnifiedCustomers.js` foram tocados. Nenhuma mudança
em `financial_income`, `finalizeAuctionCore.js` ou na regra de
reconhecimento de receita.
**Publicado em:** relatório ao dono, no chat.
**Status final:** PARCIAL — a mistura de depósito/adesão/plano de
investimento na soma de "venda bruta" está corrigida; o resíduo de
possíveis arremates arrematados-mas-não-pagos continua como pendência
própria (mesma limitação técnica já registrada acima: `order_status` não
é confiável pra arremate pago por PIX/cartão).

---

## Correção FINAL, mesmo dia — critério oficial de "dinheiro real"

Dono recusou a explicação de "escopo diferente" e exigiu, com todas as
letras, análise por escrito ANTES de qualquer novo código: "sem achismo e
sem fazer à toa, tenha certeza, confirme, e depois faça". Print mostrava
"Venda bruta (Loja + Leilão): R$ 154.619,08" — ainda muito acima do que o
Painel de Alavancagem mostrava pra praticamente a mesma população (604
pessoas na rede dele vs. 612 Total de Contatos no CRM — populações quase
idênticas, então a diferença NÃO era escopo).

**Análise escrita, feita antes de tocar em código:** encontrei
`docs/MARCO-OFICIAL-AGOSTO-2026.md` — documento já existente no
repositório, hierarquia só abaixo de `VERDADE.md`, seção 1: "Critério
técnico de dinheiro real: venda em catalog_sales com status pago (paid/
shipped/delivered) E com rastro de gateway (mp_payment_id/
stripe_payment_intent/stripe_session_id). Antes de 01/08/2026 é TESTE, sem
valor financeiro." O Painel de Alavancagem (`NetworkOverview.jsx`,
`fetchFinanceStats`) já implementa esse critério inteiro há semanas
(`isPaga` + `isDinheiroReal` + `isPosMarco`). O CRM, nas duas rodadas
anteriores desta mesma diretiva, só tinha checado status pago — nunca
rastro de gateway, nunca o corte de 01/08/2026 — então ainda somava venda
de teste pré-lançamento (provavelmente uma quantidade grande, dado que a
ZERAGEM-HISTORICO de 04/08 já tinha achado milhares de registros de teste
pré-agosto só do lado de comissão).

**O que foi feito:**
1. Critério extraído de `NetworkOverview.jsx` pra `src/lib/dinheiroReal.js`
   (`isPaga`, `temRastroGateway`, `isDinheiroReal`, `isPosMarco`,
   `isVendaReal`) — fonte ÚNICA agora, com o comentário de topo citando
   `docs/MARCO-OFICIAL-AGOSTO-2026.md` e o histórico de 3 tentativas
   erradas que motivou a extração.
2. `NetworkOverview.jsx` refatorado pra importar dali — mesma função,
   zero mudança de comportamento, só parou de estar duplicada dentro do
   `useCallback`.
3. `CrmClientesTab.jsx` — `depositosCarteira` e `comprasBrutas` passaram a
   usar `isVendaReal` (não mais o `isSalePago` mais frouxo da rodada
   anterior). `depositosCarteira` também parou de somar
   `commission_deposit`/`operacao_deposit` — mesma decisão do Painel de
   Alavancagem: esse saldo já é contado quando vira compra, somar os dois
   contaria o mesmo real duas vezes.
4. **Leilão mudou de fonte:** em vez de ler `current_price`/`winner_id` da
   tabela `auctions`, passou a ler `catalog_sales` com `kind='arremate'`
   filtrado por `isVendaReal` — a MESMA fonte que `NetworkOverview.jsx` já
   usa pro leilão. Isso resolve de vez a pendência da rodada anterior
   (não dava pra confiar em `auctions.order_status` pra saber se um
   arremate pago por PIX/cartão realmente foi pago): `isVendaReal` exige
   status pago + rastro real na própria venda, então nunca depende daquele
   campo que só é atualizado no caminho de saldo.
5. Teste novo `tests/dinheiroReal.test.mjs` (17 casos) cobrindo os 4
   critérios isolados e a combinação `isVendaReal` — paga+rastro+pós-marco
   real; qualquer um dos três faltando, não conta; pagamento por saldo
   interno dispensa rastro de gateway.
**O que NÃO foi feito / blockers:** nenhum blocker novo — a pendência
técnica da rodada anterior (arremate pago por PIX/cartão sem
`order_status` atualizado) foi RESOLVIDA por esta mudança, não só
adiada.
**Testes:** 443/443 (426 + 17 novos). **Build:** exit 0.
**Confirmação de escopo:** `src/lib/dinheiroReal.js` (novo),
`NetworkOverview.jsx` (só refatoração, mesmo comportamento),
`CrmClientesTab.jsx`, `CrmStatsCards.jsx` (tooltips atualizados) e o teste
novo. Nenhuma mudança em `financial_income`, `finalizeAuctionCore.js`,
`commission_records` ou na regra de reconhecimento de receita.
**Publicado em:** relatório ao dono, no chat.
**Status final:** CONCLUÍDA. Critério de "dinheiro real" agora é
literalmente a mesma função nas duas telas — não há mais como divergir.
Falta o dono conferir visualmente no Preview/produção depois do deploy.

---

## REL-16 — Execução da DIR-16

**Data:** 30/08/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**Commit(s):** ver commit desta rodada em `git log`.
**O que foi feito:**
1. Depois de confirmar (DIR-15) que os dois painéis batiam com dado real,
   dono pediu um bloco no CRM com os MESMOS números do Painel de
   Alavancagem, mesmos rótulos, sem inventar métrica nova. Adicionado
   "Espelho do Painel de Alavancagem" em `CrmClientesTab.jsx`/
   `CrmStatsCards.jsx`: Total na base, Novos (30 dias), Compradores
   únicos, Conversão geral, Compraram nos últimos 30 dias, Depósitos,
   Valor total gerado, Ticket médio/comprador — fórmula copiada
   literalmente de `NetworkOverview.jsx` (`fetchFinanceStats` +
   `conversion`), só trocando a base (rede do dono → rede/plataforma de
   quem vê o CRM).
2. Achado à parte durante a conferência: "Valor Investido em Estoque: R$
   50.485,429" (3 casas decimais). Causa: `fmtBRL` em `CrmStatsCards.jsx`
   usava `toLocaleString` só com `minimumFractionDigits: 2` — sem
   `maximumFractionDigits`, o padrão do JS permite até 3 casas, e
   imprecisão de ponto flutuante (soma de `cost_price × quantity` linha a
   linha) empurrou pra 3ª casa. Corrigido com `maximumFractionDigits: 2`
   explícito — afeta TODOS os valores em R$ do CRM, não só o estoque.
**O que NÃO foi feito / blockers:** nenhum.
**Testes:** 443/443 (sem teste novo isolável — composição de fórmulas já
cobertas indiretamente por `dinheiroReal.test.mjs` e pelos testes de
build/fluxo existentes). **Build:** exit 0.
**Confirmação de escopo:** só `CrmClientesTab.jsx` e `CrmStatsCards.jsx`
tocados. Nenhuma mudança em `financial_income`,
`finalizeAuctionCore.js`, `NetworkOverview.jsx` ou na regra de
reconhecimento de receita.
**Publicado em:** relatório ao dono, no chat.
**Status final:** CONCLUÍDA (escopo autorizado). Falta o dono conferir
visualmente no Preview/produção depois do deploy — os 8 números do
espelho devem bater com o Painel de Alavancagem.

---

## REL-17 — Execução da DIR-17

**Data:** 30/08/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**Commit(s):** ver commit desta rodada em `git log`.
**O que foi feito:**
1. Dono comparou os painéis já com o espelho da DIR-16 no ar: Painel
   R$ 6.173,80 / 25 compradores vs espelho R$ 7.076,80 / 26 compradores —
   diferença de R$ 903,00 em compras. As fórmulas eram idênticas (DIR-15/
   16), então a divergência só podia vir das LINHAS lidas, não da conta.
2. Causa raiz confirmada por leitura: `NetworkOverview.jsx:571` usava
   `CatalogSale.list()` sem ordenação nem limite → adapter ordena só por
   `id` (uuid aleatório) → Supabase corta em 1000 linhas → o Painel somava
   um subconjunto arbitrário da tabela, deixando vendas reais de fora sem
   aviso. O CRM (`'-created_date', 2000`) lia as mais recentes e por isso
   via mais — o número CERTO era o do CRM.
3. Fix: `NetworkOverview.jsx` → `list('-created_date', 5000)`;
   `CrmClientesTab.jsx` alinhado (2000 → 5000). A diferença interna do CRM
   (R$ 7.278,04 vs R$ 7.076,80 = R$ 201,24) é o leilão, intencional e
   documentada — não foi tocada.
**Testes:** 443/443. **Build:** exit 0.
**Confirmação de escopo:** só as duas chamadas de busca alteradas — zero
mudança de fórmula, critério ou regra de receita.
**Publicado em:** relatório ao dono, no chat.
**Status final:** CONCLUÍDA (escopo autorizado) — aguarda conferência
visual do dono com os dois painéis lado a lado após o deploy.

---

## REL-18 — Execução da DIR-18

**Data:** 30/08/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**Commit(s):** ver commit desta rodada em `git log`.
**O que foi feito:**
1. Dono reportou "Custo do produto: R$ 0,00" no painel de lucro e cravou a
   semântica: cost_price = custo TOTAL do lote (planilha). Diagnóstico com
   consultas diretas dele: 15/302 produtos ativos sem custo; lotes reais
   (POLITRIZ R$ 2.296/9un, Harley 117 R$ 2.200/10un, família MOP/PANELA
   com valores fracionários idênticos de rateio de lote) confirmando a
   semântica de lote — e explicando os R$ 50 milhões do CRM (custo de lote
   × quantidade = lote contado N vezes).
2. `src/lib/custoProduto.js` criado (custoUnitario, custoEstoqueRestante) +
   `tests/custoProduto.test.mjs` (8 casos com dados reais).
3. Corrigidas as 6 leituras erradas (CrmClientesTab, BalancoGeralTab,
   RentabilidadeOperacao, DailyReportView, DailyReportPDF,
   PainelLucroDiario agora reusa a lib) e 1 escrita errada
   (gerarProdutosDoLote gravava unitário em registro com qtd > 1).
4. Trava "jamais custo zerado" nos dois formulários de cadastro manual
   (CreateCatalogProduct, AddCatalogProduct) — os 15 produtos zerados
   entraram por aí.
**O que NÃO foi feito / blockers:**
- `createConsignacao.js:97` — bug real de cobrança (debita o custo do LOTE
  como se fosse unitário na consignação de lote multi-unidade). Mexe em
  dinheiro; flagged pra diretiva própria com decisão do dono.
- Preencher o custo dos 15 produtos zerados — só o dono tem os valores
  reais (planilha de origem); lista entregue no chat.
**Testes:** 451/451 (443 + 8 novos). **Build:** exit 0.
**Confirmação de escopo:** só os arquivos listados; nenhuma mudança em
fluxo de pagamento, comissão, `financial_income` ou banco.
**Publicado em:** relatório ao dono, no chat.
**Status final:** CONCLUÍDA (escopo autorizado) — aguarda conferência do
dono no Preview e autorização pra publicar.

---

## REL-19 — Execução da DIR-19

**Data:** 30/08/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**Commit(s):** ver commit desta rodada em `git log`.
**O que foi feito:**
1. Dono decidiu a regra do consignado: "igual é no mercado" — acerto POR
   UNIDADE vendida. Implementado `acertoConsignadoUnitario` em
   `api/_lib/custoProduto.js` (espelho servidor da regra da DIR-18):
   atacado por unidade → custo unitário da casa → catálogo como último
   recurso.
2. `createConsignacao.js` passa a usar a regra (o select agora traz
   `quantity_sold` e `selling_price_wholesale`). Aprovação e liquidação
   não mudam — só repassam o `custo_unitario` do pedido, que agora nasce
   certo.
3. Seção **6-D** nova no `DOCUMENTO-OFICIAL-PLANO-CARREIRA.md`: a regra
   oficial, o bug que ela corrige e a tabela de onde vive no código.
4. `tests/acertoConsignado.test.mjs` (6 casos, calibrados no caso real da
   POLITRIZ: acerto R$ 255,11 e nunca R$ 2.296).
**O que NÃO foi feito / blockers:** consignações já existentes com
`custo_unitario` inflado gravado (pendentes ou aprovadas) não foram
corrigidas — precisa conferir se existem antes; consulta entregue ao dono.
**Testes:** 457/457 (451 + 6 novos). **Build:** exit 0.
**Confirmação de escopo:** só os arquivos listados. Motor de liquidação,
saldos e comissões intactos.
**Publicado em:** relatório ao dono, no chat; regra registrada na seção 6-D
do documento oficial.
**Status final:** CONCLUÍDA (escopo autorizado) — aguarda conferência e
autorização de publicação (junto com a DIR-18).

---

## REL-20 — Execução da DIR-20

**Data:** 30/08/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**Commit(s):** ver commit desta rodada em `git log`.
**O que foi feito:** análise linha a linha dos 9 cards da Gestão de
Estoque + 4 consultas do dono direto no banco fecharam o diagnóstico
(números no texto da DIR-20). Implementado: `unidadesEmEstoque` na regra
única de custo (cliente + servidor), CRM somando o galpão inteiro
(esperado ~R$ 28.133,45), Gestão de Estoque com "Capital em Estoque" =
custo parado agora (mesma conta do CRM), contadores de unidades cobrindo
os 184 produtos com estoque só na grade, consignado herdando o estoque
físico, e 3 testes novos com os casos reais (VIX, POLITRIZ).
**O que NÃO foi feito / blockers (dados, dependem do dono):**
1. Preço podre do Mini Localizador GPS — SQL de correção entregue no chat
   (R$ 12.226,61 → R$ 31,03/un); depois disso a "Receita Potencial" cai de
   R$ 5,08 milhões pra ~R$ 274 mil (valor plausível).
2. Os 15 produtos sem custo — lista entregue, valores só o dono tem.
3. "Faturado"/"Lucro Líquido" da Gestão de Estoque continuam somando os
   campos gravados `sold_amount`/`profit`, que misturam vendas de teste
   pré-marco — flagged, não alterados (redefinir exige decisão do dono
   sobre o que essa tela deve contar).
**Testes:** 460/460 (457 + 3 novos). **Build:** exit 0.
**Confirmação de escopo:** arquivos das telas citadas + regra única +
testes. Nenhum dado de banco alterado pelo código.
**Publicado em:** relatório ao dono, no chat.
**Status final:** CONCLUÍDA (escopo autorizado) — aguarda conferência no
Preview e autorização pra publicar DIR-18+19+20 juntas.

**Correção, mesma diretiva, mesmo dia — o corte silencioso de 1000 linhas:**
dono conferiu o Preview e o CRM mostrava R$ 9.595,12 (não os R$ 28.133,45
validados no banco). Causa: a busca nova (`Product.list('-created_date',
5000)`) pede 5000 mas o Supabase corta a resposta em 1000 linhas SEM
avisar — o CRM somava só os 1000 produtos mais novos. A Gestão de Estoque
já tinha descoberto e documentado exatamente esse corte em 20/08 (comentário
no próprio `ProductManagement.jsx`) e paginava inline por cursor. Essa
paginação virou função única `src/lib/listarTudo.js` (keyset por `id`,
blocos de 1000, com 6 testes usando uma entidade falsa que simula o corte
do PostgREST), usada agora por: CRM (`allProducts`), Painel de Lucro
Diário (mapa de custo — produto antigo saía com "Custo R$ 0,00" no painel
por ficar fora dos 1000) e Gestão de Estoque (código inline substituído
pela função). 466/466 testes, build ok.
**Pendência registrada, não corrigida nesta rodada:** as buscas de VENDAS
(`CatalogSale.list('-created_date', 5000)` no NetworkOverview e no CRM)
sofrem o mesmo corte de 1000 — hoje validado inofensivo (toda venda
pós-marco cabe nas 1000 mais recentes; números bateram com o banco), mas
quando a tabela crescer, vendas antigas vão sumir das somas de histórico
por cliente. Migrar pra `listarTudo` numa rodada própria, com validação
dos números antes/depois (mexe em soma de dinheiro).

---

## REL-21 — Execução da DIR-21

**Data:** 30/08/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**Commit(s):** ver commit desta rodada em `git log`.
**O que foi feito:**
1. "Volume em Negociação" redefinido (decisão do dono): pedidos de Loja
   gerados e não pagos + pedidos cancelados/estornados + negociações
   manuais, tudo pós-marco. Tooltip mostra a composição das 3 parcelas com
   os valores de cada uma.
2. Card do super_admin renomeado "Faturamento Bruto (Loja Virtual)" =
   `comprasBrutas` (valor cheio das compras reais). Regra da DIR-7
   intocada — a comissão segue como receita oficial no Financeiro/imposto;
   `financial_income` deixou de ser carregado no CRM por não ter mais uso
   nele.
**Testes:** 466/466. **Build:** exit 0.
**Confirmação de escopo:** só `CrmClientesTab.jsx` e `CrmStatsCards.jsx`.
Nenhuma mudança em `financial_income`, Financeiro ou visão de rede.
**Publicado em:** relatório ao dono, no chat.
**Status final:** CONCLUÍDA (escopo autorizado) — aguarda conferência no
Preview e autorização pra publicar o pacote DIR-18 a 21.

---

## REL-22 — Execução da DIR-22 (Fase 1)

**Data:** 30/08/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**Commit(s):** ver commit desta rodada em `git log`.
**O que foi feito:**
1. Análise sênior do CRM entregue no chat (clicabilidade, informações
   faltantes, modelo de dados do Parceiro de Compra já existente, e o
   achado-chave: estrutura executiva ≠ árvore de indicação — a fonte única
   é `resolveExecutivo`/`executive_owner`).
2. `src/lib/captacaoParceiros.js` + 9 testes: regra da meta de R$ 1 milhão
   na ordem oficial do dono, com anti-dupla-contagem entre venda
   `partner_plan` e ativação automática, e balde residual visível.
3. `CrmParceirosCompra.jsx`: painel com barra da meta, baldes em ordem e
   lista de parceiros (plano, valor, aportes pagos reais por pessoa, data,
   origem da ativação), no mesmo escopo do resto do CRM.
4. Visão total estendida a `admin` (antes só `super_admin`), frase literal
   do dono.
**O que NÃO foi feito / blockers:** Fases 2 (acesso por estrutura
executiva), 3 (clicabilidade) e 4 (perfil enriquecido) — registradas na
DIR-22, aguardam as próximas rodadas. Histórico legado de adesão
(pré-21/08) continua fora (pendência DIR-13) — a meta só enxerga o que é
rastreável.
**Testes:** 475/475 (466 + 9 novos). **Build:** exit 0.
**Confirmação de escopo:** lib nova + componente novo + 3 pontos em
`CrmClientesTab.jsx` (carga de `partner_plan_purchases`, escopo, render).
Nenhuma mudança em receita, comissão ou banco.
**Publicado em:** relatório ao dono, no chat.
**Status final:** CONCLUÍDA (Fase 1) — aguarda conferência no Preview.

---

## REL-23 — Execução da DIR-23 (metas internas oficiais no CRM)

**Data:** 30/08/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**Commit(s):** ver commit desta rodada em `git log`.
**O que foi feito:**
1. Análise sênior dos dois materiais do dono entregue no chat (Resumo
   Executivo Integrado + Apresentação Oficial do plano de licenças), com o
   mapa do que o CRM já tinha, o que faltava e o que NÃO deve entrar
   (projeções de território são material de venda, não métrica de operação).
2. `src/lib/metaCentral.js` + 8 testes: Meta Central de VENDAS
   R$ 5.000.000/mês (alvo março/2027) = trilho Online R$ 4M (Loja + Leilão,
   dado real do mês, critério oficial `dinheiroReal`) + trilho Física R$ 1M
   SEM FONTE no sistema (null explícito, nunca zero inventado).
3. `src/lib/dashboardDiretoria.js` + 8 testes: os 12 números da Seção 37
   com Realizado × Meta e etiqueta de governança do próprio documento —
   Dado (novos usuários/dia, conversão digital na fórmula do Painel de
   Alavancagem, ticket médio do mês, venda online, faturamento total),
   Aproximação com fórmula declarada (usuários ativos por atividade
   financeira 30d — não há rastro de login; K-Factor pela árvore
   `referred_by_id`) e Sem fonte como pendência explícita (visitantes/
   cadastros do Ranking, venda física, custo de aquisição, ROI).
4. `src/lib/escadaLicencas.js` + 20 testes: a escada oficial (Influenciador
   grátis/5% → Vendedor R$ 1.497/10% → Licenciado R$ 5.000/13% → Parceiro
   R$ 20.000/15% → Ponto de Retirada R$ 50.000/16% → Loja Física
   R$ 350.000/19% → Distribuidor R$ 4.000.000/20%), com `nivelDaVenda` na
   MESMA precedência de palavras do balde da captação (teste de
   concordância venda a venda) e o cruzamento N vendidos × preço de tabela
   vs captado real (desconto/inconsistência aparece, não some).
5. Três painéis novos no CRM, SÓ visão total (admin/super_admin — metas da
   empresa não vazam pra escopo de rede): `CrmMetaCentral.jsx` (barra dos
   R$ 5M com os dois trilhos), `CrmDashboardDiretoria.jsx` (grade dos 12
   KPIs com etiquetas) e `CrmEscadaLicencas.jsx` (tabela da escada com
   hierarquia de cadastro e divergência de tabela destacada).
**O que NÃO foi feito / blockers:** venda física, analytics do Ranking,
custo de aquisição e ROI seguem sem fonte de dado — aparecem como
pendência no próprio painel; ativam quando o sistema medir. Premissas
aguardando martelo do dono: "usuário ativo" ≈ atividade financeira em 30
dias (sem rastro de login hoje).
**Testes:** 511/511 (475 + 36 novos). **Build:** exit 0.
**Confirmação de escopo:** 3 libs novas + 3 componentes novos + fiação em
`CrmClientesTab.jsx` (imports, 3 memos, render condicionado a visão
total). Nenhuma mudança em receita, comissão, captação (DIR-22) ou banco.
**Publicado em:** relatório ao dono, no chat.
**Status final:** CONCLUÍDA — aguarda conferência no Preview.

---

## REL-24 — Execução da DIR-24 (CRM de mercado, 5 fases)

**Data:** 30/08/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**Commit(s):** ver commit desta rodada em `git log`.
**O que foi feito:**
1. **Fase 1 — números confiáveis** (`crmUnifiedCustomers.js` + 7 testes):
   Gasto Total do cliente só conta MERCADORIA (loja/produto/arremate; linha
   legada sem kind continua contando) — depósito/adesão/aporte fora
   (dinheiro duplicado eliminado da linha do cliente); valor de leilão vem
   só da venda kind='arremate' PAGA (winner_id sem pagamento vale troféu,
   não gasto); convidado recorrente acumula contador e linha do tempo;
   cliente manual duplicado agora FUNDE na linha automática (notas,
   vendedor, follow-up e CPF preservados) em vez de sumir. Escopo:
   clientes manuais filtrados por `created_by_id` (carimbado no cadastro),
   negociações seguem o cliente; `Customer` sem teto de 500 (listarTudo),
   Negotiation 200→1000, Seller 100→500.
2. **Fase 2 — CRM aberto e escopado**: gate `if (!isAdmin)` removido —
   todo usuário vê o CRM DA PRÓPRIA REDE; visão total segue de
   admin/super_admin; cards de empresa (estoque, catálogo, metas,
   dashboard, escada), aba Vendedores e botão Novo Vendedor só na visão
   total. Estrutura EXECUTIVA continua pendente (DIR-22 Fase 2).
3. **Fase 3 — visual**: CRM reorganizado em 3 seções (📊 Visão Executiva /
   👥 Clientes / 🚀 Expansão) com navegação própria; faixa de resumo com os
   4 números que importam sempre visível (faturamento do mês × meta,
   volume em negociação, clientes ativos, captação); gráfico de RITMO
   DIÁRIO do mês na Meta Central (`ritmoDiario` + teste) com "precisa
   entrar R$ X/dia"; tabela de clientes vira CARTÕES no celular.
4. **Fase 4 — ação** (`quemContatarHoje.js` + 12 testes +
   `CrmQuemContatar.jsx`): fila diária "Quem contatar hoje" com dado real
   (follow-up vencido > pedido não pago > arremate sem pagamento >
   depósito sem compra > sumido 30d), uma pessoa por vez no motivo mais
   urgente, ordenada pelo dinheiro; botão WhatsApp com mensagem pronta por
   motivo (DDI 55). Anotações + data de retorno + próximo passo em
   QUALQUER cliente (upsert em customers, colunas já existentes — sem
   migração); com data marcada o cliente entra sozinho na fila do dia.
5. **Fase 5 — luxo de mercado**: funil kanban por status de compra
   (`CrmFunilKanban.jsx`); ordenação clicável (nome/gasto/último
   contato/leilões) + paginação de 50 + busca por CPF + exportação CSV
   (com BOM pro Excel) na lista; aviso de duplicado NO ATO do cadastro
   (e-mail/telefone); todos os `alert()` do CRM viraram toast (sonner).
**O que NÃO foi feito / blockers:** arrastar cartão no kanban (mudança de
status manual continua pelo perfil — drag exigiria lib nova, registrado);
escopo por estrutura executiva (DIR-22 Fase 2); cadastros manuais LEGADOS
sem `created_by_id` aparecem só na visão total (decisão de segurança:
melhor esconder do que vazar — o dono pode atribuir donos depois).
**Testes:** 531/531 (511 + 20 novos). **Build:** exit 0.
**Confirmação de escopo:** critério oficial de dinheiro real intocado
(cards grandes idênticos); DIR-7 (receita) e baldes da captação intocados;
nenhuma migração de banco.
**Publicado em:** relatório ao dono, no chat.
**Status final:** CONCLUÍDA (5 fases) — aguarda conferência no Preview.

---

## REL-25 — Execução da DIR-25 (cadastro manual com interesses completos)

**Data:** 30/08/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**Commit(s):** ver commit desta rodada em `git log`.
**O que foi feito:**
1. `src/lib/planosParceiro.js` — fonte única dos planos de parceiro de
   compra (Visionário R$ 5.000 / Sócios de Ouro R$ 15.000 / Elite
   R$ 30.000 / Personalizado, 3%/60 meses); PartnerPlanActivation.jsx
   passou a importar dela (antes a lista vivia hardcoded lá).
2. Modal Novo Cliente reorganizado em 5 seções: 👤 Dados / 📍 Endereço /
   🎯 Acompanhamento / 💼 Interesses / 📝 Observações. Acompanhamento
   ganhou Vendedor responsável (select dos vendedores ativos), "Voltar a
   falar em" (entra sozinho na fila Quem Contatar Hoje) e Próximo passo.
3. Interesses: PRODUTOS com o catálogo INTEIRO visível por padrão (busca
   só refina; até 60 por vez com aviso; produto sem estoque aparece
   marcado "sem estoque" em vez de sumir — interesse em esgotado é sinal
   de demanda; com estoque vem primeiro; preço de vitrine mostrado);
   PLANOS DE PARCEIRO e LICENÇAS (escada oficial, Influenciador grátis a
   Distribuidor R$ 4 mi) em cards selecionáveis. Todo item marcado ganha
   VALOR EDITÁVEL pré-preenchido com o preço de tabela, com etiqueta de
   tipo (Produto/Plano/Licença) e total "Potencial estimado do cliente".
4. Gravação: itens tipados em interested_products (JSONB; formato legado
   sem tipo continua lendo como produto) e o total em purchase_value.
   handleEdit também carrega os campos novos.
**O que NÃO foi feito / blockers:** nada de ativação de plano — o cadastro
registra INTERESSE (a ativação continua em PartnerPlanActivation, agora
lendo da mesma fonte).
**Testes:** 531/531. **Build:** exit 0.
**Confirmação de escopo:** sem migração (colunas assigned_seller,
follow_up_date, next_steps, purchase_value, interested_products já
existiam); escada e planos só leitura.
**Publicado em:** relatório ao dono, no chat.
**Status final:** CONCLUÍDA — aguarda conferência no Preview.


---

## REL-26 — Execução da DIR-26 (ticket médio por comprador)

**Data:** 30/08/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**O que foi feito:** KPI "Ticket médio" do Dashboard da Diretoria
recalculado: mercadoria real do mês ÷ compradores únicos do mês (antes
dividia por pedidos — R$ 118,65 vs meta R$ 252, comparação errada de
unidade). Rótulo e tooltip agora dizem POR COMPRADOR e explicam por que o
"Ticket médio / comprador" do Espelho é outro número (soma depósitos e é
desde 01/08 — cópia proposital do Painel de Alavancagem, intocada).
Resposta ao dono: nem 118 nem 272 eram o certo pra meta — 272 soma
depósito (mesmo real duas vezes) e não é mensal.
**Testes:** 531/531 (teste do KPI atualizado). **Build:** exit 0.
**Status final:** CONCLUÍDA — aguarda conferência no Preview.


---

## REL-27 — Execução da DIR-27 (leilão pós-marco no CRM)

**Data:** 30/08/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**O que foi feito:** análise de consistência da seção Clientes entregue
no chat (status fecham exatos em 611; Leilões Arrematados 55 estava
contaminado por vitórias de teste pré-lançamento — 37 delas do próprio
dono — puxando junto Arrematantes e Clientes Ativos). Regra do dono
aplicada na fonte única (`buildUnifiedCustomers`): vitória de leilão só
conta com end_time >= 01/08/2026 (MARCO_OFICIAL importado de
dinheiroReal.js); pré-marco/sem data não conta troféu, não promove, não
vira cliente, não entra na linha do tempo. Efeito esperado na tela:
Leilões Arrematados cai de 55 pro nº real pós-marco, Arrematantes e
Clientes Ativos caem junto (teste vira lead de novo).
**Testes:** 534/534 (3 novos). **Build:** exit 0.
**Status final:** CONCLUÍDA — aguarda conferência no Preview.


---

## REL-28 — Execução da DIR-28 (auditoria pré-publicação)

**Data:** 30/08/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**O que foi feito:** auditoria completa dos caminhos interativos do CRM
(handlers, modais, entidades, identificadores) — detalhes na DIR-28.
Quatro correções aplicadas: link do WhatsApp do encaminhamento
normalizado (dígitos + DDI 55, com erro claro sem telefone); "Produtos
no Catálogo" volta a contar só com estoque; anotação bloqueada em
cliente sem nenhum contato (evita registro fantasma); handleEdit morto
removido. Melhorias futuras registradas na diretiva.
**Testes:** 534/534. **Build:** exit 0.
**Status final:** CONCLUÍDA — pacote DIR-18→28 pronto pra publicar,
aguardando autorização do dono.

---

## REL-29 — Execução da DIR-29 (melhorias da auditoria)

**Data:** 30/08/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**O que foi feito:**
1. Trilho VENDA FÍSICA ativado com dado real: PDV carimba source='pdv'
   desde o nascimento da venda — Meta Central e Dashboard separam Física
   (balcão) × Online (site + leilão), sem duplicar nem perder nada.
2. CUSTO DE AQUISIÇÃO ativado (aproximação): Σ custo dos lotes ÷ Σ
   potencial de venda da vitrine (galpão inteiro), com a ressalva de que
   a referência 22,8% do documento é sobre o valor de MERCADO (vitrine é
   ~20% abaixo — o % real sobre mercado é ainda menor).
3. ROI OPERACIONAL ativado (aproximação): (receita − custo) ÷ custo das
   vendas reais do mês com produto vinculado — buildCostMap/custoDaVenda
   extraídos do Painel de Lucro Diário pra src/lib/custoProduto.js (fonte
   única; o Painel importa de lá agora); a cobertura (X de Y vendas com
   custo conhecido) aparece na fonte do KPI.
4. RASTRO DE LOGIN: migração 20260830170000 (app_users.last_login +
   índice — DONO PRECISA COLAR O SQL) + carimbo tolerante em login.js e
   googleLogin.js; "Usuários ativos" vira DADO (login OU movimento em
   30d) assim que a coluna existir — até lá segue a aproximação, sem
   quebrar nada.
5. CRM: editar cliente MANUAL direto no modal (botão lápis, religado de
   verdade); kanban com ARRASTAR nativo pra manual (solta na coluna →
   atualiza status; automático não arrasta, com explicação no hover);
   origem "Ranking Premiado" no cadastro e no filtro.
**O que NÃO foi feito / blockers:** instrumentação automática do Ranking
(a página não existe no sistema — quando nascer, cadastra com
source='ranking' e o KPI Cadastros Ranking/dia liga sozinho); listarTudo
nas vendas (rodada própria — duas telas casadas somando dinheiro).
**Ação do dono:** ✅ FEITA — migração colada e aplicada no SQL Editor em
30/08/2026 ("Success. No rows returned", padrão de ALTER/CREATE). A
coluna last_login e o índice existem em produção; o carimbo no login
começa a valer quando o pacote da branch for publicado (login.js roda no
deploy novo).
**Testes:** 540/540 (6 novos). **Build:** exit 0. Nomes de migração: ✅.
**Status final:** CONCLUÍDA — migração aplicada; aguarda conferência no
Preview.

---

## REL-30 — Execução da DIR-30 (cargos do Plano de Carreira no cadastro de vendedor)

**Data:** 30/08/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**O que foi feito:**
1. Select "Cargo / Tipo de Licença" do Novo Vendedor agora lista os cargos
   OFICIAIS da fonte única do Painel de Controle (careerLevels.js), em 3
   grupos: Plano de Carreira — Rede (Influenciador 5% → Distribuidor 20%,
   com % e valor de adesão no rótulo), Diretoria (Trainee, Sócio
   Executivo, Diretor Operacional, Diretoria Executiva, CEO, Livoo Live,
   Embaixador, Conselheiro, Fundador — os nomes pedidos pelo dono) e
   Licenças de Loja legado (vendedor antigo continua legível).
2. Escolher um cargo do plano PRÉ-PREENCHE a comissão com o % oficial
   (editável) e mostra a REGRA do cargo embaixo do select — o mesmo texto
   que a equipe vê no Painel de Controle.
3. Badge da tabela de vendedores via helper único nomeLicenca() (plano +
   legado; id desconhecido aparece cru, nunca vira "Usuário" por engano).
4. Telefone do vendedor salvo só com dígitos (obrigatório) — o wa.me do
   encaminhamento e o PDV dependem de número limpo.
**Fora do escopo confirmado:** motor de comissão do PDV intocado (usa
career_levels do usuário, não o license_type do vendedor — conferido).
**Testes:** 540/540. **Build:** exit 0.
**Status final:** CONCLUÍDA — aguarda conferência no Preview.

---

## REL-31 — Execução da DIR-31 (KPIs do Rank Premiado ligados)

**Data:** 30/08/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**Correção registrada:** eu havia afirmado na DIR-29 que a página do
Ranking Premiado não existia — ERRADO. Ela existe e está no ar
(leilaonozap.net/rankpremiado, `ConcursoLeilaoNozap.jsx` + pasta
src/components/concurso/), com rastro real em concurso_participantes
(cadastros) e concurso_referrals (visitas por link ?ref=). O dono
corrigiu; a busca falhou porque procurei "Ranking" literal e a página se
chama Concurso. Lição registrada na DIR-31.
**O que foi feito:**
1. `api/concurso.js` ganhou `action=stats_crm` (POST, só admin — mesmo
   isAdmin das outras ações): cadastros_7d e visitantes_7d por
   created_at, janela de 7 dias.
2. CRM (visão total) busca os contadores e o Dashboard da Diretoria
   liga: "Cadastros Ranking/dia" = DADO (média 7d de participantes);
   "Visitantes Ranking/dia" = APROXIMAÇÃO (só visita por link de
   indicação é rastreada — tráfego direto não deixa rastro, o número
   real é maior; a fonte do card explica). Sem resposta da API → seguem
   "sem fonte", nunca número inventado.
**Placar da Seção 37:** 10 dos 12 KPIs com número (era 8) — os 2
restantes (custo de aquisição/ROI) já ligados desde a DIR-29, então na
prática TODOS os 12 têm régua; só visitantes segue como aproximação
declarada.
**Testes:** 542/542 (2 novos). **Build:** exit 0.
**Status final:** CONCLUÍDA — na branch, pronta pra publicar no próximo
"pode".

---

## REL-32 — Execução da DIR-32 (governança por papel + modal profissional)

**Data:** 30/08/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**O que foi feito:**
1. `src/lib/visibilidadePorPapel.js` (+11 testes) — a MATRIZ ÚNICA da
   governança aprovada: visão total = super_admin/admin/admin_financeiro
   + cargos diretoria_executiva (e CEO) e diretoria_operacao (aliases
   legados funcionam); dinheiro da empresa = só as 3 permissões
   administrativas; gestão de vendedores = admin/super_admin;
   Sócio Executivo = rede própria; Fundador/Conselheiro sem visão total
   (relatório agregado é rodada futura registrada).
2. Permissão de Trabalho nova: **Admin Financeiro** (`admin_financeiro`)
   — entrou em ADMIN_ROLES (todos os painéis), como operador de escrita
   em entityWrite/adminEntityWrite (lança receita/despesa) e no adapter;
   as travas de venda (catalog_sales) NÃO o incluem — venda continua
   admin/super_admin, e gestão de usuários continua só super_admin.
3. CRM lê a matriz: cargo Diretoria Executiva/Operacional abre o CRM com
   visão total de VENDA (metas, dashboard, espelho, captação, escada) —
   SEM Valor em Estoque, Produtos no Catálogo, Custo de Aquisição e ROI
   (os 2 KPIs somem da grade pela matriz); aba Vendedores e botão Novo
   Vendedor só pra admin/super_admin.
4. Editar Usuário profissional: modal grande de verdade (sem a trava de
   proporção 16:9 que o espremia; 92vh × max-w-6xl) + VISÃO GERAL no
   cabeçalho (foto, nome, contato e os crachás Permissão / Função
   principal / Executivo vigente / Indicador / nº de cargos — refletindo
   ao vivo o que está selecionado no formulário) + opção Admin
   Financeiro com explicação. Nenhuma função existente removida.
5. Teste antigo de ADMIN_ROLES atualizado pra regra nova (3 papéis).
**Pendência de decisão do dono (registrada):** tirar o Financeiro do
role 'admin' comum (hoje admin ainda vê dinheiro — cortar muda acesso de
contas existentes; só com ordem expressa).
**Testes:** 552/552 (12 novos). **Build:** exit 0.
**Status final:** CONCLUÍDA — aguarda conferência no Preview e "pode".

---

## REL-33 — Execução da DIR-33 (busca de verdade + executivos no topo)

**Data:** 30/08/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**Causa raiz confirmada:** a busca da Árvore só varria os nós JÁ
RENDERIZADOS (galho fechado = pessoa invisível pra busca) e só por
nome/e-mail.
**O que foi feito:**
1. `src/lib/buscaPessoa.js` (+10 testes) — comparador único: nome
   completo, apelido, nomes de exibição, e-mail, telefone (dígitos, com
   ou sem máscara), CPF (dígitos), código de indicação e nome da loja;
   sem acento/caixa.
2. TreeHierarchy: a busca varre TODAS as pessoas do cadastro e
   AUTO-EXPANDE o caminho até os achados (teto de 40 pra busca genérica
   não abrir a árvore inteira); Enter segue centralizando; placeholder
   agora diz o que a busca aceita.
3. Alternador "⭐ Diretoria no topo" (ajustado na hora pelo dono:
   "quando falo executivos digo TODA a diretoria que recebe os 10%, até
   o Embaixador"): TODO o bloco 'diretor' do plano de carreira (CEO,
   Diretoria Executiva, Diretor Operacional, Fundador, Conselheiro,
   Embaixador, Livoo Live, Sócio Executivo, Trainee) vira raiz no topo,
   ordenado por peso institucional (CEO primeiro) e tamanho do time,
   cada um MANTENDO a própria árvore de ligações pendurada; resto da
   floresta abaixo; escolha lembrada no navegador. SÓ VISUAL — nenhum
   vínculo de indicação muda.
**Testes:** 559/559 (10 novos). **Build:** exit 0.
**Status final:** CONCLUÍDA — aguarda conferência no Preview e "pode".


---

## REL-33b — Bloco "Cadastros diretos" na Árvore (complemento da DIR-33)

**Data:** 30/08/2026.
**Aprovação:** dono confirmou o entendimento no chat e escolheu a opção
(b): a regra vale pra QUALQUER pessoa da árvore, não só a conta da
empresa.
**O que foi feito:** pessoa com 15+ filhos SEM cargo e SEM equipe ganha
dois blocos: os importantes seguem como cartões individuais e os comuns
entram numa pasta "Cadastros diretos (N)" — no organograma a pasta abre
em GRADE compacta (colunas × linhas, aresta só na 1ª linha) em vez de
esticar a árvore pro lado; na lista abre em coluna normal. Pasta não se
arrasta, não é alvo de vínculo, não tem menu nem lápis (clique abre/
fecha). A lupa continua achando quem está dentro (o clique no resultado
abre a pasta e centraliza). Só visualização — nenhum vínculo muda.
**Testes:** 559/559. **Build:** exit 0.

---

## REL-34 — Execução da DIR-34 (Esteira de Captação)

**Data:** 30/08/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**O que foi feito:**
1. Migração `20260831010000_captacao_oportunidades.sql` (DONO PRECISA
   COLAR O SQL): tabela da esteira com RLS e políticas explícitas
   (SELECT/INSERT/UPDATE; DELETE não — oportunidade não se apaga, se
   perde com motivo). Entidade `CaptacaoOportunidade` mapeada no adapter.
2. `src/lib/esteiraCaptacao.js` (+8 testes): os 8 estágios oficiais do
   dono com probabilidade fixa e EXIGÊNCIA por estágio (50% exige valor;
   perda exige motivo; 99% exige valor+reunião de assinatura; interesse
   futuro exige data de recontato); pipeline ponderado; % de CONVERSÃO
   por responsável (win rate + conversão do funil — quem não encerrou
   nada fica sem taxa, não inventamos número); alertas (reunião hoje/
   atrasada, recontato vencido, parada 7/15 dias); `dinheiroNaConta`
   (100% se prova contra venda real partner_plan/adesão do cliente).
3. `CrmEsteiraCaptacao.jsx` na aba 🚀 Expansão: forecast (ponderado +
   fechado + % da meta de R$ 1 mi), kanban dos 8 estágios com valor por
   coluna e cartões (dias parados em âmbar/vermelho, chip "💰 na conta"
   ou "⚠️ sem dinheiro na conta" no 100%), modal nova/editar com as
   exigências travando o salvar, RANKING DO TIME (visão total) com win
   rate e conversão do funil.
4. Escopo (prática de mercado, confirmada pelo dono): responsável vê e
   move só as próprias; visão total (dono/admins/diretoria — esteira é
   venda) vê tudo + ranking.
5. Fila "Quem contatar hoje" ganhou os alertas da esteira (reunião,
   recontato, negociação parada) com mensagens de WhatsApp próprias.
6. Histórico de movimentos gravado a cada mudança de estágio
   (quem/quando/de/para) + estagio_desde recarimbado + fechado_em no 100%.
**Ação do dono:** ✅ FEITA — migração da esteira colada e aplicada no SQL
Editor em 30/08/2026 ("Success. No rows returned", padrão de
CREATE/ALTER). Tabela, índices, RLS, políticas e trigger vivos em
produção.
**Testes:** 567/567 (8 novos). **Build:** exit 0. Nomes de migração ✅.
**Status final:** CONCLUÍDA — banco pronto; aguarda conferência no
Preview + "pode".

---

## REL-35 — Execução da DIR-35 (tela "Sem conexão" falsa)

**Data:** 01/09/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**Diagnóstico provado (sem achismo):** o print do dono mostrava o
`OfflineScreen.jsx` do PRÓPRIO app — logo o servidor entregou a página,
os bundles baixaram e o React montou; a rede funcionava. O trancamento
vinha do `useOnlineStatus` da era Base44 (commit `0e4f5a00`): confiança
cega no `navigator.onLine` (que mente com VPN/proxy/troca de rede) e
botão "Tentar novamente" apontando pra `leilaonozap.net/api/health` —
endpoint que NÃO EXISTE, e em domínio cruzado. Os commits da DIR-34 não
tocaram em nenhum desses arquivos.
**O que foi feito:**
1. `src/lib/conexao.js` (novo, +3 testes): `provarConexao()` — busca
   `/version.json` no PRÓPRIO domínio (existe em todo deploy, no-store),
   com cache-buster e teto de 8s (portal cativo não pendura o botão).
2. `useOnlineStatus` reescrito: nasce otimista (a página acabou de chegar
   pela rede); evento `offline` vira GATILHO DE VERIFICAÇÃO — só declara
   offline se a prova real falhar; evento `online` restaura; nº de série
   da prova descarta resultado atrasado (falha velha não sobrescreve
   estado novo); "Tentar novamente" usa a mesma prova.
3. `App.jsx`: `hasLoadedOnce` era `onLoad` numa `<div>` (nunca dispara);
   agora é efeito na primeira renderização online. Queda de conexão no
   meio da sessão mostra o BANNER, sem esconder o app carregado.
**Revisão adversarial (3 revisores independentes):** veredito "sólida"
nos 3 ângulos (hooks React, PWA/Vercel, cenários do bug); os 2 achados
menores (corrida de prova atrasada, falta de timeout) foram corrigidos
antes do commit.
**Achado pré-existente registrado (FORA do escopo, pendência):** o
service worker gerado NUNCA INSTALA — o `navigateFallback` padrão do
vite-plugin-pwa ainda aponta pro `index.html`, que está fora do precache,
então o SW estoura `non-precached-url` na avaliação e morre. Efeito
prático hoje: nenhum cache de SW ativo (tudo vai à rede — comportamento
até desejável pra atualização), mas o PWA está sem casca offline. Correção
(rodada própria, com ordem do dono): `navigateFallback: null` explícito no
bloco workbox. NÃO mexido agora — DIR-35 proíbe tocar no workbox.
**Testes:** 570/570 (3 novos). **Build:** exit 0. **Lint:** limpo.
**Status final:** CONCLUÍDA — aguarda o dono recarregar o preview.

---

## REL-34.1 — Correção crítica: crash do CRM introduzido na DIR-34

**Data:** 01/09/2026.
**Sintoma (print do dono):** tela preta "Detectamos um problema"
(ErrorBoundary da raiz) ao abrir o CRM no preview da branch — em
QUALQUER aba. Os previews que "funcionavam" eram outros códigos:
`nj2my05ky` = branch de outra sessão (61c91dd) e `3gpd0i1wn` = produção
main (bc87d9c) — nenhum tem a DIR-34. Identificação feita SEM achismo:
mapeei cada URL congelada ao commit pelos deployments da Vercel
registrados no GitHub.
**Causa-raiz:** na DIR-34, o `filaContato` (linha ~270 do
CrmClientesTab) passou a ler `networkOportunidades`, declarado como
`const` ~580 linhas ABAIXO no mesmo corpo do componente. Temporal dead
zone: `ReferenceError: Cannot access 'networkOportunidades' before
initialization` na primeira renderização. Build e testes não pegam
(nenhum renderiza o componente) — mesma classe do caso
Briefcase/DollarSign do REL-25.
**Correção:** o memo `networkOportunidades` subiu pra antes do
`filaContato`; blindado também o `.trim()` do modal da esteira contra
`cliente_nome` nulo.
**Prova (navegador real, Playwright + Chromium, backend simulado):**
- SEM a correção: build ok, testes ok… e `Detectamos um problema` na
  carga — o print do dono, reproduzido.
- COM a correção: CRM carrega; aba 🚀 Expansão renderiza a Esteira
  completa (kanban 8 estágios, forecast, badge "7d parada", chip
  "⚠️ sem dinheiro na conta", ranking Conversão do Time) inclusive com
  linha SUJA (nulls em nome/tipo/datas); abas Clientes e Visão
  Executiva ok; ZERO erros de página nas três abas.
**Regra nova de verificação (aprendida em dobro):** mudança que toca
componente React não sai da rodada sem renderizar no navegador —
`vite preview` + Playwright com backend interceptado, cenário logado e
deslogado.
**Testes:** 570/570. **Build:** exit 0.
**Status final:** CONCLUÍDA — preview da branch volta a ser confiável.

---

## REL-36 — Execução da DIR-36 (CRM 100%: conexão, cronologia e visão geral)

**Data:** 01/09/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**O que foi feito (as 3 fases aprovadas pelo dono):**
1. CONECTAR:
   - "Nova oportunidade" ganhou busca de cliente EXISTENTE (mesma
     `buscaPessoa` da Árvore — nome/e-mail/telefone, sem acento): escolhe
     e preenche nome/e-mail/telefone sozinho, amarrando `cliente_user_id`
     ("🔗 amarrado ao cadastro").
   - Modal do cliente ganhou o bloco "Esteira de captação": as
     oportunidades DELE (estágio + valor) e o botão "+ Criar
     oportunidade", que leva pra Expansão com o formulário pronto.
   - Fechado 100% grava `venda_id` da venda real encontrada
     (`vendaRealDoCliente`, mesma regra do chip "💰 na conta" —
     `dinheiroNaConta` virou derivada dela; coluna existia e nunca era
     preenchida).
2. CRONOLOGIA:
   - Modal da oportunidade mostra a linha do tempo dos movimentos
     (quem/quando/de→para + dias no estágio atual) — era gravada e nunca
     exibida.
   - `src/lib/linhaDoTempoCliente.js` (nova, +2 testes): a história do
     cliente numa lista só — cadastro → depósitos reais → compras →
     arremates → esteira (criação e movimentos) + futuros (follow-up,
     reunião, recontato) no topo em âmbar. Modal do cliente renderiza.
3. VISÃO GERAL:
   - Card "Captação (meta R$ 1 mi)" ganhou o forecast: "· R$ X em
     esteira" (ponderado, mesmo escopo de quem vê).
   - 13º KPI no Dashboard da Diretoria: "Esteira de Captação (fechado +
     ponderado)" vs meta R$ 1 mi, tipo 'dado', mesma `resumoEsteira` do
     kanban (fonte única). Testes atualizados (12→13).
   - Faixa da esteira na Visão Executiva (fechado, ponderado, ativas)
     com atalho "Ver esteira →".
**Prova em navegador (regra do REL-34.1, Playwright + backend simulado
com cliente real: compra paga + depósito + oportunidade em Fechado 50%):**
17/17 verificações ✅ com ZERO erros de página — visão geral (faixa,
card com "R$ 10.000,00 em esteira" = 20.000×50%, KPI 13), modal do
cliente (bloco esteira, oportunidade listada, cronologia com depósito/
compra/entrada na esteira/movimento/cadastro), fluxo "Criar
oportunidade" → Expansão pré-preenchido e amarrado, busca com sugestão.
**Testes:** 575/575 (5 novos). **Build:** exit 0. Varredura
no-use-before-define limpa (só os 5 casos seguros dentro de useEffect).
**Status final:** CONCLUÍDA — aguarda conferência do dono no preview.

---

## REL-37 — Execução da DIR-37 (editar cadastro do cliente no modal)

**Data:** 01/09/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**O que foi feito:**
1. Botão "✏️ Editar" no cabeçalho do modal do cliente → "Corrigir
   cadastro": nome, telefone, CPF e e-mail, com salvar/cancelar.
2. Gravação no lugar certo por origem: manual → `customers` (via
   entityWrite, ator carimbado); conta do app → `app_users` SÓ para
   gerirVendedores (mesmo caminho do painel Admin), e-mail travado (é o
   login); automático sem cadastro → cria a linha manual corrigida
   (mesmo trilho das anotações DIR-24). Vendedor comum não vê o botão
   em conta de app.
3. Fusão (2 testes novos): correção manual passa a valer sobre contato
   INFERIDO de venda (nome/telefone); dados de conta do app continuam
   mandando.
4. Polimento: etiqueta de status some quando repetia a de tipo
   ("Cliente Cliente").
**Constatação de rodada:** cliente manual JÁ tinha editor completo
(clicar na linha da lista abre a página com endereço etc., DIR-25/29) —
o que faltava era corrigir SEM SAIR do modal aberto pela fila "Quem
contatar hoje", que era o caso do print do dono.
**Prova em navegador (regra REL-34.1):** 6/6 ✅ zero erros — modal aberto
pela fila, botão Editar, formulário, telefone trocado, POST
`/api/functions/entityWrite {table:'customers', action:'update',
payload.phone:'21999997777'}` capturado, modal fechando só com sucesso
(falha de servidor mantém o formulário aberto — comprovado no mock).
**Testes:** 577/577 (2 novos). **Build:** exit 0.
**Status final:** CONCLUÍDA — aguarda conferência do dono no preview.

---

## REL-34.2 — Esteira não salvava em produção/preview: tabela fora da whitelist

**Data:** 01/09/2026.
**Sintoma (print do dono):** "Erro ao salvar oportunidade — a tabela da
esteira já foi criada no banco?" ao salvar Renan Silva (aporte, Fechado
100%) no preview. A tabela EXISTE (migração aplicada em 30/08).
**Causa-raiz 1:** a rota oficial de escrita (`api/functions/entityWrite`)
tem whitelist de tabelas (`CONTENT_TABLES`) e `captacao_oportunidades`
NÃO estava nela — a DIR-34 criou tabela, RLS e adapter, mas esqueceu o
porteiro do servidor. Para operador (super_admin), TODA gravação da
esteira era recusada com "tabela não permitida". Meus testes de
navegador simulavam justamente essa rota — o simulador escondeu a falha.
**Correção 1:** tabela na whitelist + trava explícita de DELETE
("oportunidade não se apaga, marque Sem interesse com o motivo") —
necessária aqui porque a rota escreve com service_role, que passa por
cima da ausência proposital de política de DELETE no RLS.
**Causa-raiz 2 (vista no MESMO print):** o dono digitou "200.000" no
valor — campo numérico do navegador lê ponto como decimal: ia salvar
R$ 200,00 em vez de R$ 200.000,00, em silêncio. **Correção 2:**
`parseValorBR` em `src/lib/money.js` ("200.000"=200000;
"200.000,50"=200000,50; "99.90"=99,90), campo vira texto com
`inputMode=decimal` e mostra a leitura ao vivo ("= R$ 200.000,00")
embaixo do campo; o salvar usa o mesmo parser.
**Prova:** teste de regressão NOVO invoca o HANDLER REAL do entityWrite
(req/res falsos): `captacao_oportunidades` passa da whitelist, DELETE
recusado com 403, tabela desconhecida segue 400. Parser com 4 testes.
**Testes:** 584/584 (7 novos). **Build:** exit 0.
**Lição registrada:** rota de servidor nova ou tabela nova só fecham
rodada com um teste que chama o handler REAL — mock de rota própria não
prova o porteiro dela.
**Status final:** CONCLUÍDA — dono deve tentar salvar de novo no preview.

---

## REL-38 — Execução da DIR-38 (Visão Executiva = centro de comando)

**Data:** 01/09/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**O que foi feito:**
1. `src/lib/agendaEsteira.js` (+3 testes): agenda do dia da esteira
   (reuniões HOJE, atrasadas, próximos 7 dias, recontatos vencidos — só
   de oportunidade ATIVA) e reuniões por responsável (hoje × marcadas).
   `fechadoProvado` em esteiraCaptacao: 100% com venda real casada
   ("na conta") separado do 100% só declarado.
2. `CrmEsteiraResumoExecutivo.jsx` — o centro de comando, substituindo a
   faixa simples da DIR-36 na Visão Executiva:
   - PROJEÇÃO da meta de captação R$ 1 mi numa barra tricolor honesta:
     verde = na conta (real) · âmbar = declarado · cinza = ponderado,
     com o % do caminho;
   - FUNIL EM CHIPS: os 8 estágios com quantidade e valor curto
     ("Agendadas 1 · R$ 30 mil … 100% fechado 2 · R$ 250 mil"),
     estágio vazio esmaecido — bate o olho e entende;
   - AGENDA DE HOJE: reuniões hoje (com os nomes), atrasadas em
     vermelho, próximos 7 dias, recontatos vencidos em âmbar;
   - TIME (visão total): reuniões hoje × marcadas × win rate por
     responsável (win rate da mesma conversaoPorResponsavel do kanban).
**Decisão de honestidade mantida:** aporte declarado NÃO se soma na meta
de vendas de R$ 5 mi (venda real Loja+Leilão+PDV) — as duas metas ficam
lado a lado na mesma aba (Meta Central acima, captação no bloco novo), e
o fechado se divide em na-conta × declarado. Quando o aporte REAL cair
(partner_plan pago), ele entra sozinho em "na conta" e na Captação do
hero — sem mão humana.
**Prova em navegador (regra REL-34.1):** 10/10 ✅ zero erros com cenário
rico (100% provado R$ 50 mil + 100% declarado R$ 200 mil + reuniões
hoje/atrasada/recontato + 2 responsáveis) — barra, chips, agenda, tabela
do time e KPI 13 (R$ 336.200 = 250 mil fechado + 86,2 mil ponderado,
conferido na mão).
**Testes:** 587/587 (3 novos). **Build:** exit 0.
**Status final:** CONCLUÍDA — aguarda conferência do dono no preview.

---

## REL-39 — Execução da DIR-39 (Time Corporativo + indicação rastreada)

**Data:** 01/09/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**O que foi feito:**
1. `src/lib/timeCorporativo.js` (+3 testes): CARGOS_TOPO = Sócio
   Executivo → Fundador (Trainee fora — em formação; TODOS os demais
   entram, confirmado pelo dono); `ehExecutivoTopo`; `membrosDoTopo`
   (função principal = primary quando é do topo, senão o maior cargo;
   ordenado pela hierarquia). Fonte única sobre careerLevels — aliases
   legados ('executivo' → executivo_conta) resolvem sozinhos.
2. Aba "Vendedores" → "🏛️ Time Corporativo" (CrmTimeCorporativo.jsx):
   lista automática dos membros do topo cadastrados no app (nome,
   contato, função principal com a cor oficial do cargo, outros cargos)
   + filtro por função. A tabela manual de vendedores saiu SÓ da
   listagem (dados preservados, confirmado); botão/modal "Novo
   Vendedor" continuam.
3. Esteira: "Executivo responsável *" — seletor APENAS com o topo
   (id+nome do app_user; registro legado com responsável fora do topo
   segue visível sem sumir); salvar bloqueado sem executivo, com aviso.
   Campo novo "Indicação da estrutura (opcional)": mesma busca de
   pessoa do CRM sobre TODOS os usuários cadastrados — indicação sem
   cadastro não existe; grava indicacao_user_id/nome; cartão do kanban
   ganha o chip "via {indicação}".
4. Migração `20260901150000_captacao_indicacao.sql` (DONO COLA):
   colunas indicacao_user_id/indicacao_nome. ANTES de colar, o salvar
   continua funcionando (a rota remove coluna inexistente e regrava) —
   só a indicação deixa de ser persistida até o SQL rodar.
**Prova em navegador (regra REL-34.1):** 10/10 ✅ zero erros — aba
renomeada com 3 membros do topo (CEO/Sócio Executivo/Embaixador),
usuário de rede fora da lista, filtro por função funcionando, seletor
de responsável só com o topo, indicação sugerindo usuário cadastrado,
chip "via {nome}" no cartão.
**Testes:** 590/590 (3 novos). **Build:** exit 0.
**Ação do dono:** ✅ FEITA — migração da indicação colada e aplicada no
SQL Editor em 01/09/2026 ("Success. No rows returned"). Colunas
indicacao_user_id/indicacao_nome vivas em produção — a indicação passa a
ser gravada de verdade.
**Status final:** CONCLUÍDA — banco pronto; aguarda conferência no
preview e o "pode" do pacote DIR-34→39.

---

## REL-40 — Execução da DIR-40 (aporte recebido por fora, auditado)

**Data:** 01/09/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**O que foi feito:**
1. Migração `20260901180000_captacao_aporte_externo.sql` (DONO COLA):
   coluna `aporte_externo JSONB` na esteira.
2. `esteiraCaptacao.js`: BANCOS_APORTE_EXTERNO = **Santander e Itaú
   SOMENTE** (regra do dono); `aporteExternoValido`; `dinheiroNaConta`
   aceita venda real OU aporte externo registrado — o chip verde passa a
   mostrar o banco ("💰 na conta (Santander)"); `fechadoProvado` conta o
   externo como "na conta".
3. Modal (Fechado 100% sem dinheiro rastreado, SÓ para quem vê dinheiro
   da empresa): aviso âmbar explica os dois caminhos (amarrar o cliente
   certo se pagou pelo app; registrar por fora se foi transferência) →
   formulário banco/valor/data com leitura do valor em pt-BR e aviso
   ANTI-DUPLA-CONTAGEM (não registrar também como ativação manual de
   plano) → grava com carimbo registrado_por/registrado_por_id/em.
4. `calcularCaptacao` ganhou o 3º parâmetro: aporte externo válido soma
   no balde "Aportes Parceiro de Compra" — card Captação, barra da meta
   R$ 1 mi e bloco executivo leem a MESMA fonte (sem divergência).
**Prova em navegador (regra REL-34.1):** 11/11 ✅ zero erros — ciclo
completo: chip âmbar → botão → só Santander/Itaú no seletor → aviso de
dupla contagem → PATCH auditado capturado (banco, valor 200000, data,
registrado_por) → chip "💰 na conta (Santander)" → "Na conta:
R$ 200.000,00" na executiva → hero Captação R$ 200.000,00.
**Testes:** 593/593 (3 novos). **Build:** exit 0.
**Status final:** CONCLUÍDA — aguarda o dono colar o SQL e registrar o
aporte do Renan Silva.

---

## REL-41 — Execução da DIR-41 (O Método no CRM: FORM, PPV e Verificação)

**Data:** 01/09/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**O que foi feito (as 3 fases do plano aprovado — "VAMOS FAZER"):**
1. FORM (Hábito 4): bloco F.O.R.M. no modal do cliente (Família,
   Ocupação, Recreação, Mensagem certa — mesmo salvar das anotações,
   trilho DIR-24); fusão carrega o FORM pra linha automática (+1 teste);
   a fila "Quem contatar hoje" mostra a dica 💡 (a Mensagem, ou
   Ocupação · Recreação) ANTES do botão do WhatsApp — ninguém aborda no
   escuro.
2. PPV + objeções (Hábitos 5-6): `semPPV` na lib (ativa sem reunião
   futura nem recontato futuro = negociação morrendo) → badge vermelho
   "⚠️ sem PPV" no cartão do kanban; OBJECOES_METODO oficiais do deck
   (não tenho dinheiro / preciso pensar / tenho medo / não conheço /
   outra) + campo "Objeção atual" no modal + `placarObjecoes` (só
   ativas, ordenado pela dor). Salvar NÃO tranca por falta de PPV —
   avisa e marca (regra da diretiva).
3. Verificação + duplicação (Hábitos 7-8): centro de comando ganhou
   "🚫 N sem PPV" na agenda, o placar "Objeções travando a esteira" e a
   coluna "Sem PPV" por responsável na tabela do time; botão
   "📖 O Método" abre o resumo dos 8 hábitos dentro do CRM
   (CrmMetodoModal — o time novo aprende onde trabalha).
**Migração** `20260901210000_metodo_form_ppv.sql` (DONO COLA):
customers.form_metodo JSONB + captacao_oportunidades.objecao TEXT.
Antes de colar, tudo continua funcionando (writeResilient descarta
coluna inexistente) — FORM e objeção só persistem após o SQL.
**Prova em navegador (regra REL-34.1):** 11/11 ✅ zero erros — sem PPV
no kanban e na executiva (total + por responsável), placar de objeções,
modal do método com os 8 hábitos, campo de objeção carregando do banco,
dica 💡 do FORM na fila e bloco F.O.R.M. no modal do cliente com dados
persistidos.
**Testes:** 596/596 (3 novos). **Build:** exit 0. **Lint:** zero erros.
**Ação do dono:** ✅ FEITA — migração do método colada e aplicada no SQL
Editor em 01/09/2026 ("Success. No rows returned"). form_metodo e
objecao vivos em produção — FORM e objeções persistem de verdade.
**Status final:** CONCLUÍDA — banco pronto; aguarda conferência no
preview e o "pode" do pacote DIR-34→41.

---

## REL-42 — Execução da DIR-42 (um preview só, com selo na página)

**Data:** 01/09/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**Diagnóstico (dado real da Vercel):** o dono vivia abrindo URLs de
deploy CONGELADAS (leilonozap-XXXX-...) — cada push cria uma nova, e
nelas o aviso de atualização nunca dispara (o /version.json congelado
não muda). O link VIVO da branch (branchAlias, com "-git-") está
carimbado em todos os deploys e já tem o aviso de atualização
funcionando (useAppVersion, 60s).
**O que foi feito:**
1. `src/lib/previewInfo.js` (+5 testes): `tipoDeHost` — preview_oficial
   (vercel.app com -git-) · deploy_congelado (vercel.app sem -git-) ·
   producao (site/custom/localhost); `dataDoBuild` (carimbo → DD/MM
   HH:mm).
2. `SeloPreview.jsx` no App: no link oficial, selo verde discreto
   "🧪 Preview oficial · build DD/MM HH:mm"; em página congelada, faixa
   âmbar "⚠️ Esta é uma página ANTIGA — nunca recebe atualização" com
   link de UM clique pro MESMO caminho no preview oficial; em produção,
   nada.
**Prova em navegador (regra REL-34.1):** 5/5 ✅ — hosts simulados: faixa
âmbar no congelado com link preservando caminho e query; selo verde no
oficial; nada em produção/dev.
**Testes:** 600/600 (4 novos). **Build:** exit 0.
**Fluxo oficial registrado pro dono:** 1 link só (o branchAlias), o
aviso de "nova versão" aparece sozinho nele a cada deploy; publicação no
site é o passo seguinte, só com o "pode".
**Status final:** CONCLUÍDA.

---

## REL-43 — Execução da DIR-43 (O Método VIVO: painel dos 8 Hábitos)

**Data:** 01/09/2026.
**Branch:** `claude/project-structure-analysis-r1prad`.
**Arquitetura (correção do dono acatada em pleno voo):** o painel deixa
de se chamar CRM — vira "🏆 Os 8 Hábitos do Sucesso", com navegação
pelos 8 hábitos; o CRM mora DENTRO: Hábito 6 (Acompanhamento e
Fechamento) = Clientes + Esteira/Expansão com alternador interno;
Hábito 7 (Verificação do Progresso) = a Visão Executiva. Nenhuma
funcionalidade existente foi perdida — só reorganizada sob o método.
**O que foi construído:**
1. 🌟 Sonho — quadro dos sonhos editável (adicionar/remover, salvo por
   usuário em metodo_perfil.sonhos).
2. ✅ Compromisso — MASTER TASK diário ("Trello" do dia): navegação por
   dia, "⚡ Gerar meu dia" cria as 16 tarefas da ROTINA DITADA PELO DONO
   (05:00 acordar → post → corrida → leitura → 08:30 empresa → 09:00
   treinamento → posts → 10:00 abrir a loja → 10:30-11:30 organização +
   confirmar reuniões → 3 reuniões de 45-60min → fechar contratos →
   fechamento do dia → leitura e dormir cedo), agrupadas por
   Manhã/Tarde/Noite, marcar feito com barra de progresso,
   adicionar/apagar tarefa.
3. 🤝 Lista de Network — contatos manuais qualificados de 1 A 5
   ESTRELAS inline (customers.qualificacao), ordenados pela estrela,
   botão que abre o Novo Cliente.
4. 📜 Contato e Convite — o SCRIPT PESSOAL de cada um (com modelo de
   exemplo no placeholder) + lembrete do F.O.R.M.
5. 🎤 Apresentação — placar "X de 3 reuniões hoje (meta do método)",
   agenda das reuniões da esteira (7 dias) com botão GOOGLE AGENDA por
   reunião (URL de template oficial — sem OAuth), campo do link da
   apresentação oficial, atalho pra agendar na esteira.
6. 🔁 Duplicação — os 8 hábitos completos + estrutura do local de
   treinamento (materiais entram conforme o time gravar).
**Infra:** migração `20260901230000_metodo_vivo.sql` (DONO COLA):
metodo_perfil + metodo_tarefas (com DELETE — tarefa pessoal se apaga) +
customers.qualificacao; TABLE_MAP + whitelist do entityWrite (com
regressão no handler REAL — lição do REL-34.2); `src/lib/metodo.js`
como fonte única (+8 testes, incluindo um bug real pego: hora vazia
caía em "manhã").
**Prova em navegador (regra REL-34.1):** 21/21 ✅ zero erros — título e
8 abas, quadro do sonho, Master Task gerando o dia da rotina e marcando
progresso, estrelas gravando pela rota auditada, script carregando,
agenda com link correto do Google Calendar, sub-abas do Hábito 6 com o
CRM inteiro funcionando, Verificação abrindo por padrão pro admin.
**Testes:** 608/608 (10 novos). **Build:** exit 0.
**Ação do dono:** ✅ FEITA — migração do Método vivo colada e aplicada no
SQL Editor em 01/09/2026 ("Success. No rows returned"). metodo_perfil,
metodo_tarefas e customers.qualificacao vivos em produção.
**Status final:** CONCLUÍDA — banco pronto; painel dos 8 Hábitos
operante de ponta a ponta no preview.

---

## REL-PUB-01/09/2026 — Publicação em produção do pacote DIR-34→43

**Autorização:** dono, por escrito: "pode publicar em produção".
**O que foi publicado:** todo o pacote DIR-34→43 — Esteira de Captação,
correções de conexão e do crash da raiz, CRM conectado com cronologia,
edição de cadastro, centro de comando executivo, Time Corporativo com
indicação rastreada, aporte externo Santander/Itaú auditado, o Método
(FORM/PPV/objeções), selo do preview e o painel "Os 8 Hábitos do
Sucesso" com o CRM dentro.
**Ritual executado:** main (c7757d9f) mergeada na branch SEM conflito →
644/644 testes → build exit 0 → PR #154 → squash-merge → main =
`bb8f6d20`. As 5 migrações do pacote já estavam aplicadas pelo dono
antes do merge ("Success. No rows returned" em todas).
**Incidente no deploy:** o build de PRODUÇÃO do bb8f6d20 na Vercel
COMPILOU em 45s e depois falhou com erro interno da plataforma ("An
unexpected error occurred when running this build. This may be a
transient issue, please try rebuilding your project") — enquanto o
preview do MESMO commit ficou READY. Não é erro do código: é falha
transitória da Vercel, tratada com UM redisparo (este commit → PR →
merge) conforme a regra da casa de re-execução única para falha de
plataforma. Produção seguiu servindo o c7757d9f (site no ar, sem
downtime) até o redisparo completar.

---

## REL-44 — Quadro dos Sonhos de verdade: curto/médio/longo com imagem (DIR-44)

**Ordem do dono (03/09/2026, áudio):** sonho em três prazos (curto 1-2
anos, médio 2-4, longo 5+), quantas imagens quiser por área, busca de
imagem na internet SEM SAIR DO MODAL (pelo nome) ou upload, quadro grande
com imagens retangulares bem espaçadas, explicação do que é o sonho,
detalhes escritos embaixo de cada imagem com orientação (carro → ano, cor,
banco de couro, roda), e detalhes automáticos se o sistema conseguir ler a
imagem — senão a pessoa escreve.
**O que foi construído (tudo REUSANDO a infra da casa):**
1. Painel do Sonho virou o QUADRO: explicação + 3 molduras por horizonte,
   grade de cartões retangulares (imagem 4:3, título e detalhes embaixo),
   remover por cartão, sonho legado `{titulo}` segue aparecendo (curto).
2. `CrmSonhoModal`: prazo → nome → 🔍 busca na internet (rota
   `extractGoogleShoppingImages` do catálogo, grade multi-seleção) ou 📤
   upload (`Core.UploadFile` + `convertToWebP`). Imagem da busca é
   re-hospedada pela rota `proxyImage` no nosso bucket (thumbnail de
   terceiro morre; fallback pra URL original se o proxy falhar). Caminho
   só-texto preservado.
3. Detalhes guiados: placeholder com a orientação ditada; botão
   "✨ Preencher com IA" chama a rota NOVA `descreverImagemSonho`
   (visão pelo Vercel AI Gateway, molde do atendimentoIA, porteiro
   anti-SSRF `conferirUrl`, crachá `exigirSessao`) — a IA preenche o
   textarea, o HUMANO revisa e salva. Sem chave/erro → aviso honesto e
   escrita manual (fallback autorizado pelo dono).
4. Fonte única em `metodo.js` (HORIZONTES_SONHO, normalizarSonho,
   agruparSonhosPorHorizonte com índice real, placeholder) e
   `buscaFotos.js` (lerRespostaFotos — leitura extraída do BuscadorFotos,
   distinção sem_resultado × falha_busca). SEM migração: sonhos é JSONB.
**Prova em navegador (regra REL-34.1): 37/37 ✅ zero erros** — render
logado, 3 horizontes, modal com busca mockada na rota real, multi-seleção,
proxy das 2 imagens, escrita auditada via entityWrite (create com os 2
sonhos no curto), placeholder guiado, IA preenchendo o textarea, detalhes
salvos e exibidos, upload pro Storage sem passar no proxy, item no médio,
remoção tirando SÓ o cartão certo, caminho só-texto no longo, raiz
deslogada de pé.
**Bug real pego PELO navegador:** o botão de confirmação dizia "Adicionar
2 imagems" (plural errado por concatenação) — teste de unidade nunca
pegaria; a prova renderizada pegou.
**Testes:** 644 → 664 (20 novos: horizontes/agrupamento/placeholder,
lerRespostaFotos, handler REAL do descreverImagemSonho com gateway
mockado, incluindo SESSAO_MODO=bloquear com crachá forjado). **Build:**
exit 0.
**Pendências registradas (sem ordem, não mexi):** callers antigos de
proxyImage lendo `.data.file_url` (5 telas fora do CRM); GoogleShoppingImporter
e CreateAuction lendo shape antigo do Deno; chaves SERPAPI/SEARCHAPI com
cota/visibilidade incerta na Vercel (a busca degrada com mensagem honesta);
AI_GATEWAY_API_KEY pode não estar publicada (needs_key gracioso).
**Status:** CONCLUÍDA no preview — aguardando o dono ver e autorizar
produção.

### REL-44.1 — Adendo: colar o endereço da imagem (03/09/2026)

Dono aprovou o quadro ("ficou ótimo") e pediu o que faltava: um campo pra
COLAR o endereço de uma imagem e adicionar por ele. Feito no mesmo modal:
campo "cole aqui o endereço da imagem (https://...)" + botão Usar — valida
http(s), entra na galeria já marcada, conta na multi-seleção e passa pelo
MESMO proxyImage na confirmação (link colado também morre). Prova em
navegador re-rodada COMPLETA: 42/42 ✅ zero erros (5 passos novos: usar o
endereço, marcada na galeria, confirmação, cartão no quadro, proxy da URL
colada). Suíte 664/664, build ok. Segue no preview aguardando o "pode".

### REL-44.2 — Por que a IA de visão não acende + o caminho pra ligar (03/09/2026)

Dono viu o aviso "A IA de visão ainda não está conectada". Investigado SEM
achismo: a rota ganhou fallback pro VERCEL_OIDC_TOKEN (molde do InvokeLLM)
e um GET ?diag=1 que responde só booleanos; medido no preview:
`tem_chave:false, tem_oidc:false` — o projeto NÃO tem nenhuma credencial
de IA publicada na Vercel (nem AI_GATEWAY_API_KEY, nem OIDC ativo). Por
isso a visão do sonho, a IA de atendimento (atendimentoIA), o InvokeLLM e
o GenerateImage estão todos dormindo — é UMA configuração de painel, não
código. Ação do dono (2 min no painel da Vercel): criar a chave no AI
Gateway e publicar como AI_GATEWAY_API_KEY no projeto leilonozap (todas as
envs) + redeploy. 666/666 testes (fallback OIDC e diag testados no handler
real). Upgrades prometidos pra quando a chave existir: preencher sozinho ao
adicionar a imagem, ler a URL colada e sugerir título — rodada própria.

### REL-44.3 — Ordem do dono: "melhor, tire a IA" (03/09/2026)

Removida a IA do Quadro dos Sonhos: sai o botão ✨ Preencher com IA, sai a
rota descreverImagemSonho e sai o teste dela (tudo recuperável no git se um
dia voltar). Fica o que sempre funcionou sem depender de chave: o campo de
detalhes escrito na mão com a orientação guiada (carro → ano, cor, banco de
couro, roda). Prova em navegador re-rodada inteira: 40/40 ✅ zero erros,
incluindo o passo novo "NENHUM botão de IA na tela". Suíte volta a 657
(saíram os 9 do handler removido), build ok.

---

## REL-PUB-03/09/2026 — Publicação em produção da DIR-44 (Quadro dos Sonhos)

**Autorização:** dono, por escrito: "PODE COLOCAR EM PRODUÇÃO ESSA FASE
TERMINADA".
**O que foi publicado:** o Quadro dos Sonhos completo — 3 molduras por
prazo (curto 1-2 · médio 2-4 · longo 5+), imagens ilimitadas por área via
busca no modal / upload / endereço colado (com re-hospedagem pelo
proxyImage), detalhes guiados embaixo de cada imagem, IA removida por
ordem (REL-44.3). Sem migração de banco.
**Ritual:** main (41bcc0f9, que trouxe a frente da vitrine/ofertas)
mergeada na branch sem conflito → 799/799 testes → build exit 0 → PR #167
→ squash-merge → main = `f0472ce1` → branch realinhada. Deploy de
PRODUÇÃO: **success** de primeira; version.json do alias da main
respondendo com o carimbo do build novo (13:05 UTC). leilaonozap.net no ar
com o quadro.
**Status:** CONCLUÍDA E PUBLICADA.

---

## REL-45 — A Rotina Perfeita: Hábito 2 vira narrativa de autoridade (DIR-45)

**Ordem do dono (03/09/2026, documento completo por escrito):** renomear o
gerador pra "Gerar Minha Rotina Perfeita (Rotina do Método)" e transformar
a rotina em narrativa diária nas redes — "primeiro seja interessante,
depois desperte interesse"; DISCIPLINA → HUMANIDADE → EVOLUÇÃO →
CREDIBILIDADE → NEGÓCIO.
**O que foi construído:**
1. ROTINA_PADRAO reescrita com o conteúdo DITADO: 19 itens, das 05:00 às
   21:30, com os momentos novos (Story ANTES do treino, Story DURANTE,
   Final do treino com começou→fez→terminou, caminho pra empresa sem
   forçar conteúdo, chegada mostrando o ambiente como prova de realidade,
   organização com as "3 coisas do dia", post do aprendizado em 1-3 min,
   ABRIR A LOJA às 10h como horário simbólico com a sequência
   inspiração→aplicação→negócio→comparação→Leilão NoZap, reuniões sempre
   com PRÓXIMO PASSO DEFINIDO, 17:30 nenhuma oportunidade solta, 18:30
   prometi/fiz/pendente/amanhã, 21:30 dormir cedo é preparação).
2. Cada item tem `guia` — a orientação estratégica do dono, condensada com
   fidelidade — aberto pelo botão 📖 no cartão do Master Task (guia mora
   na lib; tarefa customizada não tem; SEM migração).
3. Painel do Compromisso ganhou o bloco do princípio (percepções + regra)
   e a escada "ver a lógica do dia" (Tenho propósito → ... → Presto contas
   do meu próprio dia).
4. Botão renomeado; subtítulo atualizado.
**Prova em navegador (REL-34.1): 52/52 ✅ zero erros** — princípio e regra
na tela, escada aberta, botão novo, gerar criou as 19 tarefas via
entityWrite, períodos e itens novos renderizados, guia do ABRIR A LOJA
expandindo com o conteúdo certo (mais toda a regressão do Quadro dos
Sonhos re-rodada).
**Testes:** 799 → 800 (o teste da rotina virou dois: os 19 itens ditados,
guia em todos, princípio e narrativa fiéis — e pegou minha contagem errada
de 18 antes de qualquer entrega).
**Build:** exit 0. **Status:** CONCLUÍDA no preview — aguardando o "pode"
pra produção.

### REL-45.1 — Correção do dono na Rotina Perfeita (v2, 03/09/2026)

Dono corrigiu o fluxo por escrito e mantive fidelidade total: (1) 06:45 é
o TÉRMINO do treino + post (preparação → execução → conclusão), com a
leitura vindo APÓS o treino; (2) na chegada à empresa NÃO existe
"organização do dia" — é organização física do AMBIENTE (sala, mesas,
materiais, equipamentos; "organização externa influencia organização
interna"; todos ajudam, não importa o cargo); (3) item novo 08:55 — TODOS
posicionados na sala de treinamento, com a regra cultural em destaque:
"09:00 não é horário de chegar. 09:00 é horário de começar." A cadeia do
princípio virou VIDA INTERESSANTE → PROVA SOCIAL → AUTORIDADE → CONFIANÇA
→ NEGÓCIO → VENDA, a escada da narrativa cresceu pra 16 degraus (até
"Preparo o próximo dia") e o Master Task do dia agora nasce com 20
tarefas. Prova em navegador re-rodada inteira: 52/52 ✅ zero erros
(incluindo as três correções visíveis na tela). Suíte 800/800, build ok.

### REL-45.2 — "Não está aparecendo no preview": diagnóstico + regerar o dia (03/09/2026)

Dono estranhou a lista antiga no preview. Diagnóstico com o print dele
mesmo: a v2 ESTAVA publicada (o bloco do princípio novo aparece na tela);
o que estava antigo eram os DADOS — o Master Task de hoje foi gerado dias
antes com a rotina velha e ficou salvo em metodo_tarefas ("0/16 feitas"
com os títulos antigos). A rotina nova só entra quando um dia é GERADO.
Faltava a ferramenta permitir regerar: agora um dia já gerado mostra
"⚡ Este dia foi gerado com a rotina antiga? Gerar de novo com a Rotina
Perfeita (20 tarefas)" — com confirmação explícita (avisa que apaga as
tarefas do dia, feitas e não feitas) antes de apagar e recriar. Prova em
navegador: 57/57 ✅ zero erros (5 passos novos: link no dia cheio,
confirmação, 20 apagadas + 20 criadas, dia regenerado com 0/20 e ABRIR A
LOJA na tela). Suíte 800/800, build ok.
