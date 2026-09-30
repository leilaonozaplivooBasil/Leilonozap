// 📦 RASTREIO DO PEDIDO — DIR-187 (30/09/2026)
// O cliente Herbert leu "Entregue! 🎉" no site com o objeto parado nos Correios
// ("endereço inexistente"). Duas causas: a tela lia o status de PAGAMENTO
// ('entregue' = venda paga, herança do Base44) como status de ENTREGA, e mostrava
// o número interno LZ… como código de rastreio. Estes testes travam a regra nova:
// entrega só com prova, código real, link da transportadora, ocorrência visível.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import {
  situacaoDaEntrega, linhaDoTempo, rotuloDaEntrega, codigoReal, ehCodigoInterno, ehCodigoCorreios,
  linksDeRastreio, eventosDosCorreios, ehEventoDeEntrega, numeroInternoDoPedido, orientacaoDoProblema, mensagemDoSuporte,
} from '../src/lib/rastreio.js';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));

const HERBERT = {
  id: 'cd75eeb9374f03a24e3fefee', status: 'entregue', fulfillment_status: 'enviado', shipped_at: null, delivered_at: null,
  tracking_code: 'LZCD75EEB9',
  melhorEnvio: { status: 'posted', tracking: 'AV091829611BR', posted_at: '2026-09-14T12:00:00Z', delivered_at: null },
  eventos: [
    { descricao: 'Objeto postado', data: '2026-09-14T15:10:00', local: 'CURITIBA - PR' },
    { descricao: 'Objeto em trânsito - por favor aguarde', data: '2026-09-15T09:00:00', local: 'CURITIBA - PR' },
    { descricao: 'Objeto não entregue - endereço inexistente', detalhe: 'Objeto será devolvido ao remetente', data: '2026-09-17T11:30:00', local: 'SAO PAULO - SP' },
  ],
};

test('Herbert: status de pagamento "entregue" + Correios "endereço inexistente" = ATENÇÃO, nunca "Entregue"', () => {
  const s = situacaoDaEntrega(HERBERT);
  assert.equal(s.etapa, 'problema');
  assert.equal(s.titulo, 'Atenção na entrega');
  assert.match(s.problema.texto, /endereço inexistente/);
  assert.equal(s.problema.local, 'SAO PAULO - SP');
  assert.match(s.orientacao, /não localizou o endereço/);
  assert.equal(rotuloDaEntrega(s), 'Atenção na entrega');
  const lt = linhaDoTempo(s, { criadoEm: '2026-09-11T13:30:19Z', pago: true, eventos: HERBERT.eventos });
  assert.equal(lt.find((e) => e.chave === 'entregue').feito, false);
  assert.equal(lt.find((e) => e.chave === 'postado').feito, true);
  assert.equal(lt.find((e) => e.chave === 'em_transito').quando, '2026-09-15T09:00:00');
});

test('venda PAGA (status entregue) sem nenhuma prova de envio = "Pago · em preparação", não entregue', () => {
  const s = situacaoDaEntrega({ status: 'entregue', tracking_code: 'LZ0A1B2C3D' });
  assert.equal(s.etapa, 'preparando');
  assert.equal(rotuloDaEntrega(s), 'Pago · em preparação');
  assert.equal(linhaDoTempo(s, { pago: true }).find((e) => e.chave === 'entregue').feito, false);
});

test('"Entregue" só com prova: delivered_at, evento de entrega, logística ou confirmação do cliente', () => {
  assert.equal(situacaoDaEntrega({ status: 'entregue', delivered_at: '2026-09-20T10:00:00Z' }).etapa, 'entregue');
  assert.equal(situacaoDaEntrega({ status: 'paid', fulfillment_status: 'entregue' }).etapa, 'entregue');
  assert.equal(situacaoDaEntrega({ status: 'paid', recebimentoConfirmado: true }).etapa, 'entregue');
  assert.equal(situacaoDaEntrega({ status: 'paid', melhorEnvio: { delivered_at: '2026-09-20T10:00:00Z' } }).etapa, 'entregue');
  const s = situacaoDaEntrega({ status: 'paid', eventos: [{ descricao: 'Objeto entregue ao destinatário', data: '2026-09-20T10:00:00' }] });
  assert.equal(s.etapa, 'entregue');
  assert.equal(s.quando, '2026-09-20T10:00:00');
  // "não entregue" jamais conta como entrega
  assert.equal(ehEventoDeEntrega('Objeto entregue ao destinatário'), true);
  assert.equal(ehEventoDeEntrega('Objeto não entregue - endereço inexistente'), false);
  assert.equal(ehEventoDeEntrega('Objeto não foi entregue'), false);
  assert.equal(situacaoDaEntrega({ status: 'paid', eventos: [{ descricao: 'Objeto não entregue', data: '2026-09-20' }] }).etapa, 'problema');
});

