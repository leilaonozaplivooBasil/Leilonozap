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
import { CONTEXTO_CONFIG, fileiraDaPagina, lerFileiras } from '@/lib/fileirasDeBanners';
import { filtrarPorJanela, proximaVirada } from '@/lib/janelaDoBanner';

// 🖼️ Banners do Painel de Mídia, sempre atualizados — ver src/lib/bannersAoVivo.js —
// e agora com as três fileiras e a janela de datas (08/10/2026):
//   • `contexto` é a PÁGINA ('home' = Leilão, 'catalog' = Loja). A fileira que ela
//     de fato lê vem da configuração do painel: a própria, a Unificada, ou nenhuma
//     (src/lib/fileirasDeBanners.js);
//   • cada banner só aparece dentro da sua janela de datas (src/lib/janelaDoBanner.js).
//     A troca da meia-noite acontece na própria tela, no instante exato, sem rotina
//     no servidor.
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

/** Do que veio do banco ao que a tela mostra: janela de datas, ordem e dispositivo. */
const derivar = (bruto, agoraMs) => prepararBannersDoPainel(filtrarPorJanela(bruto, agoraMs));

export default function useBannersDoPainel({ contexto, chaveCache, chavePreload = '' }) {
  const [bruto, setBruto] = useState(() => {
    // ⚡ preload da arte da visita anterior: começa a baixar em paralelo com a consulta
    anunciarPrimeiroBanner(lerUrlGuardada(chavePreload));
    return (typeof sessionStorage === 'undefined' ? null : lerBannersGuardados(sessionStorage, chaveCache)) || [];
  });
  const [agora, setAgora] = useState(() => Date.now());
  const [banners, setBanners] = useState(() => derivar(bruto, agora));
  const brutoAtual = useRef(bruto);
  const ultimaBusca = useRef(0);
  const vivo = useRef(true);

  const buscar = useCallback(async () => {
    ultimaBusca.current = Date.now();
    try {
      const entidade = plataforma.entities.BannerImage;
      const [config, daPagina, unificados] = await Promise.all([
        // sem configuração legível, vale o padrão (Leilão e Loja no ar)
        Promise.resolve(entidade.filter({ context: CONTEXTO_CONFIG })).catch(() => []),
        entidade.filter({ is_active: true, context: contexto }),
        entidade.filter({ is_active: true, context: 'unificado' }),
      ]);
      if (!vivo.current) return;
      const escolhida = fileiraDaPagina(contexto, lerFileiras(config));
      const dados = escolhida === 'unificado' ? unificados : escolhida === contexto ? daPagina : [];
      if (bannersIguais(brutoAtual.current, dados)) return;
      brutoAtual.current = dados;
      setBruto(dados);
      guardarBanners(sessionStorage, chaveCache, dados);
    } catch { /* sem rede: a tela fica com o que já tinha */ }
  }, [contexto, chaveCache]);

  // o que a tela mostra = o que veio do banco, filtrado pela janela de datas de AGORA
  useEffect(() => {
    setBanners((anterior) => {
      const novo = derivar(bruto, agora);
      return bannersIguais(anterior, novo) ? anterior : novo;
    });
  }, [bruto, agora]);

  // preload da primeira arte para a próxima visita abrir instantânea
  const primeira = banners[0]?.image_url || '';
  useEffect(() => {
    if (!chavePreload || !primeira) return;
    try { localStorage.setItem(chavePreload, primeira); } catch { /* ignora */ }
    anunciarPrimeiroBanner(primeira);
  }, [chavePreload, primeira]);

  // a virada da meia-noite: dorme até o próximo instante em que algum banner entra ou sai
  useEffect(() => {
    const proxima = proximaVirada(bruto, Date.now());
    if (proxima === null) return undefined;
    const espera = Math.min(Math.max(proxima - Date.now() + 500, 500), 2_000_000_000);
    const t = setTimeout(() => setAgora(Date.now()), espera);
    return () => clearTimeout(t);
  }, [bruto, agora]);

  useEffect(() => {
    vivo.current = true;
    buscar();

    const aoVoltar = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      setAgora(Date.now()); // o aparelho dormiu? a janela de datas é reavaliada na hora
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
