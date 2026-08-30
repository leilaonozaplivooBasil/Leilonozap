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

## DIR-27 — Leilão no CRM conta a partir do marco (01/08/2026)

**Emitida por:** dono (30/08/2026, com print da seção Clientes): "detalhe
extremamente importante: começamos a contar de fato os leilões a partir
de agosto — o que é pra contar aqui é a partir de agosto de 2026 pra
frente, esquece antes disso".
**Data:** 30/08/2026.
**Análise (entregue no chat):** os cards de status fecham exatos (586+6+
10+2+7 = 611 = Total de Contatos; 572 leads + 37 clientes + 2 inativos =
611), mas "Leilões Arrematados: 55" contava vitória de QUALQUER época —
o próprio dono aparecia com 37 leilões (testes pré-lançamento), e isso
contaminava "Arrematantes: 11" (promoção por vitória de teste) e
"Clientes Ativos: 37" (vitória marca a pessoa como cliente — por isso 37
> 25, a soma de quem tem compra).
**Escopo autorizado:** `buildUnifiedCustomers` (fonte única do CRM):
leilão vencido só conta com `end_time >= MARCO_OFICIAL` (01/08/2026,
mesmo marco do dinheiro real) — antes disso não conta troféu, não
promove a arrematante, não vira cliente e não entra na linha do tempo;
leilão sem end_time fica fora (não dá pra provar que é pós-marco).
3 testes novos.
**Fora do escopo / proibido:** valor de leilão (já vem só da venda
kind='arremate' paga, DIR-24); tabela auctions em outras telas.
**Regras fixas (permanente):** LEILÃO NO CRM = 01/08/2026 EM DIANTE.
**Status:** EM VIGOR — corrigido; testes 534/534, build ok; aguarda
conferência no Preview.

---

## DIR-26 — Ticket médio unificado: a meta de R$ 252 é POR COMPRADOR

**Emitida por:** dono (30/08/2026, com prints): "confere as informações de
ticket médio no CRM — um tá falando uma coisa e outro outra coisa; acho
que o certo é 272, não é?".
**Data:** 30/08/2026.
**Diagnóstico (conferido no código, explicado no chat):** os dois cards
mediam coisas DIFERENTES — Dashboard da Diretoria: R$ 118,65 = mercadoria
real do mês ÷ 31 PEDIDOS (por pedido); Espelho: R$ 272,18 = (depósitos
R$ 3.600 + compras R$ 3.476,80, desde 01/08) ÷ 26 COMPRADORES (cópia
proposital do Painel de Alavancagem — soma depósito e não é mensal).
Nenhum dos dois compara certo com a meta de R$ 252 do Resumo Executivo,
que é gasto POR COMPRADOR/mês (é como o documento constrói os R$ 4M:
compradores × R$ 252).
**Escopo autorizado:** KPI ticket_medio do Dashboard da Diretoria passa a
ser mercadoria real do mês ÷ COMPRADORES ÚNICOS do mês; rótulo vira
"Ticket médio por comprador (mês)"; tooltip explica a diferença pro
número do Espelho. O Espelho NÃO muda (regra do dono: cópia célula a
célula do Painel de Alavancagem). Teste atualizado.
**Fora do escopo / proibido:** Espelho do Painel de Alavancagem; critério
de dinheiro real.
**Regras fixas:** nenhuma além da DIR-5 a DIR-25.
**Status:** EM VIGOR — corrigido; aguarda conferência no Preview.

---

## DIR-25 — Cadastro manual do CRM: interesses com produtos, planos de parceiro e licenças (valores editáveis)

**Emitida por:** dono (30/08/2026, com print do modal Novo Cliente):
"organize a parte de cadastro manual: todos os produtos precisam estar
aparecendo, os planos de parceiro de compra e valores editáveis de
investimentos e as licenças, e algumas coisas que você acredite que
precisa colocar — faça a análise e edite".
**Data:** 30/08/2026.
**Análise (entregue no chat):** produtos de interesse só apareciam
digitando (lista vazia por padrão) e o filtro escondia produto sem
estoque; não existia interesse em plano de parceiro nem em licença; sem
vendedor responsável nem follow-up no ato do cadastro; campos soltos sem
agrupamento; os planos de parceiro viviam hardcoded só em
PartnerPlanActivation.jsx.
**Escopo autorizado:**
1. `src/lib/planosParceiro.js` — fonte ÚNICA dos planos de parceiro de
   compra (Visionário R$ 5.000 / Sócios de Ouro R$ 15.000 / Elite
   R$ 30.000 / Personalizado, 3%/60 meses), importada por
   PartnerPlanActivation e pelo CRM. Teste próprio.
