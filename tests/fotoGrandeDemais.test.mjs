/**
 * 📷 A FOTO DE 5,85 MB — as três correções.
 *
 * 17/09/2026, o dono: "erro de validação, o que pode estar fora do ar?".
 * Nada estava. A IA respondia, o saldo estava em dia. A foto tinha 5,85 MB, a
 * Anthropic recusa imagem acima de 5 MB com 400, e a tela traduzia esse 400
 * como "IA indisponível". Eram 23 de 1310 prints — a porta do app deixava
 * passar até 8 MB, então existia uma faixa inteira (5 a 8 MB) em que a prova
 * da pessoa morria com a mensagem errada.
 *
 * As três correções, e o que cada teste trava:
 *   1. ENCOLHER no navegador antes de subir — e o hash continua sendo o do
 *      arquivo ORIGINAL, senão a trava de print reaproveitado fura;
 *   2. SEPARAR "imagem recusada" de "IA fora do ar" — inclusive na régua, que
 *      sem isso APROVA a tarefa com o benefício da dúvida sem análise nenhuma;
 *   3. VALIDAR o ramo da URL, que não validava nada.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { semComentarios } from './_ajuda.mjs';
import { precisaEncolher, medidasParaCaber, TETO_DA_IA, ALVO_DE_BYTES, LADO_MAXIMO } from '../src/lib/encolherImagem.js';
import { decisaoAposIA } from '../src/lib/xgameValidacao.js';
import { problemaDaImagem, conferirImagemPorUrl } from '../api/functions/xgameValidarPrint.js';

const RAIZ = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const MB = 1024 * 1024;
const arquivo = (bytes, type = 'image/jpeg') => ({ size: bytes, type, name: 'print.jpg' });

// ── 1. ENCOLHER ──────────────────────────────────────────────────────────────

test('a foto de 5,85 MB do incidente é encolhida; um print normal não é mexido', () => {
  assert.equal(precisaEncolher(arquivo(5.85 * MB)), true, 'a foto do incidente tem que encolher');
  assert.equal(precisaEncolher(arquivo(800 * 1024)), false, 'print de 800 KB não precisa ser reencodado');
});

test('o alvo fica abaixo do teto da IA — com folga, não raspando', () => {
  assert.ok(ALVO_DE_BYTES < TETO_DA_IA, 'o alvo tem que ser menor que o teto');
  assert.ok(TETO_DA_IA - ALVO_DE_BYTES >= MB, 'folga pequena demais entre o alvo e o teto');
});

test('não reencoda o que não é imagem, nem GIF (mataria a animação)', () => {
  assert.equal(precisaEncolher(arquivo(9 * MB, 'application/pdf')), false);
  assert.equal(precisaEncolher(arquivo(9 * MB, 'image/gif')), false);
  assert.equal(precisaEncolher(null), false);
});

test('as medidas caem proporcionalmente, e foto pequena não é esticada', () => {
  const grande = medidasParaCaber(4000, 3000, LADO_MAXIMO);
  assert.equal(grande.largura, LADO_MAXIMO);
  assert.equal(grande.altura, Math.round(3000 * (LADO_MAXIMO / 4000)));
  assert.equal(grande.mudou, true);

  const pequena = medidasParaCaber(800, 600, LADO_MAXIMO);
  assert.deepEqual(pequena, { largura: 800, altura: 600, mudou: false });
  assert.equal(medidasParaCaber(0, 0), null);
});

test('🔒 o hash sai do arquivo ORIGINAL, e o que sobe é o encolhido', () => {
  const tela = semComentarios(readFileSync(path.join(RAIZ, 'src/components/licensing/CentralVendas/CrmMetodo.jsx'), 'utf8'));
  // o hash é tirado de dados.file (o que a pessoa escolheu)
  assert.match(tela, /hashDoArquivo\(dados\.file\)/, 'o hash tem que vir do arquivo original');
  // e o upload manda a versão encolhida
  assert.match(tela, /encolherSePreciso\(dados\.file\)/);
  assert.ok(!/UploadFile\(\{\s*file:\s*dados\.file/.test(tela), 'ainda existe upload do arquivo original');
  // 🔴 se o hash passasse a sair do encolhido, a mesma foto reencodada noutro
  // aparelho daria hash diferente e o print de ontem voltaria a valer.
  assert.ok(!/hashDoArquivo\(menor\)/.test(tela), 'o hash NÃO pode sair do arquivo encolhido');
});

// ── 2. IMAGEM RECUSADA ≠ IA FORA ─────────────────────────────────────────────

test('o 400 de imagem grande vira mensagem de imagem, não "IA fora do ar"', () => {
  const motivo = problemaDaImagem({ status: 400, mensagem: 'messages.0.content.0.image.source.url: image exceeds 5 MB maximum' });
  assert.match(motivo, /grande demais/i);
  assert.match(motivo, /5 MB/);
});

test('400 de formato estranho pede outro formato', () => {
  const motivo = problemaDaImagem({ status: 400, mensagem: 'Could not process image: unsupported format' });
  assert.match(motivo, /JPG, PNG ou WEBP/);
});

test('🔴 400 que NÃO é de imagem continua sendo erro nosso, não culpa da foto', () => {
  assert.equal(problemaDaImagem({ status: 400, mensagem: 'max_tokens: must be greater than 0' }), null);
  assert.equal(problemaDaImagem({ status: 401, mensagem: 'invalid image api key' }), null, '401 é chave, não imagem');
  assert.equal(problemaDaImagem({ status: 402, mensagem: 'insufficient credit' }), null, '402 é saldo — DIR-146');
  assert.equal(problemaDaImagem({ status: 0, tipo: 'rede', mensagem: 'fetch failed' }), null);
  assert.equal(problemaDaImagem(null), null);
});

test('🔴 imagem recusada NÃO vira tarefa aprovada pelo benefício da dúvida', () => {
  // o servidor devolve veredito 'duvida' junto com a recusa — e é exatamente
  // essa dúvida que, sem a régua nova, terminava em 'aprovar'
  const decisao = decisaoAposIA({ imagem_recusada: true, veredito: 'duvida', motivo: 'a imagem tem 5,9 MB e o limite é 5 MB' });
  assert.equal(decisao.acao, 'trocar_imagem');
  assert.match(decisao.motivo, /5 MB/);
});

test('imagem recusada também não é tratada como IA fora do ar', () => {
  const decisao = decisaoAposIA({ imagem_recusada: true, veredito: 'duvida' });
  assert.notEqual(decisao.acao, 'ia_fora');
  assert.notEqual(decisao.acao, 'aprovar');
  assert.notEqual(decisao.acao, 'reprovar');
});

test('IA realmente fora continua bloqueando como antes (DIR-84.1 de pé)', () => {
  assert.equal(decisaoAposIA({ ia_indisponivel: true }).acao, 'ia_fora');
  assert.equal(decisaoAposIA({ veredito: 'aprovada' }).acao, 'aprovar');
  assert.equal(decisaoAposIA({ veredito: 'reprovada' }).acao, 'reprovar');
});

test('a tela sabe o que fazer com "trocar_imagem" — senão a régua é enfeite', () => {
  const tela = semComentarios(readFileSync(path.join(RAIZ, 'src/components/licensing/CentralVendas/CrmMetodo.jsx'), 'utf8'));
  assert.match(tela, /decisao\.acao === 'trocar_imagem'/);
});

// ── 3. O RAMO DA URL, QUE NÃO VALIDAVA NADA ──────────────────────────────────

const cabecalhos = (mapa) => ({ get: (k) => mapa[k.toLowerCase()] ?? null });
const respostaFalsa = (mapa) => async () => ({ ok: true, headers: cabecalhos(mapa) });

test('imagem grande demais é recusada ANTES de gastar chamada de IA', async () => {
  const r = await conferirImagemPorUrl('https://x/foto.jpg', {
    buscar: respostaFalsa({ 'content-type': 'image/jpeg', 'content-length': String(Math.round(5.85 * MB)) }),
  });
  assert.equal(r.ok, false);
  assert.match(r.motivo, /5\.9 MB/);
  assert.match(r.motivo, /limite da análise é 5 MB/);
});

test('imagem dentro do teto passa', async () => {
  const r = await conferirImagemPorUrl('https://x/foto.jpg', {
    buscar: respostaFalsa({ 'content-type': 'image/png', 'content-length': String(2 * MB) }),
  });
  assert.equal(r.ok, true);
  assert.equal(r.bytes, 2 * MB);
});

test('link que não é imagem é recusado com o motivo certo', async () => {
  const r = await conferirImagemPorUrl('https://x/pagina', {
    buscar: respostaFalsa({ 'content-type': 'text/html; charset=utf-8' }),
  });
  assert.equal(r.ok, false);
  assert.match(r.motivo, /não é uma imagem/);
});

test('🔴 NA DÚVIDA, DEIXA PASSAR: HEAD que falha não pode barrar a prova', async () => {
  const explodiu = await conferirImagemPorUrl('https://x/foto.jpg', { buscar: async () => { throw new Error('rede'); } });
  assert.equal(explodiu.ok, true);
  assert.equal(explodiu.conferido, false);

  const negou = await conferirImagemPorUrl('https://x/foto.jpg', { buscar: async () => ({ ok: false, headers: cabecalhos({}) }) });
  assert.equal(negou.ok, true);

  const semTamanho = await conferirImagemPorUrl('https://x/foto.jpg', { buscar: respostaFalsa({ 'content-type': 'image/jpeg' }) });
  assert.equal(semTamanho.ok, true, 'sem content-length não dá pra saber — passa');
});
