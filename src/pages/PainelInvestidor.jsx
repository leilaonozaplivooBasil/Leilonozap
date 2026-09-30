import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { plataforma } from '@/api/plataformaClient';
import { fmtBR } from '@/lib/money';
import { toast } from 'sonner';
import { useSecureRole } from '@/components/hooks/useSecureRole';
import { ADMIN_ROLES } from '@/lib/roles';
import PortalPageHeader from '@/components/common/PortalPageHeader';
import MapaBrasil, { nomeDoEstado } from '@/components/investidor/MapaBrasil';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie,
} from 'recharts';
import {
  TrendingUp, Users, Wallet, PiggyBank, RefreshCw, Gavel, ShoppingBag, MapPin, Activity, Loader2, ArrowLeft, Landmark, UserRound, Megaphone, Cake,
} from 'lucide-react';

// 📈 PAINEL DO INVESTIDOR — DIR-190 (30/09/2026)
// Dono: "essa visão geral tem que ser foda, muito intuitiva, contemplar tudo:
// vendas dos parceiros, loja virtual, quanto do depósito vai pra compra, pra
// arremate, pra leilão esperando; volume financeiro por área em tempo real;
// quantas pessoas entrando; mapa do Brasil com calor por estado."
//
// Toda conta vem de UMA função no banco (public.painel_investidor), conciliada
// com o Mercado Pago em 30/09/2026. Aqui só se desenha. Regras que a tela
// respeita à risca:
//   • "Entrou" = dinheiro pago pelo gateway (PIX/cartão). Uso de saldo NUNCA
//     soma com entrada — era o erro do "Valor Total R$ 43.185".
//   • histórico importado (Nexus) fica à parte, marcado como importado.
//   • arremates "aguardando pagamento" aparecem como quantidade, fora do caixa.

const GLASS = 'rounded-2xl border border-white/10 bg-gradient-to-br from-gray-800/60 to-gray-900/70 backdrop-blur-xl shadow-lg shadow-black/30';
// 📅 DIR-193: períodos por dia do calendário (Brasília). "Hoje" = desde a meia-noite,
// não "últimas 24 h" — antes o número de hoje caía ao longo do dia conforme os
// pagamentos de ontem saíam da janela móvel (R$ 600 → 550 → 50).
const PERIODOS = [
  { dias: 1, rotulo: 'Hoje', sub: 'desde a meia-noite' },
  { dias: 7, rotulo: '7 dias', sub: 'hoje e os 6 anteriores' },
  { dias: 30, rotulo: '30 dias', sub: 'hoje e os 29 anteriores' },
  { dias: 0, rotulo: 'Tudo', sub: 'desde sempre' },
];
const AREAS = {
  carteira: { rotulo: 'Depósitos na carteira', cor: '#F5C451' },
  operacao: { rotulo: 'Saldo de operação (PDV)', cor: '#FBBF24' },
  loja: { rotulo: 'Loja virtual · PIX e cartão', cor: '#38BDF8' },
  pdv: { rotulo: 'PDV · PIX e cartão', cor: '#2DD4BF' },
  arremate: { rotulo: 'Arremates · PIX e cartão', cor: '#A78BFA' },
  adesao: { rotulo: 'Adesões de vendedor', cor: '#C084FC' },
  parceiro: { rotulo: 'Parceiro de compra', cor: '#F472B6' },
  outros: { rotulo: 'Passaporte e frete', cor: '#9CA3AF' },
  nexus: { rotulo: 'Histórico importado', cor: '#6B7280' },
};
const COMPRAS = {
  loja: { rotulo: 'Loja virtual', cor: '#38BDF8' },
  pdv: { rotulo: 'PDV', cor: '#2DD4BF' },
  arremate: { rotulo: 'Arremates no leilão', cor: '#A78BFA' },
};
const CANAIS = {
  Instagram: '#E1306C', Facebook: '#1877F2', WhatsApp: '#25D366', Google: '#FBBC05', TikTok: '#69C9D0', YouTube: '#FF0000',
  'Indicação de membro': '#34D399', Direto: '#F5C451', 'Outros sites': '#A78BFA', 'Sem registro': '#4B5563',
};
// ⏱️ DIR-192 (30/09/2026) — dono: "os números precisam atualizar em tempo real e o
// botão de atualizar precisa funcionar". O botão funcionava, mas em silêncio: nada
// girava, nada avisava. Agora: recálculo a cada 20 s, contagem regressiva visível,
// botão gira e confirma com aviso, recálculo ao voltar para a aba, e em caso de
// falha a tela mantém os últimos números e avisa em vez de cair.
const INTERVALO_SEG = 20;
const moeda = (v) => `R$ ${fmtBR(Number(v) || 0)}`;
const pct = (parte, todo) => (Number(todo) > 0 ? Math.round((Number(parte) / Number(todo)) * 1000) / 10 : 0);
const hora = (iso) => (iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '');
const diaCurto = (iso) => { const d = new Date(iso); return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
const mesCurto = (m) => ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(String(m).slice(5, 7)) - 1] || m;

