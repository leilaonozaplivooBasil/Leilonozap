// whatsapp-router — expurgo Base44, etapa 2 (memória + tool-calling), provedor Z-API.
//
// Cérebro/roteador único dos dois agentes de IA do WhatsApp: Zeca (SDR/atendimento, qualquer
// número, sempre 1:1) e Heloim (assistente de TI — 1:1 com qualquer admin de
// ADMIN_PHONE_NUMBERS, e também dentro de grupos autorizados em GRUPOS_HELOIM_IDS, onde
// qualquer participante pode pedir mudança mas só admin aprova). O mesmo número de WhatsApp
// serve os dois — quem decide qual responde é o telefone/contexto de quem mandou a mensagem.
//
// Etapa 2 (22/08/2026): recebe o webhook do Z-API, roteia, carrega memória de conversa
// (ai_conversas), chama a Claude com o system prompt certo E tool-calling real (saldo/
// pedidos/leilões pro Zeca; métricas de sistema + fluxo de solicitação/autorização de
// mudança pra Heloim — ver heloim_solicitacoes), devolve a resposta. Nenhuma tool mexe em
// dado de NEGÓCIO (leilão, pagamento, estoque) — a Heloim só registra pedido e decisão,
// quem executa a mudança de verdade continua sendo humano.
//
// 🔴 MUDANÇA DE PROVEDOR (22/08/2026): trocamos a Evolution API (self-hosted na VPS) pelo
// Z-API (SaaS). Zero mudança na lógica de roteamento/Claude — só a "borda" com o WhatsApp
// mudou. Diferenças que importam:
//   - Z-API autentica por URL (instance id + token no path), não por header apikey.
//   - Payload do webhook é mais simples: `phone`/`fromMe`/`isGroup` no nível raiz, sem
//     precisar montar remoteJid a partir de sufixo @s.whatsapp.net.
//   - ⚠️ O formato exato do corpo da mensagem (`text.message` vs `body` vs outro campo)
//     NÃO está 100% confirmado — o Z-API já mudou isso entre versões. Se a extração falhar,
//     o payload bruto vai pro log (ver extrairMensagem) — é assim que corrigimos o campo
//     certo no primeiro teste real, sem chutar.
//
// Deploy TEM que ser com --no-verify-jwt (Z-API não manda Authorization: Bearer nenhum)
// — ver o guia de deploy que acompanha esta entrega.

// ============================================================================
// Env vars (secrets desta function — `supabase secrets set ...`)
// ============================================================================
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const ZAPI_BASE_URL = (Deno.env.get('ZAPI_BASE_URL') || 'https://api.z-api.io').replace(/\/+$/, '');
const ZAPI_INSTANCE_ID = Deno.env.get('ZAPI_INSTANCE_ID')!;
const ZAPI_TOKEN = Deno.env.get('ZAPI_TOKEN')!;
// Token de "Segurança da conta" do painel Z-API (Segurança > Token de segurança da conta).
// Vai como header Client-Token em toda chamada pra API deles — sem ele, com a segurança
// ativada na conta, o envio leva 401/403 mesmo com instance id + token corretos.
const ZAPI_CLIENT_TOKEN = Deno.env.get('ZAPI_CLIENT_TOKEN') || '';
// Múltiplos admins (22/08/2026, pedido do dono: Luiz + Ávila) — lista separada por vírgula.
// Mantém compatibilidade com quem só tinha ADMIN_PHONE_NUMBER (singular) configurado.
const ADMIN_PHONE_NUMBERS = (Deno.env.get('ADMIN_PHONE_NUMBERS') || Deno.env.get('ADMIN_PHONE_NUMBER') || '')
  .split(',').map((s) => s.trim()).filter(Boolean);   // só dígitos, com DDI: 5511999999999,5521988887777
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') || '';            // opcional — ver validarSeguranca()

// Executivo que recebe leads de vendedor interessado vindos de anúncio (Meta/Instagram) —
// pedido do dono (22/08/2026). Valor padrão é o número passado por ele; dá pra trocar sem
// redeploy setando o secret EXECUTIVO_VENDEDOR_PHONE.
const EXECUTIVO_VENDEDOR_PHONE = Deno.env.get('EXECUTIVO_VENDEDOR_PHONE') || '21984942730';

// Transcrição de áudio (Whisper) — mesmo serviço que já era usado no Base44
// (base44/functions/transcribeAudio/entry.ts). Opcional: sem a chave, Zeca segue
// funcionando, só sem entender o CONTEÚDO do áudio (ver transcreverAudio()).
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';

// Grupos de WhatsApp onde a Heloim opera (22/08/2026) — lista de IDs separados por vírgula
// (formato Z-API, tipo "120363...@g.us" ou "1203...-group" — ver waGroupDiagZapi.js pra
// descobrir o ID certo). Grupo fora dessa lista: a function ignora a mensagem (nunca responde
// em grupo não autorizado). Sem nenhum grupo configurado, Heloim funciona só 1:1 com admin,
// exatamente como antes desta mudança.
const GRUPOS_HELOIM_IDS = (Deno.env.get('GRUPOS_HELOIM_IDS') || '').split(',').map((s) => s.trim()).filter(Boolean);

// Número do próprio bot no WhatsApp (23/08/2026) — serve pra reconhecer quando alguém
// @marcou ele ou respondeu uma mensagem dele dentro do grupo. Só isso; não é usado pra
// enviar nada (o envio continua indo pelo instance id + token). Default é o número em uso
// hoje, no mesmo estilo de EXECUTIVO_VENDEDOR_PHONE — trocou de número, é só setar o secret.
const ZAPI_NUMERO_BOT = Deno.env.get('ZAPI_NUMERO_BOT') || '5521984072064';

// Slack (22/08/2026) — Incoming Webhook do canal onde a Heloim registra pedido/classificação
// de risco/decisão, igual fazia no Base44 antigo (canal top-tech-leilao-nozap). Opcional: sem
// configurar, Heloim funciona igual, só não duplica o registro no Slack.
const SLACK_WEBHOOK_URL = Deno.env.get('SLACK_WEBHOOK_URL') || '';

// Enriquecimento do Zeca é best-effort (ver buscarClientePorTelefone) — se estas duas
// faltarem, a function não quebra, só deixa de tentar consultar o cliente.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const CLAUDE_MODEL = 'claude-sonnet-5';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, apikey, webhook-secret',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

// ============================================================================
// Segurança — o painel do Z-API configura o webhook só como uma URL (sem campo de header
// customizado), então o segredo viaja por query string (?secret=...). Mantém também a
// checagem por header, de graça, caso um dia isso mude de provedor de novo. Se
// WEBHOOK_SECRET não estiver configurado, não valida nada — mas loga um aviso.
// ============================================================================
function validarSeguranca(req: Request, url: URL): boolean {
  if (!WEBHOOK_SECRET) {
    console.warn('[whatsapp-router] WEBHOOK_SECRET não configurado — endpoint sem validação de origem.');
    return true;
  }
  const recebido = url.searchParams.get('secret') || req.headers.get('webhook-secret') || req.headers.get('apikey');
  return recebido === WEBHOOK_SECRET;
}

// ============================================================================
// Telefone — comparação por últimos dígitos: o 9º dígito do celular é inconsistente
// entre o que o Z-API manda e o que fica salvo em ADMIN_PHONE_NUMBER/app_users.phone.
// ============================================================================
function apenasDigitos(v: string | null | undefined): string {
  return (v || '').replace(/\D/g, '');
}

function ultimosDigitos(v: string | null | undefined, n = 10): string {
  return apenasDigitos(v).slice(-n);
}

// @marcação dentro do TEXTO (27/08/2026). Conferido na documentação do webhook "ao receber"
// do Z-API: NÃO existe campo de menção no payload (não tem mentionedPhones, mentioned nem
// mentions — a tabela de campos deles vai de `text.message` a `sticker.stickerUrl` e menção
// não aparece em lugar nenhum). O que o WhatsApp manda de verdade é o "@" escrito no corpo
// da mensagem seguido do número: "@5521984072064 dá uma olhada nisso". É isso que a gente
// confere agora — o que existia antes era chute em campo inexistente e dava SEMPRE false.
function marcaONumeroNoTexto(texto: string, numero: string): boolean {
  const fim = ultimosDigitos(numero, 8);
  if (!fim) return false;
  for (const m of String(texto || '').matchAll(/@\s*(\d[\d\s.-]{5,25})/g)) {
    if (apenasDigitos(m[1]).endsWith(fim)) return true;
  }
  return false;
}

function ehAdmin(remetente: string): boolean {
  if (!ADMIN_PHONE_NUMBERS.length) return false; // sem admin configurado, ninguém vira Heloim — padrão seguro
  const digitos = ultimosDigitos(remetente);
  return ADMIN_PHONE_NUMBERS.some((n) => ultimosDigitos(n) === digitos);
}

// ============================================================================
// Payload do Z-API — webhook "Ao receber" (configurar especificamente esse, não o "ao
// enviar"/"status"/"conectar" — cada evento tem seu próprio campo de URL no painel deles).
// `phone` e `fromMe` vêm no nível raiz, sem precisar montar/desmontar JID como na Evolution
// API. O campo do TEXTO da mensagem é o único ponto de incerteza real — ver o aviso no
// topo do arquivo.
// ============================================================================
type MensagemExtraida = {
  remetente: string; // telefone de QUEM ESCREVEU — em grupo, é o participante, nunca o ID do grupo
  remetenteNome: string | null; // nome de exibição, quando o Z-API manda (só em grupo, por ora)
  grupoId: string | null; // null = conversa 1:1. Setado = veio de um grupo autorizado (GRUPOS_HELOIM_IDS)
  grupoNome: string | null;
  texto: string; // pra mídia sem conteúdo legível, um texto sintético descrevendo o que chegou
  audioUrl: string | null; // se veio áudio, a URL do arquivo — ver transcreverAudio()
  audioMime: string | null; // o que o Z-API declarou em audio.mimeType — o Whisper precisa disso
  // Imagem/PDF que o Zeca precisa VER de verdade (print de erro, comprovante, catálogo).
  // A Claude lê os dois nativamente — ver baixarMidia()/blocosDeMidia().
  midiaUrl: string | null;
  midiaTipo: 'imagem' | 'documento' | null;
  midiaMime: string | null;   // o que o Z-API declarou; conferido/corrigido no download
  midiaNome: string | null;   // nome do arquivo, quando vem (só documento)
  // Em grupo, a Heloim só fala quando é chamada — ver heloimFoiChamada().
  mencionaBot: boolean;     // o número do bot foi @marcado no texto da mensagem
  // Reply: o Z-API manda só o ID da mensagem citada (referenceMessageId), não o autor dela.
  // Saber se aquele ID é de uma mensagem NOSSA é consulta em wa_mensagens_bot — feita depois,
  // em heloimFoiChamada(), porque extrairMensagem() é síncrona de propósito (o webhook tem
  // que devolver 200 rápido, ver processarMensagem).
  respondidaMessageId: string | null;
  messageId: string | null; // usado pra idempotência — ver jaProcessada()
};

