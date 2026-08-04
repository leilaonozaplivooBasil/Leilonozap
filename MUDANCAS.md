# 📋 MUDANÇAS — Diário de Bordo do Backend

> **Para o time do front:** toda alteração feita no backend é registrada aqui, em português,
> da mais recente pra mais antiga. Leia este arquivo pra saber **o que mudou a cada entrega.**
>
> **Formato de cada registro:**
> - **Data** · **O que mudou** · **Arquivos** · **Impacto no front** · **Risco**

---

## 04/08/2026 — PONTO 79B: descrições regeradas pela IA (359 produtos de estoque)

- **Contexto:** o erro original da IA era `"Free tier users do not have access to this model"`
  — falha de **plano**, não bug. Gabriel confirmou plano pago em 04/08 e autorizou a regeração.
- **O que mudou na função `regerarDescricoesIA`:** ganhou o parâmetro `alvo`
  (`'leiloes'` = padrão, comportamento original **intacto**; `'produtos'` = `products.notes`).
  Tabela/campo/título passaram a ser variáveis e o PATCH grava em `[CAMPO]`.
- **Dois detalhes achados no teste (e corrigidos):** 1) `products` não tem as colunas
  `category`/`status` — pedir coluna inexistente fazia o PostgREST devolver 400 e a busca voltar
  **vazia silenciosamente** (parecia "0 alvos"). Agora o SELECT é por tabela e falha de leitura
  retorna erro explícito em vez de fingir zero. 2) Registro **sem título** é descartado — sem
  título a IA não tem base para escrever nada seguro.
- **Execução:** prévia com 3 itens confirmou IA funcionando e texto de qualidade (~740-820
  caracteres, 2 parágrafos + benefícios). Aplicado: **30 atualizados, 0 falhas**.
- **Protegido:** só o campo `notes`. O título (`description`) não foi tocado — e a função
  agora documenta que em `products` `description` é o TÍTULO.
- **Risco:** 🟡 Médio — prévia obrigatória, gravação um a um, texto suspeito/curto é pulado.
- **⚠️ Achado:** eram **359 produtos** sem texto em `notes` — os 30 do PONTO 79 mais ~329 que
  **nunca tiveram descrição nenhuma**.

**CONCLUSÃO — vitrine inteira coberta (autorizado por Gabriel na mesma sessão):** os **359
foram regerados**, em blocos, até a fila zerar. Reauditoria final: **0 produtos sem descrição**
na Loja Virtual. Zero falhas de IA em todos os blocos; textos entre ~630 e ~950 caracteres.
- **⚠️ Ajuste operacional importante para quem rodar isso de novo:** bloco de **30 estoura o
  tempo** do runtime (timeout em ~110s — um bloco morreu no meio e foi reprocessado depois).
  **Use `limite: 15`** (~34s por bloco, estável nos 20+ blocos executados).
- **1 registro pulado de propósito:** produto sem título — a trava "sem título, sem geração"
  agiu corretamente (a IA não teria base para escrever nada verdadeiro).
- **Continua intocado:** preço, estoque, título, imagens, comissões, pagamentos. Só `notes`.

---

## 04/08/2026 — PONTO 79: limpeza dos 30 produtos com erro da IA aparecendo na loja

- **Sintoma:** 30 produtos exibiam na Loja Virtual o payload de erro cru da IA
  (`{"ok":false,"error":"IA indisponível","details":"...Free tier users do not have access..."}`).
- **Causa-raiz do "não achávamos":** a auditoria `auditarDescricoesIA` só varria o campo
  `description` das tabelas `auctions` e `catalog_products`. A corrupção estava **100% no campo
  `notes` da tabela `products`** — por isso a prévia sempre voltava zero contaminados.
  ⚠️ Atenção para o futuro: em `products`, `description` é o **título** do produto; o texto
  longo é `notes`. Confundir os dois apagaria o nome do produto.
