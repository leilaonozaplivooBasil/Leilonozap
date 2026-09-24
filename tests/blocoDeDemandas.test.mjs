// 📝 O BLOCO DE NOTAS RÁPIDO — o botão "D" do cabeçalho (24/09/2026).
//
// Dono: "Botão na aba da Top College do lado do ícone, deve ter um ícone de
// 'D' … de demanda, nela abre uma lista de demandas (em modal) que joga
// automaticamente para o quadro, lista e jornada. Como um atalho de 'bloco
// de notas rápido'."
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import {
  ORIGEM_BLOCO, EVENTO_ANOTACAO, MAX_TITULO, mostraBloco, demandaDoBloco, pecasDaAnotacao, fechamentoDaAnotacao, anotacoesRecentes, ondeFoiParar,
} from '../src/lib/blocoDeDemandas.js';
import { rotuloDaOrigem } from '../src/lib/demandas.js';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));

test('quem vê o "D": logado (régua do ícone da Top College) E dentro da Top College', () => {
  assert.equal(mostraBloco({ id: '1', email: 'a@b.c' }, true), true);
  // 24/09 (dono): "só pode aparecer nas áreas/telas/páginas da Top College"
  assert.equal(mostraBloco({ id: '1', email: 'a@b.c' }, false), false, 'fora da Top College não aparece');
  assert.equal(mostraBloco({ id: '1', email: 'a@b.c' }), false, 'sem bandeira = fora');
  assert.equal(mostraBloco({ id: '1', email: 'a@b.c' }, 'true'), false, 'string não é bandeira');
  assert.equal(mostraBloco({ id: '1' }, true), false);
  assert.equal(mostraBloco(null, true), false);
});

