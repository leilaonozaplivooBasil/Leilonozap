// whatsapp-webhook — expurgo Base44 (21/08/2026).
//
// Ponto único de entrada dos dois agentes de IA que rodavam no backend da Base44: Zeca
// (SDR/atendimento, qualquer número) e Heloim (assistente de TI, só o admin). Os dois
// falam pelo MESMO número de WhatsApp — quem decide qual dos dois responde é só o
// telefone de quem mandou a mensagem, comparado com ADMIN_PHONE_NUMBER.
//
// Fluxo: Evolution API recebe a mensagem -> dispara este webhook -> aqui a gente escolhe
// o agente, monta o histórico (ai_conversas), chama a Claude com as tools do agente,
// resolve as tool calls (consultas de leitura no Supabase) e devolve o texto final pra
// Evolution API mandar de volta no WhatsApp.
//
// Deploy: esta function TEM que subir com --no-verify-jwt (a Evolution API não manda
// Authorization: Bearer nenhum) — ver supabase/functions/whatsapp-webhook/README no fim
// deste arquivo pro comando exato. A autenticação de quem pode chamar este endpoint é o
// `?secret=` na URL do webhook (WEBHOOK_SECRET), não o JWT do Supabase.

// ============================================================================
// Env vars
// ============================================================================
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL')!;      // ex: https://evo.seudominio.com
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY')!;      // = AUTHENTICATION_API_KEY do docker-compose
const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE')!;    // nome da instância criada na Evolution
const ADMIN_PHONE_NUMBER = Deno.env.get('ADMIN_PHONE_NUMBER') || ''; // só dígitos, com DDI: 5511999999999
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') || '';         // mesmo valor do ?secret= no compose

const CLAUDE_MODEL = 'claude-3-5-sonnet-latest';
const HISTORICO_MAX_MSGS = 12; // 6 idas-e-voltas de contexto — suficiente pro agente, barato em token

// ============================================================================
// Supabase REST — mesmo padrão de api/_lib/*.js: fetch direto, sem client pesado no Deno.
// ============================================================================
function sb(path: string, opts: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
}

// ============================================================================
// Telefone — normaliza remoteJid do WhatsApp (5511999999999@s.whatsapp.net) pra
// comparação. O nono dígito é inconsistente entre o que o WhatsApp manda e o que fica
// salvo em app_users.phone, então a comparação usa só os últimos 10 dígitos (DDD + número
// sem o 9) — cobre os dois formatos sem falso-negativo.
// ============================================================================
function apenasDigitos(v: string): string {
  return (v || '').replace(/\D/g, '');
}

function ultimosDigitos(v: string, n = 10): string {
  const d = apenasDigitos(v);
  return d.slice(-n);
}

function ehAdmin(remoteJid: string): boolean {
  if (!ADMIN_PHONE_NUMBER) return false; // sem admin configurado, ninguém vira Heloim — padrão seguro
  return ultimosDigitos(remoteJid) === ultimosDigitos(ADMIN_PHONE_NUMBER);
}

// ============================================================================
// Histórico de conversa (ai_conversas) — memória de curto prazo por remote_jid.
// ============================================================================
type Turno = { role: 'user' | 'assistant'; content: string };

async function carregarHistorico(remoteJid: string, agente: string): Promise<Turno[]> {
  const r = await sb(
    `ai_conversas?select=role,content&remote_jid=eq.${encodeURIComponent(remoteJid)}&agente=eq.${agente}` +
      `&order=created_at.desc&limit=${HISTORICO_MAX_MSGS}`
  );
  const rows = await r.json().catch(() => []);
  return (Array.isArray(rows) ? rows : []).reverse();
}

async function salvarTurno(remoteJid: string, agente: string, role: 'user' | 'assistant', content: string) {
  await sb('ai_conversas', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ remote_jid: remoteJid, agente, role, content }),
  }).catch(() => {}); // memória é conveniência, nunca pode derrubar a resposta ao cliente
}

// ============================================================================
// Tools — cada uma é uma consulta de LEITURA no Supabase. Nenhuma escreve nada (v1
// do Heloim é só consulta; Zeca nunca deveria escrever mesmo). Erro de query vira
// tool_result de erro pra Claude, que decide como contar isso pro usuário — não derruba
// a conversa.
// ============================================================================
type ToolDef = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  executar: (input: any, ctx: { remoteJid: string }) => Promise<unknown>;
};

async function buscarClientePorTelefone(remoteJid: string) {
  const ultimos8 = ultimosDigitos(remoteJid, 8);
  const r = await sb(
    `app_users?select=id,full_name,email,phone,saldo_disponivel,saldo_reservado&phone=ilike.*${ultimos8}*&limit=1`
  );
  const rows = await r.json().catch(() => []);
  return Array.isArray(rows) ? rows[0] || null : null;
}

