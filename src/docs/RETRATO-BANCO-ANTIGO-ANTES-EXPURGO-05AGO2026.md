# 📸 RETRATO DO BANCO ANTIGO — ANTES DO EXPURGO

> **Natureza:** retrato de segurança. Capturado em **05/08/2026** imediatamente antes da
> exclusão definitiva do banco antigo (store interno do Base44), autorizada pelo dono.
>
> **Hierarquia:** subordinado a `docs/VERDADE.md`.
>
> **Para que serve:** se algum dia alguém perguntar "o que havia no banco antigo?", a resposta
> é este arquivo. Os registros em si **não existem mais**.

---

## 1. POR QUE FOI APAGADO

Regra oficial do **Marco Zero** (`docs/MARCO-OFICIAL-AGOSTO-2026.md`, seção 1):

> Antes de **01/08/2026** = 🧪 **TESTE.** Sem valor financeiro. Não é receita, não é passivo,
> não é obrigação com ninguém.

Todo o dado de NEGÓCIO do banco antigo é **anterior a agosto/2026** — logo, 100% teste.

### Prova medida (05/08/2026, leitura direta)

| Entidade | Último registro | Registros de agosto/2026 |
|---|---|---|
| `CommissionRecord` | 21/05/2026 | **0** |
| `CatalogSale` | 24/05/2026 | **0** |
| `Auction` | 19/04/2026 | **0** |
| `AppUser` | 27/05/2026 | **0** |
| `AuctionMessage` | 31/05/2026 | **0** |
| `Sale` / `SaleCommission` | 16/05/2026 | **0** |
| `DigitalWallet` / `DigitalWalletTransaction` | 30-31/07/2026 | **0** |
| `AsaasPayment` | 30/07/2026 | **0** |
| `Payment` | 22/01/2026 | **0** |
| `Wallet` / `WalletTransaction` | 18/02 e 21/05/2026 | **0** |
| `FavoriteAuction` | 25/02/2026 | **0** |
| `Bid` | 10/12/2025 | **0** |
| `WithdrawalRequest` | 20/01/2026 | **0** |

**`MercadoPagoPayment`** foi o único com 3 registros datados de agosto (02/08). Conferidos um a
um: **todos `pending`** (PIX gerado e nunca pago), valor R$ 1.497 de adesão, e **um deles é
literalmente `user_id: "test_diagnostic_user"`**. Nenhum pagamento **aprovado** em agosto.
Os 27 aprovados do banco antigo somam R$ 628,49 e são de **janeiro a julho** — período de teste.

### Não influenciava a produção

O site lê **100% da Supabase**. O banco antigo era um depósito paralelo que **nenhuma tela
consultava**. A ZERAGEM-HISTORICO de 04/08 (seção 7 do Marco) atuou na **Supabase** — nunca
tocou neste banco, e foi por isso que ele sobrou.

---

## 2. NÚMEROS CONGELADOS (o retrato em si)

### Carteiras
| Medida | Valor |
|---|---|
| `DigitalWallet` — carteiras | **10** |
| Soma de saldo livre | **R$ 351,60** |
| Soma de saldo reservado | **R$ 0,00** |
| `DigitalWalletTransaction` | 52 registros |
| `Wallet` (modelo antigo) | 195 registros |
| `WalletTransaction` | 43 registros |

⚠️ **Esses R$ 351,60 NÃO eram espelho da Supabase** — conferido conta a conta:
Eloha 23,98 × **78,40** · Iara 6,00 × **2,20** · Luciano 75,10 × **200,40**, e 2 contas do
banco antigo não existiam na Supabase. Eram números de **teste divergentes**, não saldo devido.
O saldo real dos clientes **sempre esteve e continua na Supabase**.

### Comissões
| Medida | Valor |
|---|---|
| `CommissionRecord` (amostra de 500 lidos) | R$ 79,04 |
| `SaleCommission` | 625 registros |

### Vendas e pagamentos
| Medida | Valor |
|---|---|
| `CatalogSale` — 143 vendas | **R$ 4.182,81** |
| `Payment` — 153 registros | **R$ 331.428,27** (valores de teste/carga) |
| `MercadoPagoPayment` — aprovados | 27 · R$ 628,49 |
| `AsaasPayment` | 91 registros |
| `Sale` | 786 registros |

