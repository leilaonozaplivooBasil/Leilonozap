# Leilão NoZap — Resumo Completo do Projeto

> Documento gerado em 17/08/2026. Reflete o estado atual do banco de dados (entidades) e da árvore de arquivos do frontend. Uso interno — atualizar sempre que schemas ou estrutura de pastas mudarem significativamente.

---

## 1. VISÃO GERAL

**Missão:** plataforma de leilões online diários via WhatsApp, com lances em tempo real, carteira digital, sistema de comissões multinível (licenciados/vendedores/parceiros), catálogo de loja virtual e integrações de pagamento (Mercado Pago / ASAAS).

**Stack:** React + Tailwind + Vite (frontend) · Base44 (Deno functions) + Supabase Postgres (backend/dados reais) · Mercado Pago / ASAAS (pagamentos) · Melhor Envio / Correios (frete).

---

## 2. ENTIDADES / TABELAS — SCHEMA COMPLETO

> Campos padrão automáticos em toda entidade (não declarados): `id`, `created_date`, `updated_date`, `created_by_id`.

### 2.1 Usuários e Acesso

**AppUser** (usuário principal do app — todos os papéis)
`full_name, nickname, store_name, email, password, phone, cpf, pix_key, pix_key_type(CPF/CNPJ/EMAIL/PHONE/RANDOM), points, total_bids, won_auctions, avatar_color, avatar_url, profile_photo_url, terms_accepted, role(user/admin/super_admin/licensee/investidor/leiloeiro/arrematante), enabled_panels[], referral_code, referred_by_id, recruited_by_id, is_seller, seller_credit_balance, test_wallet_balance, indicated_clients_count, network_bids_count, commission_balance, total_commissions_generated, career_levels[], primary_career_level, display_first_name, display_last_name, address_* (street/number/complement/neighborhood/city/state/zip_code), catalog_commission_balance, catalog_total_commissions_generated, active_partner_plan, partner_plan_amount, partner_plan_activated_at, saldo_disponivel, saldo_alocado, password_reset_token/expires, access_token/expires, arrematante_commission_percentage, total_operation_fee_percentage, arrematante_responsavel_id, licenciado_context{enabled, commission_balance, total_commissions_generated, career_level, referral_code}, arrematante_context{enabled, saldo_disponivel, saldo_alocado, total_bids, won_auctions, commission_percentage}`

**Seller** — `name, phone, email, license_type(loja_inicial/loja_start/loja_profissional/loja_lider/loja_distribuidor), is_active, referred_by_id, default_commission_percentage, default_licenciante_commission_percentage`

**Store** — `store_name, owner_name, email, phone, cnpj, address, product_types[], distribution_channels[](sai_de_baixo/direto_fabrica/arremate_devolucoes), can_create_sai_de_baixo, can_create_direto_fabrica, can_create_arremate_devolucoes, store_login, store_password, logo_url, status(pending/active/inactive), notes`

**Arrematante** (cadastro simplificado leiloeiro) — `full_name, cpf, city, state, email, phone, pix_key, pix_key_type(cpf/email/telefone/aleatoria), is_active, notes`

**UserPreference** — `user_id, preferred_categories[], price_range_min/max, preferred_source(all/factory_new/return_resale), parceiro_demo_inicio`

**LiveSession** — `session_id, user_id, last_heartbeat, page, user_agent`

### 2.2 Leilões

**Auction** — `title, description, image_urls[], starting_price, current_price, increment, buy_now_price, end_time, modo_chamada, data_abertura_lances, status(active/ended/sold/processing), lot_status(importado/em_analise/publicado/autorizado/aguardando_pagamento/pagamento_confirmado/arrematado/finalizado/cancelado), winner_id, winner_name, category(enum setores), seller_id/name, last_processed_bid_time, order_status(awaiting_payment/paid/shipped/delivered/canceled), tracking_code, source_url, market_price, last_comparison_date, product_source(factory_new/return_resale), supplier_logo_url, is_test_auction, comparai_mode(supplier/google_shopping), manual_market_price, partner_store(nozap/sai_de_baixo), product_id, allowed_regions[], is_investment_plan, last_updated, version, partner_id/name, partner_commission_percentual, platform_commission_percentual, commissions_distributed, lot_categories_json, lot_items_json, lot_grades_json, lot_raw_items_json, reserved_by/until/by_name, frete_reservado_valor`

