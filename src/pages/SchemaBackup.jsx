/**
 * DOCUMENTO DE BACKUP ESTRUTURAL - LEILÃO NOZAP
 * Gerado em: 2026-03-06
 * 
 * Este arquivo documenta todos os schemas de entidades e seus relacionamentos.
 * NÃO é uma página de uso ativo — é um registro de segurança da arquitetura de dados.
 */

export const SCHEMA_VERSION = "2026-03-06";

/**
 * ============================================================
 * MAPA DE ENTIDADES E RELACIONAMENTOS
 * ============================================================
 * 
 * LEGENDA DE RELACIONAMENTOS:
 *   → campo_id aponta para entidade destino
 *   [RLS] regra de segurança por linha
 * 
 * ============================================================
 *
 * 1. AppUser
 *    Campos principais: full_name, email, phone, cpf, role, referral_code, referred_by_id
 *    Campos financeiros: commission_balance, total_commissions_generated, catalog_commission_balance
 *    Campos carreira: career_levels[], primary_career_level, active_partner_plan
 *    Relacionamentos:
 *      referred_by_id → AppUser.id (autorelacionamento hierárquico)
 *    [RLS] read/write: público
 *
 * 2. Auction
 *    Campos principais: title, starting_price, current_price, increment, buy_now_price, end_time, status
 *    Campos vinculados: seller_id, winner_id, product_id, partner_store
 *    Relacionamentos:
 *      seller_id → AppUser.id
 *      winner_id → AppUser.id
 *      product_id → Product.id
 *    [RLS] read/write: público
 *
 * 3. Bid
 *    Campos: auction_id, bidder_name, amount, timestamp
 *    Relacionamentos:
 *      auction_id → Auction.id
 *    [RLS] read: criador ou admin | write: criador
 *
 * 4. AuctionMessage
 *    Campos: auction_id, sender_id, message_type, content, bid_amount
 *    Relacionamentos:
 *      auction_id → Auction.id
 *      sender_id → AppUser.id
 *    [RLS] read/write: público
 *
 * 5. Product
 *    Campos: description, lot, quantity, cost_price, selling_price_retail, selling_price_wholesale
 *    Campos catálogo: catalog_active, price_catalog, is_featured
 *    Campos vinculados: linked_auctions[], pricing_formula_id
 *    Relacionamentos:
 *      linked_auctions[] → Auction.id[]
 *      pricing_formula_id → PricingFormula.id
 *    [RLS] read/write: público
 *
 * 6. CatalogSale
 *    Campos: product_id, sale_price, quantity, total_amount, buyer_id, licensee_id
 *    Campos status: status, payment_confirmed_date, tracking_code, commission_processed
 *    Campos vinculados: asaas_payment_id, seller_id, referred_by_code
 *    Relacionamentos:
 *      product_id → Product.id
 *      buyer_id → AppUser.id
 *      licensee_id → AppUser.id
 *      asaas_payment_id → AsaasPayment.payment_id
 *      seller_id → Store.id
 *    [RLS] read: comprador ou licenciado ou admin | write: nenhum (apenas server-side)
 *
 * 7. AsaasPayment
 *    Campos: payment_id, billing_type, value, status, external_reference
 *    Campos vinculados: catalog_sale_id, auction_id, buyer_id, wallet_deposit_user_id
 *    Relacionamentos:
 *      catalog_sale_id → CatalogSale.id
 *      auction_id → Auction.id
 *      buyer_id → AppUser.id
 *      wallet_deposit_user_id → AppUser.id
 *    [RLS] read: comprador ou depositante ou admin | write: nenhum
 *
 * 8. MercadoPagoPayment
 *    Campos: user_id, preference_id, payment_id, amount, status, external_reference
 *    Campos vinculados: auction_id, product_id, catalog_sale_id
 *    Relacionamentos:
 *      user_id → AppUser.id
 *      auction_id → Auction.id
 *      product_id → Product.id
 *      catalog_sale_id → CatalogSale.id
 *    [RLS] read/write: criador ou admin
 *
 * 9. CommissionRecord
 *    Campos: sale_id, sale_type, user_id, role, percent, amount, sale_amount
 *    Campos vinculados: anchor_user_id
 *    Relacionamentos:
 *      sale_id → CatalogSale.id ou Auction.id (dependendo de sale_type)
 *      user_id → AppUser.id
 *      anchor_user_id → AppUser.id
 *    [RLS] read/write: público
 *
 * 10. DigitalWallet
 *     Campos: user_id, balance
 *     Relacionamentos:
 *       user_id → AppUser.id
 *     [RLS] read: proprietário ou admin | write: apenas admin
 *
 * 11. DigitalWalletTransaction
 *     Campos: user_id, type, direction, amount, status
 *     Campos vinculados: related_auction_id, related_payment_id
 *     Relacionamentos:
 *       user_id → AppUser.id
 *       related_auction_id → Auction.id
 *       related_payment_id → AsaasPayment.payment_id
 *     [RLS] read: proprietário ou admin | write: apenas admin
 *
 * 12. Wallet (saldo catálogo/comissões — diferente de DigitalWallet)
 *     Campos: user_id, balance
 *     Relacionamentos:
 *       user_id → AppUser.id
 *     [RLS] read: proprietário ou admin | write: apenas admin
 *
 * 13. WalletTransaction
 *     Campos: user_id, type, direction, amount, status, related_auction_id
 *     Relacionamentos:
 *       user_id → AppUser.id
 *       related_auction_id → Auction.id
 *     [RLS] read: proprietário ou admin | write: apenas admin
 *
 * 14. EventQueue
 *     Campos: event_type, source_gateway, source_payment_id, source_entity_type, source_entity_id, status, payload
 *     Relacionamentos:
 *       source_entity_id → CatalogSale.id | Auction.id | AppUser.id | PartnerPlanPurchase.id
 *     [RLS] read: admin | write: nenhum (server-side)
 *
 * 15. PaymentTrackingLog
 *     Campos: payment_id, buyer_id, amount, status, stage, event_log[], commissions_distributed[]
 *     Campos vinculados: catalog_sale_id, mercadopago_payment_id, licensee_id, product_id
 *     Relacionamentos:
 *       buyer_id → AppUser.id
 *       licensee_id → AppUser.id
 *       catalog_sale_id → CatalogSale.id
 *       product_id → Product.id
 *       mercadopago_payment_id → MercadoPagoPayment.id
 *     [RLS] read: admin | write: nenhum
 *
 * 16. WithdrawalRequest
 *     Campos: influencer_id, amount, status, pix_key, pix_key_type, recipient_name, recipient_document
 *     Relacionamentos:
 *       influencer_id → AppUser.id
 *       processed_by → AppUser.id (admin)
 *     [RLS] read: proprietário ou admin | write: apenas admin
 *
 * 17. PartnerPlanPurchase
 *     Campos: user_id, plan_name, plan_amount, activated_at, status, is_investment, investment_rate
 *     Relacionamentos:
 *       user_id → AppUser.id
 *     [RLS] read: proprietário ou admin | write: nenhum
 *
 * 18. LicenseeLead
 *     Campos: nome, email, telefone, status_lead, status_negociacao, valor_negociado, valor_fechado
 *     [RLS] read/write: criador apenas (isolamento por licenciado)
 *
 * 19. InfluencerLead
 *     Campos: influencer_id, influencer_code, lead_email, lead_user_id, total_purchases, total_spent, status
 *     Relacionamentos:
 *       influencer_id → AppUser.id
 *       lead_user_id → AppUser.id
 *     [RLS] read: influenciador ou admin | write: nenhum
 *
 * 20. InfluencerPurchase
 *     Campos: influencer_id, lead_user_id, auction_id, amount
 *     Relacionamentos:
 *       influencer_id → AppUser.id
 *       lead_user_id → AppUser.id
 *       auction_id → Auction.id
 *     [RLS] read: influenciador ou admin | write: nenhum
 *
 * 21. Sale (PDV físico)
 *     Campos: product_id, quantity_sold, total_amount, payment_method, sale_date, seller_id, commission_amount
 *     Relacionamentos:
 *       product_id → Product.id
 *       seller_id → Seller.id
 *     [RLS] read/write: apenas admin
 *
 * 22. SaleCommission (PDV)
 *     Campos: sale_id, seller_id, seller_name, seller_role, commission_amount
 *     Relacionamentos:
 *       sale_id → Sale.id
 *       seller_id → Seller.id
 *     [RLS] read/write: apenas admin
 *
 * 23. Negotiation (PDV)
 *     Campos: customer_id, seller_id, items[], total_value, status
 *     Relacionamentos:
 *       customer_id → Customer.id
 *       seller_id → Seller.id
 *       items[].product_id → Product.id
 *     [RLS] read/write: apenas admin
 *
 * 24. Customer (PDV)
 *     Campos: full_name, email, phone, cpf, status, total_purchases, total_spent
 *     [RLS] read/write: público
 *
 * 25. Seller (PDV)
 *     Campos: name, phone, license_type, referred_by_id, default_commission_percentage
 *     Relacionamentos:
 *       referred_by_id → AppUser.id (licenciante)
 *     [RLS] read/write: público
 *
 * 26. CashRegister (PDV)
 *     Campos: status, operator_name, opening_time, closing_time, total_sales, total_pix, total_cash
 *     [RLS] read/write: apenas admin
 *
 * 27. Store
 *     Campos: store_name, owner_name, email, cnpj, distribution_channels[], can_create_*
 *     [RLS] read: público | write: apenas admin
 *
 * 28. Product → PricingFormula (vinculação)
 *     Campos: name, base_percentage, commission_percentage, tax_percentage
 *     [RLS] read/write: apenas admin
 *
 * 29. LicensePlan
 *     Campos: plan_code, plan_name, commission_rate, price
 *     [RLS] read: público | write: apenas admin
 *
 * 30. BannerImage
 *     Campos: image_url, context (home|catalog|luxurycollection), device_type, order, is_active
 *     [RLS] read: público | write: apenas admin
 *
 * 31. FavoriteAuction
 *     Campos: user_id, auction_id, context
 *     Relacionamentos:
 *       user_id → AppUser.id
 *       auction_id → Auction.id
 *     [RLS] read/write: criador
 *
 * 32. AuctionView
 *     Campos: user_id, auction_id, view_count, last_viewed, category
 *     Relacionamentos:
 *       user_id → AppUser.id
 *       auction_id → Auction.id
 *     [RLS] read/write: criador
 *
 * 33. Payment (legado)
 *     Campos: auction_id, buyer_id, amount, payment_method, status, transaction_id
 *     Relacionamentos:
 *       auction_id → Auction.id
 *       buyer_id → AppUser.id
 *     [RLS] read/write: criador ou admin
 *
 * 34. WebhookLog
 *     Campos: provider, event_type, resource_id, headers, body, signature_valid, processed
 *     [RLS] read: admin | write: público
 *
 * 35. SystemLog
 *     Campos: step, status, message, component_name, error_details, url, payload
 *     [RLS] read: admin | write: público
 *
 * 36. ComparaiLog / ComparaiCache
 *     ComparaiLog: auction_id, step, status, message
 *     ComparaiCache: auction_id, mode, result, expires_at
 *     Relacionamentos: auction_id → Auction.id
 *     [RLS] read/write: público
 *
 * 37. MetricSnapshot
 *     Campos: snapshot_time, metrics, period_minutes
 *     [RLS] read/write: apenas admin
 *
 * 38. BatchRegistration
 *     Campos: numero_leilao, lotes[], valor_total, total_produtos, status
 *     [RLS] read/write: apenas admin
 *
 * 39. ProductOperation
 *     Campos: product_id, operation_type, operator_name, reason, operation_date
 *     Relacionamentos: product_id → Product.id
 *     [RLS] read/write: apenas admin
 *
 * 40. DepositPackage
 *     Campos: label, amount, is_active, sort_order, bonus_percentage
 *     [RLS] read: público | write: apenas admin
 *
 * 41. CatalogVisit
 *     Campos: licensee_id, referral_code, page, user_agent, visited_at
 *     Relacionamentos: licensee_id → AppUser.id
 *     [RLS] read/write: público
 *
 * 42. UserPreference
 *     Campos: user_id, preferred_categories[], price_range_min, price_range_max
 *     Relacionamentos: user_id → AppUser.id
 *     [RLS] read/write: criador
 *
 * 43. OAuthToken
 *     Campos: provider, code, access_token, refresh_token, expires_at, user_id, status
 *     Relacionamentos: user_id → AppUser.id
 *     [RLS] read/write: apenas admin
 *
 * 44. LiveSession
 *     Campos: session_id, user_id, last_heartbeat, page, user_agent
 *     [RLS] sem restrição declarada
 *
 * 45. LuxuryAuction
 *     Campos: title, price, starting_price, increment, buy_now_price, end_time, status
 *     [RLS] read: público | write: apenas admin
 *
 * 46. LuxuryAccessCode
 *     Campos: code, person_name, email, is_active, is_single_use, is_used, used_by_user_id
 *     [RLS] read: público | write: apenas admin
 *
 * 47. TaxSettings
 *     Campos: icms_rate, pis_rate, cofins_rate, irpj_rate, csll_rate
 *     [RLS] read/write: apenas admin
 *
 * 48. FooterSettings
 *     Campos: address, phone, whatsapp, email, social URLs
 *     [RLS] read: público | write: apenas admin
 *
 * 49. CatalogSettings
 *     Campos: featured_section_title, featured_section_description
 *     [RLS] read: público | write: apenas admin
 *
 * 50. Category
 *     Campos: name, parent_category_id, parent_category_name, is_active, sort_order
 *     Relacionamentos: parent_category_id → Category.id (autorelacionamento)
 *     [RLS] read: público | write: apenas admin
 *
 * 51. PaymentSettings
 *     Campos: gateway_name, base_url, api_key, pix_key, wallet_enabled
 *     [RLS] read/write: apenas admin
 *
 * 52. FeaturedProduct
 *     Campos: name, category, investment, expected_return, image_url, is_active
 *     [RLS] read: público | write: apenas admin
 *
 * 53. EventQueue
 *     Campos: event_type, source_gateway, source_payment_id, source_entity_type, source_entity_id, status, payload
 *     [RLS] read: admin | write: nenhum
 *
 * 54. FinancialExpense
 *     Campos: description, company, category, expense_type, amount, due_date, payment_status
 *     [RLS] read/write: público
 *
 * ============================================================
 * FLUXOS CRÍTICOS DE DADOS
 * ============================================================
 *
 * FLUXO 1 — Compra no Catálogo (ASAAS):
 *   CatalogSale (created) 
 *     → AsaasPayment (created, status=pending)
 *     → asaasWebhook (payment confirmed)
 *     → CatalogSale.status = paid
 *     → processCatalogCommission()
 *       → CommissionRecord[] (criados por nível da hierarquia)
 *       → AppUser.commission_balance (atualizado)
 *       → AppUser.catalog_commission_balance (atualizado)
 *     → EventQueue (queued para Ecosystem Core)
 *     → PaymentTrackingLog (atualizado por etapa)
 *
 * FLUXO 2 — Arremate em Leilão:
 *   Bid (created) 
 *     → Auction.current_price (atualizado)
 *     → Auction.status = sold (quando tempo esgotado)
 *     → processAuctionSale()
 *       → CommissionRecord[] (influenciadores/rede)
 *       → AppUser.commission_balance (atualizado)
 *     → DigitalWallet.balance (debitado do vencedor)
 *     → DigitalWalletTransaction (created)
 *
 * FLUXO 3 — Depósito na Carteira (ASAAS):
 *   AsaasPayment (is_wallet_deposit=true, wallet_deposit_user_id=X)
 *     → asaasWebhook (confirmed)
 *     → DigitalWallet.balance (creditado)
 *     → DigitalWalletTransaction (created, type=deposit)
 *
 * FLUXO 4 — Saque de Comissões:
 *   WithdrawalRequest (created, status=pending)
 *     → Admin aprova → status=approved
 *     → AppUser.commission_balance (debitado)
 *     → WithdrawalRequest.status = completed
 *
 * FLUXO 5 — Distribuição de Hierarquia:
 *   AppUser.referred_by_id → AppUser.id (nível 1)
 *     → AppUser.referred_by_id → AppUser.id (nível 2)
 *       → ... até fundador
 *   CommissionRecord criado para cada nível ativo na hierarquia
 *
 * ============================================================
 * TABELAS DE CONFIGURAÇÃO (sem relacionamentos externos):
 * ============================================================
 *   - TaxSettings
 *   - PaymentSettings
 *   - FooterSettings
 *   - CatalogSettings
 *   - LicensePlan
 *   - DepositPackage
 *   - PricingFormula
 *   - Category (autorelacionamento)
 *   - BannerImage
 *   - FeaturedProduct
 *
 * ============================================================
 * TABELAS DE OBSERVABILIDADE / LOG:
 * ============================================================
 *   - SystemLog
 *   - ComparaiLog
 *   - ComparaiCache
 *   - WebhookLog
 *   - MetricSnapshot
 *   - LiveSession
 *   - PaymentTrackingLog
 *   - CatalogVisit
 *   - EventQueue
 *   - ProductOperation
 *   - BatchRegistration (registro de lotes)
 */

