// searchGoogleShopping — preço real de um produto no Google Shopping (SerpAPI).
//
// 15/09/2026 — Esta função existia só em base44/functions/ (Deno, que a Vercel
// não serve). O "Veredito de Mercado" e o botão "Validar" do analisador de lotes
// chamavam a rota, recebiam "not_implemented" e concluíam "DADOS INSUFICIENTES"
// para todo item, sempre. Portada para cá, com a mesma limpeza de título e a
// mesma ordenação (Mercado Livre primeiro, depois aderência ao termo, depois
// preço). Sem SERPAPI_KEY na Vercel a resposta diz isso claramente
// (`configured: false`) em vez de fingir que pesquisou.
import { estourouLimite, ipDoRequest } from '../_lib/rateLimit.js';

const SERPAPI_KEY = process.env.SERPAPI_KEY;

export function limparTitulo(title) {
  if (!title) return '';
  const clean = String(title)
    .replace(/leil[aã]o\s*(nozap|no\s*zap)?/gi, '')
    .replace(/\b(novo|usado|semi[-\s]?novo|original|lacrado|garantia|frete\s*gr[aá]tis)\b/gi, '')
    .replace(/\b(arremate|devolu[çc][aã]o|promo[çc][aã]o)\b/gi, '')
    .replace(/\b(110v|220v|bivolt)\b/gi, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.split(' ').filter((w) => w.length > 1).slice(0, 8).join(' ');
}

const precoValido = (p) => Number.isFinite(p) && p >= 5 && p <= 500000;

function aderencia(termo, tituloAchado) {
  const palavras = termo.toLowerCase().split(' ').filter((w) => w.length > 2);
  if (!palavras.length) return 0;
  const achado = String(tituloAchado || '').toLowerCase();
  return palavras.filter((w) => achado.includes(w)).length / palavras.length;
}

function extrairPreco(r) {
  if (typeof r?.extracted_price === 'number') return r.extracted_price;
  if (typeof r?.price === 'number') return r.price;
  if (typeof r?.price === 'string') {
    const n = parseFloat(r.price.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function ehMercadoLivre(r) {
  const source = String(r?.source || '').toLowerCase();
  const link = String(r?.product_link || r?.link || '').toLowerCase();
  return source.includes('mercado livre') || source.includes('mercadolivre') || link.includes('mercadolivre.com') || link.includes('mlstatic');
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const productName = String(body?.productName || '').trim();
    const skipCleaning = body?.skipCleaning === true;
    const minMatchRatio = typeof body?.minMatchRatio === 'number' ? body.minMatchRatio : 0.3;
    if (!productName) return res.status(400).json({ success: false, error: 'productName obrigatório', products: [], data: { products: [] } });

    if (!SERPAPI_KEY) {
      return res.status(200).json({ success: false, configured: false, error: 'SERPAPI_KEY não configurada na Vercel', products: [], data: { products: [], totalResults: 0 } });
    }
    // Cada consulta gasta cota paga da SerpAPI: 120 por IP a cada 5 min cobre um lote inteiro sem virar torneira.
    if (await estourouLimite(`shopping:${ipDoRequest(req)}`, 120, 300)) {
      return res.status(429).json({ success: false, error: 'muitas consultas', products: [], data: { products: [] } });
    }

    const termo = skipCleaning ? productName : limparTitulo(productName);
    if (!termo || termo.length < 3) {
      return res.status(200).json({ success: true, configured: true, products: [], data: { products: [], totalResults: 0, message: 'Título muito curto após limpeza' } });
    }

    const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(termo)}&location=Brazil&google_domain=google.com.br&hl=pt&gl=br&api_key=${SERPAPI_KEY}`;
    const r = await fetch(url);
    const dados = await r.json().catch(() => ({}));
    if (dados?.error) {
      return res.status(200).json({ success: false, configured: true, error: String(dados.error), products: [], data: { products: [] } });
    }
    const brutos = Array.isArray(dados?.shopping_results) ? dados.shopping_results : [];
    const products = brutos.slice(0, 15).map((x) => {
      const price = extrairPreco(x);
      const ml = ehMercadoLivre(x);
      const link = x.product_link || x.link || null;
      return {
        title: x.title || 'Produto sem título',
        price,
        store: x.source || 'Loja não informada',
        source: x.source || '',
        url: link,
        image: x.thumbnail || null,
        mercadolivre_url: ml ? link : null,
        isMercadoLivre: ml,
        matchRatio: aderencia(termo, x.title || ''),
      };
    }).filter((p) => precoValido(p.price) && p.url && p.matchRatio >= minMatchRatio);

    products.sort((a, b) => {
      if (a.isMercadoLivre !== b.isMercadoLivre) return a.isMercadoLivre ? -1 : 1;
      if (b.matchRatio !== a.matchRatio) return b.matchRatio - a.matchRatio;
      return a.price - b.price;
    });

    const payload = { products, totalResults: products.length, cleanedTerm: termo };
    return res.status(200).json({ success: true, configured: true, ...payload, data: payload });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e), products: [], data: { products: [] } });
  }
}
