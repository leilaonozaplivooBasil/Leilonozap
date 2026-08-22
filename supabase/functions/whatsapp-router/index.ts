// whatsapp-router — expurgo Base44, etapa 1 (esqueleto), provedor Z-API.
//
// Cérebro/roteador único dos dois agentes de IA do WhatsApp: Zeca (SDR/atendimento,
// qualquer número) e Heloim (assistente de TI, só o admin). Os dois falam pelo MESMO
// número — quem decide qual responde é só o telefone de quem mandou a mensagem.
//
// Esta é a versão ENXUTA de propósito (v1 "por etapas"): recebe o webhook do Z-API,
// roteia, chama a Claude com o system prompt certo, devolve a resposta. SEM tool-calling
// e SEM memória de conversa — cada mensagem é isolada. As duas coisas voltam numa etapa
// seguinte, em cima deste esqueleto.
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
const ADMIN_PHONE_NUMBER = Deno.env.get('ADMIN_PHONE_NUMBER') || '';    // só dígitos, com DDI: 5511999999999
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') || '';            // opcional — ver validarSeguranca()

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

function ehAdmin(remetente: string): boolean {
  if (!ADMIN_PHONE_NUMBER) return false; // sem admin configurado, ninguém vira Heloim — padrão seguro
  return ultimosDigitos(remetente) === ultimosDigitos(ADMIN_PHONE_NUMBER);
}

// ============================================================================
// Payload do Z-API — webhook "Ao receber" (configurar especificamente esse, não o "ao
// enviar"/"status"/"conectar" — cada evento tem seu próprio campo de URL no painel deles).
// `phone` e `fromMe` vêm no nível raiz, sem precisar montar/desmontar JID como na Evolution
// API. O campo do TEXTO da mensagem é o único ponto de incerteza real — ver o aviso no
// topo do arquivo.
// ============================================================================
type MensagemExtraida = {
  remetente: string; // telefone de quem mandou — usado tanto pro roteamento quanto pra resposta
  texto: string;
};

function extrairMensagem(body: any): MensagemExtraida | null {
  if (body?.fromMe === true) return null;   // eco do que o próprio bot mandou — nunca processa, senão vira loop
  if (body?.isGroup === true) return null;  // grupo — fora do escopo desta etapa (Zeca/Heloim são 1:1)

  const remetente: string | undefined = body?.phone ? String(body.phone) : undefined;
  if (!remetente) return null;

  // Tenta os formatos mais prováveis pro corpo do texto. Se nenhum bater, loga o payload
  // bruto — é assim que a gente ajusta o campo certo no primeiro teste real, sem chutar.
  const texto: unknown = body?.text?.message ?? body?.body ??
    (typeof body?.message === 'string' ? body.message : body?.message?.text);

  if (!texto || !String(texto).trim()) {
    console.warn(
      '[whatsapp-router] payload sem texto reconhecido — ajustar extrairMensagem() com o formato real:',
      JSON.stringify(body).slice(0, 1000)
    );
    return null;
  }

  return { remetente, texto: String(texto).trim() };
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
// Z-API — envio da resposta de volta pro WhatsApp. Autenticação por URL (instance id +
// token no path), mais o header Client-Token se a "Segurança da conta" estiver ativada.
// ============================================================================
async function enviarWhatsApp(telefone: string, texto: string) {
  const url = `${ZAPI_BASE_URL}/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (ZAPI_CLIENT_TOKEN) headers['Client-Token'] = ZAPI_CLIENT_TOKEN;

  const r = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ phone: apenasDigitos(telefone), message: texto }),
  });
  if (!r.ok) {
    const corpo = await r.text().catch(() => '');
    throw new Error(`Z-API ${r.status} ao enviar resposta: ${corpo}`);
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

  try {
    const admin = ehAdmin(msg.remetente);
    const cliente = admin ? null : await buscarClientePorTelefone(msg.remetente);
    const systemPrompt = admin ? SYSTEM_PROMPT_HELOIM : montarSystemPromptZeca(cliente);

    const resposta = await chamarClaude(systemPrompt, msg.texto);
    await enviarWhatsApp(msg.remetente, resposta);

    return json({ success: true });
  } catch (e) {
    console.error('[whatsapp-router] erro processando mensagem de', msg.remetente, ':', e);
    // 200 mesmo no erro: já tentamos, não queremos o Z-API reentregando o mesmo webhook
    // em loop. O erro fica no log pra investigar.
    return json({ success: false, error: String((e as Error)?.message || e) });
  }
});

// ============================================================================
// Deploy — ver o guia completo em supabase/functions/whatsapp-router/DEPLOY.md
// ============================================================================
