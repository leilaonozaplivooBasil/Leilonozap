// descreverImagemSonho — os "detalhes automáticos" do Quadro dos Sonhos
// (DIR-44, 03/09/2026). Recebe a URL da imagem escolhida e devolve 2-4 linhas
// de detalhes concretos (carro → ano/cor/acabamento) pela visão do Vercel AI
// Gateway — mesma chave e mesmo molde do atendimentoIA. Sem chave ou com a IA
// fora do ar, devolve success:false e a pessoa escreve na mão: a IA aqui é
// atalho, nunca dependência.
import { exigirSessao } from '../_lib/sessao.js';
import { conferirUrl } from '../_lib/urlSegura.js';

export default async function handler(req, res) {
  // Env lida AQUI (não no topo do módulo) de propósito: o teste do handler
  // real prova needs_key E sucesso no mesmo import. Auth igual ao InvokeLLM:
  // AI_GATEWAY_API_KEY OU o token OIDC que a Vercel injeta sozinha na função.
  const AI_KEY = process.env.AI_GATEWAY_API_KEY || '';
  const OIDC = process.env.VERCEL_OIDC_TOKEN || '';
  const AUTH = AI_KEY || OIDC;
  const MODEL = process.env.AI_MODEL || 'anthropic/claude-haiku-4-5';
  res.setHeader('Content-Type', 'application/json');
  // Diagnóstico honesto (sem segredo nenhum): diz QUAIS credenciais existem,
  // pra ninguém mais precisar adivinhar por que a IA não acendeu.
  const pediuDiag = String(req.query?.diag || '') === '1' || String(req.url || '').includes('diag=1');
  if (req.method === 'GET' && pediuDiag) {
    return res.status(200).json({ success: true, diag: { tem_chave: !!AI_KEY, tem_oidc: !!OIDC, modelo: MODEL } });
  }
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const imageUrl = String(body?.imageUrl || '').trim();
    const titulo = String(body?.titulo || '').slice(0, 120);

    // O quadro é de gente logada — crachá da casa (etapa 1 anota, etapa 2 recusa).
    const sessao = exigirSessao(req, '', 'descreverImagemSonho');
    if (!sessao.liberado) return res.status(sessao.http).json({ success: false, error: 'Sessão inválida — entre de novo' });

    if (!imageUrl) return res.status(400).json({ success: false, error: 'imageUrl obrigatória' });
    const porteiro = conferirUrl(imageUrl);
    if (!porteiro.ok) return res.status(400).json({ success: false, error: `imagem recusada: ${porteiro.motivo}` });

    if (!AUTH) {
      return res.status(200).json({ success: false, needs_key: true, message: 'A IA de visão ainda não está conectada (AI_GATEWAY_API_KEY) — escreva os detalhes embaixo da imagem.' });
    }

    const system = 'Você descreve imagens do QUADRO DOS SONHOS de um time de vendas brasileiro. '
      + 'Responda em português do Brasil, 2 a 4 linhas curtas, SÓ com detalhes concretos do que aparece na imagem. '
      + 'Carro: marca/modelo aparente, ano aproximado, cor, acabamento (rodas, bancos). '
      + 'Casa/viagem/objeto: os equivalentes (estilo, lugar, características visíveis). '
      + 'Sem floreio, sem promessa, sem falar de "sonho" — só os detalhes. '
      + 'Se algo não der pra identificar, diga o que dá e aponte 1-2 detalhes pra pessoa completar.';
    const pergunta = titulo ? `O sonho se chama "${titulo}". Detalhe o que aparece na imagem.` : 'Detalhe o que aparece na imagem.';

    const r = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${AUTH}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: [{ type: 'text', text: pergunta }, { type: 'image_url', image_url: { url: imageUrl } }] },
        ],
        max_tokens: 260,
        temperature: 0.4,
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) { const t = await r.text(); return res.status(200).json({ success: false, error: 'IA indisponível', details: t.slice(0, 160) }); }
    const j = await r.json();
    const detalhes = String(j?.choices?.[0]?.message?.content || '').trim();
    if (!detalhes) return res.status(200).json({ success: false, error: 'IA não descreveu a imagem' });
    return res.status(200).json({ success: true, detalhes });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro', details: String(e?.message || e) });
  }
}
