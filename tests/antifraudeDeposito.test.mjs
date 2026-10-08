// 🛡️ DIR-211 — ANTIFRAUDE DE DEPÓSITO: A ESPERA ANTES DO CRÉDITO (08/10/2026)
// Dono (item 6 das automações): "depósito grande de conta nova, ou vários PIX seguidos,
// entram em espera de 1 hora com aviso para a Beatriz aprovar". Caso Diogo (02/10):
// R$ 3.300 em 4 PIX creditados na hora e devolvidos pelo gateway 2h depois.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import {
  VALOR_ALTO, CONTA_NOVA_H, SEQUENCIA_N, SEQUENCIA_SOMA_MIN, VETERANO_DEPOSITOS, VETERANO_DIAS, ESPERA_MIN,
  MOTIVOS, AUTO_LIBERA_MOTIVOS, KINDS_DE_DEPOSITO, STATUS_SEGURAVEIS, avaliarDeposito, decisaoDoPortao, statusNoExtrato, esperaAte, rotuloDoMotivo,
  textoParaAdmin, textoLembreteAdmin, liberaSozinho,
} from '../api/_lib/antifraudeDeposito.js';
import { montarAviso, CATEGORIA_POR_TIPO, TIPOS_DE_AVISO, SITE } from '../api/_lib/textosDosAvisos.js';
import { pessoaAceita } from '../api/_lib/regrasDosAvisos.js';
import { TIPOS_NA_TELA, notificacaoDaTela } from '../api/_lib/notificacoesNaTela.js';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));
const SQL = readFileSync(new URL('../supabase/migrations/20261008210000_antifraude_deposito.sql', import.meta.url), 'utf8');
const AGORA = Date.parse('2026-10-08T20:00:00Z');
const H = 3600000;
const venda = (extra = {}) => ({ id: 'v1', kind: 'wallet_deposit', status: 'pending_payment', total_amount: 500, buyer_id: 'u1', ...extra });
const conta = (horas) => ({ id: 'u1', created_date: new Date(AGORA - horas * H).toISOString() });
const dep = (id, total, extra = {}) => ({ id, total_amount: total, status: 'paid', ...extra });
const antigosOk = (n) => Array.from({ length: n }, (_, i) => ({ id: `a${i}`, gateway: { situacao: 'liberado' } }));

test('as constantes da régua (1 linha para o dono mudar)', () => {
  assert.equal(VALOR_ALTO, 1000); assert.equal(CONTA_NOVA_H, 24);
  assert.equal(SEQUENCIA_N, 3); assert.equal(SEQUENCIA_SOMA_MIN, 1000);
  assert.equal(VETERANO_DEPOSITOS, 3); assert.equal(VETERANO_DIAS, 7); assert.equal(ESPERA_MIN, 60);
  assert.deepEqual(MOTIVOS, { CONTA_NOVA: 'conta_nova_valor_alto', SEQUENCIA: 'sequencia_de_depositos', GATEWAY: 'dinheiro_saiu_no_gateway' });
  assert.deepEqual([...KINDS_DE_DEPOSITO], ['wallet_deposit', 'passaporte', 'commission_deposit'], 'tudo que vira saldo passa pelo portão');
  assert.deepEqual([...STATUS_SEGURAVEIS], ['pending_payment', 'canceled', 'cancelado', 'cancelled'], 'QR cancelado e pago tarde também espera');
  assert.deepEqual([...AUTO_LIBERA_MOTIVOS], ['sequencia_de_depositos'], 'conta nova com valor alto só libera com decisão humana');
  assert.equal(liberaSozinho('sequencia_de_depositos'), true); assert.equal(liberaSozinho('conta_nova_valor_alto'), false); assert.equal(liberaSozinho(null), false);
  assert.equal(esperaAte(AGORA), '2026-10-08T21:00:00.000Z');
});