test('🎓 a bandeira "na Top College": quem levanta é o Licensing, quem lê é o cabeçalho', async () => {
  const { marcarTopCollege, estaNaTopCollege, assinarTopCollege, _zerarTopCollege } = await import('../src/lib/areaTopCollege.js');
  _zerarTopCollege();
  assert.equal(estaNaTopCollege(), false);
  let avisos = 0; const parar = assinarTopCollege(() => { avisos += 1; });
  marcarTopCollege(true); assert.equal(estaNaTopCollege(), true); assert.equal(avisos, 1);
  marcarTopCollege(true); assert.equal(avisos, 1, 'repetir o mesmo valor não avisa de novo');
  marcarTopCollege('sim'); assert.equal(estaNaTopCollege(), false, 'só true liga');
  parar(); marcarTopCollege(true); assert.equal(avisos, 2, 'depois de cancelar não avisa');
  _zerarTopCollege();
  // o Licensing levanta com o MESMO naTopCollege da faixa preta, e abaixa ao sair
  const L = ler('../src/pages/Licensing.jsx');
  assert.match(L, /const naTopCollege = activeTab === 'catalogo' && SECOES_TOP_COLLEGE\.some/);
  assert.match(L, /marcarTopCollege\(naTopCollege\);\s*return \(\) => marcarTopCollege\(false\);/);
  // o botão lê a bandeira pelo store, não pela URL
  const B = ler('../src/components/nav/BlocoDeDemandas.jsx');
  assert.match(B, /useSyncExternalStore\(assinarTopCollege, estaNaTopCollege/);
  assert.match(B, /mostraBloco\(currentUser, naTopCollege\)/);
  assert.doesNotMatch(B, /catalogTab|location\.search/);
});

test('a anotação vira uma demanda do bloco, com dono, peso neutro e status recebida', () => {
  const d = demandaDoBloco('  Ligar pro   fornecedor \n de caixas ', { pessoaId: 'u1', pessoaNome: 'Ana' });
  assert.deepEqual(d, {
    titulo: 'Ligar pro fornecedor de caixas', detalhe: null,
    pessoa_id: 'u1', pessoa_nome: 'Ana', origem: 'bloco',
    criado_por_id: 'u1', criado_por_nome: 'Ana', encontro_id: null, status: 'recebida', peso: 3,
  });
  assert.equal(ORIGEM_BLOCO, 'bloco');
  assert.equal(rotuloDaOrigem('bloco'), 'do bloco de notas');
});

test('🔴 sem texto ou sem dono, NADA nasce — uma demanda sem dono some em silêncio', () => {
  assert.equal(demandaDoBloco('', { pessoaId: 'u1' }), null);
  assert.equal(demandaDoBloco('   ', { pessoaId: 'u1' }), null);
  assert.equal(demandaDoBloco('x', {}), null);
  assert.equal(demandaDoBloco('x', { pessoaId: null }), null);
  assert.equal(demandaDoBloco('a'.repeat(400), { pessoaId: 'u1' }).titulo.length, MAX_TITULO);
});

test('as peças: tarefa de HOJE sem horário (Jornada + Lista) e card ligado a ela (Quadro)', () => {
  const demanda = { ...demandaDoBloco('Fechar o caixa', { pessoaId: 'u1', pessoaNome: 'Ana' }), id: 'd1' };
  const p = pecasDaAnotacao(demanda, { hojeISO: '2026-09-24', ordem: 5, nome: 'Ana' });
  assert.equal(p.tarefa.user_id, 'u1');
  assert.equal(p.tarefa.data, '2026-09-24');
  assert.equal(p.tarefa.hora, null, 'sem horário: entra flexível, a pessoa escolhe');
  assert.equal(p.tarefa.titulo, 'Fechar o caixa');
  assert.equal(p.tarefa.ordem, 5);
  assert.equal(p.tarefa.demanda_id, 'd1');
  assert.equal(p.tarefa.feito, false);
  // "pronto até 18:00" de Brasília = 21:00Z: o prazo é gravado em UTC
  assert.equal(new Date(p.tarefa.prazo_em).toISOString(), '2026-09-24T21:00:00.000Z');
  const card = p.card('t1');
  assert.equal(card.user_id, 'u1'); assert.equal(card.titulo, 'Fechar o caixa');
  assert.equal(card.virou_tarefa_id, 't1'); assert.equal(card.coluna, 'aberto');
  assert.equal(card.demanda_id, 'd1'); assert.equal(card.responsavel_nome, 'Ana');
  // sem id da demanda ou sem dia, não monta nada
  assert.equal(pecasDaAnotacao({ ...demanda, id: null }, { hojeISO: '2026-09-24' }), null);
  assert.equal(pecasDaAnotacao(demanda, {}), null);
});

test('o fechamento aponta a demanda pra tarefa e pro card, agendada pra hoje', () => {
  const f = fechamentoDaAnotacao({ tarefaId: 't1', cardId: 'c1', hojeISO: '2026-09-24', agora: new Date('2026-09-24T15:00:00Z') });
  assert.deepEqual(f, { status: 'agendada', agendada_para: '2026-09-24', tarefa_id: 't1', card_id: 'c1', updated_at: '2026-09-24T15:00:00.000Z' });
});

test('a lista do modal: só as do bloco, mais nova primeiro, no máximo 8, e diz onde cada uma foi parar', () => {
  const linhas = [
    { id: 1, origem: 'bloco', created_at: '2026-09-20T10:00:00Z', tarefa_id: 't', card_id: 'c' },
    { id: 2, origem: 'mapa', created_at: '2026-09-24T10:00:00Z' },
    { id: 3, origem: 'bloco', created_at: '2026-09-24T09:00:00Z', tarefa_id: 't' },
    { id: 4, origem: 'bloco', created_at: '2026-09-22T10:00:00Z', status: 'devolvida' },
  ];
  assert.deepEqual(anotacoesRecentes(linhas).map((d) => d.id), [3, 4, 1]);
  assert.equal(anotacoesRecentes(Array.from({ length: 12 }, (_, i) => ({ id: i, origem: 'bloco', created_at: `2026-09-${String(i + 1).padStart(2, '0')}` }))).length, 8);
  assert.equal(ondeFoiParar(linhas[0]), 'na jornada e no quadro');
  assert.equal(ondeFoiParar(linhas[2]), 'na jornada');
  assert.equal(ondeFoiParar({ card_id: 'c' }), 'no quadro');
  assert.equal(ondeFoiParar({}), 'só anotada');
  assert.equal(ondeFoiParar(linhas[3]), 'descartada');
});

test('🔴 o botão está no cabeçalho, colado à Top College, e as três telas recarregam ao anotar', () => {
  const L = ler('../src/Layout.jsx');
  assert.match(L, /import BlocoDeDemandas from "@\/components\/nav\/BlocoDeDemandas"/);
  const iTop = L.indexOf('<AtalhoTopCollege currentUser={currentUser}');
  const iD = L.indexOf('<BlocoDeDemandas currentUser={currentUser}');
  assert.ok(iTop > -1 && iD > iTop && iD - iTop < 400, 'o "D" tem que vir logo depois do ícone da Top College');
  const B = ler('../src/components/nav/BlocoDeDemandas.jsx');
  assert.match(B, /data-teste="botao-d-demandas"/);
  assert.match(B, /window\.dispatchEvent\(new Event\(EVENTO_ANOTACAO\)\)/);
  assert.equal(EVENTO_ANOTACAO, 'demandaAnotada');
  for (const [arq, fn] of [['CrmMetodo.jsx', 'carregarTarefas'], ['QuadroCompromisso.jsx', 'carregar'], ['DemandasCompromisso.jsx', 'carregar']]) {
    const s = ler(`../src/components/licensing/CentralVendas/${arq}`);
    assert.match(s, new RegExp(`window\\.addEventListener\\('demandaAnotada', ${fn}\\)`), `${arq} não recarrega quando o bloco anota`);
    assert.match(s, new RegExp(`window\\.removeEventListener\\('demandaAnotada', ${fn}\\)`), `${arq} não tira o ouvinte ao desmontar`);
  }
});

test('a ordem das gravações no modal: demanda → tarefa → card → fechamento (nunca fecha antes de existir trabalho)', () => {
  const B = ler('../src/components/nav/BlocoDeDemandas.jsx');
  const corpo = B.slice(B.indexOf('const anotar = async'), B.indexOf('const naTopCollege = useSyncExternalStore'));
  const ordem = ["from('xperf_demandas').insert(", "from('metodo_tarefas').insert(", "from('metodo_quadro').insert(", "from('xperf_demandas').update("].map((x) => corpo.indexOf(x));
  assert.ok(ordem.every((i) => i > -1), 'faltou uma das quatro gravações');
  assert.deepEqual([...ordem].sort((a, b) => a - b), ordem, 'a ordem das gravações mudou');
});
