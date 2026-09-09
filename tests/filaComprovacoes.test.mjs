// 🔎 A FILA DE COMPROVAÇÕES DO ADM X-GAME (DIR-124, 09/09/2026) — dono:
// "eu preciso separar por data... data de comprovação, nome das pessoas...
// ainda precisa ter uma busca, quando eu fizer buscar mais rápido, tanto a
// data e tanto o dia."
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { comprovacaoBateNaBusca, agruparComprovacoesPorData, agruparComprovacoesPorPessoa, rotuloDataComprovacao, ddmmDaData, semAcentoFila } from '../src/lib/filaComprovacoes.js';

const XGAME_ADMIN = fs.readFileSync(new URL('../src/components/licensing/XGameAdmin.jsx', import.meta.url), 'utf8');
const COMPROVACOES = fs.readFileSync(new URL('../src/components/licensing/CentralVendas/Comprovacoes.jsx', import.meta.url), 'utf8');

test('semAcentoFila: tira acento e maiúscula, igual "lu" acha Luciano/Lúcia/LUIZ', () => {
  assert.equal(semAcentoFila('Luciano'), 'luciano');
  assert.equal(semAcentoFila('Lúcia'), 'lucia');
  assert.equal(semAcentoFila('LUIZ'), 'luiz');
  assert.equal(semAcentoFila(null), '');
});

test('ddmmDaData: a data ISO em dd/mm, o formato que a pessoa digita pra buscar', () => {
  assert.equal(ddmmDaData('2026-09-09'), '09/09');
  assert.equal(ddmmDaData('2026-01-31'), '31/01');
});

test('comprovacaoBateNaBusca: busca vazia sempre bate (mostra tudo)', () => {
  assert.equal(comprovacaoBateNaBusca({ data: '2026-09-09' }, 'Luciano Pinheiro', ''), true);
  assert.equal(comprovacaoBateNaBusca({ data: '2026-09-09' }, 'Luciano Pinheiro', '   '), true);
});

test('comprovacaoBateNaBusca: acha pelo NOME, sem acento/maiúscula', () => {
  assert.equal(comprovacaoBateNaBusca({ data: '2026-09-09' }, 'Luciano Pinheiro', 'luciano'), true);
  assert.equal(comprovacaoBateNaBusca({ data: '2026-09-09' }, 'Luciano Pinheiro', 'LUCIANO'), true);
  assert.equal(comprovacaoBateNaBusca({ data: '2026-09-09' }, 'Luciano Pinheiro', 'pinheiro'), true);
  assert.equal(comprovacaoBateNaBusca({ data: '2026-09-09' }, 'Luciano Pinheiro', 'karen'), false);
});

test('comprovacaoBateNaBusca: acha pela DATA, digitando dd/mm', () => {
  assert.equal(comprovacaoBateNaBusca({ data: '2026-09-09' }, 'Luciano Pinheiro', '09/09'), true);
  assert.equal(comprovacaoBateNaBusca({ data: '2026-09-08' }, 'Luciano Pinheiro', '09/09'), false);
  // 🎯 dono: "tanto a data e tanto o dia" — só o dia (sem o mês) também acha
  assert.equal(comprovacaoBateNaBusca({ data: '2026-09-09' }, 'Luciano Pinheiro', '09'), true);
});

test('agruparComprovacoesPorData: junta quem tem a mesma data, sem reordenar', () => {
  const lista = [
    { id: 1, data: '2026-09-09' },
    { id: 2, data: '2026-09-08' },
    { id: 3, data: '2026-09-09' },
    { id: 4, data: '2026-09-07' },
  ];
  const grupos = agruparComprovacoesPorData(lista);
  assert.deepEqual(grupos.map(([data]) => data), ['2026-09-09', '2026-09-08', '2026-09-07'], 'a ordem dos GRUPOS segue a ordem de chegada da lista (que já vem DESC do banco)');
  assert.deepEqual(grupos[0][1].map((t) => t.id), [1, 3], 'os dois itens do dia 09 ficam juntos, na ordem em que chegaram');
  assert.equal(grupos[1][1].length, 1);
  assert.equal(grupos[2][1].length, 1);
});

test('agruparComprovacoesPorData: lista vazia não quebra, devolve vazio', () => {
  assert.deepEqual(agruparComprovacoesPorData([]), []);
  assert.deepEqual(agruparComprovacoesPorData(), []);
});