test('R1 — conta criada há menos de 24h com depósito ≥ R$ 1.000; sem comprador não segura (falha aberta)', () => {
  assert.equal(avaliarDeposito({ sale: venda({ total_amount: 1500 }), comprador: conta(2), agora: AGORA }).motivo, 'conta_nova_valor_alto');
  assert.equal(avaliarDeposito({ sale: venda({ total_amount: 1000 }), comprador: conta(23.9), agora: AGORA }).motivo, 'conta_nova_valor_alto', 'R$ 1.000 em ponto conta');
  assert.equal(avaliarDeposito({ sale: venda({ total_amount: 999.99 }), comprador: conta(2), agora: AGORA }).motivo, null);
  assert.equal(avaliarDeposito({ sale: venda({ total_amount: 1500 }), comprador: conta(24), agora: AGORA }).motivo, null, '24h: não é mais conta nova');
  assert.equal(avaliarDeposito({ sale: venda({ total_amount: 5000 }), comprador: null, agora: AGORA }).motivo, null, 'sem comprador legível: segue');
  assert.equal(avaliarDeposito({ sale: venda({ total_amount: 1500 }), comprador: { id: 'u1', created_at: new Date(AGORA - 3 * H).toISOString() }, agora: AGORA }).motivo, 'conta_nova_valor_alto', 'created_at vale quando não há created_date');
  const d = avaliarDeposito({ sale: venda({ total_amount: 1500 }), comprador: conta(2.34), agora: AGORA }).detalhes;
  assert.equal(d.conta_horas, 2.3); assert.equal(d.valor, 1500); assert.equal(d.depositos_24h, 1); assert.equal(d.soma_24h, 1500); assert.equal(d.veterano, false);
});

test('R2 — 3º depósito em 24h com soma ≥ R$ 1.000, de quem ainda não é veterano; recusados e a própria venda não contam', () => {
  const velha = conta(30 * 24);
  const r = avaliarDeposito({ sale: venda({ total_amount: 500 }), comprador: velha, depositosRecentes: [dep('d1', 300), dep('d2', 500)], agora: AGORA });
  assert.equal(r.motivo, 'sequencia_de_depositos'); assert.equal(r.detalhes.depositos_24h, 3); assert.equal(r.detalhes.soma_24h, 1300);
  assert.equal(avaliarDeposito({ sale: venda({ total_amount: 500 }), comprador: velha, depositosRecentes: [dep('d1', 300)], agora: AGORA }).motivo, null, '2º depósito não é sequência');
  assert.equal(avaliarDeposito({ sale: venda({ total_amount: 100 }), comprador: velha, depositosRecentes: [dep('d1', 100), dep('d2', 100)], agora: AGORA }).motivo, null, 'R$ 300 em três recargas de leilão não é fraude');
  assert.equal(avaliarDeposito({ sale: venda({ total_amount: 500 }), comprador: velha, depositosRecentes: [dep('d1', 300), dep('d2', 500)], depositosAntigos: antigosOk(3), agora: AGORA }).motivo, null, 'veterano (3 depósitos pagos há mais de 7 dias, nenhum contestado) passa');
  assert.equal(avaliarDeposito({ sale: venda({ total_amount: 500 }), comprador: velha, depositosRecentes: [dep('d1', 300), dep('d2', 500)], depositosAntigos: antigosOk(2), agora: AGORA }).motivo, 'sequencia_de_depositos', '2 antigos ainda não é veterano');
  const comContestado = [...antigosOk(3), { id: 'x', gateway: { situacao: 'devolvido' } }];
  assert.equal(avaliarDeposito({ sale: venda({ total_amount: 500 }), comprador: velha, depositosRecentes: [dep('d1', 300), dep('d2', 500)], depositosAntigos: comContestado, agora: AGORA }).motivo, 'sequencia_de_depositos', 'um depósito contestado tira a isenção');
  assert.equal(avaliarDeposito({ sale: venda({ total_amount: 500 }), comprador: velha, depositosRecentes: [dep('v1', 500), dep('d1', 300), dep('d2', 500, { antifraude_decisao: 'recusado' })], agora: AGORA }).motivo, null, 'a própria venda e um recusado não contam');
  assert.equal(avaliarDeposito({ sale: venda({ total_amount: 500 }), comprador: velha, depositosRecentes: [dep('d1', 300, { status: 'pending_payment', antifraude_espera_ate: '2026-10-08T20:30:00Z' }), dep('d2', 500)], agora: AGORA }).motivo, 'sequencia_de_depositos', 'depósito em espera conta como da sequência');
  // R1 fala antes de R2
  assert.equal(avaliarDeposito({ sale: venda({ total_amount: 1500 }), comprador: conta(1), depositosRecentes: [dep('d1', 300), dep('d2', 500)], agora: AGORA }).motivo, 'conta_nova_valor_alto');
});

