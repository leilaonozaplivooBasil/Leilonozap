// 🤝 FRETE A COMBINAR — o lote que nenhuma transportadora aceita (24/09/2026).
//
// Caso real: Harley 117 (45 kg, 110×65×170 cm). A Melhor Envio recusava o
// VOLUME nas quatro transportadoras e a sala dizia "confira o seu CEP". A
// cliente (CEP certo) ficou presa; ninguém nunca deu lance no lote.
//
// Decisão do dono: lote grande + `permite_retirada` ligado pela casa → selo
// 'a_combinar' com frete zero; o lance reserva só o lance. Fora disso, a regra
// de 21/08 continua inteira: sem frete, sem lance. Nada aqui toca rede nem banco.
import { test, describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

process.env.SESSAO_SECRET = 'segredo-de-teste';
process.env.VITE_SUPABASE_URL = 'https://exemplo.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'chave-de-teste';
process.env.MELHOR_ENVIO_TOKEN = 'token-de-teste-nao-e-o-de-producao';
process.env.MELHOR_ENVIO_FROM_CEP = '22795030';

const { cabeFreteACombinar, opcaoACombinar, ehFreteACombinar, FRETE_A_COMBINAR_ID } = await import('../api/_lib/freteACombinar.js');
const { statusDaCotacao, bloqueioDoFrete, MENSAGEM_PRODUTO_GRANDE } = await import('../src/lib/freteDoLance.js');
const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));

// a resposta REAL da Melhor Envio para o scooter (log da Vercel, 24/09 21:28Z)
const RECUSA_VOLUME = [
  { id: 1, name: 'PAC', company: { name: 'Correios' }, error: 'Transportadora não atende este trecho.' },
  { id: 2, name: 'SEDEX', company: { name: 'Correios' }, error: 'Dimensões do objeto ultrapassam o limite da transportadora.' },
  { id: 3, name: '.Package', company: { name: 'Jadlog' }, error: 'Dimensões do objeto ultrapassam o limite da transportadora.' },
  { id: 4, name: '.Com', company: { name: 'Jadlog' }, error: 'Dimensões do objeto ultrapassam o limite da transportadora.' },
];
const RECUSA_ROTA = RECUSA_VOLUME.map((o) => ({ ...o, error: 'Transportadora não atende este trecho.' }));
const COTACAO_OK = [{ id: 1, name: 'SEDEX', company: { name: 'Correios' }, price: '11.60', delivery_time: 3 }];

describe('a regra pura', () => {
  test('só produto_grande E permite_retirada liberam', () => {
    assert.equal(cabeFreteACombinar({ motivo: 'produto_grande', permiteRetirada: true }), true);
    assert.equal(cabeFreteACombinar({ motivo: 'produto_grande', permiteRetirada: false }), false, 'lote sem retirada continua travado');
    assert.equal(cabeFreteACombinar({ motivo: 'produto_grande', permiteRetirada: undefined }), false, 'coluna ausente = não');
    assert.equal(cabeFreteACombinar({ motivo: 'sem_transportadora', permiteRetirada: true }), false, 'rota sem transportadora NÃO é volume');
    assert.equal(cabeFreteACombinar({ motivo: 'produto_grande', permiteRetirada: 'true' }), false, 'string não é true');
    assert.equal(cabeFreteACombinar({}), false);
  });
  test('a opção é zero, sem prazo, com o id fixo que o lance confere', () => {
    const o = opcaoACombinar();
    assert.equal(o.id, 'a_combinar'); assert.equal(o.preco, 0); assert.equal(o.prazo, null); assert.equal(o.a_combinar, true);
    assert.equal(FRETE_A_COMBINAR_ID, 'a_combinar');
    assert.equal(ehFreteACombinar('a_combinar'), true); assert.equal(ehFreteACombinar('me-1'), false); assert.equal(ehFreteACombinar(null), false);
  });
});

