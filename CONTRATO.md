# 📘 CONTRATO — Leilão NoZap

> **Este é o mapa-mestre do projeto.** Se você chegou agora (time do front), **comece por aqui.**
> Documento em português. Última revisão: 28/07/2026 (adicionado o índice das funções).

---

## 🎯 Como o trabalho é dividido

```
BACKEND (aqui / Base44)          GITHUB              FRONT (VSEL / time do front)
──────────────────────    →   (super base)    →    ────────────────────────────
Coda a lógica de servidor      ponto de              Puxa o código do GitHub
+ funções + dados              encontro              Pluga e desenvolve as telas
+ documenta em português       comum                 Lê este CONTRATO + MUDANCAS.md
```

- **Backend** é responsabilidade do time de servidor (codado no ambiente Base44).
- **Front** é responsabilidade do time do VSEL.
- **Ponto de encontro** = este repositório no **GitHub** + o banco no **Supabase**.
- **Toda mudança de backend é registrada em `MUDANCAS.md`** (o diário de bordo, em português).

---

## 🗄️ 1. Onde ficam os DADOS

Os dados NÃO ficam no GitHub. GitHub guarda **código**. Os dados ficam no **Supabase**:

- **Projeto Supabase:** `gezvviyegtxytnwjkrjv` (região `sa-east-1`)
- **URL:** `https://gezvviyegtxytnwjkrjv.supabase.co`
- **Cliente do front:** `src/api/supabaseClient.js`

Esta é a **fonte única de verdade** dos dados (lotes, usuários, transações, pedidos, saldos).

---

## 🔌 2. Como o FRONT lê e escreve DADOS

O front **não fala direto** com o Supabase na maioria dos casos. Ele usa um **adapter** que
mantém a mesma interface do antigo SDK Base44, pra o código não quebrar.

- **Arquivo do adapter:** `src/api/base44Adapter.js`
- **Como importar:** `import { base44 } from '@/api/base44Client';`

### Ler dados
```js
const lotes = await base44.entities.LoteRecebido.list('-created_date', 100);
const um    = await base44.entities.LoteRecebido.get(id);
const filtrados = await base44.entities.LoteRecebido.filter({ status: 'recebido' });
```

### Escrever dados (create / update / delete)
```js
await base44.entities.LoteRecebido.create({ nome_lote: 'X', marketplace: 'Outros' });
await base44.entities.LoteRecebido.update(id, { status: 'comprado' });
await base44.entities.LoteRecebido.delete(id);
```

> ⚠️ **Regra importante da escrita:** quando o usuário logado é **admin / super_admin** (ou tem
> cargo de estoque), o adapter **não escreve direto no Supabase** — ele roteia a escrita para a
> função de servidor `/api/functions/entityWrite` (que usa a chave de service_role). Isso respeita
> as regras de segurança (RLS) do banco. O front **não precisa fazer nada diferente** — é só chamar
> `base44.entities.X.create/update/delete` normalmente.

### Mapa Entidade → Tabela
A tradução entre o nome usado no código (ex: `LoteRecebido`) e a tabela real no Supabase
(ex: `lotes_recebidos`) está no topo do `src/api/base44Adapter.js` (constante `TABLE_MAP`).

---

## ⚙️ 3. Como o FRONT chama o BACKEND (funções)

```js
// forma recomendada
const resp = await base44.functions.invoke('nomeDaFuncao', { ...payload });

// forma curta (equivalente)
const resp = await base44.functions.nomeDaFuncao({ ...payload });
```

- As funções de backend vivem em **`api/functions/`** (rodam na Vercel) e em `base44/functions/` (legado).
- **Padrão oficial:** priorizar `api/functions/`. O diretório `base44/functions/` é legado da
  migração e não deve receber código novo sem combinar antes.
- Cada função de backend tem, no topo do arquivo, um **cabeçalho em português** explicando o que
  ela faz, quem a chama e a data da última mudança (ver seção 5).

---

## 🔐 4. Segredos / Chaves

