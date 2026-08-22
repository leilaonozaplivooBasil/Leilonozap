// whatsapp-router — expurgo Base44, etapa 2 (memória + tool-calling), provedor Z-API.
//
// Cérebro/roteador único dos dois agentes de IA do WhatsApp: Zeca (SDR/atendimento,
// qualquer número) e Heloim (assistente de TI, só o admin). Os dois falam pelo MESMO
// número — quem decide qual responde é só o telefone de quem mandou a mensagem.
//
// Etapa 2 (22/08/2026): recebe o webhook do Z-API, roteia, carrega memória de conversa
// (ai_conversas), chama a Claude com o system prompt certo E tool-calling de leitura real
// (saldo/pedidos/leilões pro Zeca; métricas de sistema pra Heloim), devolve a resposta.
// Heloim é só-consulta — nenhuma tool escreve dado nenhum.
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

// Executivo que recebe leads de vendedor interessado vindos de anúncio (Meta/Instagram) —
// pedido do dono (22/08/2026). Valor padrão é o número passado por ele; dá pra trocar sem
// redeploy setando o secret EXECUTIVO_VENDEDOR_PHONE.
const EXECUTIVO_VENDEDOR_PHONE = Deno.env.get('EXECUTIVO_VENDEDOR_PHONE') || '21984942730';

// Transcrição de áudio (Whisper) — mesmo serviço que já era usado no Base44
// (base44/functions/transcribeAudio/entry.ts). Opcional: sem a chave, Zeca segue
// funcionando, só sem entender o CONTEÚDO do áudio (ver transcreverAudio()).
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';

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
  texto: string; // pra áudio/imagem/documento, um texto sintético descrevendo o que chegou (ver extrairMensagem)
  audioUrl: string | null; // se veio áudio, a URL do arquivo — ver transcreverAudio()
  messageId: string | null; // usado pra idempotência — ver jaProcessada()
};

