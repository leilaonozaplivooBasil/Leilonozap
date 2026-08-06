import React from 'react';
import { ShoppingBag, FlaskConical } from 'lucide-react';

// 🧾 FEED DE VENDAS DO CICLO — dá a sensação de operação girando em tempo real.
//
// ⚖️ REGRA DE HONESTIDADE (decisão do Gabriel, 06/08/2026): enquanto a Loja
// Virtual não está ligada a este painel, o feed é uma SIMULAÇÃO e é rotulado
// como tal em tela, bem visível. Isso é possível porque o repasse do parceiro
// é FIXO por compromisso contratual e NÃO depende destas vendas — o feed ilustra
// a mecânica da operação, não apura valor nenhum.
// ⛔ PROIBIDO remover o selo "Simulação" enquanto os dados não forem reais.

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

// PRNG com semente: a cadência e a ordem ficam DIFERENTES entre parceiros, mas
// SEMPRE iguais para o mesmo parceiro — sem isso a tela "sorteia" outra coisa a
// cada recarga e o painel parece aleatório/instável.
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

export default function FeedVendasCiclo({ seed, ativo = true, simulado = true }) {
  const [visiveis, setVisiveis] = React.useState(0);

  const lista = React.useMemo(() => {
    const rnd = semear(seed);
    const agora = Date.now();
    return Array.from({ length: 8 }, (_, i) => ({
      id: `${seed || 'demo'}-${i}`,
      item: ITENS[Math.floor(rnd() * ITENS.length)],
      canal: CANAIS[Math.floor(rnd() * CANAIS.length)],
      // horários decrescentes e irregulares (últimas horas)
      hora: new Date(agora - Math.floor(rnd() * 55 + 6) * 60000 * (i + 1)),
      // cadência irregular de entrada: 400–1400ms
      espera: 400 + Math.floor(rnd() * 1000),
    }));
  }, [seed]);

  // Revelação escalonada com pausa quando a aba/app sai de foco.
  // 📱 No celular o timer é congelado pelo sistema em background: sem esta
  // pausa, ao voltar o app dispararia tudo de uma vez.
  React.useEffect(() => {
    if (!ativo) return;
    const reduz = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduz) {
      setVisiveis(lista.length);
      return;
    }

    let timer;
    let cancelado = false;

    const agendar = () => {
      setVisiveis((n) => {
        if (n >= lista.length) return n;
        timer = setTimeout(() => { if (!cancelado) agendar(); }, lista[n].espera);
        return n + 1;
      });
    };

    const tocar = () => {
      clearTimeout(timer);
      if (document.visibilityState === 'visible') agendar();
    };

    tocar();
    document.addEventListener('visibilitychange', tocar);
    window.addEventListener('focus', tocar);
    return () => {
      cancelado = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', tocar);
      window.removeEventListener('focus', tocar);
    };
  }, [lista, ativo]);

  return (
    <div className="border border-pc-borda bg-pc-preto-2 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-pc-ouro">
          <ShoppingBag className="h-4 w-4" strokeWidth={1.8} /> Giro do lote na rede
        </p>
        {simulado && (
          <span className="inline-flex items-center gap-1.5 border border-pc-ouro/50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-pc-ouro">
            <FlaskConical className="h-3 w-3" strokeWidth={2} /> Simulação
          </span>
        )}
      </div>

      {!ativo ? (
        <p className="mt-4 text-xs leading-relaxed text-pc-tinta-fraca">
          O giro começa quando os produtos entram na Loja Virtual, no 10º dia do ciclo.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {lista.slice(0, visiveis).map((v) => (
            <li
              key={v.id}
              className="feed-entrada flex items-center justify-between gap-3 border-b border-pc-borda/60 pb-2 last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-pc-tinta">{v.item}</p>
                <p className="text-[10px] text-pc-tinta-fraca">venda registrada · {v.canal}</p>
              </div>
              <span className="shrink-0 font-mono text-[10px] text-pc-tinta-fraca">
                {v.hora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 border-t border-pc-borda pt-3 text-[10px] leading-relaxed text-pc-tinta-fraca">
        {simulado
          ? 'Simulação do giro do lote na rede, para ilustrar a mecânica da operação. Não são vendas reais e não influenciam o seu repasse: o repasse do ciclo é apurado no fechamento e demonstrado na Prestação de Contas.'
          : 'Vendas registradas na Loja Virtual e na rede durante o ciclo. O repasse é apurado no fechamento e demonstrado na Prestação de Contas.'}
      </p>

      <style>{`
        @keyframes feedEntrada {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .feed-entrada { animation: feedEntrada 0.35s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .feed-entrada { animation: none; }
        }
      `}</style>
    </div>
  );
}