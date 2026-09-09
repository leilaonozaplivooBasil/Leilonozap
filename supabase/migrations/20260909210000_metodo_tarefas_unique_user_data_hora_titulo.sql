-- 🔒 UMA TAREFA POR pessoa/dia/hora/título — a trava contra duplicata.
--
-- ⚠️ 09/09/2026 — ESTE ARQUIVO PRECISOU FICAR IDEMPOTENTE, E O MOTIVO IMPORTA.
--
-- A mesma constraint já foi aplicada direto no banco às 08h24 e está gravada no
-- histórico como a versão 20260909082446 (que agora tem arquivo próprio, ao
-- lado). Este arquivo aqui nasceu depois, com timestamp NOVO, tentando
-- consertar a órfã — mas timestamp novo não adota a versão antiga: a órfã
-- continuou órfã E este arquivo passou a existir como migração pendente.
--
-- 🔴 O QUE IA ACONTECER: `ADD CONSTRAINT` não aceita `IF NOT EXISTS` no
-- Postgres. Assim que o canal de migrações destravasse, este arquivo rodaria
-- contra um banco que JÁ TEM a constraint e falharia com 42710 (constraint
-- already exists) — travando o deploy de novo, no primeiro push depois do
-- conserto. Um travamento consertando o travamento.
--
-- Por isso o guarda abaixo: se a constraint já existe, não faz nada. Em banco
-- novo (preview, restauração), ela é criada normalmente.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.metodo_tarefas'::regclass
      and conname = 'metodo_tarefas_user_data_hora_titulo_key'
  ) then
    alter table public.metodo_tarefas
      add constraint metodo_tarefas_user_data_hora_titulo_key
      unique (user_id, data, hora, titulo);
  end if;
end $$;
