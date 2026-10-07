// 🧾 DIR-200 — AUDITORIA FINANCEIRA DAS COMISSÕES (05/10/2026)
// Dono: "auditoria extremamente diligente; atualize os pagamentos após os 7 dias;
// relatório destrinchando os 10% dos depósitos, os 5% do leilão e a venda da loja
// por licença; traga erros e bugs." Relatório: docs/AUDITORIA_COMISSOES_2026-10-05.md
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { ORIGENS, PAPEIS, origemDoPapel, rotuloDoPapel, resumirPorOrigem, ehContaDaEmpresa } from '../src/lib/origemDaComissao.js';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));
const SQL = readFileSync(new URL('../supabase/migrations/20261005200000_auditoria_comissoes_relatorio.sql', import.meta.url), 'utf8');
const corpoDe = (nome) => {
  const i = SQL.indexOf(`create or replace function public.${nome}(`);
  assert.ok(i >= 0, `função ${nome} na migração`);
  return SQL.slice(i, SQL.indexOf('$$;', SQL.indexOf('as $$', i)));
};

test('achado 4.3: a liberação dos 7 dias só libera depósito que continua pago e sem contestação; dinheiro que saiu vira cancelado', () => {
  const f = corpoDe('liberar_saldos_maturados');
  const cancela = f.indexOf("set status = 'cancelado', released_at = now()");
  const libera = f.indexOf("set status = 'disponivel', released_at = now()");
  assert.ok(cancela > 0 && libera > cancela, 'primeiro corta o que saiu, depois libera o que está de pé');
  assert.ok(f.includes("coalesce(cs.gateway->>'situacao', '') in ('devolvido', 'devolvido_parcial', 'chargeback')"));
  assert.ok(f.includes("lower(coalesce(cs.status, '')) in ('paid', 'pago', 'entregue', 'confirmado', 'concluido')"));
  assert.ok(f.includes("not in ('retido', 'disputa', 'alterado', 'devolvido', 'devolvido_parcial', 'chargeback')") && f.includes('or cs.conciliacao_resolvida_em is not null'), 'em análise fica em espera até alguém tratar');
  assert.ok(f.includes("l.role_in_sale = 'indicacao_deposito'") && f.includes('l.release_at <= now()'), 'só indicação de depósito, só vencida');
  assert.ok(f.includes("'indicacao_deposito', m.sale_id, 'deposito', cs.total_amount") && f.includes("'confirmed', now()"), 'a linha Gerada continua nascendo na liberação');
  assert.ok(SQL.includes('revoke execute on function public.liberar_saldos_maturados() from public, anon, authenticated;'));
});

test('achado 4.4: estornar o depósito estorna a linha "Gerada" junto e avisa o que já estava pago', () => {
  const f = corpoDe('estornar_comissoes_do_deposito');
  assert.ok(f.includes("update public.commission_records set status = 'reversed'"));
  assert.ok(f.includes("where sale_id = _sale_id and role = 'indicacao_deposito' and status = 'confirmed' returning amount"));
  assert.ok(f.includes("where sale_id = _sale_id and role = 'indicacao_deposito' and status = 'paid'"));
  assert.ok(f.includes("'linhas_estornadas', round(_linhas, 2), 'ja_pagas', round(_ja_pagas, 2)"));
  // o que já valia (DIR-198) continua: a_liberar cancela, disponivel sai do saldo sem negativo
  assert.ok(f.includes("where sale_id = _sale_id and status = 'a_liberar' returning amount"));
  assert.ok(f.includes('set commission_balance = round(greatest(0, an.saldo - an.amt), 2)'));
});

test('o relatório é do banco, só servidor, com empresa à parte e auditoria viva saldo × extrato', () => {
  const f = corpoDe('relatorio_comissoes');
  assert.ok(f.includes("where referral_code = 'leilaonozap' or full_name = 'Leilão NoZap - Site Oficial'"), 'empresa achada por chave estável');
  assert.ok(f.includes("when r.role = 'indicacao_deposito' then 'deposito'") && f.includes("when r.role like 'leilao\\_%' then 'leilao'"), 'três origens');
  for (const k of ['origens', 'licencas', 'empresa', 'pessoas', 'saldos_fora_do_extrato', 'proximas_liberacoes', 'em_espera_vencidas']) assert.ok(f.includes(`'${k}',`), k);
  assert.ok(f.includes("where abs(s.saldo - s.extrato) >= 0.05"));
  assert.ok(f.includes("u.id not in (select id from emp)"), 'a empresa não entra nas pessoas');
  assert.ok(SQL.includes('revoke execute on function public.relatorio_comissoes() from public, anon, authenticated;'));
  const R = ler('../api/functions/relatorioComissoes.js');
  assert.ok(R.includes('conferirSessao(req)') && R.includes("const PAPEIS = ['admin', 'super_admin', 'admin_financeiro'];"), 'crachá obrigatório e só admin');
  assert.ok(R.includes("sb('rpc/relatorio_comissoes', { method: 'POST', body: '{}' })"));
  assert.ok(!/commission_balance\s*[:=]|method:\s*'PATCH'|method:\s*'DELETE'/.test(R), 'a rota só lê');
});

