// 🎟️ DIR-156 — Passaporte: um alvo só de 10% no arremate (modelo A + modelo B),
// e o texto antigo ("R$ 100 que valem R$ 110", "entram na hora") sai do site.
//
// O ACHADO (auditoria de 15/09/2026, dados de produção):
//   finalizeAuctionCore rodava os DOIS motores no arremate, cada um com o alvo
//   cheio de 10%: recolherBonusPorArremate (modelo A, tira da carteira) e
//   cancelarCuponsBloqueados (modelo B, cancela crédito bloqueado). Quem tinha
//   cupom das duas épocas pagava 20%. Rosenberg: R$ 18,22 cancelados a mais;
//   Gean: R$ 10,00; Lucas: R$ 0,18. Devolvidos na mão no banco.
//
// O DONO: "texto antigo tem que tirar... corrigir o que tem que corrigir, pra
// ficar perfeito e o sistema ficar limpo. Vamos fazer o que é certo."
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const finalize = ler('../api/_lib/finalizeAuctionCore.js');
const cupom = ler('../api/_lib/passaporteCoupon.js');
// os comentários de cabeçalho CITAM a frase antiga pra explicar a mudança — o que
// não pode sobrar é a frase no que o cliente lê (JSX), por isso o teste tira as
// linhas de comentário antes de procurar.
const semComentarios = (s) => s.replace(/^\s*\/\/.*$/gm, '');
const cartao = semComentarios(ler('../src/components/passaporte/CartaoPassaporte.jsx'));
const pagina = semComentarios(ler('../src/pages/PassaporteLances.jsx'));

// ─── um alvo só ─────────────────────────────────────────────────────────────

test('no arremate, o modelo A cobra PRIMEIRO e devolve quanto recolheu', () => {
  assert.match(finalize, /const r = await recolherBonusPorArremate\(winnerId, auctionId, finalPrice\);/);
  assert.match(finalize, /jaRecolhidoDaCarteira = Number\(r\?\.recolhido\) \|\| 0;/);
});

test('o modelo B só cancela o que SOBROU do alvo', () => {
  assert.match(finalize, /await cancelarCuponsBloqueados\(winnerId, finalPrice, jaRecolhidoDaCarteira\)/);
  const iA = finalize.indexOf('await recolherBonusPorArremate(winnerId, auctionId, finalPrice)');
  const iB = finalize.indexOf('await cancelarCuponsBloqueados(winnerId, finalPrice, jaRecolhidoDaCarteira)');
  assert.ok(iA > 0 && iB > iA, 'o modelo A (cupons mais antigos) precisa rodar antes do modelo B — FIFO');
  assert.ok(!/cancelarCuponsBloqueados\(winnerId, finalPrice\)/.test(finalize), 'a chamada antiga, com o alvo cheio, não pode sobrar');
});

test('cancelarCuponsBloqueados aceita o que já foi cobrado e desconta do alvo', () => {
  assert.match(cupom, /export async function cancelarCuponsBloqueados\(userId, valorArrematado = null, jaCobrado = 0\)/);
  assert.match(cupom, /const alvo = money\(Math\.max\(0, alvoCheio - money\(jaCobrado\)\)\);/);
  assert.match(cupom, /if \(alvo <= 0\) return \{ canceled: 0, alvo: 0, alvo_cheio: alvoCheio, ja_cobrado: money\(jaCobrado\) \};/);
});

// réplica do cálculo, pra provar o efeito e não só o texto
const PCT = 10;
const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
function alvoRestante(valorArrematado, jaCobrado = 0) {
  const cheio = money((money(valorArrematado) * PCT) / 100);
  return money(Math.max(0, cheio - money(jaCobrado)));
}

test('efeito: Caixa PCX R$ 398 com R$ 30 já recolhidos da carteira → modelo B cancela só R$ 9,80', () => {
  assert.equal(alvoRestante(398, 30), 9.8);
});

test('efeito: sem cupom do modelo A (jaCobrado 0), o modelo B cobra os 10% inteiros — nada muda pra quem só tem cupom novo', () => {
  assert.equal(alvoRestante(250, 0), 25);
  assert.equal(alvoRestante(1.8), 0.18);
});

test('efeito: se a carteira já cobriu tudo, o modelo B não cancela nada', () => {
  assert.equal(alvoRestante(3.8, 10), 0);
});

// ─── texto antigo fora ───────────────────────────────────────────────────────

test('CartaoPassaporte não promete mais R$ 110 nem "entram na hora"', () => {
  assert.ok(!cartao.includes('entram na hora'), 'frase da regra antiga ainda no cartão');
  assert.ok(!/credito = 110/.test(cartao), 'valor padrão da regra antiga ainda no cartão');
  assert.match(cartao, /Saldo de lance/);
  assert.match(cartao, /\+ cupom de <span className="text-emerald-300 font-medium">R\$ \{cupom\.toLocaleString\('pt-BR'\)\}<\/span> pra Loja Virtual/);
  assert.match(cartao, /libera conforme os leilões que você disputar terminarem sem vitória/);
});

test('PassaporteLances não diz mais "R$ 100 que valem R$ 110"', () => {
  assert.ok(!pagina.includes('valem'), 'título da regra antiga ainda na página');
  assert.ok(!/CREDITO = 110/.test(pagina));
  assert.match(pagina, /R\$ 100 de saldo <span className="text-emerald-300">\+ R\$ 10 de cupom<\/span>/);
  assert.match(pagina, /cupom=\{CUPOM\}/);
  assert.match(pagina, /o cupom de 10% fica guardado e libera pra Loja Virtual conforme os leilões que você disputar terminarem sem vitória/);
});