test('o portão: avaliar → segurar → auto liberar (só R2) / passar / recusado; e o status no extrato', () => {
  assert.equal(decisaoDoPortao(venda(), AGORA), 'avaliar');
  const esp = { antifraude_motivo: 'sequencia_de_depositos', antifraude_espera_ate: '2026-10-08T20:30:00Z' };
  assert.equal(decisaoDoPortao(venda(esp), AGORA), 'segurar');
  assert.equal(decisaoDoPortao(venda(esp), Date.parse('2026-10-08T20:30:00Z')), 'auto_liberar', 'venceu: libera sozinho');
  assert.equal(decisaoDoPortao(venda({ ...esp, antifraude_motivo: 'conta_nova_valor_alto' }), AGORA + 5 * H), 'segurar', 'conta nova: só humano libera');
  assert.equal(decisaoDoPortao(venda({ ...esp, antifraude_decisao: 'liberado' }), AGORA), 'passar');
  assert.equal(decisaoDoPortao(venda({ ...esp, antifraude_decisao: 'auto' }), AGORA), 'passar');
  assert.equal(decisaoDoPortao(venda({ ...esp, antifraude_decisao: 'recusado' }), AGORA + 5 * H), 'recusado');
  assert.equal(statusNoExtrato(venda({ status: 'paid' })), null);
  assert.equal(statusNoExtrato(venda()), 'pending');
  assert.equal(statusNoExtrato(venda(esp)), 'em_analise');
  assert.equal(statusNoExtrato(venda({ ...esp, antifraude_decisao: 'recusado' })), 'em_analise');
  assert.equal(statusNoExtrato(venda({ ...esp, antifraude_decisao: 'auto' })), 'em_analise', 'liberado e ainda não creditado continua "em conferência" (o dinheiro está pago; o cron insiste)');
  // o gateway já disse que o dinheiro saiu: não credita nem com decisão de liberar, nunca sozinho
  const retido = { ...esp, gateway: { situacao: 'retido' } };
  assert.equal(decisaoDoPortao(venda(retido), AGORA + 5 * H), 'retido');
  assert.equal(decisaoDoPortao(venda({ ...retido, antifraude_decisao: 'liberado' }), AGORA), 'retido', 'nem a Beatriz libera dinheiro que o gateway reverteu');
  assert.equal(decisaoDoPortao(venda({ ...retido, antifraude_decisao: 'recusado' }), AGORA), 'recusado');
  assert.equal(avaliarDeposito({ sale: venda({ total_amount: 100, gateway: { situacao: 'devolvido_parcial' } }), comprador: conta(400), agora: AGORA }).motivo, 'dinheiro_saiu_no_gateway', 'nunca passou pelo portão e o gateway já reverteu: segura, só humano');
  assert.equal(liberaSozinho('dinheiro_saiu_no_gateway'), false);
  assert.equal(rotuloDoMotivo('dinheiro_saiu_no_gateway', { situacao: 'retido' }), 'o gateway já marcou o pagamento como retido');
});

