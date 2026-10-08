// 🎬 O MAESTRO DOS VÍDEOS (08/10/2026): um vídeo toca por vez, os outros ficam na foto,
// e a vez passa quando termina, estoura o tempo, falha ou o card sai da tela.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  estadoInicial, maestroReducer, elegiveis, proximoDaRoda, ambienteEconomico,
  TEMPO_MAXIMO_MS, ESPERA_PARA_COMECAR_MS,
} from '../src/lib/maestroDeVideos.js';

const roda = (acoes, inicio = estadoInicial()) => acoes.reduce(maestroReducer, inicio);
const tela = (ids, visiveis = ids) => roda([
  ...ids.map((id) => ({ tipo: 'registrar', id })),
  { tipo: 'ordenar', ids },
  ...visiveis.map((id) => ({ tipo: 'visivel', id, visivel: true })),
]);

test('os tempos são os combinados', () => {
  assert.equal(TEMPO_MAXIMO_MS, 15000);
  assert.ok(ESPERA_PARA_COMECAR_MS < TEMPO_MAXIMO_MS);
});

test('🔴 só UM card tem a vez: o primeiro visível; os outros ficam na foto', () => {
  const e = tela(['a', 'b', 'c']);
  assert.equal(e.ativo, 'a');
  assert.deepEqual(elegiveis(e), ['a', 'b', 'c']);
});

test('nada visível, ninguém toca; ao aparecer um, ele ganha a vez', () => {
  let e = tela(['a', 'b'], []);
  assert.equal(e.ativo, null);
  e = maestroReducer(e, { tipo: 'visivel', id: 'b', visivel: true });
  assert.equal(e.ativo, 'b', 'o único visível toca, mesmo não sendo o primeiro da ordem');
});

test('quando o vídeo termina, a vez passa para o próximo, em roda', () => {
  let e = tela(['a', 'b', 'c']);
  e = maestroReducer(e, { tipo: 'terminou', id: 'a' });
  assert.equal(e.ativo, 'b');
  e = maestroReducer(e, { tipo: 'terminou', id: 'b' });
  assert.equal(e.ativo, 'c');
  e = maestroReducer(e, { tipo: 'terminou', id: 'c' });
  assert.equal(e.ativo, 'a', 'o último devolve a vez ao primeiro');
});

test('o "terminou" de quem NÃO tem a vez é ignorado (vídeo atrasado não rouba a vez)', () => {
  const e = tela(['a', 'b', 'c']);
  assert.equal(maestroReducer(e, { tipo: 'terminou', id: 'c' }), e);
});

test('com um único vídeo na tela, ele recomeça: a rodada sobe', () => {
  let e = tela(['a']);
  const r0 = e.rodada;
  e = maestroReducer(e, { tipo: 'terminou', id: 'a' });
  assert.equal(e.ativo, 'a');
  assert.ok(e.rodada > r0, 'a rodada sobe para o card recomeçar do início');
});

test('o card ativo sai da tela: a vez passa para o próximo visível', () => {
  let e = tela(['a', 'b', 'c']);
  e = maestroReducer(e, { tipo: 'visivel', id: 'a', visivel: false });
  assert.equal(e.ativo, 'b');
});

test('card que não está visível não recebe a vez, mesmo sendo o próximo', () => {
  let e = tela(['a', 'b', 'c'], ['a', 'c']);
  e = maestroReducer(e, { tipo: 'terminou', id: 'a' });
  assert.equal(e.ativo, 'c', 'o b está fora da tela');
});

test('🔴 vídeo que FALHA passa a vez na hora e não volta a ser escolhido', () => {
  let e = tela(['a', 'b', 'c']);
  e = maestroReducer(e, { tipo: 'falhou', id: 'a' });
  assert.equal(e.ativo, 'b');
  e = maestroReducer(e, { tipo: 'terminou', id: 'b' });
  e = maestroReducer(e, { tipo: 'terminou', id: 'c' });
  assert.equal(e.ativo, 'b', 'o a falhou e foi pulado na roda');
  assert.deepEqual(elegiveis(e), ['b', 'c']);
});

test('🔴 se falha o do MEIO, a vez vai para o SEGUINTE, não volta ao primeiro (o defeito que a tela pegou)', () => {
  let e = tela(['a', 'b', 'c']);
  e = maestroReducer(e, { tipo: 'terminou', id: 'a' });
  assert.equal(e.ativo, 'b');
  e = maestroReducer(e, { tipo: 'falhou', id: 'b' });
  assert.equal(e.ativo, 'c', 'o a tocaria duas vezes seguidas e o c ficaria sem a vez');
});

test('🔴 se o card da vez SAI DA TELA, a vez vai para o seguinte na ordem, não para o primeiro', () => {
  let e = tela(['a', 'b', 'c', 'd']);
  e = maestroReducer(e, { tipo: 'terminou', id: 'a' });
  e = maestroReducer(e, { tipo: 'terminou', id: 'b' });
  assert.equal(e.ativo, 'c');
  e = maestroReducer(e, { tipo: 'visivel', id: 'c', visivel: false });
  assert.equal(e.ativo, 'd');
});

