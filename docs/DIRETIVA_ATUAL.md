# DIRETIVA ATUAL — Leilão NoZap

> Este arquivo contém **só a diretiva de engenharia em vigor agora** — o que
> está autorizado a acontecer nesta rodada, e nada além disso. Quando uma
> diretiva nova for definida (pelo dono ou pela OpenAI), este arquivo é
> **substituído** pelo conteúdo da diretiva nova; a versão anterior não se
> perde — vai para `docs/HISTORICO_DIRETIVAS.md` no mesmo commit, e o
> resultado dela para `docs/RELATORIOS_EXECUCAO.md`.
>
> Formato fixo desta diretiva e de toda diretiva futura:
> `docs/PADRAO_DIRETIVAS.md`.

---

## DIR-170.1 — Encontro da Mentalidade: vários livros, a trajetória do treinamento, a lista da Produção no lugar certo e o teclado que não pula lâmina

**Status:** EM VIGOR. (Continuação da DIR-168 do Encontro; o número 168 já tinha sido usado por outra frente.)

**Emitida por:** dono (21/09/2026, testando em produção): *"Preciso adicionar o livro do Napoleão Hill — ter espaço pra adicionar e retirar os livros. Quando eu aperto espaço editando, ele pula pra outra lâmina. Ver o que precisa melhorar pra ficar mais conexo às lâminas e à trajetória do treinamento. E a lista de coisas pra fazer: onde fica, tanto dentro da edição das lâminas como fora — um lugar pros diretores botarem as pautas e aparecer nessas duas horas finais."*

1. **Vários livros** (`xperf_encontros.livros`, lista de até 6; o `livro` antigo vira o primeiro item): "adicionar livro" e "retirar", cada um com título, autor, capa e PDF. A lâmina da Leitura vira "os livros da semana" quando há mais de um, com as capas e um botão de PDF por livro; o treinamento diz "baseado em: A · B". Hoje: Salomão (capa e PDF já subidos pelo dono) e As 16 Leis do Triunfo (Napoleão Hill).
2. **Teclado**: dentro de campo de texto (ou com o editor de lâmina aberto), espaço e setas são do texto — não navegam; ESC fecha só o editor. Antes o atalho global comia o espaço e trocava de lâmina no meio da frase.
3. **A trajetória do treinamento**: a lâmina do treinamento vira a capa (título, quem treina, baseado em, "8 passos — um por lâmina") e cada passo ganha a própria lâmina ("passo 3 de 8", com o livro no rodapé e o PDF à mão). Oito passos numa lâmina só era uma parede de texto.
4. **A lista da Produção abre as duas horas**: a lâmina "Produção · o que precisa ser conversado" vem logo depois do treinamento, antes dos tópicos; o Fechamento (última) diz quantos itens ficam pra próxima segunda. Dentro do editor dessa lâmina os diretores colocam e movem as pautas sem sair da apresentação (fora, a seção em três colunas continua).

**Banco:** migração `20260921113053_encontro_varios_livros` aplicada (coluna `livros`, com o `livro` existente copiado pra lista). Arquivo no repositório com a mesma versão.

**Testes:** +3 em `tests/encontroLivroLaminasPautaViva.test.mjs`; ids das lâminas atualizados em `tests/encontro.test.mjs`. Suíte 3117; eslint 0 erros; build ok; `npm run colisao` limpo.
## DIR-170 — auditoria diligente do Ritual do Amanhecer: ajuda humana depois de tentar muito, o motivo da IA num lugar que dá pra ler, e a câmera parando de cortar a pessoa

**Emitida por:** dono, vendo a Sophia Sant'anna (9 anos) travada no ritual, reprovada 11 vezes num único dia (22 no dia 17/09): *"faz uma auditoria no da Sofia... vamos fazer uma análise bem diligente em todo o ritual pra ver o que pode estar tá ruim, a cor, a comunicação."* Depois, com a análise na mão: *"essa chance de explicar tem que vir com um fundo, bem bonito, negrito... leia com atenção... e aí vinha o erro escrito com um fundo do texto, porque senão a pessoa não lê. A barra do vídeo precisa estar mais visual, os segundos precisa contar. O batimento das fotos precisa abrir melhor, maior a câmera — pegando praticamente o celular todo. Aplica tudo, sem quebrar o que já está funcionando."*

**Achado 1 — a IA se contradisse na cara.** A foto do "acordei" da Sophia hoje: a própria IA descreveu "uma criança sorrindo, em pé numa sala de casa" — e mesmo assim reprovou dizendo "não aparece a pessoa responsável pela tarefa". A régua "pessoa errada é reprovação direta" (criada em 16/09 por causa de OUTRO caso dela, quando fotos de criança geravam só "dúvida" e quase passavam por brecha) endureceu demais: passou a tratar "não tenho certeza absoluta de quem é" como se fosse "é claramente outra pessoa" — e uma criança sem Instagram/print de story nunca vai ter como provar identidade com certeza absoluta.

**Achado 2 — auditoria de produção confirma que é ela, não "todo mundo".** Nos últimos 7 dias, quase todo mundo fecha o ritual em ~4 tentativas. A Sophia teve 11 hoje, 22 em 17/09, 6 (reprovado) em 15/09 — a clara exceção, não a regra.

**Achado 3 — sem regra pra "não tem pessoa nenhuma na imagem".** O vídeo da visualização dela (aparentemente um bichinho/quintal no frame) caiu num balde genérico de "reprova se for gritante", sem chance de explicar — podia ser só um frame ruim de um vídeo real.

**Achado 4 — câmera cortada.** A câmera ao vivo do bloco Visualização era um círculo de 160×160px (`w-40 h-40 rounded-full`), cortando a pessoa pelos quatro cantos. A barra de progresso do vídeo (`DicaDaEtapa`) some assim que bate o mínimo de 120s — dos 2 aos 15 minutos de gravação, sobra só o número do cronômetro, sem barra nenhuma.

**Correção pontual do dado:** o ritual de hoje da Sophia foi aprovado manualmente direto no banco (os dois vereditos originais da IA foram preservados como histórico, não apagados — só marcados como revisão manual).

**O que entra:**
1. `api/functions/xgameValidarPrint.js` — a régua de identidade ganha uma revisão: pessoa REAL e visível, sem sinal concreto de ser outra pessoa, vira aprovada mesmo sem prova de identidade (a régua antiga contra pessoa CLARAMENTE errada continua de pé). Imagem sem nenhuma pessoa (grama, animal, objeto) ganha regra própria: pergunta antes de reprovar, em vez de julgamento livre.
2. `src/lib/ritualEmBlocos.js` — depois de 3 "refazer" no MESMO bloco (`REFAZER_ANTES_DE_AJUDA`), a pessoa ganha a opção de **pedir ajuda a um gestor**, sem perder o direito de continuar tentando. `CrmMetodo.jsx` grava o pedido (`pedirAjudaNoRitual`) sem mexer em status/valido — o ritual continua visível na fila de "em análise" do gestor.
3. `XGameRitualAmanhecer.jsx` — o painel de atenção ganha um selo "⚠️ Leia com atenção" e o motivo real da IA vira uma caixa clara, em negrito (era texto translúcido, fácil de pular). Cada estado (refazer / dúvida / pode pedir ajuda / ajuda pedida) ganha um tom de cor próprio, mais forte que antes. A câmera da visualização passa a ocupar quase a largura toda da tela, em retrato, sem cortar em círculo. A barra de progresso do vídeo não some mais depois do mínimo — continua visível (em verde, "já vale") até o teto de segurança de 15 minutos.

**Fora do escopo (conferido e descartado, não esquecido):** a câmera de foto comum (`XGameComprovarModal.jsx`, usada nas tarefas da Lista) já é `w-full aspect-video` — não é um "quadradinho cortado", não mexi. Jornada e Quadro dos Sonhos não têm câmera nenhuma (mapeado por agente dedicado) — não há o que aumentar lá.

**Prova:** suíte completa (3127/3127, `tests/ritualAjudaHumanaEVisual.test.mjs` novo com 19 testes), lint limpo, `npm run build` sem erro. Mutação: (1) troquei `>=` por `>` no limite de ajuda → 2 testes quebraram; revertido. (2) desliguei a prioridade de `ajudaPedida` sobre `podePedirAjuda` → 2 testes quebraram; revertido. (3) troquei "trate como aprovada" por "reprovada" no prompt → 1 teste quebrou; revertido. (4) voltei a câmera pro círculo cortado antigo → 1 teste quebrou; revertido.

**Status:** EM VIGOR.

---

## DIR-169 — salvar a rotina passa a ligar a repetição sozinha, com a data à mostra

**Emitida por:** dono (21/09/2026), depois da correção pontual que trouxe de volta os itens de hoje da rotina dele: *"eu cliquei em salvar, veja o botão se está funcionando. É melhor quando salvar a rotina precisa ter como ver a rotina pra frente com a data do dia seguinte comprovando que está salva."*

**Achado — o botão "salvar" nunca ligava a repetição.** A auditoria da rotina "desaparecida" (mesmo dia) achou a causa real: `rotina_automatica: false` + `rotina_automatica_recusada: true` no perfil dele — uma vez desligado (botão "parar de gerar todo dia"), nem o cron nem a abertura da tela voltavam a gerar o dia sozinhas. `gravarRotina` (o "salvar" que ele usa pra editar a rotina item por item) NUNCA ligava essa chave de volta — só `gerarDia`/`regerarDia` (botões separados, escondidos) faziam isso. Editar e salvar a rotina parecia, pra ele, que "agora ela repete" — mas silenciosamente não mexia em nada da automação se ela já tivesse sido desligada antes. Essa é a armadilha que causou o "sumiço".

**O que entra (`CrmMetodo.jsx`):**
1. `gravarRotina` agora liga `rotina_automatica` e desliga `rotina_automatica_recusada` sozinha, sempre que salva a rotina e a automação ainda não estava ligada — salvar passa a significar de verdade "isso repete", sem depender de um segundo clique escondido em outro botão.
2. Prova visível e PERSISTENTE (não só um toast que some) de que está salva e de quando entra em vigor: um selo no cabeçalho recolhido de "A minha rotina" (`· ✅ liga sozinha` / `· ⏸ parada`, sem precisar abrir o painel) e, dentro do painel aberto, o dia da semana + a data concreta do próximo dia em que ela nasce sozinha (`proximoDiaRotina`, mesmo cálculo de `valeAPartirDe` já usado no resto do sistema). O toast de "rotina salva" também passa a citar essa data em vez de um "amanhã" genérico.

**Fora do escopo:** não mexe no botão "parar de gerar todo dia" (continua desligando do jeito que já desligava, decisão explícita da pessoa) nem em `gerarDia`/`regerarDia` — a mudança é só em `gravarRotina` passar a ligar a automação quando ainda estava desligada, igual os outros dois botões já faziam.

**Prova:** suíte completa (3108/3108, `tests/salvarRotinaLigaSozinha.test.mjs` novo com 5 testes), lint limpo, `npm run build` sem erro. Mutação: (1) troquei a condição `if (!estadoRotina.automatica)` por `if (false)` em `gravarRotina` → teste quebrou; revertido. (2) troquei o texto do selo do cabeçalho por um texto qualquer → teste quebrou; revertido. (3) troquei o texto do status dentro do painel por um texto qualquer → teste quebrou; revertido.

**Status:** EM VIGOR.

---

## DIR-168 — "marcar como lida" agora escreve de verdade no banco

**Emitida por:** dono, ao vivo, batendo repetidas vezes no botão de uma notificação (Emannuel Lima, pergunta de sete dias atrás sobre a reunião de diretoria): *"essa mensagem aqui fica toda hora, eu fico marcando como lida, como lida, e ela volta toda vez que eu abro. Está com um bug."*

**Achado — não era o código da tela, era a escrita no banco.** `SinoNotificacoes.jsx` e `MensagemProCeo.jsx` chamavam `supabase.from('xgame_mensagens').update({ lida: true })` direto do navegador. Auditoria direta no banco confirmou: esse UPDATE, rodando como o papel `anon`/`authenticated` (o que o navegador usa), afeta **ZERO linhas** — mesmo a policy de UPDATE valendo pra qualquer linha (`qual: true`, migration `20260909050751_xgame_mensagens_rls.sql`) e a coluna `lida` tendo GRANT UPDATE liberado pra esses papéis. A tela só atualizava o estado local (otimista) — a mensagem nunca tinha virado `lida: true` de verdade no banco nenhuma das vezes que ele clicou; a próxima busca (poll de 30s, ou reabrir a página) trazia `lida: false` de volta e o banner reaparecia. A mensagem específica dele estava com `lida: false` desde 13/09 — sete dias clicando num botão que não escrevia nada.

**O que entra:** a escrita da coluna `lida` sai do navegador e passa a ir por uma rota nova de chave de serviço (`api/functions/xgameMensagensMarcarLida.js`), o mesmo padrão já usado pra LEITURA desta tabela (`xgameMensagensListar.js`, que também nega SELECT direto). A rota nova confere que a mensagem é mesmo endereçada a quem está marcando (pessoa ou papel coletivo dela) antes de escrever — ninguém marca como lida a mensagem de outra pessoa só adivinhando o id.

**Correção pontual do dado:** a mensagem específica do dono (Emannuel Lima, 13/09) foi marcada como lida direto no banco — mesma correção que a rota nova aplica, aplicada uma vez à mensagem que já estava presa.

**Fora do escopo:** não mexe na policy de UPDATE nem investiga a fundo por que exatamente ela não libera a escrita pro papel `anon` apesar de `qual: true` (confirmado por teste direto no banco, não só leitura da policy) — a rota de chave de serviço contorna o problema sem precisar entender a causa exata, e é o mesmo padrão que este arquivo já usa pra leitura.

**Prova:** suíte completa (3076/3076 — 2 arquivos de teste novos: `tests/xgameMensagensMarcarLidaHandler.test.mjs` cobrindo a rota real com banco falso, `tests/marcarLidaViaRotaDeServico.test.mjs` confirmando que os dois componentes não voltam a chamar o UPDATE direto), lint limpo, `npm run build` sem erro. Mutação: (1) troquei a checagem de permissão da rota por `true` sempre → 2 testes quebraram; revertido. (2) voltei o `SinoNotificacoes.jsx` pro UPDATE direto antigo → o teste de "não chama mais o update direto" quebrou; revertido.

**Status:** EM VIGOR.

---

## DIR-168 — Encontro da Mentalidade: o livro da semana (capa + PDF), cada lâmina editável e a pauta viva na última lâmina

**Status:** EM VIGOR.

**Emitida por:** dono (21/09/2026, urgente): *"Preciso ter o botão de editar os slides, apagar, editar; a edição de cada lâmina. Um espaço de lista das reuniões para todos os participantes, igual um Trello, de tudo que a gente tem que conversar — e isso aparecer na última lâmina da apresentação. Os primeiros 5 minutos é a palavra de quem conduz; 15 minutos de leitura — eu escolho o livro, e precisa ter a imagem do livro e o PDF pra gente ler; 40 minutos de treinamento baseado no livro (hoje: O Homem Mais Rico que Já Existiu, Salomão — mas não fica definido). Isso dá 1 hora. E de 10 a meio-dia, produção: a lista de afazeres, que os administradores colocam previamente."*

**O que já existia e ficou:** os quatro blocos com cronômetro (5/15/40/120), o tópico gerado pela IA/régua a partir das pautas (conversa ou texto colado), o treinamento gravado, as demandas direcionadas ao Painel Corporativo e a visão executiva da semana.

**O que muda:**
1. **Cronograma com hora marcada**: 09:00–09:05 Mentalidade (a palavra de quem conduz), 09:05–09:20 Leitura, 09:20–10:00 Treinamento, 10:00–12:00 **Produção** (o 4º bloco deixa de se chamar "Reunião estratégica"; o id `reuniao` fica, porque é o que está gravado nos cronômetros passados). Os horários aparecem no cronômetro, nas caixas e nas lâminas.
2. **O livro da semana** (`xperf_encontros.livro`): título, autor, **capa** (imagem) e **PDF** — upload pelo próprio cartão para o balde `encontro-materiais` (30 MB; jpg/png/webp/pdf), com "abrir o PDF pra ler". A lâmina da Leitura mostra a capa e o botão do PDF; a do Treinamento diz "baseado em: <livro>" e também leva o PDF. Quando a conversa da IA pergunta "qual vai ser o livro?", a resposta já entra como o livro da semana (sem pisar num livro já escolhido).
3. **Pauta viva** (`xperf_encontro_pautas`): a lista tipo Trello em três colunas — A conversar · Conversado · Concluído. Qualquer administrador que conduz coloca itens durante a semana; cada item vira demanda com um clique; **o que não for concluído volta na próxima segunda** com o selo "de dd/mm". **É a última lâmina da apresentação** ("Produção · o que precisa ser conversado").
4. **Cada lâmina editável na própria apresentação** (`xperf_encontros.laminas`): o lápis abre título, subtítulo e corpo da lâmina em edição; **apagar esta lâmina**, **nova lâmina depois desta**, **restaurar o original**, e a lista das lâminas apagadas pra trazer de volta. "Editar o tópico inteiro na tela" continua a um clique. Tudo puro em `src/lib/encontro.js` (`aplicarLaminas`, `ajustarLamina`, `apagarLamina`, `novaLaminaDepois`, `restaurarLamina`).
5. Corrigido de passagem: a lâmina do treinamento dizia "45 minutos" (número antigo) — agora lê os 40 do bloco.

**Banco:** migração `20260921110434_encontro_livro_laminas_pauta_viva` aplicada na produção (colunas `livro`/`laminas`, tabela `xperf_encontro_pautas` com o mesmo regime de política do `xperf_encontros`, balde `encontro-materiais`). Arquivo no repositório com a mesma versão. `npm run colisao`: nenhum outro ramo nos mesmos arquivos.

**Testes:** `tests/encontroLivroLaminasPautaViva.test.mjs` (6); três asserções antigas atualizadas (última lâmina, 40 min, lápis).

---

## DIR-167 — Dinheiro do lance nunca mais fica preso: devolução ao tirar o líder, cura no lance seguinte e vigia que devolve sozinho

**Status:** EM VIGOR.

**Emitida por:** dono (20/09/2026, urgente): *"O cliente depositou mil, está dizendo que o dinheiro voltou e ele não consegue dar o lance. Se ele for superado, o dinheiro tem que voltar e continuar na carteira para ele dar lance."*

**O caso (Alberto Maroun Filho):** depósito de R$ 1.000 em 11/09. Lance de R$ 497 no "Playstation 5" em 14/09 18:04 (BRT) reservou R$ 573,22 (lance + frete R$ 76,22) — lance legítimo, o primeiro do leilão. Em 16/09 08:51 (BRT) outro chat removeu esse vencedor à mão (`raw_base44.limpeza_vencedor`), com o diagnóstico "leilão ativo com vencedor sem nenhum lance": consultou a tabela `bids`, que é herança VAZIA do Base44 — os lances moram em `auction_messages`. A remoção não devolveu a reserva. Em 17/09 outro cliente deu R$ 497 de novo (o leilão voltou a aceitar o lance inicial), e a devolução ao "líder anterior" nunca alcançou o Alberto, porque ele já não constava como líder. O vigia diário `alertaReservasOrfas` apontou "Alberto: R$ 573,22 travados" em 17, 18, 19 e 20/09 — num `system_logs` que ninguém lê.

**Feito agora (banco):** R$ 573,22 devolvidos ao disponível (R$ 426,78 → R$ 1.000,00; reservado R$ 0,00), linha em `reserva_ledger` (`auditoria_manual_20260920`). Nenhuma outra conta com reserva sem leilão em disputa. ⚠️ Com R$ 1.000 ele ainda **não cobre o lance mínimo atual** desse leilão (R$ 1.097 + R$ 76,22 de frete = R$ 1.173,22): faltam R$ 173,22 — isso é o leilão que subiu, não dinheiro preso.

**Feito agora (código, 3 camadas):**
1. `entityWrite`: qualquer atualização de `auctions` que zere `winner_id` (reativar, agendar, reiniciar, limpeza) devolve a reserva do líder ANTES do PATCH (`devolucao_lider_removido`).
2. `submitAtomicBid`: depois de um lance vencer, além do líder anterior, devolve a quem ainda tiver reserva viva neste leilão pelo livro-caixa (entradas − saídas por pessoa) e não for o líder novo. O dinheiro preso por fora do fluxo volta no lance seguinte, sem humano.
3. `alertaReservasOrfas` (cron diário): reserva 100% órfã — pessoa não lidera nada em disputa, não é vencedora de nada por liquidar nos últimos 7 dias, e última reserva com mais de 2h — volta sozinha (`devolucao_reserva_orfa`, com CAS e livro-caixa). Reserva parcial continua só avisando.
4. `CLAUDE.md`: seção "Onde moram os lances" — nunca diagnosticar lance pela tabela `bids`; nunca zerar `winner_id` por SQL.

**Testes:** `tests/reservaLiderRemovido.test.mjs` (4) + `tests/alertaReservasOrfas.test.mjs` atualizado. Suíte: 3045; eslint 0 erros; build ok.

---

## DIR-166.6 — "nova tarefa do dia" não nasce mais num dia que ela mesma exclui

**Emitida por:** dono, testando num domingo (20/09/2026), escolhendo "segunda, terça, quarta e quinta" pra uma tarefa nova, e vendo ela aparecer na Jornada de hoje mesmo assim: *"hoje é domingo e ele está colocando uma tarefa que eu só falei que era terça, quarta e quinta... ele não está pegando o dia. Então, se hoje é domingo, ele tem que botar hoje é domingo... tem que chegar todo dia e falar bom dia, hoje é segunda, hoje é terça, hoje é quarta, hoje é quinta, ele tem que puxar, pra ficar sincronizado com o horário de Brasília."*

**Achado — não era fuso horário.** Auditoria direta no banco (`metodo_perfil`/`metodo_tarefas` do próprio dono): `dataISO()` já calcula "hoje" certo, sempre em America/Sao_Paulo (DIR-129/DIR-59) — 20/09/2026 é mesmo domingo, confirmado. O bug real: "nova tarefa do dia" (o campo do topo, DIR-166.2) SEMPRE criava a tarefa de HOJE, mesmo quando os dias escolhidos no seletor não incluíam hoje — só o item gravado na `rotina` (pro futuro) respeitava `dias_semana`; a instância de HOJE nascia sempre, sem passar por nenhum filtro. Escolher "só seg-qui" e ver a tarefa nascer no domingo mesmo assim era exatamente a contradição que ele apontou.

**O que entra (`CrmMetodo.jsx`):** `addTarefa` agora calcula o dia da semana de HOJE (mesma conta segura em Brasília que `gerarTarefasDaRotina` já usa, DIR-166) e, quando os dias escolhidos não incluem hoje, NÃO cria a tarefa de hoje — só grava o item na rotina (`itemValeNoDia`, a mesma régua pura da DIR-166), que passa a valer a partir do próximo dia que bater. Sem restrição de dias (ou quando hoje é um dos dias escolhidos), nada muda — a tarefa nasce hoje normalmente, igual sempre foi.

**Fora do escopo:** não mexe em tarefas JÁ criadas hoje antes desta correção (ex.: as que o próprio dono criou testando, incluindo os "HORÁRIO RESERVADO PARA REUNIÃO" das 14h/15h30/17h de hoje, restritos a seg-qui mas já existentes no banco pra hoje) — apagar dados já gravados é ação à parte, avisada e à espera de confirmação dele, não decidida sozinha aqui. Também não mexe no editor da tarefa de hoje (lápis) nem em "incluir na minha rotina" — nenhum dos dois tinha essa contradição: o lápis edita algo que já existe hoje (DIR-150), e "incluir na minha rotina" nunca cria tarefa de hoje (decisão da DIR-166.2).

**Prova:** suíte completa (3041/3041, `tests/rotinaNaoNasceEmDiaErrado.test.mjs` novo + `tests/rotinaSincroniaSemPerder.test.mjs` atualizado pra 6 chamadas de `estaNaRotina`), lint limpo, `npm run build` sem erro. Mutação: desliguei a condição nova (`if (false && repetirNovaTarefa...)`) → 2 testes quebraram; revertido.

**Status:** EM VIGOR.

---

## DIR-166.5 — a frase pronta do atalho de setor sai em CAIXA ALTA, igual o padrão dele

**Emitida por:** dono, minutos depois da DIR-166.4 ir pro ar, vendo "Reunião com o setor de Financeiro" aparecer em caixa baixa: *"tá quase perfeito. Só tem um negócio que eu gosto de botar as coisas em caixa alta e quando eu clico tá ficando em caixa baixa. Só edita para quando eu clicar ficar em caixa alta e seguir o padrão."*

**Achado.** `tituloReuniaoComSetor` (DIR-166) sempre montou a frase em capitalização normal de português ("Reunião com o setor de X") — nunca tinha sido pensada contra o padrão real dele, que digita tudo em maiúsculas (visível em toda a rotina: "TÉRMINO TREINO", "FILME MOTIVACIONAL" etc). O atalho existia pra evitar redigitação, mas devolvia um texto fora do padrão que ele teria que corrigir à mão de novo.

**O que entra (`src/lib/metodo.js`):** `tituloReuniaoComSetor` agora devolve `REUNIÃO COM O SETOR DE ${setor.toUpperCase()}` — pura mudança de string, mesma função, mesma assinatura, usada pelos 4 lugares já existentes (DIR-166/166.4) sem tocar em nenhum deles.

**Fora do escopo:** não força maiúsculas em NENHUM outro campo — nem no restante do título livre (a pessoa digita como quiser depois de escolher o setor), nem em outros atalhos de texto do sistema. É só esta frase pronta específica.

**Prova:** suíte completa (3026/3026, `tests/metodo.test.mjs` atualizado pra esperar a frase em caixa alta), lint limpo, `npm run build` sem erro. Mutação: voltei a função pra caixa baixa → o teste quebrou; revertido.

**Status:** EM VIGOR.

---

## DIR-166.4 — o atalho de setor chega na tarefa de hoje (lápis e "nova tarefa do dia")

**Emitida por:** dono, olhando a tela e achando que o botão de setor tinha sumido: *"tu tirou o botão seletor do setor, cara... o setor marketing, tecnologia, financeiro, pra eu selecionar e colocar ali."* Depois, esclarecendo qual parte faltava: *"na verdade você não tirou, só a parte de baixo que está. A parte de cima também tem que ter. E já aproveita e vê se tanto na parte de baixo e a de cima que tu vai adicionar, quando adicionar, vai ficar aparecendo ali na frente, na página."*

**Achado.** O atalho de setor (`SETORES_EMPRESA`/`tituloReuniaoComSetor`, DIR-166) sempre existiu só dentro de "A minha rotina" (editar item e "incluir na minha rotina") — nunca tinha sido tirado. Faltava nos dois lugares da tarefa de HOJE: o editor do lápis (DIR-80) e a "nova tarefa do dia" (topo). A DIR-166.1 tinha deixado esse último de fora de propósito, achando que precisava mexer no `EntradaComDestinos` compartilhado — não precisa: o atalho só ESCREVE no mesmo estado (`edicao.titulo` / `novaTarefa.titulo`) que o campo de título já lê, igual o seletor de dias (DIR-166.2) já fazia sem tocar no componente.

**O que entra (`CrmMetodo.jsx`):** o mesmo `<select>` de setores (`data-teste="editar-setor"` e `data-teste="nova-tarefa-setor"`) nos dois lugares da tarefa de hoje, escrevendo a frase pronta no título via `tituloReuniaoComSetor`. Confirmado (sem mudança de código, comportamento já existente desde a DIR-146): os dois pontos de entrada — "nova tarefa do dia" e "incluir na minha rotina" — já atualizam a tela na hora ao salvar (`addTarefa` chama `carregarTarefas()`; `gravarRotina`/`salvarPerfil` atualiza o `perfil` local), sem precisar recarregar a página.

**Fora do escopo:** não mexe no `EntradaComDestinos` nem cria um quinto lugar — são os mesmos quatro pontos de edição já cobertos pela DIR-166/166.1/166.2, agora todos com o mesmo conjunto de atalhos (dias da semana + setor).

**Prova:** suíte completa (3026/3026, teste atualizado em `tests/rotinaDiasDaSemanaESetor.test.mjs` — de 2 pra 4 ocorrências do atalho de setor, mais teste novo confirmando que ele escreve no mesmo estado do editor/campo de título), lint limpo, `npm run build` sem erro. Mutação: removi o `<select>` de cada um dos dois lugares novos, um de cada vez → os testes correspondentes quebraram nas duas vezes; revertido.

**Status:** EM VIGOR.

---

## DIR-166.3 — os dias da semana aparecem na lista do dia, não só dentro do editor

**Emitida por:** dono, testando a versão da DIR-166.2 já no ar, com print da lista do dia mostrando várias tarefas com o selo "já repete todo dia" mas nenhuma indicação de QUAIS dias: *"tá quase perfeito... tem que aparecer ali também na visualização, só tá aparecendo por dentro. Os dias selecionados dessa tarefa... exemplo, 9 horas da manhã, mentalidade do CEO, segunda — aí tem que aparecer lá, toda segunda; leitura diária, terça, quarta e quinta... pra não confundir que tem duas tarefas no mesmo horário no dia."*

**Achado.** As DIR-166/166.1/166.2 deixaram o seletor de dias sempre visível DENTRO do editor de cada item — mas a lista do dia (onde o dono realmente olha pra saber o que fazer agora) continuava mostrando só "já repete todo dia", igual pra um item de toda segunda e pra um de todo dia. Pra saber quais dias, era preciso abrir o lápis de cada tarefa uma por uma.

**O que entra (`CrmMetodo.jsx`):** `diasRestritosDaRotina(titulo)` — acha o item da rotina pelo título (mesma busca que já existia no editor) e devolve os dias só quando o item é restrito, igual ao padrão que já existia dentro de "A minha rotina" (DIR-166: `item.dias_semana.length > 0`, sem badge pra item de todo dia). Usado direto na lista do dia, encostado no título de cada tarefa: `· seg`, `· ter, qua, qui`, etc.

**Fora do escopo:** não mexe no cálculo de X-Pay nem na geração das tarefas (`gerarTarefasDaRotina`, já filtra por dia desde a DIR-166) — isto é só a lista mostrar uma informação que já existia por trás, não uma regra nova.

**Prova:** suíte completa (3025/3025, 2 testes novos em `tests/rotinaDiasDaSemanaESetor.test.mjs`), lint limpo, `npm run build` sem erro. Mutação: forcei `diasRestritosDaRotina` a sempre devolver `null` → o teste do selo na lista quebrou; revertido.

**Status:** EM VIGOR.

---

## DIR-166.2 — o seletor de dias sai de trás do checkbox, em todo lugar, e entra também na "nova tarefa do dia"

**Emitida por:** dono, testando de novo e batendo na MESMA queixa da DIR-166.1 pela segunda vez, agora com print mostrando o editor de tarefa aberto e o checkbox "repetir" desmarcado: *"Eu não tenho onde editar os dias, de botar recorrente nos dias... Faz análise primeiro e escreve aqui."* Depois, já com a análise escrita e confirmada, o pedido completo por voz: *"tanto a rotina de cima quando eu edito tem que ir para baixo, tanto a de baixo tem que ir para cima... eu tenho dois lugares para incluir tarefa... qualquer um dos dois que eu editar tem que alimentar um ou outro ou unificar essa porra aí pra ficar uma coisa melhor... também tem que ter no lapizinho os dias da semana... igual o relógio do despertador da Apple, igualzinho — colocar a semana toda, só as segundas."*

**Achado — a DIR-166.1 corrigiu o lugar errado da falha.** O seletor de dias foi adicionado ao editor da tarefa de hoje, mas escondido atrás de `{repetirEdicao && (...)}` — só aparecia DEPOIS de marcar "repetir essa mudança todos os dias". No print do dono a caixa estava desmarcada, então o seletor simplesmente não existia na tela pra ele. Mesmo problema de fundo da DIR-166.1 (recurso real, mas invisível no primeiro lugar que ele olha), agora batido pela segunda vez.

**O que entra (`CrmMetodo.jsx`):**
1. O `SeletorDiasSemana` fica **sempre visível** nos dois lugares que já tinham a caixa de "repetir" (editor da tarefa de hoje e "nova tarefa do dia" no topo) — nenhuma condição de checkbox esconde mais o seletor. Marcar um dia agora **liga sozinho** o "repetir" correspondente (`setRepetirEdicao(true)` / `setRepetirNovaTarefa(true)`) — escolher um dia da semana só faz sentido pra algo recorrente, então o gesto natural já ativa a recorrência, sem passo extra.
2. **"Nova tarefa do dia" (topo) ganha o seletor de dias**, que antes só existia em "A minha rotina" — novo estado `diasNovaTarefa`, gravado junto no mesmo `gravarRotina(incluirNaRotina(...))` que já existia pro "repetir esta tarefa todos os dias" (DIR-150).

**Decisão sobre unificar os dois lugares de incluir tarefa:** o dono perguntou se dava pra ter só um. Mantive os dois, por serem coisas diferentes por baixo — "nova tarefa do dia" cria uma tarefa PARA HOJE (que pode opcionalmente virar recorrente), e "incluir na minha rotina" cria um item que só existe pra gerar dias FUTUROS, sem nascer uma tarefa hoje. Fundi o que causava a queixa (controles inconsistentes entre os dois — um tinha seletor de dias, o outro não) em vez de apagar um dos dois; ambos agora oferecem os mesmos controles (hora, título, setor, dias da semana). Fica registrado aqui pro dono dizer se quer ainda assim uma fusão mais profunda.

**Fora do escopo:** não mexe em `EntradaComDestinos` (componente compartilhado) nem no atalho de setor da "nova tarefa do dia" — aquele campo de título continua sendo o componente compartilhado por outras telas, mesma fronteira já registrada na DIR-166.1.

**Prova:** suíte completa (3023/3023, testes de `tests/rotinaDiasDaSemanaESetor.test.mjs` reescritos + 1 teste desatualizado corrigido em `tests/rotinaClaraRecorrente.test.mjs`), lint limpo, `npm run build` sem erro. Mutação: (1) recolocado `{repetirEdicao && (...)}` escondendo o seletor → teste "NUNCA fica escondido" quebrou; revertido. (2) removido `dias_semana: diasNovaTarefa` da gravação da nova tarefa → 2 testes quebraram; revertido.

**Status:** EM VIGOR.

---

## DIR-166.1 — o dia da semana também na edição da tarefa de hoje, não só em "A minha rotina"

**Emitida por:** dono, minutos depois da DIR-166 ir pro ar, editando uma tarefa pelo lápis no topo do dia e não achando o seletor de dias ali: *"KD AS MELHORIAS QUE TE PEDI???? ENTROU AONDE, JÁ FOI COLOCADA EM PRODUÇÃO??"* — confirmado que sim (print do próprio painel de Deployments da Vercel), mas o seletor só existia dentro de "A minha rotina" (painel recolhido, lá embaixo), não no editor rápido de cada tarefa (o lápis, no topo do dia) — exatamente o lugar que ele abriu primeiro.

**O que entra (`CrmMetodo.jsx`):** o mesmo `SeletorDiasSemana` da DIR-166 passa a aparecer também no editor inline da tarefa de HOJE, junto da caixa "repetir essa mudança todos os dias" — só quando ela está marcada (dia da semana não significa nada pra uma mudança que vale só hoje). Abrir o editor de uma tarefa que já é da rotina pré-carrega os dias que ela já tinha (acha o item pelo título, mesma busca que `salvarEdicao` já fazia pra aplicar a correção). Nenhuma lógica nova — reusa `alternarDia`, `SeletorDiasSemana` e `itemDaRotina` (DIR-166); só o mesmo controle aparecendo num segundo lugar, onde a pessoa efetivamente vai primeiro.

**Fora do escopo:** o atalho de setor (`SETORES_EMPRESA`) não entrou aqui — o campo de título da tarefa de hoje é o componente compartilhado `EntradaComDestinos`, usado em mais de uma tela; mexer nele é um passo à parte, não pedido nesta rodada.

**Prova:** suíte completa (3020/3020, 2 testes novos + 2 atualizados em `tests/rotinaDiasDaSemanaESetor.test.mjs`/`tests/rotinaClaraRecorrente.test.mjs`), lint limpo, `npm run build` sem erro.

**Status:** EM VIGOR.

---

## DIR-166 — dia da semana por item da rotina, "igual um despertador" + atalho de setor

**Emitida por:** dono, olhando a própria rotina ("Mentalidade do CEO" toda segunda, reunião de marketing só na terça): *"eu não tenho como... eu tenho que ter o dia da semana que eu escolho, tipo todas as segundas... igual um despertador que dá a opção de fazer segunda, terça, quarta, quinta, sexta — porque senão você sempre tem que parar pra fazer aqui de novo."* E, no mesmo fôlego: *"até pra eu adicionar também é qual o setor da empresa que eu vou fazer reunião... ter essas paradas assim pra gente poder adicionar e não precisar ficar toda hora refazendo. Faz uma análise aí na gamificação e vê o que a gente pode adicionar pra ficar ainda mais fluido, mais solto e mais dinâmico."*

**Duas peças pequenas, nenhuma migração** (tudo dentro do JSONB `metodo_perfil.rotina` já existente e do texto livre do título):

1. **Dia da semana por item.** Cada item da rotina ganha `dias_semana` opcional (`src/lib/rotinaPessoal.js`: `normalizarDiasSemana`, `itemValeNoDia`) — sem ele, o item continua valendo TODO DIA, exatamente como sempre valeu (100% retrocompatível, nenhuma rotina existente muda de comportamento). `gerarTarefasDaRotina` (`src/lib/metodo.js`) filtra por `dias_semana` antes de gerar — é o ÚNICO funil de geração (botão "gerar", repetição automática, "regerar o dia" e o cron `gerarJornadaDoDia`), então o filtro vale pros quatro caminhos de uma vez. Na tela (`CrmMetodo.jsx`, "A minha rotina"): 7 chips dom/seg/ter/qua/qui/sex/sáb pra marcar em quais dias o item vale, tanto editando um item existente quanto incluindo um novo; a lista mostra um selo com os dias só quando o item é restrito (item de todo dia não ganha badge à toa).

2. **Atalho de setor pra reunião.** `SETORES_EMPRESA` + `tituloReuniaoComSetor` (`src/lib/metodo.js`): um `<select>` de setores (Marketing, Tecnologia, Financeiro, Comercial, RH, Operações, Jurídico, Diretoria) nos dois campos de título ("incluir na minha rotina" e o editor de item) que monta a frase pronta ("Reunião com o setor de Marketing") — atalho de digitação, não trava nada: o texto continua livre pra editar depois, sem novo campo no banco.

**Fora do escopo:** não mexe em `xgame_eventos` (Eventos da empresa, DIR-161) — aquele é admin-only, substitui a janela inteira pra um grupo de pessoas; isto é pessoal, um item por vez, na própria rotina de cada um. Não valida `dias_semana` contra nenhuma outra regra (liberação, evento) — um item restrito a um dia simplesmente não entra na geração daquele dia, igual a não existir.

**Prova:** suíte completa (3019/3019, 13 testes novos entre `tests/rotinaPessoal.test.mjs`, `tests/metodo.test.mjs` e `tests/rotinaDiasDaSemanaESetor.test.mjs`), lint limpo, `npm run build` sem erro. Mutação: forcei `itemValeNoDia` a sempre devolver `true` (ignorando `dias_semana`) → 2 testes quebraram; revertido depois.

**Status:** EM VIGOR.

---

## DIR-165 — a rotina permanente parava de sincronizar sozinha, e a pessoa perdia dinheiro

**Emitida por:** dono, olhando a rotina da Sophia ao vivo: *"quando eu edito lá em cima, automaticamente tem que editar ali embaixo... sincronizar uma com a outra... tá tendo esse erro. Aí lá em cima tá escrito já repete todo dia, mas ali embaixo não tá salvando... a pessoa escolhe repetir essas tarefas todos os dias, o sistema não gera automático pra ele... tem que deixar isso muito bem organizado, porque está tendo falha e a pessoa está perdendo dinheiro."*

**Achado 1 — o selo mentia.** `estaNaRotina` (o texto "já repete todo dia" vs. o botão "repetir todo dia", em `CrmMetodo.jsx`) comparava só o TÍTULO da tarefa. Duas tarefas com o mesmo nome em horários diferentes — ex.: "Almoço" às 12:00, já salvo na rotina, e um "ALMOÇO" digitado de novo às 13:30 depois que ela mudou o horário — mostravam **"já repete todo dia" pras duas**, mesmo a segunda nunca tendo sido salva em lugar nenhum. Ela confiava no selo, nunca clicava pra repetir de verdade, e o dia seguinte nascia sem aquela tarefa — dinheiro (X-Pay) que devia ter sido gerado e não foi.

**Achado 2 — cliques em sequência se apagavam.** Toda gravação da rotina (`gravarRotina`) escreve o **array inteiro** de volta no banco — não é um patch por item. O botão "repetir todo dia" por tarefa, o editor "A minha rotina" (salvar/editar/excluir/incluir) e o campo "nova tarefa do dia" (quando marcado "repetir") não travavam durante uma gravação em andamento. Clicar em "repetir" numa tarefa e, ANTES da gravação anterior voltar do banco, clicar em outra — natural quando ela está recuperando várias tarefas do dia de uma vez — fazia a segunda gravação partir do `rotina` **ainda sem a primeira adição**, e sobrescrever por cima dela. Cada clique isolado mostrava "Salvo!", mas juntos um apagava o outro. Achado confirmado direto no banco: a rotina salva da Sophia ganhava e perdia itens dia após dia (09-13 a 09-20), enquanto ela reescrevia manualmente as mesmas ~8 tarefas todo santo dia.

**O que entra (`CrmMetodo.jsx`):**
1. `estaNaRotina` agora casa **hora + título**, não só título — o selo só afirma "já repete" quando aquele horário específico está mesmo salvo.
2. Todo botão que lê/escreve `rotina` (repetir por tarefa, salvar/editar/excluir/incluir na "A minha rotina", salvar edição de tarefa, e o campo "nova tarefa do dia" via `EntradaComDestinos`, que já sabia desabilitar mas não recebia a prop) trava enquanto `salvando` está `true` — o mesmo trava que já protegia "repetir o dia inteiro" (DIR-151), agora em todo o resto. Sequência de cliques passa a esperar cada gravação voltar antes da próxima poder partir dela — sem corrida, sem apagar o que acabou de ser salvo.

**Fora do escopo:** não mexe na régua de "vale a partir de amanhã" (DIR-80) nem em `metodo_perfil.rotina` da Sophia diretamente — a rotina dela continua com a versão salva mais recente; a correção evita que ela perca itens NOVOS a partir de agora. Consolidar o que ela já digitou manualmente nos últimos dias é uma ação dela (ou um pedido à parte): abrir o Compromisso e usar "repetir o DIA INTEIRO de hoje" uma vez, que agora funciona sem corrida.

**Prova:** suíte completa (3006/3006). Nos testes de rotina: 5 asserções atualizadas pra nova assinatura de `estaNaRotina` (nos arquivos de DIR-146/150/151 — `rotinaRepetirTodoDia.test.mjs`, `rotinaClaraRecorrente.test.mjs`, `rotinaDiaInteiroDeUmaVez.test.mjs`) + 3 testes novos em `tests/rotinaSincroniaSemPerder.test.mjs` — os 15 testes desses 4 arquivos passando. Lint limpo, `npm run build` sem erro. As duas mutações (voltar `estaNaRotina` a só-título; tirar um `disabled={salvando}`) foram testadas — cada uma quebra o teste correspondente — e revertidas.

**Status:** EM VIGOR.

---

## DIR-164 — quem recebe aparece no Quadro Geral + histórico de ganhos da semana no /XGame

**Emitida por:** dono, direto: *"AQUI PRECISO QUE TODS QUE ESTAO RECEBENDIO APARECEA AQUI EXEMPLO SOPHIA SANT'ANNA NAO ESTÁ APARECENDO"* (print do "escolha a pessoa…" do Quadro Geral). Em seguida, com o PDF do `/XGame` de Sophia na mão: *"também preciso de uma atualização que tenha o histórico de ganhos, né? Da semana. Que não está aparecendo quanto, quanto ela ganhou, a pessoa ganhou até agora. Tem que ter essa atualização aí."*

**Duas peças, independentes uma da outra:**

**1. Quadro Geral lista quem recebe, não só o time corporativo** (`XPerformanceGestao.jsx`) — achado: o "escolha a pessoa…" vinha só de `timeCorporativo` (a hierarquia do painel, do Sócio Executivo ao Embaixador), uma régua pensada pra GESTÃO/Distribuir Tarefa. Sophia tem cadastro ativo em `xgame_participantes` (recebe verba de produção) mas está no nível `loja_fisica` (bloco `rede`) — fora da hierarquia — então sumia do dropdown, mesmo recebendo dinheiro todo dia. Nova função pura `equipeQuadroGeral` (`src/lib/timeCorporativo.js`): a equipe (hierarquia, base) união com quem tem cadastro ativo no jogo e ainda não está nela, com a função derivada do nível dela no painel (ou do cargo do jogo, capitalizado, se não tiver nível). O dropdown e a contagem ("N recebendo · N com fixo definido") passam a usar essa lista.

**2. Histórico de ganhos da semana no `/XGame`** — achado: `xgame_diario.detalhes.xpay_ganho/xpay_perdido` já era gravado todo dia (o mesmo placar que alimenta "X-Pay de hoje" e Missões da semana), mas nenhuma tela somava a semana. Nova função pura `historicoGanhosDaSemana` (`src/lib/xgame.js`) soma ganho/perdido de uma lista de dias; novo card "Ganhos da semana" em `XGame.jsx`, ao lado de Missões da semana, com o total no topo e a lista dia a dia (segunda até hoje, com o valor vivo de hoje já somado).

**Fora do escopo:** não muda a régua de cálculo do X-Pay (DIR-142/161) nem a hierarquia de `timeCorporativo` (ainda decide quem entra em Distribuir Tarefa e metas de licença) — só quem aparece no Quadro Geral e a soma da semana. `CrmMetodo.jsx` (Compromisso) não ganhou o mesmo card nesta rodada — o pedido foi especificamente sobre o `/XGame`.

**Prova:** suíte completa (3003/3003, 9 testes novos entre `tests/timeCorporativoGestao.test.mjs`, `tests/populacaoOficialDoTime.test.mjs` e `tests/historicoGanhosSemana.test.mjs`), lint limpo, `npm run build` sem erro.

**Status:** EM VIGOR.

---

## DIR-163 — a tarefa liberada diz QUEM liberou e POR QUÊ, não só muda de número

**Emitida por:** dono, ao vivo, depois de testar e confirmar que a liberação de evento (DIR-161) funciona por trás: *"agora eu preciso que apareça na história dele que foi liberado pelo administrador pelo evento, uma mensagem pra ele ver que a empresa liberou. Só essa comunicação que tem que melhorar."* Seguido de: *"tem que mudar o horário, tem que deixar o horário, ter como feito, mas ter uma observação que foi pelo administrador, porque ele estava no evento... na aba deles, por dentro, quando a gente vê, e quando eles vêm."*

**Achado:** a régua (MvM/pontos/X-Pay não descontam) já funcionava, mas era invisível — a pessoa via os números mudarem sem entender por quê, e a própria tarefa continuava mostrando o horário ORIGINAL (ex.: 04:40), não o horário efetivo já liberado. `resumoDoDia` empurra a hora internamente (`aplicarLiberacao`) só pro cálculo — a tela nunca lia esse valor de volta pra mostrar.

**O que entra:**
1. **`/XGame`** (a tela que o dono estava olhando ao vivo) e **Compromisso** (`CrmMetodo.jsx`) — banner no topo do dia ("🚀 LIBERADO PELO ADMINISTRADOR até as HH:MM — motivo") quando há liberação hoje, MAIS um selo na própria tarefa afetada ("🚀 liberado pelo administrador (evento) — motivo"), comparando o horário EFETIVO (o que `resumoDoDia` calculou, já liberado) com o horário ORIGINAL (o que está gravado no banco) — só mostra o selo nas tarefas que de fato mudaram.
2. **ADM X-Game** (`XGameAdmin.jsx`) — o mesmo selo "🚀 liberada" aparece na lista de tarefas do dia da pessoa, pro admin ver, sem precisar abrir a aba de Liberação separada, que ela já foi liberada.

**Fora do escopo:** não muda a régua de cálculo (DIR-161) — só torna visível o que já acontecia.

**Regras fixas:** o selo só aparece na tarefa cujo horário de fato mudou (comparação exata original × efetivo) — não pinta o dia inteiro, só o que foi tocado pela liberação.

**Prova:** suíte 2684/2684 (10 testes novos em `tests/liberacaoComunicacao.test.mjs`), lint limpo, `npm run build` sem erro.

**Status:** EM VIGOR.

---

## DIR-162 — o rótulo da gaveta que escondia a liberação de evento

**Emitida por:** dono, direto depois de publicada a DIR-161: *"onde está isso, eu não estou enxergando."*

**Achado:** as duas abas novas (🚀 Liberação de evento, 📅 Eventos da empresa) foram publicadas dentro do `XGameAdmin`, que já vivia dentro de uma gaveta recolhida por padrão em `XPerformanceGestao.jsx` ("o admin do X-GAME de sempre"). O rótulo dessa gaveta — "Ciclo, verbas e participantes" — não menciona liberação nem evento em lugar nenhum, então mesmo abrindo a página certa (ADM X-Game) não tinha como adivinhar que o botão estava ali dentro.

**O que entra (`XPerformanceGestao.jsx`):** o rótulo da gaveta passa a dizer **"Ciclo, verbas, participantes, liberação de evento e eventos da empresa"** — só o texto, a gaveta continua recolhida por padrão (não é a única coisa que mora ali, e abrir tudo sempre poluiria a tela do dia a dia).

**Fora do escopo:** não mexe no comportamento de `XGameAdmin` nem nas duas ferramentas em si (DIR-161) — só a etiqueta de fora, pra achar o caminho.

**Prova:** `npm run build` sem erro, lint limpo — mudança de texto only, sem lógica nova pra testar.

**Status:** EM VIGOR.

---

## DIR-161 — liberação pontual de evento + eventos recorrentes com rotina própria

**Emitida por:** dono, ao vivo, sobre a corrida da empresa às 4h de hoje: *"muitas pessoas perderam o ritual. Então eu tenho que ter um botão pra apertar e liberar as tarefas das pessoas até tal hora pra eles ganharem, quando eu fizer um evento desse."* + *"eu preciso ter um botão de organizar a gamificação das pessoas de acordo com alguns eventos da empresa. Exemplo, segunda-feira, nós temos mentalidade do CEO que é de 9 até uma hora da tarde — as pessoas que eu selecionar, a rotina dele de 9 até 11 horas é uma rotina diferente: postar a sala do treinamento, ter o resumo do livro, o resumo da mentoria que ele pode botar até o final do dia."*

**Duas ferramentas novas no ADM X-Game, independentes uma da outra:**

**1. 🚀 Liberação pontual de evento** (`xgame_liberacoes`) — pra um dia excepcional (corrida, viagem): o dono escolhe o dia, um horário e quem participou; as tarefas dessas pessoas com horário ANTES daquele horário passam a valer como se fossem ÀQUELA hora — não perdem MvM, pontos nem X-Pay por atraso durante a janela do evento. Depois do horário liberado, a régua de sempre volta a valer (é um adiamento, não um perdão sem fim). Implementado em `aplicarLiberacao`/`resumoDoDia` (`src/lib/xgame.js`) — um único ponto de verdade, sem repetir a régua em cada tela.

**2. 📅 Eventos da empresa** (`xgame_eventos`) — evento recorrente por dia da semana (ex.: Mentalidade do CEO, toda segunda 9h-13h), com sua própria lista de tarefas. Decidido com o dono: a rotina do evento **SUBSTITUI** a normal na janela de horário (não soma), e uma vez que a pessoa é marcada no evento, ele **aplica sozinho toda semana** — sem precisar reativar. Implementado em `src/lib/eventosGamificacao.js` (`eventoAplicavelHoje`, `substituirJanelaDoEvento`, `rotinaComEventos`), plugado no cron `gerarJornadaDoDia.js` e nos três lugares que geram o dia sob demanda (ADM X-Game e o próprio Compromisso da pessoa).

**O que entra:**
1. `xgame_liberacoes` (data, user_id, ate_hora, motivo) + `xgame_eventos` (nome, dia_semana, hora_inicio, hora_fim, tarefas, participantes, ativo) — migração `20260916120000_gamificacao_liberacao_e_eventos.sql`.
2. `resumoDoDia` ganha `liberadoAteMin` — aplicado ANTES de qualquer outro cálculo do dia (estado, MvM, X-Pay, pontos, atraso do pronto já enxergam a hora adiada).
3. ADM X-Game ganha duas abas novas: **🚀 Liberação de evento** (data + horário + seleção múltipla de quem foi liberado, com histórico do dia) e **📅 Eventos da empresa** (criar/editar/ativar/excluir evento, com editor de tarefas e seleção múltipla de participantes).
4. `CrmMetodo.jsx`/`XGame.jsx` buscam a liberação de hoje da própria pessoa e já geram/mostram o dia com o evento sobreposto (mesma fonte, sem tela nova pra ela ver).

**Fora do escopo:** a régua de atraso na Fila do Pronto não muda — é sobre entrega de tarefa de gestão, não sobre horário de rotina. As duas réguas catastróficas (não-votar/atraso do pronto, DIR-96/97) continuam intocadas — isso já é o `perdao_zeragem_ate`.

**Regras fixas:** liberação e evento nunca mexem em `metodo_perfil.rotina` (a rotina permanente da pessoa) — só no que é gerado pro dia; o Ritual do Amanhecer continua fora da conta de substituição de evento (segue a régua própria do DIR-142).

**Prova:** suíte 2674/2674 (14 testes novos em `tests/liberacaoDeEvento.test.mjs` e `tests/eventosGamificacao.test.mjs`), lint limpo, `npm run build` sem erro.

**Status:** EM VIGOR.

---

## DIR-160 — Analisador de Lotes: um lugar só, com destaque, e a lista completa de itens

**Status:** EM VIGOR.

**Emitida por:** dono (15/09/2026): *"Quero que ele tenha um destaque como o analisador de leilão. Na visão geral ele já tem até um lugar, mas está todo branco. Olhe os três lugares que ele está, retire onde está duplicado, retire esse branco. E o analisador tem uma lista de todos os produtos — quando eu analiso, fica logo abaixo — e ela não está aparecendo. Ele não está abrindo cem por cento."*

**O que havia:** três cópias do mesmo analisador (página `/AnaliseDeLotes`; uma cópia inteira montada dentro do Estoque de Lotes, que o tema claro do painel repintava de BRANCO; e a página órfã `/AnaliseLoteEstoque`, sem nenhum link). A "lista de todos os produtos" nunca existiu nessas telas: os itens só apareciam no modal de grade ou na tabela departamental, que dependia de uma aba "Resumo" que 2 das 3 planilhas reais não têm.

**O que muda:**
1. **Um analisador só**: `/AnaliseDeLotes` (com crachá de cargo admin/leiloeiro) ganha as três ações — Enviar para Estoque, Publicar no Marketplace, Publicar nas Oportunidades do Dia — com try/catch e aviso na tela. A cópia inline e a página órfã foram removidas (rota, tema claro, prefetch).
2. **Destaque**: cartão `AnalisadorDestaque` (pill "AVALIADOR INTELIGENTE DE LEILÕES" + título em degradê, cores fixas que o tema claro não repinta) no Estoque de Lotes, levando ao analisador; item "Analisador de Lotes" com realce azul na Visão Geral do admin.
3. **Lista de itens** (`ItensDoLote`): sempre visível abaixo do painel — grade, descrição, quantidade, valor de mercado, busca, filtro por grade, "ver mais/ver todos" e totais. O KPI "Total de Itens" rola até ela.
4. **Parser corrigido** (medido nas 3 planilhas reais de `public/midia`): a coluna genérica "VALOR" casava com "Valor Unit" antes de "Valor Total" e o lote era somado pelo preço unitário — LOTE132 R$ 13.355 → **R$ 96.406**, LOTE253 R$ 28.945 → **R$ 139.364**, LOTE495 R$ 119.676 → **R$ 221.591**. "Local de Carregamento" agora é lido em qualquer aba (estava só em "Complemento"; nas planilhas reais fica em "Cronograma") — os 3 endereços de retirada saem certos. Sem aba Resumo, a tabela departamental nasce da coluna Categoria. Célula numérica na aba Resumo não derruba mais o processamento; `.csv` sai do nome do lote; escolher o mesmo arquivo de novo funciona; o arremate começa vazio (o score só é calculado depois de digitado; antes vinha R$ 15.639 inventado).
5. **Veredito de Mercado / Validar**: chamavam `searchGoogleShopping`, que só existia no Base44 — resposta "not_implemented" virava "DADOS INSUFICIENTES" em todo item. A rota agora existe na Vercel (`api/functions/searchGoogleShopping.js`, SerpAPI, 120 consultas por IP a cada 5 min). Sem `SERPAPI_KEY` na Vercel a tela diz "Auditoria de mercado indisponível" em vez de fingir. ⚠️ **Dono: confirmar se `SERPAPI_KEY` está publicada na Vercel** (as funções de imagem já a usam quando existe).
6. Modal de grade rola no celular; cabeçalho de upload sem `p-12` no celular.

**Não mexido:** o analisador do painel do Parceiro (`ParceiroAnalisador`) é outro público (só consulta, tema próprio) e continua separado.

**Testes:** `tests/analisadorDeLotesUnico.test.mjs` (7). Suíte: 2544; eslint 0 erros; build ok.

---

## DIR-159 — "Corrige isso tudo de um jeito para funcionar": o que os logs de produção denunciaram

**Status:** EM VIGOR.

**Emitida por:** dono (15/09/2026), depois de perguntar "tudo funcionando e perfeito?" e ouvir a resposta honesta: *"CORRIGE ISSO TUDO DE UM JEITO PARA FUNCIONAR."*

**O que os logs (Supabase edge/postgres + Vercel runtime) mostraram, e o que foi feito:**
1. **`app_users` 401 desde a migração de 12:58 UTC** — só abas abertas ANTES do deploy 12:51 (código antigo pedindo `select=*`) e o **preview da branch `claude/project-structure-analysis-r1prad`**, que estava parada em código velho. Preview: branch avançada por fast-forward até a main (deploy novo). Abas velhas: o banner "Atualização disponível" já aparece em até 1 min; fechar e abrir resolve. A pessoa do Android que apareceu com falha entrou normalmente às 13:02.
2. **`system_logs` POST 400 ×1.394/dia e `metodo_tarefas` 400** — `entityWrite` carimbava `created_date`/`updated_date`/`base44_id` em toda escrita; em tabela sem a coluna o PostgREST recusava, o `writeResilient` tirava a coluna e repetia (funcionava, mas com uma ida a mais ao banco por edição de tarefa do Método). Agora a coluna ausente é tirada ANTES (`COLUNAS_AUSENTES`, com aprendizado por instância).
3. **`live_sessions` POST 401 ×890/dia** — o navegador inseria com a chave pública e a RLS só deixa `authenticated`; **nenhuma presença gravada desde 26/05** (o "pessoas navegando agora" da Home vivia de cache). Nova rota `api/functions/liveHeartbeat.js` (chave de serviço, 60 batidas por IP a cada 5 min, formato do `session_id` validado); `useActiveSession` chama a rota.
4. **`footer_settings`, `bids`, `negotiations`, `partner_plan_purchases` 400** — tabelas herdadas do Base44, VAZIAS, só com `raw_base44`; as telas ordenavam por coluna que não existe. Rodapé usa o padrão sem consultar; "lances do dia" (Home/LiveMetrics) leem `auction_messages` (onde os lances moram, `message_type='bid'`, `bid_amount`); CRM negociações ordena por `created_at`; `getPartnerPurchases` filtra por `raw_base44->>status/user_id` e devolve sempre lista.
5. **`catalog_sales?licensee_id=eq.` 400** (painel do licenciado e exclusão de vendedor) — a coluna é `seller_id`.
6. **Produto sem frete** (scooter Harley 117: 65×110×170 cm, 45 kg) — Melhor Envio recusava por dimensão e o cliente lia "nenhuma transportadora atende esse CEP". Agora `cotarOpcoes` devolve `motivo` (`produto_grande` / `sem_transportadora`) com texto honesto, e o carrinho mostra **"Retirar na loja (grátis)"** e **"Combinar frete no WhatsApp"** em vez de travar.
7. **`finalizeAuctionCore`** gravava o log de encerramento com `created_date` (coluna inexistente → 400 calado). Corrigido para `created_at`.

**Não mexido (e por quê):** aviso `DEP0169 url.parse` em `/api/concurso` vem de dependência, não do nosso código; "Warp server error: Thread killed by timeout manager" no PostgREST são consultas longas (`limit=1000`) — ficam para uma rodada de paginação.

**Continua só com o dono:** `SESSAO_MODO` / `MP_WEBHOOK_MODO` / `CRON_SECRET` na Vercel; caixa `contato@leilaonozap.net`; escrow `nexus` (R$ 67 mil); 22 produtos abaixo do custo; telefone do Ponto de Retirada Bangu; 6 leilões de agosto sem vencedor; arte do banner 2.

**Testes:** `tests/auditoriaLogsLimpos.test.mjs` (5). Suíte: 2532; eslint 0 erros; build ok.

---

## DIR-158 — "Resolve tudo que precisa resolver": os 12 itens da DIR-157 decididos com evidência

**Status:** EM VIGOR.

**Emitida por:** dono (16/09/2026): *"RESOLVE TUDO QUE PRECISA RESOLVER DE MANEIRA DILIGENTE."* Regra desta rodada: onde havia decisão de negócio, escolhi a opção sustentada por evidência (banco, contrato assinado, código) e deixei o porquê registrado; onde só o dono pode virar a chave (variável de ambiente na Vercel), fica o passo exato.

**Resolvido:**
1. **Escrow "venda" do `commission_ledger`** — o gatilho `trg_sale_to_ledger` agora ignora depósito de carteira/operação, adesão, passaporte, frete de vendedor e reposição, e ignora venda em que o vendedor é o próprio comprador (migração `auditoria_escrow_so_venda_de_verdade`). As 15 linhas em que o "vendedor" era o comprador (R$ 1.632,07) foram marcadas `cancelado`. **Ficam 471 linhas / R$ 67.474,49 a liberar**, 389 delas de vendas `nexus` (planilha do showroom) — se são de lojista terceiro com direito a repasse, é regra do Diogo (16/07) e está certa; o cron `liberar_saldos_maturados()` segue **não agendado** de propósito até o dono confirmar. `createOperationDeposit`/`createSupplyOrder` não usam mais o comprador como `seller_id` de fallback (usam a conta da empresa, `referral_code = leilaonozap`).
2. **Sessão ETAPA 2** — não dá pra ligar daqui (é variável na Vercel). Passo: em Vercel → leilonozap → Settings → Environment Variables → `SESSAO_MODO=bloquear` e `MP_WEBHOOK_MODO=bloquear` → redeploy. Tentei ler os logs `[SESSAO]` pela API da Vercel pra medir quantas telas ainda chamam sem crachá; a consulta estourou o tempo 3 vezes. Antes de virar, olhar em Vercel → Logs por "SEM crachá válido" nas últimas 24h.
3. **`app_users` pública — RESOLVIDO (16/09, PR #360 + migração `auditoria_app_users_colunas_publicas`)**: a chave publicável (anon/authenticated) só enxerga as 76 colunas públicas — `password`, tokens de reset/acesso, `auth_user_id`, `livoo_*_id` e `raw_base44` ficaram fora (verificado com `set role anon`: `select password` → permission denied; `select id, full_name` → ok). O adapter do site pede a lista explícita (`COLUNAS_PUBLICAS_APP_USERS`), então `select('*')` não existe mais no navegador. As policies de escrita `authenticated = true` (insert/update/delete) foram removidas — qualquer JWT de auth podia apagar cadastros. Ainda pendente (menor): CPF/telefone/saldos continuam legíveis pra quem tiver a chave pública, porque 3 telas admin (AdminUsers, UserManagement, AuditoriaCadastros) leem direto; fechar isso exige movê-las pra rota com crachá e testar com o dono.
4. **Devolução** — escopo escrito: leilão sem devolução (salvo defeito não descrito, 48 h); Loja Virtual com arrependimento de 7 dias (CDC art. 49); garantia legal do CDC (art. 26), não a de fábrica. Termos, WelcomeModal, TermsModal, Como Funciona e Direto de Fábrica alinhados.
5. **Teto de desconto = 80%** em todo lugar (index.html, vite.config, Layout, HeroRecepcao, PortalArrematante, CatalogProductDetails, LicenseeShareModal). Evidência: maior desconto real do catálogo ativo hoje é 80,6% (p95 = 69%). Banner 2 (arte "até 85%") ficou — é arte; regravar quando possível.
6. **Banner 3** ("+500 produtos… + FRETE GRÁTIS") **saiu da rotação** — a arte promete frete grátis e a loja cobra frete. O ícone "Frete Grátis" do rail virou "Frete" → "calculado no carrinho pelo seu CEP".
7. **Contato oficial** em `src/lib/contatoOficial.js`: `contato@leilaonozap.net` (domínio do site) e o endereço dos contratos assinados (Av. das Américas, 19.005, Torre 1, Sala 1106, Recreio, 22790-704). Rodapé, Termos, Privacidade e rastreio usam a lib. ⚠️ **Confirmar que a caixa `contato@leilaonozap.net` existe.** O "no-reply@" saiu de todo canal de dúvidas.
8. **"Comprar agora"** deixa de ir pro `CatalogCheckout2` (frete "a combinar", só PIX): adiciona ao carrinho e vai pro checkout único (frete real, PIX ou cartão).
9. **Servidor**: webhook não reprocessa venda cancelada já estornada; `finalizeSellerOrder` tira o cargo da adesão PAGA (não do body) e consome o saldo de adesão com CAS antes de criar as vendas; `createLicensee` recusa cargo de governança e, sem operador, só cargos de entrada; **rate limit** (tabela `rate_limits` + RPC `rate_limit_hit`, migração `auditoria_rate_limit`): 5 códigos por e-mail / 30 por IP a cada 15 min, 12 logins por e-mail / 60 por IP; `publicRegister` não revela mais qual dado (e-mail/telefone/CPF) já existe.
10. **Telas**: Home mostra "não foi possível carregar" com botão em vez de "nenhum leilão"; AddFunds avisa quando os pacotes não carregam; OrderTracking sem `auction_id` não fica "Carregando…" pra sempre; tabela de pedidos do licenciado rola no celular; `linkWhatsAppNumero()` normaliza DDI em 6 telas que montavam `wa.me/55…` na mão.
11. **Banco**: reserva órfã do dono (R$ 178,76, sem leilão liderando) devolvida ao saldo disponível com linha no `reserva_ledger`.

**Continua pendente (precisa do dono ou de arte):** `app_users` pública (item 3); `SESSAO_MODO`/`MP_WEBHOOK_MODO`/`CRON_SECRET` na Vercel; 22 produtos com preço abaixo do custo (decisão de preço); telefone do "Ponto de Retirada Bangu"; 6 leilões de agosto sem vencedor; arte do banner 2 (85%); KYC em bucket público; policies `USING (true)` das tabelas internas (X-Game/X-Perf/método) — mudar exige reescrever as telas pra escrever via rota.

**Testes:** `tests/auditoriaNoturnaDecisoes.test.mjs` (10). Suíte: 2524.

---

## DIR-157 — Auditoria noturna do site inteiro (15→16/09/2026): o que foi achado, o que foi corrigido, o que espera decisão

**Status:** EM VIGOR — correções mergeadas; itens de decisão listados no fim.

**Emitida por:** dono, antes de dormir: *"preciso que você fique rodando uma auditoria em todo site pra achar erros de todas as formas — não quero ser pego de surpresa nem em uma vírgula, tipo descrição faltando, exemplo como esses do telefone, erros bobos e graves também. Quero trabalho sério."*

**Método:** 4 varreduras paralelas independentes (textos/placeholders ao cliente; bugs do servidor `api/`; telas/rotas/navegação; segurança e sessão) + lint do site inteiro + auditoria de dados no banco (SQL somente-leitura). Todos os 227 arquivos de `api/` foram lidos; `src/` foi varrido por scan em 1.027 arquivos e ~70 telas lidas linha a linha. Cada correção entrou por PR com suíte completa, lint e build.

### Corrigido (PRs #353, #354, #355 e este)
**Lint:** 61 erros → 0 (imports mortos em 34 arquivos).
**Fatos errados que o cliente via:** WhatsApp `+55 00 0000-0000` no modal "Solicitar cadastro"; "boleto" prometido (não existe); "Lei nº 21.981/2024" (inexistente → Decreto 21.981/1932); regra antiga do Passaporte no Termo de Adesão e no Como Funciona; "12x sem juros" nas artes (juros são repassados → `textoParcelamento`); gateway "Asaas" nos Termos/Privacidade (→ Mercado Pago); links `leilaonozap.com` (→ `.net`); exemplo do Passaporte com conta errada; "irrestornável"; Ponto de Retirada 18% (→ 16%); título/og "NoZap" (→ "Leilão NoZap"); © 2024.
**Rotas mortas (404):** `/SaiDeBaixo` (LiveShop ×2 e o **link de indicação do parceiro** — todo indicado caía em 404), `/PDV`, `/CreateAuctionSaiDeBaixo`.
**Tela branca:** `JSON.parse` sem proteção no Layout global, carrinho, cards e modal de produto → `src/lib/storageSeguro.js`.
**Carteira honesta:** falha na consulta mostra erro + "Tentar de novo" (antes: "Carregando…" eterno ou R$ 0,00 falso); Meus Arremates idem. Dinheiro em formato americano em 7 telas → `money()`.
**Pedidos/estoque/dinheiro (servidor):** checkout no cartão não gravava os itens (`raw_base44.items`) e `fulfillStoreOrder` só lia `items_json` → carrinho de vários produtos baixava estoque errado (agora grava E lê); depósito no leilão gravava endereço fake no cadastro; PIX/cartão só geram cobrança no MP depois que a venda existe no banco; lance só grava em leilão `active` (não sobrescreve leilão já finalizado); pedido de saque que não grava devolve a reserva; comissão do PDV por RPC atômica; `regerarPixPedido` lia coluna inexistente (`stock`).
**Segurança (sem mudar comportamento em produção):** `exigirSessao` ligado em 9 rotas de dinheiro/cargo que não tinham; `entityWrite` usa o usuário do crachá quando válido; 11 crons exigem `CRON_SECRET` quando a variável existir; `encodeURIComponent` nos filtros do KYC; links gravados por usuário só abrem se forem http(s); `SystemChecklist` só admin; `console.log` com e-mail/nome removidos.
**Banco:** popup ativo sem imagem apontando pra leilão encerrado → desativado. `robots.txt` + `sitemap.xml` criados.

### PRIORIDADE 1 pra manhã (precisa de decisão ou de virar chave em produção)
1. **Escrow "venda" do `commission_ledger`** (migração 20260716, "regra do Diogo"): o gatilho grava **100% do valor de TODA venda com `seller_id`** como "a liberar" pro vendedor — inclusive produto da empresa vendido por indicação. Hoje: **486 linhas, R$ 69.106,56 a liberar, 481 já vencidas**; a Carteira mostra isso como "A liberar" (Ribeiro vê R$ 19.728; Elenice R$ 16.538; Beatriz R$ 10.703). Só não virou saldo sacável porque `liberar_saldos_maturados()` **não está agendada** (cron só tem `expire-auctions`). Decisão: (a) restringir o gatilho a vendas de lojista terceiro (produto próprio) e apagar as linhas indevidas; e (b) parar de mostrar "A liberar" enquanto isso. Não mexi: é regra de negócio.
2. **Sessão ETAPA 2**: publicar `SESSAO_MODO=bloquear` e `MP_WEBHOOK_MODO=bloquear` na Vercel. Hoje o crachá só loga — quem souber o id de um admin é admin. O log de produção diz se sobrou tela sem crachá.
3. **`app_users` legível inteira com a chave pública** (policy `public_read`): CPF, telefone, endereço, saldos, PIX de todo mundo. Precisa de view pública com colunas seguras + migrar AdminUsers/UserManagement/AuditoriaCadastros pra rota admin. Também `payment_settings` e `wa_config`.
4. **Trigger de escrow em depósitos/reposições**: `createOperationDeposit` e `createSupplyOrder` gravam `seller_id` = o próprio comprador como fallback → escrow de 100% pro comprador (mesma bomba do item 1).
5. Webhook do MP aceita re-flipar venda **cancelada** pra paga (decisão anterior, 21/08) — se o admin já estornou, entrega em dobro. Sugestão: só flipar cancelada se não houve estorno.
6. `finalizeSellerOrder` aceita o cargo (`role`) do body e zera `seller_credit_balance` sem CAS; `createPdvOrder` aceita preço unitário do body; `createLicensee` aceita qualquer `career_level` (até 'ceo'). Precisam de crachá em modo bloquear + regra no servidor.
7. **Política de devolução**: produto da loja diz "Devolução em até 7 dias" + "Compra garantida"; Termos/WelcomeModal dizem "sem devolução". Loja Virtual = CDC 7 dias (obrigatório em venda online) e leilão = sem devolução — alinhar os 5 textos.
8. **Teto de desconto anunciado** varia 60/70/80/85/90% conforme a tela (index.html 60%, banners 70/85, Layout 90). Escolher um número.
9. **Endereço da sede** em 3 versões (Footer "Av. das Américas 3500, 22640-102" vs contratos "19.005, Torre 1, Sala 1106, 22790-704"); **e-mail de contato** em 3 (relacionamento@…com, contato@…net, no-reply@ como canal de dúvidas). Fixar num lib.
10. Banner 3 da loja diz "Frete Grátis" na arte e o ícone "Frete Grátis" do rail — a loja cobra frete. Trocar a arte.
11. 22 produtos ativos com **preço abaixo do custo**; "Ponto de Retirada Bangu" com telefone `11 99999-9999`; 6 leilões de agosto encerrados com lances e sem vencedor (Luciano 3, dono 2, Sophia 1) — nunca cobrados nem entregues; 19 leilões ativos sem preço de mercado (selo "economize" não aparece); 2 produtos sem categoria; sua conta com R$ 178,76 em `saldo_reservado` sem leilão liderando.
12. Sem rate limit em `sendEmailCode`/`login`/criação de PIX; KYC em bucket público listável; policies `USING (true)` em xgame_*/xperf_*/metodo_*/diario_*/suporte_chamados/contrato_assinaturas/financial_income.

**Testes desta noite:** `auditoriaNoturnaGraves.test.mjs`, `auditoriaNoturnaServidor.test.mjs` (+ os já existentes). Suíte: 2480.

---

## DIR-156 — Passaporte: um alvo só de 10% no arremate, acertos devolvidos e o texto antigo fora do site

**Status:** EM VIGOR.

**Emitida por:** dono, ao vivo (15/09/2026), depois da auditoria do Alexandre: *"texto antigo tem que tirar, vai ficar mais limpo, já tem um documento explicando... e corrigir o que tem que corrigir, pra ficar perfeito e o sistema ficar limpo. Vamos fazer o que é certo. Eu deixo você decidir."*

**Achados (recalculados no banco, arremate por arremate, antes de mexer em qualquer valor):**
1. **Cobrança em dobro pra quem tinha cupom dos dois modelos.** `finalizeAuctionCore.js` rodava os dois motores no arremate, cada um com o alvo CHEIO de 10%: `recolherBonusPorArremate` (modelo A, tira da carteira) e `cancelarCuponsBloqueados` (modelo B, cancela crédito bloqueado). Quem depositou antes E depois de 19/08 pagava 20%.
2. **Quem tinha a receber** (10% de cada arremate, FIFO, teto do cupom): Rosenberg R$ 18,22 (cancelados a mais nos cupons de 11/09), Gean R$ 10,00 (cupom de 11/09 cancelado sem arremate que o justificasse), Lucas R$ 0,18, Sophia R$ 9,28 (recolhimento integral de R$ 10 em 16/08 por um arremate de R$ 4 + outro de R$ 3,20 depois).
3. **Quem NÃO tinha a receber**, ao contrário do meu resumo anterior: Luciano (Bike R$ 1.200 em 11/09 consumiria os R$ 70 do modelo A de qualquer jeito) e o dono (cadeira R$ 246 + Tubo R$ 77,64 consomem os R$ 20). O recolhimento integral de 13–16/08 estava errado na hora, mas as vitórias seguintes zerariam o bônus igual.

**Execução:**
- **Banco (15/09 ~02:20 UTC, tudo com CAS):** Sophia `saldo_disponivel` 85,06 → 94,34 e cupom `251fc588` `bonus_recolhido_valor` 10 → 0,72 (`creditado`); Rosenberg `74f65aae` `valor_cancelado` 15,86 → 0 e `1daf16cb` 10 → 7,64; Gean `ccdf57c5` `valor_cancelado` 10 → 0; Lucas `4cdf7226` `valor_cancelado` 0,18 → 0, `valor_liberado`/`saldo_restante` 9,82 → 10,00 (lance dele na Mesa foi R$ 150 → 10% ≥ teto). Crédito bloqueado devolvido segue a regra normal daqui pra frente (libera na derrota, cancela na vitória).
- `api/_lib/finalizeAuctionCore.js`: modelo A roda PRIMEIRO com `finalPrice` (cupons dele são sempre os mais antigos — FIFO) e devolve `recolhido`; modelo B recebe esse valor e cancela só o que sobrou do alvo.
- `api/_lib/passaporteCoupon.js`: `cancelarCuponsBloqueados(userId, valorArrematado, jaCobrado = 0)` — alvo = 10% − jaCobrado. Sem o parâmetro, comportamento antigo (10% inteiros).
- `CartaoPassaporte.jsx`: sai "Crédito na carteira R$ 110 — os 10% de bônus entram na hora"; entra "Saldo de lance R$ 100 + cupom de R$ 10 pra Loja Virtual — libera conforme os leilões que você disputar terminarem sem vitória". Prop `credito` vira `cupom`.
- `PassaporteLances.jsx`: título "R$ 100 que valem R$ 110" vira "R$ 100 de saldo + R$ 10 de cupom"; subtítulo e aviso de passaporte ativo reescritos na regra atual.
- `tests/passaporteAlvoUnicoTextoNovo.test.mjs` — 8 testes.

---

## DIR-155 — Loja Virtual: buscar vira "modo busca" na hora; WhatsApp oficial em todo o site

**Status:** EM VIGOR.

**Emitida por:** dono, ao vivo (15/09/2026), com dois prints: *"Como eu busco e a busca aparece lá embaixo, abaixo de ofertas relâmpago, não sobe, a página não sobe, parece que não está buscando. Então o cliente fica com a sensação de que não está buscando, quando está. Quando eu buscar, tem que sumir licenciado, tem que subir a oferta relâmpago, que só apareçam os produtos... um cliente mandou o print: o número oficial é o 21 98407-2064, precisa identificar esse número errado do print e atualizar em todo site."*

**Achados:**
1. **Busca:** o resultado já era em tempo real, mas ficava embaixo de banner + Ofertas Relâmpago + cartão do licenciado + pílulas + destaques; a página não rolava. A tela ficava idêntica depois de digitar — a percepção de "não funciona" era legítima.
2. **Número:** o print do WhatsApp ("Você confia nesta empresa? +55 21 99999-9999", foto vazia) vinha do botão "negociar pelo WhatsApp" do `Cart.jsx`, que abria `wa.me/5521999999999` — número de EXEMPLO esquecido no código. As outras 15 ocorrências de "99999-9999" no site são só *placeholder* de campo de formulário ("digite seu WhatsApp, ex: (21) 99999-9999") — exemplo do telefone do cliente, não da empresa; ficaram. O número oficial já existia certo em 8 arquivos, cada um escrito na mão.

**Execução:**
- `src/pages/Catalog.jsx` — `modoBusca` (há texto na busca): somem `OfertasRelampago`, `CartaoLojaVirtual`, `PilulasVitrine` e "Produtos em Destaque"; a página rola pro topo; aparece um cabeçalho de resultados ("Resultados para “x” · N produtos" / "buscando no catálogo…" com spinner) com botão **Limpar busca**. Enquanto o filtro local (300 ms) ou a busca no servidor (350 ms) não responderam, mostra esqueleto — nunca "nenhum produto" antes da hora. Vazio de busca tem texto próprio ("Nada encontrado para “x”") e botão "Limpar busca e ver a loja".
- `src/components/loja/LojaShopeeHeader.jsx` — prop `modoBusca`: o HERO (banner rotativo) some; a caixa vira `type="search"` com borda verde, botão **X** pra limpar, `enterKeyHint="search"` e Enter fecha o teclado do celular (pra ver os resultados).
- `src/lib/whatsappOficial.js` — fonte única: `WHATSAPP_OFICIAL = '5521984072064'`, `WHATSAPP_OFICIAL_FORMATADO = '(21) 98407-2064'`, `linkWhatsAppOficial(texto)`.
- `Cart.jsx` passa a usar `linkWhatsAppOficial(...)`; os 8 arquivos que tinham o número certo escrito na mão (`LojaShopeeHeader`, `ProductDetailsModal`, `CatalogProductCard`, `AcoesSalaHeader`, `CatalogOrderTracking`, `CatalogProductDetails`, `Footer`, `CatalogCheckout2`) agora importam da lib — trocar o número no futuro é mexer em UM lugar.
- `tests/lojaModoBuscaWhatsappOficial.test.mjs` — 10 testes.

---

## DIR-154 — checkout da Loja Virtual: o frete se calcula sozinho e o botão nunca fica morto; crédito Passaporte do Alexandre regularizado

**Status:** EM VIGOR.

**Emitida por:** dono, ao vivo (15/09/2026), com print do carrinho no celular, depois da auditoria do Passaporte do cliente Alexandre Walenkamp: *"Eu acho que o problema dele é aqui na hora de comprar na loja não está liberado, precisa olhar isso e fazer essa análise no site e melhorar esse cartão aí do calcular frete que está muito feio, tá muito próximo da borda... fazer essa análise em toda essa parte de checkout para não acontecer esses erros principiantes... tem que ter liberado para ele comprar."*

**Achados da auditoria (dados de produção, via SQL):**
1. **O dinheiro do lance dele voltou certinho** — R$ 133,66 (lance R$ 117 + frete R$ 16,66 da Caixa de Som Mondial) devolvidos em 11/09 12:27, no `reserva_ledger`; `saldo_reservado = 0`. Nada travado. O lance de 04/08 foi num leilão apagado depois (id não existe mais) e a reserva órfã só voltou em 27/08 pela `faxinaReservasOrfas`.
2. **O crédito Passaporte é que não existia pra ele gastar**: o cupom dele foi criado pelo backfill de 18/08 no modelo A (`bonus_creditado_em` preenchido, `saldo_restante = 0`). `statusCupons` só considera gastável `saldo_restante > 0`, e `consumirBloqueado` ignora cupom do modelo A — então nenhuma derrota dele liberava nada, o banner "Usar meu desconto" nunca aparecia no carrinho e o `PassaporteCard` da Carteira não renderizava. O cliente estava certo em reclamar da loja.
3. O checkout em si está coerente ponta a ponta (`passaporteCoupon` → `PassaporteCouponBanner` → `use_passaporte` no payload → `calcularDesconto` no servidor → `raw_base44.passaporte_desconto` → `debitarCupomDaVenda` no webhook). O que falhava era o **frete**: o único jeito de cotar era um link pequeno sublinhado dentro do resumo, e o botão grande ficava DESABILITADO gritando "CALCULE O FRETE PARA CONTINUAR" — tocava e não fazia nada. No celular o texto em `text-lg` + ícone estourava a pílula (o print do dono).

**Decisão do dono e execução:**
- **Crédito do Alexandre liberado no banco em 15/09 01:57 UTC** (cupom `62830fdf…`): `valor_liberado = 10,00`, `saldo_restante = 10,00`, `status = liberado`, `auction_id_disputado` = Caixa de Som. Valor = teto do cupom (10% do lance de R$ 117 daria R$ 11,70; a regra limita ao cupom de R$ 10 do depósito de R$ 100). `bonus_creditado_em` foi mantido de propósito: continua marcando o cupom como modelo A, então `consumirBloqueado` nunca vai liberar/cancelar nada nele de novo — sem risco de pagar em dobro pra frente. O documento entregue ao cliente (PDF "Relatório de Conta") descreve exatamente isso.
- `src/pages/Cart.jsx`:
  - o frete é cotado **sozinho** (debounce 350 ms) toda vez que a assinatura muda (CEP completo, entrega, itens, quantidade) — inclusive quando o endereço salvo carrega. Não recota depois do PIX gerado nem da compra com saldo.
  - o botão grande **nunca fica desabilitado por frete pendente**: com CEP completo ele cota na hora; sem CEP mostra toast "Preencha o CEP de entrega pra calcular o frete." e rola/foca o campo (`cepInputRef`). Só desabilita enquanto está cotando ou processando.
  - visual: `text-base sm:text-lg`, `px-6`, `whitespace-normal leading-tight`; enquanto o frete está pendente o botão é cinza ("Calcular frete e continuar" / "Calculando o frete…"), e só fica verde quando vira "PAGAR R$ X".
- `tests/checkoutFreteAutomatico.test.mjs` — 7 testes cobrindo a cotação automática, o botão vivo, o visual e o caminho inteiro do Passaporte no checkout.

**Fora do escopo (ainda pendente de decisão do dono):** textos desatualizados do modelo A em `CartaoPassaporte.jsx` ("os 10% entram na hora") e `PassaporteLances.jsx` ("R$ 100 que valem R$ 110"); Rosenberg cobrado em dobro (R$ 19,80); recolhimentos integrais pré-18/08 (Luciano, Sophia, dono); linha "+bônus Passaporte" no extrato pros cupons do modelo A.

---

## DIR-153 — quem não está na mentoria não pode ter o dia zerado por não votar na MvM

**Emitida por:** dono, ao vivo, sobre o caso real da Sophia Sant'anna: *"Você não pode zerar o dia de quem não participa da mentoria, de quem não é obrigado a votar. O caso da Sofia Santana, você zerou o dia dela... Ela não está na mentoria. É só quem está realmente na mentoria... Quem não está, que não recebe voto, não é obrigado a votar."*

**Achado (confirmado via SQL em produção antes de mexer em qualquer código):** Sophia Sant'anna está `ativo: true` em `xgame_participantes` (aparece na lista votável, pode ser votada) mas `em_mentoria: false` (nunca entrou na mentoria oficial). A régua radical do não-voto (`resumoDoDia`, `perdeuPorNaoVotar`) julgava `votouEmTodos` sem olhar pra `em_mentoria` — zerava o dia (MvM, Human Token, pontos e X-Pay) de QUALQUER participante ativo, mentoria ou não, contrariando a própria migração `participante_em_mentoria` (que já registrava `ativo` e `em_mentoria` como coisas diferentes) e a fala do dono.

**O que entra (`src/lib/xgame.js`):**
1. `resumoDoDia` ganha `obrigadoAVotar = participante?.em_mentoria === true` — a régua radical do não-voto (`perdeuPorNaoVotar`) só se aplica quando isso é verdadeiro.
2. `CrmMetodo.jsx` e `XGame.jsx` já carregam `participante` inteiro (`select('*')` em `xgame_participantes`) e já passam esse objeto pra `resumoDoDia` — nenhuma mudança nas telas, o fechamento é só na função pura.

**Fora do escopo desta diretiva:** a régua de atraso na Fila do Pronto (`perdeuPorAtrasoPronto`) não muda — ela é sobre tarefa de gestão com prazo, não sobre a obrigação de votar, e continua valendo pra qualquer `ativo` independente de mentoria.

**Regras fixas:** nenhuma além das anteriores — `em_mentoria` continua sendo ligado só pelo ADM X-Game (🎓), e o super_admin continua controlando `aceita_ser_votado` por conta própria.

**Prova:** suíte 2448/2448 (2 testes novos/atualizados em `tests/xgame.test.mjs`, cobrindo tanto quem está na mentoria — continua zerando — quanto quem não está, incluindo o caso sem `participante` carregado), lint limpo (mesmos 63 erros pré-existentes em arquivos não tocados), `npm run build` sem erro.

**Status:** EM VIGOR.

---

## DIR-151 — "repetir o dia inteiro" — um clique, não um por um

**Emitida por:** dono, ao vivo (15/09/2026), testando a DIR-150 na hora: *"apareceu, tá top, só que eu botei lá embaixo que já tá aparecendo pra repetir todo dia, porém as mensagens em cima não atualizaram — eu tive que apertar manualmente ali em cima nas tarefas que já foram feitas... quando eu clicar ali embaixo repetir todo dia, todas as de cima precisa aparecer que foi atualizado. Eu não preciso ficar apertando um por um."*

**Achado:** ele marcou a caixa "🔁 repetir esta tarefa todos os dias" que fica junto do campo de criar TAREFA NOVA — só que essa caixa, por estar posicionada embaixo da lista inteira do dia, dá a impressão de ser uma ação sobre o DIA TODO. Na verdade ela só vale pra tarefa nova que for digitada ali (comportamento certo — é o que a DIR-150 pediu). O que faltava de verdade era a ação que ele estava tentando fazer: pegar tudo que já está no dia de hoje e jogar pra rotina permanente, de uma vez só, sem abrir tarefa por tarefa.

**O que entra (`CrmMetodo.jsx`):**
1. `tarefasParaRepetir` — as tarefas de hoje que AINDA não são da rotina, sem o Ritual (mesma blindagem da DIR-150: o Ritual nunca entra em `metodo_perfil.rotina`).
2. `repetirDiaInteiro()` — grava a rotina numa TACADA SÓ (`reduce` monta a lista nova inteira, um `gravarRotina` só) — nunca um loop chamando a gravação uma vez por tarefa, que sobrescreveria a coluna repetidas vezes em cima de si mesma.
3. Botão **"repetir o DIA INTEIRO de hoje todos os dias (N tarefas ainda não são da sua rotina)"** — mesmo lugar/estilo do "regerar o dia" (o caminho inverso: aquele leva a rotina pro dia, este leva o dia pra rotina), só aparece quando sobra alguma tarefa pra repetir — não fala à toa quando já está tudo igual.

**Fora do escopo desta diretiva:** o checkbox da tarefa nova (DIR-150) continua igual — ele está correto, só precisava de companhia pra cobrir o caso "quero tudo de uma vez".

**Regras fixas:** nenhuma além das anteriores.

**Prova:** suíte 2431/2431 (4 testes novos em `rotinaDiaInteiroDeUmaVez.test.mjs`), lint limpo, `npm run build` sem erro.

**Status:** EM VIGOR.

---

## DIR-152 — a primeira compra de Vendedor/Licenciado escolhe os produtos ANTES de pagar, e a comissão sai pelo motor oficial de 30%

**Emitida por:** dono, sobre a compra real do Luiz Henrique (indicado pelo Ribeiro): *"a gente tinha uma organização de que ele comprava, escolhia os produtos e pagava a primeira compra... Não foi distribuído comissão... o vendedor deveria escolher os produtos e pagar. Isso é um erro... eu quero que o cliente vá lá, escolha os produtos e pague."*

**Achado (análise diligente, confirmada com dados reais de produção via SQL, antes de qualquer correção):**
1. A Adesão de Vendedor pagava PRIMEIRO (`createSellerAdhesionPayment.js`, `kind='seller_adhesion'`) e só DEPOIS liberava saldo pra escolher produtos — ordem contrária à pedida. Sem dedup: um cliente real acumulou **15 linhas** de "Adesão Vendedor" em `catalog_sales` numa única compra (CPF sem dígito, cartão recusado, novas tentativas), das quais só 1 pagou de verdade.
2. **Causa raiz da comissão zerada:** essa venda usava um motor ANTIGO (`payDirectCommissions`, `api/_lib/commissions.js`) que só paga os 20% da cadeia telescópica — nunca os 10% do "topo institucional" (CEO/Livoo Live/Embaixador/Conselheiros/Fundadores/Diretoria Executiva/Diretoria de Operação/Executivo de Conta) que toda venda de loja paga pelo motor oficial (`api/_lib/arvoreOficial.js`, `calcularComissao`). O referrer real (Ribeiro, cargo `diretoria_operacao`) tem 0% de venda direta — **correto**, ele ganha pelo topo institucional — só que esse motor nunca era chamado no caminho da adesão. Não foi erro de conta: foi a venda nunca ter passado pelo motor certo. Rodando `calcularComissao` de verdade contra os dados reais da venda (R$ 1.497), o valor devido era R$ 449,11 (30%, batendo a régua oficial), sendo R$ 240,59 do Ribeiro (parceiro 15% venda direta + executivo 1% + pool diretoria_operação 0,5%) e o resto entre CEO/Livoo Live/Embaixador/Conselheiros/Fundadores/Diretoria Executiva/Ponto de Retirada Bangu/Loja Física/Distribuidor Bangu, todos na cadeia real dessa venda.
3. **Correção retroativa já aplicada** (fora do código, direto no banco, com o mesmo motor oficial e a mesma auditoria de idempotência que `storeFulfill.js` usa): os 35 lançamentos de `commission_records` da venda `4166dc0afbe06c3fc0074fe2` foram gravados e os saldos de comissão dos 16 beneficiários, creditados — conferido depois, bate exatamente com o calculado.

**O que entra (correção estrutural, pra nunca mais acontecer):**
1. `createMPPix.js` / `createMPCatalogCardCheckout.js` — aceitam `role_grant` (`'vendedor'` ou `'licenciado'`), conferem o valor mínimo (R$ 1.497 / R$ 5.000) **no servidor** (nunca só na tela) e criam a venda como `kind: 'loja'` normal, com `role_grant` marcado em `raw_base44` — a mesmíssima venda de loja que qualquer cliente faz, com o mesmíssimo frete calculado no checkout.
2. `mpWebhook.js` — `concederCargoDaPrimeiraCompra(sale)`: depois que `fulfillStoreOrder` já pagou a comissão pelo motor oficial de 30%, concede o cargo ao comprador (`career_levels`, `primary_career_level`, `is_seller` se vendedor) — idempotente, nunca reconcede.
3. `VendedorEscolherProdutos.jsx` vira a ETAPA 1: escolhe produtos até bater o mínimo, manda pro `/Cart` normal da loja (carrinho + frete + pagamento único). Quem **já pagou** pelo caminho antigo (tem `seller_credit_balance` de antes desta correção — o próprio Luiz Henrique) continua no modo de saldo existente, sem tocar no que já foi pago, exatamente como o dono pediu ("adicionar um saldo... pra ele poder escolher... pra gente poder enviar" — ele já tem os R$ 1.497 de saldo, intactos).
4. `Cart.jsx` — lê o `pendingRoleGrant` da tela anterior, barra o checkout abaixo do mínimo (em produtos, frete à parte), nunca permite pagar a primeira compra com saldo (ninguém novo tem saldo ainda), e manda `role_grant` pro PIX/cartão.
5. `VendedorCheckout.jsx` (a tela de pagar-primeiro) e `createSellerAdhesionPayment.js` ficam no código, mas ninguém mais chega neles por navegação normal — `VendedorCheckout.jsx` redireciona direto pra escolher produtos; `createSellerAdhesionPayment.js` ganhou uma correção de higiene à parte (cancela pendência anterior do mesmo usuário antes de abrir uma nova), pra quem ainda cair nele por link salvo não empilhar pedido de novo.
6. `SejaVendedor.jsx`/`SejaLicenciado.jsx` — copy e botões corrigidos pra descrever a ordem certa ("escolha os produtos... e pague", não mais "pague... e escolha").

**Fora do escopo desta diretiva:** nenhum motor de comissão novo foi criado — a correção foi parar de reinventar um motor à parte e usar o mesmo que a Loja Virtual já usa. `kind='adesao'` (adesão de Licenciado/Parceiro/etc. fora do fluxo de Vendedor) tem o mesmo desenho antigo (`activateAdesao`) e o mesmo risco de faltar o topo institucional, mas **zero vendas pagas até agora** (conferido no banco) — fica pra decisão própria do dono se esse caminho também deve migrar pro mesmo modelo de `kind='loja'`, não risquei essa mudança maior sob a urgência deste pedido. Pagamento da primeira compra com saldo de comissão (`payWithBalance`) não foi ligado ao `role_grant` — caso de borda irreal pra quem está se cadastrando agora (ninguém tem saldo ainda); por isso o Cart.jsx bloqueia essa combinação explicitamente, em vez de fingir suportar.

**Regras fixas:** nenhuma além das anteriores. A comissão de qualquer venda de loja (inclusive a primeira compra de Vendedor/Licenciado) continua sendo SEMPRE `calcularComissao`/`arvoreOficial.js` — nenhum caminho novo cria um motor de comissão próprio.

**Prova:** suíte 2443/2443 (16 testes novos em `tests/primeiraCompraVendedorEscolhePrimeiro.test.mjs`), lint limpo nos arquivos tocados, `npm run build` sem erro. Correção retroativa da venda real conferida direto no banco (saldos antes/depois batendo com os 35 lançamentos).

**Status:** EM VIGOR.

---

## DIR-150 — "repetir todo dia" fica claro no momento certo, não escondido num ícone

**Emitida por:** dono, ao vivo (15/09/2026): *"as pessoas estão editando a rotina e elas querem deixar salva do dia seguinte as rotinas do dia a dia, e não está claro na plataforma [...] cada rotina que ela coloque, dê a opção de ela manter recorrente isso com a rotina diária dela que ela já tem padrão. Isso é muito importante deixar bem claro [...] gostaria que você fizesse uma análise e deixasse cada vez mais claro isso e melhor organizado."* Contexto que ele deu junto, pra não confundir com o Ritual: quem está fora da mentoria organiza a própria rotina; quem está na mentoria recebe a rotina padrão com o Ritual do Amanhecer como núcleo — editável, mas perde o valor do ritual se mexer nele.

**Achado:** a DIR-146 (14/09) já tinha resolvido a GRAVAÇÃO (o botão existia e funcionava), mas não a CLAREZA — três furos concretos:
1. O botão "repetir todo dia" era só um ÍCONE (`<Repeat/>`), com o texto vivendo só no `title` — que não aparece no celular (sem hover) e, mesmo no desktop, exige passar o mouse pra descobrir o que ele faz. Depois de clicar, nada na tela dizia se aquela tarefa JÁ era recorrente — ela tinha que confiar de memória ou abrir "A minha rotina" pra conferir.
2. A escolha só existia DEPOIS de criar a tarefa, como um segundo passo separado — o pedido de hoje ("cada rotina que ela coloque") pede a opção NO MOMENTO de colocar, não depois.
3. Editar hora/título de uma tarefa de hoje dava só um AVISO passivo ("isto muda só o dia de hoje — pra mudar todo dia, edite a sua rotina") sem nenhuma ação ali — ela tinha que sair, abrir o painel da rotina e digitar tudo de novo à mão.
4. Achado à parte, checando o código de ontem: o botão "repetir todo dia" (e agora o checkbox de editar) não tinham nenhuma blindagem contra o Ritual do Amanhecer — a mesma tarefa que carrega `ehTarefaDeGratidao(t.titulo)` também passava pela lista genérica de tarefas do dia. Marcar "repetir" nele criaria uma entrada FANTASMA em `metodo_perfil.rotina` com o mesmo título do ritual, brigando todo dia com o ritual de verdade (que é gerado e pesado à parte, 20% do dia, DIR-142) — bug real, corrigido nesta mesma diretiva antes que alguém batesse nele.

**O que entra (`CrmMetodo.jsx`):**
1. `estaNaRotina(titulo)` — helper único, reusado pelo botão, pelo selo e pelo pré-preenchimento do checkbox de edição.
2. Cada tarefa do dia mostra ou o botão `🔁 repetir todo dia` (com TEXTO, não só ícone) ou, se já está na rotina, o selo `🔁 já repete todo dia` — nunca os dois, nunca nenhum quando é o Ritual.
3. Um checkbox `🔁 repetir esta tarefa todos os dias` aparece JUNTO do campo de criar tarefa nova — marcado, a mesma tarefa recém-criada já entra na rotina permanente, no mesmo clique.
4. O editor inline de hora/título ganha o mesmo checkbox (`🔁 repetir essa mudança todos os dias`), pré-marcado quando a tarefa editada já é da rotina (ela está corrigindo o padrão, não criando uma exceção) — ao salvar, a MESMA mudança é aplicada na rotina (troca o item existente por título original, ou inclui se ainda não era recorrente). Pro Ritual, continua só o aviso — sem checkbox — com o texto trocado pra explicar que o horário dele é definido nele mesmo (janela do ritual, DIR-142), não na rotina genérica.

**Fora do escopo desta diretiva:** qualquer mudança na regra de quem edita o quê (fora/dentro da mentoria) ou no peso/janela do Ritual — isso já está certo (DIR-80, DIR-142) e não foi tocado; esta diretiva é só sobre tornar a opção de recorrência visível e no momento certo.

**Regras fixas:** nenhuma além das anteriores. O Ritual do Amanhecer nunca aparece em `metodo_perfil.rotina` por nenhum caminho novo desta diretiva.

**Prova:** suíte 2427/2427 (6 testes novos em `rotinaClaraRecorrente.test.mjs`, 1 teste ajustado em `rotinaRepetirTodoDia.test.mjs` pro novo helper `estaNaRotina`), lint limpo, `npm run build` sem erro.

**Status:** EM VIGOR.

---

## DIR-149 — editar/excluir cliente direto na Lista de Network, e o atalho pra virar oportunidade sem redigitar

**Emitida por:** dono, ao vivo (14/09/2026): *"Na lista de contato, eu preciso ter um botão de editar o cliente e excluir o cliente porque está tendo cliente duplicado [...] quando eu vou criar uma nova oportunidade no acompanhamento, não está salvando isso [...] faça esse banco de atualização através de atualizações ou pelo acompanhamento ou pelo contato feito ou pela lista."*

**Achado:** investigação confirmou que **não é bug de salvar** — é fiação faltando. `customers` é a MESMA tabela por trás da Lista de Network (Hábito 3) e da aba Acompanhamento → Clientes; "Contato feito" (Hábito 4) já grava corretamente na mesma linha (`contatos_metodo[]`). O que faltava:
1. A Lista de Network (Hábito 3, `CrmMetodo.jsx`) nunca teve botão de editar nem de excluir cliente — só "Qualificar"/"Contatar". Sem excluir, um cadastro duplicado feito ali fica preso, sem jeito de limpar pela própria tela. Os handlers (`handleEdit`/`handleDelete`) e o modal já existiam prontos — só usados hoje pela aba Acompanhamento → Clientes (`CrmCustomersTable.jsx`).
2. O atalho "🚀 Esteira" (vira oportunidade com nome/contato já preenchidos, sem redigitar) já existia no Hábito 4 — Contato, mas não na Lista de Network. Quem estava direto na lista (onde o cadastro já está completo) e queria criar a negociação tinha que ir pro Hábito 4 primeiro, ou abrir a aba Acompanhamento e digitar tudo nos campos do formulário "+ Nova oportunidade" (que abre em branco).

**O que entra:**
1. `CrmMetodo.jsx` — duas props novas (`onEditarCliente`, `onExcluirCliente`) e três botões (ícone) na linha de cada pessoa da Lista de Network: 🚀 Esteira (reusa `onCriarOportunidade`, já existente), ✏️ Editar, 🗑️ Excluir — mesmo estilo/confirmação da aba Acompanhamento (excluir pede confirmação antes de apagar).
2. `CrmClientesTab.jsx` — liga `onEditarCliente={handleEdit}` e `onExcluirCliente={handleDelete}` na chamada de `<CrmMetodo>`. **Zero lógica nova**: são os MESMOS handlers que já existiam e já gravam/apagam em `customers`; o modal de edição já estava montado fora das Tabs (nível certo, confirmado antes de mexer — havia um bug documentado exatamente sobre modal preso dentro de aba escondida, DIR-46).

**Fora do escopo desta diretiva:** o card de oportunidade (`captacao_oportunidades`) guarda uma CÓPIA do nome/e-mail/telefone do cliente no momento da criação, não uma referência viva — se o cliente for editado DEPOIS de já ter uma oportunidade aberta, o card antigo não atualiza sozinho. Isso é uma decisão de arquitetura (histórico da negociação como foto do momento vs. sincronizado ao vivo) que fica pra uma diretiva própria, se o dono quiser mudar — não risquei essa mudança maior sob a pressão do pedido.

**Regras fixas:** nenhuma além das anteriores. Excluir cliente continua pedindo confirmação — não é ação de um clique só.

**Prova:** suíte 2402/2402 (3 testes novos, `listaNetworkEditarExcluir.test.mjs`), lint limpo nos arquivos tocados, `npm run build` sem erro.

**Status:** EM VIGOR.

---

## DIR-148 — a pílula do X-Music para de mentir: mostra o que o player está tocando DE VERDADE

**Emitida por:** dono, direto: *"a música está tocando automático e isso é certo, porém está colocando como se estivesse sem tocar, deveria estar verde e sinalizar que a rádio está tocando. Analise e veja o que está acontecendo e corrija."*

**Achado:** `ligado` (o que pinta a pílula verde/cinza e o texto "tocando"/"desligado") era só a INTENÇÃO — o que o botão pediu por último — nunca o que o player fazia de verdade. O embed do YouTube sempre nasce com `autoplay:1`; em qualquer sessão/navegador onde esse autoplay COM SOM é permitido (o caso do dono), ou quando alguém usa os controles NATIVOS do próprio player do YouTube (visíveis na tela, `controls:1`), o som tocava de verdade enquanto a pílula, presa na intenção antiga (o padrão de `lerLigado()` é `false`), seguia cinza dizendo "desligado". A régua nunca escutava o player pra saber se ele estava, de fato, tocando ou pausado.

**O que entra (`XMusic.jsx`):** `PlayerYT` ganha um `onEstadoReal`, avisado pelos eventos DE VERDADE do player do YouTube (`onStateChange`: `PLAYING`→`true`, `PAUSED`→`false`) — a fonte da verdade, não mais só a intenção. Esse aviso vai direto pro mesmo `setLigado` que já pinta a pílula, o botão e o ícone — não é um segundo estado paralelo, é a MESMA variável agora sincronizada nos dois sentidos: toque no botão manda o player tocar/pausar (como já era) E o player avisa de volta o que está de fato fazendo (novo). Cobre os dois jeitos de o estado real divergir da intenção: autoplay que o navegador realmente permite, e alguém pausando/tocando pelos controles nativos do YouTube.

**Fora do escopo:** nenhuma mudança na fila de estações, na playlist, no cronômetro ou em qualquer outra parte do X-Music — só a pílula deixar de mentir sobre o que está saindo do alto-falante.

**Prova:** suíte 2403/2403 (4 testes novos em `tests/xmusicPilulaReflete.test.mjs`), lint limpo, `npm run build` sem erro.

**Status:** EM VIGOR — mergeado no `main`.

---

## DIR-147 — o vigia do saldo do AI Gateway: aviso ANTES de chegar em zero, não depois

**Emitida por:** dono, ao vivo (14/09/2026), depois de conferir que a DIR-146 restaurou o crédito da Eloá e não achou mais nenhuma outra vítima no histórico: *"o crédito quando estiver acabando precisa ter um aviso, né, pra não ocorrer mais isso. Isso é muito sério, a gente não pode ficar assim."*

**Achado:** a DIR-146 consertou o que o app FAZ quando a IA está fora do ar (nunca mais descarta nem reprova sozinho) — mas não havia NENHUMA forma de saber que o crédito estava acabando ANTES de virar 402 de verdade. A única forma de descobrir era abrir o dashboard da Vercel (`vercel.com/.../ai-gateway`), e ninguém abre isso às 5h da manhã — foi exatamente por isso que o incidente pegou todo mundo de surpresa.

**O que entra:**
1. `saldoGateway(ia)` e `SALDO_BAIXO_USD` (`api/_lib/ia.js`) — chama `GET https://ai-gateway.vercel.sh/v1/credits` (rota documentada pela Vercel, devolve `{balance, total_used}`) com a MESMA chave que já valida comprovação de verdade. `null` quando não dá pra saber (fora do gateway, ou a própria checagem falhou) — nunca inventa um número. Teto padrão: $10 (configurável por `AI_GATEWAY_SALDO_BAIXO_USD`).
2. `xgameValidarPrint.js` (GET) — o health-check que o ADM já chamava (`?ping=1`, DIR-84.1) passa a devolver `saldo_gateway_usd`/`saldo_baixo` junto, sem chamada extra ao modelo.
3. **Aviso visível toda vez que o gestor abre o ADM X-Game** (`XGameAdmin.jsx`) — badge novo ao lado do "IA de visão RESPONDENDO": `🔋 crédito da IA: $X.XX`, virando `🪫 ... ACABANDO, recarregue agora` (com o link direto) quando abaixo do teto.
4. **Vigia automático** (`api/functions/alertaCreditoGateway.js`, cron a cada 4h em `vercel.json`) — mesmo padrão do vigia de reservas órfãs (`alertaReservasOrfas.js`, 27/08): só AVISA, nunca recarrega sozinho (quem decide comprar crédito é o dono). Grava aviso em `system_logs` quando o saldo está baixo, com o valor exato e o link de onde recarregar. Quando a PRÓPRIA checagem falha, também avisa (`SALDO_DESCONHECIDO`) — silêncio sem contexto foi o que já causou o incidente uma vez, não pode virar hábito.

**Fora do escopo desta diretiva:** notificação push (WhatsApp/Slack) direto pro dono — a checagem de saldo hoje só fica visível no ADM (quando ele abre) e em `system_logs` (quando alguém olha o log). Puxar isso pra um canal que ele efetivamente monitora em tempo real (Zeca/Slack, ou WhatsApp) fica pra diretiva própria, se ele quiser — não fui atrás de escolher um canal e arriscar configurar errado sob a pressão do incidente.

**Regras fixas:** nenhuma além das anteriores. O vigia NUNCA compra crédito sozinho — só avisa; recarregar é decisão humana.

**Prova:** suíte 2387/2387 (9 testes novos: 2 em `xgameValidarPrintHandler.test.mjs`, 7 em `alertaCreditoGateway.test.mjs` novo), lint limpo nos arquivos tocados, `npm run build` sem erro.

**Status:** EM VIGOR.

---

## DIR-146 — IA fora do ar deixou de custar crédito de ninguém: comprovação vira `pendente_ia`, nunca some nem reprova sozinha

**Emitida por:** dono, ao vivo (14/09/2026), depois de um incidente real na madrugada — 5 capturas de tela e a mensagem: *"Você me disse ontem que estava funcionando todo o ritual, e hoje nós fomos pego de surpresa, porque o ritual de várias pessoas não salvou. As pessoas concluíram mas não salvou. Aí a de validação não está funcionando. [...] eu preciso de que isso não falhe mais, isso não pode falhar de jeito maneira [...] eu quero que você analise tudo o que deu errado, que você dê o ponto pras pessoas que fizeram, as pessoas fizeram só que não conseguiu salvar [...] você me entregue isso pronto e nunca mais falhar [...] coloque uma prevenção agora pra isso nunca mais acontecer."* E, sobre o planejamento da Distribuidora Eloá que não valeu no dia seguinte: *"a gente tem que ter uma opção também, de quando a pessoa montar o teu planejamento, ter um botão de salvar pros outros dias, e isso ficar claro."*

**Achado (causa raiz confirmada, não suposição):** o Vercel AI Gateway ficou sem crédito (`HTTP 402 insufficient_funds`) entre ~06:00 e ~06:06 BRT de 14/09 — `api/functions/xgameValidarPrint.js` já tratava isso corretamente (devolve `{ia_indisponivel:true}`, nunca finge veredito), mas o que a TELA fazia com essa resposta é que causava o prejuízo, em dois lugares diferentes:
1. **Tarefa normal (foto/print), `CrmMetodo.jsx`:** o ramo `decisao.acao === 'ia_fora'` **não gravava nada** — a tentativa "sumia sem deixar marca" (só um toast e uma entrada de `falhasPorTarefa`, que morre se a pessoa não voltar a tentar). Foi exatamente o caso da Eloá com "Banho gelado": ela mandou a foto de verdade, a IA não respondeu, e não sobrou NENHUM registro em `metodo_tarefas.comprovacao` — zero prova, zero ponto.
2. **Ritual do Amanhecer, `src/lib/ritualEmBlocos.js`:** `blocoReprovado()` tratava `duvida` no bloco de visualização como reprovação automática (regra certa da DIR-125, pra ambiente ruim — carro/academia/escritório). O problema: a MESMA função de `blocoReprovado` era chamada com o veredito `{veredito:'duvida', ia_indisponivel:true}` que a IA devolve quando está fora do ar — e a régua não distinguia "a IA viu e duvidou do ambiente" de "a IA nunca chegou a ver". Um ritual completo de verdade (print, 20s de áudio de gratidão, 121s de vídeo de visualização — caso real da Eloá, `d8b4c675-fce3-49af-9dca-5efd54c78d7a`) virou `status:'ritual_parcial'`, `valido:false`, `feito:false` — crédito zero por um trabalho genuíno, só porque a Vercel ficou sem saldo.
3. **A rotina da Eloá não "salvou pro dia seguinte":** ela organizou o dia 13/09 inteiro na tela dela (22 tarefas próprias, com hora e título dela) usando o campo de adicionar tarefa do dia — isso grava só em `metodo_tarefas` (o retrato de UM dia). O molde permanente (`metodo_perfil.rotina`, DIR-80) continuou `null`, então 14/09 nasceu com a `ROTINA_PADRAO` genérica da casa. Não é bug de sincronismo: a pessoa nunca tinha um botão, no lugar onde ela monta o dia, pra dizer "isso vale todo dia" — só existia (DIR-142.2) dentro do ADM, pro gestor fazer por ela.

**O que entra:**
1. `src/lib/ritualEmBlocos.js` — `blocoReprovado()` ganha uma guarda no topo: `if (veredito?.ia_indisponivel) return false` — IA fora do ar NUNCA é reprovação, em bloco nenhum (nem visualização). Nova função pura `blocoPendenteIA()`. `seloDoRitual()` ganha um quarto selo, `'pendente_ia'`, distinto de `'parcial'` (que continua sendo "faltou alguém entregar algo") — os três blocos vieram, ninguém foi reprovado, só falta confirmação. `statusDoRitual()` mapeia pra `'ritual_pendente_ia'`. `pendenciasDoRitual()` escreve a mensagem certa: "FOI SALVO, não foi perdido nem reprovado, só está aguardando confirmação" — nunca a frase de reprovação genérica.
2. `CrmMetodo.jsx` — o ramo `ia_fora` (tarefa normal) passa a **gravar** a comprovação como `status:'pendente_ia', valido:false` (nunca `true`: IA fora do ar continua não virando aprovação sozinha — a régua de "intervenção humana zero" da DIR-89 não voltou atrás, só ganhou uma saída pra falha de infra) em vez de descartar. O anti-reuso por hash e o anti-reciclagem visual (fotos anteriores mandadas pra IA comparar) passam a EXCLUIR comprovações `pendente_ia` — sem isso, a própria pessoa reenviando a mesma foto real seria barrada como "imagem já usada". O fechamento do ritual (`concluirRitual`) grava `ia_indisponivel` no rastro de topo quando o status final é `ritual_pendente_ia`, pro laudo (`leituraDoRastro`) mostrar "não foi ela" também nesse caso. Toast e telas do Ritual (`XGameRitualAmanhecer.jsx`) ganham texto próprio pro estado pendente — nunca soa como "você fez menos".
3. **A fila do gestor enxerga os dois `pendente_ia`** (`XGameAdmin.jsx` e `Comprovacoes.jsx`, as duas cópias independentes da mesma fila) — nova aba "IA fora do ar", contador visível, e o botão "Aprovar ✔" (já existente, `aprovarComp`/`aprovar`) passa a valer pra esses status: mesmo clique que já aprovava manualmente um `em_analise`, sem função nova. A aba padrão ao abrir a fila virou `pendente_ia` em vez de `em_analise` (que, desde a DIR-89, quase nunca nasce mais sozinho). `relatorioComprovacoes.js` (o laudo — a defesa de quem reclama) ganha os rótulos e classifica os dois status como "em análise", nunca como "reprovada".
4. **Botão "repetir todo dia" na própria tarefa** (`CrmMetodo.jsx`, ícone 🔁 ao lado de editar/apagar) — mesma função `incluirNaRotina`/`gravarRotina` que já existia dentro do painel escondido "A minha rotina", só que direto na tarefa do dia, onde a pessoa está montando o planejamento. Recusa duplicar título (mesmo aviso do ADM). Claro, visível, sem precisar abrir painel nenhum nem redigitar hora/título.
5. **Backfill de produção (dado real, não migração):** o ritual da Eloá (`d8b4c675-fce3-49af-9dca-5efd54c78d7a`) foi aprovado manualmente via SQL direto — mesma transformação de campos que `aprovarComp` faz (`status:'aprovada_manual', valido:true, feito:true`), com `motivo_gestor` documentando a causa (402, blocos entregues de verdade entre 06:00 e 06:06). A rotina PERMANENTE dela (`metodo_perfil.rotina`) foi materializada com as 22 tarefas reais do dia 13/09 (hora + título dela, extraídas de `metodo_tarefas`), pra 15/09 em diante nascer com a rotina dela, não a padrão da casa.
6. **Auditoria de escopo:** varredura em `metodo_tarefas` de 13 e 14/09 inteiros (toda linha com sinal de `ia_indisponivel`/`insufficient_funds`/`402`, mais toda linha com `comprovacao` no dia 14/09, ordenada por horário) confirmou que **só a Eloá** foi vítima real do 402 — os dois outros casos que pareciam suspeitos (Elenice Lima e Iara Figueiredo, ambas com `ritual_em_andamento`) têm veredito REAL da IA nos dois blocos (dúvida legítima sobre o enquadramento da foto, sem nenhum sinal de 402) — não mexidos. O caso do Ribeiro (reprovado por foto praticamente preta) é reprovação legítima, confiança 100%, motivo real — não mexido.

**Fora do escopo desta diretiva:** adicionar crédito no Vercel AI Gateway — isso é billing, só o dono resolve, em `https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dtop-up`. Retentativa automática em segundo plano quando a IA volta (hoje depende da pessoa reabrir e reenviar, ou do gestor aprovar pela fila) fica pra uma diretiva própria, se o dono quiser.

**Regras fixas:** nenhuma além das anteriores. `pendente_ia` nunca é `valido:true` sozinho — só um clique humano (gestor) ou uma nova resposta real da IA muda isso; a régua de "zero intervenção humana" da DIR-89 segue valendo pro caminho feliz, IA fora do ar é a única exceção que sempre existiu (DIR-84.1) e continua sendo.

**Prova:** suíte 2378/2378 (12 testes novos: `REB-11`/`REB-12` em `ritualEmBlocos.test.mjs`, `iaForaDoArNaoDescarta.test.mjs` novo com 6 casos cobrindo CRM/XGameAdmin/Comprovacoes/laudo, `rotinaRepetirTodoDia.test.mjs` novo, `rastroDaComprovacao.test.mjs` ajustado pro novo parâmetro do rastro), lint limpo nos arquivos tocados, `npm run build` sem erro.

**Status:** EM VIGOR — código pronto, backfill de produção já aplicado (crédito da Eloá restaurado, rotina dela materializada), aguardando merge do PR.

---

## DIR-147 — o treinamento do Encontro da Mentalidade fica editável de verdade, e as lâminas ficam conectadas

**Emitida por:** dono, direto e urgente: *"eu não consigo editar as lâminas... as perguntas do treinamento não levam a lugar nenhum, não adianta de nada... está sem conexão, está sem sentido. Precisa ter um sentido, aonde eu coloco treinamento, pra onde o treinamento vai, onde ele aparece, aonde eu edito as lâminas... analise essa porra de forma diligente e me traga uma solução definitiva pra isso aqui ficar perfeito. Fica fluido."*

**Achado na auditoria (a causa real, não sintoma):** existiam DOIS "treinamento" no Encontro da Mentalidade que não se falavam. (1) `encontro.treinamento` — a caixa do cabeçalho "o treinamento (40 min)" — é o ÚNICO que a apresentação de fato usa (DIR-79), mas só podia ser APAGADO e reescrito do zero ("trocar o treinamento"): pra mudar uma palavra, era preciso reescrever tudo. (2) `roteiro.treinamento` — o rascunho da IA/régua, dentro de "O tópico do encontro" — tinha um botão "editar" que parecia funcionar, mas assim que existia um treinamento gravado (1), esse rascunho ficava MUDO: editar ali não tinha efeito nenhum na apresentação — um segundo formulário que não levava a lugar nenhum. Achado também: `roteiro.abertura` (o slide "Abertura", logo depois da Mentalidade) era gravado e usado na apresentação, mas nunca aparecia nem podia ser editado fora dela.

**O que entra:**
1. `treinamentoDoRoteiro()` (nova, `src/lib/encontro.js`) — a ponte: converte o rascunho da IA/régua pro formato do treinamento gravado.
2. **Gerar o tópico já grava o treinamento automaticamente**, quando ainda não existe um gravado — a caixa do cabeçalho nunca mais fica dizendo "ainda sem material" logo depois de gerar um treinamento inteiro.
3. **"trocar o treinamento" (que só apagava) virou "editar"** — os campos (título, material, passos) chegam JÁ PREENCHIDOS com o que existe; "apagar" continua existindo, mas como ação separada e explícita, com confirmação.
4. **Um só treinamento, em vez de dois que discordavam**: "O tópico do encontro" não tem mais um segundo formulário de treinamento — mostra o mesmo treinamento EFETIVO que a apresentação usa, com um link "editar o treinamento lá no topo ↑".
5. **A Abertura vira uma lâmina de verdade**: aparece e pode ser editada em "O tópico do encontro" (antes só existia dentro do Apresentar, sem lugar nenhum pra editar fora dele).
6. **Editar direto de dentro da lâmina**: o modo Apresentar ganha um botão de editar — fecha a apresentação e já abre a edição, sem precisar caçar o botão certo depois.

**Fora do escopo:** nenhuma mudança na geração do roteiro em si (IA/régua local), no cronômetro, em direcionar demandas ou na visão executiva — só a conexão e a edição do treinamento e da abertura.

**Prova:** suíte 2380/2380 (12 testes novos em `tests/encontroTreinamentoConectado.test.mjs`), lint limpo, `npm run build` sem erro, e os 14 testes de navegador (`tests/navegador/encontro.spec.mjs`, Playwright real contra Chromium) continuam passando — incluindo prova visual (screenshots) do fluxo completo: gerar tópico → treinamento já pronto → editar com campos preenchidos → o mesmo conteúdo espelhado no tópico → o botão de editar dentro do Apresentar.

---

## DIR-141 — a 4ª tabela cortada em 1.000 linhas caladas: `metodo_tarefas` do ciclo inteiro também estourava, e "hoje" sumia do ADM X-Game

**Emitida por:** o dono, ao vivo, testando o preview da correção da DIR-140 — o mesmo "0/0 tarefas hoje" no ADM continuava, mesmo com o fuso já corrigido, enquanto a Visão Executiva seguia mostrando o número real (10/173). *"quantas tarefas o time tem hoje, pelo amor de deus, sem achismo."*

**Achado:** a DIR-140 corrigiu um bug real, mas não era o único. `XPerformanceGestao.jsx` (`carregarTarefas`) carrega o **ciclo inteiro** (~30 dias) de `metodo_tarefas` para **todo o time** (até 16 pessoas × ~20 tarefas/dia) numa única consulta, ordenada por data crescente. Isso passa de 1.000 linhas bem antes de chegar no dia de hoje (dia 7 do ciclo já soma ~2.100 linhas) — e o Supabase **corta em 1.000 por padrão, sem avisar** (HTTP 200, sem erro). É a MESMA falha já corrigida três vezes nesta casa (estoque, CRM de clientes, votos do MvM — `lerTudoDoSupabase.js`), agora numa quarta tabela. `PerformanceEquipe.jsx` tinha o mesmo padrão, pior ainda: nem filtrava por pessoa, o time inteiro da empresa na mesma janela.

**O que entra:**
1. `XPerformanceGestao.jsx`: a leitura do ciclo inteiro passa a usar `lerTudoDoSupabase` — nunca mais corta calado, não importa quantas linhas o ciclo já tenha.
2. `PerformanceEquipe.jsx`: mesma correção na leitura do período do time inteiro.
3. Teste novo (`tests/tarefasDoTimeSemCorte.test.mjs`) trava que as duas telas usam a peça paginada — não um `select()` cru — pra este bug não reaparecer numa quinta tabela sem ser pego antes do merge.

**Prova:** suíte 2346/2346 (2 testes novos), lint limpo, `npm run build` sem erro.

---

## DIR-140 — o "hoje" em UTC: das 21h às 23h59 de Brasília, o ADM X-Game mostrava o dia seguinte (0/0), a Visão Executiva mostrava o dia certo (10/173)

**Emitida por:** o dono, ao vivo, comparando o X-office (ADM X-Game) mostrando "0/0 tarefas concluídas hoje" com o `/XGame` (Visão Executiva), no mesmo instante, mostrando "10/173" — mesma população (10 pessoas), dois números de "hoje" completamente diferentes. Pedido: *"essas tarefas de ADM X-GAME precisam estar exatamente como a tarefa da X-GAME que clicamos... preciso de uma auditoria extremamente diligente."*

**Achado:** `XPerformance.jsx` (a tela que hospeda o ADM X-Game) calculava "hoje" com `new Date().toISOString().slice(0, 10)` — a data em **UTC**, não em Brasília. Esta é a MESMA classe de bug já achada e corrigida duas vezes antes (DIR-129, na data; DIR-134, na hora do dia) — só que num arquivo que nunca tinha sido varrido. Das 21h às 23h59 de Brasília, o UTC já virou o dia seguinte: o ADM filtrava "tarefas de hoje" por uma data que ainda não tem nenhuma tarefa gravada no banco — 0/0, sempre, nesse intervalo de quase 3 horas todo santo dia. A Visão Executiva já usava `dataISO()` (o helper certo, força America/Sao_Paulo) — por isso só ela mostrava o número real.

Achado o mesmo padrão, numa varredura em TODA a pasta de telas do Método/X-Game (não só onde o dono via o problema), em mais **10 arquivos**: `PainelCorporativo.jsx`, `QuadroCompromisso.jsx`, `EncontroMentalidade.jsx`, `PainelLaudo.jsx`, `PerformanceEquipe.jsx`, `MentalidadePagina.jsx` (inclusive decidia errado se hoje é segunda-feira), `XGameRitualAmanhecer.jsx` (a música do dia e o embaralhar do quadro dos sonhos), `DiarioDeBolso.jsx` (o início da semana) e `CrmEsteiraCaptacao.jsx` (data padrão de um aporte).

**O que entra:**
1. Todos os 11 arquivos trocam `new Date().toISOString().slice(0, 10)` (ou o `Date` cru que virava isso) por `dataISO()` (`@/lib/xgame`) — a mesma fonte única já usada em `XGameVisaoExecutiva.jsx`, `CrmMetodo.jsx` e `XGame.jsx`.
2. Teste novo em `tests/xgameFusoHorario.test.mjs`: varre **toda** a pasta `src/components/licensing/CentralVendas/*.jsx` procurando o padrão `toISOString().slice(0, 10)` usado como "hoje" — não fica mais restrito aos arquivos onde o bug já apareceu uma vez. Este bug já foi achado ao vivo em produção três vezes (DIR-129, DIR-134, esta); a quarta vez tem que ser um teste vermelho antes do merge, não um print do dono.

**Prova:** suíte 2268/2268 (1 teste novo, de varredura ampla, mais 10 testes preexistentes da mesma família continuam verdes), lint limpo, `npm run build` sem erro.

---

## DIR-142 — o Ritual do Amanhecer vale sempre 20% do dia (fora do teto de peso 1-6), e ganha janela própria pra quem tem fixo fora da mentoria

**Emitida por:** dono, ao vivo (13/09/2026): *"acordar cedo, fazer esse ritual, pesa muito no negócio... a pessoa não vai ganhar dinheiro só por acordar cedo, mas tem que ganhar um valor razoável porque é um peso bom."* E, sobre quem tem fixo mas está fora da mentoria (a distribuidora, o Flávio, a Luciene, o Amâncio): *"eles ganham no horário que eles definirem, de acordo com o fixo dela... quem já está na mentoria é obrigatório acordar cinco horas da manhã, se não acordar não ganha o valor desse ritual."*

**Achado:** o teto do peso automático (`PESO_MAX = 6`, numa referência de dia completo de 76) nunca chegaria a 20% do dia sozinho — 6/76 é 7,9%. Dar ao ritual "o maior peso possível" (o que já valia, DIR anterior) não é o mesmo que garantir 20% do dinheiro do dia. Além disso, a janela do ritual (4:40-5:30) era global e fixa pra todo mundo — inclusive pra quem tem fixo mas está fora da mentoria (não vota, não é votado) e por regra do dono define o próprio horário de acordar.

**O que entra:**
1. `PERCENTUAL_RITUAL = 0.20` e `pesoRitualNaRotina()` (`src/lib/xgame.js`) — o ritual (`ehTarefaDeGratidao`) sai do balde comum de peso 1-76 e vira um balde PRÓPRIO, sempre 20% de `valorDoDia(fixoDoParticipante(p))`, igual já acontecia com bônus (`verba_bonus`) — nunca a fatia proporcional de peso. Os outros 80% do dia (produção) continuam repartidos pelo peso de sempre, só que contra uma referência 6 pontos menor (76 − o peso do ritual = 70), já que aquele peso saiu do jogo comum.
2. `janelaDoRitual({ votavel, horaTarefa })` e `minDeHora("HH:MM")` (`src/lib/xgame.js`) — quem é votável (mesmo `podeSerVotado`/`aceita_ser_votado` que já decide o MvM) usa SEMPRE a janela fixa da casa (4:40-5:30). Quem tem fixo fora da mentoria define o próprio horário; a janela vira em volta dele com a mesma folga de sempre (20min antes, 30min depois). Sem horário definido, mesmo fora da mentoria, cai na régua fixa — nunca fica sem janela nenhuma.
3. `deveAvisarRitual` (`src/lib/xgame.js`) ganha o parâmetro opcional `janela` (default: a janela fixa, comportamento antigo preservado) — o aviso "como funciona o ritual" dos 10 minutos antes passa a bater com a janela de quem está vendo a tela, não só com a da casa.
4. `CrmMetodo.jsx` — os 3 pontos que liam `RITUAL_INICIO_MIN`/`RITUAL_FIM_MIN` direto (o corte de abertura em `concluirRitual`, o bloqueio duro em `alternarFeito`, e o banner explicador) agora calculam a janela de cada pessoa via `janelaDoRitual`, usando o mesmo `meuAceitaSerVotado`/`podeSerVotado` que já monta a população votável da MvM — nenhuma régua nova, a mesma aplicada num lugar novo.
5. O CONTEÚDO do ritual é idêntico pros dois grupos (mentoria e fora dela) — confirmado pelo dono: *"o ritual é o mesmo... a única diferença é que eles não estão na mentoria... e eles definem o horário deles."* Só a janela de horário muda.
6. **Correção de auditoria (13/09/2026, depois do PR aberto, antes do dono conferir):** o dono pediu uma auditoria completa da X-Game "pra ter 1000% de certeza" antes de publicar. Achado: `DistribuirTarefa.jsx` (a prévia de tarefa nova), `QuadroGeralAbas.jsx` (aba Semana) e `XPerformanceGestao.jsx` (os 4 cards do ciclo, "hoje" e "próximos dias") chamavam `distribuirDia`/`simularNovaTarefa`/`resumoDoCiclo` (`distribuicaoFixo.js`) DIRETO, com peso e fixo cheios — nenhuma sabia que o ritual virou balde de 20% à parte, e iam mostrar valor ERRADO assim que este PR publicasse (o ritual contando na régua de peso comum). Corrigido com duas funções novas ritual-aware em `xgame.js` (`simularNovaTarefaComRitual`, `resumoDoCicloComRitual`, construídas em cima de `valoresDasTarefas`/`reguaDoDia`) e as 3 telas trocadas pra usá-las — mesma fonte de verdade em todo lugar que mostra dinheiro do X-Game.
7. **Prova ao vivo do vídeo do ritual (13/09/2026):** o dono pediu prova real, não só de código, de que o vídeo grande (o incidente de 10-11/09, `d01c51e`) não travaria mais o cumprimento da meta. Rodado num Chromium de verdade (câmera falsa do navegador, 90s de gravação real usando `gravadorDeVideo.js` sem mock): bitrate medido 361 Kbps (abaixo do teto de 1 Mbps declarado), extrapolando pros 15 minutos inteiros da rede de segurança do ritual dá ~39 MB — bem dentro do cofre de 200 MB. Upload de verdade contra o Storage de produção não foi possível testar neste ambiente (rede bloqueada pra `supabase.co`, política da organização) — a parte testada foi exatamente a que causou o incidente original (o encoder do navegador).

**Fora do escopo desta diretiva:** a tela "Distribuir Tarefa" do ADM X-Game (reconciliação entre tarefas automáticas do sistema e tarefas que a própria pessoa fora da mentoria organiza, ex.: Distribuidora Eloá) — isso foi pra uma diretiva própria, DIR-142.2, publicada logo abaixo.

**Regras fixas:** nenhuma além das anteriores. Rounding: somar o balde do ritual (20%, arredondado à parte) com o balde de produção (80%, arredondado à parte) pode variar ~1 centavo do valor cheio do dia — mesmo comportamento que já existe entre produção e bônus (dois arredondamentos, não um só); não é bug, é o preço de dois baldes separados.

**Prova:** suíte 2357/2357 (26 testes tocados/novos: `xpayFixo.test.mjs`, `xpayRateio.test.mjs`, `janelaDoRitual.test.mjs` novo, `ritualTresBlocos.test.mjs` atualizado, `consistenciaRitualNasTelas.test.mjs` novo — prova as 3 telas corrigidas e as 2 funções ritual-aware novas), lint limpo nos arquivos tocados, `npm run build` sem erro. Auditoria em 5 frentes paralelas (vídeo do ritual, X-Pay em todas as telas, MvM/moeda, ADM, notificações/fila do pronto) sem outro achado bloqueante.

**Status:** EM VIGOR — mergeado no `main` (PR #336), autorizado pelo dono a publicar fora da janela de deploy padrão.

---

## DIR-142.2 — o ADM X-Game passa a mostrar e mexer na rotina PERMANENTE da pessoa, não só o dia já gerado

**Emitida por:** dono, ao vivo (13/09/2026), olhando a tela de Distribuir Tarefa da Distribuidora Eloá (fora da mentoria, fixo R$2000): *"aqui não está aparecendo as tarefas que ela mesmo organizou... quero que apareça as tarefas automáticas do sistema, as tarefas dela pra eu provar caso ela mude, e que eu possa inserir. Todas as tarefas precisam ter peso e ser distribuídas através do seu peso e o valor fixo acordado."*

**Achado:** o card "Tarefas de [pessoa]" do ADM X-Game (`XGameAdmin.jsx`) sempre leu só `metodo_tarefas` — o retrato de UM DIA já materializado. A rotina PERMANENTE dela (`metodo_perfil.rotina`, o molde que gera todo dia, DIR-80: *"a rotina é dela"*) nunca aparecia nessa tela — só existia dentro do app da própria pessoa. Isso fazia parecer que "as tarefas que ela organizou" tinham sumido, quando na verdade só não tinham VITRINE nenhuma no lado do admin — e não dava pra confirmar/provar o que ela de fato configurou, nem inserir algo que valesse pra sempre (só pro dia escolhido).

**O que entra** (`src/components/licensing/XGameAdmin.jsx`, reaproveitando as funções puras já existentes de `src/lib/rotinaPessoal.js` — DIR-80, nenhuma régua nova):
1. **Selo de origem do dia** — o cabeçalho do card agora diz de onde veio a lista mostrada: rotina PRÓPRIA dela, rotina padrão da CASA (ela ainda não personalizou), ou avulso/manual (não veio de nenhuma geração automática). Responde direto "os valores só vêm das tarefas automáticas, ou também do que ela organiza?" — SEMPRE contam as duas, porque o motor de pagamento (`valoresDasTarefas`) lê `metodo_tarefas` sem se importar de onde a linha veio; o que faltava era o admin CONSEGUIR VER a origem.
2. **"📅 Rotina permanente dela"** — bloco novo, dentro do mesmo card: lista os itens do molde (`metodo_perfil.rotina`, ou a da casa se ela ainda não tem a própria), com botão pra incluir (hora + título) e excluir. Isso é o "eu preciso provar caso ela mude" — o admin vê e guarda prova do que está combinado pra sempre, não só do dia de hoje.
3. **"🔁 tornar recorrente"** — botão em cada tarefa do dia (automática ou criada na hora): um clique grava aquele título na rotina permanente dela, sem redigitar. Recusa duplicar (compara título, sem diferenciar maiúscula/minúscula).
4. Mudança na rotina permanente **nunca reescreve hoje** — grava só em `metodo_perfil.rotina`; o dia já materializado em `metodo_tarefas` fica como está (mesma regra já provada em `rotinaPessoal.test.mjs`: "editar a rotina vale a partir de amanhã").
5. Todo item, de onde vier (automático, manual antigo, ou incluído agora na rotina permanente), continua tendo peso e entrando na mesma distribuição pelo fixo (`distribuirDia`/`valoresDasTarefas`) — nenhuma tarefa nova escapa da régua de pagamento.

**Fora do escopo desta rodada:** redesenho visual da tela (cores, layout) além do necessário pra caber o bloco novo; sincronização em tempo real entre o app dela e o ADM (ambos já leem a mesma tabela — não há duas fontes de verdade a reconciliar, só faltava a leitura do molde).

**Regras fixas:** nenhuma além das da DIR-80 (mudança na rotina vale a partir de amanhã; a rotina só é "própria" quando ela — ou agora também o admin — escreveu nela).

**Prova:** suíte 2356/2356 (8 testes novos em `tests/rotinaPermanenteAdmin.test.mjs`, fonte-comparando o componente), lint limpo, `npm run build` sem erro.

**Status:** EM VIGOR — mergeado no `main` (PR #337), autorizado pelo dono a publicar fora da janela de deploy padrão.

---

## DIR-139 — as 3 colunas fantasmas: `licensee_id`/`anchor_id`/`owner_id` nunca existiram em `catalog_sales`, e isso zerava vendas de licenciado/PDV em 10 telas

**Emitida por:** auditoria própria (11/09/2026), validando a DIR-138 contra o schema real de produção antes de declarar o "cirúrgico" pronto, e confirmada ao vivo pelo dono reportando `Licensing?tab=catalogo&catalogTab=catalogo-crm` "zerado" pros números da equipe.

**Achado:** o conceito "o dono de uma venda pode estar em 4 colunas" (`seller_id`, `licensee_id`, `anchor_id`, `owner_id`) nunca foi conferido contra o banco. Consulta direta ao schema de produção (`information_schema.columns`) mostra que `catalog_sales` só tem **`seller_id`** (quem vendeu) e **`operator_id`** (quem operou a venda de balcão/PDV, ver `api/_lib/pdvSettle.js`) — as outras 3 colunas nunca existiram. Efeito, dependendo de como cada tela usava a lista:
- Consultas `.select()`/`.or()` direto no Supabase (`CrmMetodo.jsx`, `XGame.jsx`, `PainelCorporativo.jsx`, `QuadroGeralAbas.jsx`, `XGameVisaoExecutiva.jsx`) **quebravam com erro** ("column does not exist") — o painel pessoal já tratava isso (`setVendasCiclo(null)` → proxy de tarefas), mas o ranking do time **não tratava**: um erro de rede/schema zerava `vendasReais` de TODO MUNDO, não só de quem realmente não vendeu.
- Filtros client-side sobre dado já carregado (`CrmClientesTab.jsx`, `LicenseeOrders.jsx`, `habitosDoTime.js`) não quebravam, mas as 3 colunas fantasmas eram sempre `undefined` — um no-op silencioso que zerava, sem erro nenhum, os números de quem vende só como `operator_id` (a venda de balcão/PDV): licenciados e vendedores de loja física viam o time deles "sem nenhuma venda", mesmo com venda real no banco.

**O que entra:**
1. `DONOS_DA_VENDA` (`src/lib/vendasDoCiclo.js`) corrigido para `['seller_id', 'operator_id']` — as colunas reais.
2. `filtroOrDonoDaVenda(id)` (nova, `vendasDoCiclo.js`) — a cláusula `.or()` num lugar só, pra nunca mais um site novo reinventar a lista de colunas (foi assim que 8 arquivos diferentes acabaram citando 3 colunas que não existem).
3. Corrigidos os 10 pontos de uso: `XGameVisaoExecutiva.jsx`, `CrmMetodo.jsx`, `XGame.jsx`, `PainelCorporativo.jsx` (2×), `QuadroGeralAbas.jsx`, `PerformanceEquipe.jsx`, `CrmClientesTab.jsx`, `habitosDoTime.js`, `LicenseeOrders.jsx`.
4. **Fail-safe no ranking:** se a consulta de vendas falhar de verdade (rede, RLS, schema), `vendasReais` agora vira `undefined` pra TODO MUNDO — reativando o proxy de tarefas do `tokenDoCiclo`, igual ao painel pessoal — em vez de `0` (que antes fingia "confirmado, zero vendas" mesmo com a consulta quebrada).
5. `api/functions/hardDeleteUser.js` — a trava de segurança "existem vendas atribuídas a este cadastro" checava `licensee_id` (nunca disparava); agora checa `seller_id`/`operator_id`.

**Achado à parte, NÃO corrigido nesta rodada** (fora do escopo desta auditoria, mexe em checkout/pagamento — precisa de validação própria antes de tocar): `api/functions/finalizeSellerOrder.js` grava `licensee_id`/`licensee_name` num INSERT direto (`fetch` cru pro PostgREST) em `catalog_sales` — como essas colunas não existem, todo INSERT desse endpoint (finalizar compra de adesão de vendedor usando saldo) deve estar falhando agora mesmo em produção. `src/pages/Cart.jsx` grava os mesmos campos, mas via `plataforma.entities.CatalogSale` (a camada de compatibilidade Base44/Supabase) — não confirmado se essa camada tolera campos desconhecidos ou também falha. Recomendo o dono confirmar se "virar vendedor" está funcionando em produção antes de eu mexer nesse fluxo.

**Prova:** suíte 2198/2198 (3 testes atualizados, 1 novo — `filtroOrDonoDaVenda`), lint limpo nos arquivos tocados, `npm run build` sem erro. Schema real conferido direto em produção via SQL (`information_schema.columns`, projeto `gezvviyegtxytnwjkrjv`).

---

## DIR-138 — um número real em todo lugar: ADM e Visão Executiva contavam times diferentes, e o ranking não via as vendas reais da pessoa

**Emitida por:** dono (10/09/2026), comparando os prints do ADM X-Game e da Visão Executiva lado a lado: *"os números não batem... eu preciso ter o número perfeito, e ele precisa estar aparecendo em todos os lugares."* Depois, olhando o pódio em produção: *"quem está dando como primeiro no Ranking está aparecendo como ouro, porém no seu pessoal está como [Platina]... isso não pode ter erro, isso precisa ser cirúrgico."*

**Achado 1 — duas populações diferentes chamadas de "o time":** o ADM X-Game (`XPerformanceGestao.jsx`) contava só o time corporativo (hierarquia do painel de controle, Sócio Executivo→Embaixador — 12 pessoas). A Visão Executiva contava todo mundo com registro no jogo, **sem nem filtrar quem está ativo** — podendo incluir gente que já saiu. Nenhuma das duas era "quem vota" — a régua que o dono escolheu: *"todos que estão de fato recebendo voto, esses de fato estão atuando na operação ativa."*

**Achado 2 — "hoje" vinha de uma fotografia atrasada:** a Visão Executiva lia tarefas/reuniões de hoje de `xgame_diario`, um retrato só gravado quando a própria pessoa abre a tela dela — atrasado por natureza. O ADM já lia ao vivo. Resultado: números diferentes pro mesmo "hoje", mesmo quando a população batesse.

**Achado 3 — o bug que o dono viu no pódio:** o ranking (Visão Executiva) nunca buscava as vendas reais da loja de cada pessoa pro cálculo da moeda — caía num substituto manual (contagem de tarefa "[venda]"). O painel pessoal (Compromisso, /XGame) sempre buscou. Resultado: a Liga de alguém no pódio podia divergir da Liga que a própria pessoa via no painel dela — exatamente o que o dono flagrou ao vivo.

**O que entra:**
1. `participantesVotaveis()` (nova, `xgame.js`) — a população oficial de "o time" em qualquer número agregado: ativo no jogo E votável no MvM (mesma régua de `podeSerVotado`, já usada pra montar a lista de colegas). Usada agora no ADM (resumo do dia) e na Visão Executiva (resumo do dia + ranking/pódio/tabela inteiros).
2. `resumoTimeHoje()` (nova, `xgame.js`) — tarefas/reuniões de hoje, ao vivo, a mesma função pura chamada pelas duas telas — sem duas cópias que podem desalinhar de novo.
3. A Visão Executiva agora busca tarefas de hoje **ao vivo** (`metodo_tarefas`) pra população oficial, em vez de só ler `xgame_diario`.
4. `vendasPorPessoa()` (`src/lib/vendasDoCiclo.js`) — busca `catalog_sales` + `captacao_oportunidades` em lote pro time inteiro (a mesma conta do painel pessoal, uma query só) e passa `vendasReais` pro `tokenDoCiclo()` do ranking — a Liga do pódio agora bate com a Liga do painel pessoal.
5. **Ranking do Dia compartilhável** (`/RankingXGame`, nova página) — pódio 1º/2º/3º + a lista do resto, sempre com os números corrigidos e ao vivo (a mesma `XGameVisaoExecutiva`, sem segunda fonte de verdade). Botão "compartilhar" no pódio gera um texto pronto pro WhatsApp (pódio do ciclo + o dia de hoje + o link).
6. **Clicar numa linha do ranking abre o detalhe da moeda** — a mesma moeda em fatias de "Sua posição" mais os dois portões (caráter/MvM e meta de vendas) escritos por extenso, com o número exato que decidiu cada um — pra qualquer divergência ficar auditável na hora, sem precisar confiar cego no resultado final.

**Prova:** suíte 1986/1986 (12 testes novos: população oficial, resumo ao vivo, texto do WhatsApp, fiação do detalhe da moeda), lint limpo, `npm run build` sem erro, 2 provas em navegador real (Playwright): o pódio renderiza sem erro de JS, e clicar numa linha abre e fecha o detalhe da moeda com os dois portões visíveis.

---

## DIR-137 — auditoria noturna (parte 3): o X-Pay recuperado no fim de semana não entra mais em dobro contra a pessoa no painel do time

**Emitida por:** dono (09/09/2026), autorização de auditoria autônoma da madrugada (mesma DIR-135/136).

**Achado (dinheiro real, painel executivo) — `XGameVisaoExecutiva.jsx`:** a recuperação de tarefa perdida no fim de semana grava `xpay_recuperado` no dia (sem reescrever o `xpay_perdido` original — decisão certa, é histórico). Mas a soma da Visão Executiva contava os dois lados sem cruzar: `r.xpay` já soma `xpay_ganho + xpay_recuperado` (o dinheiro que a pessoa realmente tem agora), e `r.perdido` continuava somando o `xpay_perdido` cru, sem descontar o que foi recuperado — a mesma tarefa contava como ganha E como perdida ao mesmo tempo. O card "X-Pay perdidos por atraso" no painel do dono mostrava um valor inflado pra quem já tinha recuperado.

**Fix:** `r.perdido` agora desconta `xpay_recuperado`, com piso em zero (`Math.max(0, perdido - recuperado)`).

**Prova:** suíte 1974/1974 (1 teste novo, `tests/xpayPerdidoRecuperado.test.mjs`), lint limpo, `npm run build` sem erro.

---

## DIR-136 — auditoria noturna (parte 2): mais três resíduos do "fuso do aparelho" corrigidos, e o validador de comprovações ganha o tempo que precisa pra pensar

**Emitida por:** dono (09/09/2026), autorização de auditoria autônoma da madrugada (mesma DIR-135).

**Achados (mesma classe de bug já corrigida em DIR-129/134 — código lendo hora/data do APARELHO em vez de forçar Brasília):**
1. `src/pages/XGame.jsx` — a saudação do cabeçalho ("Bom dia/tarde/noite") ainda usava `new Date().getHours()` mesmo já existindo `agoraMin` (o relógio do jogo, Brasília forçada) calculado logo acima. Trocado por `agoraMin`.
2. `src/components/licensing/CentralVendas/XGameJornada.jsx` — `saudacao()` caía pra `new Date().getHours()` quando `min` não vinha (acontece ao olhar um dia que não é hoje — `CrmMetodo.jsx` passa `agoraMin={null}` nesse caso). Trocado o fallback por `minutosBrasilia()`.
3. `src/lib/pronto.js` — `prazoDe()`/`rotuloDoPrazo()` (o "pronto até HH:mm" e a decisão de atraso) montavam e liam a hora com `Date` local do aparelho (`T12:00:00` sem fuso, `.setHours`, `.getHours`/`.getDate`). Corrigido: `prazoDe()` monta o horário com offset explícito `-03:00` (Brasil não tem mais horário de verão desde 2019 — `America/Sao_Paulo` é sempre UTC-3); `rotuloDoPrazo()` lê de volta com `Intl.DateTimeFormat` forçando `America/Sao_Paulo`, igual `dataISO()`.
4. `src/lib/filaComprovacoes.js` — `rotuloDataAmigavel()` tinha `hoje = new Date()` como default (usado nos dois lugares reais, `XGameAdmin.jsx` e `Comprovacoes.jsx`, sem passar `hoje`) — perto da virada do dia, um aparelho fora de Brasília rotularia "Hoje"/"Ontem" errado. Default trocado pra `dataISO()`.
5. `api/functions/xgameValidarPrint.js` — chamada DIRETO do front em três lugares (`CrmMetodo.jsx`, `XGameAdmin.jsx` e o próprio Ritual do Amanhecer), sem `export const config = { maxDuration: 60 }` (que `xgameProvaValidador.js`, o único outro caminho até essa função, já tinha). Sem isso, o timeout padrão da Vercel podia cortar uma análise de imagem com raciocínio no meio — exatamente o tipo de falha intermitente que se parece com "a pessoa não conseguiu comprovar".

**Prova:** suíte 1973/1973 (2 testes de `prazoDe`/`estadoDoPronto`/`filaDoPronto` reescritos pra travar Brasília em vez do fuso do runner de CI — que roda em UTC — e 1 teste novo pro `maxDuration`), lint limpo, `npm run build` sem erro.

---

## DIR-135 — auditoria noturna: o dinheiro "em jogo" não some mais quando o dia zera, e a demanda distribuída na mentoria completa também cria o card do quadro e o sino

**Emitida por:** dono (09/09/2026), indo dormir: *"eu vou deixar você rodando aí, pra você me trazer um relatório diligente... de toda a gamificação, que está bom, que não está, o que está quebrado... não pode passar nada em branco, nada nada nada nada."* — autorização explícita pra auditoria e correção autônoma durante a madrugada.

**Achado 1 (X-Pay, dinheiro real) — `resumoDoDia` em `src/lib/xgame.js`:** quando o dia zera (`diaZerado`, por não votar ou atraso do pronto), o valor que já era `ganho` corretamente virava `perdido` (registrado, não some). Mas o valor que ainda estava **em jogo** (tarefa pendente, nem feita nem com prazo estourado no momento do corte) era descartado com `xpay.emJogo = 0` — o dinheiro simplesmente desaparecia da conta em vez de virar prejuízo registrado, igual o `ganho` já fazia. `xpay_possivel` (usado em relatórios/telas de equipe) ficava subestimado nesses dias.
**Fix:** `xpay.perdido` agora soma `ganho + perdido + emJogo` antes de zerar os três — o mesmo padrão que já existia pro `ganho`, agora completo.

**Achado 2 (distribuição de tarefa) — `DistribuirTarefa.jsx`:** o caminho "distribuir como mentoria completa" (o que o dono mais usa, feedback ao vivo da reunião) tinha um `return` antes de chegar no trecho que cria o card do Quadro e o aviso (sino, `xgame_mensagens`) — só a tarefa na Jornada nascia; quadro e sino ficavam vazios, exatamente o sintoma relatado ("mandei essas duas notificações aí, a pessoa ficou com dificuldade de receber, só apareceu no quadro"). Além disso, o toast de sucesso mentia dizendo "jornada, quadro e sino avisados" mesmo quando a gravação do quadro ou do aviso falhava silenciosamente no banco.
**Fix:** extraído `criarQuadroEAviso(tarefaId, titulo, prazo)` — chamado nos DOIS caminhos (distribuição normal e mentoria completa); cada falha (quadro ou aviso) gera seu próprio `toast.error` específico, e o toast final só promete "jornada, quadro e sino avisados" quando os dois realmente gravaram.

**Prova:** suíte 1972/1972 (1 teste novo em `tests/xgame.test.mjs` — dia zerado com tarefa pendente, prova que `emJogo` não some; 2 testes reescritos + 1 novo em `tests/distribuirTarefaTresLugares.test.mjs` — trava `criarQuadroEAviso` e o caminho da mentoria chamando ele), lint limpo, `npm run build` sem erro.

---

## DIR-134 — o relógio do jogo (não só a data) agora é sempre Brasília, e o ritual explica a si mesmo antes de começar

**Emitida por:** dono (09/09/2026), pedindo uma auditoria noturna: *"vamos fazer uma análise no ritual que algumas pessoas reclamaram, falaram que não conseguiram... vê se a gente melhora a comunicação no ritual... vê se a gente cria um aviso antes de começar o ritual, dez minutos pra quando ela abrir, explicar como funciona."*

**Achado no banco (a causa real das reclamações):** três pessoas (Ribeiro, Iara Figueiredo, Elenice Lima) tiveram o ritual reprovado hoje às 05h17–05h25 de Brasília com o motivo `"Ritual perdido — passou do prazo de 5h15"` — um corte que **já tinha sido corrigido pra 5h30 minutos antes**, na DIR-125. A causa raiz não era o limiar em si (esse já estava certo no código): era `agoraMin` — o relógio que o jogo inteiro usa (janela do ritual, AGORA/ATRASADO/PERDIDO de toda tarefa, janela de votação do MvM) — que vinha de `new Date().getHours()*60 + .getMinutes()`, hora **local do aparelho**, não de Brasília forçada. É o MESMO bug da DIR-129 (`dataISO`), só que na hora do dia em vez da data — um aparelho com o relógio alguns minutos errado (fuso trocado, sincronização fraca) julgava a janela do jeito errado.

**O que entra:**
1. `minutosBrasilia(d)` nova em `src/lib/xgame.js` — minutos desde a meia-noite, sempre em `America/Sao_Paulo` via `Intl.DateTimeFormat`, o mesmo padrão de `dataISO()`. Substitui `d.getHours()*60+d.getMinutes()` nos três lugares que definiam o relógio do jogo: `CrmMetodo.jsx` (`agoraMin`, o Compromisso inteiro) e `XGame.jsx` (`agoraMin`, a janela de votação do MvM).
2. **O aviso "como funciona o ritual"** (`deveAvisarRitual()`, `RITUAL_AVISO_ANTES_MIN = 10`) — aparece no Compromisso dos 10 minutos antes da abertura (04h30) até o fechamento (05h30), só pra quem ainda não fez o ritual hoje. Explica em uma tela só, ANTES de qualquer clique: os 3 passos (gratidão falada/escrita, vídeo de visualização **em casa**, a ação do dia), que sem vídeo o ritual conclui igual (só sem o selo brilhante), e o prazo exato depois do qual não tem mais segunda chance hoje.

**Verificado, não é achado novo:** o sistema de auto-atualização do app (`useAppVersion.js`/`AtualizacaoDisponivel.jsx`) já detecta deploy novo e troca de versão sozinho (com contagem visível, dentro de 4-10s) sempre que o app está aberto ou volta de segundo plano — os dois fixes acima devem alcançar quem abrir o app antes do ritual de amanhã, mesmo sem fechar e abrir de novo.

**Prova:** suíte 1967/1967 (11 testes novos: `minutosBrasilia()` na virada exata de Brasília e no horário real das três reprovações de hoje; `deveAvisarRitual()` nos limites exatos dos 10min/janela; a fiação do aviso em `CrmMetodo.jsx`), lint limpo, `npm run build` sem erro.

---

## DIR-133 — o Kanban horizontal não vaza mais o arrasto pra página inteira no celular

**Emitida por:** dono (09/09/2026), testando no celular: *"Fui em contatos agora, a esteira onde aparece uma esteira está vazando no celular. Então vamos ajustar pra aparecer no tablet, no celular e no computador, sem vazar nada, né? Em todo o aplicativo, principalmente na página aí da Top College."*

**Causa:** os dois Kanbans horizontais do CRM (Esteira de Captação, 8 estágios; Funil do CRM, várias colunas) já usam `overflow-x-auto` — rolagem própria, correta. Mas no Safari/Chrome do celular, ao arrastar até o fim de um carrossel horizontal, o gesto "vaza" e continua arrastando a PÁGINA inteira de lado (scroll chaining/rubber-band) — mesmo com o `overflow-x:hidden` do `html`/`body` já existente, porque isso acontece DEPOIS que o toque já começou dentro do carrossel.

**O que entra:**
1. `overscroll-behavior-x: contain` em `src/index.css`, tanto no `html`/`body` quanto em **qualquer** elemento com `.overflow-x-auto`/`.overflow-x-scroll` — trava o arrasto dentro do próprio carrossel, sem vazar pro resto da tela, em **todo o app**, sem precisar caçar tela por tela. Não muda nenhum layout — só a física do toque.
2. Uma dica "arraste pra ver os outros estágios/colunas" (só no celular, `sm:hidden`) acima dos dois Kanbans — pra quem só usa touch não achar que travou.

**Fora do escopo:** nenhuma mudança de layout, cor ou estrutura — só a física do toque (scroll chaining) e uma dica de texto.

**Prova:** suíte 1958/1958 (4 testes novos em `tests/mobileOverflowKanban.test.mjs`), lint limpo, `npm run build` sem erro.

---

## DIR-132 — o botão de compartilhar no WhatsApp volta na Fila do Pronto, com texto pronto

**Emitida por:** dono (09/09/2026), olhando a Fila do Pronto: *"tinha um botão WhatsApp aqui, eu acho que a gente tirou porque a gente ia mandar mensagem mais personalizada, mais bonita... só um texto mesmo, mas um texto bem bonito... quero botar isso aqui no WhatsApp pra compartilhar também."*

**O que entra:**
1. `textoCompartilharPronto(t, nomeDaPessoa)` (`src/lib/pronto.js`) — um texto pronto, com identidade (🎯 X-GAME), o título da tarefa, o prazo (`rotuloDoPrazo`) e um convite — é lembrete gentil, não cobrança (o tom sério de "atrasou" continua só no "avisar" já existente).
2. Botão **compartilhar** (`XPerformanceGestao.jsx`, `MessageCircle`) nas tarefas em `aguardando o pronto` da Fila do Pronto — abre o WhatsApp (`wa.me`) já com o texto pronto pro telefone cadastrado da pessoa; sem telefone, avisa em vez de abrir link quebrado.

**Fora do escopo, por ora:** imagem/banner junto do texto (o dono pediu pra "pesar" — decidido: só texto agora, mais simples e não depende de gerar/hospedar imagem; pode entrar depois se pedir). O botão "avisar" da tarefa atrasada (cobrança, mais sério) não mudou.

**Prova:** suíte 1955/1955 (5 testes novos: `pronto.test.mjs` trava o texto — nome, título, prazo, tom gentil; `compartilharPronto.test.mjs` trava a fiação do botão), lint limpo, `npm run build` sem erro.

---

## DIR-131 — menu suspenso de data + galera lado a lado (grid) na fila de comprovações

**Emitida por:** dono (09/09/2026): *"Vamos botar um menu suspenso pra escolher qual é a data do mês. Hoje, ontem... E ver se a gente consegue colocar ao invés de um embaixo do outro, colocar a galera lateral pra ficar mais organizado... pro gestor não ficar forçando a mente."*

**O que entra (nos dois painéis: `Comprovacoes.jsx` e `XGameAdmin.jsx`):**
1. `rotuloDataAmigavel(data, hoje)` nova em `src/lib/filaComprovacoes.js` — "Hoje"/"Ontem" pras duas datas mais importantes, "dd/mm · dia da semana" (o rótulo de sempre) pro resto.
2. Um `<select>` com as datas presentes na fila carregada (rótulo amigável) + a opção "todas as datas". É um filtro A MAIS — soma com a busca de texto já existente (DIR-124/126), nunca a substitui.
3. As pessoas dentro de cada dia, que ficavam empilhadas (uma embaixo da outra), agora aparecem lado a lado num grid responsivo (`grid-cols-1` no celular, 2 colunas a partir de `sm`, 3 a partir de `xl`), cada uma como um cartão com borda.

**Fora do escopo:** nenhuma mudança na busca por texto, no agrupamento por dia em si, na aprovação/reprovação ou nos filtros de status — só o filtro de data a mais e o layout em grid.

**Prova:** suíte 1935/1935 (6 testes novos em `tests/filaComprovacoes.test.mjs`), lint limpo, `npm run build` sem erro.

---

## DIR-130 — a demanda distribuída entra sozinha em três lugares, e ganha um sino que não deixa passar batido

**Emitida por:** dono (09/09/2026): *"eu preciso que o envio de tarefa chegue na jornada, automático... ela está entrando no quadro, aí tem a opção de botar lá no quadro e na minha lista, né? Já estava entrando automático na jornada e não entrou, precisa entrar. No quadro, tá? Na lista e na jornada. Tudo automático... está faltando um sininho de notificação... eu mandei essas duas notificações aí, a pessoa ficou com dificuldade de receber, só apareceu no quadro."*

**Achado:** `DistribuirTarefa.jsx` tinha um seletor "destino" (lista / quadro / os dois) — só com "quadro" a demanda nunca entrava na Jornada; só com "lista" nunca virava card do Quadro. E a única forma de a pessoa "ver" que recebeu algo era abrir o Quadro ou a aba dobrada "Mensagem pro CEO" por conta própria — nada avisava proativamente.

**O que entra:**
1. **Escolha de destino removida** — toda tarefa distribuída agora SEMPRE grava nos três: `metodo_tarefas` (a Jornada, `origem: 'xperf'`), `metodo_quadro` (o card, ligado pelo id da tarefa — cai sozinho na primeira Lista dele, mecanismo já existente do `QuadroCompromisso.jsx`) e `xgame_mensagens` (`tipo: 'demanda'`, o aviso que acende o sino).
2. **Horário vira opcional/flexível** (`"ela não tem que entrar na hora que eu coloquei... deixando a opção da pessoa escolher o melhor horário pra ela fazer"`): o campo "começar às" virou "horário (opcional)"; sem horário, a tarefa entra flexível na Jornada. A pessoa já podia editar hora/título de qualquer tarefa do dia inline (✏️, DIR-80) — copy nova deixa isso explícito no formulário do gestor.
3. **Ícone que não fica genérico** (`"gerando um ícone compatível, sem deixar feio a jornada"`): `seloDa()` (`XGameJornada.jsx`) ganha um terceiro parâmetro (`origem`) — quando o título de uma demanda não bate com nenhum selo nem família de Hábito, em vez da ⭐ genérica de qualquer coisa sem categoria, ganha um selo próprio (`SELO_DEMANDA`, ícone `Send`, verde da marca).
4. **O sino** (`SinoNotificacoes.jsx`, novo componente, montado no topo do Compromisso) — reaproveita `xgame_mensagens` (DIR-106/107), a MESMA rota server-side (`xgameMensagensListar`) e as mesmas funções puras (`mensagensXgame.js`) do "Mensagem pro CEO". Badge de não lidas; um **banner fixo** (como um alerta de venda) mostra a mensagem mais antiga ainda não vista — fechar o banner NUNCA marca como lida (só sai da tela; continua no sino até a pessoa abrir de verdade), e o botão de fechar fica travado por 10 segundos (`SEGUNDOS_ANTES_DE_FECHAR`, `src/lib/notificacoesXgame.js`) — *"não pode ter certeza que ela viu"*. Responder funciona por dentro, no banner e no painel do sino (mesmo padrão "responder por dentro" do DIR-107) — a ida e volta pedida.

**Fora do escopo:** nenhuma mudança na fórmula de valor/peso da tarefa, na Fila do Pronto (conferir/devolver) ou na aba "Mensagem pro CEO" em si — só quem gera a demanda (`DistribuirTarefa`) e quem avisa que ela chegou (`SinoNotificacoes`, novo). O sino está montado só na tela do Compromisso (a que a pessoa abre todo dia) — não em toda tela do app.

**Prova:** suíte 1950/1950 (14 testes novos: `notificacoesXgame.test.mjs` trava a escolha da mensagem certa pro banner e os 10 segundos; `distribuirTarefaTresLugares.test.mjs` trava que a escolha de destino sumiu e que as três gravações sempre acontecem juntas; `xgameJornadaSeloDemanda.test.mjs` trava o selo próprio da demanda), lint limpo, `npm run build` sem erro.

---

## DIR-129 — "hoje" agora é sempre Brasília, não importa o fuso do aparelho

**Emitida por:** dono (09/09/2026), voltando no mesmo assunto da DIR-127 com um caso concreto: *"o Emanuel leu o livro no dia oito, vinte e uma e trinta, e contou na comprovação como dia nove... tem que ser o horário de Brasília, não pode ter essa confusão."*

**O que era:** `dataISO()` (`src/lib/xgame.js`) — a função que define "hoje" em TODO o Método/X-Game (`hojeStr()`, o dia mostrado no Compromisso, a data gravada em cada tarefa/comprovação/placar, em 13 arquivos) — usava `getFullYear/getMonth/getDate`, ou seja, hora **local do aparelho**, não de Brasília. Isso já tinha corrigido um bug ANTERIOR (usar `toISOString()`, hora UTC — `tests/xgameFusoHorario.test.mjs`), mas só por acaso, assumindo que o celular de quem usa está sempre certo no fuso de Brasília.

**Achado no banco (a prova de que não era suposição):** a leitura do Emannuel Alves de Lima ("Leitura leve + descanso"), feita de verdade às 21h11 de Brasília do dia 7 (confirmado pelos timestamps reais em UTC, `created_date`/`comprovacao.quando` — não dependem de fuso nenhum), nasceu com `data: '2026-09-09'` — dois dias à frente. O aparelho dele, naquele momento, não estava contando Brasília certo.

**O que entra:**
1. `dataISO()` passa a forçar `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })` sempre — do mesmo jeito que o cron do servidor (`hojeBrasil()`, `gerarJornadaDoDia.js`) já fazia. Não depende mais do fuso/relógio de ninguém.
2. `mudarDia()` (as setas ← HOJE → do Compromisso, `CrmMetodo.jsx`) trocou de "monta Date local e reconverte por `toISOString()`" pra `somarDiasISO()` (`xgame.js`, nova função pura) — conta de calendário (ano/mês/dia), nunca conversão de horário.
3. **Dado corrigido no banco** (a leitura do Emannuel): a comprovação (texto, foto, veredito da IA, `feito: true`) foi movida da linha errada (dia 9) pra linha certa que já existia vazia (dia 7); a linha fantasma do dia 9 foi apagada, liberando o lugar pra leitura de HOJE à noite nascer certa.

**Auditoria feita, nada mais pra corrigir agora:** varri o banco inteiro por lotes de tarefas cujo `data` destoa 2+ dias do dia real (Brasília) do `created_date`. O ÚNICO caso isolado (uma comprovação real presa no dia errado) era o do Emannuel, já corrigido. Achado à parte, sem dano: a conta do "paim" (`4380f43a...`, já conhecida da DIR-122) tem 8 dias de rotina pré-gerados à frente (dias 7 a 14) numa sequência rápida de ~40s — parecem geração automática por navegação (setas de dia), sem nenhuma comprovação anexada, sem risco de X-Pay. Não mexido agora.

**Prova:** suíte 1931/1931 (5 testes novos travando `dataISO()`/`somarDiasISO()` na virada exata das 21h/00h de Brasília e a fonte de `mudarDia`), lint limpo, `npm run build` sem erro. Correção de dado conferida direto no banco de produção.

---

## DIR-128 — a fila de comprovações separa cada dia por pessoa, nos dois painéis

**Emitida por:** dono (09/09/2026), olhando o dia de hoje com várias pessoas misturadas na mesma lista: *"eu quero já separado por datas e por nomes, cara. Data de hoje, nome das pessoas que estão participando."*

**O que entra:**
1. `agruparComprovacoesPorPessoa` nova em `src/lib/filaComprovacoes.js` — dentro de UM grupo de dia (saída de `agruparComprovacoesPorData`), junta quem é a mesma pessoa, preservando a ordem de chegada (mesma regra da função de data: nunca reordena por conta própria).
2. Aplicada nos DOIS lugares que já tinham o agrupamento por dia (DIR-124/126): `XGameAdmin.jsx` (aba Comprovações) e `Comprovacoes.jsx` (a fila geral que o dono vê todo dia, logo após a Fila do Pronto). Em cada dia, um subcabeçalho por pessoa ("👤 Nome · N"), com as comprovações dela agrupadas ali embaixo — o nome sai da linha de cada item (já está no subcabeçalho), deixando a lista mais enxuta.
3. Em `Comprovacoes.jsx`, o subagrupamento só entra na fila GERAL (`!pessoaId`) — a fila de UMA pessoa já não repetia o nome por linha, então não ganha subcabeçalho (seria repetir o óbvio).

**Fora do escopo:** nenhuma mudança na busca por nome/data (DIR-124/126), na aprovação/reprovação, ou nos filtros de status — só um segundo nível de agrupamento visual.

**Prova:** suíte 1931/1931 (4 testes novos em `tests/filaComprovacoes.test.mjs`: a função pura + a fiação nos dois componentes), lint limpo, `npm run build` sem erro.

---

## DIR-127 — a Rotina Perfeita nunca mais duplica o dia inteiro

**Emitida por:** dono (09/09/2026), vendo a fila de comprovações "bagunçada": *"isso é muito sério, muito sério, coloca isso aí, coloca uma trava pra tu não errar isso."*

**O que era:** o cron `gerarJornadaDoDia` (madrugada) e a auto-repetição do cliente (CrmMetodo.jsx, `useEffect` que repete a rotina sozinha) podiam gerar a rotina INTEIRA do mesmo dia pra mesma pessoa antes de qualquer um dos dois marcar `rotina_gerada_em` — uma corrida que a trava da DIR-80 (`diasGerados`, só protege a MESMA aba) nunca cobria. Achado no banco: **97 linhas duplicadas**, praticamente o dia inteiro de várias pessoas em dobro; **10 delas já com comprovação dupla** — a pessoa, vendo a mesma tarefa duas vezes na tela, comprovou as duas, e o X-Pay contava a mesma tarefa duas vezes.

**O que entra:**
1. **Limpeza dos 97 duplicados já existentes** (SQL direto, produção): por grupo (`user_id, data, hora, titulo`), mantida a linha com `feito=true`, comprovação preenchida e `created_date` mais antigo — as sobras apagadas.
2. **`UNIQUE(user_id, data, hora, titulo)`** em `metodo_tarefas` — a trava de verdade agora é o banco, não mais um `ref` de sessão. Aplicada direto em produção (o pipeline automático de migração está quebrado, achado de sessão anterior) e registrada em `supabase/migrations/20260909210000_metodo_tarefas_unique_user_data_hora_titulo.sql`.
3. Os **6 lugares** que geram tarefas trocam `insert`/`create` um-a-um por **upsert com `ignoreDuplicates`** (cliente: `criarTarefasSemDuplicar`, `CrmMetodo.jsx`, usado nos 3 pontos — gerar, auto-repetir, regerar; `XGameAdmin.jsx`; `XPerformanceGestao.jsx`) ou `Prefer: resolution=ignore-duplicates` + `on_conflict` na URL (servidor: `gerarJornadaDoDia.js`, o cron) — a duplicata é ignorada em silêncio, nunca criada e nunca quebra com erro.

**Fora do escopo:** nenhum reembolso/ajuste retroativo de X-Pay — o ciclo ainda não fechou (dia 3 de 22), o pagamento acontece no fechamento, e a limpeza já corrigiu o dado antes de qualquer conta final usar ele.

**Prova:** suíte 1897/1897 (4 testes novos em `tests/geracaoTarefasSemDuplicar.test.mjs` travando os 6 pontos de geração), lint limpo, `npm run build` sem erro. Migração aplicada e conferida direto no banco (zero grupos duplicados restantes).

---

## DIR-126 — a fila de Comprovações que o dono vê TODO dia ganha a mesma organização do ADM

**Emitida por:** dono (09/09/2026): *"eu quero ver o nome das pessoas, data, por caixinha, está muito bagunçado"* — e, numa mensagem anterior, sobre a fila geral que aparece logo depois da Fila do Pronto: *"ela nem me deu a prévia... se for vídeo, se for áudio, tem que tudo transcrever e mostrar ali."*

**Achado:** a DIR-124 (busca + agrupamento por data) só tinha entrado em `XGameAdmin.jsx` — mas a tela que o dono realmente abre todo dia é `Comprovacoes.jsx` (`ComprovacoesPainel`), embutida direto na página principal (logo após "A Fila do Pronto") e na aba "Comprovações" do Quadro Geral. Essa tela nunca recebeu a atualização.

**O que entra (`Comprovacoes.jsx`):**
1. Mesma busca única (nome ou data) e agrupamento por dia da DIR-124, reaproveitando as MESMAS funções puras (`src/lib/filaComprovacoes.js`) — uma fonte só.
2. **Selo vazio do Ritual do Amanhecer corrigido**: `ROTULO`/`COR` não tinham entrada pra `aprovada_ritual` — o badge desenhava um retângulo sem nada dentro. Agora mostra "ritual aprovado".
3. **O texto entregue aparece na fila** (`c.entrega` — a gratidão escrita OU falada e já transcrita, o resumo da leitura): antes só o veredito da IA aparecia, nunca o que a pessoa efetivamente disse. Mesma correção em `XGameAdmin.jsx`.
4. **Comunicação clara de como o ritual chegou** (achado em paralelo, mesmo pedido do dono): quando a gratidão veio em ÁUDIO, a linha avisa a duração sem tocar o áudio (privacidade — é voz de quem gravou, nunca vira um botão de play); quando não teve nem vídeo nem áudio, a linha diz isso explicitamente em vez de ficar muda.
5. Copy do contador de pendências atualizada pra refletir a realidade pós-DIR-125: "a IA decide tudo sozinha" em vez de "a segunda análise é sua".

**Prova:** lint limpo, `npm run build` sem erro (mudança de UI, sem lógica nova além da já testada na DIR-124/DIR-125).

---

## DIR-125 — o Ritual do Amanhecer nunca mais cai pro gestor decidir + janela sobe pra 30min

**Emitida por:** dono (09/09/2026), vendo comprovações presas em "em análise": *"a Yata tem que aprovar tudo... vai reprovar automático, entendeu? Só em casos impossíveis, mas não precisa"* — e, na sequência, sobre o prazo: *"se o cara acordou e teve a intenção de fazer, a gente não pode penalizar... quinze minutos final é pouco tempo, vamos deixar trinta."*

**O que era:** o Ritual do Amanhecer (`concluirRitual`, `CrmMetodo.jsx`) era a ÚLTIMA rota do X-GAME que ainda caía pro gestor decidir — ambiente em dúvida (nem claramente errado, nem claramente em casa) virava `status: 'em_analise'`, esperando alguém aprovar/reprovar na mão. Todo o resto do X-GAME já resolve sozinho desde a DIR-89 ("intervenção humana zero").

**O que entra:**
1. Ambiente em dúvida agora cai na MESMA rota automática do ambiente claramente errado — **reprova sozinha**, com o motivo pedagógico da própria IA (a pessoa refaz; não é punição definitiva, é uma segunda chance). `emDuvida`/`status: 'em_analise'` removidos do ritual — nunca mais nasce nesse estado.
2. **`RITUAL_FIM_MIN` sobe de 05h15 para 05h30** (`RITUAL_INICIO_MIN`, a abertura antecipada às 4h40, intocada) — trinta minutos a partir do horário oficial da gratidão (05:00), não mais quinze.

**Prova:** suíte 1893/1893 (1 teste travando a régua nova de horário + 1 teste de fonte travando que `em_analise`/`emDuvida` não existem mais no ritual), lint limpo, `npm run build` sem erro.

---

## DIR-124 — a fila de Comprovações do ADM X-GAME agora agrupa por dia e tem busca

**Emitida por:** dono (09/09/2026), olhando a fila crescer: *"eu preciso separar por data, né? Data de comprovação, nome das pessoas, pra ficar mais fácil isso, ainda precisa ter uma busca quando eu fizer buscar mais rápido, tanto a data e tanto o dia."*

**O que entra:**
1. **Busca única** (`XGameAdmin.jsx`, aba Comprovações): uma caixa de texto que acha tanto por NOME (sem acento/maiúscula, ex.: "luciano") quanto por DATA (dd/mm, ex.: "09/09", ou só "09" pro dia) — nunca precisa escolher qual campo buscar.
2. **Agrupada por dia**: a fila (antes uma lista corrida) agora tem um cabeçalho por data ("09/09 · quarta-feira · N comprovações"), com as comprovações daquele dia embaixo — a data some da linha de cada item (já está no cabeçalho do grupo) e vira só nome + hora + título, mais limpo.
3. Lógica pura nova em `src/lib/filaComprovacoes.js` (`comprovacaoBateNaBusca`, `agruparComprovacoesPorData`, `rotuloDataComprovacao`) — testável sem montar a tela, em vez de ficar espalhada dentro do componente.

**Fora do escopo:** nenhuma mudança na aprovação/reprovação em si, nem na IA de validação, nem nos filtros de status já existentes (em análise/aprovada/reprovada) — só a organização visual e a busca.

**Prova:** suíte 1891/1891 (9 testes novos em `tests/filaComprovacoes.test.mjs` cobrindo busca por nome, por data completa, por só o dia, agrupamento preservando ordem, e o rótulo do cabeçalho), lint limpo, `npm run build` sem erro.

---

## DIR-123 — a conta duplicada de "paim" some da lista de "adicionar participante"

**Emitida por:** dono (09/09/2026), depois da unificação da DIR-122: *"mas ele não pode ganhar duas vezes, man??? e eu só escolhi uma conta no painel admin pra participar do game."* Confirmado que não há risco (registro único, zero pagamento em qualquer das duas contas) — mas o login duplicado ("Joao Vitor Paim Pereira", e-mail auto-gerado) continuava existindo, então continuava aparecendo na lista de "adicionar participante" do ADM X-Game, pronto pra ser escolhido de novo por engano. Autorização final: *"sim"*.

**O que entra:** `XGameAdmin.jsx` ganha `IDS_DUPLICADOS_FORA_DO_XGAME` — um Set com o id exato dessa conta — filtrado tanto da lista de candidatos quanto da contagem por grupo, na tela de "adicionar participante". O login em si (`app_users`) não foi tocado — só parou de aparecer como opção pra virar participante do jogo; continua servindo pra o que quer que seja o "concurso" (o e-mail auto-gerado sugere outra funcionalidade, não mexida).

**Fora do escopo:** nenhuma mudança em `xgame_participantes`/`xgame_votos_mvm` (já resolvido na DIR-122) — esta entrada é só a trava pra não recriar o mesmo problema no futuro.

**Prova:** suíte 1882/1882 (1 teste novo em `tests/xgameRecebeVoto.test.mjs` travando a exclusão nas duas listas), lint limpo, `npm run build` sem erro.

---

## DIR-122 — conta duplicada de Joao Vitor Paim Pereira ("paim") unificada na conta pessoal

**Emitida por:** dono (09/09/2026), resposta direta ao achado da DIR-121: *"faz o que precisa ser feito, a pessoal com certeza."*

**O que era:** duas contas para a mesma pessoa. `e90ed56209c71d4bf4dd3bc3` ("Joao Vitor Paim Pereira", e-mail auto-gerado `@concurso.leilaonozap.net`) era a conta OFICIAL do X-Game — cadastrada em `xgame_participantes` (perfil comercial, em mentoria, ativa) e dona dos 70 votos de MvM recebidos neste ciclo (média 7,24) — mas com ZERO linhas em `xgame_diario`. `4380f43a-5722-4633-af1f-d29f163103ef` ("paim", e-mail pessoal `joaovitorpaim06@gmail.com`) é a conta que ele usa de verdade pra trabalhar — 3 dias de `xgame_diario` neste ciclo (180-223 pontos/dia, tarefas comprovadas) — mas sem nenhum voto e fora de `xgame_participantes`. Resultado: a moeda oficial dele nunca via a produção real.

**O que entra (banco, migração manual via SQL — não passou pelo pipeline de migration do repo, é dado, não schema):**
1. `UPDATE xgame_participantes SET user_id = '4380f43a-...' WHERE user_id = 'e90ed562...'` — o registro oficial (perfil comercial, em mentoria, ativo, aceita ser votado) passa a apontar pra conta pessoal. Sem colisão: a conta pessoal não tinha nenhum registro em `xgame_participantes` (`UNIQUE(user_id)`).
2. `UPDATE xgame_votos_mvm SET votado_id = '4380f43a-...' WHERE votado_id = 'e90ed562...'` — os 70 votos recebidos migram junto. Sem colisão: conferido antes que nenhum `(votante_id, data, virtude)` já existia pra `votado_id = 4380f43a` (`UNIQUE(votante_id, votado_id, data, virtude)`), e que ninguém ficaria votando em si mesmo depois da troca.
3. Conferido depois: zero linhas restantes na conta duplicada em `xgame_participantes`/`xgame_votos_mvm`/`xgame_diario`.

**Fora do escopo, achado à parte (aguardando decisão futura, não é a mesma questão):** as DUAS contas também têm histórico PRÓPRIO no Método (`metodo_tarefas`: 40 tarefas na duplicada × 214 na pessoal; `metodo_perfil` e `metodo_quadro`: 1 linha em CADA conta — `metodo_perfil.user_id` tem `UNIQUE`, então mesclar às cegas quebraria). Isso é uma duplicação mais profunda (uso paralelo do app, não só do X-Game) que o dono não pediu pra resolver agora — só o X-Game (moeda/voto) foi migrado. Se um dia isso também precisar unificar, precisa de revisão manual do conteúdo de cada `metodo_perfil`/`metodo_quadro`, não um UPDATE cego.

**Prova:** consultas antes/depois via Supabase MCP confirmando a contagem de linhas migradas e zero sobra na conta duplicada (ver histórico da sessão). Não mexe em código — nenhuma mudança em `src/` ou testes por esta entrada.

---

## DIR-121 — as duas moedas voltam a aparecer quando o Super Admin olha outra pessoa (modoAdmin)

**Emitida por:** dono (09/09/2026), comparando o próprio painel com o "MvM dele" (Quadro Geral → pessoa → aba "MvM dele"): *"eu olhei o meu painel, está aparecendo as duas moedas... só que eu sou superior de mim, eu olho o dos outros... eu olhei de um executivo aqui, não está aparecendo as duas moedas comparativas... tem que aparecer, igual aparece pra mim tem que aparecer no dele."*

**Causa raiz:** a única seção que desenha as duas moedas (`pages/XGame.jsx`) é a `XGameVisaoExecutiva` embutida — e ela SOME inteira quando `modoAdmin` é verdadeiro (`{!modoAdmin && (...)}`, decisão de propósito pra não repetir o ranking do time inteiro na visita do Super Admin). Resultado: em `modoAdmin`, nenhuma das duas moedas aparecia pra ninguém — quebrando a promessa da própria página ("o que se VÊ continua sendo idêntico ao que a pessoa vê ao abrir sozinha").

**O que entra:** dentro de `{modoAdmin && ciclo && (...)}`, `pages/XGame.jsx` volta a desenhar as duas moedas direto — real (`ciclo.componentes`/`ciclo.total`/`ciclo.liga`, o mesmo `ciclo` já calculado pra `userIdForcado`) e o modelo (`moedaModelo`, DIR-120) — sem tocar no modo normal (que continua vindo só da `XGameVisaoExecutiva` embutida, sem duplicar). `tests/moedaPizza.test.mjs` reescrito pra travar essa regra exata: `MoedaPizza` só pode desenhar dentro do gate `modoAdmin`, nunca fora.

**Fora do escopo:** a "Todo mundo" (pódio/tabela do time inteiro) continua escondida em `modoAdmin`, como já era — o dono só pediu as moedas da pessoa sendo olhada, não o ranking geral repetido.

**Achado à parte, aguardando decisão do dono (auditoria pedida na mesma mensagem — "confere, se não tem nenhuma moeda zerada, porque quem somou ponto não pode estar zerado"):** conta duplicada real no banco. "Joao Vitor Paim Pereira" (`e90ed562...`, e-mail auto-gerado `@concurso.leilaonozap.net`) é quem está oficialmente cadastrado em `xgame_participantes` (perfil comercial, em mentoria) e recebeu 70 votos de MvM (média 7,24) neste ciclo — mas tem ZERO linhas em `xgame_diario`. O trabalho de verdade (180 e 223 pontos nos últimos 2 dias, tarefas comprovadas) está gravado sob OUTRA conta, `4380f43a-...` ("paim", e-mail pessoal `joaovitorpaim06@gmail.com`), que não tem nenhum voto e não está em `xgame_participantes`. Resultado: a moeda oficial dele (a que conta pro X-Pay/liga) não enxerga a produção real, porque estão em contas diferentes. Não mexi no banco — é decisão do dono qual conta é a "oficial" pra unificar (histórico de votos e X-Pay são dados sensíveis). Auditoria no restante do time (17 participantes ativos) não achou nenhum outro caso de "somou ponto e ficou zerado" — os únicos com voto recebido mas zero produção este ciclo (Flavio Monteiro, José Amancio, Luciene Soares, Livoo Live) também têm zero tarefas feitas — ainda não abriram o "Meu Dia" neste ciclo, não é bug.

**Prova:** suíte 1881/1881 (`tests/moedaPizza.test.mjs` reescrito pra validar a estrutura exata do gate), lint limpo, `npm run build` sem erro.

---

## DIR-120 — a moeda-modelo cheia ao lado da moeda real, na tela viva

**Emitida por:** dono (09/09/2026), olhando o próprio radar em 0% no dia 3 de 22: *"não é que ele acumula ponto no MvM, é que o dia de hoje ele está com o MvM de ontem... a moeda ganhou vida... é a cotação... a moeda tem que estar ali, pra ele se inspirar nela cheia, e entender como ela fica cheia, junto com a dele que está sendo preenchida."*

**O que entra:**
1. Nova função pura `moedaModelo(perfil = 'estrategico')` (`src/lib/xgame.js`): os 5 componentes do Human Token no valor MÁXIMO — `pesosDoPerfil` remapeado (`ptVenda` → `vendas`), nunca duplicado à mão. Já era usada só no Guia (aula de pontuação); virou a fonte única também para as telas ao vivo.
2. **`CrmMetodo.jsx`** (Compromisso) e **`XGameVisaoExecutiva.jsx`** ("sua posição no ciclo"): logo abaixo do cartão da moeda REAL da pessoa, um segundo cartão — borda tracejada dourada, "🏆 O Modelo — pra onde você está indo" — desenha a MESMA `MoedaPizza`, com `moedaModelo('estrategico')` no lugar dos componentes reais, sempre no teto (`TOKEN_MAX`, Liga Platina). Não recalcula nada da pessoa; é só a referência ao lado.
3. `GuiaXGame.jsx` refatorado pra importar `moedaModelo` em vez de remontar os pesos à mão (mesmo resultado, uma fonte só).

**Fora do escopo / proibido:** a fórmula de cálculo do MvM/Produção/Real Time/Vendas/Bônus (`tokenDoCiclo`) — o relato do dono sobre "moeda viva" descreve um comportamento que a função já tem (soma cumulativa dos dias do ciclo, nunca reseta no meio); nenhuma conta mudou aqui, só o desenho.

**Prova:** suíte 1881/1881 (2 testes novos em `tests/xgame.test.mjs` pra `moedaModelo`: bate com `pesosDoPerfil` remapeado e fecha o teto exato; default sem perfil = `'estrategico'`), lint limpo, `npm run build` sem erro. Banca nova em navegador (`tests/navegador/moedaLadoALado.*`): print real dos dois cartões juntos — moeda parcial (início de ciclo, "ainda não conquistado" visível) ao lado da moeda-modelo cheia (22,22, Liga Platina, sem sobra).

---

## DIR-119 — a liga do topo vira PLATINA em todo lugar (sincronizada com a repesagem que já tinha renomeado o motor)

**Emitida por:** dono (09/09/2026): *"esqueça a palavra diamante e tudo platina, onde tiver diamante tira, lembra é liga platina em todos os lugares, pra não aparecer múltiplo [nome]."* — pedido em paralelo à repesagem do DIR-115 (abaixo), que já tinha renomeado o motor (`xgame.js`) de Diamante pra Platina por conta própria; esta entrada é a reconciliação das duas pontas.

**O que entra:** ao fazer merge com o trabalho paralelo, `xgame.js` já vinha com a liga renomeada (LIGAS, `travarTopoPorEstudo`, `ligaComPortoesDoCiclo`) — mantido como está, sem duplicar a troca de nome. O que faltava sincronizar: os textos visíveis que ainda citavam os limiares e a trava de ANTES da repesagem (ex.: "prata até 17,77 · ouro de 17,78 · platina de 20") em `XGame.jsx` e `CrmMetodo.jsx`, atualizados pros limiares reais de hoje (prata até 12,21 · ouro até 17,77 · platina de 17,78) e pros dois portões (caráter/MvM e meta de vendas). Concordância de gênero corrigida em todo lugar ("a Platina", não "o Platina"). Não mexe em nada fora do X-Game — o "Plano Diamante" de `PartnerPlanActivation.jsx` e as peças reais de joalheria do catálogo (`LuxuryCollection.jsx`, `insert_products.sql`, etc.) são outro contexto e ficaram intocados.

**Prova:** suíte 1879/1879, lint limpo, `npm run build` sem erro. Varredura (`grep`) confirma zero sobra da palavra "diamante" nos arquivos do X-Game, fora das linhas que documentam a mudança de nome.

---

## DIR-118 — sincronizar o painel "Executivo Ideal" entre o Compromisso e o X-Game, e tirar a crença errada do estudo do ar

**Emitida por:** dono (09/09/2026): *"o executivo ideal lá da lista, do quadro, está desatualizado... eu preciso pegar do que nós fizemos agora e atualizar lá, e o que estava lá que não está constando no novo, atualizar aqui também, fazer essa sincronização, tanto de lá pra cá e daqui pra lá."*

**O problema:** o painel "Onde estou × Executivo Ideal" é duplicado de propósito em `XGame.jsx` e `CrmMetodo.jsx`, mas só `CrmMetodo.jsx` tinha o guia "como me formo Executivo Ideal em 3 meses?" — e esse guia (junto com 2 comentários de código no mesmo arquivo) ainda ensinava a regra de ANTES do DIR-113: *"sem a leitura em dia, o token trava em 17,77"*, sem falar da liga do topo — a crença exata que o dono corrigiu na rodada passada. O guia de onboarding (`guiaXGame.js`, aba "Guia do Usuário") tinha o mesmo risco por outro caminho: ensinava a trava do Human Token DO DIA (17,77, que é real e não mudou) só como "Sem estudo, não tem ouro", sem separar essa conta da conta OFICIAL DO CICLO — quem lesse podia achar que a trava do dia valia pro Ouro do ciclo também. O atendente 24h (`tiraDuvidas.js`) tinha o mesmo buraco: só conhecia a régua do dia, nada da régua do ciclo.

**O que entra:**
1. `CrmMetodo.jsx` — o guia corrigido (a régua completa: bronze/prata/ouro/liga do topo, com a trava certa) e os 2 comentários de código atualizados.
2. `XGame.jsx` — ganhou o MESMO guia (não existia lá) e o mesmo tooltip rico do card "Human Token" que só `CrmMetodo.jsx` tinha; texto da trava e legenda da MoedaPizza unificados entre as duas telas.
3. `guiaXGame.js` — a aula "Entender sua pontuação" agora chama a conta do dia de "Human Token DO DIA" (não só "Human Token"), com uma nota explícita de que a conta OFICIAL DO CICLO é outra, com outra trava; mesma correção na pergunta frequente e no dicionário.
4. `tiraDuvidas.js` — `fichaDeRegras()` ganhou a régua do ciclo inteira (Executivo Ideal, ligas, meta de vendas, a trava certa) ao lado da régua do dia que já existia, pra o atendente nunca mais ter que adivinhar.

**Prova:** suíte 1701/1701 (nenhum teste quebrou com as strings novas), lint limpo, `npm run build` sem erro.

---

## DIR-117 — botão "recebe voto" por pessoa + selo "Preview oficial" corrigido

**Emitida por:** dono (09/09/2026): *"tem pessoas que vão receber valor na gamificação, já participaram da mentoria e não vão receber voto... eles podem votar, mas não recebem voto... eu não tenho esse botão... preciso desse botão ali na mentoria."* — e, sobre o link de prévia: *"tá vendo escrito prévia oficial, só trabalho nele."*

**O que entra:**
1. **Botão "recebe voto" no ADM X-Game** (`XGameAdmin.jsx`): `podeSerVotado` (xgame.js) ganha um segundo uso, com polaridade OPOSTA à do Super Admin — lá é opt-in (desligado até ele mesmo ligar); pra todo mundo mais agora é opt-out por ADMIN (ligado até o dono desligar essa pessoa específica). Desligar não mexe em `ativo` (continua paga/gamificada) nem em quem ELA pode votar — só em quem RECEBE o voto dela dos colegas.
2. **O selo "Preview oficial" mentia**: `tipoDeHost` (DIR-42) classificava QUALQUER host `*.vercel.app` com "-git-" como oficial — com duas branches rodando em paralelo (`xgame-visual-polish` e `claude/project-structure-analysis-r1prad`), as DUAS mostravam o selo verde, e o dono foi parar na branch errada sem nenhum aviso na tela. Corrigido: só o host EXATAMENTE igual a `HOST_PREVIEW_OFICIAL` ganha o selo verde; qualquer outro cai no aviso âmbar de sempre.
3. **Reconciliação de branches**: todo o trabalho de `xgame-visual-polish` (DIR-113 a DIR-115 + este) foi mergeado direto em `claude/project-structure-analysis-r1prad` — a branch que `HOST_PREVIEW_OFICIAL` de fato aponta — junto com o trabalho paralelo de lá (DIR-116, pódio com foto). Nada perdido dos dois lados.

**Prova:** suíte 1879/1879 (6 testes novos pro botão de voto — lógica pura + presença/gate/efeito colateral no código-fonte da tela; 2 testes novos travando que duas branches "-git-" diferentes não podem as duas ganhar o selo verde), lint limpo, build ok.

---

## DIR-116 — o pódio da Visão Executiva ganha foto real, emoldurada pela cor da liga

**Emitida por:** dono (09/09/2026), depois de ver o pódio no preview: *"vamos puxar a imagem, a foto da pessoa do perfil dela pra dentro da visão executiva... e melhorar esse ranking com a imagem dele... fazer a imagem dele dentro da moeda que ele está... o pódio está muito feio, dá muito cara de emoji. Pode mais foda mesmo, entendeu? Pra dar mais vontade da pra pessoa."* — pediu explicitamente o design por escrito antes de mexer no código; o plano foi discutido e aprovado ("boooraaaaa") antes desta implementação.

**O que entra:**
1. A busca de `app_users` na Visão Executiva passa a trazer `avatar_url`/`profile_photo_url` (antes só nome) e resolve a foto com `getFotoPerfil` (`src/lib/selosCargo.js`) — a mesma fonte que o Quadro de Compromisso já usa, nenhuma lógica nova de onde a foto mora.
2. Componente `Avatar` novo: desenha a foto (ou, sem foto, as iniciais num círculo com gradiente — nunca fica vazio) **emoldurada por um anel na cor da própria liga** da pessoa (a mesma paleta `COR_LIGA` que já existia, sem duplicar) — é isso que faz "a moeda" ser a própria foto, não uma forma solta do lado do nome.
3. O pódio (2º·1º·3º) troca o círculo de iniciais por esse Avatar — o 1º lugar com a foto maior (80px vs. 56px dos outros dois), continuando no degrau mais alto do palco. "Você" ganha um segundo anel verde por fora do anel de liga, compondo os dois em vez de substituir.
4. A tabela "Todo mundo" ganha o mesmo Avatar (menor, 22px) ao lado do nome — consistência entre pódio e tabela, sem o pontinho solto de antes.

**Nota de reconciliação (merge, 09/09/2026):** esta diretiva nasceu numerada DIR-115 numa branch paralela (`claude/project-structure-analysis-r1prad`), na mesma hora em que a outra sessão registrava a repesagem da moeda como DIR-115 na `xgame-visual-polish` — colisão de numeração entre as duas frentes, cada uma sem ver a entrada da outra. Renumerada pra DIR-116 ao mergear as duas branches; nenhum conteúdo mudou, só o número. `COR_LIGA['diamante']` também foi renomeada pra `COR_LIGA['platina']` no merge, pra acompanhar o DIR-115 (Diamante → Platina) — só o nome da chave, a paleta de cor é a mesma.

**Prova:** suíte 1701/1701 (sem teste novo — é troca visual, sem lógica de negócio nova), lint limpo, `npm run build` sem erro. Verificação em navegador nova (`tests/navegador/podio-visao-executiva.*`): banca com 5 pessoas, 4 com foto (SVG de mentira) e 1 sem foto de propósito — screenshot confirma foto real emoldurada pela cor da liga no pódio e na tabela, fallback de iniciais funcionando pra quem não tem foto, e o anel duplo (liga + verde) em "você".

---

## DIR-115 — repesagem da moeda: MvM vira portão (caráter), Diamante vira Platina, 4 ligas parelhas

**Emitida por:** dono (09/09/2026), depois de revisar a planilha original junto com Claude, em conversa: *"o jargão da empresa é recrutamos caráter e treinamos habilidade... a produção ela chega aos quarenta e cinco por cento com o realtime"*; sobre o nome do topo: *"eu não quero botar diamante... que não lembre multinível — o nível pica de chegar mesmo, que é o executivo ideal pica, que tem que ser infalível"*; aprovação final: *"bora gostei capricha."*

**Objetivo:** corrigir dois problemas do desenho anterior da moeda — (1) o MvM, sozinho, valia quase metade do Human Token (45%), uma fatia grande demais pra um eixo que estatisticamente quase não varia entre pessoas (a votação real do dono, por exemplo, ficou entre 7,38 e 9,38 — 2 pontos de amplitude, contra 0-100% dos outros eixos); (2) as 3 ligas antigas tinham um "deserto" de 50 pontos sem nenhum degrau entre Prata (30%) e Ouro (80%).

**Escopo autorizado (`src/lib/xgame.js`):**
1. **Repesagem do perfil `'estrategico'`** (perfil `'comercial'` INTOCADO — decisão de outra conversa): MvM 30% (6,67) · Produção 30% (6,67) · Real Time 15% (3,33) · Vendas 15% (3,33) · Bônus/Estudo 10% (2,22) — soma 22,22 exata. Produção+Real Time juntos voltam a somar 45%, igual ao MvM antigo.
2. **Piso de caráter** (`PISO_CARATER_LIGA = 7`, `PISO_CARATER_PLATINA = 8`) e **porteira de vendas** (100% de `META_VENDAS_CICLO`), nova função `ligaComPortoesDoCiclo(total, {mvmVotacao, vendasFeitas})`: MvM da votação abaixo de 7 trava TUDO em Bronze (mesmo com token de Platina); abaixo de 8 (mas ≥ 7) barra só a Platina (Ouro continua de pé); sem bater a meta cheia de vendas, a Platina também não abre. Os portões NUNCA alteram o número exibido (`total`) — só decidem qual liga aquele total pode valer. Usada nos 5 lugares que calculam liga de ciclo: `XGame.jsx`, `CrmMetodo.jsx` (pessoal + ranking), `XGameVisaoExecutiva.jsx` (ranking + "sua posição"), `PainelCorporativo.jsx`/PDF Executivo.
3. **"Diamante" → "Platina"** em todo o código/UI que nomeia a liga (`LIGAS`, `FAIXAS_TOKEN`, `COR_LIGA`, `LIGA_COR` do PDF, tooltips) — só o nome mudou, os valores não.
4. **4 ligas em degraus de ~20-30% cada** (Bronze 0-6,65 · Prata 6,66-12,21 · Ouro 12,22-17,77 · Platina 17,78-22,22), fechando o "deserto" antigo. Platina começa EXATAMENTE onde o Ouro antigo começava (17,78) — o topo não ficou mais fácil, só ganhou dois degraus novos abaixo dele.
5. `travarDiamantePorEstudo`/`TRAVA_SEM_DIAMANTE` (DIR-113) renomeadas pra `travarTopoPorEstudo`/`TRAVA_SEM_ESTUDO_CICLO` — mesmo valor (19,99), mesmo comportamento, só o nome.
6. Removida a Moeda duplicada em `pages/XGame.jsx` (dono, vendo a tela: *"você duplicou duas vezes a moeda"*) — a página já embute `XGameVisaoExecutiva`, que desenha a mesma moeda da mesma pessoa.
7. Jargão **"Recrutamos caráter e treinamos habilidade"** visível nas 4 telas da moeda (Compromisso, Visão Executiva, tooltip do Human Token, tooltip do perfil em XGameAdmin), junto da explicação dos portões.

**Fora do escopo / proibido:** perfil `'comercial'` (pesos e trava de vendas, decididos numa conversa separada); qualquer outro uso de "diamante" no app fora da liga da moeda (achievement "Colecionador de diamantes", templates de promoção, plano parceiro) — não é a mesma coisa e não foi pedido.

**Prova:** suíte 1711/1711 (`tests/xgame.test.mjs` com os pesos novos + 9 testes novos de `ligaComPortoesDoCiclo`/`PISO_CARATER_*` + a nova geometria de `FAIXAS_TOKEN`/`LIGAS`; `tests/moedaPizza.test.mjs` e `tests/guiaXGame.test.mjs` recalculados pros novos limiares e pesos), lint limpo nos arquivos tocados, `npm run build` sem erro.

---

## DIR-114 — a auditoria pré-publicação: 4 críticos, 9 importantes e 7 nice-to-have corrigidos

**Emitida por:** dono (09/09/2026): *"corrigir tudo que tem pra corrigir... faz uma análise de novo pra corrigir e deixar perfeito."* — em resposta ao relatório da auditoria em 3 frentes (Painel Corporativo/PDF/roda, motor do X-Game, Hábito 3/4 + trabalho mesclado) publicado antes desta entrada.

**O que entra** (agrupado pelas mesmas letras do relatório da auditoria):

**A — motor do X-Game:**
- **A1 (crítico):** `pesosDoPerfil('comercial')` somava 14,72 em vez de 22,22 — corrigido mantendo a mesma proporção produção/realtime/bônus do perfil não-comercial, reescalada pra sobrar espaço pro PT VENDA (2,5, intocado).
- **A4 (importante):** `resumoDoDia` podia mostrar o banner de "aviso graduado" (âmbar) no MESMO dia em que o não-voto já zerou tudo (vermelho) — `emAvisoPronto` agora exige `!perdeuPorNaoVotar`.
- **A5 (importante):** não existia forma de resetar `avisos_pronto` — o comentário já prometia "reset manual" desde o DIR-105. Botão **"resetar avisos"** novo na Fila do Pronto (XPerformanceGestao.jsx), com confirmação.
- **A6 (nice-to-have):** tooltip do perfil em XGameAdmin.jsx descrevia a fórmula de antes da repesagem — atualizado com os pesos e a trava atuais.

**B — Painel Corporativo, PDF, roda e mensagens:**
- **B1 (CRÍTICO/segurança):** a policy de SELECT de `xgame_mensagens` era `qual: true` — qualquer requisição com a chave anon lia a caixa de entrada de qualquer um (inbox do CEO incluído). Fechada (`using (false)`); toda leitura agora passa por `api/functions/xgameMensagensListar.js` (chave de serviço, filtra no servidor com `mensagensRecebidasPor`/`papeisDoCargo`, os mesmos que a tela já usava). INSERT agora exige `remetente_id` de uma pessoa real; UPDATE restrito à coluna `lida` (column-level grant).
- **B2 (importante):** `xgame_mensagens` e as colunas de `avisos_pronto`/`aviso_pronto_em` existiam em produção sem migração commitada. Reconstruídas com o texto EXATO do que já rodou (consultado em `supabase_migrations.schema_migrations`), como reconciliação — não é uma tabela nova.
- **B3 (importante):** trocar de pessoa rápido no Painel Corporativo (uso avulso) podia misturar dado de duas pessoas — as buscas agora descartam a resposta se a pessoa selecionada já mudou (`pessoaIdRef`).
- **B4 (importante):** "excluir" na Fila do Pronto apagava qualquer tarefa (inclusive da Rotina da própria pessoa) sem confirmar. Agora só apaga `origem === 'xperf'` (o que a gestão distribuiu) e sempre confirma antes.
- **B6 (nice-to-have):** nome muito longo estourava o cabeçalho do PDF Executivo — a fonte agora encolhe até caber, e o subtítulo desce de linha se não sobrar espaço.
- **B7 (nice-to-have):** `marcarLida` não era esperado antes de recarregar a lista — corrida que podia mostrar "não lida" numa mensagem já respondida.

**C — Hábito 3/4 e integração TourGuiado/MoedaPizza/scriptContatoCoach:**
- **C1 (CRÍTICO):** `scriptContatoCoach.js` nunca devolvia o campo `aprovado` na resposta de sucesso — o front sempre lia `undefined` (⇒ reprovado), então NINGUÉM jamais ganhava o ponto do script, mesmo perfeito. Um campo, uma linha — a feature pedida duas vezes ao vivo estava 100% inoperante.
- **C3 (importante):** o destaque de 4s do "Contatar" (DIR-111.2) podia ficar preso — o timer reiniciava a cada render do componente pai. Agora usa uma ref pro callback, só `contatoDestacado` reinicia o timer.
- **C4 (importante):** `fatiasDaMoeda` não capava `inicio`/`fim` de cada fatia ao teto — geometria segura agora, mesmo se os pesos mudarem no futuro sem preservar a invariante.
- **C5 (nice-to-have):** contato sem telefone: "Contatar" some sem explicar — agora mostra "sem telefone cadastrado".
- **C6 (nice-to-have):** helper `nomeDoDono` estava copiado (Lista + Contato) — uma versão só, no topo do componente.
- **C7 (nice-to-have):** `tests/tourCrmMetodo.test.mjs` (novo) — trava que todo alvo dos 6 tours de CrmMetodo.jsx tem elemento correspondente na tela (mesma rede de segurança que a Esteira já tinha, faltava aqui — exatamente o arquivo que teve o conflito de merge).

**Deliberadamente não resolvido nesta rodada** (fora de escopo pontual, registrado com o dono):
- **A2/A3** (a divergência de liga entre telas por causa da trava de estudo) foi resolvida junto com a correção da própria trava — ver DIR-113 abaixo.
- **C2** (teste de `scriptContatoCoach` não invoca o handler de verdade) — melhorado pra conferir TODOS os campos do schema na resposta real (o suficiente pra travar o bug do C1), mas sem montar um mock completo da Anthropic — investimento maior, fora de escopo pontual.
- Uma auditoria completa de TODO o histórico de migrações do projeto (só as 3 flagradas por esta auditoria foram reconciliadas) e uma revisão de RLS em todas as outras tabelas do app (o mesmo padrão `qual: true` existe em várias) ficam como frentes futuras, não desta rodada.

**Prova:** suíte 1696/1696 (44 testes novos: `tests/xgame.test.mjs` +9, `tests/moedaPizza.test.mjs` +1, `tests/scriptContatoValidacao.test.mjs` +1, `tests/tourCrmMetodo.test.mjs` novo com 7), lint limpo nos arquivos tocados, `npm run build` sem erro. B1 verificado direto no banco (policies e column grants conferidos via SQL depois de aplicar). B6 verificado gerando um PDF de verdade com nome longo e rasterizando pra olhar.

---

## DIR-113 — a trava de estudo passa a bloquear só o Diamante, nunca mais o Ouro

**Emitida por:** dono (09/09/2026), revendo o próprio pedido de trava de estudo: *"O bônus, pra ela chegar a diamante — o que ditava o diamante é só um estudo em casa — mas ela tem que chegar ao ouro, a pessoa tem que chegar ao ouro, até mesmo se ela não estudar em casa, que é a produção, mais MvM, mais tudo isso."*

**O problema:** `XGame.jsx`/`CrmMetodo.jsx` (painel pessoal) reaplicavam `TRAVA_SEM_ESTUDO` (17,77 — a trava do Human Token DO DIA, `humanToken()`) em cima do total do CICLO, além da trava correta do fim de semana (`TRAVA_SEM_DIAMANTE`, 19,99). Isso bloqueava Liga Ouro (17,78+) pra quem não lê todo dia — o oposto do que o dono quer agora. O ranking do time (CrmMetodo.jsx/XGameVisaoExecutiva.jsx), por acidente, já fazia o certo (só a trava do fim de semana) — a divergência entre "o que a pessoa vê de si" e "o que o time vê dela" era justamente o achado A2/A3 da auditoria.

**O que entra:** `travarDiamantePorEstudo(totalBruto, {estudoSemanaOk, estudoFdsOk})`, nova função única em `xgame.js` — sem qualquer um dos dois estudos (leitura de semana OU fim de semana) em dia, capa em `TRAVA_SEM_DIAMANTE` (19,99), NUNCA em `TRAVA_SEM_ESTUDO`. Aplicada nos 4 lugares que calculam liga de ciclo: `XGame.jsx`, `CrmMetodo.jsx` (painel pessoal + ranking, que ganhou a checagem da leitura de semana que faltava), `XGameVisaoExecutiva.jsx` (ranking) e `PainelCorporativo.jsx` (que não tinha trava NENHUMA — bônus da correção). Achado no caminho: o cartão pessoal de "Human Token" do ciclo usava `faixaToken()` (3 faixas, sem Diamante) em vez de `ligaDoToken()` (4 ligas) — ninguém via "💠 Diamante" na própria tela mesmo batendo o token; corrigido junto.

**Prova:** `tests/xgame.test.mjs` — 5 testes novos pra `travarDiamantePorEstudo` (passa reto com os dois estudos ok; capa em 19,99 faltando qualquer um dos dois, nunca abaixo de 17,78; não mexe em total já abaixo do teto). Suíte completa incluída na prova do DIR-114 acima (a mesma rodada de testes/lint/build cobre as duas entradas). *(Nota do DIR-117: essa função e essa liga foram renomeadas depois — hoje é `travarPlatinaPorEstudo`/LIGA PLATINA; a regra e os números continuam exatamente os mesmos.)*

---

## DIR-112 — a roda da vida vira roda de verdade + o PDF Executivo ganha "posição do dia"

**Emitida por:** dono (09/09/2026), depois de ver o radar (DIR-109/109.1)
e o PDF (DIR-108) ao vivo: *"O PDF do executivo está muito raso. Tem que
mostrar qual a posição dele do dia. O radar roda da vida, não está
aparecendo uma roda. Quando eu falei a roda, é, ele faz, o painel dele
virar uma roda de acordo, pra ele tem que ser quase dez em tudo, pra
transformar numa roda... pra a vida andar. [...] Está aparecendo
qualquer outra coisa menos uma roda. [...] eu gostaria que você olhasse
com carinho isso, [...] pra gente fazer uma [prova] foda pro cara olhar
e falar assim, porra, eu melhorando isso, você precisa rodar, precisa
girar."* E, sobre o processo: *"Eu gostaria que você compartilhasse
comigo, não saindo e fazendo... vamos conversar."* — as duas frentes só
entraram em código depois de alinhar por escrito, na conversa, o
desenho da roda (curva fechando círculo vs. o pentágono antigo) e o
conteúdo da "posição do dia" (ele delegou a decisão: *"aonde a pessoa se
encontra na posição do dia dentro do game, dentro dessa jornada do
sucesso... riqueza de detalhes, pra ela ter ciência como está o negócio
dela"*).

**O problema, achado ao ler o próprio desenho:** `RadarEixos.jsx`
desenhava um **pentágono** (5 lados retos) ligando os 5 eixos. Um
pentágono nunca vira círculo, por melhor que seja a nota — a forma de
base é poligonal. Por isso "aparecia qualquer coisa menos uma roda",
mesmo com desempenho alto.

**O que entra:**
1. `src/lib/rodaDaVida.js` (novo) — a curva da roda é Catmull-Rom por
   cima dos 5 eixos (`pontosDaRoda`), não retas: com tudo perto de
   100%, a curva fecha um círculo quase perfeito; um eixo fraco
   "amassa" a curva só daquele lado, como um pneu murcho.
   `redondezDaRoda`/`faixaDaRoda` leem o quanto ela já gira (4 faixas:
   murcha/torta/quase/girando).
2. `RadarEixos.jsx` redesenhado: o **alvo** agora É um círculo perfeito
   (os eixos já chegam normalizados a 100% do próprio alvo — bater a
   meta em tudo LITERALMENTE é virar um círculo); o **desempenho real**
   é a curva suave por cima. Quando a redondez passa de 85%, a curva
   GIRA (animação CSS, respeita `prefers-reduced-motion`) e a legenda
   embaixo muda de frase conforme a faixa.
3. `relatorioExecutivo.js` ganha `posicao` (novo parâmetro) →
   `rel.posicaoDoDia`: liga atual (Bronze/Prata/Ouro/Diamante,
   `ligaDoToken`), quanto falta pra próxima (`proximaLiga`), Human
   Token médio do ciclo, % de formação do Executivo Ideal (com a
   mensagem de "votação extraordinária" já existente) e os 5 eixos pra
   roda — tudo com a MESMA fórmula que o X-Game já usa pra própria
   pessoa (`tokenDoCiclo`/`formacaoExecutivoIdeal`/
   `proporcoesExecutivoIdeal`). Também entra em `textoDoRelatorio()`
   (a versão WhatsApp).
4. `PdfExecutivo.jsx` ganha o painel **POSIÇÃO DO DIA**: a MESMA roda
   (vetorial, via `pontosDaRoda`/`pontoDoEixo` — não é imagem, é
   desenho jsPDF de verdade) ao lado da liga, da barra de formação e da
   legenda dos 5 eixos.
5. `PainelCorporativo.jsx` calcula a posição do dia de QUALQUER pessoa
   que a gestão abrir (não só de quem está logada): busca
   `xgame_diario`/`xgame_votos_mvm` do ciclo já fechado (dias antes de
   hoje) + `catalog_sales`/`captacao_oportunidades` no ciclo (mesma
   conta de vendas de alto valor do DIR-110.1) — é uma FOTO do ciclo,
   não tenta recalcular a régua radical do dia corrente de outra
   pessoa.
6. **Bug achado ao gerar um PDF de verdade e OLHAR pra ele** (não só
   ler o código): `paraPdf()` deixava "⏱️"/"🗳️" viraram "??"/"?" soltos
   na legenda da roda — a faixa de emoji coberta não incluía todo
   emoji, e a variação (U+FE0F) sobrava como "?". Trocado pelo property
   escape `\p{Extended_Pictographic}` (+ variação/ZWJ), que cobre
   qualquer emoji de verdade.

**Prova:** `tests/rodaDaVida.test.mjs` (8 testes novos — a curva fecha
em ~raio 1 quando tudo é 100%, um eixo fraco amassa só daquele lado,
`redondezDaRoda`/`faixaDaRoda` nas 4 faixas); `tests/relatorioExecutivo.test.mjs`
(+2 testes — sem `posicao` fica `null`; com `posicao` monta
`posicaoDoDia` e o texto do WhatsApp). Suíte 1658/1658, lint limpo,
`npm run build` sem erro. **Verificação em navegador rodou de
verdade nesta rodada**: banca nova (`tests/navegador/roda-da-vida.*`)
prova que os rótulos mais compridos não clipam em nenhum dos 4
cenários (cheio/torta/murcho/escuro) e que a legenda muda de frase
certa; e um PDF de verdade foi gerado com jsPDF (via bundle esbuild) e
rasterizado com `pdftoppm` pra ser OLHADO — foi assim que o bug do
emoji foi achado, e foi assim que se confirmou que a roda cheia (todos
os eixos ~95-100%) realmente fecha em círculo dentro do alvo tracejado,
com a legenda "a roda GIRA — a vida anda".

---

## DIR-111.2 — chegou no Hábito 4 já sabendo por quem: rola até ela e pisca

**Emitida por:** dono (09/09/2026), depois de testar o DIR-111.1: *"Eu
cliquei nessa pessoa, ela me levou pra página seguinte, eu não posso ter
a sensação que eu estou recomeçando. Então ela já me coloca ela no meu
contato na outra página e pisca no contato que eu vou fazer. Pra não
ficar com uma sensação de bloqueio... claro, achar direto na lista, não
ficar procurando."*

**O problema:** o botão "Contatar" do DIR-111.1 levava pro Hábito 4, mas
só isso — a pessoa aparecia em algum lugar da fila e ficava por conta de
quem clicou achar ela de novo. Exatamente a "sensação de recomeçar" que
o dono descreveu.

**O que entra:** o clique agora carrega o ID de quem foi clicada até o
Hábito 4. Lá, a linha dela rola pra tela automaticamente (uma vez só) e
pisca por 4 segundos (borda + fundo verde, `animate-pulse`) — dá pra
achar na hora, sem procurar. O destaque some sozinho depois de 4s, não
fica preso. Fiação: `CrmClientesTab.jsx` ganhou o estado
`contatoDestacado`; `onIr` agora aceita um 3º parâmetro (o ID) só usado
nessa passagem lista→contato.

**Prova:** lint limpo, suíte 1648/1648, `npm run build` sem erro.
Verificação em navegador não rodou nesta rodada (mesmo motivo do
DIR-111 — sem banca de teste pra esta tela) — recomendo clicar
"Contatar" numa pessoa qualificada e conferir o scroll + o pisca ao vivo.

---

## DIR-111.1 — a conexão que faltava: qualificou → botão leva pro Hábito 4

**Emitida por:** dono (09/09/2026), depois de ver o DIR-111 no ar:
*"Você esqueceu de fazer a conexão... assim que eu qualifiquei tenho que
ter o botão de contatar [que] vai me levar pra página do quarto hábito,
que é o contato e convite... faltou isso aqui, nessa parte."*

**O que entra:** na Lista de Network (Hábito 3), quem já está qualificada
ganhou um botão **Contatar** ao lado da pontuação — leva direto pro
Hábito 4 (Contato e Convite), onde ela já aparece na fila (afinal já está
qualificada). Fecha o ciclo que faltava: qualificar → contatar, sem
precisar trocar de aba manualmente.

**Prova:** lint limpo, suíte 1648/1648, `npm run build` sem erro.
Verificação em navegador não rodou nesta rodada (mesmo motivo do
DIR-111 — sem banca de teste pra esta tela).

---

## DIR-111 — Hábito 4 mais fluido: botão Contatar (WhatsApp), guia da ordem, dono aparece na Lista

**Emitida por:** dono (09/09/2026), duas mensagens seguidas:

1. *"Tudo tem que ter uma ordem. No quarto hábito... a qualificação da
lista, depois... quando eu clicar em contatar, me gera WhatsApp... Depois
disso, atualizar a pós-contato, registrar... Depois disso, vem a
esteira... Deixar isso tudo mais fluido, está dando noventa por
cento."*

2. *"No contato, na lista de qualificação, tem que aparecer quem
qualificou — eu sou super admin, [...] todo mundo está botando a lista
ali, eu vejo a minha e eu vejo aqui todo mundo. Então tem que botar de
quem é o nome da pessoa que qualificou a lista, igual você colocou no
contato."*

**O que entra:**
1. **Botão "Contatar"** (novo, primeiro da fila de botões, antes de
   Agendar/Registrar) na fila "Quem contatar" do Hábito 4
   (`CrmMetodo.jsx`) — abre o WhatsApp da pessoa direto (mesmo padrão
   `wa.me` já usado em outros cantos do app). A ordem agora é: **Contatar
   → Agendar/Registrar → Esteira**.
2. **Guia da ordem** — o `GuiaMovel` "Como fazer o contato" ganhou duas
   linhas novas: o que o % ao lado do nome significa (vem da qualificação
   do Hábito 3) e a ordem explícita dos 4 botões.
3. **Dono aparece na Lista de Network também** (Hábito 3, `painel ===
   'lista'`) — antes só a fila de "Quem contatar" (Hábito 4) mostrava
   "👤 Fulano · " na frente do nome pra quem é super admin vendo o time
   inteiro; a Lista de Network (onde a qualificação acontece) não
   mostrava, então o dono via "26 pessoas na sua lista" sem saber que era
   o TIME inteiro, nem de quem era cada uma. Mesmo padrão, mesma fonte de
   dado (`nomePorUsuarioId`/`created_by_id`), reaproveitado — cabeçalho
   também corrigido pra "na lista do TIME" quando é visão total.

**Prova:** lint limpo, suíte 1639/1639 (sem teste novo — mudança de UI
pura, reaproveitando padrões já testados em outras telas), `npm run
build` sem erro. Verificação em navegador não rodou nesta rodada — não
existe banca de teste pra esta tela específica (Hábito 4 dentro de
`CrmMetodo.jsx` exige muitas props pra montar isoladamente); recomendo
conferir ao vivo o botão Contatar e o nome do dono na Lista.

---

## DIR-110.1 — correção: venda de alto valor "por fora" também conta (esteira de captação)

**Emitida por:** dono (09/09/2026), explicando o caso real que faltou:
*"Luciano Pinheiro fechou o Renan, duzentos mil, foi um parceiro de
compra. Ele pode fechar pela plataforma ou pode fazer depósito por fora
— no caso dele foi por fora... tem o parceiro de compra e tem as
licenças, depois vem o licenciado, depois vem o ponto de retirada...
tem que olhar a plataforma que você já tem documento, que já tem como
funciona pra fazer isso aí."*

**O erro no DIR-110:** eu tinha assumido que venda de alto valor só
existia dentro de `catalog_sales` (kind `partner_plan`/`adesao`) — e
sinalizei "investimento" como sem fonte de dado. Fui investigar o
documento que o dono mencionou (`docs/DOCUMENTO-OFICIAL-PLANO-CARREIRA.md`
e `src/lib/captacaoParceiros.js`, a régua OFICIAL da meta de captação de
R$1.000.000, DIR-22) e descobri: existe sim um mecanismo pra fechar
"por fora" — a esteira de captação (`captacao_oportunidades`, DIR-40),
com o campo `aporte_externo` (banco, valor, data, quem registrou) pra
depósito direto fora do checkout automático. É exatamente o caso do
Renan.

**A correção:**
1. `vendasEquivalentesAltoValor()` ganhou o kind `seller_adhesion`
   (Vendedor) além de `partner_plan`/`adesao` — os mesmos 3 kinds que
   `bucketDaVenda()` (a régua oficial da meta de captação) já trata como
   captação de verdade, não mercadoria.
2. Nova soma, em paralelo à de `catalog_sales`: `captacao_oportunidades`
   filtrada por `responsavel_id` da pessoa e fechada
   (`ehFechada` + `aporteExternoValido`, ambas de `esteiraCaptacao.js` —
   sem duplicar a validação, só reusando a que já existe) dentro do
   ciclo, com o `aporte_externo.valor` somado e convertido pelo mesmo
   ticket médio.
3. O filtro de "venda paga" pra alto valor trocou de `isSalePago` (usada
   só pra mercadoria) pra `isVendaReal` (`dinheiroReal.js`) — a régua
   OFICIAL de "isso é dinheiro real" já usada na meta de captação.

**"Investimento" já estava certo** — não é uma categoria separada: é o
"Parceiro de Compra" (aporte com retorno, `src/lib/planosParceiro.js`),
a mesma coisa que Luciano fechou com o Renan. Não sobrou nada sem fonte
de dado.

**Prova:** teste de `vendasEquivalentesAltoValor` ampliado pro terceiro
kind (`seller_adhesion`). Suíte 1637/1637, lint limpo, `npm run build`
sem erro. Verificação em navegador não rodou nesta rodada — recomendo
testar ao vivo com um aporte externo real registrado na esteira de
captação pra confirmar que o número chega certo no Executivo Ideal.

---

## DIR-110 — o eixo Vendas do Executivo Ideal: meta maior, reunião conta, venda grande satura

**Emitida por:** dono (09/09/2026): *"o executivo ideal exige venda de
quem é comercial... vamos melhorar o ciclo de venda, que ele só tem
quatro vendas, é muito pouco... vamos botar vinte e seis vendas... a
reunião pode ser o princípio da venda... duas reuniões agendadas pode
contar pra parte da venda... eu não posso parabenizar um time comercial
sem gerar resultado em venda ou reunião, peso maior é venda... se ele
fechou uma licença de vinte mil, já preencheu, se ele fechou um
investimento de cem mil, já preencheu, se ele fechou quatro licenciados
de cinco mil, fechou... a gente tem que equilibrar isso."*

Confirmado com o dono antes de programar (as 4 perguntas — peso da
reunião, meta nova, conversão de venda grande, sequência) — as
recomendadas foram todas aceitas.

**O que entra:**
1. `META_VENDAS_CICLO`: 4 → **26** por ciclo, fixo (sem tentar amarrar
   aos 22 dias úteis do ciclo — o dono pensou em dias corridos, misturar
   as duas réguas de "dia" só ia complicar).
2. **Reunião conta como princípio da venda** — cada reunião feita no
   ciclo (`contagens.reunioes_feitas`, já existia do DIR-103) vale
   `PESO_REUNIAO_EQUIVALENTE = 0,25` de venda equivalente, com teto de
   `TETO_REUNIAO_NA_META = 30%` da meta — reunião ajuda, mas não
   substitui vender.
3. **Venda de valor alto satura a meta** — `vendasEquivalentesAltoValor()`
   soma o `total_amount` das vendas pagas de kind `partner_plan`
   (parceiro de compra) e `adesao`, divide pelo `TICKET_MEDIO_VENDA` (R$
   197, o valor que o dono citou). Uma parceria de R$20.000 vira ~101
   vendas equivalentes — satura a meta na hora, exatamente como descrito.
4. A régua "Vendas" agora mostra o quebra-cabeça inteiro: `meta 26 no
   ciclo · X vendida(s) + Y de reunião = Z`, em vez de só o total.

**🔴 Ficou de fora, sem dado pra sustentar** — fui procurar onde
"investimento" (aporte/investidor, ex. "fechou um investimento de cem
mil") fica registrado hoje, pra incluir na mesma conta da venda de valor
alto. Não achei nenhuma tabela (`catalog_sales`, `commission_records`,
`negotiations`) com esse tipo de negociação — os únicos kinds de venda de
valor alto que existem de verdade no banco são `partner_plan` e `adesao`
(e ambos, hoje, só têm registros CANCELADOS — nenhum fechado ainda, então
esta conta nova ainda não foi testada com dado real de produção). Preciso
saber do dono onde "investimento" é registrado (ou se ainda é só um
combinado verbal/manual) antes de inventar uma fonte de dado que talvez
não exista.

**Adiado por decisão do dono:** a régua do Executivo Ideal por FUNÇÃO
(logística, marketing, RH, jurídico... cada um com seu próprio critério,
não só "vendas") fica pra depois — o pedido explícito foi fechar o
comercial primeiro.

**Prova:** `tests/xgame.test.mjs` — 4 testes novos (meta em 26; reunião
conta com teto; venda de valor alto satura a meta; venda de mercadoria
comum não conta como "alto valor"). Os 2 testes que usavam a meta antiga
(4) como valor "perfeito" foram ajustados pra usar `META_VENDAS_CICLO`
em vez do número fixo — não quebram mais quando a meta mudar de novo.
Suíte 1633/1633, lint limpo, `npm run build` sem erro. Verificação em
navegador não rodou nesta rodada (mudança de fórmula, não de layout —
mas recomendo testar ao vivo com uma venda ou reunião real registrada
pra ver o número bater).

---

## DIR-109.1 — o radar vira "a roda da vida" (pentágono da meta sempre perfeito)

**Emitida por:** dono (09/09/2026), vendo o radar do DIR-109: *"esse
desenho não está visual, eu quero que o burrão entenda... por isso que eu
sugeri a roda da vida, porque aí a gente explica que se a roda dele
rodar, a vida dele anda."*

**O problema:** o radar do DIR-109 plotava o % BRUTO de cada eixo contra
o alvo dele — como os 5 alvos são diferentes (80/90/90/80/100%), o
pentágono da META não era um pentágono regular, e a leitura "a roda está
redonda = você está bem" não batia visualmente.

**A correção:** cada eixo agora mostra a PROPORÇÃO do próprio alvo
(capada em 100%) — `proporcoesExecutivoIdeal()`, extraída de dentro de
`formacaoExecutivoIdeal()` pra ser a mesma conta nos dois lugares. Bater
o alvo em qualquer eixo sempre encosta na borda; o alvo em si vira um
pentágono PERFEITO. A roda da pessoa só fica redonda quando os 5 eixos
estão em dia — e murcha exatamente onde falta rodar. Legenda nova embaixo
do radar: *"a roda da vida do Executivo Ideal — quanto mais redonda, mais
a carreira anda."*

**Prova:** 2 testes novos (`proporcoesExecutivoIdeal` capa em 1 por eixo;
`formacaoExecutivoIdeal` continua a mesma % de sempre depois do refactor).
Suíte 1626/1626, lint limpo, `npm run build` sem erro. Verificação em
navegador rodou de novo — confirmado visualmente que o pentágono tracejado
da meta agora é regular e a legenda aparece corretamente.

---

## DIR-109 — o mapa do jogador: radar dos 5 eixos do Executivo Ideal

**Emitida por:** dono (09/09/2026), mesma mensagem do DIR-107/108: *"a
gente também conversou sobre a visualização... a gente falou que ia
botar aí assim roda, você decidiu não botar em roda, pra gente ter um
mapa, um mapa da pessoa, como se fosse um relatório, tipo de jogador de
futebol que joga, que chuta... aonde ele está ruim ele tem que
potencializar, onde ele tem que melhorar."*

**O dado já existia** — `ciclo.taxas` × `EXECUTIVO_IDEAL` (MvM, Produção,
Real Time, Bônus/Estudo, Vendas) já formava as 5 barras do painel
"🎯 Onde estou × EXECUTIVO IDEAL", em `XGame.jsx` e `CrmMetodo.jsx`. Só
faltava o formato "roda" que o dono pediu — a barra mostra o número
certo, mas não a SILHUETA do desempenho num olhar só.

**O que entra:**
1. `RadarEixos.jsx` (novo) — um radar/pentágono em SVG puro (sem lib
   nova): pentágono do alvo do Executivo Ideal (contorno tracejado
   âmbar), sobreposto pela silhueta real da pessoa (preenchido, verde ou
   vermelho onde fica abaixo do alvo) — exatamente a leitura "onde chuta
   bem, onde tem que melhorar" de um mapa de jogador. Suporta os dois
   dialetos do app (`escuro`/`claro`), igual `BarraProgresso`.
2. `src/lib/xgame.js` ganhou `EIXOS_EXECUTIVO_IDEAL` — os mesmos 5 eixos
   de `EXECUTIVO_IDEAL`, com rótulo curto (cabe na ponta do radar) e
   emoji, pra não duplicar a leitura de dados entre o radar e as barras.
3. O radar aparece logo abaixo da barra de formação, ANTES da lista de
   barras — nas duas telas onde o painel Executivo Ideal já existe
   (`XGame.jsx` e `CrmMetodo.jsx`). Como o "MvM dele" do Quadro Geral do
   ADM já reaproveita `XGame.jsx` em `modoAdmin`, o Super Admin também
   passa a ver o radar de qualquer pessoa, sem código novo lá.

**Prova:** `tests/xgame.test.mjs` — 1 teste novo trava que
`EIXOS_EXECUTIVO_IDEAL` nunca desalinha de `EXECUTIVO_IDEAL` (mesmas
chaves, mesma ordem — senão o radar desenharia eixo fantasma ou
esqueceria um de verdade, em silêncio). Suíte 1624/1624, lint limpo,
`npm run build` sem erro. **Verificação em navegador rodou** — e achou
exatamente o bug que um componente visual novo costuma esconder: os
rótulos das pontas direita/esquerda ("Produção", "Real Time", "Vendas")
saíam cortados, porque o texto estica bem além do raio do pentágono e o
`<svg>` corta tudo que passa do `viewBox` por padrão. Corrigido com uma
folga (`PAD_X`/`PAD_Y`) reservada só pro texto, nas quatro direções — a
segunda foto confirma os 5 rótulos completos, sem corte.

---

## DIR-108 — o PDF compartilhável do Executivo chega no ADM X-Game

**Emitida por:** dono (09/09/2026), mesma mensagem do DIR-107: *"eu tinha
um compartilhamento de PDF em algum lugar, né, um compartilhamento
desse, de PDF dos números da pessoa, que eu não estou vendo digital, e
você tem que ver onde está, e também tem que puxar, duplicar esse
compartilhamento aqui dentro do painel administrativo da XGame."*

**Onde estava:** `PdfExecutivo.jsx`/`relatorioExecutivo.js` (06/09/2026,
"quero geração de PDF de cada executivo, pra ser compartilhado") — já
existia, mas só dentro do X-Performance (`PerformanceEquipe.jsx` /
`PainelCorporativo.jsx`), nunca no ADM X-Game.

**O que entra:**
1. O Quadro Geral (`XPerformanceGestao.jsx`) ganhou o botão **PDF** ao
   lado de "cobrar no WhatsApp", pra qualquer pessoa aberta — reusando o
   MESMO `PdfExecutivo`/`relatorioDoExecutivo` de sempre, sem duplicar
   lógica: um `PainelCorporativo` oculto (`embutido`, escondido com
   `hidden`) computa o relatório da pessoa via `onRelatorio`, exatamente
   como o X-Performance já fazia.
2. **Correção de bônus encontrada no caminho**: como o ADM X-Game não
   calcula os 8 Hábitos, `relatorioDoExecutivo` mostrava "Hábitos 0/8" —
   dado errado, não "não calculado". `habitos` agora é `null` por padrão
   (não mais `[]`): `null` omite o bloco/número de Hábitos inteiro;
   `[]` (quando alguém de fato computou e ninguém fez nada) continua
   mostrando "0/8" normalmente. Isso também corrigiu o mesmo problema que
   já existia silenciosamente no PDF "da própria pessoa" dentro do
   X-Performance (`PainelCorporativo` sem `habitos` passado).

**Prova:** `tests/relatorioExecutivo.test.mjs` — 1 teste novo trava a
distinção `null` (omite) × `[]` (mostra 0/8); o teste existente de
"relatório não quebra sem nada" foi ajustado pro novo comportamento
correto. Suíte 1623/1623, lint limpo, `npm run build` sem erro.
Verificação em navegador não rodou nesta rodada — recomendado gerar um
PDF ao vivo do Quadro Geral pra conferir o layout final.

---

## DIR-107 — o aviso da Fila do Pronto passa a comunicar por dentro (e pede resposta por dentro)

**Emitida por:** dono (09/09/2026), depois de testar o DIR-105 ao vivo:
*"funcionou... e esse aviso tem que ser no WhatsApp e comunicar por
dentro. A plataforma tem que se comunicar muito por dentro... tem que
enviar essa mensagem no WhatsApp, e pedir pra ele enviar por dentro,
sempre comunicar por dentro da plataforma... quando eu mandar no
WhatsApp, automaticamente ele comunica por dentro... eu quero sempre o
retorno deles dentro... e sempre ensinando o que é o pronto. Tem gente
que confunde muito, acha que o pronto é só quando termina a tarefa. A
gente tem que ensinar: se você estiver no meio da demanda, avise que
está fazendo, comunique."*

**O que entra:**
1. O botão **avisar** da Fila do Pronto agora SEMPRE cria, além do
   WhatsApp, uma mensagem interna (`xgame_mensagens`, tipo `aviso`) que
   cai direto na caixa "Mensagem pro CEO" da pessoa avisada — com o
   MESMO texto do WhatsApp. Comunicar por dentro deixou de ser opcional.
2. O texto do aviso (WhatsApp + interno) agora sempre termina pedindo
   *"responde por dentro da plataforma, na Mensagem pro CEO"*, e nos
   avisos 1º/2º ensina o conceito: *"o pronto não é só marcar como feito
   no fim — se você ainda está no meio da tarefa, avise que está em
   andamento."*
3. **Resposta por dentro** — `MensagemProCeo.jsx` ganhou "responder por
   dentro" em cada mensagem recebida: abre uma caixa de texto ali mesmo,
   sem sair da tela, e a resposta volta pro remetente original citando o
   trecho da mensagem original. Barra de qualidade mais baixa que iniciar
   contato (3 caracteres, não 20) — responder não pode exigir o mesmo
   esforço de quem chama o CEO.
4. `src/lib/mensagensXgame.js` ganhou os tipos `aviso` (⚠️, gerado pelo
   sistema) e `resposta` (↩️, gerado por quem responde) — só os 4 tipos
   originais (sugestão/pedido/agradecimento/demanda) continuam
   escolhíveis ao compor uma mensagem nova (`TIPOS_COMPOSIVEIS`).
5. Tooltip educativo na linha "pronto até" do dia de cada pessoa
   (`CrmMetodo.jsx`), pra reforçar o conceito no lugar onde ela realmente
   marca a tarefa.

**Sobre o resto do pedido** — o dono também pediu, na mesma mensagem,
um relatório profissional de tarefas, um "mapa do jogador" (radar tipo
futebol, mostrando onde a pessoa está pecando/tem que potencializar) e
pra localizar/duplicar dentro do ADM X-Game um compartilhamento de PDF
que já existe (`PdfExecutivo.jsx`/`relatorioExecutivo.js`, hoje só em
`PerformanceEquipe.jsx`/`PainelCorporativo.jsx`). Essas três frentes
seguem em rodadas separadas (DIR-108 e DIR-109), documentadas à parte —
esta entrada é só a comunicação por dentro.

**Prova:** `tests/mensagensXgame.test.mjs` — 2 testes novos (a barra de
`resposta` é mais baixa que a de iniciar contato; `aviso`/`resposta`
não aparecem como opção ao compor). Suíte 1620/1620, lint limpo,
`npm run build` sem erro. Verificação em navegador não rodou nesta
rodada (mesmo padrão do DIR-105/106).

---

## DIR-106 — Mensagem pro CEO: comunicação interna do time corporativo do X-GAME

**Emitida por:** dono (09/09/2026), na mesma mensagem do DIR-105: *"a
mensagem pro CEO, a mensagem pra diretoria, a mensagem pros executivos, a
gente tem que ter isso aí... eles precisam entender que pra falar com o
CEO, precisa, não pode ser bobeira, tá? Tem que ser algo assim que eles
queiram compartilhar, sugestão, pedido, agradecimento... e eles podem
mandar um pro outros, uns pros outros, demandas... todo mundo que faz
parte do time corporativo e que está no game, tem direito a fazer isso...
eu queria saber onde é que a gente vê isso, eu gostaria que você me
ajudasse. Tanto eu como super admin, tanto eles, aonde eles veem isso."*

**A decisão de onde fica** (a pergunta que o dono fez diretamente): dentro
da própria tela do X-Performance, que já é o espaço do time corporativo —
sem inventar uma página nova pra achar.
- **O time** vê e manda em "Mensagem pro CEO", uma dobra aberta por padrão
  dentro do X-Performance deles (a mesma tela do Encontro de Segunda e do
  quadro).
- **O Super Admin/CEO** vê tudo — inclusive as demandas de colega pra
  colega, porque quem enxerga o negócio inteiro precisa ver o negócio
  inteiro — numa caixa "Mensagens" dentro do ADM X-Game, ao lado de
  Distribuir Tarefa e da Fila do Pronto.

**O que entra:**
1. **Banco** — tabela nova `xgame_mensagens` (remetente, destino —
   ceo/diretoria/executivos/uma pessoa —, tipo — sugestão/pedido/
   agradecimento/demanda —, texto, lida, quando).
2. **`src/lib/mensagensXgame.js`** — a barra de qualidade que o dono pediu
   ("não pode ser bobeira"): `mensagemValida` exige destino, tipo e pelo
   menos 20 caracteres de texto. `papeisDoCargo` traduz o cargo do jogo
   (ceo/diretor/executivo, o mesmo que já vem de `xgame_participantes.cargo`
   via `cargoDoNivel`) pro destino coletivo que a pessoa recebe.
3. **`MensagemProCeo.jsx`** (novo) — a tela do time: escolhe destino (CEO,
   Diretoria, Executivos ou um colega específico), tipo, escreve, manda;
   vê as recebidas (com contador de não lidas) e as enviadas.
4. **`CaixaDeMensagensAdmin.jsx`** (novo) — a caixa do Super Admin: tudo
   que foi mandado, com filtro por destino e por tipo, contador de não
   lidas, marca como lida com 1 clique.

**O que ficou de fora desta rodada, de propósito:** notificação
proativa (push/WhatsApp quando chega mensagem nova) — por ora é preciso
abrir a caixa pra ver, igual o resto do painel. Se o volume de mensagens
justificar, entra numa rodada futura.

**Prova:** `tests/mensagensXgame.test.mjs` — 7 testes novos (validação da
barra de qualidade, ordenação, contagem de não lidas, quem recebe o quê
por papel, quem mandou o quê). Suíte 1619/1619, lint limpo, `npm run
build` sem erro. Verificação em navegador não rodou nesta rodada (mesmo
motivo do DIR-105: JSX novo, sem alterar nenhuma tela existente que já
tivesse prova em navegador) — recomendado revisar ao vivo com o time.

---

## DIR-105 — Fila do Pronto: régua graduada de avisos (3 chances antes de zerar) + botões avisar/excluir

**Emitida por:** dono (09/09/2026), olhando dois atrasos de "Emannuel Lima"
na Fila do Pronto: *"tem que me dar a opção de zerar o ponto da pessoa,
mas antes de zerar o ponto dela, eu dar uma cobrada o primeiro aviso.
Essa pessoa tem que ter três avisos. Ela pode perder até três pontos. Pra
treinar ela. A partir do quarto ponto que ela não entregar, ela vai zerar
a pontuação (...) eu aqui no Admin tenho que ter [um botão], avisar ela
de mandar um pronto, ela não retornou, e aí eu retorno pra ela e falo:
olha, você não me deu pronto, estou te avisando a primeira vez. A partir
do terceiro pronto que eu te pedi você não voltar, ela vai entrar a
mensagem do CEO pra ela (...) você não me deu nenhum botão aqui no ADM,
eu já tinha te pedido isso. E também eu tenho que ter o botão de excluir,
porque eu posso desistir desse pronto."*

**Data:** 09/09/2026.

**O que entra:**
1. **Banco** — `xgame_participantes.avisos_pronto` (contador, default 0,
   reset manual pelo admin — o dono foi explícito: *"depois que ela
   aprendeu, eu não posso mais ficar avisando toda hora"*, ou seja, quem
   decide quando zerar o contador é o admin, não o sistema sozinho) e
   `metodo_tarefas.aviso_pronto_em` (marca que ESSE atraso específico já
   foi avisado, pra não avisar a mesma tarefa duas vezes).
2. **`src/lib/xgame.js`** — a régua radical do DIR-102 (zerar MvM, Human
   Token, pontos e X-Pay do dia inteiro) só entra a partir do **4º** aviso
   (`avisos_pronto >= 3`). Do 1º ao 3º, só desconta até 3 pontos — o resto
   do dia (MvM, Human Token, X-Pay) fica intacto. Novos campos no retorno:
   `em_aviso_pronto` (true nos 3 primeiros) e `avisos_pronto` (o contador
   atual, pra tela mostrar "aviso X de 3").
3. **A Fila do Pronto** (`XPerformanceGestao.jsx`) ganhou os dois botões
   que faltavam num item atrasado:
   - **avisar** — soma 1 no contador da pessoa, marca a tarefa como avisada
     e abre o WhatsApp com uma mensagem pronta: 1º e 2º aviso é cobrança
     normal ("estou te avisando..."); do 3º em diante vira a "mensagem do
     CEO" (tom sério, avisando que o PRÓXIMO atraso zera tudo).
   - **excluir** — apaga a tarefa (mesmo mecanismo do `desfazer` que já
     existia pra Distribuir Tarefa) — "desistir desse pronto", sem afetar
     pontuação.
   O texto de aviso embaixo de cada item atrasado agora mostra quantos
   avisos já foram dados e se já é treino ou já zerou o dia.
4. Banner âmbar novo em `XGame.jsx` e `CrmMetodo.jsx` pro 1º-3º aviso
   ("AVISO X DE 3" — perdeu pontos, mas MvM/Human Token/X-Pay de pé),
   distinto do banner vermelho "DIA ZERADO" que continua valendo do 4º
   aviso em diante.

**Prova:** `tests/xgame.test.mjs` — 2 testes novos travam a régua graduada
(0/1/2 avisos só descontam pontos, mantendo MvM/Token/X-Pay intactos; 3+
avisos mantém o zero radical de sempre). Suíte 1612/1612, lint limpo,
`npm run build` sem erro. Verificação visual dos botões não rodou em
navegador nesta rodada (JSX segue exatamente o padrão já provado dos
botões conferir/devolver e do link de WhatsApp já existente em
`QuadroGeralTopo`) — recomendado revisar ao vivo na próxima janela de
teste com o time.

---

## DIR-104 — corrige sincronismo: Human Token e MvM do Dia na XGame.jsx usavam o número errado

**Emitida por:** dono (09/09/2026), olhando o painel da Beatriz Sant'anna
como Super Admin: *"estou olhando aqui o caminho vermelho dela está
zerado, apesar de já estar aparecendo ali as votações dela lá embaixo. O
painel tem que ter sincronismo, vamos olhar esse sincronismo aí e ver o
que está funcionando e que não está. Olha tudo por dentro, vê o que está
errado, faz uma análise aí pra gente corrigir tudo. Tem que estar tudo
funcionando."*

**Data:** 09/09/2026.

**O bug:** `src/pages/XGame.jsx` (a tela usada no "MvM dele" do Quadro
Geral do ADM, em `modoAdmin`) mostrava nos cartões "Human Token" e "MvM do
Dia" o número AUTOMÁTICO do dia (`resumo.token_dia`/`resumo.mvm_dia`), não
o número OFICIAL do ciclo (`ciclo.total`/`ciclo.taxas.mvm`, vindo da
votação real dos colegas) — que o painel "Executivo Ideal", na mesma tela,
já usava corretamente. Confirmado com consulta direta no Supabase de
produção: a Beatriz tinha votos registrados hoje em `xgame_votos_mvm`, mas
o cartão "Human Token" continuava zerado porque lia a conta errada.
`src/components/licensing/CentralVendas/CrmMetodo.jsx` (o Compromisso) já
fazia certo — os dois cartões só precisavam ler a mesma variável que lá.

**O que entra:**
1. "Human Token" agora mostra `ciclo.faixa.medalha` + `ciclo.total` (o
   valor oficial do ciclo, com a medalha de faixa), não mais o automático
   do dia.
2. "MvM do Dia" continua mostrando o automático (`resumo.mvm_dia` — é uma
   métrica diferente e legítima), mas agora com um texto extra "· votação
   do ciclo: X" ao lado, e uma dica explicando a diferença entre as duas
   MvM (a automática desconta por atraso; a da votação é a que vale pro
   Human Token oficial) — pra ninguém mais achar que são a mesma coisa ou
   que uma está "errada" quando a outra cai.

**Prova:** suíte 1609/1609, lint limpo, `npm run build` sem erro.

---

## DIR-103 — % de reunião do time chega na Verificação do Progresso (o alcance que faltava do DIR-102)

**Emitida por:** dono (09/09/2026): *"eu quero esse alcance, o que
sugere???"* — sobre a limitação registrada no DIR-102 (o % de reunião só
tinha entrado no ADM X-Game, não na Verificação do Progresso).

**Data:** 09/09/2026.

**A sugestão aceita:** sem coluna nova no banco e sem consulta a mais.
`resumoDoDia()` já calcula `contagens` (produção, bônus, vendas), e os dois
lugares que gravam o placar do dia (`CrmMetodo.jsx`, `XGame.jsx`) já
espalham esse objeto inteiro dentro de `xgame_diario.detalhes` via
`...contagens` — só faltava reunião entrar nessa mesma conta.

**O que entra:**
1. `src/lib/xgame.js` — `contagens.reunioes_total`/`reunioes_feitas` (usa
   `ehTarefaDeReuniao`, do DIR-102), gravado automaticamente no retrato do
   dia pelos dois pontos que já faziam o upsert — nenhum dos dois precisou
   de código novo.
2. `src/components/licensing/CentralVendas/XGameVisaoExecutiva.jsx` — lê
   `detalhes.reunioes_total`/`reunioes_feitas` de hoje, soma pro time, e
   ganha um sexto cartão no Pulso: "Reuniões do time hoje".

**Prova:** `tests/xgame.test.mjs` — novo teste trava a contagem
(`reuniões_total`/`feitas` só conta título de reunião/apresentação/
encontro/call, o resto não entra). Suíte 1594/1594,
`tests/navegador/xgameEspaco.spec.mjs` verde, lint e build limpos.

---

## DIR-102 — Atraso na Fila do Pronto zera o dia (mesma régua radical do MvM); painel do time ganha reuniões e atrasadas; histórico vira relatório

**Emitida por:** dono (08/09/2026), continuação do DIR-101: *"se o cara se
atrasou, eu tenho que ter uma mensagem pro cara, e isso tirar pontos dele.
Além de ele perder o dinheiro, isso tem que tirar pontos. E ter uma
historicidade pra eu até mostrar o relatório da pessoa de todos os
pontos."* Sobre o mecanismo exato e o "percentual de reunião do time",
perguntado e respondido: *"como você acha que deve ser"* / *"o melhor
possível, pense grande, dados é o que manda, quanto mais e melhor visível
melhor."*

**Data:** 08/09/2026.

**Decisões tomadas (delegadas pelo dono):**
1. Penalidade de atraso = reaproveitar a régua radical do não-votar, não
   inventar um desconto novo — atrasar o "pronto até" de uma tarefa da
   gestão zera o dia inteiro (MvM, Human Token, pontos e X-Pay), a punição
   mais séria que o jogo já tem.
2. "Percentual de reunião do time" = tarefas do dia cujo título bate com
   reunião/apresentação/encontro/call (mesma régua de título que o app já
   usa em outros lugares pra ícone e peso), feitas ÷ total, hoje.

**O que entra:**
1. `src/lib/xgame.js` — `ehTarefaDeReuniao(titulo)` (nova); `resumoDoDia()`
   ganha `perdeuPorAtrasoPronto`: alguma tarefa de gestão (`origem: 'xperf'`,
   com `prazo_em`) vencida e sem o pronto zera o dia — MESMO efeito do não
   votar, com campo próprio (`perdeu_por_atraso_pronto`) pra não confundir
   a causa na tela. Só julga em tempo real (`votouEmTodos !== null`) — um
   dia histórico não se recalcula.
2. `CrmMetodo.jsx` e `XGame.jsx` — nova mensagem pro atrasado: "DIA ZERADO
   — uma tarefa da gestão passou do pronto até", mesmo peso visual do
   alerta de não-votar.
3. `XPerformanceGestao.jsx` — o resumo do time ganhou reuniões do dia
   (feitas/total) e atrasadas na Fila do Pronto (destacado em vermelho
   quando > 0); a própria Fila do Pronto avisa, item a item, quando o
   atraso já zerou o dia da pessoa.
4. `QuadroGeralAbas.jsx` (`AbaHistorico`) — virou o relatório que faltava:
   conta quantos atrasos zeraram o dia inteiro no ciclo, e marca cada item
   vencido com o mesmo aviso.

**O que ficou de fora, por decisão consciente de escopo:** o percentual de
reunião não entrou em `XGameVisaoExecutiva.jsx` (Verificação do Progresso)
porque a fonte de dados de lá é o retrato já gravado em `xgame_diario`, que
não guarda título de tarefa — só entrou no ADM X-Game, que lê a tabela ao
vivo. Trazer pra lá também exigiria uma nova coluna no retrato diário ou
uma consulta ao vivo adicional — fica pra quando o dono quiser esse
alcance.

**Prova:** `tests/xgame.test.mjs` — 4 testes novos (`resumoDoDia` com
tarefa xperf vencida zera; dentro do prazo ou já pronta não pune; tarefa da
rotina sem `prazo_em` não conta; dia histórico não recalcula). Suíte
1593/1593, `tests/navegador/performance.spec.mjs` 26/26 em navegador real,
lint e build limpos.

---

## DIR-101 — ADM X-Game reorganizado: ciclo de cada um no topo, Distribuir Tarefa vira painel, resumo do time e faxina nas dobras genéricas

**Emitida por:** dono (08/09/2026), olhando o painel administrativo ao vivo:
*"quero trazer o ciclo de vendas de participante pra cima. E embaixo do
ciclo de vendas de participante, eu quero a distribuição de tarefa, mas
como um modal de abertura, não esse quadradão que vem de cara. Essa
diretoria [encontro de segunda + o quadro] pode tirar, foi um começo que a
gente não fez, não está legal. E a mentalidade está muito genérica, muito
feia — pode tirar isso também, já tem tudo isso, depois a gente faz um
negócio melhor. (...) Eu quero também a quantidade de tarefas que nós temos
do grupo — quantas tarefas, quanto o time concluiu, qual o percentual.
Isso pode aparecer na verificação do progresso mas também tem que ter
aqui."*

**Data:** 08/09/2026.

**O que entra:**
1. `src/components/licensing/CentralVendas/XPerformanceGestao.jsx` — o
   "Quadro Geral de cada um" (o ciclo financeiro de cada participante:
   ganho, a conferir, em jogo, perdido) virou a PRIMEIRA coisa da tela.
   "Distribuir Tarefa" deixou de vir sempre aberta — agora é um botão
   ("Distribuir tarefa ▾") que abre o painel dela, embaixo do Quadro Geral,
   e continua acessível mesmo com o painel de alguém aberto.
2. Novo resumo no topo de tudo: quantas pessoas no time corporativo, quantas
   tarefas o time tem hoje, quantas concluiu e o percentual — a mesma conta
   entra em `XGameVisaoExecutiva.jsx` (Verificação do Progresso), como um
   quinto cartão do Pulso da equipe.
3. `src/components/licensing/CentralVendas/XPerformance.jsx` — as duas
   dobras que ficavam abaixo da gestão saíram: "Diretoria: encontro de
   segunda e o quadro" (um começo que não vingou) e "Sobre: as três
   mentalidades e o grupo To The Top" (a explicação genérica das
   mentalidades). O Encontro de Segunda e o Quadro continuam existindo pra
   quem NÃO é gestão — só saíram do painel do super admin.

**O que fica pra depois, por falta de definição ainda (dono pediu análise,
não decidiu os números):** mensagem automática + desconto de pontos por
atraso na Fila do Pronto, arquivar com histórico/relatório da pessoa, e o
"percentual de reunião do time" — ver a mensagem de acompanhamento desta
sessão com a análise e as perguntas em aberto.

**Prova:** `tests/navegador/performance.spec.mjs` — `abrir()` agora abre o
painel de Distribuir antes de usar os campos dela; a FAXINA foi reescrita
pra confirmar que as duas dobras sumiram; teste novo confirma que o resumo
do time é a primeira coisa da gestão. Suíte 25/25 em navegador real,
1588/1588 na suíte principal, lint e build limpos.

---

## DIR-100 — Jornada: setas de navegar sem expandir, com prévia no mouse e no dedo

**Emitida por:** dono (08/09/2026), sobre a tela do Momento: *"a gente tem um botão de passar pra frente ou pra trás... quando a gente passa esse mouse em cima do botão, tanto no desktop quanto no celular, essa tarefa entra numa prévia, uma expansão da tarefa... e volta quando a gente tirar o mouse. Como isso funcionaria no celular? Colocasse o dedo em cima, abrisse uma prévia."* E, sobre os botões da jornada expandida: *"eu tenho que clicar pra saber o que cada botão é — quando eu passar o mouse em cima, ele já dá uma expandida, bem rápido."*

**Data:** 08/09/2026.

**O que entra:**
1. `src/components/licensing/CentralVendas/XGameJornada.jsx` — o Momento
   ganha duas setas (◀ ▶) ao lado da moeda grande, navegando só entre os
   passos PENDENTES (os feitos já têm o rastro embaixo). Passar o mouse (ou
   encostar o dedo, `onTouchStart`) numa seta mostra uma bolha com o nome +
   horário do passo vizinho, sem trocar de tela; tirar o mouse esconde;
   clicar/soltar comete a troca. Sem passo naquele lado, o espaço fica vazio
   (sem seta morta, sem pular o layout).
2. `PreviaBolha` (novo, compartilhado) — a mesma bolha também substitui o
   tooltip nativo lento dos botões da jornada expandida (`Parada3D`): hover
   ou toque mostra nome + horário na hora, em vez do `title` do navegador
   (que não existe no toque e demora pra aparecer no mouse).

**Prova:** `npx eslint` limpo, suíte 1588/1588, `npm run build` sem erro;
`tests/navegador/jornadaCapa.spec.mjs` (não usa os botões tocados) segue
verde/skip conforme o ambiente.

---

## DIR-99 — Cadastro no X-GAME vira multi-seleção: marcar vários do Time Corporativo de uma vez

**Emitida por:** dono (08/09/2026): *"agora vai lá no administrativo e seleciona as pessoas do topo em que a gente vai colocar na gamificação, porque nem todo mundo que está no topo, que são o grupo corporativo, estão na gamificação — eu preciso selecionar as pessoas que estão, pra elas serem votadas."*

**Data:** 08/09/2026.

**O que já existia:** `XGameAdmin.jsx` já buscava candidatos agrupados pelo
plano de carreira (`GRUPOS_BUSCA`, com "👔 Time Corporativo" = o bloco
diretor + admins), e cadastrava em `xgame_participantes` (quem está ativo
ali é quem vota e recebe voto na MvM) — mas só deixava marcar **uma pessoa
por vez**, cadastrar, buscar de novo, marcar a próxima.

**O que entra:**
1. `src/components/licensing/XGameAdmin.jsx` — a seleção vira multi (estado
   `selecionados`, array de ids, no lugar do `novo` de uma string só). Cada
   pessoa clicada entra/sai da seleção sem perder as outras.
2. Botão "☐ marcar todo o grupo" / "✔ desmarcar" no cabeçalho de cada grupo
   da busca (ex.: Time Corporativo inteiro) — marca ou desmarca todo mundo
   daquele grupo de uma vez, sem clicar pessoa por pessoa.
3. `adicionar()` agora faz um único `upsert` em lote com todos os
   selecionados, e o botão mostra a contagem ("Cadastrar 4 selecionados").

**Prova:** `npx eslint` limpo, suíte 1588/1588 e `npm run build` sem erro
(o componente não tinha teste de unidade próprio — é lógica de estado de UI
sobre uma tabela já coberta por `tests/xgame.test.mjs`).

---

## DIR-98 — X-GAME ganha espaço dedicado, recuperação de fim de semana e visão executiva com pódio

**Emitida por:** dono (08/09/2026), em vários pedidos que convergiram no
mesmo lote de publicação: a página `XGame.jsx` (até aqui órfã, sem link em
lugar nenhum) virou o espaço individual completo do jogo; *"se ele perder as
tarefas do dia, pode recompensar no fim de semana, comprovando que fez, pra
manter o fixo — sem lesar, sem se ferrar"*; *"você esqueceu de botar pessoal
meu"* (três vezes, sobre a Visão Executiva enterrar "VOCÊ" no fim de uma
lista de 10+ linhas); e *"esse ranking com emoji está muito feio... deixa
mais clean, mais Vale do Silício"*.

**Data:** 08/09/2026.

**O que entra:**
1. `src/pages/XGame.jsx` — deixa de ser uma tela órfã e ganha X-Pay, ofensiva
   (fogo) e missões da semana, que só existiam no Compromisso; passa a usar
   `resumoDoDia()` com o mesmo participante/ciclo oficial, e a seção do time
   é a mesma `XGameVisaoExecutiva` já usada na Verificação do Progresso —
   nada duplicado. A gravação do placar (`xgame_diario`) ganha `xpay_ganho`/
   `xpay_perdido`, que antes faltavam aqui e sobrescreviam dado incompleto
   por cima do que o Compromisso já tinha gravado certo.
2. `src/lib/xgame.js` — recuperação no fim de semana: `ehFimDeSemana()` e
   `podeRecuperarNoFds()` liberam repor, sem teto de quantidade, uma tarefa
   PERDIDA comprovando que foi feita — mas só dentro do fim de semana DO
   MESMO CICLO em que a tarefa foi perdida. O X-Pay da tarefa volta
   (`xpay_recuperado`); a nota do dia (Real Time) continua honesta, marcando
   que foi tarde.
3. `src/components/licensing/CentralVendas/XGameVisaoExecutiva.jsx` — pódio
   visual (2º·1º·3º em ordem de palco, com altura/cor por posição), cartão
   "onde eu estou" sempre no topo (nome + posição no ranking, antes de
   qualquer coisa do time), e o selo de liga trocou emoji por um ponto de
   cor (`SeloLiga`) — mesma informação, sem "figurinha".
4. `src/components/licensing/CentralVendas/VerificacaoUI.jsx` (novo) — a
   `BarraProgresso` compartilhada entre as 9 telas que desenhavam sua
   própria barra de progresso (motivo da limpeza de emergência da
   X-Performance em 07/09); mesmo visual de cada tela, só nomeado num lugar
   só, com os dois dialetos do app (`claro`/`escuro`).

**Prova:** `tests/xgameRecuperacaoFds.test.mjs` (novo), `tests/xgame.test.mjs`
estendido, `tests/navegador/xgameEspaco.spec.mjs` e
`tests/navegador/verificacaoUI.spec.mjs` (novos, prova em navegador real);
suíte e build verificados antes do push.

---

## DIR-97 — Janela de votação da MvM vira 17h–20h ideal + 20h–21h30 última chance; não fechar o voto zera o DIA INTEIRO (dinheiro incluído)

**Emitida por:** dono (08/09/2026). Primeiro: *"a votação tem que ser de 17h
às 20h, é a ação mais importante do dia, junto com as vendas"* — a janela
antiga (20h–22h) pegava gente já fora do ar (jantar, família, dormindo),
punindo indisponibilidade, não desleixo. Depois, sem meio-termo: *"não vou,
perde o dinheiro, perde a MvM, perde tudo do dia... precisa ser radical."*
E sobre o horário final não ser meia-noite: *"ninguém acorda tarde aqui,
todo mundo tem que estar dormindo antes das dez, todo mundo acorda às cinco
da manhã."*

**Data:** 08/09/2026.

**O que entra:**
1. `src/lib/xgame.js` — `VOTACAO_INICIO_MIN` (17h) e `VOTACAO_IDEAL_FIM_MIN`
   (20h) marcam a janela ideal; `VOTACAO_FIM_MIN` (21h30) é a "última
   chance" — de 20h às 21h30 ainda dá pra fechar o voto em todos, sem
   desconto nenhum (protege quem está numa reunião ou atrasou de verdade).
   Só depois das 21h30, sem fechar TODOS os colegas, a régua radical entra.
   Novo helper `horaDeMin(min)` formata `"17h"` ou `"21h30"` (com minutos
   quando não é hora cheia) pra tela e guia nunca escreverem o horário à
   mão.
2. `resumoDoDia()` — não fechar a votação até as 21h30 não zera só a MvM:
   zera o DIA INTEIRO — MvM, Human Token, pontos, e o X-Pay que seria ganho
   vira PERDIDO de verdade (registrado, não some em silêncio).
3. `src/lib/guiaXGame.js`, `src/components/licensing/CentralVendas/CrmMetodo.jsx`,
   `src/pages/XGame.jsx` e `src/components/licensing/XGameAdmin.jsx` — todo
   texto que citava "20h às 22h" (aula, dicionário, tooltips do placar,
   alerta de MvM zerada, rótulo do painel admin) passou a ler
   `horaDeMin(VOTACAO_INICIO_MIN)`/`horaDeMin(VOTACAO_FIM_MIN)`, e os
   alertas de "MvM zerada" viraram "DIA ZERADO", deixando explícito que
   Human Token, pontos e X-Pay caem junto — não só a MvM.

**Prova:** `tests/guiaXGame.test.mjs` ajustado pra não travar mais o texto
"22h" (a régua real fecha às 21h30, com a janela ideal terminando às 20h);
suíte e build verificados antes do push.

---

## DIR-96 — Super Admin sai da votação por padrão; não votar em todos zera a MvM do Dia

**Emitida por:** dono (08/09/2026): *"Super Admin não pode ser votado a não
ser que ele esteja participando por dentro de uma mentoria, não é viável
nem saudável pro negócio se expor tanto o principal, ainda mais quando as
pessoas às vezes não têm capacidade de votar em um mentor, salvo se ele
permitir ser votado no MvM. (...) a falta de voto dos integrantes uns nos
outros zera o dia — isso precisa ser explícito tanto na X-Game e no Guia do
Usuário, bem grande, bem explícito. Isso é uma das coisas principais da
gamificação."* Pedido de análise e confirmação de entendimento antes do
código — a análise identificou a MvM Manual (votação das 10 Virtudes, 20h–
22h) já existente e implementada, sem nenhuma das duas regras. Depois da
análise, o dono confirmou por pergunta direta: votar precisa ser em TODOS
os colegas ativos (não basta votar em alguém), e a punição é zerar a MvM do
Dia (não só capar o Human Token, como já fazia a trava de estudo).

**Data:** 08/09/2026.

**O que entra:**
1. `supabase/migrations/20260908200000_xgame_super_admin_votavel.sql` —
   `xgame_participantes.aceita_ser_votado` (default `true`, aplicada em
   produção). Só tem efeito prático pra quem é `super_admin`.
2. `src/lib/xgame.js` — `podeSerVotado({role, aceita_ser_votado})`: só o
   cargo super_admin precisa do interruptor ligado pra aparecer votável;
   todo mundo mais continua exatamente como sempre foi.
   `votouEmTodosOsColegas(colegasIds, votadosCompletosIds)`: precisa fechar
   TODOS os colegas votáveis do dia — voto parcial não conta.
   `resumoDoDia()` ganhou `votouEmTodos` (default `null` — comportamento
   intocado pra quem não informa): com a janela de votação fechada (22h) e
   `votouEmTodos === false`, a MvM do Dia vira ZERO — cascata real pro Human
   Token do dia, não só um aviso na tela.
3. `CrmMetodo.jsx` (o jogo de verdade, Hábito 2) e `pages/XGame.jsx` (o
   placar "só de olhar", que também grava `xgame_diario` e por isso
   precisava da MESMA régua, senão reescreveria por cima a nota zerada) —
   colegas votáveis cruzam com o `role`; um interruptor "Aceito ser votado
   na MvM" aparece só pro próprio super_admin; um alerta vermelho, do
   tamanho do problema (não escondido dentro do bloco recolhível da
   votação), avisa quando a MvM zerou por falta de voto.
4. `XGameAdmin.jsx` — o painel de quem gerencia o time mostra "🛡️ não
   votável (Super Admin)" quando é o caso, pra ninguém achar que a pessoa
   "sumiu" da lista sem explicação. Só leitura — quem liga/desliga é o
   próprio super_admin, na tela dele.
5. `src/lib/guiaXGame.js` — nova aula "A votação das 20h às 22h — e o que
   acontece se você esquecer", com uma caixa de tom PRÓPRIO (`perigo`,
   vermelho — mais forte que o `atencao` âmbar já existente) escrevendo a
   punição sem eufemismo. Até aqui o guia só documentava a MvM AUTOMÁTICA;
   a votação manual nunca tinha sido ensinada em lugar nenhum.

**Prova:** `tests/xgame.test.mjs` (novo) — `podeSerVotado`, `votouEmTodosOsColegas`
e `resumoDoDia` com a janela aberta/fechada, votou/não votou, e sem informar
(compatibilidade); `tests/guiaXGame.test.mjs` — trava a aula existindo com a
palavra "ZERA", "TODOS os colegas" e o tom `perigo` de verdade. Suíte
1577/1577, build limpo, lint sem erro novo.

---

## DIR-89 — Tirar admin e tirar diretoria juntos ficava mudo; sair da diretoria não soltava o X-Game

**Emitida por:** dono (08/09/2026), com prints do Painel de Controle editando
Aline Mendes Rossa: *"não estou conseguindo editar esse usuário, ela era
diretora e agora não está salvando, faça a análise e me diga o que houve. E
quando eu altero isso, todas as funções dentro da diretoria na X-Game
precisam atualizar também, entendeu?"*

**Data:** 08/09/2026.

**O achado (confirmado no banco real, não só no código):** Aline está com
`role: 'admin'` e `career_levels: ['usuario', 'diretoria_operacao']`. O dono
tentou, na MESMA tela, tirar o admin dela (Permissão de Trabalho → Usuário
Comum) E tirar o cargo de diretoria (só "Usuário" marcado). A trava
anti-rebaixamento de `adminUpdateUser.js` — que existe pra ninguém perder
acesso de admin sem querer, desde um incidente com um super_admin em 12/07 —
apaga `role`, `career_levels` E `primary_career_level` do payload inteiro
sempre que `role` sai de admin/super_admin sem confirmação explícita
(`allow_role_downgrade`). Ela agiu certo, mas CALADA: respondia sucesso, e
a tela só descobria pela releitura de conferência, com uma mensagem genérica
("o servidor não confirmou").

**O que entra:**
1. `api/functions/adminUpdateUser.js` — a trava agora devolve
   `camposProtegidos` (quais campos foram barrados) em vez de fingir sucesso
   liso; `src/api/plataformaAdapter.js` trata isso como falha de verdade
   quando `allow_role_downgrade` não foi confirmado, com uma mensagem que diz
   exatamente o que fazer.
2. `UserEditModal.jsx` — detecta ANTES de salvar que a edição tira alguém do
   admin/super_admin; pergunta com `window.confirm` (nomeando a pessoa) e,
   confirmando, manda `allow_role_downgrade: true` — as duas mudanças (acesso
   e cargo) vão juntas, do jeito que o dono realmente quis.
3. **A ponte com o X-Game:** `adminUpdateUser.js` agora compara o
   `career_levels` de antes com o de depois; quem SAI inteiramente do bloco
   "diretor" do plano (nenhum cargo institucional sobra) tem a participação
   ativa dela em `xgame_participantes` desativada (`ativo:false`, preserva
   histórico) automaticamente — sem precisar ir noutra tela desativar na mão.
   A tela avisa quantas participações foram desativadas no toast de sucesso.

**Prova:** `tests/adminUpdateUser.test.mjs` (novo) — a trava barra sem
confirmar e avisa o quê; com `allow_role_downgrade` as duas mudanças vão
juntas; sair da diretoria desativa a participação no X-Game; continuar na
diretoria (trocar de cargo institucional) não mexe nela; quem nunca esteve
na diretoria não gera escrita nenhuma. Suíte 1412/1412, build limpo, lint
sem erro novo.

---

## DIR-88 — O Encontro da Mentalidade "alucinava": era a própria conversa virando pauta

**Emitida por:** dono (07/09/2026), com prints do Encontro da Mentalidade real
(07/09) mostrando 10 "tópicos" quebrados: *"ela está alucinando, ela me faz
umas perguntas aqui pra eu dar o tema da apresentação, e ela não me dá lugar
lá pra editar... quando eu já botei o tema, aí ela decide botar hábito
automático (...) Ela tem que seguir o que eu escrevo (...) não pode
alucinar (...) no ruim no ruim, os cards da apresentação botar pra eu
editar, pra eu escrever, pra eu apagar, numa emergência. Faz uma análise aí
pra gente poder deixar isso perfeito."* Pedido de análise antes do código.

**Data:** 07/09/2026.

**O achado (não é a IA inventando fatos — é mistura de texto):** os 10
"tópicos" da reunião real eram, um por um, a pergunta do próprio app
("Qual vai ser o livro de hoje?") alternada com a resposta do dono —
incluindo a palavra "pronto" (que fecha a conversa) virando um tópico
("Resolver: 'pronto'"). Isso só acontece de um jeito: o texto que virou
pauta veio da CONVERSA INTEIRA colada na caixa "colar tudo", não das
respostas isoladas. O modo "conversar" (o chat, já padrão) isola certinho
cada resposta — quem falhava era "colar tudo": ele quebra qualquer linha
colada em um tópico, sem saber diferenciar "isto é uma pauta real" de
"isto é o app falando". Efeito colateral: como o "livro"/"foco da
leitura"/"treinamento" só existem no modo conversa, a Leitura caiu no
Hábito genérico do mês em vez do livro que o dono escolheu — não porque a
régua ignorou o que ele disse, mas porque o que ele disse nunca chegou
como "livro" (chegou misturado com pergunta, no campo errado).

**O que entra:**
1. `src/lib/encontro.js` — `ehPerguntaDoApp()` reconhece uma linha que é a
   pergunta do app (ou "pronto"/variações) e `pautasDoTexto()` descarta essas
   linhas antes de virarem pauta; `pautasDescartadasDoTexto()` devolve o que
   foi descartado, pra tela avisar por quê sobrou menos pauta que linha
   colada. `contextoDaConversa()` ganhou o mesmo filtro como segunda trava.
2. `EncontroMentalidade.jsx` — ao gerar pelo modo "colar tudo", um toast
   avisa quantas linhas foram ignoradas por serem a própria pergunta do app,
   com exemplo, e recomenda usar o modo "conversar" pra isso não acontecer.
3. **A válvula de emergência que faltava:** dentro de "editar" (que já
   existia e só deixava reescrever), cada tópico da reunião ganhou um ✕ pra
   apagar, e a lista ganhou "+ novo tópico" pra escrever um do zero — sem
   depender de regenerar tudo ou da IA.

**Fora de escopo (recomendação, não mudança de código):** o registro real
de 07/09, já salvo com os tópicos quebrados, continua quebrado até ser
regenerado — a tela já tinha (e continua tendo) o botão "apagar e começar
do zero"; a recomendação é usar o modo "conversar" (padrão) desta vez,
respondendo uma pergunta de cada vez em vez de colar a conversa inteira.

**Prova:** teste novo reproduz o print exato (as 10 linhas coladas, uma por
uma) e confirma que sobram só as 5 pautas reais; suíte 1402/1402, build
limpo, lint sem erro novo.

---

## DIR-87 — Reunião da empresa não aparece duplicada no Hábito 4

**Emitida por:** dono (07/09/2026), com print do Hábito 4 (Contato e Convite):
*"eu ia apagar esse segundo aí, olha, porque a gente já organiza em outro
lugar — não, acho que é aqui mesmo (Contato e Convite). Melhorar essa
[lista] de cima, que não está muito clara."* Pediu minha recomendação
("o que você acha melhor?") em vez de prescrever a solução.

**Data:** 07/09/2026.

**O que existia:** a reunião fixa da empresa (ex.: "Mentalidade do Diretor
/ CEO, toda segunda 09h") aparecia DUAS vezes, empilhada na mesma tela: uma
vez dentro de "Minha agenda de hoje" (destacada, 🏛️ — correto, é hoje) e de
novo, sempre aberta, no card de gestão "Reuniões da empresa" logo abaixo —
que lista TODAS as reuniões fixas cadastradas (não só as de hoje), pra quem
pode excluir/gerenciar. Duas listas parecidas, uma embaixo da outra, sempre
visíveis — lia como duplicado, mesmo não sendo (uma é "o que é hoje", a
outra é "o cadastro completo").

**Minha recomendação, aplicada:** manter as duas funções (a agenda de hoje
precisa mostrar o que é hoje; a gestão precisa do cadastro completo pra
excluir), mas o card de gestão vira **fechado por padrão** — some da rolagem
constante, e abre com um clique ("Reuniões fixas da empresa ▾") só quando
alguém realmente vai cadastrar ou excluir uma. Resolve a leitura de
duplicado sem tirar nenhuma função: "cadastra uma vez" não precisa ficar
exposto o tempo todo.

**Código:** `CrmMetodo.jsx` — estado `gestaoEmpresaAberta` (default
`false`); o cabeçalho do card virou um botão com chevron que alterna a
lista + formulário de cadastro.

**Prova:** suíte 1390/1390, build limpo, lint sem erro novo.

---

## DIR-86 — Dentro da Top College, tudo puxa pra identidade visual da casa

**Emitida por:** dono (07/09/2026), com 5 prints do seletor e das seções
Mentalidade/Time/ADM X-Game/Carreira: *"aqui puxar pra tipografia da Top
College, da logo da Top College e da x traço (...) as cores do ícone não são
verde, puxar pra identidade visual da Top College (...) esse método está com
o nome, o de baixo está com o outro, manter a mesma a mesma tipologia (...)
Dentro da Top College precisa tudo puxar pra identidade visual todas as
páginas, não pode ser branco (...) tem que puxar a mesma tipologia, a mesma
identidade visual pra ficar tudo perfeito. Faz essa análise aí pra gente
deixar tudo perfeito."*

**Data:** 07/09/2026.

**O que existia:** dentro da faculdade (fundo preto `--xeos-preto`
estabelecido no Hero), várias seções ainda usavam o verde/marrom da
OPERAÇÃO (Leilão NoZap) ou `Card`s brancos soltos no meio da faixa escura —
resíduo de terem sido construídas antes da identidade Top College existir:
o ícone do seletor sem `marca` própria (Mentalidade/Time/ADM X-Game/Carreira)
ficava verde mesmo em modo escuro; a seção Carreira era um `Card` branco;
a aba Time/Vendedores (`RoleLinksGrid`, `SellersListPanel`, o modal de
cadastro) era inteiramente marrom/verde/branca.

**O que entra — pergunta feita ao dono e respondida (`AskUserQuestion`):**
"cromado + gradiente azul→magenta" (moderação: o par de cores da casa é
destaque pontual — um botão por card, não tudo colorido — o resto é
branco/prata sobre o preto, espelhando o próprio Hero).

1. **`CentralVendasTabs.jsx`** — o quadrado de ícone do botão fechado, para
   itens sem `marca` própria, para de ser verde fixo e passa a seguir
   `escuro` (branco/10 + ícone branco dentro da faculdade).
2. **`CareerPath.jsx`** — re-pele completa: verde/marrom/preto/cinza viram
   branco/neutro sobre o preto, com azul (`--topcollege-azul`) marcando
   "alcançado/venda direta" e magenta (`--topcollege-magenta`) marcando
   "função principal/rebate" — mesmo papel que verde/marrom faziam antes.
3. **`CarreiraSecao.jsx`** — o `Card` branco do Plano de Carreira vira o
   mesmo tratamento escuro que o `EvoluirNivel` (linha de baixo) já tinha.
4. **`EvoluirNivel.jsx`** — como é usado TANTO dentro da Top College
   (`embutido`) QUANTO na rota pública `/Evoluir` (sem `embutido`, com marca
   verde própria e correta), ganhou um objeto de tema condicional
   (`TEMA_TOPCOLLEGE` vs `TEMA_VERDE`) em vez de um recolorir incondicional
   — preserva a marca pública. PIX/Cartão continuam verdes de propósito (cor
   do meio de pagamento, não da casa).
5. **`RoleLinksGrid.jsx`** — ganhou `escuro` (default `false`, único uso real
   é dentro da Top College): cards e input de link viram cromados; o botão
   de copiar (o único destaque por card) ganha o gradiente azul→magenta.
6. **`SellersListPanel.jsx`** — ganhou `escuro`: cabeçalho, estado vazio,
   cards de vendedor (avatar, textos, chip do link) viram cromados; dos três
   botões por card, "Abrir Loja" (ação primária) ganha o gradiente, os
   outros dois ficam neutros; o modal de confirmação de exclusão fica com a
   casca escura mas o vermelho de perigo (ícone, texto "EXCLUIR", botão
   final) fica intocado — vermelho é sinal universal de perigo, não cor de
   marca, mesmo critério que preservou o verde do PIX.
7. **`SellerFormModal.jsx`** — já era escuro por padrão (único uso é dentro
   da Top College); só o botão "Cadastrar/Salvar", que era verde fixo,
   passou a usar o gradiente azul→magenta.
8. **`Licensing.jsx`** — a aba Time/Vendedores (que estava com um `Card`
   branco montado inline) passou a ter o mesmo fundo escuro das outras abas
   da faculdade, com `escuro={naTopCollege}` propagado pros componentes
   filhos; corrigido também o `mt-0`/`mt-6` da aba Carreira, que tinha
   ficado esquecido no padrão das outras abas.

**Fora de escopo (flagado, não mexido):** `EncontroMentalidade.jsx` (7
resíduos de `nz-verde`) e `PerformanceEquipe.jsx` (3 resíduos) — drift
adicional fora do que foi pedido agora; precisam de autorização à parte.

**Prova:** suíte 1390/1390, `npm run build` limpo, `npx eslint` nos 8
arquivos tocados sem erro novo (só avisos pré-existentes de vars não usadas,
confirmados via diff que não vieram desta mudança).

---

## DIR-85 — A X-eos no seletor: sem repetir, com a marca completa

**Emitida por:** dono (07/09/2026), com print do seletor de seções da Top
College aberto e fechado: *"tira essa logo do primeiro, já está aparecendo
lá em cima. E ali onde está escrito o método você vai tirar a logo antes, e
vai escrever o método — X-eos, se possível, colar logo depois. Porque tem a
logo da Top College ali, aí elas duas vão ficar aparecendo duas vezes de
maneira bem sublime. Mas a logo mesma, essa mesma logo aqui [anexou o
lockup X-eos]."*

**Data:** 07/09/2026.

**O que existia:** `CentralVendasTabs.jsx` (o seletor "TOP COLLEGE / O
Método" com o menu de duas famílias) desenhava, pro item "O Método", um
selo pequeno (só o X, `marca-xeos.webp`) ANTES do texto — tanto no botão
fechado quanto na linha da lista. A mesma marca X-eos já aparece acima, na
faixa da academia (HeroTopCollege) — repetir o selo aqui era a mesma marca
duas vezes na mesma tela, sem necessidade.

**O que entra:**
1. **Botão fechado** — quando o item ativo tem marca própria (só "O
   Método"), o quadradinho de logo/ícone não aparece mais: fica só o texto
   "TOP COLLEGE" / "O Método". Os outros itens (Mentalidade, Time,
   X-Performance, Carreira) continuam com o ícone deles, sem mudança.
2. **Linha da lista "O Método"** — o texto abre a linha (sem ícone antes),
   e a marca completa (`marca-xeos-lockup.webp`, a mesma imagem que o dono
   anexou — "X" + "-eos") fecha DEPOIS do texto, sem quadrado de fundo
   preto (ela já é legível em fundo claro ou escuro, tem transparência
   real). O check de "selecionado" continua por último.
3. `licensingTabs.js`: o campo `marca` do item `catalogo-crm` (O Método)
   trocou de `marca-xeos.webp` (só o X) pra `marca-xeos-lockup.webp` (X +
   "-eos") — é a marca que o `CentralVendasTabs.jsx` agora desenha depois
   do texto.

**Prova:** prints reais da banca (`tests/navegador/secoes.harness.jsx`,
Chromium via CDP puro — o pacote `playwright` não está instalado neste
ambiente, só o binário) confirmam: botão fechado sem ícone; linha "O
Método" com texto → logo X-eos → check, nessa ordem. Suíte 1390/1390,
build e lint limpos.

---

## DIR-84.5 — O InvokeLLM (9 telas) sai do modelo morto; o acesso à IA vira um lugar só

**Emitida por:** dono (07/09/2026): *"me oriente, tudo isso liberado de ação,
faça da melhor maneira"* — autorizando os quatro itens que eu tinha listado:
reprovar a comprovação de teste dele, decidir sobre a de "Fechamento do dia",
migrar o `InvokeLLM` e levar pra produção.

**Data:** 07/09/2026.

**Banco (feito, reversível pelo painel do gestor):**
- a comprovação de teste do dono (foto na cama, "Resolver: Toda X-Game e Top
  College", 07/09 09:00) → `reprovada`, `feito=false`, com o motivo escrito;
- "Fechamento do dia" (af8f…, 07/09 18:30): o gestor tinha reprovado na mão
  enquanto a IA estava fora; a IA, reanalisando, APROVA (82%: print de
  relatório de entregas do dia no grupo). Voltou pra `em_analise` com o
  veredito novo e o motivo antigo preservado (`motivo_gestor_anterior`) — o
  gestor decide de novo, agora com o mesmo contexto que a IA teve.

**Código:**
- `api/_lib/ia.js`: o acesso à IA compartilhado (qual chave existe, por onde
  ir — Anthropic direto ou AI Gateway —, cliente do SDK, reserva do gateway,
  erro → `details`). O validador passou a importar daqui; duplicar isso seria
  plantar o próximo erro escondido.
- `api/integrations/InvokeLLM.js`: sai o `google/gemini-2.0-flash-001` no
  chat/completions (404, engolido) e o JSON raspado; entra **Claude Sonnet 5**
  pelo SDK (texto é o forte dele, 40% do Opus — o Opus fica na validação de
  foto), **saída estruturada** quando a tela manda schema, `body.model`
  ignorado (era como apontavam pro modelo morto), `max_tokens` até 8000 (o
  roteiro pedia 6000 e era cortado em 4000), `truncated`/`stop_reason` de
  volta pra tela do Encontro, e **rede de segurança**: schema recusado pela
  API (400) → refaz UMA vez sem formato e faz o parse do texto, avisando no
  log. Contrato Base44 intacto (objeto direto com schema; `{ok,text,response}`
  sem). GET `?ping=1` prova o caminho com schema cru pelo gateway real.
- Testes: `tests/invokeLLM.test.mjs` (rota real com gateway simulado: modelo,
  sem temperature, formato, contrato, fallback do schema, 404, truncado,
  body.model ignorado, reserva, caminho direto, ping).

**Produção:** PR da branch `claude/project-structure-analysis-r1prad` para
`main`, pro dono revisar e mergear — merge em produção é clique dele.

---

## DIR-84.3 / 84.4 — Barato sem perder rigor, e a prova por dentro

**Emitida por:** dono (07/09/2026). Depois de colocar crédito no AI Gateway
(US$ 20) e ver o primeiro teste real pegar a foto na cama pelos DOIS motivos
(*"não aparece planilha, extrato, tela de sistema…"* e *"é a mesma cena da
comprovação anterior, apenas com ângulo/recorte diferente"*): *"parece que
está foda — será que você consegue fazer mais uns testes reais aí por dentro
como usuário, só para termos certeza?"* Antes, sobre custo: *"o que você me
indica pra ficar foda e barato?"*

**Data:** 07/09/2026.

**Custo (84.3), com o volume real do banco (4 comprovações em 30 dias, 10
pessoas ativas, 68 tarefas/dia):** ~R$ 0,15–0,30 por validação no Opus 5;
R$ 15/mês no volume de hoje, ~R$ 450/mês se TODAS as tarefas do dia fossem
comprovadas. Duas alavancas ligadas:
- **cache**: papel + todas as regras de tipo + cruzamento num único bloco
  `system` com `cache_control` — prefixo IDÊNTICO em toda chamada (a
  mensagem diz qual `[TIPO]` vale), acima do mínimo de 512 tokens do Opus 5,
  cobrado a 10% a partir da 2ª chamada;
- **esforço medium** em `output_config` — julgar foto contra regra não pede o
  raciocínio máximo; o thinking adaptativo segue ligado.
O ping (`?ping=1`) passou a mandar a MESMA forma da validação (saída
estruturada + effort + cache): se o gateway recusar qualquer parte, aparece
no painel do gestor, não na primeira pessoa comprovando de manhã. Ping real
no preview: `ia: true`, `saida: "ok"`.

**Recomendação registrada:** Opus 5 só na validação (o cérebro anti-fraude,
volume pequeno); Sonnet 5 nos textos do `InvokeLLM` (9 telas, mais volume);
Whisper segue na chave da OpenAI (única coisa que a usa). Um provedor por
função — o buraco de hoje nasceu de um erro escondido; menos peças, melhor.

**A bateria de prova (84.4):** `api/functions/xgameProvaValidador.js` roda a
validação DE VERDADE (mesmo handler, gateway, Opus 5) contra 12 casos e
devolve veredito × esperado — a foto real da cama contra tarefa de trabalho,
acordar e pré-treino (a pergunta) e reciclada; a 2ª rodada com justificativa
evasiva; telas renderizadas em `public/prova/` (planilha de fluxo de caixa,
que TEM que aprovar; página de livro com resumo; tela preta; meme); e duas
fotos reais de pessoas do time como exploratórias. Senha no cofre
(`app_segredos.xgame_prova_token`, tempo constante); sem token, 401 e zero
chamada de IA; um caso por GET; apagar a linha desliga. Resultado da rodada
real fica em `docs/RELATORIOS_EXECUCAO.md`.

---

## DIR-84.1 / 84.2 — A IA não estava rodando: o furo, a causa e a troca

**Emitida por:** dono (07/09/2026), com a print da fila do gestor: *"olha qual
era a tarefa ['Resolver: o financeiro'], fui lá bati uma foto qualquer
[deitado na cama], ela aceitou. Ou seja ela não cruzou, não está
funcionando. Isso é a parte mais importante da gamificação. Se tiver que
botar outra IA aqui você fala, que eu troco. Tem que fazer funcionar.
Urgentemente."*

**Data:** 07/09/2026.

**O que a print já dizia e eu fui confirmar:** a linha da fila trazia *"IA:
IA indisponível agora — comprovação enviada pra análise manual"*. A IA **não
rodou**. Dois defeitos, um em cima do outro:

1. **O furo (84.1):** gateway caído virava `veredito: 'duvida'` → a régua
   mandava pra `em_analise` → que **conta provisoriamente**. Enquanto a IA
   estivesse fora, **qualquer foto passava**. E a função engolia o erro sem
   log — a tela do gestor dizia "IA ligada" porque só conferia se havia
   chave.
2. **A causa (84.2):** com um `?ping=1` que faz uma chamada real ao modelo,
   o gateway respondeu **HTTP 404 `model_not_found`: `google/gemini-2.0-flash`
   não existe mais**. O modelo foi descontinuado e ninguém foi avisado, porque
   o erro nunca chegava a lugar nenhum.

**O que entra:**

1. **IA fora do ar BLOQUEIA.** `ia_indisponivel` é uma ação própria da régua
   (`ia_fora`): a tarefa não conclui, não conta, não vai pro gestor — a tela
   diz que a foto não foi descartada e pede pra tentar de novo. Sem IA não há
   validação; sem validação não há conclusão.
2. **A troca de IA — Claude Opus 5 pelo SDK oficial da Anthropic**, apontado
   pro **mesmo AI Gateway da Vercel** com a **mesma chave** que já está no
   cofre (a Vercel documenta exatamente esse caminho). Nada pra o dono
   configurar. Sai o chat/completions "compatível com OpenAI" e o JSON raspado
   por regex; entra **saída estruturada por contrato** (o modelo é obrigado a
   devolver o formato). Modelo reserva no gateway (`claude-sonnet-5`) se o
   principal cair.
3. **O erro deixa de sumir:** vai pro log da Vercel e volta em `details`
   (status, tipo, mensagem, modelo) pra tela e pro painel. O indicador do
   gestor passa a fazer o ping real e a mostrar o erro do gateway quando cai.

**O que o ping mostrou DEPOIS da troca (07/09, 02:29 UTC):** o caminho novo
chegou ao Claude Opus 5 pelo gateway, mas o gateway respondeu **HTTP 403
`no_providers_available`: "Free tier users do not have access to this model.
Upgrade to paid credits"**. A conta do AI Gateway da Vercel está no plano
gratuito — era por isso que o projeto inteiro usava modelos "free tier"
(que a Google depois descontinuou). **Isto é decisão do dono, com custo**, e
a validação fica corretamente BLOQUEADA até ela ser tomada:

- **(a)** colocar crédito no AI Gateway da Vercel (link no próprio erro,
  Vercel → AI → top-up) — nada mais muda, a chave `vck_` de sempre passa a
  servir Claude; **ou**
- **(b)** criar uma `ANTHROPIC_API_KEY` em console.anthropic.com e publicar
  na Vercel (ou gravar no cofre `app_segredos` com id `anthropic_api_key`)
  — o código já dá **prioridade a ela** e vai direto na Anthropic.

O código está pronto para os dois: `resolverIA()` escolhe pelo que existir,
sem redeploy. O painel do gestor mostra o erro exato e o link.

**Também afetados pelo mesmo defeito (modelo free-tier descontinuado, erro
engolido):** `api/integrations/InvokeLLM.js` (default
`google/gemini-2.0-flash-001`) — usado por 9 telas (descrição de produto
com IA, anúncio OLX, texto promocional, perfil, e o **roteiro do Encontro da
Mentalidade**, que por isso sempre "saía pela régua da casa"); e o gerador
de imagem `GenerateImage` (Material Promocional, Perfil, ranking do PDV,
convidado) em modelo Google que precisa de ping pra confirmar. Migração pro
mesmo padrão fica pra rodada própria. O `xgameGerarImagem` (gerador interno
de arte dos personagens, 06/09, uso único, sem tela chamando, duas chamadas
na vida — ambas de teste) foi **removido** em 07/09 por ordem do dono, junto
com a senha `gerador_imagem_token` do cofre; os personagens da Jornada são o
elenco em SVG (DIR-78), sem IA.

**Prova:** teste da rota real (`tests/xgameValidarPrintHandler.test.mjs`)
com o gateway simulado no formato da Messages API — cobre os dois caminhos
(gateway e Anthropic direto), saída estruturada, imagens anteriores, prompt
de cruzamento, o 404 exato que derrubou tudo e o 403 do free tier virando
`ia_indisponivel`; régua com o caso `ia_fora`.

---

## DIR-84 — A validação da X-Game vira "o maior validador do caralho"

**Emitida por:** dono (07/09/2026), depois de confirmar que a IA em questão
era o validador de comprovações da X-Game (`xgameValidarPrint.js`): *"a
gente tem que pegar as comprovações e ela tem que pensar. Não deixa a foto
repetida. Se a pessoa está comprovando um pré-treino com uma imagem deitada
na cama, com uma imagem bebendo água, ela vai ter que perguntar pra pessoa
justificar, antes mesmo de validar direto. Mas ela tem que cruzar imagem,
ela tem que ser o maior validador do caralho pra ficar tudo automático e
pouco ter intervenção humana. Na verdade tem que ser intervenção humana
zero — ela tem que ser mais foda que humano. Tanto de print, tanto de link
de endereço, tanto de imagem colada."*

**Data:** 07/09/2026.

**O que já existia:** a IA (F10.2) olhava UMA imagem isolada e devolvia
aprovada/reprovada/dúvida; dúvida caía DIRETO na fila do gestor — humano
acionado na primeira hesitação, o oposto do pedido. O anti-reuso só pegava
hash EXATO do arquivo (`lib/xgame.js`) — imagem reciclada reprocessada
(recortada, comprimida, com filtro) passava batido.

**O que entra:**

1. **Cruzamento obrigatório** — o prompt exige coerência explícita entre o
   TÍTULO da tarefa e o CONTEÚDO da imagem (o exemplo do dono: pré-treino
   com foto na cama ou só bebendo água é incoerência, não passa despercebido).
2. **Anti-reciclagem visual** — a IA recebe as últimas fotos da MESMA
   pessoa pro MESMO tipo de tarefa e compara a CENA (não só o arquivo).
3. **Uma pergunta antes de qualquer humano** — incoerência real mas sem
   certeza de má-fé vira `pergunta_para_pessoa`: a tela abre uma segunda
   etapa pedindo a explicação dela, reenvia pra IA com a resposta, e SÓ SE
   ainda ficar em dúvida depois disso é que cai pro gestor. A régua de
   quando pedir/quando aceitar/quando esgotar é `lib/xgameValidacao.js`
   (pura, 12 testes) — a chamada de rede e o prompt ficam isolados em
   `api/functions/xgameValidarPrint.js`.
4. **Tipo `link`** adicionado às regras (print/imagem colada já cobertos).
5. O gestor agora VÊ a justificativa da pessoa quando o caso chega até ele
   (`XGameAdmin.jsx`) — decide com o mesmo contexto que a IA teve.

**O que NÃO muda:** o hash exato continua barrando ANTES de gastar chamada
de IA (grátis, client-side); a janela de validade de 2h e o fluxo de quem
aprova/reprova no painel do gestor seguem os mesmos.

**Prova exigida:** os 12 testes de `xgameValidacao.test.mjs` verdes, suíte
completa (1355 testes) sem quebra, build limpo.

---

## DIR-81 — O mais no topo da coluna: adicionar sem rolar

**Emitida por:** dono (07/09/2026), com o quadro aberto: *"pra adicionar,
quando está vazio, tem que rolá-lo tudo lá pra baixo. E não pode ser assim. Tem
que ter um lugar pra adicionar, um maiszinho bem transparente ali, e já gera um
novo cartão... É só botar um mais, nem precisa escrever. Pode ser até verdinho,
bem clarinho. E aí, quando eu adicionar, já entra o novo."*

**Data:** 07/09/2026.

**O que eu conferi:** o único jeito de criar card hoje é o campo *"escreva o
tópico"* no **pé** da coluna (`mt-auto`). Numa lista com muitos cards — a
Academia, com uma rotina de treino inteira — isso fica a uma tela inteira de
rolagem do topo. O campo não está errado; **está longe**.

**O que entra:**
1. Um **`+`** no **topo** da coluna, logo abaixo do cabeçalho: discreto,
   translúcido, no verde claro da lista.
2. Clicar **cria o card na hora**, sem digitar nada antes — e ele entra **no
   topo** da coluna, não no fim: o que acabou de nascer tem que estar à vista.
3. O card nasce **já aberto pra digitar o nome**. Criar um card e obrigar a
   pessoa a caçar onde clicar pra nomear é trocar uma rolagem por outra.

**O que NÃO entra:**
- O campo *"escreva o tópico"* do pé **continua**: quem já está lá embaixo,
  depois de ler a lista inteira, escreve ali mesmo. Tirar seria trocar um
  incômodo por outro.
- Nada muda no arrastar, na ordem, no concluído ou no assistente.

**Prova exigida (REL-34.1):** o `+` existe no topo de cada coluna; clicar nele
**cria o card sem digitar**; o card novo aparece **em primeiro** na coluna; e o
campo do pé continua funcionando.

---

## DIR-80 — O celular em dois andares, e a rotina passa a ser DELA

**Emitida por:** dono (06/09/2026), com o Compromisso aberto no celular:
*"precisa a parte de lista, precisa organizar... a rotina perfeita, foi gerada
uma vez, ela tem que ficar todo dia, só se a pessoa pedir pra parar. A pessoa
tem que ter o botão de editar, de excluir — ela pode gerar a perfeita e excluir
e incluir, na rotina dela. Existem pessoas que não vão pra empresa, então ela
tem outra rotina. Então ela pode editar de acordo com ela e seguir a rotina
dela no dia."* Aprovação: **"PODE"**.

**Data:** 06/09/2026.

**O que eu conferi antes de prometer:**

1. **O dinheiro não está errado.** Rodei `distribuirDia` de verdade: ela
   **reparte** (soma das fatias = valor do dia) e pesos diferentes dão fatias
   diferentes (6/1/3 → 62,51 / 10,41 / 31,25). O "R$ 83,33" repetido em toda
   linha do print significa **peso uniforme** — a marca de um dia gerado
   ANTES do conserto da DIR-75. É dado velho, não defeito vivo.
2. **A coluna `metodo_perfil.rotina` (JSONB) já existe** desde a migração do
   Método — e a tela **só lê** dela
   (`perfil?.rotina?.length ? perfil.rotina : ROTINA_PADRAO`). **Nunca ninguém
   escreveu.** Por isso todo mundo recebe a rotina da casa e ninguém consegue
   ter a sua. O lugar já estava lá, vazio.
3. **O celular quebra por uma causa só:** título e ações dividem a MESMA
   linha. Sobra uma coluna estreita pro título, que se estica em seis linhas —
   e a faixa de ações passa por cima do texto, com a lixeira cortada pela borda.

**O que entra:**

1. **A linha da tarefa vira DOIS ANDARES no celular** — hora + título em cima,
   com a largura toda; ações embaixo. No desktop nada muda. A caixinha de
   marcar alinha no topo do texto, não no meio.
2. **Botão de EDITAR** na tarefa (só existia a lixeira).
3. **A rotina passa a ser da pessoa**: editar, excluir e incluir item,
   gravando em `metodo_perfil.rotina`.
4. **Geração automática todo dia**, a partir do momento em que ela gera a
   primeira vez — com **chave de desligar** ("só se ela pedir pra parar").

**As duas travas que impedem isso de virar um inferno** (é aqui que features
assim quebram, e por isso entram como regra, não como cuidado):

- **Idempotência.** A geração automática só age em **dia vazio**. Abrir a tela
  duas vezes não pode duplicar o dia.
- **Apagar do DIA ≠ apagar da ROTINA.** Apagar uma tarefa de hoje vale só pra
  hoje; apagar da rotina é que muda todo dia. Se o automático ressuscitar o que
  a pessoa apagou, ela conclui que o sistema não obedece — e para de confiar.
  São dois botões com significados diferentes, e a tela diz qual é qual.

**Decisão minha, delegada pelo dono ("o que você decidir eu vou contigo"):**
editar a rotina vale **a partir de amanhã**. Mexer no dia que ela já está
tocando apagaria o que ela já fez. Quem quiser aplicar hoje tem um botão
explícito — nunca automático.

**O que NÃO entra:**
- A `ROTINA_PADRAO` da casa continua sendo o ponto de partida de quem nunca
  editou; ela não é alterada.
- O X-Pay, o peso e o rateio não mudam de regra.
- Nada vai a produção nesta rodada.

**Prova exigida (REL-34.1):** no viewport de celular, a faixa de ações **não
pode sobrepor o título** nem sair da tela; a tarefa tem botão de editar; a
rotina editada **grava** em `metodo_perfil.rotina`; o dia seguinte nasce
gerado; e gerar duas vezes **não duplica**.

---

## DIR-79 — A segunda que vem, o treinamento que existe, e a IA presa nos fatos

**Emitida por:** dono (06/09/2026), com o Encontro da Mentalidade aberto na
tela: *"organizar a data, que a data está puxando errado — tem que botar a data
de hoje, a agenda pra amanhã. Organizar essa parte de treinamento, pra importar
o treinamento ou fazer um treinamento ali. Organizar essa questão da IA, que a
IA está alucinando pra caramba."* Coordenação explícita: o outro chat está
editando **outra coisa** dentro da mesma área — *"pode pegar essa parte"*.

**Data:** 06/09/2026.

**O que eu conferi antes de prometer** (rodando as funções reais, não lendo):

| | resultado | veredito |
|---|---|---|
| hoje | domingo, 06/09/2026 | — |
| `segundaDaSemana('2026-09-06')` | 2026-08-31 | conta **certa** |
| `proximaSegunda('2026-09-06')` | 2026-09-07 | conta **certa** |

**Não existe erro de aritmética.** O `EncontroMentalidade` ancora em
`segundaDaSemana` — a segunda que **já passou**. Num domingo ele mostra a
reunião de seis dias atrás em vez da de amanhã.

E o **"fora do ciclo oficial" é filho do mesmo defeito**: o Ciclo Executivo
começa em `2026-09`; ancorado em 31/08 a tela pergunta a fase de **agosto**,
que não existe no ciclo. Trocando a âncora, o rótulo se conserta sozinho —
07/09 é setembro = *Estruturação*. **Um conserto, dois sintomas.**

**O que entra:**

1. **A âncora vira a PRÓXIMA segunda** (`proximaSegunda` já devolve *hoje*
   quando hoje é segunda). Segunda → "é hoje"; terça a domingo → a de amanhã /
   da semana que vem, que é a que se prepara.
2. **Setas ← → entre as semanas.** Sem elas o conserto quebraria outra coisa:
   de terça a sexta o time ainda escreve as demandas da segunda que passou, e
   só trocar a âncora deixaria aquele registro **inalcançável**. O padrão é a
   próxima; andar pra trás continua possível.
3. **O treinamento passa a existir.** Hoje só se grava `treinamento_por_nome` —
   o *nome de quem treina*. Não há o que importar nem o que abrir. O bloco de
   45 min ganha conteúdo próprio (título, link/material e passos), gravado no
   encontro e exibido no **Apresentar**.
4. **A IA presa nos fatos.** Duas causas achadas no código, não supostas:
   - `normalizarRoteiro` repassa `apresentador` **cru** (`t.apresentador ||
     base.apresentador || null`) — nada confere contra quem está de fato na
     sala, que já chega no contexto. Daí sair gente que não existe.
   - `responsavel_funcao` idem: qualquer string passa, sem bater com os cargos
     oficiais.
   Entra a **conferência contra os fatos**: apresentador que não está na sala
   vira nulo; função que não é cargo oficial vira nula; e a tela **avisa** o que
   foi descartado, em vez de exibir invenção com cara de verdade.
5. **O `max_tokens` deixa de mentir.** Com pautas longas o JSON estoura, cai no
   `catch` e a tela diz "a IA não respondeu" — quando ela respondeu e foi
   cortada. Passa a distinguir as duas coisas.

**O que NÃO entra:**
- A régua local (`roteiroLocal`) continua sendo o plano B — não se mexe nela.
- O cronômetro, os blocos, as demandas e o Apresentar não mudam de
  comportamento; o treinamento só **acrescenta** um slide.
- Nada vai a produção nesta rodada.

**Pendente do dono:** um caso concreto de alucinação (um tópico que saiu
errado), pra confirmar qual das causas mordeu. As duas acima são defeitos
visíveis no código e entram de qualquer jeito.

**Prova exigida (REL-34.1):** a tela renderizada mostrando a segunda de
**amanhã** (não a que passou), sem "fora do ciclo oficial"; as setas andando
entre semanas; o treinamento aparecendo no Apresentar; e um roteiro com
apresentador inventado sendo **descartado com aviso**.

---

## DIR-78 — O elenco entra na trilha, e a trilha passa a respirar

**Emitida por:** dono (07/09/2026), olhando a Jornada ao lado do Duolingo:
*"faltou os bonequinhos do Duolingo que aparecem na jornada — a gente não vai
colocar igual, vai colocar no nosso modelo de negócio, o executivozinho, fazer
uns nossos desenhos."* Depois de ver o elenco desenhado: *"ficou foda, gostei
pra caralho... só que eu queria mais rápido, que ele girasse, que ele olhasse
pra um lado pro outro, rir, ele mais ativo."* E, fechando: *"não só a cabeça, o
corpo todo... pra girar corpo todo, acenar, tá foda."* Aprovação:
**"BOOORA SEM QUEBRAR E MUDAR O QUE ESTA BOM"**.

**Data:** 07/09/2026.

**O que eu conferi antes de prometer:**
1. A Jornada **já tem** a receita do Duolingo — serpentina (`OFFSETS`),
   unidades por período, baú no meio da unidade, troféu fechando, nó 3D com a
   borda escura embaixo. Não falta estrutura: falta **quem mora ali**.
2. O "professor Xavier" que está no ar em `/marca/poder-hero.webp` é o
   **Patrick Stewart como Charles Xavier** — personagem da Marvel e rosto de
   um ator real, numa tela pública de uma plataforma licenciada a terceiros. O
   elenco próprio resolve isso de graça: **O Mentor** nasce pra ocupar esse
   lugar. (A troca no Hero **não** entra nesta rodada — fica registrada.)
3. O **Magnific** conectou, mas a conta recusa toda chamada
   (`requires a premium account`, até no `account_profile`). Nada foi gerado
   por lá, e nada nesta diretiva depende dele.

**A decisão de engenharia: o boneco é DESENHO NO CÓDIGO, não imagem gerada.**

Não é economia — é o único jeito de ter o que o dono pediu:

| o que ele pediu | por que só vetor entrega |
|---|---|
| girar o corpo, olhar pros lados, rir | cada pose é um parâmetro, não uma geração nova; com IA o rosto muda a cada pose |
| mais rápido, mais ativo | vetor anima; PNG não |
| igual no Duolingo | o boneco vive de 64px a 300px sem borrar |
| sem quebrar o que está bom | não entra arquivo, nem requisição, nem peso no build |

O elenco inteiro cabe em menos KB que **uma** foto de hábito da pasta
`/marca`. Só se anima `transform` e `opacity` — o que a GPU resolve sozinha.

**O que entra:**
1. **`src/lib/elencoJornada.js`** — quem aparece em que parada, função pura e
   testada. Cinco papéis reais do método: **Executivo** (o dono do dia),
   **Mentor**, **Diretora** (gestão/reunião), **Cliente** (contato e
   apresentação), **Duplicado** (Hábito 8).
2. **`ElencoBoneco.jsx` + `elenco.css`** — o desenho e os nove movimentos:
   giro do corpo inteiro a partir dos pés, cabeça chegando **depois** do corpo
   (é o atraso que faz parecer gente), olhar acompanhando o giro, piscada
   desencontrada, risada, respiro, aceno, aponta, pulo com esmagada na
   aterrissagem, comemoração e cochilo.
3. **O elenco entra ao lado da trilha** na `XGameJornada` — a parada do momento
   ganha quem acena; as feitas e as travadas ganham figura **espaçada**, nunca
   uma por parada (mapa lotado deixa de ser mapa).
4. **O desenho conta o estado**: quem está na parada travada **cochila** — não
   gira, não ri. Se o boneco da tarefa trancada ficar animado igual aos outros,
   o desenho para de informar e vira enfeite.
5. **`prefers-reduced-motion`**: quem liga "reduzir movimento" no aparelho vê
   tudo parado, sem perder informação nenhuma.

**O que NÃO entra (trava explícita do dono — "sem quebrar e mudar o que está bom"):**
- O `Parada3D`, o `Bau`, o troféu, os `SELOS`, os `OFFSETS` e o amanhecer da
  base **não são alterados**. O elenco entra como vizinho, nunca por dentro.
- O **arrastar dos cards do Quadro** (DIR-77.3) não é tocado.
- A troca do Xavier no Hero da Top College fica pra rodada própria.
- Nada vai a produção nesta rodada.

**Prova exigida (REL-34.1):** o boneco tem que estar **na tela renderizada**,
com o corpo em ângulo diferente da cabeça (o atraso), a parada do momento com
quem acena, a travada cochilando, e **zero erro de página/console**.

---

## DIR-77 — O horário é a ponte, e o concluído mora na coluna

**Emitida por:** dono (07/09/2026): *"botar os horários da tarefa, que
sincroniza no planejamento diário, aparece lá no planejamento diário e também
na jornada — tanto na lista como na jornada. Tarefa concluída, pra ficar verde.
O horário de cada tarefa, quando termina. E eu poder arrastar de um lado pro
outro."* E, no meio da rodada: *"esse concluído está aparecendo embaixo, mas
tem que aparecer no card — vai organizando ali dentro mesmo, igual no
MeisterTask. E quando eu minimizo, ele bota a cor até o final, fica bonitão."*

**Data:** 07/09/2026.

**O que eu conferi antes de prometer:** Lista e Jornada **já são a mesma
coisa** — as duas leem `tarefas` do dia. "Adicionei na lista, entra na jornada"
já funcionava. O que não existia era o horário no card do quadro, e por isso a
tarefa nascida de um card caía no balde "sem hora": fora da linha do tempo da
Jornada e fora do período certo da Lista.

**A decisão que sustenta tudo: O HORÁRIO É QUE DECIDE.**

O dono pediu "adicionou num lugar, entra em todos". Feito ao pé da letra, isso
quebra o dia: o quadro é BACKLOG (o que existe pra fazer), o dia é COMPROMISSO
(o que eu assumo hoje). Jogar todo card no dia incharia a Master Task — e como
o X-Pay rateia o fixo pelas tarefas do dia, cada tarefa passaria a valer uma
fração. **O horário resolve isso sozinho**, porque é assim que a cabeça já
separa as duas coisas:

> "isso eu faço às 14h" é compromisso · "isso eu preciso fazer algum dia" é backlog

Card **com** hora entra no dia, na Lista e na Jornada, no lugar certo. Card
**sem** hora fica no quadro. Nenhum botão a mais pra aprender.

**O que entra:**
- `hora` e `hora_fim` no card e no dia — "quando termina", que ele pediu;
- **sugerir horário**: o primeiro buraco livre do dia, pra não procurar na mão;
- **aviso de conflito**: duas coisas no mesmo horário é o defeito mais caro de
  uma agenda, e até aqui nada avisava;
- **concluída fica VERDE** na Lista e na Jornada — uma cor só, a mesma nas duas,
  pra dar pra varrer o dia de relance (antes a moeda da feita saía na cor do
  TIPO da tarefa, e o "está feito" mudava de cor a cada parada);
- **o concluído fica na coluna dele** (DIR-77.1), com a faixa verde, embaixo
  dos abertos — e não numa gaveta no pé do quadro, que foi onde eu errei;
- **coluna minimizada desce até o fim** e todas as colunas ficam da mesma
  altura, que é o que dá a cara de board.

**Regras de fronteira:** migração aditiva. A tarefa do dia continua nascendo
pela entidade. O quadro recebe as tarefas do dia **por parâmetro** de quem já
as carrega — buscar de novo daria duas listas com a mesma verdade, e uma delas
ficaria velha.

---

## DIR-76.1 / 76.2 — A cara do MeisterTask, o seletor de ícone e o assistente

**Emitidas por:** dono (06/09/2026), em três recados seguidos:
*"Agora a gente deixa idêntico ao master. Bem visual, grandão. Está muito ainda
aparecendo emoji. Pega os detalhes todinho pra você jogar pra cá."* ·
*"Quando eu escrever Academia, ele traz um espaço pro peso, pra foto, tipo um
analisador. Faz a entrevista — perder ou ganhar peso — e já gera a rotina de
treino: segunda, terça, quarta… sempre ajudando ela a escrever menos, e cada
vez mais ficar viciada na plataforma."* ·
*"Precisa selecionar emoji, tem que dar tudo isso pra ele, o arrastar de um
lado pro outro; quando eu adicionar, precisa ficar igual as outras."*

**Data:** 06/09/2026.

**DIR-76.1 — a cara.** Tirada dos prints dele, item por item: cabeçalho de
coluna em barra sólida de ponta a ponta (46px, ícone + nome em CAIXA ALTA +
contador); card BRANCO sobre a coluna; **faixa de status no topo do card**,
largura inteira, verde "Concluída" e laranja "Atrasado"; rodapé de metadados em
chips com ícone (data, contador do checklist); avatar no canto; coluna
recolhida vira barra vertical da cor dela. **Zero emoji** — emoji muda de
desenho em cada sistema e dá cara de rascunho; ícone é desenhado, alinha na
linha de base e aceita a cor do tema.

**DIR-76.2 — o que o MeisterTask tem e a gente não tinha:**
- **Seletor de ícone e cor** por lista (o painel "Ícone de seção" do print):
  grade de ícones em cima, fileira de cores embaixo. Guarda-se o **nome** do
  ícone, nunca o desenho — o desenho vem do pacote e muda de versão.
- **Arrastar a lista de um lado pro outro**, com a ordem **renumerada inteira**
  a cada movimento: ordem com buraco volta embaralhada na leitura seguinte.
- **A lista nova nasce igual às outras** — o cabeçalho já aparece colorido e
  com o ícone que o nome sugere **enquanto se digita**, antes de existir.

**DIR-76.2 — o assistente, e é ele que fideliza:**
Escreveu um nome que a casa conhece ("Academia"), aparece o convite. Três
perguntas que **mudam o resultado** — objetivo, dias por semana, nível — e a
semana nasce pronta: um card por dia de treino, com os exercícios e a série já
escritos. Peso e foto são **opcionais**, porque são acompanhamento e não plano.

**Regras de fronteira:**
- **O assistente é CONVITE, nunca modal que abre sozinho.** Ferramenta que
  interrompe é ferramenta que a pessoa aprende a fechar rápido.
- **O que sai são cards NORMAIS** (título + checklist) — arrastam, editam e vão
  pro dia como qualquer outro. Formato próprio deixaria metade do quadro sem
  valer pra eles.
- **Assistente novo é uma entrada em `src/lib/assistenteDeLista.js`**, não uma
  migração. A `ficha` é JSONB justamente porque cada contexto pergunta o seu.

---

## DIR-76 — O nosso quadro, versão "melhor que o MeisterTask e mais simples"

**Emitida por:** dono (06/09/2026), com prints do quadro dele no MeisterTask:
*"faz um estudo foda e traz simplificado pra gente, com algumas coisas dali —
recolher, botar foto pra pessoa dar sentido de pertencimento, editar os cards
ali — e tudo sincronizado e conectado com a agenda diária, botando dali e
levando pro Compromisso, do Compromisso pra ali, fazendo lista de tarefas. Pode
até botar um modelo pronto pra ele seguir. Quero melhor que o MeisterTask, mas
mais simplificado, mais eficiente."* E, sobre a decisão de fundo: *"o que você
decidir está decidido."*

**Data:** 06/09/2026.

**O estudo (em cima dos prints dele, porque o MeisterTask exige login):**

1. Ele usa colunas como CONTEXTOS (Academia · Tarefas dia · Sant'Anna ·
   Segunda · Terça…), não como etapas. A ferramenta obriga um eixo por coluna
   e ele misturou contexto com tempo.
2. Criou colunas "CONCLUÍDAS" na mão ao lado de cada contexto — a ferramenta
   deixa o feito acumular e ele teve que inventar onde esconder.
3. Nas colunas de dia da semana ele pré-numera vagas ("1 -", "2 -"… "11 -").
   É um MODELO PRONTO fabricado à mão: "até onze tarefas por dia, em ordem".
4. O card que mais trabalha é o de checklist: "TAREFA DO DIA 12.03.26 — 1ª…
   5ª — 2/5". Um card que é o dia inteiro, com sub-itens marcáveis.
5. "Não atribuído: 66". A foto na pessoa, lá, é atrito — ninguém atribui.
6. Muito "Atrasado" com data de março. A ferramenta pinta de laranja e para.

**As decisões (tomadas, por delegação dele):**

- **O tempo não é coluna — é o Compromisso.** As colunas SEGUNDA/TERÇA/QUARTA
  com vagas numeradas deixam de existir: o dia já é o Hábito 2. Card vai pro
  dia pelo "pro meu dia". Isso apaga metade do quadro dele sem perder nada. Os
  horizontes da DIR-75 (Hoje/Semana/Depois) saem pelo mesmo motivo.
- **Colunas são LISTAS que a pessoa nomeia, e RECOLHEM** em barra vertical
  (o print 5 dele). Modelo pronto no primeiro uso: Trabalho · Academia ·
  Pessoal, com um card de exemplo com checklist.
- **Card = título + checklist + prazo + foto do dono + Hábito.** Edita clicando
  em cima. "2/5" na cara do card. A foto é a de perfil que a pessoa já tem
  (`getFotoPerfil`); sem foto, as iniciais.
- **Feito é AUTOMÁTICO.** Marcou o card ou fechou o último item do checklist →
  Feito, sozinho, com carimbo de quando. Some da mesa depois de 7 dias.
- **Atrasado com saída.** Card vencido sobe pro topo da lista dele; um clique
  remarca ou manda pro dia. Pintar de laranja e parar não ajuda ninguém.
- **Sincronizado nos DOIS sentidos:** quadro→dia ("pro meu dia", existe) e
  agora a VOLTA — marcou feita no Compromisso a tarefa que veio de um card, o
  card vai pro Feito sozinho; e tarefa do dia que não saiu ganha "guardar no
  quadro" em vez de virar PERDIDO pra sempre.
- **O que NÃO entra, de propósito:** automações, impressão, limite por seção,
  ícone e cor de seção, comentários, anexos. Cada um é um menu a mais pra
  ninguém usar.

**Regras de fronteira:** migração aditiva (tabela de listas + colunas novas no
quadro; as colunas `hoje/semana/depois` viram "aberto" sem perder linha). Nada
do X-Performance é tocado. A tarefa do dia continua sendo escrita pela
entidade `MetodoTarefa`, nunca pelo cliente direto.

---

## DIR-75 — Ferramentas no Compromisso: o dia deixa de ser lista e vira painel

**Emitida por:** dono (06/09/2026): *"eu não quero que crie ali, eu quero que
você crie já no Compromisso... a gente já tem o Compromisso, eu só preciso
adicionar ferramentas ali. Esquece aquela parte da Mentalidade do Executivo, do
CEO, do Diretor — ele está cuidando. Foca no Compromisso, em trazer ferramenta.
É tudo conectado com os oito hábitos do sucesso, e a gente fazer o nosso
Trello, o nosso, ali."*

E, do ditado anterior: *"de dez e meia às onze e meia eu vou abrir ali, reunião
de não sei o quê, que eu vou organizar a reunião, já vai entrar na minha
reunião do dia; fazer contato com fulano, aí eu vou buscar esse contato no
terceiro hábito."*

**Data:** 06/09/2026.

**O diagnóstico que originou isto:** o dia do Compromisso hoje é uma LISTA. Cada
linha diz o que fazer e quanto vale, e ali morre — a pessoa lê "Reunião 1
(45–60 min)", fecha a tela e vai procurar a reunião em outro lugar do sistema.
As ferramentas dos 8 Hábitos existem, funcionam, e ficam a três cliques de
distância de quem já está com a tarefa na frente.

**O achado que torna isto barato:** o encanamento da navegação entre Hábitos
**já existe e não está sendo usado** — `onIr(secao, sub)`, ligado em
`CrmClientesTab`, já leva do Hábito 4 pro 3 e do 5 pra esteira. O que falta é
que as 20 tarefas da Rotina Perfeita **não sabem a qual Hábito elas servem**.

**O que entra, e só isto:**

1. **Cada tarefa do dia leva pra ferramenta dela.** "Reunião 1/2/3" abre a
   agenda do Hábito 4; "Contratos + follow-ups" abre a esteira do Hábito 6;
   "Treinamento diário com o time" abre o Hábito 8; "Acordar — gratidão e foco
   no sonho" abre o Quadro dos Sonhos. Tarefa que **não tem** ferramenta não
   ganha botão — link errado é pior que link nenhum.
2. **O NOSSO QUADRO, dentro do Compromisso.** Não é o quadro do X-Performance
   (aquele é da diretoria e é da outra sessão): este é o da organização do
   negócio das 10:30, com as colunas do jeito que a cabeça funciona —
   **Hoje · Esta semana · Depois · Feito** — arrastando. Cada cartão carrega um
   Hábito e leva pra ferramenta dele, e **vira tarefa do dia em um clique**,
   que é a frase do dono ("já vai entrar na minha reunião do dia").
3. **Colar imagem na comprovação.** O modal só tem galeria e câmera; a
   biblioteca de colar já existe na casa (`lib/colarImagem.js`, feita pro
   Quadro dos Sonhos). É reuso.
4. **O DINHEIRO FLUIDO, no Compromisso.** Ordem do dono no meio desta rodada:
   *"sobre dinheiro — de novo, no quadro do Compromisso: quero deixar isso mais
   fluido, baseado no que já está escrito ali."*

   "Baseado no que já está escrito" é literal: a fórmula da casa continua sendo
   **verba ÷ dias úteis ÷ tarefas × peso**. O que muda é que ela passa a
   **fechar a conta**, e a aparecer.

   **O defeito medido (não suposto).** Com verba de R$ 7.000 e 20 tarefas:

   | dia | por tarefa | total do dia |
   |---|---|---|
   | tudo peso 1 | R$ 5,30 | **R$ 106,06** |
   | tudo peso 3 | R$ 15,91 | R$ 318,18 ✓ |
   | tudo peso 5 | R$ 26,52 | **R$ 530,30** |

   O alvo é R$ 318,18 (7.000 ÷ 22). A fórmula divide pelo NÚMERO de tarefas e
   depois multiplica por `peso ÷ 3` — então ela só fecha quando a média dos
   pesos é exatamente 3. Um dia de tarefas leves paga um terço do combinado; um
   dia de tarefas pesadas paga 67% a mais (R$ 11.667 no mês, não R$ 7.000).

   **A correção é de uma linha:** o peso REDISTRIBUI um bolo fixo em vez de
   esticá-lo — divide-se pela **soma dos pesos**, não pela contagem. Assim
   qualquer mistura de pesos fecha exatamente no combinado, que é a frase do
   dono ("sete mil distribuído").

   **E o "fluido":** a tela do dia passa a mostrar o bolo do dia inteiro
   (ganho · em jogo · perdido), e mexer no peso de uma tarefa mostra na hora o
   que ela passou a valer **e o que saiu das outras** — que é exatamente o
   aviso que ele pediu.

**Regras de fronteira desta diretiva:**

- **Nada do X-Performance / Mentalidades é tocado.** Terreno da outra sessão.
- **O quadro do Compromisso é PESSOAL** (`user_id`), ao contrário do quadro da
  diretoria, que é compartilhado. São coisas diferentes com nomes parecidos, e
  misturá-las seria pôr a pendência de contrato de um na tela do outro.
- **A ligação tarefa→Hábito é uma TABELA DE CÓDIGO**, não coluna de banco: o
  mapa muda quando a Rotina Perfeita muda, e isso é uma linha de diff, não uma
  migração.
- **Nada do que funciona muda de comportamento.** Botão a mais na linha, quadro
  novo numa aba nova. A lista, o X-Pay, os estados AGORA/ATRASADO/PERDIDO e a
  comprovação seguem idênticos.

---

## DIR-74 — A sociedade deixa de ser uma barra e vira três portões

**Emitida por:** dono (06/09/2026), depois de eu reportar as três pendências:
*"O que você acha? Tá. E aí depois me traz uma visão já aplicada, que aí o que
tiver que melhorar a gente vai melhorando."* — liberdade de ação pra aplicar a
minha recomendação e ele corrigir em cima do que estiver na tela.

**Data:** 06/09/2026.

**O que eu acho, e por isso mudo:** a régua de 100 pontos que entrou na DIR-72
era chute meu, e o problema dela não é o número — é a **forma**. Uma barra que
só sobe tem dois defeitos que estragam o instrumento:

1. **É catraca de mão única.** Quem entregou muito num semestre e nada no
   seguinte continua parecendo perto de sócio. Barra premia histórico; sociedade
   se decide por ritmo atual.
2. **Deixa a pessoa se promover sozinha.** O card vira ponto quando alguém o
   arrasta pra "Entregue" — e nada impedia que esse alguém fosse o dono do card.
   A trava da DIR-72 ("passa pela revisão") só obriga a parar na coluna do meio;
   não obriga ninguém a **olhar**.

**O que entra:**

- **Ninguém valida o próprio entregável.** Mover pra "Entregue" um card seu é
  recusado, na regra e na tela. Só conta ponto entregável com carimbo de quem
  validou, e esse alguém tem que ser outra pessoa. É isto que dá sentido à
  coluna de revisão — sem isto ela é um pedágio sem guarda.
- **Três portões, e a conversa de sociedade só abre com os três acesos:**
  - **Peso** — 100 pontos acumulados (a régua que já existia, agora um portão
    entre três em vez do placar inteiro);
  - **Consistência** — entregou em pelo menos **8 das últimas 12 semanas**. É o
    portão que a barra sozinha não tinha: mede ritmo, não acervo;
  - **Duplicação** — pelo menos um entregável validado do **Hábito 8**. Sócio
    que não formou ninguém não é sócio, é funcionário caro.

**A reunião de segunda continua UMA só, e isso é resposta, não omissão.** O
dono disse com todas as letras que as trilhas estão sendo aplicadas juntas. Duas
atas na mesma semana seriam dois "gargalos da semana", e ninguém saberia qual é
o verdadeiro. A trilha marca o **entregável**, não o encontro.

**Regras de fronteira:**

- **Migração nenhuma.** As colunas `validado_por_id`, `validado_em` e `habito`
  já existem desde a DIR-72. Isto aqui é regra, não esquema.
- **Os números são régua do dono, não lei da natureza** — 100 pontos, 8 de 12
  semanas, Hábito 8. Estão numa constante nomeada cada um, pra ele trocar sem
  procurar.

---

## DIR-73 — As agendas da empresa dentro do agendador

**Emitida por:** dono (06/09/2026), com print do modal "Agendar reunião":
*"AQUI INSERIR AS AGENDAS E MENTORIAS DA EMPRESA: Mentalidade do Executivo,
Onboarding, Mentalidade do Diretor, Mentalidade do CEO, Eventos Top College,
Treinamento X-eos, entre outros que você pode inserir de marcado, Reunião com
o Marketing, Reunião com Financeiro — tudo como funciona o mercado."*

**Data:** 06/09/2026.

**O problema exato:** o passo 1 do agendador só sabe perguntar *"com quem é a
reunião?"* e só oferece contato da lista. Mas metade da agenda de quem trabalha
aqui **não tem um contato do outro lado**: mentoria, treinamento, evento e
reunião de área são compromissos da CASA. Hoje, pra marcar uma dessas, a pessoa
tem que sair do agendador e ir no bloco 🏛️ da gestão — e por isso elas não são
marcadas.

**O que entra:** o passo 1 passa a ter duas portas — *um contato da minha
lista* ou **🏛️ uma agenda da empresa** — e um catálogo das agendas que a casa
já tem, cada uma com a **cadência do mercado** já sugerida (dia, hora e
duração), pra pessoa só confirmar.

Do ditado do dono: Mentalidade do Executivo, Onboarding, Mentalidade do
Diretor, Mentalidade do CEO, Eventos Top College, Treinamento X-eos, Reunião
com Marketing, Reunião com Financeiro. Da autorização *"entre outros que você
pode inserir"*, e marcadas no código como **proposta minha**, não como ordem
dele: Reunião de Oportunidade (a PPV), Treinamento de Produto, Fechamento do
Mês e Reunião de Liderança.

**Regras de fronteira desta diretiva:**

- **O agendador de contato não muda.** O caminho de hoje — escolher pessoa,
  gravar em `contatos_metodo`, criar no Google — continua idêntico, byte por
  byte. A porta nova é uma segunda saída, não um desvio da primeira.
- **Não nasce tabela nova.** Agenda da empresa **é** `reunioes_empresa`
  (DIR-52). O catálogo é uma lista em `src/lib/agendaEmpresa.js` — mudar a
  grade da casa vira uma linha de código, não uma migração.
- **Quem pode marcar pra todo mundo continua sendo quem já podia.** A porta
  🏛️ só aparece pra visão total; sem isso, qualquer executivo enfiaria uma
  reunião na agenda de toda a empresa.
- **`publico` deixa de ser enfeite.** A coluna já existia sem ninguém ler:
  agora agenda marcada `diretoria` some da agenda de quem não é diretoria, em
  vez de ficar guardada mentindo.

---

## DIR-72 — X-PERFORMANCE: o planejamento executivo da diretoria

**Emitida por:** dono (06/09/2026): *"Preciso organizar as questões de
organização da reunião, mentalidade do diretor... a gente tem que ter a aba aí
dentro da mentalidade do executivo, mentalidade do diretor e do CEO... toda
segunda-feira a gente tem uma reunião, eu quero visualizar isso dentro do
sistema, onde tem tópicos que a gente precisa sempre de documentos... com muito
planejamento, um sistema igual Trello... isso vira produção dentro do
planejamento de acordo com cada membro da diretoria... cada diretor e executivo
tem um fixo e eles têm os entregáveis para serem sócios."* E, sobre o nome e o
lugar: *"não vamos colocar nome de Trello, vamos colocar algo chamado
X-Performance, e isso precisa enquadrar dentro do planejamento diário, com uma
visão executiva estilo MASTER TASK. CAPRICHA, LIBERDADE DE AÇÃO, ME SURPREENDA."*

**Data:** 06/09/2026.

**O que entra:** uma seção nova da Top College, `catalogo-xperformance`, com
quatro peças:

1. **As três trilhas da Mentalidade** — Executivo (Hábitos 1 a 5, fazer
   acontecer), Diretor e CEO (Hábitos 5 a 8, multiplicar e construir). A do
   cargo da pessoa vem marcada. Não é conteúdo novo: é uma **lente** sobre os
   8 Hábitos que a academia já ensina.
2. **As duas contas, separadas e nunca somadas** — o *fixo do mês* (que já vive
   no X-Game) e o *caminho pra sociedade* (pontos acumulados). Somar as duas
   faria a pessoa achar que bateu a meta do mês **e** ficou mais perto de
   sócia — e não ficou.
3. **A reunião de segunda como documento**, com pauta **fixa**: Os números da
   semana / O gargalo / Decisões / Compromissos. A pauta ser fixa é o que
   transforma anotação em série histórica — cada bloco abre o mesmo bloco da
   semana passada ao lado.
4. **O quadro de entregáveis** — Combinado → Fazendo → Em revisão → Entregue,
   com arrasto. **Só "Entregue" vira ponto**, e nada chega em Entregue sem
   passar por "Em revisão": deixar pular seria deixar a pessoa se autopromover
   a sócia arrastando um card.

**Regras de fronteira desta diretiva:**

- **Não se cria moeda nova.** O X-Game já tem Human Token, ligas e X-Pay. O
  fixo é lido de `xgame_participantes`; este módulo **não guarda dinheiro**.
- **Não se cria reunião nova.** A reunião como *compromisso* já é
  `reunioes_empresa` (DIR-52). O que entra aqui é a **pauta** — o documento que
  a reunião produz.
- **Migração aditiva:** duas tabelas novas (`xperf_encontros`,
  `xperf_entregaveis`), nenhuma linha existente tocada.
- **Preview apenas.** Produção depende de autorização à parte, como sempre.

**Pendente com o dono (não bloqueia a entrega, muda a régua):** quantos pontos
abrem a conversa de sociedade (entrou 100 como régua provisória) e se a reunião
de segunda é **uma para todos** ou **uma por trilha** (entrou uma por semana,
com a trilha marcada).

---

## DIR-71 — O robô de migração nunca funcionou: acertar o histórico

**Emitida por:** dono (06/09/2026): *"faça o que precisa ser feito, só não
quebre nada."* Autorização dada depois de eu reportar duas coisas na
publicação: o RLS aberto num backup do Financeiro e a falha do robô que
aplica migração no banco.

**Data:** 06/09/2026.

**O que a investigação achou (e é pior do que o reportado):** as **23
execuções** do workflow `deploy-migrations` falharam — **todas, desde
21/08**. A promessa escrita no cabeçalho dele ("aplica a migração em
produção automaticamente") nunca valeu um dia. Toda migração dos últimos
15 dias foi aplicada na mão ou pelo MCP.

**Causa:** o histórico do banco tinha **11 linhas** para **~57 arquivos**
de migração. O `supabase db push` recusa quando o banco tem versão que a
pasta não tem — e tinha 9. Só que destravar isso sem mais nada seria PIOR:
ele passaria a enxergar **56 migrações como pendentes**, incluindo
`backfill_financial_income`, `backfill_leilao_retido` e
`market_value_limpeza`, que **alteram dados de negócio**. Ou seja: o robô
quebrado estava, sem querer, segurando uma bomba.

**Escopo autorizado:**
1. **Auditar antes de tocar.** 56 migrações conferidas objeto a objeto
   contra o banco de produção (só leitura), cada uma com contraprova
   adversarial independente.
2. **Acertar o histórico** marcando como aplicadas só as que a auditoria
   PROVOU aplicadas, com backup da tabela antes.
3. **Deixar pendentes** as 5 que faltam de verdade e são DDL aditivo puro
   — o robô aplica na primeira execução que funcionar.
4. **RLS** no backup `financeiro_rotulos_backup_20260905`, via migração
   no fluxo normal (é a prova de que o robô voltou).
5. **Trava nova no CI:** duas migrações não podem mais dividir a mesma
   versão.

**Decisão minha, dita ao dono:** duas migrações que a auditoria achou
incompletas ficam marcadas como aplicadas e **não** entram na fila do
robô — `contrato_assinaturas` (a policy que falta foi removida de
propósito por LGPD) e `cancelamento_estorna` (troca uma função do caminho
do dinheiro). A segunda é achado sério e vai em separado, para o dono
decidir.

**Fora do escopo:** rodar qualquer migração que altere DADOS.

---

## DIR-70 — O menu da Top College lê como uma coisa só

**Emitida por:** dono (05/09/2026), com print do menu flutuante: *"lá em
cima está top, a logo. Só o restante ali que tem que ficar mais conexo.
Quero que os de baixo pareçam com a identidade visual da X-eos, aquele
metálico, a tipografia igual. Estou sentindo elas meio divididas — não
parecendo uma coisa só, mesmo que estejam separados."*

**Data:** 05/09/2026.

**Diagnóstico (o que dividia, e não era a tipografia — a Sora já entrou
na DIR-61):**
1. **A cor.** A marca em cima é prata; os itens acendiam em **verde**, a
   cor do Leilão NoZap. Verde dentro do menu da faculdade lê como outro
   sistema colado ali.
2. **O eixo.** A faixa da marca começava em 16px e os itens em 12px —
   4px de desalinho que o olho não nomeia mas sente.
3. **O corte.** A faixa tinha fundo próprio e uma linha cheia embaixo:
   parecia um cartão separado em cima de um menu.

**Escopo autorizado:**
1. Rótulo e traço do ícone passam a ser feitos do **degradê metálico da
   própria logo** — os tons saíram da média de pixel do arquivo
   `marca-xeos-lockup.webp` (topo 235,237,240 · meio 198,203,211 · base
   140,146,155). Mesma liga, não um prata parecido.
2. Faixa e itens dividem o **mesmo eixo** (16px).
3. A linha cheia vira um **fio que nasce no eixo do texto e apaga antes
   da borda** — emenda em vez de corte.
4. O aceso deixa de ser verde e passa a ser o metal virando pra luz.

**Fora do escopo:** produção (travada por ordem do dono); a logo da faixa,
que o dono aprovou como está; a ordem arrastável dos ícones.

---

## DIR-69 — O nome completo do Hábito quando se entra nele

**Emitida por:** dono (05/09/2026), com print do Hábito 03 mostrando só
"Lista": *"quando eu clico adentro, precisa aparecer o nome completo.
Exemplo, é Lista de Networking. Contato e Convite. Apresentação de
Sucesso. Acompanhamento e Fechamento. Verificação do Progresso.
Duplicação dos oito hábitos do sucesso. Pode até ficar o primeiro nome ali
na frente, mas quando clica tem que aparecer o complemento do que é, do
que são os oito hábitos do sucesso."*

**Data:** 05/09/2026.

**Escopo autorizado:**
1. Cada Hábito ganha **nome oficial completo** na fonte única
   (`src/lib/metodo.js`): Sonho · Compromisso · Lista de Networking ·
   Contato e Convite · Apresentação de Sucesso · Acompanhamento e
   Fechamento · Verificação do Progresso · Duplicação dos 8 Hábitos do
   Sucesso.
2. O **apelido curto continua na frente** (o seletor de 8 botões não cabe
   com o nome inteiro) e o **complemento aparece na faixa quando se
   entra**, num peso mais leve — lê como uma frase só.
3. A lista dos 8 hábitos que estava **duplicada** no modal do Método passa
   a ler da fonte única. Duas cópias eram dois nomes: um lado mudaria com
   esta ordem e o outro não.

**Fora do escopo:** produção (segue travada por ordem do dono).

---

## DIR-68 — Vidro que dá pra ler

**Emitida por:** dono (05/09/2026), com print do modal do Quadro dos
Sonhos: *"eu adoro esses menus assim transparentes, de verdade. Mas a
gente só tem que tomar cuidado, porque algumas ficam muito transparentes,
igual essa parte branca. A gente pode deixar transparente, mas escurecer
aonde tem letra, pra deixar o fundinho ali atrás do card. O card todo
transparente é legal. Só a parte que está transparente botar um fundo pra
ler, sem deixar de deixar o fundo transparente."*

**Data:** 05/09/2026.

**Diagnóstico (medido, não achismo):** o card no meio do painel tem o
preto do palco atrás, então o filme branco de 4,5% já se lê. O que quebra
é o que **flutua**: o modal cobre a tela inteira — inclusive os cards
claros do painel de baixo — e o texto de trás atravessava a letra da
frente (no print dele dava pra ler "R$ 3.279,24" dentro do formulário).

**Escopo autorizado:**
1. O que flutua (cortina + cartão do modal) ganha **base escura
   translúcida + desfoque** do que está atrás. Continua transparente —
   alfa 0,82 no cartão, 0,72 na cortina —, mas a letra passa a ter chão.
2. A pastilha `bg-background` do botão "outline" (BRANCO SÓLIDO no tema
   claro, com letra clara em cima = invisível) vira vidro no palco. É a
   mesma "parte branca" da ordem, com outro nome de classe.
3. Botão desabilitado no escuro mantém letra clara e só baixa a força.

**Fora do escopo:** produção (segue travada por ordem do dono); o dropdown
do seletor, que o dono já aprovou preto na DIR-64.

---

## DIR-67 — A fala do professor sai do canto

**Emitida por:** dono (05/09/2026): *"vamos deixar aqui mais organizado.
Exemplo, qual é o seu poder? vamos deixar bem do lado do professor Xavier,
tipo o que ele está falando. Acho que está tudo muito aqui no canto. E o
método vai pra um lugar melhor ou deixa ali mesmo? Dá uma espaçada sem
poluir a imagem — esse meio vazio está legal —, mas eu quero tirar um pouco
dessas coisas aqui. Qual é o seu poder, boa tarde Luiz Santanna, pode
colocar pra lá. Dá uma organizada pra ficar mais visual."*

**Data:** 05/09/2026.

**Escopo autorizado:**
1. A faixa da academia vira **duas colunas**: identidade (marcas ·
   X-office · seletor) à esquerda, **fala do professor** encostada nele à
   direita, e o **meio vazio** preservado como respiro.
2. **"Qual é o seu poder?"** passa a morar do lado da figura, na altura da
   cabeça dele — lida como frase que ele está dizendo.
3. A **saudação** ("Boa tarde, Luiz Santanna") sai da pilha da esquerda e
   vira a primeira linha da fala: ele cumprimenta e então pergunta.
4. O véu preto que cobria a faixa inteira dá lugar a uma **máscara só na
   borda esquerda da figura** — o texto não mora mais por cima dela, então
   o rosto volta em cheio (o "professor em destaque" da DIR-62).

**Decisão minha, dita ao dono:** o **seletor fica onde está**, na coluna da
esquerda. Ele é a única coisa clicável da faixa, e comando de navegação
mora do lado de quem assina a tela — do lado do professor ele viraria
poluição em cima da imagem, exatamente o que a ordem manda evitar.

**Fora do escopo:** produção (segue travada por ordem do dono); a ordem
dos ícones arrastáveis do menu (intocada desde a DIR-57).

---

## DIR-66 — X-office no título e o acabamento fino

**Emitida por:** dono (05/09/2026): *"só mais uns pequenos ajustes pra
ficar extremamente perfeito"* e, em seguida: *"aqui não entra Painel de
Alavancagem — substitui pelo nome X-office, somente aqui; nos restantes,
fora da Top College, mantém Painel de Alavancagem."*

**Data:** 05/09/2026.

**Escopo autorizado:**
1. Dentro da faixa da Top College o título vira **X-office**, com a
   frase oficial da sub-marca. Fora dela, "Painel de Alavancagem"
   continua igual.
2. Acabamento das imagens dos Hábitos: **esfumaçado no pé** (a imagem
   terminava num corte seco contra o painel) e o **título ancorado
   embaixo**, que com a faixa alta ficava flutuando no meio.

**Decisão minha, dita ao dono:** o título entra como TEXTO, não como o
logo do X-office — a faixa já carrega duas marcas, e uma terceira seria
a repetição que ele mandou tirar na DIR-63.

**Não mexido de propósito:** o card "Espelho do Painel de Alavancagem"
(Hábito 7) mantém o nome — ele é um ponteiro pra OUTRA tela de mesmo
nome, e renomear quebraria o sentido da comparação.

**Fora do escopo:** produção (segue travada por ordem do dono).

---

## DIR-65 — A imagem do Hábito inteira, sem corte

**Emitida por:** dono (05/09/2026): *"quero que você aumente aqui de uma
forma que a imagem apareça toda, porque está cortando as imagens. Ver a
parte de baixo, um pouquinho pra cima, pra baixo, pra aparecer essa
imagem toda — essas imagens são muito bonitas."*

**Data:** 05/09/2026.

**A causa (eram DOIS cortes, não um):** o arquivo já era gerado como uma
fresta de 33% da página do brandbook, e o `object-cover` cortava de novo
o que sobrava pra preencher uma altura fixa.

**Escopo autorizado:**
1. Regerar as 8 imagens guardando **63% da cena** (proporção 2.8 no lugar
   de 5.38 — quase o dobro de altura).
2. O bloco passa a ter a **proporção EXATA do arquivo**, sem altura
   fixa: sem sobra, o CSS não tem o que aparar.
3. Reenquadrar caso a caso pelo assunto (o carro, as pessoas, a frase).

**Fora do escopo:** produção (segue travada por ordem do dono).

---

## DIR-64 — O botão no preto, a abertura limpa e as imagens maiores

**Emitida por:** dono (05/09/2026), navegando o preview: *"esse botão não
sei se é bom ali, e quando está abrindo está feio. Está muito grande
esse branco, ele tem que cair em outro lugar. Gostei da transparência,
mas ela tem que abrir num lugar preto, o botão tem que entrar no lugar
preto pra ficar bonito e clean. E quando eu clico no Sonho, no
Compromisso, as imagens estão muito bonitas — elas têm que aparecer.
Deixar mais visualização, mais organizado."*

**Data:** 05/09/2026.

**Escopo autorizado:**
1. O seletor sai do branco e passa a viver **dentro da faixa preta**.
2. O menu dele abre **preto**, com a tipografia da marca — e num
   **portal**, pra não ser cortado pela borda arredondada da faixa.
3. A faixa branca entre a faixa da academia e o painel encolhe.
4. As imagens de cada Hábito **crescem** (de ~160px pra ~240px), com o
   véu escuro mais curto — só o necessário pra segurar o texto.

**Fora do escopo:** produção (segue travada por ordem do dono).

---

## DIR-63 — Parar de repetir as logos

**Emitida por:** dono (05/09/2026), olhando o preview: *"tamo quase lá,
só estou achando que está repetindo muito as logos. Acho que a de cima
precisa só deixar da X-eos, o que acha?"*

**Data:** 05/09/2026.

**Minha leitura, dita a ele antes de mexer:** o incômodo não é uma logo a
mais — é o PAR INTEIRO aparecendo duas vezes na mesma tela, com 300px de
distância (na faixa da academia e de novo no palco dentro do painel).
Tirar a Top College da faixa resolveria metade e deixaria a faixa da
ACADEMIA sem a academia.

**Escopo autorizado:**
1. O palco de marcas de dentro do painel SAI (era a cópia).
2. As frases das duas marcas — único conteúdo que só existia lá — sobem
   pra faixa, numa linha só.
3. A faixa segue com as duas marcas juntas, agora uma vez só na tela.

**Fora do escopo:** produção (segue travada por ordem do dono).

---

## DIR-62 — A faixa da academia: o topo branco vira preto, com o professor

**Emitida por:** dono (05/09/2026): *"ficou muito pequeno o professor,
queria dar ênfase nele. E ali em cima onde está branco, usar aquele
espaço pra botar o professor bem temático, deixando tudo preto ali
maneirão, pra ficar mais foda a academia — puxando a X-EOS juntamente
com a Top College, e o professor bem em destaque. E melhorar aquele que
está escrito ali o método."* Autorização: **"pode fazer o que eu falei,
só não coloca nada em produção agora, é tudo no preview"**.

**Data:** 05/09/2026.

**Escopo autorizado:**
1. O cabeçalho branco do painel vira uma **faixa preta** com o padrão da
   X-EOS, as **duas marcas juntas** (Top College + X-eos), o título, a
   saudação e a pergunta **"Qual é o seu poder?"** em degradê.
2. O **professor em destaque** — imagem grande, entrando pela direita,
   com esfumaçado pro preto. Deixa de ser miniatura.
3. O bloco do seletor logo abaixo acompanha o preto, e o seletor volta a
   dizer ONDE a pessoa está ("Top College / O Método"): a pergunta agora
   vive grande na faixa, e repetir embaixo era ruído.

**LIMITE DE ESCOPO (decisão de arquitetura, registrada):** a faixa só
aparece quando a pessoa está numa seção da TOP COLLEGE. O cabeçalho é o
mesmo em todas as abas do painel — se a faixa ficasse sempre, a
faculdade voltaria a assinar a Carteira e os Pedidos, exatamente a
fronteira que a DIR-57 fechou (Top College forma, Leilão NoZap opera).

**Fora do escopo — reforçado pelo dono nesta rodada:** NADA vai pra
produção. Tudo fica no preview.

---

## DIR-61 — Tudo com cara de uma coisa só: tipografia, X e "qual é o seu poder"

**Emitida por:** dono (05/09/2026), aprovando a rodada anterior ("está
top") e pedindo três coisas: *"como puxar os nomes de baixo da logo no
mesmo formato de letra da logo, pra ficar bem bonito, parecer que tudo é
a mesma coisa. E ali onde está escrito Método, vamos botar só o x — mas
fazer um x aqui só pra isso. E botar a imagem do professor Xavier, bem
pequena, perguntando qual é o seu poder."* Aprovação: **"foda,
vambora"** / *"se for ficar excelente, pode fazer"*.

**Data:** 05/09/2026.

**Escopo autorizado:**
1. O menu inteiro da Top College passa a usar **Sora**, a tipografia
   oficial da X-EOS — os nomes ficam da mesma família da logo e o bloco
   lê como uma peça só, não como logo + interface.
2. A **frase da marca** vira TEXTO de verdade abaixo da arte (não pixel
   dentro da imagem): no lockup ela tem 1/40 da altura do X e só seria
   legível com a logo em ~300px. Como texto, fica nítida em qualquer
   tamanho, e a arte segue inteira — o subtítulo foi APAGADO do arquivo,
   não recortado.
3. Onde estava escrito "O Método", entra **só o X**, num arquivo feito
   só pra esse lugar (X centralizado em quadrado, com folga).
4. Entra o **retrato pequeno** do deck do dono com a pergunta **"Qual é
   o seu poder?"**, no lugar do rótulo.

**Fora do escopo:** publicação em produção (só com "pode" separado).

---

## DIR-60 — A logo em PRATA, inteira, sem cortar nada

**Emitida por:** dono (05/09/2026), com a foto da logo metálica em
mockup: *"tá cortado. Pega essa logo, tire o fundo e cole exatamente
essa só que menor, bem estilo a cor prata, a cor das lâminas. Quero a
logo com essa cor, sem fundo e sem cortar nada."*

**Data:** 05/09/2026.

**O que estava cortado (erro meu na DIR-59):** pra tirar o subtítulo eu
recortei a imagem POR BAIXO — e o X da X-eos desce até o pé da arte, com
um rabo longo na diagonal. O corte amputou esse rabo. A lição: em lockup
com elementos sobrepostos em altura, não se remove texto cortando o
retângulo.

**Escopo autorizado:**
1. Entra o lockup **INTEIRO** (X + "-eos" + a linha "Estrutura de
   operações e expansão"), sem recorte nenhum.
2. Acabamento **prata metálico**, no lugar do branco chapado — o mesmo
   desenho de luz do mockup: claro no topo, banda de brilho no meio, aço
   mais fundo embaixo.
3. Fundo transparente. A arte NÃO vem da foto colada no chat (que chegou
   como imagem no chat, não como arquivo, então não dá pra recortar
   fundo): vem da logo ORIGINAL com transparência já extraída do PDF do
   dono, agora metalizada — resultado melhor que remover fundo de foto,
   sem halo e sem resíduo de textura.
4. A linha do menu cresce pro logo caber inteiro.

**Fora do escopo:** publicação em produção (só com "pode" separado).

---

## DIR-59 — No menu, a logo INTEIRA da X-eos no lugar do texto

**Emitida por:** dono (05/09/2026): *"onde está escrito O Método eu quero
que entre a logo inteira da X-eos, sem o nome O Método"*.

**Data:** 05/09/2026.

**Escopo autorizado:**
1. No menu da Top College (lateral do desktop e acordeão do celular), o
   item "O Método" deixa de escrever o nome: entra a **logo inteira da
   X-eos** no lugar do texto.
2. A logo entra SEM a linha "Estrutura de operações e expansão" — na
   altura de uma linha de menu (22px) aquele subtítulo vira borrão. O
   corte foi medido varrendo as linhas do arquivo (o subtítulo começa em
   y=612), não estimado.
3. O rótulo "O Método" continua existindo como **texto alternativo** da
   imagem: sem isso o item ficaria mudo pra leitor de tela e sem nome na
   busca do menu do celular.
4. O seletor interno da Loja & Vendas NÃO muda: lá o texto "O Método" é
   o "você está aqui", e trocá-lo por logo tiraria a orientação.

**Fora do escopo:** publicação em produção (só com "pode" separado).

---

## DIR-58 — A marca no lugar do ícone genérico

**Emitida por:** dono (05/09/2026), vendo o menu novo: *"conseguimos
inserir a logo da Top College onde é o ícone, pra já entrar a logo e
ficar mais bonito seguindo o padrão da empresa? E onde está escrito
O Método, inserir a logo da X-EOS da mesma forma?"*

**Data:** 05/09/2026.

**Escopo autorizado:**
1. O ícone do grupo **Top College** na lateral passa a ser o SÍMBOLO da
   Top College (o pilar), não um desenho genérico do lucide.
2. O item **O Método** passa a levar o SÍMBOLO da X-eos (o X) — na
   lateral, no menu do celular e no seletor interno.
3. Entra só o SÍMBOLO, nunca o logo inteiro: num quadrado de 20px o nome
   escrito vira borrão. Medido renderizando nos 20px reais antes de
   aplicar.
4. A escolha vem do DADO (campo `marca` na fonte única), então as três
   telas mostram a mesma coisa sem cada uma decidir por conta.

**Fora do escopo:** publicação em produção (só com "pode" separado).

---

## DIR-57 — A Top College vira um DEPARTAMENTO no menu do painel

**Emitida por:** dono (05/09/2026), depois de uma análise pedida em chat:
*"pensa que a Leilão NoZap contratou a Top College, que a gente cuida de
toda a estrutura de expansão, treinamento, desenvolvimento, vendas...
a Top College não tem que ficar lá embaixo, tem que ficar lá em cima...
ver o que a gente pode diminuir, mantendo a fluidez"*. Aprovação:
**"pode fazer"**.

**A ideia que destravou:** a Leilão NoZap CONTRATOU a Top College. Não é
a faculdade tomando o app — é uma fornecedora ocupando um departamento
dentro do cliente. Por isso ela não pinta as telas de caixa (Pedidos,
Comissões, Carteira): ela é dona do que forma a pessoa.

**Regra de fronteira (vale pra qualquer tela futura):** nesta tela a
pessoa está sendo FORMADA ou está OPERANDO? Formada → Top College.
Operando → Leilão NoZap.

**Decisões que o dono tomou na análise:**
1. Vendedores vai pra Top College (gestão de gente é formação);
   Comissões fica na Loja & Vendas (pagamento é caixa).
2. Visão Geral fica FORA, como home neutra — *"vamos testar como você
   falou, caso eu navegando veja que preciso mudar, eu te falo"*.

**Data:** 05/09/2026.

**Escopo autorizado:**
1. Menu lateral reorganizado de ~10 ícones soltos para ~7, aplicando o
   padrão que JÁ existe na casa (grupo vira 1 ícone com menu flutuante,
   como "Operação" e "Central de Vendas" já fazem): Visão Geral ·
   Minha Conta · Operação · Loja & Vendas · **Top College** ·
   Arrematante · Admin.
2. Top College reúne: O Método (8 Hábitos), Time (Vendedores), Carreira,
   Evoluir Nível e Metas — esta última sai de "Operação", onde estava
   solta.
3. "Central de Vendas" vira **Loja & Vendas** e fica só com o caixa:
   Loja Virtual, Relatório, Pedidos, Venda Direta, Comissões.
4. **"CRM" morre como nome** e vira **O Método** — palavra genérica de
   software não combina com uma faculdade própria.
5. O agrupamento passa a ser DADO em `licensingTabs.js` (flag
   `colapsar`), não mais um `if (grupo.title === 'Operação')` repetido
   na lateral do desktop e no menu do celular.

**TRAVA EXPLÍCITA DO DONO:** *"não mudar a questão de como o usuário
organiza... ele pode arrastar e organizar os ícones de acordo com a sua
usabilidade. Não pode mudar essa função, tem que manter"*. A função de
arrastar e a ordem salva por usuário ficam INTACTAS. Os ícones novos
entram no fim da fila de quem já tem ordem salva (o dono foi avisado
disso e aceitou) — nenhum item some, que é a regra que já existia.

**Fora do escopo:** publicação em produção (só com "pode" separado);
gamificação; qualquer mudança de permissão por cargo.

---

## DIR-56 — O painel dos 8 Hábitos VIRA o ambiente da marca

**Emitida por:** dono (05/09/2026), reprovando o resultado da DIR-55 ao
ver no preview: *"CARA QUE LOUCURA É ESSA. EU QUERO O FUNDO FODA COM AS
CORES DAS LOGOS, EU QUERO AS LOGOS ORIGINAIS, EU QUERO TUDO ISSO
TEMÁTICO IGUAL ÀS APRESENTAÇÕES QUE EU TE MANDEI. QUERO TODO O FUNDO
DESSA ÁREA DE TOP COLLEGE E X-EOS. VOCÊ NÃO ENTENDEU ISSO. TODO O
PAINEL NESSA PARTE PRECISA TER A IDENTIDADE VISUAL DESSAS EMPRESAS.
EU NÃO QUERO FUNDO BRANCO NA ÁREA DE VENDAS."* Complementada em
seguida: *"COLOQUE UMAS IMAGENS DO BRANDBOOK NO PAINEL PARA CRIAR MAIS
CONEXÕES, IMAGENS DO BRANDBOOK EM TODO PAINEL. VAMOS DEIXAR MAIS
TEMÁTICO E MENOS COM EMOJIS, E DEIXAR O PAINEL COM VONTADE DE SER
GRANDE. QUERO ISSO FODA."*

**O que a DIR-55 errou:** entregou uma placa de logo no topo de uma
página branca. Identidade visual não é adesivo — é o ambiente inteiro.

**Material de origem (arte ORIGINAL, não recriada):** as logos e as
imagens foram extraídas dos PDFs que o próprio dono anexou — a
apresentação do evento (lockup Top College + X-eos, com canal alfa, em
alta) e o brandbook oficial da X-EOS (padrão tonal de X, sub-marca
X-office, imagens temáticas). Os SVGs desenhados à mão na DIR-55 são
apagados.

**Data:** 05/09/2026.

**Escopo autorizado:**
1. **Fundo:** todo o painel da Central de Vendas em base escura X-EOS
   (#00020C → #0A1020), com o padrão tonal de X do brandbook por trás e
   brilhos suaves no gradiente Top College. Zero área branca.
2. **Superfícies:** todo card (métricas, hábitos, agenda, fila, modais)
   vira vidro escuro — fundo translúcido, borda de luz, texto claro.
3. **Logos originais** no cabeçalho, sobre o fundo escuro, com as
   frases oficiais das duas marcas.
4. **Papel de cada marca:** gradiente Top College (azul→roxo→magenta) no
   que brilha — hábito ativo, título, progresso, botão principal;
   prata/branco X-EOS no que sustenta — bordas, divisores, ícones,
   botões secundários.
5. **Imagens do brandbook em todo o painel:** uma faixa temática por
   Hábito (sonho→carro, compromisso→"grandes batalhas", lista→pessoas,
   contato→ambiente, apresentação→papelaria, acompanhamento→mochila,
   verificação→X-office, duplicação→avião) + a frase "o sucesso é a
   soma de pequenos esforços repetidos dia após dia".
6. **Menos emoji:** os emojis decorativos da navegação e dos títulos dão
   lugar a ícones de traço (lucide), já usados na casa.
7. **Escala:** tipografia e respiro maiores — "vontade de ser grande".

**Fora do escopo:** gamificação / Human Token (o dono segurou até
mandar a planilha); qualquer tela fora da Central de Vendas (cabeçalho
do site, menu lateral, rodapé e demais módulos ficam como estão);
publicação em produção (só com "pode" separado).

---

## DIR-55 — Identidade Top College + X-EOS no painel dos 8 Hábitos

**Emitida por:** dono (05/09/2026, por áudio transcrito): "todo esse
sistema dos oito hábitos de sucesso precisa ter essas cores, a
identidade visual das duas marcas, em locais estratégicos... explicando
que nós somos a primeira faculdade de empreendedorismo do planeta, e a
X-EOS significa estrutura de operação e expansão de qualquer negócio, o
briefing prático do sucesso." Corrigido depois: "eu quero a Top College
e X-EOS JUNTO, seguindo o princípio: Top College a faculdade de
empreendedorismo e X-EOS o sistema, aplicação de cultura e
desenvolvimento — a coluna vertebral da mentalidade." E: "quero que
você deixe melhor, precisa da ênfase nas duas marcas sem diminuir
nenhuma, dando um pouco de grandeza na faculdade sem diminuir a X-EOS."
Desenho do cabeçalho aprovado em chat (faixa azul-marinho, Top College
~60% maior + X-eos ~40% inteiro, subtítulos no mesmo tamanho de fonte).
Aprovação final: **"CAPRICHA QUERO ISSO FODA"**.
**Material de origem:** brandbook oficial da X-EOS (PDF anexado pelo
dono) — cores exatas #00020C (preto/inovação e força) e #F4F4F4
(branco gelo/confiança e modernidade), escala #03000D→#F6F6F9,
tipografia Bauhaus (título)/Sora (corpo); sub-marca "X-office —
verificando o progresso e mapeando processos". Top College sem
brandbook próprio localizado — cores extraídas visualmente das imagens
reais enviadas (gradiente azul→roxo→magenta). Logos das duas marcas
recriados em SVG fiel ao que foi visto (arquivo de origem/vetor não
disponível — dono confirmou seguir assim).
**Data:** 05/09/2026.
**Escopo autorizado:**
1. Cabeçalho do painel "🏆 Os 8 Hábitos do Sucesso": faixa #0A1020 com
   os dois logos lado a lado (responsivo: empilha no celular), Top
   College maior (~60%), X-eos inteiro (~40%), linha fina separando,
   subtítulo oficial de cada marca no mesmo tamanho de fonte.
2. Dentro dos cards de cada Hábito: estrutura (bordas/divisores/barra
   de progresso) na paleta X-EOS (preto/branco/cinza); destaques
   (botão principal, conquista) no gradiente Top College.
3. Hábito 7 (Verificação) ganha o selo "X-office".
4. Tipografia Sora (Google Fonts) pro corpo; substituto geométrico
   arredondado de licença livre pro título (sem o arquivo da Bauhaus
   original).
**Fora do escopo:** gamificação/Human Token/pontos (dono disse
"segura" — vai mandar material próprio); rebranding do resto do site
(só o painel dos Hábitos).
**Regras fixas:** prova em navegador; produção só com novo "pode".
**Status:** EM VIGOR.

---

## DIR-54 — Fila identificada por dono (MINHA × TIME) e reunião da empresa com horário de término

**Emitida por:** dono (05/09/2026, por áudio transcrito, testando as
DIR-50→53 no preview): "nessa parte de cima [a fila do Hábito 4] eu
preciso saber de quem agenda, e só aparecer as minhas agendas... se são
de outras pessoas precisa aparecer" — e no cadastro da reunião da
empresa: "ao invés de botar só duração, melhor botar o horário que
termina — pode manter os minutos, mas eu poder escolher a hora que
termina também".
**Data:** 05/09/2026.
**Escopo autorizado:**
1. A fila "Quem contatar" passa a respeitar o MESMO alternador MINHA ×
   TIME da agenda (só existe pra visão total): MINHA mostra só os
   contatos que EU cadastrei (`created_by_id`); TIME mostra a lista
   inteira, cada um com o chip 👤 do dono do cadastro (nome resolvido
   pelo id — "sem dono definido" pros cadastros legados sem carimbo).
   O rodapé "sem qualificação" acompanha o mesmo escopo.
2. No cadastro de "Reuniões da empresa": ao lado da duração em minutos,
   um alternador "⏱️ Duração" / "🏁 Até às" — no segundo modo, escolhe a
   HORA DE TÉRMINO e o sistema calcula os minutos sozinho (fonte única
   testada). Os dois caminhos continuam salvando só `duracao_min`.
**Regras fixas:** prova em navegador; sem SQL novo.
**Status:** EM VIGOR.

---

## DIR-50 a DIR-53 — Agenda viva: editar/excluir com Google, identificação, visão macro, alarmes e reuniões da empresa

**Emitidas por:** dono (05/09/2026, por áudio transcrito, após aprovar a
DIR-49.1: "muito bom, funcionou"): editar e excluir a agenda "e
automaticamente excluir do Google Agenda"; alarme avisando a reunião,
de preferência "um popup no aplicativo do Leilão NoZap" (perguntou qual
é melhor — análise entregue recomendando Google como alarme oficial +
popup no app agora, web push depois); identificar de quem é a reunião
("botar o nome, tipo Santanna") logo no início do item; verificar se o
filtro minha × time está certo (verificado com o banco: os itens eram
DELE mesmo — o problema era a tela não dizer o dono); no TIME INTEIRO o
total de reuniões da semana com percentual ("a visão macro"); e o espaço
das reuniões do negócio ("toda segunda: Mentalidade do Diretor e do
CEO"), salvo pra todo mundo que participa. Documento em 5 pontos
aprovado com **"pode"**.
**Data:** 05/09/2026.
**Escopo autorizado:**
- **DIR-50 (editar/excluir + dono visível):** cada reunião do método
  (hoje e próximas) ganha ✏️ Editar (agendador pré-preenchido; salvar
  atualiza o registro E o evento no Google via PATCH) e 🗑️ Excluir
  (confirmação; apaga o registro E o evento no Google via DELETE) — só
  pra quem registrou ou visão total. Passamos a guardar
  `google_event_id`; nos eventos antigos o id é extraído do próprio
  link (fonte única testada). Falha no Google nunca trava: conclui no
  método e avisa com o link. Identificação: todo item abre com o dono —
  "👤 você" na MINHA, nome forte no início no TIME.
- **DIR-51 (visão macro):** faixa no topo do TIME INTEIRO com o total
  de reuniões da SEMANA, quebra por pessoa e % da meta do método
  (3 apresentações/dia por executivo). Fonte única testada.
- **DIR-52 (reuniões da empresa):** tabela nova `reunioes_empresa`
  (migração no padrão da casa — o dono cola o SQL): título, recorrente
  semanal (dia_semana) ou data única, hora, duração, público, ativo.
  Admin cria/desativa na própria agenda; aparece pra TODOS com selo 🏛️
  na linha do tempo do dia. entityWrite ganha a tabela (escrita só
  admin — cargo comercial não grava reunião da empresa).
- **DIR-53 (alarmes):** todo evento criado no Google sai com alarme
  popup 30 e 10 min antes (reminders na API). No app: aviso fixo
  "🔔 reunião em X min" quando uma reunião MINHA está pra começar
  (checagem local, app aberto), dispensável. Web push com app fechado
  fica REGISTRADO como diretiva futura (depende do service worker).
**Fora do escopo:** web push; agenda de outra pessoa no Google; editar
reunião da esteira por aqui.
**Regras fixas:** prova em navegador; escrita via entityWrite; produção
só com novo "pode".
**Status:** EM VIGOR.

---

## DIR-49.1 — Salvar não pode apagar a tela: recarga silenciosa, histórico e próximas reuniões

**Emitida por:** dono (05/09/2026, por escrito, testando a DIR-49 no
preview): "eu registrei o contato e não aparece salvo o que eu fiz;
conectei a agenda, aparece conectado, agendei o evento logo após e não
aparece nada e volta para conectar a agenda — preciso que você resolva
isso definitivamente de forma diligente e identifique de fato onde está
o erro".
**Diagnóstico MEDIDO (banco de produção consultado):** os 3 registros
dele SALVARAM (feito 10:19 + dois agendados 14/09, ambos com link REAL
de evento criado na Google Agenda — ele agendou duas vezes por falta de
feedback). O erro real é de tela: (a) `loadCustomers` liga `isLoading`
e o CrmClientesTab troca TUDO por "Carregando..." — o CrmMetodo é
DESMONTADO e o estado do Google (token + eventos) morre, por isso o
botão volta pra "Conectar"; (b) desfecho "feito" não aparece em lugar
nenhum; (c) reunião de dia FUTURO é invisível (a agenda só mostra hoje).
**Data:** 05/09/2026.
**Escopo autorizado:**
1. **Recarga silenciosa:** o spinner de página inteira só na PRIMEIRA
   carga; recarregar clientes depois de salvar não desmonta mais a tela
   (a conexão do Google sobrevive ao salvamento).
2. **Histórico visível na fila:** cada contato mostra o último desfecho
   registrado ("último: ✅ Contato feito · 05/09 07:19").
3. **📆 Próximas reuniões:** seção na agenda com os agendados de dias
   futuros (respeitando MINHA × TIME), com data+hora e Abrir no Google.
   Fonte única `proximasReunioes`/`ultimoContato` em `src/lib/metodo.js`.
4. **Toast que diz pra onde foi:** agendou → "Reunião agendada — 14/09
   07:19" (não um genérico "registrado").
**Regras fixas:** prova em navegador incluindo o cenário
"Google conectado sobrevive ao salvar"; sem SQL.
**Status:** EM VIGOR.

---

## DIR-49 — Clareza total do Hábito 4: agendar em 1 clique, minha agenda × time, linha do tempo unificada

**Emitida por:** dono (04/09/2026, por escrito, após ver o Hábito 4
funcionando em produção): "não está aparecendo de forma clara ainda como
posso agendar; mais uma coisa — está aparecendo a agenda de todos pois sou
super admin, isso precisa ter uma comunicação melhor, eu visualizar quem é
e ter minha própria agenda; quero que faça uma análise sênior e veja os
pontos para ficar mais foda e tudo mais claro e precisa funcionar".
Análise sênior entregue em chat ANTES do código (regra da casa); desenho
em 5 pontos aprovado com **"PODE"**.
**Data:** 04/09/2026.
**Escopo autorizado:**
1. **Fila com dois botões claros por contato:** 📅 **Agendar** (abre o
   agendador DIRETO com a pessoa já escolhida — um clique) e ✍️
   **Registrar** (os 5 desfechos de sempre). O caminho de agendar deixa
   de morar escondido dentro do "Registrar contato".
2. **Alternador no topo da Agenda do dia:** 🙋 **MINHA AGENDA** · 👥
   **TIME INTEIRO** — a opção "time" só existe pra quem tem visão total
   (super admin); o PADRÃO é "minha". No modo time, cada item carrega o
   chip forte do responsável (👤 Nome) — dono de cada reunião óbvio à
   primeira vista.
3. **"Minha agenda de hoje" UNIFICADA:** as reuniões do método DA PESSOA
   + os eventos do Google DELA numa linha do tempo só, ordenada por hora,
   cada item marcado pela origem (📅 método · 🗓️ Google). O botão
   Conectar/Atualizar Google mora no MESMO card. Fonte única em
   `src/lib/metodo.js` (linha do tempo testada).
4. **Fila honesta:** rodapé "⭐ +N da sua lista ainda sem qualificação —
   qualificar no Hábito 3 →" quando existir gente fora da fila (a lista
   com 7 e a fila "(4)" sem explicação confunde).
5. **Polimento de clareza:** agendador com passos numerados (1. Com quem
   · 2. Quando · 3. Onde · 4. Google), botão principal maior, plurais
   corretos nos contadores (reunião/reuniões, retorno/retornos).
**Fora do escopo:** SQL novo (nada de migração); editar/cancelar evento
do Google; agenda de outra pessoa no Google.
**Regras fixas:** prova em navegador (REL-34.1) antes da entrega;
escrita via entityWrite; produção só com novo "pode" do dono.
**Status:** EM VIGOR.

---

## DIR-48 — Agendador de reuniões de verdade, criando o evento no Google

**Emitida por:** dono (03/09/2026, por escrito, após conectar a agenda
com sucesso): "não aparece o portal do Google ou local pra eu agendar —
precisa abrir um MODAL pra eu agendar a reunião, detalhes e etc, como um
agendador de reunião normal, como o mercado funciona — junto disso o
Google Agenda".
**Data:** 03/09/2026.
**Escopo autorizado:**
1. O desfecho "📅 Reunião agendada" do registro de contato vira o
   AGENDADOR COMPLETO: data + hora, duração (30/45/60/90 — método sugere
   45-60), título (pré-preenchido), local ou link da chamada, detalhes.
   Botão "📅 Agendar reunião" também no cabeçalho da Agenda do dia,
   abrindo o mesmo modal com seletor de contato.
2. CRIAÇÃO REAL NO GOOGLE: opção "criar na minha Google Agenda" (ligada
   por padrão quando a conta está conectada) — o evento é CRIADO via
   Calendar API na agenda da própria pessoa (scope calendar.events junto
   do readonly, mesmo fluxo de token no navegador; nada no servidor).
   O registro guarda o link do evento criado (google_event_link) e a
   Agenda do dia passa a oferecer "abrir no Google" nesses itens.
   FALLBACK HONESTO: sem conexão/permissão/erro, cai no link de template
   oficial (o de hoje) — agendar nunca é bloqueado pelo Google.
3. `src/lib/metodo.js`: eventoGoogleDaReuniao (monta o corpo do evento —
   summary/description/location/start/end com timezone — fonte única
   testada); registro ganha duracao_min, titulo_reuniao, local,
   google_event_link (JSONB livre — SEM migração).
**Fora do escopo:** editar/cancelar evento já criado no Google (rodada
própria); agendar na agenda de OUTRA pessoa.
**Regras fixas:** prova em navegador (REL-34.1); escrita via entityWrite.
**Status:** EM VIGOR.

---

## DIR-47 — Contato e Convite vivo: fila, registro, agenda do dia e Google

**Emitida por:** dono (03/09/2026, por escrito): "no Contato e Convite
quero: aparecer JÁ os contatos qualificados da lista de network; criar o
registro do contato — feito, agendado, pediu pra retornar e as possíveis
coisas que acontecem após o contato; no agendado abrir o Google Agenda;
a possibilidade da pessoa CONECTAR a agenda do Google dela e aparecer ali
as agendas; e pro super admin aparecerem TODAS as agendas do dia".
**Data:** 03/09/2026.
**Escopo autorizado:**
1. `src/lib/metodo.js` (fonte única, testada): RESULTADOS_CONTATO
   (✅ feito · 📅 agendado · 🔁 pediu pra retornar · 📵 não atendeu ·
   🚫 sem interesse), validação do registro (agendado exige data/hora;
   retornar exige data) e agendaDoDiaContatos (agendados + retornos do
   dia, varrendo o histórico dos clientes do ESCOPO — super admin vê o
   time inteiro porque o escopo dele já é tudo).
2. Migração `20260903190000_contatos_metodo.sql` (DONO COLA):
   `customers.contatos_metodo JSONB` — HISTÓRICO (array) de registros
   {resultado, em, quando?, retornar_em?, obs, registrado_por_id/nome}.
3. `CrmContatoRegistroModal.jsx`: escolhe o desfecho, campos condicionais
   (data/hora do agendado com botão GOOGLE AGENDA na hora — link de
   template oficial já usado no Hábito 5; data do retorno), observação.
4. Painel Contato (Hábito 4) em `CrmMetodo.jsx`: (a) FILA DOS
   QUALIFICADOS da lista (DIR-46) por probabilidade, com Registrar
   contato; (b) 📅 AGENDA DO DIA: agendados + retornos de hoje do escopo
   (super admin = todas) + reuniões da esteira de hoje, cada agendado com
   botão Google Agenda; (c) 🗓️ CONECTAR MINHA GOOGLE AGENDA: leitura dos
   eventos de HOJE da conta Google da própria pessoa, no navegador dela
   (GIS token client + calendar.readonly, MESMO GOOGLE_CLIENT_ID do
   login; sem guardar token no servidor); (d) o script pessoal continua.
**Honestidade de escopo:** a Google Agenda conectada é PESSOAL (vive no
navegador de cada um — o admin não vê a agenda Google dos outros; ele vê
todas as agendas DO MÉTODO). O escopo calendar.readonly pode exigir
verificação do app no console Google pra sumir o aviso de "app não
verificado" — registrado como ação futura do dono se o aviso aparecer.
**Fora do escopo:** sync bidirecional/gravação no Google; guardar token
Google no servidor.
**Regras fixas:** prova em navegador (REL-34.1); escrita via entityWrite.
**Status:** EM VIGOR.

---

## DIR-46 — Lista de Network QUALIFICADA: 3 notas, produto e probabilidade

**Emitida por:** dono (03/09/2026, por escrito): "é tipo uma agenda de
telefone; dentro dela, de 1 a 5: CONFIANÇA EM MIM (ex. 3), CONDIÇÃO
FINANCEIRA (ex. 4) e APETITE AO PRODUTO APRESENTADO (ex. 5) — soma o
total; precisa ter um modal onde o executivo escolhe QUAL PRODUTO está
apresentando (Parceiro de Compra ou as Licenças); e na lista precisa
aparecer a PROBABILIDADE DE FECHAMENTO de acordo com essa qualificação".
Nota de fidelidade: no exemplo ditado a soma 3+4+5 = 12 de 15 (o "14"
falado foi lapso de conta — a regra é a SOMA).
**Data:** 03/09/2026.
**Escopo autorizado:**
1. `src/lib/metodo.js` (fonte única, testada): PRODUTOS_APRESENTACAO
   (parceiro_compra | licencas), DIMENSOES_QUALIFICACAO (confiança ·
   financeira · apetite), totalQualificacao (soma 3-15),
   probabilidadeFechamento — régua transparente: pct = (total−3)/12
   (1/1/1 = 0%, 3/4/5 = 75%, 5/5/5 = 100%), faixas 🔥 quente ≥70% ·
   🌤 morno ≥40% · ❄️ frio abaixo.
2. Migração `20260903150000_network_qualificacao.sql` (DONO COLA ANTES DE
   USAR): `customers.qualificacao_network JSONB`
   ({produto, confianca, financeiro, apetite}).
3. `CrmNetworkQualificacaoModal.jsx` (padrão de overlay da casa): escolhe
   o produto apresentado, dá as 3 notas em fichas 1-5, vê o total e a
   probabilidade AO VIVO, salva.
4. Painel Lista (Hábito 3) em `CrmMetodo.jsx` vira a agenda qualificada:
   busca por nome/telefone, ordenada por probabilidade (não qualificados
   por último), cada linha com as 3 notas, produto, total X/15 e a
   probabilidade com cor da faixa; botão Qualificar/Editar abre o modal.
   A estrela única antiga (customers.qualificacao) fica intocada no banco.
**Fora do escopo:** importação da agenda do celular (rodada própria);
mexer na coluna legada `qualificacao`.
**Regras fixas:** prova em navegador (REL-34.1); escrita via entityWrite.
**Status:** EM VIGOR.

---

## DIR-45 — A Rotina Perfeita: Hábito 2 vira narrativa diária de autoridade

**Emitida por:** dono (03/09/2026, por escrito, documento completo): o
gerador muda de nome pra "Gerar Minha Rotina Perfeita (Rotina do Método)"
e a rotina deixa de ser agenda de tarefas pra virar a NARRATIVA DIÁRIA nas
redes: "não estamos criando agenda de posts — estamos transformando a
rotina real da pessoa em narrativa: disciplina, saúde, aprendizado,
trabalho e negócio. A pessoa não deve parecer interessada em vender; ela
precisa se tornar interessante, e a venda vira consequência da
credibilidade". Cinco percepções: DISCIPLINA → HUMANIDADE → EVOLUÇÃO →
CREDIBILIDADE → NEGÓCIO. Regra: "Primeiro seja interessante. Depois
desperte interesse."
**Data:** 03/09/2026.
**Escopo autorizado:**
**ADENDO DIR-45.1 (mesma data):** dono corrigiu o fluxo — 06:45 é o
TÉRMINO do treino (leitura vem após); na chegada organiza-se o AMBIENTE,
não o dia; item novo 08:55 TODOS na sala ("09:00 não é horário de chegar,
é horário de começar"); cadeia do princípio vira VIDA INTERESSANTE →
PROVA SOCIAL → AUTORIDADE → CONFIANÇA → NEGÓCIO → VENDA; 20 itens.

1. `src/lib/metodo.js` (fonte única): ROTINA_PADRAO reescrita com o
   conteúdo DITADO — 20 itens na v2 (novos: story ANTES do treino às 05:15,
   story DURANTE às 05:30, FINAL do treino 06:45 com
   começou→fez→terminou, leitura 07:00, caminho pra empresa 08:00 com
   story espontâneo sem forçar conteúdo, chegada/ambiente 08:30 como
   prova de realidade, organização 08:45 com as "3 coisas do dia", post
   do aprendizado 09:40 em 1-3 minutos, "Abrir a loja" 10:00 como
   horário SIMBÓLICO com a sequência inspiração→aplicação→negócio→
   comparação→LeilãoNoZap, reuniões sempre com PRÓXIMO PASSO DEFINIDO,
   17:30 nenhuma oportunidade solta, 18:30 prometi/fiz/pendente/amanhã,
   21:30 dormir cedo é preparação). Cada item ganha `guia` (a orientação
   estratégica rica); + PRINCIPIO_ROTINA (percepções + regra) +
   NARRATIVA_DO_DIA (a escada "Tenho propósito → ... → Presto contas") +
   guiaDaRotina(titulo).
2. Painel Compromisso em `CrmMetodo.jsx`: botão vira "⚡ Gerar Minha
   Rotina Perfeita (Rotina do Método)"; bloco do princípio no topo;
   cartão de tarefa da rotina ganha "ver o guia" expansível (o guia mora
   na lib, tarefa customizada não tem — sem migração); escada da
   narrativa num "ver a lógica do dia".
**Fora do escopo:** editor visual da rotina (segue pendência); coluna nova
no banco (guia NÃO vai pra metodo_tarefas).
**Regras fixas:** prova em navegador (REL-34.1); conteúdo ditado é DADO —
fidelidade ao texto do dono, condensado sem perder a instrução.
**Status:** EM VIGOR.

---

## DIR-44 — Quadro dos Sonhos de verdade: curto/médio/longo com imagem

**Emitida por:** dono (03/09/2026, áudio, sobre o preview dos 8 Hábitos):
"o sonho é de curto, médio e longo prazo — curto 1 a 2 anos, médio 2 a 4,
longo 5 pra frente; em cada área ele coloca quantas imagens quiser; tem que
ter uma aba da internet pra procurar a imagem SEM SAIR DO MODAL, colocando o
nome, ou fazer upload; desenha um quadro grande com as imagens retangulares
bem espaçadas; precisa ter uma explicação do que é o sonho; abaixo de cada
imagem ele escreve os detalhes do sonho, com orientação (se for um carro:
ano, cor, banco de couro, roda); se o sistema identificar a imagem e colocar
os detalhes automático, maravilhoso — se não pegar, ele escreve embaixo.
Então eu quero que você coloque isso."
**Data:** 03/09/2026.
**Escopo autorizado:**
1. `src/lib/metodo.js` (fonte única, testada): HORIZONTES_SONHO (curto 1-2
   anos · médio 2-4 · longo 5+), normalizarSonho (legado `{titulo}`/string
   continua valendo, horizonte padrão curto), agruparSonhosPorHorizonte
   (preserva o índice real pra edição/remoção segura),
   PLACEHOLDER_DETALHES_SONHO (a orientação ditada do carro). Dado continua
   em `metodo_perfil.sonhos` (JSONB livre — SEM migração): item vira
   `{ id, horizonte, titulo, imagem_url?, detalhes? }`.
2. `src/lib/buscaFotos.js`: lerRespostaFotos — a MESMA leitura honesta de
   resposta do BuscadorFotos do admin (camadas resp/.data/.data.data,
   images + products[].imageUrl, dedupe, distinção sem_resultado ×
   falha_busca), extraída e testada; o BuscadorFotos não é alterado nesta
   rodada.
3. `CrmSonhoModal.jsx` (padrão de overlay da casa): escolha do horizonte,
   nome do sonho, aba 🔍 **Buscar na internet** (REUSA a rota
   `extractGoogleShoppingImages` já em produção — grade multi-seleção) e
   aba 📤 **Enviar imagem** (REUSA `Core.UploadFile` → Supabase
   `public-assets`, com `convertToWebP` antes). Imagem escolhida da busca
   passa pela rota `proxyImage` existente (re-hospeda no nosso bucket —
   thumbnail de terceiro morre; lendo `file_url || data.file_url`, com
   fallback pra URL original se o proxy falhar). Caminho só-texto (sonho sem
   imagem) continua existindo.
4. Painel do Sonho em `CrmMetodo.jsx` vira o QUADRO: explicação do hábito +
   3 quadros (curto/médio/longo) com grade de cartões retangulares
   (imagem em cima, título e DETALHES editáveis embaixo, placeholder
   guiado), botão Adicionar por quadro, remover por item (por id — conserta
   a remoção por índice), sonhos legados aparecem como cartão de texto no
   curto prazo.
5. Rota nova `api/functions/descreverImagemSonho.js` (os "detalhes
   automáticos"): POST `{imageUrl, titulo}`, porteiro `conferirUrl`
   (anti-SSRF), crachá via `exigirSessao` (etapa 1/2 da casa), visão pelo
   Vercel AI Gateway (mesma AI_GATEWAY_API_KEY e molde do atendimentoIA;
   modelo default com visão) devolvendo 2-4 linhas de detalhes concretos.
   **Degrada com elegância**: sem chave/erro → `needs_key`/`success:false`
   e o usuário escreve na mão (o dono autorizou exatamente esse fallback).
   Teste invoca o HANDLER REAL (regra REL-34.2), incluindo
   SESSAO_MODO=bloquear com crachá forjado.
**ADENDO do dono (03/09/2026, após ver o preview: "ficou ótimo, falta
isso"):** além da busca e do upload, um campo no modal pra COLAR o
endereço de uma imagem da internet e adicionar por ele — a URL colada
entra na galeria, é selecionável como as demais e passa pelo MESMO
proxyImage na confirmação (link colado também morre).
**Fora do escopo / proibido:** mudar o BuscadorFotos/fluxos do admin;
migração de banco (não precisa); publicar em produção sem o "pode" do dono;
consertar os callers antigos de proxyImage que leem `.data.file_url`
(registrado como pendência).
**Regras fixas:** prova em navegador real (REL-34.1) antes da entrega;
nenhuma além da DIR-5 a DIR-43.
**Status:** EM VIGOR.

---

## DIR-43 — O Método VIVO: seção 📖 Método no CRM (8 hábitos funcionais)

**Emitida por:** dono (01/09/2026, áudio): "não quero resumo, quero o
método NO CRM — quadro dos sonhos; o compromisso como um master task
tipo Trello com a minha rotina do dia (5h acordar → corrida + post →
leitura → 8h30 empresa → 9h treinamento → posts → 10h abrir a loja →
10h30-11h30 organização e confirmar reuniões → 3 reuniões/dia de
45-60min a partir das 13h → fechar contratos → fechamento do dia), com
exemplos; a lista onde adiciono as pessoas da agenda e qualifico de 1 a
5; o script que cada um escreve o seu; a apresentação como agenda
puxando o Google Agenda; acompanhamento/fechamento é a esteira;
verificação é a Visão Executiva; duplicação é o local de treinamento —
desenhe tudo e aplique".
**Data:** 01/09/2026.
**Escopo autorizado:**
1. Migração `20260901230000_metodo_vivo.sql` (dono cola):
   `metodo_perfil` (id, user_id único, sonhos JSONB, rotina JSONB,
   script TEXT, apresentacao_url TEXT), `metodo_tarefas` (id, user_id,
   data, hora, titulo, detalhe, feito, ordem) com DELETE permitido
   (tarefa pessoal), e `customers.qualificacao SMALLINT` (1-5). RLS
   permissivo no padrão da casa; tabelas na whitelist do entityWrite
   (lição do REL-34.2, com teste de regressão).
2. `src/lib/metodo.js` (fonte única, testada): HABITOS (conteúdo do
   deck — o CrmMetodoModal passa a ler daqui), ROTINA_PADRAO com a
   rotina ditada do dono como exemplo, períodos (manhã/tarde/noite),
   gerarTarefasDoDia, progressoDia, linkGoogleAgenda (URL de template do
   Google Calendar — agenda sem OAuth), qualificação 1-5.
3. **CORREÇÃO DO DONO (mesma data, em áudio): "isso aqui não é um CRM —
   tem que ser os 8 Hábitos primeiro; o CRM é a parte do acompanhamento
   e da verificação do progresso, DENTRO dos 8 hábitos".** O painel
   inteiro vira "🏆 Os 8 Hábitos do Sucesso": navegação principal pelos
   8 hábitos; Acompanhamento e Fechamento = o CRM atual (Clientes +
   Expansão/esteira, com alternador interno); Verificação do Progresso
   = a Visão Executiva atual. `CrmMetodo.jsx` renderiza os painéis
   novos: 🌟 Sonho (quadro editável) · ✅ Compromisso (Master Task
   diário: gerar dia da rotina, marcar feito, adicionar/editar/apagar,
   progresso) · 🤝 Lista (contatos manuais com estrelas 1-5 inline) ·
   📜 Script (cada um escreve o seu, com modelo de exemplo) · 🎤
   Apresentação (agenda de reuniões da esteira 7 dias + botão "Google
   Agenda" por reunião + placar 3 reuniões/dia + link da apresentação
   oficial) · 🛤️ Fechamento (atalho pra Expansão) · 📊 Verificação
   (atalho pra Visão Executiva) · 🔁 Duplicação (os 8 hábitos + espaço
   de treinamento).
**Fora do escopo / proibido:** OAuth/sincronização bidirecional com o
Google Calendar (v1 usa o link de template oficial do Google — rodada
própria se o dono quiser sync automático); upload de vídeo de
treinamento (v1 marca o espaço).
**Regras fixas:** nenhuma além da DIR-5 a DIR-42 (inclui prova em
navegador e handler real do entityWrite em teste).
**Status:** EM VIGOR.

---

## DIR-42 — Um preview só: selo na página e volta pro link oficial

**Emitida por:** dono (01/09/2026, áudio): "não quero toda hora um novo
preview; quero ficar sempre no mesmo link, ver a atualização acontecer na
página (a contagem) e depois publicar no site — estou perdido, nunca sei
qual é o verdadeiro".
**Data:** 01/09/2026.
**Diagnóstico (dado real da Vercel):** cada deploy gera uma URL congelada
própria (leilonozap-XXXX-...), e o dono vinha abrindo essas; nelas o
aviso de atualização NUNCA dispara (o /version.json de um deploy
congelado não muda nunca). O link estável que acompanha a branch é o
branchAlias, confirmado em TODOS os deploys da branch:
`leilonozap-git-claude-project-struct-fffd43-leilaapp-s-projects.vercel.app`
— nele o aviso de atualização já funciona (useAppVersion compara o
carimbo do build com o /version.json a cada 60s).
**Escopo autorizado:**
1. `src/lib/previewInfo.js` (novo, testado): `tipoDeHost(hostname)` →
   producao (site/custom domain) · preview_oficial (host com "-git-") ·
   deploy_congelado (vercel.app sem "-git-"); HOST_PREVIEW_OFICIAL.
2. `SeloPreview.jsx` montado no App: em preview oficial, selo verde
   discreto "🧪 Preview oficial · build DD/MM HH:mm"; em deploy
   congelado, faixa âmbar/vermelha "⚠️ Página antiga (congelada)" com
   LINK de um clique pro mesmo caminho no preview oficial. Em produção,
   nada aparece.
**Fora do escopo / proibido:** mexer no useAppVersion (já correto);
domínio custom pro preview (exige configuração de domínio — rodada
própria se o dono quiser um nome mais bonito).
**Regras fixas:** nenhuma além da DIR-5 a DIR-41 (inclui prova em
navegador).
**Status:** EM VIGOR.

---

## DIR-41 — O Método no CRM: FORM, PPV obrigatório e Verificação

**Emitida por:** dono (01/09/2026): PDF "O Sucesso Não Negocia com a
Mediocridade — os 8 Hábitos" + "ESCREVA TUDO QUE ENTENDEU E O QUE VAMOS
FAZER PARA DEIXAR ISSO FODA" + aprovação do plano em chat: "VAMOS FAZER".
**Data:** 01/09/2026.
**Princípio:** o CRM vira o guardião do método — "cada etapa precisa
conduzir ao próximo ponto" deixa de ser slide e vira regra cobrada pelo
sistema.
**Escopo autorizado (3 fases):**
1. FORM no cliente (Hábito 4): coluna `form_metodo JSONB` em customers
   ({familia, ocupacao, recreacao, mensagem}); bloco F.O.R.M. no modal
   do cliente (mesmo salvar das anotações); fusão carrega o FORM pra
   linha automática; a fila "Quem contatar hoje" mostra o que se sabe
   da pessoa antes do WhatsApp.
2. PPV + objeções (Hábitos 5-6): coluna `objecao TEXT` na esteira;
   OBJECOES oficiais do deck (não tenho dinheiro / preciso pensar /
   tenho medo / não conheço / outra); `semPPV` na lib — oportunidade
   ATIVA sem reunião futura nem recontato futuro = sem Próximo Ponto de
   Venda → badge vermelho "⚠️ sem PPV" no kanban; campo "Objeção atual"
   no modal.
3. Verificação + duplicação (Hábitos 7-8): centro de comando ganha
   "sem PPV" (total e por responsável na tabela do time) e o placar de
   objeções que mais travam a esteira; botão "📖 O Método" no CRM abre
   o resumo dos 8 hábitos (o time novo aprende dentro da ferramenta).
**Migração** `20260901210000_metodo_form_ppv.sql` (dono cola): as duas
colunas acima.
**Fora do escopo / proibido:** qualquer número inventado (objeção/PPV
só contam o que foi registrado); mexer em critério de dinheiro real;
bloquear salvar por falta de PPV (avisa e marca, não tranca — o dono
manda na régua, o sistema cobra).
**Regras fixas:** nenhuma além da DIR-5 a DIR-40 (inclui prova em
navegador).
**Status:** EM VIGOR.

---

## DIR-40 — Aporte recebido POR FORA (Santander/Itaú), com auditoria

**Emitida por:** dono (01/09/2026, áudio): "tem que ter um botão de que o
dinheiro entrou por transferência de fora — só Santander e Itaú, que são
as duas contas que podem aportar capital; tem pagamento por fora também".
Contexto: o Fechado 100% do Renan Silva ficou "⚠️ sem dinheiro na conta"
porque o aporte não passou pelo app — comportamento correto do chip; o
que faltava era o registro AUDITADO do dinheiro externo (mesma decisão
da ativação manual de plano na DIR-22: dinheiro fora do gateway conta
quando confirmado pelo dono, com carimbo).
**Data:** 01/09/2026.
**Escopo autorizado:**
1. Migração `20260901180000_captacao_aporte_externo.sql` (dono cola):
   coluna `aporte_externo JSONB` em captacao_oportunidades —
   {banco, valor, data, registrado_por_id, registrado_por, em}.
2. `esteiraCaptacao.js`: BANCOS_APORTE_EXTERNO = Santander e Itaú
   (SOMENTE); `aporteExternoValido`; `dinheiroNaConta` passa a aceitar
   venda real OU aporte externo válido (chip verde mostra o banco).
3. Modal da oportunidade (Fechado 100% sem dinheiro rastreado): botão
   "💵 Dinheiro entrou por fora" — banco (Santander/Itaú), valor, data →
   grava com carimbo de quem registrou e quando. SÓ para quem vê
   dinheiro da empresa (super_admin/admin/admin_financeiro).
4. `calcularCaptacao` ganha os aportes externos válidos no balde
   "Aportes Parceiro de Compra" — o card Captação e a barra da meta de
   R$ 1 mi passam a contar o dinheiro externo registrado (fonte única).
**Anti-dupla-contagem (registrado):** se o plano do parceiro for depois
ativado MANUALMENTE no painel (partner_plan_purchases manual, que também
conta na captação), o mesmo aporte contaria duas vezes — aviso explícito
no formulário; registrar num lugar OU no outro.
**Fora do escopo / proibido:** mexer no critério isVendaReal (dinheiro
real global); botão de "remover" aporte registrado (correção só por
ordem expressa do dono); bancos além de Santander/Itaú.
**Regras fixas:** nenhuma além da DIR-5 a DIR-39 (inclui prova em
navegador).
**Status:** EM VIGOR.

---

## DIR-39 — Time Corporativo: contratos do topo, com indicação rastreada

**Emitida por:** dono (01/09/2026, áudio + confirmação em chat): as metas
de licença/parceiro são do TIME CORPORATIVO (topo). Aba "Vendedores"
passa a listar quem tem cargo executivo JÁ CADASTRADO no app (Sócio
Executivo até Fundador — TODOS os cargos do topo, confirmado; Trainee
fica fora, está em formação), pela FUNÇÃO PRINCIPAL, com filtro por
função. Cadastro manual continua existindo; registros manuais saem só da
LISTAGEM (dados preservados — confirmado). Responsável de contrato da
esteira SEMPRE é um executivo do topo; entra o campo "indicação da
estrutura": quem indicou precisa estar CADASTRADO no app (qualquer
nível) — indicação sem cadastro não existe. SQL das colunas novas
entregue pro dono colar (confirmado: "aguardo o SQL").
**Data:** 01/09/2026.
**Escopo autorizado:**
1. Migração `20260901150000_captacao_indicacao.sql` (dono cola):
   `indicacao_user_id` + `indicacao_nome` em captacao_oportunidades.
2. `src/lib/timeCorporativo.js` (novo, testado): CARGOS_TOPO
   (executivo_conta → fundador), `ehExecutivoTopo`, `membrosDoTopo`
   (função principal normalizada, ordenado pela hierarquia). Fonte
   única sobre careerLevels.
3. Aba "Vendedores" vira "🏛️ Time Corporativo": lista automática dos
   membros do topo cadastrados no app (nome, contato, função principal
   com a cor do cargo, filtro por função). Botão e modal de cadastro
   manual de vendedor continuam; a tabela manual não é apagada, só sai
   desta listagem.
4. Esteira: seletor "Executivo responsável" só oferece o topo (id+nome
   do app_user); campo novo "Indicação da estrutura (opcional)" com a
   MESMA busca de pessoa do CRM sobre usuários cadastrados — grava
   indicacao_user_id/nome; cartão do kanban mostra "via {indicação}".
**Fora do escopo / proibido:** apagar dados da tabela sellers; mexer em
comissão/percentuais dos cargos; indicação por texto livre.
**Regras fixas:** nenhuma além da DIR-5 a DIR-38 (inclui prova em
navegador).
**Status:** EM VIGOR.

---

## DIR-38 — Visão Executiva = centro de comando (esteira, agenda e projeção)

**Emitida por:** dono (01/09/2026, áudio): "na Visão Executiva entre tudo
de forma organizada, minimalista e clean — as agendas, a esteira com a
quantidade por estágio (agendamento X pessoas, 99% X, fechado X), o
volume nas metas; sincronismo das outras abas na visão geral pra bater o
olho e entender; medir a quantidade de reuniões no DIA e o percentual
por pessoa do time; máquina de potencialização de contrato e de projeção
da meta".
**Data:** 01/09/2026.
**Decisão de honestidade (regra de dinheiro real):** aporte DECLARADO na
esteira NÃO entra na meta de vendas de R$ 5 mi (que é venda real de
Loja+Leilão+PDV) nem se soma como se fosse dinheiro — as DUAS metas
aparecem lado a lado na mesma vista: Vendas R$ X/5 mi e Captação
R$ Y/1 mi, com o fechado separado em "na conta (real)" × "declarado
(sem dinheiro na conta ainda)" × "em esteira (ponderado)".
**Escopo autorizado:**
1. `src/lib/agendaEsteira.js` (novo, testado): agenda do dia da esteira
   (reuniões HOJE, atrasadas, na semana, recontatos vencidos) e reuniões
   por responsável (hoje/marcadas). `fechadoProvado` em esteiraCaptacao
   (na conta × declarado). Fonte única.
2. `CrmEsteiraResumoExecutivo.jsx` (novo, substitui a faixa simples da
   DIR-36 na Visão Executiva): barra da meta de captação R$ 1 mi
   (na conta + declarado + ponderado, cada um na sua cor), funil da
   esteira em CHIPS por estágio (quantidade + valor), agenda do dia e,
   na visão total, reuniões por responsável com win rate.
3. Ordem da Visão Executiva: hero → Meta Central R$ 5 mi → BLOCO DA
   ESTEIRA → Dashboard da Diretoria (13) → cards. Nada de tela nova —
   é a mesma aba, mais densa e mais limpa.
**Fora do escopo / proibido:** somar valor declarado em meta de venda;
criar agenda fora da esteira (reunião nasce da oportunidade); alterar
critério de dinheiro real.
**Regras fixas:** nenhuma além da DIR-5 a DIR-37 (inclui prova em
navegador).
**Status:** EM VIGOR.

---

## DIR-37 — Editar o cadastro do cliente direto no modal do CRM

**Emitida por:** dono (01/09/2026): "preciso de um botão para editar as
informações, como trocar o telefone etc., para caso de um cadastro
errado" (print do modal da Thalita Silva, cadastro manual com telefone a
corrigir).
**Data:** 01/09/2026.
**Escopo autorizado:**
1. Botão "✏️ Editar" no cabeçalho do modal do cliente → modo edição de
   nome, e-mail, telefone e CPF, com salvar/cancelar.
2. Gravação no lugar CERTO por origem do cliente:
   - manual (`manual_id`) → update na tabela `customers`;
   - conta do app (`user_id`) → update em `app_users` SOMENTE para quem
     `gerirVendedores` (admin/super_admin), mesmo caminho do painel
     Admin; e-mail fica travado (é o login — muda no painel Admin);
     vendedor comum não vê o botão nesses clientes;
   - automático sem cadastro (veio só de venda) → cria a linha em
     `customers` corrigida (mesmo trilho das anotações DIR-24).
3. Fusão (crmUnifiedCustomers): correção manual passa a valer sobre
   contato INFERIDO de venda (nome/telefone) — nunca sobre dados de
   conta do app. Teste novo.
4. Polimento: esconder a etiqueta de status quando repete a de tipo
   ("Cliente Cliente" no print).
**Fora do escopo / proibido:** editar e-mail de conta do app; mexer em
cargo/papel/carteira (isso é o UserEditModal do Admin); apagar cliente.
**Regras fixas:** nenhuma além da DIR-5 a DIR-36 (inclui prova em
navegador do REL-34.1).
**Status:** EM VIGOR.

---

## DIR-36 — CRM 100%: conectar cliente↔esteira↔venda, cronologia e visão geral

**Emitida por:** dono (01/09/2026): "preciso atualizar os clientes para
aparecer na esteira e os resultados aparecer na visão geral; analise o
que está faltando, sem cronologia e sem conexão, para deixarmos 100%" +
aprovação da análise/plano em chat: "PODE APLICAR CONFIO EM VOCE".
**Data:** 01/09/2026.
**Diagnóstico (conferido no código):** esteira ilhada — Nova oportunidade
redigita cliente que o CRM já conhece (cliente_user_id nunca preenchido;
venda_id existe no banco e nunca é gravado); modal do cliente sem botão
de oportunidade e sem as oportunidades dele; histórico de estágios
gravado e nunca exibido; Dashboard da Diretoria sem KPI de esteira; card
Captação sem forecast; resumo da esteira invisível fora da aba Expansão.
**Escopo autorizado (3 fases):**
1. CONECTAR: busca de cliente existente na Nova oportunidade (preenche
   nome/e-mail/telefone e amarra cliente_user_id); botão "Criar
   oportunidade" + bloco de oportunidades no modal do cliente (abre a
   Expansão com o formulário pré-preenchido); no Fechado 100%, gravar
   venda_id da venda real encontrada (lib `vendaRealDoCliente`, mesma
   regra do chip).
2. CRONOLOGIA: linha do tempo da oportunidade no modal de edição (cada
   movimento: quem/quando/de→para); linha do tempo do cliente unificada
   em lib testada (cadastro → depósitos → compras → arremates →
   oportunidades → follow-up futuro) exibida no modal do cliente.
3. VISÃO GERAL: card Captação ganha o "em esteira (ponderado)"; KPI 13
   no Dashboard da Diretoria (Esteira de Captação: fechado + ponderado
   vs meta R$ 1 mi, tipo 'dado'); faixa-resumo da esteira na Visão
   Executiva com atalho pra Expansão.
**Fora do escopo / proibido:** ativação de plano/dinheiro pela esteira;
mudar critério de dinheiro real; drag-and-drop do kanban (pendência
própria); mexer no funil de clientes (DIR-24).
**Regra fixa nova (REL-34.1):** mudança que toca componente React só
sai da rodada RENDERIZADA em navegador (vite preview + Playwright).
**Regras fixas:** nenhuma além da DIR-5 a DIR-35.
**Status:** EM VIGOR.

---

## DIR-35 — Tela "Sem conexão" falsa: só declarar offline com PROVA

**Emitida por:** dono (01/09/2026): print do preview da branch preso na
tela "Sem conexão" — "OLHA TEM ALGO ERRADO VEJA DIREITO NAO ESTA
APARECENDO PRECISAMOS RESOLVER ISSO".
**Data:** 01/09/2026.
**Diagnóstico (sem achismo):** a tela "Sem conexão" é o
`OfflineScreen.jsx` do PRÓPRIO app — ou seja, o servidor entregou o HTML,
os bundles baixaram e o React montou; a rede FUNCIONAVA. O app se
trancou porque `useOnlineStatus` (código da era Base44, commit
`0e4f5a00`, anterior a todo o nosso trabalho) confia cegamente no
`navigator.onLine` do navegador — um sinal que mente com VPN/proxy/troca
de adaptador de rede — e o botão "Tentar novamente" testava
`https://leilaonozap.net/api/health`, um endpoint que NÃO EXISTE
(`api/` não tem `health.js`) e ainda em domínio cruzado, então qualquer
bloqueio de extensão/DNS deixava o usuário preso pra sempre. Os commits
da DIR-34 não tocaram nesses arquivos.
**Escopo autorizado:**
1. `src/lib/conexao.js` — fonte única da prova de conexão: buscar
   `/version.json` no PRÓPRIO domínio (existe em todo deploy, tem
   `Cache-Control: no-store` no vercel.json) com cache-buster. Testes.
2. `useOnlineStatus`: nasce otimista (a página acabou de chegar pela
   rede); o evento `offline` do navegador vira GATILHO DE VERIFICAÇÃO,
   não veredito — só declara offline se a prova real falhar; o evento
   `online` restaura. "Tentar novamente" usa a mesma prova.
3. `App.jsx`: consertar `hasLoadedOnce` (era `onLoad` numa `<div>`, que
   nunca dispara) — marcar carregado via efeito na primeira renderização
   online, pra tela cheia de offline só existir num boot genuinamente sem
   rede; depois disso, queda de conexão mostra o BANNER, sem esconder o
   app que já carregou.
**Fora do escopo / proibido:** mexer no service worker/workbox (a
configuração atual está correta — html fora do precache, navegação
sempre na rede); mexer em `useAppVersion` (o `navigator.onLine` lá só
adia um poll de 60s, sem trancar nada); qualquer mudança visual nos
componentes de offline.
**Regras fixas:** nenhuma além da DIR-5 a DIR-34.
**Status:** EM VIGOR.

---

## DIR-34 — Esteira de Captação: do agendamento ao contrato assinado

**Emitida por:** dono (30/08/2026): "o cadastro de parceiro de compra e
venda de licenças precisa gerar uma esteira desde a reunião do
agendamento até o fechamento do contrato, acompanhada no CRM, com os
estágios pela intenção do cliente" — estágios ditados por ele; pediu
ideias extras e o % de conversão do time; confirmou no chat: % de
CONVERSÃO por responsável; escopo pela prática de mercado (cada um vê a
própria carteira, gestão vê tudo); "faça o que for melhor" no banco.
**Data:** 30/08/2026.
**Estágios OFICIAIS (probabilidade fixa):** Reunião agendada 10% · Sem
interesse 0% (motivo obrigatório) · Interesse pra frente 20% (data de
recontato) · Interesse — nova reunião 40% · Fechado 50% (valor do aporte
obrigatório) · Fechado 70% (pendências de documentação/liquidez em
checklist) · Fechado 99% (valor+data decididos, reunião de assinatura
marcada) · Fechado 100% (aportou, assinou, dinheiro na conta).
**Escopo autorizado:**
1. Tabela nova `captacao_oportunidades` (migração com RLS e políticas
   explícitas — dono cola o SQL): cliente, tipo (aporte/licença), valor
   previsto, estágio, motivo de perda, datas (reunião, recontato),
   pendências (JSONB), histórico (JSONB), responsável, amarração com a
   venda real (venda_id).
2. `src/lib/esteiraCaptacao.js` — fonte única: estágios/probabilidades,
   pipeline ponderado (Σ valor × prob), % de CONVERSÃO por responsável
   (win rate = fechadas ÷ (fechadas+perdidas) + conversão do funil),
   alertas (parada 7/15 dias, reunião hoje, recontato vencido),
   validação do 100% contra dinheiro REAL (venda partner_plan/adesão do
   cliente). Testes.
3. `CrmEsteiraCaptacao.jsx` na aba 🚀 Expansão: kanban dos 8 estágios
   (valor por coluna), nova oportunidade, mover com exigências por
   estágio (valor no 50%, motivo na perda, datas), forecast ponderado ao
   lado da meta de R$ 1 mi, RANKING DO TIME com % de conversão, chip
   âmbar "100% declarado sem dinheiro na conta".
4. Escopo (prática de mercado): responsável vê e move só as próprias;
   visão total (dono/admins/diretoria — esteira é VENDA) vê tudo +
   ranking.
5. Fila "Quem contatar hoje" ganha os alertas da esteira.
**Fora do escopo / proibido:** ativação de plano (esteira registra
negociação; o dinheiro entra pelos fluxos oficiais); critério de
dinheiro real; comissão.
**Regras fixas:** nenhuma além da DIR-5 a DIR-33.
**Status:** EM VIGOR.

---

## DIR-33 — Árvore Genealógica: busca de verdade + Sócios Executivos no topo

**Emitida por:** dono (30/08/2026, com print da Árvore): "preciso que
buscar o nome realmente funcione — nome completo, apelido, e-mail,
telefone, qualquer coisa do cadastro — e uma seleção para os Sócios
Executivos aparecerem no topo, pra facilitar a busca".
**Data:** 30/08/2026.
**Causa conferida:** a busca só varria os NÓS RENDERIZADOS (quem estava
em galho fechado nunca era encontrado) e só por nome/e-mail.
**Escopo autorizado:**
1. `src/lib/buscaPessoa.js` — comparador único de busca por pessoa:
   nome completo, apelido, nomes de exibição, e-mail, telefone (só
   dígitos), CPF (só dígitos), código de indicação e nome da loja;
   sem acento/caixa. Testes.
2. TreeHierarchy: busca varre TODOS os usuários (não só os visíveis) e
   auto-expande o caminho até os achados (limite de 40 pra não abrir a
   árvore inteira); Enter continua centralizando (focusUser).
3. Alternador "⭐ Executivos no topo": liga → cada Sócio Executivo
   (cargo executivo_conta, aliases legados valem) vira RAIZ no topo da
   árvore com a própria subárvore; o resto da floresta fica abaixo.
   Escolha lembrada (localStorage). Só visual — nenhum vínculo muda.
**Fora do escopo / proibido:** mover pessoas/motor de indicação; carteira
executiva (executive_owner — DIR-22 Fase 2).
**Regras fixas:** nenhuma além da DIR-5 a DIR-32.
**Status:** EM VIGOR.

---

## DIR-32 — Governança de visão por papel + modal de usuário profissional

**Emitida por:** dono (30/08/2026): aprovou a tabela de governança de
mercado escrita no chat ("com essas funções da forma que descreveu") e,
com prints do Editar Usuário, pediu: modal maior (abre pequeno), uma
visão geral do usuário, organizar e deixar extremamente profissional —
sem mudar o que já funciona — e APLICAR as funções de acesso nos cargos
que ele selecionar.
**Data:** 30/08/2026.
**Regra de governança aprovada (mercado):** custo, margem, caixa e
imposto ficam em DUAS chaves (super_admin + Admin Financeiro); diretoria
vê VENDA × META (faturamento, ticket, conversão, funil) mas nunca a
mecânica do dinheiro; Sócio Executivo vê só a própria estrutura;
Fundador/Conselheiro = relatório agregado (rodada futura).
**Escopo autorizado:**
1. `src/lib/visibilidadePorPapel.js` — MATRIZ ÚNICA de visão:
   super_admin/admin/admin_financeiro = visão total + dinheiro da
   empresa; cargos diretoria_executiva e diretoria_operacao (via
   career_levels, fonte careerLevels.js) = visão total de venda SEM
   dinheiro da empresa (sem Valor em Estoque/Produtos no Catálogo, sem
   KPIs de custo de aquisição e ROI); executivo_conta = rede própria;
   gestão de vendedores só admin/super_admin. Testes.
2. Nova Permissão de Trabalho `admin_financeiro` (entra em ADMIN_ROLES —
   todos os painéis, incluindo Financeiro; não gere usuários, que já é
   exclusivo do super_admin). Opção no Editar Usuário com explicação.
3. CRM passa a ler a matriz (substitui o check duro
   ['admin','super_admin']): diretoria ganha as seções Executiva/
   Expansão em modo venda; escopo de rede continua para os demais.
4. Editar Usuário: modal MAIOR (sem trava de proporção 16:9, altura
   quase cheia) + CABEÇALHO-RESUMO (foto, nome, e-mail, crachás de
   Permissão/Função principal/Executivo vigente/Indicador) + polimento —
   sem remover nenhuma função existente.
**Fora do escopo / proibido:** tirar o Financeiro do role 'admin' hoje
(mudança de acesso de contas existentes — só com decisão expressa do
dono); relatório mensal de Fundador/Conselheiro (rodada futura); motor
de comissão.
**Regras fixas:** nenhuma além da DIR-5 a DIR-31.
**Status:** EM VIGOR.

---

## DIR-31 — KPIs do Ranking Premiado ligados (correção de erro meu)

**Emitida por:** dono (30/08/2026): "a página Ranking Premiado JÁ EXISTE,
você não sabe disso???" — e ele está certo. ERRO REGISTRADO: na DIR-29 eu
busquei por "Ranking" literal e concluí que a página não existia; ela se
chama CONCURSO (`src/pages/ConcursoLeilaoNozap.jsx`, rota /rankpremiado,
componentes em src/components/concurso/ — inclusive HeroRankPremiado).
Lição: variar os nomes na busca antes de afirmar que algo não existe.
**Data:** 30/08/2026.
**Fatos conferidos:** o Rank Premiado tem rastro REAL em produção —
`concurso_participantes` (cadastros, com created_at) e
`concurso_referrals` (visitas por link ?ref=, com created_at), ambas já
lidas pela API `/api/concurso` (service role, ações de admin com
isAdmin(body.user_id)).
**Escopo autorizado:**
1. `api/concurso.js` ganha `action=stats_crm` (POST, admin): devolve
   cadastros e visitas dos últimos 7 dias (contagem por created_at).
2. CRM (visão total) busca essas contagens e passa pro
   `calcularDashboardDiretoria`: "Cadastros Ranking/dia" vira DADO
   (média 7d de concurso_participantes) e "Visitantes Ranking/dia" vira
   APROXIMAÇÃO (concurso_referrals só rastreia visita por link de
   indicação — tráfego direto não conta; a fonte explica). Sem resposta
   da API, os dois seguem "Sem fonte" (nunca número inventado).
3. Testes da lib.
**Fora do escopo / proibido:** mudar a mecânica do concurso; critério de
dinheiro real.
**Regras fixas:** nenhuma além da DIR-5 a DIR-30.
**Status:** EM VIGOR.

---

## DIR-30 — Cadastro de vendedor com os cargos oficiais do Plano de Carreira

**Emitida por:** dono (30/08/2026, com prints do modal Novo Vendedor):
"vamos melhorar o cadastro de novo usuário e a partir daí os cargos
baseado no nosso plano de carreira; inclua os nomes Sócio Executivo,
Diretor Operacional, Diretoria Executiva etc — busque os cargos no
painel de controle e insira de forma que faça sentido e seja conexo".
**Data:** 30/08/2026.
**Fatos conferidos antes de codar:** a fonte única dos cargos já existe
(`src/lib/careerLevels.js`, espelho da tabela career_levels usada no
Painel de Controle) — bloco REDE (Influenciador 5% → Distribuidor 20%,
com adesão e regra de cada degrau) e bloco DIRETORIA (Trainee, Sócio
Executivo, Diretor Operacional, Diretoria Executiva, CEO, Livoo Live,
Embaixador, Conselheiro, Fundador). O `license_type` do vendedor é SÓ
visual (a comissão do PDV usa career_levels do usuário — motor intocado).
**Escopo autorizado:**
1. Select "Tipo de Licença" do Novo Vendedor passa a listar os cargos
   OFICIAIS em grupos: Plano de Carreira — Rede (com % e adesão no
   rótulo), Diretoria (os nomes pedidos pelo dono) e Licenças de Loja
   (legado — vendedores antigos continuam legíveis).
2. Escolher um cargo PRÉ-PREENCHE a comissão com o % oficial do plano
   (venda_direta_pct — continua editável) e mostra a REGRA do cargo
   embaixo (mesmo texto do Painel de Controle).
3. Badge da tabela de vendedores exibe o nome de qualquer cargo (oficial
   ou legado) via helper único, sem cadeia de ifs.
4. Telefone do vendedor salvo só com dígitos (o link de WhatsApp do
   encaminhamento depende disso).
**Fora do escopo / proibido:** motor de comissão do PDV (comissaoDaLicenca
/career_levels do usuário); tabela career_levels do banco.
**Regras fixas:** nenhuma além da DIR-5 a DIR-29.
**Status:** EM VIGOR — autorizada pelo dono.

---

## DIR-29 — Melhorias da auditoria: KPIs sem fonte ativados com dado real + edição/kanban/origem

**Emitida por:** dono (30/08/2026): "vamos para as melhorias que você
faria" (lista registrada na DIR-28).
**Data:** 30/08/2026.
**Fatos conferidos antes de codar:** venda de PDV já nasce com
`source='pdv'` em catalog_sales (balcão = venda FÍSICA identificável
hoje); a ligação venda→custo existe (`product_id`/`items_json` +
`custoUnitario`, já usada no Painel de Lucro Diário); `app_users` NÃO tem
coluna de login (migração necessária — dono cola o SQL); a página do
Ranking Premiado ainda não existe no sistema (instrumentação automática
fica dependente dela).
**Escopo autorizado:**
1. **Trilho Venda Física ATIVADO**: `metaCentral` separa mercadoria real
   do mês em Física (source='pdv', balcão) × Online (resto) — os dois
   trilhos com dado real; `venda_fisica` e `faturamento_total` do
   Dashboard da Diretoria idem (fonte única). Testes.
2. **Custo de Aquisição ATIVADO** (aproximação): Σ custo dos lotes ÷ Σ
   potencial de venda da vitrine (galpão inteiro) — nossa vitrine é ~20%
   abaixo do mercado, então o % sobre o mercado real é ainda menor que o
   mostrado; etiqueta e fonte explicam. Meta ≤ 22,8%.
3. **ROI Operacional ATIVADO** (aproximação): (receita real de mercadoria
   do mês − custo das unidades vendidas com produto vinculado) ÷ custo —
   `buildCostMap`/`custoDaVenda` extraídos do Painel de Lucro Diário pra
   `src/lib/custoProduto.js` (fonte única, o Painel passa a importar).
4. **Rastro de login**: migração `app_users.last_login TIMESTAMPTZ`
   (SQL entregue pro dono colar) + carimbo em `login.js`/`googleLogin.js`
   (service role, fire-and-forget); "Usuários ativos" passa a contar
   login OU movimento em 30d quando a coluna existir (fallback pra
   aproximação atual enquanto não existir).
5. **CRM**: editar cliente MANUAL direto no modal (botão lápis religado —
   handleEdit voltou, agora LIGADO); kanban com ARRASTAR nativo (HTML5)
   pra cliente manual (solta na coluna → atualiza purchase_status;
   automático não arrasta — status vem do pedido real); origem "Ranking
   Premiado" no cadastro e nos filtros.
**Fora do escopo / proibido:** migrar vendas pro listarTudo (rodada
própria — mexe em soma de dinheiro de DUAS telas casadas); página do
Ranking (não existe); critério de dinheiro real.
**Regras fixas:** nenhuma além da DIR-5 a DIR-28.
**Status:** EM VIGOR — autorizada pelo dono.

---

## DIR-28 — Auditoria pré-publicação do CRM (botões, cadastros e funções)

**Emitida por:** dono (30/08/2026): "confira se todo botão, cadastro,
inserção em todo o CRM está funcionando, se todas as funções funcionam e
o que você melhoraria — de forma extremamente sênior, para publicarmos".
**Data:** 30/08/2026.
**Auditoria executada (caminho por caminho, no código):** 4 modais
(Novo/Editar Cliente, Novo Vendedor, Encaminhar, Perfil) existem e estão
ligados; 24 handlers conferidos um a um; entidades usadas
(Customer/Seller/Negotiation/PartnerPlanPurchase/AppUser/CatalogSale/
Auction/Product) todas mapeadas no adapter; varredura no-undef zerada em
9 componentes + 7 bibliotecas do CRM; tooltips com type="button" e
stopPropagation (não disparam o card).
**Defeitos achados e corrigidos nesta rodada:**
1. Encaminhar pro vendedor: wa.me recebia o telefone COM máscara —
   "(21) 9..." quebrava o link. Agora só dígitos + DDI 55 (mesma regra da
   fila de contato) e erro claro se o vendedor não tem telefone.
2. "Produtos no Catálogo" passou a contar produto sem estoque depois da
   DIR-25 (a lista de interesses inclui esgotados de propósito) — o card
   promete "com estoque disponível", então volta a contar só quantity>0.
3. Anotação em cliente sem e-mail E sem telefone criaria um registro
   fantasma novo a cada salvamento (a fusão é por e-mail/telefone) —
   agora bloqueia com aviso pra completar o contato antes.
4. handleEdit removido (código morto pré-existente — nenhum botão
   chamava; edição de manual é na página CustomerDetails).
**Melhorias registradas para as próximas rodadas (não bloqueiam):**
editar cliente manual direto no modal do CRM; origem "Ranking Premiado"
no cadastro (ativa o KPI Cadastros Ranking/dia, hoje sem fonte); rastro
de login (ativa Usuários Ativos oficial); lançamento de venda física
(ativa o trilho R$ 1M); despesas de aquisição no Financeiro (ativa custo
de aquisição e ROI); arrastar cartão no kanban; migrar as buscas de
vendas pro listarTudo (pendência do corte de 1000 — rodada própria).
**Regras fixas:** nenhuma além da DIR-5 a DIR-27.
**Status:** EM VIGOR — auditoria concluída; testes 534/534, build ok;
pacote DIR-18→28 PRONTO PARA PUBLICAR, aguardando o "pode" do dono.

---

## DIR-27 — Leilão no CRM conta a partir do marco (01/08/2026)

**Emitida por:** dono (30/08/2026, com print da seção Clientes): "detalhe
extremamente importante: começamos a contar de fato os leilões a partir
de agosto — o que é pra contar aqui é a partir de agosto de 2026 pra
frente, esquece antes disso".
**Data:** 30/08/2026.
**Análise (entregue no chat):** os cards de status fecham exatos (586+6+
10+2+7 = 611 = Total de Contatos; 572 leads + 37 clientes + 2 inativos =
611), mas "Leilões Arrematados: 55" contava vitória de QUALQUER época —
o próprio dono aparecia com 37 leilões (testes pré-lançamento), e isso
contaminava "Arrematantes: 11" (promoção por vitória de teste) e
"Clientes Ativos: 37" (vitória marca a pessoa como cliente — por isso 37
> 25, a soma de quem tem compra).
**Escopo autorizado:** `buildUnifiedCustomers` (fonte única do CRM):
leilão vencido só conta com `end_time >= MARCO_OFICIAL` (01/08/2026,
mesmo marco do dinheiro real) — antes disso não conta troféu, não
promove a arrematante, não vira cliente e não entra na linha do tempo;
leilão sem end_time fica fora (não dá pra provar que é pós-marco).
3 testes novos.
**Fora do escopo / proibido:** valor de leilão (já vem só da venda
kind='arremate' paga, DIR-24); tabela auctions em outras telas.
**Regras fixas (permanente):** LEILÃO NO CRM = 01/08/2026 EM DIANTE.
**Status:** EM VIGOR — corrigido; testes 534/534, build ok; aguarda
conferência no Preview.

---

## DIR-26 — Ticket médio unificado: a meta de R$ 252 é POR COMPRADOR

**Emitida por:** dono (30/08/2026, com prints): "confere as informações de
ticket médio no CRM — um tá falando uma coisa e outro outra coisa; acho
que o certo é 272, não é?".
**Data:** 30/08/2026.
**Diagnóstico (conferido no código, explicado no chat):** os dois cards
mediam coisas DIFERENTES — Dashboard da Diretoria: R$ 118,65 = mercadoria
real do mês ÷ 31 PEDIDOS (por pedido); Espelho: R$ 272,18 = (depósitos
R$ 3.600 + compras R$ 3.476,80, desde 01/08) ÷ 26 COMPRADORES (cópia
proposital do Painel de Alavancagem — soma depósito e não é mensal).
Nenhum dos dois compara certo com a meta de R$ 252 do Resumo Executivo,
que é gasto POR COMPRADOR/mês (é como o documento constrói os R$ 4M:
compradores × R$ 252).
**Escopo autorizado:** KPI ticket_medio do Dashboard da Diretoria passa a
ser mercadoria real do mês ÷ COMPRADORES ÚNICOS do mês; rótulo vira
"Ticket médio por comprador (mês)"; tooltip explica a diferença pro
número do Espelho. O Espelho NÃO muda (regra do dono: cópia célula a
célula do Painel de Alavancagem). Teste atualizado.
**Fora do escopo / proibido:** Espelho do Painel de Alavancagem; critério
de dinheiro real.
**Regras fixas:** nenhuma além da DIR-5 a DIR-25.
**Status:** EM VIGOR — corrigido; aguarda conferência no Preview.

---

## DIR-25 — Cadastro manual do CRM: interesses com produtos, planos de parceiro e licenças (valores editáveis)

**Emitida por:** dono (30/08/2026, com print do modal Novo Cliente):
"organize a parte de cadastro manual: todos os produtos precisam estar
aparecendo, os planos de parceiro de compra e valores editáveis de
investimentos e as licenças, e algumas coisas que você acredite que
precisa colocar — faça a análise e edite".
**Data:** 30/08/2026.
**Análise (entregue no chat):** produtos de interesse só apareciam
digitando (lista vazia por padrão) e o filtro escondia produto sem
estoque; não existia interesse em plano de parceiro nem em licença; sem
vendedor responsável nem follow-up no ato do cadastro; campos soltos sem
agrupamento; os planos de parceiro viviam hardcoded só em
PartnerPlanActivation.jsx.
**Escopo autorizado:**
1. `src/lib/planosParceiro.js` — fonte ÚNICA dos planos de parceiro de
   compra (Visionário R$ 5.000 / Sócios de Ouro R$ 15.000 / Elite
   R$ 30.000 / Personalizado, 3%/60 meses), importada por
   PartnerPlanActivation e pelo CRM. Teste próprio.
2. Modal Novo Cliente reorganizado em seções (Dados / Endereço /
   Acompanhamento / Interesses / Observações) com: vendedor responsável
   (assigned_seller), "voltar a falar em" (follow_up_date) e próximo
   passo (next_steps) — colunas já existentes, sem migração.
3. Seção Interesses com 3 grupos: PRODUTOS (catálogo inteiro visível por
   padrão, busca só refina, badge de estoque — produto sem estoque
   aparece marcado, não some); PLANOS DE PARCEIRO e LICENÇAS (escada
   oficial) selecionáveis com VALOR DE INVESTIMENTO EDITÁVEL pré-
   preenchido com o preço de tabela. Tudo gravado em interested_products
   (JSONB, itens tipados — formato antigo continua lendo) e o TOTAL
   ESTIMADO somado em purchase_value.
**Fora do escopo / proibido:** regra de ativação de plano (o cadastro
registra INTERESSE, não ativa nada); critério de dinheiro real; escada e
baldes oficiais (só leitura).
**Regras fixas:** nenhuma além da DIR-5 a DIR-24.
**Status:** EM VIGOR — autorizada pelo dono ("faça a análise e edite").

---

## DIR-24 — CRM de mercado: números confiáveis, acesso escopado, visual em seções, ação e funil

**Emitida por:** dono (30/08/2026): pediu análise sênior de TODO o CRM
(visual, entendimento, cadastro, escopo por pessoa, "que não perca pra
nenhum CRM do mercado"); a análise foi entregue no chat com 5 fases em
ordem de prioridade e ele autorizou: "SIGO SUA RECOMENDAÇÃO, PODE FAZER,
CAPRICHE E MELHORE O VISUAL TAMBÉM".
**Data:** 30/08/2026.
**Achados que motivaram (conferidos no código):** o CRM escopado por rede
existe mas está trancado (`if (!isAdmin)` — licenciado clica CRM e recebe
"sem acesso"); "Gasto Total" por cliente soma depósito/adesão/aporte
(dinheiro duplicado) e arremate NÃO PAGO (current_price da tabela
auctions sem checar pagamento); clientes manuais (`Customer.list(500)`) e
negociações (`Negotiation.list(200)`) carregam SEM escopo de rede;
convidado recorrente não incrementa contador nem linha do tempo; cliente
manual que também é usuário some do CRM levando notas/vendedor junto
(dedupe descarta em vez de fundir).
**Escopo autorizado (5 fases, nesta ordem):**
1. **Números confiáveis** (`crmUnifiedCustomers.js`): gasto do cliente só
   com mercadoria (loja/produto/arremate; kind legado sem valor conta —
   dado antigo); depósito/adesão/aporte fora do gasto; arremate só pago;
   valor de leilão vem da venda kind='arremate' (fonte única), tabela
   auctions só pra contagem/linha do tempo; convidado recorrente soma
   certo; manual duplicado FUNDE (notas, vendedor, follow-up) na linha
   automática em vez de sumir. Escopo de Customer/Negotiation por
   `created_by_id`/clientes visíveis; carimbo de `created_by_id` no
   cadastro. Testes.
2. **Abrir o CRM escopado**: destrancar o gate — todo usuário da Central
   de Vendas vê o CRM DA PRÓPRIA REDE (árvore de indicação já
   implementada); admin/super_admin seguem com visão total; cards de
   empresa (estoque, metas, dashboard, escada) continuam só na visão
   total. (Escopo por ESTRUTURA EXECUTIVA continua sendo a Fase 2 da
   DIR-22 — pendência mantida.)
3. **Visual em seções**: sub-navegação interna (Visão Executiva /
   Clientes / Expansão) + faixa de resumo com 4 números sempre visível +
   ritmo diário do mês contra a meta + tabela vira cartões no celular +
   rótulos de período nos cards.
4. **Ação**: painel "Quem contatar hoje" (pedido gerado e não pago,
   depósito sem compra, arremate não pago, sumido 30d, follow-up vencido)
   com botão WhatsApp e mensagem pronta por motivo; anotações + data de
   retorno em QUALQUER cliente (upsert na tabela customers via
   e-mail/telefone — colunas notes/follow_up_date/next_steps já existem,
   sem migração).
5. **Luxo de mercado**: funil kanban por status de compra, ordenação e
   paginação na tabela, busca por CPF, export CSV, aviso de duplicado no
   cadastro, `alert()` → toast (sonner, já montado no app).
**Fora do escopo / proibido:** regra de reconhecimento de receita
(DIR-7); critério oficial de dinheiro real (dinheiroReal.js — os cards
grandes NÃO mudam); ordem dos baldes da captação; migração de banco.
**Regras fixas:** nenhuma além da DIR-5 a DIR-23.
**Status:** EM VIGOR — 5 fases implementadas; testes 531/531, build ok;
aguarda conferência do dono no Preview.

---

## DIR-23 — Metas internas oficiais no CRM: Meta Central R$ 5 milhões, Dashboard da Diretoria e Escada de Licenças

**Emitida por:** dono (30/08/2026). Enviou dois materiais oficiais — o
RESUMO EXECUTIVO INTEGRADO (metas internas: R$ 5M/mês de vendas até
março/2027 = R$ 4M online + R$ 1M física; Seção 37 = os 12 números que a
diretoria olha todo dia, com a regra "separar Dado realizado / Premissa /
Projeção") e a APRESENTAÇÃO OFICIAL (o plano de licenças, de Influenciador
grátis a Distribuidor R$ 4 milhões, com preço e comissão de cada degrau) —
e pediu: "analise os dois e veja o que incluir para ficar bem sênior nosso
CRM, baseado nas vendas das Lojas e Leilões e nossas metas internas". A
análise foi entregue no chat e ele autorizou: "PODE FAZER, ACRESCENTE,
DEIXE SÊNIOR, CAPRICHE".
**Data:** 30/08/2026.
**Escopo autorizado:**
1. `src/lib/metaCentral.js` — regra pura da Meta Central de VENDAS
   (R$ 5.000.000/mês = R$ 4M online + R$ 1M física, alvo março/2027):
   trilho Online alimentado por dado real do mês (compras brutas da Loja
   Virtual + arremates de leilão, critério oficial `dinheiroReal`); trilho
   Física SEM FONTE no sistema hoje — aparece marcado como tal, nunca com
   número inventado. Teste próprio.
2. `src/lib/dashboardDiretoria.js` — os 12 números da Seção 37, cada um
   com Realizado × Meta e etiqueta de governança (Dado / Aproximação /
   Sem fonte): calculáveis hoje = novos usuários/dia, ticket médio do mês,
   venda online, faturamento total (só online), conversão digital (mesma
   fórmula do Painel de Alavancagem), K-Factor aproximado (indicações da
   árvore `referred_by_id`), usuários ativos aproximado (atividade
   financeira real em 30d — não existe rastro de login no sistema); sem
   fonte = visitantes/cadastros do Ranking, venda física, custo de
   aquisição, ROI operacional. Teste próprio.
3. `src/lib/escadaLicencas.js` — a escada OFICIAL de licenças da
   apresentação (Influenciador grátis 5% → Vendedor R$ 1.497/10% →
   Licenciado R$ 5.000/13% → Parceiro R$ 20.000/15% → Ponto de Retirada
   R$ 50.000/16% → Loja Física R$ 350.000/19% → Distribuidor
   R$ 4.000.000/20%), com quem cadastra quem, e o cruzamento com as vendas
   reais: N vendidos × preço de tabela vs valor realmente captado
   (divergência aparece — sinal de desconto ou inconsistência). Teste
   próprio.
4. Três painéis novos no CRM, visíveis SÓ para visão total
   (admin/super_admin — metas da empresa não vazam pra escopo de rede):
   `CrmMetaCentral.jsx`, `CrmDashboardDiretoria.jsx`,
   `CrmEscadaLicencas.jsx`.
**Premissas registradas (aguardando martelo do dono):** "usuário ativo" ≈
atividade financeira real nos últimos 30 dias (não há rastro de login);
venda física fica sem fonte até existir lançamento no sistema.
**Fora do escopo / proibido:** projeções de território da apresentação
(R$ 12M/mês do Recreio etc.) — material de VENDA de licença, não métrica
de operação; regra de reconhecimento de receita (DIR-7); reordenar os
baldes da captação (ordem oficial do dono, DIR-22).
**Regras fixas:** nenhuma além da DIR-5 a DIR-22.
**Status:** EM VIGOR — autorizada pelo dono ("PODE FAZER... CAPRICHE").

---

## DIR-22 — Gestão de Parceiros de Compra no CRM + meta de captação R$ 1 milhão

**Emitida por:** dono, em duas mensagens (30/08/2026): pediu análise sênior
do CRM pra incluir a gestão de Parceiros de Compra ("hoje a nossa principal
operação, meta de um milhão"), com acesso por estrutura (executivo/diretor
veem a própria estrutura; visão geral só super_admin e administrativos); e
definiu a régua da meta: "tudo que entrar de aporte de parceiro de compra
(que é como se fosse investimento) e vendas de franquias (não estamos no
sistema de franchise, é analogia)", na ordem: Aportes Parceiro de Compra,
Vendas de Vendedores, Licenciados, Loja Física, Ponto de Retirada, Parceiro
e Distribuidor.
**Data:** 30/08/2026.
**Escopo autorizado (Fase 1 desta rodada):**
1. `src/lib/captacaoParceiros.js` — regra pura da meta (R$ 1.000.000):
   baldes na ordem oficial do dono; conta venda REAL (critério
   `dinheiroReal`) de `partner_plan`/`seller_adhesion`/`adesao`
   (classificada pelo cargo em `adesao_level`/`product_title`) + ativação
   MANUAL de plano de parceiro (`partner_plan_purchases`,
   `activation_source='manual'`). Anti-dupla-contagem: ativação automática
   (`lucre_conosco`) NÃO soma — nasce da própria venda, que já contou.
   Balde residual "Outras adesões" pra cargo não reconhecido (nada some em
   silêncio). Teste próprio (9 casos).
2. Painel "Parceiros de Compra — Meta R$ 1.000.000" no CRM
   (`CrmParceirosCompra.jsx`): barra de progresso, baldes na ordem
   oficial, e a lista de parceiros (plano, valor, aportes pagos, data,
   origem da ativação) — tudo no MESMO escopo do resto do CRM.
3. Visão total estendida aos ADMINISTRATIVOS: o bypass de rede que era só
   `super_admin` passa a incluir `admin` (frase literal do dono: "só quem
   tem a visão geral é o super adm e os administrativos").
**Fases seguintes (registradas, ainda não executadas):** Fase 2 — abrir o
CRM pra executivo/diretor/diretor operacional com escopo pela ESTRUTURA
EXECUTIVA (fonte única `resolveExecutivo`/carteira `executive_owner`, que
vence a árvore de indicação); Fase 3 — clicabilidade (cards→filtros, links
no modal, WhatsApp); Fase 4 — perfil enriquecido (depósitos, saldo,
contratos, estrutura, export).
**Fora do escopo / proibido:** regra de reconhecimento de receita (DIR-7);
histórico legado de adesão (pendência DIR-13 continua).
**Regras fixas:** nenhuma além da DIR-5 a DIR-21.
**Status:** EM VIGOR — Fase 1 implementada; testes 475/475, build ok;
aguarda conferência do dono no Preview.

---

## DIR-21 — Volume em Negociação real + Faturamento Bruto no CRM

**Emitida por:** dono, decisão direta de negócio (30/08/2026): (1) "Volume
em Negociação: mude para pessoas que chegam no carrinho e não compram
ainda, ou fizeram pedidos e desistiram, e também insira pedidos cancelados
pela instituição e pagamento — precisa inserir esses dois"; (2) "o
Faturamento de 1.638,08 está errado — esse valor é o valor comprado na
Loja Virtual, que é de fato o faturamento bruto".
**Data:** 30/08/2026.
**Escopo autorizado:**
1. "Volume em Negociação" = pedidos de Loja gerados e não pagos
   (`pending_payment` — não existe carrinho persistido no servidor; o
   pedido pendente é o rastro real de "chegou no carrinho e desistiu") +
   pedidos cancelados/estornados + negociações manuais em andamento, tudo
   pós-marco (01/08). Tooltip mostra a composição das três parcelas.
2. Card do super_admin renomeado "Faturamento Bruto (Loja Virtual)" =
   `comprasBrutas` (valor cheio das compras pagas e confirmadas, critério
   oficial de dinheiro real). **A regra da DIR-7 NÃO muda:** a comissão
   continua sendo a receita da empresa em `financial_income`, base do
   Financeiro e do imposto — só o card do CRM passa a mostrar o bruto, por
   decisão expressa do dono. `financial_income` deixou de ser carregado no
   CRM (não é mais usado nele).
**Fora do escopo / proibido:** regra de reconhecimento de receita (DIR-7),
`financial_income`, módulo Financeiro, visão de rede (Volume Transacionado
continua igual).
**Regras fixas:** nenhuma além da DIR-5 a DIR-20.
**Status:** EM VIGOR — código, testes (466/466) e build passam; aguarda
conferência do dono no Preview e autorização pra publicar o pacote
DIR-18 a 21.

---

## DIR-20 — Estoque cristalino: número único validado no banco

**Emitida por:** dono ("vamos fazer uma análise extremamente diligente na
Gestão de Produtos, os números não estão batendo, preciso deixar isso
cristalino"), com diagnóstico fechado por 4 consultas diretas dele ao banco.
**Data:** 30/08/2026.
**Objetivo:** três telas mostravam três "valores de estoque" diferentes
(CRM R$ 9.309 / Gestão R$ 29.951 / real R$ 28.133) porque cada uma usava
população e fórmula próprias. Números validados direto no banco:
- Investido histórico em todos os lotes: R$ 108.232,54.
- Parado em estoque AGORA (fatia não vendida, contando estoque físico da
  grade): **R$ 28.133,45** — este é o número oficial.
- 184 produtos com `quantity = 0` mas estoque físico real nas colunas de
  grade (Perfeito/Bom/Oficina/Ruim, que não são baixadas na venda) —
  invisíveis pra qualquer conta baseada só em `quantity`.
- "Receita Potencial R$ 5,08 milhões" da Gestão: 95% vem de UM produto com
  preço podre (Mini Localizador GPS a R$ 12.226,61/un × 394 — o valor
  gravado é o preço do LOTE; o unitário real é R$ 31,03).
**Escopo autorizado:**
1. `custoProduto.js` (cliente + espelho servidor) ganha `unidadesFisicas`/
   `unidadesEmEstoque` (= max(quantity, grade − vendidas)) e `custoUnitario`
   passa a usar o estoque real — fórmula idêntica à validada no banco.
2. CRM: "Valor Investido em Estoque" soma o GALPÃO INTEIRO (todos os
   produtos, não só os 302 do catálogo); card "Produtos em Estoque"
   renomeado "Produtos no Catálogo"; tooltips explicando as definições.
3. Gestão de Estoque: "Capital em Estoque" vira o custo parado AGORA
   (mesma conta do CRM — antes era soma histórica dos lotes exibidos);
   "Saldo em Estoque"/"Total de Unidades" contam o estoque físico da grade.
4. Consignado (`createConsignacao`) herda o estoque físico no cálculo do
   custo unitário (select ganhou as colunas de grade).
5. Testes novos (caso real da bicicleta VIX e da POLITRIZ esgotada).
**Fora do escopo / proibido (dados, só o dono corrige):** o preço podre do
Mini Localizador (SQL de correção entregue no chat) e os 15 produtos sem
custo (lista já entregue) — dados de negócio, nunca inventados pelo código.
**Regras fixas:** nenhuma além da DIR-5 a DIR-19.
**Status:** EM VIGOR — código, testes (460/460, 3 novos) e build passam;
aguarda conferência do dono no Preview e autorização pra publicar o pacote
DIR-18+19+20.

---

## DIR-19 — Acerto do consignado por unidade, regra de mercado

**Emitida por:** dono, decisão direta depois do achado da DIR-18 ("deixe
igual é no mercado, de maneira sênior, e atualiza o nosso documento
oficial").
**Data:** 30/08/2026.
**Objetivo:** `createConsignacao.js` usava `cost_price` cru (custo do LOTE
inteiro) como valor de acerto de UMA peça consignada — lojista debitado
pelo lote inteiro por cada peça vendida (POLITRIZ: R$ 2.296 em vez de
R$ 255). Corrigir pela regra padrão do mercado de consignação: acerto POR
UNIDADE, na ordem atacado (`selling_price_wholesale`) → custo unitário da
casa → preço de catálogo como último recurso (nunca sai de graça).
**Escopo autorizado:** `api/_lib/custoProduto.js` (espelho servidor da
DIR-18 + `acertoConsignadoUnitario`); `createConsignacao.js` usa a regra
nova; seção **6-D** nova no `DOCUMENTO-OFICIAL-PLANO-CARREIRA.md`
registrando a regra oficial; teste `tests/acertoConsignado.test.mjs`.
**Fora do escopo / proibido:** o motor de liquidação (`consignadoSettle.js`)
e a aprovação (`manageConsignacao.js`) não mudam — eles só repassam o
`custo_unitario` gravado no pedido, que agora nasce certo. Consignações JÁ
criadas com valor inflado (se existirem) não foram tocadas — precisa
conferir no banco antes (consulta entregue ao dono no chat).
**Regras fixas:** nenhuma além da DIR-5 a DIR-18.
**Status:** EM VIGOR — código, testes (457/457, 6 novos) e build passam;
aguarda conferência do dono e autorização pra publicar junto com a DIR-18.

---

## DIR-18 — cost_price interpretado de duas formas contraditórias + produtos sem custo

**Emitida por:** dono, depois de ver "Custo do produto: R$ 0,00" no painel de
lucro diário e afirmar a regra de negócio: "eu JAMAIS posso ter o custo do
produto zerado — a importação da planilha já traz o CUSTO TOTAL". Diagnóstico
confirmado com consultas diretas dele ao banco: 15 dos 302 produtos ativos
sem custo nenhum, e produtos com custo de lote sendo tratado como unitário.
**Data:** 30/08/2026.
**Objetivo:** o campo `products.cost_price` é, por semântica oficial (planilha
de importação, `bulkImportProducts.js`, `RegisterBatches.jsx`), o custo TOTAL
do lote. A maior parte do sistema sempre tratou certo (divide pelas unidades
pra achar o unitário), mas 6 telas multiplicavam pela quantidade como se
fosse unitário — origem do "Valor Investido em Estoque: R$ 50 milhões"
(impossível: o valor de VENDA do mesmo estoque era R$ 4,9 milhões). Além
disso, 15 produtos entraram sem custo pelos formulários manuais (a planilha
sempre traz), zerando o "Custo do produto" no painel de lucro e inflando a
margem.
**Escopo autorizado:**
1. Regra única em `src/lib/custoProduto.js` (`custoUnitario`,
   `custoEstoqueRestante`), com teste próprio calibrado com dados reais de
   produção.
2. Correção das 6 leituras erradas: `CrmClientesTab.jsx` (valorEstoque),
   `BalancoGeralTab.jsx` e `RentabilidadeOperacao.jsx` (valor investido =
   soma dos custos de lote, sem multiplicar), `DailyReportView.jsx` e
   `DailyReportPDF.jsx` (custo da venda = unitário × qtd vendida),
   `PainelLucroDiario.jsx` (passa a reusar a lib, mesma conta).
3. Correção de escrita: `gerarProdutosDoLote.js` gravava o custo UNITÁRIO
   em registro com qtd > 1 — passa a gravar unitário × qtd (custo do lote),
   consistente com a planilha.
4. Trava "jamais custo zerado" nos formulários de cadastro manual
   (`CreateCatalogProduct.jsx`, `AddCatalogProduct.jsx`): salvar sem custo
   > 0 é recusado com mensagem clara.
**Fora do escopo / proibido (flagged, NÃO corrigido — mexe em dinheiro,
precisa de diretiva própria):** `api/functions/createConsignacao.js:97` usa
`cost_price` (custo do LOTE) como `custo_unitario` da peça consignada — num
lote multi-unidade, o lojista consignado é debitado pelo lote inteiro por
CADA peça. Bug real de cobrança; não foi tocado nesta rodada porque altera
fluxo de dinheiro e o valor certo a cobrar é decisão do dono.
Os 15 produtos sem custo também NÃO foram preenchidos — os valores reais só
o dono tem (planilha de origem); a lista exata já foi entregue no chat.
**Regras fixas:** nenhuma além da DIR-5 a DIR-17.
**Status:** EM VIGOR — código, testes (451/451, 8 novos) e build passam;
falta o dono conferir no Preview (Valor Investido em Estoque deve cair dos
R$ 50 milhões pra um valor realista) e autorizar a publicação.

---

## DIR-17 — Painel de Alavancagem somava um subconjunto arbitrário de 1000 vendas

**Emitida por:** Claude, via achado técnico — dono comparou os dois painéis
de novo ("Valor total gerado" R$ 6.173,80 no Painel vs R$ 7.076,80 no
espelho do CRM, 25 vs 26 compradores) e exigiu análise sênior por escrito:
"encontre o certo e corrija onde está errado, eu preciso saber em qual
acreditar".
**Data:** 30/08/2026.
**Objetivo:** `NetworkOverview.jsx:571` buscava as vendas com
`CatalogSale.list()` — sem ordenação e sem limite. O adapter então ordena
só por `id` (uuid aleatório, não cronológico) e o Supabase corta a
resposta em 1000 linhas por padrão. Com `catalog_sales` acima de 1000
registros, o Painel somava um SUBCONJUNTO ARBITRÁRIO de 1000 vendas —
compras reais ficavam de fora sem aviso (medido: R$ 903,00 e 1 comprador
a menos que o CRM lendo o MESMO banco). O certo é o CRM (busca
`'-created_date'` com limite explícito: a janela sempre contém as vendas
mais recentes, então toda venda pós-marco entra).
**Escopo autorizado:** `NetworkOverview.jsx` passa a buscar
`CatalogSale.list('-created_date', 5000)`; `CrmClientesTab.jsx` alinhado
aos mesmos parâmetros (2000 → 5000) — telas que somam o mesmo dinheiro
leem as mesmas linhas.
**Fora do escopo / proibido:** qualquer mudança de fórmula/critério (o
`dinheiroReal.js` da DIR-15 fica intacto); a diferença R$ 201,24 entre
"Volume Financeiro Total" e o espelho é INTENCIONAL (leilão, documentada
no tooltip) e não foi tocada.
**Regras fixas:** nenhuma além da DIR-5 a DIR-16.
**Status:** EM VIGOR — código, testes (443/443) e build passam; falta o
dono confirmar no Preview que os dois painéis agora mostram o mesmo
número.

---

## DIR-16 — Espelho do Painel de Alavancagem dentro do CRM

**Emitida por:** dono, pedido direto: "insira exatamente as informações que
tem lá [Painel de Alavancagem], aqui [no CRM], não invente, vamos
organizar de forma sênior".
**Data:** 30/08/2026.
**Objetivo:** depois de confirmar com dado real que os dois painéis batiam
(mesmo critério, `src/lib/dinheiroReal.js`, DIR-15), o dono quis ver os
MESMOS rótulos e a MESMA fórmula do Painel de Alavancagem dentro do CRM,
lado a lado com os cards já existentes — não outra métrica inventada, uma
cópia fiel.
**Escopo autorizado:**
1. Novo bloco "Espelho do Painel de Alavancagem" em `CrmClientesTab.jsx`/
   `CrmStatsCards.jsx`, com os MESMOS 8 números de `NetworkOverview.jsx`
   (Total na base, Novos 30 dias, Compradores únicos, Conversão geral,
   Compraram nos últimos 30 dias, Depósitos, Valor total gerado, Ticket
   médio/comprador) — fórmula copiada literalmente de
   `fetchFinanceStats`/`conversion`, só trocando a base de dados (rede do
   dono → rede/plataforma de quem olha o CRM). "Valor total gerado" aqui é
   só depósito + compra de Loja, sem leilão, pra ser comparável célula a
   célula com o Painel de Alavancagem (diferente do "Volume Financeiro
   Total" da DIR-14, que inclui leilão de propósito).
2. **Achado à parte, corrigido junto:** o dono reportou "Valor Investido em
   Estoque: R$ 50.485,429" (3 casas decimais, formato errado). Causa:
   `fmtBRL` usava `toLocaleString` só com `minimumFractionDigits: 2`, sem
   `maximumFractionDigits` — o padrão do JS nesse caso é até 3 casas, e
   imprecisão de ponto flutuante (soma de `cost_price × quantity` linha a
   linha) empurrava pra 3ª casa. Corrigido com `maximumFractionDigits: 2`
   explícito.
**Fora do escopo / proibido:** mudar a regra de reconhecimento de receita;
mudar `financial_income`/`finalizeAuctionCore.js`; mudar o "Volume
Financeiro Total" já existente (fica como está, ao lado do espelho novo).
**Regras fixas:** nenhuma além da DIR-5 a DIR-15.
**Status:** EM VIGOR — código, testes (443/443) e build passam. Falta o
dono conferir visualmente no Preview/produção depois do deploy — os 8
números do espelho devem bater exatamente com o que aparece no Painel de
Alavancagem (ajustado pela diferença de escopo, se o dono não for
super_admin).

---

## Estado agora

CRM e Financeiro têm a lógica, os dados e a leitura (RLS) corretos.
"Faturamento Total" = R$ 1.367,17 (comissão de Loja Virtual + Leilão),
confirmado direto no banco. "Volume Financeiro Total" (depósito + venda
bruta de Loja/PDV/Leilão) e o novo "Espelho do Painel de Alavancagem"
(DIR-16) usam o MESMO critério de "dinheiro real" que o Painel de
Alavancagem (`src/lib/dinheiroReal.js`, DIR-15) — as telas não podem mais
divergir, porque é literalmente a mesma função. Falta o dono conferir
visualmente no Preview/produção depois do deploy.

**Achado crítico de infraestrutura, fora do escopo de código, aguardando o
dono (ver `REL-11`):** o deploy automático de migração
(`.github/workflows/deploy-migrations.yml`) nunca funcionou — 9
execuções, 9 falhas, `supabase db push` nunca rodou uma vez na história do
repositório. Causa atual: o segredo `SUPABASE_ACCESS_TOKEN` no GitHub está
com formato inválido. Enquanto isso não for corrigido, toda migration
nova precisa ser conferida e, se faltar, colada manualmente no SQL Editor
do Supabase (ver `supabase/migrations/LEIA-ME.md` pra saber como conferir).
Passo pro dono corrigir de vez: gerar um token novo em
`supabase.com/dashboard/account/tokens` (formato `sbp_...`) e atualizar o
segredo em `Settings → Secrets and variables → Actions` do repositório.

**Efeito colateral da DIR-13 a observar:** o dropdown manual de
`CatalogOrdersAdmin.jsx` que deixava o admin marcar um pedido "Aguardando
Pagamento" como "Pago" na mão agora é recusado (mensagem explicando o
porquê). Se esse botão for realmente necessário pra confirmar pagamento
fora do sistema (ex.: transferência bancária manual), isso precisa de uma
diretiva própria pra construir uma rota nova que calcule comissão e
registre receita — não só destravar o PATCH de novo.

Pendências ainda abertas, sem diretiva própria no momento:
- `REL-2`: confirmação do 401 na Edge Function `preview-api`, do lado da
  OpenAI.
- Fase 3 do Financeiro (conciliação automática, decisão sobre Open
  Finance).
- Fase 2 do CRM (persistência automática em `customers`, unificação de
  "Vendedor").
- Migration `20260828_financial_expenses_payment_account.sql` (de outra
  frente, não desta sessão) — status em produção não confirmado; mesmo
  risco do pipeline quebrado pode se aplicar a ela também.
- **Backfill histórico de adesão/seller_adhesion legado** (achado na
  DIR-13): receita real de adesão de vendedor e plano parceiro anterior a
  ~21-28/08/2026 mora em tabelas com semântica diferente
  (`partner_plan_purchases`, `contrato_assinaturas`, saldo de vendedor do
  Base44) — recuperar isso não é um backfill simples, é decisão de
  negócio se vale o esforço de "traduzir" esse histórico.

**Nenhuma implementação nova começa até uma diretiva nova ser registrada
aqui,** no formato de `docs/PADRAO_DIRETIVAS.md`.
