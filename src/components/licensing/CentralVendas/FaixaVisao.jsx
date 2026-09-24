import React from 'react';
import { Map, ListChecks, LayoutGrid, Network, Inbox, Star } from 'lucide-react';
import { vibrar, VIBRA_TOQUE } from '@/lib/xgame';

// 🎚️ A FAIXA DE VISÃO do Compromisso: as CINCO visões do mesmo dia.
//
// 🧹 DIR-180 (24/09/2026) — dono, com o print da fileira no celular: "eu
// quero que esses botões apareçam ali de uma forma organizada... pra ficar
// ainda melhor visual e a pessoa entender melhor."
//
// O QUE ESTAVA ERRADO — eram OITO controles numa linha só, com TRÊS
// gramáticas diferentes misturadas no mesmo tamanho e na mesma altura:
//   • 5 VISÕES (trocam a tela)   • ⭐ um AJUSTE (não troca nada)
//   • 📊 um PAINEL (abre/fecha)  • ⚗ uma FERRAMENTA DE DEV (temporária)
// E no celular só o botão ATIVO mostrava a palavra — os outros quatro
// ficavam ícone pelado. Ninguém adivinha que ⛓ é Mapa e ✉ é Demandas.
//
// O QUE MUDOU:
//   • A fileira virou SÓ as 5 visões, em grade de 5 colunas, largura cheia,
//     ÍCONE EM CIMA e PALAVRA EMBAIXO — o mesmo padrão que já provamos nas
//     portas dos 8 Hábitos (DIR-179), que foi o que resolveu o nome cortado.
//     Agora TODA visão tem nome no celular, sempre.
//   • ⭐ virou um selo no CANTO DO AZULEJO ATIVO — o controle passou a morar
//     na coisa sobre a qual ele age ("fixar ESTA visão"), em vez de disputar
//     espaço como se fosse um sexto destino.
//   • 📊 "Eu no Game" saiu daqui: ele não é irmão das visões, é o placar —
//     mora junto dos números agora (PlacarDoDia.jsx).
//   • ⚗ o relógio de teste saiu daqui (RelogioDeTeste.jsx) — ferramenta de
//     dev que apaga marcas não divide fileira com navegação de verdade.
const GRADIENTE_TC = 'linear-gradient(135deg, var(--topcollege-azul, #3B6FF6), var(--topcollege-magenta, #E62E8B))';

// DIR-75 (Quadro), DIR-? (Mapa, 21/09) e Demandas (22/09) entraram aqui, e não
// em botões soltos, porque as três são VISÕES do mesmo dia — igual às outras.
const OPCOES = [
  { id: 'jornada', rotulo: 'Jornada', Icone: Map },
  { id: 'lista', rotulo: 'Lista', Icone: ListChecks },
  { id: 'quadro', rotulo: 'Quadro', Icone: LayoutGrid },
  { id: 'mapa', rotulo: 'Mapa', Icone: Network },
  { id: 'demandas', rotulo: 'Demandas', Icone: Inbox },
];

export default function FaixaVisao({ visao, onVisao, demandasEsperando = 0, atalho = null, onAtalho = null }) {
  const ehOAtalho = Boolean(onAtalho) && atalho === visao;

  return (
    <div
      className="grid grid-cols-5 gap-1 rounded-2xl border border-nz-borda/50 bg-white/[0.04] p-1"
      role="tablist"
      aria-label="Visão do dia"
      data-teste="faixa-visao"
    >
      {OPCOES.map(({ id, rotulo, Icone }) => {
        const ativo = visao === id;
        return (
          <div key={id} className="relative">
            <button
              type="button"
              role="tab"
              aria-selected={ativo}
              aria-label={rotulo}
              title={rotulo}
              data-teste={`visao-${id}`}
              onClick={() => { if (!ativo) { vibrar(VIBRA_TOQUE); onVisao(id); } }}
              className={`flex w-full flex-col items-center gap-1 rounded-xl px-0.5 py-2 transition-all ${
                ativo ? 'text-white shadow-lg' : 'text-nz-tinta-fraca hover:text-nz-tinta'}`}
              style={ativo ? { background: GRADIENTE_TC, boxShadow: '0 4px 14px -2px rgba(59,111,246,0.5)' } : undefined}
            >
              <Icone className="w-4 h-4 shrink-0" strokeWidth={ativo ? 2.4 : 2} />
              {/* 📱 o nome NÃO some mais no celular: ícone em cima, palavra
                  embaixo, e cada azulejo tem a largura inteira da coluna —
                  o mesmo conserto do "Acompanha…" cortado no DIR-179. */}
              <span className="w-full text-center text-[10px] font-bold leading-none">{rotulo}</span>
            </button>

            {/* 🔴 o que está esperando dentro das Demandas — o único sinal de
                que tem coisa ali; fica por cima do azulejo, não na fileira. */}
            {id === 'demandas' && demandasEsperando > 0 && (
              <span
                className={`pointer-events-none absolute -top-0.5 right-0.5 inline-flex min-w-[15px] items-center justify-center rounded-full px-1 text-[9px] font-extrabold leading-[15px] ${
                  ativo ? 'bg-white text-nz-tinta' : 'bg-nz-verde-neon text-nz-tinta'}`}
                data-teste="faixa-demandas-contador"
              >{demandasEsperando > 99 ? '99+' : demandasEsperando}</span>
            )}

            {/* ⭐ 23/09/2026 — fixa a visão aberta como destino do ícone da Top
                College no cabeçalho (src/lib/atalhoTopCollege.js). DIR-180: só
                aparece no azulejo ATIVO, porque é sobre ELE que o botão age. */}
            {onAtalho && ativo && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); if (!ehOAtalho) { vibrar(VIBRA_TOQUE); onAtalho(visao); } }}
                aria-pressed={ehOAtalho}
                title={ehOAtalho ? 'O ícone da Top College já abre aqui' : 'Fixar esta visão como meu atalho da Top College'}
                data-teste="fixar-atalho"
                className={`absolute -top-1 -left-1 grid h-5 w-5 place-items-center rounded-full border transition-colors ${
                  ehOAtalho ? 'border-amber-300 bg-amber-300 text-amber-900' : 'border-nz-borda bg-white/90 text-nz-tinta-fraca hover:text-amber-500'}`}
              >
                <Star className="w-3 h-3" fill={ehOAtalho ? 'currentColor' : 'none'} strokeWidth={2.4} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
