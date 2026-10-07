// 🛡️ DIR-204 — O SISTEMA QUE VIGIA O SISTEMA + O FECHAMENTO DO DIA (07/10/2026)
// Dono: "quais automações seriam de fato importantes… tipo equipe sênior";
// "cirúrgicas, não quebre nada que esteja funcionando, só melhore".
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { textoDoAlerta, alertasParaAvisar, textoDoFechamento, reais } from '../api/_lib/textosDoVigia.js';
import { diaDeOntem } from '../api/functions/fechamentoDiario.js';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));
const SQL = readFileSync(new URL('../supabase/migrations/20261007200000_vigia_financeiro_e_fechamento_diario.sql', import.meta.url), 'utf8');

test('as duas funções do banco SÓ LEEM e não ficam expostas ao navegador', () => {
  assert.ok(SQL.includes('create or replace function public.vigia_financeiro()'));
  assert.ok(SQL.includes('create or replace function public.fechamento_diario(_dia date default'));
  assert.ok(SQL.includes('revoke execute on function public.vigia_financeiro() from public, anon, authenticated;'));
  assert.ok(SQL.includes('revoke execute on function public.fechamento_diario(date) from public, anon, authenticated;'));
  const corpo = SQL.replace(/--[^\n]*/g, '');
  assert.ok(!/\b(update|delete from|insert into|truncate|alter table)\b/i.test(corpo), 'nenhuma escrita em tabela');
  assert.ok(/returns jsonb language plpgsql security definer stable/.test(corpo));
});

test('o vigia confere as dez regras do dinheiro', () => {
  for (const codigo of ['saldo_fora_do_extrato', 'liberacao_atrasada', 'indicacao_a_conferir', 'venda_sem_comissao', 'leilao_sem_comissao', 'credito_falhou', 'cupom_sem_deposito', 'conciliacao_pendente', 'acao_gateway_pendente', 'webhook_mudo', 'robo_parado']) {
    assert.ok(SQL.includes(`'codigo', '${codigo}'`), codigo);
  }
  assert.ok(SQL.includes('_rel := public.relatorio_comissoes();') && SQL.includes('_conc := public.painel_conciliacao();'));
  // venda/leilão sem comissão: só o que já teve tempo de processar (15 min) e nas últimas 48h; teste e plano ficam de fora
  assert.ok(SQL.includes("and cs.created_at <= now() - interval '15 minutes'"));
  assert.ok(SQL.includes("and coalesce(a.is_test_auction, false) = false and coalesce(a.is_investment_plan, false) = false"));
  // leitura do pg_cron nunca derruba o vigia
  assert.ok(SQL.includes('exception when others then') && SQL.includes("'status', 'sem_leitura'"));
});

