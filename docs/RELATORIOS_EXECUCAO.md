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

---

## REL-46 — Lista de Network QUALIFICADA: 3 notas, produto e probabilidade (DIR-46)

**Ordem do dono (03/09/2026):** agenda de contatos com qualificação de 1 a
5 em três dimensões — confiança em mim, condição financeira e apetite ao
produto APRESENTADO — com modal onde o executivo escolhe o produto
(Parceiro de Compra ou Licenças) e a probabilidade de fechamento visível
na lista. Fidelidade de conta: o exemplo ditado (3+4+5) soma 12/15 — o
"14" falado era lapso; a regra implementada é a SOMA.
**O que foi construído:**
1. Fonte única em `metodo.js`: produtos, dimensões, totalQualificacao
   (3-15) e probabilidadeFechamento com régua TRANSPARENTE —
   pct = (total−3)/12 → 1/1/1 = 0% ❄️, 3/3/3 = 50% 🌤️, 3/4/5 = 75% 🔥,
   5/5/5 = 100%. Faixas: quente ≥70 · morno ≥40 · frio.
2. `CrmNetworkQualificacaoModal`: produto em 2 botões, 3 linhas de fichas
   1-5, total e probabilidade AO VIVO, salvar travado até completar.
3. Hábito 3 virou a agenda qualificada: busca por nome/telefone/e-mail,
   ordenada por probabilidade (não qualificados por último), linha com as
   3 notas + produto + total X/15 + probabilidade colorida por faixa;
   contador "N pessoas · M qualificadas". Estrela única legada intocada.
4. Migração `20260903150000_network_qualificacao.sql` (DONO COLA ANTES DE
   QUALIFICAR — sem ela o writeResilient descarta a coluna e a nota não
   persiste): `customers.qualificacao_network JSONB`.
**Prova em navegador (REL-34.1): 69/69 ✅ zero erros** — agenda com
contadores, modal com os 2 produtos, notas 3/4/5 mostrando 12/15 e 75%
Quente ao vivo, escrita auditada via entityWrite com o JSONB exato,
probabilidade na linha após salvar, busca filtrando (+ toda a regressão
Sonho/Rotina re-rodada).
**Testes:** 800 → 806 (6 novos: produtos/dimensões, exemplo do dono,
pontas e meio da régua, incompleta → null).
**Ação do dono:** ✅ FEITA — migração da DIR-46 colada e aplicada no SQL
Editor em 03/09/2026 ("Success. No rows returned").
customers.qualificacao_network vivo em produção.
**Status:** CONCLUÍDA — banco pronto; agenda qualificada operante de ponta
a ponta no preview, aguardando o "pode" pra publicar.

---

## REL-47 — Contato e Convite vivo: fila, registro, agenda e Google (DIR-47)

**Ordem do dono (03/09/2026):** os qualificados da lista aparecendo no
Contato e Convite; registro do contato (feito, agendado, pediu pra
retornar e os demais desfechos); Google Agenda no agendado; a pessoa
conectando a Google Agenda DELA; e o super admin vendo todas as agendas
do dia.
**O que foi construído:**
1. 🎯 FILA DOS QUALIFICADOS: os contatos qualificados na DIR-46 aparecem
   no Hábito 4 ordenados por probabilidade, cada um com "Registrar
   contato". Sem qualificados → atalho honesto pro Hábito 3.
2. 📜 REGISTRO DO CONTATO (modal): 5 desfechos — ✅ feito · 📅 reunião
   agendada (data/hora + botão GOOGLE AGENDA na hora, com o evento
   pronto) · 🔁 pediu pra retornar (data) · 📵 não atendeu · 🚫 sem
   interesse — com observação e carimbo de quem registrou/quando.
   Histórico append-only em customers.contatos_metodo.
3. 📅 AGENDA DO DIA: agendados de hoje (com Google Agenda por item) +
   reuniões da esteira de hoje + retornos vencendo hoje (com atalho pra
   registrar). O SUPER ADMIN vê o time inteiro porque o escopo dele é a
   lista toda; cada executivo vê a própria carteira (mesma régua de
   escopo da DIR-24).
4. 🗓️ MINHA GOOGLE AGENDA: botão conecta a conta Google DA PRÓPRIA
   pessoa (GIS token client, calendar.readonly, MESMO GOOGLE_CLIENT_ID
   do login) e lista os eventos de hoje — só leitura, token vive no
   navegador dela, nada passa pelo servidor. Honestidade: o admin NÃO vê
   a Google pessoal dos outros (impossível sem cada um conectar); ele vê
   todas as agendas DO MÉTODO. Se o Google mostrar aviso de "app não
   verificado" no primeiro uso do escopo de agenda, a verificação no
   console Google é ação futura do dono.
5. O script pessoal continua no painel.
**Prova em navegador (REL-34.1): 85/85 ✅ zero erros** — fila com o
qualificado e a probabilidade, modal com os 5 desfechos, agendamento às
18:00 gravado com carimbo, reunião na agenda do dia com botão Google,
retorno de hoje aparecendo, e a conexão Google stubada de ponta a ponta
(script GIS + Calendar API) rendendo os eventos na tela.
**Testes:** 806 → 809 (desfechos, validação do registro, agenda do dia
com escopo).
**Migração (DONO COLA ANTES DE USAR):**
`20260903190000_contatos_metodo.sql` — customers.contatos_metodo JSONB.
**Status:** CONCLUÍDA no preview — aguardando migração + "pode".

---

## REL-PUB-03/09/2026-2 — Publicação em produção das DIR-45→47

**Autorização:** dono, por escrito: "pode publicar, manda sql que falta".
**O que foi publicado:** Rotina Perfeita v2 com guia por horário e regerar
dia (DIR-45), Lista de Network qualificada com probabilidade (DIR-46) e
Contato e Convite vivo — fila, registro de desfecho, agenda do dia e
Google Agenda pessoal (DIR-47).
**Ritual:** main já sincronizada (sem novidades de outra frente) →
809/809 testes → build exit 0 → PR #169 → squash-merge → main =
`815c8f78` → branch realinhada. Deploy de PRODUÇÃO: **success** de
primeira; version.json do alias da main com o carimbo do build novo
(14:57 UTC). leilaonozap.net no ar.
**Pendências de configuração do dono (fora do código):** ✅ migração da
DIR-47 (contatos_metodo) colada e aplicada em 03/09/2026 ("Success. No
rows returned") — registro de contato gravando em produção. Restam:
ativar a Google Calendar API no console Google (pra conexão da agenda);
opcional: registrar a origem do preview no cliente OAuth (produção já
registrada — origin_mismatch era só no preview).
**Status:** CONCLUÍDA E PUBLICADA.

---

## REL-48 — Agendador de reuniões de verdade, criando o evento no Google (DIR-48)

**Ordem do dono (03/09/2026, logo após conectar a agenda com sucesso):**
"precisa abrir um modal pra eu agendar a reunião, detalhes e etc, como um
agendador normal, como o mercado funciona — junto disso o Google Agenda".
**O que foi construído:**
1. O desfecho "📅 Reunião agendada" virou o AGENDADOR COMPLETO: data e
   hora, duração (30/45/60/90), título pré-preenchido com o nome do
   contato (editável), local ou link da chamada, detalhes.
2. Botão "📅 Agendar reunião" no cabeçalho da Agenda do dia — abre o
   mesmo agendador com seletor de contato ("Com quem é a reunião?").
3. CRIAÇÃO REAL NO GOOGLE: checkbox "Criar na minha Google Agenda"
   (ligada por padrão) — o evento é CRIADO via Calendar API na agenda da
   própria pessoa (scope calendar.events + readonly num só consentimento;
   token da sessão, nada no servidor; anti-duplo-clique no salvar). O
   registro guarda o google_event_link e o item da Agenda do dia vira
   "Abrir no Google". FALLBACK honesto: sem conexão/erro, salva do mesmo
   jeito e fica o botão de link de template — agendar nunca trava.
4. `eventoGoogleDaReuniao` em metodo.js: fonte única testada do corpo do
   evento (summary/description/location/start/end com timezone, virada de
   dia correta, início inválido → null).
**Prova em navegador (REL-34.1): 87/87 ✅ zero erros** — agendador com
todos os campos e título pré-preenchido, POST real (stubado) na Calendar
API com summary e 60 min exatos, histórico com link do evento criado,
"Abrir no Google" na agenda, agendamento livre pelo cabeçalho com seletor
escolhendo outro contato e checkbox desligada NÃO criando no Google.
**Testes:** 838/838 na suíte completa (4 novos do eventoGoogleDaReuniao; o restante do crescimento veio de outras frentes pela main).
**Sem migração** (campos novos no JSONB existente).
**Status:** CONCLUÍDA no preview — aguardando o "pode".

---

## REL-PUB-04/09/2026 — Publicação em produção da DIR-48

**Autorização:** dono, por escrito: "pode colocar em produção para
funcionar".
**O que foi publicado:** o agendador de reuniões completo (DIR-48) —
modal padrão de mercado com criação real do evento na Google Agenda,
botão Agendar reunião na Agenda do dia, "Abrir no Google" e fallback
honesto.
**Ritual:** main mergeada (trouxe a frente do Financeiro de outra
sessão) → 885/885 testes → build exit 0 → PR #175 → squash-merge →
main = `e1f4c780` → branch realinhada. Deploy de PRODUÇÃO: **success**
de primeira; version.json do alias da main com carimbo do build novo
(13:00 UTC). leilaonozap.net no ar com o agendador.
**Config Google (dono):** origens produção + preview cadastradas ✅;
Calendar API ativa ✅; resta o clique "PUBLICAR APP" na tela
Público-alvo (sem ele, só testadores cadastrados conectam a agenda —
o erro 403 access_denied visto no teste é exatamente esse estado).
**Status:** CONCLUÍDA E PUBLICADA.

### REL-48.1 — Configuração Google concluída pelo dono (04/09/2026)

Guiado passo a passo, o dono deixou o OAuth do Google pronto de ponta a
ponta: origens autorizadas (produção www e sem www + preview), Calendar
API ativa, usuários de teste (2), Branding completo (nome, suporte, e as
páginas /privacy e /terms que o site já tinha — sem logo, de propósito,
pra não travar em revisão de marca) e o app PUBLICADO ("Em produção").
Rede inteira liberada pra conectar a agenda. Honestidade registrada: com
escopo sensível (calendar) e app ainda NÃO VERIFICADO, o Google impõe
teto vitalício de 100 usuários concedendo a permissão — suficiente pro
arranque; pra rede passar disso, a VERIFICAÇÃO do app na Central de
verificação vira ação necessária (processo do Google, sem código —
guiaremos quando o dono quiser).

## REL-49 — Clareza total do Hábito 4 (05/09/2026)

**Diretiva:** DIR-49, aprovada com "PODE" após análise sênior em chat.
**O que mudou (os 5 pontos, todos entregues):**
1. **Fila com dois caminhos óbvios:** cada qualificado agora tem 📅
   **Agendar** (abre o agendador direto, pessoa já escolhida — 1 clique)
   e ✍️ **Registrar** (os 5 desfechos). O agendar saiu de dentro do
   "Registrar contato".
2. **🙋 MINHA AGENDA · 👥 TIME INTEIRO:** alternador no topo da agenda,
   só pra quem tem visão total (super admin); o padrão é MINHA (o que EU
   registrei / sou responsável). Na visão do time, cada item carrega o
   chip forte do responsável (👤 Nome).
3. **Linha do tempo UNIFICADA:** reuniões do método + reuniões da
   esteira + eventos do Google numa lista só, ordenada por hora, cada um
   marcado pela origem (📅 método · 🛤️ esteira · 🗓️ Google). O botão
   Conectar/Atualizar Google mora no mesmo card. O Google é pessoal —
   nunca aparece na visão do time (aviso na tela). Fonte única:
   `linhaDoTempoUnificada` em `src/lib/metodo.js`, testada.
4. **Fila honesta:** rodapé "⭐ +N da sua lista ainda sem qualificação —
   qualificar no Hábito 3 →" (o 7-na-lista/4-na-fila deixou de ser
   mistério).