describe('cotarFreteDoLeilao — o motor com a Melhor Envio recusando', () => {
  const fetchReal = globalThis.fetch;
  afterEach(() => { globalThis.fetch = fetchReal; });

  async function motor({ permiteRetirada, cotacao, auctionSemColuna = false, chamadorPassaLeilao = false }) {
    const leituras = [];
    globalThis.fetch = async (url, opts = {}) => {
      const u = String(url);
      const json = (v) => ({ ok: true, status: 200, json: async () => v, text: async () => JSON.stringify(v) });
      if (u.includes('/auctions?')) {
        leituras.push(u);
        const base = { id: 'auc-harley', product_id: 'prod-scooter', current_price: 477.6, starting_price: 477.6 };
        return json([auctionSemColuna ? base : { ...base, permite_retirada: permiteRetirada }]);
      }
      if (u.includes('app_users')) return json([{ address_zip_code: '26381354', address_street: 'Rua X', address_number: '10', address_city: 'Queimados', address_state: 'RJ' }]);
      if (u.includes('melhorenvio.com.br')) return { ok: true, status: 200, text: async () => JSON.stringify(cotacao) };
      if (u.includes('/products?')) return json([{ id: 'prod-scooter', peso: 45, altura: 110, largura: 65, comprimento: 170, price_catalog: 3300 }]);
      return json([]);
    };
    const { cotarFreteDoLeilao } = await import(`../api/_lib/freteLeilao.js?t=${Math.random()}`);
    const auction = chamadorPassaLeilao ? { id: 'auc-harley', product_id: 'prod-scooter', current_price: 477.6 } : null;
    const r = await cotarFreteDoLeilao({ auctionId: 'auc-harley', userId: 'user-angela', auction });
    return { r, leituras };
  }

  test('🤝 volume recusado + retirada ligada → ok, selo a_combinar, frete ZERO, CEP e produto no selo', async () => {
    const { r } = await motor({ permiteRetirada: true, cotacao: RECUSA_VOLUME });
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.equal(r.motivo, 'frete_a_combinar'); assert.equal(r.aCombinar, true);
    assert.equal(r.frete.id, 'a_combinar'); assert.equal(r.frete.valor, 0);
    assert.equal(r.frete.cep, '26381354', 'o CEP do cadastro continua no selo (B15 confere ele no lance)');
    assert.equal(r.frete.productId, 'prod-scooter'); assert.equal(r.productId, 'prod-scooter');
    assert.equal(r.opcoes.length, 1); assert.equal(r.opcoes[0].id, 'a_combinar');
    assert.equal(r.enderecoCompleto, true);
  });

  test('🔴 volume recusado + retirada DESLIGADA → continua travado, mas com o submotivo certo (não é CEP)', async () => {
    const { r } = await motor({ permiteRetirada: false, cotacao: RECUSA_VOLUME });
    assert.equal(r.ok, false); assert.equal(r.motivo, 'cotacao_indisponivel');
    assert.equal(r.submotivo, 'produto_grande'); assert.equal(r.frete, null);
  });

  test('🔴 rota sem transportadora + retirada ligada → NÃO libera (é CEP/rota, não volume)', async () => {
    const { r } = await motor({ permiteRetirada: true, cotacao: RECUSA_ROTA });
    assert.equal(r.ok, false); assert.equal(r.submotivo, 'sem_transportadora');
  });

  test('cotação normal com retirada ligada → frete normal, nada muda', async () => {
    const { r } = await motor({ permiteRetirada: true, cotacao: COTACAO_OK });
    assert.equal(r.ok, true); assert.equal(r.aCombinar, undefined); assert.equal(r.frete.valor, 11.6); assert.equal(r.frete.id, '1');
  });

  test('quem chamou passando o leilão SEM a coluna: o motor lê só permite_retirada, e só neste caso', async () => {
    const { r, leituras } = await motor({ permiteRetirada: true, cotacao: RECUSA_VOLUME, auctionSemColuna: false, chamadorPassaLeilao: true });
    assert.equal(r.ok, true); assert.equal(r.aCombinar, true);
    assert.equal(leituras.length, 1); assert.match(leituras[0], /select=permite_retirada/);
    const normal = await motor({ permiteRetirada: true, cotacao: COTACAO_OK, chamadorPassaLeilao: true });
    assert.equal(normal.leituras.length, 0, 'cotação normal não faz leitura extra');
  });
});

