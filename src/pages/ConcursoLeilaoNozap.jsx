import React, { useState, useEffect, useCallback } from 'react';
import logoNozap from '@/assets/leilao-nozap-logo.png';
import {
  Trophy, Users, Gift, Radio, Link2, Copy, MessageCircle, ChevronDown,
  Camera, Briefcase, Play, Eye, Gavel, Crown, Megaphone, Lock, Award,
  Maximize2, Minimize2, Save, Settings2,
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

  // Trava o scroll do fundo enquanto o painel admin está em tela cheia + fecha no ESC.
  useEffect(() => {
    if (!adminExpanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') setAdminExpanded(false); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [adminExpanded]);

  // Convidado (?ref): manda DIRETO pro grupo (registra o clique, sem página/cadastro)
  useEffect(() => {
    if (!ref) return;
    let done = false;
    const go = (link) => { if (done) return; done = true; window.location.replace(link || GROUP_LINK); };
    fetch(`${API}?action=join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref, visitor_id: getVisitorId() }) })
      .then((r) => r.json()).then((j) => go(j.group_link)).catch(() => go(GROUP_LINK));
    const t = setTimeout(() => go(GROUP_LINK), 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async (per) => {
    try {
      const r = await fetch(`${API}?periodo=${per || periodo}`, { cache: 'no-store' });
      const j = await r.json();
      setData(j);
      setCfg(j.config || {});
      const pe = {}; (j.premios || []).forEach((p) => { pe[p.posicao] = p.premio || ''; }); setPremiosEdit(pe);
    } catch { /* */ }
  }, [periodo]);

  const loadMe = useCallback(async () => {
    if (!myCode) return;
    try { const r = await fetch(`${API}?action=me&code=${encodeURIComponent(myCode)}`, { cache: 'no-store' }); setMe(await r.json()); } catch { /* */ }
  }, [myCode]);

  useEffect(() => { if (!ref) { load(periodo); loadMe(); const t = setInterval(() => { load(periodo); loadMe(); }, 15000); return () => clearInterval(t); } }, [load, loadMe, periodo, ref]);

  const myLink = myCode ? `${window.location.origin}/rankpremiado?ref=${myCode}` : '';
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
      // auto-login: se criou conta NÍVEL 1 na plataforma (cadastro novo), já entra logado
      if (j.app_user) { try { localStorage.setItem('currentUser', JSON.stringify(j.app_user)); sessionStorage.setItem('isLoggedIn', 'true'); } catch (_) {} }
      load(periodo); setTimeout(loadMe, 300);
    } catch { setErr('Erro de conexão. Tente de novo.'); } finally { setSaving(false); }
  };
  const handleFormPhoto = async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const url = await fileToSmallDataUrl(f); setForm((s) => ({ ...s, foto: url })); } catch { /* */ } };
  // Admin: anexar foto do produto do dispositivo (converte em data URL leve, sem depender de URL externa)
  const handleProdutoFoto = async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const url = await fileToSmallDataUrl(f, 400, 0.75); setCfg((s) => ({ ...s, produto_foto: url })); } catch { /* */ } };
  const trocarFoto = async (e) => { const f = e.target.files?.[0]; if (!f || !myCode) return; try { const url = await fileToSmallDataUrl(f); await fetch(`${API}?action=photo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: myCode, foto: url }) }); setMsg('Foto atualizada!'); setTimeout(() => setMsg(''), 3000); load(periodo); loadMe(); } catch { /* */ } };
  const copyLink = () => { navigator.clipboard?.writeText(myLink); setMsg('Link copiado!'); setTimeout(() => setMsg(''), 3500); };
  const shareZap = () => { const t = encodeURIComponent(`Tô no Rank Premiado Leilão NoZap! Entra no grupo pelo meu link e me ajuda a ganhar:\n${myLink}`); window.open(`https://wa.me/?text=${t}`, '_blank'); };

  const saveConfig = async () => { setSavingCfg(true); try { await fetch(`${API}?action=save_config`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.id, config: cfg }) }); await load(periodo); setMsg('Config salva!'); setTimeout(() => setMsg(''), 3000); } catch { /* */ } finally { setSavingCfg(false); } };
  const savePremios = async () => { try { const premios = Object.entries(premiosEdit).map(([posicao, premio]) => ({ posicao: Number(posicao), premio })); await fetch(`${API}?action=prizes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.id, premios }) }); await load(periodo); setMsg('Prêmios do pódio salvos!'); setTimeout(() => setMsg(''), 3000); } catch { /* */ } };
  const realizarSorteio = async (per) => {
    if (!window.confirm(`Realizar sorteio do período "${per}"? Coroa quem trouxe mais gente.`)) return;
    try { const r = await fetch(`${API}?action=sorteio`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.id, periodo: per }) }); const j = await r.json(); setMsg(j.ok ? `Vencedor: ${j.vencedor.nome} (${j.vencedor.pontos})` : (j.error || 'Erro')); setTimeout(() => setMsg(''), 6000); } catch { /* */ }
  };

  const premioPeriodo = periodo === 'dia' ? config.premio_dia : periodo === 'semana' ? config.premio_semana : periodo === 'mes' ? config.premio_mes : null;

  // Tela mínima do convidado enquanto redireciona
  if (ref) {
    return (
      <div style={{ minHeight: '100vh', background: 'radial-gradient(1200px 600px at 50% -10%, #0f3d2e 0%, #071b14 45%, #05100c 100%)' }} className="text-white flex items-center justify-center p-6 text-center">
        <div>
          <img src={logoNozap} alt="Leilão NoZap" className="w-28 h-28 mx-auto object-contain drop-shadow-xl" />
          <p className="mt-4 text-xl font-black">Entrando no grupo do WhatsApp...</p>
          <p className="text-green-300/70 text-sm mt-2">Se não abrir sozinho, <a href={GROUP_LINK} className="underline text-green-300 font-semibold">toque aqui</a>.</p>
        </div>
      </div>
    );
  }

  const CARD = { background: 'rgba(255,255,255,.045)', border: '1px solid rgba(245,196,81,.26)' };
  const rankingVisible = rankExpanded ? data.ranking.slice(0, 50) : data.ranking.slice(0, 5);

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

  const DestaqueBlock = (config.produto_nome || config.propaganda) ? (
    <div className="rounded-2xl p-4" style={CARD}>
      <p className="text-[11px] font-bold uppercase tracking-wide text-green-300/60 mb-3 flex items-center gap-2"><Gift className="w-3.5 h-3.5" /> Destaque / Sorteio do dia</p>
      {config.produto_nome && (
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
    <div className="rounded-2xl p-5" style={CARD}>
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
      <div className="mt-3 bg-black/30 rounded-lg px-3 py-2 text-xs break-all text-green-100 border border-white/10 flex items-center gap-2"><Link2 className="w-4 h-4 text-yellow-300 shrink-0" />{myLink}</div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <button onClick={copyLink} className="py-3 rounded-lg font-bold bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center gap-2"><Copy className="w-4 h-4" /> Copiar link</button>
        <button onClick={shareZap} className="py-3 rounded-lg font-bold text-[#052e16] flex items-center justify-center gap-2" style={{ background: '#25D366' }}><MessageCircle className="w-4 h-4" /> WhatsApp</button>
      </div>
      <a href="/Licensing" className="mt-3 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-white" style={{ background: 'linear-gradient(90deg,#8b5cf6,#22c55e)' }}>
        <Briefcase className="w-5 h-5" /> Quero ser Influência Leilão NoZap
      </a>
    </div>
  );

  const FormPanel = (
    <div className="rounded-2xl p-5" style={CARD}>
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
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-black text-lg flex items-center gap-2"><Crown className="w-5 h-5 text-yellow-300" /> Ranking</h2>
        <span className="text-xs text-green-300/70">{data.total || 0} participando</span>
      </div>
      <div className="flex gap-2 mb-3">
        {PERIODOS.map((p) => (
          <button key={p.id} onClick={() => setPeriodo(p.id)} className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-bold ${periodo === p.id ? 'text-[#052e16]' : 'bg-white/5 text-green-200 border border-white/10'}`} style={periodo === p.id ? { background: 'linear-gradient(90deg,#f5c451,#22c55e)' } : {}}>{p.l}</button>
        ))}
      </div>
      {premioPeriodo ? <div className="text-center text-xs text-yellow-300 mb-3 flex items-center justify-center gap-1.5"><Gift className="w-3.5 h-3.5" /> Prêmio {PERIODOS.find((p) => p.id === periodo)?.l}: <b>{premioPeriodo}</b></div> : null}
      {data.ranking.length === 0 ? (
        <p className="text-center text-green-300/60 py-8">Ninguém pontuou nesse período ainda. Seja o primeiro!</p>
      ) : (
        <>
          <div className="space-y-2">
            {rankingVisible.map((x) => {
              const isMe = x.code === myCode;
              return (
                <div key={x.code} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border ${isMe ? 'border-yellow-400' : 'border-white/10'}`} style={{ background: x.posicao <= 3 ? 'linear-gradient(90deg,rgba(245,196,81,.15),rgba(34,197,94,.06))' : 'rgba(255,255,255,.04)' }}>
                  <PosBadge pos={x.posicao} />
                  <Avatar url={x.foto_url} nome={x.nome} size={38} />
                  <span className="font-bold flex-1 truncate">{x.nome}{isMe && <span className="text-yellow-300 text-xs ml-2">(você)</span>}</span>
                  {/* Pontuação só pro admin (parâmetros de conversão). Público vê o ranking, não os números. */}
                  {isAdmin && <span className="font-black text-yellow-300 inline-flex items-center gap-1"><Users className="w-3.5 h-3.5 opacity-80" />{x.pontos}</span>}
                </div>
              );
            })}
          </div>
          {data.ranking.length > 5 && (
            <button onClick={() => setRankExpanded((v) => !v)} className="mt-3 w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2" style={{ border: '1px dashed rgba(245,196,81,.5)', background: 'rgba(245,196,81,.06)', color: '#f5c451' }}>
              {rankExpanded ? 'Mostrar menos' : 'Ver ranking completo'}
              <ChevronDown className="w-4 h-4" style={{ transform: rankExpanded ? 'rotate(180deg)' : 'none', transition: '.2s' }} />
            </button>
          )}
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

  // Conteúdo do painel admin — reaproveitado inline e no modo tela cheia.
  const AdminInner = (
    <>
      {/* Cards de configuração */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
        {/* Destaque */}
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

        {/* Live */}
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

        {/* Prêmios dos sorteios */}
        <div className="rounded-2xl p-4 bg-black/25 border border-white/10 md:col-span-2 xl:col-span-1">
          <SecHead icon={Award}>Prêmios dos sorteios</SecHead>
          <div className="space-y-2.5">
            <input value={cfg.premio_dia || ''} onChange={(e) => setCfg({ ...cfg, premio_dia: e.target.value })} placeholder="Prêmio do sorteio DIÁRIO" className={inp} />
            <input value={cfg.premio_semana || ''} onChange={(e) => setCfg({ ...cfg, premio_semana: e.target.value })} placeholder="Prêmio do sorteio SEMANAL" className={inp} />
            <input value={cfg.premio_mes || ''} onChange={(e) => setCfg({ ...cfg, premio_mes: e.target.value })} placeholder="Prêmio do sorteio MENSAL" className={inp} />
          </div>
        </div>
      </div>

      <button onClick={saveConfig} disabled={savingCfg} className="mt-4 w-full py-3.5 rounded-xl font-black text-white shadow-lg shadow-purple-900/30 disabled:opacity-60 flex items-center justify-center gap-2 transition-transform active:scale-[.99]" style={{ background: 'linear-gradient(90deg,#8b5cf6,#7c3aed)' }}>
        <Save className="w-4 h-4" /> {savingCfg ? 'Salvando...' : <>Salvar configuração <span className="text-purple-200/90 text-xs font-medium">(destaque + live + prêmios)</span></>}
      </button>

      {/* Ações: sorteio + pódio */}
      <div className="grid lg:grid-cols-2 gap-3 mt-4 items-start">
        <div className="rounded-2xl p-4 bg-black/25 border border-white/10">
          <SecHead icon={Gavel}>Realizar sorteio (coroa o 1º do período)</SecHead>
          <div className="grid grid-cols-3 gap-2">
            {[['dia', 'Dia'], ['semana', 'Semana'], ['mes', 'Mês']].map(([id, l]) => (
              <button key={id} onClick={() => realizarSorteio(id)} className="py-3 rounded-xl font-bold text-sm text-[#1a1205] shadow-md transition-transform active:scale-[.97]" style={{ background: 'linear-gradient(90deg,#f5c451,#e0a920)' }}>{l}</button>
            ))}
          </div>
          <p className="text-[11px] text-purple-200/60 mt-3">Escolha o período para coroar quem trouxe mais gente. Registra o vencedor no histórico.</p>
        </div>

        <div className="rounded-2xl p-4 bg-black/25 border border-white/10">
          <SecHead icon={Crown}>Prêmios do pódio (top 10)</SecHead>
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
    </>
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

        {/* DASHBOARD GRID */}
        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-4 mt-6 items-start">
          <div className="flex flex-col gap-4">
            {LiveBlock}
            {DestaqueBlock}
          </div>
          <div className="flex flex-col gap-4">
            {myCode ? MinePanel : FormPanel}
            {RankingBlock}
          </div>
        </div>

        {/* ADMIN — modo tela cheia (overlay), aberto pelo botão do topo */}
        {isAdmin && adminExpanded && (
          <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(3,10,7,.72)', backdropFilter: 'blur(6px)' }} onClick={() => setAdminExpanded(false)}>
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-6xl mx-auto my-3 sm:my-6 flex flex-col rounded-2xl overflow-hidden shadow-2xl"
              style={{ maxHeight: 'calc(100dvh - 24px)', background: 'linear-gradient(180deg,#1a1030,#120a24)', border: '1px solid rgba(139,92,246,.5)' }}
            >
              <div className="sticky top-0 z-10 px-4 sm:px-6 py-3.5 border-b" style={{ background: 'rgba(26,16,48,.95)', borderColor: 'rgba(139,92,246,.3)' }}>
                {AdminHeader(true)}
              </div>
              <div className="overflow-y-auto px-4 sm:px-6 py-5">{AdminInner}</div>
            </div>
          </div>
        )}

        <p className="text-center text-[11px] text-green-300/40 mt-10 flex items-center justify-center gap-1.5"><Users className="w-3 h-3" /> A contagem é por pessoas que entram no grupo pelo seu link.</p>
      </div>
    </div>
  );
}
