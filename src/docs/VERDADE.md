# 🛡️ VERDADE.md — DOCUMENTO SOBERANO DO LEILÃO NOZAP

> **Criado em:** 04/08/2026 · **Autorizado por:** Gabriel (dono do produto)
> **Status:** SOBERANO · PERMANENTE · VENCE TODOS OS OUTROS DOCUMENTOS

---

## ⚠️ LEIA ANTES DE QUALQUER COISA

Este arquivo existe porque **um ano de testes deixou lixo, resíduo e documentação
contraditória no projeto** — e documentação contraditória faz a IA técnica (e qualquer
dev novo) acreditar na informação errada, perder tempo e, no pior caso, mexer em dinheiro
real com base numa premissa falsa.

**A partir de agora existe UM documento que manda. É este.**

Se qualquer outro arquivo, comentário de código, print, mensagem de chat ou memória
disser algo diferente do que está escrito aqui → **este documento vence.**

---

## 1. HIERARQUIA DE AUTORIDADE

Ordem de obediência. **Em caso de conflito, obedecer o de MENOR número** e **apontar a
divergência ao dono ANTES de agir.**

| # | Documento | Autoridade |
|---|---|---|
| **1º** | **`docs/VERDADE.md`** (este arquivo) | 👑 **SOBERANO.** Vence TODOS, sem exceção |
| 2º | `docs/DOCUMENTO-OFICIAL-PLANO-CARREIRA.md` | Autoridade **exclusiva** em comissão, percentual e hierarquia de cargos |
| 3º | `CONTRATO.md` | Mapa técnico: onde ficam os dados, como o front chama o backend, índice de funções |
| 4º | `MUDANCAS.md` | 📖 **Diário histórico. NÃO É REGRA.** Registra o que foi feito, não o que vale hoje |
| 5º | Qualquer outro `.md`, comentário, print ou conversa | 🗄️ **HISTÓRICO.** Não vale como regra |

### 🚨 Instrução direta à IA técnica

1. **Antes de tocar em código financeiro, ler este documento.**
2. Achou conflito entre dois documentos? **Não escolha sozinho.** Obedeça o de menor
   número **e avise o dono** que existe divergência.
3. `MUDANCAS.md` conta a **história**, não define a **regra**. Um registro de 03/08 pode
   ter sido substituído por outro de 04/08. **Nunca extraia regra do diário.**
4. Comentário dentro de arquivo de código **não é fonte de verdade** — pode estar velho.
   Vale para orientar a leitura, nunca para decidir.

---

## 2. O QUE É O BANCO REAL

### 🏦 Supabase é a ÚNICA fonte de dados de produção.

- **Projeto:** `gezvviyegtxytnwjkrjv` (região `sa-east-1`)
- **URL:** `https://gezvviyegtxytnwjkrjv.supabase.co`
- Secrets: `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`

### ⛔ O store interno do Base44 NÃO é produção.

`base44.asServiceRole.entities.X` aponta para o **banco interno do Base44**, resíduo da
era anterior à migração. **Não tem os dados reais.** Uma função financeira que usa isso
não está "com bug" — está **falando com o banco errado** e vai parecer inerte, ou pior,
vai gravar num lugar que ninguém lê.

### ✅ REGRA PERMANENTE

> **Função de produção (dinheiro, saldo, comissão, pedido, estoque) fala com o Supabase
> via REST + `service_role`.** Se a função usa `asServiceRole.entities`, ela está no
> banco errado — isso é um DEFEITO, não uma escolha de estilo.

**Como identificar rápido:**

| Padrão no código | Veredito |
|---|---|
| `fetch` em `.../rest/v1/...` com `apikey: SERVICE_ROLE` | ✅ **banco real** |
| `base44.asServiceRole.entities.X` | ⛔ **banco interno — não é produção** |
| `base44.entities.X` no **front** | ✅ ok — passa pelo `base44Adapter.js`, que roteia pro Supabase |

### Tabelas reais que valem

`app_users` · `catalog_sales` · `auctions` · `auction_messages` · `commission_records` ·
`products` · `lotes_recebidos` · `asaas_payments` · `digital_wallet_transactions` ·
`melhor_envio_tokens` · `passaporte_coupons` · `system_logs` · `stores` · `sellers` ·
`categories` · `banner_images` · `customers` · `financial_expenses`

⚠️ O mapa completo entidade → tabela está no `TABLE_MAP`, no topo de
`src/api/base44Adapter.js`. **Esse mapa é a referência técnica; este documento é a
referência de autoridade.**

---

## 3. VERDADES OPERACIONAIS JÁ VALIDADAS

Regras confirmadas pelo dono, verificadas contra o banco real, e **consolidadas aqui**
porque antes viviam espalhadas em comentários de código e no diário de mudanças.

### 💰 Comissão

1. **Comissão SÓ em venda confirmada de PRODUTO.**
   Depósito de carteira, crédito de Passaporte, frete, adesão de Vendedor e plano de
   expansão **NÃO comissionam** — mesmo morando na mesma tabela (`catalog_sales`).
2. **FRETE NUNCA COMISSIONA.** Em nenhum fluxo, nunca, em lugar nenhum.
   A base de comissão é sempre **só o valor do produto**.
3. **Loja Virtual: 30% = 20% cadeia telescópica + 10% topo institucional.**
4. **Leilão: 5%, venda direta, UMA pessoa** (quem indicou o arrematante), **paga no
   martelo**. **Sem cadeia, sem telescópio, sem pool de topo, sem executivo.** O restante
   fica integralmente com a empresa.
   → Detalhe completo: seção **6-A** do `DOCUMENTO-OFICIAL-PLANO-CARREIRA.md`.