As chaves (Supabase service_role, ASAAS, Brevo, Mercado Livre, etc.) **nunca** ficam no código.
Elas vivem como **secrets de ambiente** e são acessadas no servidor via `process.env` / `Deno.env`.

- ❌ Nunca colar uma chave dentro de um arquivo `.js` / `.ts`.
- ✅ Chave nova = cadastrar como secret de ambiente e ler via `process.env.NOME_DA_CHAVE`.

---

## 📝 5. Cabeçalho padrão das funções de backend

Toda função nova de backend deve começar com este bloco (em português):

```js
// ─────────────────────────────────────────────
// FUNÇÃO: nomeDaFuncao
// O QUE FAZ: [explicação curta em português]
// USADO POR: [qual tela / fluxo do front chama esta função]
// ÚLTIMA MUDANÇA: DD/MM/AAAA
// ─────────────────────────────────────────────
```

Assim qualquer dev do front abre a função e entende em segundos.

---

## 📚 6. Índice das funções do backend (o que cada peça faz)

> Lista das principais funções agrupadas por área. É a "etiqueta" de cada ferramenta.
> Para chamar qualquer uma: `await base44.functions.invoke('nomeDaFuncao', { ...dados })`.
> ⚠️ As de área 🔴 (dinheiro/estoque/auth) só devem ser tocadas pelo time de backend.

### 💳 Pagamentos e Cobrança 🔴
| Função | O que faz |
|--------|-----------|
| `createAsaasPayment` | Cria uma cobrança PIX/boleto no ASAAS |
| `asaasWebhook` | Recebe o aviso do ASAAS quando um pagamento é confirmado |
| `checkPaymentStatus` | Consulta se um pagamento já foi pago |
| `createMPPayment` / `createMPPreference` | Cria pagamento no Mercado Pago |
| `mercadoPagoWebhook` | Recebe o aviso do Mercado Pago quando pagam |
| `payOrderWithWallet` | Paga um pedido usando o saldo da carteira |
| `manualPaymentApproval` | Admin aprova um pagamento manualmente |
| `createPartnerPlanPix` | Gera o PIX pra ativar um plano de parceiro |

### 💰 Carteira e Saldo 🔴
| Função | O que faz |
|--------|-----------|
| `getDigitalWalletBalance` | Mostra quanto tem na carteira do usuário |
| `getDigitalWalletHistory` | Mostra o extrato (entradas e saídas) da carteira |
| `debitWalletBalance` | Desconta valor da carteira (ex: ao dar um lance) |
| `getAllWalletBalances` | Lista o saldo de todos os usuários (admin) |
| `resyncUserBalances` | Recalcula/corrige o saldo de um usuário |
| `allocateInvestorCapital` | Reserva capital do investidor pra um lote |

### 🔨 Leilões e Lances 🔴
| Função | O que faz |
|--------|-----------|
| `submitAtomicBid` | Registra um lance de forma segura (sem duplicar) |
| `persistBidAuthorization` | Salva a autorização de lance do usuário |
| `finalizeAuction` / `endAuctionSafe` | Encerra um leilão e define o vencedor |
| `processAuctionSale` | Processa a venda do leilão vencido |
| `reactivateAuction` / `autoReactivateAuctions` | Reabre leilões |
| `closeExpiredAuctions` | Fecha leilões que passaram do horário |
| `createTestAuction` | Cria leilão de teste (uso interno) |
| `notifyFavoriteBid` | Avisa quem favoritou que houve lance |

### 🧾 Comissões (rede de indicação) 🔴
| Função | O que faz |
|--------|-----------|
| `distributeAuctionCommissions` | Divide a comissão de um leilão pela rede |
| `processCatalogCommission` | Divide a comissão de uma venda do catálogo |
| `previewCatalogCommission` | Simula a comissão antes de efetivar |
| `getSaleCommissions` | Lista as comissões de uma venda |
| `auditUserCommissions` / `diagnoseUserCommissions` | Confere/audita comissões de um usuário |
| `requestWithdrawal` | Usuário pede saque da comissão |
| `approveWithdrawal` / `rejectWithdrawal` | Admin aprova/recusa o saque |

