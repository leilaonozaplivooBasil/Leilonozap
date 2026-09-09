-- xgame_mensagens: fecha o SELECT direto (achado crítico da auditoria
-- pré-publicação, 09/09/2026) e restringe UPDATE só à coluna "lida".
--
-- ⚠️ ESTA TABELA É A EXCEÇÃO À REGRA DE "SELECT USING (true)" que
-- supabase/migrations/LEIA-ME.md recomenda pra tabela nova. Aquela regra
-- vale pra tabela de CONTEÚDO (produtos, leilões, config...), onde o
-- controle de acesso mesmo é feito na camada de aplicação de propósito.
-- `xgame_mensagens` é CORRESPONDÊNCIA PESSOAL — mensagem pro CEO, avisos
-- disciplinares, demanda de colega pra colega — e a policy `qual: true`
-- que ela herdou do padrão das outras tabelas deixava qualquer requisição
-- com a chave anon (pública, vem no bundle do site) ler a caixa de
-- entrada de qualquer um. A partir de agora a única leitura permitida é
-- pela rota `api/functions/xgameMensagensListar.js` (chave de serviço,
-- filtra no servidor com as mesmas regras que a tela já usava).
--
-- INSERT continua liberado (é como a pessoa manda mensagem, e não há
-- sessão real pra maioria dos usuários ainda — ver api/_lib/sessao.js),
-- mas passa a exigir que `remetente_id` seja uma pessoa de verdade.
--
-- UPDATE continua sem checar QUEM está atualizando (mesma limitação),
-- mas agora só a coluna "lida" pode ser alterada por fora do service_role
-- — ninguém consegue mais reescrever o texto/destino de uma mensagem já
-- enviada só fazendo um PATCH direto na tabela.

drop policy if exists xgame_mensagens_select on public.xgame_mensagens;
create policy xgame_mensagens_select on public.xgame_mensagens
  for select
  using (false);

drop policy if exists xgame_mensagens_insert on public.xgame_mensagens;
create policy xgame_mensagens_insert on public.xgame_mensagens
  for insert
  with check (exists (select 1 from public.app_users u where u.id = remetente_id));

revoke update on public.xgame_mensagens from anon, authenticated;
grant update (lida) on public.xgame_mensagens to anon, authenticated;
