// 27/08/2026 — "Zeca parou de responder no grupo 'Inativo TOP TECH DIGITAL'. Alem disso,
// nao esta 'ouvindo' os audios."
//
// A investigacao achou quatro coisas, e nenhuma delas era o Zeca:
//
//  1. No grupo quem responde e a Heloim, nao o Zeca (grupo autorizado = sempre Heloim, desde
//     o #96 — antes disso mensagem de grupo era descartada inteira). Mas o time chama esse
//     numero de "Zeca", e o gate de "fui chamada?" so reconhecia a palavra "heloim". Chamar
//     de Zeca nao acordava ninguem, sem log nenhum.
//  2. @marcar o bot NUNCA funcionou: o codigo lia mentionedPhones/mentioned/mentions, campos
//     que nao existem no webhook do Z-API. Dava false em 100% das mensagens.
//  3. Responder (reply) uma mensagem do bot tambem NUNCA funcionou: lia referencedMessage/
//     quotedMsg/quotedMessage. O Z-API manda `referenceMessageId`.
//  4. Audio ia pro Whisper sempre como "audio.ogg" com o Content-Type que o CDN devolvesse —
//     receita de "Invalid file format". E sem OPENAI_API_KEY a funcao saia calada, sem log.
//
// Este arquivo tranca os quatro. Ele le o index.ts de verdade e RODA as funcoes puras que
// extrai dele — nao copia a regra pra ca (copia de regra e como o vigia das reservas orfas
// quase saiu errado).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const fonte = readFileSync(new URL('../supabase/functions/whatsapp-router/index.ts', import.meta.url), 'utf8');

// ---------------------------------------------------------------------------
// Extrai um trecho do index.ts pelo nome e tira as anotacoes de tipo do TypeScript,
// pra dar pra rodar no node. So serve pras funcoes PURAS listadas abaixo.
// ---------------------------------------------------------------------------
function trecho(cabecalho, fonte = fonteSemTipos) {
  const inicio = fonte.indexOf(cabecalho);
  assert.notEqual(inicio, -1, `sumiu do index.ts: ${cabecalho}`);
  let i = fonte.indexOf('{', inicio);
  let nivel = 0;
  for (let j = i; j < fonte.length; j++) {
    if (fonte[j] === '{') nivel++;
    else if (fonte[j] === '}') {
      nivel--;
      if (nivel === 0) return fonte.slice(inicio, j + 1);
    }
  }
  throw new Error(`chaves nao fecharam em ${cabecalho}`);
}

function semTipos(codigo) {
  return codigo
    .replace(/: Record<string, string>/g, '')
    .replace(/: \{ mime: string; ext: string \}/g, '')
    .replace(/: string \| null \| undefined/g, '')
    .replace(/: string \| null/g, '')
    .replace(/: string/g, '')
    .replace(/: boolean/g, '')
    .replace(/: number/g, '');
}

// A contagem de chaves tem que rodar DEPOIS de tirar os tipos: um retorno anotado como
// `: { mime: string; ext: string }` tem chave dentro, e o contador fechava a funcao ali.
const fonteSemTipos = semTipos(fonte);

const partes = [
  'function apenasDigitos(',
  'function ultimosDigitos(',
  'function marcaONumeroNoTexto(',
  'function idDeGrupo(',
  'function normalizar(',
  'function chamouOBotPeloNome(',
  'const EXTENSAO_POR_MIME',
  'function formatoDoAudio(',
].map((c) => (c.startsWith('const')
  ? fonteSemTipos.slice(fonteSemTipos.indexOf(c), fonteSemTipos.indexOf('};', fonteSemTipos.indexOf(c)) + 2)
  : trecho(c)));

// NOMES_QUE_CHAMAM_O_BOT e uma linha so — pega inteira.
const linhaNomes = fonte.split('\n').find((l) => l.startsWith('const NOMES_QUE_CHAMAM_O_BOT'));
assert.ok(linhaNomes, 'sumiu NOMES_QUE_CHAMAM_O_BOT do index.ts');

const codigo = [linhaNomes, ...partes].join('\n\n');
const rodar = new Function(`${codigo}\nreturn { apenasDigitos, ultimosDigitos, marcaONumeroNoTexto, idDeGrupo, normalizar, chamouOBotPeloNome, formatoDoAudio };`);
const fn = rodar();

// ---------------------------------------------------------------------------
// 1. O nome que o time usa acorda o bot
// ---------------------------------------------------------------------------
test('chamar de "Zeca" no grupo acorda o bot — era isso que estava mudo', () => {
  assert.equal(fn.chamouOBotPeloNome('Zeca, quantas vendas hoje?'), true);
  assert.equal(fn.chamouOBotPeloNome('zeca me ve o estoque'), true);
  assert.equal(fn.chamouOBotPeloNome('ZECA!'), true);
});

