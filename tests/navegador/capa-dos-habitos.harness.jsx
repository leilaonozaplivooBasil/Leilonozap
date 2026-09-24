/**
 * Banca da CAPA DOS 8 HÁBITOS — NÃO vai para o bundle do app.
 *
 * Mostra os DOIS estados que a DIR-177 criou, sobre o mesmo fundo escuro da
 * Top College:
 *   · a CAPA — as 8 portas + o desenho do ciclo da gamificação;
 *   · o HÁBITO ABERTO — a barra ‹ › que entra no lugar da grade.
 *
 * `?estado=habito` abre direto no segundo. Clicar numa porta troca de estado
 * de verdade, que é o que o dono pediu pra sentir ("muito limpo e muito
 * fluido") — e é o que nenhum teste de texto consegue mostrar.
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import { Sparkles, ShieldCheck, Users, PhoneCall, Presentation, Route, Gauge, GitBranch, Trophy, ArrowRight } from 'lucide-react';
import PortasDosHabitos from '@/components/licensing/CentralVendas/PortasDosHabitos';
import BarraDoHabito from '@/components/licensing/CentralVendas/BarraDoHabito';
import CicloDoXGame from '@/components/licensing/CentralVendas/CicloDoXGame';
import { ORDEM_DOS_HABITOS, vizinhosDoHabito, numeroDoHabito } from '@/lib/capaDosHabitos';
import { partesDoHabito } from '@/lib/metodo';

const ICONES = [Sparkles, ShieldCheck, Users, PhoneCall, Presentation, Route, Gauge, GitBranch];
const SECOES = ORDEM_DOS_HABITOS.map((id, i) => {
  const partes = partesDoHabito(id) || { curto: id, complemento: '' };
  return { id, n: i + 1, Icone: ICONES[i], nome: partes.curto, complemento: partes.complemento };
});

function Banca() {
  const inicial = new URLSearchParams(window.location.search).get('estado') === 'habito' ? 'sonho' : null;
  const [secao, setSecao] = useState(inicial);
  const naCapa = !secao;
  const { anterior, proximo } = vizinhosDoHabito(secao);
  const atual = SECOES.find((x) => x.id === secao);

  return (
    <div className="min-h-screen bg-[#00020C] px-3 sm:px-8 py-8">
      <p className="text-[11px] font-semibold tracking-[0.28em] text-white/45 uppercase mb-2">Top College · X-eos</p>
      <h1 className="text-3xl sm:text-5xl font-extrabold leading-[1.05] tracking-tight text-white mb-6">
        Os 8 Hábitos<br className="hidden sm:block" /> do Sucesso
      </h1>

      <button
        type="button"
        className="group relative overflow-hidden rounded-2xl border border-white/15 px-5 py-4 mb-8 w-full text-left"
        style={{ background: 'linear-gradient(120deg, var(--topcollege-azul), var(--topcollege-roxo) 55%, var(--topcollege-magenta))' }}
      >
        <span className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-white" />
            <span>
              <span className="block text-[10px] font-bold tracking-[0.18em] text-white/75">X-GAME</span>
              <span className="block text-base sm:text-lg font-extrabold text-white leading-tight">Visão Executiva X-GAME</span>
            </span>
          </span>
          <span className="flex items-center gap-1 text-xs font-bold text-white/80">abrir <ArrowRight className="w-3.5 h-3.5" /></span>
        </span>
      </button>

      {naCapa ? (
        <>
          <div className="mb-8 sm:mb-12"><PortasDosHabitos secoes={SECOES} aoAbrir={setSecao} /></div>
          <CicloDoXGame />
        </>
      ) : (
        <>
          <div className="mb-6">
            <BarraDoHabito
              numero={numeroDoHabito(secao)}
              aoVoltar={() => setSecao(null)}
              aoAnterior={() => setSecao(anterior)}
              aoProximo={() => setSecao(proximo)}
            />
          </div>
          <div className="rounded-2xl border border-white/10 p-6">
            <p className="text-[11px] font-bold tracking-[0.28em] text-white/55 uppercase">
              Hábito {String(numeroDoHabito(secao)).padStart(2, '0')}
            </p>
            <p className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-none mt-1.5">
              {atual?.nome}
              {atual?.complemento && <span className="block sm:inline sm:ml-3 text-xl sm:text-3xl font-semibold text-white/70">{atual.complemento}</span>}
            </p>
            <p className="text-sm text-white/40 mt-4">(o conteúdo do hábito entra aqui — na banca fica o lugar dele)</p>
          </div>
        </>
      )}
    </div>
  );
}

createRoot(document.getElementById('raiz')).render(<Banca />);
