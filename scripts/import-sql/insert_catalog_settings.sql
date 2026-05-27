-- CatalogSettings → catalog_settings (1 registros)
-- ATENÇÃO: ON CONFLICT (base44_id) DO NOTHING — idempotente

INSERT INTO public.catalog_settings (base44_id, raw_base44, created_by, created_by_id, created_date, featured_section_description, featured_section_title, is_sample, updated_date) VALUES
  ('697bbb671b270afc665d7f50', '{"featured_section_title": "⭐ Produtos em Destaque", "featured_section_description": "TESTE", "id": "697bbb671b270afc665d7f50", "created_date": "2026-01-29T19:56:23.664000", "updated_date": "2026-01-29T19:56:49.469000", "created_by_id": "68d536db3c26ff51f79c4138", "created_by": "luizsantanna@tttcorporate.com", "is_sample": false}'::jsonb, 'luizsantanna@tttcorporate.com', '68d536db3c26ff51f79c4138', '2026-01-29T19:56:23.664000', 'TESTE', '⭐ Produtos em Destaque', FALSE, '2026-01-29T19:56:49.469000')
ON CONFLICT (base44_id) DO NOTHING;

