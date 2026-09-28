// 🔔 28/09/2026 — o sino do cliente: o que entra (servidor) e como aparece (tela)
import test from 'node:test';
import assert from 'node:assert/strict';
import { rotuloDoContador, tempoRelativo, linkSeguro, marcarLidasLocal, intervaloDoSino } from '../src/lib/sinoDoCliente.js';
import { notificacaoDaTela, TIPOS_NA_TELA, TIPOS_QUE_RENOVAM } from '../api/_lib/notificacoesNaTela.js';
import { TIPOS_DE_AVISO } from '../api/_lib/textosDosAvisos.js';

test('entra no sino o que "aconteceu com você"; PIX, cadastro, próprio lance e marketing ficam fora', () => {
  for (const t of ['superado', 'arrematou', 'compra_enviada', 'compra_confirmada', 'deposito', 'saque_pago']) assert.ok(TIPOS_NA_TELA.includes(t), t);
  for (const t of ['pix_pendente', 'cadastro', 'entrou_no_leilao', 'nutricao_d1', 'campanha_ps5']) {
    assert.ok(!TIPOS_NA_TELA.includes(t), t);
    assert.equal(notificacaoDaTela(t, {}), null, t);
  }
  for (const t of TIPOS_NA_TELA) assert.ok(TIPOS_DE_AVISO.includes(t), `${t} precisa ter gatilho de aviso`);
  assert.deepEqual(TIPOS_QUE_RENOVAM, ['superado']);
});

test('os textos curtos do sino', () => {
  assert.deepEqual(notificacaoDaTela('superado', { produto: 'PS5 Slim', valorAtual: 812.5, leilaoId: 'a b' }),
    { titulo: 'Cobriram seu lance', texto: 'PS5 Slim agora está em R$ 812,50. Ainda dá tempo de voltar.', link: '/AuctionRoom?id=a%20b' });
  assert.equal(notificacaoDaTela('arrematou', { produto: 'Air Fryer', valor: 97 }).texto, 'Air Fryer é seu por R$ 97,00.');
  assert.equal(notificacaoDaTela('ultima_hora', { produto: 'X', valorAtual: 10, termina: '2026-09-28T21:00:00Z', naFrente: true }).titulo, 'Última hora, você está na frente');
  assert.match(notificacaoDaTela('ultima_hora', { produto: 'X', valorAtual: 10, termina: '2026-09-28T21:00:00Z' }).texto, /encerra às 18:00/);
  assert.equal(notificacaoDaTela('compra_enviada', { pedido: 'AR1', rastreio: 'AD1BR', arremate: true }).link, '/MyWinnings');
  assert.equal(notificacaoDaTela('compra_enviada', { pedido: 'LZ1', rastreio: '' }).texto, 'O pedido #LZ1 saiu pra entrega.');
  assert.doesNotMatch(notificacaoDaTela('comissao_paga_manual', { valor: 10, pixKeyUsada: 'chave@pix' }).texto, /chave@pix/, 'chave PIX não aparece na tela');
  assert.match(notificacaoDaTela('superado', { produto: 'a'.repeat(90), valorAtual: 1 }).texto, /^a{59}… agora/);
  for (const t of TIPOS_NA_TELA) assert.ok(notificacaoDaTela(t, {}).link.startsWith('/'), t);
});

test('contador, tempo e link', () => {
  assert.equal(rotuloDoContador(0), '');
  assert.equal(rotuloDoContador(3), '3');
  assert.equal(rotuloDoContador(10), '9+');
  assert.equal(rotuloDoContador('x'), '');
  const agora = Date.parse('2026-09-28T20:00:00Z');
  assert.equal(tempoRelativo('2026-09-28T19:59:40Z', agora), 'agora');
  assert.equal(tempoRelativo('2026-09-28T19:55:00Z', agora), 'há 5 min');
  assert.equal(tempoRelativo('2026-09-28T17:00:00Z', agora), 'há 3 h');
  assert.equal(tempoRelativo('2026-09-27T18:00:00Z', agora), 'ontem');
  assert.equal(tempoRelativo('2026-09-25T18:00:00Z', agora), 'há 3 dias');
  assert.equal(tempoRelativo('2026-09-12T18:00:00Z', agora), '12/09');
  assert.equal(tempoRelativo('lixo', agora), '');
  assert.equal(linkSeguro('/Carteira'), '/Carteira');
  assert.equal(linkSeguro('//evil.com'), '');
  assert.equal(linkSeguro('https://evil.com'), '');
  assert.equal(linkSeguro(null), '');
  assert.ok(intervaloDoSino(0) === 60000 && intervaloDoSino(0.999) < 90000);
});

test('marcar como lida na hora, sem esperar o servidor', () => {
  const e = { naoLidas: 2, itens: [{ id: 1, lida_em: null }, { id: 2, lida_em: null }, { id: 3, lida_em: '2026-09-01T00:00:00Z' }] };
  const um = marcarLidasLocal(e, [1], 'T');
  assert.equal(um.naoLidas, 1);
  assert.equal(um.itens[0].lida_em, 'T');
  assert.equal(um.itens[1].lida_em, null);
  const todas = marcarLidasLocal(e, null, 'T');
  assert.equal(todas.naoLidas, 0);
  assert.equal(todas.itens[2].lida_em, '2026-09-01T00:00:00Z', 'a já lida não muda');
});
