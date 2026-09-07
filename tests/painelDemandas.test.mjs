// 📋 A FILA DAS DEMANDAS DO TIME (07/09/2026) — o lado do dono do Tira Dúvidas.
//
// O TESTE QUE MAIS IMPORTA É A PONTE: quando um chamado vira trabalho, ele tem
// que virar linha em xperf_demandas — a MESMA tabela do Encontro — e não uma
// terceira lista de pendências que ninguém olha. E despachar duas vezes não
// pode criar duas tarefas pro mesmo problema.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ordenarFila, filtrarFila, resumoDaFila, estaEmAberto,
  demandaDoChamado, chamadoDespachado, ROTULO_STATUS, ROTULO_PRIORIDADE, STATUS,
} from '../src/lib/painelDemandas.js';

const ROTA = fs.readFileSync(new URL('../api/functions/despacharChamado.js', import.meta.url), 'utf8');
const TELA = fs.readFileSync(new URL('../src/pages/Demandas.jsx', import.meta.url), 'utf8');
const APP = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const ABAS = fs.readFileSync(new URL('../src/lib/licensingTabs.js', import.meta.url), 'utf8');

// o `...o` vem ANTES do id de propósito: espalhar depois sobrescrevia o
// `c1` pelo número cru e o teste comparava maçã com laranja
const ch = (o = {}) => ({ status: 'aberto', prioridade: 3, tipo: 'duvida', created_at: '2026-09-01T10:00:00Z', ...o, id: `c${o.id ?? 1}` });

// ── a ordem da fila ──────────────────────────────────────────────────
test('o que espera decisão vem primeiro, depois por prioridade, depois o mais novo', () => {
  const lista = [
    ch({ id: 1, prioridade: 3, created_at: '2026-09-01T10:00:00Z' }),
    ch({ id: 2, prioridade: 1, created_at: '2026-09-01T09:00:00Z' }),
    ch({ id: 3, status: 'resolvido', prioridade: 1, created_at: '2026-09-05T10:00:00Z' }),
    ch({ id: 4, prioridade: 3, created_at: '2026-09-02T10:00:00Z' }),
  ];
  assert.deepEqual(ordenarFila(lista).map((c) => c.id), ['c2', 'c4', 'c1', 'c3']);
});

test('ordenarFila não mexe no array original — senão a tela não redesenha', () => {
  const lista = [ch({ id: 1, prioridade: 5 }), ch({ id: 2, prioridade: 1 })];
  const antes = lista.map((c) => c.id);
  ordenarFila(lista);
  assert.deepEqual(lista.map((c) => c.id), antes);
});

test('entrada quebrada não derruba a fila', () => {
  assert.deepEqual(ordenarFila(), []);
  assert.deepEqual(ordenarFila(null), []);
  assert.equal(ordenarFila([ch({ id: 1, prioridade: null })]).length, 1);
});

test('estaEmAberto: só aberto e em análise ainda pedem decisão', () => {
  assert.equal(estaEmAberto({ status: 'aberto' }), true);
  assert.equal(estaEmAberto({ status: 'em_analise' }), true);
  for (const s of ['resolvido', 'virou_demanda', 'descartado']) {
    assert.equal(estaEmAberto({ status: s }), false, s);
  }
});

// ── filtros ──────────────────────────────────────────────────────────
test('filtro vazio não filtra nada — filtro que some com tudo é armadilha', () => {
  const lista = [ch({ id: 1 }), ch({ id: 2, status: 'resolvido' })];
  assert.equal(filtrarFila(lista, {}).length, 2);
  assert.equal(filtrarFila(lista).length, 2);
});

test('filtro "em_aberto" mostra só o que espera decisão', () => {
  const lista = [ch({ id: 1 }), ch({ id: 2, status: 'resolvido' }), ch({ id: 3, status: 'em_analise' })];
  assert.deepEqual(filtrarFila(lista, { status: 'em_aberto' }).map((c) => c.id), ['c1', 'c3']);
});

