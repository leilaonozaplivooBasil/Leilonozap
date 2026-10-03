# 📋 Handoff Técnico — Leilão NoZap

> Documento de transição para o novo responsável técnico. Lista todas as áreas funcionais ("skills") do sistema, o que cada uma faz, e onde encontrar o código. **Sistema em produção com dinheiro real — leia com atenção antes de alterar qualquer coisa.**

---

## ⚠️ Antes de tocar em qualquer código

- Este é um app **Base44** (React + Vite no frontend, Supabase como banco real, funções serverless em `api/functions/`).
- Pagamentos reais via **Mercado Pago** e **ASAAS** (PIX, cartão).
- Comissões multi-nível são calculadas automaticamente — nunca alterar a lógica de cálculo sem entender o fluxo completo (ver seção 4).
- Sempre teste em **mobile e desktop** — boa parte dos usuários acessa pelo celular.
- Arquivos de auditoria/correção (`auditar*`, `corrigir*`, `reset*`) em `api/functions/` e `base44/functions/` são ferramentas internas de diagnóstico — **não são fluxo normal do sistema**, foram criadas para investigar e corrigir dados durante a migração. Não rodar sem entender o que fazem.

---

## 1. 🔨 Leilões (Auction)

**O que é:** o produto principal — leilões ao vivo com lances em tempo real, estilo "leilão de garagem via WhatsApp".

- Sala de leilão (`src/pages/AuctionRoom.jsx`) com chat de lances, narração automática por IA, contagem regressiva de martelo (1ª, 2ª, 3ª chamada)
- Modo chamada: pré-lançamento visível na vitrine com lances bloqueados até uma data de abertura
- Arremate: lance vencedor, checkout do vencedor (`AuctionCheckoutModern.jsx`), pedido pós-arremate (rastreio, status de entrega)
- Leilões de investimento (lotes para investidores/parceiros) — reserva temporária, frete reservado
- "Comparai": compara o preço do produto com o mercado (Google Shopping / site do fornecedor)
- Favoritos e notificação quando um leilão favorito recebe lance

**Onde:** `src/pages/AuctionRoom.jsx`, `CreateAuction*.jsx`, `src/components/auction/*`, entidade `Auction`, `AuctionMessage`, `Bid`; funções `submitAtomicBid`, `finalizeAuction`, `reserveLot`, `endAuctionSafe`, `comparaiPrices`.

---

## 2. 💰 Carteira Digital (Wallet)

**O que é:** saldo em dinheiro de cada usuário dentro do app. **Serve para dar lance** — comprar na Loja Virtual é com PIX ou cartão. Ver `docs/DOCUMENTO-OFICIAL-PASSAPORTE.md`.

- **Três** estados, não dois (regra de 08/08/2026): **livre**, **comprometido** (foi coberto, mas aquele leilão ainda está rolando — dá lance, não compra na loja) e **reservado** (está no lance em que lidera agora)
- Depósito via PIX/cartão (Mercado Pago), reserva de saldo ao dar lance, liberação se for superado, débito na hora do arremate
- Transferência de saldo entre usuários
- Saldo de teste (só admin usa, pra simular fluxos sem mexer em dinheiro real)
- Extrato completo de todas as movimentações

**Onde:** entidade `DigitalWallet`, `DigitalWalletTransaction`, `WalletTransaction`; funções `getDigitalWalletBalance`, `reserveBidBalance`, `releaseBidHold`, `debitWalletBalance`, `creditWalletBalance`, `transferBalance`; `src/components/wallet/*`.

---

## 3. 🛍️ Loja Virtual / Catálogo (Catalog)

**O que é:** um e-commerce dentro do app, paralelo aos leilões — compra direta de produtos com frete.

- Vitrine pública por loja (cada licenciado tem a sua, em `/loja/:slug`)
- Carrinho, checkout (PIX/cartão), cálculo de frete via Melhor Envio e Correios
- Cupons de desconto. **Passaporte de Lances:** o depósito serve só para dar lance; o valor de cada lance perdido volta acrescido de 10% e só então pode ser gasto aqui. Regra completa em `docs/DOCUMENTO-OFICIAL-PASSAPORTE.md` — corrigido em 27/08/2026, a descrição anterior ("bônus automático de 10% na carteira") descrevia o modelo que acabou em 19/08
- **Gestão de Pedidos (admin)** — `src/pages/CatalogOrdersAdmin.jsx`: checklist de itens para separar/embalar, jornada de entrega (Recebemos → Embalando → Enviado → Saiu para entrega → Entregue), código de rastreio, endereço completo do comprador, etiqueta automática gerada na Melhor Envio

