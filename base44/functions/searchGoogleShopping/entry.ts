// 🛡️ VEREDITO ML — busca via SerpAPI (Google Shopping)
// Estratégia INSPIRADA no Comparaí (que funciona em produção há meses):
//   • Limpeza simples e PERMISSIVA (não cortar palavras-chave do produto)
//   • SerpAPI retorna ML + Amazon + Magalu + Shopee + Casas Bahia JUNTOS
//   • Filtro de RELEVÂNCIA por match-ratio (≥30% das palavras do título batem)
//   • Marca origem (ml | market) para diferenciação visual no Veredito
//   • Validação de preço flexível (R$ 5 ~ R$ 500.000)
//
// CONTRATO DE RESPOSTA: { products: [...], totalResults, debug }
//   products[i] = { title, price, store, url, image, mercadolivre_url, isMercadoLivre, matchRatio }

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ===================================================================
// 🧹 LIMPEZA DE TÍTULOS — RECEITA DO COMPARAÍ (validada em produção)
// ===================================================================
function cleanTitle(title) {
  if (!title) return '';
  let clean = title
    .replace(/leil[aã]o\s*(nozap|no\s*zap)?/gi, '')
    .replace(/\b(novo|usado|semi[-\s]?novo|original|lacrado|garantia|frete\s*gr[aá]tis)\b/gi, '')
    .replace(/\b(arremate|devolu[çc][aã]o|promo[çc][aã]o)\b/gi, '')
    .replace(/\b(110v|220v|bivolt)\b/gi, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = clean.split(' ').filter(w => w.length > 1);
  return words.slice(0, 8).join(' ');
}

// ===================================================================
// 💰 VALIDAÇÃO DE PREÇO — flexível (igual Comparaí)
// ===================================================================
function isValidPrice(price) {
  if (!price || price < 5) return false;       // mínimo R$ 5 (evita rating tipo "4,72")
  if (price > 500000) return false;            // máximo R$ 500k
  return true;
}

// ===================================================================
// 🎯 MATCH-RATIO — calcula relevância do resultado vs título buscado
// ===================================================================
function computeMatchRatio(cleanedTerm, foundTitle) {
  const termWords = cleanedTerm.toLowerCase().split(' ').filter(w => w.length > 2);
  if (termWords.length === 0) return 0;
  const found = (foundTitle || '').toLowerCase();
  const hits = termWords.filter(w => found.includes(w)).length;
  return hits / termWords.length;
}

// ===================================================================
// 💵 EXTRAÇÃO DE PREÇO
// ===================================================================
function extractPrice(result) {
  if (typeof result?.extracted_price === 'number') return result.extracted_price;
  if (typeof result?.price === 'number') return result.price;
  if (typeof result?.price === 'string') {
    const clean = result.price.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.');
    const n = parseFloat(clean);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

// ===================================================================
// 🛒 DETECÇÃO DE MERCADO LIVRE
// ===================================================================
function isMercadoLivre(result) {
  const source = (result?.source || '').toLowerCase();
  const link = (result?.product_link || result?.link || '').toLowerCase();
  return (
    source.includes('mercado livre') ||
    source.includes('mercadolivre') ||
    link.includes('mercadolivre.com') ||
    link.includes('mlstatic')
  );
}

// ===================================================================
// HANDLER
// ===================================================================
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const productName = (body?.productName || '').toString().trim();
    // skipCleaning: usado pelo retry agressivo (já limpo do lado do cliente)
    const skipCleaning = body?.skipCleaning === true;
    // minMatchRatio: cliente pode afrouxar pra 0.2 em retry (default 0.3 = Comparaí)
    const minMatchRatio = typeof body?.minMatchRatio === 'number' ? body.minMatchRatio : 0.3;

    if (!productName) {
      return Response.json({ error: 'Product name is required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('SERPAPI_KEY');
    if (!apiKey) {
      return Response.json({ error: 'SerpAPI key not configured' }, { status: 500 });
    }

    // Limpa o título (a não ser que o cliente já tenha feito)
    const cleanedTerm = skipCleaning ? productName : cleanTitle(productName);

    if (!cleanedTerm || cleanedTerm.length < 3) {
      return Response.json({
        products: [],
        totalResults: 0,
        message: 'Título muito curto após limpeza',
        debug: { originalTitle: productName, cleanedTerm },
      });
    }

    const serpApiUrl = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(cleanedTerm)}&location=Brazil&google_domain=google.com.br&hl=pt&gl=br&api_key=${apiKey}`;

    console.log('🔍 SerpAPI termo limpo:', cleanedTerm);

    const response = await fetch(serpApiUrl);
    const data = await response.json();

    if (data.error) {
      console.error('❌ SerpAPI error:', data.error);
      return Response.json({
        error: data.error,
        products: [],
        message: 'Erro na API: ' + data.error,
      }, { status: 500 });
    }

    const shoppingResults = Array.isArray(data?.shopping_results) ? data.shopping_results : [];

    if (shoppingResults.length === 0) {
      console.warn('⚠️ Zero resultados pra:', cleanedTerm);
      return Response.json({
        products: [],
        totalResults: 0,
        message: 'Nenhum resultado encontrado',
        debug: { cleanedTerm, hasShopping: false },
      });
    }

    // Processa TODOS os resultados (até 15) — ML + varejo geral juntos
    const products = shoppingResults
      .slice(0, 15)
      .map(result => {
        const price = extractPrice(result);
        const ml = isMercadoLivre(result);
        const url = result.product_link || result.link || null;
        const matchRatio = computeMatchRatio(cleanedTerm, result.title || '');

        return {
          title: result.title || 'Produto sem título',
          price,
          store: result.source || 'Loja não informada',
          url,
          image: result.thumbnail || null,
          mercadolivre_url: ml ? url : null,
          isMercadoLivre: ml,
          matchRatio,
        };
      })
      // Filtros: preço válido + relevância mínima + URL existe
      .filter(p => {
        if (!isValidPrice(p.price)) return false;
        if (!p.url) return false;
        if (p.matchRatio < minMatchRatio) return false;
        return true;
      });

    // Ordena: ML primeiro (preferência), depois por match-ratio desc, depois preço asc
    products.sort((a, b) => {
      if (a.isMercadoLivre !== b.isMercadoLivre) return a.isMercadoLivre ? -1 : 1;
      if (Math.abs(a.matchRatio - b.matchRatio) > 0.05) return b.matchRatio - a.matchRatio;
      return a.price - b.price;
    });

    console.log(`✅ ${products.length} produtos válidos (ML: ${products.filter(p => p.isMercadoLivre).length})`);

    return Response.json({
      products: products.slice(0, 10),
      totalResults: shoppingResults.length,
      debug: {
        cleanedTerm,
        rawCount: shoppingResults.length,
        validCount: products.length,
        mlCount: products.filter(p => p.isMercadoLivre).length,
        marketCount: products.filter(p => !p.isMercadoLivre).length,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar no Google Shopping:', error);
    return Response.json({
      error: error.message,
      products: [],
    }, { status: 500 });
  }
});