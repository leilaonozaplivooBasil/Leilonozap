# 📋 MUDANÇAS — Diário de Bordo do Backend

> **Para o time do front:** toda alteração feita no backend é registrada aqui, em português,
> da mais recente pra mais antiga. Leia este arquivo pra saber **o que mudou a cada entrega.**
>
> **Formato de cada registro:**
> - **Data** · **O que mudou** · **Arquivos** · **Impacto no front** · **Risco**

---

## 04/08/2026 — PONTOS 73/74/75: vitrine de fábrica, trava da IA e limpeza de descrições

- **PONTO 73 (vitrine Direto de Fábrica):** a página lia só os **40 leilões mais recentes**
  e filtrava depois, então itens `factory_new` mais antigos (ex.: *Bike Scooter Elétrica
  Harley 137*) nunca apareciam. A janela de leitura passou para 300 registros; o critério de
  fábrica (`product_source === 'factory_new'` e não ser plano de investimento) **não mudou**.
  Validado na tela: a bike aparece, sem estouro lateral em 375px.
- **PONTO 75 (botão Editar do admin):** a vitrine não passava a prop `isAdmin` para o
  `AuctionCard` (o card já suportava). Agora a página lê a sessão do admin em estado, com
  releitura em `storage` e `focus` — se o admin entra em outra aba, o botão aparece sem F5.
- **PONTO 74 (trava da IA):** criado `src/lib/descricaoIA.js` (`textoDaIA`) e aplicado em
  `DescriptionWithAI.jsx` e `AddCatalogProduct.jsx`: quando a IA falha, o JSON de erro **não é
  mais salvo** na descrição — o campo fica intacto e aparece aviso ao usuário.
- **PONTO 74 (limpeza dos dados) — AUTORIZADA POR GABRIEL EM 04/08/2026:** 15 leilões tinham
  o payload de erro da IA (`{"ok":false,"error":"IA indisponível"...}`) colado na descrição.
  Nova função `auditarDescricoesIA`, que por padrão **só lê** (`modo:'previa'`, mostra
  antes/depois) e só grava com `modo:'aplicar'`. Aplicado nos 15: **15 atualizados, 0 falhas**;
  reauditoria voltou **0 contaminados**. Nenhum produto da Loja Virtual estava afetado.
  Alterado **exclusivamente o campo `description`** — título, fotos, preços, lances,
  vencedores, pagamentos e comissões intocados.
- **Efeito colateral conhecido:** nesses 15, a IA nunca chegou a escrever nada, então a
  descrição ficou **igual ao título**. Limpa, mas pobre — recomendado regerar as descrições
  (agora protegidas pela trava).
- **Arquivos:** `src/pages/DiretoDeFabrica.jsx`, `src/lib/descricaoIA.js`,
  `src/components/admin/DescriptionWithAI.jsx`, `src/pages/AddCatalogProduct.jsx`,
  `base44/functions/auditarDescricoesIA/entry.ts` (novo).
- **Impacto no front:** nenhuma quebra. A vitrine de fábrica mostra todos os itens; produtos
  antes contaminados exibem só o nome, sem texto técnico.
- **Risco:** 🟢 Baixo — campo de texto de vitrine, um registro por vez, lista fechada.

---

## 03/08/2026 — Bloco 3: `winner_id` em leilão ativo é o LÍDER, não bug + 3 preços corrigidos

- **Descoberta importante (registrar como regra permanente):** `winner_id` / `winner_name` em
  leilão com status `active` significa **líder atual da disputa**, NÃO vencedor final. O
  `submitAtomicBid` grava esses campos a cada lance vencedor, e o próprio motor usa
  `!winner_id` para saber se é o primeiro lance. Portanto **leilão ativo com vencedor é
  comportamento correto** — 12 leilões estão assim hoje, todos normais. O vencedor definitivo
  é **reapurado no encerramento** pelo `finalizeAuctionCore`, sempre pelo MAIOR LANCE REALMENTE
  GRAVADO — ele não confia no `winner_id` intermediário. Não há risco financeiro nisso.
- **Causa-raiz dos preços divergentes (já fechada):** antes do PONTO 72, o servidor gravava
  preço + líder e o **navegador** criava o registro do lance depois. Se aquela criação falhasse,
  sobrava preço subido + líder gravado **sem o lance correspondente**. O `submitAtomicBid` atual
  grava o lance ANTES do preço e faz rollback do lance se perder a corrida — **não gera casos
  novos**. O que restou é resíduo histórico.
- **O que mudou:** `corrigirPrecoAtivosInflados` teve a **trava 3 revisada**: saiu o critério
  errado "não pode ter vencedor" e entrou **coerência do líder** — se existe lance real, o
  `winner_id` tem de ser o autor do maior lance; se não existe lance, o líder é resíduo
  pré-PONTO 72 e a correção é permitida. Aplicado em 3 leilões ativos sem nenhum lance real:
  Kit 5 Spot R$ 5,80 → **0,80** · Mini Máquina R$ 32 → **30** · Sensor Presença R$ 3,60 → **1,60**.
- **Barrado de propósito:** *Irrigador Dental* — líder gravado (Alexandre walenkamp) não é o
  autor do maior lance (vale-do-recreio). Registro histórico inconsistente: **preço NÃO foi
  mexido**, para não maquiar divergência. Aguarda decisão separada.
- **Arquivos:** `base44/functions/corrigirPrecoAtivosInflados/entry.ts` (trava 3 revisada),
  `base44/functions/investigarAtivosComVencedor/entry.ts` (novo, 100% leitura).
- **Impacto no front:** nenhum código de front mudou. Os 3 leilões passam a exibir o valor
  correto na vitrine e na sala.
- **Risco:** 🟡 Médio — só o campo `current_price` de leilões ativos, sem lance, sem comissão.
- **Limitação da validação (transparência):** a trava 4 (pagamento vinculado) **não pôde ser
  confirmada** — `asaas_payments` e `digital_wallet_transactions` responderam "indisponível"
  (a mesma pendência de schema já registrada no Bloco 2). Mitigação aceita: os 3 leilões têm
  zero lance, estão ativos no prazo e sem comissão distribuída.

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