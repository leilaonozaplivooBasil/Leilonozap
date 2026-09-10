// 🔐 O FRAME DO RITUAL NÃO VIRA LINK PÚBLICO (09/09/2026).
//
// ═══════════════════════════════════════════════════════════════════════════
// O CASO
// ═══════════════════════════════════════════════════════════════════════════
// Pra julgar se o ritual é em casa (DIR-125), a tela captura UM frame do vídeo
// ao vivo e mandava esse frame pro `public-assets` — bucket `public = true` —
// só pra ter uma URL que a IA de visão conseguisse buscar.
//
// 🔴 É o rosto de uma pessoa, DENTRO DA CASA DELA, às 5h da manhã, em link
// aberto, sem login e sem validade. Conferido no Storage em 09/09: 5 frames já
// lá, crescendo um por amanhecer. O #264 fechou o VÍDEO e passou reto no frame.
//
// A saída não foi o cofre privado: o frame não é comprovação — não entra na
// `comprovacao`, nenhuma tela abre ele de novo, e a faxina de 30 dias não teria
// como achá-lo (ela acha pelo caminho gravado na comprovação). Guardar seria
// criar um órfão eterno. Ele vai inline e morre com a chamada.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { frameEmBase64, ehImagemAceita, TETO_FRAME_BYTES } from '../src/lib/frameEmBase64.js';
import { fonteDaImagem } from '../api/functions/xgameValidarPrint.js';
import { semComentarios } from './_ajuda.mjs';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const CRM = semComentarios(ler('../src/components/licensing/CentralVendas/CrmMetodo.jsx'));
const ROTA = semComentarios(ler('../api/functions/xgameValidarPrint.js'));

const jpegDe = (bytes) => new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' });

test('🔐 o frame vira data URL, sem passar por lugar nenhum', async () => {
  const b64 = await frameEmBase64(jpegDe([255, 216, 255, 224, 0, 16]));
  assert.match(b64, /^data:image\/jpeg;base64,/);
  // e volta byte a byte igual — não é só "gerou alguma coisa"
  const dados = b64.split(',')[1];
  assert.deepEqual([...Buffer.from(dados, 'base64')], [255, 216, 255, 224, 0, 16]);
});

test('⚠️ frame grande demais é recusado — não vai pela metade', async () => {
  // Corpo cortado no meio pela Vercel viraria imagem quebrada chegando na IA.
  // Sem frame o ritual segue (só sem julgamento de ambiente); com meio frame,
  // a IA julgaria lixo.
  const grande = { type: 'image/jpeg', size: TETO_FRAME_BYTES + 1, arrayBuffer: async () => new ArrayBuffer(8) };
  assert.equal(await frameEmBase64(grande), null);
});

test('⚠️ o que não é imagem não passa', async () => {
  assert.equal(ehImagemAceita('application/pdf'), false);
  assert.equal(ehImagemAceita('image/jpeg'), true);
  assert.equal(await frameEmBase64(new Blob([new Uint8Array([1, 2])], { type: 'text/html' })), null);
});

test('⚠️ nunca lança — o ritual não cai porque o frame falhou', async () => {
  assert.equal(await frameEmBase64(null), null);
  assert.equal(await frameEmBase64({ type: 'image/jpeg', size: 10, arrayBuffer: async () => { throw new Error('boom'); } }), null);
  assert.equal(await frameEmBase64(new Blob([], { type: 'image/jpeg' })), null);
});

test('⚠️ frame grande é convertido em pedaços — spread estoura a pilha', async () => {
  // `String.fromCharCode(...bytes)` com megabytes espalha centenas de milhares
  // de argumentos e morre com "Maximum call stack size exceeded" — e morre no
  // aparelho MELHOR, com câmera maior, que é o pior lugar pra descobrir.
  const bytes = new Uint8Array(700 * 1024).fill(65);
  const b64 = await frameEmBase64({ type: 'image/jpeg', size: bytes.length, arrayBuffer: async () => bytes.buffer });
  assert.ok(b64.startsWith('data:image/jpeg;base64,'));
  assert.equal(Buffer.from(b64.split(',')[1], 'base64').length, bytes.length);
});

