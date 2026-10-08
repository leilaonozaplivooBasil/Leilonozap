// 🏷️ DIR-210 — ARREMATE NÃO PAGO: CANCELAMENTO AUTOMÁTICO EM 48H (08/10/2026)
// Ordem do dono (item 4 das automações): "cancelamento em 48 horas, e a comissão do
// martelo estornada se não pagar". A DIR-205 lembrava e parava; aqui o cron de
// liquidação fecha o ciclo — no mesmo tick em que o banco acabou de recusar por
// falta de saldo. Quem mexe em dinheiro é só a função SQL cancelar_arremate_nao_pago.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { montarAviso, CATEGORIA_POR_TIPO, TIPOS_DE_AVISO, SITE } from '../api/_lib/textosDosAvisos.js';
import { PRAZO_CANCELAMENTO_ARREMATE_H, horasParaCancelar, prazoDoArremate, decisaoDoArremateSemSaldo, podeRepetir } from '../api/_lib/regrasDosAvisos.js';
import { TIPOS_NA_TELA, notificacaoDaTela } from '../api/_lib/notificacoesNaTela.js';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));
const SQL = readFileSync(new URL('../supabase/migrations/20261008200000_cancelar_arremate_nao_pago_v2.sql', import.meta.url), 'utf8');
const FIM = '2026-09-11T23:58:00Z';
const t0 = Date.parse(FIM);
const H = 3600000;

test('o prazo vem do ambiente: vazio = 48h, "0"/"off" desliga, número ≥ 1 vale, lixo cai nas 48', () => {
  assert.equal(PRAZO_CANCELAMENTO_ARREMATE_H, 48);
  assert.equal(horasParaCancelar(undefined), 48);
  assert.equal(horasParaCancelar(''), 48);
  assert.equal(horasParaCancelar('0'), null);
  assert.equal(horasParaCancelar('off'), null);
  assert.equal(horasParaCancelar('OFF'), null);
  assert.equal(horasParaCancelar('não'), null);
  assert.equal(horasParaCancelar('72'), 72);
  assert.equal(horasParaCancelar(' 24 '), 24);
  assert.equal(horasParaCancelar('0.5'), 48, 'menos de 1h não vale: cai no padrão');
  assert.equal(horasParaCancelar('lixo'), 48);
  assert.equal(horasParaCancelar('-5'), 48);
});

test('o fim do prazo: end_time + horas em ISO; desligado ou data ruim → null', () => {
  assert.equal(prazoDoArremate(FIM), '2026-09-13T23:58:00.000Z');
  assert.equal(prazoDoArremate(FIM, 24), '2026-09-12T23:58:00.000Z');
  assert.equal(prazoDoArremate(FIM, null), null);
  assert.equal(prazoDoArremate(FIM, 0), null);
  assert.equal(prazoDoArremate(null), null);
  assert.equal(prazoDoArremate('lixo'), null);
});

test('a decisão: esperar antes do prazo, adiar se o lembrete acabou de sair, manual se há outro leilão em jogo, senão cancelar', () => {
  const d = (extra) => decisaoDoArremateSemSaldo({ encerrouEm: FIM, ...extra });
  assert.equal(d({ agora: t0 + 47 * H + 59 * 60000 }), 'esperar', '47h59: ainda não');
  assert.equal(d({ agora: t0 + 48 * H }), 'cancelar', '48h em ponto: cancela');
  assert.equal(d({ agora: t0 + 26 * 24 * H }), 'cancelar');
  assert.equal(d({ agora: t0 + 48 * H, lembreteSaiuAgora: true }), 'adiar', 'cron parado >24h: avisou agora, não cancela no mesmo tick');
  assert.equal(d({ agora: t0 + 48 * H, outroLeilaoEmJogo: true }), 'manual');
  assert.equal(d({ agora: t0 + 48 * H, lembreteSaiuAgora: true, outroLeilaoEmJogo: true }), 'adiar', 'adiar vem antes de manual');
  assert.equal(d({ agora: t0 + 48 * H, horas: null }), 'esperar', 'desligado pelo ambiente');
  assert.equal(d({ agora: t0 + 48 * H, horas: 72 }), 'esperar');
  assert.equal(d({ agora: t0 + 72 * H, horas: 72 }), 'cancelar');
  assert.equal(decisaoDoArremateSemSaldo({ encerrouEm: null, agora: t0 + 99 * H }), 'esperar');
  assert.equal(decisaoDoArremateSemSaldo({ encerrouEm: 'lixo', agora: t0 + 99 * H }), 'esperar');
  assert.equal(decisaoDoArremateSemSaldo(), 'esperar');
});

