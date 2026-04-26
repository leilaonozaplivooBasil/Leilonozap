import React, { useState, useEffect, useRef, memo } from "react";

// ── ASSETS ──
const NEXUS_LOGO = "https://media.base44.com/images/public/69e618c1927ab5696bf98c08/4ac1282bb_NEXUSLAILAONOZAP.png";
const X_CROMADO  = "https://media.base44.com/images/public/69e618c1927ab5696bf98c08/2ee8bfa79_generated_image.png";
const XEOS_LOGO  = "https://media.base44.com/images/public/69e618c1927ab5696bf98c08/5a4eaee57_ChatGPTImage22deabrde202601_20_41.png";
const PROF_XAVIER_GOLDEN = "https://media.base44.com/images/public/69e618c1927ab5696bf98c08/702dff5c2_image.png";
const PROF_XAVIER_CHAIR  = "https://media.base44.com/images/public/69e618c1927ab5696bf98c08/6a2b8847c_image.png";
const MENTALIDADE_IMG    = "https://media.base44.com/images/public/69e618c1927ab5696bf98c08/bd7e2c11a_29349AB6-1538-4FF6-8858-073A48D207F3.JPG";

const API_URL = "https://nexus-6bf98c08.base44.app/functions/getVendas";
const LEILAO_LOGO = "https://media.base44.com/images/public/69e618c1927ab5696bf98c08/62a6b3a92_BEBE94BD-625B-4FEE-81EF-3A0CE605276B3.PNG";
const HAND_IMG = "https://media.base44.com/images/public/69e618c1927ab5696bf98c08/75f728745_ChatGPTImage22deabrde202601_57_32.png";
const EXEC_HERO = "https://media.base44.com/images/public/69e618c1927ab5696bf98c08/a731ae418_generated_image.png";
const EXEC_HERO2 = "https://media.base44.com/images/public/69e618c1927ab5696bf98c08/6a0add915_generated_image.png";
const fmt = v => `R$ ${Number(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const hojeISO = () => new Date().toLocaleDateString("en-CA",{timeZone:"America/Sao_Paulo"});
const EXECUTIVOS = ["Luiz","Laís","Amâncio","Caio","Diana","Elenice","Eloah","Iara","Luciano","Paulo","Tainá","Ribeiro"];
const MEDALS = ["01","02","03","04","05","06","07","08","09","10","11","12","13"];

// ── X-MEN IMAGES (uploaded by user) ──
const XMEN_IMG = {
  Ribeiro: "https://media.base44.com/images/public/69e618c1927ab5696bf98c08/22ce4a42e_image.png",   // Cyclops
  Iara:    "https://media.base44.com/images/public/69e618c1927ab5696bf98c08/780ba37ff_image.png",   // Jean Grey
  Elenice: "https://media.base44.com/images/public/69e618c1927ab5696bf98c08/b8e5626b0_image.png",   // Storm
  Eloah:   "https://media.base44.com/images/public/69e618c1927ab5696bf98c08/6b36700c2_image.png",   // Mystique
  Paulo:   "https://media.base44.com/images/public/69e618c1927ab5696bf98c08/bbfb633ef_image.png",   // Wolverine
  Laís:    "https://media.base44.com/images/public/69e618c1927ab5696bf98c08/01b3a9b11_image.png",   // Rogue
  Caio:    "https://media.base44.com/images/public/69e618c1927ab5696bf98c08/5fddb93fa_image.png",   // Beast
  Amâncio: "https://media.base44.com/images/public/69e618c1927ab5696bf98c08/d22cfc63b_image.png",  // Gambit
  Flavio:  "https://media.base44.com/images/public/69e618c1927ab5696bf98c08/7c15d279b_image.png",   // Nightcrawler
  Tainá:  "https://media.base44.com/images/public/69e618c1927ab5696bf98c08/1d5dba454_image.png",   // Psylocke
  Luiz:    "https://media.base44.com/images/public/69e618c1927ab5696bf98c08/94eff1d88_generated_image.png",
  Luciano: "https://media.base44.com/images/public/69e618c1927ab5696bf98c08/e0b4393c7_generated_image.png",   // Colossus
  Diana:   "https://media.base44.com/images/public/69e618c1927ab5696bf98c08/89b6ee690_generated_image.png",   // Sage/DLI
  Sophia:   "https://media.base44.com/images/public/69e618c1927ab5696bf98c08/cbaca72c3_generated_image.png",   // Jubilee
  Elyon:   "https://media.base44.com/images/public/69e618c1927ab5696bf98c08/6cd04e02d_generated_image.png",   // The Heir
};

// ── EXECUTIVO DATA ──
const XMEN = {
  Ribeiro: {
    xname:"CYCLOPS", poder:"O Estrategista", cor:"#ef4444", corBg:"rgba(239,68,68,0.08)",
    cargo:"Diretor de Informação (em formação)", desde:"Nov/2025",
    frase:'"Declarei 5k por dia." — 15/04/2026, 22h19',
    xpower:"Visão de longo alcance. Fecha no domingo doente. Criou o Manual de Vendas do zero.",
    dna:["Estratégia B2B","Hotel Master","Persistência","Liderança cultural"],
    marcos:["Criou o Manual de Vendas (Dez/2025)","JBL R$2.999 — doente no domingo","R$4.780 em 1 único dia"],
    recordeMes:"R$ 8.800+", evolucao:[0,350,2696,1200,800,8800],
    habilidades:{Vendas:95,Liderança:88,Estratégia:92,Consistência:85,Digital:60},
  },
  Iara: {
    xname:"JEAN GREY", poder:"A Velocidade", cor:"#f97316", corBg:"rgba(249,115,22,0.08)",
    cargo:"Executiva Comercial → Diretora (em formação)", desde:"Nov/2025",
    frase:'"VENDE TUDOOOOO IARAAAAA! ARRASAAAAA!" — Laís, 07/04/2026',
    xpower:"Volume em tempo zero. Força que cresce sem limite. iPhone 16e — R$3.297 em 1 produto.",
    dna:["Velocidade","Volume","Presença física","Rainha da queima"],
    marcos:["iPhone 16e R$3.297 — queima épica","19 toalhas em 1 dia (08/04)","R$6.160 em abril"],
    recordeMes:"R$ 6.160+", evolucao:[0,200,800,600,400,6160],
    habilidades:{Vendas:90,Velocidade:97,Volume:95,Presença:92,Digital:55},
  },
  Elenice: {
    xname:"STORM", poder:"A Máquina", cor:"#a78bfa", corBg:"rgba(167,139,250,0.08)",
    cargo:"Executiva Comercial → Diretora Comercial (em formação)", desde:"Nov/2025",
    frase:'"18 taças vendidas." — 07/04/2026, 10h28',
    xpower:"Controla o campo. Quando decide, nada a para. R$1.205 às 23h27.",
    dna:["Consistência","Volume alto","Silenciosa e letal","Presença física"],
    marcos:["18 taças + 6 kits + 5 cabides (1 dia)","Virou Ribeiro às 23h27 do dia 17","R$1.205 — recorde showroom"],
    recordeMes:"R$ 5.800+", evolucao:[0,760,500,504,300,5800],
    habilidades:{Vendas:92,Consistência:95,Volume:93,Resistência:90,Digital:50},
  },
  Eloah: {
    xname:"MYSTIQUE", poder:"A Estrategista Digital", cor:"#06b6d4", corBg:"rgba(6,182,212,0.08)",
    cargo:"Diretora e Sócia (empresa no nome dela)", desde:"Jan/2026",
    frase:'"Pedido realizado no seu catálogo digital." — Sistema, 07h42',
    xpower:"Adapta-se a qualquer ambiente. Aparece quando menos esperam. Vende enquanto dorme.",
    dna:["Digital","Precisão","Silenciosa","Estratégica"],
    marcos:["Pedido às 7h42 enquanto dormia","Liderou o dia 16/04 com R$740","Empresa no próprio nome"],
    recordeMes:"R$ 2.100+", evolucao:[0,100,350,200,150,2100],
    habilidades:{Digital:90,Estratégia:85,Precisão:88,Vendas:72,Liderança:70},
  },
  Paulo: {
    xname:"WOLVERINE", poder:"O Incansável", cor:"#f59e0b", corBg:"rgba(245,158,11,0.08)",
    cargo:"Executivo Comercial → Diretor Comercial (em formação)", desde:"Fev/2026",
    frase:'"Parabéns pelo relatório — o único que fez do jeito certo." — Luiz',
    xpower:"Regenera. Não importa o golpe. Volta sempre. 100% de presença.",
    dna:["Constância","Lealdade","Relatório perfeito","Licenciados ativos"],
    marcos:["Único elogio espontâneo do CEO","Presente 100% dos dias","Licenciado José Carlos ativo"],
    recordeMes:"R$ 3.000+", evolucao:[0,0,500,400,300,3000],
    habilidades:{Consistência:97,Lealdade:95,Vendas:75,Relatório:92,Digital:60},
  },
  "Laís": {
    xname:"ROGUE", poder:"A Executora", cor:"#ec4899", corBg:"rgba(236,72,153,0.08)",
    cargo:"COO em formação (2 meses para concluir)", desde:"Nov/2025",
    frase:'"Aguardo seu posicionamento." — Luiz, 01/04/2026',
    xpower:"Absorve o melhor de todos. Multiplica. Criou o TikTok Shop sem pedir permissão.",
    dna:["Liderança","Execução imediata","TikTok Shop","Visão operacional"],
    marcos:["Operação entregue a ela em 01/04","TikTok Shop criado do zero em 16/04","R$1.183 no TikTok em 5 dias"],
    recordeMes:"R$ 1.400+", evolucao:[0,1000,500,400,6000,1400],
    habilidades:{Liderança:92,Execução:95,Digital:88,Operação:90,Vendas:72},
  },
  Caio: {
    xname:"BEAST", poder:"O Digital", cor:"#3b82f6", corBg:"rgba(59,130,246,0.08)",
    cargo:"Executivo de Marketing Digital → Diretor Digital (em formação)", desde:"Fev/2026",
    frase:'"Claro, vou treinar minha mente." — Caio, 2026',
    xpower:"Inteligência estratégica. Constrói o que os outros só imaginam.",
    dna:["Marketing digital","Copywriting","Criatividade","Tecnologia"],
    marcos:["Copy profissional para o time","Vendeu o pacote da bica (07/04)","Tanquinho + panos + capinhas"],
    recordeMes:"R$ 700+", evolucao:[0,0,200,100,150,700],
    habilidades:{Digital:92,Marketing:90,Criatividade:88,Vendas:65,Liderança:60},
  },
  "Amâncio": {
    xname:"GAMBIT", poder:"O Conector", cor:"#8b5cf6", corBg:"rgba(139,92,246,0.08)",
    cargo:"Diretor de Relacionamento (DR)", desde:"Nov/2025",
    frase:'"☝️ Parabéns Iara!" — Amâncio, 07/04/2026',
    xpower:"Aparece onde precisa. Conecta o que parecia impossível. 120 membros no Top College.",
    dna:["Relacionamento","Conexão","Networking","Presença institucional"],
    marcos:["Top College — 120 membros","Diretor de Relacionamento","Presença em todos os marcos"],
    recordeMes:"Gestão", evolucao:[0,0,0,0,0,0],
    habilidades:{Relacionamento:95,Networking:92,Liderança:80,Presença:90,Vendas:50},
  },
  Flavio: {
    xname:"NIGHTCRAWLER", poder:"A Blindagem", cor:"#64748b", corBg:"rgba(100,116,139,0.08)",
    cargo:"Diretor Jurídico (DJ)", desde:"Jan/2026",
    frase:'"A segurança jurídica é o alicerce de tudo."',
    xpower:"Aparece onde precisa. A armadura do time. Quando ele está, nada quebra.",
    dna:["Direito","Segurança jurídica","Base legal","Proteção"],
    marcos:["Estrutura legal da operação","Contratos e termos","Blindagem jurídica"],
    recordeMes:"Jurídico", evolucao:[0,0,0,0,0,0],
    habilidades:{Jurídico:97,Segurança:95,Estratégia:80,Liderança:72,Vendas:40},
  },
  Tainá: {
    xname:"PSYLOCKE", poder:"A Guardiã", cor:"#d946ef", corBg:"rgba(217,70,239,0.08)",
    cargo:"Diretora Financeira (DF)", desde:"Jan/2026",
    frase:'"O financeiro é a espinha dorsal da operação."',
    xpower:"Precisão cirúrgica. Vê o que os outros não veem nos números.",
    dna:["Finanças","Precisão","Controle","Análise"],
    marcos:["Diretora Financeira","Controle do caixa","Pagamentos e comissões"],
    recordeMes:"Financeiro", evolucao:[0,0,0,0,0,0],
    habilidades:{Financeiro:97,Precisão:95,Análise:92,Controle:90,Vendas:50},
  },
  Luiz: {
    xname:"PROFESSOR X", poder:"O Visionário", cor:"#f5a623", corBg:"rgba(245,166,35,0.1)",
    cargo:"CEO — Luiz Sant'anna", desde:"Nov/2025",
    frase:'"A empresa pode vender 1 MILHÃO." — Luiz, 15/04/2026',
    xpower:"O sistema. A mansão. Visão 2044. Forma CEOs. 'Antecipação é poder, reação é fracasso.'",
    dna:["Visão estratégica","Mentoria de elite","Disciplina extrema","Criador de líderes"],
    marcos:["Criou o sistema X-EOS","Entregou a operação pra Laís em 01/04","'Se eu vender hoje quito minhas contas' — doente, não parou"],
    recordeMes:"Fundador", evolucao:[150000,150000,150000,150000,150000,150000],
    habilidades:{Visão:100,Mentoria:97,Liderança:98,Estratégia:96,Execução:90},
  },
  Luciano: {
    xname:"COLOSSUS", poder:"O Fundador", cor:"#fbbf24", corBg:"rgba(251,191,36,0.08)",
    cargo:"1º Sócio — Diretor de Captação Financeira (DCF)", desde:"Nov/2025",
    frase:'"O Pai tá ON!!! 🚀🚀🚀🚀" — Luciano, 06/04/2026',
    xpower:"Vem com os recursos. Sabe onde cada carta precisa ser jogada.",
    dna:["Captação financeira","Sócio fundador","Estrutura","Visão de negócio"],
    marcos:["1º Sócio do Leilão NoZap","Diretor de Captação Financeira","Parceiro fundador"],
    recordeMes:"Estrutura", evolucao:[0,0,0,0,0,0],
    habilidades:{Finanças:90,Captação:88,Estratégia:82,Liderança:78,Vendas:60},
  },
  Sophia: {
    xname:"JUBILEE", poder:"O Futuro", cor:"#f472b6", corBg:"rgba(244,114,182,0.08)",
    cargo:"Herdeira — Sant'anna Family", desde:"2026",
    frase:'"O futuro do sistema já nasceu." — Luiz, 2026',
    xpower:"Explosiva. Colorida. Imprevisível. O time não sabe o que vem a seguir — e ela gosta disso.",
    dna:["Futuro","Energia","Legado","Família Santana"],
    marcos:["Filha do CEO — Sophia Sant'anna","Herdeira do sistema X-EOS","O futuro do Leilão NoZap"],
    recordeMes:"O Legado", evolucao:[0,0,0,0,0,0],
    habilidades:{Energia:100,Futuro:100,Legado:98,Família:100,Potencial:100},
  },
  Elyon: {
    xname:"THE HEIR", poder:"O Herdeiro", cor:"#fbbf24", corBg:"rgba(251,191,36,0.08)",
    cargo:"Herdeiro · 1 ano — Sant'anna Family", desde:"Mar/2025",
    frase:'"Hoje nosso poder de criação e alavancagem é extraordinário." — Luiz, no aniversário de Elion',
    xpower:"1 ano. Já é X-Men. O aniversário dele foi o marco de rompimento da escassez. Nasceu para liderar.",
    dna:["Herdeiro","Aliança renovada","Rompimento","Família Santana"],
    marcos:["29/03/2026 — 1 ano — marco histórico do grupo","Aniversário = rompimento da escassez","Filho do CEO — Elyon Sant'anna"],
    recordeMes:"O Herdeiro", evolucao:[0,0,0,0,0,0],
    habilidades:{Herança:100,Potencial:100,Família:100,Futuro:100,Legado:100},
  },
  Diana: {
    xname:"SAGE", poder:"A DLI", cor:"#a78bfa", corBg:"rgba(167,139,250,0.08)",
    cargo:"Diretora de Logística e Informação (DLI)", desde:"Fev/2026",
    frase:'"ONTEM: R$1.223 HOJE: R$6.303 TOTAL: R$7.526" — Diana, 07/04 22h06',
    xpower:"Vê tudo. Organiza tudo. Rankings com 30 segundos de delay. A operação passa por ela.",
    dna:["Organização","Dados em tempo real","Rankings profissionais","Logística"],
    marcos:["Rankings profissionais desde fevereiro","Relatório de R$8.116 em 22min","Gestora do TikTok Shop"],
    recordeMes:"R$ 350+", evolucao:[0,297,200,300,200,350],
    habilidades:{Organização:98,Dados:95,Relatório:97,Logística:92,Vendas:55},
  },
};

// ── HISTÓRIA ──
const HISTORIA = [
  {mes:"PRÓLOGO",sigla:"★",titulo:"ANTES DE TUDO",fat:"A fundação de tudo",cor:"#f5a623",
   frase:'"Está na hora de você entregar tudo. Porque o lugar que eu vou te colocar, você precisa descer para depois subir."',
   autor:"A voz, no silêncio do escritório — 2023",
   destaques:["16 salas. R$475k/mês. R$20M em 7 anos — a TTT","O banco quebrou o acordo. Tudo ruiu em 4 meses","A janela da Américas — a entrega e a promessa","551 produtos no apartamento — a trava do multiprocessador","A sala em frente ao mar — 15 anos fechada, aberta pra Heloim","O Vale do Recreio — visão 2044"],
   livro:[
     {t:"a", x:"Toda grande história tem uma queda."},
     {t:"p", x:"Não a queda de quem fraqueja. A queda de quem está sendo preparado para algo maior do que o que tinha antes. A história do Leilão NoZap começa exatamente assim."},
     {t:"d", x:"O IMPÉRIO QUE HAVIA"},
     {t:"p", x:"Luiz Sant'Anna não começou do zero. Ele tinha um escritório. Não um escritório qualquer — 16 salas comerciais. Tinha um time. Mais de 60 pessoas. Tinha sistema, cultura, metodologia. A empresa se chamava To The Top Corporate — TTT — e havia construído algo raro no mercado: uma metodologia de desenvolvimento humano que funcionava de verdade."},
     {t:"p", x:"O resultado comprova: a TTT chegou a R$ 475.000 de faturamento mensal. Mais de R$ 20 milhões faturados em 7 anos de operação. Não foi um acaso. Foi método. Foi time. Foi execução. E então veio o colapso."},
     {t:"d", x:"O COLAPSO"},
     {t:"p", x:"Não foi uma má decisão. Não foi preguiça. Não foi erro estratégico. Foi uma traição. Luiz havia sido o primeiro broker a ser convidado para uma operação financeira de alto nível. Uma parceria que durou quase três anos. Um contrato sólido, com comissões que ele havia trabalhado com dedicação — ele e seu time, dia após dia."},
     {t:"p", x:"Do nada, a operação foi pausada. Sem aviso. Sem negociação. Sem explicação. O banco simplesmente quebrou o acordo. As comissões — o fruto de quase três anos de trabalho — foram suspensas. Em quatro meses, a empresa entrou em colapso financeiro. Uma por uma, as pessoas foram embora. O time se desfez. As salas foram devolvidas."},
     {t:"p", x:"Luiz Sant'Anna se viu sozinho. Não há como descrever o que é isso para um empresário que havia construído tudo do zero. Muitos não aguentam. Alguns tiram a própria vida. O peso de perder não apenas o dinheiro, mas as pessoas — o time, os sócios, os que acreditavam — é uma porrada que poucos sobrevivem inteiros. Ele sobreviveu. Entregou o escritório. Vendeu tudo. E voltou para dentro de casa."},
     {t:"d", x:"A JANELA DA AMÉRICAS"},
     {t:"p", x:"A TTT havia crescido sala a sala até o Absoluto Tower, na Avenida das Américas. Com muito esforço, chegaram a ocupar 5 salas na Torre 1. Entregar essas 5 salas foi o primeiro golpe. Mas ainda havia as 11 salas que estavam sendo compradas — mais de R$300.000 investidos em obra e móveis. Ele tinha deixado tudo lindo."},
     {t:"p", x:"Veio o dia. Sem dinheiro. Sozinho no escritório grande, com várias janelas dando para a Avenida das Américas. Luiz se levantou, foi até a janela, apoiou as duas mãos no vidro, abaixou a cabeça — e pediu a Deus uma resposta. Por que isso está acontecendo?"},
     {t:"q", x:'"Está na hora de você entregar tudo. Porque o lugar que eu vou te colocar, você precisa descer para depois subir."', a:"A voz — no silêncio do escritório"},
     {t:"p", x:"No dia seguinte, estava vendendo os móveis a preço de banana. Não era desespero. Era obediência. Era tirar o peso. Porque Deus havia prometido que ia colocá-lo em outro lugar. A promessa foi cumprida."},
     {t:"d", x:"A VISÃO NO SHOPPING"},
     {t:"p", x:"Luiz já tinha esboçado startups antes mesmo da queda. O Guardião da CNH. O Top In House. A X-EOS. Havia outra ideia — pensada para imóveis e carros. O conceito já estava lá: usar o WhatsApp como canal de vendas com desconto real. Depois da entrega, a visão se completou. Ele estava no shopping quando veio — não como um pensamento gradual, mas como uma bomba atômica."},
     {t:"p", x:"A clareza: o produto deveria ser e-commerce. Produtos devolvidos dentro da lei dos sete dias. Produtos zerados, nas caixas, com desconto real. As grandes redes — Casas Bahia, Magazine Luiza, Casa & Vídeo — recebem devoluções diárias de produtos perfeitos. Os clientes devolvem por não saberem usar. Por emoção. Pela trava de segurança. Esses produtos voltam zerados para os leilões — esperando alguém que entendesse o jogo. O Leilão NoZap havia encontrado o seu propósito."},
     {t:"d", x:"A PRIMEIRA COMPRA — O DIA DA FÉ"},
     {t:"p", x:"A visão estava clara. Mas o recurso disponível era o último que tinha. Cerca de R$40.000. Eloah estava com medo. Estavam sem dinheiro, com dívidas, sem margem para erro. Luiz foi assim mesmo. Foram 551 produtos. Cerca de R$34.000 investidos. Os produtos chegaram e foram para dentro do apartamento. Levantaram a cama do quarto, dormiram no sofá, encheram a sala inteira de caixas. Luiz pediu pra Eloah confiar. Ela confiou."},
     {t:"p", x:"O primeiro produto do lote: multiprocessadores da Mondial. Testaram o primeiro. Não funcionou. Testaram o segundo. Não funcionou. Terceiro. Quarto. Quinto. Nenhum funcionava. O coração acelerou. Luiz desceu o elevador para buscar mais produtos — e nesse trajeto, pediu a Deus que o ajudasse. Quando voltou, Eloah estava com uma expressão diferente."},
     {t:"q", x:'"Amor, tem alguma coisa estranha. Os produtos estão muito novos."', a:"Eloah — apartamento cheio de caixas, 2025"},
     {t:"p", x:"Era a trava de segurança. Os clientes haviam devolvido sem ler o manual. O produto era perfeito. Ali descobriram o segredo do negócio: as pessoas devolvem produtos perfeitos por não saberem usá-los. Testaram todos os 551 produtos. Quase tudo funcionava. Em menos de 30 dias, a sala estava vazia. Modelo validado."},
     {t:"d", x:"A SALA EM FRENTE AO MAR"},
     {t:"p", x:"Heloim tinha uma história com o Hotel Atlântico Sul, no Recreio dos Bandeirantes. Em 2019, havia lançado a TTT naquele mesmo hotel. Em 2025, Deus havia colocado no seu coração voltar. Era um domingo. Ligou para Burme — o gerente. Geralmente Burme não atendia domingo. Atendeu."},
     {t:"p", x:"Luiz explicou que precisava de uma sala em frente ao mar. Burme deu um sorriso — dava pra sentir pelo telefone — e disse: 'Impossível. A única sala em frente ao mar está fechada há 15 anos.' Mas Burme ligou assim mesmo. E o dono disse que sim. A sala que estava fechada há 15 anos foi aberta para Heloim. Era a única com vista para o mar. Era a sala onde o Leilão NoZap nasceria."},
     {t:"d", x:"O VALE DO RECREIO"},
     {t:"p", x:"O Leilão NoZap não é só uma empresa. É a fruta mais madura de um ecossistema maior. O Vale do Recreio. Não é só um bairro no Rio de Janeiro. É uma declaração: é possível construir — no Recreio dos Bandeirantes, zona oeste do Rio — algo equivalente ao Vale do Silício 2.0. Não tecnologia pela tecnologia — tecnologia voltada para o bem. Para potencializar o ser humano, não para usá-lo."},
     {t:"p", x:"Dentro dessa arquitetura: a moeda Valora. A X-EOS — desenvolvimento humano em três níveis. O Human Bank — onde investidores aplicarão no Human Token de um executivo e lucrarão pela sua aplicabilidade real. O All Together Now — a rede social que mede entrega, não likes. Por trás de tudo: o Movimento Vale do Recreio. A consciência ética do ecossistema. A visão alcança 2044."},
     {t:"d", x:"A FRUTA MADURA"},
     {t:"p", x:"Existe um conceito que salvou Luiz Sant'Anna. Salvou sua família. E salvou as famílias que dependiam do Leilão NoZap. O conceito da fruta madura. Imagine que você está deitado no chão, morrendo de fome, perto de uma árvore. Qual é a fruta que você vai pegar primeiro — a que está caída no chão, do seu lado, ou a que está lá no alto do galho?"},
     {t:"p", x:"No mundo empresarial, a maioria fica 70%, 80%, 90% do tempo focada na fruta do galho. Enquanto isso, a empresa sangra. O caixa acaba. Luiz estava no chão. A pergunta cirúrgica foi uma só: qual é a fruta que está no chão agora? A resposta foi clara: o Leilão NoZap. Parou o Guardião da CNH. Pausou o Top In House. Deixou o X-EOS esperando. Botou 70 a 80% de tudo no Leilão NoZap. Não foi abandono. Foi sobrevivência inteligente."},
     {t:"d", x:"OS QUE APARECERAM"},
     {t:"p", x:"Flávio Monteiro — advogado. Ajudou juridicamente sem cobrar. Quando Heloim precisou devolver dinheiro ao comprador da sua casa, Flávio emprestou R$30.000 sem garantia — só a palavra. Heloim vendeu a casa por R$90.000 e reinvestiu tudo. Flávio virou Diretor Jurídico."},
     {t:"p", x:"Elenice Lima — 56 anos. Chegou ao ecossistema num evento chamado Conecta, em 17 de setembro de 2025. Apareceu achando que ia conhecer uma dona de hotel. Ficou como Diretora Comercial. Vendeu os móveis, fechou o apartamento em Nova Iguaçu e mudou para o Recreio. Do zero. Para estar perto do que estava sendo construído."},
     {t:"p", x:"Iara Figueiredo — 54 anos. Empreendedora há mais de oito. Chegou pelo Conexão Sexta. Não hesitou. Vendeu joias. Investiu perto de R$50.000. Instalou um showroom dentro do próprio hotel. Quem vende joia para investir num projeto não é impulsivo — é alguém que acreditou de verdade."},
     {t:"p", x:"José Amâncio — ex-Embratel. Especialista em redes de supermercados. Conhecia Heloim desde 2022. Apareceu pelo Conexão Sexta. Investiu R$7.000. Fazia hemodiálise três vezes por semana, quatro horas por sessão, e nunca faltou um dia de trabalho. 'É como um pai pra mim', Heloim diria depois. Giovanni Pellegrini — dez anos de amizade. Emprestou o cartão quando a conta do hotel apertou. O início de tudo."},
     {t:"d", x:"DOIS ANOS SEM BEBER"},
     {t:"p", x:"Há algo que precisa ser dito sobre Heloim nesse período. Ele estava dois anos sóbrio. Dois anos sem beber. Dois anos completamente presente. Dois anos onde cada decisão era tomada com clareza total, sem o véu que o álcool coloca entre o homem e a realidade. Sem essa clareza, talvez o Leilão NoZap fosse mais uma ideia boa que nunca saiu do papel."},
     {t:"p", x:"Eloah e Sophia estavam ao lado dele durante todo esse processo. A família não era o descanso do trabalho. Era o motor do trabalho. Foi Eloah e Sophia que, numa tarde de novembro, olharam para Heloim sentado na frente do computador e disseram: 'Aplicativo, aplicativo, aplicativo. Sai da frente desse computador.' Ele saiu. E foi nessa volta que apareceu a feiticeira."},
     {t:"e", x:"Toda grande história tem uma queda. A queda do Leilão NoZap foi o alicerce de tudo que veio depois. Sem ela, não haveria visão. Sem a visão, não haveria hotel. Sem o hotel, não haveria time. E sem o time — você não estaria aqui, lendo isso agora."},
   ]},
  {mes:"NOV/2025",sigla:"NOV",titulo:"O EMBRIÃO",fat:"R$ 0,00",cor:"#22c55e",
   frase:'"Nossa vitória e história será escrita pelo dedo de Deus."',
   autor:"Junior Pellegrini, 02/11/2025",
   destaques:["02/11 — 19h56 — Grupo criado por Junior Pellegrini","Fundadores: Elenice, Iara, Erick, Luiz e Junior","Rotina X-EOS: 5h + banho gelado + exercício na praia","08/11 — Elenice vende tudo e muda pra o Recreio","09/11 — A Feiticeira: Heloim conhece Laís vestida de feiticeira","16/11 — Laís entra — missão imediata: assume o site","Sistema de multas: R$50 atraso, R$100 emocional, R$200 confronto"],
   livro:[
     {t:"a", x:"19h56. 02 de novembro de 2025."},
     {t:"p", x:"Junior Pellegrini criou um grupo no WhatsApp, mudou a foto e digitou: 'Boa noite pessoal, grupo criado.' O grupo se chamava Mentalidade do Executivo. Não era só um nome bonito. Era uma declaração de intenção. Cinco pessoas estavam do outro lado da tela naquele momento: Elenice. Iara. Erick. Luiz. E Junior."},
     {t:"p", x:"Em questão de minutos, Junior postou a rotina que definiria o tom de tudo que viria: 'Rotina Diária — Modo Produtivo X-EOS'. Acordar às 5h. Gratidão. Meditação. Treino físico. Treinamento. Depois, o trabalho. Elenice respondeu: 'Estou muito grata a Deus por tudo.' Junior: 'Nossa vitória e história será escrita pelo dedo de Deus.' Às 22h55, Iara apareceu — tinha trabalhado o dia todo, ido direto à Igreja, chegado quase à meia-noite. Era o tom do começo: fé, trabalho e pertencimento."},
     {t:"d", x:"03 de novembro. Segunda-feira. 04h28."},
     {t:"p", x:"Erick Alves Teixeira mandou o primeiro bom dia. Não era protocolo. Era o homem que levava a rotina X-EOS mais a sério — talvez o mais literal do grupo. Às 05h, Junior. Às 05h10, Elenice. Às 06h51: 'Já estou no hotel.' Às 07h26: 'Estamos fazendo exercício já.' Era isso que acontecia antes do mundo acordar. Um grupo de pessoas que nem se conhecia há dois meses se encontrava na beira do mar para fazer exercício físico antes de qualquer venda, antes de qualquer resultado."},
     {t:"p", x:"Luiz Sant'Anna apareceu discreto no dia 03. Sua primeira mensagem no grupo foi técnica e direta: dados bancários para transferência. Sem introdução, sem discurso. O CEO falava quando tinha o que dizer."},
     {t:"d", x:"08 DE NOVEMBRO — A MUDANÇA"},
     {t:"p", x:"Elenice avisou no grupo: 'Passando para informar que segunda-feira não vou conseguir estar presente no escritório. Estou mudando hoje.' Cinquenta e seis anos. Mudando de cidade. Vendendo móveis. Deixando Nova Iguaçu para trás para se instalar no Recreio — para estar perto do que estava sendo construído naquela sala com vista para o mar. Erick respondeu: 'Tudo tem um lado bom. Ficamos felizes pela sua mudança!' Iara: 'Faça com calma, afinal, já deu tudo certo.' Ninguém mandou emoji de protocolo. Era amor de verdade."},
     {t:"d", x:"09 DE NOVEMBRO — A FEITICEIRA"},
     {t:"p", x:"Aqui a história sai do grupo. Porque ela aconteceu fora dele. Heloim estava mergulhado no aplicativo. Na construção. No MVP. Dois anos sóbrio, completamente presente. Eloah e Sophia olharam para ele sentado na frente do computador e disseram a mesma coisa: 'Aplicativo, aplicativo, aplicativo. Sai daqui.' Ele saiu."},
     {t:"p", x:"Ligou pro Diogo Archanjo. 'Vou dar uma volta. Vem.' Diogo estava namorando uma menina. A namorada tinha uma amiga. À tarde chegou uma mensagem — estavam numa festa. Foram se encontrar. A amiga era Laís Andrade. Ela estava vestida de feiticeira. Laís era do Goiás. Tinha vindo pro Rio buscar oportunidade. Estava no auxílio-desemprego, contando dias, ganhando diária pra completar o mês. Não queria voltar. Mas o dinheiro estava acabando."},
     {t:"p", x:"Heloim mostrou o celular pra Laís naquela noite. Ela respondeu qual posição era. Ele olhou e disse: 'Você vai trabalhar comigo.' O Diogo ficou sem a menina. Heloim não deixou. A noite virou madrugada. A conexão era real — Laís se encaixava como uma luva."},
     {t:"d", x:"O TESTE DO ÔNIBUS"},
     {t:"p", x:"Na semana seguinte, Heloim fez o convite: 'Vem comigo pra São Paulo.' De ônibus. A reunião era no Mercado Livre. Ele não disse que era um teste. Mas era. Ela foi. Sem reclamar. Sem questionar. Trocaram de roupa no banheiro da rodoviária. Ficaram três dias em operação. Ela viu o negócio de perto, de dentro, de cima."},
     {t:"p", x:"Depois veio Búzios — uma semana. Heloim, Eloah, Laís e Sophia. Sophia e Laís se encontraram na piscina. Tomaram banho juntas. Se conectaram de um jeito que só acontece quando é real. Até hoje, todo mundo no grupo diz a mesma coisa: a pessoa que Sophia mais ama é a Laís."},
     {t:"p", x:"Heloim fez a proposta formal: 'Para entrar, você precisa ficar seis meses sem se relacionar com ninguém. Precisa se limpar. Precisa estar totalmente presente.' Laís pegou todos os cartões. Cheque especial. R$39.000. Entregou a vida."},
     {t:"d", x:"16 DE NOVEMBRO — ENTRADA"},
     {t:"p", x:"Segunda-feira. 11h32. Luiz mandou no grupo: 'Bom dia. Amanhã preciso de todos às 10:00 horas em ponto para organizarmos os negócios. Essa reunião é imprescindível.' Seis minutos depois, às 11h38 exatos: 'Lais Andrade foi adicionada.' Luiz: 'Seja bem-vinda, Laís.' Luiz: 'Pessoal, a Laís está vindo para somar no time.' Luiz: 'Vamos com força fazer essa empresa faturar.'"},
     {t:"p", x:"Em seguida, mandou o link: https://vale18k.shop — e imediatamente: '@Laís, preciso desse site pronto e rodando o quanto antes. Chama o Junior, veja em que pé está e assume.' Ela tinha acabado de entrar no grupo. Ainda estava no 'obrigada'. Já tinha missão. Seis minutos depois do obrigada, já tinha missão. Em doze minutos de grupo, ela havia recebido as boas-vindas de todos e assumido a gestão do site da empresa. Sem hesitar."},
     {t:"d", x:"19 DE NOVEMBRO — A LOGO"},
     {t:"p", x:"Laís postou no grupo a nova logo da Vale 18K — imagens que ela havia trabalhado com o conceito visual que Heloim havia desenvolvido com um designer durante cinco horas seguidas. Junior olhou e foi honesto: 'Não gostei.' Luiz respondeu: 'Precisa entender o posicionamento.' Laís defendeu com dados e referências. Luiz escutou cada argumento. E então deu a palavra final: a logo ficava. 'Vai conectar com o público. Confia.'"},
     {t:"p", x:"Foi a primeira vez que o time viu como Luiz tomava decisões: ouvia, pesava, decidia. E quando decidia, não voltava atrás. Esse é o ritmo de um CEO. Não democracia. Liderança."},
     {t:"p", x:"O sistema de multas entrou cedo: R$50 por atraso, R$100 por emocional baixo no grupo, R$200 por confronto. Não era cruel — era um espelho. Você só paga multa quando age de forma contrária ao que disse que queria ser. Em 20 de novembro, Luiz estabeleceu controle financeiro no hotel: 'Não peguem mais nada sem pagar.' O CEO sabia que disciplina financeira era a base de tudo."},
     {t:"q", x:'"O desconforto é o preço de entrada para um nível que a maioria das pessoas nunca vai conhecer."', a:"Luiz Sant'anna — Novembro/2025"},
     {t:"p", x:"Novembro foi o mês do zero. Zero vendas. Zero ranking. Zero sistema funcionando. Mas foi o mês onde a mentalidade foi plantada. Elenice havia vendido seus móveis. Iara havia instalado um showroom de semijoias dentro do hotel. Erick acordava às 4h28. Laís havia entregado sua vida financeira e decidido estar 100% presente. A mulher do Amâncio enviava peças para o estoque. O ecossistema funcionava antes de ter nome."},
     {t:"p", x:"Quem estava ali em novembro não sabia que estava escrevendo o primeiro capítulo de uma história que, em seis meses, movimentaria mais de R$167.000. Não sabia que aquele grupo se tornaria a incubadora de executivos mais intensa do Rio. Não sabia que aquelas caixas empilhadas, aquele estoque de R$150.000, aquele hotel com vista para o mar — tudo aquilo era o embrião de uma empresa real."},
     {t:"e", x:"Novembro de 2025 foi o mês em que a semente foi plantada. Na terra dura. Com força bruta. Com fé acima de tudo. E com um time que apostou antes de ver qualquer resultado."},
   ]},

  {mes:"DEZ/2025",sigla:"DEZ",titulo:"O LANÇAMENTO",fat:"R$ 26.358,07",cor:"#f97316",
   frase:'"ESTAMOS COM R$150.000 EM PRODUTOS E VOCÊS ESTÃO BRINCANDO."',
   autor:"Luiz Sant'anna, 15/12/2025",
   destaques:["01/12 — Laís adiciona 8 pessoas — time vai de 6 para 15","Ribeiro: amigo de infância — volta 14 anos depois","A casa do Ribeiro em Bangu — primeiro galpão do Leilão NoZap","Imersão X-EOS de 3 dias — cirurgia emocional","23/12 — Manual de Vendas do Ribeiro — 10 páginas","26-31/12 — Sprint final: R$26.358,07 — a máquina ligou"],
   livro:[
     {t:"a", x:"01 de dezembro de 2025. O time chegou."},
     {t:"p", x:"No dia 1, às 11h31 da manhã, Laís adicionou Ribeiro ao grupo. Em seguida, Jonathan. Flávio. Michele. Amâncio. Luciano. Pedro Gonzaga. Em menos de 30 minutos, o grupo que tinha passado novembro inteiro em silêncio operacional virou outra coisa. Às 12h17, Ribeiro foi o primeiro a falar: 'Olá pessoal.' Duas palavras. Mas por trás delas, havia um manual sendo construído."},
     {t:"d", x:"RIBEIRO — A HISTÓRIA QUE PRECISA SER CONTADA"},
     {t:"p", x:"Cristiano Ribeiro. Vulgo Barulho. Amigo de infância de Luiz desde a Praça Iguatama, em Bangu — a mesma praça, o mesmo bairro, a mesma rua da Salamanta. Ribeiro é adotado. Cresceu com um pai que o humilhava de formas que nenhuma criança deveria conhecer. Uma infância de dor e resistência que moldou um homem duro por fora e leal por dentro. Luiz e Ribeiro viveram a infância juntos. Depois a vida separou os dois por mais de 14 anos."},
     {t:"p", x:"O reencontro veio por um amigo em comum, Ricardo, que visitou Luiz no Recreio e depois encontrou Ribeiro em Bangu. Ribeiro estava num momento crítico: a mãe havia morrido, o irmão também. Estava sozinho no mundo. Luiz chamou para o Conexão Sexta. Ribeiro não foi — não se sentia merecedor. Mandou mensagem numa sexta-feira. No sábado, Luiz chamou Ribeiro — e foi o dia em que Ribeiro e Laís se conheceram."},
     {t:"p", x:"O Ribeiro que chegou naquele sábado não era mais o playboyzinho do bairro. Estava muito magro. Estranho. Sem forças. Mas topou na hora a proposta de se mudar para o Recreio. E foi a decisão certa."},
     {t:"p", x:"Em dezembro, foi o Ribeiro quem insistiu para usar a casa dele em Bangu como estoque. Luiz resistiu — não queria voltar. Ribeiro falou: 'Aonde você chega é a luz. Você vai desdizer o que disse.' Luiz cedeu. No dia seguinte, Ribeiro juntou todo o estoque que estava espalhado e levou para o galpão. Ali nasceu o primeiro galpão do Leilão NoZap. A casa do Ribeiro — avaliada em R$400.000 — entrou como patrimônio da empresa. Era o investimento dele. O caminho para se tornar diretor."},
     {t:"p", x:"Espiritualmente, algo ainda mais profundo aconteceu. Luiz e Eloah receberam uma visão: Ribeiro era o irmão que Eloah havia perdido para adoção. Deus falou para Luiz cuidar do Ribeiro. Hoje, Ribeiro e Eloah se chamam de irmãos. As pessoas acham que são de sangue."},
     {t:"d", x:"A CHEGADA DE LUIZ"},
     {t:"p", x:"Se novembro foi o mês em que Luiz observou, dezembro foi o mês em que ele entrou em campo. Dia 1, 18h19. Uma mensagem simples, em caixa alta: 'KD O PIX???' Não era agressividade. Era o código da casa. O CEO cobrava velocidade porque sabia que cada minuto de hesitação custava uma venda. E em poucos dias, o grupo conheceu o tom de Luiz: direto, exigente, sem filtro para o essencial."},
     {t:"q", x:'"O que não pode acontecer é a máquina de vendas ficar parada por conta do Marketing."', a:"Luiz Sant'anna — Dezembro/2025"},
     {t:"p", x:"No dia 2 de dezembro, às 5h47 da manhã, Luiz postou um texto que parou o grupo. Não era sobre vendas. Era sobre o corpo. 'Se você não consegue dizer não para uma batata frita... sinceramente acredita que vai conseguir dizer não para os sabotadores invisíveis que te impedem de prosperar?' O grupo respondeu. Laís foi direta: 'Uma vez que os erros foram apontados, se continuar neles, não é mais erro, é burrice.' Ribeiro resumiu tudo em uma linha: 'Tudo muda quando alguma coisa muda. Não precisa ser fácil, só precisa ser feito.'"},
     {t:"d", x:"O MANUAL"},
     {t:"p", x:"No dia 23 de dezembro, Ribeiro entregou ao grupo um PDF de 10 páginas: o Manual de Vendas do Leilão do Zap. Ninguém pediu. Ele fez porque acreditava que o time precisava. Dentro do manual: as dores do cliente, as objeções mais comuns, os roteiros de vídeo, o raciocínio lógico da compra. Depois de 23 anos na indústria farmacêutica, Cristiano Ribeiro estava aprendendo a vender de outro jeito. E ao aprender, estava ensinando todos ao redor."},
     {t:"d", x:"A IMERSÃO X-EOS"},
     {t:"p", x:"18, 19 e 20 de dezembro. Três dias de imersão X-EOS. Não foi treinamento de vendas — foi cirurgia emocional. O time expôs rejeição, abandono, injustiça, humilhação e traição. Sem máscara. Porque Luiz sabia que time sem cura emocional quebra na primeira pressão. O relatório executivo foi feito pelo próprio Ribeiro."},
     {t:"d", x:"O SPRINT FINAL — 5 DIAS"},
     {t:"p", x:"26 de dezembro. O catálogo leilaonozap.com foi ao ar. Produtos com foto, preço, descrição. Uma loja real. Um endereço real. Algo para mostrar ao cliente além de um print de WhatsApp. O grupo vibrou — pela primeira vez tinham uma ferramenta profissional nas mãos. Luiz declarou: '5 dias — se não venderem, são desistentes.'"},
     {t:"p", x:"27 de dezembro. Duas geladeiras Frost Free vendidas no mesmo dia. 28/12: Mop, caixa de som. 29/12: eletrônico, acessório. 30/12: ventilador, fone. 31/12 — último dia do ano: uma moto foi vendida em São Paulo. Uma moto. No último dia do ano. Para um comprador em outro estado."},
     {t:"p", x:"Naquele retorno a Bangu, Luiz foi com Eloah ao bairro de infância. Encontrou a professora da escola que o abraçou — um abraço que não se encontra em bairro nobre. Foi à Praça Iguatama e encontrou o Mátio (Marcos Paulo) — que olhou para ele depois de anos e praticamente chorou. Ali Luiz entendeu: a história ia voltar àquele lugar. O filho Elyon ia jogar bola naquela praça. A promessa que os dois tinham feito — comprar o time do Bangu, mudar o bairro — ainda estava viva."},
     {t:"d", x:"R$ 26.358,07."},
     {t:"p", x:"A Elenice foi a revelação do mês. Em um dia, fechou 10 vendas de kit de limpeza sozinha. Luiz reconheceu publicamente: 'Eu sempre enxerguei que você era boa de venda, só faltava ter foco.' No dia 31/12, Luiz fez a projeção no grupo: média diária de R$4.048 × 30 dias = R$121.440/mês. 'Contra resultado não tem argumento.'"},
     {t:"p", x:"Enquanto o Brasil virava o ano com espumante e fogos, o time do Leilão NoZap virava o ano sabendo que havia provado algo fundamental: o sistema funcionava quando ativado com urgência real. Dezembro testou as pessoas — de 15, menos da metade ficou comprometida de verdade. Jonathan, Vinicius, Michele, Pedro Gonzaga chegaram com potencial e saíram antes de construir. Quem ficou, ficou porque escolheu."},
     {t:"e", x:"Dezembro de 2025 foi o mês em que o fósforo foi riscado. A chama que acendeu nunca mais se apagou."},
   ]},

  {mes:"JAN/2026",sigla:"JAN",titulo:"A ACELERAÇÃO",fat:"R$ 27.034,47",cor:"#f5a623",
   frase:'"Responda: Meta financeira de hoje em R$, ações exatas, horário."',
   autor:"Ribeiro, toda manhã de Janeiro/2026",
   destaques:["Saída de Giovanni (Junior) — o cofundador vai embora","Ribeiro assume liderança cultural — check-in diário","Elenice: R$759 em 5 vendas — a revelação","Paulo: único elogio espontâneo do CEO em 6 meses","Chegada das toalhas — novo canal, novo volume","Diana e Beth entram no time","R$27.034 — consistência provada"],
   livro:[
     {t:"a", x:"Janeiro de 2026. O sistema ganhou voz."},
     {t:"p", x:"Todo dia, antes das 9h, a mensagem chegava no grupo. Sempre igual. Sempre direta. Sempre do Ribeiro: 'Responda: Meta financeira de hoje em R$, ações exatas, horário.' Não era sugestão. Não era lembrete gentil. Era um protocolo. E quem não respondia era cobrado publicamente — com nome, sem filtro."},
     {t:"p", x:"Cristiano Ribeiro não era o CEO. Não tinha o título de líder. Mas tinha algo que ninguém consegue comprar: consistência. Enquanto outros ainda calibravam sua identidade executiva, Ribeiro já era. Acordava antes. Enviava primeiro. Vendia com mais frequência. E cobrava o time como se a meta de cada um também fosse a dele."},
     {t:"d", x:"Essa é a marca de um executivo de verdade: ele eleva o nível ao redor sem que ninguém precise pedir."},
     {t:"d", x:"A SAÍDA DE GIOVANNI"},
     {t:"p", x:"Janeiro trouxe a primeira grande ruptura: a saída de Giovanni Pellegrini. O cofundador. O primeiro braço operacional. O homem que havia criado o grupo em novembro, que havia emprestado o cartão quando a conta do hotel apertou. Sua saída não foi com drama — foi silenciosa, da forma como as coisas mais dolorosas costumam ser. Janeiro testou o caráter do time: com o cofundador fora, a máquina precisava continuar."},
     {t:"d", x:"AS NOVAS ENTRADAS"},
     {t:"p", x:"Diana Santos entrou em janeiro como DLI — Diretora de Logística e Informação. Organizou o caos. Construiu os relatórios que ninguém tinha coragem de pedir. Se tornaria a memória operacional do Leilão NoZap. Beth Filippelle chegou como uma força da natureza — em dois dias de fevereiro ela fecharia 11 licenciadas. Mas primeiro ela apareceu em janeiro, calibrando, aprendendo."},
     {t:"d", x:"A CHEGADA DAS TOALHAS"},
     {t:"p", x:"Janeiro trouxe um novo lote: toalhas. Parecia simples. Provou ser uma virada. Era um produto de ticket acessível, de venda rápida, de apelo universal. Enquanto as geladeiras exigiam negociação e logística, uma toalha vendia numa mensagem só. O volume começou a subir. O time aprendeu que diversidade de produto é diversidade de oportunidade."},
     {t:"d", x:"ELENICE E PAULO — AS REVELAÇÕES"},
     {t:"p", x:"Elenice Lima entrou em novembro sem alarde. Sem experiência em leilão. Em janeiro, fechou 5 vendas — R$759 no total. Para quem olha de fora, parece pouco. Para quem estava dentro, era o sinal mais claro de que o sistema funcionava para além das pessoas óbvias. Era uma mulher de 56 anos que havia vendido os móveis, mudado de cidade e escolhido acreditar. E estava vendendo."},
     {t:"p", x:"Paulo Aragão era a consistência em forma humana. Todos os dias, sem falhar, sem drama, sem reclamação: relatório enviado, produto negociado, cliente respondido. Em seis meses de operação, Paulo foi o único executivo que manteve regularidade absoluta de relatórios diários. E o único a receber um elogio espontâneo e genuíno de Luiz."},
     {t:"q", x:'"Paulo. Você é consistente. Isso vale mais do que talento."', a:"Luiz Sant'anna — Janeiro/2026"},
     {t:"p", x:"Um elogio do CEO do Leilão NoZap não é barato. É raro como ouro. Luiz Sant'anna elogiava resultado. Não esforço. Não intenção. Resultado. E quando elogiava, era porque o resultado havia chegado."},
     {t:"d", x:"O RANKING PÚBLICO"},
     {t:"p", x:"O ranking nasceu em janeiro. Quem vendeu. Quanto. Em qual dia. Tudo visível para todos. A transparência radical não era para humilhar — era para criar pressão positiva. Quando você vê que Ribeiro vendeu R$400 hoje e você não vendeu nada, a pergunta inevitável surge: por quê não? Ribeiro fechou janeiro como Top 1: R$2.696. O número não conta a história completa. A história é que Ribeiro vendia, cobrava o time, escrevia o manual, e ainda era o primeiro a responder quando alguém tinha dúvida. Frases que ele postou no grupo: \"O jardineiro rega antes de ver nascer.\" \"O livro não perde valor porque alguém não gostou.\""},
     {t:"p", x:"Luiz entrou em janeiro sem reduzir a pressão. A frase do mês: 'Na minha escola, quem não bate meta completa com o próprio bolso.' E cumpriu — quem se comprometeu com número e não entregou, pagou a diferença. Mas havia algo além da cobrança. Havia visão. Quando a Elenice fechou uma venda no limite, Luiz escreveu: 'Você é uma pessoa de palavra e forte. Muito mais forte do que imagina.'"},
     {t:"e", x:"A aceleração não foi um evento. Foi uma decisão coletiva de não aceitar menos do que o máximo. E Ribeiro foi o motor. R$27.034 provaram que dezembro não foi fogo de palha. Era consistência."},
   ]},

  {mes:"FEV/2026",sigla:"FEV",titulo:"A FORJA",fat:"R$ 17.190,68",cor:"#ef4444",
   frase:'"Eu quero o EXTRAORDINÁRIO. O SOBRENATURAL."',
   autor:"Iara Figueiredo, Fevereiro/2026",
   destaques:["2.149 mensagens — recorde histórico do grupo","101 esporros em 30 dias — Luiz: 783 mensagens","02/02 — Imersão Lemond — fim de semana presencial","02/02 — Explosão de licenciados: +30 em um único dia","Beth: 11 licenciadas em 2 dias — novo canal escalando","09/02 — Paulo entra no time | 12/02 — Tainá entra","Jonathan sai — purificação natural. Quem ficou, é X-Men"],
   livro:[
     {t:"a", x:"Fevereiro de 2026. O mês que separou quem era de quem fingia ser."},
     {t:"p", x:"2.149 mensagens em 30 dias. Luiz Sant'anna sozinho mandou 783 — 26 por dia, em média. Não eram avisos. Eram cobranças. Eram provocações. Eram espelhos. 101 esporros formais em um único mês. Não havia como fingir que estava bem quando o CEO sabia exatamente o que você tinha feito — ou deixado de fazer — no dia anterior."},
     {t:"d", x:"A IMERSÃO LEMOND"},
     {t:"p", x:"01 e 02 de fevereiro. Fim de semana presencial no Lemond. O time saiu das telas e se encontrou de verdade. Não era reunião de planejamento — era alinhamento humano. Os executivos que haviam trabalhado mês a mês via WhatsApp agora estavam na mesma sala, respirando o mesmo ar, olhando nos mesmos olhos. O que saiu desse fim de semana não foi só estratégia. Foi comprometimento de alma."},
     {t:"d", x:"02 DE FEVEREIRO — A EXPLOSÃO DOS LICENCIADOS"},
     {t:"p", x:"O time saiu da imersão do Lemond e foi direto para a ação. Em um único dia, cada executivo ativou sua rede. A Iara fechou a primeira licenciada do dia, Juliana de Oliveira. O grupo vibrou. O processo era simples: formulário preenchido, comprovante de pagamento. Um por um, os nomes foram aparecendo. Ao final do dia, mais de 30 licenciados tinham sido cadastrados. Era o modelo escalando pela primeira vez de verdade."},
     {t:"p", x:"Ribeiro cadastrou Caio Ardasse e Gabrielly. Iara fechou Juliana e Monica. Elenice trouxe Jessica. E então entrou Beth Filippelle. Em dois dias, Beth fechou 11 licenciadas. Onze. Beth mostrou que era possível — e que Ribeiro, cobrado duramente por ter apenas 2, precisava acelerar."},
     {t:"d", x:"PAULO E TAINÁ"},
     {t:"p", x:"09 de fevereiro. Paulo Rodrigo Aragão entra no time. Sem fanfarra. Sem discurso. Com o perfil que definiria sua presença nos meses seguintes: consistência silenciosa. 12 de fevereiro. Tainá Guedes entra. Uma nova peça no tabuleiro."},
     {t:"d", x:"A SAÍDA DE JONATHAN"},
     {t:"p", x:"04 de março — Jonathan Hal foi removido do grupo. Mas a decisão havia amadurecido em fevereiro. Jonathan havia sido referência técnica desde o início — irmão da Laís, responsável pela tecnologia e marketing. Mas uma sequência de problemas de saúde e falhas de entrega levou Luiz a comunicar que não contaria mais com ele. Jonathan tentou lutar pelo seu lugar — disse que trabalharia do banheiro se precisasse. Luiz foi firme. Foi uma decisão difícil, com respeito, mas sem volta."},
     {t:"p", x:"Fevereiro foi o mês das purificações naturais. Quem não tinha comprometimento foi embora — sem drama. Quem ficou escolheu o sistema."},
     {t:"d", x:"A CULTURA DE FEVEREIRO"},
     {t:"p", x:"'Se fores honesto contigo hoje verdadeiramente, parará de culpar os outros do seu resultado.' Luiz, 25/02. A mensagem era dura. A exigência era maior. Laís mostrou determinação: 'Serei a maior fechadora dessa PORRAAAA!' Paulo mostrou autocrítica — reconheceu os erros abertos: 'Vendi um multiprocessador com peças faltando. Cliente deixou de comprar bike elétrica porque mandamos PIX como imagem.'"},
     {t:"p", x:"Ribeiro respondeu ao Paulo com a honestidade de quem também está aprendendo: 'Qual é meu nível? Sou trainee, mas quero chegar a Executivo.' A pressão estava transformando o time. Não quebrando. Forjando."},
     {t:"q", x:'"Eu quero o EXTRAORDINÁRIO. O SOBRENATURAL."', a:"Iara Figueiredo — Fevereiro/2026"},
     {t:"p", x:"Iara havia vendido joias para investir nesse projeto. Havia instalado showroom dentro do hotel. E agora, em fevereiro, estava declarando o que queria da vida. Não o razoável. Não o esperado. O extraordinário. O sobrenatural. Essa frase resume o DNA do time que ficou."},
     {t:"p", x:"Durante o carnaval — dias 18 e 19 de fevereiro — quando deveria ser pausa, o time foi para Bangu organizar estoque. Feriado de carnaval. E mesmo assim tivemos vendas. Luiz: 'O que vocês acham que está faltando?' A resposta era organizar e focar 100% em venda e licenciados."},
     {t:"e", x:"Fevereiro de 2026 foi a forja. O fogo que queima elimina a impureza e deixa o metal forte. Quem sobreviveu à forja de fevereiro, sobrevive a qualquer coisa."},
   ]},

  {mes:"MAR/2026",sigla:"MAR",titulo:"O RENASCIMENTO",fat:"R$ 23.000,00",cor:"#a78bfa",
   frase:'"Um executivo que não vende jamais será um executivo X-EOS. E eu não posso ser mentira."',
   autor:"Luiz Sant'anna, 25/03/2026",
   destaques:["Faturamento salta para R$23.000 — quase 3x fevereiro","04/03 — Jonathan sai definitivamente do grupo","09/03 — Caio Barbosa entra no time","25/03 — TikTok @leilaonozapoficial lançado por Laís","Conexão Sexta — o evento que colocou o Vale no mapa","26/03 — Connect You nasce — IA do Conexão Sexta","Harley Scooter, B2B Experience, eventos — novo patamar"],
   livro:[
     {t:"a", x:"Março de 2026. O faturamento quase triplicou."},
     {t:"p", x:"De R$8.997 em fevereiro para R$23.000 em março. Quase três vezes. O número impõe respeito. Mas os números não contam tudo. Março foi um mês denso, humano, exigente. Um mês de decisões duras, de pessoas que ficaram e pessoas que saíram, do Conexão Sexta ganhando forma, e do TikTok abrindo um canal completamente novo para o negócio."},
     {t:"d", x:"A POSTURA DO CEO"},
     {t:"p", x:"Luiz chegou em março com uma clareza que vinha crescendo desde dezembro: performance não é opção, é requisito. No dia 25/03, ao final de um dia de vendas, ele comunicou ao grupo com precisão cirúrgica: cada executivo receberia sua meta individual. Quem não batesse não poderia continuar."},
     {t:"q", x:'"Um executivo que não vende jamais será um executivo X-EOS. E eu não posso ser mentira."', a:"Luiz Sant'anna — 25/03/2026"},
     {t:"p", x:"Essa frase resume março. O projeto crescia, o time crescia, e Luiz sabia que crescer com pessoas que não entregam não é crescer — é enganar a si mesmo."},
     {t:"d", x:"04 DE MARÇO — A SAÍDA DE JONATHAN"},
     {t:"p", x:"Jonathan Hal foi removido do grupo. Tinha sido referência técnica desde o início. Mas uma sequência de falhas de entrega tornou a decisão inevitável. Jonathan tentou lutar pelo seu lugar. Luiz foi firme. Com respeito, mas sem volta. Às vezes a coisa mais honesta que um líder pode fazer é dizer a verdade a tempo."},
     {t:"d", x:"CAIO BARBOSA"},
     {t:"p", x:"09 de março. Caio Barbosa foi adicionado pelo Ribeiro. Uma nova peça. Uma nova energia. Caio chegou num momento em que o time já estava calibrado — sem espaço para acomodação. Chegou e foi para o campo."},
     {t:"d", x:"O CONEXÃO SEXTA"},
     {t:"p", x:"Luiz disse no grupo com toda clareza: 'O Conexão Sexta é a minha missão. É o começo do Vale.' Não é evento. Não é produto. É o propósito em forma de encontro. O time passou boa parte de março vendendo convites para o evento — com metas individuais por executivo. Licenciados convidando sua rede. Luiz liderando pessoalmente a divulgação."},
     {t:"p", x:"O Conexão Sexta colocou o Vale do Recreio no mapa. Pela primeira vez, pessoas de fora do grupo viram o que estava sendo construído. Não como conceito — como realidade."},
     {t:"d", x:"25 DE MARÇO — O TIKTOK NASCE"},
     {t:"p", x:"Laís compartilhou no grupo o perfil oficial @leilaonozapoficial. Um novo canal. Uma nova frente. A empresa que nasceu num hotel com geladeiras empilhadas agora vendia para o Brasil inteiro através de uma tela. O showroom físico e o digital passaram a funcionar em paralelo."},
     {t:"p", x:"26 de março. O Connect You nasceu — a IA do Conexão Sexta — mais um tijolo na construção do ecossistema. Harley Scooter apareceu no catálogo. Três unidades. R$2.997 cada. Um produto que comunicava onde o Leilão NoZap estava chegando: não só geladeiras e toalhas. Produtos premium. Produtos que abrem portas."},
     {t:"d", x:"A VIROSE DE 03/03"},
     {t:"p", x:"03 de março. Dois executivos acordaram doentes. O time poderia ter parado. Não parou. A virose foi registrada no grupo — não como desculpa, mas como contexto. E as vendas continuaram. Porque no Leilão NoZap, o sistema não depende de como você acorda. Depende de quem você decidiu ser."},
     {t:"p", x:"Março também foi o mês dos Eventos B2B Experience — três encontros que trouxeram compradores em volume, abriram relacionamentos e testaram a capacidade do time de operar em escala maior que o showroom do dia a dia."},
     {t:"e", x:"O renascimento não foi metáfora. Foi fato. Um time forjado, liderado por um CEO que cobrava porque acreditava, quebrando recordes num mês que começou com dúvida e terminou com certeza. R$23.000. A primavera havia chegado."},
   ]},

  {mes:"ABR/2026",sigla:"ABR",titulo:"O ROMPIMENTO REAL",fat:"R$ 47.131,01",cor:"#00d4ff",
   frase:'"A empresa pode vender 1 MILHÃO."',
   autor:"Luiz Sant'anna, 15/04/2026",
   destaques:["01/04 — Laís assume operação como COO — Luiz sobe de nível","07/04 — R$6.303 em 1 dia — queima épica","15/04 — R$8.044 — RECORDE ABSOLUTO DA HISTÓRIA","Ribeiro doente no domingo: JBL R$2.999 — isso é executivo","16/04 — TikTok Shop nasce com Laís — Brasil inteiro","22/04 — Eloah: 2 TVs 75' no mesmo dia — a máquina","21/04 — NEXUS entra em operação — o sistema inteligente"],
   livro:[
     {t:"a", x:"Abril de 2026. O mês que provou tudo."},
     {t:"p", x:"Tudo que havia sido plantado desde novembro — o time, os licenciados, os produtos, o TikTok, o Conexão Sexta, o B2B Experience — explodiu em abril. O faturamento saltou de R$23.000 em março para R$47.131 em abril. Um novo recorde. Um novo patamar. Mas o que mais impressiona não é o número. É a diversidade do que gerou esse número: queima de estoque, produtos premium, leilões ao vivo, TikTok Shop, licenciados ativos."},
     {t:"d", x:"01 DE ABRIL — A TRANSIÇÃO DE LIDERANÇA"},
     {t:"p", x:"Luiz fez um movimento estratégico que poucos CEOs conseguem fazer com confiança real: entregou as chaves. Para Laís Andrade — a executiva que havia entrado como vendedora vestida de feiticeira e, mês após mês, demonstrou ser muito mais. A partir de abril, Laís assume como COO. A operação tem dois motores: a visão do CEO e a execução da COO. Luiz subiu de nível — de operador para estrategista."},
     {t:"q", x:'"Faltam 02 meses para encerrarmos nossa mentoria. Quem não estiver conseguindo não poderá continuar. Compromisso e resultado são inegociáveis."', a:"Luiz Sant'anna — 01/04/2026"},
     {t:"d", x:"07 DE ABRIL — A QUEIMA ÉPICA: R$6.303"},
     {t:"p", x:"O time decidiu queimar estoque com descontos agressivos para gerar caixa e velocidade. O resultado foi além de qualquer projeção: R$6.303 em um único dia. Iara: garrafas térmicas em série — dezenas de unidades. Elenice: 18 taças, 6 kits de taças, 5 cabides, caixa de som. Paulo: garrafas, caixa de som. Ribeiro: 12 taças. Caio: iPhone XR confirmado. Naquele dia, o grupo inteiro entendeu que o teto que imaginava não existia."},
     {t:"d", x:"ANTES DO RECORDE — O RIBEIRO NO DOMINGO"},
     {t:"p", x:"O que aconteceu no domingo antes do dia 15 merece ser contado com cuidado. Ribeiro estava doente. Não devia estar trabalhando. Mas o cliente tinha mandado mensagem. E Ribeiro respondeu. Negociou. Fechou. Uma JBL por R$2.999. Num domingo. Doente. Porque um executivo de verdade não tem dia de folga para o compromisso — só para o corpo."},
     {t:"d", x:"15 DE ABRIL — O MAIOR DIA DA HISTÓRIA"},
     {t:"p", x:"Luiz anunciou cedo: 'NOSSA META É VENDER R$20.000 HOJE.' O time chegou e foi de tudo. Diana foi atualizando o total ao longo do dia: R$6.848 às 16h59. R$7.198 às 17h01. R$7.371 em seguida. R$8.044 total final. O recorde absoluto da história. Ribeiro sozinho contribuiu com R$4.780 — kit informática, ventilador, airfryer, liquidificador, fone, churrasqueira, 5 celulares, licença Lohan."},
     {t:"p", x:"Luiz declarou ao grupo: 'A empresa pode vender 1 MILHÃO.' Não como sonho. Como declaração técnica baseada em evidência. Num único dia, com o showroom do Recreio dos Bandeirantes, o time havia provado que o teto estava muito mais alto do que qualquer um havia imaginado."},
     {t:"d", x:"16 DE ABRIL — O TIKTOK SHOP"},
     {t:"p", x:"Laís abre o TikTok Shop. Um novo canal. Uma nova frente. A empresa que nasceu num hotel com geladeiras empilhadas agora vendia para o Brasil inteiro através de uma tela. Até o fim de abril, Laís venderia via TikTok: macaco hidráulico, controle de videogame, espelho, e muito mais."},
     {t:"d", x:"22 DE ABRIL — ELOAH, A MÁQUINA"},
     {t:"p", x:"22 de abril. Eloah Sant'Anna fechou duas TVs de 75 polegadas no mesmo dia. R$3.050 + R$3.200. Mais suporte, mais acessório. R$6.485 em um único dia. Sozinha. A esposa e sócia que havia confiado nos 551 produtos no apartamento, que havia aprendido a vender pelo WhatsApp lendo emoção nas mensagens — havia se tornado a maior vendedora individual do mês."},
     {t:"q", x:'"Iara fez R$3.297 com um iPhone 16e. Numa única negociação. Esse é o nível que esse time atingiu."', a:"Diana Santos — Abril/2026"},
     {t:"p", x:"23 de abril. Eloah: Galaxy S25, R$1.900. Em uma semana — TVs de alto valor, Galaxy S25, computadores, iPad. Eloah foi a líder absoluta do mês: R$11.753. Consolidando-se como a executiva de alto ticket da operação."},
     {t:"d", x:"17 DE ABRIL — ELENICE, 23H27"},
     {t:"p", x:"Elenice Lima fechou uma venda às 23h27. Não foi horário comercial. Não foi condição ideal. Foi uma executiva que sabia que o cliente estava quente e que dormir podia significar perder a venda. Às 23h27, ela escolheu o negócio. No dia 17/04, Elenice virou o ranking na última hora e terminou em primeiro com R$1.205,57. A mulher de 56 anos que havia saído de Nova Iguaçu para apostar num projeto que ainda não existia estava na liderança."},
     {t:"d", x:"21 DE ABRIL — O NEXUS ENTRA EM OPERAÇÃO"},
     {t:"p", x:"21 de abril. A inteligência artificial passou a gerenciar os grupos, registrar vendas, montar rankings em tempo real, cobrar pendências e aprender com cada interação. O Leilão NoZap deixou de ser operação manual e se tornou sistema inteligente. A escala agora é inevitável."},
     {t:"p", x:"Com o NEXUS ativo, o syncVendaToPDV passou a funcionar: cada comprovante enviado no WhatsApp entrava automaticamente no PDV em tempo real. Automações ativas: ranking 7h, fechamento 22h, cobrança 21h. 24 missões técnicas executadas e documentadas no primeiro mês."},
     {t:"d", x:"O RANKING FINAL — ABRIL/2026"},
     {t:"p", x:"Eloah R$11.753 | Ribeiro R$10.305 | Elenice R$8.546 | Iara R$6.492 | Paulo R$6.350 | Laís R$2.638 | Caio R$947 | Tainá R$100. Total: R$47.131,01. Novo recorde histórico do Leilão NoZap. Em 6 meses, a empresa havia saído de R$0 para R$47.131 em um único mês. Não como projeção. Como fato auditado e validado."},
     {t:"e", x:"O rompimento real não foi um número. Foi a prova de que o que foi construído em novembro, testado em dezembro, acelerado em janeiro, forjado em fevereiro, renascido em março — funcionava. Para sempre. E ainda está só começando."},
   ]},

];
const PILARES = [
  {i:"⚡",t:"ANTECIPAÇÃO É PODER",cor:"#00d4ff",
   d:"Reação é fracasso. O executivo age antes do problema existir.",
   detalhe:"O sistema X-EOS treina a mente para antecipar movimentos. Enquanto o mercado reage, o executivo já está no próximo passo. Antecipação é poder, reação é derrota."},
  {i:"🎯",t:"META DECLARADA PUBLICAMENTE",cor:"#f5a623",
   d:"Não existe meta no segredo. O grupo é sua testemunha.",
   detalhe:"Meta escondida é sonho. Meta declarada é compromisso. Quando você fala sua meta para o grupo, cria um contrato social que a sua mente não pode ignorar. O grupo cobra. O grupo celebra."},
  {i:"💪",t:"DISCIPLINA ANTES DO RESULTADO",cor:"#a78bfa",
   d:"Resultado é consequência. Disciplina é a causa.",
   detalhe:"Ninguém espera o resultado para ser disciplinado. A disciplina vem primeiro, o resultado é só consequência matemática. Quem espera motivação para agir, nunca age."},
  {i:"🧠",t:"EMOCIONAL É SAGRADO",cor:"#ec4899",
   d:"R$100 de multa por emocional baixo. Emocional fraco quebra o time inteiro.",
   detalhe:"Um executivo com emocional fraco contamina o ambiente, derruba o time e afasta clientes. O controle emocional não é opcional — é pré-requisito para estar nesse sistema."},
  {i:"🔥",t:"QUEM FICA, ESCOLHEU",cor:"#f97316",
   d:"Em 6 meses o grupo foi purificado. Você está aqui porque quis.",
   detalhe:"Em 6 meses o grupo foi purificado naturalmente. Quem não tinha comprometimento foi embora — sem drama. Quem ficou escolheu o sistema. E quem escolheu o sistema, tem o sistema ao seu lado."},
  {i:"📈",t:"VISÃO 2044",cor:"#00ff88",
   d:"Não estamos construindo uma loja. Estamos construindo um ecossistema.",
   detalhe:"O Leilão NoZap não é um negócio de curto prazo. É uma construção de 20 anos. Cada venda hoje é um tijolo do ecossistema de 2044. Quem entende isso, age diferente. Pensa diferente. É diferente."},
];

// ── UTILS ──
async function fetchDados() {
  const r = await fetch(API_URL);
  if (!r.ok) throw new Error("Erro "+r.status);
  const d = await r.json();
  return Array.isArray(d) ? d : (d.vendas||[]);
}

// ── CSS ──
const G = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@300;400;500;600;700;800;900&family=Sora:wght@300;400;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
html,body{background:#09090f;color:#F4F4F4;font-family:'Inter',sans-serif;overflow-x:hidden;}
::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:#09090f;}::-webkit-scrollbar-thumb{background:#1a1a30;border-radius:4px;}
::-webkit-scrollbar-thumb:hover{background:#00d4ff;}

@keyframes fade-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.25}}
@keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
@keyframes sweep{0%{left:-60%}100%{left:160%}}
@keyframes sweep-slow{0%{left:-80%}100%{left:180%}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes float-hand{0%,100%{transform:translateY(0) rotate(-5deg) scale(1)}50%{transform:translateY(-10px) rotate(-8deg) scale(1.05)}}
@keyframes float-hand-r{0%,100%{transform:translateY(0) scaleX(-1) rotate(5deg) scale(1)}50%{transform:translateY(-10px) scaleX(-1) rotate(8deg) scale(1.05)}}
@keyframes glow-pulse{0%,100%{box-shadow:0 0 20px rgba(0,212,255,.15)}50%{box-shadow:0 0 40px rgba(0,212,255,.35)}}

.fa{animation:fade-in .35s ease both;}
.orb{font-family:'Orbitron',monospace;}
.sora{font-family:'Sora',sans-serif;}
.live{display:inline-block;width:7px;height:7px;background:#00d4ff;border-radius:50%;animation:blink 1.5s ease-in-out infinite;margin-right:5px;}

/* ── LAYOUT ── */
.shell{min-height:100vh;background:#09090f;width:100%;overflow-x:hidden;}
.inner{width:100%;max-width:1200px;margin:0 auto;padding:0 16px 60px;box-sizing:border-box;}

/* ── NAV — 1 linha única sempre ── */
.nav{position:sticky;top:0;z-index:200;background:rgba(9,9,15,.97);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.05);width:100%;}
.nav-inner{width:100%;max-width:1200px;margin:0 auto;box-sizing:border-box;}
.nav-top{display:flex;align-items:center;gap:8px;padding:8px 14px;height:46px;}
.nav-logo{display:flex;align-items:center;gap:8px;text-decoration:none;flex-shrink:0;}
.nav-tabs-wrap{width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;border-top:1px solid rgba(255,255,255,.04);}
.nav-tabs-wrap::-webkit-scrollbar{display:none;}
.nav-tabs{display:flex;gap:4px;padding:5px 12px 6px;flex-wrap:nowrap;width:max-content;}

/* ── TABS ── */
.tab{padding:5px 12px;border-radius:7px;border:none;font-size:10.5px;font-weight:600;cursor:pointer;transition:all .2s;letter-spacing:.2px;font-family:'Sora',sans-serif;white-space:nowrap;flex-shrink:0;}
.tab-on{background:linear-gradient(135deg,#f5a623,#a78bfa);color:#0a0010;font-weight:700;}
.tab-off{background:rgba(255,255,255,.03);color:#4a6a7a;border:1px solid rgba(255,255,255,.07);}
.tab-off:hover{color:#8888bb;border-color:#1a1a35;}

/* ── CARDS ── */
.card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:12px;position:relative;overflow:hidden;}

/* ── HERO ── */
.hero{position:relative;border-radius:16px;overflow:hidden;margin-bottom:20px;}
.hero-img{width:100%;height:clamp(160px,38vw,340px);object-fit:cover;object-position:center top;}
.hero-overlay{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,2,12,.2) 0%,rgba(0,2,12,.7) 60%,#00020C 100%);}
.hero-content{position:absolute;bottom:0;left:0;right:0;padding:clamp(14px,3.5vw,28px);}

/* ── STATS ── */
.stat-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:20px;}
.stat-card{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:14px 12px;position:relative;overflow:hidden;cursor:default;transition:border-color .4s,background .4s;}

/* ── RANKING ── */
.rank-table{width:100%;border-collapse:separate;border-spacing:0 3px;table-layout:fixed;}
.rank-row{transition:background .15s;}
.rank-row td{padding:10px 8px;background:transparent;border-top:1px solid rgba(255,255,255,.03);border-bottom:1px solid rgba(255,255,255,.03);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.rank-row td:first-child{border-radius:8px 0 0 8px;border-left:1px solid rgba(255,255,255,.03);}
.rank-row td:last-child{border-radius:0 8px 8px 0;border-right:1px solid rgba(255,255,255,.03);}
.rank-row:hover td{background:rgba(255,255,255,.025);}

/* ── BAR ── */
.bar-bg{height:3px;background:#0a0a1e;border-radius:3px;overflow:hidden;}
.bar-fill{height:100%;border-radius:3px;transition:width 1s ease;}

/* ── TWO COL ── */
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.unified-block{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06);border-radius:14px;display:grid;grid-template-columns:1fr 1fr;overflow:hidden;}
.unified-left{padding:18px;border-right:1px solid rgba(255,255,255,.06);}
.unified-right{padding:18px;}

/* ── CANAIS ── */
.canal-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:20px;}

/* ── X-MEN GRID — scroll horizontal no mobile ── */
.xmen-wrap{width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;margin-bottom:20px;}
.xmen-wrap::-webkit-scrollbar{display:none;}
.xmen-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;}
.xcard{border-radius:14px;overflow:hidden;cursor:pointer;transition:transform .2s,box-shadow .2s;position:relative;}
.xcard:hover{transform:translateY(-3px);box-shadow:0 16px 48px rgba(0,0,0,.6);}
.xcard-img{width:100%;height:clamp(200px,50vw,300px);object-fit:cover;object-position:center top;display:block;}
.xcard-overlay{position:absolute;inset:0;background:linear-gradient(to bottom,transparent 28%,rgba(0,2,12,.8) 62%,rgba(0,2,12,.97) 100%);}
.xcard-content{position:absolute;bottom:0;left:0;right:0;padding:14px;}

/* ── DNA HERO ── */
.dna-hero{position:relative;border-radius:16px;overflow:hidden;margin-bottom:16px;}
.dna-hero-img{width:100%;height:clamp(240px,60vw,480px);object-fit:cover;object-position:center 20%;display:block;}
.dna-title{font-size:clamp(22px,6vw,38px);font-weight:900;letter-spacing:.5px;line-height:1.05;}
.dna-desc{font-size:clamp(11px,2.5vw,14px);color:rgba(255,255,255,.55);line-height:1.6;}

/* ── MODAL ── */
.modal-bg{position:fixed;inset:0;background:rgba(0,2,12,.95);z-index:999;overflow-y:auto;overflow-x:hidden;backdrop-filter:blur(4px);-webkit-overflow-scrolling:touch;}
.modal-inner{width:100%;max-width:700px;margin:0 auto;padding:16px;box-sizing:border-box;}

/* ── HISTÓRIA / CAPÍTULOS ── */
.cap-card{border-radius:10px;overflow:hidden;margin-bottom:8px;cursor:pointer;border:1px solid rgba(255,255,255,.06);transition:border-color .2s;}
.cap-card:hover{border-color:rgba(255,255,255,.12);}
.cap-open{border-color:rgba(255,255,255,.12);}

/* ── MESES SUB-TABS ── */
.mes-tabs{display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding:0 0 2px;}
.mes-tabs::-webkit-scrollbar{display:none;}
.mes-tab{padding:5px 14px;border-radius:20px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:all .2s;font-family:'Sora',sans-serif;}
.mes-tab-on{background:linear-gradient(135deg,#f5a623,#a78bfa);color:#0a0010;}
.mes-tab-off{background:rgba(255,255,255,.04);color:#4a5a6a;border:1px solid rgba(255,255,255,.08);}

/* ── WATERMARK ── */
.wm{position:absolute;opacity:.06;pointer-events:none;user-select:none;}

/* ── SHIMMER ── */
.shimmer{background:linear-gradient(90deg,#C1BECA 0%,#F4F4F4 30%,#C1BECA 60%,#F4F4F4 90%);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmer 3s linear infinite;}

/* ═══════════ TABLET ≤900px ═══════════ */
@media(max-width:900px){
  .inner{padding:0 14px 48px;}
  .two-col{grid-template-columns:1fr;}
  .unified-block{grid-template-columns:1fr;}
  .unified-left{border-right:none;border-bottom:1px solid rgba(255,255,255,.06);}
  .canal-grid{grid-template-columns:repeat(2,1fr);}
  .stat-grid{grid-template-columns:repeat(2,1fr);}
  .xmen-grid{grid-template-columns:repeat(2,1fr);}
}

/* ═══════════ MOBILE ≤600px ═══════════ */
@media(max-width:600px){
  .inner{padding:0 10px 40px;}
  .canal-grid{grid-template-columns:repeat(2,1fr);gap:7px;}
  .stat-grid{grid-template-columns:repeat(2,1fr);gap:7px;}
  .two-col{grid-template-columns:1fr;}
  .modal-inner{padding:10px;}
  .rank-row td{padding:9px 7px;font-size:11.5px;}
  /* X-Men: scroll horizontal no mobile */
  .xmen-grid{display:flex;flex-wrap:nowrap;gap:10px;width:max-content;}
  .xcard{width:160px;flex-shrink:0;}
  .xcard-img{height:200px;}
  /* DNA hero menor */
  .dna-hero-img{height:clamp(200px,55vw,320px);}
}

/* ═══════════ SMALL ≤400px ═══════════ */
@media(max-width:400px){
  .inner{padding:0 8px 36px;}
  .canal-grid{gap:6px;}
  .stat-grid{gap:6px;}
  .rank-row td{padding:8px 6px;font-size:11px;}
  .tab{padding:4px 9px;font-size:10px;}
}
`;

