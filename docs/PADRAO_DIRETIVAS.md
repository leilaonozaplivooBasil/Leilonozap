# PADRÃO DE DIRETIVAS E RELATÓRIOS DE EXECUÇÃO — Leilão NoZap

> Define o formato fixo que toda diretiva de engenharia e todo relatório de
> execução seguem, a partir de 21/08/2026 (pedido do dono, depois da rodada
> de governança inicial). Objetivo: qualquer diretiva e qualquer relatório
> ficam fáceis de auditar em sequência, sem depender do estilo de quem
> escreveu. Isto é padrão de **forma**, não de conteúdo — não substitui
> `docs/ARQUITETURA.md` (o quê) nem `docs/DIARIO.md` (a conversa completa).

---

## Os dois tipos de documento

1. **Diretiva** — a especificação do que está autorizado. Escrita ANTES do
   trabalho. Vive em `docs/DIRETIVA_ATUAL.md` enquanto vigora; quando
   substituída, sua especificação (sem os dados de execução) é arquivada em
   `docs/HISTORICO_DIRETIVAS.md`.
2. **Relatório de execução** — o resultado real do trabalho feito sob uma
   diretiva. Escrito DEPOIS, sempre referenciando o ID da diretiva que
   autorizou. Vive em `docs/RELATORIOS_EXECUCAO.md`, append-only, um por
   diretiva (pode ter mais de um relatório pra mesma diretiva se ela for
   executada em etapas).

**Regra de numeração:** diretivas usam `DIR-N`; relatórios usam `REL-N` e
citam explicitamente qual `DIR-N` executam. N nunca se repete, nunca é
reescrito depois de publicado.

---

## Template — DIRETIVA

```
## DIR-N — [Título curto, uma linha]

**Emitida por:** [dono | OpenAI, via <onde> | Claude, via <justificativa>]
**Data:** DD/MM/AAAA
**Objetivo:** [1-2 frases — o que esta diretiva quer alcançar]
**Escopo autorizado:** [lista objetiva do que PODE acontecer]
**Fora do escopo / proibido:** [lista objetiva do que NÃO pode acontecer]
**Regras fixas:** [restrições específicas desta diretiva, se houver — ex.:
  "não mergear", "não tocar produção", "não inventar se faltar acesso"]
**Status:** EM VIGOR | EXECUTADA | CANCELADA
```

## Template — RELATÓRIO DE EXECUÇÃO

```
## REL-N — Execução da DIR-N

**Data:** DD/MM/AAAA
**Branch:** 
**Commit(s):**
**O que foi feito:** [lista objetiva, verificável]
**O que NÃO foi feito / blockers:** [lista, cada item com o motivo —
  falta de acesso, fora de escopo, dependência externa]
**Testes:** [resultado real — N/N, ou "não aplicável"]
**Build:** [resultado real]
**Confirmação de escopo:** declaração explícita do que FOI e do que NÃO FOI
  tocado (código / banco / produção / config), comparável com o "Escopo
  autorizado" e o "Fora do escopo" da diretiva.
**Publicado em:** [handoff, PR, chat — onde mais este relatório também apareceu]
**Status final:** CONCLUÍDA | PARCIAL (com o que falta) | BLOQUEADA
```

---

## Regras de uso

- Toda diretiva nova **substitui** o conteúdo de `docs/DIRETIVA_ATUAL.md`;
  a anterior vai pro fim de `docs/HISTORICO_DIRETIVAS.md` inalterada, só com
  o `Status` atualizado.
- Nenhuma implementação começa sem uma diretiva em `docs/DIRETIVA_ATUAL.md`
  cobrindo explicitamente aquele trabalho.
- Todo relatório de execução cita o `DIR-N` que autorizou o trabalho — nunca
  existe relatório "solto", sem diretiva correspondente.
- A "Confirmação de escopo" do relatório é obrigatória mesmo quando nada
  fora do escopo foi tocado — "nada alterado além do autorizado" é uma
  confirmação válida e esperada, não um campo opcional.