test('o e-mail do lembrete ganha o prazo (só quando o cancelamento está ligado)', () => {
  const com = montarAviso('arremate_sem_saldo', { nome: 'Luiz Alberto', produto: 'cadeira presidente', valor: 246, saldo: 169.8, falta: 76.2, cancelaEm: prazoDoArremate(FIM) });
  assert.match(com.texto, /Prazo: se o saldo não entrar até 13\/09 às 20:58, o arremate é cancelado automaticamente e o que estiver reservado volta para a sua Carteira\./);
  const sem = montarAviso('arremate_sem_saldo', { produto: 'cadeira', valor: 246, saldo: 0, falta: 246 });
  assert.ok(!/Prazo:/.test(sem.texto), 'desligado: nenhuma promessa de cancelamento');
});

test('o e-mail do cancelamento: categoria leilão, diz o prazo, o que voltou e abre a porta para o engano', () => {
  assert.equal(CATEGORIA_POR_TIPO.arremate_cancelado, 'leilao');
  assert.ok(TIPOS_DE_AVISO.includes('arremate_cancelado'));
  assert.equal(podeRepetir('arremate_cancelado', '2026-09-14T00:00:00Z', Date.now()), false, 'sai uma vez por leilão');
  const a = montarAviso('arremate_cancelado', { nome: 'Luiz Alberto', produto: 'cadeira presidente', valor: 246, devolvido: 169.8, horas: 48 });
  assert.equal(a.assunto, 'Arremate cancelado por falta de saldo: cadeira presidente');
  assert.match(a.texto, /^Oi, Luiz! O seu arremate de cadeira presidente por R\$ 246,00 foi cancelado: o prazo de 48 horas depois do encerramento passou sem saldo suficiente na Carteira\./);
  assert.match(a.texto, /O valor que estava reservado \(R\$ 169,80\) já voltou para o seu saldo disponível\. O produto fica livre para outra pessoa\./);
  assert.match(a.texto, /Se isso foi um engano ou você já tinha depositado, responda este e-mail\./);
  assert.match(a.texto, new RegExp(`Ver leilões ativos: ${SITE}/leiloes`));
  assert.equal(a.categoria, 'leilao');
  const b = montarAviso('arremate_cancelado', { produto: 'cadeira', valor: 246, devolvido: 0, horas: 72 });
  assert.match(b.texto, /^Oi! O seu arremate de cadeira por R\$ 246,00 foi cancelado: o prazo de 72 horas/);
  assert.ok(!/já voltou/.test(b.texto), 'sem reserva, não promete devolução');
  assert.match(b.texto, /O produto fica livre para outra pessoa\./);
});