**AuctionMessage** — `auction_id, sender_id, message_type(bid/ai_narration/countdown/winner_announcement/start/reminder), content, sender_name, bid_amount, timestamp, is_system_message, countdown_phase(1/2/3), frete_amount`

**Bid** — `auction_id, bidder_name, amount, timestamp, is_auto_increment`

**AuctionView** — `user_id, auction_id, view_count, last_viewed, category, interacted`

**FavoriteAuction** — `user_id, auction_id, context(nozap/sai_de_baixo)`

**LuxuryAuction** — `title, description, image_urls[], price, starting_price, increment, buy_now_price, end_time, status(active/hidden)`

**LuxuryAccessCode** — `code, label, person_name, email, whatsapp, is_active, is_single_use, is_used, used_by_user_id, used_at`

**LanceAutorizado** — `investidor_id/email/nome, auction_id, auction_title, modelo(individual/compartilhado), valor_maximo_autorizado, percentual_compartilhado, taxa_operacao_percentual, valor_taxa_operacao, valor_capital_liquido, deposito_confirmado, status_autorizacao(pendente/confirmada/cancelada/concluida), data_autorizacao/conclusao, observacoes`

### 2.3 Financeiro / Carteira Digital

**DigitalWallet** — `user_id, balance (livre), held_balance (reservado em lances)`

**DigitalWalletTransaction** — `user_id, type(deposit/auction_payment/refund/adjustment/bid_hold/bid_release/auction_settlement/auction_refund), direction(credit/debit), amount, related_auction_id, related_message_id, related_payment_id, status(pending/confirmed/failed/released/settled/refunded), description`

**Wallet** (legado) — `user_id, balance`

**WalletTransaction** (legado) — `user_id, type(deposit/purchase/refund/adjustment), direction(credit/debit), amount, related_auction_id, status(pending/confirmed/failed), description`

**BalanceTransfer** — `sender_id/name, receiver_id/name, amount, note, status(pending/completed/failed)`

**WithdrawalRequest** — `influencer_id, amount, status(pending/approved/rejected/processing/completed/failed), pix_key, pix_key_type(CPF/CNPJ/EMAIL/PHONE/RANDOM), recipient_name/document, processed_by/date, transaction_id, notes`

**DepositPackage** — `label, amount, is_active, sort_order, bonus_percentage`

### 2.4 Pagamentos / Gateways

**MercadoPagoPayment** — `auction_id, product_id, catalog_sale_id, user_id, preference_id, payment_id, amount, status(pending/approved/rejected/cancelled/refunded), payment_method, external_reference, buyer_address, deposit_type(digital_wallet/seller_adhesion)`

**AsaasPayment** — `payment_id, customer_id, billing_type(PIX/BOLETO/CREDIT_CARD), value, status(pending/confirmed/received/failed/refunded), external_reference, catalog_sale_id, auction_id, wallet_deposit_user_id, is_wallet_deposit, is_investor_capital, partner_plan_code, partner_licensee_id, buyer_id/name/email/cpf, pix_qr_code, pix_payload, boleto_url, invoice_url, due_date, payment_date, webhook_event_id`

**Payment** (legado) — `auction_id, buyer_id/name/email, amount, payment_method(pix/credit_card/gateway), status(pending/paid/failed/refunded), transaction_id, gateway_name, pix_code, payment_date, notes`

**PaymentSettings** — `gateway_name(stripe/mercadopago/pagarme/asaas/manual/generic_http), gateway_type, base_url, payment_endpoint, http_method, headers_json, api_key, webhook_secret, reference_field, status_field_path, approved_status_value, is_active, pix_key, pix_key_type, bank_account, wallet_enabled, wallet_deposit_message, wallet_insufficient_message, wallet_max_balance`

**PaymentTrackingLog** — `payment_id, product_id, buyer_id, licensee_id, referral_code, catalog_sale_id, mercadopago_payment_id, amount, status(pending/approved/rejected/refunded), stage(checkout_started/sale_created/preference_created/payment_approved/commissions_processed/completed), event_log[], commissions_distributed[], gateway(mercadopago/asaas/manual), notes`

**WebhookLog** — `provider, event_type, resource_id, headers, body, signature_valid, processed, error`

**MelhorEnvioToken** — `ambiente(sandbox/producao), access_token, refresh_token, expires_at, obtido_em, escopos, ativo`

