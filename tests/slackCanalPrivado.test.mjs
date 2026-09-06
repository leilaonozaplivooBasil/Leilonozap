// 05/09/2026, 22h10 — "Deu erro ao subir a imagem — invalid_arguments, provavelmente falta
// o scope files:write no Bot Token." O Zeca disse isso no grupo DIGITAL, o dono foi conferir
// os scopes no painel do Slack, e estavam TODOS certos, files:write inclusive.
//
// O que o log da função mostrava, 268ms antes do erro:
//
//   [Slack] não encontrei o canal "top-tech-leilão-nozap" na listagem — usando o nome como veio.
//   [Slack] erro em files.completeUploadExternal: invalid_arguments
//
// A causa está três chamadas antes do erro que aparece. `conversations.list` ia com corpo
// JSON; a API do Slack só lê JSON nos métodos de ESCRITA. Nos de leitura ela ignora o corpo
// inteiro e responde com os parâmetros PADRÃO — `ok: true`, sem nenhuma reclamação. Ou seja:
// o `types: 'public_channel,private_channel'` estava escrito no código, com comentário
// explicando que era justamente para o canal privado, e nunca chegou ao Slack. A listagem
// voltava só com canal público, o #top-tech-leilão-nozap (privado) não existia para o bot,
// resolveChannelId caía no nome, e files.completeUploadExternal — que só aceita ID — recusava.
//
// Este arquivo tranca a cadeia inteira: o formato da requisição, o casamento do nome com
// acento, a recusa com o motivo certo, e o caminho feliz de ponta a ponta.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SlackClient } from '../supabase/functions/whatsapp-router/slackClient.ts';

// Mesmo fetch falso de tests/slackClient.test.mjs: responde por endpoint e guarda o pedido.
function montarSlack(respostas) {
  const chamadas = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    const metodo = u.includes('/api/') ? u.split('/api/')[1] : u;
    const tipo = init.headers?.['Content-Type'] || '';
    let corpo = init.body;
    if (typeof corpo === 'string' && tipo.includes('json')) {
      try { corpo = JSON.parse(corpo); } catch { /* deixa cru */ }
    } else if (typeof corpo === 'string') {
      corpo = Object.fromEntries(new URLSearchParams(corpo));
    }
    chamadas.push({ metodo, corpo, tipo });
    const r = respostas[metodo];
    if (r === undefined) return { ok: true, status: 200, json: async () => ({ ok: false, error: `sem_stub_para_${metodo}` }) };
    if (typeof r === 'function') return r();
    return { ok: true, status: 200, json: async () => r };
  };
  return { chamadas, restaurar: () => { globalThis.fetch = original; } };
}

const cliente = () => new SlackClient('xoxb-token-de-teste');

// O canal real do time: privado e com acento. É o caso que quebrava.
const CANAL_PRIVADO = { id: 'C0BHCMYJJGJ', name: 'top-tech-leilão-nozap', is_member: true };
const CANAL_PUBLICO = { id: 'C0AUUS64MT8', name: 'logistica-leilão-no-zap-' };

