// 27/08/2026 — BONUS DO PASSAPORTE PAGO DUAS VEZES.
//
// Entre 01/08 e 19/08 valeu o modelo A (api/_lib/passaporteBonus.js): o bonus de 10%
// era somado DIRETO em app_users.saldo_disponivel no ato do deposito, e o cupom ficava
// so como registro de auditoria, com bonus_creditado_em preenchido.
//
// Em 19/08 entrou o modelo B (api/_lib/passaporteCoupon.js): o cupom nasce bloqueado e
// libera fatia por fatia, conforme cada leilao disputado termina sem vitoria.
//
// O consumirBloqueado lia TODOS os cupons do usuario, sem filtro. Um cupom do modelo A
// guarda valor_credito = 10 com liberado e cancelado zerados — identico, na conta, a um
// cupom bloqueado do modelo B. Entao o encerramento do leilao liberava, como credito de
// Loja Virtual, um bonus que ja tinha sido pago na carteira semanas antes.
//
// Medido no banco: R$ 76,09 em dobro, 10 cupons, 8 pessoas. Nada gasto ainda.
//
// A separacao certa e por DONO: cupom do modelo A pertence ao passaporteBonus.js, cupom
// do modelo B pertence ao passaporteCoupon.js. bonus_creditado_em e a marca que separa.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const motor    = ler('../api/_lib/passaporteCoupon.js');
const finalize = ler('../api/_lib/finalizeAuctionCore.js');
const modeloA  = ler('../api/_lib/passaporteBonus.js');
const carteira = ler('../src/components/wallet/WalletDrawer.jsx');
const beneficios = ler('../src/components/passaporte/BeneficiosPassaporte.jsx');
const cartao   = ler('../src/components/wallet/PassaporteCard.jsx');

/**
 * Corpo de uma funcao, por contagem de chaves.
 * Pula a lista de parametros primeiro: `extraFields = {}` tem chave dentro, e comecar
 * a contar ali fecha a funcao na propria assinatura.
 */
function corpo(fonte, cabecalho) {
  const i = fonte.indexOf(cabecalho);
  assert.notEqual(i, -1, `sumiu do arquivo: ${cabecalho}`);
  let par = 0, depoisDosParametros = -1;
  for (let j = fonte.indexOf('(', i); j < fonte.length; j++) {
    if (fonte[j] === '(') par++;
    else if (fonte[j] === ')' && --par === 0) { depoisDosParametros = j; break; }
  }
  assert.notEqual(depoisDosParametros, -1, `parenteses nao fecharam em ${cabecalho}`);
  let nivel = 0;
  for (let j = fonte.indexOf('{', depoisDosParametros); j < fonte.length; j++) {
    if (fonte[j] === '{') nivel++;
    else if (fonte[j] === '}' && --nivel === 0) return fonte.slice(i, j + 1);
  }
  throw new Error(`chaves nao fecharam em ${cabecalho}`);
}

/** Texto que o cliente REALMENTE le — sem comentario de codigo nem de JSX. */
function semComentarios(fonte) {
  return fonte
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
}

// ---------------------------------------------------------------------------
// A trava principal
// ---------------------------------------------------------------------------
test('cupom cujo bonus JA foi pro saldo nao pode ser liberado de novo', () => {
  const fn = corpo(motor, 'async function consumirBloqueado(');
  assert.match(fn, /passaporte_coupons\?select=id,valor_credito/, 'sumiu a consulta do consumirBloqueado');
  assert.match(fn, /bonus_creditado_em=is\.null/,
    'o filtro do modelo antigo saiu — o bonus volta a ser pago duas vezes');
});

