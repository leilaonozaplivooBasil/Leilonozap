/**
 * 🔊 O SOM DO VÍDEO NO DESTAQUE, E O VÍDEO NO WHATSAPP.
 *
 * Dois pedidos do dono (17/09/2026), e as duas regras que eles esbarram:
 *
 *   "a opção de compartilhar na página dos leilões compartilhe com o vídeo no
 *    whatsapp. O vídeo com autoplay."
 *      → autoplay no WhatsApp NÃO EXISTE por API. Vídeo enviado como arquivo
 *        chega com miniatura e botão de play; só GIF roda sozinho, e esse
 *        rótulo só o WhatsApp aplica na galeria dele. O que dá é o vídeo
 *        chegar como VÍDEO em vez de foto parada.
 *
 *   "deixa o som do vídeo sempre on com a opção de pause o som."
 *      → `play()` com som antes de qualquer gesto é recusado por TODOS os
 *        navegadores desde 2018. Um vídeo que nasce com som não toca. O que dá
 *        é nascer mudo e tirar o mudo no primeiro toque da pessoa.
 *
 * Estes testes travam as decisões que saíram daí — inclusive as que são
 * "não faça", que são as fáceis de alguém desfazer sem saber.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { querSom, gravarQuerSom, calarARadio, CHAVE_DO_SOM, PEDIDO_DE_SILENCIO } from '../src/lib/somDoDestaque.js';

const RAIZ = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const ler = (rel) => readFileSync(path.join(RAIZ, rel), 'utf8');

// ─────────────── a preferência de som ───────────────

test('o padrão é COM som — quem nunca mexeu ouve', () => {
  globalThis.localStorage = { getItem: () => null, setItem: () => {} };
  assert.equal(querSom(), true);
});

test('quem apertou 🔇 continua mudo na próxima visita', () => {
  const guardado = {};
  globalThis.localStorage = { getItem: (k) => guardado[k] ?? null, setItem: (k, v) => { guardado[k] = v; } };
  gravarQuerSom(false);
  assert.equal(guardado[CHAVE_DO_SOM], 'mudo');
  assert.equal(querSom(), false);
  gravarQuerSom(true);
  assert.equal(querSom(), true);
});

test('armazenamento bloqueado não derruba a tela — nem na leitura, nem na escrita', () => {
  // aba anônima e navegador com dados de site bloqueados EXPLODEM só de ler
  globalThis.localStorage = {
    getItem: () => { throw new Error('bloqueado'); },
    setItem: () => { throw new Error('bloqueado'); },
  };
  assert.equal(querSom(), true, 'sem armazenamento, o padrão tem que valer');
  assert.doesNotThrow(() => gravarQuerSom(false));
});

test('calarARadio avisa por evento, e não explode sem janela', () => {
  const ouvidos = [];
  globalThis.window = { dispatchEvent: (e) => ouvidos.push(e.type) };
  globalThis.CustomEvent = class { constructor(tipo) { this.type = tipo; } };
  calarARadio();
  assert.deepEqual(ouvidos, [PEDIDO_DE_SILENCIO]);
  delete globalThis.window;
  assert.doesNotThrow(() => calarARadio(), 'sem window (teste/SSR) não pode lançar');
});

// ─────────────── o card ───────────────

test('o vídeo nasce MUDO — é a única forma de tocar sozinho', () => {
  const card = ler('src/components/auction/AuctionCard.jsx');
  assert.match(card, /const \[mudo, setMudo\] = useState\(true\)/,
    'nascendo com som, o navegador recusa o play e o vídeo fica parado no primeiro quadro');
  assert.match(card, /muted=\{mudo\}/, 'o mudo precisa ser controlado pelo estado');
  assert.match(card, /autoPlay/, 'sem autoplay o vídeo vira foto parada');
});

test('o som entra no PRIMEIRO gesto da pessoa, e só uma vez', () => {
  const card = ler('src/components/auction/AuctionCard.jsx');
  for (const gesto of ['pointerdown', 'touchstart', 'keydown']) {
    assert.match(card, new RegExp(`addEventListener\\('${gesto}', ligarSom`), `falta escutar ${gesto}`);
    assert.match(card, new RegExp(`removeEventListener\\('${gesto}', ligarSom`), `${gesto} fica pendurado ao desmontar`);
  }
  assert.match(card, /once: true/, 'sem `once` o ouvinte roda a cada clique da página');
  assert.match(card, /calarARadio\(\)/, 'o X-MUSIC tocaria junto com o vídeo');
});

test('a escolha da pessoa manda sobre o gesto', () => {
  const card = ler('src/components/auction/AuctionCard.jsx');
  // a guarda tem que estar NAS DUAS pontas: ao montar o ouvinte e ao disparar.
  // Só na primeira, quem apertou 🔇 depois de montado ouviria som no gesto.
  //
  // 🔎 ESTE TESTE VIVE AQUI PORQUE O NAVEGADOR NÃO ALCANÇA. Medido em 17/09:
  // apagar a guarda de dentro deixa a banca de navegador VERDE. Ao recarregar
  // com a preferência em 'mudo', a guarda EXTERNA já devolve cedo e o ouvinte
  // nem chega a ser montado — então o clique não teria como ligar o som de
  // qualquer jeito. A guarda de dentro cobre a janela estreita entre montar o
  // ouvinte e o primeiro gesto, e é esta linha que impede alguém de removê-la
  // achando que não faz nada.
  const efeito = card.slice(card.indexOf('if (!temVideo || !querSom()) return undefined'));
  assert.match(efeito.slice(0, 600), /if \(!v \|\| !querSom\(\)\) return;/,
    'a preferência precisa ser conferida também na hora de ligar o som');
});

test('🔴 play() recusado não pode virar erro solto no console', () => {
  const card = ler('src/components/auction/AuctionCard.jsx');
  // `play()` devolve promessa e é recusado em aba de fundo. Sem catch, vira
  // "Unhandled promise rejection" no console de quem está comprando.
  const chamadas = card.match(/\.play\?\.\(\)[^\n]*/g) || [];
  assert.ok(chamadas.length >= 2, `esperava ao menos 2 chamadas de play(), achei ${chamadas.length}`);
  for (const c of chamadas) assert.match(c, /\.catch\(/, `play() sem catch: ${c}`);
});

