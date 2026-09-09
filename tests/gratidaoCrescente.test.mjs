// 🙏 A GRATIDÃO CRESCE DIA A DIA — DIR-121 (09/09/2026).
//
// O PEDIDO (dono): "ele está pedindo um áudio só de quinze segundos, isso é
// muito pouco. Ele tem que ter ali pelo menos uns vinte motivos pra
// agradecer, vamos crescendo isso gradativamente... a ideia é que a gente
// chegue dentro do mês com cinquenta agradecimentos."
//
// A régua velha (GRATIDAO_AUDIO_MIN_SEG=15, fixa) continua existindo como
// PISO PADRÃO pra quem chama gratidaoEntregue/faltaDaGratidao sem saber o
// dia do ciclo (ver tests/gratidaoFalada.test.mjs) — o que muda é que a
// tela agora passa um `minSeg` calculado do dia, sempre crescente.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import {
  GRATIDAO_MOTIVOS_INICIAL, GRATIDAO_MOTIVOS_TETO, GRATIDAO_SEG_POR_MOTIVO,
  metaMotivosGratidaoHoje, gratidaoAudioMinSegHoje, diaCorridoDoCiclo,
  gratidaoEntregue, faltaDaGratidao,
} from '../src/lib/xgame.js';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const RITUAL = semComentarios(ler('../src/components/licensing/CentralVendas/XGameRitualAmanhecer.jsx'));
const METODO = semComentarios(ler('../src/components/licensing/CentralVendas/CrmMetodo.jsx'));

test('dia 1 pede os 20 motivos iniciais, nunca menos', () => {
  assert.equal(metaMotivosGratidaoHoje(1), GRATIDAO_MOTIVOS_INICIAL);
  assert.equal(metaMotivosGratidaoHoje(0), GRATIDAO_MOTIVOS_INICIAL, 'dia inválido cai pro piso, não pra zero');
  assert.equal(metaMotivosGratidaoHoje(-5), GRATIDAO_MOTIVOS_INICIAL);
});

test('cresce 1 motivo por dia corrido, até o teto de 50', () => {
  assert.equal(metaMotivosGratidaoHoje(2), 21);
  assert.equal(metaMotivosGratidaoHoje(10), 29);
  assert.equal(metaMotivosGratidaoHoje(31), GRATIDAO_MOTIVOS_TETO, 'dia 31 já bate os 50 (20 + 30)');
  assert.equal(metaMotivosGratidaoHoje(60), GRATIDAO_MOTIVOS_TETO, 'nunca passa do teto');
});

test('o piso de segundos de hoje é a meta de motivos vezes o ritmo por motivo', () => {
  assert.equal(gratidaoAudioMinSegHoje(1), Math.round(GRATIDAO_MOTIVOS_INICIAL * GRATIDAO_SEG_POR_MOTIVO));
  assert.equal(gratidaoAudioMinSegHoje(31), Math.round(GRATIDAO_MOTIVOS_TETO * GRATIDAO_SEG_POR_MOTIVO));
  assert.ok(gratidaoAudioMinSegHoje(15) > gratidaoAudioMinSegHoje(1), 'o piso de meio de mês é maior que o do dia 1');
});

test('gratidaoEntregue/faltaDaGratidao aceitam o minSeg de hoje, sem quebrar quem não passa nada', () => {
  const minHoje = gratidaoAudioMinSegHoje(10); // 29 motivos * 2,5 = 73
  assert.equal(gratidaoEntregue({ texto: '', audioSeg: minHoje - 1, minSeg: minHoje }).ok, false);
  assert.equal(gratidaoEntregue({ texto: '', audioSeg: minHoje, minSeg: minHoje }).ok, true);
  assert.match(faltaDaGratidao({ texto: '', audioSeg: 5, minSeg: minHoje }), new RegExp(`fale mais ${minHoje - 5}s`));
});

test('diaCorridoDoCiclo conta dias corridos (fim de semana incluído), 1-indexado', () => {
  const inicio = new Date(2026, 8, 1); // 1º de setembro
  assert.equal(diaCorridoDoCiclo(new Date(2026, 8, 1), inicio), 1, 'o próprio dia do início é o dia 1');
  assert.equal(diaCorridoDoCiclo(new Date(2026, 8, 2), inicio), 2);
  assert.equal(diaCorridoDoCiclo(new Date(2026, 8, 30), inicio), 30, 'sábado/domingo contam — gratidão é todo dia');
});

test('a tela do ritual usa a meta de HOJE, não o piso fixo de 15s', () => {
  assert.match(RITUAL, /diaCorridoCiclo = 1/, 'a tela recebe o dia do ciclo, com um default seguro');
  assert.match(RITUAL, /metaMotivosGratidaoHoje\(diaCorridoCiclo\)/);
  assert.match(RITUAL, /gratidaoAudioMinSegHoje\(diaCorridoCiclo\)/);
  assert.match(RITUAL, /gratidaoEntregue\(\{ texto: gratidao, audioSeg: audioGratidaoSeg, minSeg: minSegHoje \}\)/);
  assert.match(RITUAL, /faltaDaGratidao\(\{ texto: gratidao, audioSeg: audioGratidaoSeg, minSeg: minSegHoje \}\)/);
  assert.match(RITUAL, /fale pelo menos \$\{metaMotivosHoje\} motivos hoje/, 'a instrução fala em MOTIVOS, não em segundos soltos');
  assert.ok(!/GRATIDAO_AUDIO_MIN_SEG/.test(RITUAL), 'a tela não volta a usar o piso fixo — sempre o de hoje');
});

test('o guia manda pegar o caderno da gratidão antes de gravar', () => {
  assert.match(RITUAL, /Pega o teu caderno da gratid[ãa]o/i);
});

test('CrmMetodo.jsx passa o dia corrido de verdade pra tela, não um valor solto', () => {
  assert.match(METODO, /diaCorridoCiclo=\{diaCorridoDoCiclo\(new Date\(\), inicioCicloOficial\(cicloConfig, new Date\(\)\)\)\}/);
});