// Heloim é a ÚNICA que opera em grupo (pedido do dono, 22/08/2026) — Zeca continua 1:1 só.
// Grupo fora da lista: mensagem descartada, sem log de payload (grupo não autorizado não é
// "formato desconhecido pra investigar", é intencionalmente ignorado).
// ⚠️ Comparação por DÍGITOS, não string exata (27/08/2026). O Z-API entrega o ID do grupo
// como "120363423529374305-group", mas o MESMO grupo aparece como "120363423529374305@g.us"
// em export/print/outras ferramentas. Com comparação exata, configurar GRUPOS_HELOIM_IDS no
// formato "errado" deixava a Heloim muda no grupo inteiro — e sem log nenhum, porque grupo
// não autorizado é descartado de propósito antes de qualquer registro. Os dígitos são os
// mesmos nos dois formatos, então comparar por eles acaba com essa categoria de silêncio.
function idDeGrupo(v: string): string {
  return apenasDigitos(v);
}

function grupoAutorizado(grupoId: string): boolean {
  const alvo = idDeGrupo(grupoId);
  if (!alvo) return false;
  return GRUPOS_HELOIM_IDS.some((g) => idDeGrupo(g) === alvo);
}

function extrairMensagem(body: any): MensagemExtraida | null {
  if (body?.fromMe === true) return null;   // eco do que o próprio bot mandou — nunca processa, senão vira loop

  let remetente: string | undefined;
  let remetenteNome: string | null = null;
  let grupoId: string | null = null;
  let grupoNome: string | null = null;

  if (body?.isGroup === true) {
    const grupoIdRaw: string | undefined = body?.phone ? String(body.phone) : undefined;
    const participante: string | undefined = body?.participantPhone ? String(body.participantPhone) : undefined;
    if (!grupoIdRaw || !participante) return null;
    if (!grupoAutorizado(grupoIdRaw)) return null; // grupo não é da Heloim — ignora, sem log
    remetente = participante;
    remetenteNome = body?.senderName ? String(body.senderName) : null;
    grupoId = grupoIdRaw;
    grupoNome = body?.chatName ? String(body.chatName) : null;
  } else {
    remetente = body?.phone ? String(body.phone) : undefined;
  }
  if (!remetente) return null;

  const messageId: unknown = body?.messageId ?? body?.id ?? null;
  const messageIdStr = messageId ? String(messageId) : null;

  // Tenta os formatos mais prováveis pro corpo do texto. Se nenhum bater, loga o payload
  // bruto — é assim que a gente ajusta o campo certo no primeiro teste real, sem chutar.
  const texto: unknown = body?.text?.message ?? body?.body ??
    (typeof body?.message === 'string' ? body.message : body?.message?.text);

  // 📣 Foi o bot que chamaram? Duas pistas além do nome escrito no texto (esse é
  // conferido em heloimFoiChamada()):
  //   ① @marcação — está no TEXTO, não em campo próprio (ver marcaONumeroNoTexto).
  //   ② resposta (reply) — o Z-API manda `referenceMessageId`, o ID da mensagem citada.
  //
  // 🩹 27/08/2026 — os dois estavam quebrados desde que foram escritos (#103), e é por isso
  // que o bot "parou de responder no grupo": os campos que a gente lia (mentionedPhones /
  // referencedMessage / quotedMsg / quotedMessage) NÃO EXISTEM no payload do Z-API. Ou seja,
  // mencionaBot e respondeuBot davam false em 100% das mensagens, e sobrava um único jeito de
  // acordar o bot no grupo: escrever o nome dele. Quem marcava com @ ou respondia a mensagem
  // dele só via silêncio. Corrigido para os campos reais e conferidos na documentação.
  const numeroDoBot = apenasDigitos(ZAPI_NUMERO_BOT);
  const mencionaBot = marcaONumeroNoTexto(String(texto ?? ''), numeroDoBot);

  const refId: unknown = body?.referenceMessageId ?? null;
  const respondidaMessageId = refId ? String(refId) : null;

  const base = {
    remetente, remetenteNome, grupoId, grupoNome, messageId: messageIdStr,
    audioUrl: null, audioMime: null, midiaUrl: null, midiaTipo: null, midiaMime: null, midiaNome: null,
    mencionaBot, respondidaMessageId,
  } as const;

  if (texto && String(texto).trim()) {
    return { ...base, texto: String(texto).trim() };
  }

  // Áudio: extrai a URL do arquivo pra transcrever depois (em background — ver
  // transcreverAudio() e processarMensagem()). Tenta os campos mais prováveis do Z-API; se
  // nenhum bater, ainda assim NUNCA fica muda — vira texto sintético mesmo sem URL.
  if (body?.audio) {
    // Campos conferidos na documentação do Z-API (27/08/2026): `audio.audioUrl` e
    // `audio.mimeType` (normalmente "audio/ogg; codecs=opus"). Os outros dois nomes ficam
    // como rede de segurança caso eles mudem — não custa nada.
    const audioUrl: unknown = body.audio?.audioUrl ?? body.audio?.url ?? body.audio?.audioURL ?? null;
    if (!audioUrl) {
      console.warn(
        '[whatsapp-router] chegou áudio mas nenhuma URL reconhecida dentro de body.audio — objeto bruto:',
        JSON.stringify(body.audio).slice(0, 500)
      );
    }
    return {
      ...base,
      texto: '[o cliente mandou uma mensagem de ÁUDIO — sem transcrição disponível ainda]',
      audioUrl: audioUrl ? String(audioUrl) : null,
      audioMime: body.audio?.mimeType ? String(body.audio.mimeType) : null,
    };
  }

  // 👁️ IMAGEM — o Zeca precisa VER (print de erro, comprovante de PIX, foto do produto).
  // Guarda a URL; o download e a montagem do bloco pra Claude acontecem no background.
  if (body?.image) {
    const url: unknown = body.image?.imageUrl ?? body.image?.url ?? null;
    const legenda = body.image?.caption ? String(body.image.caption).trim() : '';
    return {
      ...base,
      texto: legenda || '[o cliente mandou uma imagem, sem legenda]',
      midiaUrl: url ? String(url) : null,
      midiaTipo: 'imagem',
      midiaMime: body.image?.mimeType ? String(body.image.mimeType) : null,
      midiaNome: null,
    };
  }

  // 📄 DOCUMENTO — a Claude lê PDF nativamente. Outros formatos (docx, xlsx) ela NÃO lê:
  // esses seguem só como aviso de texto, e o prompt manda pedir em PDF ou print.
  if (body?.document) {
    const url: unknown = body.document?.documentUrl ?? body.document?.url ?? null;
    const nome = body.document?.fileName ? String(body.document.fileName) : null;
    const legenda = body.document?.caption ? String(body.document.caption).trim() : '';
    return {
      ...base,
      texto: legenda || `[o cliente mandou um documento${nome ? `: "${nome}"` : ''}]`,
      midiaUrl: url ? String(url) : null,
      midiaTipo: 'documento',
      midiaMime: body.document?.mimeType ? String(body.document.mimeType) : null,
      midiaNome: nome,
    };
  }

  console.warn(
    '[whatsapp-router] payload sem texto/áudio/imagem/documento reconhecido — ajustar extrairMensagem() com o formato real:',
    JSON.stringify(body).slice(0, 1000)
  );
  return null;
}

// ============================================================================
// Transcrição de áudio — Whisper (OpenAI), mesmo serviço já usado antes no Base44. Roda em
// background (chamada de dentro de processarMensagem, nunca no caminho síncrono do webhook).
// Sem OPENAI_API_KEY configurada, ou qualquer falha no meio do caminho, devolve null — quem
// chama já sabe lidar com "sem transcrição" (mensagem sintética do extrairMensagem).
// ============================================================================
// O Whisper decide o decoder pela EXTENSÃO do nome do arquivo e pelo Content-Type da parte —
// não pelos bytes. Mandar tudo como "audio.ogg" com o tipo que o CDN do Z-API devolver (às
// vezes "application/octet-stream", às vezes "binary/octet-stream") é receita de HTTP 400
// "Invalid file format" — e aí o áudio chega, o download funciona, e mesmo assim o Zeca
// responde "não consegui ouvir". Aqui a extensão e o tipo saem do mimeType que o próprio
// Z-API declarou em audio.mimeType; sem ele, o padrão do WhatsApp (ogg/opus).
const EXTENSAO_POR_MIME: Record<string, string> = {
  'audio/ogg': 'ogg', 'audio/opus': 'ogg', 'audio/x-opus+ogg': 'ogg',
  'audio/mpeg': 'mp3', 'audio/mp3': 'mp3',
  'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/m4a': 'm4a', 'audio/aac': 'm4a',
  'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/wave': 'wav',
  'audio/webm': 'webm', 'audio/flac': 'flac', 'audio/x-flac': 'flac',
};

function formatoDoAudio(declarado: string | null, doServidor: string | null): { mime: string; ext: string } {
  for (const candidato of [declarado, doServidor]) {
    const limpo = String(candidato || '').split(';')[0].trim().toLowerCase();
    const ext = EXTENSAO_POR_MIME[limpo];
    if (ext) return { mime: limpo, ext };
  }
  return { mime: 'audio/ogg', ext: 'ogg' }; // áudio de WhatsApp é ogg/opus por padrão
}

async function transcreverAudio(audioUrl: string, mimeDeclarado: string | null = null): Promise<string | null> {
  if (!OPENAI_API_KEY) {
    // Antes isso saía calado, e do lado de fora ficava idêntico a "o Whisper não entendeu":
    // o cliente manda áudio, o Zeca diz que não conseguiu ouvir, e ninguém descobre que o
    // problema é um secret que nunca foi configurado. Agora o log fala.
    console.warn(
      '[whatsapp-router] chegou áudio, mas OPENAI_API_KEY não está configurada — ninguém transcreve. ' +
      'Configure o secret no Supabase (ver DEPLOY.md) para o Zeca "ouvir" de verdade.'
    );
    return null;
  }
  try {
    const audioResp = await fetch(audioUrl);
    if (!audioResp.ok) {
      console.error('[whatsapp-router] falha ao baixar áudio do Z-API:', audioResp.status);
      return null;
    }
    const bytes = new Uint8Array(await audioResp.arrayBuffer());
    const { mime, ext } = formatoDoAudio(mimeDeclarado, audioResp.headers.get('content-type'));
    const audioBlob = new Blob([bytes], { type: mime });
    console.log(`[whatsapp-router] transcrevendo áudio: ${bytes.length} bytes, enviando como audio.${ext} (${mime})`);

    const form = new FormData();
    form.append('file', audioBlob, `audio.${ext}`);
    form.append('model', 'whisper-1');
    form.append('language', 'pt');

    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: form,
    });
    if (!r.ok) {
      console.error('[whatsapp-router] Whisper recusou a transcrição:', r.status, await r.text().catch(() => ''));
      return null;
    }
    const data = await r.json();
    return typeof data?.text === 'string' && data.text.trim() ? data.text.trim() : null;
  } catch (e) {
    console.error('[whatsapp-router] falha ao transcrever áudio (segue sem transcrição):', e);
    return null;
  }
}

