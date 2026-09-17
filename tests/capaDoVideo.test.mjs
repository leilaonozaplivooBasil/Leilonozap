/**
 * 🎬 A CAPA DO VÍDEO NÃO PODE NASCER PRETA.
 *
 * Dono (17/09/2026): "preciso que o vídeo chegue no WhatsApp em um frame
 * melhor e não no primeiro frame dos vídeos, que costuma ser tudo preto".
 *
 * 🔴 E NÃO DÁ PARA MANDAR OUTRA CAPA. O WhatsApp gera a miniatura sozinho, no
 * aparelho de quem recebe, decodificando o PRIMEIRO QUADRO do arquivo. Não há
 * meta tag, mime nem campo do Web Share API que aponte outro quadro. Quem
 * escolhe a capa é o arquivo — então o conserto é não deixar subir um vídeo
 * que começa preto.
 *
 * Aqui mora a régua: o que é escuro, onde olhar, e o que dizer para quem
 * cadastra. Sem DOM, porque decisão não precisa de navegador.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  brilhoDoQuadro, quadroEscuro, momentosParaOlhar, ateQuandoEscuro, recadoDaCapa, TETO_DE_ESCURO,
} from '../src/lib/capaDoVideo.js';

const RAIZ = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const ler = (rel) => readFileSync(path.join(RAIZ, rel), 'utf8');

/** um quadro de N pixels todos na mesma cor, como o canvas devolve (RGBA) */
const quadro = (r, g, b, n = 50) => {
  const px = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i += 1) { px[i * 4] = r; px[i * 4 + 1] = g; px[i * 4 + 2] = b; px[i * 4 + 3] = 255; }
  return px;
};

// ─────────────── o brilho ───────────────

test('preto é 0, branco é 255', () => {
  assert.equal(Math.round(brilhoDoQuadro(quadro(0, 0, 0))), 0);
  assert.equal(Math.round(brilhoDoQuadro(quadro(255, 255, 255))), 255);
});

test('🔴 o verde pesa mais que o azul — média simples mentiria', () => {
  // BT.709: o olho enxerga muito mais verde. Um azul puro e saturado é ESCURO
  // para o olho (brilho ~18), e uma média simples de R+G+B diria 85 — "claro".
  // Com a média simples, uma abertura azul-escura passaria batida.
  const azul = brilhoDoQuadro(quadro(0, 0, 255));
  const verde = brilhoDoQuadro(quadro(0, 255, 0));
  assert.ok(verde > azul * 3, `verde ${verde.toFixed(1)} deveria ser muito maior que azul ${azul.toFixed(1)}`);
  assert.ok(azul < 20, `azul puro deu ${azul.toFixed(1)} — média simples daria 85`);
});

test('quadro vazio ou lixo devolve 0, sem explodir', () => {
  for (const ruim of [null, undefined, [], new Uint8ClampedArray(2)]) {
    assert.equal(brilhoDoQuadro(ruim), 0);
  }
});

test('o teto separa "abertura preta" de "cena escura"', () => {
  assert.ok(quadroEscuro(brilhoDoQuadro(quadro(0, 0, 0))), 'preto tem que ser escuro');
  assert.ok(quadroEscuro(brilhoDoQuadro(quadro(10, 10, 10))), 'quase preto também');
  // 🔴 O OUTRO LADO, que é o que evita avisar demais: um produto preto sobre
  // fundo escuro, ou uma cena noturna, NÃO podem disparar o aviso. Avisar à toa
  // faz quem cadastra ignorar o aviso — pior que não ter aviso.
  assert.ok(!quadroEscuro(brilhoDoQuadro(quadro(40, 40, 40))), 'cinza escuro é cena, não abertura preta');
  assert.ok(!quadroEscuro(brilhoDoQuadro(quadro(30, 20, 60))), 'roxo escuro é cena');
  assert.equal(TETO_DE_ESCURO, 18);
});

// ─────────────── onde olhar ───────────────

test('olha denso no começo, que é onde o problema mora', () => {
  const m = momentosParaOlhar(10);
  assert.equal(m[0], 0, 'o primeiro quadro É a capa — tem que ser o primeiro a olhar');
  assert.ok(m.filter((t) => t <= 1).length >= 3, 'poucas amostras no primeiro segundo');
});

test('🔴 nunca pede um instante além do fim do vídeo', () => {
  // `currentTime` além da duração deixa o `seeked` sem disparar, e a análise
  // fica pendurada até o relógio de paciência — com a pessoa esperando.
  for (const dur of [0.3, 1, 2.5, 4]) {
    for (const t of momentosParaOlhar(dur)) {
      assert.ok(t < dur, `pediu ${t}s num vídeo de ${dur}s`);
    }
  }
});

test('duração podre ainda devolve ao menos o instante 0', () => {
  for (const ruim of [0, -5, NaN, null, undefined, 'abc']) {
    assert.deepEqual(momentosParaOlhar(ruim), [0]);
  }
});

// ─────────────── até onde está escuro ───────────────

test('começo preto: aponta o primeiro instante claro, que é onde cortar', () => {
  const r = ateQuandoEscuro([
    { t: 0, brilho: 1 }, { t: 0.2, brilho: 2 }, { t: 0.5, brilho: 4 },
    { t: 1, brilho: 90 }, { t: 1.5, brilho: 110 },
  ]);
  assert.deepEqual(r, { escuroAte: 1, tudoEscuro: false });
});

