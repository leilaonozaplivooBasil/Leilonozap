# DIRETIVA ATUAL — Leilão NoZap

> Este arquivo contém **só a diretiva de engenharia em vigor agora** — o que
> está autorizado a acontecer nesta rodada, e nada além disso. Quando uma
> diretiva nova for definida (pelo dono ou pela OpenAI), este arquivo é
> **substituído** pelo conteúdo da diretiva nova; a versão anterior não se
> perde — vai para `docs/HISTORICO_DIRETIVAS.md` no mesmo commit.
>
> **Regra fixa desta rodada (21/08/2026, pedido do dono):** depois desta
> rodada, nenhuma implementação (código, banco, produção) começa sem uma
> diretiva nova e explícita registrada aqui primeiro.

---

## Diretiva em vigor

**Emitida por:** dono (Luiz), consolidando um pedido de estrutura de
documentação — sem relação com correção de código.

**Data:** 21/08/2026.

**Objetivo:** criar a estrutura de governança de diretivas de engenharia
(este arquivo, o histórico e o documento de arquitetura), preservando todo o
conteúdo já existente em `docs/CLAUDE_HANDOFF.md` e `docs/DIARIO.md`.

**Escopo autorizado:**
- Criar/atualizar `docs/DIRETIVA_ATUAL.md`, `docs/HISTORICO_DIRETIVAS.md`,
  `docs/ARQUITETURA.md`.
- Atualizar o MAPA em `docs/CLAUDE_HANDOFF.md` pra indexar os arquivos
  novos (sem remover nada do que já existia).

**Fora do escopo, explicitamente proibido nesta rodada:**
- Alterar funcionalidade de código (frontend, backend, Edge Function).
- Alterar banco de dados (produção ou staging), migração, RLS.
- Alterar produção (Vercel Production, domínio, variáveis de ambiente).
- Alterar regra de negócio (frete, comissão, escrow, pagamento).
- Mergear qualquer PR, tocar `main` além desta documentação.

**Estado dos PRs abertos, sem nenhuma ação nesta rodada:**
- PR #86 (`openai/catalog-status-sync`) — congelada, aguardando o Preview
  #87 ser validado pelo dono, por decisão da OpenAI.
- PR #87 (`openai/catalog-status-sync-preview`) — última execução no commit
  `5689c588` (ver `docs/HISTORICO_DIRETIVAS.md`, diretiva D2). Blockers
  pendentes do lado da OpenAI: configurar 3 variáveis de ambiente na Vercel
  e confirmar se o 401 da Edge Function foi resolvido.

**Confirmação explícita exigida pelo dono:** nenhuma funcionalidade do
sistema foi alterada nesta rodada. Os três arquivos criados/atualizados são
documentação pura — nenhum arquivo de código-fonte, configuração de
build, migração de banco ou variável de ambiente foi tocado.

**Próximo passo:** aguardar. Nenhuma implementação começa até uma diretiva
nova ser registrada aqui.
