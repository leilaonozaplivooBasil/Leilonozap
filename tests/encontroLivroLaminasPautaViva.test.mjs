// 📖🗂️✏️ DIR-168 (21/09/2026) — Encontro da Mentalidade: o livro da semana com
// capa e PDF, cada lâmina editável (editar/apagar/nova/restaurar) e a pauta viva
// (a lista tipo Trello do que precisa ser conversado) na última lâmina.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  BLOCOS, MINUTOS_TOTAL, horarioDoBloco, slidesDoEncontro, roteiroLocal,
  normalizarLivro, temLivro, pautasParaLamina, seloDaPauta, ordenarPautasVivas, STATUS_PAUTA,
  aplicarLaminas, ajustarLamina, apagarLamina, restaurarLamina, novaLaminaDepois, laminasOcultas, normalizarLaminas,
  normalizarLivros, MAX_LIVROS,
} from '../src/lib/encontro.js';

const COMPONENTE = fs.readFileSync(new URL('../src/components/licensing/CentralVendas/EncontroMentalidade.jsx', import.meta.url), 'utf8');

test('o cronograma da segunda tem hora marcada: 9h mentalidade, 9h05 leitura, 9h20 treinamento, 10h–12h produção', () => {
  assert.deepEqual(BLOCOS.map((b) => [b.id, b.nome, b.minutos, horarioDoBloco(b)]), [
    ['mentalidade', 'Mentalidade', 5, '09:00–09:05'],
    ['leitura', 'Leitura', 15, '09:05–09:20'],
    ['treinamento', 'Treinamento', 40, '09:20–10:00'],
    ['reuniao', 'Produção', 120, '10:00–12:00'],
  ]);
  assert.equal(MINUTOS_TOTAL, 180);
  assert.match(BLOCOS[0].descricao, /a palavra de quem conduz/);
});

test('o livro: normaliza, aceita só URL de verdade, e cai no título da leitura quando não foi escolhido', () => {
  assert.deepEqual(normalizarLivro(null), { titulo: '', autor: '', capa_url: '', pdf_url: '' });
  assert.deepEqual(normalizarLivro({ titulo: ' Salomão ', autor: 'Steven Scott', capa_url: 'javascript:alert(1)', pdf_url: 'https://x/livro.pdf' }), { titulo: 'Salomão', autor: 'Steven Scott', capa_url: '', pdf_url: 'https://x/livro.pdf' });
  assert.equal(normalizarLivro({}, { tituloSugerido: 'As 16 Leis' }).titulo, 'As 16 Leis');
  assert.equal(temLivro({}), false);
  assert.equal(temLivro({ pdf_url: 'https://x/a.pdf' }), true);
});

test('a leitura leva a capa e o PDF; o treinamento diz "baseado em"; a última lâmina é a pauta viva', () => {
  const r = roteiroLocal({ pautas: ['A'], mes: '2026-09' });
  const s = slidesDoEncontro({
    data: 'segunda, 21/09', dataISO: '2026-09-21', roteiro: r, mes: '2026-09', conduzidoPor: 'Luiz', treinamentoPor: 'Karen',
    livro: { titulo: 'O Homem Mais Rico que Já Existiu', autor: 'Steven K. Scott', capa_url: 'https://x/capa.png', pdf_url: 'https://x/livro.pdf' },
    pautasVivas: [
      { id: '1', titulo: 'Meta de setembro', status: 'aberta', autor_nome: 'Luiz Santanna', encontro_data: '2026-09-14', ordem: 1 },
      { id: '2', titulo: 'Contrato novo', status: 'conversada', autor_nome: 'Aline', encontro_data: '2026-09-21', ordem: 0 },
      { id: '3', titulo: 'Já foi', status: 'concluida', encontro_data: '2026-09-21', ordem: 2 },
    ],
  });
  const leitura = s.find((x) => x.id === 'leitura');
  assert.equal(leitura.titulo, 'O Homem Mais Rico que Já Existiu');
  assert.equal(leitura.imagem, 'https://x/capa.png');
  assert.deepEqual(leitura.link, { url: 'https://x/livro.pdf', rotulo: 'abrir o livro (PDF)' });
  assert.match(leitura.sub, /09:05–09:20 · Steven K\. Scott/);
  const treino = s.find((x) => x.id === 'treinamento');
  assert.match(treino.sub, /^40 minutos · 09:20–10:00 · quem treina: Karen · baseado em: O Homem Mais Rico/);
  assert.equal(treino.link.url, 'https://x/livro.pdf');
  assert.match(s.find((x) => x.id === 'mentalidade').sub, /a palavra de Luiz/);
  const prod = s.find((x) => x.id === 'producao');
  assert.equal(s.indexOf(prod), s.findIndex((x) => x.id === 'treinamento') + 1, 'a lista abre as duas horas de Produção, logo depois do treinamento');
  assert.equal(prod.bloco, 'reuniao');
  assert.deepEqual(prod.corpo, ['• Meta de setembro — Luiz (de 14/09)', '✓ Contrato novo — Aline']);
  assert.match(prod.sub, /1 em aberto · 1 conversado/);
  assert.equal(s.at(-1).id, 'fechamento');
  assert.match(s.at(-1).sub, /1 item da lista fica pra próxima segunda/);
});