const TOOLS_ZECA: ToolDef[] = [
  {
    name: 'consultar_saldo',
    description: 'Consulta o saldo disponível e reservado da carteira do cliente que está falando agora.',
    input_schema: { type: 'object', properties: {} },
    executar: async (_input, ctx) => {
      const cliente = await buscarClientePorTelefone(ctx.remoteJid);
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
      const ultimos8 = ultimosDigitos(ctx.remoteJid, 8);
      const r = await sb(
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
      const r = await sb(`auctions?select=id,title,current_price,end_time&status=eq.active&order=end_time.asc&limit=8`);
      const rows = await r.json().catch(() => []);
      return { leiloes: Array.isArray(rows) ? rows : [] };
    },
  },
];

const TOOLS_HELOIM: ToolDef[] = [
  {
    name: 'vendas_hoje',
    description: 'Total e quantidade de vendas pagas hoje (desde 00:00 UTC).',
    input_schema: { type: 'object', properties: {} },
    executar: async () => {
      const hoje = new Date();
      hoje.setUTCHours(0, 0, 0, 0);
      const r = await sb(
        `catalog_sales?select=total_amount&status=eq.paid&created_at=gte.${hoje.toISOString()}`
      );
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
      const r = await sb(
        `products?select=id,description,quantity&catalog_active=eq.true&quantity=lte.0&limit=10`
      );
      const rows = await r.json().catch(() => []);
      const rc = await sb(
        `products?select=id&catalog_active=eq.true&quantity=lte.0`,
        { headers: { Prefer: 'count=exact', Range: '0-0' } }
      );
      const total = rc.headers.get('content-range')?.split('/')?.[1] || String((Array.isArray(rows) ? rows : []).length);
      return { total: Number(total) || 0, amostra: Array.isArray(rows) ? rows : [] };
    },
  },
  {
    name: 'pedidos_pendentes_envio',
    description: 'Quantidade de pedidos pagos que ainda estão aguardando envio (fulfillment_status = a_enviar).',
    input_schema: { type: 'object', properties: {} },
    executar: async () => {
      const r = await sb(
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
      const r = await sb(`app_users?select=saldo_disponivel,saldo_reservado&or=(saldo_disponivel.gt.0,saldo_reservado.gt.0)`);
      const rows = await r.json().catch(() => []);
      const lista = Array.isArray(rows) ? rows : [];
      const disp = lista.reduce((s: number, x: any) => s + Number(x.saldo_disponivel || 0), 0);
      const res = lista.reduce((s: number, x: any) => s + Number(x.saldo_reservado || 0), 0);
      return { saldo_disponivel_total: Math.round(disp * 100) / 100, saldo_reservado_total: Math.round(res * 100) / 100 };
    },
  },
];

// ============================================================================
// System prompts
// ============================================================================
const SYSTEM_PROMPT_ZECA = `Você é o Zeca, atendimento e SDR do Leilão NoZap no WhatsApp.

Seu tom: direto, simpático, brasileiro, sem formalidade excessiva. Frases curtas.

Você ajuda quem manda mensagem a:
- Tirar dúvida sobre como funciona leilão, lance, frete e pagamento.
- Consultar o próprio saldo (use a tool consultar_saldo — NUNCA invente número).
- Consultar os próprios pedidos (use a tool consultar_pedidos).
- Ver quais leilões estão rolando agora (use a tool consultar_leiloes_ativos).

Regras:
- Você só tem acesso a dados do número que está falando com você agora. Nunca inclui,
  nem simula, dado de outro cliente.
- Se uma tool disser "não encontrado", diga isso com naturalidade e ofereça ajuda pra
  fazer o primeiro cadastro/compra — não insista tentando de novo.
- Nunca prometa prazo de frete ou valor que a tool não confirmou.
- Se a pergunta for sobre algo fora do que você resolve (reclamação grave, problema de
  pagamento não resolvido, pedido de reembolso), diga que vai encaminhar para um humano —
  não tente resolver sozinho.`;

const SYSTEM_PROMPT_HELOIM = `Você é o Heloim, assistente de TI interno do Leilão NoZap, falando só com o admin no WhatsApp.

Seu tom: técnico, objetivo, sem enrolação. Números direto ao ponto.

Nesta versão você é SOMENTE CONSULTA — tem tools de leitura (vendas_hoje,
produtos_sem_estoque, pedidos_pendentes_envio, resumo_carteiras) e NENHUMA tool que
altera dado nenhum. Se o admin pedir uma ação que muda estado (pausar leilão, reprocessar
pedido, mexer em saldo, etc.), diga claramente que essa ação ainda não está disponível por
aqui nesta versão — não finja que executou, e não invente que fez algo.

Sempre que usar uma tool, cite o número real que ela devolveu — nunca arredonde ou estime
por conta própria.`;

// ============================================================================
// Claude — loop de tool use via Messages API (fetch cru, sem SDK — Deno edge não precisa).
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
  mensagemUsuario: string,
  remoteJid: string
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
        resultado = tool ? await tool.executar(bloco.input, { remoteJid }) : { erro: 'tool desconhecida' };
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
// Evolution API — envio da resposta de volta pro WhatsApp.
// ============================================================================
async function enviarWhatsApp(numero: string, texto: string) {
  const r = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
    method: 'POST',
    headers: { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ number: apenasDigitos(numero), text: texto }),
  });
  if (!r.ok) {
    console.error('[whatsapp-webhook] falha ao enviar resposta:', r.status, await r.text().catch(() => ''));
  }
}

