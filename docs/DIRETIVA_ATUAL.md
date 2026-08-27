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

## DIR-7 — Modernização do módulo Financeiro (Fase 2: receita real + centro de custo)

**Emitida por:** dono (Luiz), diretamente, depois de pedir análise do Nibo
(Conciliador Open Finance) e do ContaAzul pra trazer o que fizer sentido.
**Data:** 27/08/2026.
**Objetivo:** Fase 2 de 3. Hoje o Financeiro só enxerga saída de dinheiro
(`financial_expenses`) — não existe nenhum jeito de ver entrada (venda
confirmada, depósito confirmado) dentro do módulo. Esta fase resolve isso
com duas peças, decididas com o dono a partir da análise de Nibo/ContaAzul:
1. **Livro-razão de receita** — tabela `financial_income`, gravada no
   momento em que a venda ou o depósito é CONFIRMADO (não recalculada ao
   vivo), espelhando `financial_expenses`. Decisão de arquitetura (Opção B)
   já registrada na DIR-6: número contábil auditável pela Aline não pode
   mudar sozinho depois — se um pedido de ontem for editado hoje, o
   relatório de ontem tem que continuar igual.
2. **Centro de custo** — dimensão nova, separada de categoria, presente em
   `financial_expenses` E `financial_income` (padrão confirmado tanto no
   Nibo quanto no ContaAzul: cada lançamento tem categoria E centro de
   custo, e os relatórios cruzam por qualquer um dos dois). Lista inicial:
   Leilões / Loja Virtual / Operacional.
A Visão Geral do Financeiro passa a mostrar entrada x saída de verdade,
cruzando por categoria e por centro de custo — pronta pra Aline usar.
**Escopo autorizado:**
- Migration Supabase: tabela nova `financial_income`; coluna `cost_center`
  em `financial_expenses` (e na `financial_income` nova).
- Entidade `FinancialIncome` no adapter/client, espelhando `FinancialExpense`.
- Hook de gravação automática no momento da confirmação de uma venda
  (`catalog_sales`) e de um depósito confirmado — só transações que já têm
  origem clara no sistema (venda no catálogo, depósito confirmado);
  nenhum lançamento manual "avulso" de receita nesta fase, a menos que o
  dono peça.
- UI: campo de centro de custo no formulário de gasto; visualização de
  receita (nova aba ou seção) e Visão Geral cruzando categoria x centro de
  custo.
- A tabela nasce vazia — populada só a partir de agora, sem backfill de
  histórico, a menos que o dono peça explicitamente.
**Fora do escopo / proibido:**
- Conciliação bancária via Open Finance / qualquer API paga de terceiro
  (Pluggy, Belvo etc.) — decisão adiada pra Fase 3, junto com a automação
  de conciliação já prevista (usar os webhooks que já existem do Mercado
  Pago pra casar pagamento com venda, sem custo de API externa).
- Nenhum "match" automático de recebimento avulso sem origem clara no
  sistema (isso é chute de dinheiro, não é seguro).
- Alterar produção sem autorização explícita antes do merge.
**Regras fixas:** nenhuma além da DIR-5/DIR-6 (não mexer em produção sem
autorização, não expandir escopo, reportar no formato Protocolo-Mestre
antes do merge/deploy, preview real testado com login de verdade antes de
pedir aprovação).
**Status:** EM VIGOR.

---

## Estado agora

**DIR-7 (Fase 2) em execução.** DIR-1 a DIR-6 concluídas (ver
`docs/RELATORIOS_EXECUCAO.md`). Pendências ainda abertas, sem relação com
esta diretiva:
- `REL-2`: confirmação do 401 na Edge Function `preview-api`, do lado da
  OpenAI (as variáveis de ambiente de Preview já foram resolvidas — mesmo
  problema de fundo do achado da REL-6).
- Fase 3 do Financeiro (conciliação automática via webhook Mercado Pago,
  decisão sobre Open Finance) — depois da Fase 2 no ar.

**Nenhuma implementação nova começa até uma diretiva nova ser registrada
aqui,** no formato de `docs/PADRAO_DIRETIVAS.md`.
