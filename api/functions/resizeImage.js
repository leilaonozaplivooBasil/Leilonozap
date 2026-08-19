// resizeImage — miniatura redimensionada no servidor para fotos de produto
// vindas do fornecedor. Hoje o app usa a foto ORIGINAL (às vezes vários MB)
// pra desenhar um ícone de 40-64px em listas com centenas/milhares de itens
// (balcão do PDV, gestão de lotes) — isso é o que deixa essas telas pesadas.
// Aqui baixa a imagem original, redimensiona/comprime em WEBP e devolve com
// cache longo. Qualquer falha cai no REDIRECT pra imagem original — nunca
// quebra a foto, só deixa de otimizar.
import sharp from 'sharp';

const LARGURAS_PERMITIDAS = [64, 96, 160, 240, 320, 480, 640];

function origemSegura(url) {
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) return false;
    const host = u.hostname.toLowerCase();
    if (host === 'localhost' || host === '0.0.0.0') return false;
    if (/^127\.|^10\.|^169\.254\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });

  const url = req.query?.url;
  const wPedida = Number(req.query?.w);
  const width = LARGURAS_PERMITIDAS.includes(wPedida) ? wPedida : 240;

  if (!url || !origemSegura(url)) return res.status(400).json({ error: 'url inválida' });

  try {
    const origem = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    });
    if (!origem.ok) return res.redirect(302, url);

    const buffer = Buffer.from(await origem.arrayBuffer());
    const redimensionada = await sharp(buffer)
      .resize(width, width, { fit: 'cover', withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();

    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    return res.status(200).send(redimensionada);
  } catch (e) {
    // Fornecedor com imagem corrompida, formato exótico, ou fetch falhou —
    // devolve a original em vez de quebrar o card do produto.
    return res.redirect(302, url);
  }
}
