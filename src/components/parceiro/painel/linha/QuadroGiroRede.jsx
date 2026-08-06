import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { DIA_INICIO_APURACAO, DIA_PRIMEIRO_REPASSE } from './etapasOperacao';
import ContadorReservaRepasse from './ContadorReservaRepasse';

// 🛒 QUADRO "GIRO DA REDE AGORA" — acompanhamento DEMONSTRATIVO do giro da rede.
//
// ⚖️ Nada aqui apura valor: o repasse do parceiro é o previsto no contrato e é
// pago no fechamento do ciclo. O contador tem TETO no repasse previsto e o
// rodapé deixa isso explícito — não remover.
// 📱 Um único timer, pausado quando a aba/app sai de foco (mobile congela
// timers em background e disparar o acumulado de uma vez seria falso).

const FRASES = [
  'Acabaram de comprar na loja',
  'Mais uma venda realizada',
  'Venda registrada na rede',
  'Saiu do estoque agora',
];

const ITENS = [
  'Fritadeira Air Fryer 4L',
  'Smart TV 50" 4K',
  'Fone Bluetooth TWS',
  'Cafeteira Expresso',
  'Aspirador Vertical',
  'Micro-ondas 20L',
  'Caixa de Som Portátil',
  'Liquidificador 1200W',
  'Ventilador de Coluna',
  'Smartwatch Fitness',
  'Panela Elétrica de Arroz',
  'Monitor 24" Full HD',
];

const CANAIS = ['Loja Virtual', 'Aplicativo', 'Rede de vendedores', 'Licenciado'];

const MAX_PILHA = 6;
const HISTORICO_INICIAL = 4;
const TOTAL_EVENTOS = 60;

// PRNG com semente: cada parceiro tem ritmo e ordem próprios, e estáveis entre
// recargas — sem isso a tela "sorteia" outra coisa a cada abertura.
function semear(seed) {
  let s = 0;
  const txt = String(seed || 'demo');
  for (let i = 0; i < txt.length; i++) s = (s * 31 + txt.charCodeAt(i)) % 2147483647;
  s = s || 12345;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

export default function QuadroGiroRede({ seed, diaAtual = 0, alvo = 0 }) {
  const ativo = diaAtual >= DIA_INICIO_APURACAO;

  // Fila completa de eventos (determinística pela semente)
  const eventos = React.useMemo(() => {
    const rnd = semear(seed);
    return Array.from({ length: TOTAL_EVENTOS }, (_, i) => ({
      id: `${seed || 'demo'}-${i}`,
      frase: FRASES[Math.floor(rnd() * FRASES.length)],
      item: ITENS[Math.floor(rnd() * ITENS.length)],
      canal: CANAIS[Math.floor(rnd() * CANAIS.length)],
      minutos: 1 + Math.floor(rnd() * 40),
      espera: 3000 + Math.floor(rnd() * 6000), // 3s a 9s, irregular
    }));
  }, [seed]);

  // Reserva já "acumulada" proporcional ao dia do ciclo (D+10 → D+30), pra quem
  // abre no D+18 ver histórico e não zero. Teto = alvo.
  const janela = DIA_PRIMEIRO_REPASSE - DIA_INICIO_APURACAO;
  const baseReserva = React.useMemo(() => {
    if (!ativo || !alvo) return 0;
    const frac = Math.min(1, Math.max(0, (diaAtual - DIA_INICIO_APURACAO) / janela));
    return alvo * frac * 0.92; // deixa margem pros degraus do ao vivo
  }, [ativo, alvo, diaAtual, janela]);

  const [indice, setIndice] = React.useState(ativo ? HISTORICO_INICIAL : 0);

  React.useEffect(() => {
    setIndice(ativo ? HISTORICO_INICIAL : 0);
  }, [ativo, seed]);

  const passoValor = alvo ? (alvo - baseReserva) / 40 : 0;
  const reserva = Math.min(alvo, baseReserva + Math.max(0, indice - HISTORICO_INICIAL) * passoValor);
  const cheio = alvo > 0 && reserva >= alvo;

  // Timer único, pausado fora de foco
  React.useEffect(() => {
    if (!ativo || cheio) return;
    const reduz = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduz) return;

    let timer;
    let vivo = true;

    const agendar = () => {
      clearTimeout(timer);
      if (document.visibilityState !== 'visible') return;
      const proximo = eventos[Math.min(indice, eventos.length - 1)];
      timer = setTimeout(() => {
        if (!vivo) return;
        setIndice((n) => Math.min(n + 1, eventos.length));
      }, proximo.espera);
    };

    agendar();
    document.addEventListener('visibilitychange', agendar);
    window.addEventListener('focus', agendar);
    return () => {
      vivo = false;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', agendar);
      window.removeEventListener('focus', agendar);
    };
  }, [ativo, cheio, indice, eventos]);

  // Pilha: só as 6 últimas, a mais nova em cima
  const pilha = eventos.slice(Math.max(0, indice - MAX_PILHA), indice).reverse();

  return (
    <div className="mt-6 border border-pc-ouro/40 bg-pc-preto-2 p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-pc-ouro">
            <ShoppingBag className="h-4 w-4" strokeWidth={1.8} /> Giro da rede agora
            {ativo && <span className="giro-pulso h-2 w-2 rounded-full bg-pc-ouro" />}
          </p>
          <p className="mt-1 text-[11px] text-pc-tinta-fraca">Vendas da rede — vários lotes em operação</p>
        </div>
        <span className="text-[9px] uppercase tracking-[0.14em] text-pc-tinta-fraca">Demonstrativo</span>
      </div>

      {!ativo ? (
        <p className="mt-5 text-xs leading-relaxed text-pc-tinta-fraca">
          O giro começa quando os produtos entram na Loja Virtual, no {DIA_INICIO_APURACAO}º dia.
        </p>
      ) : (
        <>
          <div className="mt-5">
            <ContadorReservaRepasse valor={reserva} alvo={alvo} />
          </div>

          <ul className="mt-4 space-y-2.5">
            {pilha.map((e) => (
              <li
                key={e.id}
                className="giro-entrada border border-pc-borda bg-pc-preto px-3 py-2.5 sm:px-4"
              >
                <p className="truncate text-xs font-bold text-pc-tinta">{e.frase}</p>
                <p className="mt-0.5 truncate text-[11px] text-pc-tinta-fraca">
                  {e.item} · {e.canal} · há {e.minutos} min
                </p>
                <p className="mt-0.5 text-[10px] text-pc-ouro">
                  percentual reservado para o seu repasse
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-5 border-t border-pc-borda pt-3 text-[10px] leading-relaxed text-pc-tinta-fraca">
        Acompanhamento demonstrativo do giro da rede. O repasse do ciclo é o previsto no seu contrato e é
        pago no fechamento, com demonstrativo na Prestação de Contas.
      </p>

      <style>{`
        @keyframes giroEntrada {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .giro-entrada { animation: giroEntrada 0.4s ease-out both; }
        @keyframes giroPulso {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.8); }
        }
        .giro-pulso { animation: giroPulso 1.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .giro-entrada, .giro-pulso { animation: none; }
        }
      `}</style>
    </div>
  );
}