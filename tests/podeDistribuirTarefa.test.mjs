// 🎯 QUEM PODE DISTRIBUIR TAREFA (15/09/2026).
//
// Pedido do dono: "esses dois usuários precisam ter a opção de distribuir
// tarefa (essa opção o Emannuel também deve ter)" — alcance (C), os três
// distribuem para qualquer um, igual a ele.
//
// Até aqui a tela era liberada por `visPapel.superAdmin`: só `super_admin`, ou
// seja, só o dono. O Emannuel, Diretor Operacional, não tinha.
//
// 🔴 POR QUE ISTO NÃO VIROU UM CARGO. Distribuir tarefa define QUANTO O DIA DO
// OUTRO VALE — a própria tela mostra "esta tarefa (peso 4) vale R$ 19,05". Os
// três lugares que pareciam servir para guardar a permissão já significam
// dinheiro ou navegação:
//     career_levels              → plano de comissão (0,5% do pool da diretoria)
//     xgame_participantes.cargo  → multa de atraso (50/200/500)
//     app_users.enabled_panels   → fonte de verdade da navegação
// Por isso a permissão ganhou coluna própria, `pode_distribuir`, que nasce
// FALSA e só liga por decisão registrada.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { podeDistribuirTarefa } from '../src/lib/xgame.js';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const semComentarios = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');

describe('a regra', () => {
  test('o dono distribui sempre, mesmo sem registro no jogo', () => {
    // Trancar o super_admin fora da própria ferramenta por causa de uma linha
    // ausente em xgame_participantes seria trocar um problema por outro.
    assert.equal(podeDistribuirTarefa({ role: 'super_admin' }), true);
    assert.equal(podeDistribuirTarefa({ role: 'super_admin', pode_distribuir: false }), true);
  });

  test('🔴 quem está liberado no jogo distribui, seja qual for o cargo', () => {
    // É o caso dos dois vendedores e do Diretor Operacional — nenhum é
    // super_admin, e os três precisam do botão.
    for (const role of ['user', 'admin', 'licensee', 'admin_financeiro', undefined]) {
      assert.equal(podeDistribuirTarefa({ role, pode_distribuir: true }), true, `role ${role}`);
    }
  });

  test('🔒 quem NÃO está liberado não distribui — nem admin', () => {
    for (const role of ['user', 'admin', 'licensee', 'admin_financeiro', undefined]) {
      assert.equal(podeDistribuirTarefa({ role, pode_distribuir: false }), false, `role ${role}`);
    }
  });

  test('🔒 ausência de registro é NÃO, nunca sim', () => {
    // Sem linha no X-Game, sem consulta, consulta que falhou: tudo isso chega
    // aqui como undefined/null. Liberar por otimismo seria dar a régua do
    // salário alheio a quem o banco não disse que pode.
    assert.equal(podeDistribuirTarefa(), false);
    assert.equal(podeDistribuirTarefa({}), false);
    assert.equal(podeDistribuirTarefa({ role: 'user' }), false);
    assert.equal(podeDistribuirTarefa({ role: 'user', pode_distribuir: null }), false);
    assert.equal(podeDistribuirTarefa({ role: 'user', pode_distribuir: undefined }), false);
  });

  test('🔒 só o booleano `true` libera — texto e número não', () => {
    // PostgREST e formulários trazem coisas como 'true', 1, 'on'. Se qualquer
    // um deles passasse, um valor sujo no banco viraria permissão.
    for (const sujo of ['true', 'TRUE', 1, '1', 'sim', {}, [], 'false', 0]) {
      assert.equal(podeDistribuirTarefa({ role: 'user', pode_distribuir: sujo }), false,
        `aceitou ${JSON.stringify(sujo)}`);
    }
  });
});

describe('a fiação', () => {
  test('🔴 a tela usa a regra, e não mais o crachá de super admin', () => {
    const tela = semComentarios(ler('../src/pages/Licensing.jsx'));
    assert.match(tela, /podeDistribuirTarefa\(\{ role: user\?\.role, pode_distribuir: liberadoNoJogo \}\)/);
    assert.match(tela, /<XPerformance[^>]*gestao=\{podeDistribuir\}/);
    assert.match(tela, /<MentalidadePagina[^>]*gestao=\{podeDistribuir\}/);
    assert.ok(!/gestao=\{visPapel\.superAdmin\}/.test(tela),
      'voltou a liberar a distribuição só pelo crachá de super admin');
  });

  test('🔒 a leitura falha para NÃO — nunca para sim', () => {
    const tela = semComentarios(ler('../src/pages/Licensing.jsx'));
    assert.match(tela, /catch\(\(\) => \{ if \(vivo\) setLiberadoNoJogo\(false\); \}\)/);
    assert.match(tela, /useState\(false\)/);
    assert.match(tela, /data\?\.pode_distribuir === true/);
  });

  test('o interruptor existe na ADM X-Game, com o aviso do que ele significa', () => {
    const adm = ler('../src/components/licensing/XGameAdmin.jsx');
    assert.match(adm, /pode_distribuir: !p\.pode_distribuir/);
    assert.match(adm, /DICAS\.distribui/);
    assert.match(adm, /distribui tarefa/);
    // o aviso precisa dizer o que está em jogo, não só "libera a tela"
    assert.match(adm, /distribui: '[^']*quanto o dia do outro vale/i);
  });

  test('a migração cria a coluna, e ela nasce FALSA', () => {
    const sql = ler('../supabase/migrations/20260915190301_pode_distribuir_tarefa.sql');
    assert.match(sql, /add column if not exists pode_distribuir boolean not null default false/);
    // e o motivo de não ter virado cargo fica escrito junto da coluna
    assert.match(sql, /career_levels/);
    assert.match(sql, /multa de atraso/i);
  });
});