describe('conversations.list — o parâmetro precisa CHEGAR no Slack, não só existir no código', () => {
  test('🔴 o bug: com corpo JSON o Slack descarta o types e devolve só canal público', async () => {
    const s = montarSlack({ 'conversations.list': { ok: true, channels: [CANAL_PRIVADO] } });
    try {
      await cliente().listChannels();
      const pedido = s.chamadas.find((c) => c.metodo === 'conversations.list');
      assert.ok(pedido, 'nem chamou conversations.list');
      assert.ok(
        pedido.tipo.includes('x-www-form-urlencoded'),
        'conversations.list foi em JSON — o Slack ignora o corpo em método de leitura e ' +
        'responde com os parâmetros padrão, sem erro nenhum',
      );
    } finally { s.restaurar(); }
  });

  test('o types com private_channel chega junto — é o que faz o canal privado existir', async () => {
    const s = montarSlack({ 'conversations.list': { ok: true, channels: [CANAL_PRIVADO] } });
    try {
      await cliente().listChannels();
      const pedido = s.chamadas.find((c) => c.metodo === 'conversations.list');
      // O content-type faz parte da asserção: em JSON o parâmetro até sai daqui, mas o
      // Slack o descarta. "Chegar" é chegar no formato que ele lê.
      assert.ok(pedido.tipo.includes('x-www-form-urlencoded'), 'foi em JSON — o types não chega');
      assert.match(String(pedido.corpo.types), /private_channel/);
      assert.match(String(pedido.corpo.types), /public_channel/);
    } finally { s.restaurar(); }
  });

  test('os outros métodos de leitura seguem a mesma regra', async () => {
    const s = montarSlack({
      'conversations.history': { ok: true, messages: [] },
      'conversations.info': { ok: true, channel: CANAL_PRIVADO },
      'users.info': { ok: true, user: { id: 'U1' } },
    });
    try {
      const c = cliente();
      await c.getConversationHistory('C0BHCMYJJGJ', 5);
      await c.getChannelInfo('C0BHCMYJJGJ');
      await c.getUserInfo('U1');
      for (const chamada of s.chamadas) {
        assert.ok(
          chamada.tipo.includes('x-www-form-urlencoded'),
          `${chamada.metodo} foi em JSON — os parâmetros vão ser descartados em silêncio`,
        );
      }
    } finally { s.restaurar(); }
  });

  test('escrita continua em JSON — chat.postMessage não pode virar form', async () => {
    const s = montarSlack({ 'chat.postMessage': { ok: true, ts: '1.1', channel: 'C1' } });
    try {
      await cliente().postMessage('C0BHCMYJJGJ', 'oi');
      const pedido = s.chamadas.find((c) => c.metodo === 'chat.postMessage');
      assert.ok(pedido.tipo.includes('json'), 'a escrita precisa continuar em JSON');
    } finally { s.restaurar(); }
  });
});

describe('findChannel — "leilão" pode chegar em duas codificações diferentes', () => {
  test('acha o canal quando o acento vem decomposto (a + til combinante)', async () => {
    // Mesma palavra na tela, bytes diferentes: NFD tem 22 caracteres, NFC tem 21.
    const decomposto = { ...CANAL_PRIVADO, name: CANAL_PRIVADO.name.normalize('NFD') };
    assert.notEqual(decomposto.name, CANAL_PRIVADO.name, 'as duas formas precisam diferir');

    const s = montarSlack({ 'conversations.list': { ok: true, channels: [decomposto] } });
    try {
      const achado = await cliente().findChannel('top-tech-leilão-nozap');
      assert.equal(achado?.id, 'C0BHCMYJJGJ', 'a comparação crua falha em acento decomposto');
    } finally { s.restaurar(); }
  });

  test('acha também no sentido contrário, e ignorando o # e o caixa', async () => {
    const s = montarSlack({ 'conversations.list': { ok: true, channels: [CANAL_PRIVADO] } });
    try {
      const achado = await cliente().findChannel('#TOP-TECH-LEILÃO-NOZAP'.normalize('NFD'));
      assert.equal(achado?.id, 'C0BHCMYJJGJ');
    } finally { s.restaurar(); }
  });
});

