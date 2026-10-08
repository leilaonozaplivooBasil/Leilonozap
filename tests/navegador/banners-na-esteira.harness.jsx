/**
 * Banca do hook de banners (fileira certa + virada de datas) — NÃO vai para o
 * bundle da loja.
 *
 * 🖼️ 08/10/2026: o hook useBannersDoPainel é o que Home, Tigrinho, Loja e a aba
 * do Licenciado usam. Aqui ele roda de verdade, lendo um banco de mentira, e a
 * página só imprime os ids que a tela estaria mostrando.
 *   ?contexto=home|catalog      a página que está lendo
 *   ?modo=unificado             a Unificada ligada
 *   ?loja=desligada             a fileira da Loja desligada
 *   ?entra=<ms>&sai=<ms>        quando o banner "B" entra e o "C" sai (a partir de agora)
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import useBannersDoPainel from '@/hooks/useBannersDoPainel';

const q = new URLSearchParams(window.location.search);
const contexto = q.get('contexto') || 'home';
const agora = Date.now();
const iso = (t) => new Date(t).toISOString();
const entra = iso(agora + Number(q.get('entra') || 2500));
const sai = iso(agora + Number(q.get('sai') || 2500));

const b = (id, context, extra = {}) => ({ id, context, device_type: 'desktop', is_active: true, order: 0, image_url: `${id}.webp`, link_url: '', title: id, ...extra });
const config = (title, is_active) => ({ id: `cfg-${title}`, context: 'banner_fileira', title, is_active, device_type: 'desktop', image_url: '' });

window.__entidadesFalsas = {
  BannerImage: [
    b('A', 'home', { order: 0 }),
    b('B', 'home', { order: 1, starts_at: entra }),
    b('C', 'home', { order: 2, ends_at: sai }),
    b('L', 'catalog'),
    b('U1', 'unificado'),
    ...(q.get('modo') === 'unificado' ? [config('home', false), config('catalog', false), config('unificado', true)] : []),
    ...(q.get('loja') === 'desligada' ? [config('home', true), config('catalog', false), config('unificado', false)] : []),
  ],
};

function Pagina() {
  const banners = useBannersDoPainel({ contexto, chaveCache: `${contexto}_banners_cache` });
  return <ul data-teste="no-ar">{banners.map((x) => <li key={x.id}>{x.id}</li>)}</ul>;
}

createRoot(document.getElementById('raiz')).render(<Pagina />);
