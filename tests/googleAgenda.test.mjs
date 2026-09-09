// 🗓️ GOOGLE AGENDA — a conexão que não pode atrapalhar (DIR-103, 09/09/2026).
//
// Relato do dono: "a conexão com o Google deve ficar mais fluida, justamente
// para evitar que os usuários tentem agendar reunião e, ao invés de usar a
// conta do Google principal, optem por usar outra. Nesse meio tempo de
// reconexão, dá erro."
//
// O que estes testes seguram é a ORDEM e as duas regras que faziam a janela do
// Google aparecer no meio do agendamento — que é onde a pessoa erra a conta.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import {
  expiraEmDe, tokenAindaVale, ehErroDeAutorizacao, erroDoGoogle, statusDoErro,
  invalidarTokenSePreciso, contaLembrada, lembrarConta, esquecerConta,
} from '../src/lib/googleAgenda.js';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const LIB = semComentarios(ler('../src/lib/googleAgenda.js'));
const TELA = semComentarios(ler('../src/components/licensing/CentralVendas/CrmMetodo.jsx'));

// localStorage de mentira: o módulo só usa get/set/removeItem, dentro de try.
globalThis.localStorage = (() => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
})();

test('token vencido não é reaproveitado — e a folga de 60s existe', () => {
  const agora = 1_000_000;
  // O Google devolve 3600s; a gente para de confiar 60s antes, porque a
  // requisição leva tempo: token que vence em 3s passa aqui e chega vencido lá.
  assert.equal(expiraEmDe({ expires_in: 3600 }, agora), agora + 3540 * 1000);
  assert.equal(expiraEmDe({ expires_in: 30 }, agora), agora, 'menos que a folga = já vencido');
  // sem expires_in, prazo conservador de 5 min em vez de "vale pra sempre"
  assert.equal(expiraEmDe({}, agora), agora + 5 * 60 * 1000);
  assert.equal(expiraEmDe(null, agora), agora + 5 * 60 * 1000);

  assert.equal(tokenAindaVale({ valor: 'x', expiraEm: agora + 1 }, agora), true);
  assert.equal(tokenAindaVale({ valor: 'x', expiraEm: agora }, agora), false, 'no fio = não vale');
  assert.equal(tokenAindaVale({ valor: '', expiraEm: agora + 9e9 }, agora), false, 'sem valor não é token');
  assert.equal(tokenAindaVale(null, agora), false);
});

test('🔴 só 401/403 derrubam o token — soluço de rede não vira nova janela', () => {
  // Esta é a causa 3. Antes, QUALQUER erro fazia setGoogleToken(null): um 500
  // do Google ou a internet oscilando jogava fora um token bom e obrigava nova
  // autorização — e é na janela de autorização que a pessoa erra a conta.
  assert.equal(ehErroDeAutorizacao(401), true);
  assert.equal(ehErroDeAutorizacao(403), true);
  for (const s of [0, 404, 429, 500, 502, 503]) {
    assert.equal(ehErroDeAutorizacao(s), false, `${s} não é "sua autorização acabou"`);
    assert.equal(invalidarTokenSePreciso(s), false, `${s} não pode derrubar o token`);
  }
  assert.equal(invalidarTokenSePreciso(401), true);
});

test('o status viaja preso no erro — ninguém precisa adivinhar por regex', () => {
  const e = erroDoGoogle({ status: 403 });
  assert.equal(statusDoErro(e), 403);
  assert.match(e.message, /403/, 'a mensagem continua legível pra quem lê o toast');
  assert.equal(statusDoErro(new Error('caiu a internet')), 0, 'falha de rede = 0, e 0 não derruba');
  assert.equal(statusDoErro(null), 0);
  assert.equal(statusDoErro({ status: 'nada disso' }), 0);
});

test('a conta é lembrada no aparelho — e "trocar conta" esquece de verdade', () => {
  esquecerConta();
  assert.equal(contaLembrada(), null);
  lembrarConta('principal@empresa.com');
  assert.equal(contaLembrada(), 'principal@empresa.com');
  lembrarConta('');
  assert.equal(contaLembrada(), 'principal@empresa.com', 'vazio não apaga o que estava certo');
  esquecerConta();
  assert.equal(contaLembrada(), null, 'sem isto, quem tem duas agendas ficaria preso na primeira');
});