test('o filtro vale para liberar E para cancelar', () => {
  // Os dois passam pelo MESMO consumirBloqueado — e e so por isso que um filtro
  // sozinho protege os dois. Se alguem separar em duas funcoes, este teste cai.
  const usos = [...motor.matchAll(/consumirBloqueado\(/g)].length;
  assert.equal(usos, 3, 'consumirBloqueado deixou de ser o caminho unico (definicao + liberar + cancelar)');
  assert.match(corpo(motor, 'export async function liberarCupomPassaporte('), /consumirBloqueado\(/);
  assert.match(corpo(motor, 'export async function cancelarCuponsBloqueados('), /consumirBloqueado\(/);
});

test('a Carteira nao diz "esperando o leilao" para bonus que ja foi pago', () => {
  const bloco = motor.slice(motor.indexOf('export async function statusCupons'));
  assert.match(bloco, /if \(c\.bonus_creditado_em\) return s;/,
    'tem_bloqueado voltou a contar cupom do modelo antigo — a tela mente de novo');
});

// ---------------------------------------------------------------------------
// O espelho do bug, do lado de COBRAR
// ---------------------------------------------------------------------------
test('so recolhe da carteira bonus que REALMENTE foi pago na carteira', () => {
  // 'creditado' e um rotulo, e rotulo pode estar errado. Achado no banco um cupom do
  // modelo NOVO marcado como 'creditado' com bonus_creditado_em vazio — o bonus nunca
  // foi pra carteira. Se a pessoa arrematasse, o recolhimento tirava ate R$ 50,00 do
  // saldo dela pra devolver um bonus que ela nunca recebeu.
  const fn = corpo(modeloA, 'export async function recolherBonusPorArremate(');
  assert.match(fn, /status=eq\.creditado/, 'o filtro de status sumiu');
  assert.match(fn, /bonus_creditado_em=not\.is\.null/,
    'voltou a recolher da carteira por rotulo, sem provar que o bonus foi pago');
});

test('o recolhimento continua limitado ao saldo que existe', () => {
  // Trava antiga que nao pode cair junto: recolher nunca deixa saldo negativo.
  assert.match(modeloA, /const aplicar = delta < 0 \? -money\(Math\.min\(Math\.abs\(delta\), atual\)\) : money\(delta\)/,
    'o recolhimento pode voltar a deixar saldo negativo');
});

// ---------------------------------------------------------------------------
// O que NAO pode mudar
// ---------------------------------------------------------------------------
test('a liberacao continua acontecendo SO no encerramento do leilao', () => {
  assert.match(finalize, /for \(const \[participanteId, maiorLance\] of maiorLancePorParticipante\)/);
  assert.match(finalize, /liberarCupomPassaporte\(participanteId, auctionId, maiorLance\)/,
    'a liberacao deixou de ser por fatia do lance daquele leilao');
  // nenhum outro arquivo pode liberar cupom
  const bidHold = ler('../api/_lib/bidHold.js');
  assert.ok(!/^\s*[^/]*\bliberarCupomPassaporte\(/m.test(bidHold),
    'voltou a liberar credito quando o cliente e apenas coberto');
});

test('cupom do modelo B continua liberando normalmente', () => {
  // O filtro e bonus_creditado_em IS NULL — que e exatamente o cupom do modelo B.
  // Se alguem inverter o filtro, o sistema para de pagar quem tem direito.
  assert.ok(!/bonus_creditado_em=not\.is\.null/.test(motor), 'o filtro foi invertido');
  assert.ok(!/bonus_creditado_em=is\.not\.null/.test(motor), 'o filtro foi invertido');
});

test('o saldo GASTAVEL continua somando todos os cupons', () => {
  const bloco = motor.slice(motor.indexOf('export async function statusCupons'));
  assert.match(bloco, /gastavelTotal = lista\.reduce\(\(s, c\) => s \+ money\(c\.saldo_restante\), 0\)/,
    'credito ja liberado de verdade deixou de contar — cliente perde o que e dele');
});

// ---------------------------------------------------------------------------
// As telas nao podem voltar a prometer credito imediato
// ---------------------------------------------------------------------------
test('a tela do deposito nao promete mais o bonus "na hora"', () => {
  const visivel = semComentarios(carteira);
  assert.ok(!/de crédito na hora/.test(visivel), 'voltou o "+10% de crédito na hora"');
  assert.ok(!/viram R\$ 110 na carteira/.test(visivel), 'voltou o "R$ 100 viram R$ 110 na carteira"');
  assert.match(carteira, /libera a cada leilão que você disputar e não ganhar/,
    'a tela do deposito parou de explicar quando o credito libera');
});

test('a pagina do Passaporte parou de se contradizer', () => {
  assert.ok(!/na sua carteira na hora/.test(semComentarios(beneficios)), 'voltou o "aparece na carteira na hora"');
  assert.match(beneficios, /libera conforme os leilões que você disputar forem terminando sem vitória/);
  assert.match(beneficios, /assim que ele terminar/, 'o rodape perdeu a regra do encerramento');
});

test('a Carteira mostra QUANTO esta guardado, nao so que existe', () => {
  assert.match(cartao, /status\.bloqueado\?\.saldo/, 'a Carteira voltou a esconder o valor guardado');
  assert.match(cartao, /money\(guardado\)/);
});