describe('uploadFile — canal que não vira ID para ANTES, com o motivo certo', () => {
  test('🔴 nunca manda nome no channel_id de files.completeUploadExternal', async () => {
    const s = montarSlack({
      'conversations.list': { ok: true, channels: [] }, // canal não aparece: bot fora dele
      'files.getUploadURLExternal': { ok: true, upload_url: 'https://files.slack/up', file_id: 'F123' },
      'files.completeUploadExternal': { ok: true, files: [{ id: 'F123' }] },
    });
    try {
      const r = await cliente().uploadFile('top-tech-leilão-nozap', new Uint8Array([1, 2, 3]), 'capa.jpg');
      assert.equal(r.ok, false);
      assert.equal(
        s.chamadas.filter((c) => c.metodo === 'files.completeUploadExternal').length, 0,
        'mandou o nome como channel_id — é o invalid_arguments de 05/09 de volta',
      );
    } finally { s.restaurar(); }
  });

  test('o erro fala de canal e de /invite, não de files:write', async () => {
    const s = montarSlack({
      'conversations.list': { ok: true, channels: [] },
      'files.getUploadURLExternal': { ok: true, upload_url: 'https://files.slack/up', file_id: 'F123' },
    });
    try {
      const r = await cliente().uploadFile('top-tech-leilão-nozap', new Uint8Array([1]), 'capa.jpg');
      assert.match(r.error, /canal/i);
      assert.match(r.error, /invite|groups:read/i, 'precisa dizer o que fazer');
      assert.doesNotMatch(
        r.error, /files:write/,
        'culpar files:write foi o que fez o dono conferir scope à toa às 22h de 05/09',
      );
    } finally { s.restaurar(); }
  });

  test('caminho feliz: canal privado na listagem vira ID e o upload conclui', async () => {
    const s = montarSlack({
      'conversations.list': { ok: true, channels: [CANAL_PUBLICO, CANAL_PRIVADO] },
      'files.getUploadURLExternal': { ok: true, upload_url: 'https://files.slack/up', file_id: 'F123' },
      'files.completeUploadExternal': { ok: true, files: [{ id: 'F123' }] },
    });
    try {
      const r = await cliente().uploadFile('#top-tech-leilão-nozap', new Uint8Array([1, 2, 3]), 'capa.jpg', {
        initial_comment: 'resumo do tópico',
      });
      assert.equal(r.ok, true, r.error);
      const completa = s.chamadas.find((c) => c.metodo === 'files.completeUploadExternal');
      assert.equal(completa.corpo.channel_id, 'C0BHCMYJJGJ', 'tem que ir o ID, não o nome');
      assert.match(completa.corpo.initial_comment, /resumo do tópico/);
    } finally { s.restaurar(); }
  });

  test('o tamanho do arquivo vai em bytes no getUploadURLExternal', async () => {
    const s = montarSlack({
      'conversations.list': { ok: true, channels: [CANAL_PRIVADO] },
      'files.getUploadURLExternal': { ok: true, upload_url: 'https://files.slack/up', file_id: 'F123' },
      'files.completeUploadExternal': { ok: true, files: [{ id: 'F123' }] },
    });
    try {
      await cliente().uploadFile('C0BHCMYJJGJ', new Uint8Array(4096), 'capa.png');
      const pedido = s.chamadas.find((c) => c.metodo === 'files.getUploadURLExternal');
      assert.equal(Number(pedido.corpo.length), 4096);
      assert.equal(pedido.corpo.filename, 'capa.png');
    } finally { s.restaurar(); }
  });
});

// ---------------------------------------------------------------------------
// documentar_no_slack — a capa falhar não pode levar o texto junto.
//
// Lê o index.ts de verdade e RODA o corpo da ferramenta, mesma técnica de
// tests/zecaSlack.test.mjs. Um teste que só procurasse a string no arquivo passaria
// com o código quebrado.
// ---------------------------------------------------------------------------
const fonte = readFileSync(new URL('../supabase/functions/whatsapp-router/index.ts', import.meta.url), 'utf8');

function executarDocumentar() {
  const i = fonte.indexOf("name: 'documentar_no_slack'");
  assert.notEqual(i, -1, 'a ferramenta documentar_no_slack sumiu do index.ts');
  const j = fonte.indexOf('executar: async (input, ctx) => {', i);
  assert.notEqual(j, -1, 'não achei o executar de documentar_no_slack');

  let chaves = 0, comecou = false, fim = -1;
  for (let k = fonte.indexOf('{', j); k < fonte.length; k++) {
    if (fonte[k] === '{') { chaves++; comecou = true; }
    else if (fonte[k] === '}') { chaves--; if (comecou && chaves === 0) { fim = k + 1; break; } }
  }
  assert.notEqual(fim, -1);

  const corpo = fonte.slice(fonte.indexOf('{', j), fim)
    .replace(/let (\w+):[^=]+=/g, 'let $1 =')       // let imagemUrl: string | null = null
    .replace(/\((\w+) as Error\)/g, '$1');          // (e as Error)?.message
  return corpo;
}

