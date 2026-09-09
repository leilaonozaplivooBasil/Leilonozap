/**
 * Banca da MOEDA REAL ao lado da MOEDA-MODELO — NÃO vai para o bundle do app.
 *
 * 🪙 09/09/2026 — dono, olhando o próprio radar em 0% no dia 3 de 22: "a
 * moeda tem que estar ali, pra ele se inspirar nela cheia, e entender como
 * ela fica cheia, junto com a dele que está sendo preenchida." Esta página
 * monta os DOIS cartões reais (o mesmo par que CrmMetodo.jsx e
 * XGameVisaoExecutiva.jsx desenham na tela viva) lado a lado: a moeda REAL
 * (parcial, começo de ciclo) e a moeda-MODELO (`moedaModelo`, xgame.js,
 * sempre no teto) — prova de que as duas aparecem juntas, sem precisar de
 * login.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import MoedaPizza from '@/components/licensing/CentralVendas/MoedaPizza';
import { TOKEN_MAX, ligaDoToken, moedaModelo } from '@/lib/xgame';

// 📸 o mesmo caso do print que o dono mandou: dia 3 de 22, quase nada feito
// ainda — ele confirmou que isso é normal ("gostoso não fiz quase nada"),
// não é bug. É exatamente por isso que a moeda-modelo cheia precisa estar
// do lado: pra mostrar pra onde ele está indo.
const MOEDA_REAL = { mvm: 1.2, producao: 0.4, realtime: 0, bonus: 0, vendas: 0 };
const TOTAL_REAL = Object.values(MOEDA_REAL).reduce((s, v) => s + v, 0);
const MOEDA_MODELO = moedaModelo('estrategico');

function Banca() {
  return (
    <div style={{ maxWidth: 720, margin: '24px auto', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="rounded-2xl border-2 border-nz-borda bg-white p-4 sm:p-5 space-y-3" data-teste="moeda-pizza">
        <div>
          <p className="text-sm font-extrabold text-nz-tinta">🪙 Seu Human Token — de onde vem cada ponto dele</p>
          <p className="text-[11px] text-nz-tinta-fraca mt-0.5">cada fatia é o quanto aquilo pesou de verdade no seu Human Token de hoje, até o teto de {TOKEN_MAX.toFixed(2).replace('.', ',')}</p>
          <p className="text-[11px] font-semibold text-nz-verde mt-1">"Recrutamos caráter e treinamos habilidade" — por isso o MvM é portão, não só peso: abaixo de 7 trava tudo em Bronze; abaixo de 8, sem Platina.</p>
        </div>
        <MoedaPizza componentes={MOEDA_REAL} total={TOTAL_REAL} max={TOKEN_MAX} liga={ligaDoToken(TOTAL_REAL)} />
      </div>

      <div className="rounded-2xl border-2 border-dashed border-nz-ouro-claro bg-nz-ouro-fundo p-4 sm:p-5 space-y-3" data-teste="moeda-pizza-modelo">
        <div>
          <p className="text-sm font-extrabold text-nz-tinta">🏆 O Modelo — pra onde você está indo</p>
          <p className="text-[11px] text-nz-tinta-fraca mt-0.5">a mesma moeda, cheia — a referência de como ela fica quando cada fatia bate no teto</p>
        </div>
        <MoedaPizza componentes={MOEDA_MODELO} total={TOKEN_MAX} max={TOKEN_MAX} liga={ligaDoToken(TOKEN_MAX)} />
      </div>
    </div>
  );
}

createRoot(document.getElementById('raiz')).render(<Banca />);