### Catálogo e leilões
`Auction` 136 · `AuctionMessage` 1.000+ · `Bid` 29 · `FavoriteAuction` 30 ·
`WithdrawalRequest` 13

### Usuários (38 no banco antigo)

Praticamente todos já existiam na Supabase — o login do app **nunca** usou esta base
(`api/functions/login.js` → Supabase `app_users`). E-mails registrados para rastro:

`gfarias89@gmail.com` · `diogof3x@gmail.com` · `laudirenefernandes3@gmail.com` ·
`gestaoeoperacao@leilaonozap.com` · `valquiria.clash73@gmail.com` · `maya.clash73@gmail.com` ·
`erbrito.sistemas@gmail.com` · `ricardosoufreitas@gmail.com` ·
`fabriciovfcarvalho09@gmail.com` · `amigobento@hotmail.com` · `iahabbib@yahoo.com.br` ·
`egbrasilconsultoria@gmail.com` · `creiciane.silva65@gmail.com` · `luizsantannago@gmail.com` ·
`diana.dls81@gmail.com` · `sandrajsalomao011@gmail.com` · `site@leilaonozap.com` ·
`jonhhenrique29@hotmail.com` · `tothetopdrive@gmail.com` · `natrilhadavida001@gmail.com` ·
`mgvt21@outlook.com` · `relacionamento@leilaonozap.com` · `lais_andralima@hotmail.com` ·
`luciano4.100@hotmail.com` · `fxajose@gmail.com` · `monteiro29@gmail.com` ·
`administracao@leilaonozap.com` · `nicelimaa21@gmail.com` · `luizmarquespaula@gmail.com` ·
`roque.aureliano86@gmail.com` · `juliasousaa500@gmail.com` · `santannaequipe@gmail.com` ·
`gleicetoptrader@gmail.com` · `luizsantanna@tttcorporate.com` · `testereal@gameil.com` ·
2 registros com e-mail vazio.

---

## 3. O QUE NÃO FOI TOCADO

**A Supabase inteira** — os 246 registros de comissão válidos, os R$ 60,22 de saldo apurado,
as carteiras reais dos clientes, as vendas, os leilões ativos, os pagamentos, o estoque, o
login e as regras de comissão (30% loja / 5% leilão).

> ✅ A partir daqui existe **um único banco**: a Supabase. Não há mais dualidade.

---

## 4. EXECUÇÃO DO EXPURGO — CONCLUÍDA EM 05/08/2026

**4.795 registros excluídos** das 17 tabelas de negócio do banco antigo.
Conferência final: **as 17 voltaram vazias**.

| Tabela | Apagados |
|---|---|
| `AuctionMessage` | 1.597 |
| `CommissionRecord` | 1.324 |
| `Sale` | 786 |
| `SaleCommission` | 625 |
| `MercadoPagoPayment` | 180 |
| `Wallet` | 195 |
| `Payment` | 153 |
| `CatalogSale` | 143 |
| `Auction` | 136 |
| `AsaasPayment` | 91 |
| `DigitalWalletTransaction` | 52 |
| `WalletTransaction` | 43 |
| `AppUser` | 38 |
| `FavoriteAuction` | 30 |
| `Bid` | 29 |
| `WithdrawalRequest` | 13 |
| `DigitalWallet` | 10 |

### ⚠️ TRAVA TÉCNICA DESCOBERTA — NÃO REPETIR O ERRO

Excluir em massa filtrando por data **NÃO funciona** neste banco:
`deleteMany({ created_date: { $lt: '2026-08-01' } })` retornou **"0 apagados"** em todas as
tabelas — e os registros continuavam lá. **Silencioso**: nenhum erro, nenhum aviso.
A exclusão só funciona **registro por registro, por ID**.

> 🚨 Quem confiar no retorno do `deleteMany` por data vai jurar que apagou e **não apagou nada**.
> Sempre conferir depois com uma leitura.

**Zero erros** nas 4.795 exclusões. A Supabase não foi tocada em nenhum momento.