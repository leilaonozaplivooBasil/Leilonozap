import React, { useState, useEffect, useCallback } from 'react';
import logoNozap from '@/assets/leilao-nozap-logo.png';
import HeroDailyPrize from '@/components/concurso/HeroDailyPrize';
import CountdownTimer from '@/components/concurso/CountdownTimer';
import ShareSection from '@/components/concurso/ShareSection';
import OnboardingModal from '@/components/concurso/OnboardingModal';
import AdminInsights from '@/components/concurso/AdminInsights';
import ChancesCalculator from '@/components/concurso/ChancesCalculator';
import DailyMission from '@/components/concurso/DailyMission';
import WinnersFeed from '@/components/concurso/WinnersFeed';
import InstallPwaPrompt from '@/components/common/InstallPwaPrompt';
import {
  Trophy, Users, Gift, Radio, Link2, ChevronDown,
  Camera, Briefcase, Play, Eye, Gavel, Crown, Megaphone, Lock, Award,
  Maximize2, Minimize2, Save, Settings2, ArrowLeft,
  Copy, Check, MessageCircle, BarChart3, UserPlus, Share2,
} from 'lucide-react';

const API = '/api/concurso';
const GROUP_LINK = 'https://chat.whatsapp.com/FyKc2sXiB5fBG7ikYlmvri?s=cl&p=i&mlu=4';
// Página oficial da Leilão NoZap na Livoo Live — é onde a pessoa entra pra assistir a transmissão.
const LIVOO_VENDEDOR = 'https://livoolive.com.br/vendedor/leilaonozap';
const PERIODOS = [{ id: 'dia', l: 'Hoje' }, { id: 'semana', l: 'Semana' }, { id: 'mes', l: 'Mês' }, { id: 'geral', l: 'Geral' }];
// gradiente/identidade Livoo Live
const LIVOO_GRAD = 'linear-gradient(135deg,#E91E83,#ff6b35)';

function getVisitorId() {
  let v = localStorage.getItem('concurso_visitor');
  if (!v) { v = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('concurso_visitor', v); }
  return v;
}
const maskCpf = (v) => { const d = v.replace(/\D/g, '').slice(0, 11); return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'); };
const maskZap = (v) => { const d = v.replace(/\D/g, '').slice(0, 11); if (d.length <= 2) return d; if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`; return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`; };
const money = (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

function fileToSmallDataUrl(file, max = 256, q = 0.72) {
  return new Promise((resolve, reject) => {
    const rd = new FileReader();
    rd.onload = () => { const img = new Image(); img.onload = () => {
      const side = Math.min(img.width, img.height), sx = (img.width - side) / 2, sy = (img.height - side) / 2;
      const c = document.createElement('canvas'); c.width = max; c.height = max;
      c.getContext('2d').drawImage(img, sx, sy, side, side, 0, 0, max, max);
      resolve(c.toDataURL('image/jpeg', q));
    }; img.onerror = reject; img.src = rd.result; };
    rd.onerror = reject; rd.readAsDataURL(file);
  });
}
function Avatar({ url, nome, size = 32 }) {
  const s = { width: size, height: size };
  if (url) return <img src={url} alt={nome} style={s} className="rounded-full object-cover border border-white/20" />;
  return <div style={s} className="rounded-full flex items-center justify-center font-black text-white/90 border border-white/20 bg-green-800">{(nome || '?')[0].toUpperCase()}</div>;
}
// Badge de posição (dourado/prata/bronze pro pódio) — substitui os emojis de medalha.
function PosBadge({ pos, size = 26 }) {
  const bg = pos === 1 ? '#f5c451' : pos === 2 ? '#cbd5d8' : pos === 3 ? '#d0894c' : 'rgba(255,255,255,.1)';
  const fg = pos <= 3 ? '#1a1205' : '#eaf6ee';
  return (
    <span className="inline-grid place-items-center font-black rounded-full" style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.5 }}>
      {pos}
    </span>
  );
}