test('o sino: arremate em risco e arremate cancelado aparecem na tela, com prazo e link para a Carteira', () => {
  assert.ok(TIPOS_NA_TELA.includes('arremate_sem_saldo') && TIPOS_NA_TELA.includes('arremate_cancelado'));
  const r = notificacaoDaTela('arremate_sem_saldo', { produto: 'cadeira presidente', falta: 76.2, cancelaEm: prazoDoArremate(FIM) });
  assert.deepEqual(r, { titulo: 'Falta saldo para fechar seu arremate', texto: 'cadeira presidente: faltam R$ 76,20 na Carteira. Prazo: 13/09 às 20:58.', link: '/Carteira' });
  const r2 = notificacaoDaTela('arremate_sem_saldo', { produto: 'cadeira', falta: 246, segunda: true });
  assert.equal(r2.titulo, 'Seu arremate ainda espera saldo');
  assert.equal(r2.texto, 'cadeira: faltam R$ 246,00 na Carteira.');
  const c = notificacaoDaTela('arremate_cancelado', { produto: 'cadeira presidente', devolvido: 169.8, horas: 48 });
  assert.deepEqual(c, { titulo: 'Arremate cancelado', texto: 'cadeira presidente foi cancelado por falta de saldo depois de 48h. R$ 169,80 voltou para a sua Carteira.', link: '/Carteira' });
  assert.equal(notificacaoDaTela('arremate_cancelado', { produto: 'cadeira', devolvido: 0 }).texto, 'cadeira foi cancelado por falta de saldo depois de 48h.');
});