test('🔴 a tela do ritual não sobe mais o frame em lugar nenhum', () => {
  // 10/09 — o julgamento saiu do fim do ritual e virou por bloco
  // (julgarBlocoComIA), assíncrono. O frame continua sem virar arquivo.
  const ini = CRM.indexOf('const julgarBlocoComIA');
  assert.ok(ini > 0, 'premissa: o julgamento por bloco existe');
  const bloco = CRM.slice(ini, CRM.indexOf('const concluirRitual', ini));
  assert.ok(bloco.length > 400, 'premissa: o recorte pegou a função inteira');
  assert.doesNotMatch(bloco, /UploadFile/, 'o frame voltou a subir pra bucket — é o rosto da pessoa em link aberto');
  assert.match(bloco, /const b64 = await frameEmBase64\(dados\.frameBlob\)/, 'o frame parou de ir inline pra IA');
  assert.match(bloco, /image_b64: b64/);
  // 🔴 `image_url` existe nesta função — mas SÓ pro print do bom dia, que é
  // uma imagem de story e já subiu de propósito. O frame do rosto, nunca.
  const doFrame = bloco.slice(bloco.indexOf("bloco === 'visualizacao' && dados.frameBlob"));
  assert.ok(doFrame.length > 60, 'premissa: o ramo do frame existe');
  assert.doesNotMatch(doFrame, /image_url/, 'o frame voltou a ser julgado por URL, o que exige publicá-lo antes');
});

test('🔴 e o vídeo CONTINUA indo pro cofre — o frame é que é descartável', () => {
  // O vídeo É a comprovação: o gestor precisa poder ver e a tela promete que
  // fica guardado. Se este teste cair junto com o de cima, alguém trocou a
  // regra dos dois de uma vez.
  assert.match(CRM, /guardarVideo\(\{/, 'o vídeo saiu do cofre privado');
  assert.doesNotMatch(CRM, /video_url:/, 'voltou o link público do vídeo na comprovação');
});

test('🔴 a rota aceita inline E link — e o inline tem PRECEDÊNCIA', () => {
  // ⚠️ ESTE TESTE JÁ MENTIU UMA VEZ. A primeira versão comparava a posição de
  // `type: 'base64'` com a de `type: 'url'` no texto do arquivo — e passava
  // verde com a precedência invertida. Motivo: `semComentarios` enxerga o `//`
  // de dentro da regex `/^https?:\/\//` como início de comentário e apaga o
  // resto da linha, então o `type: 'url'` do `fonteDaImagem` sumia do texto e a
  // comparação caía numa ocorrência 4 mil caracteres depois. Sempre verdadeira.
  // Por isso agora o teste CHAMA a função em vez de ler o arquivo.
  assert.deepEqual(
    fonteDaImagem({ url: 'https://exemplo.com/a.jpg' }),
    { type: 'url', url: 'https://exemplo.com/a.jpg' },
  );
  assert.deepEqual(
    fonteDaImagem({ b64: 'data:image/jpeg;base64,QUJD' }),
    { type: 'base64', media_type: 'image/jpeg', data: 'QUJD' },
  );
  // 🔴 os DOIS juntos: quem manda inline está dizendo "não publique esta
  // imagem". Se a URL ganhasse, publicaria justamente o que se quis evitar.
  assert.deepEqual(
    fonteDaImagem({ url: 'https://exemplo.com/a.jpg', b64: 'data:image/jpeg;base64,QUJD' }),
    { type: 'base64', media_type: 'image/jpeg', data: 'QUJD' },
    'a URL passou na frente do base64 — publicaria a imagem que pediram pra não publicar',
  );
});

test('⚠️ a rota recusa o que não é imagem, e recusa chamada sem imagem nenhuma', () => {
  assert.equal(fonteDaImagem({ b64: 'data:application/pdf;base64,QUJD' }), null, 'aceitou base64 que não é imagem');
  assert.equal(fonteDaImagem({ url: 'ftp://x/a.jpg' }), null, 'aceitou URL que não é http(s)');
  assert.equal(fonteDaImagem({}), null, 'aceitou chamada sem imagem nenhuma');
  // base64 sem cabeçalho `data:` é tratado como JPEG cru — é o que o cliente
  // manda quando o navegador não põe o prefixo.
  assert.deepEqual(fonteDaImagem({ b64: 'QUJD' }), { type: 'base64', media_type: 'image/jpeg', data: 'QUJD' });
});

test('⚠️ base64 acima do teto é recusado na rota também', () => {
  // A trava do cliente não basta: a rota é pública e recebe o que mandarem.
  assert.equal(fonteDaImagem({ b64: `data:image/jpeg;base64,${'A'.repeat(5 * 1024 * 1024 + 1)}` }), null);
});

test('🔴 e a rota realmente USA o que fonteDaImagem devolveu', () => {
  assert.match(ROTA, /source: imagemDeHoje/, 'a rota voltou a montar a imagem só por URL');
  assert.match(ROTA, /image_url \(http\/https\) ou image_b64 obrigatório/, 'a rota deixou de recusar chamada sem imagem');
});

test('⚠️ as imagens ANTERIORES continuam por URL, de propósito', () => {
  // São comprovações já publicadas, e quatro fotos inline estourariam o corpo.
  assert.match(ROTA, /imagensAnteriores\.map\(\(u\) => \(\{ type: 'image', source: \{ type: 'url', url: u \} \}\)\)/);
});
