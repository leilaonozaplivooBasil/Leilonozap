-- Saldo de TESTE (creditado manualmente por admin, para simular depósitos sem dinheiro real)
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS test_wallet_balance numeric DEFAULT 0;