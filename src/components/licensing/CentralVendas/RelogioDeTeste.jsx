import React, { useState } from 'react';
import { FlaskConical, X } from 'lucide-react';
import { vibrar, VIBRA_TOQUE } from '@/lib/xgame';

// 🧪 O RELÓGIO DE TESTE (só super admin, temporário).
//
// 🧹 DIR-180 (24/09/2026) — saiu da FaixaVisao. Ele morava na MESMA fileira,
// do MESMO tamanho, a um toque de distância dos botões que a pessoa usa todo
// dia — e ele APAGA as marcas do dia (`setDevMarcas({})`). Ferramenta de
// desenvolvedor não divide fileira com navegação de verdade. Ficou onde o
// dono pediu desde o começo: "deixar só o teste lá no fundo."
//
// ⏳ TEMPORÁRIO: quando sair, é só parar de passar a prop `teste` de onde
// este componente é montado; nada mais depende dele.
export default function RelogioDeTeste({ teste }) {
  const [aberto, setAberto] = useState(false);
  if (!teste) return null;

  if (teste.hora) {
    return (
      <span
        className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 text-amber-200 text-[10px] font-bold px-2.5 py-1"
        data-teste="modo-teste-ligado"
      >
        <FlaskConical className="w-3 h-3" />
        TESTE · {teste.hora} · nada é salvo
        <button
          type="button"
          onClick={() => { vibrar(VIBRA_TOQUE); teste.sair(); setAberto(false); }}
          title="sair do modo de teste"
          className="inline-flex items-center gap-0.5 rounded-full bg-amber-400/20 hover:bg-amber-400/35 px-1.5 py-0.5"
        ><X className="w-3 h-3" /> sair</button>
      </span>
    );
  }

  if (aberto) {
    return (
      <span className="inline-flex items-center gap-1.5" data-teste="modo-teste-aberto">
        <input
          type="time"
          value={teste.rascunho}
          onChange={(e) => teste.onRascunho(e.target.value)}
          title="Relógio de TESTE (só super admin): escolha um horário e aplique — o jogo inteiro obedece."
          className="rounded-full border border-amber-400/40 bg-white/[0.06] px-2.5 py-1 text-[11px] font-bold text-amber-200 outline-none focus:border-amber-300"
        />
        <button
          type="button"
          disabled={!teste.rascunho}
          onClick={() => { vibrar(VIBRA_TOQUE); teste.entrar(); }}
          className="rounded-full bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-amber-950 text-[10px] font-extrabold px-3 py-1.5"
        >aplicar</button>
        <button type="button" onClick={() => setAberto(false)} className="text-nz-tinta-fraca hover:text-nz-tinta" title="fechar">
          <X className="w-3.5 h-3.5" />
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => { vibrar(VIBRA_TOQUE); setAberto(true); }}
      title="Relógio de teste (só super admin, temporário)"
      className="inline-flex items-center gap-1 rounded-full border border-amber-400/15 text-amber-300/40 hover:text-amber-200 hover:border-amber-400/50 text-[10px] font-bold px-2 py-0.5 opacity-60 hover:opacity-100 transition-opacity"
      data-teste="modo-teste-pastilha"
    >
      <FlaskConical className="w-3 h-3" /> teste
    </button>
  );
}