test('os textos para a Beatriz dizem o motivo em português e se libera sozinho', () => {
  assert.equal(rotuloDoMotivo('conta_nova_valor_alto', { conta_horas: 2.3, valor: 1500 }), 'conta criada há 2h com depósito de R$ 1.500,00');
  assert.equal(rotuloDoMotivo('conta_nova_valor_alto', { conta_horas: 0.5, valor: 1000 }), 'conta criada há 30 min com depósito de R$ 1.000,00');
  assert.equal(rotuloDoMotivo('sequencia_de_depositos', { depositos_24h: 3, soma_24h: 2800 }), '3º depósito em 24h (soma R$ 2.800,00)');
  const s = venda({ buyer_name: 'Diogo', total_amount: 500, payment_method: 'pix_mp' });
  const t = textoParaAdmin(s, { motivo: 'sequencia_de_depositos', detalhes: { depositos_24h: 3, soma_24h: 2800 } }, '2026-10-08T21:00:00Z');
  assert.match(t, /^🟡 \*Depósito em conferência \(antifraude\)\*\n\nDiogo · R\$ 500,00 · PIX\nMotivo: 3º depósito em 24h \(soma R\$ 2\.800,00\)\.\nEntra na Carteira sozinho às 18:00 se ninguém decidir antes\./);
  assert.match(t, /"Liberar agora" ou "Devolver pelo Mercado Pago"/);
  const t1 = textoParaAdmin(venda({ buyer_name: 'Yuri', total_amount: 1500, payment_method: 'credit_card_mp' }), { motivo: 'conta_nova_valor_alto', detalhes: { conta_horas: 0.2, valor: 1500 } }, '2026-10-08T21:00:00Z');
  assert.match(t1, /Yuri · R\$ 1\.500,00 · cartão\nMotivo: conta criada há 12 min com depósito de R\$ 1\.500,00\.\nSó entra na Carteira com a sua decisão\./);
  assert.match(textoLembreteAdmin(venda({ buyer_name: 'Yuri', total_amount: 1500, antifraude_motivo: 'conta_nova_valor_alto', antifraude_detalhes: { conta_horas: 0.2, valor: 1500 }, antifraude_avaliado_em: '2026-10-08T20:00:00Z' })), /^🟡 \*Depósito ainda em conferência\*\n\nYuri · R\$ 1\.500,00 · PIX · desde 17:00\nMotivo: conta criada há 12 min/);
});

test('o cliente fica sabendo: e-mail "em conferência" (categoria conta) e sino, com a previsão certa', () => {
  assert.equal(CATEGORIA_POR_TIPO.deposito_em_analise, 'conta');
  assert.ok(TIPOS_DE_AVISO.includes('deposito_em_analise') && TIPOS_NA_TELA.includes('deposito_em_analise'));
  assert.equal(pessoaAceita({ email: 'a@b.c', avisos_conta: false }, 'deposito_em_analise'), false);
  const a = montarAviso('deposito_em_analise', { nome: 'Luiz Alberto', valor: 1500, esperaAte: '2026-10-08T20:00:00Z', automatico: true });
  assert.equal(a.assunto, 'Depósito de R$ 1.500,00 recebido — em conferência');
  assert.match(a.texto, /^Oi, Luiz! Recebemos o seu depósito de R\$ 1\.500,00\. Por segurança, ele passa por uma conferência rápida antes de entrar na Carteira\./);
  assert.match(a.texto, /Previsão: entra sozinho até 08\/10 às 17:30\. Você não precisa fazer nada\./, 'fim da espera + 30 min do cron, em Brasília');
  assert.match(a.texto, new RegExp(`Ver minha Carteira: ${SITE}/Carteira`));
  assert.equal(a.categoria, 'conta');
  const b = montarAviso('deposito_em_analise', { valor: 1500, esperaAte: '2026-10-08T20:00:00Z', automatico: false });
  assert.match(b.texto, /^Oi! Recebemos o seu depósito/);
  assert.match(b.texto, /A nossa equipe confere e libera — em horário comercial isso costuma levar até 1 hora\./);
  assert.ok(!/Previsão/.test(b.texto), 'conta nova não promete hora: depende da Beatriz');
  assert.deepEqual(notificacaoDaTela('deposito_em_analise', { valor: 1500, esperaAte: '2026-10-08T20:00:00Z', automatico: true }), { titulo: 'Depósito em conferência', texto: 'R$ 1.500,00 chegou e entra na Carteira até 08/10 às 17:30. Você não precisa fazer nada.', link: '/Carteira' });
  assert.equal(notificacaoDaTela('deposito_em_analise', { valor: 1500 }).texto, 'R$ 1.500,00 chegou e entra na Carteira assim que a equipe conferir. Você não precisa fazer nada.');
});

test('a migração: colunas aditivas, decisão com check, índice parcial, nada de update/insert', () => {
  for (const c of ['antifraude_motivo text', 'antifraude_espera_ate timestamptz', 'antifraude_avaliado_em timestamptz', 'antifraude_detalhes jsonb', 'antifraude_decisao text', 'antifraude_decidido_em timestamptz', 'antifraude_decidido_por text']) assert.ok(SQL.includes(`add column if not exists ${c}`), c);
  assert.ok(SQL.includes("check (antifraude_decisao is null or antifraude_decisao in ('liberado', 'auto', 'recusado'))"));
  assert.ok(SQL.includes('create index if not exists catalog_sales_antifraude_em_espera_idx'));
  assert.ok(SQL.includes('where antifraude_espera_ate is not null and antifraude_decisao is null;'));
  assert.ok(!/\b(update|delete from|insert into|truncate|drop table)\b/i.test(SQL.replace(/--[^\n]*/g, '')), 'só estrutura');
});

