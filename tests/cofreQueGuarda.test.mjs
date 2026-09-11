// 🔴 OS DOIS COFRES ESTAVAM VAZIOS — nunca guardaram um arquivo (10/09/2026).
//
// ═══════════════════════════════════════════════════════════════════════════
// COMO ISSO FOI DESCOBERTO
// ═══════════════════════════════════════════════════════════════════════════
// Relato do dono: "5 usuários não conseguem gravar o momento gratidão das 5:30
// da manhã; alguns tentaram mais de 3x e o vídeo não salva."
//
// No banco: `storage.objects` em `xgame-audios` e `xgame-videos` → ZERO linhas.
// Nenhum arquivo, nunca, nos dois cofres. Ninguém tinha reclamado antes porque
// guardar é best-effort de propósito (o ritual não cai se o cofre piscar) — o
// que virou silêncio absoluto por três dias.
//
// DUAS CAUSAS INDEPENDENTES, nos logs de produção de 10/09:
//
//   1. VÍDEO — 11 chamadas ao /api/functions/videoDoRitual, 11 × HTTP 413.
//      A Vercel corta o corpo da requisição em ~4,5 MB ANTES de a função
//      rodar; o `limiteBytes` de 100 MB da rota é um número que a plataforma
//      nunca honrou. Antes do cofre, o vídeo ia direto do navegador pro
//      Storage — foi pôr a função no meio que criou o teto.
//
//   2. ÁUDIO — `Storage recusou 400 {"error":"invalid_mime_type","message":
//      "mime type audio/webm;codecs=opus is not supported"}`. O navegador
//      grava com o codec no mime; o Supabase compara a string INTEIRA contra a
//      lista do bucket, que tem `audio/webm`. Vale igual pro vídeo
//      (`video/webm;codecs=vp8,opus`) — consertar só o 413 revelaria o 415.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mimeLimpo } from '../api/_lib/cofrePrivado.js';
import { semCodec } from '../src/lib/cofreDeAudio.js';
import { semComentarios } from './_ajuda.mjs';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const COFRE = semComentarios(ler('../api/_lib/cofrePrivado.js'));
const CLIENTE = semComentarios(ler('../src/lib/cofreDeAudio.js'));
const CRM = semComentarios(ler('../src/components/licensing/CentralVendas/CrmMetodo.jsx'));

test('🔴 o codec sai do mime — nos dois lados', () => {
  // Os valores exatos que os navegadores mandam.
  assert.equal(mimeLimpo('audio/webm;codecs=opus'), 'audio/webm');
  assert.equal(mimeLimpo('video/webm;codecs=vp8,opus'), 'video/webm');
  assert.equal(semCodec('audio/webm;codecs=opus'), 'audio/webm');
  assert.equal(semCodec('video/webm;codecs="vp9,opus"'), 'video/webm');
  // e o que já vem limpo passa intacto
  assert.equal(mimeLimpo('video/mp4'), 'video/mp4');
  assert.equal(semCodec('video/mp4'), 'video/mp4');
});

test('⚠️ mime vazio não vira string vazia — o Storage recusaria igual', () => {
  assert.equal(mimeLimpo(''), 'application/octet-stream');
  assert.equal(mimeLimpo(null), 'application/octet-stream');
  assert.equal(semCodec(undefined), 'application/octet-stream');
  // e espaço/caixa não passam batido
  assert.equal(mimeLimpo('  AUDIO/WEBM ; codecs=opus '), 'audio/webm');
});