**FreteSettings** — `client_id, client_secret, cep_origem, comprimento/altura/largura/peso_padrao, servico_pac, servico_sedex, token_cache, token_expiry`

**EventQueue** — `event_type(performance), source_gateway(asaas/mercadopago/internal), source_payment_id, source_entity_type(CatalogSale/Auction/WalletDeposit/PartnerPlan), source_entity_id, status(queued/sending/sent/failed/dead), payload, retry_count, max_retries, last_error, sent_at, next_retry_at, request_id`

### 2.5 Catálogo / Loja Virtual

**CatalogSale** — `product_id, product_title, product_image, sale_price, quantity, total_amount, buyer_id/name/email/phone, licensee_id/name/plan, referred_by_code, referral_code, seller_name/id, status(pending_payment/paid/shipped/delivered/canceled), payment_confirmed_date, asaas_payment_id, tracking_code, shipped_date, delivered_date, commission_processed, commission_amount`
> ⚠️ status usa `canceled` (uma letra L) — atenção ao comparar strings no frontend/functions.

**CatalogSettings** — `featured_section_title, featured_section_description`

**CatalogVisit** — `licensee_id, referral_code, page, user_agent, session_id, visited_at`

**FeaturedProduct** — `name, category, investment, expected_return, image_url, order, auction_id, is_active`

**BannerImage** — `image_url, title, link_url, context(home/catalog/luxurycollection), order, is_active, device_type(desktop/mobile), image_adjustments{position{x,y}, scale}`

**Category** — `name, parent_category_id/name, is_active, sort_order`

### 2.6 Estoque / Produtos / Lotes

**Product** — `date, lot, description, image_urls[], quantity, qty_perfeito/bom/ruim/oficina, quantity_sold, cost_price, selling_price_retail/wholesale, price_auction_start, price_buy_now, price_catalog, catalog_active, is_featured, status(ESTOQUE/VENDIDO PIX/VENDIDO DINHEIRO/CONSERTO/BRINDE VENDEDOR), sold_amount, profit, notes, purchase_order, deposit_name(Bangu/Oficina/Recreio), peso/comprimento/altura/largura, linked_auctions[], pricing_formula_id, market_value, calculated_price, discount_percentage, last_dynamic_update`

**ProductOperation** — `product_id/description, operation_type(zerar_estoque/excluir_produto), operator_name, reason, operation_date`

**LoteRecebido** — `nome_lote, marketplace(enum marketplaces), arquivo_url/nome/tipo, status(recebido/em_analise/comprado/convertido/enviado_ao_estoque/cancelado), valor_lote, observacoes, data_recebimento, itens_json, quantidade_total, valor_mercado_total, valor_arremate, custo_total, taxa_pct, frete, outros, local_coleta, origem, categorias_json, grades_json, produtos_gerados(+em/count), deposito_destino(Bangu/Oficina/Recreio), publicado_parceiro, data_leilao, lance_entrada, frete_oportunidade, vagas, observacao_parceiro`

**BatchRegistration** — `numero_leilao, nome_origem, lotes[{numero_lote, produtos[{codigo,descricao,variacao,quantidade}], valor_lote}], valor_total, total_produtos, custo_por_unidade, status(pendente/convertido), recibo_url, data_lancamento`

**PriceHistory** — `product_id/description, old_price, new_price, old_market, new_market, variation_percent, trigger_type(auto_traffic/manual_single/manual_batch/scheduled), sessions_active, floor_applied, source_url`

**PricingFormula** — `name, description, base_percentage, commission_percentage, tax_percentage, is_active`

**GiroVendaAoVivo** — `seed, data_local, dia_ciclo, indice, hora_real`

### 2.7 Comissões / Rede / Carreira

**CommissionRecord** — `sale_id, sale_type(auction/catalog), user_id/name, role, percent, amount, sale_amount, product_title, anchor_user_id/name, status(pending/confirmed/paid/canceled)`

**SaleCommission** — `sale_id, seller_id/name, seller_role(licenciado/licenciante), commission_type(percentage/fixed), commission_value, commission_amount`

**LicensePlan** — `plan_code(kit_catalogo/kit_start/plano_lider/plano_lojista/plano_distribuidor), plan_name, commission_rate, description, benefits[], price, active, sort_order`