2. Modal Novo Cliente reorganizado em seções (Dados / Endereço /
   Acompanhamento / Interesses / Observações) com: vendedor responsável
   (assigned_seller), "voltar a falar em" (follow_up_date) e próximo
   passo (next_steps) — colunas já existentes, sem migração.
3. Seção Interesses com 3 grupos: PRODUTOS (catálogo inteiro visível por
   padrão, busca só refina, badge de estoque — produto sem estoque
   aparece marcado, não some); PLANOS DE PARCEIRO e LICENÇAS (escada
   oficial) selecionáveis com VALOR DE INVESTIMENTO EDITÁVEL pré-
   preenchido com o preço de tabela. Tudo gravado em interested_products
   (JSONB, itens tipados — formato antigo continua lendo) e o TOTAL
   ESTIMADO somado em purchase_value.
**Fora do escopo / proibido:** regra de ativação de plano (o cadastro
registra INTERESSE, não ativa nada); critério de dinheiro real; escada e
baldes oficiais (só leitura).
**Regras fixas:** nenhuma além da DIR-5 a DIR-24.
**Status:** EM VIGOR — autorizada pelo dono ("faça a análise e edite").

---

## DIR-24 — CRM de mercado: números confiáveis, acesso escopado, visual em seções, ação e funil