test('o botão de som existe e é só do vídeo de ARQUIVO', () => {
  const card = ler('src/components/auction/AuctionCard.jsx');
  assert.match(card, /data-teste="som-do-destaque"/);
  assert.match(card, /temVideo && video\.tipo === 'arquivo' && mostrandoVideo &&/,
    'iframe de terceiro tem controle próprio e não aceita mudo de fora');
  assert.match(card, /aria-label=\{mudo \? 'Ligar o som do vídeo' : 'Pausar o som do vídeo'\}/,
    'o botão precisa dizer o que faz para quem usa leitor de tela');
});

// ─────────────── o compartilhar ───────────────

test('o compartilhar tenta o VÍDEO antes da foto, e cai na foto se falhar', () => {
  const card = ler('src/components/auction/AuctionCard.jsx');
  const posVideo = card.indexOf("if (video?.tipo === 'arquivo' && video.embed && navigator.share");
  const posFoto = card.indexOf('// NÍVEL 1: Share com imagem via Web Share API');
  assert.ok(posVideo > 0, 'o compartilhar não tenta o vídeo');
  assert.ok(posFoto > posVideo, 'a foto tem que ser a RESERVA, não a primeira tentativa');
  // e o caminho da foto continua inteiro embaixo — ninguém fica sem compartilhar
  assert.match(card.slice(posFoto), /navigator\.share\(\{/);
});

test('vídeo acima do teto do WhatsApp não é nem tentado', () => {
  const card = ler('src/components/auction/AuctionCard.jsx');
  assert.match(card, /blob\.size <= 16 \* 1024 \* 1024/,
    'sem o teto, o anexo é recusado no aparelho e a pessoa só vê falhar');
});

test('o botão avisa enquanto baixa — 7,9 MB não são instantâneos', () => {
  const card = ler('src/components/auction/AuctionCard.jsx');
  assert.match(card, /const \[preparandoVideo, setPreparandoVideo\] = useState\(false\)/);
  assert.match(card, /disabled=\{preparandoVideo\}/, 'sem travar, a pessoa aperta de novo achando que não pegou');
  assert.match(card, /finally \{\s*setPreparandoVideo\(false\);\s*\}/,
    '🔴 sem `finally` o botão fica travado para sempre quando a rede cai');
});

// ─────────────── o link ───────────────

test('a rota /l/:id leva og:video quando o produto tem vídeo NOSSO', () => {
  const rota = ler('api/leilao.js');
  assert.match(rota, /og:video/);
  assert.match(rota, /videos-produtos/, 'só arquivo do nosso balde vira og:video');
  assert.match(rota, /u\.hostname\.endsWith\('supabase\.co'\)/, 'host de terceiro não pode entrar como og:video');
});

test('🔴 twitter:card continua ÚNICO e como summary_large_image', () => {
  const rota = ler('api/leilao.js');
  const tags = rota.match(/<meta name="twitter:card"[^>]*>/g) || [];
  assert.equal(tags.length, 1, `saíram ${tags.length} tags twitter:card — o rastreador escolhe uma no escuro`);
  assert.match(tags[0], /summary_large_image/,
    'o X exige que twitter:player seja iframe, não mp4 cru, e ainda pede liberação do domínio');
});

test('a busca do vídeo não pode derrubar o preview nem o redirecionamento', () => {
  const rota = ler('api/leilao.js');
  const bloco = rota.slice(rota.indexOf("let videoUrl = ''"), rota.indexOf('const destino'));
  assert.match(bloco, /catch \(_\) \{/, 'falha ao buscar o vídeo tem que ser engolida');
  assert.ok(rota.indexOf('location.replace') > 0, 'o redirecionamento continua existindo');
});
