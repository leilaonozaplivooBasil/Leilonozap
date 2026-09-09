// 🎙️ DITADO NO MOMENTO DE GRATIDÃO — DIR-101 (09/09/2026).
//
// Ordem do dono: levar o "enviar áudio" do Guia do Usuário pros módulos do
// X-GAME, começando pelo Momento de Gratidão. São 6h da manhã, a pessoa está
// meio dormindo, no celular — digitar gratidão com sentimento nessa hora é o
// atrito que a voz tira.
//
// O que estes testes seguram é o que NÃO pode ser afrouxado junto: os mínimos,
// o bloqueio de colar, e o cofre privado (a voz não vira link público).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const RITUAL_CRU = ler('../src/components/licensing/CentralVendas/XGameRitualAmanhecer.jsx');
const RITUAL = semComentarios(RITUAL_CRU);
const METODO = semComentarios(ler('../src/components/licensing/CentralVendas/CrmMetodo.jsx'));

test('os dois campos do ritual ganharam microfone', () => {
  assert.match(RITUAL, /const ditadoGratidao = useDitado\(/);
  assert.match(RITUAL, /const ditadoAcao = useDitado\(/);
  assert.equal((RITUAL.match(/<BotaoDitado/g) || []).length, 2, 'gratidão e ação, um cada');
});

test('🔒 os mínimos NÃO caíram por causa do áudio', () => {
  // Falar é outro jeito de produzir as próprias palavras — não é desconto.
  assert.match(RITUAL, /const GRATIDAO_MIN = 20;/);
  assert.match(RITUAL, /const ACAO_MIN = 10;/);
  assert.match(RITUAL, /disabled=\{gratidao\.trim\(\)\.length < GRATIDAO_MIN\}/);
  assert.match(RITUAL, /disabled=\{acao\.trim\(\)\.length < ACAO_MIN\}/);
});

test('🔒 colar continua bloqueado — a voz não abriu essa porta', () => {
  // A regra existe contra copiar as palavras dos OUTROS. Falar é autoria;
  // colar não é. Uma coisa não afrouxa a outra.
  assert.match(RITUAL, /onPaste=\{bloquearCola\}/);
  assert.equal((RITUAL.match(/onPaste=\{bloquearCola\}/g) || []).length, 2, 'gratidão e ação seguem bloqueadas');
  assert.match(RITUAL, /AVISO_COLAR/);
});

test('o texto ditado cai no CAMPO — nada é enviado sem a pessoa ler', () => {
  assert.match(RITUAL, /setGratidao\(\(atual\) => juntarTexto\(atual, t\)\)/);
  assert.match(RITUAL, /setAcao\(\(atual\) => juntarTexto\(atual, t\)\)/);
});

test('a voz vai pro cofre PRIVADO, não pro bucket público do vídeo', () => {
  // O vídeo da visualização usa Core.UploadFile (public-assets, público).
  // A voz não pode seguir o mesmo caminho.
  assert.match(METODO, /caminhoDoAudio|guardarAudio/);
  assert.match(METODO, /caminho: caminhoDoAudio\(\{ pasta, uid, dia: hojeStr\(\)/);
  const trechoVoz = METODO.slice(METODO.indexOf('const guardarVoz'), METODO.indexOf('const aprovadoDireto'));
  assert.ok(!/Core\.UploadFile/.test(trechoVoz), 'a voz foi parar no bucket público');
});

test('a origem do texto fica registrada', () => {
  // Decisão do dono: áudio conta como "suas palavras", COM a origem marcada —
  // pra gestão enxergar o que aconteceu sem ter que adivinhar.
  assert.match(METODO, /entrada_gratidao: 'audio'/);
  assert.match(METODO, /entrada_acao: 'audio'/);
  assert.match(METODO, /audio_gratidao_path: vozGratidao/);
  assert.match(METODO, /audio_acao_path: vozAcao/);
});

test('guardar a voz é o EXTRA: falhar não derruba o ritual', () => {
  // Quem acabou de ditar a gratidão às 6h não pode perder o dia porque o cofre
  // piscou. `guardarAudio` devolve null em vez de lançar (testado em
  // cofreDeAudio.test.mjs) e o path só entra na comprovação se existir.
  assert.match(METODO, /\.\.\.\(vozGratidao \? \{ audio_gratidao_path: vozGratidao \} : \{\}\)/);
  assert.match(METODO, /\.\.\.\(vozAcao \? \{ audio_acao_path: vozAcao \} : \{\}\)/);
});

test('sem áudio, nada muda — quem digita segue igual', () => {
  // O campo `entrada_*` e o path só aparecem quando houve fala. Cadastro
  // digitado continua com exatamente a mesma comprovação de antes.
  assert.match(METODO, /\.\.\.\(audioGratidao \? \{ entrada_gratidao: 'audio' \} : \{\}\)/);
  assert.match(METODO, /audioGratidao, audioAcao, tempoTelaS/, 'o ritual precisa entregar os áudios pra cima');
});
