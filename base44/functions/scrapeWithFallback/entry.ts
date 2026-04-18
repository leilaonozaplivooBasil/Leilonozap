import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Helper: safely get nested field
function get(obj, path, def = undefined) {
  try {
    return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj) ?? def;
  } catch (_) {
    return def;
  }
}

function normalizeMidiaResponse(json) {
  // Accept either { data: {...} } or flat
  const data = json?.data ?? json ?? {};
  const title = data.title || data.name || '';
  const description = data.description || '';
  let price = null;
  if (typeof data.price === 'number') {
    price = data.price;
  } else if (typeof data.price === 'string') {
    const cleaned = data.price
      .replace(/[^\d,.-]/g, '') // keep digits, comma, dot, minus
      .replace(/\./g, '')       // remove thousand separators
      .replace(',', '.');        // convert decimal comma to dot
    const n = Number(cleaned);
    price = Number.isFinite(n) ? n : null;
  }

  // images can be array of strings or objects { url }
  let images = Array.isArray(data.images) ? data.images : Array.isArray(data.product_images) ? data.product_images : [];
  const imageUrls = images
    .map((img) => (typeof img === 'string' ? img : img?.url))
    .filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u));

  const store = data.store || data.store_name || get(data, 'metadata.store');
  const attributes = (data.attributes && typeof data.attributes === 'object') ? data.attributes : {};

  return { title, description, price, imageUrls, store, attributes };
}

function parseTitleFromUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    // take last path segment with words
    const segs = u.pathname.split('/').filter(Boolean);
    const last = decodeURIComponent(segs[segs.length - 1] || '').replace(/[-_]+/g, ' ');
    // remove id-like chunks
    const cleaned = last.replace(/\b(\d{6,}|\d+x\d+|[a-z0-9]{8,})\b/gi, ' ').replace(/\s+/g, ' ').trim();
    return cleaned || u.hostname.replace(/^www\./, '');
  } catch (_) {
    return '';
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productUrl } = await req.json();
    if (!productUrl || typeof productUrl !== 'string') {
      return Response.json({ error: 'productUrl is required' }, { status: 400 });
    }

    // 1) Try Midia API first
    let midiaOk = false;
    let midiaData = null;
    try {
      const res = await fetch('https://api.midia.dev.br/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ url: productUrl, download_images: false }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        const norm = normalizeMidiaResponse(json);
        if ((norm.title && norm.description) || (norm.imageUrls && norm.imageUrls.length > 0)) {
          midiaOk = true;
          midiaData = norm;
        }
      }
    } catch (_) {
      // ignore midia failure, we'll fallback
    }

    if (midiaOk) {
      return Response.json({
        success: true,
        source: 'midia',
        title: midiaData.title || '',
        description: midiaData.description || '',
        price: midiaData.price ?? null,
        imageUrls: midiaData.imageUrls || [],
        store: midiaData.store || null,
        attributes: midiaData.attributes || {},
        original_url: productUrl,
      });
    }

    // 2) Se for Mercado Livre, tenta extractMLImages (API oficial ML + SerpAPI)
    const isMercadoLivre = productUrl.includes('mercadolivre.com.br') || productUrl.includes('mercadolibre.com');
    if (isMercadoLivre) {
      try {
        const mlRes = await base44.asServiceRole.functions.invoke('extractMLImages', { productUrl });
        const mlData = mlRes?.data ?? mlRes;
        if (mlData?.found && mlData?.images?.length > 0) {
          return Response.json({
            success: true,
            source: 'mercadolivre',
            title: mlData.title || '',
            description: mlData.description || mlData.title || '',
            price: mlData.price ?? null,
            imageUrls: mlData.images,
            original_url: productUrl,
          });
        }
      } catch (_) {
        // se extractMLImages falhar, continua para fallback
      }
    }

    // 3) Fallback path: try our existing importFromUrl first to get any structured data
    let fallbackTitle = '';
    try {
      const imp = await base44.asServiceRole.functions.invoke('importFromUrl', { productUrl });
      const impData = imp?.data ?? imp; // handle both shapes
      if (impData && (impData.title || (impData.imageUrls && impData.imageUrls.length))) {
        // If importFromUrl already got images, return it directly as a fast fallback
        if (impData.imageUrls && impData.imageUrls.length) {
          return Response.json({
            success: true,
            source: 'fallback_import',
            title: impData.title || '',
            description: impData.description || '',
            price: impData.price ?? null,
            imageUrls: impData.imageUrls,
            original_url: productUrl,
          });
        }
        fallbackTitle = impData.title || '';
      }
    } catch (_) {
      // ignore and continue
    }

    // 4) Fallback to Google Shopping via our searchProductByName function
    const inferredTitle = fallbackTitle || parseTitleFromUrl(productUrl);
    if (inferredTitle && inferredTitle.length >= 3) {
      try {
        const g = await base44.asServiceRole.functions.invoke('searchProductByName', { productName: inferredTitle });
        const gData = g?.data ?? g;
        if (gData && (gData.imageUrls?.length || gData.ads?.length)) {
          // prefer direct imageUrls; if only ads exist, try to use their images list
          const imageUrls = Array.isArray(gData.imageUrls) && gData.imageUrls.length
            ? gData.imageUrls
            : [];
          return Response.json({
            success: true,
            source: 'google',
            title: gData.title || inferredTitle,
            description: gData.description || '',
            price: gData.price ?? null,
            imageUrls,
            original_url: productUrl,
          });
        }
      } catch (_) {
        // ignore
      }
    }

    return Response.json({ success: false, error: 'Unable to extract product data from sources' }, { status: 502 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});