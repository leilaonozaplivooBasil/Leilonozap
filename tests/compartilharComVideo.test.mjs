// 🎬 COMPARTILHAR SEMPRE COM O VÍDEO (08/10/2026): anexo para vídeo nosso, link do vídeo
// na frente para YouTube — e, sem vídeo aproveitável, o fluxo de sempre (foto) segue.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TETO_ANEXO_BYTES, ehVideoDeLink, mensagemComVideo, compartilharArquivoDeVideo, compartilharComVideo,
} from '../src/lib/compartilharComVideo.js';

const URL_NOSSA = 'https://leilaonozap.net/l/abc?ref=maira';
const MSG = `🔨📦 LEILÃO NO🔥ZAP!\n\n📱 Smart TV\n💰 Lance: R$ 237,60\n\n⚡ Dê seu lance: ${URL_NOSSA}`;
const YT = { tipo: 'youtube', url: 'https://youtube.com/shorts/AbC123xyz_-', embed: 'https://www.youtube.com/embed/AbC123xyz_-', id: 'AbC123xyz_-', vertical: true };
const ARQ = { tipo: 'arquivo', url: 'https://x.supabase.co/storage/v1/object/public/videos-produtos/a.mp4', embed: 'https://x.supabase.co/storage/v1/object/public/videos-produtos/a.mp4' };

const navegador = (extra = {}) => {
  const chamadas = [];
  return { chamadas, share: async (d) => { chamadas.push(d); }, canShare: () => true, ...extra };
};
const buscaDe = (bytes, ok = true) => async () => ({ ok, blob: async () => ({ size: bytes, type: 'video/mp4', arrayBuffer: async () => new ArrayBuffer(0) }) });

test('só YouTube e Vimeo com endereço são "vídeo de link"', () => {
  assert.equal(ehVideoDeLink(YT), true);
  assert.equal(ehVideoDeLink({ tipo: 'vimeo', url: 'https://vimeo.com/1' }), true);
  assert.equal(ehVideoDeLink(ARQ), false);
  assert.equal(ehVideoDeLink({ tipo: 'youtube', url: '' }), false);
  assert.equal(ehVideoDeLink(null), false);
});

test('🔴 a mensagem com vídeo do YouTube leva o link do vídeo PRIMEIRO (o preview é o vídeo) e o nosso link logo abaixo', () => {
  const m = mensagemComVideo(MSG, YT);
  assert.ok(m.startsWith('🎥 Veja em vídeo:\nhttps://youtube.com/shorts/AbC123xyz_-'));
  assert.ok(m.indexOf('youtube.com') < m.indexOf(URL_NOSSA), 'o link do vídeo vem antes do nosso');
  assert.ok(m.includes(URL_NOSSA), 'o nosso link (com o afiliado) continua na mensagem');
  assert.equal(mensagemComVideo(MSG, ARQ), MSG, 'vídeo nosso não mexe no texto');
  assert.equal(mensagemComVideo(MSG, null), MSG);
});

test('vídeo NOSSO vai anexado, com o texto sem o link repetido', async () => {
  const nav = navegador();
  const r = await compartilharComVideo({ video: ARQ, titulo: 'Smart TV', mensagem: MSG, url: URL_NOSSA, nav, buscar: buscaDe(5 * 1024 * 1024) });
  assert.deepEqual(r, { feito: true, via: 'anexo' });
  assert.equal(nav.chamadas.length, 1);
  assert.equal(nav.chamadas[0].files.length, 1);
  assert.equal(nav.chamadas[0].files[0].name, 'Smart_TV.mp4');
  assert.ok(!nav.chamadas[0].text.includes(URL_NOSSA), 'a folha recebe o link à parte');
  assert.equal(nav.chamadas[0].url, URL_NOSSA);
});

test('vídeo nosso acima de 16 MB NÃO é anexado: devolve "não feito" e o fluxo de sempre segue', async () => {
  const nav = navegador();
  const r = await compartilharComVideo({ video: ARQ, titulo: 'x', mensagem: MSG, url: URL_NOSSA, nav, buscar: buscaDe(TETO_ANEXO_BYTES + 1) });
  assert.deepEqual(r, { feito: false, via: null });
  assert.equal(nav.chamadas.length, 0);
});

