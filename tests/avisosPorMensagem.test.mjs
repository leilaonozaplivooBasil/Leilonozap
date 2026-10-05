// 📱 29/09/2026 — avisos por WhatsApp (oficial, Brevo) e SMS: textos, regras e envio
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'https://banco.teste';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'sr-teste';
const T = await import('../api/_lib/textosDasMensagens.js');
const M = await import('../api/_lib/avisosPorMensagem.js');
const { TIPOS_DE_AVISO } = await import('../api/_lib/textosDosAvisos.js');

const TERMINA = '2026-09-29T21:33:00Z'; // 18:33 em Brasília
const TARDE = Date.parse('2026-09-29T18:00:00Z'); // 15h em Brasília
const LEILAO = '69b1c2d3e4f5a6b7c8d9e0f1';

test('só os 5 avisos que o dono escolheu', () => {
  assert.deepEqual(T.TIPOS_POR_MENSAGEM, ['superado', 'ultima_hora', 'arrematou', 'pix_pendente', 'compra_enviada']);
  for (const t of T.TIPOS_POR_MENSAGEM) assert.ok(TIPOS_DE_AVISO.includes(t), t);
  for (const t of ['cadastro', 'deposito', 'compra_confirmada', 'entrou_no_leilao']) {
    assert.equal(T.smsDoAviso(t, {}), null, t);
    assert.equal(T.camposDoWhatsApp(t, {}), null, t);
  }
});

test('SMS: sem acento, 1 mensagem só, link curto; nome longo é cortado, nunca o link', () => {
  const casos = [
    ['superado', { produto: 'Harley 117 - Scooter Elétrico SEM CNH', valorAtual: 577.6, termina: TERMINA, leilaoId: LEILAO }],
    ['superado', { produto: 'Kit Profissional Completo de Ferramentas Elétricas com Furadeira de Impacto e Maleta Extra', valorAtual: 1577.6, termina: TERMINA, leilaoId: LEILAO }],
    ['ultima_hora', { produto: 'Apple iPhone 17 512GB 48MP 5G - Preto', valorAtual: 127, termina: TERMINA, leilaoId: LEILAO, naFrente: true }],
    ['arrematou', { produto: 'Secador de Cabelo Light Ceramic Íon marsala', valor: 24 }],
    ['pix_pendente', { deposito: true, valor: 50, link: 'https://www.mercadopago.com.br/payments/123/ticket?caller_id=1&hash=abc' }],
    ['pix_pendente', { deposito: false, valor: 89.9, pedido: 'LZ42C79347' }],
    ['compra_enviada', { pedido: 'LZ42C79347', rastreio: 'AD966744131BR' }],
  ];
  for (const [tipo, d] of casos) {
    const s = T.smsDoAviso(tipo, d);
    assert.ok(s.length <= 160, `${tipo}: ${s.length}`);
    assert.match(s, /^[\x20-\x7E]+$/, `${tipo} só GSM-7: ${s}`);
    assert.match(s, /^Leilao NoZap: /);
    assert.match(s, /leilaonozap\.net\/\S+$/, `${tipo} termina no link`);
  }
  assert.match(T.smsDoAviso(...casos[0]), /cobriram seu lance em Harley 117 - Scooter Eletrico SEM CNH\. Lance atual R\$ 577,60, encerra 18:33\. leilaonozap\.net\/l\/69b1/);
  assert.match(T.smsDoAviso(...casos[1]), /Ferram[a-z]*\.\.\. Lance atual R\$ 1\.577,60/);
  assert.match(T.smsDoAviso(...casos[4]), /leilaonozap\.net\/Carteira$/, 'no SMS o link longo do Mercado Pago vira a Carteira');
  assert.match(T.smsDoAviso('compra_enviada', { pedido: 'AR1', rastreio: '', arremate: true }), /saiu para entrega\. leilaonozap\.net\/MyWinnings$/);
});

test('WhatsApp: os campos do modelo', () => {
  const c = T.camposDoWhatsApp('superado', { nome: 'ANA souza', produto: 'PS5', valorAtual: 900, termina: TERMINA, leilaoId: LEILAO });
  assert.deepEqual(c, { NOME: 'Ana', PRODUTO: 'PS5', VALOR: 'R$ 900,00', HORA: '18:33', SITUACAO: '', PEDIDO: '', RASTREIO: 'disponível no site', LINK: `https://leilaonozap.net/l/${LEILAO}` });
  assert.equal(T.camposDoWhatsApp('ultima_hora', { naFrente: false }).SITUACAO, 'Seu lance foi coberto.');
  assert.equal(T.camposDoWhatsApp('pix_pendente', { deposito: true, valor: 50, link: 'https://mp/ticket' }).LINK, 'https://mp/ticket', 'no WhatsApp o botão abre o PIX direto');
  assert.equal(T.camposDoWhatsApp('arrematou', {}).NOME, 'cliente');
  assert.equal(T.camposDoWhatsApp('compra_enviada', { pedido: 'LZ1', rastreio: 'AD1BR' }).RASTREIO, 'AD1BR');
});

