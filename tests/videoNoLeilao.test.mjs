// 🎬 16/09/2026 — O VÍDEO DO LOTE, HERDADO DO PRODUTO.
//
// Pedido do dono: vídeo do PS5 entre as fotos do leilão, "no mesmo padrão da
// gestão de estoque (cola o link ou faz o upload)".
//
// Esse padrão já existe desde a #372. Medido no banco em 16/09: os 57 leilões
// ativos têm produto ligado E existente — 57 de 57. Então o leilão HERDA o
// vídeo do produto: zero coluna nova, zero tela nova, e quem cadastra usa a
// mesma Gestão de Estoque.
//
// O dono grava em 1:1 — medido: encaixa 100% x 100% na moldura quadrada da
// galeria, zero sobra. (9:16 deixaria 43,8% da moldura vazia.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const semComentarios = (f) => f.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const ler = (c) => semComentarios(readFileSync(new URL(`../${c}`, import.meta.url), 'utf8'));
const HOOK = ler('src/hooks/useVideoDoLote.js');
const DETALHES = ler('src/pages/AuctionDetails.jsx');
const SALA = ler('src/pages/AuctionRoom.jsx');
const MIDIA = ler('src/components/auction/MidiaDoLote.jsx');

// ─── de onde vem o vídeo ───────────────────────────────────────────────────

test('🔴 o vídeo vem do PRODUTO ligado — nenhuma coluna nova no leilão', () => {
  assert.match(HOOK, /auction\?\.product_id/);
  assert.match(HOOK, /plataforma\.entities\.Product\.filter\(\{ id: produtoId \}\)/);
  // e passa pela MESMA régua da loja: host conhecido ou arquivo nosso
  assert.match(HOOK, /videoDoProduto\(produto\)/);
  assert.ok(!/auctions?\.video_urls|video_urls.*auction/i.test(HOOK), 'apareceu coluna de vídeo no leilão');
});

test('sem produto ligado, não busca nada e devolve null', () => {
  assert.match(HOOK, /if \(!produtoId\) \{ setVideo\(null\); return undefined; \}/);
});

test('🔴 buscar o vídeo NUNCA segura a tela do leilão', () => {
  // a página já renderiza sem isto; falha de rede devolve null e a galeria
  // segue só com as fotos
  assert.match(HOOK, /catch \{\s*if \(vivo\) setVideo\(null\);\s*\}/);
  assert.match(HOOK, /let vivo = true;/);
  assert.match(HOOK, /return \(\) => \{ vivo = false; \};/);
});

// ─── a galeria dos detalhes ────────────────────────────────────────────────

test('🔴 o discriminador do slide não é sobrescrito pelo espalhamento', () => {
  // `videoDoProduto` devolve {tipo:'youtube'|'vimeo'|'arquivo'}. Espalhar DEPOIS
  // de `tipo:'video'` sobrescrevia o discriminador e o slide de vídeo NUNCA
  // renderizava — lint e build passavam, porque é lógica, não sintaxe.
  assert.match(DETALHES, /\{ \.\.\.videoDoLote, origem: videoDoLote\.tipo, tipo: 'video' \}/);
  assert.ok(!/\{ tipo: 'video', \.\.\.videoDoLote \}/.test(DETALHES), 'a ordem do espalhamento voltou a engolir o tipo');
});

test('o vídeo entra DEPOIS das fotos — a capa continua sendo foto', () => {
  const i = DETALHES.indexOf('const midias = [');
  const bloco = DETALHES.slice(i, DETALHES.indexOf('];', i));
  assert.ok(bloco.indexOf("tipo: 'foto'") < bloco.indexOf('videoDoLote'),
    'o vídeo passou na frente da capa — é a foto que carrega rápido e aparece na busca');
});

test('🔴 o autoavanço de 4s PARA no slide de vídeo', () => {
  assert.match(DETALHES, /const noVideo = !!videoDoLote && currentImageIndex === totalDeMidias - 1;/);
  assert.match(DETALHES, /if \(totalDeMidias <= 1 \|\| noVideo\) return undefined;/);
});

test('a contagem do carrossel é das MÍDIAS, não das fotos', () => {
  // com o vídeo na fileira, girar por image_urls.length pularia o último slide
  assert.match(DETALHES, /const totalDeMidias = \(auction\?\.image_urls\?\.length \|\| 0\) \+ \(videoDoLote \? 1 : 0\);/);
  assert.match(DETALHES, /\(prev \+ 1\) % totalDeMidias/);
});