test('a pauta viva: ordem, selo da semana anterior, teto de linhas e lista vazia com instrução', () => {
  assert.deepEqual(STATUS_PAUTA.map((s) => s.id), ['aberta', 'conversada', 'concluida']);
  assert.deepEqual(ordenarPautasVivas([{ ordem: 2, created_at: 'a' }, { ordem: 0, created_at: 'b' }, { ordem: 0, created_at: 'a' }]).map((x) => `${x.ordem}${x.created_at}`), ['0a', '0b', '2a']);
  assert.equal(seloDaPauta({ encontro_data: '2026-09-14' }, '2026-09-21'), 'de 14/09');
  assert.equal(seloDaPauta({ encontro_data: '2026-09-21' }, '2026-09-21'), '');
  const muitas = Array.from({ length: 15 }, (_, i) => ({ titulo: `item ${i}`, status: 'aberta', ordem: i }));
  const p = pautasParaLamina(muitas, { limite: 12 });
  assert.equal(p.linhas.length, 13);
  assert.equal(p.linhas.at(-1), '… e mais 3');
  assert.match(pautasParaLamina([]).linhas[0], /A lista está vazia/);
});

test('as lâminas: editar, apagar (oculta), nova depois de, restaurar — e a extra vai pro fim se a âncora sumiu', () => {
  const base = [{ id: 'capa', titulo: 'Capa', corpo: [] }, { id: 'leitura', titulo: 'Leitura', corpo: ['x'] }, { id: 'fim', titulo: 'Fim', corpo: [] }];
  let l = ajustarLamina(null, 'leitura', { titulo: 'Leitura editada', corpo: ['a', '', 'b'] });
  let s = aplicarLaminas(base, l);
  assert.deepEqual(s.map((x) => [x.id, x.titulo, x.ajustada || false]), [['capa', 'Capa', false], ['leitura', 'Leitura editada', true], ['fim', 'Fim', false]]);
  assert.deepEqual(s[1].corpo, ['a', 'b']);
  l = novaLaminaDepois(l, 'leitura', { id: 'extra-1', titulo: 'Extra' });
  s = aplicarLaminas(base, l);
  assert.deepEqual(s.map((x) => x.id), ['capa', 'leitura', 'extra-1', 'fim']);
  assert.equal(s[2].extra, true);
  l = ajustarLamina(l, 'extra-1', { titulo: 'Extra 2' });
  assert.equal(aplicarLaminas(base, l)[2].titulo, 'Extra 2');
  l = apagarLamina(l, 'leitura');
  s = aplicarLaminas(base, l);
  assert.deepEqual(s.map((x) => x.id), ['capa', 'fim', 'extra-1'], 'sem a âncora (apagada), a extra vai pro fim');
  assert.deepEqual(laminasOcultas(l), ['leitura']);
  l = restaurarLamina(l, 'leitura');
  assert.deepEqual(aplicarLaminas(base, l).map((x) => x.id), ['capa', 'leitura', 'extra-1', 'fim']);
  l = apagarLamina(l, 'extra-1');
  assert.deepEqual(normalizarLaminas(l).extras, []);
  // lixo no banco não derruba
  assert.deepEqual(normalizarLaminas({ ajustes: { x: 'nada', y: { titulo: 5 } }, extras: [null, { titulo: 'sem id' }] }), { ajustes: {}, extras: [] });
});

test('a tela: livro com capa e PDF no balde encontro-materiais, pauta viva em 3 colunas, lápis edita a lâmina na apresentação', () => {
  assert.match(COMPONENTE, /bucket: 'encontro-materiais'/);
  assert.match(COMPONENTE, /data-teste="livro-capa-arquivo"/);
  assert.match(COMPONENTE, /data-teste="livro-pdf-arquivo"/);
  assert.match(COMPONENTE, /from\('xperf_encontro_pautas'\)\.select\('\*'\)\.or\(`status\.neq\.concluida,encontro_data\.eq\.\$\{dataEncontro\}`\)/);
  assert.match(COMPONENTE, /data-teste="pauta-colunas"/);
  for (const t of ['pauta-adicionar', 'pauta-conversada', 'pauta-concluir', 'pauta-vira-demanda', 'pauta-apagar']) assert.match(COMPONENTE, new RegExp(`data-teste="${t}"`), t);
  assert.match(COMPONENTE, /onClick=\{\(\) => setEditandoLamina\(\(v\) => !v\)\}/);
  for (const t of ['lamina-titulo', 'lamina-sub', 'lamina-corpo', 'lamina-nova', 'lamina-apagar', 'lamina-restaurar', 'slide-link', 'slide-capa']) assert.match(COMPONENTE, new RegExp(`data-teste="${t}"`), t);
  assert.match(COMPONENTE, /slidesDoEncontro\(\{ data: fmtDia\(dataEncontro\), dataISO: dataEncontro, roteiro, mes, conduzidoPor, treinamentoPor, demandas, treinamento, livros, pautasVivas, laminas \}\)/);
  assert.ok(!/Reunião estratégica/.test(COMPONENTE), 'a tela ainda chama o bloco de reunião estratégica');
  assert.match(COMPONENTE, /5 · Produção/);
});

