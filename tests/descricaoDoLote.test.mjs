// A descrição do lote na sala do leilão.
//
// O caso que originou tudo: Bike Harley M4 - SEM CNH, 11/09/2026. Descrição de
// 734 caracteres terminando em "OBS: SEM O CARREGADOR", dentro de uma caixa de
// 60px com overflow:hidden. A ressalva nunca aparecia para quem ia dar lance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LIMITE_RESUMO, linhaDeAviso, resumoDaDescricao, precisaDeVerMais,
} from '../src/lib/descricaoDoLote.js';

// texto real do leilão 784657d60a0c5de77cdfbf14
const BIKE = [
  'Oportunidade única para adquirir sua Bike Harley M4 em leilão. Este veículo é a '
  + 'escolha ideal para quem busca praticidade no deslocamento diário, combinando um '
  + 'design arrojado com a conveniência de um meio de transporte ágil, sendo perfeito '
  + 'para transitar pela cidade com muito mais estilo e facilidade.',
  '',
  'Um dos maiores diferenciais deste item é a dispensa da necessidade de CNH para sua '
  + 'condução. É a solução prática que você esperava para garantir sua mobilidade com '
  + 'total autonomia, aproveitando toda a robustez e o conforto que este modelo '
  + 'proporciona em seus trajetos.',
  '',
  '• Mobilidade ágil para o uso urbano.',
  '• Dispensada a obrigatoriedade de CNH.',
  '• Design moderno e diferenciado.',
  '• Praticidade no dia a dia.',
  '',
  'OBS: SEM O CARREGADOR',
].join('\n');

test('DESC-1 o aviso do final é encontrado', () => {
  assert.equal(linhaDeAviso(BIKE), 'OBS: SEM O CARREGADOR');
});

test('DESC-2 o aviso aparece MESMO com a descrição fechada', () => {
  // 🔴 É o coração do conserto. Se este teste cair, voltou o bug que fez o
  // comprador dar R$ 897 achando que levava o carregador.
  const { resumo, aviso, cortou } = resumoDaDescricao(BIKE);
  assert.equal(cortou, true, 'texto de 734 caracteres tem que ser cortado');
  assert.equal(aviso, 'OBS: SEM O CARREGADOR');
  assert.ok(!resumo.includes('CARREGADOR'), 'o aviso não deve ser repetido no resumo');
});

test('DESC-3 o resumo respeita o limite e corta em palavra inteira', () => {
  const { resumo } = resumoDaDescricao(BIKE);
  assert.ok(resumo.length <= LIMITE_RESUMO + 1, `resumo com ${resumo.length}`);
  assert.ok(resumo.endsWith('…'));
  assert.ok(!/\s…$/.test(resumo), 'sobrou espaço antes das reticências');
  assert.match(resumo, /^Oportunidade única/);
});

test('DESC-4 o texto completo continua inteiro, com as quebras de linha', () => {
  const { completo } = resumoDaDescricao(BIKE);
  assert.ok(completo.includes('OBS: SEM O CARREGADOR'));
  assert.ok(completo.includes('\n• Mobilidade ágil'));
  assert.equal(completo.split('\n').length, BIKE.split('\n').length);
});

test('DESC-5 descrição curta não ganha "ver mais" nem reticências', () => {
  const curta = 'Cadeira presidente, cor preta, usada.';
  const r = resumoDaDescricao(curta);
  assert.equal(r.cortou, false);
  assert.equal(r.resumo, curta);
  assert.equal(r.aviso, '');
  assert.equal(precisaDeVerMais(curta), false);
});

test('DESC-6 descrição curta COM aviso mostra os dois, sem cortar nada', () => {
  const txt = 'Furadeira de impacto 650W.\n\nATENÇÃO: sem a maleta.';
  const r = resumoDaDescricao(txt);
  assert.equal(r.cortou, false);
  assert.equal(r.aviso, 'ATENÇÃO: sem a maleta.');
  assert.equal(r.resumo, 'Furadeira de impacto 650W.');
});

test('DESC-7 aviso em bullet também é achado', () => {
  assert.equal(linhaDeAviso('Bla bla.\n• IMPORTANTE: produto sem garantia.'),
    '• IMPORTANTE: produto sem garantia.');
});

test('DESC-8 pega o ÚLTIMO aviso, não o primeiro', () => {
  const txt = 'Nota: item de vitrine.\nBla bla bla.\nOBS: sem nota fiscal.';
  assert.equal(linhaDeAviso(txt), 'OBS: sem nota fiscal.');
});

test('DESC-9 palavra parecida no meio da frase não vira aviso', () => {
  // "importante" como adjetivo não é ressalva — não pode virar destaque amarelo.
  assert.equal(linhaDeAviso('Este é um item importante da coleção.'), '');
  assert.equal(linhaDeAviso('Uma observação qualquer no meio do texto sobre o produto.'), '');
});

test('DESC-10 descrição vazia ou nula não quebra a tela', () => {
  for (const nada of ['', null, undefined, '   ', '\n\n']) {
    const r = resumoDaDescricao(nada);
    assert.deepEqual(r, { completo: '', resumo: '', aviso: '', cortou: false });
  }
});

test('DESC-11 \\r\\n do Windows não deixa lixo no texto', () => {
  const r = resumoDaDescricao('Linha um.\r\n\r\nOBS: sem cabo.\r\n');
  assert.equal(r.aviso, 'OBS: sem cabo.');
  assert.ok(!r.completo.includes('\r'));
});

test('DESC-12 texto longo SEM aviso também é cortado e ganha "ver mais"', () => {
  const longo = 'Produto muito bem descrito. '.repeat(20);
  const r = resumoDaDescricao(longo);
  assert.equal(r.cortou, true);
  assert.equal(r.aviso, '');
  assert.ok(r.resumo.length <= LIMITE_RESUMO + 1);
});