test('🔴 O TOKEN NÃO VAI PRO DISCO — só o e-mail', () => {
  // O e-mail não é segredo e é exatamente o que conserta o seletor aparecendo
  // do nada. O token é credencial: guardar em localStorage é dar a agenda de
  // quem usa um computador compartilhado pra próxima pessoa que sentar nele.
  const guardados = [...LIB.matchAll(/localStorage\.setItem\(\s*([A-Za-z_$][\w$]*)/g)].map((m) => m[1]);
  assert.deepEqual(guardados, ['CHAVE_CONTA'], 'a única coisa que vai pro disco é a chave da conta');
  assert.ok(!/setItem\([^)]*token/i.test(LIB), 'apareceu token indo pro localStorage');
});

test('🔴 A ORDEM É O CONSERTO: cache → silencioso com hint → só então a janela', () => {
  const corpo = LIB.slice(LIB.indexOf('export async function tokenDoGoogle'));
  const iCache = corpo.indexOf('tokenAindaVale(token)');
  const iSilencioso = corpo.indexOf("prompt: ''");
  const iJanela = corpo.lastIndexOf('pedir(cliente,');
  assert.ok(iCache > -1 && iSilencioso > -1 && iJanela > -1, 'sumiu um dos três passos');
  assert.ok(iCache < iSilencioso, 'o cache tem que vir antes de falar com o Google');
  assert.ok(iSilencioso < iJanela, 'a tentativa SILENCIOSA vem antes da janela — é ela que evita o seletor');
  // E mesmo a janela abre já na conta certa: sem hint, o Google mostra o
  // seletor, que é onde a reunião cai na conta errada.
  assert.match(corpo, /hint: conta/, 'a janela precisa do hint da conta lembrada');
  assert.equal((corpo.match(/hint: conta/g) || []).length, 2, 'hint no silencioso E na janela');
});

test('o cliente e o script do Google nascem UMA vez', () => {
  // Causa 4 e 5: recriar o tokenClient a cada chamada, e duas chamadas
  // próximas anexando dois <script> do Google na mesma página.
  assert.match(LIB, /if \(clienteToken\) return clienteToken;/, 'sem isto o client é recriado a cada chamada');
  assert.match(LIB, /if \(!scriptGsi\) \{/, 'sem isto dois <script> do GSI entram na página');
});

test('a tela não guarda mais o token — nem derruba ele em qualquer erro', () => {
  // O token vale ~1h; o useState do componente morria a cada remontagem (causa 1).
  assert.ok(!/setGoogleToken/.test(TELA), 'voltou o token no estado do componente');
  assert.ok(!/initTokenClient/.test(TELA), 'a tela voltou a falar direto com o GSI');
  const derrubadas = (TELA.match(/invalidarTokenSePreciso\(statusDoErro\(e\)\)/g) || []).length;
  assert.equal(derrubadas, 4, 'os quatro catches do Google (conectar, criar, atualizar, apagar) têm que passar pelo filtro 401/403');
});

test('o aquecimento silencioso acontece — e só pra quem já autorizou', () => {
  // É este pedaço que acaba com a janela aparecendo NO MEIO do agendamento:
  // o token chega antes de a pessoa clicar em "Agendar".
  assert.match(TELA, /if \(contaLembrada\(\)\) tokenDoGoogle\(\{ interativo: false \}\)/,
    'sumiu o aquecimento — a reconexão volta a acontecer na hora errada');
  assert.match(TELA, /\.catch\(\(\) => \{\}\)/, 'o aquecimento não pode estourar erro na cara de ninguém');
});

test('a tela mostra QUAL conta está ligada, com saída pra trocar', () => {
  // Ver o e-mail antes de agendar é o que evita a reunião cair na conta errada.
  assert.match(TELA, /Conectado como/, 'sem mostrar a conta, a pessoa só descobre o erro depois da reunião marcada');
  assert.match(TELA, /\{googleConta\}/, 'o e-mail tem que aparecer de verdade, não um "conectado" genérico');
  assert.match(TELA, /onClick=\{trocarContaGoogle\}/, 'faltou o botão de trocar conta');
  assert.match(TELA, /const trocarContaGoogle = async \(\) => \{\s*esquecerConta\(\);/,
    'trocar conta TEM que esquecer o e-mail — senão o hint prende a pessoa na conta antiga');
});