test('demais etapas: aguardando pagamento, postado, a caminho, saiu para entrega, cancelado', () => {
  assert.equal(situacaoDaEntrega({ status: 'pending_payment' }).etapa, 'aguardando_pagamento');
  assert.equal(situacaoDaEntrega({ status: 'paid', shipped_at: '2026-09-14' }).etapa, 'postado');
  assert.equal(situacaoDaEntrega({ status: 'shipped', fulfillment_status: 'enviado' }).etapa, 'postado');
  assert.equal(situacaoDaEntrega({ status: 'paid', eventos: [{ descricao: 'Objeto em trânsito - por favor aguarde', data: '2026-09-15' }] }).etapa, 'em_transito');
  assert.equal(situacaoDaEntrega({ status: 'paid', eventos: [{ descricao: 'Objeto saiu para entrega ao destinatário', data: '2026-09-16' }] }).etapa, 'saiu_entrega');
  assert.equal(situacaoDaEntrega({ status: 'paid', fulfillment_status: 'saiu_entrega' }).etapa, 'saiu_entrega');
  assert.equal(situacaoDaEntrega({ status: 'cancelado' }).etapa, 'cancelado');
  assert.equal(situacaoDaEntrega({ status: 'paid', melhorEnvio: { canceled_at: '2026-09-15' } }).etapa, 'cancelado');
});

test('código: LZ/AR é número interno; o real vem do próprio campo ou do Melhor Envio; padrão dos Correios reconhecido', () => {
  assert.equal(ehCodigoInterno('LZCD75EEB9'), true);
  assert.equal(ehCodigoInterno('AR1234ABCD'), true);
  assert.equal(ehCodigoInterno('AV091829611BR'), false);
  assert.equal(ehCodigoCorreios('AV091829611BR'), true);
  assert.equal(ehCodigoCorreios('LZCD75EEB9'), false);
  assert.equal(codigoReal({ tracking_code: 'LZCD75EEB9', melhorEnvio: { tracking: 'AV091829611BR' } }), 'AV091829611BR');
  assert.equal(codigoReal({ tracking_code: 'AV091829611BR' }), 'AV091829611BR');
  assert.equal(codigoReal({ tracking_code: 'LZCD75EEB9' }), '');
  assert.equal(numeroInternoDoPedido('cd75eeb9374f03a24e3fefee'), 'LZCD75EEB9');
});

test('links: site dos Correios com o objeto na URL, Melhor Rastreio sempre, transportadora quando conhecida', () => {
  const l = linksDeRastreio({ codigo: 'AV091829611BR', transportadora: 'Correios' });
  assert.equal(l.correios, 'https://rastreamento.correios.com.br/app/index.php?objeto=AV091829611BR');
  assert.equal(l.melhorRastreio, 'https://www.melhorrastreio.com.br/rastreio/AV091829611BR');
  assert.equal(l.transportadora, undefined, 'Correios não duplica');
  const j = linksDeRastreio({ codigo: 'JT123', transportadora: 'J&T Express' });
  assert.match(j.transportadora, /jtexpress\.com\.br/);
  assert.equal(j.correios, undefined);
  assert.deepEqual(linksDeRastreio({ codigo: '' }), {});
});

test('eventos dos Correios (sro-rastro) viram descrição/detalhe/data/local sem quebrar com campo faltando', () => {
  const evs = eventosDosCorreios({ objetos: [{ codObjeto: 'AV091829611BR', eventos: [
    { descricao: 'Objeto não entregue - endereço inexistente', dtHrCriado: '2026-09-17T11:30:00', unidade: { endereco: { cidade: 'SAO PAULO', uf: 'SP' } } },
    { descricao: 'Objeto postado', dtHrCriado: '2026-09-14T15:10:00', unidade: {} },
    { detalhe: 'sem descrição' },
  ] }] });
  assert.equal(evs.length, 2);
  assert.equal(evs[0].local, 'SAO PAULO - SP');
  assert.equal(evs[1].local, '');
  assert.equal(evs[0].fonte, 'correios');
  assert.deepEqual(eventosDosCorreios(null), []);
  assert.deepEqual(eventosDosCorreios({ objetos: [{ mensagem: 'Objeto não encontrado' }] }), []);
});

