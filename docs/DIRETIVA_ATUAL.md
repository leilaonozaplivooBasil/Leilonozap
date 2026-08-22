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

## DIR-4 — Padronização de diretivas e relatórios de execução

**Emitida por:** dono (Luiz), diretamente.
**Data:** 21/08/2026.
**Objetivo:** refinar a estrutura de governança criada na DIR-3, definindo
um formato fixo (template) pra diretivas e pra relatórios de execução, pra
toda rodada futura seguir o mesmo padrão.
**Escopo autorizado:** criação de `docs/PADRAO_DIRETIVAS.md`; reestruturação
de `docs/HISTORICO_DIRETIVAS.md` pra separar especificação de execução;
criação de `docs/RELATORIOS_EXECUCAO.md`.
**Fora do escopo / proibido:** qualquer alteração de código, banco,
produção ou regra de negócio.
**Regras fixas:** nenhuma além da DIR-3 (documentação pura). Depois desta
rodada, toda implementação futura espera uma diretiva nova e explícita,
registrada aqui no formato de `docs/PADRAO_DIRETIVAS.md`.
**Status:** EXECUTADA. Relatório completo em `docs/RELATORIOS_EXECUCAO.md`
→ `REL-4`.

---

## Estado agora

**Nenhuma diretiva em aberto.** As DIR-1 a DIR-4 estão todas executadas
(ver `docs/RELATORIOS_EXECUCAO.md`). Duas pendências continuam registradas
como blockers no `REL-2`, do lado da OpenAI (configurar 3 variáveis de
ambiente na Vercel; confirmar se o 401 da Edge Function `preview-api` foi
resolvido) — não bloqueiam esta diretiva, bloqueiam a validação final do
Preview da PR #87.

**Nenhuma implementação começa até uma diretiva nova ser registrada aqui,**
no formato de `docs/PADRAO_DIRETIVAS.md`.
