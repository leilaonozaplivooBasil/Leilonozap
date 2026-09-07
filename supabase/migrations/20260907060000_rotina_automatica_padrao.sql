-- 🌅 DIR-81 — A JORNADA JÁ NASCE ABERTA (dono, 07/09/2026):
-- "eu quero mudar a questão de depender delas gerarem automáticas, já vamos
-- deixar abertas pra incentivá-las... elas acordam hoje cinco horas da manhã
-- e não tem nada... mas a jornada pode deixar completa pra quando ela acordar
-- amanhã, ela ter aquela experiência."
--
-- DIR-80 (a migração anterior) fez a rotina SE REPETIR sozinha, mas só depois
-- da pessoa gerar o primeiro dia NA MÃO — até lá `rotina_automatica` ficava
-- false e ela abria o Compromisso vazio. Isto tira essa dependência: o cron
-- `gerarJornadaDoDia` liga `rotina_automatica` sozinho pra quem tem direito
-- ao X-Game (vendedor pra cima) e nunca decidiu nada — sem esperar o primeiro
-- clique dela.
--
-- Mas "só se a pessoa pedir pra parar" (DIR-80) continua valendo: se ela já
-- clicou "parar de gerar todo dia", o cron NUNCA pode religar sozinho — isso
-- devolveria o automático depois dela ter pedido o contrário. Sem uma coluna
-- própria pra essa recusa, `rotina_automatica = false` não diz se é "nunca
-- decidiu" ou "decidiu que não quer", e o cron ligaria os dois casos iguais.
ALTER TABLE public.metodo_perfil
  ADD COLUMN IF NOT EXISTS rotina_automatica_recusada BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.metodo_perfil.rotina_automatica_recusada IS
  'DIR-81: true quando a PESSOA pediu pra parar de gerar sozinha (botão "parar de gerar todo dia"). Trava o cron gerarJornadaDoDia — ele só liga automático de quem NUNCA decidiu nada.';
