// 🎙️ DITADO — falar em vez de digitar (09/09/2026).
//
// O dono pediu o microfone do Guia do Usuário em módulos do X-GAME. O gravador
// era ~60 linhas soltas dentro do Tira Dúvidas; copiar aquilo em 4 telas seria
// copiar o bug de microfone-que-fica-ligado 4 vezes. Estes testes seguram a
// regra pura E o fato de o Tira Dúvidas ter passado a usar a peça extraída
// SEM mudar de comportamento — que é a única prova de que a extração foi fiel.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  TETO_GRAVACAO_SEG,
  MENSAGENS,
  juntarTexto,
  textoDoCronometro,
  segundosRestantes,
  bateuOTeto,
  gravacaoUtil,
  formatoDeGravacao,
  extensaoDoMime,
} from '../src/lib/ditado.js';
import { semComentarios } from './_ajuda.mjs';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// ── a regra ─────────────────────────────────────────────────────────────────

test('o ditado ACRESCENTA ao que já estava escrito, não substitui', () => {
  // Quem escreveu metade e ditou o resto não pode perder a metade.
  assert.equal(juntarTexto('já escrevi isso', 'e falei isso'), 'já escrevi isso e falei isso');
  assert.equal(juntarTexto('', 'só falei'), 'só falei');
  assert.equal(juntarTexto('só escrevi', ''), 'só escrevi');
  assert.equal(juntarTexto('  espaços  ', '  sobrando  '), 'espaços sobrando');
});

test('o ditado respeita o teto do campo', () => {
  assert.equal(juntarTexto('abc', 'defghij', 5), 'abc d');
  assert.equal(juntarTexto('', 'texto longo demais', 5), 'texto');
  // texto vazio com limite não estoura
  assert.equal(juntarTexto(null, null, 10), '');
  assert.equal(juntarTexto(undefined, undefined), '');
});

test('cronômetro em mm:ss', () => {
  assert.equal(textoDoCronometro(0), '0:00');
  assert.equal(textoDoCronometro(9), '0:09');
  assert.equal(textoDoCronometro(75), '1:15');
  assert.equal(textoDoCronometro(120), '2:00');
  assert.equal(textoDoCronometro(-5), '0:00', 'segundo negativo não existe');
  assert.equal(textoDoCronometro('abc'), '0:00');
});

test('o teto de 2 minutos corta a gravação', () => {
  assert.equal(bateuOTeto(119), false);
  assert.equal(bateuOTeto(120), true);
  assert.equal(bateuOTeto(999), true);
  assert.equal(TETO_GRAVACAO_SEG, 120, 'o teto veio do Tira Dúvidas e vale pra todo mundo');
  assert.equal(segundosRestantes(105), 15);
  assert.equal(segundosRestantes(200), 0, 'nunca negativo');
});

test('clique sem querer não vira chamada paga ao Whisper', () => {
  assert.equal(gravacaoUtil({ size: 300 }), false);
  assert.equal(gravacaoUtil({ size: 1001 }), true);
  assert.equal(gravacaoUtil(null), false);
  assert.equal(gravacaoUtil({}), false);
});

test('escolhe o formato que o aparelho aguenta — e o iPhone não fala webm', () => {
  const soMp4 = (f) => f === 'audio/mp4';
  const tudo = () => true;
  assert.equal(formatoDeGravacao(tudo), 'audio/webm', 'webm primeiro: é o que o Whisper come melhor');
  assert.equal(formatoDeGravacao(soMp4), 'audio/mp4', 'Safari do iPhone cai no mp4');
  assert.equal(formatoDeGravacao(() => false), null, 'sem formato conhecido, deixa o navegador decidir');
  assert.equal(formatoDeGravacao(undefined), null, 'navegador sem MediaRecorder não quebra');
  assert.equal(formatoDeGravacao(() => { throw new Error('boom'); }), null, 'navegador que estoura no teste não quebra');
});

test('a extensão do arquivo acompanha o formato gravado', () => {
  assert.equal(extensaoDoMime('audio/webm;codecs=opus'), 'webm');
  assert.equal(extensaoDoMime('audio/mp4'), 'm4a');
  assert.equal(extensaoDoMime('audio/ogg'), 'ogg');
  assert.equal(extensaoDoMime(''), 'webm', 'sem tipo, assume o mais comum');
  assert.equal(extensaoDoMime(null), 'webm');
});