**PartnerPlanPurchase** — `user_id/name/email, plan_name, plan_amount, activated_at, status(active/completed/canceled), purchase_periods[{period,date,status}], activation_source(manual/lucre_conosco), is_investment, investment_rate(3/5), accumulated_return, withdrawal_available_date, notes`

**InfluencerLead** — `influencer_id/name/code, lead_email/user_id/name, total_purchases, total_spent, first/last_purchase_date, status(pending/registered/active_buyer)`

**InfluencerPurchase** — `influencer_id, lead_user_id, auction_id, product_title, amount, purchase_date, partner_store`

### 2.8 CRM / Leads / Vendas Físicas (PDV)

**Customer** — `full_name, email, phone, cpf, status(lead/cliente/inativo), source(site/indicacao/whatsapp/redes_sociais/outro), notes, address_*, total_purchases, total_spent, last_contact, assigned_seller, purchase_status(sem_compra/em_negociacao/aguardando_pagamento/pago/enviado/entregue/cancelado), next_steps, purchase_value/product, follow_up_date, interested_products[]`

**LicenseeLead** — `nome, email, telefone, status_lead(lead/ativo/inativo), status_negociacao(mesmo enum de purchase_status), origem(site/indicacao/whatsapp/instagram/outro), valor_negociado/fechado, ultimo_contato, proximo_followup, probabilidade_fechamento, observacoes, historico_interacoes[]`

**Negotiation** — `customer_id/name, seller_id/name, items[{product_id,product_name,quantity,table_price,negotiated_price,discount_percent,subtotal}], total_value, status(em_andamento/fechada/perdida), notes, closed_date/by`

**Sale** — `order_code, product_id/description/lot, quantity_sold, unit_price, total_amount, total_taxes, net_amount, product_cost, payment_method(PIX/DINHEIRO/CARTÃO DÉBITO/CARTÃO CRÉDITO/BOLETO PARCELADO), receiving_bank(santander/itau/nubank), sale_date/datetime, operator_name, seller_id/name, commission_type(percentage/fixed), commission_value/amount, boleto_cliente/documento/parcelas`

**CashRegister** — `status(open/closed), operator_name, opening/closing_time, opening/closing_balance, total_sales/pix/cash/debit/credit/boleto, transactions_count, notes`

### 2.9 Financeiro Administrativo

**FinancialExpense** — `description, company, category, expense_type(fixo/unico/parcelado), amount, interest_amount, total_amount, due_date, payment_method(pix/cartao_credito/cartao_debito/boleto/transferencia/dinheiro), pix_or_card_info, payment_status(pendente/pago_integral/pago_parcial/vencido/cancelado), amount_paid, payment_date, installment_current/total, notes, recurring_day`

**TaxSettings** — `icms_rate, pis_rate, cofins_rate, irpj_rate, csll_rate, iss_rate, profit_presumption_rate, is_active`

### 2.10 Sistema / Auditoria / Integrações

**SystemLog** — `entity_id, component_name, step, status(success/error/warning/info/performance/component_lifecycle/api_call/db_query/user_action), message, error_details, user_agent, is_mobile, url, execution_time_ms, payload`

**ComparaiLog** — `auction_id, step, status(success/error/warning), message, error_details, user_agent, is_mobile`

**ComparaiCache** — `auction_id, mode(supplier/google_shopping), result, expires_at`

**MetricSnapshot** — `snapshot_time, metrics, period_minutes`

**OAuthToken** — `provider, code, access_token, refresh_token, expires_at, state, user_id, status(pending/active/expired/revoked)`

**SyncState** — `sync_token, last_sync` (sync incremental com Google Calendar)

**FooterSettings** — `address, phone, whatsapp, email, facebook/instagram/youtube/linkedin/twitter_url, is_active`

**User** (built-in da plataforma) — apenas leitura: `id, created_date, full_name, email`; editável: `role`.

---

## 3. ÁRVORE DE ARQUIVOS DO FRONTEND (src/)