test('o webhook: o portão fica entre o already_paid e o flip, só para depósito pendente; segura 1x; avisa quem venceu a corrida; falha aberta', () => {
  const W = ler('../api/functions/mpWebhook.js');
  assert.ok(W.includes("import { decisaoDoPortao, avaliarDeposito, lerContextoDoComprador, segurarDeposito, marcarDecisao, textoParaAdmin, liberaSozinho, KINDS_DE_DEPOSITO, STATUS_SEGURAVEIS } from '../_lib/antifraudeDeposito.js';"));
  assert.ok(W.includes("import { avisarAdminUmaVezPorDia } from '../_lib/avisarAdmin.js';"));
  assert.ok(W.includes("import { avisarAdmin } from '../_lib/avisarAdmin.js';"), 'o import antigo segue intacto');
  const jaPaga = W.indexOf("if (sale.status === 'paid') return res.status(200).json({ ok: true, already_paid: true });");
  const cancelada = W.indexOf("if (['canceled', 'cancelado', 'cancelled'].includes(String(sale.status))) {");
  const portao = W.indexOf('if (KINDS_DE_DEPOSITO.includes(sale.kind) && STATUS_SEGURAVEIS.includes(String(sale.status))) {');
  const flip = W.indexOf('const flip = await sb(`catalog_sales?id=eq.${encodeURIComponent(sale.id)}&status=in.(pending_payment,canceled,cancelado,cancelled)${travaAntifraude}`');
  assert.ok(jaPaga > 0 && cancelada > jaPaga && portao > cancelada && flip > portao, 'ordem: already_paid → cancelada → portão → flip');
  assert.ok(W.includes("const travaAntifraude = KINDS_DE_DEPOSITO.includes(sale.kind) ? '&or=(antifraude_espera_ate.is.null,antifraude_decisao.in.(liberado,auto))' : '';"), 'o flip não passa por cima de uma espera gravada pelo webhook irmão');
  assert.ok(W.includes("if (Array.isArray(conf) && conf[0]?.antifraude_espera_ate && !['liberado', 'auto'].includes(conf[0]?.antifraude_decisao)) {") && W.includes('return res.status(200).json({ ok: true, em_espera: true, sale_id: sale.id, payment_id: String(pay.id), raced: true,'), '0 linhas por causa da espera é em_espera, não "não processado"');
  assert.ok(W.includes('const portao = await portaoAntifraude(sale, pay);'));
  assert.ok(W.includes('return res.status(200).json({ ok: true, em_espera: true, sale_id: sale.id, payment_id: String(pay.id), antifraude: portao.motivo || null, espera_ate: portao.esperaAte || null, decisao: portao.decisao || null, automatico: liberaSozinho(portao.motivo) });'), 'responde 200: o gateway para de reenviar');
  assert.ok(W.includes("'em_disputa', 'em_espera', 'notfound'"), 'o evento registra em_espera');
  // o portão
  assert.ok(W.includes('async function portaoAntifraude(sale, pay) {'));
  assert.ok(W.includes("if (decisao === 'passar') return { segurar: false };"));
  assert.ok(W.includes("if (decisao === 'recusado') return { segurar: true, motivo: sale.antifraude_motivo, esperaAte: sale.antifraude_espera_ate, decisao: 'recusado' };"));
  assert.ok(W.includes("if (decisao === 'retido') {") && W.includes('`antifraude_retido_${sale.id}`') && W.includes('decisao: sale.antifraude_decisao || null, retido: true };'), 'gateway reverteu: segura e avisa, nunca credita');
  assert.ok(W.includes("if (await marcarDecisao(sb, sale.id, 'auto', 'prazo de espera vencido (webhook)')) return { segurar: false };"), 'auto: só quem grava passa');
  assert.ok(W.includes('const contexto = await lerContextoDoComprador(sb, sale, agora);') && W.includes('const avaliacao = avaliarDeposito({ sale, ...contexto, agora });'));
  assert.ok(W.includes('if (!avaliacao.motivo) return { segurar: false };'));
  assert.ok(W.includes('const h = await segurarDeposito(sb, sale, avaliacao, { agora, paymentId: pay.id, contas: contexto.contas });'));
  assert.ok(W.includes('if (h.erro) {') && W.includes('não consegui gravar a espera do depósito ${sale.id} (${h.erro}) — segue SEM espera.`);\n      return { segurar: false };'), 'banco recusou o PATCH: falha aberta, nunca "em_espera" sem nada gravado');
  assert.ok(W.includes('if (h.segurou) {'), 'só quem venceu a corrida avisa');
  assert.ok(W.includes('await avisarAdminUmaVezPorDia(`antifraude_${sale.id}`, textoParaAdmin(sale, avaliacao, h.esperaAte), { sb, horas: 24 });'), 'o aviso é esperado (await) antes da resposta');
  assert.ok(W.includes("await enviarAviso({ tipo: 'deposito_em_analise', userId: sale.buyer_id, chave: sale.id, dados: { valor: sale.total_amount, esperaAte: h.esperaAte, automatico: liberaSozinho(avaliacao.motivo) } });"));
  assert.ok(W.includes('segue SEM espera: ${e?.message || e}`);\n    return { segurar: false };'), 'falha aberta');
  // a chamada interna
  assert.ok(W.includes("const interno = lerCabecalho(req, 'x-interno');"));
  assert.ok(W.includes('if (interno && process.env.CRON_SECRET && interno === `Bearer ${process.env.CRON_SECRET}`) return { ok: true, verificado: true, interno: true };'), 'liberação não depende de x-signature');
  assert.ok(W.includes("evento.assinatura = assinatura.ok ? (assinatura.interno ? 'interna' : assinatura.verificado ? 'conferida' : 'nao_conferida') : 'invalida';"));
});