test('DIR-168.1: vários livros — adicionar e retirar; a leitura mostra todos, com capas e PDFs; o legado vira o primeiro', () => {
  assert.deepEqual(normalizarLivros(null, { titulo: 'Salomão' }).map((l) => l.titulo), ['Salomão']);
  assert.deepEqual(normalizarLivros([{ titulo: 'A' }, {}, { titulo: 'B', pdf_url: 'https://x/b.pdf' }], { titulo: 'legado' }).map((l) => l.titulo), ['A', 'B']);
  assert.equal(normalizarLivros(Array.from({ length: 9 }, (_, i) => ({ titulo: `L${i}` }))).length, MAX_LIVROS);
  const s = slidesDoEncontro({ mes: '2026-09', treinamentoPor: 'Luiz', livros: [
    { titulo: 'O Homem Mais Rico que Já Existiu', autor: 'Steven K. Scott', capa_url: 'https://x/1.png', pdf_url: 'https://x/1.pdf' },
    { titulo: 'As 16 Leis do Triunfo', autor: 'Napoleão Hill', pdf_url: 'https://x/2.pdf' },
  ] });
  const leitura = s.find((x) => x.id === 'leitura');
  assert.equal(leitura.titulo, 'Leitura · os livros da semana');
  assert.equal(leitura.corpo[0], 'Livros: O Homem Mais Rico que Já Existiu (Steven K. Scott) · As 16 Leis do Triunfo (Napoleão Hill)');
  assert.deepEqual(leitura.imagens, ['https://x/1.png']);
  assert.deepEqual(leitura.links.map((l) => l.rotulo), ['PDF: O Homem Mais Rico que Já Existiu', 'PDF: As 16 Leis do Triunfo']);
  assert.match(s.find((x) => x.id === 'treinamento').sub, /baseado em: O Homem Mais Rico que Já Existiu · As 16 Leis do Triunfo/);
  for (const t of ['livro-adicionar', 'livro-retirar', 'livros-lista']) assert.match(COMPONENTE, new RegExp(`data-teste="${t}"`), t);
  assert.match(COMPONENTE, /const salvarLivros = \(lista\) => salvarEncontro\(\{ livros: lista, livro: lista\[0\] \|\| null \}\);/);
});

test('DIR-168.1: a trajetória do treinamento — capa + uma lâmina por passo; a lista da Produção abre as duas horas e dá pra editar na própria lâmina', () => {
  const s = slidesDoEncontro({ mes: '2026-09', treinamento: { titulo: 'Diligência', por: 'Luiz', passos: ['Provérbios 10:4 — a mão diligente enriquece', 'Os 5 traços do diligente', 'Prática: um ato de diligência'] }, livros: [{ titulo: 'Salomão' }] });
  const ids = s.map((x) => x.id);
  assert.deepEqual(ids.slice(ids.indexOf('treinamento'), ids.indexOf('treinamento') + 4), ['treinamento', 'treinamento-passo-1', 'treinamento-passo-2', 'treinamento-passo-3']);
  assert.equal(ids[ids.indexOf('treinamento-passo-3') + 1], 'producao', 'a lista abre a Produção logo depois do último passo');
  const p2 = s.find((x) => x.id === 'treinamento-passo-2');
  assert.deepEqual([p2.titulo, p2.sub, p2.corpo, p2.rodape, p2.bloco], ['2. Os 5 traços do diligente', 'passo 2 de 3 · Diligência', ['Os 5 traços do diligente'], 'baseado em: Salomão', 'treinamento']);
  assert.match(s.find((x) => x.id === 'treinamento').corpo.join(' '), /3 passos — um por lâmina/);
  assert.match(COMPONENTE, /slides\[slide\]\.id === 'producao' \?/);
  assert.match(COMPONENTE, /data-teste="lamina-pauta-nova"/);
});

test('DIR-168.1: espaço e setas dentro de um campo de texto NÃO trocam de lâmina; ESC fecha só o editor', () => {
  const i = COMPONENTE.indexOf('const onKey = (ev) => {');
  const bloco = COMPONENTE.slice(i, i + 900);
  assert.match(bloco, /const digitando = alvo && \(alvo\.tagName === 'INPUT' \|\| alvo\.tagName === 'TEXTAREA' \|\| alvo\.tagName === 'SELECT' \|\| alvo\.isContentEditable\);/);
  assert.match(bloco, /if \(editandoLamina \|\| digitando\) \{\s*\n\s*if \(ev\.key === 'Escape'\) \{ setEditandoLamina\(false\); alvo\?\.blur\?\.\(\); \}\s*\n\s*return;/);
  assert.match(COMPONENTE, /\}, \[apresentando, slides\.length, editandoLamina\]\);/);
});