test('rotuloDataComprovacao: "dd/mm · dia da semana" — o cabeçalho de cada grupo', () => {
  // 2026-09-09 é uma quarta-feira
  assert.equal(rotuloDataComprovacao('2026-09-09'), '09/09 · quarta-feira');
});

test('rotuloDataComprovacao: data inválida não quebra, devolve o que recebeu', () => {
  assert.equal(rotuloDataComprovacao('lixo'), 'lixo');
  assert.equal(rotuloDataComprovacao(''), '');
});

// 👤 dono, olhando a fila de um dia só com várias pessoas misturadas: "eu
// quero já separado por datas e por nomes... nome das pessoas que estão
// participando."
test('agruparComprovacoesPorPessoa: dentro do dia, junta quem é a mesma pessoa, sem reordenar', () => {
  const doDia = [
    { id: 1, user_id: 'jean' },
    { id: 2, user_id: 'paim' },
    { id: 3, user_id: 'jean' },
    { id: 4, user_id: 'emmanuel' },
    { id: 5, user_id: 'jean' },
  ];
  const nomeDe = (id) => ({ jean: 'Jean David', paim: 'Paim', emmanuel: 'Emmanuel Lima' })[id] || id;
  const grupos = agruparComprovacoesPorPessoa(doDia, nomeDe);
  assert.deepEqual(grupos.map(([id]) => id), ['jean', 'paim', 'emmanuel'], 'a ordem das PESSOAS segue a ordem de chegada, igual a de data');
  assert.deepEqual(grupos[0], ['jean', 'Jean David', [doDia[0], doDia[2], doDia[4]]], 'as 3 comprovações do Jean ficam juntas, com o nome já resolvido');
  assert.equal(grupos[1][2].length, 1);
  assert.equal(grupos[2][2].length, 1);
});

test('agruparComprovacoesPorPessoa: lista vazia não quebra, devolve vazio; sem nomeDe usa o próprio id', () => {
  assert.deepEqual(agruparComprovacoesPorPessoa([]), []);
  assert.deepEqual(agruparComprovacoesPorPessoa(), []);
  const grupos = agruparComprovacoesPorPessoa([{ id: 1, user_id: 'abc123' }]);
  assert.deepEqual(grupos, [['abc123', 'abc123', [{ id: 1, user_id: 'abc123' }]]]);
});

test('XGameAdmin.jsx: dentro de cada dia, a fila também agrupa por pessoa', () => {
  assert.match(XGAME_ADMIN, /import \{ comprovacaoBateNaBusca, agruparComprovacoesPorData, agruparComprovacoesPorPessoa, rotuloDataComprovacao \} from '@\/lib\/filaComprovacoes'/);
  assert.match(XGAME_ADMIN, /agruparComprovacoesPorPessoa\(itens, nomeDe\)\.map/);
  assert.match(XGAME_ADMIN, /data-teste="comprovacoes-cabecalho-pessoa"/);
  // o nome não pode mais repetir em cada linha — já está no subcabeçalho
  assert.ok(!/\{nomeDe\(t\.user_id\)\} · \{t\.hora\}/.test(XGAME_ADMIN), 'o nome sumiu do subcabeçalho mas ainda repete na linha — duplicado');
});

test('Comprovacoes.jsx: dentro de cada dia, a fila geral também agrupa por pessoa (a fila de UMA pessoa não precisa)', () => {
  assert.match(COMPROVACOES, /import \{ comprovacaoBateNaBusca, agruparComprovacoesPorData, agruparComprovacoesPorPessoa, rotuloDataComprovacao \} from '@\/lib\/filaComprovacoes'/);
  assert.match(COMPROVACOES, /agruparComprovacoesPorPessoa\(itens, nomeDe\)/);
  assert.match(COMPROVACOES, /data-teste="comprovacoes-cabecalho-pessoa"/);
  // a fila de uma pessoa (pessoaId) nunca mostrava o nome por linha — segue sem mostrar, e sem subcabeçalho também
  assert.match(COMPROVACOES, /pessoaId \? \[\[pessoaId, null, itens\]\]/, 'pra uma pessoa só, não tem por que quebrar em subgrupos');
});