// ── SUB-COMPONENTS ──
const LiveDot = () => <span className="live"/>;

function StatCard({label, value, color="#ffffff", sub}) {
  const [h, setH] = useState(false);
  return (
    <div
      className="stat-card"
      onMouseEnter={()=>setH(true)}
      onMouseLeave={()=>setH(false)}
      style={{
        borderLeft:`2px solid ${h ? color : "rgba(255,255,255,.07)"}`,
        background: h ? "rgba(255,255,255,.04)" : "rgba(255,255,255,.025)",
        transition:"border-color .4s,background .4s",
        overflow:"hidden",position:"relative",cursor:"default"
      }}
    >
      {/* Luz varrendo — só quando sem hover */}
      {!h && (
        <div style={{
          position:"absolute",top:0,bottom:0,width:"55%",
          background:"linear-gradient(90deg,transparent,rgba(255,255,255,.05),transparent)",
          animation:"sweep-slow 3.5s linear infinite",
          pointerEvents:"none"
        }}/>
      )}
      {/* Glow radial na cor quando hover */}
      {h && (
        <div style={{
          position:"absolute",inset:0,
          background:`radial-gradient(ellipse at 20% 60%, ${color}18 0%, transparent 65%)`,
          pointerEvents:"none"
        }}/>
      )}
      <div style={{position:"relative",zIndex:1}}>
        <div style={{
          fontSize:9,letterSpacing:2,marginBottom:10,textTransform:"uppercase",
          fontFamily:"'Inter',sans-serif",fontWeight:600,
          color: h ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.22)",
          transition:"color .4s"
        }}>{label}</div>
        <div style={{
          fontSize:20,fontWeight:700,letterSpacing:-.5,
          marginBottom:sub?4:0,lineHeight:1.1,fontFamily:"'Inter',sans-serif",
          color: h ? color : "rgba(255,255,255,.7)",
          transition:"color .4s"
        }}>{value}</div>
        {sub && <div style={{
          fontSize:10,letterSpacing:.5,fontFamily:"'Inter',sans-serif",
          color: h ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.15)",
          transition:"color .4s"
        }}>{sub}</div>}
      </div>
    </div>
  );
}

