// slackClient.ts — 479 linhas que até 01/09/2026 não tinham UM teste sequer.
//
// Os testes de Slack que existiam (zecaSlack.test.mjs) usam um cliente falso
// (`postMessage: async () => ({ok:true})`), então nunca tocavam este arquivo.
// Foi por isso que ninguém viu: `request()` devolvia o JSON cru do Slack tipado
// como `{ok, error, data}`, mas o Slack põe os campos NO TOPO — `ts`, `channels`,
// `upload_url`. Nunca existe uma chave `data`. Resultado: `.data` era sempre
// `undefined`, com `ok: true` — falha silenciosa mesmo com token perfeito.
//
// A régua destes testes: as respostas abaixo são as FORMAS REAIS documentadas da
// API do Slack. Se o embrulho voltar a ficar errado, eles quebram.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SlackClient, criarClienteSlack } from '../supabase/functions/whatsapp-router/slackClient.ts';

// Um fetch falso que responde por endpoint, e guarda o que foi pedido.
function montarSlack(respostas) {
  const chamadas = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    const metodo = u.split('/api/')[1] || u;
    let corpo = init.body;
    if (typeof corpo === 'string' && init.headers?.['Content-Type']?.includes('json')) {
      try { corpo = JSON.parse(corpo); } catch { /* deixa cru */ }
    } else if (typeof corpo === 'string') {
      corpo = Object.fromEntries(new URLSearchParams(corpo));
    }
    chamadas.push({ metodo, corpo, headers: init.headers });
    const r = respostas[metodo];
    if (r === undefined) return { ok: true, status: 200, json: async () => ({ ok: false, error: `sem_stub_para_${metodo}` }) };
    if (typeof r === 'function') return r();
    return { ok: true, status: 200, json: async () => r };
  };
  return { chamadas, restaurar: () => { globalThis.fetch = original; } };
}

const cliente = () => new SlackClient('xoxb-token-de-teste');

describe('postMessage — o ts tem que voltar (sem ele não dá pra editar nem deletar)', () => {
  test('🔴 o bug: resposta real do Slack devolve ts no topo, e ele chega em data.ts', async () => {
    // Forma real de chat.postMessage
    const s = montarSlack({
      'chat.postMessage': { ok: true, channel: 'C0BHCMYJJGJ', ts: '1503435956.000247', message: { text: 'oi' } },
    });
    try {
      const r = await cliente().postMessage('C0BHCMYJJGJ', 'oi');
      assert.equal(r.ok, true);
      assert.equal(r.data?.ts, '1503435956.000247', 'o ts sumiu — postar/editar/deletar volta a quebrar');
      assert.equal(r.data?.channel, 'C0BHCMYJJGJ');
    } finally { s.restaurar(); }
  });

  test('erro do Slack vira ok:false com o motivo, não passa como sucesso', async () => {
    const s = montarSlack({ 'chat.postMessage': { ok: false, error: 'channel_not_found' } });
    try {
      const r = await cliente().postMessage('#nao-existe', 'oi');
      assert.equal(r.ok, false);
      assert.equal(r.error, 'channel_not_found');
    } finally { s.restaurar(); }
  });

  test('resposta sem "ok" nenhum não é tratada como sucesso', async () => {
    const s = montarSlack({ 'chat.postMessage': () => ({ ok: false, status: 502, json: async () => ({}) }) });
    try {
      const r = await cliente().postMessage('C1', 'oi');
      assert.equal(r.ok, false);
      assert.equal(r.error, 'http_502');
    } finally { s.restaurar(); }
  });

  test('corpo que não é JSON não derruba a function', async () => {
    const s = montarSlack({ 'chat.postMessage': () => ({ ok: true, status: 200, json: async () => { throw new Error('não é json'); } }) });
    try {
      const r = await cliente().postMessage('C1', 'oi');
      assert.equal(r.ok, false);
      assert.match(r.error, /json/i);
    } finally { s.restaurar(); }
  });

  test('manda o Bearer certo e o canal no corpo', async () => {
    const s = montarSlack({ 'chat.postMessage': { ok: true, ts: '1.1' } });
    try {
      await cliente().postMessage('C0BHCMYJJGJ', 'texto');
      assert.equal(s.chamadas[0].headers.Authorization, 'Bearer xoxb-token-de-teste');
      assert.equal(s.chamadas[0].corpo.channel, 'C0BHCMYJJGJ');
      assert.equal(s.chamadas[0].corpo.text, 'texto');
    } finally { s.restaurar(); }
  });
});

describe('findChannel / resolveChannelId — enxergar canal PRIVADO', () => {
  const listaReal = {
    ok: true,
    channels: [
      { id: 'C0AUTG7JS3F', name: 'gestão-diária-leilão-nozap' },
      { id: 'C0BHCMYJJGJ', name: 'top-tech-leilão-nozap' },
    ],
    response_metadata: { next_cursor: '' },
  };

  test('🔴 o bug: acha o canal pelo nome (antes data.channels era undefined)', async () => {
    const s = montarSlack({ 'conversations.list': listaReal });
    try {
      const ch = await cliente().findChannel('top-tech-leilão-nozap');
      assert.equal(ch?.id, 'C0BHCMYJJGJ');
    } finally { s.restaurar(); }
  });

  test('pede canal privado explicitamente — o canal do time é privado', async () => {
    const s = montarSlack({ 'conversations.list': listaReal });
    try {
      await cliente().findChannel('qualquer');
      assert.match(String(s.chamadas[0].corpo.types), /private_channel/,
        'sem types=private_channel o Slack devolve só os públicos e o canal do time some');
    } finally { s.restaurar(); }
  });

  test('aceita com e sem "#", e ignora maiúscula', async () => {
    const s = montarSlack({ 'conversations.list': listaReal });
    try {
      assert.equal((await cliente().findChannel('#TOP-TECH-LEILÃO-NOZAP'))?.id, 'C0BHCMYJJGJ');
    } finally { s.restaurar(); }
  });

  test('canal que não existe devolve null, não explode', async () => {
    const s = montarSlack({ 'conversations.list': listaReal });
    try {
      assert.equal(await cliente().findChannel('top-tech-digital'), null);
    } finally { s.restaurar(); }
  });

  test('ID já pronto não gasta chamada de listagem', async () => {
    const s = montarSlack({});
    try {
      assert.equal(await cliente().resolveChannelId('C0BHCMYJJGJ'), 'C0BHCMYJJGJ');
      assert.equal(s.chamadas.length, 0);
    } finally { s.restaurar(); }
  });

  test('nome vira ID', async () => {
    const s = montarSlack({ 'conversations.list': listaReal });
    try {
      assert.equal(await cliente().resolveChannelId('#top-tech-leilão-nozap'), 'C0BHCMYJJGJ');
    } finally { s.restaurar(); }
  });
});

