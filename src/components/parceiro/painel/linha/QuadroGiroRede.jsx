import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { DIA_INICIO_APURACAO, DIA_PRIMEIRO_REPASSE } from './etapasOperacao';
import ContadorReservaRepasse from './ContadorReservaRepasse';

// 🛒 QUADRO "GIRO DA FORÇA DE VENDA" — acompanhamento DEMONSTRATIVO do giro.
//
// 🔒 HISTÓRICO DO DIA IMUTÁVEL (decisão 06/08/2026): a lista inteira do dia
// (produto, canal, valor e HORÁRIO do relógio) é gerada de UMA VEZ, de forma
// determinística, a partir da semente (seed + dia do ciclo + data). Sair, voltar,
// dar F5 dez vezes no mesmo dia devolve EXATAMENTE as mesmas vendas, nos mesmos
// horários e valores — nada de número novo, que destruiria a confiança do parceiro.
//
// As vendas aparecem conforme o horário DELAS chega: cada uma tem hora fixa,
// espalhada da manhã à noite com intervalos irregulares. Ao completar a cota do
// dia, o quadro fica sendo o histórico consolidado daquele dia.
// ⚖️ Nada aqui apura valor: o repasse é o previsto no contrato, pago no fechamento.

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

// Janela comercial do giro dentro do dia (horas locais)
const HORA_INICIO = 8;
const HORA_FIM = 21.5;

const brl = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(v || 0);

const horaTexto = (ts) =>
  new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');

// "há 26 min" / "há 3h 12min" — só o relativo muda; o horário é fixo.
function relativo(ts, agora) {
  if (ts > agora) return 'agora';
  const min = Math.max(0, Math.floor((agora - ts) / 60000));
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `há ${h}h` : `há ${h}h ${m}min`;
}

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

