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

const linha = (id, context, texto, cor, order, extra = {}) => ({
  id, context, device_type: 'desktop', is_active: true, order, title: '', link_url: '', image_url: arte(texto, cor), ...extra,
});

window.__criaNaLista = true;
window.__entidadesFalsas = {
  BannerImage: [
    linha('tv3', 'home', 'TV · FALTAM 3 DIAS', '#14532d', 0, janela(meiaNoite - 48 * HORA, meiaNoite - 24 * HORA)),
    linha('tv2', 'home', 'TV · FALTAM 2 DIAS', '#1e3a8a', 1, janela(meiaNoite - 24 * HORA, meiaNoite)),
    linha('tv1', 'home', 'TV · FALTA 1 DIA', '#7c2d12', 2, janela(meiaNoite, meiaNoite + 24 * HORA)),
    linha('geral', 'home', 'LEILÃO NOZAP', '#0f172a', 3, janela(null, null)),
    linha('loja1', 'catalog', 'LOJA VIRTUAL', '#4c1d95', 0, janela(null, null)),
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
