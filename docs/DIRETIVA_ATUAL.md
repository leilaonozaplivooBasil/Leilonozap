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
