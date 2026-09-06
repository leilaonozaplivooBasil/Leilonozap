/**
 * Banca da ORDEM DOS ÍCONES — NÃO vai para o bundle do app.
 *
 * 🔴 POR QUE ISTO EXISTE (06/09/2026)
 * Dono: "no celular não estou conseguindo arrastar de forma simples os
 * ícones, como no computador". Monta o menu do celular (MobileNavSheet) e a
 * lateral do desktop (NavegacaoLateralGlobal) com o MESMO usuário, e grava
 * cada troca de aba pedida — pra provar que arrastar reordena, que a ordem
 * é a mesma nos dois, e que um toque normal continua navegando.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '@/index.css';
import MobileNavSheet from '@/components/licensing/MobileNavSheet';
import NavegacaoLateralGlobal from '@/components/common/NavegacaoLateralGlobal';

const USUARIO = { id: 'u1', full_name: 'Luiz Santanna', email: 'luiz@x.com', role: 'admin', career_levels: ['usuario'] };

function Banca() {
  const [abas, setAbas] = React.useState([]);
  const [aba, setAba] = React.useState('catalogo');
  const trocar = React.useCallback((valor, secao) => { setAbas((l) => [...l, [valor, secao ?? null]]); setAba(valor); }, []);
  return (
    <MemoryRouter>
      <div style={{ minHeight: '100vh', background: 'var(--xeos-preto, #00020C)' }} className="flex">
        {/* a lateral só existe no desktop (hidden md:block) — no celular some sozinha */}
        <NavegacaoLateralGlobal user={USUARIO} activeTab={aba} onTabChange={trocar} />
        <div className="flex-1 px-4 pt-4" data-teste="celular">
          <MobileNavSheet user={USUARIO} activeTab={aba} onTabChange={trocar} />
          <span data-teste="abas">{JSON.stringify(abas)}</span>
        </div>
      </div>
    </MemoryRouter>
  );
}

createRoot(document.getElementById('raiz')).render(<Banca />);