test('o nome antigo continua valendo — ninguem perde jeito de chamar', () => {
  assert.equal(fn.chamouOBotPeloNome('Heloim, quantas vendas hoje?'), true);
  assert.equal(fn.chamouOBotPeloNome('heloim'), true);
  assert.equal(fn.chamouOBotPeloNome('Helóim, bom dia'), true, 'acento tem que ser ignorado');
});

test('conversa alheia continua passando sem ele — nao virou tagarela', () => {
  assert.equal(fn.chamouOBotPeloNome('bom dia pessoal'), false);
  assert.equal(fn.chamouOBotPeloNome('o pedido do cliente atrasou'), false);
  // Palavra COLADA nao vale: senao "zecado", "buzeca", "heloimportante" acordavam ele.
  assert.equal(fn.chamouOBotPeloNome('mandei pro zecarias'), false);
  assert.equal(fn.chamouOBotPeloNome('azeca'), false);
});

// ---------------------------------------------------------------------------
// 2. @marcacao — esta no TEXTO, o Z-API nao tem campo de mencao
// ---------------------------------------------------------------------------
test('@marcar o numero do bot no texto conta como chamado', () => {
  const bot = '5521984072064';
  assert.equal(fn.marcaONumeroNoTexto('@5521984072064 da uma olhada', bot), true);
  assert.equal(fn.marcaONumeroNoTexto('bom dia @5521984072064', bot), true);
  assert.equal(fn.marcaONumeroNoTexto('@21984072064 e ai', bot), true, 'sem DDI tem que valer');
});

test('@marcar OUTRA pessoa nao acorda o bot', () => {
  const bot = '5521984072064';
  assert.equal(fn.marcaONumeroNoTexto('@5511999998888 resolve ai', bot), false);
  assert.equal(fn.marcaONumeroNoTexto('sem marcacao nenhuma aqui', bot), false);
  assert.equal(fn.marcaONumeroNoTexto('@5521984072064 alguem', ''), false, 'sem numero do bot, nunca true');
});

test('os campos de mencao que nao existem sairam do codigo', () => {
  // Ler campo inexistente e pior que nao ler: parece que funciona.
  const codigoSemComentario = fonte.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  for (const inventado of ['mentionedPhones', 'body?.mentioned', 'body?.mentions']) {
    assert.ok(!codigoSemComentario.includes(inventado), `voltou a ler campo inexistente: ${inventado}`);
  }
});

// ---------------------------------------------------------------------------
// 3. reply — referenceMessageId + wa_mensagens_bot
// ---------------------------------------------------------------------------
test('reply usa o campo real do Z-API (referenceMessageId)', () => {
  assert.match(fonte, /body\?\.referenceMessageId/, 'parou de ler o campo de reply do Z-API');
  const codigoSemComentario = fonte.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  for (const inventado of ['referencedMessage', 'quotedMsg', 'quotedMessage']) {
    assert.ok(!codigoSemComentario.includes(inventado), `voltou a ler campo inexistente: ${inventado}`);
  }
});

test('o bot guarda o id do que envia — sem isso o reply nunca reconhece', () => {
  assert.match(fonte, /registrarMensagemDoBot/, 'sumiu o registro das mensagens do bot');
  assert.match(fonte, /wa_mensagens_bot/, 'sumiu a tabela do registro');
  // O registro tem que vir DEPOIS das checagens de falha do envio — nao se registra
  // como enviada uma mensagem que o Z-API recusou.
  const iRecusa = fonte.indexOf('Z-API recusou o envio');
  const iRegistro = fonte.indexOf('const idEnviado');
  assert.ok(iRecusa > 0 && iRegistro > iRecusa, 'o registro passou na frente da checagem de falha');
});

test('a migracao da tabela existe e nao apaga nada', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20260827_wa_mensagens_bot.sql', import.meta.url), 'utf8');
  assert.match(sql, /create table if not exists public\.wa_mensagens_bot/);
  assert.match(sql, /message_id\s+text primary key/);
  // Sem os comentarios: a nota de limpeza no fim cita "delete where created_at ..." de exemplo.
  const comandos = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
  assert.ok(!/\bdrop\b|\bdelete\b|\btruncate\b|\balter table\b/i.test(comandos),
    'a migracao mexe em coisa que ja existe');
});

// ---------------------------------------------------------------------------
// 4. Audio — o Whisper decide pelo nome do arquivo, nao pelos bytes
// ---------------------------------------------------------------------------
test('o formato do audio sai do mimeType que o Z-API declarou', () => {
  assert.deepEqual(fn.formatoDoAudio('audio/ogg; codecs=opus', null), { mime: 'audio/ogg', ext: 'ogg' });
  assert.deepEqual(fn.formatoDoAudio('audio/mpeg', null), { mime: 'audio/mpeg', ext: 'mp3' });
  assert.deepEqual(fn.formatoDoAudio('audio/mp4', null), { mime: 'audio/mp4', ext: 'm4a' });
  assert.deepEqual(fn.formatoDoAudio('AUDIO/WAV ', null), { mime: 'audio/wav', ext: 'wav' });
});