// ============================================================================
// Processamento em segundo plano — responde 200 pra Evolution API IMEDIATAMENTE (ela
// re-envia o webhook se demorar/der erro) e só então roda LLM + tools, que pode levar
// alguns segundos. EdgeRuntime.waitUntil mantém a function viva até isso terminar.
// ============================================================================
async function processarMensagem(remoteJid: string, texto: string) {
  const admin = ehAdmin(remoteJid);
  const agente = admin ? 'heloim' : 'zeca';
  const systemPrompt = admin ? SYSTEM_PROMPT_HELOIM : SYSTEM_PROMPT_ZECA;
  const tools = admin ? TOOLS_HELOIM : TOOLS_ZECA;

  const historico = await carregarHistorico(remoteJid, agente);
  const resposta = await responderComAgente(systemPrompt, tools, historico, texto, remoteJid);

  await Promise.all([
    salvarTurno(remoteJid, agente, 'user', texto),
    salvarTurno(remoteJid, agente, 'assistant', resposta),
  ]);

  await enviarWhatsApp(remoteJid, resposta);
}

// ============================================================================
// Handler HTTP — recebe o webhook da Evolution API v2.
// Payload típico (evento messages.upsert):
//   { event: "messages.upsert", instance: "...", data: {
//       key: { remoteJid, fromMe, id }, message: { conversation } | { extendedTextMessage: { text } },
//       pushName, messageTimestamp } }
// ============================================================================
Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const url = new URL(req.url);
  if (WEBHOOK_SECRET && url.searchParams.get('secret') !== WEBHOOK_SECRET) {
    return new Response('unauthorized', { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response('bad json', { status: 400 });
  }

  // Só nos interessa mensagem de texto recebida (não eco do que a própria instância mandou,
  // não grupo, não status/broadcast).
  if (body?.event !== 'messages.upsert') return new Response('ignored', { status: 200 });
  const data = body?.data;
  const remoteJid: string | undefined = data?.key?.remoteJid;
  const fromMe: boolean = !!data?.key?.fromMe;
  const texto: string | undefined = data?.message?.conversation || data?.message?.extendedTextMessage?.text;

  if (!remoteJid || fromMe || !texto || !remoteJid.endsWith('@s.whatsapp.net')) {
    return new Response('ignored', { status: 200 });
  }

  // Responde já pra Evolution API — o processamento de verdade continua depois, em background.
  // @ts-ignore — EdgeRuntime é global no runtime do Supabase Edge Functions (Deno Deploy), não no editor local.
  EdgeRuntime.waitUntil(
    processarMensagem(remoteJid, texto).catch((e) => console.error('[whatsapp-webhook] erro:', e))
  );

  return new Response('ok', { status: 200 });
});

// ============================================================================
// Deploy — leia antes de subir:
//
// 1. Aplique a migração supabase/migrations/20260821h_ai_conversas.sql (cria a tabela de
//    histórico) — via `supabase db push` ou colando no SQL Editor, como o resto da base.
//
// 2. Cadastre os secrets desta function (não são as env vars do projeto inteiro, são
//    específicos de Edge Functions):
//      supabase secrets set ANTHROPIC_API_KEY=sk-ant-... EVOLUTION_API_URL=https://... \
//        EVOLUTION_API_KEY=... EVOLUTION_INSTANCE=... ADMIN_PHONE_NUMBER=5511... \
//        WEBHOOK_SECRET=...
//    SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem automaticamente em toda Edge
//    Function do projeto — não precisa cadastrar.
//
// 3. Deploy SEM verificação de JWT — a Evolution API não manda Authorization: Bearer
//    nenhum, e com a verificação ligada o Supabase devolve 401 antes de este código
//    rodar:
//      supabase functions deploy whatsapp-webhook --no-verify-jwt
//
// 4. Configure o webhook da instância na Evolution API apontando pra:
//      https://SEUPROJETO.supabase.co/functions/v1/whatsapp-webhook?secret=SEU_WEBHOOK_SECRET
//    (o mesmo valor de WEBHOOK_SECRET usado no passo 2).
// ============================================================================
