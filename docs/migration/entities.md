# Inventário de Entidades — Leilão NoZap → Supabase
Gerado em 2026-05-26 a partir do dump de /Users/diogof3x/Leilonozap-backup-2026-05-26/data

## Resumo

| Entidade | Registros | Campos |
|---|---:|---:|
| `Product` | 3543 | 40 |
| `LiveSession` | 2227 | 20 |
| `ComparaiLog` | 1728 | 13 |
| `AuctionMessage` | 1605 | 15 |
| `CommissionRecord` | 1325 | 18 |
| `CatalogVisit` | 213 | 12 |
| `Auction` | 136 | 50 |
| `Category` | 52 | 11 |
| `AppUser` | 37 | 57 |
| `FinancialExpense` | 35 | 23 |
| `Seller` | 32 | 14 |
| `BannerImage` | 14 | 14 |
| `DepositPackage` | 5 | 11 |
| `Store` | 4 | 22 |
| `Customer` | 4 | 28 |
| `LuxuryAccessCode` | 3 | 16 |
| `FeaturedProduct` | 3 | 13 |
| `CatalogSettings` | 1 | 8 |
| `WithdrawalRequest` | 0 | 0 |
| `WalletTransaction` | 0 | 0 |
| `Wallet` | 0 | 0 |
| `SystemLog` | 0 | 0 |
| `SaleCommission` | 0 | 0 |
| `Sale` | 0 | 0 |
| `ProductOperation` | 0 | 0 |
| `PricingFormula` | 0 | 0 |
| `PriceHistory` | 0 | 0 |
| `PaymentSettings` | 0 | 0 |
| `Payment` | 0 | 0 |
| `PartnerPlanPurchase` | 0 | 0 |
| `Negotiation` | 0 | 0 |
| `LuxuryAuction` | 0 | 0 |
| `LoteRecebido` | 0 | 0 |
| `LicenseeLead` | 0 | 0 |
| `InfluencerPurchase` | 0 | 0 |
| `InfluencerLead` | 0 | 0 |
| `FreteSettings` | 0 | 0 |
| `FooterSettings` | 0 | 0 |
| `FavoriteAuction` | 0 | 0 |
| `DigitalWalletTransaction` | 0 | 0 |
| `DigitalWallet` | 0 | 0 |
| `CatalogSale` | 0 | 0 |
| `CashRegister` | 0 | 0 |
| `Bid` | 0 | 0 |
| `BatchRegistration` | 0 | 0 |
| `AuctionView` | 0 | 0 |
| `AsaasPayment` | 0 | 0 |
| `Arrematante` | 0 | 0 |

**Total: 10967 registros em 48 entidades com dados.**

---

## Schemas inferidos