test('a biblioteca: segura só venda pendente e só uma vez, decide só uma vez, reinicia a espera da pessoa, e nunca credita', () => {
  const A = ler('../api/_lib/antifraudeDeposito.js');
  assert.ok(A.includes('catalog_sales?id=eq.${enc(sale.id)}&status=in.(${STATUS})&antifraude_espera_ate=is.null'), 'PATCH filtrado: o webhook duplicado só grava 1x');
  assert.ok(A.includes('&kind=in.(${KINDS})&buyer_id=in.(${ids})&created_date=gte.'), 'passaporte e carteira de comissões contam na sequência');
  assert.ok(A.includes('const segurou = r.ok && Array.isArray(rows) && rows.length === 1;'));
  assert.ok(A.includes('&id=neq.${enc(sale.id)}&status=in.(${STATUS})&antifraude_espera_ate=not.is.null&antifraude_decisao=is.null'), 'a espera reinicia para os outros da mesma pessoa');
  assert.ok(A.includes("catalog_sales?id=eq.${enc(saleId)}&antifraude_espera_ate=not.is.null&antifraude_decisao=${de ? `eq.${enc(de)}` : 'is.null'}"), 'decisão só se ainda não havia uma (ou recusado → liberado)');
  assert.ok(A.includes("if (de && !(de === 'recusado' && decisao === 'liberado')) return false;"), 'a única troca de decisão permitida é recusado → liberado');
  assert.ok(A.includes("h['x-interno'] = `Bearer ${process.env.CRON_SECRET}`;") && A.includes('headers: cabecalhosInternos(),'));
  assert.ok(A.includes("body: JSON.stringify({ type: 'payment', data: { id: String(paymentId) }, origem }),"));
  assert.ok(A.includes("or=(cpf.eq.${enc(cpf)},cpf.eq.${enc(cpfFormatado(cpf))})"), 'mesmo CPF nas duas grafias = mesma pessoa');
  assert.ok(A.includes('or=(status.eq.paid,antifraude_espera_ate.not.is.null)'), 'pagos ou em espera contam na sequência');
  assert.ok(A.includes('&kind=in.(${KINDS})&status=in.(${STATUS})&antifraude_espera_ate=not.is.null&order=antifraude_espera_ate.asc&limit=50') && A.includes("s.antifraude_decisao === 'recusado' ? 'recusado_sem_devolucao' : "));
  assert.ok(A.includes("if (!r.ok) return { segurou: false, esperaAte: fim, erro: `http_${r.status}` };"), 'erro de banco não é corrida');
  assert.ok(A.includes('antifraude_decisao=is.null&antifraude_espera_ate=lte.') && A.includes('r.aguardando_humano += 1;'));
  assert.ok(A.includes('antifraude_decisao=in.(liberado,auto)&antifraude_decidido_em=lte.') && A.includes("const j = await disparar(s.mp_payment_id, `cron_decidido`);"), 'decidido e não creditado: o cron insiste (o gateway não reenvia)');
  assert.ok(A.includes('if (dinheiroSaiu(s)) { r.aguardando_humano += 1; continue; }') && A.includes('if (!liberaSozinho(s.antifraude_motivo) || dinheiroSaiu(s)) {'), 'o cron nunca dispara o que o gateway reverteu');
  assert.ok(A.includes('if ([401, 403].includes(Number(j?.http))) r.config_erro = true;') && A.includes("await lembrar('antifraude_config',"), '401/403 do próprio webhook é configuração (CRON_SECRET), e o admin fica sabendo');
  assert.ok(A.includes("DECISOES_QUE_LIBERAM.includes(s.antifraude_decisao) ? 'liberado_sem_credito' : 'em_analise'"), 'a Beatriz vê também o liberado que ainda não creditou');
  const Ex = ler('../api/functions/excluirMeuPedido.js');
  assert.ok(Ex.includes('status,mp_payment_id,antifraude_espera_ate&id=eq.') && Ex.includes('if (sale.antifraude_espera_ate) {'), 'o cliente não "exclui" um depósito pago em conferência');
  assert.ok(A.includes("const ok = !!(j?.paid || j?.already_paid);"), 'só conta liberado o que o webhook creditou');
  assert.ok(!/status:\s*'paid'|creditWalletDeposit|rpc\/cancelar_venda|saldo_disponivel/.test(A), 'a biblioteca nunca credita nem cancela: quem faz é o webhook');
  assert.ok(A.includes("const BASE_URL = process.env.PUBLIC_BASE_URL || 'https://leilaonozap.net';"));
});