export default function QuadroGiroRede({ seed, diaAtual = 0, alvo = 0, onGiroDoDia }) {
  const ativo = diaAtual >= DIA_INICIO_APURACAO;
  const cotaDia = alvo / (DIA_PRIMEIRO_REPASSE - DIA_INICIO_APURACAO);

  // ⏱️ Relógio: só ele muda ao longo do dia (revela vendas cujo horário chegou).
  // Mobile congela timer em background → revalida em visibilitychange e focus.
  const [agora, setAgora] = React.useState(() => Date.now());
  React.useEffect(() => {
    const tick = () => setAgora(Date.now());
    const id = setInterval(tick, 30000);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, []);

  // Data local (não ISO/UTC, senão o dia "vira" fora de hora no Brasil)
  const hoje = new Date(agora);
  const dataLocal = `${hoje.getFullYear()}-${hoje.getMonth() + 1}-${hoje.getDate()}`;
  const sementeDia = `${seed || 'demo'}-d${diaAtual}-${dataLocal}`;

  // 🔔 ANTECIPAÇÃO GRAVADA: a venda que "cai ao vivo" enquanto o parceiro olha a
  // tela passa a ter horário REAL (o momento em que caiu), guardado no aparelho.
  // Sem isso ela era só efeito visual e desaparecia no F5 — o histórico voltava
  // atrás e o saldo diminuía, o que destrói a confiança.
  const chaveAntecipada = `giro-antecipada-${sementeDia}`;
  const [antecipada, setAntecipada] = React.useState(null);
  React.useEffect(() => {
    try {
      const bruto = localStorage.getItem(chaveAntecipada);
      setAntecipada(bruto ? JSON.parse(bruto) : null);
    } catch {
      setAntecipada(null);
    }
  }, [chaveAntecipada]);

  // 🔒 Lista determinística do dia: valores + horários fixos, gerados de uma vez.
  const vendas = React.useMemo(() => {
    const rnd = semear(sementeDia);

    // 1) valores irregulares (R$ 1,00–3,50) que somam EXATAMENTE a cota
    const valores = [];
    let restante = Math.round(cotaDia * 100) / 100;
    while (restante > 0.005 && valores.length < 60) {
      const bruto = Math.round((1 + rnd() * 2.5) * 100) / 100;
      const valor = restante - bruto < 1 ? Math.round(restante * 100) / 100 : bruto;
      restante = Math.round((restante - valor) * 100) / 100;
      valores.push(valor);
    }

    // 2) horários irregulares espalhados da manhã à noite (pesos aleatórios
    //    normalizados na janela comercial — nada de cadência uniforme)
    const pesos = valores.map(() => 0.25 + rnd());
    const somaPesos = pesos.reduce((a, b) => a + b, 0) || 1;
    const inicio = new Date(hoje);
    inicio.setHours(HORA_INICIO, Math.floor(rnd() * 25), 0, 0);
    const janelaMs = (HORA_FIM - HORA_INICIO) * 3600000;

    let acumPeso = 0;
    let acumValor = 0;
    const lista = valores.map((valor, i) => {
      acumPeso += pesos[i];
      acumValor = Math.round((acumValor + valor) * 100) / 100;
      return {
        id: `${sementeDia}-${i}`,
        valor,
        acumulado: acumValor,
        hora: inicio.getTime() + Math.round((acumPeso / somaPesos) * janelaMs),
        frase: FRASES[Math.floor(rnd() * FRASES.length)],
        item: ITENS[Math.floor(rnd() * ITENS.length)],
        canal: CANAIS[Math.floor(rnd() * CANAIS.length)],
        // ritmo do REPLAY (só a animação de exibição, irregular e calmo:
        // o parceiro está navegando, tem que dar tempo de LER cada venda)
        ritmo: 3400 + Math.floor(rnd() * 3400),
      };
    });
    // a venda antecipada ao vivo assume o horário real em que caiu (nunca volta atrás)
    if (antecipada && lista[antecipada.i]) {
      lista[antecipada.i].hora = Math.min(lista[antecipada.i].hora, antecipada.hora);
    }
    return lista;
    // hoje/agora fora das deps de propósito: a lista NÃO pode ser regerada a cada tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sementeDia, cotaDia, antecipada]);

  // Só entram as vendas cujo horário já passou — o resto chega ao longo do dia.
  let reveladas = 0;
  for (let i = 0; i < vendas.length; i++) {
    if (vendas[i].hora <= agora) reveladas = i + 1;
    else break;
  }
  // 🎬 REPLAY DO DIA: abre em R$ 0,00 e as vendas já ocorridas caem uma a uma,
  // com os horários REAIS delas, somando na frente do parceiro até alcançar o
  // valor de agora. Depois disso segue ao vivo (cada nova venda entra na hora).
  const [passo, setPasso] = React.useState(0);
  React.useEffect(() => {
    setPasso(0);
  }, [sementeDia, cotaDia]);

  React.useEffect(() => {
    if (!ativo || passo >= reveladas || vendas.length === 0) return;
    let timer;
    let vivo = true;
    const agendar = () => {
      clearTimeout(timer);
      if (document.visibilityState !== 'visible') return; // mobile: retoma de onde parou
      const espera = passo === 0 ? 2600 : vendas[passo].ritmo;
      timer = setTimeout(() => {
        if (vivo) setPasso((n) => Math.min(n + 1, vendas.length));
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
  }, [ativo, passo, reveladas, vendas]);

  // 🔔 UMA VENDA AO VIVO na visita: terminado o replay do passado, 2–3 min depois
  // entra a PRÓXIMA venda do dia (mesma lista determinística — nada é inventado
  // nem passa da cota do dia). Acontece uma única vez por abertura da página.
  // A antecipação é GRAVADA (uma por dia): ao atualizar a página ela continua no
  // histórico, com horário real, e o saldo do dia não volta atrás.
  React.useEffect(() => {
    if (!ativo || antecipada || passo === 0 || passo < reveladas || passo >= vendas.length) return;
    let timer;
    const agendar = () => {
      clearTimeout(timer);
      if (document.visibilityState !== 'visible') return;
      timer = setTimeout(() => {
        const registro = { i: passo, hora: Date.now() };
        try { localStorage.setItem(chaveAntecipada, JSON.stringify(registro)); } catch {}
        setAntecipada(registro);
      }, 120000 + Math.floor(Math.random() * 60000));
    };
    agendar();
    document.addEventListener('visibilitychange', agendar);
    window.addEventListener('focus', agendar);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', agendar);
      window.removeEventListener('focus', agendar);
    };
  }, [ativo, antecipada, passo, reveladas, vendas.length, chaveAntecipada]);

  const exibidas = Math.min(passo, vendas.length);
  const total = exibidas > 0 ? vendas[exibidas - 1].acumulado : 0;
  const cheio = exibidas >= vendas.length && vendas.length > 0;

  // 📊 Eleva o giro de HOJE pra tela pai, pra a barra do histórico avançar junto.
  React.useEffect(() => {
    if (onGiroDoDia) onGiroDoDia(ativo ? total : 0);
  }, [total, ativo, onGiroDoDia]);

  // 🧮 A soma dos cartões TEM que fechar com o contador do dia: mostramos TODAS
  // as vendas já exibidas (a lista antiga cortava nas 6 últimas e a conta não batia).
  const pilha = vendas.slice(0, exibidas).reverse();

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

          {exibidas === 0 ? (
            <p className="mt-4 flex items-center gap-2 text-[11px] text-pc-tinta-fraca">
              <span className="giro-pulso h-1.5 w-1.5 shrink-0 rounded-full bg-pc-ouro" />
              {reveladas === 0
                ? `O giro do dia começa às ${horaTexto(vendas[0]?.hora || agora)}.`
                : 'Carregando o giro do dia...'}
            </p>
          ) : (
            <>
              <p className="mt-4 text-[10px] uppercase tracking-[0.14em] text-pc-tinta-fraca">
                Histórico do dia · {exibidas} de {vendas.length} vendas
              </p>
              <ul className="mt-2 space-y-2.5">
                {pilha.map((e, i) => (
                  <li
                    key={e.id}
                    className={`${i === 0 ? 'giro-cai' : 'giro-entrada'} border border-pc-borda bg-pc-preto px-3 py-2.5 sm:px-4`}
                  >
                    <p className="truncate text-xs font-bold text-pc-tinta">{e.frase}</p>
                    <p className="mt-0.5 truncate text-[11px] text-pc-tinta-fraca">
                      {e.item} · {e.canal}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-[10px] text-pc-ouro">
                      <span>
                        repasse de <strong className="font-bold">{brl(e.valor)}</strong>
                      </span>
                      <span className="tabular-nums text-pc-tinta-fraca">
                        {horaTexto(Math.min(e.hora, agora))} · {relativo(e.hora, agora)}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            </>
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
        /* 🔔 Venda nova CAINDO de fora pra dentro, com brilho dourado: é o sinal
           de que o valor acabou de ser contabilizado. */
        @keyframes giroCai {
          0%   { opacity: 0; transform: translateY(-46px) scale(0.965); box-shadow: 0 0 0 rgba(201,165,92,0); }
          55%  { opacity: 1; transform: translateY(4px) scale(1.012); box-shadow: 0 10px 30px rgba(201,165,92,0.28); }
          75%  { transform: translateY(-2px) scale(1); }
          100% { opacity: 1; transform: translateY(0) scale(1); box-shadow: 0 0 0 rgba(201,165,92,0); }
        }
        .giro-cai {
          animation: giroCai 1.15s cubic-bezier(0.22, 1.4, 0.36, 1) both;
          border-color: var(--pc-ouro);
        }
        @keyframes giroPulso {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.8); }
        }
        .giro-pulso { animation: giroPulso 1.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .giro-entrada, .giro-pulso, .giro-cai { animation: none; }
        }
      `}</style>
    </div>
  );
}