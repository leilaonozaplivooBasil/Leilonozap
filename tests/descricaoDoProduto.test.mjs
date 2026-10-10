import test from 'node:test';
import assert from 'node:assert/strict';
import {
  textoSemHtml, nivelDaDescricao, precisaDeDescricao, fatosDoProduto, validarDescricaoGerada, SISTEMA,
  MINIMO_DE_UMA_BOA, MINIMO_GERADO, MAXIMO_GERADO,
} from '../src/lib/descricaoDoProduto.js';

const BOA = 'Pisca de Natal LED com 20 metros de fio e fonte para tomada.\n• Luz quente em 8 efeitos de pisca\n• Fio verde de uso interno\n• Indicado para árvore, janela e varanda\n• Produto em estado novo, conforme cadastro';

test('texto sem HTML: tira marcas e entidades, mantém quebras de linha', () => {
  assert.equal(textoSemHtml('<h1>caixa prata</h1><p>SEM BATERIA</p>'), 'caixa prata\nSEM BATERIA');
  assert.equal(textoSemHtml('a&nbsp;b &amp; c'), 'a b & c');
  assert.equal(textoSemHtml(null), '');
});

test('nível: vazia, interna do lote, só o nome, curta (inclui HTML de uma linha) e boa', () => {
  assert.equal(nivelDaDescricao('', 'Tênis'), 'vazia');
  assert.equal(nivelDaDescricao('   ', 'Tênis'), 'vazia');
  assert.equal(nivelDaDescricao('<p> </p>', 'Tênis'), 'vazia');
  assert.equal(nivelDaDescricao('Gerado automaticamente do lote: LOTE ARREMATADO M.L 09:04:2026 (Mercado Livre)', 'Papel'), 'interna');
  assert.equal(nivelDaDescricao('[grade:B] Gerado automaticamente do lote: LOTE 46 (Mercado Livre)', 'Papel'), 'interna');
  assert.equal(nivelDaDescricao('Smart TV LG UHD AI UA75 65 polegadas HDR10', 'Smart TV LG UHD AI UA75 65 polegadas HDR10 '), 'so_o_nome');
  assert.equal(nivelDaDescricao('<h1>caixa dourada, mostrador preto - EYT</h1><p>SEM BATERIA</p>', 'RELÓGIO EYT'), 'curta');
  assert.equal(nivelDaDescricao(BOA, 'Pisca Decoração Natal'), 'boa');
  assert.ok(textoSemHtml(BOA).length >= MINIMO_DE_UMA_BOA);
});

test('precisa de descrição: tudo que não é "boa"', () => {
  assert.equal(precisaDeDescricao('', 'x'), true);
  assert.equal(precisaDeDescricao('Gerado automaticamente do lote: X (Mercado Livre)', 'x'), true);
  assert.equal(precisaDeDescricao(BOA, 'Pisca'), false);
});

test('fatos: só o que existe no cadastro; o texto interno do lote nunca vira fato', () => {
  const f = fatosDoProduto({
    nome: 'Relógio EYT', condicao: 'bom', estado_conservacao: 'sem bateria', notes: 'Gerado automaticamente do lote: LOTE 1 (Mercado Livre)',
    peso: 0.3, comprimento: 10, largura: 8, altura: 4, origem: 'return_resale',
  });
  assert.deepEqual(f, [
    'Nome no cadastro: Relógio EYT', 'Condição: bom, com pequenas marcas de uso', 'Estado informado por quem cadastrou: sem bateria',
    'Peso: 0.3 kg', 'Medidas da embalagem: 10 x 8 x 4 cm', 'Origem: produto de arremate/devolução (pode ter marcas de uso ou embalagem aberta)',
  ]);
  assert.deepEqual(fatosDoProduto({ nome: 'Só nome', peso: 0, comprimento: 5 }), ['Nome no cadastro: Só nome'], 'zero e medida incompleta não viram fato');
  assert.ok(fatosDoProduto({ nome: 'x', notes: '<p>sem bateria</p>' }).includes('Observação do cadastro: sem bateria'), 'observação humana entra, sem HTML');
});

test('o sistema proíbe inventar e proíbe preço/frete/garantia', () => {
  assert.match(SISTEMA, /SOMENTE o que está nos FATOS/);
  assert.match(SISTEMA, /NÃO escreva/);
  assert.match(SISTEMA, /preço, frete, cupom/);
});

test('texto gerado: aceita o bom e recusa erro da IA, html, curto, longo e promessas', () => {
  assert.equal(validarDescricaoGerada(BOA, { condicao: 'novo' }).ok, true);
  assert.equal(validarDescricaoGerada('{"ok":false,"error":"IA indisponível"}').motivo, 'ia_sem_texto');
  assert.equal(validarDescricaoGerada('IA indisponível agora').motivo, 'ia_sem_texto');
  assert.equal(validarDescricaoGerada(null).motivo, 'ia_sem_texto');
  assert.equal(validarDescricaoGerada('<p>' + BOA + '</p>').motivo, 'veio_html');
  assert.equal(validarDescricaoGerada('Curto demais.').motivo, 'curto_demais');
  assert.equal(validarDescricaoGerada('a'.repeat(MAXIMO_GERADO + 1)).motivo, 'longo_demais');
  assert.ok(MINIMO_GERADO < MAXIMO_GERADO);
  const base = BOA.replace('• Produto em estado novo, conforme cadastro', '');
  assert.equal(validarDescricaoGerada(`${base}• Por apenas R$ 99,90 hoje, aproveite agora mesmo`).motivo, 'cita preço');
  assert.equal(validarDescricaoGerada(`${base}• Veja mais em https://loja.com/produto-bom-demais`).motivo, 'tem link');
  assert.equal(validarDescricaoGerada(`${base}• Garantia de 12 meses direto com o fabricante e assistência`).motivo, 'promete garantia');
  assert.equal(validarDescricaoGerada(`${base}• Frete grátis para todo o Brasil em compras acima de cem`).motivo, 'fala de frete');
  assert.equal(validarDescricaoGerada(`${base}• Origem: Gerado do lote ARREMATADO via Mercado Livre inteiro`).motivo, 'cita origem interna');
});

test('"lacrado" só passa se o cadastro disse que é novo', () => {
  const t = BOA.replace('em estado novo, conforme cadastro', 'lacrado na caixa original de fábrica');
  assert.equal(validarDescricaoGerada(t, { condicao: 'bom' }).motivo, 'chutou_estado');
  assert.equal(validarDescricaoGerada(t, { condicao: '' }).motivo, 'chutou_estado');
  assert.equal(validarDescricaoGerada(t, { condicao: 'novo' }).ok, true);
});

test('texto editado pelo dono: livre no tamanho, mas barra preço, link, html e erro da IA', async () => {
  const { validarTextoEditado } = await import('../src/lib/descricaoDoProduto.js');
  assert.equal(validarTextoEditado('Relógio de pulso, sem bateria.').ok, true, 'curto pode, é decisão do dono');
  assert.equal(validarTextoEditado('Leve por R$ 99,90').motivo, 'cita preço');
  assert.equal(validarTextoEditado('Veja https://x.com/p').motivo, 'tem link');
  assert.equal(validarTextoEditado('<b>oi</b>').motivo, 'veio_html');
  assert.equal(validarTextoEditado('{"ok":false,"error":"IA indisponível"}').motivo, 'ia_sem_texto');
  assert.equal(validarTextoEditado('').motivo, 'ia_sem_texto');
});
