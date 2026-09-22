/**
 * 🎙️ A BARRA DA GRATIDÃO ENQUANTO A PESSOA FALA (22/09/2026)
 *
 * Dono, testando ao vivo: "essa barrinha não está subindo, ela só sobe depois
 * que eu aperto, e também os segundos não estão contando. Gostaria que
 * deixasse melhor essas informações pra pessoa ler melhor quando começar a
 * gravar o áudio, e contando os segundos, a barra ir crescendo — pra pessoa
 * ter uma noção e ficar muito claro. Lembra que a pessoa está acordando de
 * manhã, está com sono. Essa comunicação tem que ficar muito limpa."
 *
 * 🔴 A CAUSA: o painel lia `audioGratidaoSeg`, que só é escrito quando a
 * gravação PARA. Durante a fala ele valia 0, o painel caía no ramo do texto e
 * mostrava "0 de 20 letras · faltam 20" — cobrando LETRAS de quem estava
 * FALANDO — e a barra ficava zerada justo no minuto em que ela mais serve.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { progressoDaGratidao, GRATIDAO_MIN } from '../src/lib/xgame.js';
import { fraseDoProgresso, progressoDaEtapa } from '../src/lib/progressoDaEtapa.js';
import { semComentarios } from './_ajuda.mjs';

const TELA = semComentarios(readFileSync(new URL('../src/components/licensing/CentralVendas/XGameRitualAmanhecer.jsx', import.meta.url), 'utf8'));

test('🔴 falando agora: a régua é de SEGUNDOS, nunca de letras', () => {
  // este é o defeito exato que o dono viu na tela
  const p = progressoDaGratidao({ gravando: true, segundosAoVivo: 18, audioSeg: 0, texto: '', minSeg: 88 });
  assert.equal(p.unidade, 's', 'voltou a cobrar letras de quem está falando');
  assert.equal(p.feito, 18, 'os segundos ao vivo não chegaram no painel');
  assert.equal(p.meta, 88);
  assert.ok(!/letras/.test(fraseDoProgresso(p)), `a frase ainda fala em letras: "${fraseDoProgresso(p)}"`);
});

test('a barra CRESCE enquanto a pessoa fala', () => {
  const pct = (s) => progressoDaEtapa(progressoDaGratidao({ gravando: true, segundosAoVivo: s, minSeg: 88 })).pct;
  const andando = [0, 10, 30, 60, 88].map(pct);
  for (let i = 1; i < andando.length; i++) {
    assert.ok(andando[i] > andando[i - 1], `a barra travou entre ${andando[i - 1]}% e ${andando[i]}%`);
  }
  assert.equal(andando[0], 0);
  assert.equal(andando[4], 100);
});

test('quando já dá, a pessoa fica sabendo NA HORA que pode parar', () => {
  const p = progressoDaGratidao({ gravando: true, segundosAoVivo: 90, minSeg: 88 });
  assert.ok(progressoDaEtapa(p).pronto);
  assert.match(p.complemento, /já vale/);
  const antes = progressoDaGratidao({ gravando: true, segundosAoVivo: 10, minSeg: 88 });
  assert.match(antes.complemento, /contando/, 'quem está no meio precisa saber que o tempo está correndo');
});

test('depois de gravar, a régua continua de segundos', () => {
  // dizer "faltam 12 letras" pra quem acabou de falar é falar grego
  // (conserto do chamado do Paim, 07/09) — não pode regredir
  const p = progressoDaGratidao({ gravando: false, audioSeg: 30, texto: '', minSeg: 88 });
  assert.equal(p.unidade, 's');
  assert.equal(p.feito, 30);
});

test('sem áudio nenhum, aí sim a régua é de letras', () => {
  const p = progressoDaGratidao({ gravando: false, audioSeg: 0, texto: 'obrigado', minSeg: 88 });
  assert.equal(p.unidade, 'letras');
  assert.equal(p.feito, 8);
  assert.equal(p.meta, GRATIDAO_MIN);
});

test('lixo na entrada não zera nem quebra o painel', () => {
  // meta 0 viraria divisão por zero na barra; segundos NaN apagaria o número
  for (const caso of [
    { gravando: true, segundosAoVivo: NaN, minSeg: 0 },
    { gravando: true, segundosAoVivo: -9, minSeg: 88 },
    { gravando: false, audioSeg: null, texto: null },
    {},
  ]) {
    const p = progressoDaGratidao(caso);
    assert.ok(Number.isFinite(p.feito) && p.feito >= 0, `feito quebrou: ${p.feito}`);
    assert.ok(Number.isFinite(p.meta) && p.meta > 0, `meta quebrou: ${p.meta}`);
    assert.ok(Number.isFinite(progressoDaEtapa(p).pct));
  }
});

test('a tela usa os segundos AO VIVO do ditado, não os do fim', () => {
  assert.match(TELA, /segundosAoVivo: ditadoGratidao\.segundos/, 'a tela voltou a ler só o valor do fim da gravação');
  assert.match(TELA, /gravando: ditadoGratidao\.gravando/);
  assert.ok(!/audioGratidaoSeg > 0\s*\n\s*\? <DicaDaEtapa/.test(TELA), 'voltou o ramo antigo que cobrava letras de quem fala');
});

test('o painel aparece TAMBÉM enquanto a pessoa fala', () => {
  // é aí que a barra crescendo tem valor; escondê-la durante a fala era
  // mostrar o progresso só depois que já não adianta
  assert.match(TELA, /\{\(!entrega\.ok \|\| ditadoGratidao\.gravando\) && \(\(\) => \{/);
});

test('🧹 enquanto fala, as duas portas de entrada saem da frente', () => {
  // "essa comunicação tem que ficar muito limpa" — três coisas disputando o
  // olho de quem está com sono é o contrário disso
  assert.match(TELA, /\{!audioGratidaoUrl && !modoEscrita && !ditadoGratidao\.gravando && \(/);
});
