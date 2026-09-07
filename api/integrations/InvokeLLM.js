// InvokeLLM — geração de texto/JSON pra 9 telas (descrição de produto com IA,
// anúncio OLX, texto promocional, perfil, leilão de luxo e o ROTEIRO DO
// ENCONTRO DA MENTALIDADE). Contrato mantido do SDK Base44: com
// `response_json_schema` devolve o OBJETO direto; sem, {ok, text, response};
// falha vira {ok:false, error, details} — nunca 500.
//
// 🔁 DIR-84.5 (07/09/2026) — a troca. O modelo padrão era
// `google/gemini-2.0-flash-001` no chat/completions do gateway: foi
// DESCONTINUADO (404 model_not_found), a rota engolia o erro e as 9 telas
// caíam no "IA indisponível" — o roteiro do Encontro por isso sempre "saía
// pela régua da casa". Entra o SDK oficial da Anthropic (api/_lib/ia.js:
// Anthropic direto ou AI Gateway, pela chave que existir) com Claude
// SONNET 5 — texto é o forte dele e custa 40% do Opus, que fica reservado
// pra validação de foto (decisão do dono: "foda e barato").
//
// SAÍDA ESTRUTURADA: quando a tela manda um schema, ele vai em
// output_config.format e o modelo é OBRIGADO a devolver nesse formato — não
// há mais JSON raspado por regex. Se a API recusar o schema (400: forma não
// suportada), a rota refaz UMA vez sem o formato e faz o parse do texto — o
// caminho antigo, só como rede de segurança, e o log diz que caiu nele.
import { resolverIA, clienteIA, opcoesDeReserva, detalhesDoErro, Anthropic } from '../_lib/ia.js';

export const config = { maxDuration: 60 };

const MODEL_DIRETO = process.env.AI_MODEL_TEXT_ANTHROPIC || 'claude-sonnet-5';
const MODEL_GATEWAY = process.env.AI_MODEL_TEXT || 'anthropic/claude-sonnet-5';
const MODEL_GATEWAY_RESERVA = process.env.AI_MODEL_TEXT_RESERVA || 'anthropic/claude-haiku-4-5';

const SISTEMA = 'Você é um assistente da Leilão NoZap. Responda em português do Brasil, direto e profissional.';

