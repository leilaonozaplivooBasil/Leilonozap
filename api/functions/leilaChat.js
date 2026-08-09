// leilaChat (Vercel) — ponte para o runtime Base44/Deno.
// CAUSA-RAIZ: leilaonozap.net é servido pela Vercel, não pelo Base44. A
// AGENT_API_KEY vive só no cofre do Base44 (invisível para process.env aqui).
// Por isso a chamada é repassada, servidor→servidor, para o runtime que já
// tem a credencial e executa o agente leila_atendente (mesmo padrão usado em
// api/functions/buscarFotosPorImagem.js — ver api/_lib/base44Runtime.js).
import { chamarRuntimeBase44 } from '../_lib/base44Runtime.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const message = String(body?.message || '').trim();
    const history = Array.isArray(body?.history) ? body.history : [];

    if (!message) {
      return res.status(400).json({ error: 'message é obrigatório' });
    }

    const resultado = await chamarRuntimeBase44('leilaChat', { message, history }, 28000);
    return res.status(200).json(resultado);
  } catch (e) {
    return res.status(200).json({
      status: 'error',
      response: 'Não consegui responder agora. Tente novamente.',
      error: String(e?.message || e),
    });
  }
}