test('o cron: decide no mesmo ciclo da recusa, só a função SQL mexe em dinheiro, e o admin recebe o 2º colocado', () => {
  const L = ler('../api/functions/liquidarArrematesPendentes.js');
  assert.ok(L.includes("import { etapaDoLembreteDeArremate } from '../_lib/regrasDosAvisos.js';"), 'o pin da DIR-205 segue intacto');
  assert.ok(L.includes("import { prazoDoArremate, decisaoDoArremateSemSaldo, horasParaCancelar } from '../_lib/regrasDosAvisos.js';"));
  assert.ok(L.includes("import { avisarAdminUmaVezPorDia } from '../_lib/avisarAdmin.js';"));
  assert.ok(L.includes('const HORAS_PARA_CANCELAR = horasParaCancelar(process.env.ARREMATE_CANCELA_EM_HORAS);'), 'o interruptor é a variável de ambiente');
  assert.ok(L.includes('const cancelaEm = prazoDoArremate(a.end_time, HORAS_PARA_CANCELAR);'));
  assert.ok(L.includes("segunda: etapa === '24h', cancelaEm }"), 'o lembrete carrega o prazo');
  assert.ok(L.includes('lembreteSaiuAgora: !!lembrete?.enviado,'), 'avisou agora → não cancela no mesmo tick');
  assert.ok(L.includes('outroLeilaoEmJogo: HORAS_PARA_CANCELAR ? await temOutroLeilaoEmJogo(a) : false,'));
  assert.ok(L.includes('&or=(status.eq.active,order_status.eq.awaiting_payment)&limit=1'), 'outro leilão ativo ou outro arremate a pagar');
  assert.ok(L.includes('return !Array.isArray(j) || j.length > 0;'), 'não conseguiu conferir → caso manual');
  assert.ok(L.includes("if (decisao === 'manual') {") && L.includes('`arremate_cancelar_manual_${a.id}`'));
  assert.ok(L.includes("} else if (decisao === 'cancelar') {"));
  assert.ok(L.includes("sb('rpc/cancelar_arremate_nao_pago', {"), 'quem cancela é a função SQL');
  assert.ok(L.includes("_por: 'liquidarArrematesPendentes'"));
  assert.ok(L.includes('if (c?.success === true) {'));
  assert.ok(L.includes("tipo: 'arremate_cancelado', userId: a.winner_id, chave: a.id,"), 'o vencedor é avisado 1x por leilão');
  assert.ok(L.includes('const segundo = await segundoColocado(a);') && L.includes('`arremate_cancelado_${a.id}`'));
  assert.ok(L.includes('message_type=eq.bid&order=bid_amount.desc.nullslast,created_date.asc&limit=50'));
  assert.ok(L.includes('String(m.sender_id) !== String(a.winner_id)'), 'o 2º colocado não é o vencedor');
  assert.ok(L.includes("if (c?.error !== 'tem_saldo_agora')"), 'quem depositou no meio-tempo não é erro: o próximo tick liquida');
  assert.ok(L.includes("step: 'AVISO_ADMIN_FALHOU'"));
  assert.ok(L.includes('cancelamento,'), 'o resultado conta o cancelamento');
  assert.ok(L.includes('/EditAuction?id=${a.id}') && L.includes('Duplicar'), 'o admin recebe o caminho da reoferta');
  // o cron em si continua sem PATCH e sem escrever em app_users/auctions: o dinheiro só anda pela função SQL
  assert.ok(!/method:\s*'PATCH'/.test(L) && !/sb\('app_users|sb\(`app_users|sb\('auctions\?[^']*',\s*\{\s*method/.test(L));
});

test('a função SQL v2: recusa quem já tem saldo (tem_saldo_agora) antes de qualquer efeito, devolve a reserva uma vez só, e só o service_role chama', () => {
  assert.ok(SQL.includes('create or replace function public.cancelar_arremate_nao_pago(_auction_id text, _motivo text default null, _por text default null)'));
  assert.ok(SQL.includes("if coalesce(_a.order_status, '') <> 'awaiting_payment' then return jsonb_build_object('success', false, 'error', 'nao_esta_aguardando_pagamento'"));
  assert.ok(SQL.includes("return jsonb_build_object('success', false, 'error', 'plano_ou_teste_nao_cancela_aqui');"));
  assert.ok(SQL.includes('_valor := round(coalesce(_a.current_price, 0) + coalesce(_a.frete_reservado_valor, 0), 2);'));
  assert.ok(SQL.includes('select round(coalesce(saldo_disponivel, 0) + coalesce(saldo_reservado, 0), 2) into _saldo_agora'));
  assert.ok(SQL.includes('if found and _valor > 0 and _saldo_agora >= _valor then'));
  assert.ok(SQL.includes("return jsonb_build_object('success', false, 'error', 'tem_saldo_agora', 'saldo', _saldo_agora, 'valor', _valor);"));
  const guarda = SQL.indexOf("'tem_saldo_agora'"); const efeito = SQL.indexOf('with revertidas as (');
  assert.ok(guarda > 0 && efeito > guarda, 'a guarda vem antes de qualquer efeito');
  assert.ok(SQL.includes("where r.sale_id = _auction_id and coalesce(r.status, '') = 'confirmed'"), 'comissões do martelo → reversed');
  assert.ok(SQL.includes("set status = 'reversed'"));
  assert.ok(SQL.includes("l.tipo in ('devolucao_leilao_cancelado', 'devolucao_leilao_excluido', 'devolucao_arremate_cancelado')"), 'trava anti-devolução-dupla');
  assert.ok(SQL.includes("'devolucao_arremate_cancelado', 'saida_reserva', _liberar,"));
  assert.ok(SQL.includes("set order_status = 'cancelado', winner_id = null, winner_name = null,"));
  assert.ok(SQL.includes("jsonb_build_object('arremate_cancelado', _rastro)"));
  assert.ok(SQL.includes("values ('cancelar_arremate_nao_pago', 'CANCELADO', 'info',"));
  assert.ok(SQL.includes('revoke execute on function public.cancelar_arremate_nao_pago(text, text, text) from public, anon, authenticated;'));
});

test('o editor: leilão com arremate cancelado mostra o aviso e esconde o Reativar (o caminho é Duplicar)', () => {
  const E = ler('../src/pages/EditAuction.jsx');
  assert.ok(E.includes("auction && auction.order_status === 'cancelado' && ("));
  assert.ok(E.includes('Arremate cancelado sem pagamento'));
  assert.ok(E.includes('use <b>Duplicar</b>'));
  assert.ok(E.includes("(auction.status === 'ended' || auction.status === 'sold') && auction.order_status !== 'cancelado' && ("));
});
