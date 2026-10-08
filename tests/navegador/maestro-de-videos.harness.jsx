/**
 * Banca do MAESTRO DE VÍDEOS — NÃO vai para o bundle do app.
 *
 * 🎬 08/10/2026 — o dono: "o vídeo não está aparecendo; ao abrir o site precisa apresentar o
 * vídeo de cada produto; a música NÃO toca sozinha, só se o cliente tocar no ícone do som;
 * quando começar o vídeo de um, o outro fica em imagem; precisa tudo ficar sincronizado".
 *
 * Aqui os CARDS DE VERDADE (AuctionCard e CatalogProductCard) rodam dentro do maestro de
 * verdade, numa grade como a dos Destaques. Só duas coisas são de mentira:
 *   • a API do YouTube (o contêiner da banca não alcança youtube.com): um `YT.Player` que
 *     registra cada chamada em window.__yt e simula PLAYING/ENDED/erro;
 *   • o arquivo de vídeo: um webm de 8 KB que toca de verdade no Chromium.
 *
 * Parâmetros (todos opcionais):
 *   ?dur=MS        quanto dura cada vídeo do YouTube de mentira (padrão 700; 999999 = nunca termina)
 *   ?erroB=1       o vídeo do card B dá erro (embed proibido / removido)
 *   ?ordem=yt      o primeiro card é YouTube (sem o arquivo na frente)
 *   ?loja=1        acrescenta um card da LOJA com vídeo do YouTube na mesma grade
 *   ?economia=1    ambiente de economia de dados: nada toca sozinho
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '@/index.css';
import AuctionCard from '@/components/auction/AuctionCard';
import CatalogProductCard from '@/components/catalog/CatalogProductCard';
import MaestroDeVideos from '@/components/video/MaestroDeVideos';
import videoDeProva from './falso/video-de-prova.webm';

const q = new URLSearchParams(window.location.search);
const DURACAO = Number(q.get('dur')) || 700;

// ───────── a API do YouTube, de mentira ─────────
const yt = { players: [], log: [] };
window.__yt = yt;
class PlayerFalso {
  constructor(host, opcoes) {
    this.opcoes = opcoes;
    this.id = opcoes.videoId;
    this.mudo = !!opcoes.playerVars?.mute;
    this.estado = 'parado';
    this.el = document.createElement('div');
    this.el.setAttribute('data-yt-falso', this.id);
    this.el.style.cssText = 'width:100%;height:100%;display:grid;place-items:center;background:#7f1d1d;color:#fff;font:700 28px/1.2 Arial;text-align:center';
    this.el.innerHTML = `<div>▶ VÍDEO DO YOUTUBE<br><span style="font:600 16px Arial;opacity:.8">(simulado na banca · ${this.id})</span></div>`;
    host.appendChild(this.el);
    yt.players.push(this);
    yt.log.push({ id: this.id, ev: 'criado', mudo: this.mudo });
    setTimeout(() => opcoes.events?.onReady?.({ target: this }), 20);
  }
  getIframe() { return this.el; }
  seekTo() { yt.log.push({ id: this.id, ev: 'seekTo' }); }
  mute() { this.mudo = true; yt.log.push({ id: this.id, ev: 'mute' }); }
  unMute() { this.mudo = false; yt.log.push({ id: this.id, ev: 'unMute' }); }
  setVolume() {}
  playVideo() {
    this.estado = 'tocando';
    yt.log.push({ id: this.id, ev: 'play', mudo: this.mudo });
    clearTimeout(this.tPlay); clearTimeout(this.tFim);
    if (q.get('erroB') === '1' && this.id === 'YT_B') {
      this.tPlay = setTimeout(() => this.opcoes.events?.onError?.({ data: 150 }), 30);
      return;
    }
    this.tPlay = setTimeout(() => {
      if (this.estado !== 'tocando') return;
      this.opcoes.events?.onStateChange?.({ data: 1 });
      this.el.style.background = '#14532d';
      this.tFim = setTimeout(() => { if (this.estado === 'tocando') { this.opcoes.events?.onStateChange?.({ data: 0 }); } }, DURACAO);
    }, 30);
  }
  pauseVideo() {
    this.estado = 'pausado';
    clearTimeout(this.tPlay); clearTimeout(this.tFim);
    yt.log.push({ id: this.id, ev: 'pause' });
  }
  destroy() { yt.log.push({ id: this.id, ev: 'destroy' }); }
}
window.YT = { Player: PlayerFalso, PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2 } };

// o que "compartilhar" faria: registra em vez de abrir a folha do aparelho
window.__compartilhou = [];
Object.defineProperty(navigator, 'share', { configurable: true, value: async (d) => { window.__compartilhou.push(d); } });
Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false });

if (q.get('economia') === '1') {
  Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true, effectiveType: '4g' } });
}

// ───────── os cards ─────────
const FIM = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();
const foto = (texto, cor) => `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="${cor}"/><text x="200" y="215" font-family="Arial" font-weight="700" font-size="38" fill="#fff" text-anchor="middle">${texto}</text></svg>`,
)}`;
const leilao = (id, titulo, cor, preco) => ({
  id, title: titulo, description: titulo, image_urls: [foto(`FOTO ${titulo}`, cor)], starting_price: preco, current_price: preco,
  increment: 10, category: 'eletronicos', status: 'active', end_time: FIM, product_source: 'factory_new',
});

const A = { auction: leilao('a', 'TV LG', '#1e3a8a', 237), video: { ok: true, tipo: 'arquivo', url: videoDeProva, embed: videoDeProva } };
const B = { auction: leilao('b', 'Hoverboard', '#0f766e', 97), video: { ok: true, tipo: 'youtube', url: 'https://youtube.com/shorts/YT_B', embed: 'https://www.youtube.com/embed/YT_B', id: 'YT_B', vertical: true } };
const C = { auction: leilao('c', 'Geladeira', '#7c2d12', 197), video: { ok: true, tipo: 'youtube', url: 'https://www.youtube.com/watch?v=YT_C', embed: 'https://www.youtube.com/embed/YT_C', id: 'YT_C', vertical: false } };
const cards = q.get('ordem') === 'yt' ? [B, C, A] : [A, B, C];

const produtoDaLoja = {
  id: 'loja-1', description: 'Máquina de lavar Panasonic', price_catalog: 1999, image_urls: [foto('FOTO LOJA', '#4c1d95')],
  video_urls: ['https://youtube.com/shorts/YT_LOJA'], stock_quantity: 5, catalog_active: true,
};

createRoot(document.getElementById('raiz')).render(
  <MemoryRouter>
    <div style={{ padding: 24, maxWidth: 1240, margin: '0 auto' }}>
      <MaestroDeVideos>
        <div data-teste="grade" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {cards.map((c) => (
            <AuctionCard key={c.auction.id} auction={c.auction} video={c.video} videoAtivo={false} showFavoriteButton={false} />
          ))}
          {q.get('loja') === '1' && <CatalogProductCard product={produtoDaLoja} currentUser={null} />}
        </div>
      </MaestroDeVideos>
    </div>
  </MemoryRouter>,
);