function montarFerramenta({ cliente, imagem, fetchFalso }) {
  const corpo = executarDocumentar();
  // 06/09/2026 — a ferramenta passou a resolver o canal sozinha (MAPA_GRUPO_CANAL) e a
  // procurar a imagem no histórico do grupo. Estes falsos acompanham; o que estes testes
  // guardam continua sendo o que a capa faz quando falha, não a rota.
  const fn = new Function(
    'ehAdmin', 'SLACK_BOT_TOKEN', 'obterClienteSlack', 'carregarHistorico',
    'extrairUltimaImagemDoHistorico', 'chaveDeMemoriaDoGrupo', 'canalDoGrupo',
    'MAPA_GRUPO_CANAL', 'SLACK_CANAL_PADRAO', 'fetch', 'console',
    `return async (input, ctx) => ${corpo};`,
  )(
    () => true,
    'xoxb-token',
    () => cliente,
    async () => [],
    () => imagem,
    (grupoId) => `grupo:${String(grupoId).replace(/\D+/g, '')}`,
    (_grupoId, _mapa, padrao) => ({ canal: padrao, origem: 'padrao' }),
    new Map(),
    'C0BHCMYJJGJ',
    fetchFalso,
    { error: () => {}, warn: () => {}, log: () => {} },
  );
  return fn;
}

const IMAGEM_OK = async () => ({
  ok: true,
  headers: { get: () => 'image/jpeg' },
  arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
});

describe('documentar_no_slack — registro não pode sumir por causa de uma imagem', () => {
  test('🔴 o bug de 05/09: capa falhou e o resumo inteiro foi junto para o lixo', async () => {
    const postadas = [];
    const fn = montarFerramenta({
      imagem: 'https://z-api/imagem.jpg',
      fetchFalso: IMAGEM_OK,
      cliente: {
        uploadFile: async () => ({ ok: false, error: 'invalid_arguments' }),
        postMessage: async (canal, texto) => { postadas.push({ canal, texto }); return { ok: true, data: { ts: '1.1' } }; },
      },
    });
    const r = await fn({ canal: '#digital-leilão-nozap', resumo: 'o que foi decidido' }, { remetente: '55...' });

    assert.equal(postadas.length, 1, 'o texto não foi publicado — a demanda se perdeu');
    assert.match(postadas[0].texto, /o que foi decidido/);
    assert.equal(r.ok, true, 'com o texto publicado, o resultado é sucesso parcial, não falha');
    assert.equal(r.tinha_imagem, false);
  });

  test('o diagnóstico diz o motivo do Slack, sem chutar o scope', async () => {
    const fn = montarFerramenta({
      imagem: 'https://z-api/imagem.jpg',
      fetchFalso: IMAGEM_OK,
      cliente: {
        uploadFile: async () => ({ ok: false, error: 'invalid_arguments' }),
        postMessage: async () => ({ ok: true, data: { ts: '1.1' } }),
      },
    });
    const r = await fn({ canal: 'x', resumo: 'y' }, { remetente: '55...' });
    assert.match(r.diagnostico, /invalid_arguments/);
    assert.doesNotMatch(r.diagnostico, /files:write/, 'voltou a mandar conferir o scope errado');
  });

  test('capa subiu: continua reportando que a imagem foi junto', async () => {
    const fn = montarFerramenta({
      imagem: 'https://z-api/imagem.jpg',
      fetchFalso: IMAGEM_OK,
      cliente: {
        uploadFile: async () => ({ ok: true, data: {} }),
        postMessage: async () => { throw new Error('não devia postar texto avulso'); },
      },
    });
    const r = await fn({ canal: 'x', resumo: 'y' }, { remetente: '55...' });
    assert.equal(r.ok, true);
    assert.equal(r.tinha_imagem, true);
  });

  test('falhou imagem E texto: aí sim volta como falha, com os dois motivos', async () => {
    const fn = montarFerramenta({
      imagem: 'https://z-api/imagem.jpg',
      fetchFalso: IMAGEM_OK,
      cliente: {
        uploadFile: async () => ({ ok: false, error: 'invalid_arguments' }),
        postMessage: async () => ({ ok: false, error: 'channel_not_found' }),
      },
    });
    const r = await fn({ canal: 'x', resumo: 'y' }, { remetente: '55...' });
    assert.equal(r.ok, false);
    assert.match(r.diagnostico, /invalid_arguments/);
    assert.match(r.diagnostico, /channel_not_found/);
  });
});