test('a busca varre relato, título, quem mandou e a resposta da IA', () => {
  const lista = [
    ch({ id: 1, pergunta: 'o botão não acende' }),
    ch({ id: 2, titulo: 'Print não sobe' }),
    ch({ id: 3, usuario_nome: 'Paim' }),
    ch({ id: 4, resposta: 'escreva mais 382 caracteres' }),
    ch({ id: 5, pergunta: 'nada a ver' }),
  ];
  assert.deepEqual(filtrarFila(lista, { busca: 'BOTÃO' }).map((c) => c.id), ['c1']);
  assert.deepEqual(filtrarFila(lista, { busca: 'paim' }).map((c) => c.id), ['c3']);
  assert.deepEqual(filtrarFila(lista, { busca: '382' }).map((c) => c.id), ['c4']);
  assert.equal(filtrarFila(lista, { busca: 'inexistente' }).length, 0);
});

test('filtro de tipo e de status combinam', () => {
  const lista = [ch({ id: 1, tipo: 'bug' }), ch({ id: 2, tipo: 'bug', status: 'resolvido' }), ch({ id: 3, tipo: 'duvida' })];
  assert.deepEqual(filtrarFila(lista, { tipo: 'bug', status: 'em_aberto' }).map((c) => c.id), ['c1']);
});

// ── o resumo do topo ─────────────────────────────────────────────────
test('o resumo conta só o que espera decisão — e separa problema de dúvida', () => {
  const lista = [
    ch({ id: 1, tipo: 'bug', prioridade: 1 }),
    ch({ id: 2, tipo: 'duvida', prioridade: 1 }),
    ch({ id: 3, tipo: 'bug', status: 'resolvido', prioridade: 1 }),
    ch({ id: 4, tipo: 'otimizacao' }),
  ];
  assert.deepEqual(resumoDaFila(lista), { total: 4, em_aberto: 3, problemas: 2, para_tudo: 2 });
});

test('fila vazia devolve zeros, não quebra', () => {
  assert.deepEqual(resumoDaFila([]), { total: 0, em_aberto: 0, problemas: 0, para_tudo: 0 });
  assert.deepEqual(resumoDaFila(), { total: 0, em_aberto: 0, problemas: 0, para_tudo: 0 });
});

// ── 🌉 A PONTE ───────────────────────────────────────────────────────
test('o chamado vira linha de xperf_demandas, com origem que a distingue do Encontro', () => {
  const linha = demandaDoChamado(
    ch({ id: 9, titulo: 'Botão de concluir travado', pergunta: 'não acende de jeito nenhum', usuario_nome: 'Paim' }),
    { pessoaId: 'u1', pessoaNome: 'Fulano', criadoPorId: 'dono', criadoPorNome: 'Dono', prazoDia: '2026-09-12' },
  );
  assert.ok(linha, 'não montou a demanda');
  assert.equal(linha.titulo, 'Botão de concluir travado');
  assert.equal(linha.pessoa_id, 'u1');
  assert.equal(linha.origem, 'tira_duvidas', 'sem isso não dá pra separar do que veio da reunião de segunda');
  assert.equal(linha.status, 'recebida');
  assert.ok(linha.prazo_em, 'ficou sem prazo');
});

test('a demanda leva junto as PALAVRAS de quem sofreu o problema', () => {
  const linha = demandaDoChamado(
    ch({ id: 9, titulo: 'Resumo', pergunta: 'digito e o contador não muda', usuario_nome: 'Paim' }),
    { pessoaId: 'u1' },
  );
  assert.match(linha.detalhe, /digito e o contador não muda/);
  assert.match(linha.detalhe, /Paim/);
});

test('demanda sem responsável NÃO é montada — é o problema que xperf_demandas evita', () => {
  assert.equal(demandaDoChamado(ch({ id: 1, titulo: 'x' }), { pessoaId: '' }), null);
  assert.equal(demandaDoChamado(ch({ id: 1, titulo: 'x' }), {}), null);
});

test('chamado sem título nenhum não vira demanda', () => {
  assert.equal(demandaDoChamado({ id: 'c1', titulo: '', pergunta: '  ' }, { pessoaId: 'u1' }), null);
  assert.equal(demandaDoChamado(null, { pessoaId: 'u1' }), null);
});

