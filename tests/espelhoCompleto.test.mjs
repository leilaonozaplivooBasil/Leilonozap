// 🪞🔗 O ESPELHO COMPLETO entre quadro, dia e Lista de Networking (25/09/2026).
//
// Dono: "os cards do quadro estão integrados com a lista e os contatos? o que
// faço no quadro também reflete lá?" — até aqui só o FEITO viajava entre card
// e tarefa. Agora: título e horário nos dois sentidos, exclusão com pergunta,
// o card volta pro Aberto quando a tarefa some, a Lista de Networking mostra
// "no quadro: N · no dia: M" por pessoa (e abre o quadro filtrado), e o chip
// do card mostra o nome VIVO da pessoa.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { camposDoCardParaTarefa, camposDaTarefaParaCard, cardSemTarefa } from '../src/lib/espelhoDoDia.js';
import { contagemNoQuadro, rotuloNoQuadro, pessoasDosCartoes, nomeVivoDoLead } from '../src/lib/leadDoQuadro.js';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));

test('🪞 card → tarefa: só o que MUDOU viaja (título, hora, hora_fim), e só com o par ligado', () => {
  const antes = { id: 'c1', virou_tarefa_id: 't1', titulo: 'Reunião', hora: '11:00', hora_fim: null };
  assert.deepEqual(camposDoCardParaTarefa(antes, { ...antes, hora: '13:00' }), { tarefaId: 't1', campos: { hora: '13:00' } });
  assert.deepEqual(camposDoCardParaTarefa(antes, { ...antes, titulo: 'Reunião com o financeiro', hora_fim: '12:00' }), { tarefaId: 't1', campos: { titulo: 'Reunião com o financeiro', hora_fim: '12:00' } });
  assert.equal(camposDoCardParaTarefa(antes, { ...antes }), null, 'nada mudou, nada grava — é o que corta o laço');
  assert.equal(camposDoCardParaTarefa(antes, { ...antes, coluna: 'feito' }), null, 'feito é do outro espelho');
  assert.equal(camposDoCardParaTarefa({ ...antes, virou_tarefa_id: null }, { ...antes, virou_tarefa_id: null, hora: '13:00' }), null, 'sem par não espelha');
  assert.equal(camposDoCardParaTarefa(antes, { ...antes, id: 'c2', hora: '13:00' }), null, 'card trocado no meio do caminho não espelha');
  assert.deepEqual(camposDoCardParaTarefa(antes, { ...antes, hora: '' }), { tarefaId: 't1', campos: { hora: null } }, 'tirar a hora também viaja (sai da Jornada)');
  assert.equal(camposDoCardParaTarefa(antes, { ...antes, titulo: '' }), null, 'título vazio não viaja');
  assert.equal(camposDoCardParaTarefa(null, antes), null);
});

test('🪞 tarefa → card: a mesma régua, na volta', () => {
  const t = { id: 't1', titulo: 'Reunião', hora: '11:00' };
  assert.deepEqual(camposDaTarefaParaCard(t, { ...t, titulo: 'Reunião (sala 2)', hora: '14:00' }), { tarefaId: 't1', campos: { titulo: 'Reunião (sala 2)', hora: '14:00' } });
  assert.equal(camposDaTarefaParaCard(t, { ...t }), null);
  assert.equal(camposDaTarefaParaCard(t, { ...t, feito: true }), null, 'feito é do outro espelho');
  assert.equal(camposDaTarefaParaCard(t, { ...t, id: 't2', hora: '14:00' }), null);
  // a tarefa apagada do dia: o card volta pro Aberto, sem vínculo — NÃO some (é o backlog)
  assert.deepEqual(cardSemTarefa(), { virou_tarefa_id: null, virou_tarefa_em: null, coluna: 'aberto', feito_em: null });
});

test('🔗 a Lista vê o quadro: "no quadro: N · no dia: M" por pessoa, feitos fora', () => {
  const cards = [
    { id: 'a', cliente_id: 'p1', coluna: 'aberto', virou_tarefa_id: 't1' },
    { id: 'b', cliente_id: 'p1', coluna: 'aberto', virou_tarefa_id: null },
    { id: 'c', cliente_id: 'p1', coluna: 'feito', virou_tarefa_id: 't9' },
    { id: 'd', cliente_id: 'p2', coluna: 'aberto', virou_tarefa_id: 't7' },
    { id: 'e', cliente_id: null, coluna: 'aberto' },
    null,
  ];
  const m = contagemNoQuadro(cards, [{ id: 't1' }, { id: 't2' }]);
  assert.deepEqual(m.get('p1'), { abertos: 2, noDia: 1, feitos: 1 });
  assert.deepEqual(m.get('p2'), { abertos: 1, noDia: 0, feitos: 0 }, 't7 não é de hoje');
  assert.equal(m.has('null'), false);
  assert.equal(rotuloNoQuadro(m.get('p1')), 'no quadro: 2 · no dia: 1');
  assert.equal(rotuloNoQuadro(m.get('p2')), 'no quadro: 1');
  assert.equal(rotuloNoQuadro({ abertos: 0, noDia: 0, feitos: 3 }), null, 'só feitos: sem pílula');
  assert.equal(rotuloNoQuadro(undefined), null);
  assert.deepEqual(pessoasDosCartoes(cards), ['p1', 'p2']);
});

