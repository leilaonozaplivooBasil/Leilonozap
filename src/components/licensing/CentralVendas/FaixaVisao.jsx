import React, { useState } from 'react';
import { Map, ListChecks, LayoutGrid, BarChart3, ChevronDown, FlaskConical, X } from 'lucide-react';
import { vibrar, VIBRA_TOQUE } from '@/lib/xgame';

// 🎚️ A FAIXA DE VISÃO do Compromisso: Jornada × Lista, o placar completo e,
// por enquanto, o relógio de teste.
//
// Ordem do dono (06/09/2026), olhando a faixa antiga — dois botões soltos,
// um relógio "--:--" e um botão âmbar "Entrar no modo dev" gritando ao lado
// de um link "▸ meu placar completo": "vamos deixar isso mais bonito e mais
// funcional; o modo desenvolvedor a gente tira depois — essa semana fica só
// pra galera testar".
//
// O QUE MUDOU:
//   • Jornada × Lista virou UM controle segmentado (uma pílula com dois
//     lados), com ícone em vez de emoji e o gradiente da faculdade no lado
//     ativo. Dois botões soltos viram uma escolha só, que é o que são.
//   • "meu placar completo" virou botão de verdade, com ícone e seta que
//     gira — não um link de texto perdido.
//   • 🧪 O RELÓGIO DE TESTE ficou DISCRETO: uma pastilha "teste" que só abre
//     o campo de hora quando alguém toca. Ligado, vira uma pastilha âmbar
//     clara ("TESTE · 09:30 · nada é salvo") com o "sair". As funções são
//     EXATAMENTE as mesmas de antes (aplicar hora, sair, zerar marcas).
//     ⏳ TEMPORÁRIO: sai depois da semana de testes — quando sair, é só
//     parar de passar a prop `teste`; nada mais depende dele.
const GRADIENTE_TC = 'linear-gradient(135deg, var(--topcollege-azul, #3B6FF6), var(--topcollege-magenta, #E62E8B))';

export default function FaixaVisao({ visao, onVisao, placarAberto, onPlacar, mostrarPlacar = true, teste = null }) {
  const [testeAberto, setTesteAberto] = useState(false);
  // DIR-75 — o terceiro lado: o nosso quadro. Entra aqui e não num botão solto
  // porque é uma VISÃO do mesmo dia, igual às outras duas.
  const opcoes = [
    { id: 'jornada', rotulo: 'Jornada', Icone: Map },
    { id: 'lista', rotulo: 'Lista', Icone: ListChecks },
    { id: 'quadro', rotulo: 'Quadro', Icone: LayoutGrid },
  ];

  return (
    <div className="flex items-center justify-between gap-1.5 sm:gap-2 flex-wrap" data-teste="faixa-visao">
      {/* ── o controle segmentado ── */}
      <div className="inline-flex items-center rounded-full border border-nz-borda/50 bg-white/[0.04] p-0.5" role="tablist" aria-label="Visão do dia">
        {opcoes.map(({ id, rotulo, Icone }) => {
          const ativo = visao === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={ativo}
              aria-label={rotulo}
              title={rotulo}
              onClick={() => { if (!ativo) { vibrar(VIBRA_TOQUE); onVisao(id); } }}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 sm:px-3.5 py-1.5 text-xs font-bold transition-colors ${
                ativo ? 'text-white shadow-md' : 'text-nz-tinta-fraca hover:text-nz-tinta'}`}
              style={ativo ? { background: GRADIENTE_TC } : undefined}
            >
              <Icone className="w-3.5 h-3.5" />
              {/* 📱 com três lados (DIR-75) a faixa não cabia em 390px: no celular
                  só o lado ATIVO mostra a palavra; os outros ficam no ícone */}
              <span className={ativo ? '' : 'hidden sm:inline'}>{rotulo}</span>
            </button>
          );
        })}
      </div>

      <span className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
        {/* ── 🧪 relógio de teste (temporário) ── */}
        {teste && (
          teste.hora ? (
            <span
              className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 text-amber-200 text-[10px] font-bold px-2.5 py-1"
              data-teste="modo-teste-ligado"
            >
              <FlaskConical className="w-3 h-3" />
              TESTE · {teste.hora} · nada é salvo
              <button
                type="button"
                onClick={() => { vibrar(VIBRA_TOQUE); teste.sair(); setTesteAberto(false); }}
                title="sair do modo de teste"
                className="inline-flex items-center gap-0.5 rounded-full bg-amber-400/20 hover:bg-amber-400/35 px-1.5 py-0.5"
              ><X className="w-3 h-3" /> sair</button>
            </span>
          ) : testeAberto ? (
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
              <button type="button" onClick={() => setTesteAberto(false)} className="text-nz-tinta-fraca hover:text-nz-tinta" title="fechar">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => { vibrar(VIBRA_TOQUE); setTesteAberto(true); }}
              title="Relógio de teste (só super admin, temporário)"
              className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 text-amber-300/70 hover:text-amber-200 hover:border-amber-400/50 text-[10px] font-bold px-2.5 py-1"
              data-teste="modo-teste-pastilha"
            >
              {/* no celular só o ícone: com a palavra, a fileira não cabia em 390px */}
              <FlaskConical className="w-3 h-3" /><span className="hidden sm:inline">teste</span>
            </button>
          )
        )}

        {/* ── o placar completo ── */}
        {mostrarPlacar && (
          <button
            type="button"
            onClick={() => { vibrar(VIBRA_TOQUE); onPlacar(); }}
            aria-expanded={placarAberto}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
              placarAberto
                ? 'border-nz-verde/60 text-nz-tinta bg-nz-verde/10'
                : 'border-nz-borda/50 text-nz-tinta-fraca hover:text-nz-tinta hover:border-nz-verde/50'}`}
            data-teste="placar-botao"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span><span className="hidden sm:inline">meu </span>placar</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${placarAberto ? 'rotate-180' : ''}`} />
          </button>
        )}
      </span>
    </div>
  );
}
