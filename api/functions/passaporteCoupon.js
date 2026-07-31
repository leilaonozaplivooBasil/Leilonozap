// passaporteCoupon — consulta a situação do Cupom Passaporte do usuário (para o carrinho).
// Somente leitura: o desconto de verdade é sempre recalculado no checkout (servidor).
import { statusCupons } from '../_lib/passaporteCoupon.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const userId = String(body?.user_id || '').trim();
    if (!userId) return res.status(400).json({ success: false, error: 'user_id é obrigatório' });
    const s = await statusCupons(userId);
    return res.status(200).json({ success: true, ...s });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}