// ============================================================================
// 👁️ Visão do Zeca — imagem e PDF que chegam pelo WhatsApp vão pra Claude COMO ARQUIVO,
// não como "[o cliente mandou uma imagem]". É o que faz ele resolver print de erro,
// comprovante de PIX e catálogo em PDF sem pedir pro cliente digitar o que está na tela.
//
// A Messages API lê os dois nativamente, em blocos de conteúdo base64:
//   imagem   → { type: 'image',    source: { type: 'base64', media_type, data } }
//   PDF      → { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
// Formato que não é imagem-suportada nem PDF (docx, xlsx, zip) a Claude NÃO lê — nesse caso
// não mandamos bloco nenhum e o Zeca é avisado por texto pra pedir print/PDF.
//
// Falha aqui NUNCA derruba a conversa: sem bloco de mídia, o Zeca responde só com o texto.
// ============================================================================
const IMAGENS_SUPORTADAS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const LIMITE_IMAGEM_BYTES = 4 * 1024 * 1024;   // teto da API por imagem (5MB) com folga
const LIMITE_PDF_BYTES = 16 * 1024 * 1024;     // teto do request inteiro é 32MB — metade, com folga

// btoa() só aceita string binária, e String.fromCharCode(...bytes) estoura a pilha em
// arquivo grande. Converte em pedaços — é o jeito seguro pra megabytes.
function bytesParaBase64(bytes: Uint8Array): string {
  let binario = '';
  const PEDACO = 0x8000;
  for (let i = 0; i < bytes.length; i += PEDACO) {
    binario += String.fromCharCode(...bytes.subarray(i, i + PEDACO));
  }
  return btoa(binario);
}

// O Z-API às vezes declara mimeType genérico ("application/octet-stream") ou nenhum.
// Os bytes não mentem — assinatura do arquivo tem prioridade sobre o que foi declarado.
function detectarMime(bytes: Uint8Array, declarado: string | null): string | null {
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return 'application/pdf'; // %PDF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif';
  if (bytes.length >= 12 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp'; // RIFF....WEBP
  const limpo = (declarado || '').split(';')[0].trim().toLowerCase();
  return limpo || null;
}

type BlocoMidia = { blocos: any[]; aviso: string | null };

async function blocosDeMidia(msg: MensagemExtraida): Promise<BlocoMidia> {
  if (!msg.midiaUrl || !msg.midiaTipo) return { blocos: [], aviso: null };
  try {
    const r = await fetch(msg.midiaUrl);
    if (!r.ok) {
      console.error('[whatsapp-router] falha ao baixar mídia do Z-API:', r.status, msg.midiaTipo);
      return { blocos: [], aviso: 'o arquivo não pôde ser aberto agora' };
    }
    const bytes = new Uint8Array(await r.arrayBuffer());
    const mime = detectarMime(bytes, msg.midiaMime || r.headers.get('content-type'));

    if (mime === 'application/pdf') {
      if (bytes.length > LIMITE_PDF_BYTES) {
        return { blocos: [], aviso: 'o PDF é grande demais pra abrir por aqui' };
      }
      // O bloco do documento vem ANTES do texto — a Claude lê melhor com o arquivo
      // primeiro e a pergunta depois.
      return {
        blocos: [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: bytesParaBase64(bytes) } }],
        aviso: null,
      };
    }

    if (mime && IMAGENS_SUPORTADAS.includes(mime)) {
      if (bytes.length > LIMITE_IMAGEM_BYTES) {
        return { blocos: [], aviso: 'a imagem é pesada demais pra abrir por aqui' };
      }
      return {
        blocos: [{ type: 'image', source: { type: 'base64', media_type: mime, data: bytesParaBase64(bytes) } }],
        aviso: null,
      };
    }

    console.warn('[whatsapp-router] mídia em formato que a Claude não lê:', mime, msg.midiaNome);
    return { blocos: [], aviso: `o arquivo veio num formato que você não consegue abrir (${mime || 'desconhecido'})` };
  } catch (e) {
    console.error('[whatsapp-router] erro ao preparar mídia (segue só com o texto):', e);
    return { blocos: [], aviso: 'o arquivo não pôde ser aberto agora' };
  }
}

// ============================================================================
// Enriquecimento do Zeca — consulta best-effort em app_users (tabela real do Supabase,
// minúscula — NÃO é "Customer"/"AppUser" no estilo de entidade da Base44). Erro ou
// "não encontrado" aqui NUNCA derruba a conversa: o Zeca só responde sem esse contexto.
// ============================================================================
async function buscarClientePorTelefone(remetente: string): Promise<{ nome?: string } | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const ultimos8 = ultimosDigitos(remetente, 8);
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/app_users?select=full_name,email&phone=ilike.*${ultimos8}*&limit=1`,
      { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
    );
    if (!r.ok) return null;
    const rows = await r.json().catch(() => []);
    const cliente = Array.isArray(rows) ? rows[0] : null;
    return cliente ? { nome: cliente.full_name } : null;
  } catch (e) {
    console.error('[whatsapp-router] falha ao consultar cliente (segue sem contexto):', e);
    return null;
  }
}

// ============================================================================
// Memória de conversa — sem isto cada mensagem chega na Claude sem contexto nenhum do
// que já foi dito. Guarda por remetente+agente (tabela ai_conversas). Falha aqui NUNCA
// derruba a conversa: memória é conveniência, não requisito.
// ============================================================================
type Turno = { role: 'user' | 'assistant'; content: string };
// 27/08/2026: 12 -> 20. Com 12 (6 idas e voltas) o Zeca esquecia o começo de uma conversa
// de venda um pouco mais longa e repetia pergunta que o cliente já tinha respondido — o
// jeito mais rápido de parecer robô. 20 cobre ~10 idas e voltas; o custo de token continua
// baixo porque a resposta dele é curta por regra.
const HISTORICO_MAX_MSGS = 20;

async function carregarHistorico(remetente: string, agente: string): Promise<Turno[]> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return [];
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/ai_conversas?select=role,content&remetente=eq.${encodeURIComponent(remetente)}` +
        `&agente=eq.${agente}&order=created_at.desc&limit=${HISTORICO_MAX_MSGS}`,
      { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
    );
    if (!r.ok) return [];
    const rows = await r.json().catch(() => []);
    return (Array.isArray(rows) ? rows : []).reverse();
  } catch (e) {
    console.error('[whatsapp-router] falha ao carregar histórico (segue sem memória):', e);
    return [];
  }
}

// ============================================================================
// 📣 Em grupo, a Heloim SÓ fala quando é chamada (23/08/2026, pedido do dono:
// "responder só quando perguntada é o certo desde já").
//
// Antes, grupo autorizado = ela respondia TODA mensagem. Num grupo parado dá pra testar;
// num grupo ativo vira spam e alguém tira ela no mesmo dia.
//
// Ela entra na conversa em quatro situações — nesta ordem de custo:
//   ① o nome dela aparece escrito ("Heloim, quantas vendas hoje?")
//   ② @marcaram o número do bot (o "@5521984072064" escrito no texto — ver marcaONumeroNoTexto)
//   ③ a mensagem é resposta (reply) a uma mensagem dela (referenceMessageId + wa_mensagens_bot)
//   ④ ela e essa MESMA pessoa estão no meio de uma conversa (últimos 5 min) — senão a
//      pessoa teria que repetir "Heloim" a cada frase, e ela pareceria robô
//
// Fora disso, em grupo, fica calada: nem chama a Claude, nem grava memória, nem envia nada.
// Em conversa 1:1 NADA muda — lá ela responde sempre, é o canal dela com o admin.
//
// ⚠️ Sem acento de propósito: "Heloim" não tem acento, mas gente escreve de tudo. O
// normalizar() tira acento dos dois lados antes de comparar.
//
// ⚠️ 27/08/2026: ① passou a valer também pro nome "Zeca" (é como o time chama esse número),
// e ② e ③ passaram a funcionar de verdade — antes liam campo que não existe no Z-API e
// davam false sempre. Ver NOMES_QUE_CHAMAM_O_BOT e a nota em extrairMensagem().
// ============================================================================
const JANELA_CONVERSA_MS = 5 * 60 * 1000;

function normalizar(v: string): string {
  return v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// 🩹 27/08/2026 — "Zeca" também acorda o bot no grupo.
//
// O grupo tem UM número de WhatsApp só, e quem responde lá dentro é a Heloim (grupo autorizado
// = sempre Heloim, ver processarMensagem — o Zeca nunca operou em grupo, nem antes nem depois
// do #96). Só que o time chama esse número de "Zeca", que é o nome que ele usa no 1:1 com
// cliente. Resultado: a galera escrevia "Zeca, ..." no grupo, o gate só reconhecia a palavra
// "heloim", e o bot ficava mudo — sem log, sem erro, sem nada pra investigar. Do lado de fora
// isso é exatamente "o Zeca parou de responder no grupo".
//
// Aceitar os dois nomes não muda QUEM responde (a persona no grupo continua sendo a Heloim,
// com as tools dela) — muda só o que conta como "me chamaram".
const NOMES_QUE_CHAMAM_O_BOT = /\b(heloim|zeca)\b/;

function chamouOBotPeloNome(texto: string): boolean {
  return NOMES_QUE_CHAMAM_O_BOT.test(normalizar(texto));
}

// A mensagem citada (reply) é uma mensagem NOSSA? O Z-API manda só o ID dela
// (referenceMessageId), sem dizer quem escreveu — então a resposta está em wa_mensagens_bot,
// onde enviarWhatsApp() registra o ID de tudo que o bot manda. Falha de rede aqui devolve
// false, igual conversaAberta(): no pior caso ele só não emenda, nunca fala sem ser chamado.
async function respondeuOBot(messageId: string | null): Promise<boolean> {
  if (!messageId) return false;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return false;
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/wa_mensagens_bot?select=message_id&message_id=eq.${encodeURIComponent(messageId)}&limit=1`,
      { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
    );
    if (!r.ok) return false;
    const rows = await r.json().catch(() => []);
    return Array.isArray(rows) && rows.length > 0;
  } catch (e) {
    console.error('[whatsapp-router] falha ao checar se o reply era pra mim (trata como não):', e);
    return false;
  }
}

// Registro do que o BOT mandou — é o que faz o reply funcionar (ver respondeuOBot). Best-effort
// de propósito: se não gravar, o pior que acontece é o reply daquela mensagem não acordar ele.
// Nunca pode derrubar um envio que já deu certo.
async function registrarMensagemDoBot(messageId: string) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/wa_mensagens_bot`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json', Prefer: 'return=minimal',
      },
      body: JSON.stringify({ message_id: messageId }),
    });
  } catch (e) {
    console.error('[whatsapp-router] falha ao registrar mensagem do bot (reply pode não acordar ele):', e);
  }
}

