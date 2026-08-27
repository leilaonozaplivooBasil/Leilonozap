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
**Status:** EXECUTADA. Ver `REL-6`.