**Onde:** entidade `CatalogSale`, `Product`; `src/pages/Catalog.jsx`, `Cart.jsx`, `CatalogOrdersAdmin.jsx`; funções `createMPCatalogCardCheckout`, `mpWebhook`, `cotarFrete`, `melhorEnvioOAuth`.

---

## 4. 🌳 Rede / Licenciamento / Comissões (Network)

**O que é:** o sistema de indicação em rede (estilo marketing multinível) que paga comissão em cascata.

- Cadastro com indicação (`?ref=código`), árvore genealógica de quem indicou quem
- Níveis de carreira (usuário → licenciado → executivo → trainee → distribuidor → diretor → ... → fundador)
- Comissão automática em duas trilhas separadas: **leilão** (3% da plataforma) e **catálogo** (26% distribuído pela rede)
- Pagamento manual de comissões (banco interno, até a integração bancária automática)
- Painéis dedicados por papel: Vendedor, Distribuidor, Licenciado, Investidor, Leiloeiro

**Onde:** entidade `AppUser` (campos `career_levels`, `referred_by_id`, `commission_balance`), `CommissionRecord`; `src/pages/NetworkOverview.jsx`, `src/pages/portal/*`; funções `distributeAuctionCommissions`, `processCatalogCommission`, `getSaleCommissions`.

⚠️ **Área de risco alto** — qualquer ajuste aqui precisa ser testado ponta a ponta (não confiar só na leitura do código).

---

## 5. 🤝 Parceiro de Compra (Investimento)

**O que é:** captação privada para investidores comprarem lotes de mercadoria e receberem retorno.

- Cadastro restrito com termo de sigilo (NDA) e contrato assinado digitalmente
- Aportes, análise de lotes recebidos, "giro de vendas ao vivo" (simulação de vendas diárias do lote)
- Painel próprio com tema visual exclusivo (preto + dourado)

**Onde:** `src/pages/AcessoParceiro.jsx`, `src/components/parceiro/*`; entidade `LoteRecebido`; funções `registrarAssinaturaContrato`, `generateContractPDF`.

---

## 6. 🧠 IA / Atendimento

- **Leila**: assistente de IA que atende no chat do app (e WhatsApp), com acesso ao histórico do usuário
- Narração automática de leilões (lances, contagem)
- Geração de descrições de produto por IA

**Onde:** `base44/agents/leila_atendente.jsonc`; funções `leilaChat`, `askAgente`, `regerarDescricoesIA`.

---

## 7. ⚙️ Administração / Sistema

- Gestão de usuários e permissões (roles: user, admin, super_admin, licensee, investidor, leiloeiro, arrematante)
- Gestão de estoque e lotes, PDV (ponto de venda físico), gestão de metas
- Painel financeiro, auditoria de cadastros sem indicação, monitor global de erros (`GlobalMonitor`)

**Onde:** `src/pages/UserManagement.jsx`, `AdminFinanceiro.jsx`, `GestaoLotes.jsx`, `TirarPedido.jsx`; `src/components/system/GlobalMonitor.jsx`.

---

## 8. 🔌 Integrações externas

| Serviço | Uso |
|---|---|
| Mercado Pago / ASAAS | Pagamentos PIX e cartão (depósitos, compras) |
| Melhor Envio / Correios | Cálculo de frete e emissão de etiqueta |
| Google (OAuth, Drive, Sheets) | Login social, backup de planilhas |
| Mercado Livre | Busca de imagens de produto para importação de lotes |
| Brevo | Envio de e-mail e WhatsApp |
| SerpAPI | Busca de preços (Google Shopping) para o "Comparai" |

Todas as chaves ficam nos **secrets** do ambiente (nunca hardcoded no código).

---

## 📁 Estrutura de pastas (resumo)

```
src/pages/          → páginas (rotas do app)
src/components/     → componentes reutilizáveis, organizados por área
base44/entities/    → schemas das tabelas (fonte de verdade dos dados)
base44/functions/   → funções serverless (Deno) usadas pelo app novo
api/functions/      → funções serverless legadas (Vercel/Node) — ainda em uso
src/App.jsx         → roteador principal — toda página nova PRECISA de uma rota aqui
src/Layout.jsx      → menu, header, footer, modais globais
```

---

## 📌 Contatos e decisões já tomadas

Ver `CONTRATO.md` e `MUDANCAS.md` na raiz do projeto — histórico de decisões técnicas, riscos classificados por cor (🟢/🟡/🔴) e regras de negócio já validadas que não devem ser reinterpretadas sem autorização explícita do dono do projeto.