test('a Beatriz decide pela conciliação: liberar grava a decisão e chama o webhook; devolver em espera grava recusado antes do gateway', () => {
  const G = ler('../api/_lib/gatewayAcoes.js');
  assert.ok(G.includes("else if (acao.acao === 'liberar') resultado = await liberarNoAplicativo(acao);"));
  assert.ok(G.includes("if (resultado.ok && acao.acao !== 'liberar') await marcarResolvida("), 'liberar não marca a pendência como resolvida');
  assert.ok(G.includes("const j = await dispararWebhookInterno(acao.payment_id, 'liberar');") && G.includes('if (j?.paid || j?.already_paid) return { ok: true,'));
  const R = ler('../api/functions/resolverPendencia.js');
  assert.ok(R.includes('const emEspera = !!sale.antifraude_espera_ate && !sale.antifraude_decisao;'));
  assert.ok(R.includes("const gravou = await marcarDecisao(sb, sale.id, 'liberado', quem, recusadoSemDevolucao ? { de: 'recusado' } : {});"));
  assert.ok(R.includes("gateway_acoes?select=id&sale_id=eq.${encodeURIComponent(sale.id)}&acao=eq.devolver&status=eq.feita&limit=1"), 'recusado só volta a liberado se a devolução NÃO foi feita');
  assert.ok(R.includes("} else if (modo === 'devolver' && emEspera) {") && R.includes("marcarDecisao(sb, sale.id, 'recusado', quem)"));
  assert.ok(R.includes("'Este depósito já foi liberado; trate pela conciliação normal.'"), 'liberado no meio-tempo: não devolve dinheiro já creditado');
  assert.ok(R.indexOf("marcarDecisao(sb, sale.id, 'recusado', quem)") < R.indexOf('const acao = await pedirAcao('), 'a decisão entra antes do pedido ao gateway');
  assert.ok(R.includes('antifraude_motivo,antifraude_espera_ate,antifraude_decisao&id=eq.'));
  const P = ler('../api/functions/painelInvestidor.js');
  assert.ok(P.includes('const emAnalise = await listarDepositosEmAnalise(sb);') && P.includes('painel.conciliacao.pendencias = [...emAnalise, ...'));
  const C = ler('../api/functions/conciliarMercadoPago.js');
  const acoes = C.indexOf('const acoes = ehCron ? await executarAcoesPendentes({ limite: 20 }) : null;');
  const lib = C.indexOf('const liberacoes = ehCron ? await liberarDepositosVencidos({ sb, limite: 5, orcamentoMs: 15000, lembrar: avisarAdminUmaVezPorDia })');
  assert.ok(acoes > 0 && lib > acoes, 'o cron libera logo depois da fila de ações, com orçamento');
  const Pg = ler('../src/pages/PainelInvestidor.jsx');
  assert.ok(Pg.includes('data-teste="botao-liberar-deposito"') && Pg.includes("resolverPendencia(x, 'liberar')"));
  assert.ok(Pg.includes("(x.divergencia === 'em_analise' || x.divergencia === 'recusado_sem_devolucao') && ("), 'Liberar agora também para o recusado sem devolução');
  assert.ok(Pg.includes('liberado_sem_credito: { rotulo:'));
  assert.ok(Pg.includes('em_analise: { rotulo:') && Pg.includes('recusado_sem_devolucao: { rotulo:'));
  assert.ok(Pg.includes("x.divergencia !== 'em_analise' && x.divergencia !== 'recusado_sem_devolucao' && x.divergencia !== 'liberado_sem_credito' && ("), '"Marcar como tratada" não vale para depósito em conferência');
  assert.ok(Pg.includes('data-teste="pendencia-antifraude"'));
});

