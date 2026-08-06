import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { DIA_INICIO_APURACAO, DIA_PRIMEIRO_REPASSE } from './etapasOperacao';
import ContadorReservaRepasse from './ContadorReservaRepasse';

// 🛒 QUADRO "GIRO DA FORÇA DE VENDA" — acompanhamento DEMONSTRATIVO do giro.
//
// Abre SEMPRE em R$ 0,00, dá tempo do parceiro ler, e então as vendas começam a
// cair uma a uma (R$ 1,00 a R$ 3,50), somando até fechar EXATAMENTE a cota do dia.
// ⚖️ A cota do dia = repasse previsto do ciclo ÷ 20 dias de apuração (D+10→D+30).
// Nada aqui apura valor: o repasse é o previsto no contrato, pago no fechamento.
// 📱 Um único timer, pausado fora de foco; ao voltar retoma de onde parou (nunca
// despeja vendas acumuladas de uma vez).

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
const TICKET_MEDIO = 2.2;

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

export default function QuadroGiroRede({ seed, diaAtual = 0, alvo = 0 }) {
  const ativo = diaAtual >= DIA_INICIO_APURACAO;
  const cotaDia = alvo / (DIA_PRIMEIRO_REPASSE - DIA_INICIO_APURACAO);

  // Semente do DIA: mesmo ritmo dentro do dia, dia seguinte reinicia sozinho.
  const sementeDia = `${seed || 'demo'}-${new Date().toISOString().slice(0, 10)}`;

  // Vendas pequenas e irregulares (R$ 1,00–3,50) que somam EXATAMENTE a cota.
  const { vendas, esperaInicial } = React.useMemo(() => {
    const rnd = semear(sementeDia);
    const inicial = 4000 + Math.floor(rnd() * 2000); // 4s a 6s de leitura
    const lista = [];
    let restante = Math.round(cotaDia * 100) / 100;
    let i = 0;

    while (restante > 0.005 && i < 60) {
      const bruto = Math.round((1 + rnd() * 2.5) * 100) / 100;
      // fecha a conta quando o que sobraria seria menor que uma venda mínima
      const valor = restante - bruto < 1 ? Math.round(restante * 100) / 100 : bruto;
      restante = Math.round((restante - valor) * 100) / 100;
      lista.push({
        id: `${sementeDia}-${i}`,
        valor,
        acumulado: Math.round((cotaDia - restante) * 100) / 100,
        frase: FRASES[Math.floor(rnd() * FRASES.length)],
        item: ITENS[Math.floor(rnd() * ITENS.length)],
        canal: CANAIS[Math.floor(rnd() * CANAIS.length)],
        minutos: 1 + Math.floor(rnd() * 40),
        espera: 5000 + Math.floor(rnd() * 7000), // 5s a 12s, irregular
      });
      i++;
    }
    return { vendas: lista, esperaInicial: inicial };
  }, [sementeDia, cotaDia]);

  // Começa SEMPRE em zero — nada de pré-preencher pela hora do dia.
  const [indice, setIndice] = React.useState(0);
  React.useEffect(() => {
    setIndice(0);
  }, [sementeDia, cotaDia]);

  const total = indice > 0 ? vendas[indice - 1].acumulado : 0;
  const cheio = indice >= vendas.length;

  // Timer único: pausa fora de foco e retoma de onde parou (não pula pro fim).
  React.useEffect(() => {
    if (!ativo || cheio || vendas.length === 0) return;

    let timer;
    let vivo = true;

    const agendar = () => {
      clearTimeout(timer);
      if (document.visibilityState !== 'visible') return;
      const espera = indice === 0 ? esperaInicial : vendas[indice].espera;
      timer = setTimeout(() => {
        if (vivo) setIndice((n) => Math.min(n + 1, vendas.length));
      }, espera);
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
  }, [ativo, cheio, indice, vendas, esperaInicial]);

  const pilha = vendas.slice(Math.max(0, indice - MAX_PILHA), indice).reverse();

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

          {indice === 0 ? (
            <p className="mt-4 flex items-center gap-2 text-[11px] text-pc-tinta-fraca">
              <span className="giro-pulso h-1.5 w-1.5 shrink-0 rounded-full bg-pc-ouro" />
              Aguardando o próximo giro...
            </p>
          ) : (
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
          )}
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