test('celular, silêncio e repetição', () => {
  assert.equal(T.celularParaMensagem('(21) 99876-5432'), '5521998765432');
  assert.equal(T.celularParaMensagem('+55 21 99876-5432'), '5521998765432');
  assert.equal(T.celularParaMensagem('2133334444'), null, 'fixo não recebe');
  assert.equal(T.celularParaMensagem(''), null);
  assert.equal(T.horarioDeSilencio(Date.parse('2026-09-29T01:30:00Z')), true, '22h30 em Brasília');
  assert.equal(T.horarioDeSilencio(Date.parse('2026-09-29T10:59:00Z')), true, '7h59');
  assert.equal(T.horarioDeSilencio(Date.parse('2026-09-29T11:00:00Z')), false, '8h');
  assert.equal(T.horarioDeSilencio(Date.parse('2026-09-30T00:59:00Z')), false, '21h59');
  const agora = Date.parse('2026-09-29T18:00:00Z');
  assert.equal(T.mensagemPodeRepetir('superado', null, agora), true);
  assert.equal(T.mensagemPodeRepetir('superado', '2026-09-29T17:40:00Z', agora), false, '20 min: não');
  assert.equal(T.mensagemPodeRepetir('superado', '2026-09-29T17:30:00Z', agora), true, '30 min: sim');
  assert.equal(T.mensagemPodeRepetir('arrematou', '2026-09-01T00:00:00Z', agora), false);
});

test('config: sem as variáveis da Brevo, nada sai', () => {
  const nada = M.configDasMensagens({ BREVO_API_KEY: 'k' });
  assert.equal(M.canalDoAviso('superado', nada), null);
  const soSms = M.configDasMensagens({ BREVO_API_KEY: 'k', BREVO_SMS_REMETENTE: 'NOZAP' });
  assert.equal(M.canalDoAviso('superado', soSms), 'sms');
  const wa = M.configDasMensagens({ BREVO_API_KEY: 'k', BREVO_WHATSAPP_REMETENTE: '+55 21 90000-0000', BREVO_WHATSAPP_MODELOS: '{"superado": 11, "arrematou": 22}', BREVO_SMS_REMETENTE: 'NOZAP' });
  assert.equal(wa.whatsapp.remetente, '5521900000000');
  assert.equal(M.canalDoAviso('superado', wa), 'whatsapp');
  assert.equal(M.canalDoAviso('pix_pendente', wa), 'sms', 'modelo ainda não aprovado → SMS');
  assert.equal(M.canalDoAviso('deposito', wa), null);
  assert.equal(M.canalDoAviso('superado', M.configDasMensagens({ BREVO_WHATSAPP_MODELOS: 'lixo' })), null);
});

// ── envio, com a rede falsa ────────────────────────────────────────────────
const ENV = { BREVO_API_KEY: 'k', BREVO_WHATSAPP_REMETENTE: '5521900000000', BREVO_WHATSAPP_MODELOS: '{"superado": 11}', BREVO_SMS_REMETENTE: 'NOZAP' };
function redeFalsa({ pessoa = { id: 'u1', full_name: 'Ana Souza', phone: '(21) 99876-5432', active: true }, whatsappOk = true, jaTem = null } = {}) {
  const chamadas = [];
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url); const corpo = opts.body ? JSON.parse(opts.body) : null;
    chamadas.push({ u, metodo: opts.method || 'GET', corpo });
    if (u.includes('/app_users?')) return new Response(JSON.stringify(pessoa ? [pessoa] : []));
    if (u.endsWith('/mensagens_enviadas') && opts.method === 'POST') return new Response(null, { status: jaTem ? 409 : 201 });
    if (u.includes('/mensagens_enviadas?select=')) return new Response(JSON.stringify(jaTem ? [{ enviado_em: jaTem }] : []));
    if (u.includes('/mensagens_enviadas?') && opts.method === 'PATCH') return new Response(JSON.stringify([{ id: 1 }]));
    if (u.includes('/whatsapp/sendMessage')) return new Response(JSON.stringify(whatsappOk ? { messageId: 'wa-1' } : { code: 'bad' }), { status: whatsappOk ? 201 : 400 });
    if (u.includes('/transactionalSMS/sms')) return new Response(JSON.stringify({ messageId: 77 }), { status: 201 });
    return new Response('{}');
  };
  return chamadas;
}
const DADOS = { produto: 'PS5', valorAtual: 900, termina: TERMINA, leilaoId: LEILAO };

