// 🎴 A capa das visões do Compromisso — DIR-183 (24/09/2026)
//
// Dono: "eu preciso da mesma função igual os 08 Hábitos do Sucesso: quando eu
// clicar em Jornada vai sumir os outros, sumir a moeda, sumir TUDO e aparecer
// só o card... e ter a página principal onde aparecem as moedas."
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import {
  ORDEM_DAS_VISOES, CHAVE_ULTIMA_VISAO, AVISOS_QUE_FURAM, visaoValida, rotuloDaVisao,
  vizinhasDaVisao, numeroDaVisao, visaoDeEntrada, furaOFoco, lerUltimaVisao, gravarUltimaVisao,
} from '../src/lib/capaDasVisoes.js';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));
// um localStorage de mentira, pra não depender de navegador
const armazemFalso = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m };
};

test('as cinco visões, na ordem da tela, e a chave do aparelho', () => {
  assert.deepEqual(ORDEM_DAS_VISOES, ['jornada', 'lista', 'quadro', 'mapa', 'demandas']);
  assert.equal(CHAVE_ULTIMA_VISAO, 'nz_ultima_visao');
  // 🔒 a ordem vem de DESTINOS_DO_ATALHO: a estrela ⭐ e o ‹ › não podem
  // discordar sobre o que existe
  assert.equal(rotuloDaVisao('demandas'), 'Demandas');
  assert.equal(rotuloDaVisao('nada'), '');
});

test('visão inválida é a CAPA (null), nunca um chute', () => {
  assert.equal(visaoValida('jornada'), 'jornada');
  assert.equal(visaoValida('  QUADRO  '), 'quadro');
  assert.equal(visaoValida('inventada'), null);
  assert.equal(visaoValida(null), null);
  assert.equal(visaoValida(''), null);
  assert.equal(visaoValida(undefined), null);
});

test('o ‹ › dá a volta — a última puxa a primeira, e a primeira puxa a última', () => {
  assert.deepEqual(vizinhasDaVisao('jornada'), { anterior: 'demandas', proxima: 'lista' });
  assert.deepEqual(vizinhasDaVisao('quadro'), { anterior: 'lista', proxima: 'mapa' });
  assert.deepEqual(vizinhasDaVisao('demandas'), { anterior: 'mapa', proxima: 'jornada' });
  // na capa não há pra onde ir de lado
  assert.deepEqual(vizinhasDaVisao(null), { anterior: null, proxima: null });
  assert.deepEqual(vizinhasDaVisao('inventada'), { anterior: null, proxima: null });
});

test('o número da visão, 1 a 5; a capa é 0', () => {
  assert.equal(numeroDaVisao('jornada'), 1);
  assert.equal(numeroDaVisao('demandas'), 5);
  assert.equal(numeroDaVisao(null), 0);
});

test('onde a tela abre: a URL manda, depois o aparelho, e só então a capa', () => {
  // a URL vence a memória — é o que um link compartilhado (e o atalho ⭐) promete
  assert.equal(visaoDeEntrada({ daUrl: 'quadro', doAparelho: 'lista' }), 'quadro');
  // sem URL, vale o que a pessoa abriu por último neste aparelho
  assert.equal(visaoDeEntrada({ daUrl: null, doAparelho: 'lista' }), 'lista');
  // URL com lixo NÃO derruba a memória
  assert.equal(visaoDeEntrada({ daUrl: 'zzz', doAparelho: 'mapa' }), 'mapa');
  // primeira vez: a capa
  assert.equal(visaoDeEntrada({}), null);
  assert.equal(visaoDeEntrada(), null);
});

test('a memória do aparelho grava, lê, e VOLTAR PRA CAPA apaga', () => {
  const a = armazemFalso();
  assert.equal(lerUltimaVisao(a), null);
  assert.equal(gravarUltimaVisao('mapa', a), 'mapa');
  assert.equal(lerUltimaVisao(a), 'mapa');
  // voltar pra capa apaga: reabrir a página não pode arrastar de volta pra dentro
  assert.equal(gravarUltimaVisao(null, a), null);
  assert.equal(a._m.has(CHAVE_ULTIMA_VISAO), false);
  assert.equal(lerUltimaVisao(a), null);
  // lixo não entra na memória
  gravarUltimaVisao('inventada', a);
  assert.equal(a._m.has(CHAVE_ULTIMA_VISAO), false);
});

test('aparelho sem storage não derruba a tela', () => {
  const quebrado = { getItem: () => { throw new Error('sem storage'); }, setItem: () => { throw new Error('sem storage'); }, removeItem: () => { throw new Error('sem storage'); } };
  assert.doesNotThrow(() => lerUltimaVisao(quebrado));
  assert.equal(lerUltimaVisao(quebrado), null);
  assert.doesNotThrow(() => gravarUltimaVisao('jornada', quebrado));
});

// 🚨 decisão do dono, com o custo na mesa: dentro da visão some tudo, MENOS os
//    dois avisos de hora marcada que custam o dia inteiro.
test('só o DIA ZERADO fura o foco — o resto fica na capa', () => {
  assert.deepEqual(AVISOS_QUE_FURAM, ['zerado-nao-votou', 'zerado-atraso']);
  assert.equal(furaOFoco('zerado-nao-votou'), true);
  assert.equal(furaOFoco('zerado-atraso'), true);
  assert.equal(furaOFoco('aviso-pronto'), false, 'o aviso âmbar não é perda de dia — fica na capa');
  assert.equal(furaOFoco('liberado'), false);
  assert.equal(furaOFoco(null), false);
  assert.equal(furaOFoco(undefined), false);
});

test('a tela usa a lib: dois estados, e o placar NÃO aparece dentro de uma visão', () => {
  const M = ler('../src/components/licensing/CentralVendas/CrmMetodo.jsx');
  assert.ok(M.includes("from '@/lib/capaDasVisoes'"), 'CrmMetodo não usa a lib da capa');
  assert.ok(M.includes('visaoDeEntrada('), 'a tela não decide a entrada pela lib');
  assert.ok(M.includes('gravarUltimaVisao(visao)'), 'a tela não lembra a última visão');
  assert.ok(M.includes('const naCapaDasVisoes = !visao'), 'não existe o estado "capa"');
  // ⛔ o que o dono pediu pra sumir: o placar só na capa
  assert.ok(M.includes('{naCapaDasVisoes ? ('), 'a capa não tem bloco próprio');
  assert.ok(M.includes('{xgame && naCapaDasVisoes && ('), 'o placar não ficou preso à capa');
  assert.ok(M.includes('somenteAlertaQueFura'), 'o DIA ZERADO não fura o foco dentro de uma visão');
  assert.ok(M.includes('<PortasDasVisoes'), 'faltam os quadrados da capa');
  assert.ok(M.includes('<BarraDaVisao'), 'falta a barra fina de dentro da visão');
  // a fileira antiga (que convivia com tudo) não pode ter sobrado
  assert.ok(!M.includes('<FaixaVisao'), 'a fileira antiga voltou — os dois estados viram um de novo');
});
