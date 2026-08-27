// 27/08/2026 — "precisamos humanizar ainda mais o atendimento dele com os clientes".
//
// O prompt do Zeca ja pedia conversa humanizada, e pedia bem: 2 a 4 linhas, uma ideia por
// mensagem, sem saudacao repetida, sem bullet, sem link seco. O que denunciava a maquina
// nao era o texto — eram tres comportamentos que prompt nenhum resolve:
//
//  1. Cliente escreve em pedacos ("oi" / "tenho uma duvida" / "sobre o leilao de ontem") e
//     levava TRES respostas atropelando uma na outra.
//  2. A resposta chegava sempre num bloco so.
//  3. Ele nunca "lia" a mensagem — sem tique azul, a resposta aparecia do nada.
//
// Este arquivo tranca os tres. Le o index.ts de verdade e RODA as funcoes puras que extrai
// dele — nao copia a regra pra ca.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const fonte = readFileSync(new URL('../supabase/functions/whatsapp-router/index.ts', import.meta.url), 'utf8');

// ---------------------------------------------------------------------------
// Extracao (mesma tecnica de tests/zecaGrupoAudio.test.mjs)
// ---------------------------------------------------------------------------
function semTipos(codigo) {
  return codigo
    .replace(/: \{ anteriores: Turno\[\]; pendente: string \}/g, '')
    .replace(/: Turno\[\]/g, '')
    .replace(/: string\[\]/g, '')
    .replace(/: string \| null/g, '')
    .replace(/: string/g, '')
    .replace(/: boolean/g, '')
    .replace(/: number/g, '')
    .replace(/\?\.content/g, '.content');
}
const fonteJS = semTipos(fonte);

function corpo(cabecalho, texto = fonteJS) {
  const i = texto.indexOf(cabecalho);
  assert.notEqual(i, -1, `sumiu do index.ts: ${cabecalho}`);
  let par = 0, fimParams = -1;
  for (let j = texto.indexOf('(', i); j < texto.length; j++) {
    if (texto[j] === '(') par++;
    else if (texto[j] === ')' && --par === 0) { fimParams = j; break; }
  }
  let nivel = 0;
  for (let j = texto.indexOf('{', fimParams); j < texto.length; j++) {
    if (texto[j] === '{') nivel++;
    else if (texto[j] === '}' && --nivel === 0) return texto.slice(i, j + 1);
  }
  throw new Error(`chaves nao fecharam em ${cabecalho}`);
}

const codigo = [corpo('function separarPendentes('), corpo('function pedacosDaResposta(')].join('\n\n');
const { separarPendentes, pedacosDaResposta } =
  new Function(`${codigo}\nreturn { separarPendentes, pedacosDaResposta };`)();

// ---------------------------------------------------------------------------
// 1. Cliente escrevendo em pedacos = UMA resposta
// ---------------------------------------------------------------------------
test('tres mensagens seguidas do cliente viram uma fala so', () => {
  const { anteriores, pendente } = separarPendentes([
    { role: 'user', content: 'quanto custa o passaporte?' },
    { role: 'assistant', content: 'O deposito minimo e R$ 100.' },
    { role: 'user', content: 'oi' },
    { role: 'user', content: 'tenho uma duvida' },
    { role: 'user', content: 'sobre o leilao de ontem' },
  ]);
  assert.equal(pendente, 'oi\ntenho uma duvida\nsobre o leilao de ontem');
  assert.equal(anteriores.length, 2, 'o historico anterior foi perdido');
  assert.equal(anteriores[anteriores.length - 1].role, 'assistant');
});

test('mensagem unica continua funcionando igual a antes', () => {
  const { anteriores, pendente } = separarPendentes([
    { role: 'user', content: 'quanto custa?' },
    { role: 'assistant', content: 'R$ 100.' },
    { role: 'user', content: 'e o frete?' },
  ]);
  assert.equal(pendente, 'e o frete?');
  assert.equal(anteriores.length, 2);
});

test('historico vazio nao quebra', () => {
  assert.deepEqual(separarPendentes([]), { anteriores: [], pendente: '' });
});

test('a fala pendente NUNCA fica duplicada no historico', () => {
  // Se separarPendentes deixasse a fala tambem em `anteriores`, a Claude receberia a
  // mesma frase duas vezes e responderia como se o cliente tivesse repetido.
  const historico = [{ role: 'assistant', content: 'oi' }, { role: 'user', content: 'tudo bem?' }];
  const { anteriores, pendente } = separarPendentes(historico);
  assert.ok(!anteriores.some((t) => t.content === pendente), 'a fala pendente ficou duplicada');
  assert.equal(historico.length, 2, 'separarPendentes mexeu no array que recebeu');
});

test('ele espera o cliente terminar antes de responder — e desiste se vier mais', () => {
  const fn = corpo('async function processarMensagem(', fonte);
  assert.match(fn, /await dormir\(JANELA_AGRUPAMENTO_MS\)/, 'sumiu a espera');
  assert.match(fn, /chegouMensagemMaisNova\(msg\.remetente, agente, marca\)/);
  assert.match(fn, /return;/, 'ele parou de desistir quando chega mensagem mais nova');
  // A espera vale so no 1:1 — no grupo a Heloim ja tem o freio dela.
  assert.match(fn, /if \(!emGrupo && marca\)/, 'a espera vazou para o grupo');
});

