// whatsapp-router — expurgo Base44, etapa 1 (esqueleto).
//
// Cérebro/roteador único dos dois agentes de IA do WhatsApp: Zeca (SDR/atendimento,
// qualquer número) e Heloim (assistente de TI, só o admin). Os dois falam pelo MESMO
// número — quem decide qual responde é só o telefone de quem mandou a mensagem.
//
// Esta é a versão ENXUTA de propósito (v1 "por etapas"): recebe o webhook da Evolution
// API v2, roteia, chama a Claude com o system prompt certo, devolve a resposta. SEM
// tool-calling e SEM memória de conversa — cada mensagem é isolada. As duas coisas
// voltam numa etapa seguinte, em cima deste esqueleto já testado ponta a ponta.
//
// Deploy TEM que ser com --no-verify-jwt (Evolution API não manda Authorization: Bearer
// nenhum) — ver o guia de deploy que acompanha esta entrega.

// ============================================================================
// Env vars (secrets desta function — `supabase secrets set ...`)
// ============================================================================
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL')!;           // ex: https://evo.seudominio.com
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY')!;           // = AUTHENTICATION_API_KEY da Evolution
const EVOLUTION_INSTANCE_NAME = Deno.env.get('EVOLUTION_INSTANCE_NAME')!;
const ADMIN_PHONE_NUMBER = Deno.env.get('ADMIN_PHONE_NUMBER') || '';    // só dígitos, com DDI: 5511999999999
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') || '';            // opcional — ver validarSeguranca()

// Enriquecimento do Zeca é best-effort (ver buscarClientePorTelefone) — se estas duas
// faltarem, a function não quebra, só deixa de tentar consultar o cliente.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const CLAUDE_MODEL = 'claude-3-5-sonnet-latest';

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
// Segurança — header opcional `webhook-secret` (ou `apikey`, mesmo nome que a própria
// Evolution API usa pros clientes dela). Se WEBHOOK_SECRET não estiver configurado,
// não valida nada (comportamento de quem ainda está testando o primeiro deploy) — mas
// loga um aviso, porque isso não deveria ficar assim em produção.
// ============================================================================
function validarSeguranca(req: Request): boolean {
  if (!WEBHOOK_SECRET) {
    console.warn('[whatsapp-router] WEBHOOK_SECRET não configurado — endpoint sem validação de origem.');
    return true;
  }
  const recebido = req.headers.get('webhook-secret') || req.headers.get('apikey');
  return recebido === WEBHOOK_SECRET;
}

// ============================================================================
// Telefone — remoteJid/participant do WhatsApp vêm como "5511999999999@s.whatsapp.net"
// (DM) ou com sufixo @g.us (grupo) / @lid (dispositivo vinculado). Comparação por
// últimos dígitos: o 9º dígito do celular é inconsistente entre o que o WhatsApp manda
// e o que fica salvo em ADMIN_PHONE_NUMBER/app_users.phone.
// ============================================================================
function apenasDigitos(v: string | null | undefined): string {
  return (v || '').replace(/\D/g, '');
}

function ultimosDigitos(v: string | null | undefined, n = 10): string {
  return apenasDigitos(v).slice(-n);
}

function ehAdmin(remetente: string): boolean {
  if (!ADMIN_PHONE_NUMBER) return false; // sem admin configurado, ninguém vira Heloim — padrão seguro
  return ultimosDigitos(remetente) === ultimosDigitos(ADMIN_PHONE_NUMBER);
}

// ============================================================================
// Payload da Evolution API v2 — evento de mensagem recebida. O nome do evento varia
// de formatação conforme a versão/config (WEBHOOK_BY_EVENTS liga/desliga), então aceita
// tanto "messages.upsert" (o formato real do payload) quanto "MESSAGES_UPSERT".
// ============================================================================
function ehMensagemNova(evento: unknown): boolean {
  const e = String(evento || '').toUpperCase().replace(/\./g, '_');
  return e === 'MESSAGES_UPSERT';
}

type MensagemExtraida = {
  remoteJid: string;    // pra QUEM responder (o chat — grupo ou DM)
  remetente: string;    // QUEM mandou (participant em grupo, remoteJid em DM) — usado no roteamento
  texto: string;
};

