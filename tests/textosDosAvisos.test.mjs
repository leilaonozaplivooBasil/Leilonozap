// ✉️ Os textos dos 8 avisos aprovados pelo dono em 23/09/2026
import test from 'node:test';
import assert from 'node:assert/strict';
import { montarAviso, TIPOS_DE_AVISO, CATEGORIA_POR_TIPO, reais, quandoBR, faltaBR, SITE } from '../api/_lib/textosDosAvisos.js';

test('os 10 tipos (8 gatilhos, dois deles com 2 e-mails) e a categoria de cada um', () => {
  assert.deepEqual(TIPOS_DE_AVISO, ['cadastro', 'entrou_no_leilao', 'superado', 'arrematou', 'ultima_hora', 'deposito', 'compra_confirmada', 'compra_enviada', 'kyc_aprovado', 'saque_pago']);
  assert.deepEqual(TIPOS_DE_AVISO.filter((t) => CATEGORIA_POR_TIPO[t] === 'leilao'), ['entrou_no_leilao', 'superado', 'arrematou', 'ultima_hora']);
  assert.equal(montarAviso('inventado', {}), null);
});

test('dinheiro e hora em português do Brasil', () => {
  assert.equal(reais(47.47), 'R$ 47,47'); assert.equal(reais(5700), 'R$ 5.700,00'); assert.equal(reais(null), 'R$ 0,00');
  assert.equal(quandoBR('2026-10-08T23:00:00Z'), '08/10 às 20:00'); assert.equal(quandoBR('lixo'), ''); assert.equal(quandoBR(null), '');
  const agora = Date.parse('2026-09-23T18:00:00Z');
  assert.equal(faltaBR('2026-09-23T18:40:00Z', agora), '40 min');
  assert.equal(faltaBR('2026-09-23T20:15:00Z', agora), '2h 15min');
  assert.equal(faltaBR('2026-09-23T20:00:00Z', agora), '2h');
  assert.equal(faltaBR('2026-09-23T17:00:00Z', agora), 'poucos minutos');
});

test('cadastro: bem-vindo com o primeiro nome, e sem nome também funciona', () => {
  const a = montarAviso('cadastro', { nome: 'Verônica de Aguiar' });
  assert.equal(a.assunto, 'Bem-vindo(a) ao Leilão NoZap, Verônica!');
  assert.match(a.texto, /^Oi, Verônica! Sua conta está pronta\./);
  assert.match(a.texto, /coloque saldo na Carteira/);
  assert.match(a.texto, new RegExp(`Ver leilões ativos: ${SITE}/leiloes`));
  assert.equal(a.categoria, 'conta');
  const b = montarAviso('cadastro', {});
  assert.equal(b.assunto, 'Bem-vindo(a) ao Leilão NoZap!'); assert.match(b.texto, /^Oi! Sua conta/);
});

test('entrou no leilão, superado e última hora: produto, valor, hora e o link da sala', () => {
  const e = montarAviso('entrou_no_leilao', { produto: 'Playstation 5', valor: 497, termina: '2026-09-26T15:00:00Z', leilaoId: 'abc' });
  assert.equal(e.assunto, 'Você está no leilão: Playstation 5');
  assert.match(e.texto, /Seu lance de R\$ 497,00 foi registrado em Playstation 5\. Termina em 26\/09 às 12:00\./);
  assert.match(e.texto, /AuctionRoom\?id=abc/);
  const agora = Date.parse('2026-09-26T13:00:00Z');
  const s = montarAviso('superado', { produto: 'Playstation 5', valorAtual: 597, termina: '2026-09-26T15:00:00Z', leilaoId: 'abc', agora });
  assert.equal(s.assunto, 'Cobriram seu lance em Playstation 5');
  assert.match(s.texto, /agora está em R\$ 597,00\./); assert.match(s.texto, /Faltam 2h pro fim\./); assert.match(s.texto, /Dar lance agora/);
  const u1 = montarAviso('ultima_hora', { produto: 'PS5', valorAtual: 597, termina: '2026-09-26T15:00:00Z', leilaoId: 'abc', naFrente: true });
  assert.equal(u1.assunto, 'Última hora: PS5 termina às 12:00'); assert.match(u1.texto, /você está na frente/);
  const u2 = montarAviso('ultima_hora', { produto: 'PS5', valorAtual: 597, termina: '2026-09-26T15:00:00Z', leilaoId: 'abc', naFrente: false });
  assert.match(u2.texto, /você foi coberto/);
});

test('arrematou: os dois próximos passos', () => {
  const a = montarAviso('arrematou', { nome: 'Ana Lima', produto: 'PS5', valor: 5700, pagoComSaldo: false });
  assert.equal(a.assunto, '🎉 Você arrematou PS5!');
  assert.match(a.texto, /Parabéns, Ana! PS5 é seu por R\$ 5\.700,00\./);
  assert.match(a.texto, /sai do saldo da sua Carteira automaticamente\. Se faltar, complete o depósito de R\$ 5\.700,00/);
  assert.match(montarAviso('arrematou', { produto: 'PS5', valor: 10, pagoComSaldo: true }).texto, /já saiu do seu saldo; agora é só aguardar o envio/);
});

test('depósito, compra confirmada/enviada, KYC e saque', () => {
  assert.match(montarAviso('deposito', { valor: 200, saldo: 350.5 }).texto, /^Seu depósito de R\$ 200,00 caiu na Carteira\. Saldo disponível: R\$ 350,50\. Bons lances!/);
  assert.doesNotMatch(montarAviso('deposito', { valor: 200 }).texto, /Saldo disponível/);
  const c = montarAviso('compra_confirmada', { nome: 'Ana', pedido: 'LZ1234', valor: 89.9 });
  assert.equal(c.assunto, 'Pedido #LZ1234 confirmado'); assert.match(c.texto, /Recebemos o pagamento do seu pedido #LZ1234 \(R\$ 89,90\)/);
  const v = montarAviso('compra_enviada', { pedido: 'LZ1234', rastreio: 'BR123' });
  assert.equal(v.assunto, 'Pedido #LZ1234 a caminho (rastreio BR123)'); assert.match(v.texto, /Código de rastreio: BR123\./);
  assert.equal(montarAviso('compra_enviada', { pedido: 'LZ1234' }).assunto, 'Pedido #LZ1234 a caminho');
  assert.match(montarAviso('kyc_aprovado', { nome: 'Ana' }).texto, /vai pro PIX do seu CPF/);
  assert.equal(montarAviso('saque_pago', { valor: 178.39 }).assunto, 'Saque de R$ 178,39 pago no PIX do seu CPF');
});

test('rodapé LGPD: o link de sair entra no texto e no html, e o html escapa o que vem do banco', () => {
  const a = montarAviso('superado', { produto: '<b>PS5</b> & cia', valorAtual: 1, termina: '2026-09-26T15:00:00Z', leilaoId: 'x', linkSair: 'https://x/sair?u=1' });
  assert.match(a.texto, /Não quer mais receber avisos de leilão\? https:\/\/x\/sair\?u=1/);
  assert.match(a.html, /&lt;b&gt;PS5&lt;\/b&gt; &amp; cia/);
  assert.doesNotMatch(a.html, /<b>PS5<\/b>/);
  assert.match(a.html, /href="https:\/\/x\/sair\?u=1"/);
  const sem = montarAviso('deposito', { valor: 1 });
  assert.match(sem.texto, /porque tem conta no Leilão NoZap\.$/); assert.doesNotMatch(sem.texto, /Não quer mais/);
});
