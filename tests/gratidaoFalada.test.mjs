// 🎙️ NO MOMENTO DE GRATIDÃO, O ÁUDIO É A ENTREGA — DIR-101.1 (09/09/2026).
//
// Correção de rumo do dono, no mesmo dia da primeira versão: "o esforço de ter
// que transcrever o áudio gasta muito tempo e energia. A lógica deve ser: ao
// escolher enviar um áudio, o usuário envia e posteriormente pode ouvir o
// áudio — não precisaria necessariamente escrever, APENAS no Momento Gratidão."
//
// O ERRO QUE ISTO CONSERTA: a primeira versão tratava o áudio como RASCUNHO
// pra produzir texto — fala, o computador escreve, a pessoa lê, corrige, e só
// então vale. Isso não tira atrito, troca: em vez de digitar, revisar.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import {
  GRATIDAO_MIN, GRATIDAO_AUDIO_MIN_SEG, RESUMO_MIN,
  gratidaoEntregue, faltaDaGratidao, audioEntregaValido,
} from '../src/lib/xgame.js';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const RITUAL = semComentarios(ler('../src/components/licensing/CentralVendas/XGameRitualAmanhecer.jsx'));
const METODO = semComentarios(ler('../src/components/licensing/CentralVendas/CrmMetodo.jsx'));
const HOOK = semComentarios(ler('../src/hooks/useDitado.js'));

test('falar 15 segundos entrega a gratidão, sem escrever NADA', () => {
  const r = gratidaoEntregue({ texto: '', audioSeg: 15 });
  assert.equal(r.ok, true);
  assert.equal(r.por, 'audio');
});

test('escrever continua entregando, pra quem prefere digitar', () => {
  assert.equal(gratidaoEntregue({ texto: 'a'.repeat(GRATIDAO_MIN), audioSeg: 0 }).ok, true);
  assert.equal(gratidaoEntregue({ texto: 'a'.repeat(GRATIDAO_MIN - 1), audioSeg: 0 }).ok, false);
});

test('a régua não sumiu — mudou de unidade', () => {
  // "Obrigado" em 2 segundos não é ritual. O piso continua existindo, só
  // passou a medir a coisa certa.
  assert.equal(GRATIDAO_AUDIO_MIN_SEG, 15);
  assert.equal(audioEntregaValido(14), false);
  assert.equal(audioEntregaValido(15), true);
  assert.equal(gratidaoEntregue({ texto: '', audioSeg: 3 }).ok, false);
  assert.equal(gratidaoEntregue({ texto: '', audioSeg: 0 }).ok, false);
});

test('quem falou pouco ouve o que falta em SEGUNDOS, não em caracteres', () => {
  // "faltam 12 caracteres" pra quem acabou de falar é falar grego.
  assert.match(faltaDaGratidao({ texto: '', audioSeg: 5 }), /fale mais 10s/);
  assert.match(faltaDaGratidao({ texto: 'oi', audioSeg: 0 }), /caracteres a mais/);
  assert.equal(faltaDaGratidao({ texto: '', audioSeg: 20 }), '', 'entregue não tem falta');
});

test('🔒 o resumo de estudo NÃO foi afrouxado junto', () => {
  // O dono disse "APENAS no Momento Gratidão". Lá o áudio segue sendo ajuda
  // pra digitar, e os 400 continuam de pé.
  assert.equal(RESUMO_MIN, 400);
  const MODAL = semComentarios(ler('../src/components/licensing/CentralVendas/XGameComprovarModal.jsx'));
  assert.match(MODAL, /texto\.trim\(\)\.length >= RESUMO_MIN/);
  assert.ok(!/gratidaoEntregue|audioEntregaValido/.test(MODAL), 'a regra da gratidão vazou pro resumo');
});

test('o áudio libera NA HORA, sem esperar a transcrição', () => {
  // Fazer a pessoa esperar o Whisper pra liberar o "Continuar" seria o mesmo
  // atrito de antes com outra roupa.
  assert.match(HOOK, /aoAudioRef\.current\?\.\(blob, segRef\.current\)/);
  const stop = HOOK.slice(HOOK.indexOf('rec.onstop'), HOOK.indexOf('recRef.current = rec'));
  assert.ok(stop.indexOf('aoAudioRef') < stop.indexOf('transcrever(blob)'),
    'o áudio tem que sair ANTES da transcrição começar');
  assert.match(RITUAL, /onAudio: \(blob, seg\) =>/);
});

test('a transcrição não aparece pra quem gravou', () => {
  // Ela existe pro registro e pra busca — não como tarefa da pessoa.
  assert.match(RITUAL, /onTexto: \(t\) => setTranscricaoGratidao\(t\)/);
  // o texto transcrito NÃO pode cair no campo que a pessoa vê
  assert.ok(!/setGratidao\(\(atual\) => juntarTexto/.test(RITUAL),
    'a transcrição voltou a cair no campo — é isso que fazia a pessoa revisar');
});

test('o Diário de Bolso não fica em branco quando só houve áudio', () => {
  // diarioDeBolso.js lê `comprovacao.entrega`. Com o áudio valendo sozinho,
  // `gratidao` pode vir vazio — e o dia viraria uma linha vazia.
  assert.match(METODO, /entrega: gratidao \|\| transcricaoGratidao \|\| \(audioGratidao \? '🎙️ gratidão gravada em áudio' : ''\)/);
});

test('dá pra ouvir a gratidão depois, por link assinado pedido no clique', () => {
  assert.match(METODO, /function BotaoOuvirGratidao/);
  assert.match(METODO, /ouvirAudio\(\{ caminho, actorId: uid \}\)/);
  assert.match(METODO, /t\.comprovacao\?\.audio_gratidao_path/);
  // link assinado vence: guardar na tela vira "não abre" sem explicação
  assert.match(METODO, /if \(url \|\| buscando\) return;/);
});

test('a duração falada fica registrada junto', () => {
  assert.match(METODO, /audio_gratidao_seg: audioGratidaoSeg \|\| 0/);
});

test('regravar apaga o áudio E a transcrição velha', () => {
  // Senão a fala nova entra com o texto da fala antiga no registro.
  assert.match(RITUAL, /setAudioGratidao\(null\); setAudioGratidaoSeg\(0\); setTranscricaoGratidao\(''\)/);
});

test('🔒 colar continua bloqueado no campo escrito', () => {
  assert.match(RITUAL, /onPaste=\{bloquearCola\}/);
  assert.match(RITUAL, /onDrop=\{bloquearCola\}/);
});
