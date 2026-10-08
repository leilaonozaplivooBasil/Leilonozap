// 📦 DIR-207 — A RÉGUA ÚNICA DE MEDIDAS E PESO (08/10/2026)
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarMedidas, faltamMedidas, caixaDoFrete, resumoDaCaixa, numeroDigitado, pesoEmKg, medidaEmCm, textoDoCampo, LIMITES, CAIXA_PADRAO, ORIGENS_MEDIDA } from '../src/lib/medidasDoProduto.js';

test('vazio vira null (nunca 0); vírgula e unidade colada são aceitas', () => {
  assert.equal(numeroDigitado(''), null); assert.equal(numeroDigitado(null), null); assert.equal(numeroDigitado('abc'), null);
  assert.equal(numeroDigitado('1,5'), 1.5); assert.equal(numeroDigitado('2,30 kg'), 2.3); assert.equal(numeroDigitado('45cm'), 45); assert.equal(numeroDigitado(0.3), 0.3);
  const r = normalizarMedidas({ peso: '', altura: '', largura: '', comprimento: '' });
  assert.deepEqual(r.valores, { peso: null, altura: null, largura: null, comprimento: null });
  assert.equal(r.completas, false); assert.deepEqual(r.avisos, []);
});

test('fora da faixa é recusado com aviso que explica gramas/milímetros; dentro é arredondado', () => {
  const r = normalizarMedidas({ peso: '1500', altura: '1800', largura: '10,04', comprimento: '0.004' });
  assert.deepEqual(r.valores, { peso: null, altura: null, largura: 10, comprimento: null });
  assert.equal(r.completas, false);
  assert.match(r.avisos[0], /Peso: 1500 kg passa do máximo \(80 kg\)\. Se você pensou em gramas, 1500 g = 1,500 kg/);
  assert.match(r.avisos[1], /Altura: 1800 cm passa do máximo \(250 cm\)\. Se você pensou em milímetros, 1800 mm = 180,0 cm/);
  assert.match(r.avisos[2], /Comprimento: 0.004 é menor que o mínimo/);
  assert.match(normalizarMedidas({ peso: 0 }).avisos[0], /zero não é medida/);
  const ok = normalizarMedidas({ peso: 68.4567, altura: 186.66, largura: 70, comprimento: 72 });
  assert.deepEqual(ok.valores, { peso: 68.457, altura: 186.7, largura: 70, comprimento: 72 });
  assert.equal(ok.completas, true);
  assert.deepEqual(LIMITES, { peso: { min: 0.005, max: 80 }, cm: { min: 0.5, max: 250 } });
});

test('a caixa do frete é a MESMA conta de api/_lib/frete.js: caixa padrão 0,3 kg / 11x4x16 e pisos 0,1 / 2 / 11 / 16', () => {
  assert.deepEqual(CAIXA_PADRAO, { peso: 0.3, altura: 4, largura: 11, comprimento: 16 });
  const semNada = caixaDoFrete({ peso: 0, altura: null, largura: '', comprimento: undefined });
  assert.deepEqual(semNada, { peso: 0.3, altura: 4, largura: 11, comprimento: 16, padrao: true, faltou: ['peso', 'altura', 'largura', 'comprimento'] });
  assert.equal(resumoDaCaixa(semNada), '0,300 kg · 16×11×4 cm');
  const geladeira = caixaDoFrete({ peso: 68, altura: 186.5, largura: 70, comprimento: 72 });
  assert.deepEqual(geladeira, { peso: 68, altura: 186.5, largura: 70, comprimento: 72, padrao: false, faltou: [] });
  assert.equal(resumoDaCaixa(geladeira), '68,00 kg · 72×70×186,5 cm');
  // piso: largura 8 vira 11, altura 1 vira 2 (como o frete faz), e NÃO é caixa padrão
  const pequeno = caixaDoFrete({ peso: 0.05, altura: 1, largura: 8, comprimento: 12 });
  assert.deepEqual(pequeno, { peso: 0.1, altura: 2, largura: 11, comprimento: 16, padrao: false, faltou: [] });
  assert.equal(faltamMedidas({ peso: 1, altura: 1, largura: 1 }), true);
  assert.equal(faltamMedidas({ peso: 1, altura: 1, largura: 1, comprimento: 1 }), false);
  assert.equal(faltamMedidas(null), true);
});

test('conversão de unidade e texto do campo', () => {
  assert.equal(pesoEmKg(850, 'g'), 0.85); assert.equal(pesoEmKg('1,2', 'kg'), 1.2); assert.equal(pesoEmKg(2, ''), 2); assert.equal(pesoEmKg('', 'g'), null);
  assert.equal(medidaEmCm(1800, 'mm'), 180); assert.equal(medidaEmCm(1.86, 'm'), 186); assert.equal(medidaEmCm(70, 'cm'), 70);
  assert.equal(textoDoCampo(null), ''); assert.equal(textoDoCampo(0), ''); assert.equal(textoDoCampo('1,5'), '1.5'); assert.equal(textoDoCampo(68), '68');
  assert.deepEqual(Object.keys(ORIGENS_MEDIDA), ['manual', 'pagina', 'estimativa_ia']);
});