test('a tabela de origens e papéis: cada papel conhecido tem origem e nome em português', () => {
  assert.deepEqual(Object.keys(ORIGENS), ['deposito', 'leilao', 'loja']);
  for (const [role, p] of Object.entries(PAPEIS)) {
    assert.ok(['deposito', 'leilao', 'loja'].includes(p.origem), role);
    assert.ok(p.rotulo && p.rotulo !== role, role);
    assert.equal(origemDoPapel(role), p.origem);
    assert.equal(rotuloDoPapel(role), p.rotulo);
  }
  assert.equal(origemDoPapel('indicacao_deposito'), 'deposito');
  assert.equal(origemDoPapel('leilao_indicador'), 'leilao');
  assert.equal(origemDoPapel('leilao_executivo'), 'leilao');
  assert.equal(origemDoPapel('leilao_novo_papel'), 'leilao', 'prefixo leilao_ é leilão mesmo sem cadastro');
  assert.equal(origemDoPapel('vendedor'), 'loja');
  assert.equal(origemDoPapel('xyz'), 'loja');
  assert.equal(rotuloDoPapel('xyz'), 'xyz');
  assert.equal(rotuloDoPapel(null), '—');
  // os percentuais do contrato (arvoreOficial.js) estão escritos nos rótulos
  assert.equal(PAPEIS.vendedor.pct, '10%'); assert.equal(PAPEIS.parceiro.pct, '15%'); assert.equal(PAPEIS.influenciador.pct, '5%');
  assert.equal(PAPEIS.indicacao_deposito.pct, '10%'); assert.equal(PAPEIS.leilao_indicador.pct, '5%'); assert.equal(PAPEIS.leilao_executivo.pct, '10%');
});

test('resumo por origem de uma pessoa: geradas, pagas, estornadas e em espera, em centavos', () => {
  const r = resumirPorOrigem([
    { role: 'indicacao_deposito', status: 'paid', amount: 125 },
    { role: 'indicacao_deposito', status: 'confirmed', amount: 20 },
    { role: 'leilao_indicador', status: 'confirmed', amount: 0.1 },
    { role: 'leilao_indicador', status: 'confirmed', amount: 0.2 },
    { role: 'vendedor', status: 'confirmed', amount: 35.7 },
    { role: 'ceo', status: 'reversed', amount: 1.07 },
    { role: 'conselheiro', status: 'paid', amount: '0.51' },
  ], [{ amount: 300 }, { amount: 5 }]);
  assert.deepEqual(r.map((o) => o.origem), ['deposito', 'leilao', 'loja']);
  assert.deepEqual(r[0], { origem: 'deposito', rotulo: 'Indicação de depósito', a_receber: 20, pago: 125, estornado: 0, em_espera: 305 });
  assert.equal(r[1].a_receber, 0.3, 'sem 0.30000000000000004');
  assert.deepEqual([r[2].a_receber, r[2].pago, r[2].estornado], [35.7, 0.51, 1.07]);
  assert.deepEqual(resumirPorOrigem([], []), []);
  assert.deepEqual(resumirPorOrigem(null, null), []);
});

test('a conta da empresa sai do total das pessoas e ganha bloco próprio; o cartão mostra origem e cargo em português', () => {
  assert.equal(ehContaDaEmpresa({ referral_code: 'leilaonozap', full_name: 'qualquer' }), true);
  assert.equal(ehContaDaEmpresa({ full_name: 'Leilão NoZap - Site Oficial ' }), true);
  assert.equal(ehContaDaEmpresa({ full_name: 'Verônica', referral_code: 'vero' }), false);
  assert.equal(ehContaDaEmpresa(null), false);
  const P = ler('../src/pages/PagamentosComissoes.jsx');
  assert.ok(P.includes('empresa: ehContaDaEmpresa(u),'));
  assert.ok(P.includes('const pessoas = grupos.filter((g) => !g.empresa);'));
  assert.ok(P.includes('const totalGeralPendente = pessoas.reduce((s, g) => s + g.totalPendente, 0);'));
  assert.ok(P.includes("if (aba === 'a_pagar') return !g.empresa && (g.totalPendente > 0 || g.totalEmEspera > 0);"));
  assert.ok(P.includes("fetch('/api/functions/relatorioComissoes', { method: 'POST', headers: cabecalhosSessao({ 'Content-Type': 'application/json' }), body: '{}' })"));
  assert.ok(P.includes('<RelatorioComissoes relatorio={relatorio} carregando={relatorioCarregando} erro={relatorioErro} />'));
  const C = ler('../src/components/comissoes/ComissaoUsuarioCard.jsx');
  assert.ok(C.includes('const porOrigem = resumirPorOrigem(grupo.commissions, grupo.emEspera);'));
  assert.ok(C.includes('data-teste="resumo-por-origem"') && C.includes('data-teste="etiqueta-empresa"'));
  assert.ok(C.includes('{rotuloDoPapel(c.role)}') && !C.includes('text-gray-300">{c.role}</td>'));
  const R = ler('../src/components/comissoes/RelatorioComissoes.jsx');
  for (const t of ['relatorio-comissoes', 'tabela-licencas', 'bloco-empresa', 'proximas-liberacoes', 'saldos-fora-do-extrato', 'alerta-liberacao-atrasada', 'relatorio-indisponivel']) assert.ok(R.includes(`data-teste="${t}"`), t);
  assert.ok(R.includes('O extrato por pessoa abaixo continua valendo.'), 'relatório que falha nunca derruba o extrato');
});