test('rotas de cron: exigem CRON_SECRET, só leem, e estão agendadas no vercel.json', () => {
  const V = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const vig = V.crons.find((c) => c.path === '/api/functions/vigiaFinanceiro');
  const fec = V.crons.find((c) => c.path === '/api/functions/fechamentoDiario');
  assert.equal(vig?.schedule, '23 * * * *', 'vigia de hora em hora');
  assert.equal(fec?.schedule, '0 10 * * *', 'fechamento às 07h de Brasília (10h UTC)');
  for (const f of ['../api/functions/vigiaFinanceiro.js', '../api/functions/fechamentoDiario.js']) {
    const S = ler(f);
    assert.match(S, /process\.env\.CRON_SECRET/, f);
    assert.ok(!/method:\s*'(PATCH|DELETE|PUT)'/.test(S), `${f} não altera nada`);
    // a única escrita é a memória em system_logs
    const posts = [...S.matchAll(/sb\('([^']+)',\s*\{\s*method:\s*'POST'/g)].map((m) => m[1]);
    assert.ok(posts.every((p) => p === 'system_logs' || p.startsWith('rpc/')), `${f} escreve só em system_logs: ${posts}`);
  }
  const VG = ler('../api/functions/vigiaFinanceiro.js');
  assert.ok(VG.includes("sb('rpc/vigia_financeiro', { method: 'POST', body: '{}' })"));
  assert.ok(VG.includes('avisarAdminUmaVezPorDia(`vigia_${a.codigo}`, textoDoAlerta(a), { sb, horas: HORAS_SEM_REPETIR })'), 'uma mensagem por assunto, sem repetir antes de 6h');
  assert.ok(VG.includes('const HORAS_SEM_REPETIR = 6;'));
  const FD = ler('../api/functions/fechamentoDiario.js');
  assert.ok(FD.includes('const passo = `FECHAMENTO_DIARIO_${dia.replace(/-/g, \'\')}`;'));
  assert.ok(FD.includes("if (Array.isArray(ja) && ja.length && !pedido) return res.status(200).json({ ok: true, enviado: false, motivo: 'ja_enviado', dia });"), 'um fechamento por dia');
  assert.ok(FD.includes("sb('rpc/fechamento_diario', { method: 'POST', body: JSON.stringify({ _dia: dia }) })"));
});

test('dinheiro saindo no gateway avisa o administrador NA HORA (webhook e conciliação), sem derrubar o fluxo', () => {
  for (const f of ['../api/functions/mpWebhook.js', '../api/functions/conciliarMercadoPago.js']) {
    const S = ler(f);
    assert.ok(S.includes("import { avisarAdmin } from '../_lib/avisarAdmin.js';"), f);
    assert.ok(S.includes('avisarAdmin(`🔴 *Dinheiro saiu no gateway*'), f);
    assert.match(S, /avisarAdmin\(`🔴 \*Dinheiro saiu no gateway\*[\s\S]*?\)\.catch\(\(\) => \{\}\);/, `${f}: nunca derruba`);
  }
  // só quando o bloqueio foi feito AGORA (não repete em bloqueio já feito)
  assert.ok(ler('../api/functions/mpWebhook.js').includes('if (b?.success && !b.ja_bloqueado) {'));
  assert.ok(ler('../api/functions/conciliarMercadoPago.js').includes('if (bloqueio?.success && !bloqueio.ja_bloqueado) {'));
});

test('textos: alerta vermelho antes do amarelo, fechamento legível, nada quebra com dados faltando', () => {
  assert.equal(textoDoAlerta(null), '');
  const t = textoDoAlerta({ codigo: 'saldo_fora_do_extrato', gravidade: 'vermelho', titulo: '1 conta(s) com saldo diferente do extrato', detalhe: 'Fulano: saldo R$ 10 × extrato R$ 5' });
  assert.ok(t.startsWith('🔴 *Vigia financeiro*') && t.includes('Fulano') && t.includes('Onde ver:'));
  assert.ok(textoDoAlerta({ codigo: 'x', gravidade: 'amarelo', titulo: 'y' }).startsWith('🟡'));
  const ordem = alertasParaAvisar([{ codigo: 'a', gravidade: 'amarelo', titulo: 'a' }, { codigo: 'b', gravidade: 'vermelho', titulo: 'b' }, { codigo: 'sem_titulo' }, null]);
  assert.deepEqual(ordem.map((a) => a.codigo), ['b', 'a']);
  assert.equal(reais(1234.5), 'R$ 1.234,50');

  assert.equal(textoDoFechamento(null), '');
  const f = textoDoFechamento({
    dia: '2026-10-06', de: '2026-10-06T03:00:00+00:00',
    entradas: { depositos: { n: 2, total: 700 }, loja: { n: 1, total: 85.37 }, arremates_pagos: { n: 0, total: 0 }, liquido_gateway: 693.07 },
    saidas: { avisos_dinheiro_saiu: 0, bloqueado_na_carteira: 0, devolucoes_pelo_gateway: 0 },
    comissoes: { geradas: { n: 30, total: 25.49 }, em_espera_criadas: { n: 2, total: 70 }, liberadas: { n: 1, total: 5 }, pagas_na_mao: { n: 7, total: 671.04 }, estornadas: { n: 0, total: 0 }, empresa: 5.12 },
    saldos: { pessoas: 1153.38, em_espera: 1636, empresa: 4942.19, carteiras_clientes: 29112.79, reservado_em_lances: 861.72 },
    bonus: { liberado: 0, gastavel_total: 2406.47 },
    movimento: { cadastros: 6, lances: 3, leiloes_encerrados: { n: 0, total: 0 }, arremates_a_pagar: { n: 1, total: 246 } },
    auditoria: { alertas: [] },
  });
  assert.ok(f.startsWith('📊 *Fechamento de 06/10*'));
  assert.ok(f.includes('• Depósitos: 2 · R$ 700,00') && f.includes('• Líquido confirmado no gateway: R$ 693,07'));
  assert.ok(f.includes('• Pagas na mão: 7 · R$ 671,04') && f.includes('• Ficou com a empresa: R$ 5,12'));
  assert.ok(!f.includes('Estornadas/canceladas'), 'linha zerada não aparece');
  assert.ok(f.includes('• Arremates aguardando pagamento: 1 · R$ 246,00'));
  assert.ok(f.includes('✅ *Auditoria*: tudo bate'));
  const g = textoDoFechamento({ dia: '2026-10-06', auditoria: { alertas: [{ gravidade: 'vermelho', titulo: 'X' }] } });
  assert.ok(g.includes('⚠️ *Auditoria*: 1 alerta(s)\n• 🔴 X') && g.includes('• Depósitos: 0 · R$ 0,00'));
});

test('diaDeOntem: o fechamento das 07h fala do dia anterior em Brasília', () => {
  // 07/10 10:00 UTC = 07/10 07:00 Brasília → fecha 06/10
  assert.equal(diaDeOntem(Date.parse('2026-10-07T10:00:00Z')), '2026-10-06');
  // 07/10 01:00 UTC ainda é 06/10 22:00 em Brasília → fecha 05/10
  assert.equal(diaDeOntem(Date.parse('2026-10-07T01:00:00Z')), '2026-10-05');
  // virada de mês e de ano
  assert.equal(diaDeOntem(Date.parse('2027-01-01T10:00:00Z')), '2026-12-31');
});