function extrairMensagem(body: any): MensagemExtraida | null {
  if (!ehMensagemNova(body?.event)) return null;

  const data = body?.data;
  const fromMe = !!data?.key?.fromMe;
  if (fromMe) return null; // eco do que o próprio bot mandou — nunca processa, senão vira loop

  const remoteJid: string | undefined = data?.key?.remoteJid;
  const remetente: string | undefined = data?.key?.participant || data?.key?.remoteJid;
  if (!remoteJid || !remetente) return null;

  const texto: string | undefined = data?.message?.conversation || data?.message?.extendedTextMessage?.text;
  if (!texto || !texto.trim()) return null; // áudio, imagem, figurinha etc. — fora do escopo desta etapa

  return { remoteJid, remetente, texto: texto.trim() };
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
// System prompts
// ============================================================================
const SYSTEM_PROMPT_HELOIM = `Você é a Heloim, assistente técnica de TI do Leilão NoZap, falando só com o admin no WhatsApp.

Tom: técnico, direto, sem enrolação.

Nesta versão você NÃO tem acesso a ferramenta nenhuma de consulta ao sistema — isso
chega numa etapa seguinte. Se o admin pedir um relatório ou dado que você não tem como
verificar agora, diga isso claramente. Nunca invente número, status ou dado do sistema.
Ajude com diagnóstico geral, dúvidas técnicas e orientação — não finja ter executado
uma consulta que não fez.`;

function montarSystemPromptZeca(cliente: { nome?: string } | null): string {
  const contexto = cliente?.nome
    ? `\n\nContexto: este número já é cliente cadastrado (${cliente.nome}). Trate com familiaridade, sem precisar pedir dados básicos de novo.`
    : '';
  return `Você é o Zeca, SDR e atendimento do Leilão NoZap no WhatsApp.

Tom: consultivo, simpático, brasileiro, direto. Sem formalidade excessiva.

Seu papel: explicar como funcionam os leilões, o catálogo de produtos, o programa Rank
Premiado, e ajudar quem ainda não é cadastrado a se cadastrar. Nesta versão você NÃO tem
acesso a consulta de saldo, pedidos ou leilões ativos em tempo real — isso chega numa
etapa seguinte. Se pedirem algo que exige dado ao vivo do sistema, diga que vai
encaminhar ou que essa consulta ainda não está disponível por aqui — nunca invente
número.${contexto}`;
}

// ============================================================================
// Claude — chamada simples (sem tool loop nesta etapa).
// ============================================================================
async function chamarClaude(system: string, mensagemUsuario: string): Promise<string> {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: mensagemUsuario }],
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${j?.error?.message || JSON.stringify(j)}`);
  const texto = (j.content || [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('\n')
    .trim();
  return texto || 'Desculpa, não consegui montar uma resposta agora. Pode repetir?';
}

// ============================================================================
// Evolution API — envio da resposta de volta pro WhatsApp.
// ============================================================================
async function enviarWhatsApp(remoteJid: string, texto: string) {
  const r = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE_NAME}`, {
    method: 'POST',
    headers: { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ number: remoteJid, text: texto }),
  });
  if (!r.ok) {
    const corpo = await r.text().catch(() => '');
    throw new Error(`Evolution API ${r.status} ao enviar resposta: ${corpo}`);
  }
}

// ============================================================================
// Handler HTTP
// ============================================================================
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ success: false, error: 'method not allowed' }, 405);

  if (!validarSeguranca(req)) {
    console.warn('[whatsapp-router] webhook-secret inválido ou ausente — recusado.');
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
    console.error('[whatsapp-router] falha ao interpretar payload da Evolution API:', e, JSON.stringify(body).slice(0, 500));
    return json({ success: false, error: 'payload inesperado' }, 200); // 200 pra Evolution não ficar reentregando
  }

  // Evento que não é mensagem de texto nova (status, reação, mídia, eco do próprio bot,
  // etc.) — ignora sem erro, é tráfego normal do webhook.
  if (!msg) return json({ success: true, ignored: true });

  try {
    const admin = ehAdmin(msg.remetente);
    const cliente = admin ? null : await buscarClientePorTelefone(msg.remetente);
    const systemPrompt = admin ? SYSTEM_PROMPT_HELOIM : montarSystemPromptZeca(cliente);

    const resposta = await chamarClaude(systemPrompt, msg.texto);
    await enviarWhatsApp(msg.remoteJid, resposta);

    return json({ success: true });
  } catch (e) {
    console.error('[whatsapp-router] erro processando mensagem de', msg.remetente, ':', e);
    // 200 mesmo no erro: já tentamos, não queremos a Evolution API reentregando o mesmo
    // webhook em loop. O erro fica no log pra investigar.
    return json({ success: false, error: String((e as Error)?.message || e) });
  }
});

// ============================================================================
// Deploy — ver o guia completo em supabase/functions/whatsapp-router/DEPLOY.md
// ============================================================================
