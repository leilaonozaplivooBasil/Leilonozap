import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { imageUrl } = await req.json();
    if (!imageUrl) {
      return Response.json({ error: 'imageUrl is required' }, { status: 400 });
    }

    // Se já é do Supabase, retorna direto
    if (imageUrl.includes('supabase.co')) {
      return Response.json({ file_url: imageUrl });
    }

    // Download da imagem server-side (sem restrição CORS)
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!imageResponse.ok) {
      return Response.json({ error: `Failed to download image: ${imageResponse.status}` }, { status: 502 });
    }

    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const imageBuffer = await imageResponse.arrayBuffer();

    if (imageBuffer.byteLength < 100) {
      return Response.json({ error: 'Downloaded image too small, likely invalid' }, { status: 502 });
    }

    // Determina extensão
    let ext = '.jpg';
    if (contentType.includes('png')) ext = '.png';
    else if (contentType.includes('webp')) ext = '.webp';
    else if (contentType.includes('gif')) ext = '.gif';

    const fileName = `proxy_${Date.now()}${ext}`;

    // Cria File object para upload
    const file = new File([imageBuffer], fileName, { type: contentType });

    // Upload via Base44 UploadFile
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    return Response.json({ file_url });
  } catch (error) {
    console.error('proxyImage error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});