describe('uploadFile — a imagem de capa do documentar_no_slack', () => {
  const bytes = new Uint8Array([1, 2, 3, 4]);

  test('🔴 o bug: o fluxo de 3 passos completa (antes parava no passo 1, sempre)', async () => {
    const s = montarSlack({
      // Forma real de files.getUploadURLExternal: campos no topo, sem "data"
      'files.getUploadURLExternal': { ok: true, upload_url: 'https://files.slack.com/upload/x', file_id: 'F123' },
      'files.completeUploadExternal': { ok: true, files: [{ id: 'F123', title: 'capa' }] },
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, init) => {
      if (String(url).startsWith('https://files.slack.com/upload/')) return { ok: true, status: 200, json: async () => ({}) };
      return originalFetch(url, init);
    };
    try {
      const r = await cliente().uploadFile('C0BHCMYJJGJ', bytes, 'capa.jpg', { initial_comment: 'resumo' });
      assert.equal(r.ok, true, `upload falhou: ${r.error}`);
      const finalizou = s.chamadas.find((c) => c.metodo === 'files.completeUploadExternal');
      assert.ok(finalizou, 'nunca chegou a finalizar o upload');
      assert.equal(finalizou.corpo.channel_id, 'C0BHCMYJJGJ');
      assert.equal(finalizou.corpo.initial_comment, 'resumo');
    } finally { s.restaurar(); }
  });

  test('se o Slack recusa a URL, o erro sai com o motivo REAL — não um genérico', async () => {
    const s = montarSlack({ 'files.getUploadURLExternal': { ok: false, error: 'missing_scope' } });
    try {
      const r = await cliente().uploadFile('C1', bytes, 'capa.jpg');
      assert.equal(r.ok, false);
      assert.equal(r.error, 'missing_scope', 'o diagnóstico precisa dizer o motivo do Slack');
    } finally { s.restaurar(); }
  });

  test('manda o tamanho do arquivo, que o Slack exige', async () => {
    const s = montarSlack({ 'files.getUploadURLExternal': { ok: false, error: 'x' } });
    try {
      await cliente().uploadFile('C1', bytes, 'capa.jpg');
      assert.equal(Number(s.chamadas[0].corpo.length), 4);
      assert.equal(s.chamadas[0].corpo.filename, 'capa.jpg');
      assert.match(s.chamadas[0].headers['Content-Type'], /form-urlencoded/);
    } finally { s.restaurar(); }
  });
});

describe('sendDirectMessage — conversations.open devolve channel como OBJETO', () => {
  test('🔴 o bug: usa channel.id, não o objeto inteiro', async () => {
    const s = montarSlack({
      'conversations.open': { ok: true, channel: { id: 'D04BCDE1234' } }, // forma real
      'chat.postMessage': { ok: true, ts: '1.1' },
    });
    try {
      const r = await cliente().sendDirectMessage('U123', 'oi');
      assert.equal(r.ok, true);
      const post = s.chamadas.find((c) => c.metodo === 'chat.postMessage');
      assert.equal(post.corpo.channel, 'D04BCDE1234', 'mandou o objeto no lugar do id');
    } finally { s.restaurar(); }
  });

  test('quando o Slack recusa abrir a DM, devolve o motivo dele', async () => {
    const s = montarSlack({ 'conversations.open': { ok: false, error: 'user_not_found' } });
    try {
      const r = await cliente().sendDirectMessage('U404', 'oi');
      assert.equal(r.ok, false);
      assert.equal(r.error, 'user_not_found');
    } finally { s.restaurar(); }
  });
});

describe('criarClienteSlack', () => {
  // Roda em Deno lá na Edge Function; aqui o Deno.env é encenado só para
  // exercitar o caminho "não tem token em lugar nenhum".
  const comDenoSemToken = (fn) => {
    const antes = globalThis.Deno;
    globalThis.Deno = { env: { get: () => undefined } };
    try { fn(); } finally { globalThis.Deno = antes; }
  };

  test('sem token em lugar nenhum: devolve null e não estoura', () => {
    comDenoSemToken(() => assert.equal(criarClienteSlack(''), null));
  });

  test('token passado por parâmetro nem consulta o ambiente', () => {
    assert.ok(criarClienteSlack('xoxb-x') instanceof SlackClient);
  });

  test('token do ambiente também serve', () => {
    const antes = globalThis.Deno;
    globalThis.Deno = { env: { get: (k) => (k === 'SLACK_BOT_TOKEN' ? 'xoxb-do-ambiente' : undefined) } };
    try { assert.ok(criarClienteSlack() instanceof SlackClient); } finally { globalThis.Deno = antes; }
  });
});
