import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { DIA_INICIO_APURACAO, DIA_PRIMEIRO_REPASSE } from './etapasOperacao';
import ContadorReservaRepasse from './ContadorReservaRepasse';

// 🛒 QUADRO "GIRO DA FORÇA DE VENDA" — acompanhamento DEMONSTRATIVO do giro.
//
// ⚖️ Coerência da cota diária: a janela de apuração é D+10 → D+30 (20 dias),
// então a COTA DO DIA é o repasse previsto do ciclo dividido por 20. As vendas
// somam em fatias irregulares até fechar EXATAMENTE a cota do dia — e param.
// Nada aqui apura valor: o repasse é o previsto no contrato, pago no fechamento.
// 📱 Um único timer, pausado fora de foco. Ao voltar, o acumulado é recalculado
// pela hora atual (mobile congela timers em background).

const FRASES = [
  'Acabaram de comprar na loja',
  'Mais uma venda realizada',
  'Venda registrada',
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

const CANAIS = ['Loja Virtual', 'Licenciado', 'Vendedor', 'Influencer'];

const MAX_PILHA = 6;
const FATIAS = 12;
// Cota considerada "fechável" às 22h: quem abre depois disso já vê a meta atendida.
const HORA_FECHAMENTO = 22;

const brl = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(v || 0);

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

// Fração da cota que já deveria estar contabilizada nesta hora do dia
function fracaoDoDia() {
  const agora = new Date();
  const horas = agora.getHours() + agora.getMinutes() / 60;
  return Math.min(1, horas / HORA_FECHAMENTO);
}

export default function QuadroGiroRede({ seed, diaAtual = 0, alvo = 0 }) {
  const ativo = diaAtual >= DIA_INICIO_APURACAO;
  const cotaDia = alvo / (DIA_PRIMEIRO_REPASSE - DIA_INICIO_APURACAO);

  // Semente do DIA: mesmo ritmo dentro do dia, dia seguinte reinicia sozinho.
  const sementeDia = `${seed || 'demo'}-${new Date().toISOString().slice(0, 10)}`;

  // Fatias irregulares que somam EXATAMENTE a cota do dia (a última fecha a conta)
  const fatias = React.useMemo(() => {
    const rnd = semear(sementeDia);
    const pesos = Array.from({ length: FATIAS }, () => 0.4 + rnd());
    const soma = pesos.reduce((a, b) => a + b, 0);
    let acumulado = 0;
    return pesos.map((p, i) => {
      const valor = i === FATIAS - 1 ? cotaDia - acumulado : Math.round(((cotaDia * p) / soma) * 100) / 100;
      acumulado = Math.round((acumulado + valor) * 100) / 100;
      return {
        id: `${sementeDia}-${i}`,
        valor: Math.max(0, valor),
        acumulado,
        frase: FRASES[Math.floor(rnd() * FRASES.length)],
        item: ITENS[Math.floor(rnd() * ITENS.length)],
        canal: CANAIS[Math.floor(rnd() * CANAIS.length)],
        minutos: 1 + Math.floor(rnd() * 40),
        espera: 3000 + Math.floor(rnd() * 6000), // 3s a 9s, irregular
      };
    });
  }, [sementeDia, cotaDia]);

  // Quantas fatias já deveriam ter caído nesta hora do dia
  const indicePorHora = React.useCallback(() => {
    if (!ativo || cotaDia <= 0) return 0;
    const meta = cotaDia * fracaoDoDia();
    const i = fatias.findIndex((f) => f.acumulado >= meta);
    return i === -1 ? fatias.length : i;
  }, [ativo, cotaDia, fatias]);

  const [indice, setIndice] = React.useState(indicePorHora);

  // Recalibra ao trocar de aporte/dia
  React.useEffect(() => {
    setIndice(indicePorHora());
  }, [indicePorHora]);

  const total = indice > 0 ? fatias[indice - 1].acumulado : 0;
  const cheio = indice >= fatias.length;

  // Timer único: pausa fora de foco e, ao voltar, recalibra pela hora atual
  React.useEffect(() => {
    if (!ativo || cheio) return;
    const reduz = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduz) return;

    let timer;
    let vivo = true;

    const agendar = () => {
      clearTimeout(timer);
      if (document.visibilityState !== 'visible') return;
      // quem voltou depois de horas vê o número certo, não o congelado
      setIndice((n) => Math.max(n, indicePorHora()));
      const proxima = fatias[Math.min(indice, fatias.length - 1)];
      timer = setTimeout(() => {
        if (vivo) setIndice((n) => Math.min(n + 1, fatias.length));
      }, proxima.espera);
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
  }, [ativo, cheio, indice, fatias, indicePorHora]);

  const pilha = fatias.slice(Math.max(0, indice - MAX_PILHA), indice).reverse();

  return (
    <div className="mt-6 border border-pc-ouro/40 bg-pc-preto-2 p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-pc-ouro">
            <ShoppingBag className="h-4 w-4" strokeWidth={1.8} /> Giro da força de venda
            {ativo && !cheio && <span className="giro-pulso h-2 w-2 rounded-full bg-pc-ouro" />}
          </p>
          <p className="mt-1 text-[11px] text-pc-tinta-fraca">
            Loja Virtual, licenciados, vendedores e influenciadores
          </p>
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
            <ContadorReservaRepasse
              valor={total}
              cotaDia={cotaDia}
              alvo={alvo}
              diaRepasse={DIA_PRIMEIRO_REPASSE}
            />
          </div>

          <ul className="mt-4 space-y-2.5">
            {pilha.map((e) => (
              <li key={e.id} className="giro-entrada border border-pc-borda bg-pc-preto px-3 py-2.5 sm:px-4">
                <p className="truncate text-xs font-bold text-pc-tinta">{e.frase}</p>
                <p className="mt-0.5 truncate text-[11px] text-pc-tinta-fraca">
                  {e.item} · {e.canal} · há {e.minutos} min
                </p>
                <p className="mt-0.5 text-[10px] text-pc-ouro">
                  repasse de <strong className="font-bold">{brl(e.valor)}</strong>
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-5 border-t border-pc-borda pt-3 text-[10px] leading-relaxed text-pc-tinta-fraca">
        Acompanhamento demonstrativo do giro da força de venda. O repasse do ciclo é o previsto no seu
        contrato e é pago no fechamento, com demonstrativo na Prestação de Contas.
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