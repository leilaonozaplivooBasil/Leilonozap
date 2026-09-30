// 📦 O código de retirada de cada pedido (30/09/2026). Derivado do id da venda
// com a chave do servidor: não precisa de coluna nova, não muda, e só o servidor
// sabe calcular — o navegador nunca vê a chave, só o código do PRÓPRIO pedido.
import crypto from 'crypto';

const chave = () => process.env.SESSAO_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/** 6 dígitos, sempre os mesmos para a mesma venda. */
export function codigoDeRetirada(saleId, segredo = chave()) {
  const h = crypto.createHmac('sha256', String(segredo)).update(`retirada-v1|${saleId}`).digest();
  return String(h.readUInt32BE(0) % 1_000_000).padStart(6, '0');
}

export function codigoConfere(saleId, digitado, segredo = chave()) {
  const a = Buffer.from(String(digitado || '').replace(/\D/g, ''));
  const b = Buffer.from(codigoDeRetirada(saleId, segredo));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
