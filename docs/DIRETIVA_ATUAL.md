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

## DIR-5 — Super_admin bloqueado em painéis administrativos

**Emitida por:** dono (Luiz), diretamente, reportando bloqueio ao vivo em
`/Financial`.
**Data:** 21/08/2026.
**Objetivo:** analisar todas as telas com o mesmo padrão de bloqueio
("Acesso restrito a administradores"), corrigir o que estiver errado, e
organizar essa lógica de forma melhor — evitando cada tela reescrever a
própria checagem de administrador.
**Escopo autorizado:** correção de código nas telas com esse padrão de
bloqueio; criação de uma fonte única pro conceito de "administrador".
**Fora do escopo / proibido:** alterar banco, produção, regra de negócio
financeira; expandir a correção pra conferências de UI cosméticas fora do
padrão de bloqueio de página (registradas como follow-up, não corrigidas).
**Regras fixas:** análise sênior antes da correção; reportar no formato do
Protocolo-Mestre (`ENTENDI QUE VOCÊ QUER` etc.) antes do merge/deploy.
**Status:** CONCLUÍDA. PR #128 mergeado por squash em `main` (commit
`f05532b9`), CI verde, Vercel confirmou deploy em produção. Relatório
completo em `docs/RELATORIOS_EXECUCAO.md` → `REL-5`.

---

## DIR-6 — Modernização do módulo Financeiro (Fase 1)

**Emitida por:** dono (Luiz), diretamente, pedindo análise sênior do
Financeiro (edição de gastos, trazer receita real da empresa, deixar mais
automático e profissional — leigo e profissional, ex.: Aline).
**Data:** 21/08/2026.
**Objetivo:** Fase 1 de 3 — correções rápidas e de baixo risco antes de
qualquer mudança de arquitetura de dados. Fases 2 (unificar receita real —
vendas e depósitos — numa Visão Geral/DRE) e 3 (automação de conciliação)
ficam pra diretivas futuras, com a decisão de arquitetura já registrada no
chat: **Opção B — livro-razão de entradas** (uma tabela `financial_income`
gravada no momento em que a venda/depósito é confirmado, espelhando
`financial_expenses`), escolhida sobre "calcular na hora" porque um número
financeiro auditável por um profissional de contabilidade (a Aline) precisa
de um registro histórico estável — se um relatório de ontem mudasse sozinho
porque um dado de origem foi alterado hoje, isso não serve pra
contabilidade real.
**Escopo autorizado:** correções na tela Financeiro (`Financial.jsx` e
dependências diretas) que não envolvem banco/esquema novo.
**Fora do escopo / proibido:** criar a tabela `financial_income` ou
qualquer sincronização de receita real nesta rodada — isso é Fase 2,
diretiva própria.
**Regras fixas:** nenhuma além da DIR-5 (não mexer em produção sem
autorização, não expandir escopo).
**Status:** CONCLUÍDA. Dono conferiu ao vivo no Preview (logado com a
própria conta) e autorizou o merge. PR #130 mergeado por squash em `main`,
commit `5fb996f2`, CI verde. Relatório completo em
`docs/RELATORIOS_EXECUCAO.md` → `REL-6` (inclui o achado à parte: variável
`SUPABASE_SERVICE_ROLE_KEY` faltando no ambiente Preview da Vercel — já
corrigido pelo dono).

---

## Estado agora

**DIR-5 e DIR-6 (Fase 1) concluídas e em produção.** DIR-1 a DIR-4 seguem
executadas (ver `docs/RELATORIOS_EXECUCAO.md`). Pendências ainda abertas,
sem relação com esta diretiva:
- `REL-2`: confirmação do 401 na Edge Function `preview-api`, do lado da
  OpenAI (as variáveis de ambiente de Preview já foram resolvidas — mesmo
  problema de fundo do achado da REL-6).
- Fase 2 do Financeiro (receita real) e Fase 3 (automação) — aguardando o
  dono decidir quando começar.

**Nenhuma implementação nova começa até uma diretiva nova ser registrada
aqui,** no formato de `docs/PADRAO_DIRETIVAS.md`.