function Kpi({ icon: Icon, rotulo, valor, detalhe, cor = 'text-white', teste }) {
  return (
    <div className={`${GLASS} p-4 sm:p-5`} data-teste={teste}>
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
        <Icon className="w-3.5 h-3.5" /> {rotulo}
      </div>
      <div className={`mt-2 text-2xl sm:text-3xl font-black tabular-nums ${cor}`}>{valor}</div>
      {detalhe && <div className="mt-1 text-xs text-gray-400">{detalhe}</div>}
    </div>
  );
}

function Secao({ icon: Icon, titulo, sub, children, teste }) {
  return (
    <section className={`${GLASS} p-4 sm:p-6`} data-teste={teste}>
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="flex items-center gap-2 text-base sm:text-lg font-black text-white"><Icon className="w-5 h-5 text-emerald-400" /> {titulo}</h2>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

function BarrasHorizontais({ itens, total }) {
  return (
    <ul className="space-y-2.5">
      {itens.map((it) => (
        <li key={it.chave}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-gray-200"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: it.cor }} /> {it.rotulo}</span>
            <span className="tabular-nums font-bold text-white">{moeda(it.valor)} <span className="text-xs font-medium text-gray-500">· {it.n} · {pct(it.valor, total)}%</span></span>
          </div>
          <div className="mt-1 h-2 w-full rounded-full bg-white/5">
            <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${Math.max(1.5, pct(it.valor, total))}%`, background: it.cor }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

const TooltipEscuro = ({ active, payload, label, formatador }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/15 bg-gray-950/95 px-3 py-2 text-xs text-white shadow-xl">
      <div className="text-gray-400">{label}</div>
      <div className="font-bold">{formatador ? formatador(payload[0].value) : payload[0].value}</div>
    </div>
  );
};

export default function PainelInvestidor() {
  const navigate = useNavigate();
  const { status: authStatus } = useSecureRole(ADMIN_ROLES, 'Home');
  const [dias, setDias] = useState(30);
  const [painel, setPainel] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [ultimaEm, setUltimaEm] = useState(null);
  const [agora, setAgora] = useState(() => Date.now());
  const [falhas, setFalhas] = useState(0);
  const [erro, setErro] = useState('');
  const [ufSelecionada, setUfSelecionada] = useState(null);
  const [campoMapa, setCampoMapa] = useState('n');
  const timer = useRef(null);

  const carregar = useCallback(async (silencioso = false, manual = false) => {
    let user = null;
    try { user = JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { user = null; }
    if (!user?.id) { setErro('Entre com uma conta de administrador.'); setCarregando(false); return; }
    if (!silencioso) setCarregando(true);
    setAtualizando(true);
    try {
      const r = await plataforma.functions.invoke('painelInvestidor', { user_id: user.id, dias });
      const data = r?.data || r;
      if (data?.success && data.painel) {
        setPainel(data.painel); setErro(''); setFalhas(0); setUltimaEm(Date.now());
        if (manual) toast.success(`Atualizado às ${hora(data.painel.gerado_em || new Date().toISOString())}`, { duration: 2500 });
      } else {
        setFalhas((f) => f + 1);
        if (!painel) setErro(data?.error || 'Não foi possível calcular agora.');
        if (manual) toast.error(data?.error || 'Não foi possível calcular agora.');
      }
    } catch (e) {
      setFalhas((f) => f + 1);
      if (!painel) setErro('Não foi possível calcular agora.');
      if (manual) toast.error('Sem resposta do servidor. Os últimos números continuam na tela.');
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [dias, painel]);

  useEffect(() => { carregar(); }, [dias]); // eslint-disable-line react-hooks/exhaustive-deps
  // ⏱️ ao vivo: recalcula a cada INTERVALO_SEG e ao voltar para a aba
  useEffect(() => {
    timer.current = setInterval(() => carregar(true), INTERVALO_SEG * 1000);
    const aoVoltar = () => { if (document.visibilityState === 'visible') carregar(true); };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => { clearInterval(timer.current); document.removeEventListener('visibilitychange', aoVoltar); };
  }, [carregar]);
  // relógio da contagem regressiva
  useEffect(() => { const t = setInterval(() => setAgora(Date.now()), 1000); return () => clearInterval(t); }, []);
  const segundosDesde = ultimaEm ? Math.max(0, Math.round((agora - ultimaEm) / 1000)) : null;
  const proximaEm = segundosDesde === null ? null : Math.max(0, INTERVALO_SEG - (segundosDesde % INTERVALO_SEG));

  const p = painel;
  const periodoAtual = PERIODOS.find((x) => x.dias === dias);
  const rotuloPeriodo = periodoAtual?.rotulo || `${dias} dias`;
  const entradaAreas = useMemo(() => {
    const src = p?.entrada?.por_area || {};
    return Object.entries(src).map(([k, v]) => ({ chave: k, rotulo: AREAS[k]?.rotulo || k, cor: AREAS[k]?.cor || '#9CA3AF', n: v.n, valor: Number(v.valor) || 0 })).sort((a, b) => b.valor - a.valor);
  }, [p]);
  const comprasAreas = useMemo(() => {
    const src = p?.compras?.periodo || {};
    return Object.keys(COMPRAS).map((k) => ({ chave: k, rotulo: COMPRAS[k].rotulo, cor: COMPRAS[k].cor, n: src[k]?.n || 0, valor: Number(src[k]?.valor) || 0 })).sort((a, b) => b.valor - a.valor);
  }, [p]);
  const totalCompras = comprasAreas.reduce((s, x) => s + x.valor, 0);
  const fluxo = p?.fluxo_deposito || {};
  const segmentos = useMemo(() => {
    const dep = Number(fluxo.depositado) || 0;
    const base = [
      { chave: 'arremates', rotulo: 'Foi para arremates no leilão', valor: Number(fluxo.arremates) || 0, cor: '#A78BFA' },
      { chave: 'loja', rotulo: 'Foi para compras na loja e PDV', valor: Number(fluxo.loja) || 0, cor: '#38BDF8' },
      { chave: 'reservado', rotulo: 'Reservado em lances de leilões ativos', valor: Number(fluxo.reservado) || 0, cor: '#34D399' },
      { chave: 'parado', rotulo: 'Parado nas carteiras, à espera de produto', valor: Number(fluxo.parado) || 0, cor: '#F5C451' },
    ];
    const soma = base.reduce((s, x) => s + x.valor, 0);
    const resto = Math.max(0, dep - soma);
    return { dep, itens: base, resto };
  }, [fluxo]);
  const porDia = (p?.pessoas?.por_dia || []).map((d) => ({ dia: diaCurto(d.dia), n: d.n }));
  const porMes = (p?.entrada?.por_mes || []).map((m) => ({ mes: mesCurto(m.mes), valor: Number(m.valor) || 0, n: m.n }));
  const geo = p?.geografia?.por_uf || [];
  const topUfs = [...geo].sort((a, b) => (b[campoMapa] || 0) - (a[campoMapa] || 0)).slice(0, 6);
  const totalLocalizados = geo.reduce((s, x) => s + (Number(x.n) || 0), 0);
  const ufDetalhe = ufSelecionada ? geo.find((x) => x.uf === ufSelecionada) : null;
  const funil = p?.funil || {};
  const etapasFunil = [
    { rotulo: 'Cadastros', valor: funil.cadastros || 0, total: funil.cadastros_total || 0 },
    { rotulo: 'Depositaram', valor: funil.depositantes || 0, total: funil.depositantes_total || 0 },
    { rotulo: 'Compraram', valor: funil.compradores || 0, total: funil.compradores_total || 0 },
    { rotulo: 'Compraram de novo', valor: funil.recompradores || 0, total: funil.recompradores_total || 0 },
  ];
  const leilao = p?.leilao || {};
  const nexus = p?.compras?.total?.nexus;
  const perfil = p?.perfil || null;
  const generoBase = perfil?.genero ? (dias === 0 ? perfil.genero : perfil.genero.periodo) : null;
  const fatiasGenero = generoBase ? [
    { nome: 'Homens', valor: generoBase.masculino || 0, cor: '#38BDF8' },
    { nome: 'Mulheres', valor: generoBase.feminino || 0, cor: '#F472B6' },
    { nome: 'Sem estimativa', valor: generoBase.indefinido || 0, cor: '#4B5563' },
  ].filter((f) => f.valor > 0) : [];
  const totalGenero = fatiasGenero.reduce((s, f) => s + f.valor, 0);
  const canais = (perfil?.canais?.lista || []).map((c) => ({ nome: c.canal, valor: dias === 0 ? c.n : c.periodo, total: c.n, cor: CANAIS[c.canal] || '#9CA3AF' })).filter((c) => c.valor > 0).sort((a, b) => b.valor - a.valor);
  const totalCanais = canais.reduce((s, c) => s + c.valor, 0);

  if (authStatus === 'checking') {
    return <div className="min-h-[60vh] grid place-items-center text-gray-400"><Loader2 className="w-8 h-8 animate-spin text-emerald-400" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        <PortalPageHeader
          icon={TrendingUp}
          title="Painel do Investidor"
          subtitle="A plataforma em números reais, conciliados com o gateway, ao vivo"
          accentColor="amber"
          backTo="/NetworkOverview"
          backLabel="Sistema de Alavancagem"
        />

        {/* Período + pulso */}
        <div className="flex flex-wrap items-center gap-2" data-teste="investidor-periodos">
          {PERIODOS.map((x) => (
            <button
              key={x.dias}
              type="button"
              onClick={() => setDias(x.dias)}
              className={`min-h-[40px] rounded-xl px-4 text-sm font-bold transition-colors ${dias === x.dias ? 'bg-amber-400 text-gray-950' : 'border border-white/15 bg-white/5 text-gray-200 hover:bg-white/10'}`}
            >
              {x.rotulo}
            </button>
          ))}
          <div className="ml-auto flex flex-wrap items-center gap-2 text-xs text-gray-400" data-teste="investidor-atualizado">
            <span className={`inline-block w-2 h-2 rounded-full ${falhas > 0 ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`} />
            {periodoAtual?.sub && <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-gray-300" data-teste="investidor-periodo-sub">{rotuloPeriodo} · {periodoAtual.sub}</span>}
            <span className="tabular-nums">
              {p?.gerado_em
                ? (falhas > 0 ? `Sem resposta há ${segundosDesde ?? 0} s · mostrando os últimos números` : `Ao vivo · calculado às ${hora(p.gerado_em)} · próxima em ${proximaEm ?? INTERVALO_SEG} s`)
                : 'Calculando…'}
            </span>
            <button
              type="button"
              onClick={() => carregar(true, true)}
              data-teste="investidor-botao-atualizar"
              className="inline-flex min-h-[32px] items-center gap-1.5 rounded-md border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[11px] font-bold text-amber-200 hover:bg-amber-400/20 disabled:opacity-60"
              disabled={atualizando}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${atualizando ? 'animate-spin' : ''}`} /> {atualizando ? 'Atualizando…' : 'Atualizar agora'}
            </button>
          </div>
        </div>

        {erro && !p && (
          <div className={`${GLASS} p-6 text-center text-gray-300`}>
            <p className="font-bold text-white">Não foi possível montar o painel</p>
            <p className="text-sm">{erro}</p>
            <button type="button" onClick={() => navigate('/NetworkOverview')} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white"><ArrowLeft className="w-4 h-4" /> Voltar</button>
          </div>
        )}

        {carregando && !p && (
          <div className="grid place-items-center py-20 text-gray-400"><Loader2 className="w-8 h-8 animate-spin text-amber-400" /></div>
        )}

        {p && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-teste="investidor-kpis">
              <Kpi icon={Landmark} rotulo={`Entrou pelo gateway · ${rotuloPeriodo}`} valor={moeda(p.entrada?.periodo?.valor)} detalhe={`${p.entrada?.periodo?.n || 0} pagamentos · desde sempre ${moeda(p.entrada?.total?.valor)}`} cor="text-amber-300" teste="kpi-entrada" />
              <Kpi icon={Users} rotulo="Pessoas na base" valor={(p.pessoas?.total || 0).toLocaleString('pt-BR')} detalhe={`+${p.pessoas?.hoje || 0} hoje · +${p.pessoas?.d7 || 0} em 7 dias · +${p.pessoas?.d30 || 0} em 30 dias`} cor="text-emerald-300" teste="kpi-pessoas" />
              <Kpi icon={Wallet} rotulo="Depositado nas carteiras" valor={moeda(fluxo.depositado)} detalhe={`${fluxo.depositantes || 0} pessoas depositaram · tudo pago no gateway`} teste="kpi-depositado" />
              <Kpi icon={PiggyBank} rotulo="Parado nas carteiras" valor={moeda(fluxo.parado)} detalhe={`${pct(fluxo.parado, fluxo.depositado)}% do depositado, esperando produto`} cor="text-yellow-200" teste="kpi-parado" />
            </div>

            <div className="grid lg:grid-cols-2 gap-5">
              {/* Entrada por área */}
              <Secao icon={Landmark} titulo="Dinheiro que entrou, por área" sub={`${rotuloPeriodo} · só pagamentos aprovados no gateway`} teste="investidor-entrada">
                {entradaAreas.length ? <BarrasHorizontais itens={entradaAreas} total={Number(p.entrada?.periodo?.valor) || 0} /> : <p className="text-sm text-gray-500">Nenhum pagamento no período.</p>}
                <div className="mt-5">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-500">Por mês · últimos 12 meses</p>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={porMes} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="mes" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} width={44} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                        <Tooltip content={<TooltipEscuro formatador={moeda} />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                        <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                          {porMes.map((m, i) => <Cell key={m.mes} fill={i === porMes.length - 1 ? '#F5C451' : '#B08A2E'} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Secao>

              {/* Fluxo do depósito */}
              <Secao icon={Wallet} titulo="Para onde vai o dinheiro depositado" sub="desde sempre · a conta fecha com o saldo das carteiras" teste="investidor-fluxo">
                <div className="flex h-7 w-full overflow-hidden rounded-full bg-white/5">
                  {segmentos.itens.map((s) => (
                    <div key={s.chave} title={`${s.rotulo}: ${moeda(s.valor)}`} style={{ width: `${pct(s.valor, segmentos.dep)}%`, background: s.cor }} className="h-full transition-all duration-700" />
                  ))}
                </div>
                <ul className="mt-4 space-y-2">
                  {segmentos.itens.map((s) => (
                    <li key={s.chave} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2 text-gray-200"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: s.cor }} /> {s.rotulo}</span>
                      <span className="tabular-nums font-bold text-white">{moeda(s.valor)} <span className="text-xs font-medium text-gray-500">· {pct(s.valor, segmentos.dep)}%</span></span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-gray-500">Depositado: <span className="text-gray-300 font-semibold">{moeda(segmentos.dep)}</span>{segmentos.resto > 0 ? ` · ${moeda(segmentos.resto)} em estornos e ajustes` : ''}.</p>
              </Secao>
            </div>

            <div className="grid lg:grid-cols-3 gap-5">
              {/* Funil */}
              <Secao icon={Activity} titulo="Funil" sub={rotuloPeriodo} teste="investidor-funil">
                <ol className="space-y-3">
                  {etapasFunil.map((e, i) => {
                    const anterior = i === 0 ? e.valor : etapasFunil[i - 1].valor;
                    const largura = etapasFunil[0].valor ? Math.max(4, (e.valor / etapasFunil[0].valor) * 100) : 0;
                    return (
                      <li key={e.rotulo}>
                        <div className="flex items-baseline justify-between text-sm">
                          <span className="text-gray-200">{e.rotulo}</span>
                          <span className="tabular-nums font-bold text-white">{e.valor} <span className="text-xs font-medium text-gray-500">{i > 0 ? `· ${pct(e.valor, anterior)}%` : ''} · total {e.total}</span></span>
                        </div>
                        <div className="mt-1 h-2.5 rounded-full bg-white/5"><div className="h-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300" style={{ width: `${largura}%` }} /></div>
                      </li>
                    );
                  })}
                </ol>
              </Secao>

              {/* Compras por área */}
              <Secao icon={ShoppingBag} titulo="Compras pagas, por área" sub={`${rotuloPeriodo} · qualquer meio de pagamento`} teste="investidor-compras">
                <BarrasHorizontais itens={comprasAreas} total={totalCompras} />
                <p className="mt-3 text-xs text-gray-500">Total no período: <span className="text-gray-300 font-semibold">{moeda(totalCompras)}</span>.</p>
                {nexus && (
                  <p className="mt-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-400">Histórico importado da operação anterior: {nexus.n} vendas, {moeda(nexus.valor)}. Fica fora dos números acima.</p>
                )}
              </Secao>

              {/* Leilão */}
              <Secao icon={Gavel} titulo="Leilão ao vivo" teste="investidor-leilao">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3"><div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Leilões ativos</div><div className="text-2xl font-black text-white tabular-nums">{leilao.ativos || 0}</div><div className="text-xs text-gray-500">{moeda(leilao.lances_ativos_valor)} em lances</div></div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3"><div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Lances · 24 h</div><div className="text-2xl font-black text-white tabular-nums">{leilao.lances_24h || 0}</div></div>
                  <div className="rounded-xl border border-violet-400/30 bg-violet-500/10 p-3"><div className="text-[10px] font-bold uppercase tracking-wider text-violet-200/80">Arremates pagos · {rotuloPeriodo}</div><div className="text-2xl font-black text-white tabular-nums">{leilao.arremates_pagos?.n || 0}</div><div className="text-xs text-violet-200/80">{moeda(leilao.arremates_pagos?.valor)} · desde sempre {moeda(leilao.arremates_pagos_total?.valor)}</div></div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3"><div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Aguardando pagamento</div><div className="text-2xl font-black text-white tabular-nums">{leilao.aguardando_pagamento?.n || 0}</div><div className="text-xs text-gray-500">fora do caixa até pagar</div></div>
                </div>
              </Secao>
            </div>

            {/* Perfil das pessoas */}
            {perfil && (
              <div className="grid lg:grid-cols-3 gap-5" data-teste="investidor-perfil">
                <Secao icon={UserRound} titulo="Homens e mulheres" sub={`${rotuloPeriodo} · ${perfil.genero?.metodo || 'estimado pelo primeiro nome'}`} teste="investidor-genero">
                  <div className="flex items-center gap-4">
                    <div className="h-40 w-40 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={fatiasGenero} dataKey="valor" nameKey="nome" innerRadius={44} outerRadius={70} paddingAngle={2} stroke="none">
                            {fatiasGenero.map((f) => <Cell key={f.nome} fill={f.cor} />)}
                          </Pie>
                          <Tooltip content={<TooltipEscuro formatador={(v) => `${v} pessoas`} />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="flex-1 space-y-2">
                      {fatiasGenero.map((f) => (
                        <li key={f.nome} className="flex items-baseline justify-between text-sm">
                          <span className="flex items-center gap-2 text-gray-200"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: f.cor }} /> {f.nome}</span>
                          <span className="tabular-nums font-bold text-white">{f.valor} <span className="text-xs font-medium text-gray-500">· {pct(f.valor, totalGenero)}%</span></span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Secao>

                <Secao icon={Megaphone} titulo="Por onde chegaram" sub={`${rotuloPeriodo} · origem registrada no cadastro desde ${perfil.canais?.registro_desde ? new Date(perfil.canais.registro_desde).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '25/09'}`} teste="investidor-canais">
                  <div className="flex items-center gap-4">
                    <div className="h-40 w-40 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={canais} dataKey="valor" nameKey="nome" innerRadius={44} outerRadius={70} paddingAngle={2} stroke="none">
                            {canais.map((c) => <Cell key={c.nome} fill={c.cor} />)}
                          </Pie>
                          <Tooltip content={<TooltipEscuro formatador={(v) => `${v} pessoas`} />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="flex-1 space-y-1.5">
                      {canais.map((c) => (
                        <li key={c.nome} className="flex items-baseline justify-between text-sm">
                          <span className="flex items-center gap-2 text-gray-200"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: c.cor }} /> {c.nome}</span>
                          <span className="tabular-nums font-bold text-white">{c.valor} <span className="text-xs font-medium text-gray-500">· {pct(c.valor, totalCanais)}%</span></span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="mt-3 text-xs text-gray-500">Antes de {perfil.canais?.registro_desde ? new Date(perfil.canais.registro_desde).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '25/09'} o cadastro não guardava a origem: quem entrou por link de membro aparece como indicação.</p>
                </Secao>

                <Secao icon={Cake} titulo="Faixa etária" teste="investidor-idade">
                  <div className="rounded-xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-gray-300">
                    <p className="font-bold text-white">Ainda não coletamos data de nascimento.</p>
                    <p className="mt-1">Nenhum cadastro tem esse dado hoje, e a idade não pode ser estimada com honestidade. Para esta fatia acender: um campo opcional de data de nascimento no cadastro e no perfil, e a leitura pelo KYC de quem já validou o CPF.</p>
                  </div>
                </Secao>
              </div>
            )}

            <div className="grid lg:grid-cols-5 gap-5">
              {/* Mapa */}
              <div className="lg:col-span-3">
              <Secao icon={MapPin} titulo="Onde estão as pessoas" sub={`${totalLocalizados} localizadas pelo endereço ou pelo DDD · ${p.geografia?.sem_localizacao || 0} sem localização`} teste="investidor-mapa">
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <div className="mb-2 flex gap-2">
                      {[{ c: 'n', r: 'Toda a base' }, { c: 'periodo', r: rotuloPeriodo }].map((o) => (
                        <button key={o.c} type="button" onClick={() => setCampoMapa(o.c)} className={`rounded-lg px-3 py-1 text-xs font-bold ${campoMapa === o.c ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40' : 'border border-white/10 bg-white/5 text-gray-300'}`}>{o.r}</button>
                      ))}
                    </div>
                    <MapaBrasil porUf={geo} campo={campoMapa} selecionado={ufSelecionada} onSelecionar={(uf) => setUfSelecionada((atual) => (atual === uf ? null : uf))} />
                  </div>
                  <div className="space-y-2">
                    {ufDetalhe ? (
                      <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3" data-teste="mapa-estado-selecionado">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-200/80">{nomeDoEstado(ufDetalhe.uf)}</div>
                        <div className="text-2xl font-black text-white tabular-nums">{ufDetalhe.n} <span className="text-sm font-semibold text-gray-300">pessoas</span></div>
                        <div className="text-xs text-gray-300">{ufDetalhe.periodo} entraram em {rotuloPeriodo.toLowerCase()} · {pct(ufDetalhe.n, totalLocalizados)}% da base</div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">Toque num estado para ver os números dele.</p>
                    )}
                    <ol className="space-y-1.5">
                      {topUfs.map((u) => (
                        <li key={u.uf}>
                          <button type="button" onClick={() => setUfSelecionada(u.uf)} className="flex w-full items-center gap-2 text-left text-sm">
                            <span className="w-8 font-mono font-bold text-gray-300">{u.uf}</span>
                            <span className="h-2 flex-1 rounded-full bg-white/5"><span className="block h-2 rounded-full bg-gradient-to-r from-emerald-500 to-amber-300" style={{ width: `${Math.max(3, pct(u[campoMapa], topUfs[0]?.[campoMapa] || 1))}%` }} /></span>
                            <span className="w-12 text-right tabular-nums font-bold text-white">{u[campoMapa] || 0}</span>
                          </button>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </Secao>
              </div>

              {/* Cadastros por dia + últimos pagamentos */}
              <div className="lg:col-span-2 space-y-5">
                <Secao icon={Users} titulo="Cadastros por dia" sub="últimos 30 dias" teste="investidor-cadastros">
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={porDia} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradCadastros" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#34D399" stopOpacity={0.6} />
                            <stop offset="100%" stopColor="#34D399" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="dia" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} interval={6} />
                        <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<TooltipEscuro formatador={(v) => `${v} cadastros`} />} />
                        <Area type="monotone" dataKey="n" stroke="#34D399" strokeWidth={2} fill="url(#gradCadastros)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{p.pessoas?.ativos_24h || 0} pessoas entraram no site nas últimas 24 h · {p.pessoas?.ativos_7d || 0} em 7 dias.</p>
                </Secao>

                <Secao icon={Activity} titulo="Últimos pagamentos aprovados" teste="investidor-ultimos">
                  <ul className="divide-y divide-white/5">
                    {(p.ultimos || []).map((u, i) => (
                      <li key={`${u.quando}-${i}`} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                        <span className="flex items-center gap-2 text-gray-300"><span className="inline-block w-2 h-2 rounded-full" style={{ background: AREAS[u.area]?.cor || '#9CA3AF' }} />{u.nome || 'Cliente'} <span className="text-xs text-gray-500">· {AREAS[u.area]?.rotulo || u.area}</span></span>
                        <span className="tabular-nums font-bold text-white">{moeda(u.valor)} <span className="text-xs font-medium text-gray-500">{new Date(u.quando).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} {hora(u.quando)}</span></span>
                      </li>
                    ))}
                  </ul>
                </Secao>
              </div>
            </div>

            <p className="pb-6 text-center text-[11px] text-gray-600">Fonte: banco de produção, regra única <code>painel_investidor</code>. Depósitos conciliados com o gateway em 30/09/2026. Uso de saldo nunca soma com entrada.</p>
          </>
        )}
      </div>
    </div>
  );
}