```
src/
├── App.jsx                          # Router principal (todas as rotas)
├── Layout.jsx                       # Layout global (nav, footer, modais globais)
├── Layout.css
├── index.css                        # Design tokens (cores, temas)
├── main.jsx
├── pages.config.jsx
│
├── api/
│   ├── base44Client.js              # SDK inicializado
│   ├── base44Adapter.js
│   └── supabaseClient.js
│
├── pages/                            # ~150 páginas (uma por rota)
│   ├── Recepcao.jsx                 # Landing "/"
│   ├── Home.jsx                     # Leilões "/leiloes"
│   ├── Catalog.jsx                  # Loja Virtual
│   ├── AuctionRoom.jsx               # Sala de leilão em tempo real
│   ├── AuctionDetails.jsx / EditAuction.jsx / CreateAuction.jsx / CreateAuctionV2.jsx
│   ├── Cart.jsx / Checkout.jsx / CatalogCheckout2.jsx / AuctionCheckoutModern.jsx
│   ├── Carteira.jsx / AddFunds.jsx / WalletHistory.jsx / TransferirSaldo.jsx
│   ├── Profile.jsx / Register.jsx / RegisterLicensee.jsx / RegisterBatches.jsx
│   ├── AcessoArrematante.jsx / AcessoVendedor.jsx / AcessoParceiro.jsx
│   ├── Portal.jsx + portal/ (PortalArrematante, PortalLojaVirtual, PortalLicenciado,
│   │                          PortalLojista, PortalVendedor, PortalInvestidor, PortalLeiloeiro)
│   ├── Licensing.jsx / Partners.jsx / SejaLicenciado.jsx / SejaVendedor.jsx / Lucre.jsx
│   ├── PainelDistribuidor.jsx / PedidosDistribuidor.jsx / TirarPedido.jsx / MeuEstoque.jsx
│   ├── ComprarEstoque.jsx / GestaoMetas.jsx / SellerPanel.jsx / VendedorCheckout.jsx
│   ├── VendedorEscolherProdutos.jsx
│   ├── CRMInvestidores.jsx / CarteiraInvestidor.jsx / CadastroInvestidor.jsx
│   ├── MarketplaceLotes.jsx / AnaliseDeLotes.jsx / GestaoLotes.jsx / EstoqueLotes.jsx
│   ├── AnaliseLoteEstoque.jsx / VisualizarLote.jsx / ParceiroLotes.jsx / AportesParceiro.jsx
│   ├── SistemaDeArremate.jsx / CadastroLeiloeiro.jsx / PainelArrematante.jsx
│   ├── AdminFinanceiro.jsx / Financial.jsx / PagamentosComissoes.jsx / AdminWithdrawals.jsx
│   ├── AdminDepositosConfirmados.jsx / AdminLancesAutorizados.jsx / AdminConsignado.jsx
│   ├── AdminCreditoTeste.jsx / AdminUsers.jsx / UserManagement.jsx
│   ├── CatalogOrdersAdmin.jsx / CuponsAdmin.jsx / AdminCatalogSales.jsx
│   ├── ProductManagement.jsx / CatalogManagement.jsx / CreateCatalogProduct.jsx
│   ├── EditCatalogProduct.jsx / AddCatalogProduct.jsx / CatalogProductDetails.jsx
│   ├── ImageOptimizer.jsx / BannerManagement.jsx / LuxuryBannerManagement.jsx
│   ├── LuxuryAccessManager.jsx / LuxuryCollection.jsx / CreateLuxuryAuction.jsx
│   ├── SentinelNoZap.jsx / HeloimIA.jsx / ArquitetoIA.jsx / CommissionPilot.jsx
│   ├── PrecificaVivoPainel.jsx / SuperAdminPanels.jsx / SystemDiagnostics.jsx
│   ├── AuditoriaCadastros.jsx / AuditSnapshot.jsx / SystemChecklist.jsx
│   ├── ProtecaoCriacao.jsx / ProtectionDashboard.jsx / MemoryBackup.jsx
│   ├── Evoluir.jsx / ComoFunciona.jsx / PassaporteLances.jsx / ConcursoLeilaoNozap.jsx
│   ├── LojaVitrine.jsx / LojistaDashboard.jsx / CRM.jsx / LicensorCRM.jsx
│   ├── InfluencersDashboard.jsx / ActivePartners.jsx / PartnerPlanActivation.jsx
│   ├── LiveShop.jsx / LiveShopNoZap.jsx / LiveShopControlNoZap.jsx
│   ├── DiretoDeFabrica.jsx / ArremateDevolucoes.jsx / StockPosition.jsx
│   ├── MyWinnings.jsx / MyCatalogOrders.jsx / CatalogOrderTracking.jsx / OrderTracking.jsx
│   ├── CommissionDistributionFull.jsx / CareerLevelsReport.jsx
│   ├── IntegracaoMelhorEnvio.jsx / ShippingSettings.jsx / PaymentSettings.jsx
│   ├── TransactionHistory.jsx / DailyReportView.jsx / DossieArremate.jsx
│   ├── FalarComParceiro.jsx / TesteLeilao.jsx / AmbienteDeTeste.jsx / StressTest.jsx
│   ├── ForgotPassword.jsx / ResetPassword.jsx
│   ├── PrivacyPolicy.jsx / TermsOfUse.jsx / Landing.jsx
│   ├── LicenseeOrders.jsx / CustomerDetails.jsx / AuctionControl.jsx / StoreRegistration.jsx
│   ├── ProductOperationHistory.jsx / PromoCreator.jsx
│   └── NetworkOverview.jsx           # Painel de Controle / Árvore genealógica
│
├── components/                       # ~400 componentes, organizados por domínio
│   ├── ui/                          # shadcn/ui (button, input, dialog, select, table, ...)
│   ├── common/                      # LoginModal, ShareAppModal, RequireRole, HomeGate,
│   │                                  NavegacaoLateralGlobal, Footer, BackToTopButton, ...
│   ├── nav/                         # NavDesktop, NavMobile, dropdowns/, UserAvatarMenu, ...
│   ├── auction/                     # BidInput, AuctionCard, FeedUltimosLances, WinnerModal, ...
│   ├── wallet/                      # WalletDrawer, GlobalWalletDrawer, CarteiraFlutuante, ...
│   ├── catalog/                     # CatalogProductCard, CatalogOrderCard, OrderItemsChecklist, ...
│   ├── cart/                        # CartPopup, FreteResumo, CarrinhoEntrega, ...
│   ├── payment/                     # PaymentConfirmationPopup, SelecaoParcelas, ...
│   ├── loja/                        # LojaCheckout, LojaFloatActions, LeilaChat, ...
│   ├── licensing/                   # ~30 componentes do painel de Alavancagem
│   ├── licensee/ licensees/         # LicenseeFormModal, LicenseeEarningsCalculator, ...
│   ├── sellers/                     # SellerFormModal, SellerSalesTable, ...
│   ├── network/                     # ConversionBox, TreeHierarchy, NetworkFinanceBadges, ...
│   ├── painel/                      # MinhaArvoreRede, RankingDia, VendasAuditoria, ...
│   ├── parceiro/                    # ~80 componentes (captação privada + painel completo)
│   │   └── painel/                 # linha/, oportunidades/, contrato/, contas/, analisador/
│   ├── lotes/                       # ImportarLotesModal, GradeItemsModal, ReservaLoteModal, ...
│   ├── batches/                     # BatchCard, BatchLoteDetail
│   ├── admin/                       # PageFullscreen, MiniCanvasOverview, CanvasOverview, ...
│   ├── financial/                   # FinancialDashboard, ExpenseTable, PaymentModal, ...
│   ├── crm/                         # CadastroInvestidorModal, NegotiationsList, ...
│   ├── licensee-crm/                # LicenseeCRM, LeadTable, LeadFormModal, ...
│   ├── vendedor/                    # VendedorCartBar, VendedorAddressForm, ...
│   ├── pdv/                         # NotaPedido, PixPdvModal, DailyReportPDF, ...
│   ├── estoque/                     # AbasEstoque, PedirConsignado
│   ├── reposicao/                   # VitrineReposicao, PixReposicaoModal, ...
│   ├── consignado/                  # ConsignadoCard
│   ├── frete/                       # CalculadoraFrete, OpcaoFreteCard, useFrete.js
│   ├── comparai/                    # CompareAquiModal, CompareAquiFloatingButton, ...
│   ├── comissoes/ commissions/       # ComissaoUsuarioCard, ExtratoComissoes
│   ├── passaporte/                  # CartaoPassaporte, BeneficiosPassaporte, ...
│   ├── promo/                       # PromoCustomizer + templates/ (Spotlight, Diagonal, ...)
│   ├── pricing/                     # PriceCalculatorModal, GoogleShoppingModal, ...
│   ├── precificavivo/               # CatalogSyncCard
│   ├── liveshop/ livoo/             # LiveShopHeader, LivooPlayer, EntrarAoVivo, ...
│   ├── luxury/                      # LuxuryCard, GoldDiamondRain
│   ├── concurso/                    # HeroRankPremiado, PlacaRankPremiado, WinnersFeed, ...
│   ├── recepcao/                    # HeroRecepcao, SetoresClean, BlocoRede, ...
│   ├── home/                        # HeroBannerLeiloes, HeroAcoesLeiloes, LiveStats, ...
│   ├── portal/                      # PortalCardGrid, PainelSelector, LandingHero, ...
│   ├── legal/                       # TermoGateGlobal, TermoAdesaoModal, ...
│   ├── notifications/               # TransactionToasts, ReferralSignupToast
│   ├── recommendations/             # RecommendedSection, FavoriteButton, ViewTracker
│   ├── system/                      # GlobalMonitor, ErrorBoundary, useActiveSession, ...
│   ├── chat/                        # AIMessage, PlacaLance, VictoryCard, ...
│   ├── layout/                      # AdminTopNav, RoleSidebar
│   ├── superadmin/                  # UserPanelEditor
│   ├── arrematante/                 # ResumoCards, ExtratoLances, usePainelArrematante.js
│   ├── seller/                      # SellerEarningsCalculator
│   ├── lojista/                     # CatalogHome, CatalogOrders, LojistaDashboard*
│   ├── dev/                         # DevLogoutButton
│   ├── hooks/                       # useSecureRole.jsx
│   └── utils/                       # date.jsx
│
├── hooks/                            # useOnlineStatus, useAuctionSync, useCopiarPix,
│                                       usePixAporteStatus, useOcultarAoRolar, useAppVersion, ...
│
├── lib/                              # AuthContext, referral.js, careerLevels.js, money.js,
│                                       fastTap.js, adminMenu.js, termoAdesao.js, sentry.js,
│                                       analytics.js, cicloParceiro.js, PageNotFound.jsx, ...
│
├── functions/                        # Wrappers client-side para backend functions
│                                       (askAgente, comparaiPrices, getPartnerPurchases, ...)
│
├── entities/                          # Modelos legados client-side (ComparaiLog, Auction,
│                                       User, AppUser, LoteCota, AuctionMessage, SystemLog)
│
├── utils/                            # index.ts, CommissionAuditRules.js
│
└── docs/                             # HANDOFF-SKILLS.md, VERDADE.md,
                                        PROGRESSO_PADRONIZACAO_PAINEIS.md, ...
```

