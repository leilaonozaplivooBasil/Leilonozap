/**
 * Banca do CARTÃO DE SEÇÕES — NÃO vai para o bundle.
 * Dono (06/09/2026): "melhorar a organização desse card e a abertura, que
 * está jogando pra baixo; deixar mais conexo". Monta o seletor real, escuro
 * (Top College), em dois lugares: no topo da página e perto do rodapé — pra
 * medir que abre pra baixo quando cabe e pra cima quando não cabe.
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import CentralVendasTabs from '@/components/licensing/CentralVendasTabs';

function Banca() {
  const [valor, setValor] = useState('catalogo-crm');
  return (
    <div className="xeos-palco min-h-screen p-4 text-white" style={{ background: 'var(--xeos-preto, #00020C)' }}>
      <div data-teste="topo"><CentralVendasTabs value={valor} onChange={setValor} clientesCount={1} escuro /></div>
      <p className="mt-3 text-[12px] text-white/50" data-teste="secao-atual">{valor}</p>
      <div style={{ height: 'calc(100vh - 220px)' }} />
      <div data-teste="rodape"><CentralVendasTabs value={valor} onChange={setValor} clientesCount={1} escuro /></div>
    </div>
  );
}
createRoot(document.getElementById('raiz')).render(<Banca />);