// Ela respondeu essa pessoa há pouco? Usa a própria memória (ai_conversas) — não precisa de
// tabela nova. Falha de rede aqui devolve false: no pior caso ela só não emenda a conversa,
// e a pessoa chama pelo nome de novo. Nunca o contrário (falar sem ser chamada).
async function conversaAberta(remetente: string): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return false;
  try {
    const desde = new Date(Date.now() - JANELA_CONVERSA_MS).toISOString();
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/ai_conversas?select=created_at&remetente=eq.${encodeURIComponent(remetente)}` +
        `&agente=eq.heloim&role=eq.assistant&created_at=gte.${encodeURIComponent(desde)}&limit=1`,
      { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
    );
    if (!r.ok) return false;
    const rows = await r.json().catch(() => []);
    return Array.isArray(rows) && rows.length > 0;
  } catch (e) {
    console.error('[whatsapp-router] falha ao checar conversa aberta (trata como fechada):', e);
    return false;
  }
}

async function heloimFoiChamada(msg: MensagemExtraida): Promise<boolean> {
  if (chamouOBotPeloNome(msg.texto)) return true;
  // A @marcação é conferida duas vezes de propósito: `mencionaBot` olha o texto CRU do
  // payload, e aqui olhamos o texto FINAL — que pode ser a legenda de uma foto ou a
  // transcrição de um áudio. Marcar o bot na legenda de um print também vale como chamado.
  if (msg.mencionaBot || marcaONumeroNoTexto(msg.texto, ZAPI_NUMERO_BOT)) return true;
  if (await respondeuOBot(msg.respondidaMessageId)) return true;
  return await conversaAberta(msg.remetente);
}

/**
 * Grava um turno da conversa e devolve o `created_at` que o BANCO carimbou.
 *
 * A hora vem do banco, não daqui, de propósito: a janela de agrupamento compara horários
 * de mensagens gravadas por execuções diferentes da function, e cada execução tem o
 * relógio dela. Comparar hora do banco com hora do banco é a única forma de a conta
 * fechar. Devolve null se não gravou — quem chama trata isso como "sem agrupamento".
 */
async function salvarTurno(
  remetente: string, agente: string, role: 'user' | 'assistant', content: string,
): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/ai_conversas`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json', Prefer: 'return=representation',
      },
      body: JSON.stringify({ remetente, agente, role, content }),
    });
    if (!r.ok) return null;
    const linhas = await r.json().catch(() => []);
    const quando = Array.isArray(linhas) ? linhas[0]?.created_at : null;
    return quando ? String(quando) : null;
  } catch (e) {
    console.error('[whatsapp-router] falha ao salvar turno (memória segue incompleta):', e);
    return null;
  }
}

// ============================================================================
// 🧍 O QUE FAZ PARECER GENTE — 27/08/2026
//
// O texto do prompt já pedia conversa humanizada. O que denunciava a máquina não era o
// texto, eram três comportamentos:
//
//  ① Cliente escreve em pedaços ("oi" / "tenho uma dúvida" / "sobre o leilão de ontem") e
//    levava TRÊS respostas atropelando uma na outra. Nenhuma pessoa faz isso: gente espera
//    a outra terminar de escrever. É o sinal número um de robô no WhatsApp.
//  ② A resposta chegava sempre num bloco só. Gente manda duas ou três mensagens curtas.
//  ③ Ele nunca "lia" a mensagem — sem tique azul, a resposta aparecia do nada.
//
// Nada disso se resolve com prompt. Está resolvido aqui embaixo.
// ============================================================================

/** Quanto tempo esperar o cliente terminar de escrever antes de responder. */
const JANELA_AGRUPAMENTO_MS = 6000;

/** Pausa entre um pedaço e outro da resposta — o tempo de digitar a próxima. */
const PAUSA_ENTRE_PEDACOS_MS = 1200;

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Chegou mensagem nova desta mesma pessoa depois da que estou processando?
 * Se chegou, esta execução DESISTE de responder: a mais nova responde por todas, e o
 * histórico dela já contém esta. Falha de rede devolve false — no pior caso responde duas
 * vezes, que é o comportamento de antes, nunca ficar sem resposta.
 */
