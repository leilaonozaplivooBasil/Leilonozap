// mensagensXgame — a mensagem pro CEO/Diretoria/Executivos e as demandas
// entre colegas. Dono, 09/09/2026: "eles precisam entender que pra falar
// com o CEO, precisa, não pode ser bobeira, tá?"
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DESTINOS, TIPOS_MENSAGEM, TIPOS_COMPOSIVEIS, TAMANHO_MINIMO_TEXTO, TAMANHO_MINIMO_RESPOSTA,
  mensagemValida, respostaValida,
  ordenarMensagens, contarNaoLidas, mensagensRecebidasPor, mensagensEnviadasPor, papeisDoCargo,
} from '../src/lib/mensagensXgame.js';

test('mensagemValida: exige destino, tipo e um mínimo de texto — "não pode ser bobeira"', () => {
  assert.equal(mensagemValida({}).ok, false);
  assert.equal(mensagemValida({ destinoTipo: 'ceo', tipo: 'sugestao', texto: 'oi' }).ok, false, 'texto curto demais não pode ir pro CEO');
  assert.equal(mensagemValida({ destinoTipo: 'marte', tipo: 'sugestao', texto: 'x'.repeat(30) }).ok, false, 'destino inválido');
  assert.equal(mensagemValida({ destinoTipo: 'ceo', tipo: 'invalido', texto: 'x'.repeat(30) }).ok, false, 'tipo inválido');
  assert.equal(mensagemValida({ destinoTipo: 'ceo', tipo: 'aviso', texto: 'x'.repeat(30) }).ok, false, '"aviso" e "resposta" são gerados pelo sistema, não escolhíveis ao compor');
  assert.equal(mensagemValida({ destinoTipo: 'ceo', tipo: 'sugestao', texto: 'x'.repeat(TAMANHO_MINIMO_TEXTO) }).ok, true, 'no mínimo exato já vale');
  assert.equal(mensagemValida({ destinoTipo: 'diretoria', tipo: 'agradecimento', texto: 'Muito obrigado pelo apoio no fechamento do mês, fez toda diferença pra mim.' }).ok, true);
});

test('respostaValida: barra mais baixa — responder não é o mesmo esforço de iniciar contato com o CEO', () => {
  assert.equal(respostaValida('').ok, false);
  assert.equal(respostaValida('  ').ok, false);
  assert.equal(respostaValida('ok').ok, false, 'menor que o mínimo');
  assert.equal(respostaValida('x'.repeat(TAMANHO_MINIMO_RESPOSTA)).ok, true);
  assert.ok(TAMANHO_MINIMO_RESPOSTA < TAMANHO_MINIMO_TEXTO, 'responder tem que ser mais fácil que iniciar');
});

test('DESTINOS, TIPOS_MENSAGEM e TIPOS_COMPOSIVEIS: os quatro destinos, os seis tipos e os quatro que dá pra escolher ao compor', () => {
  assert.deepEqual(Object.keys(DESTINOS).sort(), ['ceo', 'diretoria', 'executivos', 'pessoa'].sort());
  assert.deepEqual(Object.keys(TIPOS_MENSAGEM).sort(), ['agradecimento', 'aviso', 'demanda', 'pedido', 'resposta', 'sugestao'].sort());
  assert.deepEqual(TIPOS_COMPOSIVEIS.sort(), ['agradecimento', 'demanda', 'pedido', 'sugestao'].sort());
});

test('ordenarMensagens: a mais nova primeiro', () => {
  const lista = [
    { id: 'a', created_at: '2026-09-01T10:00:00Z' },
    { id: 'b', created_at: '2026-09-05T10:00:00Z' },
    { id: 'c', created_at: '2026-09-03T10:00:00Z' },
  ];
  assert.deepEqual(ordenarMensagens(lista).map((m) => m.id), ['b', 'c', 'a']);
});

test('contarNaoLidas: só conta lida === false/undefined', () => {
  assert.equal(contarNaoLidas([{ lida: true }, { lida: false }, {}]), 2);
  assert.equal(contarNaoLidas([]), 0);
});

test('mensagensRecebidasPor: pessoa vê o que é PRA ELA + o que é pro papel que ela representa', () => {
  const lista = [
    { id: 'm1', destino_tipo: 'pessoa', destino_id: 'u1', texto: 'pra u1' },
    { id: 'm2', destino_tipo: 'pessoa', destino_id: 'u2', texto: 'pra u2 — não é dela' },
    { id: 'm3', destino_tipo: 'ceo', texto: 'pro CEO' },
    { id: 'm4', destino_tipo: 'executivos', texto: 'pros executivos' },
  ];
  const paraU1SemPapel = mensagensRecebidasPor(lista, { userId: 'u1', papeis: [] });
  assert.deepEqual(paraU1SemPapel.map((m) => m.id), ['m1']);

  const paraSuperAdmin = mensagensRecebidasPor(lista, { userId: 'admin', papeis: ['ceo', 'diretoria'] });
  assert.deepEqual(paraSuperAdmin.map((m) => m.id), ['m3']);

  const paraExecutivo = mensagensRecebidasPor(lista, { userId: 'u9', papeis: ['executivos'] });
  assert.deepEqual(paraExecutivo.map((m) => m.id), ['m4']);
});

test('mensagensEnviadasPor: só as que a pessoa mandou', () => {
  const lista = [
    { id: 'm1', remetente_id: 'u1' },
    { id: 'm2', remetente_id: 'u2' },
  ];
  assert.deepEqual(mensagensEnviadasPor(lista, 'u1').map((m) => m.id), ['m1']);
});

test('papeisDoCargo: traduz o cargo do jogo pro destino coletivo que a pessoa representa', () => {
  assert.deepEqual(papeisDoCargo('ceo'), ['ceo']);
  assert.deepEqual(papeisDoCargo('diretor'), ['diretoria']);
  assert.deepEqual(papeisDoCargo('executivo'), ['executivos']);
  assert.deepEqual(papeisDoCargo('outro'), []);
});
