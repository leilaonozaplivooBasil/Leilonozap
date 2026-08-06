-- 🗄️ COFRE DOS DOCUMENTOS ASSINADOS (Contrato de Parceria + Termo de Sigilo)
--
-- Motivo (06/08/2026): o PDF era gerado a cada abertura e nada ficava arquivado.
-- Agora o documento assinado é gravado UMA vez num bucket PRIVADO e a tabela
-- guarda apenas o caminho. Nenhum PDF entra em coluna de tabela.
--
-- ⚠️ Não encosta em nenhuma tabela financeira.

-- 1) Bucket privado. `public = false` => não existe URL pública; o acesso só
--    acontece por link assinado de curta validade, gerado no servidor.
insert into storage.buckets (id, name, public)
values ('documentos-assinados', 'documentos-assinados', false)
on conflict (id) do update set public = false;

-- 2) Nenhuma policy é criada para este bucket em storage.objects.
--    Sem policy, anon e authenticated NÃO leem nem escrevem nada aqui.
--    Somente a service_role (usada nas functions do servidor) enxerga o cofre.

-- 3) Ponteiros do arquivo na trilha de auditoria já existente.
alter table public.contrato_assinaturas
  add column if not exists arquivo_path text,
  add column if not exists arquivo_drive_url text,
  add column if not exists arquivado_em timestamptz;

-- 4) 🔒 TRANCAMENTO DA LEITURA (correção de brecha anterior a este trabalho).
--    A policy antiga era `using (true)`: qualquer requisição com a chave anon
--    conseguia ler assinatura de terceiros — nome, CPF, IP, imagem da assinatura
--    e URLs dos documentos de identidade. Isso é dado pessoal sensível (LGPD).
--
--    Verificado antes de trancar: TODA leitura do app passa por function no
--    servidor com service_role (consultarAssinaturaSigilo / registrar / arquivar),
--    e a service_role ignora RLS. Portanto derrubar a policy NÃO quebra o painel.
drop policy if exists contrato_assinaturas_select on public.contrato_assinaturas;