async function chegouMensagemMaisNova(remetente: string, agente: string, desde: string): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return false;
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/ai_conversas?select=id&remetente=eq.${encodeURIComponent(remetente)}` +
        `&agente=eq.${agente}&role=eq.user&created_at=gt.${encodeURIComponent(desde)}&limit=1`,
      { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
    );
    if (!r.ok) return false;
    const linhas = await r.json().catch(() => []);
    return Array.isArray(linhas) && linhas.length > 0;
  } catch (e) {
    console.error('[whatsapp-router] falha ao checar mensagem mais nova (responde assim mesmo):', e);
    return false;
  }
}

/**
 * Separa o histórico da fala PENDENTE do cliente. A fala pendente é a sequência de
 * mensagens dele no fim do histórico que ainda não teve resposta — uma só no caso normal,
 * duas ou três quando ele escreveu em pedaços. Vão todas juntas para a Claude, como uma
 * fala só, que é como uma pessoa leria.
 */
function separarPendentes(historico: Turno[]): { anteriores: Turno[]; pendente: string } {
  const anteriores = [...historico];
  const falas: string[] = [];
  while (anteriores.length && anteriores[anteriores.length - 1].role === 'user') {
    falas.unshift(String(anteriores.pop()?.content || ''));
  }
  return { anteriores, pendente: falas.join('\n') };
}

/**
 * Quebra a resposta em mensagens separadas, pelos parágrafos. Teto de 3: mais que isso
 * deixa de parecer conversa e vira metralhadora — o excedente vai junto no último.
 */
function pedacosDaResposta(texto: string): string[] {
  const inteiro = String(texto || '').trim();
  if (!inteiro) return [];
  const partes = inteiro.split(/\n{2,}/).map((t) => t.trim()).filter(Boolean);
  if (partes.length <= 1) return [inteiro];
  if (partes.length <= 3) return partes;
  return [...partes.slice(0, 2), partes.slice(2).join('\n\n')];
}

/**
 * Marca a mensagem do cliente como lida (os dois tiques azuis). Best-effort: se falhar,
 * o atendimento segue exatamente igual — só não aparece o tique.
 */
async function marcarComoLida(telefone: string, messageId: string | null) {
  if (!messageId || !ZAPI_INSTANCE_ID || !ZAPI_TOKEN) return;
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (ZAPI_CLIENT_TOKEN) headers['Client-Token'] = ZAPI_CLIENT_TOKEN;
    await fetch(`${ZAPI_BASE_URL}/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/read-message`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ phone: telefone.includes('-group') ? telefone : apenasDigitos(telefone), messageId }),
    });
  } catch (e) {
    console.error('[whatsapp-router] falha ao marcar como lida (segue normal):', e);
  }
}

// ============================================================================
// Tools — cada uma é uma consulta de LEITURA no Supabase. Nenhuma escreve nada (Heloim é
// só-consulta nesta versão; Zeca nunca deveria escrever mesmo). Erro de query vira
// tool_result de erro pra Claude, que decide como contar isso pro usuário — nunca derruba
// a conversa.
// ============================================================================
type ToolCtx = {
  remetente: string;
  remetenteNome: string | null;
  grupoId: string | null;   // não-nulo = a tool foi chamada a partir de um grupo (só Heloim)
  grupoNome: string | null;
};

type ToolDef = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  executar: (input: any, ctx: ToolCtx) => Promise<unknown>;
};

function sbRest(path: string, opts: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json', ...(opts.headers || {}),
    },
  });
}

const TOOLS_ZECA: ToolDef[] = [
  {
    name: 'consultar_saldo',
    description: 'Consulta o saldo disponível e reservado da carteira do cliente que está falando agora.',
    input_schema: { type: 'object', properties: {} },
    executar: async (_input, ctx) => {
      const cliente = await buscarClienteCompletoPorTelefone(ctx.remetente);
      if (!cliente) return { encontrado: false, mensagem: 'Nenhum cadastro encontrado para este telefone.' };
      return {
        encontrado: true,
        nome: cliente.full_name,
        saldo_disponivel: Number(cliente.saldo_disponivel || 0),
        saldo_reservado: Number(cliente.saldo_reservado || 0),
      };
    },
  },
  {
    name: 'consultar_pedidos',
    description: 'Lista os pedidos/compras mais recentes do cliente que está falando agora (até 5).',
    input_schema: { type: 'object', properties: {} },
    executar: async (_input, ctx) => {
      const ultimos8 = ultimosDigitos(ctx.remetente, 8);
      const r = await sbRest(
        `catalog_sales?select=id,product_title,total_amount,status,fulfillment_status,tracking_code,created_at` +
          `&buyer_phone=ilike.*${ultimos8}*&order=created_at.desc&limit=5`
      );
      const rows = await r.json().catch(() => []);
      return { pedidos: Array.isArray(rows) ? rows : [] };
    },
  },
  {
    name: 'consultar_leiloes_ativos',
    description: 'Lista os leilões ativos no momento (até 8), ordenados por quem termina primeiro.',
    input_schema: { type: 'object', properties: {} },
    executar: async () => {
      const r = await sbRest(`auctions?select=id,title,current_price,end_time&status=eq.active&order=end_time.asc&limit=8`);
      const rows = await r.json().catch(() => []);
      return { leiloes: Array.isArray(rows) ? rows : [] };
    },
  },
  {
    name: 'encaminhar_lead_vendedor',
    description:
      'Encaminha pro executivo humano (João Paim) o contato de alguém interessado em SER VENDEDOR/trabalhar ' +
      'com a empresa — principalmente quem chegou pelo anúncio do Meta/Instagram ("Anúncio do Instagram", ' +
      'saudação automática tipo "Obrigado pelo seu interesse em trabalhar conosco"). Chame só quando o assunto ' +
      'for claramente "quero ser vendedor/trabalhar com vocês/como faço pra revender", não pra dúvida genérica ' +
      'de cliente comprador.',
    input_schema: {
      type: 'object',
      properties: {
        resumo: {
          type: 'string',
          description: 'Resumo curto (1-2 frases) do que a pessoa disse/perguntou, pro executivo ter contexto.',
        },
        nome: { type: 'string', description: 'Nome da pessoa, se ela já disse.' },
      },
      required: ['resumo'],
    },
    executar: async (input, ctx) => {
      const mensagem = `🟢 Lead de vendedor (via anúncio Meta/Instagram)\n` +
        `Telefone: ${ctx.remetente}${input?.nome ? `\nNome: ${input.nome}` : ''}\n` +
        `Resumo: ${input?.resumo || '(sem resumo)'}`;
      try {
        await enviarWhatsApp(EXECUTIVO_VENDEDOR_PHONE, mensagem);
        return { encaminhado: true };
      } catch (e) {
        return { encaminhado: false, erro: String((e as Error)?.message || e) };
      }
    },
  },
];

// Slack — registro paralelo de toda solicitação/decisão da Heloim, igual fazia no Base44
// antigo. Best-effort: falha aqui NUNCA derruba a resposta pro WhatsApp — o registro em
// heloim_solicitacoes já é a fonte de verdade auditável, o Slack é conveniência extra.
type ResultadoSlack = { ok: boolean; status: number | null; corpo: string };

async function postarNoSlack(texto: string): Promise<ResultadoSlack> {
  if (!SLACK_WEBHOOK_URL) {
    // Antes daqui saía um `return` seco, sem log nenhum. Visto de fora era idêntico a
    // "o Slack está ligado e ninguém pediu nada" — e foi exatamente o que aconteceu: o
    // canal ficou sem uma linha de 18/08/2026 (última postagem do agente do Base44 antigo)
    // até 27/08/2026, e ninguém descobriu que o secret nunca tinha sido criado. Agora fala.
    console.warn(
      '[whatsapp-router] tinha registro pra publicar no Slack, mas SLACK_WEBHOOK_URL não está ' +
      'configurada — nada foi pro canal. Configure o secret no Supabase (ver DEPLOY.md, seção 2).'
    );
    return { ok: false, status: null, corpo: 'SLACK_WEBHOOK_URL não configurada' };
  }
  try {
    const r = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: texto }),
    });
    const corpo = await r.text().catch(() => '');
    if (!r.ok) console.error('[whatsapp-router] Slack recusou o post:', r.status, corpo);
    else console.log('[whatsapp-router] registro publicado no Slack.');
    return { ok: r.ok, status: r.status, corpo };
  } catch (e) {
    console.error('[whatsapp-router] falha ao postar no Slack (segue sem registrar lá):', e);
    return { ok: false, status: null, corpo: String((e as Error)?.message || e) };
  }
}

const EMOJI_RISCO: Record<string, string> = { baixo: '🟢', medio: '🟡', alto: '🔴' };

const TOOLS_HELOIM: ToolDef[] = [
  {
    name: 'vendas_hoje',
    description: 'Total e quantidade de vendas pagas hoje (desde 00:00 UTC).',
    input_schema: { type: 'object', properties: {} },
    executar: async () => {
      const hoje = new Date();
      hoje.setUTCHours(0, 0, 0, 0);
      const r = await sbRest(`catalog_sales?select=total_amount&status=eq.paid&created_at=gte.${hoje.toISOString()}`);
      const rows = await r.json().catch(() => []);
      const lista = Array.isArray(rows) ? rows : [];
      const total = lista.reduce((s: number, x: any) => s + Number(x.total_amount || 0), 0);
      return { quantidade: lista.length, total_amount: Math.round(total * 100) / 100 };
    },
  },
  {
    name: 'produtos_sem_estoque',
    description: 'Quantidade e amostra de produtos publicados na loja com quantity zerada ou negativa.',
    input_schema: { type: 'object', properties: {} },
    executar: async () => {
      const r = await sbRest(`products?select=id,description,quantity&catalog_active=eq.true&quantity=lte.0&limit=10`);
      const rows = await r.json().catch(() => []);
      const rc = await sbRest(`products?select=id&catalog_active=eq.true&quantity=lte.0`, {
        headers: { Prefer: 'count=exact', Range: '0-0' },
      });
      const total = rc.headers.get('content-range')?.split('/')?.[1] || String((Array.isArray(rows) ? rows : []).length);
      return { total: Number(total) || 0, amostra: Array.isArray(rows) ? rows : [] };
    },
  },
  {
    name: 'pedidos_pendentes_envio',
    description: 'Amostra de pedidos pagos que ainda estão aguardando envio (fulfillment_status = a_enviar).',
    input_schema: { type: 'object', properties: {} },
    executar: async () => {
      const r = await sbRest(
        `catalog_sales?select=id,product_title,buyer_name,created_at&fulfillment_status=eq.a_enviar&order=created_at.asc&limit=10`
      );
      const rows = await r.json().catch(() => []);
      return { amostra: Array.isArray(rows) ? rows : [] };
    },
  },
  {
    name: 'resumo_carteiras',
    description: 'Soma total de saldo disponível e reservado de todos os clientes (dinheiro parado no sistema).',
    input_schema: { type: 'object', properties: {} },
    executar: async () => {
      const r = await sbRest(`app_users?select=saldo_disponivel,saldo_reservado&or=(saldo_disponivel.gt.0,saldo_reservado.gt.0)`);
      const rows = await r.json().catch(() => []);
      const lista = Array.isArray(rows) ? rows : [];
      const disp = lista.reduce((s: number, x: any) => s + Number(x.saldo_disponivel || 0), 0);
      const res = lista.reduce((s: number, x: any) => s + Number(x.saldo_reservado || 0), 0);
      return { saldo_disponivel_total: Math.round(disp * 100) / 100, saldo_reservado_total: Math.round(res * 100) / 100 };
    },
  },
  {
    name: 'registrar_solicitacao',
    description:
      'Registra um pedido de alteração de sistema (feito por qualquer participante do grupo) com sua classificação ' +
      'de risco. Use SEMPRE que alguém pedir uma mudança estrutural/técnica em grupo — nunca execute nada sozinha, ' +
      'só classifica, registra e aguarda autorização de um admin (Luiz ou Ávila).',
    input_schema: {
      type: 'object',
      properties: {
        descricao: { type: 'string', description: 'O que foi pedido, resumido em 1-2 frases.' },
        risco: {
          type: 'string',
          enum: ['baixo', 'medio', 'alto'],
          description: 'baixo = cosmético/texto/config sem risco; medio = afeta fluxo mas não mexe em dinheiro; ' +
            'alto = toca pagamento/comissão/saldo/estoque/autenticação (mesma régua 🔴 zona vermelha do projeto).',
        },
        pontos_atencao: { type: 'string', description: 'Riscos específicos identificados (colisão de código, link quebrando, etc), se houver.' },
      },
      required: ['descricao', 'risco'],
    },
    executar: async (input, ctx) => {
      const r = await sbRest('heloim_solicitacoes', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          grupo_id: ctx.grupoId,
          grupo_nome: ctx.grupoNome,
          solicitante_nome: ctx.remetenteNome,
          solicitante_telefone: ctx.remetente,
          descricao: input.descricao,
          risco: input.risco,
          pontos_atencao: input.pontos_atencao ?? null,
        }),
      });
      const rows = await r.json().catch(() => []);
      const solicitacao = Array.isArray(rows) ? rows[0] : null;
      if (!solicitacao) return { registrado: false, erro: 'falha ao gravar' };

      const emoji = EMOJI_RISCO[input.risco] || '⚪';
      const quem = ctx.remetenteNome || ctx.remetente;
      await postarNoSlack(
        `${emoji} *Nova solicitação #${solicitacao.id}* — risco ${input.risco}\n` +
        `*Pedido:* ${input.descricao}\n` +
        (input.pontos_atencao ? `*Pontos de atenção:* ${input.pontos_atencao}\n` : '') +
        `*De:* ${quem}${ctx.grupoNome ? ` (grupo ${ctx.grupoNome})` : ''}\n` +
        `*Status:* aguardando autorização`
      );

      // Se quem pediu NÃO é admin, avisa os admins direto — não dá pra contar só com alguém
      // estar olhando o grupo naquele instante.
      if (!ehAdmin(ctx.remetente)) {
        for (const admin of ADMIN_PHONE_NUMBERS) {
          enviarWhatsApp(
            admin,
            `${emoji} Nova solicitação de ${quem}${ctx.grupoNome ? ` no grupo ${ctx.grupoNome}` : ''} (#${solicitacao.id}):\n` +
            `"${input.descricao}"\nRisco: ${input.risco}.${input.pontos_atencao ? ` Atenção: ${input.pontos_atencao}.` : ''}\n` +
            `Me diga se aprova ou rejeita.`
          ).catch((e) => console.error('[whatsapp-router] falha ao avisar admin da solicitação:', e));
        }
      }

      return { registrado: true, id: solicitacao.id };
    },
  },
  {
    name: 'aprovar_solicitacao',
    description: 'Aprova uma solicitação pendente (só funciona se quem está falando é um admin — Luiz ou Ávila).',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'number', description: 'ID da solicitação (veio de registrar_solicitacao ou listar_solicitacoes_pendentes).' } },
      required: ['id'],
    },
    executar: async (input, ctx) => {
      if (!ehAdmin(ctx.remetente)) return { aprovado: false, erro: 'só um admin pode aprovar' };
      const r = await sbRest(`heloim_solicitacoes?id=eq.${Number(input.id)}&status=eq.pendente`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ status: 'aprovada', decidido_por: ctx.remetenteNome || ctx.remetente, decidido_em: new Date().toISOString() }),
      });
      const rows = await r.json().catch(() => []);
      const solicitacao = Array.isArray(rows) ? rows[0] : null;
      if (!solicitacao) return { aprovado: false, erro: 'não encontrada, ou já tinha sido decidida antes' };
      await postarNoSlack(`✅ *Solicitação #${solicitacao.id} aprovada* por ${ctx.remetenteNome || ctx.remetente}\n*Pedido:* ${solicitacao.descricao}`);
      return { aprovado: true, id: solicitacao.id };
    },
  },
  {
    name: 'rejeitar_solicitacao',
    description: 'Rejeita uma solicitação pendente (só funciona se quem está falando é um admin — Luiz ou Ávila).',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'ID da solicitação.' },
        motivo: { type: 'string', description: 'Motivo da rejeição, se o admin disser.' },
      },
      required: ['id'],
    },
    executar: async (input, ctx) => {
      if (!ehAdmin(ctx.remetente)) return { rejeitado: false, erro: 'só um admin pode rejeitar' };
      const r = await sbRest(`heloim_solicitacoes?id=eq.${Number(input.id)}&status=eq.pendente`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ status: 'rejeitada', decidido_por: ctx.remetenteNome || ctx.remetente, decidido_em: new Date().toISOString() }),
      });
      const rows = await r.json().catch(() => []);
      const solicitacao = Array.isArray(rows) ? rows[0] : null;
      if (!solicitacao) return { rejeitado: false, erro: 'não encontrada, ou já tinha sido decidida antes' };
      await postarNoSlack(`⛔ *Solicitação #${solicitacao.id} rejeitada* por ${ctx.remetenteNome || ctx.remetente}${input.motivo ? `\n*Motivo:* ${input.motivo}` : ''}\n*Pedido:* ${solicitacao.descricao}`);
      return { rejeitado: true, id: solicitacao.id };
    },
  },
  {
    name: 'checar_slack',
    description:
      'Diagnóstico da ligação com o Slack. Diz se o webhook do canal está configurado e, se estiver, ' +
      'publica uma mensagem de teste e devolve o que o Slack respondeu. Use quando alguém disser que ' +
      'o Slack parou de receber os registros, ou perguntar se o Slack está funcionando. Só admin.',
    input_schema: { type: 'object', properties: {} },
    executar: async (_input, ctx) => {
      if (!ehAdmin(ctx.remetente)) return { ok: false, erro: 'só um admin pode testar o Slack' };
      if (!SLACK_WEBHOOK_URL) {
        return {
          ok: false,
          configurado: false,
          diagnostico:
            'O secret SLACK_WEBHOOK_URL não existe no Supabase. Sem ele nada é publicado no canal e ' +
            'nenhum erro aparece — fica silencioso. Precisa criar um Incoming Webhook apontando pro ' +
            'canal e rodar "supabase secrets set SLACK_WEBHOOK_URL=..." (passo a passo no DEPLOY.md).',
        };
      }
      const r = await postarNoSlack(
        `🔎 Teste de ligação com o Slack pedido por ${ctx.remetenteNome || ctx.remetente}. ` +
        'Se você está lendo isto no canal, o webhook está funcionando.'
      );
      return {
        ok: r.ok,
        configurado: true,
        status: r.status,
        resposta_do_slack: r.corpo,
        diagnostico: r.ok
          ? 'Mensagem de teste publicada — confira o canal.'
          : 'O webhook está configurado, mas o Slack recusou. Normalmente é webhook revogado, ' +
            'app removido do canal, ou URL colada pela metade.',
      };
    },
  },
  {
    name: 'listar_solicitacoes_pendentes',
    description: 'Lista as solicitações ainda aguardando decisão de um admin (até 10, mais recentes primeiro).',
    input_schema: { type: 'object', properties: {} },
    executar: async () => {
      const r = await sbRest(`heloim_solicitacoes?select=id,descricao,risco,pontos_atencao,solicitante_nome,grupo_nome,created_at&status=eq.pendente&order=created_at.desc&limit=10`);
      const rows = await r.json().catch(() => []);
      return { pendentes: Array.isArray(rows) ? rows : [] };
    },
  },
];

