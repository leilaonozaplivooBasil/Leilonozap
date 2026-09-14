// 💰 O parceiro de compra que o menu chamava de CLIENTE (14/09/2026).
//
// Relato do Renan Silva, o PRIMEIRO parceiro de compra puro da base: "ainda
// está como cliente, e não como parceiro". Estava mesmo — e o painel dele
// funcionava o tempo todo: `panelResolver` já abria o parceiro_compra pelo
// `partner_plan_activated_at`, e lá dentro a tela dizia "PARCEIRO COMERCIAL".
// Só a camada visual do menu (selo de texto + medalha) não sabia que esse eixo
// existe: ela lia `career_levels`/`primary_career_level` e mais nada.
//
// Por que nunca tinha aparecido: só há dois parceiros de compra na base, e o
// outro é o Luciano, que tem `fundador` no career_levels — a medalha dele vinha
// do cargo e escondia o buraco.
//
// ⚠️ O QUE ESTE TESTE PROTEGE, E É O PONTO INTEIRO: o selo NÃO pode virar cargo.
// O cargo de rede `parceiro` é o degrau 5 da escada (15% de venda direta, rebate
// sobre licenciado, direito de cadastrar). Parceiro de compra é capital aportado.
// Se um dia alguém "simplificar" isso escrevendo 'parceiro' no career_levels pra
// resolver a aparência, vira comissão de 15% que ninguém decidiu.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ehParceiroDeCompra, resolveUserPanels } from '../src/lib/panelResolver.js';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

describe('ehParceiroDeCompra', () => {
  test('a data de ativação sozinha já vale — é o caso do Renan', () => {
    // Ativado pela diretoria sem declarar valor: activated_at preenchido,
    // active_partner_plan e partner_plan_amount nulos de propósito (não se
    // calcula rendimento sobre capital não declarado).
    assert.equal(ehParceiroDeCompra({
      partner_plan_activated_at: '2026-09-14T16:42:36.746Z',
      active_partner_plan: null,
      partner_plan_amount: null,
    }), true);
  });

  test('o nome do plano sozinho também vale', () => {
    assert.equal(ehParceiroDeCompra({ active_partner_plan: 'Plano Visionário' }), true);
  });

  test('cliente comum não é parceiro de compra', () => {
    assert.equal(ehParceiroDeCompra({ career_levels: ['usuario'], role: 'user' }), false);
  });

  test('não explode com null/undefined', () => {
    assert.equal(ehParceiroDeCompra(null), false);
    assert.equal(ehParceiroDeCompra(undefined), false);
    assert.equal(ehParceiroDeCompra({}), false);
  });

  test('o cargo de rede `parceiro` NÃO torna ninguém parceiro de compra', () => {
    // São dois eixos. Confundir os dois é o erro que este arquivo existe pra evitar.
    assert.equal(ehParceiroDeCompra({ career_levels: ['parceiro'] }), false);
  });
});

describe('o painel do parceiro de compra continua abrindo pelo mesmo campo', () => {
  test('quem tem data de ativação recebe o painel parceiro_compra', () => {
    const paineis = resolveUserPanels({
      email: 'renansilvamaestroo@gmail.com',
      role: 'user',
      career_levels: ['usuario'],
      partner_plan_activated_at: '2026-09-14T16:42:36.746Z',
    }).map((p) => p.key);
    assert.ok(paineis.includes('parceiro_compra'), `painéis: ${paineis.join(', ')}`);
  });

  test('e NÃO ganha o Painel de Alavancagem por ser parceiro de compra', () => {
    // A alavancagem é do influenciador pra cima, por CARGO. Capital aportado
    // não compra degrau na escada.
    const paineis = resolveUserPanels({
      email: 'renansilvamaestroo@gmail.com',
      role: 'user',
      career_levels: ['usuario'],
      partner_plan_activated_at: '2026-09-14T16:42:36.746Z',
    }).map((p) => p.key);
    assert.ok(!paineis.includes('licenciado'), 'parceiro de compra não entra na alavancagem');
    assert.ok(!paineis.includes('vendedor'), 'parceiro de compra não vira vendedor');
    assert.ok(!paineis.includes('lojista'), 'parceiro de compra não vira lojista');
  });
});