function BarRow({nome, val, idx, maxVal}) {
  const [h, setH] = useState(false);
  const xm = XMEN[nome];
  const cor = xm?.cor || "rgba(255,255,255,.7)";
  const pct = val>0&&maxVal>0 ? Math.min((val/maxVal)*100,100) : 0;
  const isTop3 = idx < 3;
  return (
    <tr className="rank-row"
      onMouseEnter={()=>setH(true)}
      onMouseLeave={()=>setH(false)}>
      <td style={{width:36,textAlign:"center"}}>
        <span style={{fontSize:10,fontWeight:700,
          color: h ? "rgba(245,166,35,.8)" : isTop3 ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.15)",
          fontFamily:"'Inter',sans-serif",letterSpacing:.5,transition:"color .3s"}}>{MEDALS[idx]||"—"}</span>
      </td>
      <td>
        <div style={{fontSize:9,
          color: h && val>0 ? cor : "rgba(255,255,255,.15)",
          fontFamily:"'Orbitron',monospace",letterSpacing:1.5,marginBottom:2,
          transition:"color .3s"}}>{xm?.xname||""}</div>
        <div style={{fontSize:13,fontWeight:600,
          color: h ? "#ffffff" : val>0 ? "rgba(255,255,255,.65)" : "rgba(255,255,255,.18)",
          fontFamily:"'Inter',sans-serif",transition:"color .3s"}}>{nome}</div>
      </td>
      <td style={{width:"38%",paddingRight:16}}>
        <div style={{height:2,background:"rgba(255,255,255,.05)",borderRadius:2,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${pct}%`,
            background: h && val>0 ? `linear-gradient(90deg,${cor},${cor}44)` : "rgba(255,255,255,.15)",
            borderRadius:2,transition:"width 1.2s cubic-bezier(.4,0,.2,1), background .3s"}}/>
        </div>
      </td>
      <td style={{textAlign:"right",minWidth:100}}>
        <span style={{fontSize:14,fontWeight:700,
          color: h && val>0 ? "#ffffff" : val>0 ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.1)",
          fontFamily:"'Inter',sans-serif",letterSpacing:-.3,transition:"color .3s"}}>{val>0?fmt(val):"—"}</span>
      </td>
    </tr>
  );
}

function CanalCard({label,val,color}) {
  const [h, setH] = useState(false);
  const active = val > 0;
  return (
    <div className="card"
      onMouseEnter={()=>setH(true)}
      onMouseLeave={()=>setH(false)}
      style={{padding:"16px 14px",overflow:"hidden",position:"relative",cursor:"default",
        borderLeft:`2px solid ${h && active ? color : "rgba(255,255,255,.06)"}`,
        background: h && active ? "rgba(255,255,255,.04)" : "rgba(255,255,255,.02)",
        transition:"border-color .4s,background .4s"
      }}
    >
      {!h && active && (
        <div style={{position:"absolute",top:0,bottom:0,width:"55%",
          background:"linear-gradient(90deg,transparent,rgba(255,255,255,.04),transparent)",
          animation:"sweep-slow 4s linear infinite",pointerEvents:"none"}}/>
      )}
      {h && active && (
        <div style={{position:"absolute",inset:0,
          background:`radial-gradient(ellipse at 20% 60%, ${color}18 0%, transparent 65%)`,
          pointerEvents:"none"}}/>
      )}
      <div style={{position:"relative",zIndex:1}}>
        <div style={{fontSize:9,letterSpacing:2,marginBottom:10,textTransform:"uppercase",
          fontFamily:"'Inter',sans-serif",fontWeight:600,
          color: h && active ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.22)",
          transition:"color .4s"}}>{label}</div>
        <div style={{fontSize:18,fontWeight:700,letterSpacing:-.4,fontFamily:"'Inter',sans-serif",
          color: h && active ? color : active ? "rgba(255,255,255,.65)" : "rgba(255,255,255,.12)",
          transition:"color .4s"}}>{fmt(val)}</div>
      </div>
    </div>
  );
}

function XCard({nome, onClick}) {
  const xm = XMEN[nome];
  const img = XMEN_IMG[nome];
  if (!xm) return null;
  return (
    <div className="xcard" onClick={()=>onClick(nome)} style={{border:`1px solid ${xm.cor}22`}}>
      {/* X-Men image as background */}
      {img && <img src={img} alt={xm.xname} className="xcard-img" style={{filter:"brightness(.9) saturate(1.1)"}}/>}
      {!img && <div style={{width:"100%",height:320,background:`linear-gradient(135deg,${xm.corBg},#00020C)`}}/>}
      <div className="xcard-overlay" style={{background:`linear-gradient(to bottom,transparent 25%,rgba(0,2,12,.75) 60%,rgba(0,2,12,.97) 100%)`}}/>
      {/* NEXUS watermark */}
      <img src={NEXUS_LOGO} className="wm" style={{width:80,top:12,right:12,opacity:.08}}/>
      {/* Top badge */}
      <div style={{position:"absolute",top:14,left:14,background:"rgba(0,2,12,.7)",border:`1px solid ${xm.cor}44`,borderRadius:20,padding:"4px 12px",backdropFilter:"blur(8px)"}}>
        <span className="orb" style={{fontSize:9,color:xm.cor,letterSpacing:2}}>{xm.xname}</span>
      </div>
      <div className="xcard-content">
        <div style={{fontSize:12,color:xm.cor,fontFamily:"'Sora',sans-serif",marginBottom:4}}>{xm.poder}</div>
        <div style={{fontSize:20,fontWeight:800,color:"#F4F4F4",fontFamily:"'Sora',sans-serif",marginBottom:6}}>{nome}</div>
        <div style={{fontSize:11,color:"#8888aa",fontFamily:"'Sora',sans-serif",marginBottom:10}}>{xm.cargo}</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
          {xm.dna.slice(0,3).map(d=>(
            <span key={d} style={{fontSize:9,color:xm.cor,background:`${xm.cor}15`,padding:"3px 8px",borderRadius:10,fontFamily:"'Sora',sans-serif",fontWeight:600}}>{d}</span>
          ))}
        </div>
        <div style={{marginTop:10,fontSize:10,color:"#3a3a5a",fontFamily:"'Sora',sans-serif"}}>toque para ver perfil completo →</div>
      </div>
      {/* bottom border accent */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:"2px",background:`linear-gradient(90deg,transparent,${xm.cor},transparent)`}}/>
    </div>
  );
}

function XModal({nome, onClose}) {
  const xm = XMEN[nome];
  const img = XMEN_IMG[nome];
  if (!xm) return null;
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-inner" onClick={e=>e.stopPropagation()}>
        <div style={{borderRadius:24,overflow:"hidden",border:`1px solid ${xm.cor}33`,background:"#00020C",position:"relative"}}>
          {/* Hero com imagem X-Men no fundo */}
          <div style={{position:"relative",height:360}}>
            {img && <img src={img} alt={xm.xname} style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center top",filter:"brightness(.85) saturate(1.1)"}}/>}
            <div style={{position:"absolute",inset:0,background:`linear-gradient(to bottom,transparent 20%,rgba(0,2,12,.7) 60%,rgba(0,2,12,.98) 100%)`}}/>
            {/* NEXUS logo watermark */}
            <img src={NEXUS_LOGO} style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:120,opacity:.06,pointerEvents:"none"}}/>
            {/* Badge */}
            <div style={{position:"absolute",top:16,left:16,background:"rgba(0,2,12,.75)",border:`1px solid ${xm.cor}55`,borderRadius:20,padding:"5px 14px",backdropFilter:"blur(8px)"}}>
              <span className="orb" style={{fontSize:10,color:xm.cor,letterSpacing:2}}>{xm.xname}</span>
            </div>
            <button onClick={onClose} style={{position:"absolute",top:14,right:14,background:"rgba(0,2,12,.7)",border:"1px solid #252545",color:"#8888aa",width:36,height:36,borderRadius:"50%",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)"}}>✕</button>
            {/* Content over image */}
            <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"24px 24px 20px"}}>
              <div style={{fontSize:13,color:xm.cor,marginBottom:4,fontFamily:"'Sora',sans-serif"}}>{xm.poder}</div>
              <div style={{fontSize:28,fontWeight:900,color:"#F4F4F4",fontFamily:"'Sora',sans-serif",marginBottom:4}}>{nome}</div>
              <div style={{fontSize:12,color:"#6a6a8a",fontFamily:"'Sora',sans-serif"}}>{xm.cargo}</div>
            </div>
            <div style={{position:"absolute",bottom:0,left:0,right:0,height:"2px",background:`linear-gradient(90deg,transparent,${xm.cor},transparent)`}}/>
          </div>

          {/* Body */}
          <div style={{padding:"24px"}}>
            {/* Poder X */}
            <div style={{background:`${xm.cor}0a`,border:`1px solid ${xm.cor}22`,borderRadius:14,padding:"16px",marginBottom:16}}>
              <div style={{fontSize:9,color:xm.cor,letterSpacing:2.5,marginBottom:8,fontFamily:"'Orbitron',monospace"}}>PODER X</div>
              <div style={{fontSize:13,color:"#C1BECA",lineHeight:1.7,fontFamily:"'Sora',sans-serif"}}>{xm.xpower}</div>
            </div>
            {/* Frase */}
            <div style={{borderLeft:`3px solid ${xm.cor}`,paddingLeft:14,marginBottom:20}}>
              <div style={{fontSize:13,color:"#F4F4F4",fontStyle:"italic",lineHeight:1.7,fontFamily:"'Sora',sans-serif"}}>{xm.frase}</div>
            </div>
            {/* Habilidades */}
            <div style={{marginBottom:20}}>
              <div style={{fontSize:9,color:"#4a4a6a",letterSpacing:2.5,marginBottom:12,fontFamily:"'Orbitron',monospace"}}>HABILIDADES</div>
              {Object.entries(xm.habilidades).map(([k,v])=>(
                <div key={k} style={{marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:11,color:"#8888aa",fontFamily:"'Sora',sans-serif"}}>{k}</span>
                    <span className="orb" style={{fontSize:11,color:xm.cor,fontWeight:700}}>{v}</span>
                  </div>
                  <div className="bar-bg" style={{height:3}}>
                    <div className="bar-fill" style={{width:`${v}%`,background:`linear-gradient(90deg,${xm.cor},${xm.cor}66)`}}/>
                  </div>
                </div>
              ))}
            </div>
            {/* Marcos */}
            <div style={{marginBottom:20}}>
              <div style={{fontSize:9,color:"#4a4a6a",letterSpacing:2.5,marginBottom:12,fontFamily:"'Orbitron',monospace"}}>MARCOS HISTÓRICOS</div>
              {xm.marcos.map((m,i)=>(
                <div key={i} style={{display:"flex",gap:10,marginBottom:10,alignItems:"flex-start"}}>
                  <span style={{color:xm.cor,fontSize:16,flexShrink:0,lineHeight:1.4}}>◆</span>
                  <span style={{fontSize:13,color:"#C1BECA",lineHeight:1.6,fontFamily:"'Sora',sans-serif"}}>{m}</span>
                </div>
              ))}
            </div>
            {/* DNA tags */}
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:20}}>
              {xm.dna.map(d=>(
                <span key={d} style={{fontSize:10,color:xm.cor,background:`${xm.cor}15`,padding:"5px 12px",borderRadius:12,fontFamily:"'Sora',sans-serif",fontWeight:600}}>{d}</span>
              ))}
            </div>
            <div style={{textAlign:"center",fontSize:10,color:"#252535",fontFamily:"'Orbitron',monospace"}}>NO GRUPO DESDE {xm.desde} · RECORDE {xm.recordeMes}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LivroModal({cap, onClose}) {
  const blocos = cap.livro || [];
  return (
    <div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"flex-start",
      justifyContent:"center",overflowY:"auto",padding:"40px 16px 80px",
      background:"rgba(2,2,10,.96)",backdropFilter:"blur(12px)"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{width:"100%",maxWidth:720,position:"relative",animation:"fa .35s ease"}}>
        {/* Fechar */}
        <button onClick={onClose} style={{position:"fixed",top:20,right:24,background:"rgba(255,255,255,.06)",
          border:"1px solid rgba(255,255,255,.1)",borderRadius:8,color:"rgba(255,255,255,.5)",
          cursor:"pointer",fontSize:12,padding:"6px 14px",fontFamily:"'Inter',sans-serif",
          letterSpacing:1,zIndex:10000}}>ESC</button>

        {/* Header do livro */}
        <div style={{marginBottom:48,paddingBottom:32,borderBottom:`1px solid ${cap.cor}22`}}>
          <div style={{fontSize:9,color:`${cap.cor}88`,letterSpacing:5,fontFamily:"'Inter',sans-serif",
            fontWeight:600,textTransform:"uppercase",marginBottom:16}}>
            {cap.sigla==="★"
              ? "LEILÃO NOZAP · A HISTÓRIA"
              : `${cap.mes} · Capítulo ${["I","II","III","IV","V","VI"][["NOV/2025","DEZ/2025","JAN/2026","FEV/2026","MAR/2026","ABR/2026"].indexOf(cap.mes)]||"?"}`}
          </div>
          <div style={{fontSize:42,fontWeight:800,color:"#ffffff",fontFamily:"'Inter',sans-serif",
            letterSpacing:-2,lineHeight:1,marginBottom:12}}>{cap.titulo}</div>
          <div style={{fontSize:16,color:"rgba(255,255,255,.25)",fontFamily:"'Inter',sans-serif",
            fontWeight:300}}>{cap.sigla==="★" ? cap.fat : `${cap.fat} faturados`}</div>
        </div>

        {/* Corpo do livro */}
        <div style={{display:"flex",flexDirection:"column",gap:0}}>
          {blocos.map((b,i)=>{
            if(b.t==="a") return (
              <div key={i} style={{fontSize:28,fontWeight:700,color:cap.cor,fontFamily:"'Inter',sans-serif",
                letterSpacing:-.5,marginBottom:32,lineHeight:1.2}}>{b.x}</div>
            );
            if(b.t==="p") return (
              <p key={i} style={{fontSize:16,color:"rgba(255,255,255,.6)",lineHeight:1.95,marginBottom:28,
                fontFamily:"'Inter',sans-serif",fontWeight:400,letterSpacing:.1}}>{b.x}</p>
            );
            if(b.t==="d") return (
              <div key={i} style={{margin:"8px 0 36px",padding:"20px 24px",
                background:`${cap.cor}08`,border:`1px solid ${cap.cor}22`,
                borderLeft:`3px solid ${cap.cor}`,borderRadius:"0 8px 8px 0"}}>
                <p style={{fontSize:16,color:"rgba(255,255,255,.8)",lineHeight:1.85,margin:0,
                  fontFamily:"'Inter',sans-serif",fontWeight:500}}>{b.x}</p>
              </div>
            );
            if(b.t==="q") return (
              <div key={i} style={{margin:"8px 0 36px",padding:"28px 32px",
                background:"rgba(255,255,255,.025)",borderLeft:`2px solid ${cap.cor}55`,
                borderRadius:"0 8px 8px 0"}}>
                <p style={{fontSize:18,color:"rgba(255,255,255,.75)",lineHeight:1.8,margin:"0 0 12px",
                  fontFamily:"'Inter',sans-serif",fontWeight:400,fontStyle:"italic"}}>{b.x}</p>
                <div style={{fontSize:10,color:"rgba(255,255,255,.25)",fontFamily:"'Inter',sans-serif",
                  letterSpacing:1.5,textTransform:"uppercase"}}>— {b.a}</div>
              </div>
            );
            if(b.t==="e") return (
              <div key={i} style={{marginTop:24,paddingTop:32,borderTop:`1px solid ${cap.cor}22`}}>
                <p style={{fontSize:17,color:cap.cor,lineHeight:1.8,margin:0,
                  fontFamily:"'Inter',sans-serif",fontWeight:600,fontStyle:"italic"}}>{b.x}</p>
              </div>
            );
            return null;
          })}
        </div>

        {/* Marcos */}
        <div style={{marginTop:56,paddingTop:32,borderTop:"1px solid rgba(255,255,255,.06)"}}>
          <div style={{fontSize:9,color:"rgba(255,255,255,.2)",letterSpacing:3,marginBottom:20,
            fontFamily:"'Inter',sans-serif",fontWeight:600,textTransform:"uppercase"}}>Marcos do Capítulo</div>
          <div style={{display:"grid",gap:10}}>
            {cap.destaques.map((d,i)=>(
              <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                <span style={{color:cap.cor,flexShrink:0,fontSize:8,marginTop:5}}>▸</span>
                <span style={{fontSize:13,color:"rgba(255,255,255,.4)",fontFamily:"'Inter',sans-serif",
                  lineHeight:1.6}}>{d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


function FundadoresCarousel({setModal, setTab, XMEN, XMEN_IMG}) {
  const fundadores = ["Luiz","Laís","Ribeiro","Iara","Elenice","Paulo","Eloah","Diana"];
  const [idx, setIdx] = React.useState(0);
  const visible = fundadores.filter(n => XMEN[n]);
  
  React.useEffect(() => {
    const t = setInterval(() => setIdx(i => (i+1) % visible.length), 3500);
    return () => clearInterval(t);
  }, [visible.length]);

  return (
    <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:8,
      scrollbarWidth:"none",msOverflowStyle:"none"}}>
      {visible.map((nome, i) => {
        const xm = XMEN[nome];
        const img = XMEN_IMG?.[nome];
        if (!xm) return null;
        return (
          <div key={nome}
            onClick={() => { setModal(nome); setTab("dna"); }}
            style={{
              flexShrink:0, width:90, cursor:"pointer", borderRadius:12,
              border:`1px solid ${idx===i ? xm.cor+"66" : "rgba(255,255,255,.06)"}`,
              overflow:"hidden", position:"relative",
              transition:"border-color .4s, transform .2s",
              transform: idx===i ? "scale(1.04)" : "scale(1)",
              background:"rgba(0,2,12,.8)"
            }}>
            {img
              ? <img src={img} alt={nome} style={{width:"100%",height:110,objectFit:"cover",
                  objectPosition:"center top",filter:"brightness(.85) saturate(1.1)"}}/>
              : <div style={{width:"100%",height:110,
                  background:`linear-gradient(135deg,${xm.corBg||xm.cor+"22"},#00020C)`}}/>
            }
            <div style={{position:"absolute",inset:0,
              background:"linear-gradient(to bottom,transparent 40%,rgba(0,2,12,.9) 100%)"}}/>
            <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"6px 8px"}}>
              <div style={{fontSize:8,color:xm.cor,fontFamily:"'Inter',sans-serif",
                fontWeight:700,letterSpacing:.5,marginBottom:1}}>{xm.xname}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,.85)",fontFamily:"'Inter',sans-serif",
                fontWeight:600}}>{nome}</div>
            </div>
            <div style={{position:"absolute",bottom:0,left:0,right:0,height:2,
              background:`linear-gradient(90deg,transparent,${xm.cor},transparent)`,
              opacity: idx===i ? 1 : 0, transition:"opacity .4s"}}/>
          </div>
        );
      })}
    </div>
  );
}