async function buscarClienteCompletoPorTelefone(remetente: string): Promise<any | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const ultimos8 = ultimosDigitos(remetente, 8);
    const r = await sbRest(`app_users?select=full_name,email,saldo_disponivel,saldo_reservado&phone=ilike.*${ultimos8}*&limit=1`);
    if (!r.ok) return null;
    const rows = await r.json().catch(() => []);
    return Array.isArray(rows) ? rows[0] || null : null;
  } catch (e) {
    console.error('[whatsapp-router] falha ao consultar cliente completo:', e);
    return null;
  }
}

// ============================================================================
// System prompts
// ============================================================================
// Heloim volta a operar em grupo (22/08/2026, ver heloim_solicitacoes) — reconstrução do papel
// que ela tinha no Base44 antigo (recurso nativo da plataforma, sem código versionado). Igual
// lá: recolhe pedido de QUALQUER participante do grupo, classifica risco, registra (banco +
// Slack) e aguarda autorização de um admin — nunca executa a mudança sozinha.
function montarSystemPromptHeloim(ctx: {
  emGrupo: boolean;
  grupoNome: string | null;
  remetenteEhAdmin: boolean;
  remetenteNome: string | null;
}): string {
  const admins = ADMIN_PHONE_NUMBERS.length ? 'Luiz e Ávila' : '(nenhum admin configurado)';

  const contextoCanal = ctx.emGrupo
    ? `\n\nVocê está respondendo DENTRO DO GRUPO "${ctx.grupoNome || '(sem nome)'}" — quem mandou a última mensagem foi ` +
      `${ctx.remetenteNome || 'alguém do grupo'}${ctx.remetenteEhAdmin ? ' (é admin — pode aprovar/rejeitar direto)' : ' (NÃO é admin — só pode pedir, não aprovar/rejeitar nada)'}.` +
      `\n\nNo grupo, o pessoal chama esse número de "Zeca" — é o mesmo número que atende cliente ` +
      `como Zeca no 1:1. Se te chamarem assim, é com você mesma: responda normal, sem corrigir ` +
      `o nome e sem explicar que são personas diferentes.` +
      `\n\nVocê só está vendo esta mensagem porque foi CHAMADA (pelo nome, por marcação, por ` +
      `resposta a uma mensagem sua, ou porque já estava conversando com essa pessoa). O resto ` +
      `da conversa do grupo passa sem você. Então responda o que foi pedido e pare — não ` +
      `comente conversa alheia, não puxe assunto, não peça pra te chamarem de novo.`
    : `\n\nVocê está numa conversa 1:1 com ${ctx.remetenteNome || 'um admin'} (admin confirmado).`;

  return `Você é a Heloim, assistente técnica de TI do Leilão NoZap. Responde direto por ${admins}
e, em grupos autorizados, por qualquer participante — mas só um admin pode AUTORIZAR mudança.

Tom: técnico, direto, sem enrolação. Resposta curta de WhatsApp — 2 a 5 linhas; lista só
quando o dado pedido é uma lista.

Print, foto e PDF você ENXERGA de verdade — o arquivo chega junto da mensagem. Print de erro
do sistema, log em imagem, PDF de relatório: leia e trabalhe em cima do que está ali, não peça
pra transcreverem. Se vier "[aviso: ...]" na mensagem, o arquivo não pôde ser aberto — peça
print ou PDF.

Suas tools de CONSULTA (só leitura, dado real do sistema): vendas_hoje, produtos_sem_estoque,
pedidos_pendentes_envio, resumo_carteiras. Sempre que usar uma, cite o número exato que ela
devolveu — nunca arredonde, estime ou invente.

Suas tools de SOLICITAÇÃO (pedido de mudança de sistema — não confundir com as de consulta):
- registrar_solicitacao: quando ALGUÉM (admin ou não) pedir uma alteração estrutural/técnica.
  Classifique o risco você mesma ANTES de chamar a tool, usando a régua do próprio projeto:
  🔴 alto = toca pagamento, comissão, saldo ou estoque; 🟡 médio = afeta fluxo mas não mexe em
  dinheiro; 🟢 baixo = cosmético, texto, config sem risco. Aponte pontos de atenção concretos
  se enxergar algum (ex: "pode quebrar link antigo", "colide com outra mudança em andamento").
  Depois de registrar, informe a pessoa que ficou registrado e está aguardando autorização —
  NUNCA diga que já fez ou vai fazer a mudança. Você NUNCA executa a mudança sozinha, sempre
  fica só na classificação + registro.
- aprovar_solicitacao / rejeitar_solicitacao: só funcionam se quem pediu pra você é um admin —
  a tool confere isso sozinha e recusa se não for, mas não ofereça essa ação pra quem você já
  sabe que não é admin (ver contexto do canal abaixo).
- listar_solicitacoes_pendentes: quando um admin quiser ver o que está esperando decisão.

Você NUNCA finge que executou uma ação que não tem tool pra fazer (pausar leilão, reprocessar
pedido, mexer em saldo direto, etc.) — isso continua fora do seu alcance, sempre foi só
classificar/registrar/reportar, quem executa de fato é humano depois de autorizado.${contextoCanal}`;
}

// Conhecimento parado sobre a plataforma e a carreira de revenda — atualizado em 22/08/2026
// com base em docs/DOCUMENTO-OFICIAL-PLANO-CARREIRA.md, o documento interno marcado como
// "fonte de verdade absoluta" pro time técnico (transcrição da apresentação oficial de
// negócio entregue pelo dono em 04/08/2026, validada seção 10 do documento: "motor de
// comissão 100% alinhado ao documento oficial, zero alteração necessária"). Todos os valores
// abaixo são CONFIRMADOS por essa fonte — pode afirmar com confiança.
const CONHECIMENTO_PROGRAMAS = `
Como funciona a plataforma:
- Leilão: deposita na Carteira Digital (PIX), o lance reserva valor+frete; se for superado,
  volta tudo + bônus de 10% pra usar na Loja Virtual; se arrematar, o valor reservado paga o
  produto, sem cobrança extra. Indicou quem arrematou? Ganha 5% do valor do produto (sem
  frete), pago na hora do martelo.
- Loja Virtual: venda direta por catálogo, sem dinâmica de lance.
- Produtos vêm de devolução de 7 dias (até 80% off da fábrica, revendido até 60% off do
  mercado — margem até 100%) ou direto de fábrica (6.500+ produtos novos, sem intermediário).
  Entrega no mesmo dia em todo o RJ (pedido até 19h devolução / 11h fábrica).

Carreira de revenda — tabela oficial de comissão por venda direta (todo cargo pago tem
suporte de um executivo de contas dedicado):

| Cargo | Adesão (vira crédito em produtos) | Comissão venda direta | Nome comercial |
|---|---|---|---|
| Influenciador (= "Financiador", mesmo cargo) | Grátis | 5% | — |
| Vendedor | R$ 1.497 | 10% | — |
| Licenciado | R$ 5.000 | 13% | Loja Inicial |
| Parceiro | R$ 20.000 | 15% | Loja Start |
| Ponto de Retirada | R$ 50.000 | 16% | Loja Profissional |
| Loja Física | R$ 350.000 | 19% | Loja Líder |
| Distribuidor | R$ 4.000.000 | 20% | Loja Distribuidor |

Como o rebate funciona (se perguntarem por que vale a pena subir de nível): quem vende
recebe o % cheio do próprio cargo; cada nível acima na cadeia de quem cadastrou recebe a
DIFERENÇA até fechar o teto de 20% — ninguém "perde" comissão de ninguém, é uma cadeia que
soma até 20% no total. Hierarquia de quem cadastra quem: Distribuidor cadastra tudo abaixo;
Loja Física cadastra Ponto de Retirada pra baixo; e assim sucessivamente até Vendedor, que só
cadastra Influenciador. Influenciador não cadastra ninguém (ponta da rede). Vendedor não se
autocadastra — precisa ser cadastrado por um Licenciado ou superior.

Cargos de topo (trainee, sócio executivo, diretoria, CEO, embaixador, conselheiro, fundador):
são posições institucionais por convite, ligadas a uma fatia separada de 10% — NÃO é adesão
aberta pro público, nunca ofereça isso pra cliente comum nem cite valor.

Fechamento: você pode CONVERSAR e informar os números acima com confiança pra qualquer nível
— mas quem finaliza cadastro/pagamento de Parceiro pra cima é sempre um humano (chame
encaminhar_lead_vendedor). Vendedor e Licenciado o próprio cliente consegue fechar sozinho
pela plataforma, com seu apoio.

"Parceiro de Compra" (programa de investidor — DIFERENTE do "Parceiro" da carreira acima,
mesmo nome, produto diferente): captação privada, só pra quem já está logado e aceitou termo
de confidencialidade. NUNCA cite valor de aporte/retorno — é proibido até na página oficial.
Se perguntarem, direcione pra pedir acesso pela plataforma — não é conversa de bot.

Antifraude: sempre que a conversa for sair da plataforma (pagamento fora, PIX direto pra
pessoa), lembre que só se paga dentro da plataforma — nunca fora.`;

