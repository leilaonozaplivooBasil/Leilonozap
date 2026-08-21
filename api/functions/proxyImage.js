// proxyImage — Rota Vercel que faltava. O cliente chama /api/functions/proxyImage
// (via base44.functions.invoke) pra contornar CORS de imagens externas. A função
// Base44 existe (base44/functions/proxyImage/entry.ts) mas a rota Vercel nunca
// foi criada — sem ela, o proxy retorna 404 e o share com imagem externa falha.
//
// Lógica: download server-side (sem CORS) → upload pro bucket public-assets do
// Supabase → retorna { file_url } com URL supabase (que tem CORS headers, então
// o fetch do cliente funciona).
//
// ══════════════════════════════════════════════════════════════════════════════
// 🔒 BLINDAGEM SSRF — FASE 1, item 5 (21/08/2026, autorizado pelo dono)
// ══════════════════════════════════════════════════════════════════════════════
// COMO ESTAVA: `imageUrl` vinha do navegador e ia DIRETO pro fetch. Sem esquema,
// sem lista de bloqueio, sem tipo, sem tamanho. Quem mandasse
//     { "imageUrl": "http://169.254.169.254/latest/meta-data/" }
// fazia o SERVIDOR buscar o painel de metadados da nuvem e GRAVAR o resultado
// num bucket PÚBLICO, usando a chave de serviço. Isso é SSRF + upload aberto.
//
// O QUE MUDOU:
//   1. a URL passa pelo porteiro (api/_lib/urlSegura.js) — rede interna, metadados,
//      file://, IP disfarçado de decimal/hexa/octal e IPv6 interno ficam de fora;
//   2. o redirecionamento é seguido À MÃO, conferindo CADA salto — sem isso,
//      um 302 do site do atacante levava o servidor pra rede interna assim mesmo;
//   3. só content-type que começa com `image/` é aceito;
//   4. teto de 8 MB, conferido no que o servidor declara E no que realmente veio;
//   5. o nome do arquivo virou o HASH da URL de origem, não mais Date.now().
//      Antes, cada chamada criava um arquivo novo — dava pra encher o bucket
//      chamando em looping. Agora a mesma foto reaproveita o mesmo arquivo.
//
// ⚠️ O QUE **NÃO** MUDOU (risco residual, de propósito): esta rota continua SEM
// crachá. Ela é usada pelo botão de compartilhar da vitrine e da sala do leilão,
// que VISITANTE DESLOGADO usa. Exigir crachá aqui quebraria o compartilhamento
// para quem ainda não fez login. O que falta aqui é limite de chamadas por IP —
// isso é FASE 4, não dá pra resolver dentro deste arquivo.
//
// ⚠️ `permitirHttp: true` é intencional: existe foto antiga de fornecedor ainda
// servida em http://. Bloquear o esquema quebraria o share dessas fotos. O que
// protege não é o esquema, é a lista de redes — e ela vale nos dois modos
// (comprovado no teste: metadados continua barrado com permitirHttp ligado).
import crypto from 'crypto';
import { buscarComSeguranca } from '../_lib/urlSegura.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TETO_BYTES = 8 * 1024 * 1024;

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

    const imageUrl = String(body?.imageUrl || '').trim();
    if (!imageUrl) return res.status(400).json({ error: 'imageUrl is required' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ error: 'Config ausente' });

    // Se já é do Supabase, retorna direto (não precisa de proxy — tem CORS)
    if (imageUrl.includes('supabase.co') || imageUrl.includes('base44.app')) {
      return res.status(200).json({ file_url: imageUrl });
    }

    // 🔒 Download conferindo a URL e CADA redirecionamento, com teto de tamanho
    // e exigindo que o que voltou seja imagem de verdade.
    const baixada = await buscarComSeguranca(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      permitirHttp: true,
      maxBytes: TETO_BYTES,
      tiposAceitos: ['image/'],
    });

    if (!baixada.ok) {
      // 400 quando o pedido é que estava errado (URL proibida/inválida);
      // 502 quando quem falhou foi a origem.
      const culpaDoPedido = !['origem_respondeu_erro'].includes(baixada.motivo);
      return res.status(culpaDoPedido ? 400 : 502).json({ error: `imagem recusada: ${baixada.motivo}` });
    }

    const contentType = baixada.tipo || 'image/jpeg';
    const imageBuffer = baixada.buffer;

    if (imageBuffer.byteLength < 100) {
      return res.status(502).json({ error: 'Downloaded image too small, likely invalid' });
    }

    // Determina extensão
    let ext = '.jpg';
    if (contentType.includes('png')) ext = '.png';
    else if (contentType.includes('webp')) ext = '.webp';
    else if (contentType.includes('gif')) ext = '.gif';

    // Nome = hash da URL de origem. A mesma foto sempre cai no mesmo arquivo, então
    // chamar mil vezes gera UM arquivo, não mil. (Antes era Date.now().)
    const marca = crypto.createHash('sha256').update(imageUrl).digest('hex').slice(0, 32);
    const filePath = `proxy/${marca}${ext}`;

    // Upload pro bucket public-assets do Supabase (mesmo bucket do adapter Core.UploadFile)
    const uploadResp = await fetch(`${SUPABASE_URL}/storage/v1/object/public-assets/${filePath}`, {
      method: 'POST',
      headers: {
        apikey: SR,
        Authorization: `Bearer ${SR}`,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: imageBuffer,
    });

    if (!uploadResp.ok) {
      const errText = await uploadResp.text().catch(() => '');
      return res.status(502).json({ error: `Upload failed: ${uploadResp.status}`, details: errText });
    }

    // URL pública do Supabase (tem CORS headers — o fetch do cliente funciona)
    const file_url = `${SUPABASE_URL}/storage/v1/object/public/public-assets/${filePath}`;

    return res.status(200).json({ file_url });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