- **O que mudei na função:** as tabelas viraram configuráveis por campo
  (`{tabela, campo, campo_titulo}`) e entrou `products / notes / description`. O PATCH agora
  grava em `[item.campo]` em vez de `description` fixo. Comportamento das outras duas tabelas
  inalterado.
- **Execução (autorizada por Gabriel, 04/08):** prévia → 30 contaminados, todos
  `produto_estoque`, todos 100% payload de erro (nada aproveitável). Aplicado com `ids:'todos'`
  → **30 atualizados, 0 falhas**. Prévia rodada de novo → **0 contaminados**. Confirmado.
- **Efeito na vitrine:** `notes` ficou vazio, então a Loja Virtual passa a exibir o próprio
  título do produto (fallback que já existia em `ProductDetailsModal` e `CatalogProductDetails`).
  Nenhum produto ficou sem texto na tela.
- **NÃO foi tocado:** preço, estoque, status, título (`description`), imagens, comissões,
  pagamentos. Só o campo `notes` dos 30 IDs listados na prévia.
- **Risco:** 🟡 Médio (escrita em massa em produção) — mitigado: prévia obrigatória antes,
  gravação campo a campo, só nos IDs achados, verificação pós-execução.
- **Pendência:** regerar descrição de verdade para esses 30 via `regerarDescricoesIA`
  (gasta créditos de IA — aguardando autorização separada).

---

## 04/08/2026 — PONTO 78: parcelamento real + cliente absorve a taxa do cartão

- **Decisão do dono do produto (Gabriel, 04/08/2026):** **o cliente absorve TUDO.** A loja
  não absorve taxa nenhuma — nem juros de parcelamento, nem taxa de venda do Mercado Pago.
- **O defeito:** a vitrine mostrava `preço ÷ 12` (produto de R$ 100 → "12x de R$ 8,33"),
  número que não existe em nenhum cenário. Além disso prometia "em até 12x" em produto de
  R$ 33, que o MP só parcela em **6x** (parcela mínima ~R$ 5).
- **Números confirmados na API oficial do MP** (token de produção, 04/08): juros de 9,64% em
  2x até 22,11% em 12x; taxa de venda parcelada 5,31%. Somados, batem casa decimal por casa
  decimal com o painel do MP (2x 14,95% · 3x 16,54% · 6x 19,63% · 12x 27,42%). A taxa % é
  **fixa por número de parcelas** — não varia com o valor.
- **O que mudou (exibição):** novo `src/lib/parcelamento.js` — fonte única. A parcela exibida
  agora é `preço × (1 + 5,31%) × (1 + juros do MP) ÷ n`, e o nº de parcelas é o **maior que o
  MP realmente oferece** para aquele valor. Produto de R$ 100 → **12x de R$ 10,72**.
  Produto de R$ 33 → passa a mostrar 6x, não 12x.
- **O que mudou (cobrança) 🔴:** `createMPCatalogCardCheckout.js` acrescenta uma linha
  **"Taxa de pagamento no cartão" (5,31%)** sobre produtos + frete. Os juros continuam sendo
  aplicados pelo próprio MP sobre esse valor — é assim que a vitrine e a cobrança batem.
- **Proteção da comissão:** a taxa fica **FORA da base de comissão** — `sale_price` e
  `total_amount` continuam sendo só o valor dos produtos. A taxa é registrada em
  `raw_base44.taxa_cartao` para auditoria. Comissão de ninguém foi inflada.
- **Armadilha evitada:** "repassar" multiplicando o preço por 1,2742 faria o MP aplicar os
  22,11% dele **em cima disso** — o cliente pagaria os juros duas vezes (12x de R$ 12,97 num
  produto de R$ 100). Por isso o repasse é só da taxa de venda.
- **Arquivos:** `src/lib/parcelamento.js` (novo), `src/components/catalog/ProductDetailsModal.jsx`,
  `src/pages/CatalogProductDetails.jsx`, `api/functions/createMPCatalogCardCheckout.js`,
  `base44/functions/consultarTaxasMP/entry.ts` (novo, só leitura — serve pra reconferir as taxas).
