// 📊 Relatório de depósitos no WhatsApp (26/09/2026) — pedido do dono.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { horarioAtual, montarRelatorio, nomeCurto, emBrasilia, HORARIOS } from '../api/_lib/relatorioDepositos.js';

const brt = (hhmm, dia = '2026-09-26') => new Date(`${dia}T${hhmm}:00-03:00`).getTime();

test('⏰ só nos horários pedidos (13:50, 14:50, 15:50, 16:50, 17:30), com tolerância de alguns minutos', () => {
  assert.deepEqual(HORARIOS, ['13:50', '14:50', '15:50', '16:50', '17:30']);
  assert.equal(horarioAtual(brt('13:50')), '13:50');
  assert.equal(horarioAtual(brt('13:57')), '13:50');
  assert.equal(horarioAtual(brt('14:00')), null);
  assert.equal(horarioAtual(brt('17:30')), '17:30');
  assert.equal(horarioAtual(brt('17:50')), null, 'depois das 17:30 não sai mais');
  assert.equal(horarioAtual(brt('13:50', '2026-09-27')), null, 'só no dia');
  assert.equal(emBrasilia(brt('13:50')).hora, '13:50');
});

test('✂️ nome curto', () => {
  assert.equal(nomeCurto('Verônica de Aguiar frança Rangel'), 'Verônica Rangel');
  assert.equal(nomeCurto('TOP TECH DIGITAL'), 'TOP TECH DIGITAL');
  assert.equal(nomeCurto(''), '—');
});

test('📝 o texto: totais, novos, tabela, cobrança, PS5 e selo de uso interno', () => {
  const agora = brt('13:50');
  const texto = montarRelatorio({
    agora,
    depositos: [
      { id: 'a', buyer_id: 'u1', buyer_name: 'Virgilio de oliveira neto', total_amount: 650, status: 'paid', created_date: new Date(brt('13:14')).toISOString() },
      { id: 'b', buyer_id: 'u2', buyer_name: 'Cleberson Costa', total_amount: 1000, status: 'pending_payment', created_date: new Date(brt('11:26')).toISOString() },
      { id: 'c', buyer_id: 'u3', buyer_name: 'Lilian lima', total_amount: 100, status: 'paid', created_date: new Date(brt('09:12')).toISOString() },
    ],
    pagosAntes: [{ buyer_id: 'u1', created_date: '2026-09-01T12:00:00Z' }, { buyer_id: 'u1', created_date: new Date(brt('13:14')).toISOString() }],
    lances: [{ sender_id: 'u3', created_date: new Date(brt('09:30')).toISOString() }],
    usuarios: { u1: { saldo_disponivel: 2117.3, saldo_reservado: 0, referred_by_id: 'r1' }, u3: { saldo_disponivel: 11.04, saldo_reservado: 88.96, referred_by_id: 'r1' }, u2: { referred_by_id: 'r2' } },
    nomes: { r1: 'Verônica de Aguiar frança Rangel', r2: 'TOP TECH DIGITAL' },
    leilao: { title: 'Playstation 5', current_price: 997, winner_name: 'Henrique Silva', end_time: new Date(brt('18:00')).toISOString(), status: 'active', lances: 4 },
  });
  assert.match(texto, /Depósitos 24\/09 → 26\/09 13:50/);
  assert.match(texto, /Pagos: 2 · R\$ 750,00/);
  assert.match(texto, /PIX pendentes: 1 · R\$ 1\.000,00/);
  assert.match(texto, /Novos na última hora\*\n• 26\/09 13:14 · Virgilio de oliveira neto · R\$ 650,00 · pago/);
  assert.match(texto, /Virgilio de oliveira neto · R\$ 650,00 · pago · ind\.: Verônica Rangel · 2º dep\. · lance depois: não · saldo R\$ 2\.117,30/);
  assert.match(texto, /Lilian lima · R\$ 100,00 · pago · ind\.: Verônica Rangel · 1º dep\. · lance depois: sim \(1\) · saldo R\$ 11,04 \(\+R\$ 88,96 reservado\)/);
  assert.match(texto, /Para cobrar[^\n]*\n• Cleberson Costa · R\$ 1\.000,00 \(desde 26\/09 11:26\)/);
  assert.match(texto, /Playstation 5\*: lance atual R\$ 997,00 · líder Henrique Silva · 4 lances · encerra 26\/09 18:00/);
  assert.match(texto, /Uso interno · não circular/);
  assert.doesNotMatch(texto, /cpf/i);
});

test('🔒 a rota: horário, uma vez por horário, destino só de RELATORIO_DEPOSITOS_ZAP; e o cron existe', () => {
  const S = readFileSync(new URL('../api/functions/relatorioDepositosZap.js', import.meta.url), 'utf8');
  assert.match(S, /CRON_SECRET/);
  assert.match(S, /horarioAtual\(agora\)/);
  assert.match(S, /RELATORIO_DEPOSITOS_ZAP_\$\{horario/);
  assert.match(S, /process\.env\.RELATORIO_DEPOSITOS_ZAP/);
  assert.match(S, /ALERTA_WHATSAPP: destino/);
  assert.doesNotMatch(S, /55\d{10,11}/, 'nenhum número de telefone chumbado no código');
  const V = readFileSync(new URL('../vercel.json', import.meta.url), 'utf8');
  // 🗓️ o cron foi só do dia 26/09 (13:50 → 17:30) e saiu depois do último envio
  assert.doesNotMatch(V, /relatorioDepositosZap", "schedule"/);
});