test('🔴 o vídeo NÃO passa mais por dentro da função — era o 413', () => {
  assert.match(CLIENTE, /guardarDireto\(\{ rota: COFRE_VIDEO, balde: 'xgame-videos'/, 'o vídeo voltou pro corpo da requisição — 4,5 MB e volta o 413');
  // o corpo do pedido de autorização tem só o caminho, nada de bytes
  assert.match(CLIENTE, /body: JSON\.stringify\(\{ caminho, actorId: actorId \|\| '' \}\)/);
});

test('🔴 e o Blob é REETIQUETADO antes de subir — a opção contentType não basta', () => {
  // Conferido no supabase-js instalado: com Blob, `uploadToSignedUrl` monta um
  // FormData e faz `body.append("", fileBody)`. O `options.contentType` só é
  // usado no ramo que NÃO é Blob. Sem reetiquetar, o tipo que chega no Storage
  // é o do próprio Blob — com o codec — e o 415 volta igual.
  assert.match(
    CLIENTE,
    /const pronto = blob\.type === tipoLimpo \? blob : new Blob\(\[blob\], \{ type: tipoLimpo \}\);/,
    'parou de reetiquetar o blob — o contentType das opções é ignorado com Blob e o 415 volta',
  );
});

test('🔴 assinar exige o MESMO dono que guardar exigia', () => {
  // O caminho novo não pode ser uma porta dos fundos: quem assina decide onde
  // o arquivo vai cair, então a trava de dono tem que ser idêntica.
  const bloco = COFRE.slice(COFRE.indexOf("tipoDoCorpo.includes('application/json')"), COFRE.indexOf('multipart/form-data'));
  assert.match(bloco, /const dono = donoDoCaminho\(caminho\);/, 'a assinatura parou de validar o caminho');
  assert.match(bloco, /exigirSessao\(req, actorId, rota, true\)/, 'a assinatura parou de exigir crachá');
  assert.match(bloco, /String\(eu\) !== String\(dono\)/, 'a assinatura passou a aceitar caminho de outra pessoa');
});

test('⚠️ o pedido de autorização tem teto próprio de tamanho', () => {
  // É JSON com um caminho; qualquer coisa além disso é abuso.
  assert.match(COFRE, /corpoBruto\(req, 64 \* 1024\)/, 'o corpo do pedido de assinatura ficou sem teto');
});

test('🔴 o caminho antigo (multipart) corta o codec antes de mandar', () => {
  assert.match(COFRE, /'Content-Type': mimeLimpo\(arquivo\.type\)/, 'voltou a mandar o mime cru — é o 415 do cofre de voz');
  assert.doesNotMatch(COFRE, /'Content-Type': arquivo\.type \|\| 'application\/octet-stream'/);
});

test('🔴 falhar em guardar deixou de ser mudo', () => {
  // Best-effort continua: o ritual não cai. Mas cinco pessoas gravaram de novo
  // três vezes porque a tela não dizia nada.
  // 10/09 — o aviso mudou de lugar (o vídeo passou a ser guardado no bloco da
  // visualização, não no fim do ritual) e de sujeito ("A visualização foi
  // registrada"), porque agora é o BLOCO que fica salvo. O que não pode mudar
  // é o silêncio voltar.
  assert.match(
    CRM,
    /if \(dados\.videoBlob && !videoPath\) toast\.error\('A visualização foi registrada, mas não consegui guardar a gravação/,
    'voltou a falhar em silêncio — foi o silêncio que fez as pessoas repetirem',
  );
  // e o aviso só aparece quando HOUVE vídeo: quem escolheu não gravar não
  // pode receber um erro sobre uma gravação que ela nunca fez.
  assert.match(CRM, /if \(dados\.videoBlob && !videoPath\)/);
});

test('⚠️ e o ritual continua valendo quando o cofre falha', () => {
  // A trava que impede o conserto de virar "derruba o ritual se o cofre cair".
  assert.doesNotMatch(CRM, /!videoPath\)[^;]{0,80}return;/, 'o ritual passou a cair quando a gravação não salva');
  // ⚠️ mede a INTENÇÃO (o envio inteiro dentro de try/catch), não a
  // adjacência das linhas: a primeira versão exigia `try {` colado no
  // `if (!blob…)` e quebrou quando entrou o `aoFalhar` no meio — sem que nada
  // da blindagem tivesse mudado.
  const corpoDireto = CLIENTE.slice(CLIENTE.indexOf('async function guardarDireto'), CLIENTE.indexOf('export const guardarAudio'));
  assert.match(corpoDireto, /\btry \{/, 'guardarDireto deixou de blindar com try');
  assert.match(corpoDireto, /\} catch \(e\) \{[\s\S]*?return /, 'guardarDireto deixou de devolver algo no catch — exceção subiria e derrubaria o ritual');
});