### Backend (fora de `src/`)

```
base44/
├── entities/         # ~60 arquivos .jsonc (schemas — ver seção 2)
├── functions/        # ~200+ Deno functions (entry.ts) — pagamentos, comissões,
│                       carteira, leilões, catálogo, auditorias, IA (Leila), etc.
└── agents/           # leila_atendente.jsonc, senior_master.jsonc

api/                  # Rotas Vercel (Node) — espelham parte das funções Base44
│                       para uso no site publicado (leilaonozap.net)
├── functions/        # createMPPix, createStoreOrder, mpWebhook, entityWrite, ...
├── integrations/     # InvokeLLM, GenerateImage
└── _lib/             # marketSearch, frete, commissions, pdvSettle, livoo/, ...

supabase/
└── migrations/       # Histórico de migrações SQL (schema real em produção)

android/ · ios/       # Projetos nativos gerados pelo Capacitor
```

---

## 4. OBSERVAÇÕES TÉCNICAS RELEVANTES

- **Fonte real de dados:** Supabase Postgres (via Deno functions com `SUPABASE_SERVICE_ROLE_KEY`). As entidades Base44 (`base44/entities/*.jsonc`) descrevem o schema, mas boa parte da lógica financeira crítica já foi migrada para consultar/gravar direto no Supabase.
- **Duas carteiras digitais coexistem:** `DigitalWallet`/`DigitalWalletTransaction` (atual) e `Wallet`/`WalletTransaction` (legado) — cuidado ao integrar novas features para não gravar no lugar errado.
- **Grafia de status "cancelado":** `CatalogSale.status` usa `canceled` (uma letra L). Funções/componentes que comparam com `cancelled` (duas letras L) falham silenciosamente — já corrigido em `getDigitalWalletHistory` e `WalletDrawer.jsx` (17/08/2026).
- **Dupla camada de rotas:** `App.jsx` tem rotas explícitas + um loop sobre `pages.config.jsx` — toda nova página precisa de `<Route>` explícita.