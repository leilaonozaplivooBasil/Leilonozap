// 🎓 DIR-57 — o menu do Painel de Alavancagem depois que a Top College virou um
// DEPARTAMENTO dentro do cliente. A regra de fronteira que está sendo testada
// aqui é uma pergunta só: nesta tela a pessoa está sendo FORMADA ou está
// OPERANDO? Formada → Top College. Operando → Leilão NoZap.
//
// Estes testes existem porque o agrupamento deixou de ser um `if` no nome do
// grupo, espalhado em dois componentes, e virou DADO na fonte única — então
// vale testar como qualquer outra regra da casa.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getLicensingGroups,
  chaveDoItem,
  entradaFlutuante,
  SECOES_LOJA,
  SECOES_TOP_COLLEGE,
} from '../src/lib/licensingTabs.js';

const dono = { role: 'super_admin', career_levels: ['ceo'] };
const grupoDe = (user, titulo) => getLicensingGroups(user).find((g) => g.title === titulo);
const valores = (itens) => itens.map((i) => i.value || i.to);

describe('DIR-57 — a fronteira entre a faculdade e o caixa', () => {
  test('a Top College fica com o que FORMA a pessoa', () => {
    const tc = grupoDe(dono, 'Top College');
    assert.ok(tc, 'o grupo Top College precisa existir');
    // 06/09/2026 — o Admin X-GAME saiu do menu: virou a gestão DENTRO do
    // X-Performance (ordem do dono). O super admin vê a mesma lista que os
    // outros; o que muda pra ele é o que abre na aba X-Performance.
    // 06/09/2026 — dono: "deixa somente a X-EOS ali, clicável, e joga o
    // restante pra dentro". No MENU fica um item só (a marca → O Método); o
    // resto mora nas SEÇÕES da Top College, dentro da página.
    assert.deepEqual(valores(tc.items), ['catalogo']);
    assert.deepEqual(tc.items.map((i) => i.label), ['O Método']);
    assert.equal(tc.items[0].catalogTab, 'catalogo-crm');
    assert.ok(tc.items[0].marcaCompleta, 'a marca X-EOS é o que aparece no menu');
    assert.equal(tc.colapsar.sempre, true, 'o botão Top College continua na lateral; ao clicar, só a X-EOS');
    assert.deepEqual(SECOES_TOP_COLLEGE.map((s) => s.value), ['catalogo-crm', 'catalogo-encontro', 'catalogo-vendedores', 'catalogo-xperformance', 'catalogo-carreira']);
    assert.deepEqual(SECOES_TOP_COLLEGE.map((s) => s.label), ['O Método', 'Mentalidade', 'Time', 'ADM X-Game', 'Carreira']);
  });

  test('o Admin X-GAME não é mais item de menu pra ninguém — mora dentro do X-Performance', () => {
    for (const role of ['user', 'licensee', 'admin', 'admin_financeiro']) {
      const tc = grupoDe({ role, career_levels: ['vendedor'] }, 'Top College');
      assert.ok(!valores(tc.items).includes('xgame-admin'), `${role} não pode ver o Admin X-GAME`);
    }
  });

  test('a Loja & Vendas fica só com o caixa — nada de método nem de time', () => {
    const secoes = SECOES_LOJA.map((s) => s.value);
    assert.deepEqual(secoes, [
      'catalogo-produtos', 'catalogo-home', 'catalogo-pedidos',
      'catalogo-clientes', 'catalogo-comissoes',
    ]);
    assert.ok(!secoes.includes('catalogo-crm'), 'O Método não é caixa');
    assert.ok(!secoes.includes('catalogo-vendedores'), 'Time não é caixa');
  });

  test('Comissões fica na loja e Vendedores/Time na faculdade (decisão do dono)', () => {
    assert.ok(SECOES_LOJA.some((s) => s.value === 'catalogo-comissoes'));
    assert.ok(SECOES_TOP_COLLEGE.some((s) => s.value === 'catalogo-vendedores'));
  });

  test('"CRM" morreu como nome, mas o link antigo continua abrindo no lugar certo', () => {
    const metodo = SECOES_TOP_COLLEGE.find((s) => s.value === 'catalogo-crm');
    assert.ok(metodo, 'o valor da aba não pode mudar — quebraria link salvo');
    assert.equal(metodo.label, 'O Método');
  });

  test('Metas saiu do menu de vez (06/09/2026): mora no Quadro Geral da pessoa, no X-Performance', () => {
    const op = grupoDe(dono, 'Operação');
    assert.ok(op, 'quem tem loja continua vendo Operação');
    assert.ok(!valores(op.items).includes('/Metas'));
    assert.ok(!valores(grupoDe(dono, 'Top College').items).includes('/Metas'));
  });

  test('Visão Geral fica FORA da faculdade, sozinha, como home neutra', () => {
    const vg = grupoDe(dono, 'Visão Geral');
    assert.equal(vg.items.length, 1);
    assert.equal(vg.items[0].value, 'visao-geral');
    assert.ok(!vg.colapsar, 'sozinha não vira menu flutuante');
  });
});