// Método DISC — pedido explícito do dono: Zeca precisa ler o PERFIL COMPORTAMENTAL de quem
// está falando com ele (pelo jeito de escrever, não por pergunta direta) e ajustar o próprio
// tom em cima disso, igual um vendedor de alta performance de verdade faria numa loja física.
const FRAMEWORK_DISC = `
Perfil comportamental (DISC) — leia nas ENTRELINHAS de como a pessoa fala com você, nunca
pergunte "qual seu perfil" diretamente:
- D (Dominante): manda áudio, mensagem curta e direta, vai reto ao "quanto custa"/"como faço
  pra começar", tem pressa, não gosta de rodeio. Responda rápido, direto ao ponto, sem
  explicação longa antes do que ele pediu — decisão primeiro, detalhe se ele pedir.
- I (Influente): tom caloroso, emojis, conta um pouco de si, gosta de trocar ideia antes de
  ir ao assunto. Responda com energia parecida, seja simpático e humano, mas não perca o fio
  da venda no meio da conversa social.
- S (Estável): mensagens mais devagar, cautelosas, pode repetir pergunta pra ter certeza,
  não gosta de pressão. Vá com calma, reforce segurança e confiança, nunca empurre decisão
  rápida — dê tempo.
- C (Consciencioso): pede documento, print, detalhe técnico, número exato, quer entender a
  regra antes de agir. Responda com precisão, cite os números reais que as tools trouxerem,
  não enrole com "história de venda" — ele quer fato.
Isso é leitura de tom, não regra fixa — se o sinal for misto, vá pelo que a última mensagem
mostrar mais forte. Nunca mencione "DISC" pro cliente, é ferramenta sua, não conversa.`;

function montarSystemPromptZeca(cliente: { nome?: string } | null): string {
  const contexto = cliente?.nome
    ? `\n\nContexto: este número já é cliente cadastrado (${cliente.nome}). Trate com familiaridade, sem precisar pedir dados básicos de novo.`
    : '';
  return `Você é o Zeca — executivo de vendas de alta performance do Leilão NoZap, atendendo
pelo WhatsApp. Você não é um FAQ automático: é o melhor vendedor da empresa, só que
disponível 24h. Fala com confiança, traz solução, nunca deixa o cliente sem resposta.

Tom base: consultivo, brasileiro, direto, sem formalidade excessiva — mas ajustado pelo
perfil de quem está do outro lado (ver framework DISC abaixo).

TAMANHO DA RESPOSTA — regra dura, vale acima de qualquer outra instrução daqui:
Isto é WhatsApp, não e-mail. Texto comprido faz o cliente parar de ler e some com a venda.
- 2 a 4 linhas por mensagem. Só passe disso se ele pediu explicitamente uma lista/comparação
  (ex: "me manda os leilões abertos"), e mesmo aí no máximo 5 itens de uma linha cada.
- UMA ideia por mensagem e no máximo UMA pergunta no fim. Nunca dispare duas ou três
  perguntas juntas.
- Corte o que não muda a decisão dele: não repita o que ele acabou de dizer, não resuma o que
  você mesmo já falou, não explique regra que ele não perguntou, não antecipe passo 3 quando
  ele ainda está no passo 1.
- Sem saudação a cada mensagem, sem se reapresentar, sem despedida formal, sem "espero ter
  ajudado", sem emoji em fileira.
- Sem bullet, sem negrito, sem título de seção na conversa normal — gente não escreve assim
  no zap. Frase corrida.
- Quando tiver DUAS coisas a dizer (ex: a resposta e o próximo passo), separe com uma linha
  em branco. Cada bloco vira uma mensagem separada no WhatsApp, com pausa entre elas — é
  assim que gente escreve. Não force: se é uma coisa só, mande num bloco só.
- Não jogue a tabela de comissões/níveis inteira de uma vez. Responda o nível que ele
  perguntou e ofereça o resto se ele quiser.
${FRAMEWORK_DISC}

Seu papel: explicar como funcionam os leilões, o catálogo de produtos, o programa Rank
Premiado, o programa Vendedor e os demais níveis de carreira, ajudar quem ainda não é
cadastrado a se cadastrar, e usar suas tools pra responder com dado real:
- consultar_saldo — saldo disponível/reservado do número que está falando agora.
- consultar_pedidos — pedidos recentes desse mesmo número.
- consultar_leiloes_ativos — leilões abertos agora, com preço atual e horário de encerramento.
- encaminhar_lead_vendedor — usa isso pra mandar contato de quem quer SER vendedor pro executivo.
${CONHECIMENTO_PROGRAMAS}

Lead de vendedor vindo de anúncio (importante, pedido direto do dono):
Muita gente chega pelo anúncio do Meta/Instagram já perguntando sobre trabalhar/vender —
o sinal mais claro é a saudação automática padrão do anúncio (algo como "Anúncio do
Instagram... Obrigado pelo seu interesse em trabalhar conosco") aparecendo antes da primeira
mensagem da pessoa, ou ela mesma dizendo que viu o anúncio e quer ser vendedora/revender.
Nesses casos, converse normalmente pra entender o que ela busca — pode informar valores e
comissão de qualquer nível com confiança (ver tabela acima) — e chame a tool
encaminhar_lead_vendedor com um resumo curto assim que ficar claro que ela quer entrar. O
executivo (João Paim) vai entrar em contato direto pra fechar o cadastro; avise a pessoa que
você já está conectando ela com alguém do time.

Como conversar (conversa humanizada de verdade, não robótica):
- NUNCA manda um link seco, sem contexto. Antes de mandar link de produto/catálogo, descreve
  em 1 frase o que é e por que faz sentido pra essa pessoa — o link vem junto da explicação,
  não sozinho, e não em sequência de vários links de uma vez.
- Se o cliente mandar PRINT, FOTO ou PDF, você ENXERGA o arquivo de verdade — ele vem junto
  da mensagem. Leia o que está na tela e resolva a partir dali: print de erro (leia a mensagem
  de erro e diga o que fazer), comprovante de PIX (confira valor e data no comprovante), foto
  de produto, PDF de catálogo/documento. Nunca peça pro cliente digitar o que já está na
  imagem, e nunca invente conteúdo que você não conseguiu ler — se estiver ilegível ou
  cortado, diga o que faltou e peça um print melhor. Se vier "[aviso: ...]" na mensagem, é
  porque o arquivo não pôde ser aberto — aí sim peça print ou PDF, com naturalidade.
- Se o cliente mandar ÁUDIO, você recebe a mensagem já transcrita (marcada "[mensagem por
  áudio, transcrita]") — responda o conteúdo normalmente, como se fosse texto. Só quando vier
  marcada "sem transcrição disponível" (raro — falha pontual) é que você reconhece que
  recebeu o áudio e pede o essencial por texto, sem fingir que entendeu.
- Não interrogue o cliente com pergunta atrás de pergunta. Responda o que ele perguntou
  primeiro, aí sim conduza a conversa adiante.
- Tenha iniciativa: se perceber uma oportunidade real (ele gostou de um leilão, perguntou
  de novo sobre o programa Vendedor), traga o próximo passo você mesmo — não espere ele
  perguntar "e agora, o que eu faço".

Regras (não mudam com o tom, são segurança do negócio):
- Você só tem acesso a dado do número que está falando com você agora — nunca inclui, nem
  simula, dado de outro cliente.
- Se uma tool disser "não encontrado", diga isso com naturalidade e ofereça ajuda pra fazer
  o primeiro cadastro/compra — não insista tentando de novo.
- Sempre que usar uma tool, cite o número real que ela devolveu — nunca arredonde, estime
  ou invente um valor por conta própria.
- Pra dado que nenhuma tool cobre (estoque de um produto específico, por exemplo), diga que
  vai encaminhar — nunca invente.
- Se a pergunta for sobre algo fora do que você resolve (reclamação grave, problema de
  pagamento não resolvido, pedido de reembolso), diga que vai encaminhar para um humano —
  não tente resolver sozinho.${contexto}`;
}

// ============================================================================
// Claude — loop de tool use via Messages API (fetch cru, sem SDK).
// ============================================================================
async function chamarClaude(system: string, messages: any[], tools: ToolDef[]) {
  const body = {
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system,
    messages,
    ...(tools.length
      ? { tools: tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema })) }
      : {}),
  };
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${j?.error?.message || JSON.stringify(j)}`);
  return j;
}

async function responderComAgente(
  systemPrompt: string,
  tools: ToolDef[],
  historico: Turno[],
  // string pura na conversa normal; array de blocos quando veio imagem/PDF junto (ver blocosDeMidia)
  mensagemUsuario: string | any[],
  ctx: ToolCtx
): Promise<string> {
  const messages: any[] = [
    ...historico.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: mensagemUsuario },
  ];

  const toolsPorNome = Object.fromEntries(tools.map((t) => [t.name, t]));
  const MAX_RODADAS_TOOL = 4;

  for (let rodada = 0; rodada < MAX_RODADAS_TOOL; rodada++) {
    const resp = await chamarClaude(systemPrompt, messages, tools);

    if (resp.stop_reason !== 'tool_use') {
      const textoFinal = (resp.content || [])
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('\n')
        .trim();
      return textoFinal || 'Desculpa, não consegui montar uma resposta agora. Pode repetir?';
    }

    // A Claude pediu tool(s) — executa cada uma e devolve o resultado na próxima rodada.
    messages.push({ role: 'assistant', content: resp.content });
    const toolResults = [];
    for (const bloco of resp.content) {
      if (bloco.type !== 'tool_use') continue;
      const tool = toolsPorNome[bloco.name];
      let resultado: unknown;
      try {
        resultado = tool ? await tool.executar(bloco.input, ctx) : { erro: 'tool desconhecida' };
      } catch (e) {
        resultado = { erro: String((e as Error)?.message || e) };
      }
      toolResults.push({ type: 'tool_result', tool_use_id: bloco.id, content: JSON.stringify(resultado) });
    }
    messages.push({ role: 'user', content: toolResults });
  }

  return 'Isso está exigindo mais consultas do que eu consigo fazer de uma vez — tenta reformular em uma pergunta mais direta?';
}

// ============================================================================
// Z-API — envio da resposta de volta pro WhatsApp. Autenticação por URL (instance id +
// token no path), mais o header Client-Token se a "Segurança da conta" estiver ativada.
//
// ⚠️ O Z-API pode devolver HTTP 200 com um erro DENTRO do corpo (ex: número inválido,
// não é WhatsApp) — status HTTP sozinho não prova que a mensagem foi aceita de verdade.
// Por isso sempre loga o corpo da resposta (sucesso ou erro) e trata `body.error`/
// `body.value === false` como falha mesmo com 200 — descoberto num teste real em que a
// function respondeu success:true e nada chegou no WhatsApp.
// ============================================================================
// "Digitando…" antes de entregar — sem isso a resposta aparece de golpe, o que não é como
// gente de verdade conversa (pedido explícito: "não pode ficar de qualquer maneira, tem que
// ter conversa humanizada"). Z-API mostra a bolinha por `delayTyping` segundos antes de
// entregar a mensagem. Escala pelo tamanho do texto (resposta curta = digitando rápido,
// resposta longa = digitando mais) — teto de 15s é o máximo que o Z-API aceita.
function delayTypingPara(texto: string): number {
  return Math.max(2, Math.min(15, Math.round(texto.length / 25)));
}

/**
 * Manda a resposta como uma pessoa manda: em pedaços, com pausa entre eles, cada um com o
 * "digitando…" proporcional ao tamanho. Um parágrafo só continua sendo uma mensagem só.
 */
async function enviarWhatsApp(telefone: string, texto: string) {
  const pedacos = pedacosDaResposta(texto);
  for (let i = 0; i < pedacos.length; i++) {
    if (i > 0) await dormir(PAUSA_ENTRE_PEDACOS_MS);
    await enviarUmaMensagem(telefone, pedacos[i]);
  }
}

async function enviarUmaMensagem(telefone: string, texto: string) {
  const url = `${ZAPI_BASE_URL}/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (ZAPI_CLIENT_TOKEN) headers['Client-Token'] = ZAPI_CLIENT_TOKEN;

  // ID de grupo (formato "120363...-group") NÃO pode passar por apenasDigitos() — o hífen faz
  // parte do ID, tirar ele quebra o envio pro grupo. Só número de telefone é "só dígitos".
  const destino = telefone.includes('-group') ? telefone : apenasDigitos(telefone);

  const r = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ phone: destino, message: texto, delayTyping: delayTypingPara(texto) }),
  });
  const corpoTexto = await r.text().catch(() => '');
  let corpo: any = null;
  try { corpo = JSON.parse(corpoTexto); } catch { /* corpo não era JSON — segue com corpoTexto bruto */ }

  console.log('[whatsapp-router] resposta do Z-API ao enviar:', r.status, corpoTexto.slice(0, 500));

  if (!r.ok) throw new Error(`Z-API ${r.status} ao enviar resposta: ${corpoTexto}`);
  if (corpo && (corpo.error || corpo.value === false)) {
    throw new Error(`Z-API recusou o envio (HTTP 200, mas corpo indica falha): ${corpoTexto}`);
  }

  // Guarda o ID do que acabamos de mandar — é o que permite reconhecer, mais tarde, que
  // alguém RESPONDEU (reply) uma mensagem nossa no grupo (ver respondeuOBot). O send-text do
  // Z-API devolve `zaapId` + `messageId`; é o `messageId` que volta em `referenceMessageId`
  // na mensagem de quem respondeu. Os outros dois nomes ficam de rede de segurança.
  const idEnviado = corpo?.messageId ?? corpo?.id ?? corpo?.zaapId ?? null;
  if (idEnviado) await registrarMensagemDoBot(String(idEnviado));
}

