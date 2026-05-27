-- ============================================================
-- Leilão NoZap — Schema inicial migrado do Base44
-- Gerado 2026-05-26 · 53 entidades · 10.972 registros
-- Princípio: preservar 1:1 todos os campos das entidades originais
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Função genérica de updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ===== Product (3543 registros) =====
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , altura NUMERIC
  , calculated_price NUMERIC
  , catalog_active BOOLEAN
  , comprimento NUMERIC
  , cost_price NUMERIC
  , created_by TEXT
  , created_by_id TEXT
  , created_date TIMESTAMPTZ
  , date DATE
  , deposit_name TEXT
  , description TEXT
  , discount_percentage NUMERIC
  , image_urls JSONB
  , is_featured BOOLEAN
  , is_sample BOOLEAN
  , largura NUMERIC
  , last_dynamic_update TIMESTAMPTZ
  , linked_auctions JSONB
  , lot TEXT
  , market_value NUMERIC
  , notes TEXT
  , peso NUMERIC
  , price_auction_start TEXT
  , price_buy_now TEXT
  , price_catalog NUMERIC
  , pricing_formula_id TEXT
  , profit NUMERIC
  , purchase_order TEXT
  , qty_bom NUMERIC
  , qty_oficina NUMERIC
  , qty_perfeito NUMERIC
  , qty_ruim NUMERIC
  , quantity NUMERIC
  , quantity_sold NUMERIC
  , selling_price_retail NUMERIC
  , selling_price_wholesale NUMERIC
  , sold_amount NUMERIC
  , status TEXT
  , updated_date TIMESTAMPTZ
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_products_base44_id ON public.products(base44_id);
DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== LiveSession (2227 registros) =====
CREATE TABLE IF NOT EXISTS public.live_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , created_by TEXT
  , created_by_id TEXT
  , created_date TIMESTAMPTZ
  , current_product_id TEXT
  , frame_image_url TEXT
  , frame_type TEXT
  , is_live BOOLEAN
  , is_paused BOOLEAN
  , is_sample BOOLEAN
  , last_heartbeat TIMESTAMPTZ
  , page TEXT
  , partner_store TEXT
  , pause_image_url TEXT
  , quality TEXT
  , session_id TEXT
  , stream_url TEXT
  , updated_date TIMESTAMPTZ
  , user_agent TEXT
  , user_id TEXT
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_live_sessions_base44_id ON public.live_sessions(base44_id);
DROP TRIGGER IF EXISTS trg_live_sessions_updated_at ON public.live_sessions;
CREATE TRIGGER trg_live_sessions_updated_at BEFORE UPDATE ON public.live_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== ComparaiLog (1728 registros) =====
CREATE TABLE IF NOT EXISTS public.comparai_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , auction_id TEXT
  , created_by TEXT
  , created_by_id TEXT
  , created_date TIMESTAMPTZ
  , error_details JSONB
  , is_mobile BOOLEAN
  , is_sample BOOLEAN
  , message TEXT
  , status TEXT
  , step TEXT
  , updated_date TIMESTAMPTZ
  , user_agent TEXT
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.comparai_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_comparai_logs_base44_id ON public.comparai_logs(base44_id);
DROP TRIGGER IF EXISTS trg_comparai_logs_updated_at ON public.comparai_logs;
CREATE TRIGGER trg_comparai_logs_updated_at BEFORE UPDATE ON public.comparai_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== AuctionMessage (1605 registros) =====
CREATE TABLE IF NOT EXISTS public.auction_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , auction_id TEXT
  , bid_amount NUMERIC
  , content TEXT
  , countdown_phase NUMERIC
  , created_by TEXT
  , created_by_id TEXT
  , created_date TIMESTAMPTZ
  , is_sample BOOLEAN
  , is_system_message BOOLEAN
  , message_type TEXT
  , sender_id TEXT
  , sender_name TEXT
  , timestamp TIMESTAMPTZ
  , updated_date TIMESTAMPTZ
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.auction_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_auction_messages_base44_id ON public.auction_messages(base44_id);
DROP TRIGGER IF EXISTS trg_auction_messages_updated_at ON public.auction_messages;
CREATE TRIGGER trg_auction_messages_updated_at BEFORE UPDATE ON public.auction_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== CommissionRecord (1325 registros) =====
CREATE TABLE IF NOT EXISTS public.commission_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , amount NUMERIC
  , anchor_user_id TEXT
  , anchor_user_name TEXT
  , created_by TEXT
  , created_by_id TEXT
  , created_date TIMESTAMPTZ
  , is_sample BOOLEAN
  , percent NUMERIC
  , product_title TEXT
  , role TEXT
  , sale_amount NUMERIC
  , sale_id TEXT
  , sale_type TEXT
  , status TEXT
  , updated_date TIMESTAMPTZ
  , user_id TEXT
  , user_name TEXT
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.commission_records ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_commission_records_base44_id ON public.commission_records(base44_id);
DROP TRIGGER IF EXISTS trg_commission_records_updated_at ON public.commission_records;
CREATE TRIGGER trg_commission_records_updated_at BEFORE UPDATE ON public.commission_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== CatalogVisit (213 registros) =====
CREATE TABLE IF NOT EXISTS public.catalog_visits (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , created_by TEXT
  , created_by_id TEXT
  , created_date TIMESTAMPTZ
  , is_sample BOOLEAN
  , licensee_id TEXT
  , page TEXT
  , referral_code TEXT
  , session_id TEXT
  , updated_date TIMESTAMPTZ
  , user_agent TEXT
  , visited_at TIMESTAMPTZ
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.catalog_visits ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_catalog_visits_base44_id ON public.catalog_visits(base44_id);
DROP TRIGGER IF EXISTS trg_catalog_visits_updated_at ON public.catalog_visits;
CREATE TRIGGER trg_catalog_visits_updated_at BEFORE UPDATE ON public.catalog_visits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Auction (136 registros) =====
CREATE TABLE IF NOT EXISTS public.auctions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , allowed_regions JSONB
  , buy_now_price NUMERIC
  , category TEXT
  , commissions_distributed BOOLEAN
  , comparai_mode TEXT
  , created_by TEXT
  , created_by_id TEXT
  , created_date TIMESTAMPTZ
  , current_price NUMERIC
  , description TEXT
  , end_time TIMESTAMPTZ
  , image_urls JSONB
  , increment NUMERIC
  , is_investment_plan BOOLEAN
  , is_sample BOOLEAN
  , is_test_auction BOOLEAN
  , last_comparison_date TIMESTAMPTZ
  , last_processed_bid_time TEXT
  , last_updated TIMESTAMPTZ
  , lot_categories_json TEXT
  , lot_grades_json TEXT
  , lot_items_json TEXT
  , lot_raw_items_json TEXT
  , lot_status TEXT
  , manual_market_price NUMERIC
  , market_price NUMERIC
  , order_status TEXT
  , partner_commission_percentual NUMERIC
  , partner_id TEXT
  , partner_name TEXT
  , partner_store TEXT
  , platform_commission_percentual NUMERIC
  , product_id TEXT
  , product_source TEXT
  , reserved_by TEXT
  , reserved_by_name TEXT
  , reserved_until TEXT
  , seller_id TEXT
  , seller_name TEXT
  , source_url TEXT
  , starting_price NUMERIC
  , status TEXT
  , supplier_logo_url TEXT
  , title TEXT
  , tracking_code TEXT
  , updated_date TIMESTAMPTZ
  , version NUMERIC
  , winner_id TEXT
  , winner_name TEXT
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_auctions_base44_id ON public.auctions(base44_id);
DROP TRIGGER IF EXISTS trg_auctions_updated_at ON public.auctions;
CREATE TRIGGER trg_auctions_updated_at BEFORE UPDATE ON public.auctions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Category (52 registros) =====
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , created_by TEXT
  , created_by_id TEXT
  , created_date TIMESTAMPTZ
  , is_active BOOLEAN
  , is_sample BOOLEAN
  , name TEXT
  , parent_category_id TEXT
  , parent_category_name TEXT
  , sort_order BIGINT
  , updated_date TIMESTAMPTZ
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_categories_base44_id ON public.categories(base44_id);
DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== AppUser (37 registros) =====
CREATE TABLE IF NOT EXISTS public.app_users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , access_token TEXT
  , access_token_expires TEXT
  , active_partner_plan TEXT
  , address_city TEXT
  , address_complement TEXT
  , address_neighborhood TEXT
  , address_number TEXT
  , address_state TEXT
  , address_street TEXT
  , address_zip_code TEXT
  , arrematante_commission_percentage NUMERIC
  , arrematante_context TEXT
  , arrematante_responsavel_id TEXT
  , avatar_color TEXT
  , avatar_url TEXT
  , career_levels JSONB
  , catalog_commission_balance NUMERIC
  , catalog_total_commissions_generated NUMERIC
  , commission_balance NUMERIC
  , cpf TEXT
  , created_by TEXT
  , created_by_id TEXT
  , created_date TIMESTAMPTZ
  , display_first_name TEXT
  , display_last_name TEXT
  , email TEXT
  , enabled_panels JSONB
  , full_name TEXT
  , indicated_clients_count NUMERIC
  , is_sample BOOLEAN
  , is_seller BOOLEAN
  , licenciado_context TEXT
  , network_bids_count NUMERIC
  , nickname TEXT
  , partner_plan_activated_at TIMESTAMPTZ
  , partner_plan_amount NUMERIC
  , password TEXT
  , password_reset_expires TIMESTAMPTZ
  , password_reset_token TEXT
  , phone TEXT
  , points NUMERIC
  , primary_career_level TEXT
  , profile_photo_url TEXT
  , recruited_by_id TEXT
  , referral_code TEXT
  , referred_by_id TEXT
  , role TEXT
  , saldo_alocado NUMERIC
  , saldo_disponivel NUMERIC
  , store_name TEXT
  , terms_accepted BOOLEAN
  , total_bids NUMERIC
  , total_commissions_generated NUMERIC
  , total_operation_fee_percentage NUMERIC
  , updated_date TIMESTAMPTZ
  , won_auctions NUMERIC
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_app_users_base44_id ON public.app_users(base44_id);
DROP TRIGGER IF EXISTS trg_app_users_updated_at ON public.app_users;
CREATE TRIGGER trg_app_users_updated_at BEFORE UPDATE ON public.app_users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== FinancialExpense (35 registros) =====
CREATE TABLE IF NOT EXISTS public.financial_expenses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , amount NUMERIC
  , amount_paid NUMERIC
  , category TEXT
  , company TEXT
  , created_by TEXT
  , created_by_id TEXT
  , created_date TIMESTAMPTZ
  , description TEXT
  , due_date DATE
  , expense_type TEXT
  , installment_current TEXT
  , installment_total TEXT
  , interest_amount NUMERIC
  , is_sample BOOLEAN
  , notes TEXT
  , payment_date TEXT
  , payment_method TEXT
  , payment_status TEXT
  , pix_or_card_info TEXT
  , recurring_day NUMERIC
  , total_amount NUMERIC
  , updated_date TIMESTAMPTZ
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.financial_expenses ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_financial_expenses_base44_id ON public.financial_expenses(base44_id);
DROP TRIGGER IF EXISTS trg_financial_expenses_updated_at ON public.financial_expenses;
CREATE TRIGGER trg_financial_expenses_updated_at BEFORE UPDATE ON public.financial_expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Seller (32 registros) =====
CREATE TABLE IF NOT EXISTS public.sellers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , created_by TEXT
  , created_by_id TEXT
  , created_date TIMESTAMPTZ
  , default_commission_percentage NUMERIC
  , default_licenciante_commission_percentage NUMERIC
  , email TEXT
  , is_active BOOLEAN
  , is_sample BOOLEAN
  , license_type TEXT
  , name TEXT
  , phone TEXT
  , referred_by_id TEXT
  , updated_date TIMESTAMPTZ
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_sellers_base44_id ON public.sellers(base44_id);
DROP TRIGGER IF EXISTS trg_sellers_updated_at ON public.sellers;
CREATE TRIGGER trg_sellers_updated_at BEFORE UPDATE ON public.sellers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== BannerImage (14 registros) =====
CREATE TABLE IF NOT EXISTS public.banner_images (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , context TEXT
  , created_by TEXT
  , created_by_id TEXT
  , created_date TIMESTAMPTZ
  , device_type TEXT
  , image_adjustments TEXT
  , image_url TEXT
  , is_active BOOLEAN
  , is_sample BOOLEAN
  , link_url TEXT
  , sort_order NUMERIC
  , title TEXT
  , updated_date TIMESTAMPTZ
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.banner_images ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_banner_images_base44_id ON public.banner_images(base44_id);
DROP TRIGGER IF EXISTS trg_banner_images_updated_at ON public.banner_images;
CREATE TRIGGER trg_banner_images_updated_at BEFORE UPDATE ON public.banner_images
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== DepositPackage (5 registros) =====
CREATE TABLE IF NOT EXISTS public.deposit_packages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , amount NUMERIC
  , bonus_percentage NUMERIC
  , created_by TEXT
  , created_by_id TEXT
  , created_date TIMESTAMPTZ
  , is_active BOOLEAN
  , is_sample BOOLEAN
  , label TEXT
  , sort_order BIGINT
  , updated_date TIMESTAMPTZ
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deposit_packages ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_deposit_packages_base44_id ON public.deposit_packages(base44_id);
DROP TRIGGER IF EXISTS trg_deposit_packages_updated_at ON public.deposit_packages;
CREATE TRIGGER trg_deposit_packages_updated_at BEFORE UPDATE ON public.deposit_packages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Customer (4 registros) =====
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , address_city TEXT
  , address_number TEXT
  , address_state TEXT
  , address_street TEXT
  , address_zip_code TEXT
  , assigned_seller TEXT
  , cpf TEXT
  , created_by TEXT
  , created_by_id TEXT
  , created_date TIMESTAMPTZ
  , email TEXT
  , follow_up_date DATE
  , full_name TEXT
  , interested_products JSONB
  , is_sample BOOLEAN
  , last_contact DATE
  , next_steps TEXT
  , notes TEXT
  , phone TEXT
  , purchase_product TEXT
  , purchase_status TEXT
  , purchase_value NUMERIC
  , source TEXT
  , status TEXT
  , total_purchases NUMERIC
  , total_spent NUMERIC
  , updated_date TIMESTAMPTZ
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_customers_base44_id ON public.customers(base44_id);
DROP TRIGGER IF EXISTS trg_customers_updated_at ON public.customers;
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Store (4 registros) =====
CREATE TABLE IF NOT EXISTS public.stores (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , address TEXT
  , can_create_arremate_devolucoes BOOLEAN
  , can_create_direto_fabrica BOOLEAN
  , can_create_sai_de_baixo BOOLEAN
  , cnpj TEXT
  , created_by TEXT
  , created_by_id TEXT
  , created_date TIMESTAMPTZ
  , distribution_channels JSONB
  , email TEXT
  , is_sample BOOLEAN
  , logo_url TEXT
  , notes TEXT
  , owner_name TEXT
  , phone TEXT
  , product_types JSONB
  , status TEXT
  , store_login TEXT
  , store_name TEXT
  , store_password TEXT
  , updated_date TIMESTAMPTZ
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_stores_base44_id ON public.stores(base44_id);
DROP TRIGGER IF EXISTS trg_stores_updated_at ON public.stores;
CREATE TRIGGER trg_stores_updated_at BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== FeaturedProduct (3 registros) =====
CREATE TABLE IF NOT EXISTS public.featured_products (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , category TEXT
  , created_by TEXT
  , created_by_id TEXT
  , created_date TIMESTAMPTZ
  , expected_return TEXT
  , image_url TEXT
  , investment TEXT
  , is_active BOOLEAN
  , is_sample BOOLEAN
  , name TEXT
  , sort_order NUMERIC
  , updated_date TIMESTAMPTZ
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.featured_products ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_featured_products_base44_id ON public.featured_products(base44_id);
DROP TRIGGER IF EXISTS trg_featured_products_updated_at ON public.featured_products;
CREATE TRIGGER trg_featured_products_updated_at BEFORE UPDATE ON public.featured_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== LuxuryAccessCode (3 registros) =====
CREATE TABLE IF NOT EXISTS public.luxury_access_codes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , code TEXT
  , created_by TEXT
  , created_by_id TEXT
  , created_date TIMESTAMPTZ
  , email TEXT
  , is_active BOOLEAN
  , is_sample BOOLEAN
  , is_single_use BOOLEAN
  , is_used BOOLEAN
  , label TEXT
  , person_name TEXT
  , updated_date TIMESTAMPTZ
  , used_at TIMESTAMPTZ
  , used_by_user_id TEXT
  , whatsapp TEXT
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.luxury_access_codes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_luxury_access_codes_base44_id ON public.luxury_access_codes(base44_id);
DROP TRIGGER IF EXISTS trg_luxury_access_codes_updated_at ON public.luxury_access_codes;
CREATE TRIGGER trg_luxury_access_codes_updated_at BEFORE UPDATE ON public.luxury_access_codes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== CatalogSettings (1 registros) =====
CREATE TABLE IF NOT EXISTS public.catalog_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , created_by TEXT
  , created_by_id TEXT
  , created_date TIMESTAMPTZ
  , featured_section_description TEXT
  , featured_section_title TEXT
  , is_sample BOOLEAN
  , updated_date TIMESTAMPTZ
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.catalog_settings ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_catalog_settings_base44_id ON public.catalog_settings(base44_id);
DROP TRIGGER IF EXISTS trg_catalog_settings_updated_at ON public.catalog_settings;
CREATE TRIGGER trg_catalog_settings_updated_at BEFORE UPDATE ON public.catalog_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Arrematante (0 registros) =====
CREATE TABLE IF NOT EXISTS public.arrematantes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.arrematantes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_arrematantes_base44_id ON public.arrematantes(base44_id);
DROP TRIGGER IF EXISTS trg_arrematantes_updated_at ON public.arrematantes;
CREATE TRIGGER trg_arrematantes_updated_at BEFORE UPDATE ON public.arrematantes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== AsaasPayment (0 registros) =====
CREATE TABLE IF NOT EXISTS public.asaas_payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.asaas_payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_asaas_payments_base44_id ON public.asaas_payments(base44_id);
DROP TRIGGER IF EXISTS trg_asaas_payments_updated_at ON public.asaas_payments;
CREATE TRIGGER trg_asaas_payments_updated_at BEFORE UPDATE ON public.asaas_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== AuctionView (0 registros) =====
CREATE TABLE IF NOT EXISTS public.auction_views (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.auction_views ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_auction_views_base44_id ON public.auction_views(base44_id);
DROP TRIGGER IF EXISTS trg_auction_views_updated_at ON public.auction_views;
CREATE TRIGGER trg_auction_views_updated_at BEFORE UPDATE ON public.auction_views
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== BatchRegistration (0 registros) =====
CREATE TABLE IF NOT EXISTS public.batch_registrations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.batch_registrations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_batch_registrations_base44_id ON public.batch_registrations(base44_id);
DROP TRIGGER IF EXISTS trg_batch_registrations_updated_at ON public.batch_registrations;
CREATE TRIGGER trg_batch_registrations_updated_at BEFORE UPDATE ON public.batch_registrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Bid (0 registros) =====
CREATE TABLE IF NOT EXISTS public.bids (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_bids_base44_id ON public.bids(base44_id);
DROP TRIGGER IF EXISTS trg_bids_updated_at ON public.bids;
CREATE TRIGGER trg_bids_updated_at BEFORE UPDATE ON public.bids
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== CashRegister (0 registros) =====
CREATE TABLE IF NOT EXISTS public.cash_registers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_cash_registers_base44_id ON public.cash_registers(base44_id);
DROP TRIGGER IF EXISTS trg_cash_registers_updated_at ON public.cash_registers;
CREATE TRIGGER trg_cash_registers_updated_at BEFORE UPDATE ON public.cash_registers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== CatalogSale (0 registros) =====
CREATE TABLE IF NOT EXISTS public.catalog_sales (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.catalog_sales ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_catalog_sales_base44_id ON public.catalog_sales(base44_id);
DROP TRIGGER IF EXISTS trg_catalog_sales_updated_at ON public.catalog_sales;
CREATE TRIGGER trg_catalog_sales_updated_at BEFORE UPDATE ON public.catalog_sales
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== DigitalWallet (0 registros) =====
CREATE TABLE IF NOT EXISTS public.digital_wallets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.digital_wallets ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_digital_wallets_base44_id ON public.digital_wallets(base44_id);
DROP TRIGGER IF EXISTS trg_digital_wallets_updated_at ON public.digital_wallets;
CREATE TRIGGER trg_digital_wallets_updated_at BEFORE UPDATE ON public.digital_wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== DigitalWalletTransaction (0 registros) =====
CREATE TABLE IF NOT EXISTS public.digital_wallet_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.digital_wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_digital_wallet_transactions_base44_id ON public.digital_wallet_transactions(base44_id);
DROP TRIGGER IF EXISTS trg_digital_wallet_transactions_updated_at ON public.digital_wallet_transactions;
CREATE TRIGGER trg_digital_wallet_transactions_updated_at BEFORE UPDATE ON public.digital_wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== FavoriteAuction (0 registros) =====
CREATE TABLE IF NOT EXISTS public.favorite_auctions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.favorite_auctions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_favorite_auctions_base44_id ON public.favorite_auctions(base44_id);
DROP TRIGGER IF EXISTS trg_favorite_auctions_updated_at ON public.favorite_auctions;
CREATE TRIGGER trg_favorite_auctions_updated_at BEFORE UPDATE ON public.favorite_auctions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== FooterSettings (0 registros) =====
CREATE TABLE IF NOT EXISTS public.footer_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.footer_settings ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_footer_settings_base44_id ON public.footer_settings(base44_id);
DROP TRIGGER IF EXISTS trg_footer_settings_updated_at ON public.footer_settings;
CREATE TRIGGER trg_footer_settings_updated_at BEFORE UPDATE ON public.footer_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== FreteSettings (0 registros) =====
CREATE TABLE IF NOT EXISTS public.frete_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.frete_settings ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_frete_settings_base44_id ON public.frete_settings(base44_id);
DROP TRIGGER IF EXISTS trg_frete_settings_updated_at ON public.frete_settings;
CREATE TRIGGER trg_frete_settings_updated_at BEFORE UPDATE ON public.frete_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== InfluencerLead (0 registros) =====
CREATE TABLE IF NOT EXISTS public.influencer_leads (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.influencer_leads ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_influencer_leads_base44_id ON public.influencer_leads(base44_id);
DROP TRIGGER IF EXISTS trg_influencer_leads_updated_at ON public.influencer_leads;
CREATE TRIGGER trg_influencer_leads_updated_at BEFORE UPDATE ON public.influencer_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== InfluencerPurchase (0 registros) =====
CREATE TABLE IF NOT EXISTS public.influencer_purchases (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.influencer_purchases ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_influencer_purchases_base44_id ON public.influencer_purchases(base44_id);
DROP TRIGGER IF EXISTS trg_influencer_purchases_updated_at ON public.influencer_purchases;
CREATE TRIGGER trg_influencer_purchases_updated_at BEFORE UPDATE ON public.influencer_purchases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== LicenseeLead (0 registros) =====
CREATE TABLE IF NOT EXISTS public.licensee_leads (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.licensee_leads ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_licensee_leads_base44_id ON public.licensee_leads(base44_id);
DROP TRIGGER IF EXISTS trg_licensee_leads_updated_at ON public.licensee_leads;
CREATE TRIGGER trg_licensee_leads_updated_at BEFORE UPDATE ON public.licensee_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== LoteRecebido (0 registros) =====
CREATE TABLE IF NOT EXISTS public.lotes_recebidos (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lotes_recebidos ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_lotes_recebidos_base44_id ON public.lotes_recebidos(base44_id);
DROP TRIGGER IF EXISTS trg_lotes_recebidos_updated_at ON public.lotes_recebidos;
CREATE TRIGGER trg_lotes_recebidos_updated_at BEFORE UPDATE ON public.lotes_recebidos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== LuxuryAuction (0 registros) =====
CREATE TABLE IF NOT EXISTS public.luxury_auctions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.luxury_auctions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_luxury_auctions_base44_id ON public.luxury_auctions(base44_id);
DROP TRIGGER IF EXISTS trg_luxury_auctions_updated_at ON public.luxury_auctions;
CREATE TRIGGER trg_luxury_auctions_updated_at BEFORE UPDATE ON public.luxury_auctions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Negotiation (0 registros) =====
CREATE TABLE IF NOT EXISTS public.negotiations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.negotiations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_negotiations_base44_id ON public.negotiations(base44_id);
DROP TRIGGER IF EXISTS trg_negotiations_updated_at ON public.negotiations;
CREATE TRIGGER trg_negotiations_updated_at BEFORE UPDATE ON public.negotiations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== PartnerPlanPurchase (0 registros) =====
CREATE TABLE IF NOT EXISTS public.partner_plan_purchases (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.partner_plan_purchases ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_partner_plan_purchases_base44_id ON public.partner_plan_purchases(base44_id);
DROP TRIGGER IF EXISTS trg_partner_plan_purchases_updated_at ON public.partner_plan_purchases;
CREATE TRIGGER trg_partner_plan_purchases_updated_at BEFORE UPDATE ON public.partner_plan_purchases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Payment (0 registros) =====
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_payments_base44_id ON public.payments(base44_id);
DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.payments;
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== PaymentSettings (0 registros) =====
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_payment_settings_base44_id ON public.payment_settings(base44_id);
DROP TRIGGER IF EXISTS trg_payment_settings_updated_at ON public.payment_settings;
CREATE TRIGGER trg_payment_settings_updated_at BEFORE UPDATE ON public.payment_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== PriceHistory (0 registros) =====
CREATE TABLE IF NOT EXISTS public.price_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_price_history_base44_id ON public.price_history(base44_id);
DROP TRIGGER IF EXISTS trg_price_history_updated_at ON public.price_history;
CREATE TRIGGER trg_price_history_updated_at BEFORE UPDATE ON public.price_history
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== PricingFormula (0 registros) =====
CREATE TABLE IF NOT EXISTS public.pricing_formulas (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pricing_formulas ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_pricing_formulas_base44_id ON public.pricing_formulas(base44_id);
DROP TRIGGER IF EXISTS trg_pricing_formulas_updated_at ON public.pricing_formulas;
CREATE TRIGGER trg_pricing_formulas_updated_at BEFORE UPDATE ON public.pricing_formulas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== ProductOperation (0 registros) =====
CREATE TABLE IF NOT EXISTS public.product_operations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_operations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_product_operations_base44_id ON public.product_operations(base44_id);
DROP TRIGGER IF EXISTS trg_product_operations_updated_at ON public.product_operations;
CREATE TRIGGER trg_product_operations_updated_at BEFORE UPDATE ON public.product_operations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Sale (0 registros) =====
CREATE TABLE IF NOT EXISTS public.sales (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_sales_base44_id ON public.sales(base44_id);
DROP TRIGGER IF EXISTS trg_sales_updated_at ON public.sales;
CREATE TRIGGER trg_sales_updated_at BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== SaleCommission (0 registros) =====
CREATE TABLE IF NOT EXISTS public.sale_commissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sale_commissions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_sale_commissions_base44_id ON public.sale_commissions(base44_id);
DROP TRIGGER IF EXISTS trg_sale_commissions_updated_at ON public.sale_commissions;
CREATE TRIGGER trg_sale_commissions_updated_at BEFORE UPDATE ON public.sale_commissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== SystemLog (0 registros) =====
CREATE TABLE IF NOT EXISTS public.system_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_system_logs_base44_id ON public.system_logs(base44_id);
DROP TRIGGER IF EXISTS trg_system_logs_updated_at ON public.system_logs;
CREATE TRIGGER trg_system_logs_updated_at BEFORE UPDATE ON public.system_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Wallet (0 registros) =====
CREATE TABLE IF NOT EXISTS public.wallets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_wallets_base44_id ON public.wallets(base44_id);
DROP TRIGGER IF EXISTS trg_wallets_updated_at ON public.wallets;
CREATE TRIGGER trg_wallets_updated_at BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== WalletTransaction (0 registros) =====
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_base44_id ON public.wallet_transactions(base44_id);
DROP TRIGGER IF EXISTS trg_wallet_transactions_updated_at ON public.wallet_transactions;
CREATE TRIGGER trg_wallet_transactions_updated_at BEFORE UPDATE ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== WithdrawalRequest (0 registros) =====
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text
  , base44_id TEXT UNIQUE
  , raw_base44 JSONB
  , created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  , updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_base44_id ON public.withdrawal_requests(base44_id);
DROP TRIGGER IF EXISTS trg_withdrawal_requests_updated_at ON public.withdrawal_requests;
CREATE TRIGGER trg_withdrawal_requests_updated_at BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Mapeamento Base44 → Postgres
-- ============================================================
-- Product                        → public.products  (3543 registros)
-- LiveSession                    → public.live_sessions  (2227 registros)
-- ComparaiLog                    → public.comparai_logs  (1728 registros)
-- AuctionMessage                 → public.auction_messages  (1605 registros)
-- CommissionRecord               → public.commission_records  (1325 registros)
-- CatalogVisit                   → public.catalog_visits  (213 registros)
-- Auction                        → public.auctions  (136 registros)
-- Category                       → public.categories  (52 registros)
-- AppUser                        → public.app_users  (37 registros)
-- FinancialExpense               → public.financial_expenses  (35 registros)
-- Seller                         → public.sellers  (32 registros)
-- BannerImage                    → public.banner_images  (14 registros)
-- DepositPackage                 → public.deposit_packages  (5 registros)
-- Customer                       → public.customers  (4 registros)
-- Store                          → public.stores  (4 registros)
-- FeaturedProduct                → public.featured_products  (3 registros)
-- LuxuryAccessCode               → public.luxury_access_codes  (3 registros)
-- CatalogSettings                → public.catalog_settings  (1 registros)
-- Arrematante                    → public.arrematantes  (0 registros)
-- AsaasPayment                   → public.asaas_payments  (0 registros)
-- AuctionView                    → public.auction_views  (0 registros)
-- BatchRegistration              → public.batch_registrations  (0 registros)
-- Bid                            → public.bids  (0 registros)
-- CashRegister                   → public.cash_registers  (0 registros)
-- CatalogSale                    → public.catalog_sales  (0 registros)
-- DigitalWallet                  → public.digital_wallets  (0 registros)
-- DigitalWalletTransaction       → public.digital_wallet_transactions  (0 registros)
-- FavoriteAuction                → public.favorite_auctions  (0 registros)
-- FooterSettings                 → public.footer_settings  (0 registros)
-- FreteSettings                  → public.frete_settings  (0 registros)
-- InfluencerLead                 → public.influencer_leads  (0 registros)
-- InfluencerPurchase             → public.influencer_purchases  (0 registros)
-- LicenseeLead                   → public.licensee_leads  (0 registros)
-- LoteRecebido                   → public.lotes_recebidos  (0 registros)
-- LuxuryAuction                  → public.luxury_auctions  (0 registros)
-- Negotiation                    → public.negotiations  (0 registros)
-- PartnerPlanPurchase            → public.partner_plan_purchases  (0 registros)
-- Payment                        → public.payments  (0 registros)
-- PaymentSettings                → public.payment_settings  (0 registros)
-- PriceHistory                   → public.price_history  (0 registros)
-- PricingFormula                 → public.pricing_formulas  (0 registros)
-- ProductOperation               → public.product_operations  (0 registros)
-- Sale                           → public.sales  (0 registros)
-- SaleCommission                 → public.sale_commissions  (0 registros)
-- SystemLog                      → public.system_logs  (0 registros)
-- Wallet                         → public.wallets  (0 registros)
-- WalletTransaction              → public.wallet_transactions  (0 registros)
-- WithdrawalRequest              → public.withdrawal_requests  (0 registros)