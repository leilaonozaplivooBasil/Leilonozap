// ⏳🌱 28/09/2026 — PIX pendente e nutrição D+1/D+3: quando sai e o que diz
import test from 'node:test';
import assert from 'node:assert/strict';
import { janelaPixPendente, pixMereceLembrete } from '../api/_lib/regrasDosAvisos.js';
import { montarAviso, CATEGORIA_POR_TIPO } from '../api/_lib/textosDosAvisos.js';
import { diasDesdeCadastro, etapaDoDia, perfilDeCliente, montarNutricao, ETAPAS } from '../api/_lib/nutricaoCadastro.js';

test('PIX pendente: janela de 60 a 75 min atrás, cada PIX numa rodada só', () => {
  const agora = Date.parse('2026-09-28T15:00:00Z');
  const { de, ate } = janelaPixPendente(agora);
  assert.equal(de, '2026-09-28T13:45:00.000Z');
  assert.equal(ate, '2026-09-28T14:00:00.000Z');
  const proxima = janelaPixPendente(agora + 15 * 60000);
  assert.equal(proxima.de, ate, 'as rodadas encostam, sem buraco e sem sobreposição');
});

test('PIX pendente: não lembra de PIX velho quando a pessoa gerou outro depois', () => {
  const v = { id: 'a', created_date: '2026-09-28T13:50:00Z' };
  assert.equal(pixMereceLembrete(v, []), true);
  assert.equal(pixMereceLembrete(v, [{ id: 'a', created_date: v.created_date }]), true, 'a própria venda não conta');
  assert.equal(pixMereceLembrete(v, [{ id: 'b', created_date: '2026-09-28T13:40:00Z' }]), true, 'outro ANTES não conta');
  assert.equal(pixMereceLembrete(v, [{ id: 'b', created_date: '2026-09-28T13:55:00Z' }]), false);
  assert.equal(pixMereceLembrete({ id: 'x' }, []), false);
});

test('PIX pendente: é aviso de conta, com link do PIX quando existe', () => {
  assert.equal(CATEGORIA_POR_TIPO.pix_pendente, 'conta');
  const dep = montarAviso('pix_pendente', { deposito: true, valor: 50, link: 'https://www.mercadopago.com.br/payments/1/ticket', nome: 'Ana Souza' });
  assert.equal(dep.assunto, 'Seu PIX de R$ 50,00 ainda não foi pago');
  assert.match(dep.texto, /Oi, Ana!/);
  assert.match(dep.texto, /Abrir o PIX: https:\/\/www\.mercadopago/);
  const semLink = montarAviso('pix_pendente', { deposito: true, valor: 27 });
  assert.match(semLink.texto, /Ir pra Carteira: https:\/\/leilaonozap\.net\/Carteira/);
  const loja = montarAviso('pix_pendente', { deposito: false, valor: 89.9, pedido: 'LZ42C79347' });
  assert.equal(loja.assunto, 'Pedido #LZ42C79347 esperando o PIX');
  assert.match(loja.texto, /MyCatalogOrders/);
  for (const m of [dep, semLink, loja]) assert.doesNotMatch(m.assunto + m.texto, /urgente|última chance|!!/i);
});

test('nutrição: dias de calendário em Brasília (1 rodada por etapa)', () => {
  const agora = Date.parse('2026-09-28T13:47:00Z'); // 28/09 10:47 em Brasília
  assert.equal(diasDesdeCadastro('2026-09-27T02:50:00Z', agora), 2, '26/09 23:50 BRT');
  assert.equal(diasDesdeCadastro('2026-09-27T03:10:00Z', agora), 1, '27/09 00:10 BRT');
  assert.equal(diasDesdeCadastro('2026-09-28T02:59:00Z', agora), 1, '27/09 23:59 BRT');
  assert.equal(diasDesdeCadastro('2026-09-25T20:00:00Z', agora), 3);
  assert.equal(diasDesdeCadastro('lixo', agora), null);
  assert.equal(etapaDoDia('2026-09-27T12:00:00Z', agora), 'd1');
  assert.equal(etapaDoDia('2026-09-25T12:00:00Z', agora), 'd3');
  assert.equal(etapaDoDia('2026-09-26T12:00:00Z', agora), null, 'D+2 não manda nada');
  assert.equal(etapaDoDia('2026-09-28T12:00:00Z', agora), null, 'no dia do cadastro vai só o boas-vindas');
  assert.deepEqual([ETAPAS.d1.tipo, ETAPAS.d3.tipo], ['nutricao_d1', 'nutricao_d3']);
});

test('nutrição: só cliente comum ("coloque saldo" não vai pra equipe nem vendedor)', () => {
  assert.equal(perfilDeCliente({ role: 'user', primary_career_level: 'usuario' }), true);
  assert.equal(perfilDeCliente({}), true, 'conta sem cargo gravado = cliente');
  assert.equal(perfilDeCliente({ role: 'admin' }), false);
  assert.equal(perfilDeCliente({ role: 'user', primary_career_level: 'vendedor' }), false);
  assert.equal(perfilDeCliente(null), false);
});

test('nutrição: as duas peças, com descadastro, leilões abertos e nome escapado', () => {
  const leiloes = [{ title: 'PS5 Slim', current_price: 812.5 }, { title: 'Air Fryer', current_price: 97 }];
  const d1 = montarNutricao({ etapa: 'd1', nome: 'maria da silva', leiloes, linkSaida: 'https://leilaonozap.net/api/functions/descadastrar?email=a&t=b' });
  assert.equal(d1.assunto, 'Seu primeiro lance começa com um PIX');
  assert.match(d1.texto, /^Maria, sua conta/);
  assert.match(d1.texto, /a partir de R\$ 27,00/);
  assert.match(d1.texto, /PS5 Slim: R\$ 812,50/);
  assert.match(d1.html, /Não quero mais receber/);
  assert.match(d1.texto, /Para não receber mais: https:/);
  const d3 = montarNutricao({ etapa: 'd3', nome: '<script>x', leiloes: [] });
  assert.equal(d3.assunto, 'Ficou alguma dúvida sobre o Leilão NoZap?');
  assert.doesNotMatch(d3.html, /<script>/);
  assert.doesNotMatch(d3.texto, /Abertos agora/, 'sem leilão aberto, o bloco some');
  assert.match(d3.texto, /E se eu não ganhar\? Quando alguém cobre/);
  assert.equal(montarNutricao({ etapa: 'd9' }), null);
});
