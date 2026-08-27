// "Seu credito Passaporte foi liberado para usar na loja" — dizia a mensagem.
// No banco: valor_liberado 0,00. Caso real de 26/08/2026 (Alexandre Walenkamp,
// aporte de R$ 100, credito de R$ 10, liberado R$ 0,00). Ele reclamou que a
// opcao nao aparecia na loja — e nao aparecia porque o saldo do cupom era zero.
//
// Causa: a chamada em bidHold passava DOIS argumentos para uma funcao de TRES.
// Sem `valorLance`, o alvo dava 0 e a funcao saia calada na primeira linha.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const hold = ler('../api/_lib/bidHold.js');
const cupom = ler('../api/_lib/passaporteCoupon.js');
const finalize = ler('../api/_lib/finalizeAuctionCore.js');
const selo = ler('../src/components/wallet/BidStateTag.jsx');

test('a funcao continua exigindo o valor do lance', () => {
  // Se um dia ela passar a calcular o valor sozinha, esta correcao muda de forma.
  assert.match(cupom, /export async function liberarCupomPassaporte\(userId, auctionId = null, valorLance = null\)/);
  assert.match(cupom, /if \(alvo <= 0\) return \{ released: 0, reason: 'valor_lance_invalido' \}/);
});

test('ser coberto NAO libera credito — a liberacao saiu do bidHold', () => {
  // Correcao da correcao (PONTO 132). Ser coberto nao e perder: a pessoa ainda
  // pode relancar e vencer. Se liberasse aqui, quem fosse coberto e depois
  // VENCESSE levaria credito de perdedor, e quem fosse coberto varias vezes no
  // mesmo leilao receberia uma fatia por cobertura.
  assert.ok(
    !/await liberarCupomPassaporte\(/.test(hold),
    'a liberacao do Passaporte voltou para o caminho da cobertura'
  );
  assert.ok(
    !/^import .*liberarCupomPassaporte/m.test(hold),
    'o import ficou sobrando'
  );
});

test('a devolucao do saldo reservado continua intacta', () => {
  // E para isso que releaseHold existe. Nada disso podia mudar.
  assert.match(hold, /saldo_disponivel: money\(disponivel \+ liberar\)/);
  assert.match(hold, /saldo_reservado: money\(reservado - liberar\)/);
  assert.match(hold, /tipo: TIPOS\.DEVOLUCAO_COBERTURA/);
});

test('quem libera e o fim do leilao, para quem nao arrematou', () => {
  assert.match(finalize, /liberarCupomPassaporte\(participanteId, auctionId, maiorLance\)/);
  assert.match(finalize, /if \(participanteId === winnerId\) continue;/, 'o vencedor nao pode receber credito de perdedor');
});

test('a regra esta escrita na propria funcao', () => {
  assert.match(cupom, /Chamado só\s*\n?\s*\*? ?na RESOLUÇÃO do leilão \(fim\), nunca no meio de uma simples cobertura/);
});

test('liberar a mais e impossivel: o consumo e limitado ao credito do cupom', () => {
  assert.match(cupom, /const bloqueadoNoCupom = money\(money\(c\.valor_credito\) - jaLiberado - jaCancelado\)/);
  assert.match(cupom, /const tirarDoCupom = money\(Math\.min\(bloqueadoNoCupom, restaConsumir\)\)/);
});

// ── Replica do calculo, para provar o efeito e nao so o texto ────────────────
const PCT = 10;
const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
function liberar({ valorLance }) {
  const alvo = money((money(valorLance) * PCT) / 100);
  return alvo <= 0 ? { released: 0, reason: 'valor_lance_invalido' } : { alvo };
}

test('o efeito: sem o valor do lance, sai zero e calado', () => {
  assert.deepEqual(liberar({ valorLance: undefined }), { released: 0, reason: 'valor_lance_invalido' });
  assert.deepEqual(liberar({ valorLance: null }), { released: 0, reason: 'valor_lance_invalido' });
});

test('o efeito: com o valor do lance, libera os 10%', () => {
  assert.deepEqual(liberar({ valorLance: 100 }), { alvo: 10 });
  assert.deepEqual(liberar({ valorLance: 44.8 }), { alvo: 4.48 });
});

test('o efeito: lance zerado continua sem liberar', () => {
  assert.deepEqual(liberar({ valorLance: 0 }), { released: 0, reason: 'valor_lance_invalido' });
});

// Replica do teto por cupom.
function consumir({ credito, jaLiberado, jaCancelado, alvo }) {
  const bloqueado = money(credito - jaLiberado - jaCancelado);
  return bloqueado <= 0 ? 0 : money(Math.min(bloqueado, alvo));
}

test('o efeito: nunca libera alem do credito do cupom', () => {
  assert.equal(consumir({ credito: 10, jaLiberado: 0, jaCancelado: 0, alvo: 10 }), 10);
  assert.equal(consumir({ credito: 10, jaLiberado: 0, jaCancelado: 0, alvo: 25 }), 10, 'cortou no teto');
  assert.equal(consumir({ credito: 10, jaLiberado: 10, jaCancelado: 0, alvo: 5 }), 0, 'ja tinha liberado tudo');
  assert.equal(consumir({ credito: 10, jaLiberado: 4, jaCancelado: 6, alvo: 5 }), 0, 'liberado + cancelado = credito');
});

// ── A mensagem tem que dizer a mesma coisa que a regra ───────────────────────
// Ela dizia "Seu credito Passaporte FOI liberado para usar na loja" para quem
// era superado. Nao foi: ser coberto nao libera nada. O cliente lia isso, ia na
// loja, nao achava o credito e abria chamado.

test('o selo de superado NAO afirma que o credito ja foi liberado', () => {
  assert.ok(
    !/foi liberado para usar na loja/.test(selo),
    'a tela voltou a prometer liberacao na cobertura'
  );
});

test('o selo explica QUANDO o credito e liberado', () => {
  assert.match(selo, /Se o leilão terminar sem você arrematar/);
});

test('o selo de superado continua dizendo que o dinheiro voltou', () => {
  // Essa parte sempre foi verdade e nao pode sumir: o valor reservado volta na
  // hora em que alguem cobre.
  assert.match(selo, /você foi superado — valor devolvido/);
  assert.match(selo, /voltou integralmente para o seu saldo disponível/);
});
