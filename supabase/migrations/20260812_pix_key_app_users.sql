-- 🏦 CHAVE PIX POR USUÁRIO (12/08/2026)
--
-- Painel "Pagamentos de Comissões" precisa mostrar a chave PIX de cada pessoa
-- pra o admin pagar manualmente mais rápido (enquanto a integração bancária
-- automática não fica pronta). Guardamos a chave direto no cadastro do usuário.

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS pix_key text;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS pix_key_type text;

COMMENT ON COLUMN app_users.pix_key IS 'Chave PIX pra receber comissões/pagamentos manuais.';
COMMENT ON COLUMN app_users.pix_key_type IS 'Tipo da chave PIX: CPF, CNPJ, EMAIL, PHONE ou RANDOM.';