// leilaChat (Vercel) — ponte para o runtime Base44/Deno.
// CAUSA-RAIZ: leilaonozap.net é servido pela Vercel, não pelo Base44. A
// AGENT_API_KEY vive só no cofre do Base44 (invisível para process.env aqui).
// Por isso a chamada é repassada, servidor→servidor, para o runtime que já
// tem a credencial e executa o agente leila_atendente (mesmo padrão usado em
// api/functions/buscarFotosPorImagem.js — ver api/_lib/base44Runtime.js).
//
// ⚠️ 15/09/2026 — ESTA PONTE ESTÁ COM OS DIAS CONTADOS. A conta do Base44
// perdeu o direito de rodar backend functions e a Leila parou inteira, porque
// aqui ela NÃO TEM RESERVA (o Compare Aqui e a busca por imagem têm: caem pra
// SerpAPI local). Enquanto o caminho definitivo não sobe — Leila rodando pelo
// nosso api/_lib/ia.js, sem Base44 —, este arquivo faz duas coisas que faltavam.
import { chamarRuntimeBase44 } from '../_lib/base44Runtime.js';
import { respostaDaLeila } from '../_lib/respostaDaLeila.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const message = String(body?.message || '').trim();
    const history = Array.isArray(body?.history) ? body.history : [];
    // 🔴 O SEGUNDO DEFEITO, achado na mesma investigação: a tela manda
    // `conversation_id` e `user_id` (LeilaChat.jsx), a function Deno LÊ os dois
    // (entry.ts, linha 48) — e esta ponte, no meio, jogava os dois fora. Ou
    // seja: mesmo com o Base44 no ar, a Leila nunca teve memória da conversa
    // (cada turno abria uma conversa nova) nem soube o nome de quem falava.
    // São exatamente os dois problemas que a própria entry.ts diz ter corrigido.
    const conversationId = String(body?.conversation_id || '').trim();
    const userId = String(body?.user_id || '').trim();

    if (!message) {
      return res.status(400).json({ error: 'message é obrigatório' });
    }

    const bruta = await chamarRuntimeBase44('leilaChat', {
      message,
      history,
      ...(conversationId ? { conversation_id: conversationId } : {}),
      ...(userId ? { user_id: userId } : {}),
    }, 28000);

    // 🔴 NUNCA repassar o JSON cru. Ver api/_lib/respostaDaLeila.js: foi assim
    // que "Functions are blocked - app owner lacks backend functions
    // capability" apareceu dentro de uma bolha de chat, pra cliente.
    const resposta = respostaDaLeila(bruta);
    if (resposta.status !== 'success') {
      console.error('[leilaChat] runtime indisponível:', resposta.motivo_tecnico || '(sem motivo)');
    }
    return res.status(200).json(resposta);
  } catch (e) {
    // A ponte nem respondeu (rede, timeout, 5xx). Mesma frase — quem está do
    // outro lado não precisa saber a diferença, e o log registra qual foi.
    console.error('[leilaChat] ponte falhou:', String(e?.message || e));
    return res.status(200).json(respostaDaLeila(null));
  }
}