// ── Os dois arquivos visuais: prova de fiação ────────────────────────────────
// roleBadge.js e selosCargo.js importam lucide-react e o alias "@/", que este
// runner não resolve. Então aqui conferimos a LIGAÇÃO (que os dois passaram a
// usar a mesma fonte única) e, logo abaixo, replicamos a regra para provar o
// EFEITO — que é o que o Renan vê na tela.
describe('a fiação dos dois arquivos visuais', () => {
  test('o selo de texto usa ehParceiroDeCompra, e DEPOIS do cargo de rede', () => {
    const src = ler('../src/lib/roleBadge.js');
    assert.match(src, /import \{ ehParceiroDeCompra \} from "@\/lib\/panelResolver"/);
    const posRede = src.indexOf('const rede = getRedeCargo(user)');
    const posParceiro = src.indexOf('if (ehParceiroDeCompra(user)) return');
    assert.ok(posRede > -1 && posParceiro > posRede,
      'o parceiro de compra tem que vir DEPOIS do cargo de rede, senão o distribuidor perde o selo dele');
  });

  test('a medalha usa a mesma fonte única e só quando não há cargo', () => {
    const src = ler('../src/lib/selosCargo.js');
    assert.match(src, /import \{ ehParceiroDeCompra \} from '@\/lib\/panelResolver'/);
    assert.match(src, /cargo === 'usuario' && ehParceiroDeCompra\(user\)/);
  });

  test('nenhum dos dois grava cargo — só lê', () => {
    for (const rel of ['../src/lib/roleBadge.js', '../src/lib/selosCargo.js']) {
      const src = ler(rel);
      assert.ok(!/career_levels\s*=|primary_career_level\s*=[^=]/.test(src),
        `${rel} passou a ESCREVER cargo — selo não promove ninguém`);
    }
  });
});

// Réplica da precedência do selo, para provar o efeito e não só a fiação.
const selo = (user) => {
  const REDE = ['distribuidor', 'loja_fisica', 'ponto_retirada', 'parceiro', 'licenciado', 'vendedor', 'influenciador'];
  const LABEL = {
    distribuidor: 'DISTRIBUIDOR', loja_fisica: 'LOJA FÍSICA', ponto_retirada: 'PONTO DE RETIRADA',
    parceiro: 'PARCEIRO', licenciado: 'LICENCIADO', vendedor: 'VENDEDOR', influenciador: 'INFLUENCIADOR',
  };
  const roleKey = user?.role || 'user';
  if (roleKey === 'admin' || roleKey === 'super_admin') return 'ADMIN';
  const niveis = Array.isArray(user?.career_levels) ? user.career_levels : [];
  const rede = REDE.find((c) => niveis.includes(c));
  if (rede) return LABEL[rede];
  if (ehParceiroDeCompra(user)) return 'PARCEIRO';
  return 'CLIENTE';
};

describe('o efeito na tela do Renan', () => {
  const renan = {
    full_name: 'Renan Silva', role: 'user', career_levels: ['usuario'],
    partner_plan_activated_at: '2026-09-14T16:42:36.746Z',
  };

  test('antes dizia CLIENTE; agora diz PARCEIRO', () => {
    assert.equal(selo(renan), 'PARCEIRO');
  });

  test('o cabeçalho do menu monta "Painel do PARCEIRO"', () => {
    // NavMobile.jsx e UserAvatarMenu.jsx escrevem `Painel do ${badge.label}`.
    assert.equal(`Painel do ${selo(renan)}`, 'Painel do PARCEIRO');
  });

  test('cliente comum continua CLIENTE — ninguém sobe de graça', () => {
    assert.equal(selo({ role: 'user', career_levels: ['usuario'] }), 'CLIENTE');
  });

  test('o Luciano (fundador E parceiro de compra) continua com o cargo dele', () => {
    // Caso real da base: se o parceiro de compra viesse antes, o fundador
    // perderia o próprio selo.
    assert.equal(selo({
      role: 'admin', career_levels: ['distribuidor', 'fundador'],
      active_partner_plan: 'Plano Visionário',
    }), 'ADMIN');
    assert.equal(selo({
      role: 'user', career_levels: ['distribuidor'],
      active_partner_plan: 'Plano Visionário',
    }), 'DISTRIBUIDOR');
  });

  test('o selo PARCEIRO não é o cargo `parceiro`: career_levels fica intocado', () => {
    assert.deepEqual(renan.career_levels, ['usuario']);
  });
});
