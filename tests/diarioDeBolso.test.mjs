// 📔 O DIÁRIO DE BOLSO (Fase 1, 08/09/2026) — a régua pura: o texto de cada
// entrada, o agrupamento por dia e a busca. A tela só desenha o que isto monta.
import test from 'node:test';
import assert from 'node:assert/strict';
import { textoDaEntrada, textoEFonte, entradaDe, diarioAgrupado, filtrarDiario, linhaParaGravar, tarefasParaMaterializar } from '../src/lib/diarioDeBolso.js';

test('textoDaEntrada: o resumo que a própria pessoa escreveu vence tudo', () => {
  const t = { comprovacao: { resumo: 'Aprendi a fechar melhor uma objeção de preço.', veredito_ia: { o_que_viu: 'um livro aberto' } }, mentalidade: 'diretor', habito: 7 };
  assert.equal(textoDaEntrada(t), 'Aprendi a fechar melhor uma objeção de preço.');
});

test('textoDaEntrada: sem resumo, usa o que a IA viu na validação da foto', () => {
  const t = { comprovacao: { veredito_ia: { o_que_viu: 'a pessoa correndo ao amanhecer' } } };
  assert.equal(textoDaEntrada(t), 'a pessoa correndo ao amanhecer');
});

test('textoDaEntrada: sem comprovação nenhuma, mas com mentalidade/Hábito, usa o ensinamento da tarefa', () => {
  const t = { mentalidade: 'executivo', habito: 2, detalhe: 'a rotina do dia' };
  const texto = textoDaEntrada(t);
  assert.ok(texto && texto.length > 10, 'deveria montar um ensinamento a partir da mentalidade/Hábito');
  assert.match(texto, /Executivo/i);
});

test('textoDaEntrada: sem nada disso, mas com detalhe puro, usa o detalhe', () => {
  assert.equal(textoDaEntrada({ detalhe: 'só uma nota simples' }), 'só uma nota simples');
});

test('textoDaEntrada: link do Instagram (não é texto de aprendizado) não vira o texto da entrada', () => {
  const t = { comprovacao: { entrega: 'https://instagram.com/p/abc123' } };
  assert.equal(textoDaEntrada(t), null);
});

test('textoDaEntrada: tarefa realmente sem nada pra contar devolve null — não é bug, é resposta', () => {
  assert.equal(textoDaEntrada({}), null);
  assert.equal(textoDaEntrada({ titulo: 'Almoço' }), null);
});

test('entradaDe: monta a forma que a tela desenha, com hora cortada pra HH:mm, a fonte do texto e a foto sinalizada', () => {
  const e = entradaDe({ id: 't1', data: '2026-09-08T00:00:00', hora: '09:15:00', titulo: 'Leitura do dia', comprovacao: { resumo: 'boa ideia', print_url: 'https://x/foto.jpg' } });
  assert.deepEqual(e, { id: 't1', data: '2026-09-08', hora: '09:15', titulo: 'Leitura do dia', texto: 'boa ideia', fonte: 'resumo', notaPessoal: null, temFoto: true });
});

test('entradaDe: com nota pessoal (Fase 2), ela entra na entrada; sem nota, fica null (nunca undefined, pra não quebrar deepEqual/JSON)', () => {
  const t = { id: 't1', data: '2026-09-08', titulo: 'Leitura do dia' };
  assert.equal(entradaDe(t, 'gostei muito').notaPessoal, 'gostei muito');
  assert.equal(entradaDe(t, null).notaPessoal, null);
  assert.equal(entradaDe(t).notaPessoal, null);
});

test('textoEFonte: cada prioridade marca a fonte certa (pra Fase 2 rotular diferente)', () => {
  assert.deepEqual(textoEFonte({ comprovacao: { resumo: 'minha ideia' } }), { texto: 'minha ideia', fonte: 'resumo' });
  assert.deepEqual(textoEFonte({ comprovacao: { veredito_ia: { o_que_viu: 'a IA viu isso' } } }), { texto: 'a IA viu isso', fonte: 'ia' });
  assert.deepEqual(textoEFonte({ mentalidade: 'executivo', habito: 2 }).fonte, 'ensinamento');
  assert.deepEqual(textoEFonte({ detalhe: 'só o detalhe' }), { texto: 'só o detalhe', fonte: 'detalhe' });
  assert.deepEqual(textoEFonte({}), { texto: null, fonte: null });
});

// ── Fase 2 (terreno preparado, ainda não usado por nenhuma tela) ──
test('linhaParaGravar: monta a linha exata que diario_bolso_entradas espera, sem nota pessoal por padrão', () => {
  const t = { id: 'tarefa-1', data: '2026-09-08T00:00:00', hora: '09:15:00', titulo: 'Leitura do dia', comprovacao: { resumo: 'boa ideia' } };
  const linha = linhaParaGravar(t, 'user-1');
  assert.deepEqual(linha, {
    user_id: 'user-1', data: '2026-09-08', hora: '09:15', tarefa_id: 'tarefa-1',
    titulo: 'Leitura do dia', texto: 'boa ideia', fonte: 'resumo',
  });
  assert.equal('nota_pessoal' in linha, false, 'sem nota passada, a coluna nem entra na linha — regravar não apaga a nota que já existia');
});