test('aparelho sem suporte a anexo, rede que falha e arquivo que não baixa: cai no fluxo de sempre', async () => {
  const semAnexo = navegador({ canShare: () => false });
  assert.equal((await compartilharComVideo({ video: ARQ, mensagem: MSG, url: URL_NOSSA, nav: semAnexo, buscar: buscaDe(1000) })).feito, false);
  const redeCaiu = await compartilharComVideo({ video: ARQ, mensagem: MSG, url: URL_NOSSA, nav: navegador(), buscar: async () => { throw new Error('rede'); } });
  assert.equal(redeCaiu.feito, false);
  assert.equal((await compartilharComVideo({ video: ARQ, mensagem: MSG, url: URL_NOSSA, nav: navegador(), buscar: buscaDe(1000, false) })).feito, false);
  assert.equal((await compartilharComVideo({ video: ARQ, mensagem: MSG, url: URL_NOSSA, nav: {}, buscar: buscaDe(1000) })).feito, false, 'sem navigator.share');
});

test('a pessoa fecha a folha: é "feito" (cancelou) e nada mais é tentado', async () => {
  const nav = navegador({ share: async () => { const e = new Error('x'); e.name = 'AbortError'; throw e; } });
  const r = await compartilharComVideo({ video: ARQ, mensagem: MSG, url: URL_NOSSA, nav, buscar: buscaDe(1000) });
  assert.deepEqual(r, { feito: true, via: 'cancelado' });
  const r2 = await compartilharComVideo({ video: YT, mensagem: MSG, url: URL_NOSSA, nav });
  assert.deepEqual(r2, { feito: true, via: 'cancelado' });
});

test('🔴 vídeo do YouTube: compartilha TEXTO com o link do vídeo na frente, SEM anexar a foto', async () => {
  const nav = navegador();
  const r = await compartilharComVideo({ video: YT, titulo: 'Smart TV', mensagem: MSG, url: URL_NOSSA, nav });
  assert.deepEqual(r, { feito: true, via: 'link-do-video' });
  const d = nav.chamadas[0];
  assert.equal(d.files, undefined, 'foto anexada tomaria o lugar do vídeo no preview');
  assert.ok(d.text.startsWith('🎥 Veja em vídeo:'));
  assert.ok(d.text.includes('youtube.com/shorts/AbC123xyz_-'));
  assert.ok(!d.text.includes(URL_NOSSA), 'o nosso link vai em `url`, não repetido no texto');
  assert.equal(d.url, URL_NOSSA);
});

test('sem navigator.share (computador): abre o WhatsApp com a mensagem inteira, vídeo na frente', async () => {
  const abertas = [];
  const r = await compartilharComVideo({ video: YT, titulo: 'x', mensagem: MSG, url: URL_NOSSA, nav: {}, abrir: (u) => abertas.push(u) });
  assert.deepEqual(r, { feito: true, via: 'whatsapp' });
  const texto = decodeURIComponent(abertas[0].split('text=')[1]);
  assert.ok(texto.startsWith('🎥 Veja em vídeo:'));
  assert.ok(texto.includes(URL_NOSSA));
});

test('sem vídeo (ou vídeo desconhecido): nada a fazer, o fluxo de sempre segue', async () => {
  assert.deepEqual(await compartilharComVideo({ video: null, mensagem: MSG, url: URL_NOSSA }), { feito: false, via: null });
  assert.deepEqual(await compartilharComVideo({ video: { tipo: 'outro' }, mensagem: MSG, url: URL_NOSSA }), { feito: false, via: null });
});

test('o aviso "preparando" liga e desliga mesmo quando falha', async () => {
  const eventos = [];
  await compartilharArquivoDeVideo({ video: ARQ, titulo: 'x', texto: 't', url: 'u', nav: navegador(), buscar: async () => { throw new Error('x'); }, aoPreparar: (v) => eventos.push(v) });
  assert.deepEqual(eventos, [true, false]);
});
