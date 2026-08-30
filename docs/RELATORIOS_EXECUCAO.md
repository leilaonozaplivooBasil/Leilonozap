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
