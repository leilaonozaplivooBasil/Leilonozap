/**
 * 🗺️ O MAPA MENTAL — "simples e objetivo", palavras do dono.
 *
 * PEDIDO (áudio de 19/09/2026):
 *   "criar um mapa mental ali do lado, ligado ao quadro… onde eu esvazio a
 *    minha mente e dessa mente eu esvazio e transformo em tarefa"
 *
 * O mapa é uma ÁRVORE: um nó raiz e filhos pendurados. Cada nó pode virar
 * demanda — e daí seguir para o quadro pelo caminho que já existe em
 * `src/lib/demandas.js`. Aqui não se fala com banco nem com tela.
 *
 * 🔴 AS DUAS COISAS QUE PODEM DAR ERRADO, E ESTÃO TRAVADAS AQUI
 *
 * 1. CICLO. Arrastar um nó para dentro do próprio filho cria uma volta
 *    fechada — e quem percorrer a árvore roda para sempre, travando a aba.
 *    `podeVirarFilho` recusa antes de acontecer.
 *
 * 2. ÓRFÃO. Apagar um nó sem cuidar dos filhos deixa pedaços da mente
 *    invisíveis: continuam gravados, não aparecem em lugar nenhum. Apagar leva
 *    a galhada inteira, e a tela avisa quantos vão junto.
 */

