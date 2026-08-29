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

## DIR-9 — Centro de custo customizável ("+ Novo")

**Emitida por:** dono (Luiz), diretamente, ao lado do print do formulário de
gasto: "ao lado do centro de custo, acrescentar botão + Nova pra quando
faltar eu mesmo poder adicionar e crescer a ferramenta".
**Data:** 27/08/2026.
**Objetivo:** a lista de centro de custo (Leilões/Loja Virtual/Operacional,
`src/lib/costCenters.js`) é fixa — se faltar uma unidade de negócio nova, só
eu poderia adicionar no código. Corrigir dando ao dono o mesmo poder que já
existe em Categoria: digitar um centro de custo novo direto no formulário,
sem depender de uma rodada de engenharia pra cada unidade de negócio nova.
**Escopo autorizado:**
- Botão "+ Novo" ao lado do campo Centro de Custo em `ExpenseFormModal.jsx`,
  mesmo padrão já usado em Categoria (alterna pra um campo de texto livre).
- `FinancialOverview.jsx` (Visão Geral) passa a incluir na tabela por
  centro de custo qualquer valor já lançado, não só os 3 da lista fixa —
  sem isso, um centro de custo digitado como "+ Novo" gravava no gasto mas
  sumia do relatório.
**Fora do escopo / proibido:** criar uma tela de administração dedicada pra
gerenciar centros de custo (renomear/excluir); mexer em `financial_income`
nesta rodada (a receita já é gravada automaticamente pelo servidor, sem
formulário manual — DIR-7).
**Regras fixas:** nenhuma além da DIR-5/6/7/8 (não mexer em produção sem
autorização, reportar no formato Protocolo-Mestre antes do merge/deploy).
**Status:** EM VIGOR.

---

## Estado agora

**DIR-9 em execução.** DIR-1 a DIR-8 concluídas (ver
`docs/RELATORIOS_EXECUCAO.md`). Pendências ainda abertas, sem relação com
esta diretiva:
- `REL-2`: confirmação do 401 na Edge Function `preview-api`, do lado da
  OpenAI (as variáveis de ambiente de Preview já foram resolvidas — mesmo
  problema de fundo do achado da REL-6).
- Fase 3 do Financeiro (conciliação automática via webhook Mercado Pago,
  decisão sobre Open Finance) — depois da Fase 2 no ar (já está, desde a
  DIR-7/DIR-8, PR #132).

**Nenhuma implementação nova começa até uma diretiva nova ser registrada
aqui,** no formato de `docs/PADRAO_DIRETIVAS.md`.
