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
import { filtrarPorLeilao, idsDeLeilaoDosBanners, proximoFimDeLeilao } from '@/lib/bannerDoLeilao';

// 🖼️ Banners do Painel de Mídia, sempre atualizados — ver src/lib/bannersAoVivo.js —
// e agora com as três fileiras e a janela de datas (08/10/2026):
//   • `contexto` é a PÁGINA ('home' = Leilão, 'catalog' = Loja). A fileira que ela
//     de fato lê vem da configuração do painel: a própria, a Unificada, ou nenhuma
//     (src/lib/fileirasDeBanners.js);
//   • cada banner só aparece dentro da sua janela de datas (src/lib/janelaDoBanner.js).
//     A troca da meia-noite acontece na própria tela, no instante exato, sem rotina
//     no servidor;
//   • banner LIGADO a um leilão (`auction_id`) sai sozinho quando o leilão encerra
//     (src/lib/bannerDoLeilao.js): a tela vigia o horário do próprio leilão e tira o banner
//     no segundo em que ele acaba — mas ANTES de tirar confere de novo no banco, porque lance
//     de última hora prorroga o fim. O banco desliga o banner de vez ao mudar o status.
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

/** Do que veio do banco ao que a tela mostra: leilão encerrado, janela de datas, ordem e dispositivo. */
const derivar = (bruto, leiloes, agoraMs) => prepararBannersDoPainel(filtrarPorJanela(filtrarPorLeilao(bruto, leiloes, agoraMs), agoraMs));

const lerLeiloesGuardados = (chave) => {
  try {
    const j = JSON.parse(sessionStorage.getItem(`${chave}_leiloes`) || 'null');
    return j && typeof j === 'object' && !Array.isArray(j) ? j : {};
  } catch { return {}; }
};

export default function useBannersDoPainel({ contexto, chaveCache, chavePreload = '' }) {
  const [bruto, setBruto] = useState(() => {
    // ⚡ preload da arte da visita anterior: começa a baixar em paralelo com a consulta
    anunciarPrimeiroBanner(lerUrlGuardada(chavePreload));
    return (typeof sessionStorage === 'undefined' ? null : lerBannersGuardados(sessionStorage, chaveCache)) || [];
  });
  // { [auction_id]: { status, end_time } | null } dos banners ligados a leilão. Guardado junto do
  // cache para a primeira pintura já saber que o leilão acabou (sem piscar o banner antigo).
  const [leiloes, setLeiloes] = useState(() => (typeof sessionStorage === 'undefined' ? {} : lerLeiloesGuardados(chaveCache)));
  const [agora, setAgora] = useState(() => Date.now());
  const [banners, setBanners] = useState(() => derivar(bruto, leiloes, agora));
  const brutoAtual = useRef(bruto);
  const leiloesAtuais = useRef(leiloes);
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

      // 🏁 os leilões a que os banners estão ligados: status e fim ATUAIS (o fim pode ter sido
      // prorrogado por um lance). Sem os leilões, vale o que a tela já sabia.
      const ids = idsDeLeilaoDosBanners(dados);
      if (ids.length) {
        try {
          const achados = await Promise.all(ids.map((id) => Promise.resolve(plataforma.entities.Auction.filter({ id })).catch(() => null)));
          if (!vivo.current) return;
          const mapa = {};
          ids.forEach((id, i) => {
            const linha = Array.isArray(achados[i]) ? achados[i][0] : null;
            if (achados[i] === null) return;                       // consulta falhou: mantém o que sabia
            mapa[id] = linha ? { status: linha.status, end_time: linha.end_time } : null;   // null = leilão apagado
          });
          const novo = { ...leiloesAtuais.current, ...mapa };
          if (JSON.stringify(novo) !== JSON.stringify(leiloesAtuais.current)) {
            leiloesAtuais.current = novo;
            setLeiloes(novo);
            try { sessionStorage.setItem(`${chaveCache}_leiloes`, JSON.stringify(novo)); } catch { /* sem storage */ }
          }
        } catch { /* sem rede: a tela fica com o que já tinha */ }
      }

      if (bannersIguais(brutoAtual.current, dados)) return;
      brutoAtual.current = dados;
      setBruto(dados);
      guardarBanners(sessionStorage, chaveCache, dados);
    } catch { /* sem rede: a tela fica com o que já tinha */ }
  }, [contexto, chaveCache]);

  // o que a tela mostra = o que veio do banco, filtrado pela janela de datas de AGORA
  useEffect(() => {
    setBanners((anterior) => {
      const novo = derivar(bruto, leiloes, agora);
      return bannersIguais(anterior, novo) ? anterior : novo;
    });
  }, [bruto, leiloes, agora]);

  // preload da primeira arte para a próxima visita abrir instantânea
  const primeira = banners[0]?.image_url || '';
  useEffect(() => {
    if (!chavePreload || !primeira) return;
    try { localStorage.setItem(chavePreload, primeira); } catch { /* ignora */ }
    anunciarPrimeiroBanner(primeira);
  }, [chavePreload, primeira]);

  // a virada da meia-noite E o fim do leilão: dorme até o próximo instante em que algum banner
  // entra ou sai. No fim de um leilão ligado, CONFERE O BANCO ANTES de tirar o banner (lance de
  // última hora prorroga o fim) e só então reavalia — assim o banner não pisca nem sai à toa.
  useEffect(() => {
    const agoraMs = Date.now();
    const daJanela = proximaVirada(bruto, agoraMs);
    const doLeilao = proximoFimDeLeilao(bruto, leiloes, agoraMs);
    const proxima = [daJanela, doLeilao].filter((t) => t !== null).sort((a, b) => a - b)[0] ?? null;
    if (proxima === null) return undefined;
    const espera = Math.min(Math.max(proxima - agoraMs + 300, 300), 2_000_000_000);
    const t = setTimeout(async () => {
      if (doLeilao !== null && proxima === doLeilao) await buscar();
      setAgora(Date.now());
    }, espera);
    return () => clearTimeout(t);
  }, [bruto, leiloes, agora, buscar]);

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