describe('DIR-57 — agrupamento como DADO (não mais um if no nome do grupo)', () => {
  test('os grupos que encolhem a lateral vêm marcados com colapsar', () => {
    const marcados = getLicensingGroups(dono).filter((g) => g.colapsar).map((g) => g.title);
    assert.deepEqual(marcados, ['Minha Conta', 'Operação', 'Top College', 'Admin']);
  });

  test('cada grupo colapsado traz a chave e o rótulo que a lateral desenha', () => {
    for (const g of getLicensingGroups(dono).filter((x) => x.colapsar)) {
      assert.match(g.colapsar.chave, /^group:/);
      assert.ok(g.colapsar.label, `${g.title} precisa de rótulo`);
      assert.ok(g.colapsar.icon, `${g.title} precisa de ícone`);
    }
  });

  test('quem não é admin não recebe o Consignado — permissão intacta', () => {
    const comum = { role: 'user', career_levels: ['executivo'] };
    const admin = grupoDe(comum, 'Admin');
    assert.equal(admin.items.length, 1);
    assert.ok(!valores(admin.items).includes('/painel/consignado'));
    assert.equal(grupoDe(dono, 'Admin').items.length, 2);
  });
});

describe('DIR-57 — chave do item (é ela que guarda a ordem que o usuário arrastou)', () => {
  test('duas seções da MESMA aba não colidem — senão uma comeria a ordem da outra', () => {
    const metodo = { type: 'tab', value: 'catalogo', catalogTab: 'catalogo-crm' };
    const time = { type: 'tab', value: 'catalogo', catalogTab: 'catalogo-vendedores' };
    assert.notEqual(chaveDoItem(metodo), chaveDoItem(time));
  });

  test('a aba Loja & Vendas mantém a chave antiga — quem já arrastou não perde a posição', () => {
    assert.equal(chaveDoItem({ type: 'tab', value: 'catalogo' }), 'tab:catalogo');
  });

  test('item de link continua identificado pela rota', () => {
    assert.equal(chaveDoItem({ type: 'link', to: '/Evoluir' }), '/Evoluir');
  });
});

describe('DIR-57 — entrada do menu flutuante (uma função só pro desktop e o celular)', () => {
  test('dentro do painel, troca a aba na hora — e leva a sub-seção junto', () => {
    const visto = [];
    const e = entradaFlutuante(
      { type: 'tab', value: 'catalogo', catalogTab: 'catalogo-crm', label: 'O Método' },
      (aba, sub) => visto.push([aba, sub]),
    );
    e.onClick();
    assert.deepEqual(visto, [['catalogo', 'catalogo-crm']]);
    assert.equal(e.to, undefined, 'dentro do painel não recarrega a tela');
  });

  test('fora do painel, vira link com a aba E a sub-seção na URL', () => {
    const e = entradaFlutuante({ type: 'tab', value: 'catalogo', catalogTab: 'catalogo-crm', label: 'O Método' }, null);
    assert.equal(e.to, '/Licensing?tab=catalogo&catalogTab=catalogo-crm');
  });

  test('aba sem sub-seção não inventa catalogTab na URL', () => {
    const e = entradaFlutuante({ type: 'tab', value: 'plano-carreira', label: 'Carreira' }, null);
    assert.equal(e.to, '/Licensing?tab=plano-carreira');
  });

  test('link continua indo pra rota que já existe', () => {
    const e = entradaFlutuante({ type: 'link', to: '/Metas', label: 'Metas' }, () => {});
    assert.equal(e.to, '/Metas');
    assert.equal(e.onClick, undefined);
  });
});
