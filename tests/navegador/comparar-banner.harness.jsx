import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import RotatingBanner from '@/components/banner/RotatingBanner';

// Arte 16:9 imitando o banner do PS5: logo em cima à esquerda, tarja
// "LEILÃO ESPECIAL", título grande, subtítulo, botão verde e a linha de
// confiança colada no rodapé. É justamente o topo e o rodapé que o corte come.
const ARTE = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" font-family="Arial,Helvetica,sans-serif">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#0b2545"/><stop offset="1" stop-color="#06172e"/></linearGradient></defs>
  <rect width="1920" height="1080" fill="url(#g)"/>
  <rect x="80" y="60" width="330" height="150" rx="24" fill="#16a34a"/>
  <text x="120" y="130" font-size="46" font-weight="bold" fill="#fff">LEILÃO</text>
  <text x="120" y="185" font-size="46" font-weight="bold" fill="#fff">NO ZAP</text>
  <rect x="80" y="250" width="430" height="70" rx="35" fill="none" stroke="#f59e0b" stroke-width="4"/>
  <text x="120" y="298" font-size="34" font-weight="bold" fill="#f59e0b">LEILÃO ESPECIAL</text>
  <text x="80" y="450" font-size="96" font-weight="bold" fill="#fff">PS5 no Leilão</text>
  <text x="80" y="560" font-size="96" font-weight="bold" fill="#fff">do Dia <tspan fill="#22c55e">29/09</tspan></text>
  <text x="80" y="640" font-size="38" fill="#cbd5e1">Uma grande oportunidade para disputar</text>
  <text x="80" y="690" font-size="38" fill="#cbd5e1">um PlayStation 5 com preços reais.</text>
  <rect x="80" y="760" width="560" height="120" rx="60" fill="#16a34a"/>
  <text x="300" y="838" font-size="46" font-weight="bold" fill="#fff">Ver leilão  ›</text>
  <text x="80" y="1010" font-size="34" fill="#94a3b8">✓ Lances reais     ✓ Transparente     ✓ Seguro</text>
  <rect x="1180" y="180" width="420" height="620" rx="30" fill="#f8fafc"/>
  <rect x="1290" y="830" width="220" height="140" rx="24" fill="#e2e8f0"/>
  <text x="1620" y="520" font-size="60" font-weight="bold" fill="#e2e8f0">PS5</text>
</svg>`)}`;

const BANNERS = [{ id: 'b1', image_url: ARTE, title: 'PS5', link_url: '', device_type: 'any' }];
const Rotulo = ({ children, cor }) => (
  <div style={{ padding: '10px 14px', font: '700 14px Arial', color: '#fff', background: cor }}>{children}</div>
);

function Banca() {
  return (
    <div style={{ background: '#0b1220' }}>
      <Rotulo cor="#b91c1c">ANTES — como a Home mostra hoje: altura fixa + “cover” ancorado no topo</Rotulo>
      <RotatingBanner banners={BANNERS} heightClass="h-[220px] md:h-[340px] lg:h-[460px]" rounded={false} fit="cover" objectPosition="top" />
      <Rotulo cor="#15803d">DEPOIS — moldura 16:9, encaixe “contain”, teto de 520px (o conserto)</Rotulo>
      <div className="relative overflow-hidden bg-[#21222b] h-[56.25vw] max-h-[520px]">
        <RotatingBanner banners={BANNERS} heightClass="h-full" rounded={false} fit="contain" ambient />
      </div>
    </div>
  );
}
createRoot(document.getElementById('raiz')).render(<Banca />);