test('sem título mas com relato, o relato vira o título', () => {
  const linha = demandaDoChamado(ch({ id: 1, titulo: '', pergunta: 'a tela some' }), { pessoaId: 'u1' });
  assert.equal(linha.titulo, 'a tela some');
});

test('o respeito ao CHECK do banco: peso 1-6, status da lista, hábito 1-8', () => {
  const linha = demandaDoChamado(ch({ id: 1, titulo: 'Arrumar o print do estudo' }), { pessoaId: 'u1' });
  assert.ok(linha.peso >= 1 && linha.peso <= 6, `peso ${linha.peso} fora do CHECK`);
  assert.ok(['recebida', 'agendada', 'devolvida'].includes(linha.status));
  if (linha.habito != null) assert.ok(linha.habito >= 1 && linha.habito <= 8, `hábito ${linha.habito} fora do CHECK`);
});

test('chamadoDespachado marca o chamado e guarda o vínculo', () => {
  assert.deepEqual(chamadoDespachado('d1'), { status: 'virou_demanda', demanda_id: 'd1' });
  assert.deepEqual(chamadoDespachado(null), { status: 'virou_demanda', demanda_id: null });
  assert.ok(STATUS.includes(chamadoDespachado('d1').status));
});

// ── a rota ───────────────────────────────────────────────────────────
test('despachar duas vezes NÃO cria duas tarefas pro mesmo problema', () => {
  assert.match(ROTA, /if \(chamado\.demanda_id\) return res\.status\(200\)\.json\(\{ ok: true, jaDespachado: true/);
});

test('a rota valida status e prioridade antes de gravar', () => {
  assert.match(ROTA, /STATUS\.includes\(body\.status\)/);
  assert.match(ROTA, /p >= 1 && p <= 5/);
});

test('a rota usa a mesma ponte da lib, não monta a demanda por conta própria', () => {
  assert.match(ROTA, /demandaDoChamado\(chamado, \{/);
  assert.ok(!ROTA.includes("origem: 'tira_duvidas'"), 'a rota está montando a linha à mão');
});

test('demanda criada mas chamado não marcado: a tela é AVISADA, não enganada', () => {
  assert.match(ROTA, /avisoMarcacao/);
  assert.match(ROTA, /demanda foi criada, mas o chamado não ficou marcado/);
});

// ── a tela ───────────────────────────────────────────────────────────
test('a escrita passa pela rota — a tela nunca grava direto na tabela', () => {
  assert.ok(!/supabase\s*\n?\s*\.from\('suporte_chamados'\)[\s\S]{0,80}\.(insert|update|upsert|delete)/.test(TELA), 'a tela está gravando direto');
  assert.match(TELA, /fetch\(ROTA, \{/);
});

test('a página existe, é só de gestão, e está no menu do Admin', () => {
  assert.match(APP, /<Route path="\/Demandas"/);
  assert.match(APP, /allowedRoles=\{\['admin', 'super_admin'\]\}[\s\S]{0,80}<Demandas \/>/);
  assert.match(ABAS, /to: '\/Demandas', label: 'Demandas'/);
  // e o item do menu só nasce pra admin
  const trecho = ABAS.slice(ABAS.indexOf("to: '/Demandas'") - 300, ABAS.indexOf("to: '/Demandas'"));
  assert.match(trecho, /user\?\.role === 'admin' \|\| user\?\.role === 'super_admin'/);
});

test('os rótulos falam português de gente, não nome de coluna', () => {
  assert.equal(ROTULO_STATUS.em_analise, 'em análise');
  assert.equal(ROTULO_STATUS.virou_demanda, 'virou demanda');
  assert.equal(ROTULO_PRIORIDADE[1], 'para tudo');
  assert.equal(ROTULO_PRIORIDADE[5], 'quando der');
  for (const s of STATUS) assert.ok(ROTULO_STATUS[s], `status "${s}" sem rótulo em português`);
});

test('fila vazia explica de onde vêm os chamados, em vez de só dizer "vazio"', () => {
  assert.match(TELA, /Quando alguém usar o Tira Dúvidas no Guia do Usuário/);
});
