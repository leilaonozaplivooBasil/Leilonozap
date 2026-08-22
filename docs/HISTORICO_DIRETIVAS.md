# HISTÓRICO DE DIRETIVAS DE ENGENHARIA — Leilão NoZap

> Registro **append-only** de toda diretiva formal de engenharia — instrução
> estruturada com objetivo, escopo e restrições explícitas, vinda do dono ou
> da OpenAI, que autorizou uma rodada de trabalho. Nunca reescrito, nunca
> podado. Quando uma diretiva é substituída, a versão anterior sai de
> `docs/DIRETIVA_ATUAL.md` e vira uma entrada aqui, com o resultado final.
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
(imagem do produto, etiqueta Melhor Envio). **Regra fixa: somente leitura,
nenhuma alteração de código.**
**Executado:** achado crítico fora da lista original (admin fake por
hostname `.vercel.app` no harness da PR #87); causa-raiz das 3 regressões
identificada com evidência de código (uma delas — achado C — sem confirmação
final por falta de acesso à Edge Function `preview-api`).
**Publicado em:** comentário nas PRs #86 e #87 + `docs/CLAUDE_HANDOFF.md`
seção 11.
**Status:** CONCLUÍDA.

---

## DIR-2 — Comando de implementação no Preview (PR #87)

**Emitida por:** OpenAI, comentário no PR #87 (`leilaonozaplivooBasil`,
comment id `5376504779`), autorizada pelo dono no chat ("execute exatamente
o que foi definido, não mexa em produção").
**Data:** 21/08/2026.
**Objetivo:** corrigir a Jornada Operacional da Gestão de Pedidos **só no
Preview** (PR #87), preservando produção intacta. Diagnóstico novo da
OpenAI: Edge Function `preview-api` volta HTTP 401 antes de entrar na
função, desde a v2 dela — problema de autenticação do harness, não de
lógica de negócio.
**Regras fixas:** só na branch `openai/catalog-status-sync-preview`; nunca
tocar `main`, produção, Supabase/Vercel de produção, dinheiro/frete/RLS
geral; nunca mergear; nunca alterar `select.jsx` global — resolver
vocabulário de status localmente; se precisar de acesso que não tenho
(Edge Function, variável Vercel), documentar e parar, não inventar.
**Executado:**
1. `select.jsx` revertido por completo.
2. Vocabulário de status resolvido localmente em `CatalogOrdersAdmin.jsx`.
3. Admin fake por hostname removido — substituído por gate explícito
   (`VITE_PREVIEW_STAGING=true`, variável que só a OpenAI pode configurar).
4. JWT hardcoded do harness removido, unificado com a chave já resolvida em
   `supabaseClient.js` (correção fundamentada, não confirmada como
   resolução completa do 401 — falta acesso à Edge Function pra validar).
5. Imagem real do produto no checklist (pedido de 1 item).
6. Erro real (`error.message`) no toast do checklist, no lugar do texto fixo.
7. Bloco de etiqueta Melhor Envio reforçado visualmente.
**Publicado em:** comentário no PR #87 (`5376578505`) + `docs/CLAUDE_HANDOFF.md`
seção 11.1 + `docs/DIARIO.md`.
**Commit:** `5689c588` (branch `openai/catalog-status-sync-preview`).
**Status:** EXECUTADA. Blockers pendentes do lado da OpenAI: configurar as
3 variáveis de ambiente na Vercel; confirmar se o 401 foi de fato resolvido
(sem acesso à Edge Function pra validar por aqui).

---

## DIR-3 — Estrutura de governança de diretivas (esta rodada)

**Emitida por:** dono (Luiz), diretamente.
**Data:** 21/08/2026.
**Objetivo:** criar `docs/DIRETIVA_ATUAL.md`, este arquivo, e
`docs/ARQUITETURA.md`, preservando todo o conteúdo existente de handoff e
diário. **Regra fixa: documentação pura — nenhuma alteração de
funcionalidade, banco, produção ou regra de negócio.** Depois desta rodada,
toda implementação futura espera uma diretiva nova e explícita.
**Executado:** os três arquivos criados; MAPA do `docs/CLAUDE_HANDOFF.md`
atualizado pra indexá-los.
**Publicado em:** relatório desta rodada, ao dono, no chat.
**Status:** CONCLUÍDA — ver confirmação explícita de "nada de código
alterado" em `docs/DIRETIVA_ATUAL.md`.