test('▶ a bolinha do vídeo é diferente das outras — senão ninguém acha o vídeo', () => {
  // esta galeria não tem tirinha de miniatura: se a bolinha não avisar, a
  // pessoa só descobre o vídeo se o carrossel girar até lá
  assert.match(DETALHES, /data-teste=\{m\.tipo === 'video' \? 'bolinha-do-video'/);
  assert.match(DETALHES, /aria-label=\{m\.tipo === 'video' \? 'Ver o vídeo do lote'/);
});

test('🔴 o <iframe> só é montado quando o vídeo é o slide corrente', () => {
  // player de YouTube vivo atrás da foto carrega em toda visita, inclusive de
  // quem nunca chega no vídeo
  assert.match(DETALHES, /index === currentImageIndex \? \(\s*\n\s*<div key="video"/);
});

test('o resgate do onError continua só na FOTO', () => {
  const i = DETALHES.indexOf('onError');
  assert.ok(i > 0);
  // o onError troca o src por uma imagem — num <video> seria caminho torto
  const antes = DETALHES.slice(Math.max(0, i - 700), i);
  assert.ok(antes.includes('<img'), 'o onError saiu de dentro do <img>');
});

// ─── a sala de leilão ──────────────────────────────────────────────────────

test('a sala mostra o vídeo no painel e na folha do celular', () => {
  const usos = (SALA.match(/<MidiaDoLote /g) || []).length;
  assert.equal(usos, 2, `esperava 2 usos (painel + folha), achei ${usos}`);
  assert.match(SALA, /<MidiaDoLote imagemUrl=\{mainImageUrl\} titulo=\{auction\.title\} video=\{videoDoLote\} className="product-panel__image"/);
  assert.match(SALA, /<MidiaDoLote imagemUrl=\{mainImageUrl\} titulo=\{auction\.title\} video=\{videoDoLote\} className="mobile-bottom-sheet__image"/);
});

test('🔴 o modal de CONFIRMAR ARREMATE não ganha vídeo', () => {
  // ali a pessoa está decidindo pagar, não navegando mídia
  const i = SALA.indexOf('Confirmar Arremate');
  assert.ok(i > 0, 'sumiu o modal de arremate');
  const bloco = SALA.slice(i, i + 900);
  assert.ok(!/MidiaDoLote/.test(bloco), 'entrou vídeo no modal de arremate');
  assert.match(bloco, /<img src=\{mainImageUrl\}/);
});

test('o hook da sala fica ANTES de qualquer return', () => {
  // hook depois de um `return null` sai da ordem entre renders e o React quebra
  const iHook = SALA.indexOf('useVideoDoLote(auction)');
  const iReturn = SALA.indexOf('    return null;');
  assert.ok(iHook > 0 && iReturn > iHook, 'o hook do vídeo caiu depois de um return');
});

test('🔴 a troca é NO LUGAR — não empilha player e não empurra o botão de lance', () => {
  assert.match(MIDIA, /const \[mostrandoVideo, setMostrandoVideo\] = useState\(false\)/);
  // sem vídeo, o componente é exatamente o <img> que estava lá antes
  assert.match(MIDIA, /if \(!video\) \{\s*\n\s*return <img src=\{imagemUrl\}/);
});

test('🔇 nem na sala nem nos detalhes o vídeo toca sozinho', () => {
  for (const [nome, fonte] of [['sala', MIDIA], ['detalhes', DETALHES]]) {
    assert.ok(!/autoplay|autoPlay/i.test(fonte), `${nome}: apareceu autoplay`);
    assert.match(fonte, /preload="metadata"/, `${nome}: perdeu o preload=metadata`);
  }
});

test('o player usa o `embed` normalizado, nunca a url crua', () => {
  // 🔴 escopado no BLOCO DO VÍDEO. A foto usa `m.url` legitimamente — varrer o
  // arquivo inteiro acusava a foto e o teste reprovava código correto.
  // 🔴 a âncora do fim tem que SOBREVIVER ao semComentarios. Eu tinha usado o
  // comentário "Indicadores do carrossel" — que a própria função apaga: o
  // indexOf devolvia -1 e a fatia pegava a página inteira, incluindo a foto.
  const iVideo = DETALHES.indexOf('<div key="video"');
  assert.ok(iVideo > 0, 'sumiu o bloco do vídeo nos detalhes');
  const iFoto = DETALHES.indexOf('<img', iVideo);
  assert.ok(iFoto > iVideo, 'o bloco da foto sumiu depois do vídeo');
  const blocoVideo = DETALHES.slice(iVideo, iFoto);
  assert.ok(!/src=\{m\.url\}/.test(blocoVideo), 'detalhes: o player voltou a usar a url crua');
  assert.match(blocoVideo, /src=\{m\.embed\}/);
  assert.ok(!/src=\{video\.url\}/.test(MIDIA), 'sala: o player voltou a usar a url crua');
  assert.match(MIDIA, /src=\{video\.embed\}/);
});