test('🔗 o chip do card mostra o nome VIVO; pessoa apagada vira "removido"; sem resposta, a cópia', () => {
  const card = { cliente_id: 'p1', cliente_nome: 'Luiz Francisco' };
  assert.deepEqual(nomeVivoDoLead(card, null), { nome: 'Luiz Francisco', removido: false }, 'lista ainda não respondeu');
  assert.deepEqual(nomeVivoDoLead(card, new Map()), { nome: 'Luiz Francisco', removido: false }, 'não perguntou por ele');
  assert.deepEqual(nomeVivoDoLead(card, new Map([['p1', { full_name: 'Luiz F. Santanna' }]])), { nome: 'Luiz F. Santanna', removido: false }, 'renomeou na Lista: o chip acompanha');
  assert.deepEqual(nomeVivoDoLead(card, new Map([['p1', null]])), { nome: 'Luiz Francisco', removido: true }, 'apagado da Lista');
  assert.deepEqual(nomeVivoDoLead({ cliente_id: null }, new Map()), { nome: null, removido: false });
});

test('🔴 as telas ligam os fios: quadro grava na tarefa, o dia grava no card, a Lista abre o quadro filtrado', () => {
  const Q = ler('../src/components/licensing/CentralVendas/QuadroCompromisso.jsx');
  assert.match(Q, /const camposEspelho = camposDoCardParaTarefa\(antes, cartaoNovo\)/);
  assert.match(Q, /titulo: antigo\.titulo, hora: antigo\.hora, hora_fim: antigo\.hora_fim/, 'o "antes" precisa carregar os campos espelhados');
  assert.match(Q, /from\('metodo_tarefas'\)\.update\(camposEspelho\.campos\)\.eq\('id', camposEspelho\.tarefaId\)/);
  assert.match(Q, /window\.confirm\(`"\$\{cartao\.titulo\}" está no seu dia\. Tirar da Jornada e da Lista também\?`\)/);
  assert.match(Q, /from\('metodo_tarefas'\)\.delete\(\)\.eq\('id', cartao\.virou_tarefa_id\)/);
  assert.match(Q, /cartoesDaLista\(cartoesVisiveis, lista\.id\)/); assert.match(Q, /data-teste="filtro-cliente"/);
  assert.match(Q, /from\('customers'\)\.select\('id,full_name'\)\.in\('id', ids\)/, 'uma consulta pra todos os nomes');
  assert.match(Q, /<ClientesVivosContext\.Provider value=\{clientesVivos\}>/);
  const L = ler('../src/components/licensing/CentralVendas/LeadDoCartao.jsx');
  assert.match(L, /useContext\(ClientesVivosContext\)/); assert.match(L, /nomeVivoDoLead\(cartao, vivos\)/); assert.ok(L.includes('data-teste="lead-removido"'));
  assert.doesNotMatch(L, /Customer\.list\(\)[\s\S]{0,80}useEffect/, 'o chip continua sem buscar no mount, card a card');
  const C = ler('../src/components/licensing/CentralVendas/CrmMetodo.jsx');
  assert.match(C, /camposDaTarefaParaCard\(t, \{ \.\.\.t, titulo, hora \}\)/);
  assert.match(C, /from\('metodo_quadro'\)\.update\(espelhoCard\.campos\)\.eq\('virou_tarefa_id', t\.id\)/);
  assert.match(C, /from\('metodo_quadro'\)\.update\(\{ hora: nova \}\)\.eq\('virou_tarefa_id', movida\.id\)/, 'arrastar na Jornada leva a hora pro card');
  assert.match(C, /from\('metodo_quadro'\)\.update\(cardSemTarefa\(\)\)\.eq\('virou_tarefa_id', t\.id\)/, 'apagar a tarefa devolve o card pro Aberto');
  assert.ok(C.includes('data-teste="lead-da-tarefa"')); assert.ok(C.includes('data-teste="pessoa-no-quadro"'));
  assert.match(C, /clienteFiltro=\{clienteNoQuadro\}/); assert.match(C, /onTarefaRemovida=\{\(id\) => setTarefas/);
  assert.match(C, /onTarefaEspelhada=\{\(\{ tarefaId, feito, campos \}\)/, 'o espelho de volta aceita campos, não só feito');
});
