// xgameValidarPrint — O VALIDADOR DE COMPROVAÇÕES DA X-GAME (F10.2).
// A IA de visão olha o print/foto SABENDO qual tarefa está sendo comprovada
// e responde JSON: aprovada / reprovada / duvida + o que viu. Usa o MESMO
// gateway de IA do atendimento (AI_GATEWAY_API_KEY) com um modelo de visão.
// GET  → health check: {ok, ia} — a tela mostra se a IA está ligada.
// POST → {image_url, tipo, titulo, hora, data} → {veredito, confianca, o_que_viu, motivo}
// Sem chave ou IA fora do ar: degrada pra {veredito:'duvida'} — cai na fila
// manual do gestor, nada trava.
const AI_KEY = process.env.AI_GATEWAY_API_KEY || '';
const OIDC = process.env.VERCEL_OIDC_TOKEN || '';
const GATEWAY = 'https://ai-gateway.vercel.sh/v1/chat/completions';
// gemini flash lê imagem e está no free tier do gateway; troque via env se quiser
const MODEL = process.env.AI_MODEL_VISION || 'google/gemini-2.0-flash-001';

// 🔐 Sem env? A chave pode morar no COFRE do banco (app_segredos, RLS sem
// policy — só o service role lê). Cache de 5 min pra não bater no banco toda hora.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
let _cacheChave = { valor: null, ate: 0 };
async function chaveDaIA() {
  if (AI_KEY || OIDC) return AI_KEY || OIDC;
  if (_cacheChave.ate > Date.now()) return _cacheChave.valor;
  let valor = null;
  try {
    if (SUPABASE_URL && SR) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/app_segredos?id=eq.ai_gateway_key&select=valor&limit=1`, {
        headers: { apikey: SR, Authorization: `Bearer ${SR}` },
        signal: AbortSignal.timeout(5000),
      });
      const j = await r.json().catch(() => []);
      valor = Array.isArray(j) && j[0]?.valor ? String(j[0].valor) : null;
    }
  } catch { valor = null; }
  _cacheChave = { valor, ate: Date.now() + 5 * 60 * 1000 };
  return valor;
}

const REGRAS_POR_TIPO = {
  instagram: `A tarefa exige comprovação VISUAL de que foi cumprida AGORA (não vale coisa antiga). ACEITE apenas um destes três:
1. PRINT de um post/story do Instagram coerente com a tarefa (ex.: "bom dia" pra tarefa de acordar), de preferência com horário visível na barra do celular ou no story;
2. PRINT de uma conversa/grupo (WhatsApp) com a mensagem coerente com a tarefa e a DATA DE HOJE visível;
3. FOTO REAL da pessoa executando a tarefa (ex.: acordada, fora da cama, treinando, no ambiente de trabalho) — foto nítida, ambiente real.
REPROVE: imagem aleatória, meme, foto de banco de imagens, tela apagada/preta, print ilegível, print claramente de outro dia (data antiga visível), foto de pessoa dormindo/na cama pra tarefa de acordar.
Se a imagem é plausível mas não dá pra cravar (sem data visível, qualidade baixa), responda "duvida".`,
  aprendizado: 'A comprovação esperada é um print/foto relacionado a leitura ou estudo (página do livro, anotação, resumo). Reprove imagens sem nenhuma relação com estudo. Na dúvida, "duvida".',
};

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'GET') {
    const chave = await chaveDaIA();
    return res.status(200).json({ ok: true, ia: Boolean(chave), model: MODEL });
  }
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const imageUrl = String(body?.image_url || '').slice(0, 2000);
    const tipo = String(body?.tipo || 'instagram');
    const titulo = String(body?.titulo || '').slice(0, 200);
    const hora = String(body?.hora || '').slice(0, 5);
    const data = String(body?.data || '').slice(0, 10);
    if (!imageUrl) return res.status(400).json({ ok: false, error: 'image_url obrigatório' });

    const auth = await chaveDaIA();
    if (!auth) {
      return res.status(200).json({ ok: true, veredito: 'duvida', confianca: 0, o_que_viu: '', motivo: 'IA não conectada — comprovação enviada pra análise manual do gestor.' });
    }

    const sys = `Você é o VALIDADOR DE COMPROVAÇÕES da gamificação X-GAME (Leilão no Zap). Seja rigoroso e justo. Responda SOMENTE com JSON válido, sem markdown:
{"veredito":"aprovada"|"reprovada"|"duvida","confianca":0-100,"o_que_viu":"descrição curta do que a imagem mostra","motivo":"explicação curta e PEDAGÓGICA em pt-BR (se reprovar, diga exatamente o que faltou e como corrigir)"}`;
    const contexto = `TAREFA COMPROVADA: "${titulo}"${hora ? ` (horário da tarefa: ${hora})` : ''}${data ? `. HOJE É ${data}` : ''}.
${REGRAS_POR_TIPO[tipo] || REGRAS_POR_TIPO.instagram}`;

    const r = await fetch(GATEWAY, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: [
            { type: 'text', text: contexto },
            { type: 'image_url', image_url: { url: imageUrl } },
          ] },
        ],
        max_tokens: 400, temperature: 0.1,
      }),
      signal: AbortSignal.timeout(28000),
    });
    if (!r.ok) {
      return res.status(200).json({ ok: true, veredito: 'duvida', confianca: 0, o_que_viu: '', motivo: 'IA indisponível agora — comprovação enviada pra análise manual.' });
    }
    const j = await r.json();
    let clean = String(j?.choices?.[0]?.message?.content || '').replace(/```(json)?/gi, '').trim();
    const a = clean.indexOf('{'); const b = clean.lastIndexOf('}');
    if (a >= 0 && b > a) clean = clean.slice(a, b + 1);
    let out;
    try { out = JSON.parse(clean); } catch { out = null; }
    if (!out || !['aprovada', 'reprovada', 'duvida'].includes(out.veredito)) {
      return res.status(200).json({ ok: true, veredito: 'duvida', confianca: 0, o_que_viu: '', motivo: 'A IA não conseguiu analisar — vai pra análise manual.' });
    }
    return res.status(200).json({
      ok: true,
      veredito: out.veredito,
      confianca: Math.max(0, Math.min(100, Number(out.confianca) || 0)),
      o_que_viu: String(out.o_que_viu || '').slice(0, 300),
      motivo: String(out.motivo || '').slice(0, 300),
    });
  } catch (e) {
    return res.status(200).json({ ok: true, veredito: 'duvida', confianca: 0, o_que_viu: '', motivo: 'Erro na análise — vai pra fila manual.', details: String(e?.message || e).slice(0, 120) });
  }
}
