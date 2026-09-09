/**
 * Banca da MOEDA EM FATIAS (Human Token) — NÃO vai para o bundle do app.
 *
 * 🪙 09/09/2026 — dono pediu prova de verdade, renderizada: "pode printar,
 * você está se limitando... você pode ter prova de vida." Esta página monta
 * o COMPONENTE REAL (MoedaPizza.jsx), com os MESMOS números de exemplo do
 * teste em src/lib/moedaPizza.js, dentro do MESMO cartão que CrmMetodo.jsx
 * usa de verdade — pra tirar print de verdade, sem precisar de login.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import MoedaPizza from '@/components/licensing/CentralVendas/MoedaPizza';
import { TOKEN_MAX, LIGAS, ligaDoToken } from '@/lib/xgame';

// os mesmos componentes de exemplo usados nos testes automatizados —
// alguém no meio do ciclo, já perto da liga prata.
const COMPONENTES = { mvm: 7.58, producao: 1.1, realtime: 2.9, bonus: 4.2, vendas: 0.9 };
const TOTAL = Object.values(COMPONENTES).reduce((s, v) => s + v, 0);

function Banca() {
  return (
    <div style={{ maxWidth: 720, margin: '24px auto', padding: '0 16px' }}>
      <div className="rounded-2xl border-2 border-nz-borda bg-white p-4 sm:p-5 space-y-3" data-teste="moeda-pizza">
        <div>
          <p className="text-sm font-extrabold text-nz-tinta">🪙 A Moeda — de onde vem cada ponto do seu Human Token</p>
          <p className="text-[11px] text-nz-tinta-fraca mt-0.5">cada fatia é o quanto aquilo pesou de verdade na sua moeda de hoje, até o teto de {TOKEN_MAX.toFixed(2).replace('.', ',')}</p>
        </div>
        <MoedaPizza componentes={COMPONENTES} total={TOTAL} max={TOKEN_MAX} liga={ligaDoToken(TOTAL)} />
      </div>
    </div>
  );
}

createRoot(document.getElementById('raiz')).render(<Banca />);
window.__ligas = LIGAS;