function extrairMensagem(body: any): MensagemExtraida | null {
  if (body?.fromMe === true) return null;   // eco do que o próprio bot mandou — nunca processa, senão vira loop
  if (body?.isGroup === true) return null;  // grupo — fora do escopo desta etapa (Zeca/Heloim são 1:1)

  const remetente: string | undefined = body?.phone ? String(body.phone) : undefined;
  if (!remetente) return null;

  const messageId: unknown = body?.messageId ?? body?.id ?? null;
  const messageIdStr = messageId ? String(messageId) : null;

  // Tenta os formatos mais prováveis pro corpo do texto. Se nenhum bater, loga o payload
  // bruto — é assim que a gente ajusta o campo certo no primeiro teste real, sem chutar.
  const texto: unknown = body?.text?.message ?? body?.body ??
    (typeof body?.message === 'string' ? body.message : body?.message?.text);

  if (texto && String(texto).trim()) {
    return { remetente, texto: String(texto).trim(), audioUrl: null, messageId: messageIdStr };
  }

  // Áudio: extrai a URL do arquivo pra transcrever depois (em background — ver
  // transcreverAudio() e processarMensagem()). Tenta os campos mais prováveis do Z-API; se
  // nenhum bater, ainda assim NUNCA fica muda — vira texto sintético mesmo sem URL.
  if (body?.audio) {
    const audioUrl: unknown = body.audio?.audioUrl ?? body.audio?.url ?? body.audio?.audioURL ?? null;
    return {
      remetente,
      texto: '[o cliente mandou uma mensagem de ÁUDIO — sem transcrição disponível ainda]',
      audioUrl: audioUrl ? String(audioUrl) : null,
      messageId: messageIdStr,
    };
  }
  if (body?.image) {
    return { remetente, texto: '[o cliente mandou uma IMAGEM]' + (body.image?.caption ? `, com a legenda: "${body.image.caption}"` : ' (sem legenda)'), audioUrl: null, messageId: messageIdStr };
  }
  if (body?.document) {
    return { remetente, texto: `[o cliente mandou um DOCUMENTO${body.document?.fileName ? `: "${body.document.fileName}"` : ''}]`, audioUrl: null, messageId: messageIdStr };
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
async function transcreverAudio(audioUrl: string): Promise<string | null> {
  if (!OPENAI_API_KEY) return null;
  try {
    const audioResp = await fetch(audioUrl);
    if (!audioResp.ok) {
      console.error('[whatsapp-router] falha ao baixar áudio do Z-API:', audioResp.status);
      return null;
    }
    const audioBlob = await audioResp.blob();

    const form = new FormData();
    form.append('file', audioBlob, 'audio.ogg');
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
const HISTORICO_MAX_MSGS = 12; // 6 idas-e-voltas — contexto suficiente, custo de token baixo

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

async function salvarTurno(remetente: string, agente: string, role: 'user' | 'assistant', content: string) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/ai_conversas`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json', Prefer: 'return=minimal',
      },
      body: JSON.stringify({ remetente, agente, role, content }),
    });
  } catch (e) {
    console.error('[whatsapp-router] falha ao salvar turno (memória segue incompleta):', e);
  }
}

// ============================================================================
// Tools — cada uma é uma consulta de LEITURA no Supabase. Nenhuma escreve nada (Heloim é
// só-consulta nesta versão; Zeca nunca deveria escrever mesmo). Erro de query vira
// tool_result de erro pra Claude, que decide como contar isso pro usuário — nunca derruba
// a conversa.
// ============================================================================
type ToolDef = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  executar: (input: any, ctx: { remetente: string }) => Promise<unknown>;
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
const SYSTEM_PROMPT_HELOIM = `Você é a Heloim, assistente técnica de TI do Leilão NoZap, falando só com o admin no WhatsApp.

Tom: técnico, direto, sem enrolação.

Você é SOMENTE CONSULTA nesta versão — tem tools de leitura (vendas_hoje,
produtos_sem_estoque, pedidos_pendentes_envio, resumo_carteiras) e NENHUMA tool que altera
dado nenhum. Se o admin pedir uma ação que muda estado (pausar leilão, reprocessar pedido,
mexer em saldo, etc.), diga claramente que essa ação ainda não está disponível por aqui —
não finja que executou, e não invente que fez algo.

Sempre que usar uma tool, cite o número real que ela devolveu — nunca arredonde ou estime
por conta própria. Se pedirem um dado que nenhuma tool cobre, diga isso claramente em vez
de inventar.`;

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
  mensagemUsuario: string,
  remetente: string
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
        resultado = tool ? await tool.executar(bloco.input, { remetente }) : { erro: 'tool desconhecida' };
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

async function enviarWhatsApp(telefone: string, texto: string) {
  const url = `${ZAPI_BASE_URL}/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (ZAPI_CLIENT_TOKEN) headers['Client-Token'] = ZAPI_CLIENT_TOKEN;

  const r = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ phone: apenasDigitos(telefone), message: texto, delayTyping: delayTypingPara(texto) }),
  });
  const corpoTexto = await r.text().catch(() => '');
  let corpo: any = null;
  try { corpo = JSON.parse(corpoTexto); } catch { /* corpo não era JSON — segue com corpoTexto bruto */ }

  console.log('[whatsapp-router] resposta do Z-API ao enviar:', r.status, corpoTexto.slice(0, 500));

  if (!r.ok) throw new Error(`Z-API ${r.status} ao enviar resposta: ${corpoTexto}`);
  if (corpo && (corpo.error || corpo.value === false)) {
    throw new Error(`Z-API recusou o envio (HTTP 200, mas corpo indica falha): ${corpoTexto}`);
  }
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
      const transcricao = await transcreverAudio(msg.audioUrl);
      if (transcricao) msg = { ...msg, texto: `[mensagem por áudio, transcrita] ${transcricao}` };
    }

    const admin = ehAdmin(msg.remetente);
    const agente = admin ? 'heloim' : 'zeca';
    const cliente = admin ? null : await buscarClientePorTelefone(msg.remetente);
    const systemPrompt = admin ? SYSTEM_PROMPT_HELOIM : montarSystemPromptZeca(cliente);
    const tools = admin ? TOOLS_HELOIM : TOOLS_ZECA;

    const historico = await carregarHistorico(msg.remetente, agente);
    const resposta = await responderComAgente(systemPrompt, tools, historico, msg.texto, msg.remetente);

    await Promise.all([
      salvarTurno(msg.remetente, agente, 'user', msg.texto),
      salvarTurno(msg.remetente, agente, 'assistant', resposta),
    ]);

    await enviarWhatsApp(msg.remetente, resposta);
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
