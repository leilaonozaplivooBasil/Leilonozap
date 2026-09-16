/**
 * Banca do deslizar — NÃO vai para o bundle da loja.
 *
 * 👆 POR QUE ISTO EXISTE (16/09/2026)
 * O dono, com o print do celular: "os banners devem alterar com o deslizar do
 * dedo no celular, esses botões brancos na versão mobile ficaram grande e
 * ruins, remova. Apenas no mobile."
 *
 * Duas coisas pra provar no NAVEGADOR, não no código:
 *   1. a seta some no celular e continua no desktop
 *   2. o dedo troca de banner — e arrastar pra baixo NÃO troca, porque o banner
 *      ocupa a largura toda e prender a rolagem vertical seria pior que o
 *      problema original
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import RotatingBanner from '@/components/banner/RotatingBanner';

// três artes chapadas, cada uma de uma cor: o teste lê a cor do pixel pra saber
// QUAL banner está na tela, sem depender de texto nem de rede.
const arte = (cor) => `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect width="1920" height="1080" fill="${cor}"/></svg>`
)}`;

const BANNERS = [
  { id: 'um',   device_type: 'any', image_url: arte('#e0533f'), title: 'um',   link_url: 'https://exemplo.invalido/um' },
  { id: 'dois', device_type: 'any', image_url: arte('#4d724b'), title: 'dois', link_url: 'https://exemplo.invalido/dois' },
  { id: 'tres', device_type: 'any', image_url: arte('#6ba7d8'), title: 'tres', link_url: 'https://exemplo.invalido/tres' },
];

function Banca() {
  return (
    // a página é alta de propósito: dá pra medir se o gesto vertical rolou
    <div style={{ minHeight: '300vh' }}>
      <RotatingBanner banners={BANNERS} heightClass="h-[56.25vw] max-h-[520px]" fit="contain" rounded={false} />
      <p style={{ height: '200vh', margin: 0 }} />
    </div>
  );
}

createRoot(document.getElementById('raiz')).render(<Banca />);