test('linhaParaGravar: com nota pessoal, ela entra na linha (mesmo vazia, se foi passada de propósito)', () => {
  const t = { id: 'tarefa-1', data: '2026-09-08', titulo: 'Leitura do dia' };
  assert.equal(linhaParaGravar(t, 'user-1', 'gostei muito disso').nota_pessoal, 'gostei muito disso');
  assert.equal(linhaParaGravar(t, 'user-1', '').nota_pessoal, '');
});

test('diarioAgrupado: agrupa por dia (mais recente primeiro) e por hora dentro do dia', () => {
  const tarefas = [
    { id: 'a', data: '2026-09-07', hora: '09:00', titulo: 'A' },
    { id: 'b', data: '2026-09-08', hora: '18:00', titulo: 'B' },
    { id: 'c', data: '2026-09-08', hora: '07:00', titulo: 'C' },
  ];
  const dias = diarioAgrupado(tarefas);
  assert.equal(dias.length, 2);
  assert.equal(dias[0].data, '2026-09-08', 'o dia mais recente vem primeiro');
  assert.deepEqual(dias[0].entradas.map((e) => e.id), ['c', 'b'], 'dentro do dia, a hora mais cedo vem primeiro');
  assert.equal(dias[1].data, '2026-09-07');
});

test('diarioAgrupado: tarefa sem hora vai pro fim do dia dela, não quebra a ordenação', () => {
  const tarefas = [
    { id: 'a', data: '2026-09-08', hora: null, titulo: 'sem hora' },
    { id: 'b', data: '2026-09-08', hora: '07:00', titulo: 'com hora' },
  ];
  const [dia] = diarioAgrupado(tarefas);
  assert.deepEqual(dia.entradas.map((e) => e.id), ['b', 'a']);
});

test('diarioAgrupado: tarefa sem data é ignorada — nunca quebra por linha ruim', () => {
  assert.deepEqual(diarioAgrupado([{ id: 'x', titulo: 'sem data' }, null, undefined]), []);
});

test('diarioAgrupado: aplica a nota pessoal de cada tarefa pelo mapa (Fase 2) — quem não tem nota fica null', () => {
  const tarefas = [
    { id: 'a', data: '2026-09-08', hora: '09:00', titulo: 'A' },
    { id: 'b', data: '2026-09-08', hora: '10:00', titulo: 'B' },
  ];
  const [dia] = diarioAgrupado(tarefas, { a: 'minha nota na A' });
  const porId = Object.fromEntries(dia.entradas.map((e) => [e.id, e.notaPessoal]));
  assert.deepEqual(porId, { a: 'minha nota na A', b: null });
});

test('tarefasParaMaterializar: só sobra o que ainda não virou linha em diario_bolso_entradas', () => {
  const tarefas = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const faltam = tarefasParaMaterializar(tarefas, new Set(['a', 'c']));
  assert.deepEqual(faltam.map((t) => t.id), ['b']);
});

test('tarefasParaMaterializar: nada gravado ainda → todas faltam; tudo já gravado → nada falta', () => {
  const tarefas = [{ id: 'a' }, { id: 'b' }];
  assert.deepEqual(tarefasParaMaterializar(tarefas).map((t) => t.id), ['a', 'b']);
  assert.deepEqual(tarefasParaMaterializar(tarefas, new Set(['a', 'b'])), []);
});

test('filtrarDiario: sem termo, devolve tudo igual', () => {
  const dias = diarioAgrupado([{ id: 'a', data: '2026-09-08', hora: '09:00', titulo: 'Leitura', detalhe: 'um livro' }]);
  assert.deepEqual(filtrarDiario(dias, ''), dias);
});

test('filtrarDiario: casa por título ou por texto, sem acento e sem caixa, e tira o dia que ficou vazio', () => {
  const dias = diarioAgrupado([
    { id: 'a', data: '2026-09-08', hora: '09:00', titulo: 'Leitura do dia', detalhe: 'uma ideia sobre negociação' },
    { id: 'b', data: '2026-09-08', hora: '10:00', titulo: 'Treino', detalhe: 'academia' },
    { id: 'c', data: '2026-09-07', hora: '09:00', titulo: 'Reunião', detalhe: 'pauta da semana' },
  ]);
  const porTitulo = filtrarDiario(dias, 'LEITURA');
  assert.equal(porTitulo.length, 1);
  assert.deepEqual(porTitulo[0].entradas.map((e) => e.id), ['a']);

  const porTexto = filtrarDiario(dias, 'negociacao'); // sem acento de propósito
  assert.deepEqual(porTexto[0].entradas.map((e) => e.id), ['a']);

  assert.deepEqual(filtrarDiario(dias, 'nada disso existe'), []);
});

test('filtrarDiario: também casa pela nota pessoal (Fase 2)', () => {
  const tarefas = [{ id: 'a', data: '2026-09-08', hora: '09:00', titulo: 'Reunião' }];
  const [dia] = diarioAgrupado(tarefas, { a: 'combinei de ligar pro cliente amanhã' });
  const achados = filtrarDiario([dia], 'ligar pro cliente');
  assert.deepEqual(achados[0]?.entradas.map((e) => e.id), ['a']);
});
