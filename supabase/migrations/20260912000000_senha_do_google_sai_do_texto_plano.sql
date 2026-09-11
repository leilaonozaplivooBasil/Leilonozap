-- 🔐 AS 55 CREDENCIAIS QUE DAVAM PRA LER NO SITE — 11/09/2026
--
-- ══════════════════════════════════════════════════════════════════════════════
-- O QUE ISTO FECHA
-- ══════════════════════════════════════════════════════════════════════════════
-- Três coisas verdadeiras ao mesmo tempo, e juntas viram tomada de conta:
--
--   1. `api/functions/googleLogin.js` cria quem entra pelo Google com
--      `password: crypto.randomUUID()` gravado EM TEXTO na app_users.
--
--   2. A policy `public_read` da app_users é SELECT, papel `anon`, `qual = true`
--      — a tabela inteira, coluna `password` incluída, aberta para a chave
--      publicável que vai no pacote do site.
--
--   3. `api/functions/login.js` aceita essa coluna como credencial: quando não
--      há hash na app_users_auth, ele compara `stored === password`, string com
--      string.
--
-- Juntando: qualquer pessoa lê o UUID com a chave pública, digita como senha e
-- entra na conta. São 55 contas — e crescia sozinho, porque cada login novo
-- pelo Google criava mais uma.
--
-- ══════════════════════════════════════════════════════════════════════════════
-- O QUE NÃO É
-- ══════════════════════════════════════════════════════════════════════════════
-- Não é vazamento de senha de cliente. Conferimos o formato das 55, uma a uma:
-- TODAS são UUID gerado pelo servidor (36 caracteres, padrão 8-4-4-4-12).
-- Nenhuma senha digitada por uma pessoa estava ali. Ninguém teve senha reusada
-- exposta — o que estava exposto era a chave da porta, não a senha do cofre.
--
-- ══════════════════════════════════════════════════════════════════════════════
-- O QUE ESTA MIGRAÇÃO FAZ
-- ══════════════════════════════════════════════════════════════════════════════
-- Transforma cada uma em bcrypt na app_users_auth (tabela isolada, só a service
-- role lê) e apaga o texto. Ninguém perde o acesso: continua entrando com o
-- mesmo UUID, só que agora comparado contra hash.
--
-- O `crypt(..., gen_salt('bf', 10))` do pgcrypto gera `$2a$10$...`, que é o que
-- o `bcrypt.compareSync` do login.js já sabe conferir — mesmo formato que as
-- outras 672 contas da tabela.
--
-- 🟢 As duas pontas de código entram junto com esta migração:
--    • googleLogin.js para de gravar o UUID na coluna;
--    • login.js limpa a coluna quando migra texto→bcrypt, para não crescer de novo.
--    Sem elas, isto aqui é varrer para debaixo do tapete — volta na semana que vem.

-- 1. cada senha em texto vira hash na tabela isolada.
--    `on conflict do nothing`: quem já tem hash lá é a verdade, não sobrescreve.
insert into public.app_users_auth (user_id, password_hash)
select u.id, crypt(u.password, gen_salt('bf', 10))
  from public.app_users u
 where u.password is not null
   and u.password <> ''
   and u.password not like '$2%'      -- o que já é bcrypt fica como está
on conflict (user_id) do nothing;

-- 2. só então apaga o texto. Se o passo 1 não gravou (conflito), a pessoa
--    continua com o hash antigo — em nenhum caminho ela fica sem credencial.
update public.app_users
   set password = null
 where password is not null
   and password <> ''
   and password not like '$2%'
   and exists (select 1 from public.app_users_auth a where a.user_id = app_users.id);

-- 3. e o que porventura já estivesse em bcrypt na coluna errada também sai de
--    lá — a app_users não é lugar de credencial, em nenhum formato.
insert into public.app_users_auth (user_id, password_hash)
select u.id, u.password
  from public.app_users u
 where u.password like '$2%'
on conflict (user_id) do nothing;

update public.app_users
   set password = null
 where password like '$2%'
   and exists (select 1 from public.app_users_auth a where a.user_id = app_users.id);

comment on column public.app_users.password is
  'OBSOLETA — não gravar. Credencial mora em app_users_auth.password_hash, que o anon não lê. Ver migração 20260912000000.';