5. **Polimento:** agendador com passos numerados (1. Com quem · 2.
   Quando · 3. Onde e sobre o quê · 4. Google Agenda), botão principal
   maior (h-12), plurais corretos via `plural()` (1 reunião · 2
   reuniões · 1 retorno).
**Arquivos:** `src/lib/metodo.js` (+2 funções testadas),
`CrmMetodo.jsx` (painel contato reescrito), `CrmContatoRegistroModal.jsx`
(modo agendar-direto + passos), `CrmClientesTab.jsx` (passa visaoTotal).
SEM SQL novo, como autorizado.
**Prova (medida, sem achismo):** suíte **889/889** (885 + 4 testes novos
da lib); build exit 0; prova em navegador real **100/100** com ZERO
erros de página/console — cobrindo os dois botões da fila, o rodapé
honesto, o agendador direto com pessoa preset e sem desfechos, os passos
numerados, a criação REAL do evento no Google (API stubada), os plurais
no singular, a linha do tempo com o Google 09:00 ANTES do método 18:00,
o TIME INTEIRO com chip 👤 e o Google sumindo (pessoal), e a volta pra
MINHA AGENDA.
**Status:** ENTREGUE NO PREVIEW — produção só com novo "pode" do dono.

## REL-49.1 — Salvar não apaga mais a tela (05/09/2026)