- **NÃO foi tocado:** `mpWebhook`, `createMPPix`, `createMPPayment`, `_lib/commissions`,
  carteira, frete, estoque, auth, `CatalogProductCard`.
- **Risco:** 🔴 Alto (altera valor cobrado do cliente) — mitigado: base de comissão intacta,
  taxa em linha separada e visível no checkout do MP, nenhuma venda existente alterada.
- **Pendências declaradas:**
  1. **PIX não repassa taxa** (o MP cobra ~0,99% na hora). Não mexi: o preço do PIX é o preço
     de vitrine de toda a loja, mudar isso muda o preço anunciado em todo lugar.
  2. **Leilões e adesão de Vendedor** continuam com a taxa absorvida — outros arquivos, outra
     autorização.
  3. `Cart.jsx` e `CatalogCheckout2.jsx` ainda não foram lidos; se exibirem parcela, precisam
     do mesmo ajuste.

---

## 04/08/2026 — PONTO 77: fechar a torneira da importação (prevenção na entrada)

- **O que mudou:** todo produto que ENTRA por importação passa a ter o nome limpo
  **antes de ser gravado**: sai o lixo de marketplace ("frete grátis", "promoção",
  "últimas unidades", "R$ 149,90", "12x sem juros", emoji), e nome em CAIXA ALTA vira
  Capitalizado preservando siglas técnicas (LED, USB, 4K, INOX) e códigos (M4, 137, 2L, XL).
  Corte de tamanho agora respeita a palavra inteira — nunca corta no meio.
- **Regra de ouro embutida:** se a limpeza piorar o nome (resultado com menos de 3
  caracteres), a função **devolve o original intacto**. Nunca destrói nome de produto.
- **Arquivos:** `api/_lib/limparTitulo.js` (novo), `api/functions/bulkImportProducts.js`,
  `base44/functions/gerarProdutosDoLote/entry.ts`.
- **⚠️ ESPELHO OBRIGATÓRIO:** `gerarProdutosDoLote` roda no runtime Deno e **não consegue
  importar de `api/_lib`** — por isso tem uma **cópia inline** da mesma lógica. Mexeu em um,
  mexa no outro. Está comentado nos dois arquivos.
- **Retomada de lote protegida:** como o nome agora é gravado limpo, a detecção de
  "produto já criado" passou a casar pelas DUAS formas (limpa e original). Sem isso,
  retomar um lote gerado antes desta mudança duplicaria itens no estoque.
- **Item removido do escopo (não existia):** a auditoria acusou o template pobre
  `"Produto novo. Estoque: N unidade(s)."`, mas ele **não é gravado por `gerarProdutosDoLote`**
  (que grava `item.desc`) nem existe em 400 produtos varridos no banco. Aquele texto vem dos
  **57 leilões**, de origem ainda não identificada — fica como PONTO separado.
- **2 defeitos meus, encontrados e corrigidos no teste com dados reais:**
  1. a regra de parcelamento apagava quantidade e medida legítimas
     ("Kit **4x** Parafusos" → "Kit Parafusos"; "15 **X** 15 Cm" → "15 Cm"). Agora só remove
     com contexto explícito de pagamento ("12x sem juros", "em 12x").
  2. qualquer palavra de 3 letras em maiúscula era preservada, então "KIT TAÇAS" virava
     "KIT Taças". Agora existe lista fechada de siglas reais.
- **Limitação conhecida e aceita:** a conversão de CAIXA ALTA só age em nomes com **mais de
  3 palavras** (regra do escopo). Nome curto tipo "SECADOR PROFISSIONAL 2000W" continua em
  caixa alta — comportamento conservador, de propósito.
- **Impacto no front:** nenhum código de front mudou. Nenhum registro existente foi tocado:
  os 995 defeitos do PONTO 76 continuam como estão (limpeza retroativa é outra autorização).
