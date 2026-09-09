/**
 * Banca da MOEDA EM FATIAS (Human Token) — NÃO vai para o bundle do app.
 *
 * 🪙 09/09/2026 — dono pediu prova de verdade, renderizada: "pode printar,
 * você está se limitando... você pode ter prova de vida." Esta página monta
 * o COMPONENTE REAL (MoedaPizza.jsx) dentro do MESMO cartão que
 * CrmMetodo.jsx usa de verdade — pra tirar print de verdade, sem precisar
 * de login.
 *
 * 🏆 DIR-115 — depois da repesagem, o exemplo virou a MOEDA CHEIA DO
 * MODELO: os 5 componentes usam exatamente `pesosDoPerfil('estrategico')`
 * no seu valor MÁXIMO (taxa 100% em cada eixo) — o dono pediu isso desde o
 * começo desta rodada: "eu quero ela preenchida... mostrando que x por
 * cento vendalista, x por cento da linha vem, x por cento venda ali... eu
 * não quero que puxe da minha verificação, eu só quero mostrar pras
 * pessoas da onde vem." Não é o progresso de ninguém — é o desenho do
 * PESO de cada eixo no teto de 22,22.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import MoedaPizza from '@/components/licensing/CentralVendas/MoedaPizza';
import { TOKEN_MAX, LIGAS, ligaDoToken, pesosDoPerfil } from '@/lib/xgame';

const pesos = pesosDoPerfil('estrategico');
const COMPONENTES = { mvm: pesos.mvm, producao: pesos.producao, realtime: pesos.realtime, bonus: pesos.bonus, vendas: pesos.ptVenda };
const TOTAL = Object.values(COMPONENTES).reduce((s, v) => s + v, 0);

function Banca() {
  return (
    <div style={{ maxWidth: 720, margin: '24px auto', padding: '0 16px' }}>
      <div className="rounded-2xl border-2 border-nz-borda bg-white p-4 sm:p-5 space-y-3" data-teste="moeda-pizza">
        <div>
          <p className="text-sm font-extrabold text-nz-tinta">🪙 A Moeda — de onde vem cada ponto do Human Token</p>
          <p className="text-[11px] text-nz-tinta-fraca mt-0.5">a moeda CHEIA do modelo — cada fatia é o peso máximo daquele eixo, até o teto de {TOKEN_MAX.toFixed(2).replace('.', ',')}</p>
          <p className="text-[11px] font-semibold text-nz-verde mt-1">"Recrutamos caráter e treinamos habilidade" — o MvM é portão, não só peso: abaixo de 7 trava tudo em Bronze; abaixo de 8, sem Platina.</p>
        </div>
        <MoedaPizza componentes={COMPONENTES} total={TOTAL} max={TOKEN_MAX} liga={ligaDoToken(TOTAL)} />
      </div>
    </div>
  );
}

createRoot(document.getElementById('raiz')).render(<Banca />);
window.__ligas = LIGAS;