test('orientação e mensagem de suporte prontas, com número do pedido e código', () => {
  assert.match(orientacaoDoProblema('Objeto aguardando retirada no endereço indicado'), /documento com foto/);
  assert.match(orientacaoDoProblema('Carteiro não atendido'), /nova tentativa/i);
  assert.match(orientacaoDoProblema('Objeto extraviado'), /reposição ou do reembolso/);
  assert.match(orientacaoDoProblema('qualquer outra coisa'), /suporte/);
  assert.equal(mensagemDoSuporte({ numeroPedido: 'LZCD75EEB9', codigo: 'AV091829611BR', produto: 'Pinça' }), 'Olá! Preciso de ajuda com meu pedido LZCD75EEB9 · Rastreio: AV091829611BR · Produto: Pinça');
});

test('a tela Acompanhar Pedido não lê mais a entrega do status de pagamento e mostra código, link e movimentações', () => {
  const S = ler('../src/pages/CatalogOrderTracking.jsx');
  assert.ok(!S.includes('DELIVERED_STATUSES'), 'entrega derivada do status de pagamento voltou');
  assert.ok(!S.includes('SHIPPED_STATUSES'));
  assert.ok(S.includes("from '@/lib/rastreio'"));
  assert.ok(S.includes("plataforma.functions.invoke('rastrearPedido', { sale_id: saleId, forcar })"));
  for (const marca of ['data-teste="rastreio-codigo"', 'data-teste="rastreio-link-transportadora"', 'data-teste="rastreio-link-melhor-rastreio"',
    'data-teste="rastreio-eventos"', 'data-teste="entrega-atencao"', 'data-teste="rastreio-numero-pedido"', 'data-teste="rastreio-atualizar"', 'data-teste="linha-do-tempo"']) {
    assert.ok(S.includes(marca), `falta ${marca}`);
  }
  assert.ok(S.includes('Rastrear no site dos Correios'));
  assert.ok(S.includes('mensagemDoSuporte({'));
  assert.ok(S.includes('target="_blank"') && S.includes('rel="noopener noreferrer"'));
});

test('o card e o modal de detalhes usam a situação da entrega (com prova), e o modal linka a transportadora', () => {
  const C = ler('../src/components/catalog/CatalogOrderCard.jsx');
  assert.ok(C.includes('export function configDaEntrega(order)'));
  assert.ok(C.includes('const config = configDaEntrega(order);'));
  assert.ok(C.includes('data-teste="pedido-situacao"'));
  const M = ler('../src/components/catalog/DetalhesPedidoModal.jsx');
  assert.ok(M.includes('const cfg = configDaEntrega(order);'));
  assert.ok(M.includes('label="Nº do pedido"'));
  assert.ok(M.includes('data-teste="detalhes-link-rastreio"'));
});

test('a function rastrearPedido consulta Melhor Envio e Correios, guarda em raw_base44.rastreio e NUNCA mexe em status/dinheiro', () => {
  const F = ler('../api/functions/rastrearPedido.js');
  assert.ok(F.includes("from '../../src/lib/rastreio.js'"), 'mesma biblioteca da tela');
  assert.ok(F.includes('/api/v2/me/shipment/tracking') || F.includes('${API}/shipment/tracking'));
  assert.ok(F.includes('https://proxyapp.correios.com.br/v1/sro-rastro/'));
  assert.ok(F.includes("estourouLimite(`rastreio:ip:${ip}`"));
  assert.ok(F.includes('rastreio: resultado'));
  assert.ok(F.includes('patch.delivered_at = situacao.quando'));
  const semRaw = F.replace(/raw_base44/g, '');
  assert.ok(!/patch\.status\b/.test(semRaw) && !/\bstatus:\s*'entregue'/.test(semRaw), 'não pode escrever status de pagamento');
  assert.ok(!/sale_price|total_amount|commission/.test(F), 'nem dinheiro');
  const ME = ler('../api/_lib/melhorEnvioShipment.js');
  for (const e of ['export const UA', 'export function baseUrl', 'export function ambienteAtual', 'export async function getAccessToken']) assert.ok(ME.includes(e), e);
});

test('confirmar recebimento grava delivered_at + fulfillment_status entregue (a prova é o próprio cliente)', () => {
  const F = ler('../api/functions/confirmarRecebimento.js');
  assert.ok(F.includes("delivered_at=is.null"));
  assert.ok(F.includes("fulfillment_status: 'entregue'"));
});