test('as telas e as rotas de leitura: "em conferência" em vez de "confirmado", poll lento, sem a promessa falsa do checkPaymentStatus', () => {
  const K = ler('../api/functions/checkPaymentStatus.js');
  assert.ok(K.includes("import { statusNoExtrato, decisaoDoPortao, liberaSozinho, dispararWebhookInterno } from '../_lib/antifraudeDeposito.js';"));
  assert.ok(K.includes("if (sale && statusNoExtrato(sale) === 'em_analise') {") && K.includes("if (['auto_liberar', 'passar'].includes(decisaoDoPortao(sale))) {"));
  assert.ok(K.includes("automatico: decisao === 'recusado' ? false : "), 'recusado nunca é "entra sozinho"');
  const G2 = ler('../api/_lib/gatewayAcoes.js');
  assert.ok(G2.includes("erro: 'config: o webhook recusou a chamada interna (falta CRON_SECRET / x-interno)'"));
  assert.ok(K.includes('if (j?.em_espera) return res.status(200).json(emAnalise(null,'));
  assert.ok(K.includes("if (j?.paid || j?.already_paid) return res.status(200).json({ found: true, status: 'confirmed' });"), 'confirma só o que o webhook creditou');
  assert.ok(!K.includes('leilonozap.vercel.app'), 'o endereço interno é o do domínio');
  const D = ler('../api/functions/createMPWalletDeposit.js');
  assert.ok(D.includes('headers: cabecalhosInternos(),') && D.includes('if (j?.em_espera) emAnalise = {') && D.includes('em_analise: !!emAnalise,'));
  assert.ok(ler('../api/functions/avisoPixPendente.js').includes('&antifraude_espera_ate=is.null&created_date=gte.'), 'depósito pago em espera não recebe "PIX pendente"');
  const Hx = ler('../api/functions/getDigitalWalletHistory.js');
  assert.ok(Hx.includes("antifraude_espera_ate,antifraude_decisao'") && Hx.includes('statusNoExtrato(s)'));
  const Wd = ler('../src/components/wallet/WalletDrawer.jsx');
  assert.ok(Wd.includes("data?.status === 'em_analise'") && Wd.includes('setInterval(check, emAnalise ? 60000 : 4000)'));
  assert.ok(Wd.includes('data-teste="deposito-em-analise"') && Wd.includes("tx.status === 'em_analise'") && Wd.includes("t.status === 'pending' || t.status === 'em_analise'"));
  const Ac = ler('../src/pages/AuctionCheckoutModern.jsx');
  assert.ok(Ac.includes("data?.status === 'em_analise'") && Ac.includes('setInterval(checkPaymentStatus, emAnalise ? 60000 : 5000)'));
  assert.ok(Ac.includes('if (responseData?.em_analise) setEmAnalise(') && Ac.includes('data-teste="deposito-em-analise"'));
});