**Emitida por:** dono (30/08/2026): pediu análise sênior de TODO o CRM
(visual, entendimento, cadastro, escopo por pessoa, "que não perca pra
nenhum CRM do mercado"); a análise foi entregue no chat com 5 fases em
ordem de prioridade e ele autorizou: "SIGO SUA RECOMENDAÇÃO, PODE FAZER,
CAPRICHE E MELHORE O VISUAL TAMBÉM".
**Data:** 30/08/2026.
**Achados que motivaram (conferidos no código):** o CRM escopado por rede
existe mas está trancado (`if (!isAdmin)` — licenciado clica CRM e recebe
"sem acesso"); "Gasto Total" por cliente soma depósito/adesão/aporte
(dinheiro duplicado) e arremate NÃO PAGO (current_price da tabela
auctions sem checar pagamento); clientes manuais (`Customer.list(500)`) e
negociações (`Negotiation.list(200)`) carregam SEM escopo de rede;
convidado recorrente não incrementa contador nem linha do tempo; cliente
manual que também é usuário some do CRM levando notas/vendedor junto
(dedupe descarta em vez de fundir).
**Escopo autorizado (5 fases, nesta ordem):**
1. **Números confiáveis** (`crmUnifiedCustomers.js`): gasto do cliente só
   com mercadoria (loja/produto/arremate; kind legado sem valor conta —
   dado antigo); depósito/adesão/aporte fora do gasto; arremate só pago;
   valor de leilão vem da venda kind='arremate' (fonte única), tabela
   auctions só pra contagem/linha do tempo; convidado recorrente soma
   certo; manual duplicado FUNDE (notas, vendedor, follow-up) na linha
   automática em vez de sumir. Escopo de Customer/Negotiation por
   `created_by_id`/clientes visíveis; carimbo de `created_by_id` no
   cadastro. Testes.
2. **Abrir o CRM escopado**: destrancar o gate — todo usuário da Central
   de Vendas vê o CRM DA PRÓPRIA REDE (árvore de indicação já
   implementada); admin/super_admin seguem com visão total; cards de
   empresa (estoque, metas, dashboard, escada) continuam só na visão
   total. (Escopo por ESTRUTURA EXECUTIVA continua sendo a Fase 2 da
   DIR-22 — pendência mantida.)
3. **Visual em seções**: sub-navegação interna (Visão Executiva /
   Clientes / Expansão) + faixa de resumo com 4 números sempre visível +
   ritmo diário do mês contra a meta + tabela vira cartões no celular +
   rótulos de período nos cards.
4. **Ação**: painel "Quem contatar hoje" (pedido gerado e não pago,
   depósito sem compra, arremate não pago, sumido 30d, follow-up vencido)
   com botão WhatsApp e mensagem pronta por motivo; anotações + data de
   retorno em QUALQUER cliente (upsert na tabela customers via
   e-mail/telefone — colunas notes/follow_up_date/next_steps já existem,
   sem migração).
5. **Luxo de mercado**: funil kanban por status de compra, ordenação e
   paginação na tabela, busca por CPF, export CSV, aviso de duplicado no
   cadastro, `alert()` → toast (sonner, já montado no app).
**Fora do escopo / proibido:** regra de reconhecimento de receita
(DIR-7); critério oficial de dinheiro real (dinheiroReal.js — os cards
grandes NÃO mudam); ordem dos baldes da captação; migração de banco.
**Regras fixas:** nenhuma além da DIR-5 a DIR-23.
**Status:** EM VIGOR — 5 fases implementadas; testes 531/531, build ok;
aguarda conferência do dono no Preview.

---

## DIR-23 — Metas internas oficiais no CRM: Meta Central R$ 5 milhões, Dashboard da Diretoria e Escada de Licenças

**Emitida por:** dono (30/08/2026). Enviou dois materiais oficiais — o
RESUMO EXECUTIVO INTEGRADO (metas internas: R$ 5M/mês de vendas até
março/2027 = R$ 4M online + R$ 1M física; Seção 37 = os 12 números que a
diretoria olha todo dia, com a regra "separar Dado realizado / Premissa /
Projeção") e a APRESENTAÇÃO OFICIAL (o plano de licenças, de Influenciador
grátis a Distribuidor R$ 4 milhões, com preço e comissão de cada degrau) —
e pediu: "analise os dois e veja o que incluir para ficar bem sênior nosso
CRM, baseado nas vendas das Lojas e Leilões e nossas metas internas". A
análise foi entregue no chat e ele autorizou: "PODE FAZER, ACRESCENTE,
DEIXE SÊNIOR, CAPRICHE".
**Data:** 30/08/2026.
**Escopo autorizado:**
1. `src/lib/metaCentral.js` — regra pura da Meta Central de VENDAS
   (R$ 5.000.000/mês = R$ 4M online + R$ 1M física, alvo março/2027):
   trilho Online alimentado por dado real do mês (compras brutas da Loja
   Virtual + arremates de leilão, critério oficial `dinheiroReal`); trilho
   Física SEM FONTE no sistema hoje — aparece marcado como tal, nunca com
   número inventado. Teste próprio.
2. `src/lib/dashboardDiretoria.js` — os 12 números da Seção 37, cada um
   com Realizado × Meta e etiqueta de governança (Dado / Aproximação /
   Sem fonte): calculáveis hoje = novos usuários/dia, ticket médio do mês,
   venda online, faturamento total (só online), conversão digital (mesma
   fórmula do Painel de Alavancagem), K-Factor aproximado (indicações da
   árvore `referred_by_id`), usuários ativos aproximado (atividade
   financeira real em 30d — não existe rastro de login no sistema); sem
   fonte = visitantes/cadastros do Ranking, venda física, custo de
   aquisição, ROI operacional. Teste próprio.
3. `src/lib/escadaLicencas.js` — a escada OFICIAL de licenças da
   apresentação (Influenciador grátis 5% → Vendedor R$ 1.497/10% →
   Licenciado R$ 5.000/13% → Parceiro R$ 20.000/15% → Ponto de Retirada
   R$ 50.000/16% → Loja Física R$ 350.000/19% → Distribuidor
   R$ 4.000.000/20%), com quem cadastra quem, e o cruzamento com as vendas
   reais: N vendidos × preço de tabela vs valor realmente captado
   (divergência aparece — sinal de desconto ou inconsistência). Teste
   próprio.
4. Três painéis novos no CRM, visíveis SÓ para visão total
   (admin/super_admin — metas da empresa não vazam pra escopo de rede):
   `CrmMetaCentral.jsx`, `CrmDashboardDiretoria.jsx`,
   `CrmEscadaLicencas.jsx`.
**Premissas registradas (aguardando martelo do dono):** "usuário ativo" ≈
atividade financeira real nos últimos 30 dias (não há rastro de login);
venda física fica sem fonte até existir lançamento no sistema.
**Fora do escopo / proibido:** projeções de território da apresentação
(R$ 12M/mês do Recreio etc.) — material de VENDA de licença, não métrica
de operação; regra de reconhecimento de receita (DIR-7); reordenar os
baldes da captação (ordem oficial do dono, DIR-22).
**Regras fixas:** nenhuma além da DIR-5 a DIR-22.
**Status:** EM VIGOR — autorizada pelo dono ("PODE FAZER... CAPRICHE").

---

## DIR-22 — Gestão de Parceiros de Compra no CRM + meta de captação R$ 1 milhão

**Emitida por:** dono, em duas mensagens (30/08/2026): pediu análise sênior
do CRM pra incluir a gestão de Parceiros de Compra ("hoje a nossa principal
operação, meta de um milhão"), com acesso por estrutura (executivo/diretor
veem a própria estrutura; visão geral só super_admin e administrativos); e
definiu a régua da meta: "tudo que entrar de aporte de parceiro de compra
(que é como se fosse investimento) e vendas de franquias (não estamos no
sistema de franchise, é analogia)", na ordem: Aportes Parceiro de Compra,
Vendas de Vendedores, Licenciados, Loja Física, Ponto de Retirada, Parceiro
e Distribuidor.
**Data:** 30/08/2026.
**Escopo autorizado (Fase 1 desta rodada):**
1. `src/lib/captacaoParceiros.js` — regra pura da meta (R$ 1.000.000):
   baldes na ordem oficial do dono; conta venda REAL (critério
   `dinheiroReal`) de `partner_plan`/`seller_adhesion`/`adesao`
   (classificada pelo cargo em `adesao_level`/`product_title`) + ativação
   MANUAL de plano de parceiro (`partner_plan_purchases`,
   `activation_source='manual'`). Anti-dupla-contagem: ativação automática
   (`lucre_conosco`) NÃO soma — nasce da própria venda, que já contou.
   Balde residual "Outras adesões" pra cargo não reconhecido (nada some em
   silêncio). Teste próprio (9 casos).
2. Painel "Parceiros de Compra — Meta R$ 1.000.000" no CRM
   (`CrmParceirosCompra.jsx`): barra de progresso, baldes na ordem
   oficial, e a lista de parceiros (plano, valor, aportes pagos, data,
   origem da ativação) — tudo no MESMO escopo do resto do CRM.
3. Visão total estendida aos ADMINISTRATIVOS: o bypass de rede que era só
   `super_admin` passa a incluir `admin` (frase literal do dono: "só quem
   tem a visão geral é o super adm e os administrativos").
**Fases seguintes (registradas, ainda não executadas):** Fase 2 — abrir o
CRM pra executivo/diretor/diretor operacional com escopo pela ESTRUTURA
EXECUTIVA (fonte única `resolveExecutivo`/carteira `executive_owner`, que
vence a árvore de indicação); Fase 3 — clicabilidade (cards→filtros, links
no modal, WhatsApp); Fase 4 — perfil enriquecido (depósitos, saldo,
contratos, estrutura, export).
**Fora do escopo / proibido:** regra de reconhecimento de receita (DIR-7);
histórico legado de adesão (pendência DIR-13 continua).
**Regras fixas:** nenhuma além da DIR-5 a DIR-21.
**Status:** EM VIGOR — Fase 1 implementada; testes 475/475, build ok;
aguarda conferência do dono no Preview.

---

## DIR-21 — Volume em Negociação real + Faturamento Bruto no CRM

**Emitida por:** dono, decisão direta de negócio (30/08/2026): (1) "Volume
em Negociação: mude para pessoas que chegam no carrinho e não compram
ainda, ou fizeram pedidos e desistiram, e também insira pedidos cancelados
pela instituição e pagamento — precisa inserir esses dois"; (2) "o
Faturamento de 1.638,08 está errado — esse valor é o valor comprado na
Loja Virtual, que é de fato o faturamento bruto".
**Data:** 30/08/2026.
**Escopo autorizado:**
1. "Volume em Negociação" = pedidos de Loja gerados e não pagos
   (`pending_payment` — não existe carrinho persistido no servidor; o
   pedido pendente é o rastro real de "chegou no carrinho e desistiu") +
   pedidos cancelados/estornados + negociações manuais em andamento, tudo
   pós-marco (01/08). Tooltip mostra a composição das três parcelas.
2. Card do super_admin renomeado "Faturamento Bruto (Loja Virtual)" =
   `comprasBrutas` (valor cheio das compras pagas e confirmadas, critério
   oficial de dinheiro real). **A regra da DIR-7 NÃO muda:** a comissão
   continua sendo a receita da empresa em `financial_income`, base do
   Financeiro e do imposto — só o card do CRM passa a mostrar o bruto, por
   decisão expressa do dono. `financial_income` deixou de ser carregado no
   CRM (não é mais usado nele).
**Fora do escopo / proibido:** regra de reconhecimento de receita (DIR-7),
`financial_income`, módulo Financeiro, visão de rede (Volume Transacionado
continua igual).
**Regras fixas:** nenhuma além da DIR-5 a DIR-20.
**Status:** EM VIGOR — código, testes (466/466) e build passam; aguarda
conferência do dono no Preview e autorização pra publicar o pacote
DIR-18 a 21.

---

## DIR-20 — Estoque cristalino: número único validado no banco

**Emitida por:** dono ("vamos fazer uma análise extremamente diligente na
Gestão de Produtos, os números não estão batendo, preciso deixar isso
cristalino"), com diagnóstico fechado por 4 consultas diretas dele ao banco.
**Data:** 30/08/2026.
**Objetivo:** três telas mostravam três "valores de estoque" diferentes
(CRM R$ 9.309 / Gestão R$ 29.951 / real R$ 28.133) porque cada uma usava
população e fórmula próprias. Números validados direto no banco:
- Investido histórico em todos os lotes: R$ 108.232,54.
- Parado em estoque AGORA (fatia não vendida, contando estoque físico da
  grade): **R$ 28.133,45** — este é o número oficial.
- 184 produtos com `quantity = 0` mas estoque físico real nas colunas de
  grade (Perfeito/Bom/Oficina/Ruim, que não são baixadas na venda) —
  invisíveis pra qualquer conta baseada só em `quantity`.
- "Receita Potencial R$ 5,08 milhões" da Gestão: 95% vem de UM produto com
  preço podre (Mini Localizador GPS a R$ 12.226,61/un × 394 — o valor
  gravado é o preço do LOTE; o unitário real é R$ 31,03).
**Escopo autorizado:**
1. `custoProduto.js` (cliente + espelho servidor) ganha `unidadesFisicas`/
   `unidadesEmEstoque` (= max(quantity, grade − vendidas)) e `custoUnitario`
   passa a usar o estoque real — fórmula idêntica à validada no banco.
2. CRM: "Valor Investido em Estoque" soma o GALPÃO INTEIRO (todos os
   produtos, não só os 302 do catálogo); card "Produtos em Estoque"
   renomeado "Produtos no Catálogo"; tooltips explicando as definições.
3. Gestão de Estoque: "Capital em Estoque" vira o custo parado AGORA
   (mesma conta do CRM — antes era soma histórica dos lotes exibidos);
   "Saldo em Estoque"/"Total de Unidades" contam o estoque físico da grade.
4. Consignado (`createConsignacao`) herda o estoque físico no cálculo do
   custo unitário (select ganhou as colunas de grade).
5. Testes novos (caso real da bicicleta VIX e da POLITRIZ esgotada).
**Fora do escopo / proibido (dados, só o dono corrige):** o preço podre do
Mini Localizador (SQL de correção entregue no chat) e os 15 produtos sem
custo (lista já entregue) — dados de negócio, nunca inventados pelo código.
**Regras fixas:** nenhuma além da DIR-5 a DIR-19.
**Status:** EM VIGOR — código, testes (460/460, 3 novos) e build passam;
aguarda conferência do dono no Preview e autorização pra publicar o pacote
DIR-18+19+20.

---

## DIR-19 — Acerto do consignado por unidade, regra de mercado

**Emitida por:** dono, decisão direta depois do achado da DIR-18 ("deixe
igual é no mercado, de maneira sênior, e atualiza o nosso documento
oficial").
**Data:** 30/08/2026.
**Objetivo:** `createConsignacao.js` usava `cost_price` cru (custo do LOTE
inteiro) como valor de acerto de UMA peça consignada — lojista debitado
pelo lote inteiro por cada peça vendida (POLITRIZ: R$ 2.296 em vez de
R$ 255). Corrigir pela regra padrão do mercado de consignação: acerto POR
UNIDADE, na ordem atacado (`selling_price_wholesale`) → custo unitário da
casa → preço de catálogo como último recurso (nunca sai de graça).
**Escopo autorizado:** `api/_lib/custoProduto.js` (espelho servidor da
DIR-18 + `acertoConsignadoUnitario`); `createConsignacao.js` usa a regra
nova; seção **6-D** nova no `DOCUMENTO-OFICIAL-PLANO-CARREIRA.md`
registrando a regra oficial; teste `tests/acertoConsignado.test.mjs`.
**Fora do escopo / proibido:** o motor de liquidação (`consignadoSettle.js`)
e a aprovação (`manageConsignacao.js`) não mudam — eles só repassam o
`custo_unitario` gravado no pedido, que agora nasce certo. Consignações JÁ
criadas com valor inflado (se existirem) não foram tocadas — precisa
conferir no banco antes (consulta entregue ao dono no chat).
**Regras fixas:** nenhuma além da DIR-5 a DIR-18.
**Status:** EM VIGOR — código, testes (457/457, 6 novos) e build passam;
aguarda conferência do dono e autorização pra publicar junto com a DIR-18.

---

## DIR-18 — cost_price interpretado de duas formas contraditórias + produtos sem custo

**Emitida por:** dono, depois de ver "Custo do produto: R$ 0,00" no painel de
lucro diário e afirmar a regra de negócio: "eu JAMAIS posso ter o custo do
produto zerado — a importação da planilha já traz o CUSTO TOTAL". Diagnóstico
confirmado com consultas diretas dele ao banco: 15 dos 302 produtos ativos
sem custo nenhum, e produtos com custo de lote sendo tratado como unitário.
**Data:** 30/08/2026.
**Objetivo:** o campo `products.cost_price` é, por semântica oficial (planilha
de importação, `bulkImportProducts.js`, `RegisterBatches.jsx`), o custo TOTAL
do lote. A maior parte do sistema sempre tratou certo (divide pelas unidades
pra achar o unitário), mas 6 telas multiplicavam pela quantidade como se
fosse unitário — origem do "Valor Investido em Estoque: R$ 50 milhões"
(impossível: o valor de VENDA do mesmo estoque era R$ 4,9 milhões). Além
disso, 15 produtos entraram sem custo pelos formulários manuais (a planilha
sempre traz), zerando o "Custo do produto" no painel de lucro e inflando a
margem.
**Escopo autorizado:**
1. Regra única em `src/lib/custoProduto.js` (`custoUnitario`,
   `custoEstoqueRestante`), com teste próprio calibrado com dados reais de
   produção.
2. Correção das 6 leituras erradas: `CrmClientesTab.jsx` (valorEstoque),
   `BalancoGeralTab.jsx` e `RentabilidadeOperacao.jsx` (valor investido =
   soma dos custos de lote, sem multiplicar), `DailyReportView.jsx` e
   `DailyReportPDF.jsx` (custo da venda = unitário × qtd vendida),
   `PainelLucroDiario.jsx` (passa a reusar a lib, mesma conta).
3. Correção de escrita: `gerarProdutosDoLote.js` gravava o custo UNITÁRIO
   em registro com qtd > 1 — passa a gravar unitário × qtd (custo do lote),
   consistente com a planilha.
4. Trava "jamais custo zerado" nos formulários de cadastro manual
   (`CreateCatalogProduct.jsx`, `AddCatalogProduct.jsx`): salvar sem custo
   > 0 é recusado com mensagem clara.
**Fora do escopo / proibido (flagged, NÃO corrigido — mexe em dinheiro,
precisa de diretiva própria):** `api/functions/createConsignacao.js:97` usa
`cost_price` (custo do LOTE) como `custo_unitario` da peça consignada — num
lote multi-unidade, o lojista consignado é debitado pelo lote inteiro por
CADA peça. Bug real de cobrança; não foi tocado nesta rodada porque altera
fluxo de dinheiro e o valor certo a cobrar é decisão do dono.
Os 15 produtos sem custo também NÃO foram preenchidos — os valores reais só
o dono tem (planilha de origem); a lista exata já foi entregue no chat.
**Regras fixas:** nenhuma além da DIR-5 a DIR-17.
**Status:** EM VIGOR — código, testes (451/451, 8 novos) e build passam;
falta o dono conferir no Preview (Valor Investido em Estoque deve cair dos
R$ 50 milhões pra um valor realista) e autorizar a publicação.

---

## DIR-17 — Painel de Alavancagem somava um subconjunto arbitrário de 1000 vendas

**Emitida por:** Claude, via achado técnico — dono comparou os dois painéis
de novo ("Valor total gerado" R$ 6.173,80 no Painel vs R$ 7.076,80 no
espelho do CRM, 25 vs 26 compradores) e exigiu análise sênior por escrito:
"encontre o certo e corrija onde está errado, eu preciso saber em qual
acreditar".
**Data:** 30/08/2026.
**Objetivo:** `NetworkOverview.jsx:571` buscava as vendas com
`CatalogSale.list()` — sem ordenação e sem limite. O adapter então ordena
só por `id` (uuid aleatório, não cronológico) e o Supabase corta a
resposta em 1000 linhas por padrão. Com `catalog_sales` acima de 1000
registros, o Painel somava um SUBCONJUNTO ARBITRÁRIO de 1000 vendas —
compras reais ficavam de fora sem aviso (medido: R$ 903,00 e 1 comprador
a menos que o CRM lendo o MESMO banco). O certo é o CRM (busca
`'-created_date'` com limite explícito: a janela sempre contém as vendas
mais recentes, então toda venda pós-marco entra).
**Escopo autorizado:** `NetworkOverview.jsx` passa a buscar
`CatalogSale.list('-created_date', 5000)`; `CrmClientesTab.jsx` alinhado
aos mesmos parâmetros (2000 → 5000) — telas que somam o mesmo dinheiro
leem as mesmas linhas.
**Fora do escopo / proibido:** qualquer mudança de fórmula/critério (o
`dinheiroReal.js` da DIR-15 fica intacto); a diferença R$ 201,24 entre
"Volume Financeiro Total" e o espelho é INTENCIONAL (leilão, documentada
no tooltip) e não foi tocada.
**Regras fixas:** nenhuma além da DIR-5 a DIR-16.
**Status:** EM VIGOR — código, testes (443/443) e build passam; falta o
dono confirmar no Preview que os dois painéis agora mostram o mesmo
número.

---

## DIR-16 — Espelho do Painel de Alavancagem dentro do CRM

**Emitida por:** dono, pedido direto: "insira exatamente as informações que
tem lá [Painel de Alavancagem], aqui [no CRM], não invente, vamos
organizar de forma sênior".
**Data:** 30/08/2026.
**Objetivo:** depois de confirmar com dado real que os dois painéis batiam
(mesmo critério, `src/lib/dinheiroReal.js`, DIR-15), o dono quis ver os
MESMOS rótulos e a MESMA fórmula do Painel de Alavancagem dentro do CRM,
lado a lado com os cards já existentes — não outra métrica inventada, uma
cópia fiel.
**Escopo autorizado:**
1. Novo bloco "Espelho do Painel de Alavancagem" em `CrmClientesTab.jsx`/
   `CrmStatsCards.jsx`, com os MESMOS 8 números de `NetworkOverview.jsx`
   (Total na base, Novos 30 dias, Compradores únicos, Conversão geral,
   Compraram nos últimos 30 dias, Depósitos, Valor total gerado, Ticket
   médio/comprador) — fórmula copiada literalmente de
   `fetchFinanceStats`/`conversion`, só trocando a base de dados (rede do
   dono → rede/plataforma de quem olha o CRM). "Valor total gerado" aqui é
   só depósito + compra de Loja, sem leilão, pra ser comparável célula a
   célula com o Painel de Alavancagem (diferente do "Volume Financeiro
   Total" da DIR-14, que inclui leilão de propósito).
2. **Achado à parte, corrigido junto:** o dono reportou "Valor Investido em
   Estoque: R$ 50.485,429" (3 casas decimais, formato errado). Causa:
   `fmtBRL` usava `toLocaleString` só com `minimumFractionDigits: 2`, sem
   `maximumFractionDigits` — o padrão do JS nesse caso é até 3 casas, e
   imprecisão de ponto flutuante (soma de `cost_price × quantity` linha a
   linha) empurrava pra 3ª casa. Corrigido com `maximumFractionDigits: 2`
   explícito.
**Fora do escopo / proibido:** mudar a regra de reconhecimento de receita;
mudar `financial_income`/`finalizeAuctionCore.js`; mudar o "Volume
Financeiro Total" já existente (fica como está, ao lado do espelho novo).
**Regras fixas:** nenhuma além da DIR-5 a DIR-15.
**Status:** EM VIGOR — código, testes (443/443) e build passam. Falta o
dono conferir visualmente no Preview/produção depois do deploy — os 8
números do espelho devem bater exatamente com o que aparece no Painel de
Alavancagem (ajustado pela diferença de escopo, se o dono não for
super_admin).

---

## Estado agora

CRM e Financeiro têm a lógica, os dados e a leitura (RLS) corretos.
"Faturamento Total" = R$ 1.367,17 (comissão de Loja Virtual + Leilão),
confirmado direto no banco. "Volume Financeiro Total" (depósito + venda
bruta de Loja/PDV/Leilão) e o novo "Espelho do Painel de Alavancagem"
(DIR-16) usam o MESMO critério de "dinheiro real" que o Painel de
Alavancagem (`src/lib/dinheiroReal.js`, DIR-15) — as telas não podem mais
divergir, porque é literalmente a mesma função. Falta o dono conferir
visualmente no Preview/produção depois do deploy.

**Achado crítico de infraestrutura, fora do escopo de código, aguardando o
dono (ver `REL-11`):** o deploy automático de migração
(`.github/workflows/deploy-migrations.yml`) nunca funcionou — 9
execuções, 9 falhas, `supabase db push` nunca rodou uma vez na história do
repositório. Causa atual: o segredo `SUPABASE_ACCESS_TOKEN` no GitHub está
com formato inválido. Enquanto isso não for corrigido, toda migration
nova precisa ser conferida e, se faltar, colada manualmente no SQL Editor
do Supabase (ver `supabase/migrations/LEIA-ME.md` pra saber como conferir).
Passo pro dono corrigir de vez: gerar um token novo em
`supabase.com/dashboard/account/tokens` (formato `sbp_...`) e atualizar o
segredo em `Settings → Secrets and variables → Actions` do repositório.

**Efeito colateral da DIR-13 a observar:** o dropdown manual de
`CatalogOrdersAdmin.jsx` que deixava o admin marcar um pedido "Aguardando
Pagamento" como "Pago" na mão agora é recusado (mensagem explicando o
porquê). Se esse botão for realmente necessário pra confirmar pagamento
fora do sistema (ex.: transferência bancária manual), isso precisa de uma
diretiva própria pra construir uma rota nova que calcule comissão e
registre receita — não só destravar o PATCH de novo.

Pendências ainda abertas, sem diretiva própria no momento:
- `REL-2`: confirmação do 401 na Edge Function `preview-api`, do lado da
  OpenAI.
- Fase 3 do Financeiro (conciliação automática, decisão sobre Open
  Finance).
- Fase 2 do CRM (persistência automática em `customers`, unificação de
  "Vendedor").
- Migration `20260828_financial_expenses_payment_account.sql` (de outra
  frente, não desta sessão) — status em produção não confirmado; mesmo
  risco do pipeline quebrado pode se aplicar a ela também.
- **Backfill histórico de adesão/seller_adhesion legado** (achado na
  DIR-13): receita real de adesão de vendedor e plano parceiro anterior a
  ~21-28/08/2026 mora em tabelas com semântica diferente
  (`partner_plan_purchases`, `contrato_assinaturas`, saldo de vendedor do
  Base44) — recuperar isso não é um backfill simples, é decisão de
  negócio se vale o esforço de "traduzir" esse histórico.

**Nenhuma implementação nova começa até uma diretiva nova ser registrada
aqui,** no formato de `docs/PADRAO_DIRETIVAS.md`.
