import { useState, useEffect } from 'react';
import { plataforma } from '@/api/plataformaClient';

// Mídia institucional gerenciada pelo Painel de Mídia (/PainelMidia).
// Logo e favicon customizados vivem na tabela banner_images com contexts
// especiais ('site_logo' / 'site_favicon'). Sem registro ativo → fallback
// para os assets estáticos de /public.
export const LOGO_FALLBACK = '/brand/logo-horizontal-dark.webp';
export const FAVICON_FALLBACK = '/favicon-512.png';

let cached = null; // evita refetch/flash a cada troca de página

export default function useSiteMedia() {
  const [media, setMedia] = useState(
    cached || { logoUrl: LOGO_FALLBACK, faviconUrl: null }
  );

  useEffect(() => {
    if (cached) return;
    let alive = true;
    (async () => {
      try {
        const [logos, favicons] = await Promise.all([
          plataforma.entities.BannerImage.filter({ context: 'site_logo', is_active: true }),
          plataforma.entities.BannerImage.filter({ context: 'site_favicon', is_active: true }),
        ]);
        const next = {
          logoUrl: logos?.[0]?.image_url || LOGO_FALLBACK,
          faviconUrl: favicons?.[0]?.image_url || null,
        };
        cached = next;
        if (alive) setMedia(next);
      } catch {
        // sem rede/permissão → mantém fallback estático
      }
    })();
    return () => { alive = false; };
  }, []);

  // Favicon custom substitui os <link rel="icon"> do index.html
  useEffect(() => {
    if (!media.faviconUrl) return;
    document.querySelectorAll("link[rel='icon']").forEach((l) => l.remove());
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = media.faviconUrl;
    document.head.appendChild(link);
  }, [media.faviconUrl]);

  return media;
}

// Chamado pelo Painel de Mídia após salvar, para o app refletir na hora.
export function invalidateSiteMediaCache() {
  cached = null;
}