export default function ConcursoLeilaoNozap() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  const [periodo, setPeriodo] = useState('dia');
  const [data, setData] = useState({ ranking: [], premios: [], config: {}, group_link: GROUP_LINK, total: 0 });
  const [me, setMe] = useState(null);
  const [myCode, setMyCode] = useState(localStorage.getItem('concurso_code') || '');
  const [form, setForm] = useState({ nome: '', cpf: '', whatsapp: '', foto: null });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { return null; } })();
  const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'super_admin');
  const [cfg, setCfg] = useState({});
  const [premiosEdit, setPremiosEdit] = useState({});
  const [savingCfg, setSavingCfg] = useState(false);
  const [rankExpanded, setRankExpanded] = useState(false);
  const [adminExpanded, setAdminExpanded] = useState(false);
  const [adminTab, setAdminTab] = useState('insights');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loaded, setLoaded] = useState(false); // 1º fetch concluído → tira o skeleton
  const [linkCopied, setLinkCopied] = useState(false);

  // Trava o scroll do fundo enquanto o painel admin está em tela cheia + fecha no ESC.
  useEffect(() => {
    if (!adminExpanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') setAdminExpanded(false); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [adminExpanded]);

  // Convidado (?ref) — Etapa 9: com o rastreamento ativo (tabela concurso_indicados),
  // pede o WhatsApp antes do grupo (é o que liga clique → pessoa → entrada → conversão).
  // Sem rastreamento (ou API fora), cai no fluxo antigo: registra o clique e redireciona.
  const [refMode, setRefMode] = useState('checking'); // checking | form | redirect
  const [refZap, setRefZap] = useState('');
  const [refErr, setRefErr] = useState('');

  const joinAndGo = useCallback((phone) => {
    setRefMode('redirect');
    let done = false;
    const go = (link) => { if (done) return; done = true; window.location.replace(link || GROUP_LINK); };
    fetch(`${API}?action=join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref, visitor_id: getVisitorId(), phone: phone || undefined }) })
      .then((r) => r.json()).then((j) => go(j.group_link)).catch(() => go(GROUP_LINK));
    setTimeout(() => go(GROUP_LINK), 3000);
  }, [ref]);

  useEffect(() => {
    if (!ref) return;
    let alive = true;
    const legacy = () => { if (alive) joinAndGo(null); };
    const t = setTimeout(legacy, 2500); // API demorou → não perde o convidado
    fetch(`${API}?action=track_status`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => { if (!alive) return; clearTimeout(t); if (j?.enabled) setRefMode('form'); else legacy(); })
      .catch(() => { clearTimeout(t); legacy(); });
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitRefZap = () => {
    const d = refZap.replace(/\D/g, '');
    if (d.length < 10 || d.length > 11) { setRefErr('Coloque seu WhatsApp com DDD, ex: (21) 99999-9999.'); return; }
    setRefErr(''); joinAndGo(d);
  };

  const load = useCallback(async (per) => {
    try {
      const r = await fetch(`${API}?periodo=${per || periodo}`, { cache: 'no-store' });
      const j = await r.json();
      setData(j);
      setCfg(j.config || {});
      const pe = {}; (j.premios || []).forEach((p) => { pe[p.posicao] = p.premio || ''; }); setPremiosEdit(pe);
    } catch { /* */ } finally { setLoaded(true); }
  }, [periodo]);

  const loadMe = useCallback(async () => {
    if (!myCode) return;
    try { const r = await fetch(`${API}?action=me&code=${encodeURIComponent(myCode)}`, { cache: 'no-store' }); setMe(await r.json()); } catch { /* */ }
  }, [myCode]);

  useEffect(() => { if (!ref) { load(periodo); loadMe(); const t = setInterval(() => { load(periodo); loadMe(); }, 15000); return () => clearInterval(t); } }, [load, loadMe, periodo, ref]);

  const myLink = myCode ? `${window.location.origin}/rankpremiado?ref=${myCode}` : '';
  const copyMyLink = async () => {
    try { await navigator.clipboard.writeText(myLink); } catch { /* */ }
    setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2500);
  };
  const shareZapText = `🏆 Tem sorteio de prêmio TODO DIA no grupo do Leilão NoZap! Entra pelo meu link e concorre comigo:\n${myLink}`;
  const shareZap = () => window.open(`https://wa.me/?text=${encodeURIComponent(shareZapText)}`, '_blank');
  const config = data.config || {};
  const liveOn = !!config.live_ativa;
  const liveLink = config.live_url || LIVOO_VENDEDOR;

  const register = async () => {
    setErr(''); setSaving(true);
    try {
      const r = await fetch(`${API}?action=register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || 'Erro ao salvar.'); return; }
      localStorage.setItem('concurso_code', j.code); setMyCode(j.code);
      setShowOnboarding(true); // FEATURE 8 — regra de qualificação antes de divulgar
      // auto-login: se criou conta NÍVEL 1 na plataforma (cadastro novo), já entra logado
      if (j.app_user) { try { localStorage.setItem('currentUser', JSON.stringify(j.app_user)); sessionStorage.setItem('isLoggedIn', 'true'); } catch (_) {} }
      load(periodo); setTimeout(loadMe, 300);
    } catch { setErr('Erro de conexão. Tente de novo.'); } finally { setSaving(false); }
  };
  const handleFormPhoto = async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const url = await fileToSmallDataUrl(f); setForm((s) => ({ ...s, foto: url })); } catch { /* */ } };
  // Admin: anexar foto do produto do dispositivo (converte em data URL leve, sem depender de URL externa)
  const handleProdutoFoto = async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const url = await fileToSmallDataUrl(f, 400, 0.75); setCfg((s) => ({ ...s, produto_foto: url })); } catch { /* */ } };
  const trocarFoto = async (e) => { const f = e.target.files?.[0]; if (!f || !myCode) return; try { const url = await fileToSmallDataUrl(f); await fetch(`${API}?action=photo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: myCode, foto: url }) }); setMsg('Foto atualizada!'); setTimeout(() => setMsg(''), 3000); load(periodo); loadMe(); } catch { /* */ } };

  const saveConfig = async () => { setSavingCfg(true); try { await fetch(`${API}?action=save_config`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.id, config: cfg }) }); await load(periodo); setMsg('Config salva!'); setTimeout(() => setMsg(''), 3000); } catch { /* */ } finally { setSavingCfg(false); } };
  const savePremios = async () => { try { const premios = Object.entries(premiosEdit).map(([posicao, premio]) => ({ posicao: Number(posicao), premio })); await fetch(`${API}?action=prizes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.id, premios }) }); await load(periodo); setMsg('Prêmios do pódio salvos!'); setTimeout(() => setMsg(''), 3000); } catch { /* */ } };
  const realizarSorteio = async (per) => {
    if (!window.confirm(`Realizar sorteio do período "${per}"? Coroa quem trouxe mais gente.`)) return;
    try { const r = await fetch(`${API}?action=sorteio`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.id, periodo: per }) }); const j = await r.json(); setMsg(j.ok ? `Vencedor: ${j.vencedor.nome} (${j.vencedor.pontos})` : (j.error || 'Erro')); setTimeout(() => setMsg(''), 6000); } catch { /* */ }
  };

  const premioPeriodo = periodo === 'dia' ? config.premio_dia : periodo === 'semana' ? config.premio_semana : periodo === 'mes' ? config.premio_mes : null;

  // Tela do convidado: form do WhatsApp (rastreamento ativo) ou redirect direto
  if (ref) {
    return (
      <div style={{ minHeight: '100vh', background: 'radial-gradient(1200px 600px at 50% -10%, #0f3d2e 0%, #071b14 45%, #05100c 100%)' }} className="text-white flex items-center justify-center p-6 text-center">
        <div className="w-full max-w-sm">
          <img src={logoNozap} alt="Leilão NoZap" className="w-28 h-28 mx-auto object-contain drop-shadow-xl" />
          {refMode === 'form' ? (
            <>
              <p className="mt-4 text-xl font-black">Você foi convidado(a) pro <span style={{ background: 'linear-gradient(90deg,#f5c451,#22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Rank Premiado</span>!</p>
              <p className="text-green-300/80 text-sm mt-2">Sorteio de prêmio todo dia no grupo. Confirme seu WhatsApp pra entrar:</p>
              <input
                value={refZap}
                onChange={(e) => setRefZap(maskZap(e.target.value))}
                inputMode="numeric"
                autoFocus
                placeholder="(21) 99999-9999"
                className="mt-4 w-full bg-black/30 border border-white/20 rounded-xl px-4 py-3.5 text-center text-lg font-bold outline-none focus:border-yellow-400"
                onKeyDown={(e) => { if (e.key === 'Enter') submitRefZap(); }}
              />
              {refErr && <p className="text-red-300 text-xs mt-2">{refErr}</p>}
              <button onClick={submitRefZap} className="mt-3 w-full py-4 rounded-xl font-black text-lg text-[#052e16]" style={{ background: 'linear-gradient(90deg,#f5c451,#22c55e)' }}>
                ENTRAR NO GRUPO →
              </button>
              <p className="text-[11px] text-green-300/50 mt-3">Seu número serve só pra validar sua entrada no grupo — sem spam.</p>
            </>
          ) : (
            <>
              <p className="mt-4 text-xl font-black">{refMode === 'checking' ? 'Preparando seu convite...' : 'Entrando no grupo do WhatsApp...'}</p>
              <p className="text-green-300/70 text-sm mt-2">Se não abrir sozinho, <a href={GROUP_LINK} className="underline text-green-300 font-semibold">toque aqui</a>.</p>
            </>
          )}
        </div>
      </div>
    );
  }

  const CARD = { background: 'rgba(255,255,255,.045)', border: '1px solid rgba(245,196,81,.26)' };
  const rankingVisible = rankExpanded ? data.ranking.slice(0, 50) : data.ranking.slice(0, 5);
  // Prêmio por posição (pódio top 10) — agora visível pro público: cria desejo de subir
  const premioPos = {}; (data.premios || []).forEach((p) => { if (p.premio) premioPos[p.posicao] = p.premio; });
  // Pódio visual só quando existe top 3 completo; o restante segue em lista
  const podio = data.ranking.length >= 3 ? rankingVisible.slice(0, 3) : [];
  const listaAposPodio = podio.length === 3 ? rankingVisible.slice(3) : rankingVisible;

  // ------ blocos reaproveitados nas duas colunas ------
  const LiveBlock = (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(233,30,131,.45)', background: 'linear-gradient(135deg,rgba(233,30,131,.16),rgba(255,107,53,.08)), #160510' }}>
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg grid place-items-center text-white" style={{ background: LIVOO_GRAD, boxShadow: '0 4px 12px rgba(233,30,131,.5)' }}><Radio className="w-4 h-4" /></span>
          <b className="text-sm tracking-wide">Livoo <span style={{ color: '#E91E83' }}>Live</span></b>
        </div>
        {liveOn && (
          <span className="text-[11px] font-black text-white px-2.5 py-1 rounded-full inline-flex items-center gap-1.5" style={{ background: 'rgba(233,30,131,.9)' }}>
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> AO VIVO
          </span>
        )}
      </div>

      {liveOn ? (
        <>
          <div className="relative grid place-items-center" style={{ aspectRatio: '16/9', background: 'radial-gradient(60% 60% at 50% 40%, #3a0f28, #160510)' }}>
            <div className="absolute inset-0" style={{ background: 'radial-gradient(50% 50% at 50% 45%, rgba(233,30,131,.25), transparent 70%)' }} />
            <span className="relative w-16 h-16 rounded-full grid place-items-center text-white" style={{ background: LIVOO_GRAD, boxShadow: '0 10px 30px rgba(233,30,131,.55)' }}><Play className="w-7 h-7 ml-1" fill="currentColor" /></span>
            {config.live_audiencia > 0 && (
              <span className="absolute top-2.5 right-3 text-[11px] font-bold text-white px-2.5 py-1 rounded-full inline-flex items-center gap-1.5" style={{ background: 'rgba(0,0,0,.45)' }}><Eye className="w-3.5 h-3.5" /> {config.live_audiencia} assistindo</span>
            )}
            {config.live_produto && (
              <div className="absolute bottom-3 left-3.5 right-3.5">
                <span className="inline-flex items-center gap-2 text-white text-xs font-bold px-3 py-1.5 rounded-xl" style={{ background: 'rgba(0,0,0,.5)', border: '1px solid rgba(255,255,255,.15)' }}><Gavel className="w-4 h-4" style={{ color: '#ff6b35' }} /> {config.live_produto}</span>
              </div>
            )}
          </div>
          <a href={liveLink} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 py-3.5 font-black text-white" style={{ background: LIVOO_GRAD }}>
            <Radio className="w-5 h-5" /> Assistir ao vivo na Livoo
          </a>
        </>
      ) : (
        <div className="flex items-center gap-3 p-4">
          <span className="w-11 h-11 rounded-xl grid place-items-center" style={{ background: 'rgba(233,30,131,.14)', color: '#E91E83' }}><Radio className="w-5 h-5" /></span>
          <div className="min-w-0">
            <p className="font-bold text-sm">Nenhuma live agora</p>
            <p className="text-[12px] text-pink-100/70">{config.live_horario ? <>Próxima live: <b className="text-pink-200">{config.live_horario}</b></> : 'Quando começar, o botão de assistir aparece aqui.'}</p>
          </div>
        </div>
      )}
    </div>
  );

  // Com o hero do prêmio ativo (Feature 7), este bloco vira só o mural de propaganda —
  // o produto já aparece em destaque no topo da página.
  const heroAtivo = !!config.produto_nome;
  const DestaqueBlock = ((!heroAtivo && config.produto_nome) || config.propaganda) ? (
    <div className="rounded-2xl p-4" style={CARD}>
      <p className="text-[11px] font-bold uppercase tracking-wide text-green-300/60 mb-3 flex items-center gap-2"><Gift className="w-3.5 h-3.5" /> Destaque / Sorteio do dia</p>
      {!heroAtivo && config.produto_nome && (
        <div className="flex items-center gap-3">
          {config.produto_foto ? <img src={config.produto_foto} alt="" className="w-16 h-16 rounded-xl object-cover border border-white/10" /> : <span className="w-16 h-16 rounded-xl grid place-items-center bg-green-900/60 border border-yellow-400/20"><Gift className="w-7 h-7 text-yellow-300" /></span>}
          <div>
            <p className="font-black">{config.produto_nome}</p>
            {config.produto_valor > 0 && <p className="text-xs text-yellow-300">{money(config.produto_valor)}</p>}
          </div>
        </div>
      )}
      {config.propaganda && <p className="text-xs text-green-100/90 mt-3 whitespace-pre-wrap flex gap-2"><Megaphone className="w-4 h-4 text-yellow-300 shrink-0 mt-0.5" /> {config.propaganda}</p>}
    </div>
  ) : null;

  const MinePanel = (
    <div id="meu-painel" className="rounded-2xl p-5" style={CARD}>
      <div className="flex items-center gap-3">
        <label className="cursor-pointer relative">
          <Avatar url={me?.foto_url} nome={me?.nome} size={56} />
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-black/80 grid place-items-center"><Camera className="w-3 h-3 text-white" /></span>
          <input type="file" accept="image/*" className="hidden" onChange={trocarFoto} />
        </label>
        <div>
          <p className="font-black">{me?.nome || 'Seu painel'}</p>
          <p className="text-xs text-green-300/70">Seu link de divulgação</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3">
        {[['dia', 'Hoje'], ['semana', 'Semana'], ['mes', 'Mês']].map(([k, l]) => (
          <div key={k} className="bg-black/30 rounded-lg p-2 text-center border border-white/10">
            <p className="text-[10px] text-green-300/70 uppercase">{l}</p>
            <div className="my-1 h-6 flex items-center justify-center">{me?.periodos?.[k]?.posicao ? <PosBadge pos={me.periodos[k].posicao} size={24} /> : <span className="text-white/40">—</span>}</div>
            <p className="text-[10px] text-yellow-300 flex items-center justify-center gap-1"><Users className="w-3 h-3" />{me?.periodos?.[k]?.pontos || 0}</p>
          </div>
        ))}
      </div>
      {/* Link de divulgação: a AÇÃO nº 1 da página — um toque copia, sem selecionar texto */}
      <button
        onClick={copyMyLink}
        className="mt-3 w-full rounded-xl px-3 py-2.5 text-xs text-left border transition-colors flex items-center gap-2"
        style={linkCopied
          ? { background: 'rgba(34,197,94,.15)', borderColor: 'rgba(34,197,94,.55)' }
          : { background: 'rgba(0,0,0,.3)', borderColor: 'rgba(255,255,255,.12)' }}
        title="Tocar para copiar"
      >
        <Link2 className="w-4 h-4 text-yellow-300 shrink-0" />
        <span className="flex-1 min-w-0 truncate text-green-100">{myLink.replace(/^https?:\/\//, '')}</span>
        <span className={`shrink-0 inline-flex items-center gap-1 font-black text-[11px] uppercase ${linkCopied ? 'text-emerald-300' : 'text-yellow-300'}`}>
          {linkCopied ? <><Check className="w-3.5 h-3.5" /> Copiado!</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
        </span>
      </button>
      <button onClick={shareZap} className="mt-2.5 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[#052e16] transition-transform active:scale-[.98]" style={{ background: '#25D366' }}>
        <MessageCircle className="w-5 h-5" /> Divulgar no WhatsApp
      </button>
      <a href="/Licensing" className="mt-2.5 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-white" style={{ background: 'linear-gradient(90deg,#8b5cf6,#22c55e)' }}>
        <Briefcase className="w-5 h-5" /> Quero ser Influência Leilão NoZap
      </a>
    </div>
  );

  const FormPanel = (
    <div id="cadastro-form" className="rounded-2xl p-5" style={CARD}>
      <p className="font-black text-lg mb-1 flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-300" /> Participe agora</p>
      <p className="text-xs text-green-300/80 mb-4">Preencha pra gerar seu link. O CPF é só pra validar o prêmio, não aparece pra ninguém.</p>
      <label className="flex flex-col items-center gap-2 cursor-pointer mb-4">
        {form.foto ? <img src={form.foto} alt="sua foto" className="w-24 h-24 rounded-full object-cover border-2 border-yellow-400" /> : <div className="w-24 h-24 rounded-full bg-black/40 border-2 border-dashed border-white/25 flex items-center justify-center"><Camera className="w-8 h-8 text-white/60" /></div>}
        <span className="text-xs text-green-300/90 font-semibold">{form.foto ? 'Trocar foto' : 'Adicionar sua foto (deixa o ranking mais legal!)'}</span>
        <input type="file" accept="image/*" className="hidden" onChange={handleFormPhoto} />
      </label>
      <div className="space-y-3">
        <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" className="w-full bg-black/30 border border-white/15 rounded-lg px-4 py-3 outline-none focus:border-yellow-400" />
        <input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: maskCpf(e.target.value) })} inputMode="numeric" placeholder="CPF" className="w-full bg-black/30 border border-white/15 rounded-lg px-4 py-3 outline-none focus:border-yellow-400" />
        <input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: maskZap(e.target.value) })} inputMode="numeric" placeholder="WhatsApp (com DDD)" className="w-full bg-black/30 border border-white/15 rounded-lg px-4 py-3 outline-none focus:border-yellow-400" />
      </div>
      {err && <p className="text-red-300 text-sm mt-2">{err}</p>}
      <button onClick={register} disabled={saving} className="mt-4 w-full py-4 rounded-xl font-black text-lg text-[#052e16] disabled:opacity-60" style={{ background: 'linear-gradient(90deg,#f5c451,#22c55e)' }}>{saving ? 'Gerando seu link...' : 'GERAR MEU LINK'}</button>
    </div>
  );

  const RankingBlock = (
    <div className="rounded-2xl p-4" style={CARD}>
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="font-black text-lg flex items-center gap-2 shrink-0"><Crown className="w-5 h-5 text-yellow-300" /> Ranking</h2>
          {data.ranking.length > 5 && (
            <button
              onClick={() => setRankExpanded((v) => !v)}
              className="text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1 transition-colors"
              style={{ border: '1px solid rgba(245,196,81,.5)', background: 'rgba(245,196,81,.08)', color: '#f5c451' }}
            >
              {rankExpanded ? 'Ver menos' : 'Ver completo'}
              <ChevronDown className="w-3.5 h-3.5" style={{ transform: rankExpanded ? 'rotate(180deg)' : 'none', transition: '.2s' }} />
            </button>
          )}
        </div>
        <span className="text-xs text-green-300/70 shrink-0">{data.total || 0} participando</span>
      </div>
      <div className="flex gap-2 mb-3">
        {PERIODOS.map((p) => (
          <button key={p.id} onClick={() => setPeriodo(p.id)} className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-bold ${periodo === p.id ? 'text-[#052e16]' : 'bg-white/5 text-green-200 border border-white/10'}`} style={periodo === p.id ? { background: 'linear-gradient(90deg,#f5c451,#22c55e)' } : {}}>{p.l}</button>
        ))}
      </div>
      {premioPeriodo ? <div className="text-center text-xs text-yellow-300 mb-3 flex items-center justify-center gap-1.5"><Gift className="w-3.5 h-3.5" /> Prêmio {PERIODOS.find((p) => p.id === periodo)?.l}: <b>{premioPeriodo}</b></div> : null}
      {!loaded ? (
        <div className="space-y-2" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5 border border-white/5 animate-pulse" style={{ background: 'rgba(255,255,255,.04)' }}>
              <span className="w-[26px] h-[26px] rounded-full bg-white/10 shrink-0" />
              <span className="w-[38px] h-[38px] rounded-full bg-white/10 shrink-0" />
              <span className="h-3 rounded bg-white/10" style={{ width: `${60 - i * 7}%` }} />
            </div>
          ))}
        </div>
      ) : data.ranking.length === 0 ? (
        <p className="text-center text-green-300/60 py-8">Ninguém pontuou nesse período ainda. Seja o primeiro!</p>
      ) : (
        <>
          {/* PÓDIO — top 3 em destaque (2º · 1º · 3º), com o prêmio da posição quando cadastrado */}
          {podio.length === 3 && (
            <div className="grid grid-cols-3 gap-2 items-end mb-3">
              {[podio[1], podio[0], podio[2]].map((x) => {
                const first = x.posicao === 1;
                const isMe = x.code === myCode;
                return (
                  <div
                    key={x.code}
                    className="rounded-2xl px-2 pb-3 text-center border flex flex-col items-center"
                    style={{
                      paddingTop: first ? 14 : 10,
                      borderColor: isMe ? '#f5c451' : first ? 'rgba(245,196,81,.55)' : 'rgba(255,255,255,.14)',
                      background: first
                        ? 'linear-gradient(180deg,rgba(245,196,81,.2),rgba(34,197,94,.07))'
                        : 'linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.03))',
                    }}
                  >
                    {first && <Crown className="w-5 h-5 text-yellow-300 mb-1" />}
                    <Avatar url={x.foto_url} nome={x.nome} size={first ? 62 : 46} />
                    <div className="-mt-2.5"><PosBadge pos={x.posicao} size={first ? 26 : 22} /></div>
                    <p className="font-black text-xs mt-1.5 leading-tight w-full truncate px-1">{x.nome}{isMe && <span className="text-yellow-300"> (você)</span>}</p>
                    {premioPos[x.posicao] && (
                      <p className="text-[10px] text-yellow-300/90 mt-1 w-full truncate px-1 flex items-center justify-center gap-1"><Gift className="w-3 h-3 shrink-0" />{premioPos[x.posicao]}</p>
                    )}
                    {isAdmin && <p className="text-[10px] font-black text-yellow-300 mt-1 inline-flex items-center gap-1"><Users className="w-3 h-3 opacity-80" />{x.pontos}</p>}
                  </div>
                );
              })}
            </div>
          )}
          <div className="space-y-2">
            {listaAposPodio.map((x) => {
              const isMe = x.code === myCode;
              return (
                <div key={x.code} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border ${isMe ? 'border-yellow-400' : 'border-white/10'}`} style={{ background: x.posicao <= 3 ? 'linear-gradient(90deg,rgba(245,196,81,.15),rgba(34,197,94,.06))' : 'rgba(255,255,255,.04)' }}>
                  <PosBadge pos={x.posicao} />
                  <Avatar url={x.foto_url} nome={x.nome} size={38} />
                  <span className="font-bold flex-1 min-w-0 truncate">{x.nome}{isMe && <span className="text-yellow-300 text-xs ml-2">(você)</span>}</span>
                  {premioPos[x.posicao] && <span className="text-[10px] text-yellow-300/80 shrink-0 max-w-[38%] truncate inline-flex items-center gap-1"><Gift className="w-3 h-3 shrink-0" />{premioPos[x.posicao]}</span>}
                  {/* Pontuação só pro admin (parâmetros de conversão). Público vê o ranking, não os números. */}
                  {isAdmin && <span className="font-black text-yellow-300 inline-flex items-center gap-1"><Users className="w-3.5 h-3.5 opacity-80" />{x.pontos}</span>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  // ---- estilos compartilhados do painel admin (consistência visual) ----
  const inp = 'w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-purple-400/70 focus:bg-black/40 placeholder:text-white/35';
  const SecHead = ({ icon: Ic, children, tint = 'text-purple-200', dot = 'rgba(139,92,246,.9)' }) => (
    <p className={`text-xs font-bold uppercase tracking-wide flex items-center gap-2 mb-3 ${tint}`}>
      <span className="w-6 h-6 rounded-lg grid place-items-center shrink-0" style={{ background: `${dot.replace('.9)', '.16)')}`, color: dot }}><Ic className="w-3.5 h-3.5" /></span>
      {children}
    </p>
  );

  // ---- painel admin em ABAS: cada assunto numa tela só, funciona igual no desktop e no mobile ----
  const ADMIN_TABS = [
    { id: 'insights', l: 'Indicações', icon: BarChart3 },
    { id: 'destaque', l: 'Sorteio do dia', icon: Gift },
    { id: 'live', l: 'Live', icon: Radio },
    { id: 'premios', l: 'Prêmios', icon: Award },
    { id: 'acoes', l: 'Realizar sorteio', icon: Gavel },
  ];
  // Abas que mexem na config compartilhada → mostram a barra fixa de salvar
  const adminTabSalva = ['destaque', 'live', 'premios'].includes(adminTab);

  const AdmDestaque = (
        <div className="rounded-2xl p-4 bg-black/25 border border-white/10">
          <SecHead icon={Gift}>Destaque / Sorteio do dia</SecHead>
          <div className="space-y-2.5">
            <input value={cfg.produto_nome || ''} onChange={(e) => setCfg({ ...cfg, produto_nome: e.target.value })} placeholder="Nome do produto do sorteio" className={inp} />
            {/* Foto do produto: anexar do dispositivo OU colar uma URL */}
            <div className="rounded-lg border border-white/10 bg-black/25 p-2.5 space-y-2">
              <div className="flex items-center gap-2.5">
                {cfg.produto_foto ? (
                  <div className="relative shrink-0">
                    <img src={cfg.produto_foto} alt="Prévia do produto" className="w-14 h-14 rounded-lg object-cover border border-white/15" />
                    <button type="button" onClick={() => setCfg({ ...cfg, produto_foto: '' })} title="Remover foto" className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full grid place-items-center bg-black/80 border border-white/20 text-white/90 text-xs leading-none hover:bg-red-600">×</button>
                  </div>
                ) : (
                  <span className="w-14 h-14 rounded-lg grid place-items-center bg-black/40 border border-dashed border-white/20 shrink-0"><Gift className="w-6 h-6 text-white/40" /></span>
                )}
                <label className="flex-1 cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={handleProdutoFoto} />
                  <span className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold text-purple-100 border border-purple-400/40 bg-purple-500/15 hover:bg-purple-500/25 transition-colors"><Camera className="w-4 h-4" /> {cfg.produto_foto ? 'Trocar foto' : 'Anexar foto do dispositivo'}</span>
                </label>
              </div>
              <input value={(cfg.produto_foto || '').startsWith('data:') ? '' : (cfg.produto_foto || '')} onChange={(e) => setCfg({ ...cfg, produto_foto: e.target.value })} placeholder={(cfg.produto_foto || '').startsWith('data:') ? 'Foto anexada ✓ — ou cole uma URL aqui' : 'ou cole a URL da foto do produto'} className={inp} />
            </div>
            <input value={cfg.produto_valor || ''} onChange={(e) => setCfg({ ...cfg, produto_valor: Number(e.target.value) || 0 })} inputMode="numeric" placeholder="Valor (R$)" className={inp} />
            <textarea value={cfg.propaganda || ''} onChange={(e) => setCfg({ ...cfg, propaganda: e.target.value })} placeholder="Texto de propaganda / destaque do dia" rows={3} className={`${inp} resize-none`} />
          </div>
        </div>
  );

  const AdmLive = (
        <div className="rounded-2xl p-4 border" style={{ background: 'rgba(233,30,131,.06)', borderColor: 'rgba(233,30,131,.3)' }}>
          <SecHead icon={Radio} tint="" dot="rgba(233,30,131,.9)"><span style={{ color: '#f5a3cf' }}>Live (Livoo)</span></SecHead>
          <div className="space-y-2.5">
            <label className="flex items-center gap-2 text-sm rounded-lg px-3 py-2.5 bg-black/25 border border-white/10 cursor-pointer hover:border-pink-400/40 transition-colors"><input type="checkbox" checked={!!cfg.live_ativa} onChange={(e) => setCfg({ ...cfg, live_ativa: e.target.checked })} className="w-5 h-5 accent-pink-500" /> <b>Live AO VIVO agora</b></label>
            <input value={cfg.live_url || ''} onChange={(e) => setCfg({ ...cfg, live_url: e.target.value })} placeholder="Link da live (padrão: vendedor/leilaonozap)" className={inp} />
            <input value={cfg.live_horario || ''} onChange={(e) => setCfg({ ...cfg, live_horario: e.target.value })} placeholder="Horário da próxima live (ex: hoje 20h)" className={inp} />
            <input value={cfg.live_produto || ''} onChange={(e) => setCfg({ ...cfg, live_produto: e.target.value })} placeholder="Produto que será leiloado na live" className={inp} />
            <input value={cfg.live_audiencia || ''} onChange={(e) => setCfg({ ...cfg, live_audiencia: Number(e.target.value) || 0 })} inputMode="numeric" placeholder="Assistindo agora" className={inp} />
          </div>
        </div>
  );

  const AdmPremios = (
    <div className="space-y-3">
        <div className="rounded-2xl p-4 bg-black/25 border border-white/10">
          <SecHead icon={Award}>Prêmios dos sorteios</SecHead>
          <div className="space-y-2.5">
            <input value={cfg.premio_dia || ''} onChange={(e) => setCfg({ ...cfg, premio_dia: e.target.value })} placeholder="Prêmio do sorteio DIÁRIO" className={inp} />
            <input value={cfg.premio_semana || ''} onChange={(e) => setCfg({ ...cfg, premio_semana: e.target.value })} placeholder="Prêmio do sorteio SEMANAL" className={inp} />
            <input value={cfg.premio_mes || ''} onChange={(e) => setCfg({ ...cfg, premio_mes: e.target.value })} placeholder="Prêmio do sorteio MENSAL" className={inp} />
          </div>
        </div>

        <div className="rounded-2xl p-4 bg-black/25 border border-white/10">
          <SecHead icon={Crown}>Prêmios do pódio (top 10)</SecHead>
          <p className="text-[11px] text-purple-200/60 -mt-1 mb-3">Estes aparecem no ranking público, ao lado de cada posição.</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((pos) => (
              <div key={pos} className="flex items-center gap-2">
                <PosBadge pos={pos} size={22} />
                <input value={premiosEdit[pos] ?? ''} onChange={(e) => setPremiosEdit({ ...premiosEdit, [pos]: e.target.value })} placeholder={`Prêmio do ${pos}º`} className={`flex-1 min-w-0 ${inp}`} />
              </div>
            ))}
          </div>
          <button onClick={savePremios} className="mt-3 w-full py-3 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-700 text-sm flex items-center justify-center gap-2 transition-colors"><Save className="w-4 h-4" /> Salvar prêmios do pódio</button>
        </div>
    </div>
  );

  const AdmAcoes = (
        <div className="rounded-2xl p-4 bg-black/25 border border-white/10">
          <SecHead icon={Gavel}>Realizar sorteio (coroa o 1º do período)</SecHead>
          <div className="grid grid-cols-3 gap-2">
            {[['dia', 'Dia'], ['semana', 'Semana'], ['mes', 'Mês']].map(([id, l]) => (
              <button key={id} onClick={() => realizarSorteio(id)} className="py-3 rounded-xl font-bold text-sm text-[#1a1205] shadow-md transition-transform active:scale-[.97]" style={{ background: 'linear-gradient(90deg,#f5c451,#e0a920)' }}>{l}</button>
            ))}
          </div>
          <p className="text-[11px] text-purple-200/60 mt-3">Escolha o período para coroar quem trouxe mais gente. Registra o vencedor no histórico.</p>
        </div>
  );

  // Conteúdo da aba ativa. Insights ocupa a largura toda (tabela); os formulários
  // ficam numa coluna confortável centralizada no desktop e 100% no mobile.
  const AdminTabContent = adminTab === 'insights' ? (
    <AdminInsights userId={currentUser?.id} />
  ) : (
    <div className="w-full max-w-2xl mx-auto">
      {adminTab === 'destaque' && AdmDestaque}
      {adminTab === 'live' && AdmLive}
      {adminTab === 'premios' && AdmPremios}
      {adminTab === 'acoes' && AdmAcoes}
    </div>
  );

  // Cabeçalho do painel admin (chip + badge + botão expandir/recolher)
  const AdminHeader = (full) => (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-xl grid place-items-center text-white shadow-lg shadow-purple-900/40" style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' }}><Settings2 className="w-5 h-5" /></span>
        <div className="leading-tight">
          <p className="font-black text-lg flex items-center gap-2">Painel Admin do Rank Premiado</p>
          <span className="text-[11px] font-bold inline-flex items-center gap-1.5 text-purple-200/90"><Lock className="w-3 h-3" /> Só você vê isto</span>
        </div>
      </div>
      <button
        onClick={() => setAdminExpanded(!full)}
        className="text-xs font-bold px-3.5 py-2 rounded-xl inline-flex items-center gap-2 text-purple-100 transition-colors"
        style={{ background: 'rgba(139,92,246,.2)', border: '1px solid rgba(139,92,246,.5)' }}
      >
        {full ? <><Minimize2 className="w-4 h-4" /> Recolher</> : <><Maximize2 className="w-4 h-4" /> Expandir na tela</>}
      </button>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(1200px 600px at 50% -10%, #0f3d2e 0%, #071b14 45%, #05100c 100%)' }} className="text-white w-full overflow-x-hidden">
      <div className="max-w-5xl w-full mx-auto px-4 py-6 pb-24">

        {/* VOLTAR PARA A HOME — a página é destino direto de link compartilhado no
            WhatsApp, então muita gente chega aqui sem ter navegação para sair */}
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-green-200/85 hover:text-white transition-colors mb-4 -ml-1 px-2.5 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para a Home
        </a>

        {/* HEADER + STATUS */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-14 h-14 rounded-2xl grid place-items-center" style={{ background: 'conic-gradient(from 200deg,#0e4d38,#0a2c22)', border: '1px solid rgba(245,196,81,.35)' }}><Trophy className="w-7 h-7 text-yellow-300" /></span>
            <div>
              <h1 className="font-black leading-none" style={{ fontSize: 'clamp(1.5rem,6vw,2rem)', background: 'linear-gradient(90deg,#f5c451,#22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>RANK PREMIADO</h1>
              <p className="text-green-200/85 mt-1 font-semibold text-sm">Encha o grupo e ganhe prêmio todo dia</p>
            </div>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2">
            <div className="flex flex-wrap gap-2">
              {liveOn && <span className="text-xs font-black px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 text-white" style={{ background: LIVOO_GRAD }}><span className="w-2 h-2 rounded-full bg-white animate-pulse" /> AO VIVO AGORA</span>}
              <span className="text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 bg-white/5 border border-white/10 text-green-100"><Users className="w-3.5 h-3.5" /> {data.total || 0} participando</span>
              {premioPeriodo && <span className="text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 text-yellow-300" style={{ background: 'rgba(245,196,81,.12)', border: '1px solid rgba(245,196,81,.4)' }}><Gift className="w-3.5 h-3.5" /> {premioPeriodo}</span>}
            </div>
            {/* Atalho do painel admin — abre direto em tela cheia (só admin vê) */}
            {isAdmin && (
              <button onClick={() => setAdminExpanded(true)} className="text-xs font-bold px-3.5 py-2 rounded-full inline-flex items-center gap-2 text-purple-100 shadow-lg shadow-purple-900/30 transition-transform active:scale-[.97]" style={{ background: 'linear-gradient(90deg,#8b5cf6,#7c3aed)', border: '1px solid rgba(139,92,246,.6)' }}>
                <Settings2 className="w-4 h-4" /> Painel Admin <Maximize2 className="w-3.5 h-3.5 opacity-80" />
              </button>
            )}
          </div>
        </header>

        {msg && <div className="mt-4 text-center text-sm bg-white/10 rounded-lg py-2 px-3">{msg}</div>}

        {/* FEATURE 7 — prêmio do dia em destaque ANTES do cadastro */}
        <HeroDailyPrize config={config} registered={!!myCode} total={data.total || 0} />

        {/* FEATURE 1 — contador regressivo do sorteio (FOMO) */}
        <CountdownTimer config={config} />

        {/* COMO FUNCIONA — 3 passos pra quem chega pelo link e ainda não participa */}
        {!myCode && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              [UserPlus, '1. Gere seu link', 'Cadastro grátis em 30s'],
              [Share2, '2. Compartilhe', 'Mande pros seus contatos'],
              [Trophy, '3. Concorra', 'Prêmio todo dia às 20h'],
            ].map(([Ic, t, d], i) => (
              <div key={i} className="rounded-2xl px-2.5 py-3 text-center" style={CARD}>
                <span className="inline-grid place-items-center w-9 h-9 rounded-xl mb-1.5" style={{ background: 'rgba(245,196,81,.12)', border: '1px solid rgba(245,196,81,.35)' }}>
                  <Ic className="w-4.5 h-4.5 text-yellow-300" style={{ width: 18, height: 18 }} />
                </span>
                <p className="font-black text-xs leading-tight">{t}</p>
                <p className="text-[10px] text-green-300/70 mt-0.5 leading-tight">{d}</p>
              </div>
            ))}
          </div>
        )}

        {/* DASHBOARD GRID — ranking é o conteúdo principal (esquerda no desktop);
            no celular o cadastro/painel pessoal vem primeiro pra não enterrar a conversão */}
        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-4 mt-6 items-start">
          <div className="flex flex-col gap-4 order-2 lg:order-1 min-w-0">
            {(liveOn || config.live_horario) && LiveBlock}
            {RankingBlock}
            {/* FEATURE 5 — prova social com os sorteios reais */}
            <WinnersFeed />
            {DestaqueBlock}
          </div>
          <div className="flex flex-col gap-4 order-1 lg:order-2 min-w-0">
            {myCode ? MinePanel : FormPanel}
            {/* FEATURE 4 — chances em tempo real (posição do dia) */}
            {myCode && (
              <ChancesCalculator
                posicao={me?.periodos?.dia?.posicao}
                pontos={me?.periodos?.dia?.pontos}
                total={data.total || 0}
                liderPontos={periodo === 'dia' ? (data.ranking?.[0]?.pontos || 0) : 0}
              />
            )}
            {/* FEATURE 3 — missão do dia (progresso = pontos de hoje) */}
            {myCode && <DailyMission progresso={me?.periodos?.dia?.pontos || 0} />}
            {/* FEATURE 2 — story 1080x1080 personalizado + compartilhamento */}
            {myCode && (
              <ShareSection
                nome={me?.nome}
                posicao={me?.periodos?.dia?.posicao || me?.periodos?.geral?.posicao}
                premio={config.produto_nome || config.premio_dia}
                link={myLink}
              />
            )}
          </div>
        </div>

        {/* FEATURE 8 — modal de qualificação logo após gerar o link */}
        {showOnboarding && myCode && <OnboardingModal link={myLink} onClose={() => setShowOnboarding(false)} />}

        {/* ADMIN — modo tela cheia (overlay em abas), aberto pelo botão do topo.
            Mobile: ocupa a tela inteira; desktop: card centralizado. */}
        {isAdmin && adminExpanded && (
          <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(3,10,7,.72)', backdropFilter: 'blur(6px)' }} onClick={() => setAdminExpanded(false)}>
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-6xl mx-auto sm:my-6 flex flex-col rounded-none sm:rounded-2xl overflow-hidden shadow-2xl h-[100dvh] sm:h-auto sm:max-h-[calc(100dvh-48px)]"
              style={{ background: 'linear-gradient(180deg,#1a1030,#120a24)', border: '1px solid rgba(139,92,246,.5)' }}
            >
              <div className="shrink-0 px-4 sm:px-6 pt-3.5 pb-0 border-b" style={{ background: 'rgba(26,16,48,.95)', borderColor: 'rgba(139,92,246,.3)' }}>
                {AdminHeader(true)}
                {/* Barra de abas — rolável no mobile, tudo visível no desktop */}
                <div className="flex gap-1.5 mt-3 -mx-1 px-1 overflow-x-auto pb-2.5" style={{ scrollbarWidth: 'none' }}>
                  {ADMIN_TABS.map((t) => {
                    const on = adminTab === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setAdminTab(t.id)}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors"
                        style={on
                          ? { background: 'linear-gradient(90deg,#8b5cf6,#7c3aed)', color: '#fff', border: '1px solid rgba(139,92,246,.8)' }
                          : { background: 'rgba(255,255,255,.05)', color: 'rgba(221,214,254,.75)', border: '1px solid rgba(255,255,255,.1)' }}
                      >
                        <t.icon className="w-3.5 h-3.5" /> {t.l}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">{AdminTabContent}</div>

              {/* Rodapé fixo: salvar sempre à mão nas abas de configuração (crítico no mobile) */}
              {adminTabSalva && (
                <div className="shrink-0 px-4 sm:px-6 py-3 border-t" style={{ background: 'rgba(26,16,48,.97)', borderColor: 'rgba(139,92,246,.3)', paddingBottom: 'calc(.75rem + env(safe-area-inset-bottom, 0px))' }}>
                  {msg && <p className="text-center text-xs text-emerald-300 font-bold mb-2">{msg}</p>}
                  <button onClick={saveConfig} disabled={savingCfg} className="w-full py-3.5 rounded-xl font-black text-white shadow-lg shadow-purple-900/30 disabled:opacity-60 flex items-center justify-center gap-2 transition-transform active:scale-[.99]" style={{ background: 'linear-gradient(90deg,#8b5cf6,#7c3aed)' }}>
                    <Save className="w-4 h-4" /> {savingCfg ? 'Salvando...' : <>Salvar configuração <span className="text-purple-200/90 text-xs font-medium">(destaque + live + prêmios)</span></>}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <p className="text-center text-[11px] text-green-300/40 mt-10 flex items-center justify-center gap-1.5"><Users className="w-3 h-3" /> A contagem é por pessoas que entram no grupo pelo seu link.</p>
      </div>

      {/* CTA FIXO MOBILE — a página é longa; a ação principal (divulgar) fica sempre à mão.
          Só pra quem já tem link, e some quando o painel admin/onboarding está aberto. */}
      {myCode && !adminExpanded && !showOnboarding && (
        <div className="lg:hidden fixed inset-x-3 z-40" style={{ bottom: 'calc(.75rem + env(safe-area-inset-bottom, 0px))' }}>
          <div className="flex gap-2 p-2 rounded-2xl shadow-2xl shadow-black/60" style={{ background: 'rgba(4,16,11,.92)', border: '1px solid rgba(245,196,81,.35)', backdropFilter: 'blur(10px)' }}>
            <button onClick={shareZap} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm text-[#052e16] active:scale-[.98] transition-transform" style={{ background: '#25D366' }}>
              <MessageCircle className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} /> Divulgar no WhatsApp
            </button>
            <button
              onClick={copyMyLink}
              aria-label="Copiar meu link"
              className="shrink-0 w-12 grid place-items-center rounded-xl font-bold border transition-colors"
              style={linkCopied ? { background: 'rgba(34,197,94,.3)', borderColor: 'rgba(34,197,94,.6)', color: '#86efac' } : { background: 'rgba(255,255,255,.08)', borderColor: 'rgba(255,255,255,.18)', color: '#fff' }}
            >
              {linkCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </div>
      )}

      {/* FEATURE 6 — convite de instalação do PWA (Android nativo / dica iOS) */}
      <InstallPwaPrompt />
    </div>
  );
}
