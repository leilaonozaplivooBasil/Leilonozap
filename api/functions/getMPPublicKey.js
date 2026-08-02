// getMPPublicKey — entrega a Public Key do Mercado Pago pro SDK JS do checkout.
// É seguro expor essa chave no navegador (é o próprio propósito dela, diferente
// do MP_ACCESS_TOKEN que é privado e nunca sai do servidor).
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  const publicKey = process.env.MP_PUBLIC_KEY || null;
  if (!publicKey) return res.status(200).json({ success: false, error: 'Public Key não configurada' });
  return res.status(200).json({ success: true, public_key: publicKey });
}