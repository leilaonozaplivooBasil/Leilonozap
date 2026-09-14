// 🎧 A PÍLULA DO X-MUSIC PARA DE MENTIR (14/09/2026).
//
// O PEDIDO (dono): "a música está tocando automático e isso é certo, porém
// está colocando como se estivesse sem tocar, deveria estar verde e
// sinalizar que a rádio está tocando."
//
// A CAUSA: `ligado` era só a INTENÇÃO (o que o botão pediu por último), não
// o que o player de fato fazia. O embed do YouTube sempre nasce com
// `autoplay:1` — em qualquer sessão/navegador onde esse autoplay COM SOM é
// permitido (ou quando a pessoa usa os controles nativos do próprio player,
// visíveis na tela, com `controls:1`), o som tocava de verdade enquanto a
// pílula, presa na intenção antiga (o padrão de `lerLigado()` é `false`),
// seguia cinza dizendo "desligado". A régua nunca escutava o player pra
// saber se ele estava, de fato, tocando ou pausado.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const XMUSIC = fs.readFileSync(new URL('../src/components/licensing/XMusic.jsx', import.meta.url), 'utf8');

test('PlayerYT aceita um onEstadoReal e guarda a última referência (mesmo padrão dos outros callbacks)', () => {
  assert.match(XMUSIC, /function PlayerYT\(\{ alvo, ligado, onErro, onTitulo, onFim, onEstadoReal \}\)/);
  assert.match(XMUSIC, /const onEstadoRealRef = useRef\(onEstadoReal\);/);
  assert.match(XMUSIC, /onEstadoRealRef\.current = onEstadoReal;/);
});

test('onStateChange escuta o player DE VERDADE: PLAYING e PAUSED avisam onEstadoReal — a pílula nunca mais fica presa na intenção antiga', () => {
  const inicio = XMUSIC.indexOf('onStateChange: (e) => {');
  const fim = XMUSIC.indexOf('},', XMUSIC.indexOf('onError: (e) =>'));
  const bloco = XMUSIC.slice(inicio, XMUSIC.indexOf('return <div', inicio));
  assert.match(bloco, /if \(e\?\.data === YT\.PlayerState\?\.PLAYING\) onEstadoRealRef\.current\?\.\(true\)/, 'tocando de verdade precisa avisar que está tocando');
  assert.match(bloco, /if \(e\?\.data === YT\.PlayerState\?\.PAUSED\) onEstadoRealRef\.current\?\.\(false\)/, 'pausado de verdade (inclusive pelos controles NATIVOS do YouTube) precisa avisar que parou');
});

test('XMusic: o player é ligado ao mesmo setLigado que pinta a pílula — o estado real e a pílula nunca mais divergem', () => {
  assert.match(XMUSIC, /<PlayerYT alvo=\{estacao\} ligado=\{ligado\} onErro=\{aoErrar\} onTitulo=\{aoTocar\} onFim=\{aoTerminar\} onEstadoReal=\{setLigado\} \/>/);
});

test('a pílula continua lendo o MESMO `ligado` pra cor, ícone e texto — a correção é a FONTE do estado, não um segundo estado paralelo', () => {
  assert.match(XMUSIC, /\$\{ligado \? 'bg-nz-verde text-white' : 'bg-white\/10 text-white\/70 hover:bg-white\/20'\}/);
  assert.match(XMUSIC, /text-nz-verde.*: 'text-white\/50'/);
  assert.match(XMUSIC, /\{ligado \? \(estacao\?\.tocando \|\| estacao\?\.nome \|\| 'tocando'\) : 'desligado'\}/);
});
