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

- **Mentalidade** — item novo da Top College, entre O Método e Time (`catalogo-encontro`), com duas abas
  e **nada administrativo** (dono: "não quero na parte administrativa, quero junto do fluxo"):
  - **Mentalidade de segunda** — a reunião (abre nela às segundas);
  - **X-Performance** — em duas partes (dono, 06/09: "em cima os números da equipe toda, sem nome, bem
    executivo; embaixo o detalhamento de cada um, com uma prévia na linha"):
    1. **Os números do time** (hoje · semana · mês): seis números (média de hábitos, com os 8 inteiros, sem
       nenhum, acordaram às 5, contatos, venderam ou fecharam), os **8 Hábitos** em oito cartões só com
       número, % e barra, e os quatro números da semana (planejaram, produziram, demandas, semáforo).
       Nenhum nome aparece aqui. A leitura vem do dado real (`src/lib/habitosDoTime.js`: quadro dos sonhos,
       story das 05:15, lista qualificada, contatos do método, apresentações e reuniões de investimento,
       vendas pagas e captações fechadas, planejamento e números, treinamentos e entregáveis).
    2. **Detalhamento por pessoa**: uma linha por pessoa (a prévia: semáforo, hábitos em bolinhas, hoje,
       semana, demandas, produção). Clicar abre embaixo da linha os **8 Hábitos dela** com o detalhe (fez e
       quanto / não fez e por quê), o botão **PDF** e o **Painel Corporativo** dela (metas, demandas, a semana
       de todo mundo). Um aberto por vez; quem está logado abre por padrão.
    - **PDF do executivo** (dono: "geração de PDF de cada executivo pra ser compartilhado"): sai do cabeçalho
      do detalhe e do Painel Corporativo. Faixa X-EOS, régua da Top College, semáforo, 4 números, os 8 Hábitos
      da pessoa no período, metas com barra, demandas com estado, produção da semana — texto vetorial (jsPDF,
      ~30 KB). No celular que compartilha arquivo abre a folha de compartilhar (WhatsApp); senão baixa
      `x-performance-nome-da-pessoa-AAAA-MM-DD.pdf`. O balão ao lado copia o relatório em texto pro WhatsApp.
    - Nome bonito em todo lugar (o painel guarda "JOSÉ AMÂNCIO" e "DISTRIBUIDOR").
    - **A cara (dono, 06/09: "está muito colorido, quero bem clean, bem executivo")**: número em branco, apoio em
      cinza, e cor só onde é sinal — o semáforo da pessoa, "atrasada", "sem agendar", "não fez". Nenhum Hábito
      tem cor própria; nenhum degradê de fundo. Os seis números numa régua; os 8 Hábitos numa grade; a semana em
      uma linha no cabeçalho do detalhamento.

## "Só o meu" ou "tudo" — o escopo de visão (06/09)

O dono é dois ao mesmo tempo: o usuário Luiz (a lista, a agenda, a carteira dele) e o super admin (a plataforma
inteira). A tela misturava os dois sem dizer qual estava mostrando ("está confundindo a orquestra").

**Onde estava misturando (auditoria de todo o painel):**

| Lugar | Como estava | Como ficou |
| --- | --- | --- |
| Os 8 Hábitos (CRM): Lista, Contato, Agendamento | quem tinha visão total (admins, financeiro, diretoria) via a lista de TODO MUNDO junto com a própria, e a rede abaixo entrava na do executivo | **individual**: cada um vê só o que cadastrou (`escopoDoMetodo.js`); só o super admin, e só em "Tudo", vê todas |
| Os 8 Hábitos (CRM): Esteira, Clientes, Visão Executiva, KPIs | visão total automática pra quem a matriz de papéis dá | visão total **só quando a pessoa escolhe "Tudo"**; em "Só o meu" a tela é a de um usuário comum |
| Contato: o botão "MINHA AGENDA / TIME INTEIRO" escondido dentro da agenda | um botão local, só ali, e a fila "minha" só filtrava pelo dono na visão total | saiu; o escopo é o do seletor do topo; a fila "minha" filtra pelo dono sempre |
| Relógio de teste e agenda da empresa (gestão) | apareciam junto com a visão total dos dados | separados: são capacidades do super admin (`gestao`), valem mesmo em "Só o meu" |
| Mentalidade / X-Performance | já era explícito (o detalhamento é de todo mundo por desenho; o painel diz "painel de …") | sem mudança |
| ADM X-Game (o quadro de entregáveis) | recebia o CRACHÁ (`isAdmin`) e ignorava a escolha: o dono escolhia "só o meu" no Método e a ADM X-Game seguia mostrando o quadro da diretoria inteira (diagnóstico do outro chat, 07/09) | a Licensing resolve o escopo UMA vez (`useEscopoDeVisao` + `resolverEscopo`) e passa `visaoTotal = crmTudo`; o seletor aparece ali também. "Só o meu" = só os entregáveis dele (paralelo direto do Método) |

**O seletor** (`SeletorEscopo.jsx`, regra em `escopoDeVisao.js`): aparece no topo dos 8 Hábitos só pra quem tem
visão total. Duas opções, "Só o meu" e "Tudo · Super Admin" (ou "Tudo · Diretoria…"), e uma linha embaixo dizendo
"Você está vendo: só o meu · como usuário" ou "tudo · como Super Admin". A escolha fica guardada no aparelho e vale pra
todas as seções. Padrão: "só o meu". Duas camadas: `crmTudo` (o resto do CRM, pra quem a matriz dá) e `metodoTudo`
(lista/contato/agendamento, só o super admin).

## Os três destinos — o dia, a Jornada e o quadro (06/09)

Dono: "quando eu adicionar na lista, dá a opção de botar na Jornada e no quadro; quando adicionar no quadro, dá a
opção de botar na lista e na Jornada. Toda alimentação alimenta ambas. E com uma comunicação mais clara — a pessoa
não está entendendo o quadro."

**O que cada destino é** (regra escrita em `src/lib/destinos.js`):

| Destino | O que é no banco | Como se entra |
| --- | --- | --- |
| O dia (a Lista) | uma linha em `metodo_tarefas` na data | é o compromisso do dia |
| A Jornada | a MESMA tarefa do dia, quando tem horário | "botar na Jornada" = dar uma hora; sem hora a tarefa fica no balde "sem hora", fora da linha do tempo |
| O quadro | um card em `metodo_quadro`, numa lista da pessoa | é o backlog; card e tarefa se ligam por `virou_tarefa_id` |

**A peça única** (`EntradaComDestinos.jsx`), nos dois lugares: na Lista o dia é certo e ela oferece a hora (= a
Jornada) e "também no quadro" (com a lista); no quadro o quadro é certo e ela oferece "também no meu dia" e a hora.
Enquanto a pessoa escreve, a frase embaixo diz por extenso: "Vai entrar: no quadro (Academia) · no seu dia, na Jornada
às 07:30"; sem hora avisa "sem horário fica fora da Jornada". Ao gravar: "Entrou no quadro (Academia) e no seu dia, na
Jornada às 07:30."

**O card fala onde está**: três pílulas fixas — quadro · dia · Jornada — acesas ou apagadas ("no quadro · Academia",
"no seu dia", "na Jornada às 07:00"). O caso que confundia (no dia sem horário) virou alerta escrito: "sem horário ·
fora da Jornada". Saíram os chips soltos "horário" / "no dia" e o botão "pro meu dia / já está no dia": agora é **levar
pro meu dia**, que abre um painel dizendo "Levar pro meu dia — hoje · com horário entra na Jornada; sem horário fica
no dia, fora da linha do tempo", com a hora, o sugerir, o aviso de choque e o botão "Entrar no dia às 19:30". Quem já
está no dia vê "dar um horário" ou "mudar horário (07:00)".

Provas: `tests/destinos.test.mjs` (6) e a banca `tests/navegador/quadro.spec.mjs` (3: as pílulas, levar pro dia com
hora e choque, a entrada nova com os destinos).

## A limpeza de sênior da X-Performance (07/09)

Dono: "está ficando muito confuso… todas as abas têm que ter o botão de super admin, bem pequeno… faça o que
precisa ser feito e deixe fluido". O que mudou, em ordem do que mais muda a leitura:

1. **O seletor "Só o meu / Tudo" mora no topo da página inteira**, compacto, junto do seletor de seções da Top
   College (Licensing). Vale pra todas as áreas. Em "Tudo" a página ganha um fio âmbar no topo e cada seção diz
   "Você está vendo: tudo · como Super Admin". Todos os usos do hook ficam sincronizados (um store no módulo).
   Na X-Performance, "Só o meu" faz o time virar só a própria pessoa: os números viram os dela e a tabela fica
   com a linha dela aberta.
2. **Contas institucionais fora do time** (`pareceConta` em `timeCorporativo.js`): nomes com " – ", "Site
   Oficial", "Distribuidor", "Live", "Loja", "Canal"… não são gente. Saem da média, do "sem nenhum hábito" e da
   tabela; a tela diz "N contas institucionais fora do time". Até existir a marca no cadastro, a leitura é pelo nome.
3. **A tabela sem ruído**: quem tem atividade vira linha; quem não tem nada vai pra um grupo fechado embaixo,
   "sem atividade hoje (11): Aline, Beatriz…", nomes clicáveis (abre o detalhe) e "mostrar as linhas".
4. **Cor só onde é sinal**: saiu a coluna "produção" (fez / não fez em vermelho pra 14 de 16). Vermelho só em
   "atrasada"; âmbar em "sem agendar" e "não planejou". O semáforo passou a contar dia vazio como um furo
   (amarelo) — verde é só quem planejou e está em dia.
5. **Largura máxima 1400 e tipografia maior**; os seis números numa régua; os 8 Hábitos numa linha só no desktop.
6. **Herói do X-office menor** e a faixa de abas da Mentalidade fixa ao rolar.
7. **Período inteligente**: se "hoje" está vazio pra todo mundo, abre em "semana" e avisa.
8. **Vazio que fala**: "—" no lugar de "0/0 · 0%", "ninguém ainda" no lugar de "0 sonhos no time", "nenhum
   ainda" nos contatos.
9. **Prévia mais útil**: a semana vira "2 de 3 feitas" em vez de "2/3 · 67%".

Ficou de fora, de propósito: "definir a meta" a partir do detalhe (precisa de um caminho até o Quadro Geral) e a
marca de conta no cadastro (precisa de migração — entra pelo workflow, não pela mão).

## O que estava duplicado e virou uma coisa só (06/09)

O dono pediu uma análise do painel inteiro ("o que der pra juntar, une — exemplo: enviar demanda"). O que se
repetia entre o Encontro, a X-Performance e o Painel Corporativo:

| Repetia | Onde | Ficou |
| --- | --- | --- |
| Mandar uma demanda (linha com título, pessoa, prazo, botão) | Encontro ("demanda que surgiu na hora") e Painel Corporativo ("mandar uma demanda") | Um componente só, `MandarDemanda.jsx`, nos dois lugares. Continuam dois momentos (na reunião, ligada ao encontro; qualquer dia, do CEO/diretor), mas um código e uma cara. O "direcionar" por tópico do Encontro fica, é o coração da reunião. |
| A semana de todo mundo (quem concluiu quantas demandas) | Encontro ("Visão executiva da semana"), Painel ("A semana de todo mundo") e X-Performance (coluna demandas do detalhamento) | Dentro da X-Performance o painel embutido **não repete** — a tabela de cima já é isso. O Encontro mantém a Visão executiva (é a leitura ao vivo da reunião). O painel sozinho (fora da X-Performance) mantém a sua. |
| Quem é a pessoa (nome, posição, função, semáforo, seletor, PDF) | Cabeçalho do detalhe da X-Performance e cabeçalho do Painel Corporativo | O painel embutido (`embutido`) esconde o dele: só metas e demandas. O detalhe tem o cabeçalho e o PDF (em cima e no rodapé). |
| Os números da semana (planejaram, produziram, demandas, semáforo) | Um bloco de quatro cartões no topo da X-Performance e a mesma coisa lida linha a linha na tabela | Uma linha compacta no cabeçalho do detalhamento; o topo fica só com os Hábitos. |

O que ficou de propósito: "Produção da semana" dentro das metas da pessoa (é o número dela, não do time) e a
Visão executiva do Encontro (é a reunião olhando a semana).
- A seção administrativa da faixa virou **ADM X-Game** (dono: "tudo que for administração do X-Game,
  tarefas, organização de cima pra baixo"): fixo, distribuir, quadro geral, ciclo, fila do pronto,
  comprovações. Só a gestão.

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
- `src/lib/habitosDoTime.js` — os 8 Hábitos do time lidos do dado real.
- `src/lib/relatorioExecutivo.js` — `nomeBonito`, `habitosDaPessoa`, `agruparPorMotivo`, `relatorioDoExecutivo`
  (o conteúdo do PDF, puro), `textoDoRelatorio` (WhatsApp), `paraPdf` (só o que a Helvetica desenha).
- `EncontroMentalidade.jsx`, `PainelCorporativo.jsx` (`embutido`), `PerformanceEquipe.jsx` (os números e o
  detalhamento), `MandarDemanda.jsx` (a linha única de mandar demanda) e `PdfExecutivo.jsx` (o desenho em jsPDF)
  em `src/components/licensing/CentralVendas/`.
- Provas: `tests/encontro.test.mjs`, `tests/habitosDoTime.test.mjs`, `tests/relatorioExecutivo.test.mjs` e
  `tests/navegador/encontro.spec.mjs` (12 casos, com a IA de mentira `window.__iaFalsa`; o do PDF baixa o
  arquivo de verdade e lê o texto copiado).

## Ideias que ficaram na mesa (pra você decidir)

- A leitura de 15 min puxar o trecho do mês do programa da mentoria automaticamente (hoje puxa o Hábito).
- Gravar a ata ao vivo: um campo por tópico durante a reunião (números, gargalo, decisão) que a IA resume
  no fechamento e manda no WhatsApp de cada um com a demanda dele.
- O cronômetro avisar no WhatsApp da sala quando um bloco estourar.
- Presença: quem entrou no encontro (marca pela tarefa de formação do dia) alimenta a fração "cultura e
  formação" do Score Executivo.
