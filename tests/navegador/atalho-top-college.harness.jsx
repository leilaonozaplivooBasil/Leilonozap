/**
 * Banca do ícone da Top College no cabeçalho + a estrela que fixa o destino — NÃO vai para o bundle.
 * ?logado=0 monta sem usuário: o ícone não pode aparecer.
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@/index.css';
import AtalhoTopCollege from '@/components/nav/AtalhoTopCollege';
import FaixaVisao from '@/components/licensing/CentralVendas/FaixaVisao';
import { lerAtalho, gravarAtalho } from '@/lib/atalhoTopCollege';

const logado = new URLSearchParams(window.location.search).get('logado') !== '0';
try { localStorage.removeItem('nz_atalho_topcollege'); } catch {}

function Banca() {
  const [visao, setVisao] = useState('jornada');
  const [atalho, setAtalho] = useState(() => lerAtalho());
  return (
    <div style={{ width: 390, padding: 12, background: '#0b1f18' }} data-teste="banca-atalho">
      <div className="flex items-center gap-3">
        <AtalhoTopCollege currentUser={logado ? { email: 'x@y.z' } : null} />
        <span className="text-white text-xs">cabeçalho</span>
      </div>
      <div className="mt-4 nz-painel">
        <FaixaVisao visao={visao} onVisao={setVisao} placarAberto={false} onPlacar={() => {}} mostrarPlacar={false}
          atalho={atalho} onAtalho={(id) => setAtalho(gravarAtalho(id))} />
      </div>
    </div>
  );
}
createRoot(document.getElementById('raiz')).render(<BrowserRouter><Banca /></BrowserRouter>);