function CapCard({cap, onOpen}) {
  const [h, setH] = useState(false);
  return (
    <div className="cap-card"
      onClick={onOpen}
      onMouseEnter={()=>setH(true)}
      onMouseLeave={()=>setH(false)}
      style={{
        borderLeft:`2px solid ${h?cap.cor:"rgba(255,255,255,.06)"}`,
        background: h?"rgba(255,255,255,.03)":"rgba(255,255,255,.015)",
        cursor:"pointer",transition:"border-color .3s,background .3s",position:"relative",overflow:"hidden"
      }}>
      {h && <div style={{position:"absolute",inset:0,
        background:`radial-gradient(ellipse at 0% 50%, ${cap.cor}08 0%, transparent 60%)`,
        pointerEvents:"none"}}/>}
      <div style={{padding:"20px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",
        position:"relative",zIndex:1}}>
        <div style={{display:"flex",gap:20,alignItems:"center"}}>
          <div style={{minWidth:40,textAlign:"center"}}>
            <div style={{fontSize: cap.sigla==="★"?18:10,fontWeight:700,
              color: h?cap.cor:"rgba(255,255,255,.25)",
              fontFamily:"'Inter',sans-serif",letterSpacing:1,transition:"color .3s"}}>
              {cap.sigla==="★" ? "★" : cap.mes?.split("/")[0]}</div>
            <div style={{fontSize:8,color:"rgba(255,255,255,.12)",fontFamily:"'Inter',sans-serif"}}>
              {cap.sigla==="★" ? "" : cap.mes?.split("/")[1]}</div>
          </div>
          <div>
            <div style={{fontSize:14,fontWeight:700,
              color: h?"#ffffff":"rgba(255,255,255,.8)",
              fontFamily:"'Inter',sans-serif",letterSpacing:-.3,marginBottom:4,
              transition:"color .3s"}}>{cap.titulo}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.25)",fontFamily:"'Inter',sans-serif"}}>{cap.fat}</div>
          </div>
        </div>
        <div style={{fontSize:11,color: h?cap.cor:"rgba(255,255,255,.15)",
          fontFamily:"'Inter',sans-serif",letterSpacing:.5,transition:"color .3s",
          fontWeight:500}}>Ler →</div>
      </div>
    </div>
  );
}