5. **Por que o leilão paga no martelo (e está CORRETO):** o arrematante deposita antes e
   o valor é reservado no lance. Quando o martelo bate, **o dinheiro já está no caixa** —
   o martelo **já é o pagamento**.
   ⛔ **NÃO mover esse gatilho para o fluxo de pagamento.** Decisão explícita do dono.

### 🔨 Leilão

6. **`winner_id` em leilão com status `active` = LÍDER ATUAL, não vencedor final.**
   **NÃO É BUG.** O `submitAtomicBid` grava o líder a cada lance vencedor, e o vencedor
   definitivo é **reapurado no encerramento** pelo `finalizeAuctionCore`, sempre pelo
   maior lance realmente gravado.

### 🔍 Método de investigação

7. **"Fila vazia" ≠ "banco limpo".** A fila de uma função só enxerga o que os filtros
   dela alcançam. **Sempre conferir contra a TABELA**, nunca contra o alvo da própria
   função. (Foi assim que eu declarei "0 produtos sem descrição" quando havia 313.)
8. **`/api/functions/*` NÃO executa no ambiente de preview.** Alteração nesses arquivos
   é validada **por releitura**, não por execução — e isso **tem de ser declarado na
   entrega**, sempre, com a instrução do teste real em produção.
9. **A regra do executivo está ESPELHADA em dois runtimes** (Node/Vercel em
   `api/_lib/resolveExecutivo.js` e Deno em `acertarComissaoVenda`), que **não
   compartilham import**. **Mudou uma, mude a outra — sempre.**

---

## 4. ⛔ TABELA "NÃO ACREDITE NISSO"

Armadilhas que **já enganaram a IA técnica neste projeto**, com a lição de cada uma.
Ler esta tabela evita repetir erro que já custou horas.

| Armadilha | O que aconteceu de verdade | ✅ Lição permanente |
|---|---|---|
| **Função de diagnóstico com veredito escrito à mão** | `diagnosticoLanceFalha` devolvia `"frete_amount NÃO EXISTE"` como **string fixa no código** — nunca consultou o banco. Depois de a coluna já existir, eu li aquela frase e afirmei que não existia, fazendo o dono rodar a migração **duas vezes** e culpando indevidamente o cache do Supabase | **Função de diagnóstico não pode devolver veredito escrito à mão.** O veredito vem do banco, na hora. Função assim deve ser APAGADA depois de resolvido — senão volta a mentir |
| **Campo fora do SELECT no PostgREST** | Troquei a fonte de um campo mas esqueci de incluí-lo no `select`. O PostgREST **devolve só o que foi pedido** — o campo veio `undefined`, sem erro, e a tela ficou vazia calada | **No PostgREST, campo fora do select não é erro — é silêncio.** Trocou a fonte de um campo? Confira o SELECT |
| **Percentual falado em conversa** | Foi dito "licenciado 15%"; o motor usava 13%. Eu **não alterei** e pedi confirmação — o documento oficial confirmou **13%** (15% é o Parceiro) | **Número falado de cabeça NÃO vence documento escrito.** Aponte a divergência e peça confirmação. Nunca altere motor de comissão por número dito em conversa |
| **Motor legado inerte ≠ motor removido** | `processAuctionInfluencerCommission` parece inofensivo porque grava no **banco interno** do Base44. Mas continua **carregado**, e é chamado por `payOrderWithWallet`. A trava de idempotência dele procura um registro que o motor real **nunca cria** | **Inerte não é morto.** Reativar aquilo sem remover a chamada faz o leilão pagar **10% em vez de 5%** |
| **Contador que soma motivos diferentes** | Declarei "1 produto pulado por não ter título". Não existia **nenhum** produto sem título — o contador `pulados` somava **dois motivos** e eu atribuí ao errado | **Não interprete contador agregado.** Confira o motivo real antes de afirmar |
| **`dry_run` é a rede de segurança** | O recálculo em lote comissionava depósito e passaporte — **R$ 393,48** de exposição. Nada saiu porque o padrão é `dry_run: true` | **Toda função de escrita em massa nasce com `dry_run: true`.** Nunca inverter esse padrão |

---

## 5. COMO ESTE DOCUMENTO SE MANTÉM VIVO

1. **Toda entrega de risco 🔴** (pagamento, comissão, webhook, saldo, estoque, auth)
   **obriga revisar este documento** — se a entrega criou, mudou ou desmentiu uma regra,
   ela entra aqui na mesma entrega.
2. **Ninguém altera `VERDADE.md` sem autorização explícita do dono.** Nem a IA técnica,
   nem o time de front, nem o de backend.
3. Regra nova só entra aqui **depois de verificada contra o banco real** — nunca por
   suposição, nunca por memória.
4. Este documento registra **o que vale hoje**. O histórico de como chegamos aqui fica no
   `MUDANCAS.md`, que **não é regra**.

---

## 6. ESTADO DO SANEAMENTO

| Fase | O que é | Status |
|---|---|---|
| **1A** | Criar este documento + subordinar os outros | ✅ **CONCLUÍDA** (04/08/2026) |
| **1B** | Inventário do lixo — **100% leitura**, zero escrita (`inventarioSaneamento`) | ✅ **CONCLUÍDA** (04/08/2026) |
| **2** | Limpeza propriamente dita | ⏸️ **NÃO INICIADA** — depende de autorização do dono, **bloco por bloco, por escrito** |

⛔ **Nenhum registro, função ou tabela foi apagado até aqui.**