**Diretiva:** DIR-49.1, emitida pelo dono após teste real no preview
("registrei e não aparece salvo; conectei a agenda, agendei e volta para
conectar — resolva definitivamente e identifique de fato o erro").
**Diagnóstico com dado real (sem achismo):** consulta direta ao banco de
produção mostrou que os 3 registros dele SALVARAM (feito 10:19 + DOIS
agendados de 14/09 às 07:19/07:20, ambos com link REAL de evento criado
na Google Agenda dele — a duplicata nasceu da falta de feedback). O
defeito era de TELA, em três partes: (a) `loadCustomers` ligava
`isLoading` e o CrmClientesTab trocava tudo por "Carregando..." — o
CrmMetodo era DESMONTADO a cada salvamento e o estado da conexão Google
(token + eventos) morria, por isso o botão voltava pra "Conectar";
(b) o desfecho "feito" não aparecia em lugar nenhum; (c) reunião de dia
futuro era invisível (a agenda só mostra hoje).
**O que mudou:**
1. Recarga silenciosa: spinner de página inteira só na PRIMEIRA carga —
   salvar não desmonta mais a tela; a conexão do Google sobrevive.
2. Fila com "último: ✅ Contato feito · 05/09 07:19" em cada contato —
   o registro salvo aparece na hora (`ultimoContato`, testada).
3. Seção "📆 Próximas reuniões" na agenda (agendados de dias futuros,
   respeitando MINHA × TIME, com Abrir no Google) — `proximasReunioes`,
   testada. A reunião de 14/09 dele agora tem casa.
4. Toast que diz pra onde foi: "Reunião agendada — 14/09 07:19 · veja na
   agenda do Hábito 4".
**Prova (medida):** suíte **891/891** (889 + 2 testes novos); build exit
0; prova em navegador **107/107 ZERO erros** — incluindo o cenário exato
do dono: conectar o Google, salvar um desfecho e o Google CONTINUAR
conectado, com o "último" trocando na fila na hora.
**Pendência anotada:** os dois eventos de 14/09 são DUPLICADOS na Google
Agenda do dono (efeito da rodada sem feedback) — apagar um deles é ação
manual dele no Google (nós ainda não editamos/cancelamos evento criado —
fora do escopo desde a DIR-48).
**Status:** ENTREGUE NO PREVIEW — produção só com novo "pode".

## REL-50/51/52/53 — Agenda viva (05/09/2026)

**Diretivas:** DIR-50 a DIR-53, aprovadas com "pode" após o documento de
análise em chat.
**Entregue:**
- **DIR-50:** ✏️ Editar (agendador reaberto preenchido; o evento no
  Google muda junto via PATCH) e 🗑️ Excluir com 2 cliques (o evento no
  Google é apagado via DELETE) em toda reunião do método — só pra quem
  registrou ou visão total. Registros novos guardam `google_event_id`;
  nos antigos o id sai de dentro do link (`idDoEventoGoogle`, testada
  com o eid REAL do banco do dono). Falha do Google nunca trava e avisa
  honesto. Dono na frente de todo item: "👤 você" na MINHA, nome forte
  no TIME (o chip do fim virou prefixo no início, como pedido).
- **DIR-51:** 📊 faixa da SEMANA no TIME INTEIRO — total de reuniões,
  quebra por pessoa e % da meta (15/semana = 3/dia útil;
  `resumoSemanaReunioes` + `META_REUNIOES_SEMANA`, testadas).
- **DIR-52:** tabela nova `reunioes_empresa` (migração
  `20260905150000_reunioes_empresa.sql` no padrão da casa — DONO PRECISA
  COLAR O SQL), entidade ReuniaoEmpresa, entityWrite liberado SÓ pra
  admin (fora de CRM_TABLES de propósito; teste do handler REAL).
  Gestão 🏛️ no painel (visão total): título, toda semana (dia) ou data
  única, hora, duração; aparece na agenda de TODOS com selo 🏛️ e
  "todo mundo participa" (`reunioesEmpresaDoDia`, testada). Sem a
  migração colada, a tela não quebra (lista vazia + erro honesto ao
  salvar).
- **DIR-53:** todo evento criado no Google sai com ALARME popup 30 e 10
  min antes (reminders na criação — o Google avisa no celular com o app
  fechado). No app: popup fixo "🔔 Reunião em X min" quando uma reunião
  MINHA está a até 15 min (checagem local a cada 30s; `reuniaoIminente`
  testada), com Ver agenda e Dispensar. Web push com app fechado segue
  REGISTRADO como diretiva futura (service worker).
**Prova (medida):** suíte **900/900** (891 + 9 novos: lib DIR-50/51/52/53
+ entityWrite reunioes_empresa no handler real); build exit 0; prova em
navegador **131/131 ZERO erros** — editar com PATCH no evento certo,
excluir com DELETE, alarme no corpo do evento, 👤 você, 📊 semana,
🏛️ criada pelo painel e visível nas duas visões, popup 🔔 aparecendo e
sendo dispensado.
**Pendência pro dono:** colar o SQL da `reunioes_empresa` no Supabase
(sem ele, só a parte 🏛️ fica esperando — o resto funciona já).
**Status:** ENTREGUE NO PREVIEW — produção só com novo "pode".

## REL-54 — Dono identificado na fila + horário de término (05/09/2026)

**Diretiva:** DIR-54, ordem do dono testando as DIR-50→53 no preview:
"eu preciso saber de quem agenda, e só aparecer as minhas agendas...
identifique se são meus ou de outras pessoas" (na fila do Hábito 4) e
"ao invés de botar só duração, melhor botar o horário que termina" (no
cadastro da reunião da empresa).
**Entregue:**
1. A fila "Quem contatar" passa a respeitar o MESMO alternador MINHA ×
   TIME da agenda (só existe pra visão total): **MINHA** mostra só os
   contatos que EU cadastrei (`created_by_id`); **TIME** mostra a lista
   inteira, cada linha com o dono identificado pelo NOME REAL (mesmo
   pro cadastro que é seu — igual já funcionava na agenda desde a
   DIR-50, agora com o mesmo padrão na fila). O rodapé "sem
   qualificação" e o cabeçalho ("da sua lista" / "do TIME") acompanham
   o mesmo escopo. Texto de ajuda explica o alternador pra quem está em
   MINHA sem saber que existe TIME.
2. No cadastro de "Reuniões da empresa": alternador **⏱️ Duração** /
   **🏁 Até às** — no segundo modo, escolhe a hora de TÉRMINO e o
   sistema mostra e calcula os minutos sozinho ("= 90 min"), via
   `duracaoEntreHoras` (fonte única testada, trata virada de dia). Os
   dois caminhos gravam sempre `duracao_min` — sem duplicar campo no
   banco.
**Achado durante a prova (registrado, não é bug em produção):** o
`syncUserData()` do app relê o próprio usuário pelo `AppUser`/`app_users`
depois do login — um mock incompleto na prova (sem `role`) chegou a
derrubar o super_admin simulado após um reload; corrigido NA PROVA
(mock com os campos completos). Não afeta produção, onde o usuário real
sempre tem o registro completo.
**Prova (medida):** suíte **903/903** (900 + 3 testes novos de
`duracaoEntreHoras`); build exit 0; prova em navegador **139/139 ZERO
erros** — cobrindo MINHA escondendo o contato de outro dono, TIME
mostrando os dois com nome real, volta pra MINHA escondendo de novo, e
o cadastro "até às" 10:00-11:30 gravando `duracao_min=90`.
**Status:** ENTREGUE NO PREVIEW — produção só com novo "pode".

## REL-54.1 — Horário de término na listagem, sem minutos crus (05/09/2026)

**Diretiva:** ajuste do dono no preview: "quando salva aparecer ali,
duzentos e quarenta minutos fica feio... melhor botar de nove às treze".
**O que mudou:** a linha de cada reunião já cadastrada em "🏛️ Reuniões
da empresa" trocou "09:00 · 240 min" por **"09:00 às 13:00"** — o
horário de término calculado, não os minutos crus. Fonte única testada:
`horaFinal(horaInicio, duracaoMin)` em `src/lib/metodo.js` (o inverso de
`duracaoEntreHoras`; vira o dia sozinho).
**Prova (medida):** suíte **906/906** (903 + 3 testes novos de
`horaFinal`); build exit 0; prova em navegador **141/141 ZERO erros** —
as duas reuniões cadastradas na prova (uma por duração, outra por "até
às") aparecem na listagem como "09:30 às 10:30" e "10:00 às 11:30".
**Status:** ENTREGUE NO PREVIEW — produção só com novo "pode".

---

## REL-55 — Identidade Top College + X-EOS no painel dos 8 Hábitos (05/09/2026)

**Diretiva:** DIR-55 — o dono pediu as duas marcas JUNTAS (Top College,
"a faculdade", com um pouco mais de grandeza; X-eos, "o sistema", sem
diminuir), aplicadas em locais estratégicos de todo o painel "Os 8
Hábitos do Sucesso" (não só nos 6 hábitos que passam pelo `CrmMetodo`).
Especificação escrita no chat e aprovada ("CAPRICHA QUERO ISSO FODA")
antes de qualquer código, conforme exigido pelo próprio dono.
**Entregue:**
1. Placa de marca no topo do painel — fundo azul-marinho escuro
   (`--xeos-fundo`), Top College à esquerda (~58% da largura, ícone e
   nome maiores — a "grandeza" pedida) e X-eos à direita (~42%, logo
   INTEIRO, não reduzido a um ícone), separados por um traço fino.
   Aparece uma única vez no topo, ANTES do resumo de números, então
   está presente nos 8 hábitos — não só nos 6 que o `CrmMetodo` cobre.
2. Os dois logos foram recriados em SVG (não havia arquivo vetor
   disponível — três tentativas de receber a imagem colada no chat não
   geraram um arquivo anexado de verdade) fiéis à referência visual
   enviada pelo dono e ao brandbook oficial em PDF: `TopCollegeLogo.jsx`
   (pilar em "II", gradiente azul→roxo→magenta) e `XEosLogo.jsx` (o X
   metálico com ponta em seta).
3. Tipografia do brandbook: Sora (corpo, real, Google Fonts) e Baloo 2
   (título, substituta de licença livre pra Bauhaus — indisponível como
   arquivo — por escolha do próprio dono: "Não tenho o arquivo — use
   uma parecida").
4. Paleta X-EOS (`--xeos-*`) e Top College (`--topcollege-*`) como
   tokens novos em `src/index.css`, usados no acento/título de cada
   card de Hábito em `CrmMetodo.jsx` (barra + texto em gradiente) sem
   reescrever a paleta interna inteira do componente — risco de
   regressão desnecessário pro pedido desta rodada.
5. Hábito 7 (Verificação) ganhou o selo da sub-marca **X-office**, com
   a frase oficial ("verificando o progresso e mapeando processos").
6. Gamificação/Human Token FICOU DE FORA por pedido explícito do dono
   ("segura a gamificação... vou te enviar uma planilha") — não
   implementado nesta rodada.
**Achado durante a prova (não é bug):** o primeiro print (fontSize 48
na Top College) realmente estourava o viewBox do SVG — corrigido pra
36. Depois da correção, um segundo print pareceu MOSTRAR o "T" cortado,
mas era artefato de ampliar um recorte minúsculo (~90px) com
interpolação — a medição real via `getBBox()` no DOM (não estimativa)
mostrou o texto inteiro dentro do viewBox com margem de sobra dos dois
lados, e um screenshot direto do elemento SVG (sem redimensionar)
confirmou "TOP COLLEGE" e "FACULTY OF ENTREPRENEURS" completos e
nítidos — igual pro "-eos" e seu subtítulo. Lição: para conferir
clipping em SVG pequeno, medir com `getBBox()`/screenshot do elemento
em vez de ampliar um recorte de imagem.
**Prova (medida):** suíte **906/906** (sem mudança — rodada é só
visual/apresentação, nenhuma lib nova); build exit 0; prova em
navegador **147/147 ZERO erros de página/console** — cobrindo os dois
logos presentes (por `aria-label`) e o texto oficial de cada marca no
cabeçalho, o cabeçalho se repetindo em todos os 8 hábitos, e o selo
X-office com a frase oficial no Hábito 7.
**Status:** ENTREGUE NO PREVIEW — produção só com novo "pode".

---

## REL-56 — O painel dos 8 Hábitos VIRA o ambiente da marca (05/09/2026)

**Diretiva:** DIR-56 — o dono REPROVOU a DIR-55 no preview: *"que loucura
é essa... eu quero as logos originais, tudo isso temático igual às
apresentações... eu não quero fundo branco na área de vendas"*, e
completou: *"imagens do brandbook em todo painel... menos emojis...
o painel com vontade de ser grande"*.

**O que a DIR-55 tinha errado:** uma placa de logo no topo de uma página
branca. Identidade visual não é adesivo — é o ambiente inteiro.

**Entregue:**
1. **Arte ORIGINAL, não recriada.** As logos foram extraídas dos PDFs que
   o próprio dono anexou: a apresentação do evento traz o lockup Top
   College + X-eos como imagem com canal alfa em alta (1091×753 e
   1845×942), e o brandbook traz o padrão tonal de X, o X-office e as
   imagens temáticas. Os dois SVGs desenhados à mão na DIR-55 foram
   APAGADOS. Descoberta no caminho: o X real da X-eos é vazado (traço
   aberto), não o X sólido metálico que eu tinha desenhado — mais um
   motivo pra arte original ganhar da recriação.
2. **Fundo escuro em todo o painel** (#00020C), com o padrão tonal do
   brandbook por trás e os brilhos do gradiente Top College nos cantos.
   Nenhuma área branca sobrou na Central de Vendas.
3. **Imagens do brandbook em todo o painel:** uma faixa por Hábito,
   escolhida pelo tema (sonho→carro, compromisso→"grandes batalhas",
   lista→pessoas, contato→ambiente, apresentação→papelaria,
   acompanhamento→mochila, verificação→X-office, duplicação→avião), com
   o nome do Hábito em escala grande por cima; e a frase oficial
   ("o sucesso é a soma de pequenos esforços repetidos dia após dia")
   fechando o painel. Tudo em webp: **334 KB somando os 13 arquivos**.
4. **Menos emoji:** 20 emojis decorativos saíram de títulos, abas e
   botões visíveis; os dois botões principais da fila (Agendar /
   Registrar) ganharam ícone de traço, e o sino do alerta de reunião
   virou ícone. **O que NÃO saiu, de propósito:** os emojis que são
   MARCADOR DE DADO (o 👤 do dono de cada item, os desfechos tipo
   "Reunião agendada", as faixas de probabilidade) — ali o emoji funciona
   como legenda e mexer neles é mudar exibição de registro salvo, com
   teste em cima. Fica pra uma rodada própria, se o dono quiser.
5. **Escala:** título do painel de `text-xl` para `text-5xl`, mais
   respiro entre blocos, nome do Hábito em 4xl sobre a faixa.

**A parte de engenharia que evitou uma reescrita gigante:** o tema claro
do painel (index.css) não pinta com cor literal — resolve em
`var(--nz-tinta)`, `var(--nz-borda)`, `var(--nz-cinza-fundo)`.
Redefinindo essas variáveis dentro de `.xeos-palco`, aquelas mesmas
regras `!important` passaram a pintar ESCURO sozinhas, sem tocar em
classe nenhuma do JSX.

**Achado medido no navegador (não suposto):** mesmo assim o título
"Os 8 Hábitos" saiu preto sobre preto. Medindo o computed style no DOM,
a causa apareceu: as cores `nz.*` do `tailwind.config.js` são hex
LITERAL (`nz.tinta: '#0D1310'`), diferente das `pc.*` que são `var()` —
então `text-nz-tinta` já sai compilado com o claro cravado e não
obedece à variável. Por isso existe o segundo bloco de CSS, mapeando
cada utilitária da paleta clara ao seu par escuro. Sem medir, eu teria
chutado errado.

**Prova (medida):** suíte **906/906** (sem mudança — rodada visual, sem
lib nova); build exit 0; prova em navegador **152/152 ZERO erros de
página/console** (147 + 5 asserções novas). As asserções novas cobram o
que a diretiva pediu, não o que é fácil: que as imagens das logos
ORIGINAIS realmente carreguem (`naturalWidth > 0`, que pega o caso do
arquivo faltando no build), que a luminância do fundo da área de vendas
seja de fato escura (< 40) e que a do título seja clara (> 180) — ou
seja, tema escuro E legível; e que a faixa do brandbook troque junto com
o Hábito aberto.

**Status:** ENTREGUE NO PREVIEW — produção só com novo "pode".

---

## REL-57 — A Top College vira um DEPARTAMENTO no menu (05/09/2026)

**Diretiva:** DIR-57 — *"pensa que a Leilão NoZap contratou a Top
College... ela não tem que ficar lá embaixo, tem que ficar lá em cima...
ver o que a gente pode diminuir, mantendo a fluidez"*. Aprovado:
**"pode fazer"**.

**A melhor notícia da rodada, achada lendo o código ANTES de mexer:** os
grupos que o dono queria JÁ EXISTIAM em `licensingTabs.js` (Conta,
Operação, Vender, Leilões, Carreira, Admin). A lateral é que achatava
tudo numa fileira de ícones soltos. Não foi preciso inventar
arquitetura — foi preciso mostrar a que já estava lá e mover duas peças.

**Entregue:**
1. **Menu de 10 ícones soltos para 6** (7 pra quem tem loja, com
   Operação): Visão Geral · Minha Conta · Loja & Vendas · **Top
   College** · Arrematante · Admin. Nenhum link sumiu — os que saíram da
   fileira estão dentro do menu flutuante do seu grupo, padrão que a
   casa JÁ usava em "Operação" e "Central de Vendas" e que agora vale
   pros demais. Zero interação nova: a fluidez fica igual.
2. **Top College reúne o que FORMA a pessoa:** O Método, Time
   (Vendedores), Carreira, Evoluir Nível e Metas — esta última saiu de
   "Operação", onde estava solta (meta é acompanhamento, não chão de
   loja). Carreira e Evoluir Nível deixaram de ocupar dois ícones
   próprios: a faculdade não ACRESCENTOU ícone, ela ABSORVEU dois.
3. **"Central de Vendas" virou "Loja & Vendas"**, só com o caixa: Loja
   Virtual, Relatório, Pedidos, Venda Direta, Comissões.
4. **"CRM" morreu como nome** e virou **O Método**. O VALOR da aba
   (`catalogo-crm`) não mudou — link antigo continua abrindo no lugar
   certo, e há teste cobrando exatamente isso.
5. **O agrupamento virou DADO** (flag `colapsar` na fonte única) em vez
   de um `if (grupo.title === 'Operação')` escrito duas vezes — na
   lateral do desktop e no menu do celular. As duas telas agora montam
   os menus com a MESMA função (`entradaFlutuante`).
6. Grupo que sobra com um item só não vira menu flutuante: abrir um
   flutuante pra uma opção sozinha é clique a mais sem ganho (caso do
   Admin de quem não é admin, que não tem o Consignado).
7. O seletor interno continua com as duas famílias, cada uma sob o seu
   rótulo ("Loja & Vendas" / "Top College"), e o rótulo de cima diz de
   QUEM é a seção aberta — quem está na loja alcança O Método sem voltar
   pro menu, e ninguém fica num beco sem saída.

**Bug encontrado NA PRÓPRIA PROVA, olhando o print — não foi teste que
pegou:** com a pessoa em "O Método", quem acendia na lateral era **Loja
& Vendas**. Causa: as duas moram na MESMA aba (`catalogo`), então olhar
só a aba ativa não distingue uma da outra — é preciso olhar também a
SEÇÃO aberta. Corrigido passando `activeCatalogTab` pra lateral, e o
caso virou asserção permanente na prova.

**TRAVA DO DONO RESPEITADA:** *"não pode mudar a função de arrastar e
organizar os ícones"*. `aoSoltar` e a ordem salva por usuário não foram
tocadas. As chaves novas (`group:conta`, `group:topcollege`) entram no
fim da fila de quem já tem ordem salva — comportamento que já existia
pra item novo, avisado ao dono e aceito por ele. A aba do catálogo
manteve a chave antiga (`tab:catalogo`), então quem já arrastou "Central
de Vendas" de lugar mantém a posição.

**Prova (medida):** suíte **922/922** (906 + **16 testes novos** em
`tests/menuPainel.test.mjs`); build exit 0; prova em navegador
**158/158 ZERO erros de página/console** (152 + 6 asserções novas).
Pra o menu virar regra testável, o import de `careerLevels` em
`licensingTabs.js` passou do atalho `@/` pro caminho relativo — o node
da suíte não resolve o alias do Vite. Mudança de caminho, não de
comportamento.

**Status:** ENTREGUE NO PREVIEW — produção só com novo "pode".

---

## REL-58 — A marca no lugar do ícone genérico (05/09/2026)

**Diretiva:** DIR-58 — *"conseguimos inserir a logo da Top College onde é
o ícone... e onde está escrito O Método, inserir a logo da X-EOS da
mesma forma?"*

**Entregue:**
1. O ícone do grupo **Top College** na lateral é agora o SÍMBOLO oficial
   da marca (o pilar, em gradiente), extraído do mesmo lockup original.
2. **O Método** leva o SÍMBOLO da X-eos (o X) — na lateral, no menu do
   celular e no seletor interno da Loja & Vendas.
3. `MarcaOuIcone`: um componente só decide entre marca e ícone, e a
   escolha vem do DADO (campo `marca` na fonte única). As três telas
   mostram a mesma coisa sem cada uma decidir por conta.

**Decisão de acabamento (medida, não achada):** entra só o SÍMBOLO,
nunca o logo inteiro. Antes de aplicar, os dois foram renderizados nos
**20px e 16px reais** em que aparecem: o nome escrito vira borrão nesse
tamanho, o símbolo sozinho continua legível. Também foi preciso achar o
limite exato entre o X e o texto "-eos" varrendo as colunas do PNG
(coluna 1073) — o corte "por porcentagem" que eu tinha chutado antes
cortava o braço direito do X no meio.

**Defeito encontrado no print, corrigido:** a marca da X-eos é traço
BRANCO. No seletor interno (fundo claro) ela simplesmente sumia —
branco no branco. Agora, onde o fundo é claro, a marca ganha um selo
preto (`--xeos-preto`), que é o fundo pra que ela foi desenhada no
brandbook. Virou asserção: a prova mede a luminância do selo e falha se
alguém clarear.

**Bug de teste que a própria prova pegou:** a asserção da DIR-56
procurava a logo do cabeçalho por `includes('topcollege')` — e passou a
achar primeiro o ARQUIVO NOVO do ícone (`marca-topcollege.webp`). A
asserção agora cobra o caminho exato (`/marca/topcollege`). Sem a prova
rodando, essa troca teria passado despercebida.

**Prova (medida):** suíte **922/922**; build exit 0; prova em navegador
**161/161 ZERO erros** (158 + 3 asserções novas: a marca da Top College
carrega na lateral, a da X-eos carrega no menu, e o selo escuro protege
a marca branca no seletor claro).

**Status:** ENTREGUE NO PREVIEW — produção só com novo "pode".

---

## REL-59 — A logo inteira da X-eos no lugar do texto (05/09/2026)

**Diretiva:** DIR-59 — *"onde está escrito O Método eu quero que entre a
logo inteira da X-eos, sem o nome O Método"*.

**Entregue:** no menu da Top College (lateral do desktop e acordeão do
celular), o item deixou de escrever "O Método" e passou a mostrar a
**logo inteira da X-eos**. Campo novo na fonte única, `marcaCompleta`,
que quer dizer exatamente "a marca SUBSTITUI o rótulo" — diferente de
`marca` (DIR-58), que só troca o ícone e mantém o texto.

**Decisões de acabamento (medidas, não estimadas):**
1. A logo entra **sem a linha "Estrutura de operações e expansão"**: na
   altura de uma linha de menu (22px) aquele subtítulo vira borrão. O
   ponto de corte saiu de uma varredura das linhas do arquivo — o
   subtítulo começa em y=612 —, e o resultado foi conferido renderizando
   nos 22px reais antes de aplicar.
2. O rótulo "O Método" **sobrevive como texto alternativo** da imagem.
   Sem isso o item ficaria mudo pra leitor de tela e perderia o nome na
   busca do menu do celular. Virou asserção própria na prova.
3. O seletor interno da Loja & Vendas ficou como estava: lá o texto
   "O Método" é o "você está aqui" — trocar por logo tiraria a
   orientação de quem navega.

**Prova (medida):** suíte **922/922**; build exit 0; prova em navegador
**163/163 ZERO erros** (161 + 2 asserções: o menu NÃO escreve mais
"O Método" e mostra a logo com altura real > 0; e a logo mantém o nome
acessível).

**Status:** ENTREGUE NO PREVIEW — produção só com novo "pode".

---

## REL-60 — A logo em prata, inteira, sem cortar nada (05/09/2026)

**Diretiva:** DIR-60 — *"tá cortado... quero a logo com essa cor prata,
sem fundo e sem cortar nada"*.

**O erro que eu tinha cometido, e a causa:** na DIR-59, pra remover o
subtítulo, recortei a imagem por baixo (`crop` até y=592). Só que o X da
X-eos **desce até o pé da arte** — tem um rabo longo na diagonal. O
corte amputou esse rabo, e era isso que ele estava vendo. Lição
registrada: em lockup com elementos que se sobrepõem em altura, não se
remove um texto cortando o retângulo.

**Entregue:**
1. Entra o lockup **INTEIRO** — X completo, "-eos" e a linha "Estrutura
   de operações e expansão". Zero recorte.
2. Acabamento **prata metálico** no lugar do branco chapado, com o mesmo
   desenho de luz do mockup que ele mandou: claro no topo, banda de
   brilho no meio, aço mais fundo embaixo. O subtítulo ficou em prata
   clara sólida — no gradiente ele cairia na parte escura e sumiria.
3. Mesmo tratamento no símbolo pequeno (o X sozinho), pra não ficar uma
   marca prateada e outra branca na mesma tela.
4. A linha do menu cresceu de 22px pra 46px pro lockup caber inteiro.

**Sobre "tirar o fundo da foto":** a imagem do mockup chegou colada no
chat, não como arquivo — não dá pra abrir e recortar. Não foi preciso: a
logo ORIGINAL com transparência já tinha sido extraída do PDF dele na
DIR-56, e metalizar essa arte dá resultado melhor que remover fundo de
uma foto — sem halo, sem resíduo da textura da parede, borda limpa.

**A asserção nova pegou um defeito meu na hora:** o teste compara a
proporção RENDERIZADA da logo com a proporção NATURAL do arquivo. Falhou
de primeira — não porque a imagem estivesse cortada, mas porque eu tinha
posto `py-0.5` na própria imagem, e o padding distorce a medida. Padding
removido. Agora essa asserção protege os dois casos: se alguém cortar a
arte OU espremer pelo CSS, a conta não fecha e a prova falha.

**Prova (medida):** suíte **922/922**; build exit 0; prova em navegador
**165/165 ZERO erros** (163 + 2 asserções: proporção do arquivo
preservada, e a logo cabe dentro do menu sem ser cortada pela borda).

**Status:** ENTREGUE NO PREVIEW — produção só com novo "pode".

---

## REL-61 — Uma coisa só: tipografia da marca, o X e "qual é o seu poder" (05/09/2026)

**Diretiva:** DIR-61.

**Entregue:**
1. **Tipografia:** o menu da Top College inteiro em **Sora**, a fonte
   oficial da X-EOS. Os nomes passam a ser da mesma família da logo — é
   o que faz o bloco ler como uma peça só.
2. **A frase da marca virou TEXTO**, abaixo da arte, com uma divisória
   separando a faixa de marca do resto do menu. Motivo medido: no
   lockup original a frase tem 1/40 da altura do X — pra ser LIDA, a
   logo precisaria de ~300px de altura, o que não existe em menu nenhum.
   Como texto na fonte da marca, fica nítida em 9,5px. A arte continua
   inteira: o subtítulo foi **apagado do arquivo** (retângulo), não
   recortado — foi exatamente o recorte que amputou o rabo do X na
   DIR-59.
3. **Só o X** onde estava escrito "O Método", num arquivo feito só pra
   esse lugar: o X centralizado num quadrado com folga, pra assentar
   bem no selo.
4. **"Qual é o seu poder?"** com o retrato do deck do próprio dono
   (extraído da apresentação do evento que ele anexou), pequeno e
   redondo, no lugar do rótulo.

**Ajuste de composição feito na hora, olhando o render:** a primeira
versão colocava o X DUAS vezes na mesma linha — um no selo e outro ao
lado do retrato —, e o de dentro ainda sumia no fundo claro. Ficou um X
só, no selo preto, e a linha ficou com o retrato + a pergunta.

**Prova (medida):** suíte **922/922**; build exit 0; prova em navegador
**167/167 ZERO erros**. As asserções novas cobram que a frase seja texto
de verdade (tamanho ≥ 9px, não bitmap) e que o menu use mesmo a
tipografia da marca — se alguém voltar a "queimar" a frase na imagem ou
trocar a fonte, a prova falha.

**Nota prática (não é bloqueio):** o retrato veio do deck do próprio
dono e está sendo usado numa tela interna do time. Se um dia essa
imagem for pra material público ou de venda, vale ele checar o direito
de uso da figura antes — uso interno e uso publicitário têm regras
diferentes.

**Status:** ENTREGUE NO PREVIEW — produção só com novo "pode".

---

## REL-62 — A faixa da academia no topo do painel (05/09/2026)

**Diretiva:** DIR-62.

**Entregue:**
1. O cabeçalho branco virou **faixa preta** com o padrão tonal da X-EOS,
   as **duas marcas juntas**, o título, a saudação e **"Qual é o seu
   poder?"** em degradê da Top College.
2. **O professor em destaque:** imagem grande entrando pela direita, com
   esfumaçado pro preto nas bordas (feito na própria arte, no canal
   alfa, pra ele derreter na faixa em vez de virar um retângulo colado).
3. O bloco do seletor acompanha o preto, e o seletor **volta a dizer
   onde a pessoa está** ("Top College / O Método") — a pergunta agora
   vive grande na faixa, e repetir logo abaixo era ruído e ainda tirava
   a orientação de quem navega.

**Limite de escopo que eu impus e registrei:** a faixa só aparece nas
seções da TOP COLLEGE. O cabeçalho é o mesmo em todas as abas — se ela
ficasse sempre, a faculdade voltaria a assinar a Carteira e os Pedidos,
que é a fronteira fechada na DIR-57. Tem asserção cobrando que a faixa
NÃO apareça numa seção da loja.

**Dois defeitos encontrados no render e corrigidos:**
1. O seletor continuou branco dentro do bloco escuro. Medindo no
   navegador, o fundo dele JÁ era o vidro do palco (`rgba(255,255,255,
   .043)`) — o problema é que vidro translúcido sobre página branca dá
   branco. Faltava o bloco ter fundo preto de verdade, não só o tema.
2. O degradê da frase morria no azul: com as paradas padrão, a largura
   do texto acabava antes do magenta. As paradas foram comprimidas
   (0% / 34% / 72%) pra as três cores caberem na frase.

**Prova (medida):** suíte **922/922**; build exit 0; prova em navegador
**169/169 ZERO erros** (167 + 2 asserções: o professor entra com altura
de destaque — ≥150px, não miniatura —, e a faixa é preta, com as duas
marcas e a pergunta).

**Status:** ENTREGUE NO PREVIEW. Produção NÃO — reforçado pelo dono
nesta rodada: "só não coloca nada em produção agora, é tudo no preview".

---

## REL-63 — Parar de repetir as logos (05/09/2026)

**Diretiva:** DIR-63.

**Entregue:** o palco de marcas de dentro do painel foi REMOVIDO — ele
repetia, 300px abaixo, exatamente o mesmo par de logos da faixa da
academia. As frases das duas marcas (único conteúdo que só existia nele)
subiram pra faixa, numa linha só. Medido no DOM: cada marca aparece
agora **uma vez** na tela, e virou asserção — se o par voltar a se
repetir, a prova falha.

**Divergi do que o dono propôs, e disse isso a ele:** ele sugeriu tirar
a Top College da faixa de cima. Isso resolveria metade da repetição e
deixaria a faixa da ACADEMIA sem a academia. O que incomodava era o par
aparecendo duas vezes — então saiu a cópia, não metade do original.

**BUG DE TESTE ENCONTRADO E CORRIGIDO (não era do produto):** a prova
começou a falhar em "linha do tempo ordenada — Google 09:00 ANTES do
método 18:00". Isolei rodando a prova com as minhas mudanças guardadas
(`git stash`): **falhava sem elas também**. Instrumentei a asserção pra
imprimir o trecho da página e a causa apareceu: eram **17:54** no
relógio da máquina, a reunião de teste é às 18:00, então o popup de
alerta da DIR-53 abriu e repetiu o título da reunião no topo do
documento — e a comparação, que varria o texto da PÁGINA INTEIRA,
passou a olhar o popup em vez da agenda. Era um teste frágil ao horário
do dia, escrito por mim na DIR-49; o produto estava correto. A
comparação agora é feita DENTRO do card da agenda.

**Prova (medida):** suíte **922/922**; build exit 0; prova em navegador
**169/169 ZERO erros**.

**Status:** ENTREGUE NO PREVIEW. Produção continua travada por ordem do
dono.

---

## REL-64 — O botão no preto, a abertura limpa e as imagens maiores (05/09/2026)

**Diretiva:** DIR-64.

**Entregue:**
1. **O seletor mudou de lugar:** saiu do branco e passou a viver DENTRO
   da faixa preta, abaixo da pergunta. Há UMA instância só dele — na Top
   College ele é entregue pra faixa; fora dela fica onde sempre esteve.
   Duas instâncias dariam dois menus na tela.
2. **O menu abre preto e limpo**, com a tipografia da marca.
3. **O menu foi pra um PORTAL.** Ao mover o botão pra dentro da faixa, o
   menu passou a ser CORTADO na borda — a faixa tem `overflow-hidden`
   por causa dos cantos arredondados e do padrão ao fundo. Apareceu no
   primeiro print: o menu abria e morria na beirada. É exatamente o
   mesmo problema que a lateral já tinha resolvido com portal, então a
   solução da casa foi reaproveitada. O clique-fora passou a considerar
   o menu, que agora vive fora da caixa.
4. **Menos branco:** o respiro entre a faixa e o painel encolheu.
5. **As imagens dos Hábitos cresceram** de ~160px pra **240px**, e o véu
   escuro ficou mais curto — começa forte à esquerda, pra segurar o
   texto, e some antes da metade, liberando a foto.

**Prova (medida):** suíte **922/922**; build exit 0; prova em navegador
**172/172 ZERO erros** (169 + 3 asserções novas). Uma delas vale citar:
a que garante que o menu não está cortado compara a ALTURA VISÍVEL do
menu com a altura do conteúdo dele (`scrollHeight`) — se alguém puser o
menu de volta dentro de um contêiner que corta, as duas divergem e a
prova falha.

**Status:** ENTREGUE NO PREVIEW. Produção continua travada por ordem do
dono.

---

## REL-65 — A imagem do Hábito inteira, sem corte (05/09/2026)

**Diretiva:** DIR-65.

**A causa, que eram DOIS cortes e não um:** o arquivo já nascia como uma
fresta — 33% da altura da página do brandbook — e o `object-cover`
cortava mais um tanto pra preencher a altura fixa do bloco. Mexer só no
CSS não resolveria: a cena já não estava no arquivo.

**Entregue:**
1. As 8 imagens foram **regeradas guardando 63% da cena** (proporção 2.8
   no lugar de 5.38 — quase o dobro de altura útil).
2. O bloco passou a ter a **proporção exata do arquivo**
   (`aspect-ratio: 1600/571`), sem altura fixa. Sem sobra, o
   `object-cover` não tem o que aparar: medido no navegador, a proporção
   na tela é 2.802 e a do arquivo é 2.802.
3. Reenquadramento caso a caso pelo assunto. O Hábito 3 (Lista) foi
   ajustado duas vezes: no primeiro corte a cabeça do homem à esquerda
   ficava de fora; subindo o enquadramento, as duas pessoas entram
   inteiras.

Peso: **365 KB** somando as 8 imagens (eram 258 KB com metade da cena).

**Prova (medida):** suíte **922/922**; build exit 0; prova em navegador
**173/173 ZERO erros**. A asserção nova compara a proporção do ARQUIVO
com a proporção NA TELA — se alguém voltar a fixar uma altura que não
bate com a imagem, as duas divergem e a prova falha.

**Status:** ENTREGUE NO PREVIEW. Produção continua travada por ordem do
dono.

---

## REL-66 — X-office no título e o acabamento fino (05/09/2026)

**Diretiva:** DIR-66.

**Entregue:**
1. **X-office no título da faixa.** Dentro da Top College o `h1` deixou
   de ser "Painel de Alavancagem" e virou **X-office**, com a frase
   oficial da sub-marca abaixo. Fora da faculdade o nome de sempre
   continua — verificado nos dois contextos e virou asserção.
2. **Acabamento das imagens:** esfumaçado no pé de cada faixa, porque a
   foto terminava num corte seco contra o painel (mais visível nas cenas
   claras, como a da Lista); e o título ancorado embaixo, que com a
   faixa alta ficava flutuando no meio da imagem.
3. Respiro entre o subtítulo do X-office e a saudação.

**Decisão de composição, dita ao dono:** o título entrou como TEXTO e
não como o logo do X-office. A faixa já carrega duas marcas; uma
terceira ali seria exatamente a repetição que ele mandou tirar na
DIR-63.

**Achado que NÃO virou mudança:** a busca no DOM mostrou que "Painel de
Alavancagem" ainda aparecia na tela mesmo dentro da faculdade. Fui ver
onde: é o card **"Espelho do Painel de Alavancagem"**, do Hábito 7 —
um ponteiro que diz "estes são os mesmos números da OUTRA tela de mesmo
nome". Renomear ali quebraria o sentido da comparação, então ficou como
está e o dono foi avisado.

**Prova (medida):** suíte **922/922**; build exit 0; prova em navegador
**174/174 ZERO erros**.

**Status:** ENTREGUE NO PREVIEW. Produção continua travada por ordem do
dono.

---

## REL-67 — A fala do professor sai do canto (DIR-67)

**Ordem:** *"qual é o seu poder vamos deixar bem do lado do professor,
tipo o que ele está falando... está tudo muito aqui no canto... esse meio
vazio está legal, mas quero tirar um pouco dessas coisas aqui... boa
tarde Luiz Santanna pode colocar pra lá."*

**O que mudou:** a faixa da academia virou duas colunas —

    ┌──────────────┬──── vazio ────┬─────────┬───────────┐
    │ IDENTIDADE   │ (respiro)     │ A FALA  │ PROFESSOR │
    │ marcas       │               │ saudação│           │
    │ X-office     │               │ +       │           │
    │ seletor      │               │ pergunta│           │
    └──────────────┴───────────────┴─────────┴───────────┘

A coluna da esquerda perdeu 2 dos 7 blocos que tinha (a saudação e a
pergunta foram pra fala), que é o "tirar um pouco dessas coisas aqui".

**Decisão de engenharia:** a fala e o professor viraram **irmãos numa flex
row**. Antes o professor era `absolute` e a distância dele até o texto
mudava com a altura da faixa — dava pra "quase" acertar em uma largura de
tela, nunca pra garantir em todas. Como irmãos, a pergunta encosta nele
por construção.

**Consequência boa:** com o texto FORA de cima da figura, o véu preto que
cobria a faixa inteira (e existia só pra dar contraste ao texto) pôde
sair. No lugar entrou uma **máscara só na borda esquerda da figura**: ele
derrete no preto e o rosto volta em cheio — o "professor em destaque" que
a DIR-62 pedia e o véu vinha lavando.

**Decisão minha, dita ao dono:** o **seletor "O Método" ficou onde
estava**. É a única coisa clicável da faixa; comando de navegação mora do
lado de quem assina a tela. Do lado do professor ele viraria poluição em
cima da imagem — o oposto da ordem.

**Prova (medida, não olhada):** a prova em navegador mede a distância em
pixels entre o fim do texto e o começo da figura (`0 ≤ vão ≤ 72px`, e
`sobrepõe === false`), a altura da fala dentro da figura (entre 5% e 40%
do topo — a faixa da cabeça dele), a posição horizontal da pergunta
(depois de 45% da faixa: saiu do canto) e o respiro do meio (≥ 80px
livres entre a identidade e a fala).

---

## REL-68 — Vidro que dá pra ler (DIR-68)

**Ordem:** *"adoro esses menus transparentes, mas algumas ficam muito
transparentes, igual essa parte branca. Pode deixar transparente, mas
escurecer aonde tem letra."*

**Diagnóstico:** o card no meio do painel tem o preto do palco atrás e já
se lê. Quem quebra é o que **flutua**: o modal cobre a tela inteira,
inclusive os cards claros do painel de baixo — no print do dono dava pra
ler "R$ 3.279,24" atravessando o formulário do Quadro dos Sonhos.

**O que mudou:**
1. Cortina e cartão do modal ganharam **base escura translúcida +
   desfoque** (`0,72` e `0,82` de alfa). Continua vidro — nada virou
   opaco —, mas a letra ganhou chão.
2. A pastilha do botão "outline" do shadcn usava `bg-background`, que no
   tema claro é **branco sólido**: com a letra clara do palco em cima,
   virava um retângulo invisível ("Enviar imagem do aparelho" e "Usar").
   Era a mesma "parte branca" da ordem, com outro nome de classe.
3. Botão desabilitado mantém letra clara e só baixa a força.

**Prova (medida):** o alfa do cartão é `< 1` **e** `> 0,5` (as duas metades
da ordem: continua transparente E tem fundo), a luminância dele é `< 30`,
o `backdrop-filter` tem blur, e a pastilha de dentro tem alfa de fundo
`< 0,2` com letra de luminância `> 150`.

**Prova geral das duas:** suíte **922/922**; build exit 0; prova em
navegador **185/185 ZERO erros de página/console**.

**Status:** ENTREGUE NO PREVIEW. Produção continua travada por ordem do
dono.

---

## REL-69 — O nome completo do Hábito quando se entra nele (DIR-69)

**Ordem:** *"quando eu clico adentro, precisa aparecer o nome completo —
Lista de Networking, Contato e Convite, Apresentação de Sucesso... pode
até ficar o primeiro nome ali na frente, mas quando clica tem que
aparecer o complemento."*

**O que mudou:** a faixa do Hábito agora escreve **"Verificação do
Progresso"** no lugar de "Verificação" — o apelido segue grande (é ele que
o seletor mostra, e é por ele que a pessoa se localiza) e o complemento
entra logo depois num peso mais leve. Os oito nomes oficiais viraram
campo da fonte única `src/lib/metodo.js`, com o helper `partesDoHabito`.

**Achado que virou correção:** a lista dos 8 hábitos estava **duplicada**
dentro de `CrmMetodoModal.jsx`. Duas cópias significam dois nomes: esta
ordem mudaria um lado e deixaria o outro pra trás. O modal passou a ler da
fonte única e ficou só com a linha que é DELE — onde cada hábito mora
dentro do CRM.

**Defeito que a prova pegou (e que o olho não pegaria):** o complemento
entrou num `<span>` com margem lateral. Na tela o respiro aparecia certo,
mas o TEXTO saía grudado — "Verificaçãodo Progresso" — pra quem copia e
pro leitor de tela. A prova compara o texto real do DOM, não a foto, então
acusou. Entrou um espaço explícito.

**Prova (medida):** 5 testes novos na suíte (os 8 nomes oficiais na ordem
do dono, a separação apelido/complemento, hábito sem complemento não
inventa texto, id desconhecido volta `null`, e o contrato de que o apelido
é sempre o começo do nome completo — sem ele a faixa escreveria duas
palavras que não formam frase). Suíte **927/927**; build exit 0; prova em
navegador **184/184 ZERO erros**.

**Status:** ENTREGUE NO PREVIEW. Produção continua travada por ordem do
dono.

---

## REL-70 — O menu da Top College lê como uma coisa só (DIR-70)

**Ordem:** *"lá em cima está top, a logo; só o restante ali tem que ficar
mais conexo, com aquele metálico da X-eos. Estou sentindo elas meio
divididas."*

**O que eu fui olhar antes de mexer:** ele disse "a tipografia igual",
mas a Sora já estava no menu inteiro desde a DIR-61 — então a divisão
vinha de outro lugar. Eram três, e nenhuma era a fonte: a **cor** (os
itens acendiam no verde do Leilão NoZap, dentro do menu da faculdade), o
**eixo** (faixa em 16px, itens em 12px) e o **corte** (a faixa tinha fundo
próprio e uma linha cheia embaixo, virando um cartão sobre outro).

**O prata é medido, não escolhido:** os três tons do degradê saíram da
média de pixel do próprio `marca-xeos-lockup.webp` — topo (235,237,240),
meio (198,203,211), base (140,146,155). O item embaixo é feito do mesmo
metal da logo de cima, literalmente.

**Detalhe de implementação que valeu comentário no código:** o traço do
ícone usa `stroke: url(#xeosMetal)`, e isso só resolve se o `<defs>`
estiver no MESMO documento. O menu vive num portal no `body`, então a liga
foi declarada dentro do próprio menu — fora dele o ícone cairia pra preto.

**Prova (medida):** a prova verifica que o rótulo é degradê (e não cor
chapada), que o traço do ícone puxa a mesma liga, que a liga existe dentro
do menu, que o desalinho entre o ícone e a logo é **0px** e que não sobrou
nenhum `nz-verde` no menu. Suíte **927/927**; build exit 0; prova em
navegador **188/188 ZERO erros**.

**Status:** ENTREGUE NO PREVIEW. Produção continua travada por ordem do
dono.

---

## REL-PUB-06/09 — Publicação em produção (DIR-49 → DIR-70)

**Autorização do dono (06/09/2026):** *"pode publicar tudo o que a gente
fez até agora... pode publicar em produção... pra eu ver como é que está
no celular."* É a autorização separada que faltava — até aqui tudo vivia
só no preview por ordem dele.

**O que sobe:** DIR-49→54 (agenda viva), DIR-55→66 (a Top College como
ambiente de marca), DIR-57→59 (menu de 10 ícones para 6, com a ordem
arrastável intocada), DIR-67→70 (a fala do professor, o vidro legível, o
nome completo do Hábito, o menu metálico) e o X-GAME da sessão paralela,
que vivia no mesmo branch.

**Conferência do banco antes de abrir a PR:** as 5 migrações que o
workflow aplica sozinho em produção foram lidas uma a uma. Todas
aditivas — `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`,
índices e RLS. Nenhum `DROP`, `TRUNCATE`, `DELETE` ou troca de tipo.
`app_segredos` nasce com RLS ligado e SEM policy: nem anon nem
authenticated leem, só o service role.

**Conflito resolvido com conferência, não no olho:** `src/lib/xgame.js`
deu add/add (os dois lados criaram o arquivo). Ficou a versão do branch
depois de provar que ela é superconjunto estrito da do main — export a
export (nenhum símbolo se perde) e linha a linha (as duas únicas linhas
exclusivas do main são a assinatura e a primeira de `resumoDoDia`, que no
branch ganharam parâmetros).

**Susto que a prova pegou, e o que ele era de verdade:** depois de trazer
o último trabalho do X-GAME, a prova caiu de 188/188 para **179/188** — e
os 9 que caíram eram todos do Master Task (períodos MANHÃ/TARDE/NOITE, o
guia de cada horário, o regerar com confirmação). Fui ver antes de
publicar: a sessão paralela trocou a **visão padrão** do Master Task para
a Jornada (X-GAME F11); a lista por período continua inteira atrás do
seletor 📋 Lista. Ou seja, a prova cobrava uma tela que o produto deixou
de abrir por padrão — não um defeito. Com a prova abrindo a Lista antes de
cobrar o que é dela: **189/189**.

**Prova final na árvore exata que foi publicada:** suíte **990/990**;
build exit 0; prova em navegador **189/189 ZERO erros**; lint 62 (a dívida
de imports não usados que já existia no main e não bloqueia CI).

**Status:** PUBLICADO EM PRODUÇÃO por autorização expressa do dono.

---

## REL-71 — O robô de migração nunca funcionou (DIR-71)

**Ordem:** *"faça o que precisa ser feito, só não quebre nada."*

**O QUE EU FUI CONFERIR PRIMEIRO.** Na publicação eu reportei que o deploy
de migração tinha falhado. Fui ver o histórico do workflow: **23 execuções,
23 falhas, desde a primeira, em 21/08**. O arquivo dele promete "aplica a
migração de produção automaticamente, com `supabase db push`" — e nunca
aplicou nada. Todas as migrações destes 15 dias entraram na mão ou pelo
MCP. O próprio cabeçalho do workflow conta o incidente que ele deveria
impedir; ele mesmo repetiu o incidente, calado.

**A CAUSA, E POR QUE DESTRAVAR SEM PENSAR SERIA PIOR.** O histórico do
banco tinha **11 linhas** para **~57 arquivos**. O `db push` recusa
quando o banco tem versão que a pasta não tem (9 casos, aplicadas pelo MCP
com carimbo próprio). Só que, destravado, ele passaria a ver **56
migrações como pendentes** — e três delas mexem em DADOS:
`backfill_financial_income`, `backfill_leilao_retido` e
`market_value_limpeza`. O robô quebrado estava segurando uma bomba sem
saber.

**A AUDITORIA (75 agentes, só leitura).** Cada uma das 56 foi lida, teve
seus objetos extraídos (tabela, coluna, índice, policy, view, função,
trigger, comentário) e conferidos um a um em `information_schema` /
`pg_catalog` no banco de produção. Toda conclusão diferente de "aplicada"
passou por uma segunda agente com a tarefa oposta: **provar que a colega
errou**. Resultado: 37 aplicadas, 19 duvidosas.

**O QUE ESTAVA ESCONDIDO — 4 migrações que nunca chegaram no banco:**

| migração | o que falta | efeito hoje |
|---|---|---|
| `concurso_checkin` | coluna `last_checkin` + índice | o check-in do concurso vive só no localStorage: `api/concurso.js` faz o PATCH, ele falha e a função devolve `ok: true` |
| `pix_key_app_users` | `app_users.pix_key` e `pix_key_type` | não há onde guardar a chave PIX de comissão |
| `recuperacao_pix` | `recuperacao_toque1_em`, `toque2_em` + índice | os dois avisos de pagamento pendente não têm onde marcar que já saíram |
| `captacao_aporte_externo` | `captacao_oportunidades.aporte_externo` | aporte fora do app não tem coluna |

A do concurso ficou **5 semanas** invisível por um motivo que virou trava:
`20260730_concurso_checkin.sql` e `20260730_wallet_held_balance.sql`
dividiam a versão `20260730`, e no histórico do banco `version` é chave
primária. Uma linha marcaria as duas como aplicadas.

**ACHADO GRAVE, QUE NÃO É MEU PRA RESOLVER SOZINHO:**
`20260821_cancelamento_estorna.sql` está só pela metade. A função
`liberar_saldos_maturados()` em produção é **byte a byte** a versão antiga
de 20260716: não tem o `exists()` contra `catalog_sales` nem a chamada de
venda cancelada. Ou seja, a trava que impede liberar saldo de venda
cancelada **não está no banco**. É caminho de dinheiro: marquei como
aplicada para o robô NÃO trocar a função sozinho, e trago em separado para
o dono decidir.

**O QUE EU FIZ, NESTA ORDEM:**
1. **Backup** do histórico em `supabase_migrations.historico_bkp_20260906`
   (11 linhas) — o desfazer completo.
2. **38 linhas** inseridas no histórico: só migrações provadas aplicadas.
   Nenhum DDL, nenhum dado tocado — é livro-caixa.
3. **8 linhas órfãs** removidas (as do MCP, cujo arquivo local passou a
   constar). A nona, `lance_sem_data_criacao`, **não tinha arquivo**: o SQL
   foi recuperado do próprio banco e commitado.
4. **3 arquivos renomeados** para versões únicas, para as que faltam de
   verdade ficarem visíveis ao robô.
5. **RLS** do backup do Financeiro entra como migração nova, pelo fluxo
   normal — é ela que prova que o robô voltou.
6. **Trava no CI**: colisão de versão nova reprova o PR, com lista de
   herança para as 8 antigas (renomeá-las reaplicaria backfill).

**Prova:** suíte **1006/1006** (2 testes novos, um deles reprovando uma
colisão de propósito); build exit 0; checador 71 migrações / 47 versões
distintas.

**Status:** o resultado real se mede na próxima execução do robô — é ela
que aplica as 4 que faltam e o RLS.

### REL-71.1 — a segunda rodada: o robô respondeu, e ensinou duas coisas

**Mergeei, e ele falhou de novo — mas o erro MUDOU**, e é isso que interessa:
saiu o "Remote migration versions not found" (o bloqueio de 15 dias) e entrou
"Found local migration files to be inserted before the last migration on
remote database". Ou seja: o histórico foi aceito. O que ele agora reclama é
outra coisa, e a lista que ele imprimiu me mostrou que **eu tinha errado uma
premissa**.

**A premissa errada:** eu supus que uma linha no histórico cobria todos os
arquivos que dividissem aquela versão. Não cobre. O CLI trata cada **ARQUIVO**;
numa colisão, só um casa com a linha e os outros continuam na fila. Foi o
próprio log que me corrigiu, listando `20260801_modo_chamada.sql`,
`20260805_system_logs_politica_insert.sql` e mais 11 que eu dava por
resolvidos.

**Conserto:** as 8 colisões foram desfeitas — 14 arquivos ganharam versão
única (`20260801010000`, `20260801020000`, …) e cada um a sua linha. A pasta
ficou com **61 arquivos, 61 versões distintas, zero colisão**, e o histórico
com 55 linhas: **nenhuma versão só no banco**, que era o que travava tudo.
A trava do CI perdeu a lista de herança e virou estrita.

**A segunda coisa que ele ensinou:** o CLI recusa aplicar migração com data
anterior à última registrada. A fila que sobrou é de 30/07 a 01/09 e o banco
já tinha 05/09 — exigir ordem seria exigir uma história que não existe, já que
15 dias entraram na mão. Entrou `--include-all`, e ele é seguro **agora** por
um motivo só: depois da auditoria, a fila pendente é exatamente o que falta, e
**nenhuma delas altera dados**. Ontem, o mesmo flag teria rodado backfill e
limpeza de novo.

**ACHADO NOVO, e é dinheiro:** `20260716_saldo_a_liberar_cron.sql` estava
escondido atrás da colisão `20260716` e nunca tinha sido auditado. Fui
conferir: o cron `liberar-saldos`, que deveria rodar
`liberar_saldos_maturados()` a cada 15 minutos, **não existe em produção** —
só há um job agendado, `expire-auctions`. E `grep` no código mostra que
ninguém chama a função pelo app: o único lugar que a menciona é um comentário
em `walletCheck.js` dizendo "quem credita é o cron". Somado ao achado da
função desatualizada, são dois problemas no mesmo caminho. **Não agendei
nada** — marquei como aplicada pra o robô não agendar sozinho um job de
dinheiro às 3 da manhã, e levo ao dono.

**Fila final que o robô vai aplicar** (só DDL aditivo, tudo `IF NOT EXISTS`):
concurso_checkin · melhor_envio_tokens · recuperacao_pix · pix_key_app_users ·
captacao_aporte_externo · o RLS do backup de rótulos.

### REL-71.2 — o robô aplicou. Primeira vez em 25 execuções.

Execução #25, 06/09/2026 03:23 UTC: **`aplicar migrações pendentes: success`**.
As 24 anteriores, desde 21/08, tinham falhado todas.

**Conferido no banco depois, não só no verde do workflow:**

| o que faltava | agora |
|---|---|
| `concurso_participantes.last_checkin` | existe ✅ |
| `app_users.pix_key` + `pix_key_type` | existem ✅ |
| `catalog_sales.recuperacao_toque1_em` + `toque2_em` | existem ✅ |
| `captacao_oportunidades.aporte_externo` | existe ✅ |
| RLS do backup de rótulos do Financeiro | **ligado** ✅ |
| índices (`last_checkin`, `recuperacao`, `melhor_envio`) | os 3 criados ✅ |
| histórico × pasta | **61 linhas para 61 arquivos** — paridade exata ✅ |

**E o que NÃO mudou, que é o mais importante:** contagem de linhas antes e
depois, tabela por tabela — concurso 101, gastos 396, vendas 626, usuários
648, comissões 481, mensagens 1782, estoque 13.470, produtos 2.853.
**Idênticas.** Nenhuma linha de dado foi criada, alterada ou apagada em
nenhum momento deste conserto: tudo que rodou foi `ADD COLUMN`,
`CREATE INDEX` e `ENABLE ROW LEVEL SECURITY`.

**Defeito da própria prova, achado no caminho:** a prova em navegador caiu
para 187/189 depois de um merge. Não era o produto — a sessão paralela tirou
`rounded-lg` dos cartões ("fim do quadrado dentro do quadrado") e a minha
prova procurava a linha da tarefa POR ESSA CLASSE. Prova amarrada em classe
de estilo quebra quando o estilo muda, e mente sobre o produto. Agora ela
acha a linha pelo TEXTO, pegando o menor ancestral que fala de "ABRIR A
LOJA" — o bloco do período inteiro também contém esse texto, e era por isso
que a primeira correção ainda clicava no guia errado. 189/189.

**Fica em aberto, para o dono decidir — os dois são caminho do dinheiro:**
1. `liberar_saldos_maturados()` em produção é a versão antiga, sem a trava de
   venda cancelada (`20260821_cancelamento_estorna` nunca completou).
2. O cron `liberar-saldos`, que deveria chamá-la a cada 15 minutos, **não
   existe** — e ninguém a chama pelo app. Ou seja: saldo maturado não está
   sendo liberado automaticamente por nada.

Não mexi em nenhum dos dois. Os dois estão marcados como aplicados no
histórico justamente para o robô não resolver isso sozinho.

---

## REL-72 — X-PERFORMANCE entregue (preview)

**Diretiva:** DIR-72. **Data:** 06/09/2026. **Escopo:** preview.

**O que foi construído, e por que assim:**

`src/lib/xperformance.js` é o motor, e ele **não desenha nada** — é lá que
moram as três decisões que sustentam o módulo: a Mentalidade é uma lente sobre
os 8 Hábitos (e não um método concorrente), não existe moeda nova (o fixo vem
do X-Game), e fixo e sociedade são **duas contas que nunca se somam**. Ter isso
numa lib pura é o que permite testar a regra sem abrir navegador.

`tests/xperformance.test.mjs` — **23 testes**. Os dois que importam foram
verificados por **mutação**, não por otimismo:

- afrouxei `podeMover` para deixar pular direto pra "Entregue": **2 testes
  quebraram**;
- fiz `pontosDaPessoa` contar card que não está entregue: **3 testes
  quebraram**.

Se eu não tivesse feito isso, eu estaria entregando 23 testes verdes sem saber
se algum deles enxerga a trava que é o valor inteiro do quadro.

`supabase/migrations/20260906120000_xperformance.sql` — duas tabelas, e só.
`xperf_encontros` tem chave **única na data**: é isso que impede duas atas da
mesma segunda brigando pela verdade. `xperf_entregaveis` aponta pro encontro
com `ON DELETE SET NULL` — apagar a ata não pode sumir com o compromisso que
foi combinado nela. RLS ligada, com leitura compartilhada **de propósito**: o
valor do quadro é todo mundo ver o que cada um assumiu; quadro particular não
organiza diretoria nenhuma.

`XPerformance.jsx` segue a gramática do Master Task, como o dono pediu.

**Prova em navegador (REL-34.1): 203/203, zero erro de página/console.**
As duas asserções que carregam a diretiva:

```
✅ DIR-72: as DUAS contas aparecem separadas — {"fixo":"1.300","pontos":5,"meta":100}
✅ DIR-72: de "Fazendo" o único passo oferecido é "Em revisão" — não dá pra pular pra Entregue
```

O `pontos: 5` é a trava vista de fora: o mock tem **dois** entregáveis do
Luiz — um de peso 3 em "Fazendo" e um de peso 5 em "Entregue". Se a regra
vazasse, o número na tela seria 8.

**Erro meu no caminho, e o que ele ensinou:** o bloco do DIR-72 entrou no meio
do fluxo da prova e **navegava para outra seção**, deixando as ~60 asserções
seguintes rodando na tela errada — a suíte caiu para 203 com falhas a partir de
"clicou em 4. Contato". Tentei consertar voltando pelo menu e insisti nisso
mais de uma rodada: o menu flutuante já estava fechado ali, e clicar em item
que não está no DOM não navega nada. A saída certa era a mais simples e eu
demorei a pegá-la: **provar a tela por último, abrindo-a pela própria URL**
(`?catalogTab=catalogo-xperformance`), que não é atalho de teste — é o contrato
que a lateral usa. A presença no menu ficou provada onde o menu já estava
aberto de qualquer jeito (bloco do DIR-64).

**Suíte:** 1051/1051. **Build:** limpo.

**Continua aberto com o dono:** a régua da sociedade (entrou 100 provisório) e
se a reunião de segunda é uma para todos ou uma por trilha (entrou uma por
semana, com a trilha marcada). Nenhum dos dois trava o uso.

---

## REL-73 — As agendas da casa entraram no agendador (preview)

**Diretiva:** DIR-73. **Data:** 06/09/2026. **Escopo:** preview.

**O que mudou pra quem usa:** no agendador livre, o passo 1 deixou de ser só
*"com quem é a reunião?"* e virou **"o que você vai marcar?"**, com duas portas
na cara: 👤 um contato da lista, ou 🏛️ uma agenda da empresa. Escolhendo a
segunda, sai um catálogo agrupado — Mentorias, Treinamentos, Eventos e Reuniões
de gestão — e escolher uma **já traz a cadência da casa preenchida**: segunda,
19:30, 90 minutos. A pessoa confirma em vez de decidir do zero. Tudo editável.

**A decisão que sustenta isso:** escolher a porta 🏛️ **muda onde a reunião é
gravada**. Contato vai pro histórico daquela pessoa (`contatos_metodo`, como
sempre foi); agenda da empresa vai pra `reunioes_empresa` — a tabela da DIR-52.
Enfiar a agenda da casa no histórico de um contato encheria a ficha de um
coitado com a grade inteira da empresa. Por isso as portas são **botões**, e
não opções escondidas num `<select>`: decisão de destino tem que estar na cara.

**Nenhuma tabela nova.** O catálogo é `src/lib/agendaEmpresa.js` — a grade da
casa muda por decisão de gente, não por cadastro de usuário, e mudá-la é uma
linha de diff revisável em vez de uma migração mais uma tela de cadastro mais
a chance de alguém digitar "Mentalidad". A migração desta rodada acrescenta
**uma coluna**: `agenda_id`, pra "Mentalidade do Diretor" no banco não ser só
um TEXTO — sem ela, perguntar depois "quantas Mentalidades do Diretor
aconteceram?" viraria casar string, que quebra no primeiro acento torto.

**O catálogo, com autoria marcada.** As oito que o dono ditou estão inteiras e
com o nome que ele usou. Sob o *"entre outros que você pode inserir"*,
acrescentei quatro e marquei cada uma como `origem: 'proposta'` no código —
**Reunião de Oportunidade** (a PPV: é pra cá que o Hábito 4 convida),
**Treinamento de Produto**, **Fechamento do Mês** e **Reunião de Liderança**
(a segunda-feira da diretoria, cuja pauta é o documento do X-Performance da
DIR-72). Ficam marcadas pra ele cortar as minhas sem ter que lembrar quais eram.

**Um defeito antigo consertado de passagem:** a coluna `publico` existia desde a
DIR-52 e **ninguém a lia**. Reunião marcada como "diretoria" aparecia pra todo
mundo. Agora ela vale: some do catálogo de quem não é diretoria **e** da agenda
do dia. O padrão da função é permissivo de propósito, pra nenhuma chamada
antiga mudar de comportamento — e como toda linha já cadastrada é `'todos'`
(o default), nenhuma reunião existente muda.

**Quem pode marcar pra empresa continua sendo quem já podia:** a porta 🏛️ só
é entregue ao modal quando o pai tem visão total. A permissão mora no ponto de
chamada, não numa condição perdida dentro do componente.

**Provado, não presumido.** 16 testes novos, verificados por **mutação**:

- `podeVerAgenda` sempre liberando → **2 testes quebram**;
- a linha guardando `dia_semana` **e** `data` juntos → **2 quebram**;
- `reunioesEmpresaDoDia` ignorando `publico` → **1 quebra**.

**Prova em navegador (REL-34.1): 213/213, zero erro de página/console.** E a
asserção que carrega a diretiva também foi mutada: tirei o desvio que manda a
agenda pra `reunioes_empresa` e a prova **reprovou** (212/213), acusando que o
último registro gravado não tinha `agenda_id` nenhum. Registro honesto: das
duas asserções de destino, a que discrimina é essa; a companheira ("nenhum
contato foi sujo") passa nos dois casos e vale como guarda, não como prova.

**Dois defeitos de prova achados nesta rodada, e nenhum era do produto:**

1. A faixa Jornada × Lista virou controle segmentado na sessão paralela e o
   emoji 📋 saiu. Minha prova caçava o emoji. Agora ela clica na aba pelo
   **papel** (`button[role="tab"]` dentro da faixa) — nome muda, papel não.
   É a terceira vez que prova presa em aparência me custa uma rodada.
2. Erro meu, e engraçado: procurei o seletor de duração por `/min/` — e
   "do**min**go" casa. O seletor de dia se passava pelo de duração. Agora a
   régua é a **forma** da opção (`/^\d+ min$/`), não uma letra solta.

**Suíte:** 1067/1067. **Build:** limpo.

---

## REL-74 — A sociedade virou três portões (preview)

**Diretiva:** DIR-74. **Data:** 06/09/2026. **Escopo:** preview.

**A pergunta era "o que você acha".** Acho que a régua de 100 pontos que eu
mesmo pus na DIR-72 estava errada — e não no valor, na **forma**. Uma barra que
só sobe tem dois furos:

1. **Catraca de mão única.** Quem entregou muito num semestre e nada no
   seguinte continuava parecendo perto de sócio. Barra premia **acervo**;
   sociedade se decide por **ritmo**.
2. **Deixava a pessoa se promover sozinha.** A trava da DIR-72 obriga o card a
   *parar* na revisão — não obriga ninguém a *olhar*. Nada impedia o dono do
   card de arrastar ele mesmo até "Entregue". Coluna de revisão sem guarda é
   pedágio sem cancela.

**O que foi aplicado:**

- **Ninguém valida o próprio entregável.** Na regra e na tela. O botão pra
  "Entregue" no seu card vem travado, com o motivo escrito ao lado ("seu card —
  outro valida"), porque travado sem motivo faz a pessoa achar que é defeito.
  O carimbo (`validado_por_id` + `validado_em`) é montado **uma vez, na lib**,
  e vale pro estado da tela e pro banco — dois carimbos escritos separados é
  como o placar da tela e o do banco divergem. Voltar de "Entregue" **apaga** o
  carimbo: validação de um estado que a peça não ocupa mais é mentira guardada.
- **Três portões no lugar da barra**, e a conversa só abre com os três acesos:
  **Peso** (100 pontos), **Consistência** (8 das últimas 12 semanas) e
  **Duplicação** (uma entrega validada do Hábito 8). A consistência conta
  **semanas distintas**, não entregáveis — dez cards numa semana e nada nas
  outras onze é pico, não é ritmo, e a diferença entre os dois é exatamente o
  que esse portão existe pra ver.

**A reunião de segunda continua uma só, e isso é resposta.** O dono disse que
as trilhas estão sendo aplicadas juntas. Duas atas na mesma semana seriam dois
"gargalos da semana" e ninguém saberia qual é o verdadeiro. A trilha marca o
**entregável**, não o encontro.

**Provado por mutação — e uma delas me pegou.** Das quatro mutações que rodei:

- validar o próprio card liberado → **3 testes quebram**;
- consistência contando entregáveis em vez de semanas → **3 quebram**;
- janela de 12 semanas ignorada → **1 quebra**;
- **`liberado` trocado de "os três" por "dois de três" → NENHUM teste
  quebrou.** Minha bateria só tinha caso de 3 abertos e de 1 aberto; faltava
  exatamente o caso do meio, que é onde a regra da média se esconde. Escrevi o
  teste que faltava e refiz a mutação: agora quebra. Sem esse achado eu estaria
  entregando uma trava que nenhum teste guardava.

**Prova em navegador (REL-34.1): 216/216, zero erro de página/console** — e
mutada também. O mock tem dois entregáveis em "Entregue" do mesmo dono: um
validado por outra pessoa (peso 5) e um carimbado por ele mesmo (peso 4).
Afrouxei a regra e a prova reprovou acusando **9 pontos** onde devia haver 5.

**Suíte:** 1101/1101. **Build:** limpo. **Migração nenhuma** — as três colunas
já existiam desde a DIR-72; isto é regra, não esquema.

**Os números são régua do dono, não lei da natureza:** 100 pontos, 8 de 12
semanas, Hábito 8. Cada um numa constante nomeada no topo do arquivo, pra ele
trocar sem procurar.