- **Risco:** 🟡 Médio — grava só o campo de nome, só em itens novos de importação, com
  proteção de "se piorar, devolve o original". Preço, estoque, grade, custo, depósito,
  imagem, comissão e pagamento intocados.
- **Importadores que gravam título e NÃO foram alterados** (aguardando sua autorização):
  `searchGoogleShopping`, `importFromUrl`, `extractProductData`, `analyzeImageUrlAndImport`,
  `PlanilhaImport.jsx`, `AddCatalogProduct.jsx`.

---

## 04/08/2026 — PONTO 76: DIAGNÓSTICO de qualidade de texto (nada foi alterado)

- **Natureza:** auditoria **100% leitura**. Nova função `auditarQualidadeTextos`
  (`base44/functions/auditarQualidadeTextos/entry.ts`) — não existe caminho de escrita dentro
  dela, só GET. Nenhum produto, leilão, página ou componente foi alterado.
- **Escopo:** 3.697 registros — 152 leilões (`auctions`) + 3.545 produtos (`products`).
- **Descoberta estrutural (importante para o front):** a Loja Virtual usa a tabela `products`,
  que **não tem coluna `title`** — o NOME do produto está gravado no campo `description`, e
  **não existe campo de descrição rica** nesses 3.545 registros. Por isso a auditoria trata
  esse campo como NOME (caixa alta, cortado, lixo de marketplace, duplicado) e não cobra
  "descrição curta" de um nome de produto.
- **Resultado:** saúde geral **73%** — 2.702 limpos, 995 com algum defeito.
  Sem foto 738 · Título em CAIXA ALTA 194 · Título cortado 121 · Nome duplicado 102 ·
  Lixo de marketplace 65 · Descrição curta 57 · Descrição duplicada 54 · Texto cortado 38.
- **Zero resíduo de erro de IA** em todo o site — a trava do PONTO 74 está sustentando.
- **Modos:** `resumo` (números) e `detalhado` (item a item), com filtro por tabela, status e
  tipo de defeito.
- **Ajuste durante a auditoria:** o detector de "texto cortado" marcava como defeito qualquer
  texto terminando sem ponto final, o que acusava bullets e ficha técnica legítimos (45 casos).
  Regra corrigida: item de lista e linha "Chave: valor" não contam. Ficaram 38 casos reais.
- **Risco:** 🟢 Baixo — leitura pura, sem PATCH/POST/DELETE.

---

## 04/08/2026 — PONTO 74B: descrições regeradas pela IA (22 leilões)

- **Contexto:** depois da limpeza do PONTO 74, esses leilões ficaram com a descrição
  **igual ao título** (a IA nunca tinha escrito nada). Autorizado por Gabriel em 04/08/2026.
- **O que mudou:** nova função `regerarDescricoesIA`. Alvo estrito: leilão com descrição
  **vazia ou idêntica ao título** — nada além disso entra na fila. Para cada um, a IA escreve
  2 parágrafos + 3 a 5 benefícios, proibida de inventar marca, voltagem, medida, garantia,
  preço, frete ou prazo (só o que o título permite afirmar). Padrão da função é **prévia**
  (não grava); gravação só com `modo:'aplicar'`. Se a IA falhar ou devolver texto curto/
  suspeito, o registro é **pulado** — nunca grava lixo (é o erro que o PONTO 74 corrigiu).
- **Resultado:** **22 de 22 regerados, 0 falhas** (lotes de 8), textos de ~640 a 930
  caracteres. Reauditoria: **0 alvos restantes**. Alterado só o campo `description`.
- **Arquivos:** `base44/functions/regerarDescricoesIA/entry.ts` (nova),
  `base44/functions/auditarDescricoesIA/entry.ts` (aceita `ids:'todos'` após a prévia).
- **Impacto no front:** nenhum código de front mudou — os cards e a sala de lance passam a
  exibir descrição real em vez de repetir o nome do produto.
- **Risco:** 🟢 Baixo — campo de texto de vitrine, um registro por vez, com prévia obrigatória.

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