### `Product` (3543 registros, 40 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|
| `altura` | float | sim | 15.0 |
| `calculated_price` | float | sim | 164.65696465696465 |
| `catalog_active` | bool | sim | False |
| `comprimento` | float | sim | 5.0 |
| `cost_price` | float, int | não | 22.67 |
| `created_by` | str | não | service+06397426-482e-42be-a628-53683e2d1878@no-reply.base44 |
| `created_by_id` | str | não | service_06397426-482e-42be-a628-53683e2d1878 |
| `created_date` | str | não | 2026-05-21T19:44:29.620000 |
| `date` | str | sim | 2026-05-21 |
| `deposit_name` | str | sim | Bangu |
| `description` | str | não | Cola Tenis Borracha Couro Tekbond Bico Anti Entupimento 20g  |
| `discount_percentage` | float | sim | 20.83799776107469 |
| `id` | str | não | 6a0f609de8d98c812c9c3cfc |
| `image_urls` | list | sim | ['https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcQZ |
| `is_featured` | bool | sim | False |
| `is_sample` | bool | não | False |
| `largura` | float | sim | 3.0 |
| `last_dynamic_update` | str | sim | 2026-04-19T03:32:23.788Z |
| `linked_auctions` | list | não | [] |
| `lot` | str | sim | LOTE 58 - RIO DE JANEIRO - COMPLETO |
| `market_value` | float | sim | 15.98 |
| `notes` | str | não | <p>A Cola Tenis Borracha Couro Tekbond é a solução ideal par |
| `peso` | float | sim | 0.02 |
| `price_auction_start` | NoneType | sim |  |
| `price_buy_now` | NoneType | sim |  |
| `price_catalog` | float | sim | 12.78 |
| `pricing_formula_id` | NoneType | sim |  |
| `profit` | float | sim | 364.0 |
| `purchase_order` | str | sim |  |
| `qty_bom` | float, int | não | 1.0 |
| `qty_oficina` | float, int | não | 0.0 |
| `qty_perfeito` | float, int | não | 0.0 |
| `qty_ruim` | float, int | não | 0.0 |
| `quantity` | float | não | 1.0 |
| `quantity_sold` | float, int | não | 0.0 |
| `selling_price_retail` | float | sim | 12.78 |
| `selling_price_wholesale` | float | sim | 0.0 |
| `sold_amount` | float | sim | 364.0 |
| `status` | str | não | ESTOQUE |
| `updated_date` | str | não | 2026-05-21T19:50:49.559000 |

### `LiveSession` (2227 registros, 20 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|
| `created_by` | str | não | anonymous |
| `created_by_id` | str | não | anonymous |
| `created_date` | str | não | 2026-05-26T20:34:20.533000 |
| `current_product_id` | NoneType | sim |  |
| `frame_image_url` | NoneType | sim |  |
| `frame_type` | str | sim | horizontal |
| `id` | str | não | 6a1603cc36919bac59cc09eb |
| `is_live` | bool | sim | False |
| `is_paused` | bool | sim | False |
| `is_sample` | bool | não | False |
| `last_heartbeat` | str | sim | 2026-05-26T21:16:13.699Z |
| `page` | str | sim | / |
| `partner_store` | str | sim | sai_de_baixo |
| `pause_image_url` | NoneType | sim |  |
| `quality` | str | sim | 1080p |
| `session_id` | str | sim | session_1779827654644_a2wzh2ndp |
| `stream_url` | str | sim |  |
| `updated_date` | str | não | 2026-05-26T21:16:14.237000 |
| `user_agent` | str | sim | Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/ |
| `user_id` | str | sim | 68db0ff2c19838a827fb6e5f |

### `ComparaiLog` (1728 registros, 13 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|
| `auction_id` | str | não | 68decf111f5507014c036b65 |
| `created_by` | str | não | service+06397426-482e-42be-a628-53683e2d1878@no-reply.base44 |
| `created_by_id` | str | não | service_06397426-482e-42be-a628-53683e2d1878 |
| `created_date` | str | não | 2025-10-08T19:05:35.704000 |
| `error_details` | dict | sim | {'price': 209, 'method': 'json-ld'} |
| `id` | str | não | 68e6b5ff5f093e06e2e8bc49 |
| `is_mobile` | bool | não | False |
| `is_sample` | bool | não | False |
| `message` | str | não | Preço extraído: R$ 209.00 via json-ld |
| `status` | str | não | success |
| `step` | str | não | FACTORY_SUCCESS |
| `updated_date` | str | não | 2025-10-08T19:05:35.704000 |
| `user_agent` | str | não | Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/ |

### `AuctionMessage` (1605 registros, 15 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|
| `auction_id` | str | não | 699756d3b96826cc60309c56 |
| `bid_amount` | float | sim | 2300.0 |
| `content` | str | não | 💥 POW! vale-do-recreio não brinca! |
| `countdown_phase` | float | sim | 3.0 |
| `created_by` | str | não | anonymous |
| `created_by_id` | str | não | anonymous |
| `created_date` | str | não | 2026-05-26T18:16:38.713000 |
| `id` | str | não | 6a15e38648cbcbbe3ffb7a8f |
| `is_sample` | bool | não | False |
| `is_system_message` | bool | não | True |
| `message_type` | str | não | ai_narration |
| `sender_id` | str | sim | 68db0ff2c19838a827fb6e5f |
| `sender_name` | str | não | LanceIA |
| `timestamp` | str | sim | 2026-04-30T17:13:35.898Z |
| `updated_date` | str | não | 2026-05-26T18:16:38.713000 |

### `CommissionRecord` (1325 registros, 18 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|
| `amount` | float | não | 3.77 |
| `anchor_user_id` | str | sim | 68db0ff2c19838a827fb6e5f |
| `anchor_user_name` | str | sim | LUIZ SANTANNA |
| `created_by` | str | não | service+800a3a02-e28c-4d70-bda9-4f4848ff79a7@no-reply.base44 |
| `created_by_id` | str | não | service_800a3a02-e28c-4d70-bda9-4f4848ff79a7 |
| `created_date` | str | não | 2026-05-21T18:52:13.162000 |
| `id` | str | não | 6a0f545d56ca881954352ab4 |
| `is_sample` | bool | não | False |
| `percent` | float | não | 13.0 |
| `product_title` | str | sim | Raquete Elétrica Mata Mosquito Dengue Insetos Moscas Pernilo |
| `role` | str | não | licenciado_catalogo |
| `sale_amount` | float | sim | 28.99 |
| `sale_id` | str | não | 6a0f5421bd94f0aeaa2bb01e |
| `sale_type` | str | sim | catalog |
| `status` | str | não | confirmed |
| `updated_date` | str | não | 2026-05-21T18:52:13.162000 |
| `user_id` | str | não | 68db0ff2c19838a827fb6e5f |
| `user_name` | str | sim | LUIZ SANTANNA |

### `CatalogVisit` (213 registros, 12 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|
| `created_by` | str | não | anonymous |
| `created_by_id` | str | não | anonymous |
| `created_date` | str | não | 2026-05-26T18:25:06.086000 |
| `id` | str | não | 6a15e5822da44d634bf46105 |
| `is_sample` | bool | não | False |
| `licensee_id` | str | não | 68db0ff2c19838a827fb6e5f |
| `page` | str | não | /Loja-Virtual?ref=valedorecreio |
| `referral_code` | str | não | valedorecreio |
| `session_id` | NoneType | sim |  |
| `updated_date` | str | não | 2026-05-26T18:25:06.086000 |
| `user_agent` | str | não | Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/ |
| `visited_at` | str | não | 2026-05-26T18:25:03.772Z |

### `Auction` (136 registros, 50 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|
| `allowed_regions` | list | não | [] |
| `buy_now_price` | float | sim | 23.92 |
| `category` | str | não | outros |
| `commissions_distributed` | bool | sim | False |
| `comparai_mode` | str | não | google_shopping |
| `created_by` | str | não | luizsantanna@tttcorporate.com |
| `created_by_id` | str | não | 68d536db3c26ff51f79c4138 |
| `created_date` | str | não | 2026-04-19T02:02:10.903000 |
| `current_price` | float | não | 19.14 |
| `description` | str | não | Ponteiras Antiderrapantes Masticmol Metalon 20x20 Preto - 10 |
| `end_time` | str | não | 2026-04-20T02:02:10.024Z |
| `id` | str | não | 69e437a2994efb5035dc325f |
| `image_urls` | list | não | ['https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcR2 |
| `increment` | float | não | 2.0 |
| `is_investment_plan` | bool | não | False |
| `is_sample` | bool | não | False |
| `is_test_auction` | bool | não | False |
| `last_comparison_date` | str | sim | 2026-04-19T19:52:00.012Z |
| `last_processed_bid_time` | NoneType | sim |  |
| `last_updated` | str | sim | 2026-04-20T02:13:28.329Z |
| `lot_categories_json` | str | sim | [{"nome":"Alimentos e Bebidas","qtd":6311,"valor":108552.549 |
| `lot_grades_json` | str | sim | {"A":{"qtd":3030,"valorMarket":30503.94000000004},"B":{"qtd" |
| `lot_items_json` | str | sim | {"Alimentos e Bebidas":[{"desc":"Whisky Macallan Rare Cask 4 |
| `lot_raw_items_json` | str | sim | [{"grade":"U","desc":"Whisky Macallan Rare Cask 43","qtd":1, |
| `lot_status` | str | sim | importado |
| `manual_market_price` | float | sim | 197784.7699999999 |
| `market_price` | float | sim | 15.79 |
| `order_status` | str | sim | awaiting_payment |
| `partner_commission_percentual` | float | sim | 7.0 |
| `partner_id` | NoneType | sim |  |
| `partner_name` | NoneType | sim |  |
| `partner_store` | str | não | nozap |
| `platform_commission_percentual` | float | sim | 3.0 |
| `product_id` | str | sim | 69e3a59e27f0f5bc8f9014bb |
| `product_source` | str | não | return_resale |
| `reserved_by` | NoneType | sim |  |
| `reserved_by_name` | NoneType | sim |  |
| `reserved_until` | NoneType | sim |  |
| `seller_id` | str | sim | 68db0ff2c19838a827fb6e5f |
| `seller_name` | str | sim | LUIZ ALBERTO SANTANNA FILHO |
| `source_url` | str | sim | https://www.mercadolivre.com.br/microfone-dinmico-com-fio-ca |
| `starting_price` | float | não | 19.14 |
| `status` | str | não | ended |
| `supplier_logo_url` | str | sim | https://base44.app/api/apps/68d536db3c26ff51f79c4137/files/p |
| `title` | str | não | Ponteiras Antiderrapantes 100 Unid Masticmol Metalon 20x20 P |
| `tracking_code` | NoneType | sim |  |
| `updated_date` | str | não | 2026-04-20T02:13:28.522000 |
| `version` | float, int | sim | 2.0 |
| `winner_id` | str | sim | 68db0ff2c19838a827fb6e5f |
| `winner_name` | str | sim | LUIZ SANTANNA |

### `Category` (52 registros, 11 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|
| `created_by` | str | não | luizsantanna@tttcorporate.com |
| `created_by_id` | str | não | 68d536db3c26ff51f79c4138 |
| `created_date` | str | não | 2026-05-24T16:44:19.591000 |
| `id` | str | não | 6a132ae330ae1f58c240c972 |
| `is_active` | bool | não | True |
| `is_sample` | bool | não | False |
| `name` | str | não | Relógios |
| `parent_category_id` | str | sim | 69e6cf37ec07dca9728835d5 |
| `parent_category_name` | str | sim | Moda |
| `sort_order` | int | não | 0 |
| `updated_date` | str | não | 2026-05-24T16:44:19.591000 |

### `AppUser` (37 registros, 57 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|
| `access_token` | NoneType | sim |  |
| `access_token_expires` | NoneType | sim |  |
| `active_partner_plan` | str | sim | Plano Visionário |
| `address_city` | str | sim | Rio de Janeiro |
| `address_complement` | str | sim | bl 1 ap 1417 |
| `address_neighborhood` | str | sim | Barra da Tijuca |
| `address_number` | str | sim | 3150 |
| `address_state` | str | sim | RJ |
| `address_street` | str | sim | Avenida Lúcio Costa |
| `address_zip_code` | str | sim | 22630010 |
| `arrematante_commission_percentage` | float, int | sim | 0 |
| `arrematante_context` | NoneType | sim |  |
| `arrematante_responsavel_id` | NoneType | sim |  |
| `avatar_color` | str | sim | #25D366 |
| `avatar_url` | str | sim |  |
| `career_levels` | list | não | ['licenciado_catalogo'] |
| `catalog_commission_balance` | float, int | não | 0 |
| `catalog_total_commissions_generated` | float, int | não | 0 |
| `commission_balance` | float, int | não | 0 |
| `cpf` | str | sim | 10366039709 |
| `created_by` | str | não | luizsantanna@tttcorporate.com |
| `created_by_id` | str | não | 68d536db3c26ff51f79c4138 |
| `created_date` | str | não | 2026-05-16T01:01:43.150000 |
| `display_first_name` | str | sim | Diogo |
| `display_last_name` | str | sim | Archanjo |
| `email` | str | não |  |
| `enabled_panels` | list | sim | ['loja_virtual', 'arrematante', 'vendedor', 'lojista', 'lice |
| `full_name` | str | não | BEATRIZ SANTANNA |
| `id` | str | não | 6a07c1f7022c7f86ff80a102 |
| `indicated_clients_count` | float, int | não | 0 |
| `is_sample` | bool | não | False |
| `is_seller` | bool | sim | False |
| `licenciado_context` | NoneType | sim |  |
| `network_bids_count` | float, int | não | 0 |
| `nickname` | str | sim | beatriz-santanna |
| `partner_plan_activated_at` | str | sim | 2026-01-20T00:00:00.000Z |
| `partner_plan_amount` | float | sim | 20.0 |
| `password` | str | não | p1e3k545mid8mby3yzh35 |
| `password_reset_expires` | str | sim | 2026-04-01T18:09:25.059Z |
| `password_reset_token` | str | sim | it3n91yedk6a55ew9p3dk |
| `phone` | str | não | 21920074474 |
| `points` | float, int | não | 0 |
| `primary_career_level` | str | não | licenciado_catalogo |
| `profile_photo_url` | NoneType | sim |  |
| `recruited_by_id` | str | sim | 68db0ff2c19838a827fb6e5f |
| `referral_code` | str | sim | beatriz-santanna |
| `referred_by_id` | str | sim | 68db0ff2c19838a827fb6e5f |
| `role` | str | não | licensee |
| `saldo_alocado` | float, int | não | 0 |
| `saldo_disponivel` | float, int | não | 0 |
| `store_name` | str | sim | Beatriz Santanna |
| `terms_accepted` | bool | não | True |
| `total_bids` | float, int | não | 0 |
| `total_commissions_generated` | float, int | não | 0 |
| `total_operation_fee_percentage` | float, int | sim | 0 |
| `updated_date` | str | não | 2026-05-16T01:01:43.150000 |
| `won_auctions` | float, int | não | 0 |

### `FinancialExpense` (35 registros, 23 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|
| `amount` | float | não | 18000.0 |
| `amount_paid` | float | não | 0.0 |
| `category` | str | não |  |
| `company` | str | não |  |
| `created_by` | str | não | luizsantanna@tttcorporate.com |
| `created_by_id` | str | não | 68d536db3c26ff51f79c4138 |
| `created_date` | str | não | 2026-05-04T22:33:08.572000 |
| `description` | str | não | ALUGUEL NOVO APARTAMENTO  |
| `due_date` | str | não | 2026-05-18 |
| `expense_type` | str | não | fixo |
| `id` | str | não | 69f91ea42f1cd392b38f8978 |
| `installment_current` | NoneType | sim |  |
| `installment_total` | NoneType | sim |  |
| `interest_amount` | float | não | 0.0 |
| `is_sample` | bool | não | False |
| `notes` | str | não |  |
| `payment_date` | str | não |  |
| `payment_method` | str | não | pix |
| `payment_status` | str | não | pendente |
| `pix_or_card_info` | str | não |  |
| `recurring_day` | float | sim | 8.0 |
| `total_amount` | float | não | 18000.0 |
| `updated_date` | str | não | 2026-05-04T22:33:08.572000 |

### `Seller` (32 registros, 14 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|
| `created_by` | str | não | anonymous |
| `created_by_id` | str | não | anonymous |
| `created_date` | str | não | 2026-04-03T10:40:14.662000 |
| `default_commission_percentage` | float, int | sim | 13.0 |
| `default_licenciante_commission_percentage` | float, int | sim | 0.0 |
| `email` | str | não |  |
| `id` | str | não | 69cf990e2a974845c0687494 |
| `is_active` | bool | não | True |
| `is_sample` | bool | não | False |
| `license_type` | str | sim | loja_inicial |
| `name` | str | não | LIVIA BARBOSA (LICENCIADA) |
| `phone` | str | não |  21 98158-0217 |
| `referred_by_id` | NoneType | sim |  |
| `updated_date` | str | não | 2026-04-03T10:40:14.662000 |

### `BannerImage` (14 registros, 14 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|
| `context` | str | sim | home |
| `created_by` | str | não | luizsantanna@tttcorporate.com |
| `created_by_id` | str | não | 68d536db3c26ff51f79c4138 |
| `created_date` | str | não | 2026-01-15T05:56:37.435000 |
| `device_type` | str | sim | desktop |
| `id` | str | não | 69688195d6fc0a732c925fbf |
| `image_adjustments` | NoneType | sim |  |
| `image_url` | str | não | https://base44.app/api/apps/68d536db3c26ff51f79c4137/files/m |
| `is_active` | bool | não | True |
| `is_sample` | bool | não | False |
| `link_url` | str | não |  |
| `order` | float | não | 1.0 |
| `title` | str | não |  |
| `updated_date` | str | não | 2026-03-24T20:53:20.659000 |

### `DepositPackage` (5 registros, 11 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|
| `amount` | float | não | 500.0 |
| `bonus_percentage` | float, int | não | 8 |
| `created_by` | str | não | luizsantanna@tttcorporate.com |
| `created_by_id` | str | não | 68d536db3c26ff51f79c4138 |
| `created_date` | str | não | 2025-12-07T20:27:46.632000 |
| `id` | str | não | 6935e342c17729dac0c0451c |
| `is_active` | bool | não | True |
| `is_sample` | bool | não | False |
| `label` | str | não | Depósito R$ 500 |
| `sort_order` | int | não | 3 |
| `updated_date` | str | não | 2026-02-17T12:11:11.030000 |

### `Store` (4 registros, 22 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|
| `address` | str | não | Avenida das Américas, 3500 |
| `can_create_arremate_devolucoes` | bool | não | False |
| `can_create_direto_fabrica` | bool | não | False |
| `can_create_sai_de_baixo` | bool | não | False |
| `cnpj` | str | não |  |
| `created_by` | str | não | luizsantanna@tttcorporate.com |
| `created_by_id` | str | não | 68d536db3c26ff51f79c4138 |
| `created_date` | str | não | 2026-02-02T20:13:13.442000 |
| `distribution_channels` | list | não | [] |
| `email` | str | não | jonhhenrique17@gmail.com |
| `id` | str | não | 698105599ff706c92019474d |
| `is_sample` | bool | não | False |
| `logo_url` | str | não | https://base44.app/api/apps/68d536db3c26ff51f79c4137/files/p |
| `notes` | str | não |  |
| `owner_name` | str | não | ShopMix |
| `phone` | str | não | 21966629605 |
| `product_types` | list | não | [] |
| `status` | str | não | active |
| `store_login` | str | não | shopMix |
| `store_name` | str | não | Grupo ShopMix |
| `store_password` | str | não | L2026 |
| `updated_date` | str | não | 2026-02-02T20:13:13.442000 |

### `Customer` (4 registros, 28 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|
| `address_city` | str | não |  |
| `address_number` | str | não |  |
| `address_state` | str | não |  |
| `address_street` | str | não |  |
| `address_zip_code` | str | não |  |
| `assigned_seller` | str | sim | LUCIANO |
| `cpf` | str | não |  |
| `created_by` | str | não | anonymous |
| `created_by_id` | str | não | anonymous |
| `created_date` | str | não | 2026-03-05T14:52:17.835000 |
| `email` | str | não |  |
| `follow_up_date` | str | sim | 2026-03-02 |
| `full_name` | str | não | KAREN VIANA |
| `id` | str | não | 69a998a1a3266afbf0692237 |
| `interested_products` | list | não | [] |
| `is_sample` | bool | não | False |
| `last_contact` | str | não | 0001-01-01 |
| `next_steps` | str | sim | LICENCIADA 50.000 |
| `notes` | str | não | LICENCIADA PARA 50.000 E ESTAMOS EM NEGOCIAÇÃ0 PARA QUE O ES |
| `phone` | str | não | 21993435251 |
| `purchase_product` | str | sim |  |
| `purchase_status` | str | não | em_negociacao |
| `purchase_value` | float, int | não | 50000.0 |
| `source` | str | não | indicacao |
| `status` | str | não | lead |
| `total_purchases` | float, int | não | 0.0 |
| `total_spent` | float, int | não | 0.0 |
| `updated_date` | str | não | 2026-03-05T15:03:27.994000 |

### `LuxuryAccessCode` (3 registros, 16 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|
| `code` | str | não | T4H7BYBX |
| `created_by` | str | não | anonymous |
| `created_by_id` | str | não | anonymous |
| `created_date` | str | não | 2026-02-02T18:53:32.233000 |
| `email` | str | não | jonhhenrique29@hotmail.com |
| `id` | str | não | 6980f2ac0355cb05f88238ca |
| `is_active` | bool | não | True |
| `is_sample` | bool | não | False |
| `is_single_use` | bool | não | False |
| `is_used` | bool | não | True |
| `label` | str | não | Teste |
| `person_name` | str | não | Jonathan Henrique  |
| `updated_date` | str | não | 2026-02-24T01:02:19.595000 |
| `used_at` | str | não | 2026-02-24T01:02:19.482Z |
| `used_by_user_id` | NoneType | sim |  |
| `whatsapp` | str | não | 2196660296 |

### `FeaturedProduct` (3 registros, 13 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|
| `category` | str | não | Eletrônicos |
| `created_by` | str | não | luizsantanna@tttcorporate.com |
| `created_by_id` | str | não | 68d536db3c26ff51f79c4138 |
| `created_date` | str | não | 2026-01-03T14:43:45.293000 |
| `expected_return` | str | não | R$ 150.00 |
| `id` | str | não | 69592b2162fb9f54f996e636 |
| `image_url` | str | não | https://base44.app/api/apps/68d536db3c26ff51f79c4137/files/p |
| `investment` | str | não | R$ 5.000,00 |
| `is_active` | bool | não | True |
| `is_sample` | bool | não | False |
| `name` | str | não | Tudo para o seu dia a dia! |
| `order` | float | não | 0.0 |
| `updated_date` | str | não | 2026-01-03T15:05:29.556000 |

### `CatalogSettings` (1 registros, 8 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|
| `created_by` | str | não | luizsantanna@tttcorporate.com |
| `created_by_id` | str | não | 68d536db3c26ff51f79c4138 |
| `created_date` | str | não | 2026-01-29T19:56:23.664000 |
| `featured_section_description` | str | não | TESTE |
| `featured_section_title` | str | não | ⭐ Produtos em Destaque |
| `id` | str | não | 697bbb671b270afc665d7f50 |
| `is_sample` | bool | não | False |
| `updated_date` | str | não | 2026-01-29T19:56:49.469000 |

### `WithdrawalRequest` (0 registros, 0 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|

### `WalletTransaction` (0 registros, 0 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|

### `Wallet` (0 registros, 0 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|

### `SystemLog` (0 registros, 0 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|

### `SaleCommission` (0 registros, 0 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|

### `Sale` (0 registros, 0 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|

### `ProductOperation` (0 registros, 0 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|

### `PricingFormula` (0 registros, 0 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|

### `PriceHistory` (0 registros, 0 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|

### `PaymentSettings` (0 registros, 0 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|

### `Payment` (0 registros, 0 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|

### `PartnerPlanPurchase` (0 registros, 0 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|

### `Negotiation` (0 registros, 0 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|

### `LuxuryAuction` (0 registros, 0 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|

### `LoteRecebido` (0 registros, 0 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|

### `LicenseeLead` (0 registros, 0 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|

### `InfluencerPurchase` (0 registros, 0 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|

### `InfluencerLead` (0 registros, 0 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|

### `FreteSettings` (0 registros, 0 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|

### `FooterSettings` (0 registros, 0 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|

### `FavoriteAuction` (0 registros, 0 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|

### `DigitalWalletTransaction` (0 registros, 0 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|

### `DigitalWallet` (0 registros, 0 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|

### `CatalogSale` (0 registros, 0 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|

### `CashRegister` (0 registros, 0 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|

### `Bid` (0 registros, 0 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|

### `BatchRegistration` (0 registros, 0 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|

### `AuctionView` (0 registros, 0 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|

### `AsaasPayment` (0 registros, 0 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|

### `Arrematante` (0 registros, 0 campos)

| Campo | Tipo (inferido) | Nullable | Sample |
|---|---|---|---|

## Entidades vazias (sem dados em prod)

Provavelmente tabelas legacy ou nunca usadas. Migrar schema mesmo assim:

`Arrematante`, `AsaasPayment`, `AuctionView`, `BatchRegistration`, `Bid`, `CashRegister`, `CatalogSale`, `DigitalWallet`, `DigitalWalletTransaction`, `FavoriteAuction`, `FooterSettings`, `FreteSettings`, `InfluencerLead`, `InfluencerPurchase`, `LicenseeLead`, `LoteRecebido`, `LuxuryAuction`, `Negotiation`, `PartnerPlanPurchase`, `Payment`, `PaymentSettings`, `PriceHistory`, `PricingFormula`, `ProductOperation`, `Sale`, `SaleCommission`, `SystemLog`, `Wallet`, `WalletTransaction`, `WithdrawalRequest`