export default function SchemaBackup() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-300 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-green-400 mb-2">Backup Estrutural — Leilão NoZap</h1>
        <p className="text-gray-500 text-sm mb-6">Versão: {SCHEMA_VERSION} · 54 entidades documentadas</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-3xl font-bold text-green-400">54</div>
            <div className="text-sm text-gray-400">Entidades</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-3xl font-bold text-blue-400">5</div>
            <div className="text-sm text-gray-400">Fluxos Críticos</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-3xl font-bold text-yellow-400">10</div>
            <div className="text-sm text-gray-400">Tabelas de Config</div>
          </div>
        </div>

        <div className="space-y-4">
          {[
            { group: "Pagamentos & Financeiro", color: "red", entities: ["AsaasPayment", "MercadoPagoPayment", "Payment", "Wallet", "WalletTransaction", "DigitalWallet", "DigitalWalletTransaction", "DepositPackage", "PaymentSettings", "WithdrawalRequest"] },
            { group: "Comissões & Carreira", color: "yellow", entities: ["CommissionRecord", "SaleCommission", "AppUser (career_levels)", "LicensePlan", "PartnerPlanPurchase"] },
            { group: "Leilões", color: "purple", entities: ["Auction", "Bid", "AuctionMessage", "LuxuryAuction", "LuxuryAccessCode", "FavoriteAuction", "AuctionView"] },
            { group: "Catálogo", color: "green", entities: ["CatalogSale", "Product", "CatalogSettings", "CatalogVisit", "BannerImage", "Category", "FeaturedProduct", "PricingFormula"] },
            { group: "Usuários & Indicações", color: "blue", entities: ["AppUser", "LicenseeLead", "InfluencerLead", "InfluencerPurchase", "UserPreference"] },
            { group: "PDV & Gestão", color: "orange", entities: ["Sale", "Customer", "Seller", "CashRegister", "Store", "Negotiation", "BatchRegistration", "ProductOperation"] },
            { group: "Observabilidade", color: "gray", entities: ["SystemLog", "WebhookLog", "PaymentTrackingLog", "ComparaiLog", "ComparaiCache", "MetricSnapshot", "LiveSession", "CatalogVisit", "EventQueue"] },
            { group: "Configurações", color: "teal", entities: ["TaxSettings", "FooterSettings", "OAuthToken"] },
          ].map(({ group, color, entities }) => (
            <div key={group} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h2 className={`text-sm font-semibold text-${color}-400 mb-2`}>{group}</h2>
              <div className="flex flex-wrap gap-2">
                {entities.map(e => (
                  <span key={e} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">{e}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4">
          <p className="text-yellow-400 text-xs font-semibold mb-1">⚠️ AVISO</p>
          <p className="text-gray-400 text-xs">
            Este arquivo é apenas documentação estrutural. Os dados reais estão no banco gerenciado pela plataforma Base44. 
            Para backup de dados, utilize as ferramentas de exportação do painel administrativo da Base44.
          </p>
        </div>
      </div>
    </div>
  );
}