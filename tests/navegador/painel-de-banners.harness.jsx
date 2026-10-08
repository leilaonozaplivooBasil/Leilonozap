/**
 * Banca do Painel de Mídia (fileiras e programação de banners) — NÃO vai para o
 * bundle da loja.
 *
 * 🖼️ 08/10/2026: o dono quer três fileiras (Leilão, Loja, Unificada) e banners
 * que entrem e saiam sozinhos à meia-noite. Aqui a PÁGINA REAL é montada com um
 * banco de mentira semeado com a esteira de uma TV (3, 2 e 1 dia), em relação ao
 * "agora" do navegador:
 *   ?semcolunas=1  → linhas sem starts_at/ends_at (migração ainda não aplicada)
 *   ?pagina=conteudo&perfil=admin|lojista → a tela "Gerenciamento de Conteúdo" (aba Banners)
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '@/index.css';
import PainelMidia from '@/pages/PainelMidia';
import BannerManagement from '@/pages/BannerManagement';

const HORA = 3600 * 1000;
// próxima meia-noite de Brasília (03:00 UTC), a partir de agora
const agora = Date.now();
const d = new Date(agora);
let meiaNoite = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 3, 0, 0);
if (meiaNoite <= agora) meiaNoite += 24 * HORA;
window.__meiaNoite = meiaNoite;
const iso = (t) => new Date(t).toISOString();

// arte de mentira 16:9, com o texto do que ela é
const arte = (texto, cor) => `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="${cor}"/><text x="320" y="190" font-family="Arial" font-weight="700" font-size="40" fill="#fff" text-anchor="middle">${texto}</text></svg>`,
)}`;

const q = new URLSearchParams(window.location.search);
const semColunas = q.get('semcolunas') === '1';
const janela = (ini, fim) => (semColunas ? {} : { starts_at: ini ? iso(ini) : null, ends_at: fim ? iso(fim) : null });

// como o banco depois da migração: toda linha traz `auction_id` (nulo = banner solto)
const linha = (id, context, texto, cor, order, extra = {}) => ({
  id, context, device_type: 'desktop', is_active: true, order, title: '', link_url: '', image_url: arte(texto, cor),
  ...(semColunas ? {} : { auction_id: null }), ...extra,
});

const fotoDe = (texto, cor) => `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="${cor}"/><text x="150" y="160" font-family="Arial" font-weight="700" font-size="30" fill="#fff" text-anchor="middle">${texto}</text></svg>`,
)}`;
const fimDoLeilao = iso(agora + 3 * 24 * HORA);

window.__criaNaLista = true;
window.__entidadesFalsas = {
  // 🔴 08/10/2026 — pop-up do leilão: a configuração guarda a IMAGEM de uma escolha anterior (PS5)
  Auction: [
    { id: 'hoverboard', title: ' Hoverboard Skate Elétrico 6.5 Polegadas', status: 'active', end_time: fimDoLeilao, current_price: 97, image_urls: [fotoDe('HOVERBOARD', '#0f766e')] },
    { id: 'ps5', title: 'Playstation 5', status: 'active', end_time: fimDoLeilao, current_price: 797, image_urls: [fotoDe('PS5', '#1e3a8a')] },
    // 🏁 `?leilao=1`: um banner ligado a um leilão que já ENCERROU (não está mais na lista de ativos)
    { id: 'tv-vendida', title: 'Smart TV LG vendida', status: 'sold', end_time: iso(agora - 3600 * 1000), current_price: 1200, image_urls: [] },
  ],
  BannerImage: [
    { id: 'popup-1', context: 'popup_leilao', device_type: 'desktop', is_active: true, order: 0, title: 'Playstation 5', image_url: fotoDe('PS5 VELHO', '#7c2d12'), link_url: '/AuctionRoom?id=hoverboard', ...(semColunas ? {} : { starts_at: null, ends_at: null }) },
    linha('tv3', 'home', 'TV · FALTAM 3 DIAS', '#14532d', 0, janela(meiaNoite - 48 * HORA, meiaNoite - 24 * HORA)),
    linha('tv2', 'home', 'TV · FALTAM 2 DIAS', '#1e3a8a', 1, janela(meiaNoite - 24 * HORA, meiaNoite)),
    linha('tv1', 'home', 'TV · FALTA 1 DIA', '#7c2d12', 2, janela(meiaNoite, meiaNoite + 24 * HORA)),
    linha('geral', 'home', 'LEILÃO NOZAP', '#0f172a', 3, janela(null, null)),
    linha('loja1', 'catalog', 'LOJA VIRTUAL', '#4c1d95', 0, janela(null, null)),
    // 🔴 `?desligado=1`: um banner DESLIGADO (o Ar da sua conta) para programar a entrada
    ...(q.get('desligado') === '1' ? [linha('desligado', 'home', 'BANNER DESLIGADO', '#334155', 6, { is_active: false })] : []),
    ...(q.get('leilao') === '1' ? [
      linha('tv-banner', 'home', 'TV VENDIDA', '#78350f', 5, { ...janela(null, null), ...(semColunas ? {} : { auction_id: 'tv-vendida' }) }),
    ] : []),
  ],
};

// 🖼️ 08/10/2026 — a aba Banners do Gerenciamento de Conteúdo: admin vê o Painel de Mídia,
// quem não é admin segue com a tela antiga
const conteudo = q.get('pagina') === 'conteudo';
if (conteudo) {
  localStorage.setItem('currentUser', JSON.stringify({ id: 'u1', email: 'a@b.c', role: q.get('perfil') || 'admin' }));
}

createRoot(document.getElementById('raiz')).render(
  <MemoryRouter>{conteudo ? <BannerManagement /> : <PainelMidia />}</MemoryRouter>,
);
