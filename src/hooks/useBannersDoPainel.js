import { useCallback, useEffect, useRef, useState } from 'react';
import { plataforma } from '@/api/plataformaClient';
import { prepararBannersDoPainel } from '@/lib/bannersDoPainel';
import {
  INTERVALO_REVALIDACAO_MS,
  bannersIguais,
  deveRevalidar,
  guardarBanners,
  lerBannersGuardados,
} from '@/lib/bannersAoVivo';

// 🖼️ Banners do Painel de Mídia, sempre atualizados — ver src/lib/bannersAoVivo.js.
//
// Substitui (08/10/2026) os três blocos iguais que viviam em Home, TigrinhoNoLeilao
// e Catalog: cache de 10 min (2 min na Loja) no sessionStorage que SEGURAVA a
// busca e deixava o banner antigo no ar em quem já estava com o app aberto.
//
// Uso: const banners = useBannersDoPainel({ contexto: 'home', chaveCache: 'home_banners_cache' });

/** Avisa o navegador para baixar a primeira arte já, antes do React desenhar. */
function anunciarPrimeiroBanner(url) {
  if (!url || typeof document === 'undefined') return;
  if (document.querySelector('link[data-banner-preload]')) return;
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = url;
  link.setAttribute('fetchPriority', 'high');
  link.setAttribute('data-banner-preload', '1');
  document.head.appendChild(link);
}

function lerUrlGuardada(chave) {
  if (!chave) return '';
  try { return localStorage.getItem(chave) || ''; } catch { return ''; }
}

export default function useBannersDoPainel({ contexto, chaveCache, chavePreload = '' }) {
  const [banners, setBanners] = useState(() => {
    // ⚡ preload da arte da visita anterior: começa a baixar em paralelo com a consulta
    anunciarPrimeiroBanner(lerUrlGuardada(chavePreload));
    const guardados = typeof sessionStorage === 'undefined' ? null : lerBannersGuardados(sessionStorage, chaveCache);
    return guardados ? prepararBannersDoPainel(guardados) : [];
  });
  const atuais = useRef(banners);
  const ultimaBusca = useRef(0);
  const vivo = useRef(true);

  const buscar = useCallback(async () => {
    ultimaBusca.current = Date.now();
    try {
      const dados = await plataforma.entities.BannerImage.filter({ is_active: true, context: contexto });
      const preparados = prepararBannersDoPainel(dados);
      if (!vivo.current) return;
      if (chavePreload && preparados[0]?.image_url) {
        try { localStorage.setItem(chavePreload, preparados[0].image_url); } catch { /* ignora */ }
        anunciarPrimeiroBanner(preparados[0].image_url);
      }
      if (bannersIguais(atuais.current, preparados)) return;
      atuais.current = preparados;
      setBanners(preparados);
      guardarBanners(sessionStorage, chaveCache, preparados);
    } catch { /* sem rede: a tela fica com o que já tinha */ }
  }, [contexto, chaveCache, chavePreload]);

  useEffect(() => {
    vivo.current = true;
    buscar();

    const aoVoltar = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (deveRevalidar({ ultimaBuscaMs: ultimaBusca.current })) buscar();
    };
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('focus', aoVoltar);
    const relogio = setInterval(aoVoltar, INTERVALO_REVALIDACAO_MS);

    return () => {
      vivo.current = false;
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('focus', aoVoltar);
      clearInterval(relogio);
    };
  }, [buscar]);

  return banners;
}
