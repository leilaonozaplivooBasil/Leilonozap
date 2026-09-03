-- Unifica as grafias repetidas de Categoria e Centro de Custo no Financeiro.
--
-- POR QUE (05/09/2026)
-- Aline: "Eu já criei alguns, sendo que não estão ficando salvos, estou tendo que criar a
-- cada lançamento." O botão "+ Novo" nunca criou nada: gravava texto livre naquele
-- lançamento e sumia do dropdown no seguinte. Digitando de novo a cada vez, cada variante
-- virou um rótulo diferente no banco — e o relatório "Por Centro de Custo"
-- (FinancialOverview.jsx) agrupa por STRING EXATA, então o mesmo centro aparecia em duas
-- linhas com o total partido ao meio. O código já foi corrigido; esta migração limpa o
-- que ficou para trás.
--
-- A REGRA DE QUAL GRAFIA VENCE
-- Entre as grafias que ela REALMENTE digitou, vence a mais bem formada: mais acentos
-- primeiro, depois mais maiúsculas. Nenhuma grafia nova é inventada aqui — todas as 8
-- abaixo saíram do próprio banco. Os espaços das pontas caem em todos os casos.
--
-- ALCANCE: 35 linhas de financial_expenses, em 8 grupos. Nenhuma outra tabela.
-- financial_income NÃO é tocada (só tem 'Loja Virtual' e 'Leilões', ambos corretos).

BEGIN;

-- Backup: a tabela inteira antes de qualquer UPDATE. O desfazer está no fim do arquivo.
CREATE TABLE IF NOT EXISTS public.financeiro_rotulos_backup_20260905 AS
SELECT id, category, cost_center FROM public.financial_expenses;

-- ── Centro de custo ───────────────────────────────────────────────────────────
-- "custo fixo" (8) + "Custo Fixo" (1)  →  Custo Fixo
UPDATE public.financial_expenses SET cost_center = 'Custo Fixo'
 WHERE btrim(cost_center) ILIKE 'custo fixo' AND cost_center <> 'Custo Fixo';

-- "custo variável " (2, com espaço no fim)  →  custo variável
UPDATE public.financial_expenses SET cost_center = 'custo variável'
 WHERE btrim(cost_center) = 'custo variável' AND cost_center <> 'custo variável';

-- ── Categoria ─────────────────────────────────────────────────────────────────
-- "Salario" (11) + "salario" (4)  →  Salario   [nenhuma das duas tem acento: mantida a
-- grafia dela, só a maiúscula vence]
UPDATE public.financial_expenses SET category = 'Salario'
 WHERE btrim(category) ILIKE 'salario' AND category <> 'Salario';

-- "alimentação" + "Alimentacao"  →  alimentação   [a com acento vence]
UPDATE public.financial_expenses SET category = 'alimentação'
 WHERE btrim(category) IN ('alimentação', 'Alimentacao') AND category <> 'alimentação';

-- "Cartão de Crédito" + "cartao de credito"  →  Cartão de Crédito
UPDATE public.financial_expenses SET category = 'Cartão de Crédito'
 WHERE btrim(category) IN ('Cartão de Crédito', 'cartao de credito') AND category <> 'Cartão de Crédito';

-- Só espaço nas pontas, uma grafia só em cada:
UPDATE public.financial_expenses SET category = 'Aluguel Escritório'
 WHERE btrim(category) = 'Aluguel Escritório' AND category <> 'Aluguel Escritório';
UPDATE public.financial_expenses SET category = 'Ajudante para galpao'
 WHERE btrim(category) = 'Ajudante para galpao' AND category <> 'Ajudante para galpao';
UPDATE public.financial_expenses SET category = 'reposiçao de material'
 WHERE btrim(category) = 'reposiçao de material' AND category <> 'reposiçao de material';

COMMIT;

-- ── CONFERIR (depois de rodar, tem de voltar ZERO linha) ──────────────────────
-- SELECT campo, chave, count(DISTINCT v) grafias FROM (
--   SELECT 'cost_center' campo, cost_center v FROM public.financial_expenses WHERE COALESCE(cost_center,'')<>''
--   UNION ALL SELECT 'category', category FROM public.financial_expenses WHERE COALESCE(category,'')<>''
-- ) t, LATERAL (SELECT lower(translate(btrim(v),'áàâãéêíóôõúüç','aaaaeeiooouuc')) chave) k
-- GROUP BY campo, chave HAVING count(DISTINCT v) > 1;
--
-- ── DESFAZER ──────────────────────────────────────────────────────────────────
-- UPDATE public.financial_expenses e
--    SET category = b.category, cost_center = b.cost_center
--   FROM public.financeiro_rotulos_backup_20260905 b
--  WHERE e.id = b.id;