test('mime inutil do CDN nao vira nome de arquivo — cai no padrao do WhatsApp', () => {
  // Era exatamente isso que quebrava: o CDN devolve octet-stream, o blob ia com esse tipo,
  // e o Whisper recusava com 400 "Invalid file format".
  assert.deepEqual(fn.formatoDoAudio(null, 'application/octet-stream'), { mime: 'audio/ogg', ext: 'ogg' });
  assert.deepEqual(fn.formatoDoAudio(null, null), { mime: 'audio/ogg', ext: 'ogg' });
  // O que o Z-API declarou tem prioridade sobre o que o servidor mandou.
  assert.deepEqual(fn.formatoDoAudio('audio/mpeg', 'binary/octet-stream'), { mime: 'audio/mpeg', ext: 'mp3' });
});

test('o arquivo nao vai mais com nome fixo "audio.ogg"', () => {
  assert.ok(!/'audio\.ogg'/.test(fonte), 'voltou o nome de arquivo cravado');
  assert.match(fonte, /form\.append\('file', audioBlob, `audio\.\$\{ext\}`\)/);
});

test('o mimeType do audio chega ate a transcricao', () => {
  assert.match(fonte, /audioMime: body\.audio\?\.mimeType/, 'parou de guardar o mimeType do Z-API');
  assert.match(fonte, /transcreverAudio\(msg\.audioUrl, msg\.audioMime\)/, 'o mimeType nao chega mais no Whisper');
});

test('falta de OPENAI_API_KEY passou a aparecer no log', () => {
  // Antes saia null calado e do lado de fora era identico a "o Whisper nao entendeu".
  const bloco = trecho('async function transcreverAudio(');
  assert.match(bloco, /if \(!OPENAI_API_KEY\)/);
  assert.match(bloco, /console\.warn/, 'a chave faltando voltou a sumir calada');
});

// ---------------------------------------------------------------------------
// 5. O grupo autorizado nao pode depender do formato do ID
// ---------------------------------------------------------------------------
test('o mesmo grupo em qualquer formato de ID e o mesmo grupo', () => {
  const digitos = '120363423529374305';
  assert.equal(fn.idDeGrupo(`${digitos}-group`), digitos);
  assert.equal(fn.idDeGrupo(`${digitos}@g.us`), digitos);
  assert.equal(fn.idDeGrupo(digitos), digitos);
});

test('grupoAutorizado compara por digitos, nao por string exata', () => {
  const bloco = trecho('function grupoAutorizado(');
  assert.match(bloco, /idDeGrupo/, 'voltou a comparar o ID cru');
  assert.ok(!/GRUPOS_HELOIM_IDS\.includes/.test(bloco), 'voltou o includes exato');
});

// ---------------------------------------------------------------------------
// 6. O que NAO pode mudar: em grupo, calado ate ser chamado
// ---------------------------------------------------------------------------
test('em grupo ele continua so respondendo quando chamado', () => {
  assert.match(fonte, /if \(emGrupo && !\(await heloimFoiChamada\(msg\)\)\) return;/,
    'o freio de "so fala quando chamada" saiu — em grupo ativo isso vira spam');
  const bloco = trecho('async function heloimFoiChamada(');
  assert.match(bloco, /chamouOBotPeloNome\(msg\.texto\)/);
  assert.match(bloco, /msg\.mencionaBot \|\| marcaONumeroNoTexto\(msg\.texto, ZAPI_NUMERO_BOT\)/,
    'legenda de foto / transcricao de audio com @marcacao voltou a ser ignorada');
  assert.match(bloco, /respondeuOBot\(msg\.respondidaMessageId\)/);
  assert.match(bloco, /conversaAberta\(msg\.remetente\)/);
});

test('grupo fora da lista continua ignorado', () => {
  assert.match(fonte, /if \(!grupoAutorizado\(grupoIdRaw\)\) return null;/,
    'o bot passou a poder responder em grupo nao autorizado');
});

test('nenhuma tool do router escreve em dado de negocio', () => {
  // Trava de sempre: o router le, nunca mexe em leilao/pagamento/estoque.
  const negocio = /rest\/v1\/(auctions|catalog_sales|products|app_users)[^`'"]*`?,\s*\{\s*\n?\s*method: '(PATCH|PUT|DELETE|POST)'/;
  assert.ok(!negocio.test(fonte), 'apareceu escrita em tabela de negocio dentro do router');
});
