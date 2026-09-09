// 🔎 A FILA DE COMPROVAÇÕES DO ADM X-GAME (DIR-124, 09/09/2026) — dono:
// "eu preciso separar por data... data de comprovação, nome das pessoas...
// ainda precisa ter uma busca, quando eu fizer buscar mais rápido, tanto a
// data e tanto o dia."
import test from 'node:test';
import assert from 'node:assert/strict';
import { comprovacaoBateNaBusca, agruparComprovacoesPorData, rotuloDataComprovacao, ddmmDaData, semAcentoFila } from '../src/lib/filaComprovacoes.js';

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