test('envio: WhatsApp com o modelo e os campos; registra o canal', async () => {
  const ch = redeFalsa();
  const r = await M.enviarMensagemDoAviso({ tipo: 'superado', userId: 'u1', chave: LEILAO, dados: DADOS }, { agora: TARDE, env: ENV });
  assert.deepEqual(r, { enviado: true, canal: 'whatsapp', motivo: 'ok' });
  const wa = ch.find((c) => c.u.includes('/whatsapp/sendMessage'));
  assert.deepEqual(wa.corpo.contactNumbers, ['5521998765432']);
  assert.equal(wa.corpo.templateId, 11);
  assert.equal(wa.corpo.params.NOME, 'Ana');
  assert.ok(!ch.some((c) => c.u.includes('transactionalSMS')), 'WhatsApp deu certo: sem SMS');
  const reg = ch.filter((c) => c.metodo === 'PATCH').pop();
  assert.deepEqual({ canal: reg.corpo.canal, status: reg.corpo.status, id: reg.corpo.message_id }, { canal: 'whatsapp', status: 'enviado', id: 'wa-1' });
});

test('envio: WhatsApp recusado cai pro SMS; tipo sem modelo vai direto pro SMS', async () => {
  let ch = redeFalsa({ whatsappOk: false });
  let r = await M.enviarMensagemDoAviso({ tipo: 'superado', userId: 'u1', chave: LEILAO, dados: DADOS }, { agora: TARDE, env: ENV });
  assert.deepEqual(r, { enviado: true, canal: 'sms', motivo: 'ok' });
  const sms = ch.find((c) => c.u.includes('/transactionalSMS/sms'));
  assert.deepEqual({ sender: sms.corpo.sender, recipient: sms.corpo.recipient, type: sms.corpo.type }, { sender: 'NOZAP', recipient: '5521998765432', type: 'transactional' });
  assert.ok(sms.corpo.content.length <= 160);
  ch = redeFalsa();
  r = await M.enviarMensagemDoAviso({ tipo: 'arrematou', userId: 'u1', chave: LEILAO, dados: { produto: 'PS5', valor: 900 } }, { agora: TARDE, env: ENV });
  assert.equal(r.canal, 'sms');
  assert.ok(!ch.some((c) => c.u.includes('whatsapp')));
});

test('não envia: desligado, madrugada, sem celular, desligou avisos, já enviado, fora da lista', async () => {
  let ch = redeFalsa();
  assert.equal((await M.enviarMensagemDoAviso({ tipo: 'superado', userId: 'u1', chave: 'a', dados: DADOS }, { agora: TARDE, env: { BREVO_API_KEY: 'k' } })).motivo, 'desligado');
  assert.equal(ch.length, 0, 'desligado nem consulta o banco');
  assert.equal((await M.enviarMensagemDoAviso({ tipo: 'superado', userId: 'u1', chave: 'a', dados: DADOS }, { agora: Date.parse('2026-09-29T03:00:00Z'), env: ENV })).motivo, 'silencio_22h_8h');
  redeFalsa({ pessoa: { id: 'u1', phone: '', active: true } });
  assert.equal((await M.enviarMensagemDoAviso({ tipo: 'superado', userId: 'u1', chave: 'a', dados: DADOS }, { agora: TARDE, env: ENV })).motivo, 'sem_celular');
  redeFalsa({ pessoa: { id: 'u1', phone: '21998765432', active: true, avisos_leilao: false } });
  assert.equal((await M.enviarMensagemDoAviso({ tipo: 'superado', userId: 'u1', chave: 'a', dados: DADOS }, { agora: TARDE, env: ENV })).motivo, 'desligou_avisos');
  ch = redeFalsa({ jaTem: new Date(TARDE - 10 * 60000).toISOString() });
  assert.equal((await M.enviarMensagemDoAviso({ tipo: 'superado', userId: 'u1', chave: 'a', dados: DADOS }, { agora: TARDE, env: ENV })).motivo, 'ja_enviado');
  assert.ok(!ch.some((c) => c.u.includes('api.brevo.com')), 'cobriram há 10 min: não repete');
  assert.equal((await M.enviarMensagemDoAviso({ tipo: 'deposito', userId: 'u1', chave: 'a', dados: {} }, { agora: TARDE, env: ENV })).motivo, 'fora_da_lista');
});