test('as mensagens de erro mandam a pessoa de volta pro teclado', () => {
  // Erro de microfone não pode ser beco sem saída: sempre tem o caminho escrito.
  for (const m of Object.values(MENSAGENS)) {
    assert.match(m, /escrev|Escrev|grava de novo/i, `mensagem sem saída: "${m}"`);
  }
});

// ── o hook: o que não dá pra testar sem navegador, testa-se lendo ───────────
const HOOK = semComentarios(ler('../src/hooks/useDitado.js'));

test('o microfone é DESLIGADO de verdade quando a tela fecha', () => {
  // 🔴 O bug que este hook existe pra não ter em 4 cópias: parar o recorder
  // NÃO desliga o microfone — os tracks do stream seguem vivos e o navegador
  // mantém a bolinha vermelha acesa. A pessoa não vê um bug, vê um app
  // espionando ela.
  assert.match(HOOK, /useEffect\(\(\) => \(\) => \{/, 'falta a limpeza no unmount');
  assert.match(HOOK, /streamRef\.current\?\.getTracks\?\.\(\)\.forEach\(\(t\) => t\.stop\(\)\)/,
    'parar os tracks é o que apaga a bolinha vermelha');
  assert.match(HOOK, /clearInterval\(relogioRef\.current\)/, 'o cronômetro fica rodando sozinho');
});

test('a disponibilidade é perguntada UMA vez por página, não uma por componente', () => {
  // Com o microfone em 5 telas, 5 componentes montados fariam 5 requisições
  // idênticas ao mesmo GET.
  assert.match(HOOK, /let promessaDisponivel = null/);
  assert.match(HOOK, /if \(!promessaDisponivel\)/);
});

test('o hook devolve o ÁUDIO junto com o texto — quem chama decide se guarda', () => {
  // Decisão do dono (09/09): a Gratidão guarda o áudio; o Tira Dúvidas
  // descarta. Quem decide é a tela, não o hook.
  assert.match(HOOK, /aoTextoRef\.current\?\.\(j\.texto, blob\)/);
});

test('o texto ditado NÃO sai como mensagem — cai no campo pra revisão', () => {
  // É esta decisão que torna o áudio seguro num sistema onde o texto vale
  // nota, dinheiro e MvM: a pessoa lê o que o computador entendeu.
  assert.ok(!/enviar\(|submit/i.test(HOOK), 'o hook não pode mandar nada sozinho');
});

// ── a extração foi fiel? ────────────────────────────────────────────────────
const TIRA = semComentarios(ler('../src/components/licensing/TiraDuvidas.jsx'));

test('o Tira Dúvidas usa a peça extraída, e não uma cópia do gravador', () => {
  assert.match(TIRA, /useDitado/);
  assert.match(TIRA, /BotaoDitado/);
  assert.ok(!/new MediaRecorder/.test(TIRA), 'sobrou um gravador solto na tela');
  assert.ok(!/getUserMedia/.test(TIRA), 'sobrou abertura de microfone solta na tela');
  assert.ok(!/streamRef/.test(TIRA), 'sobrou limpeza de stream duplicada');
});

test('o Tira Dúvidas continua fazendo o texto cair no campo, com o teto dele', () => {
  assert.match(TIRA, /juntarTexto\(atual, t, LIMITE_PERGUNTA\)/);
});

test('erro do microfone e aviso da tela dividem a MESMA faixa', () => {
  // Dois lugares diferentes pra mensagem de erro é como não ter nenhum.
  assert.match(TIRA, /const avisoNaTela = aviso \|\| ditado\.erro/);
  assert.match(TIRA, /\{avisoNaTela &&/);
});

// ── o botão ─────────────────────────────────────────────────────────────────
const BOTAO = semComentarios(ler('../src/components/common/BotaoDitado.jsx'));

test('o botão SOME quando a transcrição não está ligada', () => {
  // Botão que existe e falha é pior que botão que não existe — a mesma lição
  // do `transcribeAudio`, que tinha tela chamando rota inexistente.
  assert.match(BOTAO, /if \(!ditado\?\.disponivel\) return null;/);
});

test('o botão não pinta o próprio fundo — quem usa passa o tema', () => {
  // O X-GAME é escuro e o CRM é claro. Cor fixa aqui quebraria num dos dois.
  assert.match(BOTAO, /className = ''/);
  assert.match(BOTAO, /\$\{className\}/);
});
