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
