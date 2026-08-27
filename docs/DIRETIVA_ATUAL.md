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
**Status:** EXECUTADA NA BRANCH. Relatório em `docs/RELATORIOS_EXECUCAO.md`
→ `REL-5`. Aguardando confirmação do dono pra merge/deploy em produção.

---

## Estado agora

**DIR-5 corrigida e testada na branch, aguardando decisão do dono sobre
merge/deploy.** DIR-1 a DIR-4 seguem executadas (ver
`docs/RELATORIOS_EXECUCAO.md`). Pendências ainda abertas, sem relação com
esta diretiva:
- `REL-2`: 3 variáveis de ambiente na Vercel + confirmação do 401 na Edge
  Function `preview-api`, do lado da OpenAI.

**Nenhuma implementação nova começa até uma diretiva nova ser registrada
aqui,** no formato de `docs/PADRAO_DIRETIVAS.md`.
