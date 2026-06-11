// atendimentoIA — IA de atendimento e FISCALIZAÇÃO (só observa e alerta, não age).
// Lê a atividade recente do painel e responde via Vercel AI Gateway. Degrada com elegância sem chave.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AI_KEY = process.env.AI_GATEWAY_API_KEY || '';
const MODEL = process.env.AI_MODEL || 'anthropic/claude-haiku-4-5';

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const ownerId = String(body?.ownerId || '').trim();
    const isDist = !!body?.isDist;
    const question = String(body?.question || '').slice(0, 500);
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });
    if (!AI_KEY) return res.status(200).json({ success: false, needs_key: true, message: 'A IA de atendimento ainda não está conectada. Configure a chave AI_GATEWAY_API_KEY pra ativar.' });

    // contexto: atividade recente do painel (via RPC)
    let atividade = [];
    try {
      const r = await sb('rpc/painel_atividade', { method: 'POST', body: JSON.stringify({ _owner: ownerId, _is_dist: isDist, _lim: 30 }) });
      atividade = await r.json();
    } catch { atividade = []; }
    const resumo = (Array.isArray(atividade) ? atividade : []).slice(0, 30)
      .map((a) => `${a.tipo === 'venda' ? '🛒' : '👤'} ${a.titulo}${a.valor ? ` R$${Number(a.valor).toFixed(2)}` : ''} (${a.quem || ''}) ${a.quando ? new Date(a.quando).toLocaleString('pt-BR') : ''}`)
      .join('\n');

    const system = `Você é a IA de atendimento e FISCALIZAÇÃO de vendas da Leilão NoZap.
REGRAS: você apenas OBSERVA, RESPONDE e ALERTA. NUNCA execute ações nem prometa executar.
Sinalize anomalias de venda (valores fora do padrão, picos suspeitos, cadastros em massa).
Responda em português do Brasil, direto e curto. Use a atividade recente do painel como base.`;
    const userMsg = `Atividade recente do painel:\n${resumo || '(sem atividade recente)'}\n\nPergunta do gestor: ${question || 'Tem algo fora do normal? Faça um resumo e aponte alertas.'}`;

    const r = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${AI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, messages: [{ role: 'system', content: system }, { role: 'user', content: userMsg }], max_tokens: 500, temperature: 0.3 }),
      signal: AbortSignal.timeout(25000),
    });
    if (!r.ok) { const t = await r.text(); return res.status(200).json({ success: false, error: 'IA indisponível', details: t.slice(0, 160) }); }
    const j = await r.json();
    const answer = j?.choices?.[0]?.message?.content || 'Sem resposta.';
    return res.status(200).json({ success: true, answer });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro', details: String(e?.message || e) });
  }
}
