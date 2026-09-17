/**
 * 🎬 O VÍDEO ABRE O CARD DOS DESTAQUES — a ligação, e o limite dela.
 *
 * Pedido do dono (17/09/2026), sobre o PS5: "como primeira foto do PS em
 * destaque na página do leilão, deve ser o vídeo" — e, à pergunta de onde
 * valeria: "só no destaques".
 *
 * O comportamento na tela é provado num Chromium
 * (tests/navegador/dataDoLeilao.spec.mjs). Aqui ficam as três coisas que só o
 * código responde:
 *   1. o vídeo do PS5 é reconhecido pela régua que já existia;
 *   2. os Destaques buscam os produtos em UMA consulta, não uma por card;
 *   3. o "só no destaques" é de verdade — nenhuma outra tela passa `video`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { videoDoProduto } from '../src/lib/videoDoProduto.js';

const RAIZ = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const ler = (rel) => readFileSync(path.join(RAIZ, rel), 'utf8');

// o endereço REAL gravado em products.video_urls do PS5, medido no banco em 17/09
const VIDEO_DO_PS5 = 'https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/videos-produtos/uploads/1789569726600_ps5.mp4';

test('o vídeo do PS5 é arquivo NOSSO — toca em <video>, nunca em iframe', () => {
  const v = videoDoProduto({ video_urls: [VIDEO_DO_PS5] });
  assert.ok(v, 'a régua não reconheceu o vídeo que está no banco');
  assert.equal(v.tipo, 'arquivo');
  assert.equal(v.embed, VIDEO_DO_PS5);
});

test('endereço fora da lista branca não vira vídeo em lugar nenhum', () => {
  assert.equal(videoDoProduto({ video_urls: ['https://site-qualquer.com/x.mp4'] }), null);
  assert.equal(videoDoProduto({ video_urls: [] }), null);
  assert.equal(videoDoProduto(null), null);
});

test('os Destaques buscam os produtos em UMA consulta, não uma por card', () => {
  const tela = ler('src/components/home/DestaquesLeiloes.jsx');
  assert.match(tela, /from\('products'\)/, 'os Destaques não buscam o produto');
  assert.match(tela, /\.in\('id', produtoIds\)/,
    'sem `.in(...)` seriam seis idas ao banco, uma por destaque');
  assert.match(tela, /video=\{videos\[auction\.id\] \|\| null\}/,
    'o vídeo não chega ao card');
  // a mesma régua da loja e da sala — nunca uma validação de host escrita aqui
  assert.match(tela, /import \{ videoDoProduto \} from '@\/lib\/videoDoProduto'/);
});

test('a busca do vídeo NUNCA segura os destaques na tela', () => {
  const tela = ler('src/components/home/DestaquesLeiloes.jsx');
  // os cards vão pro estado ANTES de a busca de vídeo começar; falha nela é engolida
  const antes = tela.indexOf('setDestaques(emCartaz)');
  const depois = tela.indexOf("from('products')");
  assert.ok(antes > 0 && depois > antes,
    'a busca do vídeo passou na frente dos cards — rede lenta atrasaria a vitrine inteira');
  assert.match(tela, /catch \{ \/\* sem vídeo, os cards seguem com as fotos \*\/ \}/,
    'falha na busca do vídeo não pode derrubar os destaques');
});

test('🔒 SÓ NOS DESTAQUES — nenhuma outra tela passa `video` ao AuctionCard', () => {
  const encontrados = [];
  const varrer = (dir) => {
    for (const nome of readdirSync(path.join(RAIZ, dir), { withFileTypes: true })) {
      const rel = path.join(dir, nome.name);
      if (nome.isDirectory()) { varrer(rel); continue; }
      if (!/\.jsx?$/.test(nome.name)) continue;
      const src = readFileSync(path.join(RAIZ, rel), 'utf8');
      // um <AuctionCard ...> que carrega a prop video
      for (const m of src.matchAll(/<AuctionCard[^>]*?>/gs)) {
        if (/\bvideo=/.test(m[0])) encontrados.push(rel);
      }
    }
  };
  varrer('src');
  assert.deepEqual([...new Set(encontrados)], ['src/components/home/DestaquesLeiloes.jsx'],
    `o vídeo vazou pra fora dos Destaques: ${[...new Set(encontrados)].join(', ')}`);
});

test('a régua da PÁGINA DE VENDA continua com o vídeo NO FIM', () => {
  // A inversão vale só no card do destaque. midiasDoProduto (loja e detalhes)
  // não pode ter mudado junto — lá a capa é o que vai pra busca e pro
  // compartilhamento, e a decisão da #387 continua de pé.
  const regua = ler('src/lib/midiasDoProduto.js');
  assert.match(regua, /O VÍDEO VAI NO FIM, NUNCA NA CAPA/,
    'a regra da página de venda foi alterada junto — não era isso que o dono pediu');
  const corpo = regua.slice(regua.indexOf('export function midiasDoProduto'));
  const posFoto = corpo.indexOf("tipo: 'foto'");
  const posVideo = corpo.indexOf("tipo: 'video'");
  assert.ok(posFoto > 0 && posVideo > posFoto, 'o vídeo passou na frente das fotos na régua da loja');
});

// ─────────────── 🔇 só um vídeo toca por vez (17/09/2026) ───────────────

test('só o PRIMEIRO destaque recebe o SOM', () => {
  const tela = ler('src/components/home/DestaquesLeiloes.jsx');
  assert.match(tela, /destaques\.map\(\(auction, posicao\) =>/,
    'sem o índice não há como saber quem é o primeiro');
  assert.match(tela, /videoAtivo=\{posicao === 0\}/,
    'sem isso, todos os cards ganhariam áudio e tocariam juntos');
});

test('🔴 é a posição na lista JÁ FILTRADA, não a posição salva', () => {
  const tela = ler('src/components/home/DestaquesLeiloes.jsx');
  // `emCartaz` já tirou os encerrados. Se a trava usasse `sort_order`, um
  // destaque 1 encerrado deixaria a vitrine inteira MUDA — ninguém tocaria.
  const mapa = tela.slice(tela.indexOf('destaques.map('));
  assert.ok(!/sort_order/.test(mapa.slice(0, 900)),
    'a escolha de quem toca não pode vir do sort_order salvo');
  const filtro = tela.indexOf('setDestaques(emCartaz)');
  assert.ok(filtro > 0 && filtro < tela.indexOf('destaques.map('),
    'a lista tem que estar filtrada antes de escolher quem toca');
});

test('🔴 videoAtivo trava o SOM, nunca o vídeo nem o compartilhar', () => {
  const card = ler('src/components/auction/AuctionCard.jsx');
  // 🔄 Virou na mesma noite: a primeira rodada travava o vídeo inteiro, e o
  // dono mandou desfazer ("o patinete e a harley também em primeira posição,
  // mas sem tocar o som"). O que não pode duplicar é o SOM.
  assert.match(card, /const temVideo = Boolean\(video\?\.embed\);/,
    '🔴 o vídeo voltou a ser travado — Patinete e Harley abririam com foto de novo');
  assert.match(card, /if \(!temVideo \|\| !videoAtivo \|\| !querSom\(\)\) return undefined;/,
    'sem videoAtivo aqui, o clique ligaria o som de TODOS os cards ao mesmo tempo');
  assert.match(card, /\{temVideo && videoAtivo && video\.tipo === 'arquivo' && mostrandoVideo &&/,
    'o botão de som apareceria em card que não tem som');
  const share = card.slice(card.indexOf('const handleShare'));
  const corpo = share.slice(0, share.indexOf('\n  };'));
  assert.match(corpo, /video\?\.tipo === 'arquivo' && video\.embed/,
    'o compartilhar parou de olhar o vídeo');
  assert.ok(!/videoAtivo/.test(corpo),
    '🔴 o compartilhar foi travado junto — 5 dos 6 destaques perderiam o vídeo no WhatsApp');
});

test('o padrão de videoAtivo é false — ninguém ganha som sem pedir', () => {
  const card = ler('src/components/auction/AuctionCard.jsx');
  assert.match(card, /videoAtivo = false \}\)/,
    'com padrão true, qualquer tela que passasse vídeo ganharia áudio junto');
});

test('⚖️ o peso do vídeo mudo está escrito no código, não só no PR', () => {
  // Vídeo mudo baixa igual. Seis destaques equipados são ~30 a 48 MB na Home.
  // Foi medido e informado ao dono; quem mexer aqui depois precisa saber disso
  // sem ter que achar o PR.
  const card = ler('src/components/auction/AuctionCard.jsx');
  assert.match(card, /vídeo mudo baixa igual/i,
    'o custo tem que estar dito onde a decisão mora');
});
