# O Encontro da Mentalidade e o Painel Corporativo

> **Data:** 06/09/2026 · **Status:** construído, provado, na branch (aguardando "pode colocar em produção").
> **Ditado pelo dono:** "toda segunda a gente tem esse encontro — a Mentalidade do Executivo, do Diretor
> e do CEO. Um lugar estratégico, não na parte administrativa, junto com os 8 Hábitos. Quando eu clicar:
> a apresentação com o tópico; uma IA pra eu digitar as pautas e gerar o tópico; cronômetro de 15 minutos
> de leitura, 45 de treinamento e 2 horas de reunião estratégica. Conforme a reunião acontece, as pautas
> viram demanda pra cada um, no painel de cada um, numa visão executiva de produção pra concluir na semana.
> Um espaço só, não três." E: "dentro de cada um, o painel corporativo: ele vê as metas, recebe as
> demandas (da reunião de diretoria, do CEO, dos diretores) e dali direciona pro seu quadro nos seus
> horários. Visão geral pra todo mundo — um fica tomando conta do outro."

## Onde fica

- **Mentalidade** — item novo da Top College, entre O Método e Time (`catalogo-encontro`). É o encontro.
- **Painel Corporativo** — o primeiro bloco do X-Performance de cada pessoa (e da gestão), com o seletor
  "painel de" pra ver qualquer um do time corporativo.

## O fluxo (uma demanda, do começo ao fim)

1. Segunda, 9h. No **Encontro**, o dono digita as pautas (uma por linha) e aperta **gerar o tópico com a IA**.
   A IA (`InvokeLLM`, Vercel AI Gateway) devolve o tópico no schema da casa: tema, leitura (15), treinamento
   (45, com quem treina), tópicos da reunião (somam 120 min, cada um com objetivo, decisão esperada,
   mentalidade, Hábito, função responsável e a DEMANDA que sai dele) e o fechamento. Se a IA não estiver
   ligada (`AI_GATEWAY_API_KEY`), a régua local monta o tópico com a mesma forma — o encontro nunca fica sem.
2. **Apresentar** abre a tela cheia: capa → abertura → leitura → treinamento → um slide por tópico →
   fechamento com as demandas. Setas e ESC. O cronômetro grande fica no canto.
3. O **cronômetro** (15 · 45 · 120) grava no banco a cada começar/pausar/próximo: vale em qualquer
   aparelho e sobrevive a recarga. Estourou o tempo, fica vermelho com o "+".
4. Em **Direcionar as demandas**, cada tópico já vem com a demanda no imperativo, o responsável sugerido
   pela função (tráfego → CMO → Jean; ponto de retirada → COO → Emanuel) e o prazo na sexta às 18h.
   Um clique e ela cai **RECEBIDA** no Painel Corporativo da pessoa (`xperf_demandas`, ligada ao encontro).
   Demanda que surgiu na hora entra pela linha livre.
5. No **Painel Corporativo**, a pessoa vê a demanda (de quem veio, até quando, o ensinamento) e **agenda no
   seu horário**: dia + hora + destino (no dia / no quadro / os dois) → vira tarefa do Compromisso
   (`metodo_tarefas`, com o valor do fixo) e/ou card do quadro (`metodo_quadro`), com `demanda_id` e
   `encontro_id`. Ou **devolve com motivo**.
6. O estado da demanda é lido da tarefa: agendada → pronto (a conferir) → conferida ✔✔; atrasada quando
   passou do prazo. A **Visão executiva da semana** (no encontro) e **A semana de todo mundo** (no painel)
   mostram, por pessoa, quantas, quantas concluídas, quantas sem agendar, quantas atrasadas.

Quem manda demanda daqui: a gestão (origem `ceo`) e quem tem posição de diretoria no painel (origem
`diretor`). Quem agenda: a própria pessoa e a gestão.

## Banco (`supabase/migrations/20260907030000_encontro_mentalidade.sql`, aplicada)

- `xperf_encontros` + `pautas`, `roteiro` (JSONB), `cronometro` (JSONB), `tema`, `conduzido_por_nome`,
  `treinamento_por_nome`, `roteiro_origem` (`ia` | `local`).
- `xperf_demandas` (nova): título, detalhe, pessoa, origem, quem criou, `encontro_id`, `prazo_em`,
  mentalidade, hábito, peso, categoria, `status` (recebida | agendada | devolvida), `agendada_para`, `hora`,
  `tarefa_id`, `card_id`, `devolvida_motivo`.
- `metodo_tarefas` e `metodo_quadro` + `encontro_id`, `demanda_id`.

## Código

- `src/lib/encontro.js` — BLOCOS e o cronômetro puro (`iniciarBloco`, `pausar`, `avancar`,
  `estadoDoCronometro`), `pautasDoTexto`, `promptDoRoteiro` + `SCHEMA_ROTEIRO`, `roteiroLocal`,
  `normalizarRoteiro`, `funcaoDaPauta`, `sugerirResponsavel`, `demandaDoTopico`, `tarefaDaDemanda`,
  `cardDaDemanda`, `estadoDaDemanda`, `producaoDaSemana`, `slidesDoEncontro`.
- `EncontroMentalidade.jsx` e `PainelCorporativo.jsx` em `src/components/licensing/CentralVendas/`.
- Provas: `tests/encontro.test.mjs` (8) e `tests/navegador/encontro.spec.mjs` (9, com a IA de mentira
  `window.__iaFalsa`).

## Ideias que ficaram na mesa (pra você decidir)

- A leitura de 15 min puxar o trecho do mês do programa da mentoria automaticamente (hoje puxa o Hábito).
- Gravar a ata ao vivo: um campo por tópico durante a reunião (números, gargalo, decisão) que a IA resume
  no fechamento e manda no WhatsApp de cada um com a demanda dele.
- O cronômetro avisar no WhatsApp da sala quando um bloco estourar.
- Presença: quem entrou no encontro (marca pela tarefa de formação do dia) alimenta a fração "cultura e
  formação" do Score Executivo.