/** Nó novo, pronto para entrar na árvore. */
export function noNovo({ texto = '', pai = null, x = 0, y = 0 } = {}) {
  return {
    id: `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    texto: String(texto || '').trim(),
    pai: pai || null,
    x: Number(x) || 0,
    y: Number(y) || 0,
  };
}

/** Os filhos diretos de um nó, na ordem em que estão. */
export function filhosDe(nos, paiId) {
  return (nos || []).filter((n) => n && (n.pai || null) === (paiId || null));
}

/** A raiz: o nó sem pai. Um mapa saudável tem exatamente uma. */
export function raizDe(nos) {
  return (nos || []).find((n) => n && !n.pai) || null;
}

/**
 * Todos os descendentes de um nó — filhos, netos, e por aí.
 *
 * Percorre com uma lista de visitados: se o mapa já estiver com ciclo (gravado
 * por uma versão antiga, ou editado na mão), a função PARA em vez de rodar
 * para sempre. Trava de aba é pior que mapa torto.
 */
export function descendentesDe(nos, id) {
  const vistos = new Set();
  const fila = [id];
  const saida = [];
  while (fila.length) {
    const atual = fila.shift();
    for (const f of filhosDe(nos, atual)) {
      if (vistos.has(f.id)) continue;
      vistos.add(f.id);
      saida.push(f);
      fila.push(f.id);
    }
  }
  return saida;
}

/**
 * 🔒 `no` pode passar a ser filho de `novoPai`?
 *
 * Recusa a volta fechada: um nó não pode virar filho de si mesmo nem de
 * nenhum descendente seu.
 */
export function podeVirarFilho(nos, noId, novoPaiId) {
  if (!noId) return { pode: false, motivo: 'sem_no' };
  if (noId === novoPaiId) return { pode: false, motivo: 'pai_de_si_mesmo' };
  if (!novoPaiId) return { pode: true, motivo: 'ok' };  // virar raiz é permitido
  const existe = (nos || []).some((n) => n?.id === novoPaiId);
  if (!existe) return { pode: false, motivo: 'pai_nao_existe' };
  const meus = descendentesDe(nos, noId).map((n) => n.id);
  if (meus.includes(novoPaiId)) return { pode: false, motivo: 'viraria_ciclo' };
  return { pode: true, motivo: 'ok' };
}

/** Move um nó de pai. Devolve a lista nova; devolve a MESMA quando não pode. */
export function moverNo(nos, noId, novoPaiId) {
  if (!podeVirarFilho(nos, noId, novoPaiId).pode) return nos || [];
  return (nos || []).map((n) => (n?.id === noId ? { ...n, pai: novoPaiId || null } : n));
}

/**
 * Apaga um nó E toda a galhada abaixo dele.
 *
 * Deixar os filhos para trás os tornaria invisíveis: continuariam na lista com
 * um `pai` que não existe mais, sem aparecer em lugar nenhum da tela.
 */
export function apagarNo(nos, noId) {
  const cair = new Set([noId, ...descendentesDe(nos, noId).map((n) => n.id)]);
  const ficam = (nos || []).filter((n) => n && !cair.has(n.id));
  // 🔗 22/09/2026 — quem apontava pro nó apagado fica com o id na lista de
  // ligações. `ligacoesDoMapa` já ignora ponta solta na hora de desenhar, mas
  // deixar o lixo no jsonb faz a ligação RESSUSCITAR se um dia um nó nascer
  // com o mesmo id. Limpa aqui, onde o nó some.
  return limparLigacoesOrfas(ficam);
}

/** Quantos somem junto se este nó for apagado — o número que a tela avisa. */
export function quantosCaemJunto(nos, noId) {
  return descendentesDe(nos, noId).length;
}

/**
 * O nó vira demanda. É a ponte que o dono pediu entre o mapa e o quadro.
 *
 * Nó sem texto não vira nada: seria uma linha em branco na caixa de entrada.
 */
export function demandaDoNo(no, { userId } = {}) {
  const titulo = String(no?.texto || '').trim();
  if (!titulo) return null;
  return {
    user_id: userId ?? null,
    titulo,
    origem: 'mapa',
    origem_ref: no?.id ?? null,
    estado: 'aberta',
    anotada_em: new Date().toISOString(),
  };
}

/** Renomeia. Texto vazio é recusado: nó sem texto não dá para achar de volta. */
export function renomearNo(nos, noId, texto) {
  const limpo = String(texto || '').trim();
  if (!limpo) return nos || [];
  return (nos || []).map((n) => (n?.id === noId ? { ...n, texto: limpo } : n));
}

/**
 * Tamanho do card na tela — só o CHUTE INICIAL, usado antes da primeira
 * medição.
 *
 * 🔴 22/09/2026 — a altura estava em 44 e o card mede 52 no navegador (medido,
 * não estimado). Dois estragos de um número só: a linha entre pai e filho
 * ancorava 5px acima do meio do card, e a régua do "não cobrir ninguém" achava
 * o card 8px menor do que ele é. Agora a tela MEDE cada card e passa as
 * medidas para cá; estes valores só valem no primeiro quadro, antes da medição
 * chegar.
 */
export const LARGURA_NO = 172;
export const ALTURA_NO = 52;
/** Respiro da borda do quadro. */
export const MARGEM = 24;

/**
 * A medida de um card: a que a tela mediu, ou o chute inicial.
 * Texto longo faz o card crescer, então altura fixa é sempre mentira.
 */
export function medidaDe(medidas, id) {
  const m = medidas?.[id];
  const largura = Number(m?.largura);
  const altura = Number(m?.altura);
  return {
    largura: Number.isFinite(largura) && largura > 0 ? largura : LARGURA_NO,
    altura: Number.isFinite(altura) && altura > 0 ? altura : ALTURA_NO,
  };
}

/**
 * O tamanho do CONTEÚDO do mapa — não o da janela que o mostra.
 *
 * 🔴 POR QUE ISTO EXISTE (22/09/2026)
 * O desenho das linhas ocupava a janela (`w-full h-full`), não o conteúdo.
 * Assim que o mapa passava do tamanho visível, as linhas eram cortadas: os
 * cards rolavam para dentro da vista e chegavam SEM LIGAÇÃO NENHUMA. Medido:
 * numa corrente de 5 níveis, conteúdo de 1352px numa área de 1051px — uma
 * linha inteira fora do desenho. Era o defeito que mais fazia o mapa parecer
 * quebrado, porque parecia perda de dado e não erro de desenho.
 */
export function caixaDoMapa(nos, medidas = {}) {
  let largura = 0;
  let altura = 0;
  for (const n of (nos || [])) {
    if (!n) continue;
    const m = medidaDe(medidas, n.id);
    largura = Math.max(largura, (Number(n.x) || 0) + m.largura);
    altura = Math.max(altura, (Number(n.y) || 0) + m.altura);
  }
  return { largura: largura + MARGEM, altura: altura + MARGEM };
}

/**
 * A curva que liga pai e filho, do lado certo de cada um.
 *
 * Sai pela borda mais perto do filho e entra pela borda mais perto do pai:
 * arrastar um filho para a ESQUERDA do pai deixava a reta antiga atravessar os
 * dois cards. Quando um está por cima do outro na horizontal, liga centro a
 * centro, que é o único traço que não cruza nada.
 */
export function ligacaoEntre(pai, filho, medidas = {}) {
  if (!pai || !filho) return null;
  const mp = medidaDe(medidas, pai.id);
  const mf = medidaDe(medidas, filho.id);
  const px = Number(pai.x) || 0; const py = Number(pai.y) || 0;
  const fx = Number(filho.x) || 0; const fy = Number(filho.y) || 0;
  const y1 = py + mp.altura / 2;
  const y2 = fy + mf.altura / 2;

  let x1; let x2;
  if (fx >= px + mp.largura) { x1 = px + mp.largura; x2 = fx; }
  else if (fx + mf.largura <= px) { x1 = px; x2 = fx + mf.largura; }
  else { x1 = px + mp.largura / 2; x2 = fx + mf.largura / 2; }

  const dir = x2 >= x1 ? 1 : -1;
  const curva = Math.max(16, Math.abs(x2 - x1) / 2);
  return { x1, y1, x2, y2, d: `M ${x1} ${y1} C ${x1 + curva * dir} ${y1}, ${x2 - curva * dir} ${y2}, ${x2} ${y2}` };
}

/**
 * Qual card está embaixo deste ponto — o último desenhado ganha, porque é o
 * que está por cima. `ignorar` tira o próprio nó arrastado e a galhada dele.
 */
export function noSob(nos, ponto, medidas = {}, ignorar = []) {
  const fora = new Set(ignorar);
  const lista = Array.isArray(nos) ? nos : [];
  const x = Number(ponto?.x); const y = Number(ponto?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  for (let i = lista.length - 1; i >= 0; i -= 1) {
    const n = lista[i];
    if (!n || fora.has(n.id)) continue;
    const m = medidaDe(medidas, n.id);
    const nx = Number(n.x) || 0; const ny = Number(n.y) || 0;
    if (x >= nx && x <= nx + m.largura && y >= ny && y <= ny + m.altura) return n;
  }
  return null;
}

/** Um irmão novo: mesmo pai do nó de referência. Enter cria isto. */
export function irmaoNovo(nos, noId) {
  const alvo = (nos || []).find((n) => n?.id === noId);
  if (!alvo) return null;
  // a raiz não tem irmão: um mapa com duas raízes tem metade invisível para
  // quem percorre a árvore a partir de uma só.
  if (!alvo.pai) return null;
  return noNovo({ pai: alvo.pai, ...lugarDoFilho(nos, alvo.pai) });
}

/**
 * 🧹 ARRUMAR O MAPA — o gesto que faltava.
 *
 * Empurra tudo para uma árvore limpa da esquerda para a direita: um nível por
 * coluna, irmãos empilhados, e cada pai centrado no bloco dos filhos.
 *
 * Sem isto, arrastar por meia hora deixa o mapa impossível de ler e não existe
 * volta — o que faz a pessoa evitar arrastar, e um mapa que ninguém reorganiza
 * não é mapa mental, é lista torta.
 *
 * Mapa com ciclo (gravado por versão antiga, ou editado na mão) não trava e
 * não perde nó: como cada nó tem UM pai só, uma volta fechada nunca é
 * alcançável a partir da raiz — os nós dela caem no laço do fim, que é
 * sequencial. O `vistos` é seguro extra contra lista com id repetido; tentei
 * prová-lo quebrando de propósito e não consegui, e por isso não finjo que ele
 * tem prova.
 */
export function arrumarMapa(nos, medidas = {}) {
  const lista = Array.isArray(nos) ? nos : [];
  const raiz = raizDe(lista);
  if (!raiz) return lista;

  const alturaDe = (id) => medidaDe(medidas, id).altura;
  const lugares = new Map();
  const vistos = new Set();
  let linha = MARGEM;

  /** Coloca o nó e devolve a altura do meio dele, para o pai se centrar. */
  const colocar = (id, nivel) => {
    if (vistos.has(id)) return null;
    vistos.add(id);
    const x = MARGEM + nivel * (LARGURA_NO + FOLGA_X);
    const filhos = filhosDe(lista, id);

    if (!filhos.length) {
      const y = linha;
      linha += alturaDe(id) + FOLGA_Y;
      lugares.set(id, { x, y });
      return y + alturaDe(id) / 2;
    }

    const meios = filhos.map((f) => colocar(f.id, nivel + 1)).filter((m) => m !== null);
    const centro = meios.length ? (Math.min(...meios) + Math.max(...meios)) / 2 : linha;
    lugares.set(id, { x, y: Math.max(MARGEM, centro - alturaDe(id) / 2) });
    return centro;
  };
  colocar(raiz.id, 0);

  // quem não foi alcançado (pai apontando para nó que não existe) desce para o
  // fim em vez de ficar onde estava, por cima de alguém.
  for (const n of lista) {
    if (!n || lugares.has(n.id)) continue;
    lugares.set(n.id, { x: MARGEM, y: linha });
    linha += alturaDe(n.id) + FOLGA_Y;
  }

  return lista.map((n) => (n && lugares.has(n.id) ? { ...n, ...lugares.get(n.id) } : n));
}
/** Respiro entre cards. */
const FOLGA_X = 56;
const FOLGA_Y = 18;

/**
 * Dois cards se cobrem?
 *
 * Aceita as medidas de verdade: com altura fixa de 44 num card de 52, a régua
 * achava que cabia onde não cabe. Um card sem medida cai no chute inicial.
 */
export function seSobrepoem(a, b, medidas = {}) {
  if (!a || !b) return false;
  const ma = medidaDe(medidas, a.id);
  const mb = medidaDe(medidas, b.id);
  return (
    a.x < b.x + mb.largura && a.x + ma.largura > b.x
    && a.y < b.y + mb.altura && a.y + ma.altura > b.y
  );
}

/**
 * Onde pendurar um filho novo sem cobrir ninguém.
 *
 * 🔴 POR QUE ISTO EXISTE (21/09/2026)
 * A primeira versão punha o filho em `pai.x + largura + folga`, descendo pelo
 * número de irmãos. Funciona para UM ramo — e quebra assim que dois ramos
 * crescem: o filho de um pai cai exatamente em cima do filho de outro, e o de
 * baixo some da vista. Apareceu no primeiro print com o mapa cheio.
 *
 * Agora o lugar é à direita do pai e, se estiver ocupado, DESCE até achar vaga.
 * Simples, previsível, e nunca esconde nada.
 */
export function lugarDoFilho(nos, paiId, medidas = {}) {
  const pai = (nos || []).find((n) => n?.id === paiId);
  const x = (pai?.x || 0) + medidaDe(medidas, paiId).largura + FOLGA_X;
  let y = pai?.y || 0;
  // Desce de um card por vez até a vaga estar livre. O teto evita laço infinito
  // se a tela estiver impossível — melhor empilhar que travar a aba.
  for (let tentativa = 0; tentativa < 60; tentativa += 1) {
    const candidato = { x, y };
    const ocupado = (nos || []).some((n) => n && n.id !== paiId && seSobrepoem(candidato, n, medidas));
    if (!ocupado) return candidato;
    y += ALTURA_NO + FOLGA_Y;
  }
  return { x, y };
}

// ── 🌱 A DEMANDA QUE VIRA NÓ DO MAPA (22/09/2026) ──────────────────────────
//
// Dono (áudio de 19/09, 10h32), listando o que dá pra fazer com uma demanda:
//   "dali eu transformo em ou mapa mental, PARA ABRIR O MAPA MENTAL, ou no
//    quadro, que aí automaticamente já entra na lista e na jornada."
//
// É o caminho de volta do ✈: a anotação que ainda não é tarefa — porque ainda
// não está pensada — vai pro mapa pra ser explodida em partes.
//
// 🔴 A demanda NÃO sai da caixa ao virar nó, e é de propósito: o mapa é o
// desenho do pensamento, não um destino. Ela vira trabalho quando virar tarefa
// ou cartão, não quando alguém resolve pensar nela.

/** Mesma normalização da trava do ✈: acento e caixa não fazem item novo. */
const mesmoTexto = (a, b) => String(a || '').trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  === String(b || '').trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Põe `texto` no mapa, pendurado na raiz, e diz qual nó é ele.
 *
 * Se já existir um nó com esse texto, NÃO cria outro: devolve o que já está
 * lá. Mandar a mesma demanda pro mapa duas vezes é gesto esperado — o botão
 * continua na caixa —, e duplicar encheria o mapa de cópias do mesmo
 * pensamento, que é justamente o que um mapa mental não pode ter.
 *
 * @returns {{nos: object[], id: string|null, novo: boolean}}
 */
export function semearNoMapa(nos, texto) {
  const lista = Array.isArray(nos) ? nos : [];
  const limpo = String(texto || '').trim();
  if (!limpo) return { nos: lista, id: null, novo: false };

  const jaTem = lista.find((n) => n && mesmoTexto(n.texto, limpo));
  if (jaTem) return { nos: lista, id: jaTem.id, novo: false };

  // Sem raiz ainda (mapa vazio), o nó vira a própria raiz — senão ele nasceria
  // solto, sem pai e sem lugar, que é o estado que `apagarNo` chama de órfão.
  const raiz = raizDe(lista);
  const novo = raiz
    ? noNovo({ texto: limpo, pai: raiz.id, ...lugarDoFilho(lista, raiz.id) })
    : noNovo({ texto: limpo, x: 40, y: 140 });
  return { nos: [...lista, novo], id: novo.id, novo: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔗 LIGAÇÕES LIVRES — o nó que aponta pra outro fora da árvore (22/09/2026)
// ═══════════════════════════════════════════════════════════════════════════
//
// Pedido do Ávilla: "é preciso opção de ligar um no outro no mapa mental".
//
// O mapa era uma ÁRVORE PURA: cada nó tem um pai, e a única linha que existia
// era pai→filho. Mapa mental de verdade não é assim — "estoque atrasado" se liga
// a "reclamação do cliente" mesmo os dois pendurados em galhos diferentes.
//
// NÃO MEXE NA ÁRVORE. O `pai` continua mandando no layout, no `arrumarMapa`, no
// arrastar-pra-repender. A ligação livre é uma segunda camada, só visual e de
// sentido: some se o nó sumir, e não move nada de lugar.
//
// GUARDADA NO PRÓPRIO NÓ (`no.liga`), e não numa lista à parte, porque o mapa
// inteiro já é um `nos` jsonb numa coluna só — assim não precisou de migração
// nenhuma, e nó apagado leva as ligações dele junto por construção.
//
// A ligação é MÃO DUPLA no sentido, mas guardada UMA VEZ só: guardar nos dois
// lados dobraria o desenho e faria "desligar" ter que acertar os dois — que é o
// tipo de coisa que fica pela metade e vira linha fantasma.

/** As ligações livres que saem deste nó (nunca `undefined`). */
export function ligacoesDe(no) {
  return Array.isArray(no?.liga) ? no.liga.filter(Boolean) : [];
}

/** Estes dois já estão ligados, em qualquer sentido? */
export function estaoLigados(nos, a, b) {
  const na = (nos || []).find((n) => n?.id === a);
  const nb = (nos || []).find((n) => n?.id === b);
  return ligacoesDe(na).includes(b) || ligacoesDe(nb).includes(a);
}

/** Um é pai do outro? Essa linha a árvore já desenha. */
export function saoParentes(nos, a, b) {
  const na = (nos || []).find((n) => n?.id === a);
  const nb = (nos || []).find((n) => n?.id === b);
  return (na?.pai || null) === b || (nb?.pai || null) === a;
}

/**
 * Pode ligar A em B? Devolve o motivo em português — a tela mostra, não inventa.
 */
export function podeLigar(nos, a, b) {
  if (!a || !b) return { pode: false, motivo: 'Escolha os dois itens.' };
  if (a === b) return { pode: false, motivo: 'Um item não se liga nele mesmo.' };
  const lista = nos || [];
  if (!lista.some((n) => n?.id === a) || !lista.some((n) => n?.id === b)) {
    return { pode: false, motivo: 'Um dos itens não existe mais.' };
  }
  if (saoParentes(lista, a, b)) {
    return { pode: false, motivo: 'Estes dois já estão ligados pela árvore.' };
  }
  if (estaoLigados(lista, a, b)) {
    return { pode: false, motivo: 'Estes dois já estão ligados.' };
  }
  return { pode: true, motivo: '' };
}

/** Liga A em B. Recusa em silêncio o que `podeLigar` reprova. */
export function ligar(nos, a, b) {
  if (!podeLigar(nos, a, b).pode) return nos;
  return (nos || []).map((n) => (n?.id === a ? { ...n, liga: [...ligacoesDe(n), b] } : n));
}

/** Desliga os dois, nos DOIS sentidos — não importa de que lado foi guardado. */
export function desligar(nos, a, b) {
  return (nos || []).map((n) => {
    if (!n) return n;
    if (n.id !== a && n.id !== b) return n;
    const outro = n.id === a ? b : a;
    const ficam = ligacoesDe(n).filter((x) => x !== outro);
    if (ficam.length === ligacoesDe(n).length) return n;
    return { ...n, liga: ficam };
  });
}

/**
 * Os pares a desenhar, cada um UMA vez e sem ponta solta.
 *
 * Filtra ligação pra nó que não existe mais: `apagarNo` tira o nó, mas quem
 * apontava pra ele continua com o id na lista. Limpar aqui, na leitura, é mais
 * seguro que varrer o mapa na escrita — se uma ligação escapar por qualquer
 * caminho, ela simplesmente não vira linha em vez de virar linha pro nada.
 */
export function ligacoesDoMapa(nos) {
  const existe = new Set((nos || []).filter(Boolean).map((n) => n.id));
  const vistos = new Set();
  const pares = [];
  for (const n of (nos || []).filter(Boolean)) {
    for (const outro of ligacoesDe(n)) {
      if (!existe.has(outro) || outro === n.id) continue;
      const chave = [n.id, outro].sort().join('|');
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      pares.push({ de: n.id, para: outro, chave });
    }
  }
  return pares;
}

/** Tira do mapa as ligações que apontam pra nós que não existem mais. */
export function limparLigacoesOrfas(nos) {
  const existe = new Set((nos || []).filter(Boolean).map((n) => n.id));
  return (nos || []).map((n) => {
    if (!n) return n;
    const atuais = ligacoesDe(n);
    if (!atuais.length) return n;
    const ficam = atuais.filter((x) => existe.has(x) && x !== n.id);
    if (ficam.length === atuais.length) return n;
    return ficam.length ? { ...n, liga: ficam } : (() => { const { liga: _fora, ...resto } = n; return resto; })();
  });
}