function jsonDoTexto(texto) {
  let clean = String(texto || '').replace(/```(json)?/gi, '').trim();
  const a = clean.indexOf('{'); const b = clean.lastIndexOf('}');
  if (a >= 0 && b > a) clean = clean.slice(a, b + 1);
  try { return JSON.parse(clean); } catch { return null; }
}

const textoDe = (m) => (m?.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');

// 🩺 PING (GET ?ping=1) — chamada mínima com um schema cru em
// output_config.format, pelo MESMO caminho das telas. Prova, pelo gateway
// real, que o modelo responde E que a saída estruturada é aceita.
async function ping(ia) {
  try {
    const m = await clienteIA(ia).messages.create({
      model: ia.model, max_tokens: 64, system: SISTEMA,
      messages: [{ role: 'user', content: 'Responda com ok igual a "ok".' }],
      output_config: { format: { type: 'json_schema', schema: { type: 'object', properties: { ok: { type: 'string' } }, required: ['ok'] } } },
      ...opcoesDeReserva(ia),
    });
    return { status: 200, ok: true, model: m.model, saida: jsonDoTexto(textoDe(m))?.ok ?? null };
  } catch (e) {
    const d = detalhesDoErro(e);
    console.error('[InvokeLLM] ping falhou', { via: ia.via, model: ia.model, ...d });
    return { status: d.status, ok: false, corpo: `${d.tipo}: ${d.mensagem}` };
  }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'GET') {
    const ia = await resolverIA({ modelDireto: MODEL_DIRETO, modelGateway: MODEL_GATEWAY, reserva: MODEL_GATEWAY_RESERVA });
    const p = ia && String(req.query?.ping || '') === '1' ? await ping(ia) : undefined;
    return res.status(200).json({ ok: true, ia: p ? p.ok : Boolean(ia), tem_chave: Boolean(ia), model: ia?.model || MODEL_GATEWAY, via: ia?.via || null, ...(p ? { ping: p } : {}) });
  }
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const prompt = String(body?.prompt || '').slice(0, 12000);
    const schema = body?.response_json_schema || body?.response_schema || null;
    if (!prompt) return res.status(400).json({ ok: false, error: 'prompt obrigatório' });
    // `body.model` era usado pra escolher modelo free-tier do gateway; hoje o
    // modelo é decidido aqui (env), pra ninguém voltar a apontar pra um morto.
    const maxTokens = Math.min(8000, Math.max(256, Number(body?.max_tokens) || 1200));

    const ia = await resolverIA({ modelDireto: MODEL_DIRETO, modelGateway: MODEL_GATEWAY, reserva: MODEL_GATEWAY_RESERVA });
    if (!ia) return res.status(200).json({ ok: false, needs_key: true, error: 'IA não conectada (configure ANTHROPIC_API_KEY ou AI_GATEWAY_API_KEY).' });

    const client = clienteIA(ia);
    const base = {
      model: ia.model, max_tokens: maxTokens, system: SISTEMA,
      messages: [{ role: 'user', content: prompt }],
      ...opcoesDeReserva(ia),
    };

    let m; let viaFormato = !!schema;
    try {
      m = await client.messages.create(schema ? { ...base, output_config: { format: { type: 'json_schema', schema } } } : base);
    } catch (e) {
      // 🪢 rede de segurança: schema recusado pela API (forma não suportada) →
      // refaz UMA vez sem o formato, pedindo JSON no texto, e faz o parse.
      if (schema && e instanceof Anthropic.BadRequestError) {
        console.warn('[InvokeLLM] schema recusado pela API, refazendo sem output_config.format', String(e.message || '').slice(0, 200));
        viaFormato = false;
        try {
          m = await client.messages.create({
            ...base,
            system: `${SISTEMA} Responda SOMENTE com um JSON válido que satisfaça este schema (sem markdown, sem texto fora do JSON):\n${JSON.stringify(schema)}`,
          });
        } catch (e2) {
          const d = detalhesDoErro(e2);
          console.error('[InvokeLLM] IA falhou (2ª tentativa)', { via: ia.via, model: ia.model, ...d });
          return res.status(200).json({ ok: false, error: 'IA indisponível', details: d });
        }
      } else {
        const d = detalhesDoErro(e);
        console.error('[InvokeLLM] IA falhou', { via: ia.via, model: ia.model, ...d });
        return res.status(200).json({ ok: false, error: 'IA indisponível', details: d });
      }
    }

    const stop = m.stop_reason;
    const texto = textoDe(m);
    if (stop === 'refusal') return res.status(200).json({ ok: false, error: 'A IA não pôde responder a este pedido.', stop_reason: stop });

    if (schema) {
      const obj = jsonDoTexto(texto);
      if (!obj) {
        // JSON cortado (max_tokens) ou inválido: a tela do Encontro já sabe ler `truncated`
        console.error('[InvokeLLM] sem JSON válido', { stop_reason: stop, viaFormato, tamanho: texto.length });
        return res.status(200).json({ ok: false, error: stop === 'max_tokens' ? 'A resposta da IA foi cortada (max_tokens)' : 'IA não retornou JSON válido', truncated: stop === 'max_tokens', stop_reason: stop, raw: texto.slice(0, 300) });
      }
      return res.status(200).json(obj); // Base44 retorna o objeto direto
    }
    return res.status(200).json({ ok: true, text: texto, response: texto, stop_reason: stop, truncated: stop === 'max_tokens', model: m.model });
  } catch (e) {
    console.error('[InvokeLLM] erro inesperado', String(e?.message || e));
    return res.status(200).json({ ok: false, error: 'Erro na IA', details: String(e?.message || e).slice(0, 300) });
  }
}
