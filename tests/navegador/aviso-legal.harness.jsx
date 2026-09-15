/**
 * Banca da capa do convite ao parceiro — NÃO vai para o bundle da loja.
 *
 * ⚖️ POR QUE ISTO EXISTE (15/09/2026)
 * Print do dono: na capa, "NÃO É OFERTA PÚBLICA" aparecia encostado no fim do
 * endereço, parecendo texto sobreposto por erro. Os dois viviam na mesma linha
 * flex, sem gap e sem shrink-0.
 *
 * Isto não se prova lendo classe do Tailwind: depende de onde o navegador
 * DESENHA cada caixa em cada largura. Então aqui o componente REAL é montado e
 * as duas caixas são medidas, de 360px (celular estreito) a 1440px.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import ParceiroAbertura from '@/components/parceiro/ParceiroAbertura';

createRoot(document.getElementById('raiz')).render(
  <ParceiroAbertura onSolicitarAcesso={() => { window.__pediuAcesso = true; }} />,
);
