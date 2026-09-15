/**
 * Banca do banner — NÃO vai para o bundle da loja.
 *
 * 🖼️ POR QUE ISTO EXISTE (15/09/2026)
 * As artes novas do dono são 16:9 (1920×1080) e a ordem foi "viabilizar com o
 * tamanho que elas possuem mesmo". A moldura passou a 16:9 com teto de 520px.
 *
 * Aqui o RotatingBanner REAL recebe uma arte 16:9 sintética com MARCAS NAS
 * QUATRO BORDAS: se qualquer uma delas sumir, houve corte. É assim que se
 * prova que nada é cortado — medindo o desenho, não lendo a classe.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import RotatingBanner from '@/components/banner/RotatingBanner';

// Arte 16:9 com uma faixa colorida colada em cada borda. Sem dependência de
// rede: é um SVG em data: URI, do mesmo jeito que o navegador trataria um PNG.
const ARTE = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">
  <rect width="1920" height="1080" fill="#0f2f22"/>
  <rect x="0" y="0" width="1920" height="40" fill="#e11d48"/>
  <rect x="0" y="1040" width="1920" height="40" fill="#f59e0b"/>
  <rect x="0" y="0" width="40" height="1080" fill="#2563eb"/>
  <rect x="1880" y="0" width="40" height="1080" fill="#10b981"/>
  <text x="960" y="560" font-size="120" fill="#fff" text-anchor="middle">16:9</text>
</svg>`)}`;

// 🔴 `device_type: 'any'` NÃO É DETALHE DE TESTE. O RotatingBanner filtra por
// aparelho: sem nenhum banner marcado como 'mobile' ou 'any', o CELULAR não
// mostra banner NENHUM — tela em branco, sem erro, sem aviso. Como as artes
// novas são 16:9 e a moldura também é 16:9 nos dois mundos, uma arte só serve
// para os dois: é exatamente o caso de uso do 'any'.
const BANNERS = [{ id: 'b1', image_url: ARTE, title: 'arte 16:9', link_url: '', device_type: 'any' }];

function Banca() {
  return (
    <div data-parte="moldura" className="relative overflow-hidden bg-[#21222b] h-[56.25vw] max-h-[520px]">
      <RotatingBanner banners={BANNERS} heightClass="h-full" rounded={false} fit="contain" ambient />
    </div>
  );
}

createRoot(document.getElementById('raiz')).render(<Banca />);
