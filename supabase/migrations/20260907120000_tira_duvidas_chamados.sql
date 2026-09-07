-- 🆘 TIRA DÚVIDAS 24h — o chamado que o USUÁRIO abre.
--
-- POR QUE UMA TABELA NOVA, E NÃO xperf_demandas.
-- `xperf_demandas` é demanda de CIMA PRA BAIXO: nasce no Encontro da
-- Mentalidade com `pessoa_id NOT NULL`, prazo e peso — alguém já decidiu
-- quem leva. Aqui é o contrário: a pessoa relata uma dúvida ou um problema
-- e NÃO existe responsável nem prazo naquele instante; quem decide isso é o
-- dono, depois. Encaixar isto lá obrigaria a mandar pra alguém no ato de
-- reportar — inventar um dono pro problema antes de saber o que ele é.
--
-- A PONTE: quando o dono prioriza um chamado, ele vira uma linha em
-- `xperf_demandas` direcionada a quem vai fazer, e `demanda_id` guarda o
-- vínculo. Assim o despacho reaproveita Painel Corporativo, quadro e X-Game
-- em vez de criar um mundo paralelo de tarefas.
create table if not exists public.suporte_chamados (
  id            uuid primary key default gen_random_uuid(),

  -- quem falou
  usuario_id    text,
  usuario_nome  text,

  -- o que ela mandou. `entrada` diz por onde veio, porque áudio e print
  -- exigem leitura diferente na hora de conferir depois.
  entrada       text not null default 'texto',   -- texto | audio | imagem
  pergunta      text not null,                   -- o texto (ou a transcrição do áudio)
  transcricao   text,                            -- o bruto do Whisper, quando veio de áudio
  imagem_url    text,
  pagina        text,                            -- de onde ela chamou, pra reproduzir o caso

  -- o que a IA devolveu na hora
  resposta      text,
  titulo        text,                            -- resumo curto, pro dono bater o olho
  -- duvida = respondida e pronto. bug/erro/correcao/otimizacao = vira trabalho.
  tipo          text not null default 'duvida',
  prioridade    smallint not null default 3,     -- 1 = para tudo … 5 = quando der
  confianca     smallint,                        -- 0-100: o quanto a IA achou que sabia

  -- o despacho do dono
  status        text not null default 'aberto',  -- aberto | em_analise | resolvido | virou_demanda | descartado
  demanda_id    uuid,                            -- ↔ xperf_demandas.id, quando vira trabalho
  nota_interna  text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists suporte_chamados_status_idx on public.suporte_chamados (status, prioridade, created_at desc);
create index if not exists suporte_chamados_usuario_idx on public.suporte_chamados (usuario_id, created_at desc);

-- 🔒 RLS LIGADA NA MESMA MIGRAÇÃO — regra do LEIA-ME de supabase/migrations.
-- Tabela sem RLS é buraco aberto; tabela com RLS e sem política de leitura é
-- lista vazia que parece "sem dado". As duas coisas já morderam este projeto.
alter table public.suporte_chamados enable row level security;

-- Leitura liberada: o controle de quem vê o quê é feito na aplicação, como é
-- o padrão daqui (ver contrato_assinaturas_select).
drop policy if exists suporte_chamados_select on public.suporte_chamados;
create policy suporte_chamados_select on public.suporte_chamados for select using (true);

-- Escrita NÃO tem política: fica exclusiva do service_role, que é por onde as
-- rotas de api/ gravam. Ninguém escreve chamado direto do navegador.
