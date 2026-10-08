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
 *   ?leilao=fim|prorrogado|encerrado|agendado|sumiu   o banner "T" ligado a um leilão (08/10/2026)
 *       fim         o leilão acaba em ~2,5 s e continua "no ar" no banco (o robô ainda não fechou)
 *       prorrogado  acaba em ~2 s, mas um lance prorroga o fim para ~5 s (o banner NÃO pode sair aos 2 s)
 *       encerrado   o leilão já está vendido
 *       agendado    o leilão ainda não começou (a arte "faltam 3 dias")
 *       sumiu       o leilão foi apagado
 *       janela      entra em ~1,2 s (starts_at) E sai quando o leilão acaba, ~3,2 s: "entra na data e
 *                   sai com o leilão" num banner só
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

const leilaoCenario = q.get('leilao');
const fimDoLeilao = (ms) => iso(Date.now() + ms);
const leiloes = leilaoCenario ? ({
  fim: [{ id: 'lt', status: 'active', end_time: fimDoLeilao(2500) }],
  prorrogado: [{ id: 'lt', status: 'active', end_time: fimDoLeilao(2000) }],
  encerrado: [{ id: 'lt', status: 'sold', end_time: fimDoLeilao(-60000) }],
  agendado: [{ id: 'lt', status: 'scheduled', end_time: fimDoLeilao(3 * 24 * 3600 * 1000) }],
  sumiu: [],
  janela: [{ id: 'lt', status: 'active', end_time: fimDoLeilao(3200) }],
}[leilaoCenario] || []) : [];
if (leilaoCenario === 'prorrogado') {
  // o lance de última hora: o banco passa a dizer que o leilão acaba mais tarde
  setTimeout(() => { leiloes[0].end_time = fimDoLeilao(3000); }, 1200);
}

window.__entidadesFalsas = {
  Auction: leiloes,
  BannerImage: [
    ...(leilaoCenario ? [b('T', 'home', { order: 3, auction_id: 'lt', ...(leilaoCenario === 'janela' ? { starts_at: iso(Date.now() + 1200) } : {}) })] : []),
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
