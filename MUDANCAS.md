# 📋 MUDANÇAS — Diário de Bordo do Backend

> **Para o time do front:** toda alteração feita no backend é registrada aqui, em português,
> da mais recente pra mais antiga. Leia este arquivo pra saber **o que mudou a cada entrega.**
>
> **Formato de cada registro:**
> - **Data** · **O que mudou** · **Arquivos** · **Impacto no front** · **Risco**

---

## 03/08/2026 — Bloco 3 ENCERRADO: ausência de "Compre Já" é intencional

- **Decisão do dono do produto (Gabriel, 03/08/2026):** os leilões ativos hoje **não têm preço
  de "Compre Já" de propósito**. É configuração de estratégia comercial (esses leilões devem
  ser disputados por lance, sem atalho de compra imediata), **não é dado faltando**.
- **Consequência:** o contador `sem_buy_now_price` da auditoria (`auditarPrecoPonto72`) é
  **informativo, não é anomalia**. Nenhuma correção em massa deve ser feita sobre ele.
  Qualquer preenchimento de "Compre Já" nesses leilões só com autorização explícita, um a um.
- **Arquivos:** nenhum código alterado — registro de decisão.
- **Impacto no front:** nenhum. Cards e sala de lance seguem escondendo o botão de compra
  imediata quando o leilão não tem esse preço (comportamento correto e esperado).
- **Risco:** 🟢 Baixo (só documentação).

---

## 03/08/2026 — Bloco 2: preço atual abaixo do lance inicial (6 leilões)

- **O que mudou:** 6 leilões ativos estavam com o "lance atual" MENOR que o lance inicial
  (4 zerados e 2 defasados após o inicial ser aumentado), o que faria o primeiro lance
  começar de graça na vitrine. O `current_price` desses 6 foi igualado ao `starting_price`
  por uma função temporária de escopo fechado (`corrigirPrecoAbaixoMinimo`), com lista fixa
  de IDs no código, 6 travas por leilão (ativo · zero lance · sem vencedor · sem comissão ·
  lance inicial confere · preço ainda abaixo) e execução em duas fases (simulação → gravação).
  Corrigidos: R$ 0 → 0,80 (Organizador de Mesa) · R$ 0 → 0,80 (Kit Fineliner) ·
  R$ 10 → 20 (Mini Ferro) · R$ 10 → 25 (Ferro Vertical) · R$ 0 → 216 (Cadeira Presidente) ·
  R$ 0 → 497 (Bike Harley M4). Reauditoria: anomalia inversa caiu de 6 para 0.
- **Arquivos:** `base44/functions/corrigirPrecoAbaixoMinimo/entry.ts` (novo, temporário)
- **Impacto no front:** nenhum código de front mudou. Os 6 leilões passam a exibir o valor
  inicial correto na vitrine e na sala de lance.
- **Risco:** 🔴 Alto (escreve preço de leilão em produção) — mitigado: nenhum dos 6 tinha
  lance, vencedor ou comissão; apenas `current_price` foi alterado.
- **Pendência registrada (fora do escopo):** as 3 checagens de vínculo financeiro da auditoria
  falham silenciosamente porque procuram colunas/tabela que não existem mais
  (`asaas_payments.auction_id`, tabela `mercado_pago_payments`,
  `digital_wallet_transactions.related_auction_id`). Enquanto isso, o "grupo com pagamento"
  da auditoria nunca acusa ninguém.

---

## 28/07/2026 — Correção da escrita de lotes (Estoque de Lotes)

- **O que mudou:** os botões da tela de Estoque de Lotes (Salvar, Arrematamos, Avançar status,
  Excluir) voltaram a usar o adapter oficial (`base44.entities.LoteRecebido`), que escreve no
  Supabase via `entityWrite`. Foi removido um atalho antigo que apontava para o banco errado
  (causava erros "ID not found" e HTTP 502).
- **Arquivos:** `src/pages/EstoqueLotes.jsx`
- **Impacto no front:** nenhum. É o mesmo padrão de escrita usado no resto do app.
- **Risco:** 🔴 Alto (mexe em estoque) — mas foi um retorno ao padrão já comprovado, sem lógica nova.

---

## 28/07/2026 — Índice das funções no CONTRATO

- **O que mudou:** adicionado ao `CONTRATO.md` um índice das principais funções do backend,
  agrupado por área (pagamentos, carteira, leilões, comissões, estoque, catálogo, usuários,
  imagens, relatórios), cada uma com explicação em português e marcação de risco (🟢/🟡/🔴).
- **Arquivos:** `CONTRATO.md`
- **Impacto no front:** só documentação — ajuda o time a saber o que cada função faz.
- **Risco:** 🟢 Baixo.

---

## 28/07/2026 — Criação da documentação-base do projeto

- **O que mudou:** criados os arquivos `CONTRATO.md` (mapa-mestre do projeto) e `MUDANCAS.md`
  (este diário de bordo), ambos em português, para alinhar backend e front pelo GitHub.
- **Arquivos:** `CONTRATO.md`, `MUDANCAS.md`
- **Impacto no front:** só documentação — nada no código funcional mudou.
- **Risco:** 🟢 Baixo.

---

<!--
  MODELO PARA PRÓXIMOS REGISTROS (copie o bloco abaixo pra cima, logo após esta linha):

## DD/MM/AAAA — Título curto da mudança

- **O que mudou:** [descrição em português]
- **Arquivos:** [lista de arquivos tocados]
- **Impacto no front:** [o que o time do front precisa saber / fazer, ou "nenhum"]
- **Risco:** 🟢 Baixo / 🟡 Médio / 🔴 Alto — [motivo]
-->