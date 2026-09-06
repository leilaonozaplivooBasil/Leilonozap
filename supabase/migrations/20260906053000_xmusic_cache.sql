-- 🎧 CACHE DAS ESTAÇÕES DO X-MUSIC (06/09/2026).
--
-- POR QUE ELE EXISTE: as estações da casa deixaram de ser link chumbado (que
-- morre e vira botão que não toca) e passaram a ser BUSCA no YouTube, filtrada
-- por videoEmbeddable — só entra o que realmente toca embutido.
--
-- O PROBLEMA QUE ESTA TABELA RESOLVE: cada busca custa 100 das 10.000 unidades
-- diárias gratuitas da conta. Se CADA navegador buscasse ao abrir o painel, uma
-- equipe pequena esgotaria a cota antes do almoço e todo mundo ficaria sem
-- música. Aqui a busca é feita UMA VEZ e o resultado vale pra empresa inteira
-- por algumas horas: ~8 buscas por dia em vez de centenas.
--
-- RLS LIGADO E NENHUMA POLICY, igual ao cofre: o navegador nunca lê esta tabela
-- direto — quem lê e escreve é a rota do servidor (service role), que é a mesma
-- que guarda a chave. Assim a chave continua sem nunca aparecer no cliente.
CREATE TABLE IF NOT EXISTS public.xmusic_cache (
  id TEXT PRIMARY KEY
  , valor JSONB NOT NULL
  , updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.xmusic_cache ENABLE ROW LEVEL SECURITY;
-- (sem policies: negado por padrão pra anon/authenticated; service role passa)
COMMENT ON TABLE public.xmusic_cache IS
  'Resultado das buscas das estações do X-Music, compartilhado por toda a equipe para não estourar a cota diária da YouTube Data API. Só service role. Nunca criar policy de SELECT aqui.';