test('a fala do cliente e gravada ANTES da resposta — e so uma vez', () => {
  const fn = corpo('async function processarMensagem(', fonte);
  const gravacoes = [...fn.matchAll(/salvarTurno\(msg\.remetente, agente, '(user|assistant)'/g)].map((m) => m[1]);
  assert.deepEqual(gravacoes, ['user', 'assistant'],
    'a ordem mudou: sem gravar a fala do cliente antes, o agrupamento nao enxerga nada');
});

// ---------------------------------------------------------------------------
// 2. Resposta em pedacos
// ---------------------------------------------------------------------------
test('resposta de dois paragrafos vira duas mensagens', () => {
  assert.deepEqual(pedacosDaResposta('Achei seu pedido.\n\nChega quinta.'),
    ['Achei seu pedido.', 'Chega quinta.']);
});

test('resposta de um paragrafo continua sendo uma mensagem so', () => {
  assert.deepEqual(pedacosDaResposta('Seu saldo e R$ 146,68.'), ['Seu saldo e R$ 146,68.']);
  assert.deepEqual(pedacosDaResposta('Linha um\nlinha dois'), ['Linha um\nlinha dois'],
    'quebra simples de linha nao pode virar mensagem separada');
});

test('nunca passa de tres mensagens — o resto vai junto no ultimo', () => {
  const r = pedacosDaResposta('a\n\nb\n\nc\n\nd\n\ne');
  assert.equal(r.length, 3, 'virou metralhadora');
  assert.equal(r[2], 'c\n\nd\n\ne');
});

test('resposta vazia nao manda mensagem nenhuma', () => {
  assert.deepEqual(pedacosDaResposta(''), []);
  assert.deepEqual(pedacosDaResposta('   \n\n  '), []);
});

test('o envio pausa entre um pedaco e outro', () => {
  const fn = corpo('async function enviarWhatsApp(', fonte);
  assert.match(fn, /pedacosDaResposta\(texto\)/);
  assert.match(fn, /if \(i > 0\) await dormir\(PAUSA_ENTRE_PEDACOS_MS\)/,
    'os pedacos voltaram a sair todos de uma vez');
});

// ---------------------------------------------------------------------------
// 3. Tique azul
// ---------------------------------------------------------------------------
test('ele le a mensagem antes de responder', () => {
  const fn = corpo('async function processarMensagem(', fonte);
  assert.match(fn, /await marcarComoLida\(msg\.grupoId \?\? msg\.remetente, msg\.messageId\)/);
  // Ler tem que vir ANTES de qualquer coisa cara — e antes da espera.
  assert.ok(fn.indexOf('marcarComoLida') < fn.indexOf('JANELA_AGRUPAMENTO_MS'),
    'o tique azul passou a aparecer depois da espera — o cliente fica no vacuo');
});

test('marcar como lida nunca derruba o atendimento', () => {
  const fn = corpo('async function marcarComoLida(', fonte);
  assert.match(fn, /try \{/);
  assert.match(fn, /catch/);
  assert.match(fn, /if \(!messageId \|\| !ZAPI_INSTANCE_ID \|\| !ZAPI_TOKEN\) return;/);
});

// ---------------------------------------------------------------------------
// O que NAO pode mudar
// ---------------------------------------------------------------------------
test('o freio do grupo continua de pe', () => {
  assert.match(fonte, /if \(emGrupo && !\(await heloimFoiChamada\(msg\)\)\) return;/,
    'em grupo ele voltou a falar sem ser chamado');
});

test('a memoria cresceu, mas continua limitada', () => {
  const m = fonte.match(/const HISTORICO_MAX_MSGS = (\d+);/);
  assert.ok(m, 'sumiu o limite de historico');
  const n = Number(m[1]);
  assert.ok(n >= 20 && n <= 40, `historico fora da faixa segura: ${n}`);
});

test('as regras de tamanho de resposta continuam no prompt', () => {
  // Sem isso a quebra em pedacos vira tres paragrafos longos em vez de tres frases.
  assert.match(fonte, /TAMANHO DA RESPOSTA — regra dura/);
  assert.match(fonte, /2 a 4 linhas por mensagem/);
});

test('o prompt ensina quando separar em duas mensagens', () => {
  // Sem isto a Claude quase nunca gera paragrafo duplo, e pedacosDaResposta nunca dispara:
  // a quebra em mensagens existiria no codigo e nao apareceria pro cliente.
  assert.match(fonte, /separe com uma linha/);
  assert.match(fonte, /Cada bloco vira uma mensagem separada no WhatsApp/,
    'o prompt parou de ensinar quando separar — a quebra em mensagens vira letra morta');
  assert.match(fonte, /Não force: se é uma coisa só, mande num bloco só/,
    'sumiu o freio: sem ele ele parte toda resposta em pedacos');
});
