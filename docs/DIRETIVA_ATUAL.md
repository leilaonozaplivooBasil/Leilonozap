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
