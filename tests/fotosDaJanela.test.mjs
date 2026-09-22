/**
 * 🖼️ AS FOTOS DA SEMANA NA JANELA DO RITUAL (22/09/2026)
 *
 * Dono: "vou te mandar mais duas pra completar a semana, e você vai colocar
 * ALEATÓRIO." E, quando elas não apareceram em produção: "eu te dei 7 imagens
 * da primeira lâmina pra ficar aleatório, lembra? por que elas não estão
 * aqui?" — estavam paradas porque EU tinha decidido não subir por causa da
 * resolução. A decisão é dele; o meu trabalho era medir e avisar, não barrar.
 *
 * 🔄 22/09, MESMO DIA: o dono desmontou depois de ver na tela — "melhor
 * deixar as imagens antigas mesmo, estão mais limpas, pode voltar como
 * estava". As fotos saíram; a CONTA ficou, porque o caminho continua aberto
 * pro dia em que existir foto própria em resolução alta. Por isso estes
 * testes agora guardam a régua, não a ligação na tela.
 *
 * O que estes testes impedem:
 *  · o sorteio virar `Math.random()` — a janela trocaria de praia no meio dos
 *    30 minutos do ritual da pessoa;
 *  · o dia vir de UTC — das 21h às 23h59 em Brasília o UTC já virou amanhã e
 *    a foto trocava no meio da noite (DIR-129/134);
 *  · uma data torta virar NaN e apagar a foto;
 *  · o véu esquecer de ficar mais fundo em cima de foto — medido: numa das
 *    fotos o título caía a 2,80:1, reprovado até no mínimo de texto grande.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fotoDoDia } from '../src/lib/janelaDoMar.js';
import { semComentarios } from './_ajuda.mjs';

const FUNDO = semComentarios(readFileSync(new URL('../src/components/licensing/CentralVendas/FundoJanelaDoMar.jsx', import.meta.url), 'utf8'));

test('a foto do dia é sorteada, mas NÃO muda no meio do mesmo dia', () => {
  // é isto que separa "aleatório" de "instável": a pessoa abre o ritual,
  // fecha, reabre no meio dos 30 minutos — e a janela tem que ser a mesma
  for (let i = 0; i < 20; i++) assert.equal(fotoDoDia('2026-09-22', 3), fotoDoDia('2026-09-22', 3));
  assert.notEqual(fotoDoDia('2026-09-22', 3), fotoDoDia('2026-09-23', 3), 'dois dias seguidos caíram na mesma foto');
});

test('a semana inteira passeia pelas fotos, sem travar numa só', () => {
  const dias = ['2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28'];
  const vistas = new Set(dias.map((d) => fotoDoDia(d, 3)));
  assert.equal(vistas.size, 3, `a semana só mostrou ${vistas.size} foto(s) de 3`);
});

test('o índice sempre cai dentro da lista', () => {
  for (const n of [1, 2, 3, 7, 12]) {
    for (const d of ['2026-01-01', '2026-06-15', '2026-12-31', '2027-02-28']) {
      const i = fotoDoDia(d, n);
      assert.ok(Number.isInteger(i) && i >= 0 && i < n, `${d} com ${n} fotos deu ${i}`);
    }
  }
});

test('data torta ou pasta vazia não apaga a tela', () => {
  // um NaN aqui vira `FOTOS[NaN]` = undefined, e o fundo fica sem foto — o
  // que é aceitável — mas um índice negativo ou fracionário não pode existir
  for (const lixo of [null, undefined, '', 'abc', {}, NaN]) {
    const i = fotoDoDia(lixo, 3);
    assert.ok(Number.isInteger(i) && i >= 0 && i < 3, `${String(lixo)} deu ${i}`);
  }
  assert.equal(fotoDoDia('2026-09-22', 0), -1, 'sem foto nenhuma tem que dizer -1, não 0');
  assert.equal(fotoDoDia('2026-09-22', -5), -1);
});

test('🔴 o sorteio não pode virar Math.random()', () => {
  const lib = readFileSync(new URL('../src/lib/janelaDoMar.js', import.meta.url), 'utf8');
  const i = lib.indexOf('export function fotoDoDia');
  assert.ok(i > 0);
  assert.ok(!/Math\.random|new Date\(\)|Date\.now/.test(lib.slice(i)),
    'o sorteio ficou instável — a janela troca de praia no meio do ritual');
});

test('🔦 com foto, o véu do texto fica mais fundo', () => {
  // medido: com o véu da cena desenhada, o título caía a 2,80:1 em cima da
  // foto mais clara — reprovado até no mínimo frouxo de 3,0 pra texto grande.
  // Com o véu de foto: 5,16:1. E vale pra QUALQUER foto que entrar amanhã.
  const i = FUNDO.indexOf('style={{ background: foto');
  assert.ok(i > 0, 'o véu voltou a ser um só pra cena desenhada e pra foto');
  const trecho = FUNDO.slice(i, i + 700);
  const comFoto = Number(trecho.match(/rgba\(4,11,20,\.(\d+)\) 0%/)[1]);
  const semFoto = Number(trecho.match(/rgba\(4,11,20,\.(\d+)\) 0%[\s\S]*?rgba\(4,11,20,\.(\d+)\) 0%/)[2]);
  assert.ok(comFoto > semFoto, `o véu da foto (${comFoto}) não é mais fundo que o da cena (${semFoto})`);
});

test('a foto entra como VISTA, com a moldura desenhada fora do caminho', () => {
  // as três fotos já trazem a própria janela dentro da imagem: duas molduras,
  // uma por cima da outra, viram erro visual
  assert.ok(FUNDO.indexOf('data-teste="foto-da-janela"') < FUNDO.indexOf('boxShadow: `0 0 0 100vmax'));
  assert.match(FUNDO, /\{!foto && \(<>/);
});
