// visibilidadePorPapel — matriz única de governança (DIR-32): quem vê o
// negócio inteiro, quem vê o dinheiro da empresa e quem vê só a própria rede.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { visibilidadeDoUsuario, filtrarKpisPorVisao, KPIS_SO_DINHEIRO } from '../src/lib/visibilidadePorPapel.js';

describe('visibilidadeDoUsuario', () => {
  test('super_admin: tudo', () => {
    const v = visibilidadeDoUsuario({ role: 'super_admin' });
    assert.equal(v.visaoTotal, true);
    assert.equal(v.verDinheiroEmpresa, true);
    assert.equal(v.gerirVendedores, true);
    assert.equal(v.papelLabel, 'Super Admin');
  });

  test('admin_financeiro: visão total + dinheiro, mas NÃO gere vendedores', () => {
    const v = visibilidadeDoUsuario({ role: 'admin_financeiro' });
    assert.equal(v.visaoTotal, true);
    assert.equal(v.verDinheiroEmpresa, true);
    assert.equal(v.gerirVendedores, false);
    assert.equal(v.papelLabel, 'Admin Financeiro');
  });

  test('Diretoria Executiva (cargo): visão total de VENDA, sem dinheiro da empresa', () => {
    const v = visibilidadeDoUsuario({ role: 'licensee', career_levels: ['diretoria_executiva'] });
    assert.equal(v.visaoTotal, true);
    assert.equal(v.verDinheiroEmpresa, false);
    assert.equal(v.gerirVendedores, false);
    assert.equal(v.papelLabel, 'Diretoria Executiva');
  });

  test('Diretor Operacional (cargo, inclusive id legado "diretor"): idem', () => {
    const v = visibilidadeDoUsuario({ role: 'user', career_levels: ['diretor'] }); // alias legado
    assert.equal(v.visaoTotal, true);
    assert.equal(v.verDinheiroEmpresa, false);
    assert.equal(v.papelLabel, 'Diretor Operacional');
  });

  test('Sócio Executivo: só a própria estrutura (sem visão total)', () => {
    const v = visibilidadeDoUsuario({ role: 'licensee', career_levels: ['executivo_conta'] });
    assert.equal(v.visaoTotal, false);
    assert.equal(v.verDinheiroEmpresa, false);
    assert.equal(v.socioExecutivo, true);
    assert.equal(v.papelLabel, 'Sócio Executivo');
  });

  test('Fundador/Conselheiro: sem visão total (relatório agregado é rodada futura)', () => {
    const v = visibilidadeDoUsuario({ role: 'user', career_levels: ['fundador', 'conselheiro'] });
    assert.equal(v.visaoTotal, false);
  });

  test('usuário comum: nada de visão total', () => {
    const v = visibilidadeDoUsuario({ role: 'user' });
    assert.equal(v.visaoTotal, false);
    assert.equal(v.verDinheiroEmpresa, false);
  });
});

describe('filtrarKpisPorVisao', () => {
  const kpis = [
    { id: 'venda_online' }, { id: 'ticket_medio' },
    { id: 'custo_aquisicao' }, { id: 'roi_operacional' },
  ];
  test('quem vê dinheiro recebe os 12 completos', () => {
    const v = visibilidadeDoUsuario({ role: 'admin_financeiro' });
    assert.equal(filtrarKpisPorVisao(kpis, v).length, 4);
  });
  test('diretoria vê venda mas os KPIs de custo/ROI somem', () => {
    const v = visibilidadeDoUsuario({ role: 'user', career_levels: ['diretoria_executiva'] });
    const vistos = filtrarKpisPorVisao(kpis, v).map((k) => k.id);
    assert.deepEqual(vistos, ['venda_online', 'ticket_medio']);
    for (const id of KPIS_SO_DINHEIRO) assert.ok(!vistos.includes(id));
  });
});
