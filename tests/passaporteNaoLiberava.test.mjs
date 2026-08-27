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

test('a funcao continua exigindo o valor do lance', () => {
  // Se um dia ela passar a calcular o valor sozinha, esta correcao muda de forma.
  assert.match(cupom, /export async function liberarCupomPassaporte\(userId, auctionId = null, valorLance = null\)/);
  assert.match(cupom, /if \(alvo <= 0\) return \{ released: 0, reason: 'valor_lance_invalido' \}/);
});

test('quem foi coberto tem o valor do lance passado na liberacao', () => {
  assert.match(
    hold,
    /liberarCupomPassaporte\(uid, auctionId, liberar\)/,
    'voltou a chamar sem o valor do lance — nao libera nada e nao avisa'
  );
});

test('nenhuma chamada com so dois argumentos sobrou', () => {
  const chamadas = [...hold.matchAll(/liberarCupomPassaporte\(([^)]*)\)/g)]
    .map((m) => m[1].split(',').length)
    .filter((n) => n > 0);
  for (const n of chamadas) {
    assert.equal(n, 3, 'chamada de liberarCupomPassaporte sem os tres argumentos');
  }
});

test('o outro caminho (fim do leilao) ja passava o valor — segue igual', () => {
  assert.match(finalize, /liberarCupomPassaporte\(participanteId, auctionId, maiorLance\)/);
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