test('quem perdeu a vez era o ÚLTIMO da ordem: a roda dá a volta e o primeiro assume', () => {
  let e = tela(['a', 'b', 'c']);
  e = maestroReducer(e, { tipo: 'terminou', id: 'a' });
  e = maestroReducer(e, { tipo: 'terminou', id: 'b' });
  e = maestroReducer(e, { tipo: 'falhou', id: 'c' });
  assert.equal(e.ativo, 'a');
});

test('se todos falham, ninguém toca e nada trava', () => {
  let e = tela(['a', 'b']);
  e = roda([{ tipo: 'falhou', id: 'a' }, { tipo: 'falhou', id: 'b' }], e);
  assert.equal(e.ativo, null);
});

test('a pessoa toca no vídeo de um card: ele assume a vez agora (mesmo sem estar na fila)', () => {
  let e = tela(['a', 'b', 'c']);
  e = maestroReducer(e, { tipo: 'assumir', id: 'c' });
  assert.equal(e.ativo, 'c');
  e = maestroReducer(e, { tipo: 'terminou', id: 'c' });
  assert.equal(e.ativo, 'a', 'depois do assumido, a roda segue');
});

test('"tocando" só vale para o card ativo', () => {
  let e = tela(['a', 'b']);
  assert.equal(e.tocando, false);
  assert.equal(maestroReducer(e, { tipo: 'tocando', id: 'b' }).tocando, false);
  e = maestroReducer(e, { tipo: 'tocando', id: 'a' });
  assert.equal(e.tocando, true);
  e = maestroReducer(e, { tipo: 'terminou', id: 'a' });
  assert.equal(e.tocando, false, 'a vez mudou: o novo ativo ainda não começou');
});

test('aba em segundo plano pausa; ao voltar, retoma', () => {
  let e = tela(['a']);
  e = maestroReducer(e, { tipo: 'pausar' });
  assert.equal(e.pausado, true);
  assert.equal(maestroReducer(e, { tipo: 'pausar' }), e);
  e = maestroReducer(e, { tipo: 'retomar' });
  assert.equal(e.pausado, false);
});

test('o som é da visita inteira: ligado uma vez, vale para os próximos vídeos', () => {
  let e = tela(['a', 'b']);
  assert.equal(e.som, false, 'nasce MUDO — som só pelo ícone');
  e = maestroReducer(e, { tipo: 'som', ligado: true });
  e = maestroReducer(e, { tipo: 'terminou', id: 'a' });
  assert.equal(e.som, true);
  assert.equal(e.ativo, 'b');
  e = maestroReducer(e, { tipo: 'som', ligado: false });
  assert.equal(e.som, false);
});

test('card que sai da tela some da roda, sem sobrar vez para ele', () => {
  let e = tela(['a', 'b']);
  e = maestroReducer(e, { tipo: 'sair', id: 'a' });
  assert.equal(e.ativo, 'b');
  assert.deepEqual(e.ordem, ['b']);
});

test('ações desconhecidas e ids desconhecidos não derrubam nada', () => {
  const e = tela(['a']);
  assert.equal(maestroReducer(e, { tipo: 'invento' }), e);
  assert.equal(maestroReducer(e, { tipo: 'visivel', id: 'zzz', visivel: true }), e);
  assert.equal(maestroReducer(e, { tipo: 'falhou', id: 'zzz' }), e);
  assert.equal(maestroReducer(e, { tipo: 'assumir', id: 'zzz' }), e);
});

test('proximoDaRoda', () => {
  assert.equal(proximoDaRoda([], 'a'), null);
  assert.equal(proximoDaRoda(['a', 'b'], 'a'), 'b');
  assert.equal(proximoDaRoda(['a', 'b'], 'b'), 'a');
  assert.equal(proximoDaRoda(['a', 'b'], 'x'), 'a');
  // quem perdeu a vez (não está mais na lista) é procurado na ORDEM COMPLETA
  assert.equal(proximoDaRoda(['a', 'c'], 'b', ['a', 'b', 'c']), 'c');
  assert.equal(proximoDaRoda(['a', 'b'], 'c', ['a', 'b', 'c']), 'a');
});

test('ambiente econômico: economia de dados, 2G ou movimento reduzido', () => {
  assert.equal(ambienteEconomico({}), false);
  assert.equal(ambienteEconomico({ prefereMenosMovimento: true }), true);
  assert.equal(ambienteEconomico({ conexao: { saveData: true } }), true);
  assert.equal(ambienteEconomico({ conexao: { effectiveType: '2g' } }), true);
  assert.equal(ambienteEconomico({ conexao: { effectiveType: '4g' } }), false);
});