describe('a sala — o que a resposta vira e o que trava o lance', () => {
  test('a_combinar: status próprio, valor zero, selo guardado — e o lance PASSA', () => {
    const lido = statusDaCotacao({ success: true, frete_a_combinar: true, endereco_completo: true, opcoes: [{ id: 'a_combinar', preco: 0, selo: 'f1.x.y' }], endereco_atual: { city: 'Queimados' } });
    assert.deepEqual(lido, { status: 'a_combinar', valor: 0, selo: 'f1.x.y', endereco: { city: 'Queimados' } });
    assert.equal(bloqueioDoFrete({ ...lido, cep: '26381354' }), null);
    // pelo id da opção também, se a flag não vier
    assert.equal(statusDaCotacao({ success: true, opcoes: [{ id: 'a_combinar', preco: 0, selo: 's' }] }).status, 'a_combinar');
    // sem selo não passa nem a combinar
    assert.match(bloqueioDoFrete({ status: 'a_combinar', selo: null }), /Recarregue/);
  });
  test('produto_grande: a frase certa — nada de "confira o CEP"', () => {
    const lido = statusDaCotacao({ success: false, motivo: 'produto_grande', error: MENSAGEM_PRODUTO_GRANDE });
    assert.equal(lido.status, 'produto_grande');
    const msg = bloqueioDoFrete({ ...lido, cep: '26381354' });
    assert.equal(msg, MENSAGEM_PRODUTO_GRANDE); assert.doesNotMatch(msg, /CEP/);
  });
  test('o resto continua igual ao que era', () => {
    assert.equal(statusDaCotacao({ success: true, endereco_completo: true, opcoes: [{ id: '1', preco: '11.60', selo: 's' }] }).status, 'ok');
    assert.equal(statusDaCotacao({ success: true, endereco_completo: false, opcoes: [{ id: '1', preco: 11.6, selo: 's' }] }).status, 'needs_address');
    assert.equal(statusDaCotacao({ success: false, error: 'nao_autenticado' }).status, 'needs_login');
    assert.equal(statusDaCotacao({ success: false, motivo: 'sem_cep' }).status, 'needs_cep');
    assert.equal(statusDaCotacao({ success: false, motivo: 'cotacao_indisponivel' }).status, 'error');
    assert.equal(statusDaCotacao({ data: { success: false, motivo: 'sem_cep' } }).status, 'needs_cep', 'aceita o envelope {data}');
    assert.equal(bloqueioDoFrete({ status: 'ok', valor: 11.6, selo: 's', cep: '1' }), null);
    assert.match(bloqueioDoFrete({ status: 'ok', valor: 11.6, selo: null, cep: '1' }), /confirmar o frete/);
    assert.match(bloqueioDoFrete({ status: 'ok', valor: 0, selo: 's', cep: '1' }), /ainda não foi calculado/, 'ok com zero e sem ser a_combinar não passa');
    assert.match(bloqueioDoFrete({ status: 'needs_login' }), /sessão expirou/);
    assert.match(bloqueioDoFrete({ status: 'needs_address' }), /endereço/);
    assert.match(bloqueioDoFrete({ status: 'loading' }), /Calculando/);
    assert.match(bloqueioDoFrete({ status: 'needs_cep' }), /Informe seu CEP/);
    assert.match(bloqueioDoFrete({ status: 'error', cep: '1' }), /Confira o CEP/);
  });
});

describe('🔴 o servidor do lance — zero só passa com selo a_combinar E retirada ligada no banco', () => {
  const S = ler('../api/functions/submitAtomicBid.js');
  test('lê permite_retirada junto com product_id (com a volta segura sem as duas)', () => {
    assert.match(S, /select=\$\{COLUNAS_BASE\},product_id,permite_retirada`/);
    assert.match(S, /select=\$\{COLUNAS_BASE\}`\)/, 'a volta segura relê sem as colunas novas');
  });
  test('a exceção exige as duas coisas, do selo íntegro e do banco', () => {
    assert.match(S, /const _freteACombinar = _freteOk && String\(_frete\.id \|\| ''\) === 'a_combinar' && auction\.permite_retirada === true;/);
    assert.match(S, /if \(!\(freteValor > 0\) && !_freteACombinar\)/);
  });
  test('cotarFrete sobe produto_grande com nome, e a flag frete_a_combinar', () => {
    const C = ler('../api/functions/cotarFrete.js');
    assert.match(C, /cot\.submotivo === 'produto_grande'/); assert.match(C, /motivo: 'produto_grande', error: MENSAGEM_PRODUTO_GRANDE/);
    assert.match(C, /frete_a_combinar: cot\.aCombinar === true/);
  });
  test('a sala e a caixinha usam a régua compartilhada', () => {
    const R = ler('../src/pages/AuctionRoom.jsx');
    assert.match(R, /statusDaCotacao\(data\)/); assert.match(R, /bloqueioDoFrete\(\{ status: freteStatus/);
    const B = ler('../src/components/auction/FreteLanceBanner.jsx');
    assert.ok(B.includes('data-teste="frete-a-combinar"')); assert.ok(B.includes('data-teste="frete-produto-grande"'));
  });
});