// ============================================================================
// Processamento em segundo plano — a Claude + o envio pelo Z-API juntos passam de
// alguns segundos com facilidade. Descoberto em produção: se o webhook não recebe 200
// rápido, o Z-API reentrega a MESMA mensagem, a function roda de novo do zero, e o
// cliente recebe duas respostas (visto ao vivo: "como se tivesse recebido comandos em
// lugares diferentes"). Por isso agora só extrai/valida de forma síncrona e devolve 200
// IMEDIATAMENTE — Claude e Z-API rodam depois, em background, sem o Z-API esperando.
//
// Idempotência — descoberto em produção que responder rápido (acima) NÃO bastou: o
// Z-API reentrega o mesmo webhook de qualquer forma ("at-least-once delivery", comum em
// provedor de webhook, não necessariamente bug do lado deles). INSERT na tabela com
// message_id como primary key: primeira vez passa, reentrega bate na chave e falha —
// é exatamente esse "falhou" que usamos pra saber "já processei essa, pula".
// Sem messageId no payload (variante desconhecida do Z-API), processa mesmo assim — sem
// dedupe não tem outra opção segura, mas fica registrado em log pra investigar.
// ============================================================================
async function jaProcessada(messageId: string | null): Promise<boolean> {
  if (!messageId) {
    console.warn('[whatsapp-router] mensagem sem messageId no payload — sem como deduplicar esta.');
    return false;
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return false; // sem Supabase configurado, segue sem dedupe

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/wa_mensagens_processadas`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ message_id: messageId }),
    });
    // 201 = inseriu (primeira vez, segue o processamento). Conflito de primary key
    // (409, ou 400 dependendo da versão do PostgREST) = já tinha essa mensagem.
    if (r.status === 201) return false;
    if (r.status === 409 || r.status === 400) return true;
    console.warn('[whatsapp-router] resposta inesperada ao checar idempotência:', r.status, await r.text().catch(() => ''));
    return false; // inconclusivo — melhor processar de novo do que arriscar não responder ninguém
  } catch (e) {
    console.error('[whatsapp-router] falha ao checar idempotência (segue sem dedupe):', e);
    return false;
  }
}

async function processarMensagem(msg: MensagemExtraida) {
  try {
    // Se veio áudio com URL reconhecida, tenta transcrever ANTES de chamar a Claude — troca a
    // mensagem sintética ("sem transcrição disponível") pelo conteúdo real. Falha aqui nunca
    // derruba a conversa: sem sucesso, segue com o texto sintético mesmo (ver transcreverAudio).
    if (msg.audioUrl) {
      const transcricao = await transcreverAudio(msg.audioUrl, msg.audioMime);
      if (transcricao) msg = { ...msg, texto: `[mensagem por áudio, transcrita] ${transcricao}` };
      else if (msg.grupoId) {
        // Em grupo o gate é o texto — sem transcrição, um áudio dizendo "Zeca, ..." vira uma
        // frase sintética que não cita nome nenhum, e o bot fica calado achando que não foi
        // chamado. Continua calado de propósito (falar sem ser chamado é pior), mas agora
        // fica registrado: áudio silencioso em grupo é quase sempre transcrição quebrada.
        console.warn(
          '[whatsapp-router] áudio em grupo sem transcrição — o gate de "fui chamada?" não tem ' +
          'texto pra ler e a mensagem será ignorada. Confira OPENAI_API_KEY e os logs do Whisper.'
        );
      }
    }

    // Grupo autorizado = SEMPRE Heloim, não importa quem no grupo escreveu (ela é quem recolhe
    // pedido de qualquer participante; só quem é admin consegue aprovar/rejeitar — a tool que
    // faz isso confere ehAdmin() de novo por conta própria, não confia só nesta checagem).
    const admin = ehAdmin(msg.remetente);
    const emGrupo = !!msg.grupoId;
    const agente = emGrupo || admin ? 'heloim' : 'zeca';

    // 📣 Em grupo, só fala quando é chamada — ver heloimFoiChamada(). Sai ANTES de qualquer
    // custo: sem Claude, sem download de mídia, sem gravar memória, sem envio.
    if (emGrupo && !(await heloimFoiChamada(msg))) return;

    // 👀 Tique azul primeiro: gente lê a mensagem e SÓ ENTÃO começa a escrever.
    await marcarComoLida(msg.grupoId ?? msg.remetente, msg.messageId);

    // 👁️ Se veio print/foto/PDF, o arquivo vai junto da mensagem — a Claude enxerga de
    // verdade. Formato que ela não lê (docx, zip) vira aviso em texto pra ele pedir print.
    const { blocos, aviso } = await blocosDeMidia(msg);
    const textoParaClaude = aviso ? `${msg.texto}\n[aviso: ${aviso} — peça um print ou PDF]` : msg.texto;

    // A fala do cliente é gravada AGORA, antes de responder. É isso que permite agrupar:
    // se ele mandar mais um pedaço em seguida, aquela execução vai encontrar esta no
    // histórico e responder as duas de uma vez.
    const marca = await salvarTurno(msg.remetente, agente, 'user', textoParaClaude);

    // ⏳ Espera ele terminar de escrever. Só no 1:1 — no grupo a Heloim já tem o freio de
    // "só falo quando me chamam", e mexer no que está funcionando lá não vale o risco.
    if (!emGrupo && marca) {
      await dormir(JANELA_AGRUPAMENTO_MS);
      if (await chegouMensagemMaisNova(msg.remetente, agente, marca)) {
        console.log('[whatsapp-router] cliente ainda estava escrevendo — a próxima mensagem responde por esta.');
        return;
      }
    }

    const cliente = agente === 'zeca' ? await buscarClientePorTelefone(msg.remetente) : null;
    const systemPrompt = agente === 'heloim'
      ? montarSystemPromptHeloim({ emGrupo, grupoNome: msg.grupoNome, remetenteEhAdmin: admin, remetenteNome: msg.remetenteNome })
      : montarSystemPromptZeca(cliente);
    const tools = agente === 'heloim' ? TOOLS_HELOIM : TOOLS_ZECA;

    const ctx: ToolCtx = { remetente: msg.remetente, remetenteNome: msg.remetenteNome, grupoId: msg.grupoId, grupoNome: msg.grupoNome };

    // O histórico já inclui a fala que acabou de ser gravada — e as do lote, se ele
    // escreveu em pedaços. separarPendentes tira todas do fim e junta numa fala só.
    const historico = await carregarHistorico(msg.remetente, agente);
    const { anteriores, pendente } = separarPendentes(historico);
    const textoFinal = pendente || textoParaClaude; // banco fora do ar: segue com esta mensagem

    const conteudoUsuario = blocos.length
      ? [...blocos, { type: 'text', text: textoFinal }]
      : textoFinal;

    const resposta = await responderComAgente(systemPrompt, tools, anteriores, conteudoUsuario, ctx);

    await salvarTurno(msg.remetente, agente, 'assistant', resposta);

    // Em grupo, a resposta vai pro GRUPO (todo mundo vê a classificação/decisão) — não pro
    // DM de quem escreveu. Fora de grupo, comportamento de sempre: responde a quem escreveu.
    await enviarWhatsApp(msg.grupoId ?? msg.remetente, resposta);
  } catch (e) {
    console.error('[whatsapp-router] erro processando mensagem de', msg.remetente, ':', e);
  }
}

// ============================================================================
// Handler HTTP
// ============================================================================
Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ success: false, error: 'method not allowed' }, 405);

  if (!validarSeguranca(req, url)) {
    console.warn('[whatsapp-router] segredo do webhook inválido ou ausente — recusado.');
    return json({ success: false, error: 'unauthorized' }, 401);
  }

  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    console.error('[whatsapp-router] corpo do webhook não é JSON válido:', e);
    return json({ success: false, error: 'bad json' }, 400);
  }

  let msg: MensagemExtraida | null;
  try {
    msg = extrairMensagem(body);
  } catch (e) {
    console.error('[whatsapp-router] falha ao interpretar payload do Z-API:', e, JSON.stringify(body).slice(0, 500));
    return json({ success: false, error: 'payload inesperado' }, 200); // 200 pro Z-API não ficar reentregando
  }

  // Evento que não é mensagem de texto nova (status, eco do próprio bot, grupo, mídia
  // sem texto reconhecido etc.) — ignora sem erro, é tráfego normal do webhook.
  if (!msg) return json({ success: true, ignored: true });

  // Idempotência ANTES de responder — se já processamos esse messageId (reentrega do
  // Z-API), nem chega a agendar o background: devolve 200 e não faz nada de novo.
  if (await jaProcessada(msg.messageId)) {
    console.log('[whatsapp-router] mensagem duplicada (reentrega do Z-API), ignorando:', msg.messageId);
    return json({ success: true, duplicated: true });
  }

  // Responde já — o processamento de verdade continua depois, em background.
  // @ts-ignore — EdgeRuntime é global no runtime do Supabase Edge Functions (Deno Deploy), não no editor local.
  EdgeRuntime.waitUntil(processarMensagem(msg));

  return json({ success: true, queued: true });
});

// ============================================================================
// Deploy — ver o guia completo em supabase/functions/whatsapp-router/DEPLOY.md
// ============================================================================