test('começo já claro: não avisa nada', () => {
  const r = ateQuandoEscuro([{ t: 0, brilho: 120 }, { t: 0.2, brilho: 3 }]);
  assert.deepEqual(r, { escuroAte: null, tudoEscuro: false });
  assert.equal(recadoDaCapa(r), '', 'vídeo bom não pode ganhar faixa de aviso');
});

test('🔴 escuro no MEIO não é problema — só o começo vira capa', () => {
  // um corte escuro aos 2s é edição, não defeito. Avisar aí seria ruído.
  const r = ateQuandoEscuro([{ t: 0, brilho: 150 }, { t: 1, brilho: 2 }, { t: 2, brilho: 1 }]);
  assert.equal(r.escuroAte, null);
  assert.equal(r.tudoEscuro, false);
});

test('vídeo escuro do começo ao fim: diz que não há para onde cortar', () => {
  const r = ateQuandoEscuro([{ t: 0, brilho: 1 }, { t: 1, brilho: 2 }, { t: 2, brilho: 3 }]);
  assert.deepEqual(r, { escuroAte: null, tudoEscuro: true });
  assert.match(recadoDaCapa(r), /do começo ao fim/);
  assert.ok(!/Corte até/.test(recadoDaCapa(r)), 'não faz sentido mandar cortar o que é escuro inteiro');
});

test('sem amostra nenhuma não inventa aviso', () => {
  assert.deepEqual(ateQuandoEscuro([]), { escuroAte: null, tudoEscuro: false });
  assert.deepEqual(ateQuandoEscuro(null), { escuroAte: null, tudoEscuro: false });
  assert.equal(recadoDaCapa({ escuroAte: null, tudoEscuro: false }), '');
});

// ─────────────── o recado ───────────────

test('o recado traz o SEGUNDO exato, em português', () => {
  const texto = recadoDaCapa({ escuroAte: 1.5, tudoEscuro: false });
  assert.match(texto, /1,5s/, 'número com vírgula, não ponto');
  assert.match(texto, /PRIMEIRO QUADRO/, 'a pessoa precisa saber POR QUE está sendo avisada');
  assert.match(texto, /Corte até 1,5s/);
  assert.match(texto, /assim mesmo/, 'o caminho de seguir em frente tem que estar dito');
});

// ─────────────── a tela ───────────────

test('a conferência acontece ANTES de subir, nunca depois', () => {
  const tela = ler('src/components/catalog/CampoDeVideo.jsx');
  const olhar = tela.indexOf('const capa = await olharOComeco(file)');
  const enviar = tela.indexOf('await subir(file)');
  assert.ok(olhar > 0 && enviar > olhar,
    'avisar depois do envio é tarde: o arquivo já está no cofre e a franquia já foi gasta');
});

test('🔴 a análise falhando NÃO pode impedir o envio', () => {
  const tela = ler('src/components/catalog/CampoDeVideo.jsx');
  assert.match(tela, /const recado = capa\.olhou \? recadoDaCapa\(capa\) : '';/,
    'sem a guarda `olhou`, codec desconhecido viraria aviso falso ou travaria o cadastro');
  const lib = ler('src/lib/olharOVideo.js');
  assert.match(lib, /olhou: false/, 'a lib precisa saber dizer "não sei"');
  assert.match(lib, /PACIENCIA_MS/, 'sem relógio, um arquivo ruim pendura a tela para sempre');
});

test('os dois caminhos ficam abertos: trocar o arquivo ou subir assim mesmo', () => {
  const tela = ler('src/components/catalog/CampoDeVideo.jsx');
  assert.match(tela, /data-teste="aviso-da-capa"/);
  assert.match(tela, /data-teste="subir-assim-mesmo"/,
    'o aviso não pode virar bloqueio — o vídeo é válido, só tem capa ruim');
  assert.match(tela, /Escolher outro arquivo/);
});

test('o endereço do objeto é sempre devolvido — vazamento de memória não', () => {
  const lib = ler('src/lib/olharOVideo.js');
  assert.match(lib, /revokeObjectURL/);
  // e o `limpar()` tem que ser chamado em TODAS as saídas, inclusive no catch
  const saidas = (lib.match(/limpar\(\);/g) || []).length;
  assert.ok(saidas >= 4, `limpar() aparece ${saidas}x — falta alguma saída`);
});

test('o contorno da duração ausente continua de pé — defensivo, e não alcançável na banca', () => {
  // 🔎 MEDIDO em 17/09: apagar este contorno deixa a banca de navegador VERDE,
  // porque o Chromium daqui devolve duração finita para o webm que ela grava
  // ("1.556515", não "Infinity"). Ou seja, a banca NÃO prova este trecho.
  //
  // Ele fica porque o caso é real fora daqui: vídeo gravado pelo navegador sai
  // com a duração ausente no cabeçalho em várias versões, e sem o contorno só
  // o quadro 0 seria olhado — um começo preto viraria "escuro do começo ao
  // fim", mandando clarear um vídeo que só precisava de um corte.
  //
  // É esta linha que impede alguém de remover achando que não faz nada.
  const lib = ler('src/lib/olharOVideo.js');
  assert.match(lib, /v\.duration === Infinity/,
    'sumiu o contorno da duração ausente');
  assert.match(lib, /currentTime = 1e101/,
    'o contorno conhecido é pedir um instante absurdo para o navegador achar o fim');
});
