// 🧾 DIR-201 — AS DECISÕES DA AUDITORIA DAS COMISSÕES (05/10/2026)
// Dono: "QUERO QUE VOCÊ DECIDA ISSO". Decidido: compra com saldo deixa rastro
// (linha negativa, nunca pagável); a empresa fica fora dos 10% de indicação;
// leilão segue no martelo; nada retroativo nas vendas Nexus; cargos ficam.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { PAPEIS, ehLinhaDeUso, resumirPorOrigem, rotuloDoPapel } from '../src/lib/origemDaComissao.js';
import { linhaPagavel, podeMarcarPagas, somaDasSelecionadas } from '../src/lib/pagamentoManualDeComissao.js';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));
const SQL = readFileSync(new URL('../supabase/migrations/20261005230000_decisoes_da_auditoria.sql', import.meta.url), 'utf8');
const corpoDe = (nome) => {
  const i = SQL.indexOf(`create or replace function public.${nome}(`);
  assert.ok(i >= 0, `função ${nome} na migração`);
  const j = SQL.indexOf('create or replace function public.', i + 10);
  return SQL.slice(i, j > 0 ? j : SQL.length);
};

test('4.9: a conta oficial da empresa não recebe os 10% de indicação de depósito', () => {
  const f = corpoDe('trg_deposito_paga_indicador');
  assert.ok(f.includes('select a.id, a.full_name, a.primary_career_level, a.active, a.referral_code'));
  const corte = f.indexOf("if coalesce(_ind.referral_code, '') = 'leilaonozap' or _ind.full_name = 'Leilão NoZap - Site Oficial' then return new; end if;");
  const insere = f.indexOf('insert into public.commission_ledger');
  assert.ok(corte > 0 && insere > corte, 'o corte vem ANTES de lançar a comissão');
  // o que já valia continua: só depósito, só na virada para pago, âncora, auto-indicação, indicador ativo
  for (const t of ["if coalesce(new.kind,'') <> 'wallet_deposit' then return new; end if;", "if tg_op = 'UPDATE' and coalesce(old.status,'') = 'paid' then return new; end if;", 'public._indicacao_deposito_inicio()', 'if _quem_indicou = new.buyer_id then return new; end if;', 'if _ind.active is false then return new; end if;']) assert.ok(f.includes(t), t);
});

test('4.2: compra paga com saldo de comissão deixa rastro — linha negativa e lançamento na carteira, depois da venda', () => {
  const f = corpoDe('comprar_com_saldo');
  const venda = f.indexOf('insert into catalog_sales (');
  const rastro = f.indexOf('if v_da_comissao > 0 then');
  assert.ok(venda > 0 && rastro > venda, 'o rastro nasce depois da venda gravada');
  assert.ok(f.includes("values (_buyer, coalesce(_buyer_name, v_buyer_nome), -v_da_comissao, 0, 'compra_com_saldo', v_sale, 'uso', v_total,"));
  assert.ok(f.includes("'confirmed', now());"));
  assert.ok(f.includes("values (_buyer, v_sale, 'compra_com_comissao', -v_da_comissao, v_comissao, round(v_comissao - v_da_comissao, 2),"));
  // a cobrança não mudou: depósito primeiro, comissão só no que sobrar, trava de linha
  assert.ok(f.includes('v_do_deposito := round(least(v_livre_deposito, v_total), 2);') && f.includes('v_da_comissao := round(v_total - v_do_deposito, 2);'));
  assert.ok(f.includes('from app_users where id = _buyer for update;'));
  assert.ok(f.includes("'pago_com_deposito', v_do_deposito, 'pago_com_comissao', v_da_comissao,"), 'a resposta continua igual para quem já lê');
});

test('a linha de uso: tem nome, abate do "a receber" por origem e NUNCA é pagável (tela e servidor)', () => {
  assert.equal(PAPEIS.compra_com_saldo.rotulo, 'Usado em compra na loja');
  assert.equal(rotuloDoPapel('compra_com_saldo'), 'Usado em compra na loja');
  assert.equal(ehLinhaDeUso({ role: 'compra_com_saldo', amount: -5 }), true);
  assert.equal(ehLinhaDeUso({ role: 'vendedor', amount: -1 }), true, 'qualquer negativa é uso');
  assert.equal(ehLinhaDeUso({ role: 'vendedor', amount: 10 }), false);
  assert.equal(ehLinhaDeUso(null), false);
  const r = resumirPorOrigem([{ role: 'ceo', status: 'confirmed', amount: 100 }, { role: 'compra_com_saldo', status: 'confirmed', amount: -105.09 }]);
  assert.equal(r[0].a_receber, -5.09, 'o uso abate do a receber da loja');
  assert.equal(linhaPagavel({ status: 'confirmed', amount: -105.09 }), false);
  assert.equal(linhaPagavel({ status: 'confirmed', amount: 0 }), false);
  assert.equal(linhaPagavel({ status: 'confirmed', amount: 1 }), true);
  const comissoes = [{ id: 'a', status: 'confirmed', amount: 10 }, { id: 'b', status: 'confirmed', amount: -4 }];
  assert.equal(somaDasSelecionadas(comissoes, ['a', 'b']), 10, 'a negativa marcada por engano não entra na soma');
  assert.deepEqual(podeMarcarPagas({ comissoes, ids: ['b'], saldo: 50 }), { ok: false, motivo: 'nenhuma', total: 0 });
  const C = ler('../src/components/comissoes/ComissaoUsuarioCard.jsx');
  assert.ok(C.includes('data-teste="status-usado-em-compra"') && C.includes(': ehLinhaDeUso(c) ? ('));
  const S = ler('../api/functions/payCommissionManually.js');
  assert.ok(S.includes("if (estadoAntes.some((l) => !(Number(l.amount) > 0))) {") && S.includes("error: 'Linha de uso em compra não é pagável.'"), 'o servidor recusa mesmo com tela velha');
});

test('as decisões ficam escritas na migração: martelo mantido, Nexus sem retroativo, cargos ficam', () => {
  assert.ok(SQL.includes('4.5      Leilão continua pagando no martelo'));
  assert.ok(SQL.includes('4.7      As 16 vendas Nexus de 03–15/08 NÃO ganham comissão retroativa'));
  assert.ok(SQL.includes('4.10     Quem foi zerado em 28/09 mantém o cargo'));
});