### 📦 Estoque e Lotes 🔴
| Função | O que faz |
|--------|-----------|
| `gerarProdutosDoLote` | Cria os produtos no estoque a partir de um lote |
| `extractBatchReceipt` | Lê a nota fiscal e extrai os lotes |
| `updateBatchProducts` | Atualiza os produtos de um lote |
| `reserveLot` / `releaseExpiredReservations` | Reserva/libera lotes |

### 🛒 Catálogo (loja virtual) 🟡
| Função | O que faz |
|--------|-----------|
| `getCatalogOrders` / `getMyCatalogOrders` | Lista os pedidos do catálogo |
| `getCatalogOrderById` | Detalhes de um pedido específico |
| `createManualCatalogSale` | Registra uma venda manual do catálogo |
| `syncCatalogPrices` | Atualiza os preços do catálogo |
| `calculateShipping` | Calcula o frete de um pedido |
| `trackCatalogSale` | Rastreia/registra uma venda |

### 👤 Usuários e Vendedores 🟡
| Função | O que faz |
|--------|-----------|
| `registerSeller` / `updateSeller` / `deleteSeller` | Cadastra/edita/remove vendedor |
| `generateSellerAccessToken` | Gera o link de primeiro acesso do vendedor |
| `adminUpdateUser` / `updateUserData` | Admin edita dados de um usuário |
| `updateUserPassword` | Troca a senha do usuário |
| `sendPasswordResetEmail` | Manda o e-mail de recuperação de senha |
| `getSellerDashboardData` / `getLicenseeDashboardData` | Dados do painel do vendedor/licenciado |
| `linkOrphanUsers` / `mergeAppUsers` | Corrige/junta usuários duplicados |

### 🖼️ Imagens e Produtos (buscadores) 🟢
| Função | O que faz |
|--------|-----------|
| `searchGoogleShopping` / `searchMercadoLivre` | Busca produto/preço na internet |
| `extractMLImages` / `getMLImagesFromAPI` | Pega imagens do Mercado Livre |
| `extractGoogleImageUrls` / `getImagesFromGoogleSearch` | Pega imagens do Google |
| `analyzeProductImage` | Analisa a imagem de um produto com IA |
| `calculateProductPricing` | Calcula o preço de venda de um produto |
| `precificaVivo` | Precificação automática ao vivo |

### 📊 Relatórios e Sistema 🟢
| Função | O que faz |
|--------|-----------|
| `dailyReport` | Gera o relatório do dia |
| `aggregateMetrics` / `forceSyncStats` | Junta/atualiza as estatísticas |
| `getPDVData` / `pdvAction` | Dados e ações do PDV (ponto de venda) |
| `systemHealthCheck` | Confere se o sistema está saudável |
| `getServerTime` | Retorna a hora oficial do servidor |
| `sendBulkMessages` | Envia mensagens em massa |
| `generateContractPDF` | Gera o PDF do contrato |

> 📌 Existem outras funções auxiliares (teste, migração, depuração) no diretório `api/functions/`.
> Estas acima são as que o front normalmente precisa conhecer.

---

## 🛡️ 7. Regra de Ouro (para todos)

1. **Nunca quebrar o que já funciona em produção.** Tem dinheiro real, usuário real, transação real.
2. **Backend** (funções, banco, integrações financeiras) → mexe o time de backend.
3. **Front** (telas, componentes, layout) → mexe o time do front.
4. Mudança em área crítica (pagamento, comissão, saldo, estoque, auth) = **combinar antes**.
5. **Toda mudança de backend vai pro `MUDANCAS.md`.**

---

## 🚦 8. Fluxo de entrega (resumo)

1. Backend é codado e documentado aqui.
2. A mudança é registrada no `MUDANCAS.md`.
3. O código sobe pro GitHub (via sincronização do repositório).
4. O time do front puxa do GitHub, lê o `MUDANCAS.md`, e integra.