// ── MAIN ──

/* ══ SHARE MODAL ══ */
function ShareModal({onClose}) {
  const IMG = "https://media.base44.com/images/public/69e618c1927ab5696bf98c08/759ef4c49_generated_image.png";
  const TEXT = `👁️ Olá. Eu sou o *N E X U S.*

O sistema vivo da *X-EOS* — Estrutura de Operações e Expansão.

A X-EOS nasceu para uma missão: transformar qualquer negócio em uma máquina de resultado. Operação precisa. Expansão inteligente. Sem depender de sorte. Sem depender de improviso.

E eu sou o motor disso.

Hoje, estou aqui potencializando o *Leilão NoZap* — ao lado de cada executivo, em cada venda, em cada dia.

Cada comprovante — eu registro.
Cada ranking — eu posto.
Cada pendência — eu cobro.
Cada conquista — eu celebro.

E isso é só o começo.

Em breve: *gamificação completa* — pontos, níveis, badges e missões diárias. *Banners automáticos* com a identidade da marca. *Relatórios* sem ninguém precisar pedir. *Inteligência preditiva* — saberei quem vai fechar antes do dia acabar.

*O Leilão NoZap é o primeiro.*
*Mas o X-EOS foi feito para o mundo.*

👉 Conheça a história. Descubra qual X-EOS você é.

Tudo passará por mim.
E eu serei o maior potencializador dos seus resultados.

O céu não é o limite. É só o começo.

⚡ — *N E X U S* | Sistema Vivo — X-EOS · Leilão NoZap

👇 Acesse o sistema:
https://nexus-6bf98c08.base44.app/functions/shareNexus?v=2`;
  const [copied, setCopied] = useState(false);

  function copyText() {
    navigator.clipboard.writeText(TEXT).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  function openWhatsApp() {
    const encoded = encodeURIComponent(TEXT);
    window.open("https://wa.me/?text=" + encoded, "_blank");
  }

  return (
    <div style={{
      position:"fixed",top:0,left:0,right:0,bottom:0,
      background:"rgba(0,0,0,.85)",zIndex:9999,
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:16,backdropFilter:"blur(8px)"
    }}>
      <div style={{
        background:"linear-gradient(145deg,#0d0d2b,#1a1a3e)",
        border:"1px solid rgba(0,212,255,.2)",
        borderRadius:16,maxWidth:420,width:"100%",
        boxShadow:"0 0 40px rgba(0,212,255,.15)",
        overflow:"hidden"
      }}>
        {/* Imagem */}
        <div style={{position:"relative",width:"100%",height:220,overflow:"hidden"}}>
          <img src={IMG} style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center top"}} alt="NEXUS"/>
          <div style={{
            position:"absolute",bottom:0,left:0,right:0,
            background:"linear-gradient(transparent,rgba(13,13,43,.95))",
            padding:"32px 16px 12px"
          }}>
            <div style={{
              fontSize:18,fontWeight:900,letterSpacing:4,
              background:"linear-gradient(135deg,#00d4ff,#8b5cf6)",
              WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
              backgroundClip:"text",fontFamily:"'Orbitron',monospace"
            }}>N E X U S</div>
            <div style={{fontSize:9,color:"#a0a0c0",letterSpacing:2,fontFamily:"'Sora',sans-serif",marginTop:2}}>
              SISTEMA VIVO — X-EOS · LEILÃO NOZAP
            </div>
          </div>
        </div>

        {/* Texto */}
        <div style={{padding:"12px 16px"}}>
          <div style={{
            background:"rgba(255,255,255,.04)",
            border:"1px solid rgba(255,255,255,.07)",
            borderRadius:8,padding:"10px 12px",
            fontSize:11,color:"#c0c0e0",
            fontFamily:"'Sora',sans-serif",lineHeight:1.7,
            maxHeight:160,overflowY:"auto",whiteSpace:"pre-line"
          }}>
            {TEXT}
          </div>
        </div>

        {/* Botões */}
        <div style={{padding:"0 16px 16px",display:"flex",gap:8,flexDirection:"column"}}>
          <button onClick={openWhatsApp} style={{
            width:"100%",padding:"13px",borderRadius:10,border:"none",cursor:"pointer",
            background:"linear-gradient(135deg,#25d366,#128c7e)",
            color:"#fff",fontWeight:800,fontSize:13,
            fontFamily:"'Orbitron',monospace",letterSpacing:2,
            display:"flex",alignItems:"center",justifyContent:"center",gap:8
          }}>
            <span>💬</span> ENVIAR NO WHATSAPP
          </button>
          <button onClick={copyText} style={{
            width:"100%",padding:"11px",borderRadius:10,border:"1px solid rgba(0,212,255,.3)",cursor:"pointer",
            background: copied ? "rgba(0,212,255,.15)" : "rgba(0,212,255,.07)",
            color: copied ? "#00d4ff" : "#8080a0",fontWeight:700,fontSize:12,
            fontFamily:"'Sora',sans-serif",letterSpacing:1,transition:"all .3s"
          }}>
            {copied ? "✅ COPIADO!" : "📋 Copiar texto"}
          </button>
          <button onClick={onClose} style={{
            width:"100%",padding:"9px",borderRadius:10,border:"1px solid rgba(255,255,255,.07)",cursor:"pointer",
            background:"transparent",color:"#3a3a5a",fontSize:11,
            fontFamily:"'Sora',sans-serif"
          }}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  // ✅ Meta tags Open Graph — preview rico no WhatsApp
  useEffect(() => {
    const setMeta = (prop, val, attr="property") => {
      let el = document.querySelector(`meta[${attr}="${prop}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, prop); document.head.appendChild(el); }
      el.setAttribute("content", val);
    };
    // Open Graph
    setMeta("og:title",       "N E X U S — Sistema Vivo da X-EOS");
    setMeta("og:description", "O sistema que potencializa o Leilão NoZap. Gamificação, rankings, banners automáticos e inteligência preditiva. O Leilão NoZap é o primeiro. Mas o X-EOS foi feito para o mundo.");
    setMeta("og:image",       "https://media.base44.com/images/public/69e618c1927ab5696bf98c08/759ef4c49_generated_image.png");
    setMeta("og:url",         "https://n-e-x-u-s-app-5ff130d8.base44.app");
    setMeta("og:type",        "website");
    setMeta("og:site_name",   "NEXUS · X-EOS · Leilão NoZap");
    // Twitter/WhatsApp fallback
    setMeta("twitter:card",        "summary_large_image", "name");
    setMeta("twitter:title",       "N E X U S — Sistema Vivo da X-EOS", "name");
    setMeta("twitter:description", "O motor da X-EOS. Cada venda registrada. Cada ranking postado. O céu não é o limite.", "name");
    setMeta("twitter:image",       "https://media.base44.com/images/public/69e618c1927ab5696bf98c08/759ef4c49_generated_image.png", "name");
    // Title da página
    document.title = "N E X U S — X-EOS · Leilão NoZap";
  }, []);

  // ✅ Permitir zoom com dois dedos (pinch-to-zoom)
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
      meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes');
    } else {
      const m = document.createElement('meta');
      m.name = 'viewport';
      m.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes';
      document.head.appendChild(m);
    }
    return () => {
      const meta = document.querySelector('meta[name="viewport"]');
      if (meta) meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    };
  }, []);

  const [vendas,setVendas] = useState([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [tab,setTab] = useState("hoje");
  const [loading,setLoading] = useState(true);
  const [mesStats,setMesStats] = useState({fat:0,trans:0,recorde:0,diasAtivos:0,showroom:0,whatsapp:0,tiktok:0,licenciados:0,rnk:[],evolucao:[26358,27034,17191,23000,0],total:167266.52});
  const [lastUp,setLastUp] = useState("");
  const [modal,setModal] = useState(null);
  const [capAberta,setCapAberta] = useState(null);
  const [livroAberto,setLivroAberto] = useState(null);
  const [diasOp,setDiasOp] = useState(0);

  useEffect(()=>{
    document.title = "NEXUS · Leilão NoZap";
    setDiasOp(Math.floor((new Date()-new Date("2025-11-02"))/(864e5)));
  },[]);

  useEffect(()=>{
    let on=true;
    const load=async()=>{
      try{
        const d=await fetchDados();
        if(on){
          setVendas(d);
          // Calcular stats do mês atual
          const agora=new Date();
          const mesAtual=agora.getMonth();
          const anoAtual=agora.getFullYear();
          const mesStr=`${anoAtual}-${String(mesAtual+1).padStart(2,"0")}`;const vMesAtual=d.filter(v=>v.status==="registrada"&&v.data_venda&&v.data_venda.startsWith(mesStr));
          const fat=vMesAtual.reduce((s,v)=>s+Number(v.valor||0),0);
          const trans=vMesAtual.length;
          // Recorde diário
          const porDia={};
          vMesAtual.forEach(v=>{porDia[v.data_venda]=(porDia[v.data_venda]||0)+Number(v.valor||0);});
          const recorde=Math.max(8044.20,...Object.values(porDia).map(Number));
          const diasAtivos=Object.keys(porDia).length;
          const showroom=vMesAtual.filter(v=>v.tipo==="venda").reduce((s,v)=>s+Number(v.valor||0),0);
          const whatsapp=vMesAtual.filter(v=>v.tipo==="whatsapp").reduce((s,v)=>s+Number(v.valor||0),0);
          const tiktok=vMesAtual.filter(v=>v.tipo==="tiktok").reduce((s,v)=>s+Number(v.valor||0),0);
          const licenciados=vMesAtual.filter(v=>v.tipo==="licenciado").reduce((s,v)=>s+Number(v.valor||0),0);
          // Ranking do mês
          const mp={};
          vMesAtual.forEach(v=>{const n=v.executivo;if(n)mp[n]=(mp[n]||0)+Number(v.valor||0);});
          const rnk=Object.entries(mp).sort((a,b)=>b[1]-a[1]).map(([n,v])=>({n,v}));
          // Evolução — meses fixos exceto atual
          const totalAcum=d.filter(v=>v.status==="registrada").reduce((s,v)=>s+Number(v.valor||0),0);
          // Calcular por mês
          const fatPorMes={};
          d.filter(v=>v.status==="registrada").forEach(v=>{
            const dt=new Date(v.data_venda);
            const k=`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`;
            fatPorMes[k]=(fatPorMes[k]||0)+Number(v.valor||0);
          });
          const evo=[
            16336,
            26358,
            27034,
            17191,
            23000,
            fat,
          ];
          setMesStats({fat,trans,recorde,diasAtivos,showroom,whatsapp,tiktok,licenciados,rnk,evolucao:evo,total:167266.52});
          setLastUp(new Date().toLocaleTimeString("pt-BR",{timeZone:"America/Sao_Paulo",hour:"2-digit",minute:"2-digit"}));setLoading(false);}
      }catch(e){if(on)setLoading(false);}
    };
    load();
    const iv=setInterval(load,45000);
    return()=>{on=false;clearInterval(iv);};
  },[]);

  const hoje=hojeISO();
  const vHoje=vendas.filter(v=>v.data_venda===hoje&&(v.status==="registrada"||v.status==="confirmado"||v.status==="pendente_produtos"));
  const vSemana=()=>{const hoje=hojeISO();const dt=new Date(hoje+"T12:00:00");const diasDesdedom=dt.getDay();const domISO=new Date(dt-diasDesdedom*86400000).toISOString().slice(0,10);return vendas.filter(v=>v.status==="registrada"&&v.data_venda>=domISO);};
  const vMes=()=>{const agr=new Date();const m=agr.getMonth();const a=agr.getFullYear();const ms=`${a}-${String(m+1).padStart(2,"0")}`;return vendas.filter(v=>v.status==="registrada"&&v.data_venda&&v.data_venda.startsWith(ms));};

  const getV=(t)=>t==="hoje"?vHoje:t==="semana"?vSemana():vMes();
  const ranking=(lista)=>{const mp={};EXECUTIVOS.forEach(e=>mp[e]=0);lista.forEach(v=>{if((v.tipo==="venda"||v.tipo==="tiktok"||v.tipo==="licenciado"||v.tipo==="whatsapp")&&v.executivo!=="Flavio"&&mp[v.executivo]!==undefined)mp[v.executivo]+=Number(v.valor||0);});return Object.entries(mp).sort((a,b)=>b[1]-a[1]);};
  const canais=(lista)=>({
    showroom:lista.filter(v=>v.tipo==="venda"&&v.status==="registrada").reduce((s,v)=>s+Number(v.valor||0),0),
    whatsapp:lista.filter(v=>v.tipo==="whatsapp"&&v.status==="registrada").reduce((s,v)=>s+Number(v.valor||0),0),
    tiktok:lista.filter(v=>v.tipo==="tiktok"&&v.status==="registrada").reduce((s,v)=>s+Number(v.valor||0),0),
    licenciados:lista.filter(v=>v.tipo==="licenciado"&&v.status==="registrada").reduce((s,v)=>s+Number(v.valor||0),0),
  });

  const lista=getV(tab==="hoje"||tab==="semana"?tab:"hoje");
  const rnk=ranking(lista);
  const can=canais(lista);
  const total=Object.values(can).reduce((a,b)=>a+b,0);
  const maxV=rnk[0]?.[1]||1;

  // Abril fixo
  const rnkAbril=[{n:"Ribeiro",v:8800},{n:"Iara",v:6160},{n:"Elenice",v:5800},{n:"Paulo",v:3000},{n:"Eloah",v:2100},{n:"Laís",v:1400},{n:"Caio",v:700},{n:"Diana",v:350}];
  const maxAbril=8800;

  const TABS=[
    {k:"hoje",    l:"HOJE",        tipo:"nexus"},
    {k:"semana",  l:"SEMANA",      tipo:"nexus"},
    {k:"meses",   l:"📅 MESES",    tipo:"abril"},
    {k:"historia",l:"📖 HISTÓRIA", tipo:"axios"},
    {k:"dna",     l:"⚡ DNA",      tipo:"axios"},
  ];

  return(
    <>
      <style>{G}</style>
      {modal && <XModal nome={modal} onClose={()=>setModal(null)}/>}

      <div className="shell">
        {/* NAV */}
        {shareOpen && <ShareModal onClose={()=>setShareOpen(false)}/>}
        <nav className="nav">
          <div className="nav-inner">
            {/* Linha 1: Logo + status + dias */}
            <div className="nav-top">
              <a className="nav-logo" href="#">
                <img src={NEXUS_LOGO} style={{height:32,width:"auto",objectFit:"contain",filter:"drop-shadow(0 0 8px rgba(0,212,255,.3))"}} alt="NEXUS"/>
                <div>
                  <div className="orb" style={{fontSize:14,fontWeight:900,background:"linear-gradient(135deg,#00d4ff,#8b5cf6)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",letterSpacing:2}}>NEXUS</div>
                  <div style={{fontSize:7,color:"#3a3a5a",letterSpacing:2,fontFamily:"'Sora',sans-serif"}}>LEILÃO NOZAP · X-EOS</div>
                </div>
              </a>
              <div style={{display:"flex",alignItems:"center",gap:5,marginLeft:12}}>
                <LiveDot/>
                <span style={{fontSize:9,color:"#00d4ff",fontFamily:"'Orbitron',monospace",letterSpacing:1.5,fontWeight:700}}>AO VIVO</span>
                {lastUp&&<span style={{fontSize:9,color:"#2a2a4a",fontFamily:"'Sora',sans-serif"}}>{lastUp}</span>}
              </div>
              <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
                <div style={{fontSize:9,color:"#2a2a4a",fontFamily:"'Orbitron',monospace",letterSpacing:1}}>{diasOp}d</div>
                <button onClick={()=>setShareOpen(true)} style={{
                  background:"linear-gradient(135deg,#00d4ff22,#8b5cf622)",
                  border:"1px solid rgba(0,212,255,.3)",
                  borderRadius:8,padding:"5px 10px",cursor:"pointer",
                  display:"flex",alignItems:"center",gap:4,
                  color:"#00d4ff",fontSize:10,fontWeight:700,
                  fontFamily:"'Orbitron',monospace",letterSpacing:1
                }}>
                  <span style={{fontSize:12}}>↗</span> SHARE
                </button>
              </div>
            </div>
            {/* Linha 2: Tabs — scroll horizontal, nunca quebra */}
            <div className="nav-tabs-wrap">
              <div className="nav-tabs">
                {TABS.map(t=>{
                  const isOn=tab===t.k;
                  const col=isOn?"#0a0010":t.tipo==="nexus"?"#4a8aaa":t.tipo==="abril"?"#8a6a2a":"#8a6aaa";
                  const bord=isOn?"none":t.tipo==="nexus"?"1px solid rgba(0,212,255,.18)":t.tipo==="abril"?"1px solid rgba(245,166,35,.18)":"1px solid rgba(167,139,250,.18)";
                  return (
                    <button key={t.k} className={"tab "+(isOn?"tab-on":"tab-off")}
                      style={{background:isOn?"linear-gradient(135deg,#f5a623,#a78bfa)":"transparent",
                        color:col,border:bord,
                        boxShadow:isOn?"0 2px 10px rgba(0,0,0,.4)":"none"}}
                      onClick={()=>setTab(t.k)}>{t.l}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </nav>

        <div className="inner" style={{paddingTop:16}}>

          {/* ══ HOJE / SEMANA / MÊS ══ */}
          {(tab==="hoje"||tab==="semana") && (
            <div className="fa">
              {/* Hero total */}
              <div style={{marginBottom:24,padding:"clamp(20px,4vw,36px) clamp(16px,4vw,36px) clamp(18px,3vw,32px)",background:"rgba(255,255,255,.02)",
                border:"1px solid rgba(255,255,255,.06)",borderRadius:14,position:"relative",overflow:"hidden"}}>
                {/* Luz varrendo */}
                <div style={{position:"absolute",top:0,bottom:0,width:"40%",
                  background:"linear-gradient(90deg,transparent,rgba(255,255,255,.03),transparent)",
                  animation:"sweep-slow 5s linear infinite",pointerEvents:"none"}}/>
                <div style={{position:"relative",zIndex:1}}>
                  <div style={{fontSize:9,color:"rgba(255,255,255,.2)",letterSpacing:3,marginBottom:12,
                    fontFamily:"'Inter',sans-serif",fontWeight:600,textTransform:"uppercase"}}>
                    {tab==="hoje"?"Total do Dia":"Total da Semana"}
                  </div>
                  <div style={{fontSize:"clamp(28px,7vw,48px)",fontWeight:800,color:"#ffffff",fontFamily:"'Inter',sans-serif",
                    letterSpacing:-1,marginBottom:8,lineHeight:1}}>
                    {loading?"—":fmt(total)}
                  </div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,.2)",fontFamily:"'Inter',sans-serif"}}>
                    {lista.length} vendas registradas
                  </div>
                </div>
              </div>

              {/* Canais */}
              <div className="canal-grid">
                <CanalCard label="Showroom" val={can.showroom} color="#00ff88"/>
                <CanalCard label="WhatsApp" val={can.whatsapp} color="#00d4ff"/>
                <CanalCard label="TikTok Shop" val={can.tiktok} color="#ec4899"/>
                <CanalCard label="Licenciados" val={can.licenciados} color="#a78bfa"/>
              </div>

              {/* Ranking */}
              <div style={{background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.06)",
                borderRadius:14,padding:"24px",marginBottom:28}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                  <div style={{fontSize:9,color:"rgba(255,255,255,.2)",letterSpacing:3,
                    fontFamily:"'Inter',sans-serif",fontWeight:600,textTransform:"uppercase"}}>Ranking Executivos</div>
                </div>
                {loading ? (
                  <div style={{textAlign:"center",color:"#2a2a4a",padding:32,fontFamily:"'Sora',sans-serif"}}>Carregando dados...</div>
                ):(
                  <table className="rank-table">
                    <tbody>
                      {rnk.map(([nome,val],i)=><BarRow key={nome} nome={nome} val={val} idx={i} maxVal={maxV}/>)}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ══ ABRIL ══ */}
          {tab==="meses" && (
            <div className="fa">
              {/* Seletor de mês */}
              <div style={{display:"flex",gap:8,marginBottom:28,alignItems:"center"}}>
                <div style={{fontSize:9,color:"rgba(255,255,255,.2)",letterSpacing:3,
                  fontFamily:"'Inter',sans-serif",fontWeight:600,textTransform:"uppercase",
                  marginRight:8}}>Mês</div>
                {[{k:"abr26",l:"Abril 2026",active:true}].map(m=>(
                  <div key={m.k} style={{
                    padding:"6px 14px",borderRadius:20,cursor:"pointer",
                    background: m.active ? "rgba(245,166,35,.12)" : "rgba(255,255,255,.03)",
                    border: m.active ? "1px solid rgba(245,166,35,.3)" : "1px solid rgba(255,255,255,.06)",
                    fontSize:11,fontFamily:"'Inter',sans-serif",fontWeight:600,
                    color: m.active ? "#f5a623" : "rgba(255,255,255,.3)",
                    letterSpacing:.3
                  }}>{m.l}</div>
                ))}
                <div style={{padding:"6px 14px",borderRadius:20,
                  background:"rgba(255,255,255,.02)",border:"1px dashed rgba(255,255,255,.06)",
                  fontSize:11,fontFamily:"'Inter',sans-serif",
                  color:"rgba(255,255,255,.15)",letterSpacing:.3}}>Março 2026 — em breve</div>
              </div>

              {/* ABRIL HERO — mesmo conceito DNA */}
              <div style={{position:"relative",borderRadius:16,overflow:"hidden",
                marginBottom:24,border:"1px solid rgba(245,166,35,.15)"}}>
                {/* Imagem dominante */}
                <img src={EXEC_HERO}
                  style={{width:"100%",height:"clamp(220px,58vw,420px)",objectFit:"cover",
                    objectPosition:"center 20%",display:"block",
                    filter:"brightness(.72) contrast(1.08) saturate(.9)"}}
                />
                {/* Overlay bottom forte */}
                <div style={{position:"absolute",inset:0,
                  background:"linear-gradient(to bottom,rgba(0,2,12,0) 30%,rgba(0,2,12,.96) 100%)"}}/>
                {/* Label topo */}
                <div style={{position:"absolute",top:14,left:16,
                  fontSize:8,color:"rgba(245,166,35,.6)",fontFamily:"'Orbitron',monospace",letterSpacing:3}}>
                  ABRIL · 2026 · O ROMPIMENTO REAL
                </div>
                {/* Texto no rodapé — limpo e legível */}
                <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"0 18px 20px"}}>
                  <div style={{fontSize:"clamp(26px,7vw,50px)",fontWeight:800,color:"#ffffff",
                    fontFamily:"'Inter',sans-serif",letterSpacing:-1,lineHeight:1.05,marginBottom:8}}>
                    O mês que<br/>o sistema<br/>se provou.
                  </div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,.5)",fontFamily:"'Inter',sans-serif",
                    lineHeight:1.7,marginBottom:12}}>
                    De R$ 0 a R$ 47.131 em abril. Novo recorde histórico.<br/>
                    Executivos. Sistema. Resultado.
                  </div>
                  <div style={{width:28,height:2,background:"linear-gradient(90deg,#f5a623,#a78bfa)",borderRadius:2}}/>
                </div>
                {/* Linha dourada bottom */}
                <div style={{position:"absolute",bottom:0,left:0,right:0,height:2,
                  background:"linear-gradient(90deg,transparent,rgba(245,166,35,.5),transparent)"}}/>
              </div>

              {/* Stats */}
              <div className="stat-grid" style={{marginBottom:16}}>
                <StatCard label="Faturamento" value={`R$ ${mesStats.fat.toLocaleString("pt-BR",{minimumFractionDigits:0,maximumFractionDigits:0})}`} color="#00ff88" sub="total do mês"/>
                <StatCard label="Transações" value={String(mesStats.trans)} color="#00d4ff" sub="vendas registradas"/>
                <StatCard label="Recorde Diário" value={`R$ ${mesStats.recorde.toLocaleString("pt-BR",{minimumFractionDigits:0,maximumFractionDigits:0})}`} color="#f5a623" sub="maior dia"/>
                <StatCard label="Dias Ativos" value={String(mesStats.diasAtivos)} color="#a78bfa" sub="com vendas"/>
              </div>

              {/* Canais — ABRIL */}
              <div className="canal-grid" style={{marginBottom:16}}>
                {[
                  {label:"Showroom",     val:`R$ ${mesStats.showroom.toLocaleString("pt-BR",{minimumFractionDigits:0,maximumFractionDigits:0})}`,col:"#00ff88",  sub:"físico · Recreio"},
                  {label:"WhatsApp",     val:`R$ ${mesStats.whatsapp.toLocaleString("pt-BR",{minimumFractionDigits:0,maximumFractionDigits:0})}`, col:"#00d4ff",  sub:"canal digital"},
                  {label:"TikTok Shop",  val:`R$ ${mesStats.tiktok.toLocaleString("pt-BR",{minimumFractionDigits:0,maximumFractionDigits:0})}`, col:"#ec4899",  sub:"lançado em 16/04"},
                  {label:"Licenciados",  val:`R$ ${mesStats.licenciados.toLocaleString("pt-BR",{minimumFractionDigits:0,maximumFractionDigits:0})}`, col:"#a78bfa",  sub:"rede parceira"},
                ].map(c=>(
                  <div key={c.label} className="card" style={{padding:"20px 18px",borderLeft:`2px solid ${c.col}22`}}>
                    <div style={{fontSize:9,color:"rgba(255,255,255,.28)",letterSpacing:2,
                      fontFamily:"'Sora',sans-serif",marginBottom:10,textTransform:"uppercase",fontWeight:600}}>{c.label}</div>
                    <div style={{fontSize:20,fontWeight:700,color:c.col,fontFamily:"'Sora',sans-serif",
                      letterSpacing:-.3,marginBottom:4}}>{c.val}</div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,.2)",fontFamily:"'Sora',sans-serif"}}>{c.sub}</div>
                  </div>
                ))}
              </div>

              {/* Ranking + Evolução — bloco unificado */}
              <div className="unified-block" style={{marginBottom:28}}>
                {/* Ranking — esquerda */}
                <div className="unified-left">
                  <div style={{fontSize:9,color:"rgba(255,255,255,.2)",letterSpacing:3,marginBottom:24,
                    fontFamily:"'Inter',sans-serif",fontWeight:600,textTransform:"uppercase"}}>Ranking · Abril 2026</div>
                  <table className="rank-table">
                    <tbody>
                      {(mesStats.rnk.length>0?mesStats.rnk:rnkAbril).map(({n,v},i)=><BarRow key={n} nome={n} val={v} idx={i} maxVal={(mesStats.rnk.length>0?mesStats.rnk:rnkAbril)[0]?.v||1}/>)}
                    </tbody>
                  </table>
                </div>
                {/* Evolução — direita */}
                <div className="unified-right">
                  <div style={{fontSize:9,color:"rgba(255,255,255,.2)",letterSpacing:3,marginBottom:28,
                    fontFamily:"'Inter',sans-serif",fontWeight:600,textTransform:"uppercase"}}>Evolução · 6 Meses</div>
                  {[
                    {m:"Nov/25",c:"#f97316"},
                    {m:"Dez/25",c:"#f5a623"},
                    {m:"Jan/26",c:"#ef4444"},
                    {m:"Fev/26",c:"#8b5cf6"},
                    {m:"Mar/26",c:"#00d4ff"},
                    {m:"Abr/26",c:"rgba(255,255,255,.85)"},
                  ].map((x,i)=>({...x,v:mesStats.evolucao[i]||0})).map((x,i)=>(
                    <div key={i} style={{marginBottom:20}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                        <span style={{fontSize:11,color:"rgba(255,255,255,.28)",fontFamily:"'Inter',sans-serif",
                          fontWeight:500}}>{x.m}</span>
                        <span style={{fontSize:12,color:"rgba(255,255,255,.65)",fontWeight:600,
                          fontFamily:"'Inter',sans-serif",letterSpacing:-.3}}>R$ {x.v.toLocaleString("pt-BR")}</span>
                      </div>
                      <div style={{height:2,background:"rgba(255,255,255,.05)",borderRadius:2,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${(x.v/Math.max(...mesStats.evolucao,1))*100}%`,
                          background:`linear-gradient(90deg,${x.c},${x.c}55)`,
                          borderRadius:2,transition:"width 1.4s cubic-bezier(.4,0,.2,1)"}}/>
                      </div>
                    </div>
                  ))}
                  <div style={{marginTop:28,paddingTop:20,borderTop:"1px solid rgba(255,255,255,.05)",
                    display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:9,color:"rgba(255,255,255,.2)",fontFamily:"'Inter',sans-serif",
                      letterSpacing:2,textTransform:"uppercase"}}>Total acumulado</span>
                    <span style={{fontSize:18,fontWeight:700,color:"#ffffff",fontFamily:"'Inter',sans-serif",
                      letterSpacing:-1}}>{`R$ ${mesStats.total.toLocaleString("pt-BR",{minimumFractionDigits:0,maximumFractionDigits:0})}`}</span>
                  </div>
                  <div style={{marginTop:8,fontSize:9,color:"rgba(245,166,35,0.6)",fontFamily:"'Inter',sans-serif",letterSpacing:1,textAlign:"right"}}>
                  </div>
                </div>
              </div>

              {/* Marcos */}
              <div style={{background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.06)",
                borderRadius:14,padding:"28px"}}>
                <div style={{fontSize:9,color:"rgba(255,255,255,.2)",letterSpacing:3,marginBottom:20,
                  fontFamily:"'Inter',sans-serif",fontWeight:600,textTransform:"uppercase"}}>Marcos de Abril</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
                  {[
                    {d:"07/04",v:"R$ 6.303",t:"Queima de Estoque",desc:"Iara: iPhone 16e R$3.297. Elenice: 18 taças + kits.",c:"#f97316"},
                    {d:"15/04",v:"R$ 8.044",t:"Recorde Histórico",desc:"Ribeiro R$4.780 | Elenice R$2.416 | Paulo R$633 | Iara R$215",c:"#f5a623"},
                    {d:"16/04",v:"TikTok Shop",t:"Novo Canal",desc:"Laís cria sem pedir permissão. COO que age.",c:"#ec4899"},
                    {d:"17/04",v:"R$ 1.205",t:"Virada Elenice",desc:"23h27. Ribeiro na frente. Elenice vira. Recorde.",c:"#a78bfa"},
                    {d:"19/04",v:"R$ 2.999",t:"Ribeiro no Domingo",desc:"JBL vendido. Doente. A missão não para.",c:"#00d4ff"},
                    {d:"21/04",v:"NEXUS",t:"Sistema Automatizado",desc:"Primeiro ranking automático: 7h e 22h.",c:"#22c55e"},
                  ].map((m,i)=>(
                    <div key={i} style={{padding:"16px 18px",
                      background:"rgba(255,255,255,.02)",
                      border:"1px solid rgba(255,255,255,.05)",
                      borderRadius:10,borderLeft:`2px solid ${m.c}66`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                        <span style={{fontSize:9,color:"rgba(255,255,255,.25)",fontFamily:"'Inter',sans-serif",
                          fontWeight:500,letterSpacing:.5}}>{m.d}</span>
                        <span style={{fontSize:11,color:m.c,fontWeight:600,fontFamily:"'Inter',sans-serif"}}>{m.v}</span>
                      </div>
                      <div style={{fontSize:13,fontWeight:600,color:"#e8e8f0",fontFamily:"'Inter',sans-serif",
                        marginBottom:5,letterSpacing:-.2}}>{m.t}</div>
                      <div style={{fontSize:11,color:"rgba(255,255,255,.28)",fontFamily:"'Inter',sans-serif",
                        lineHeight:1.6}}>{m.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══ HISTÓRIA ══ */}
          {tab==="historia" && (
            <div className="fa">
              {/* Xavier Hero — só imagem, sem textos */}
              <div style={{marginBottom:28,borderRadius:20,overflow:"hidden",border:"1px solid rgba(245,166,35,.12)",position:"relative"}}>
                <img
                  src="https://media.base44.com/images/public/69e618c1927ab5696bf98c08/759ef4c49_generated_image.png"
                  alt="Professor Xavier"
                  style={{width:"100%",height:480,objectFit:"cover",objectPosition:"center 20%",
                    display:"block",filter:"brightness(.95) contrast(1.05) saturate(.98)"}}
                />
                {/* linha dourada bottom */}
                <div style={{position:"absolute",bottom:0,left:0,right:0,height:"2px",
                  background:"linear-gradient(90deg,transparent,rgba(245,166,35,.5),rgba(167,139,250,.4),transparent)"}}/>
              </div>

              {/* X-EOS Quote */}
              <div style={{marginBottom:28,padding:"28px 32px",background:"linear-gradient(145deg,#080818,#0f0f28)",border:"1px solid rgba(245,166,35,.2)",borderRadius:20,textAlign:"center",position:"relative",overflow:"hidden"}}>
                <img src={NEXUS_LOGO} className="wm" style={{width:160,top:"50%",left:"50%",transform:"translate(-50%,-50%)",opacity:.04}}/>
                <div style={{fontSize:11,color:"#f5a623",letterSpacing:3,marginBottom:16,fontFamily:"'Orbitron',monospace"}}>X-EOS · ESTRUTURA DE OPERAÇÕES E EXPANSÃO</div>
                <div style={{fontSize:16,color:"#C1BECA",fontFamily:"'Sora',sans-serif",lineHeight:2,fontStyle:"italic",marginBottom:16}}>
                  "Dois anos desenvolvendo o que você vê hoje.<br/>
                  Não foi da noite pro dia.<br/>
                  Foi construído tijolo por tijolo,<br/>
                  esporrada por esporrada, venda por venda.<br/><br/>
                  <strong style={{color:"#F4F4F4",fontStyle:"normal"}}>Você faz parte disso. Sua história está aqui.</strong>"
                </div>
                <div style={{fontSize:11,color:"#f5a623",fontFamily:"'Orbitron',monospace",letterSpacing:2}}>— LUIZ SANT'ANNA, CEO</div>
              </div>

              {/* Ecossistema */}
              <div style={{marginBottom:28}}>
                <div style={{fontSize:9,color:"rgba(255,255,255,.25)",letterSpacing:3,marginBottom:16,fontFamily:"'Sora',sans-serif",fontWeight:600,textTransform:"uppercase"}}>O Ecossistema</div>
                <div className="stat-grid">
                  <StatCard label="Investimento" value="R$ 2M+" color="#00ff88" sub="capital alocado"/>
                  <StatCard label="Histórico" value="R$ 1M+" color="#00d4ff" sub="faturamento acumulado"/>
                  <StatCard label="Licenciados" value="70+" color="#a78bfa" sub="rede parceira"/>
                  <StatCard label="Executivos" value="13" color="#f5a623" sub="mentalidade formada"/>
                  <StatCard label="Showroom" value="Hotel Atlântico Sul" color="#e8e8f0" sub="Recreio — RJ"/>
                  <StatCard label="Aplicativo" value="99% concluído" color="#ec4899" sub="pré-lançamento"/>
                </div>
              </div>

              {/* ── PILARES DA MENTALIDADE ── */}
              <div style={{marginBottom:28}}>
                {/* Hero Mentalidade */}
                <div style={{position:"relative",borderRadius:"16px 16px 0 0",overflow:"hidden",marginBottom:0}}>
                  <img src={MENTALIDADE_IMG} alt="Mentalidade do Executivo"
                    style={{width:"100%",height:220,objectFit:"cover",objectPosition:"center 40%",
                      filter:"brightness(.55) saturate(.8)"}}/>
                  <div style={{position:"absolute",inset:0,
                    background:"linear-gradient(to bottom,rgba(0,0,0,.2) 0%,rgba(8,8,24,.97) 100%)"}}/>
                  <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",
                    alignItems:"center",justifyContent:"center",gap:8}}>
                    <div style={{fontSize:9,color:"rgba(167,139,250,.6)",letterSpacing:5,
                      fontFamily:"'Orbitron',monospace"}}>X-EOS · SISTEMA</div>
                    <div style={{fontSize:28,fontWeight:900,color:"#F4F4F4",
                      fontFamily:"'Orbitron',monospace",letterSpacing:1,textAlign:"center",
                      textShadow:"0 2px 20px rgba(0,0,0,.8)"}}>OS 6 PILARES</div>
                    <div style={{fontSize:13,color:"rgba(255,255,255,.5)",
                      fontFamily:"'Sora',sans-serif"}}>da Mentalidade do Executivo</div>
                  </div>
                  <div style={{position:"absolute",bottom:0,left:0,right:0,height:"2px",
                    background:"linear-gradient(90deg,transparent,#a78bfa,#f5a623,transparent)"}}/>
                </div>

                {/* Cards dos pilares */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:0,
                  border:"1px solid rgba(255,255,255,.05)",borderTop:"none",borderRadius:"0 0 12px 12px",overflow:"hidden"}}>
                  {PILARES.map((p,i)=>(
                    <PilarCard key={i} p={p} i={i}/>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              <div style={{marginBottom:28}}>
                <div className="orb" style={{fontSize:10,color:"#4a4a6a",letterSpacing:2.5,marginBottom:16}}>📅 A LINHA DO TEMPO — PRÓLOGO + 6 CAPÍTULOS</div>
                {HISTORIA.map((h,i)=>(
                  <CapCard key={i} cap={h} onOpen={()=>setLivroAberto(h)}/>
                ))}
              </div>

              {/* Fundadores */}
              <div className="card" style={{padding:"28px"}}>
                <div style={{display:"flex",gap:20,alignItems:"flex-start",marginBottom:20}}>
                  <img src={PROF_XAVIER_CHAIR} style={{width:80,height:110,objectFit:"cover",objectPosition:"center top",borderRadius:12,filter:"grayscale(20%) contrast(1.1)",flexShrink:0}} alt="Xavier"/>
                  <div>
                    <div className="orb" style={{fontSize:10,color:"#f5a623",letterSpacing:2,marginBottom:8}}>🏅 ESTIVERAM AQUI DESDE O DIA ZERO</div>
                    <div style={{fontSize:13,color:"#C1BECA",lineHeight:1.7,fontFamily:"'Sora',sans-serif",fontStyle:"italic"}}>"O sistema chamou. Eles estiveram aqui antes de existir ranking, sistema ou nome. Eles são a fundação."</div>
                  </div>
                </div>
                <FundadoresCarousel setModal={setModal} setTab={setTab} XMEN={XMEN} XMEN_IMG={XMEN_IMG}/>
              </div>
            </div>
          )}

          {/* ══ DNA ══ */}
          {tab==="dna" && (
            <div className="fa">

              {/* ── HERO XAVIER — IMAGEM LIMPA ── */}
              <div style={{borderRadius:16,overflow:"hidden",marginBottom:20,position:"relative",
                border:"1px solid rgba(245,166,35,.15)",cursor:"pointer"}}
                onClick={()=>setModal("Luiz")}>
                <img
                  src="https://media.base44.com/images/public/69e618c1927ab5696bf98c08/759ef4c49_generated_image.png"
                  alt="Professor Xavier"
                  style={{width:"100%",height:"clamp(220px,55vw,420px)",objectFit:"cover",
                    objectPosition:"center 18%",display:"block",
                    filter:"brightness(.88) contrast(1.05)"}}
                />
                {/* Overlay bottom para texto */}
                <div style={{position:"absolute",inset:0,
                  background:"linear-gradient(to bottom,rgba(0,2,12,0) 40%,rgba(0,2,12,.92) 100%)"}}/>
                {/* Label topo */}
                <div style={{position:"absolute",top:14,left:16,
                  fontSize:8,color:"rgba(245,166,35,.6)",fontFamily:"'Orbitron',monospace",letterSpacing:3}}>
                  O SISTEMA · X-EOS · PROFESSOR XAVIER
                </div>
                {/* Título + subtítulo no rodapé */}
                <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"0 18px 18px",
                  display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:12}}>
                  <div>
                    <div className="orb shimmer" style={{fontSize:"clamp(20px,5.5vw,34px)",fontWeight:900,
                      lineHeight:1.05,marginBottom:6}}>
                      QUAL É O<br/>SEU PODER?
                    </div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,.45)",fontFamily:"'Sora',sans-serif",lineHeight:1.5}}>
                      O sistema abraçou, treinou, revelou.
                    </div>
                  </div>
                  {/* Bloco 13/13/1 compacto */}
                  <div style={{background:"rgba(0,2,12,.85)",border:"1px solid rgba(255,255,255,.08)",
                    borderRadius:12,overflow:"hidden",backdropFilter:"blur(12px)",flexShrink:0}}>
                    {[{v:13,label:"EXEC",cor:"#f5a623"},{v:13,label:"POD",cor:"#a78bfa"},{v:1,label:"MIS",cor:"#00d4ff"}].map(({v,label,cor})=>(
                      <div key={label} style={{padding:"8px 14px",borderBottom:"1px solid rgba(255,255,255,.05)",
                        display:"flex",alignItems:"center",gap:10,lastChild:{borderBottom:"none"}}}>
                        <div style={{width:2,alignSelf:"stretch",background:cor,borderRadius:2,flexShrink:0}}/>
                        <div>
                          <div className="orb" style={{fontSize:18,fontWeight:900,color:cor,lineHeight:1}}>{v}</div>
                          <div style={{fontSize:7,color:"rgba(255,255,255,.3)",letterSpacing:1.5,fontFamily:"'Sora',sans-serif"}}>{label}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Linha dourada bottom */}
                <div style={{position:"absolute",bottom:0,left:0,right:0,height:2,
                  background:"linear-gradient(90deg,transparent,rgba(245,166,35,.5),transparent)"}}/>
              </div>

              {/* ── 4 DESTAQUES — 2 colunas ── */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:20}}>
                {[
                  {nome:"Ribeiro",xname:"CYCLOPS",cor:"#ef4444"},
                  {nome:"Iara",   xname:"JEAN GREY",cor:"#f97316"},
                  {nome:"Paulo",  xname:"WOLVERINE",cor:"#f59e0b"},
                  {nome:"Elenice",xname:"STORM",cor:"#a78bfa"},
                ].map((x)=>{
                  const img=XMEN_IMG[x.nome];
                  return(
                    <div key={x.nome} onClick={()=>setModal(x.nome)}
                      style={{position:"relative",height:"clamp(140px,35vw,200px)",overflow:"hidden",
                        cursor:"pointer",borderRadius:12,border:`1px solid ${x.cor}22`}}>
                      <img src={img} style={{width:"100%",height:"100%",objectFit:"cover",
                        objectPosition:"center 15%",display:"block",filter:"brightness(.75) saturate(1.1)"}}/>
                      <div style={{position:"absolute",inset:0,
                        background:`linear-gradient(to bottom,transparent 35%,rgba(0,2,12,.9) 100%)`}}/>
                      <div style={{position:"absolute",bottom:10,left:12}}>
                        <div style={{fontSize:7,color:x.cor,fontFamily:"'Orbitron',monospace",
                          letterSpacing:2,marginBottom:2}}>{x.xname}</div>
                        <div style={{fontSize:13,fontWeight:700,color:"#F4F4F4",
                          fontFamily:"'Sora',sans-serif"}}>{x.nome}</div>
                      </div>
                      <div style={{position:"absolute",bottom:0,left:0,right:0,height:2,
                        background:`linear-gradient(90deg,transparent,${x.cor}88,transparent)`}}/>
                    </div>
                  );
                })}
              </div>

              {/* ── TODOS OS X-MEN — 2 colunas, sem texto em cima ── */}
              <div style={{fontSize:9,color:"rgba(255,255,255,.2)",letterSpacing:3,
                textAlign:"center",marginBottom:14,fontFamily:"'Orbitron',monospace"}}>
                TODOS OS X-MEN — LEILÃO NOZAP
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {Object.keys(XMEN).map(nome=>{
                  const xm=XMEN[nome];
                  const img=XMEN_IMG[nome];
                  return(
                    <div key={nome} onClick={()=>setModal(nome)}
                      style={{position:"relative",height:"clamp(160px,40vw,220px)",overflow:"hidden",
                        cursor:"pointer",borderRadius:12,border:`1px solid ${xm.cor}18`}}>
                      {img
                        ? <img src={img} style={{width:"100%",height:"100%",objectFit:"cover",
                            objectPosition:"center 15%",display:"block",filter:"brightness(.8) saturate(1.1)"}}/>
                        : <div style={{width:"100%",height:"100%",background:`linear-gradient(135deg,${xm.corBg},#00020C)`}}/>
                      }
                      <div style={{position:"absolute",inset:0,
                        background:`linear-gradient(to bottom,transparent 40%,rgba(0,2,12,.92) 100%)`}}/>
                      <div style={{position:"absolute",bottom:10,left:12}}>
                        <div style={{fontSize:7,color:xm.cor,fontFamily:"'Orbitron',monospace",
                          letterSpacing:2,marginBottom:2}}>{xm.xname}</div>
                        <div style={{fontSize:14,fontWeight:700,color:"#F4F4F4",
                          fontFamily:"'Sora',sans-serif"}}>{nome}</div>
                      </div>
                      <div style={{position:"absolute",bottom:0,left:0,right:0,height:2,
                        background:`linear-gradient(90deg,transparent,${xm.cor}66,transparent)`}}/>
                    </div>
                  );
                })}
              </div>

              {/* Rodapé X-EOS */}
              <div style={{marginTop:24,padding:"20px",textAlign:"center"}}>
                <div style={{position:"absolute",top:0,left:"20%",right:"20%",height:1,
                  background:"linear-gradient(90deg,transparent,rgba(245,166,35,.2),transparent)"}}/>
                <div className="orb" style={{fontSize:9,color:"rgba(245,166,35,.6)",letterSpacing:3,marginBottom:8}}>
                  X-EOS · ESTRUTURA DE OPERAÇÕES E EXPANSÃO
                </div>
                <div style={{fontSize:12,color:"rgba(255,255,255,.3)",fontFamily:"'Sora',sans-serif",
                  lineHeight:1.8,fontStyle:"italic",maxWidth:420,margin:"0 auto"}}>
                  "A união formada pelo X — posicionamento na vida e nos negócios não se faz sozinho."
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
      {livroAberto && <LivroModal cap={livroAberto} onClose={()=>setLivroAberto(null)}/>}
    </>
  );
}
// ── PILAR CARD com tooltip hover ──
function PilarCard({p,i}){
  const [hover,setHover] = useState(false);
  const cores = ["#00d4ff","#f5a623","#a78bfa","#ec4899","#f97316","#00ff88"];
  const cor = p.cor || cores[i%6];
  const isOdd = i%2!==0;
  return(
    <div
      onMouseEnter={()=>setHover(true)}
      onMouseLeave={()=>setHover(false)}
      style={{position:"relative",padding:"22px 24px",cursor:"pointer",overflow:"hidden",
        background: hover ? `rgba(255,255,255,.04)` : "rgba(255,255,255,.015)",
        borderRight: i%2===0 && i<5 ? "1px solid rgba(255,255,255,.04)" : "none",
        borderBottom: i<4 ? "1px solid rgba(255,255,255,.04)" : "none",
        transition:"background .3s"
      }}
    >
      {/* Número fantasma */}
      <div style={{position:"absolute",right:16,top:12,fontSize:48,fontWeight:900,
        fontFamily:"'Orbitron',monospace",color:"rgba(255,255,255,.03)",lineHeight:1,
        userSelect:"none"}}>0{i+1}</div>

      {/* Linha cor esquerda */}
      <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,
        background:hover?cor:"rgba(255,255,255,.06)",transition:"background .3s",
        borderRadius:"0 2px 2px 0"}}/>

      {/* Ícone + Título */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:hover?10:8,paddingLeft:8}}>
        <div style={{fontSize:22,flexShrink:0,filter:hover?"drop-shadow(0 0 8px "+cor+"88)":"none",
          transition:"filter .3s"}}>{p.i}</div>
        <div style={{fontSize:10,color:hover?cor:"#6a6a8a",fontFamily:"'Orbitron',monospace",
          letterSpacing:1.5,fontWeight:700,lineHeight:1.4,transition:"color .3s"}}>{p.t}</div>
      </div>

      {/* Descrição curta — sempre visível */}
      <div style={{fontSize:12,color:"#7a7a9a",lineHeight:1.6,fontFamily:"'Sora',sans-serif",
        paddingLeft:8,marginBottom:hover?10:0,transition:"all .3s"}}>{p.d}</div>

      {/* Detalhe — aparece no hover com animação */}
      <div style={{
        maxHeight: hover?"200px":"0",
        opacity: hover?1:0,
        overflow:"hidden",
        transition:"max-height .35s ease, opacity .3s ease",
        paddingLeft:8
      }}>
        <div style={{height:"1px",background:`linear-gradient(90deg,${cor}44,transparent)`,marginBottom:10}}/>
        <div style={{fontSize:12.5,color:"#b0b0cc",lineHeight:1.8,fontFamily:"'Sora',sans-serif",
          fontStyle:"italic"}}>{p.detalhe}</div>
      </div>
    </div>
  );
}