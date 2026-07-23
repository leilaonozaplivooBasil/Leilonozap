import React, { useState, useEffect, useCallback } from 'react';
import logoNozap from '@/assets/leilao-nozap-logo.png';

const API = '/api/concurso';
const GROUP_LINK = 'https://chat.whatsapp.com/FyKc2sXiB5fBG7ikYlmvri?s=cl&p=i&mlu=4';
const PERIODOS = [{ id: 'dia', l: 'Hoje' }, { id: 'semana', l: 'Semana' }, { id: 'mes', l: 'Mês' }, { id: 'geral', l: 'Geral' }];

function getVisitorId() {
  let v = localStorage.getItem('concurso_visitor');
  if (!v) { v = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('concurso_visitor', v); }
  return v;
}
const medal = (p) => (p === 1 ? '🥇' : p === 2 ? '🥈' : p === 3 ? '🥉' : `${p}º`);
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

  const myLink = myCode ? `${window.location.origin}/concursoleilaonozap?ref=${myCode}` : '';
  const config = data.config || {};
  const liveOn = !!config.live_ativa;

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
  const trocarFoto = async (e) => { const f = e.target.files?.[0]; if (!f || !myCode) return; try { const url = await fileToSmallDataUrl(f); await fetch(`${API}?action=photo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: myCode, foto: url }) }); setMsg('Foto atualizada! 📸'); setTimeout(() => setMsg(''), 3000); load(periodo); loadMe(); } catch { /* */ } };
  const copyLink = () => { navigator.clipboard?.writeText(myLink); setMsg('Link copiado! 🚀'); setTimeout(() => setMsg(''), 3500); };
  const shareZap = () => { const t = encodeURIComponent(`🏆 Tô no Concurso Leilão NoZap! Entra no grupo pelo meu link e me ajuda a ganhar:\n${myLink}`); window.open(`https://wa.me/?text=${t}`, '_blank'); };

  const saveConfig = async () => { setSavingCfg(true); try { await fetch(`${API}?action=save_config`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.id, config: cfg }) }); await load(periodo); setMsg('Config salva! ✅'); setTimeout(() => setMsg(''), 3000); } catch { /* */ } finally { setSavingCfg(false); } };
  const savePremios = async () => { try { const premios = Object.entries(premiosEdit).map(([posicao, premio]) => ({ posicao: Number(posicao), premio })); await fetch(`${API}?action=prizes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.id, premios }) }); await load(periodo); setMsg('Prêmios do pódio salvos! ✅'); setTimeout(() => setMsg(''), 3000); } catch { /* */ } };
  const realizarSorteio = async (per) => {
    if (!window.confirm(`Realizar sorteio do período "${per}"? Coroa quem trouxe mais gente.`)) return;
    try { const r = await fetch(`${API}?action=sorteio`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.id, periodo: per }) }); const j = await r.json(); setMsg(j.ok ? `🎉 Vencedor: ${j.vencedor.nome} (${j.vencedor.pontos})` : (j.error || 'Erro')); setTimeout(() => setMsg(''), 6000); } catch { /* */ }
  };

  const premioPeriodo = periodo === 'dia' ? config.premio_dia : periodo === 'semana' ? config.premio_semana : periodo === 'mes' ? config.premio_mes : null;
  const audPct = config.live_meta > 0 ? Math.min(100, Math.round(((config.live_audiencia || 0) / config.live_meta) * 100)) : 0;

  // Tela mínima do convidado enquanto redireciona
  if (ref) {
    return (
      <div style={{ minHeight: '100vh', background: 'radial-gradient(1200px 600px at 50% -10%, #0f3d2e 0%, #071b14 45%, #05100c 100%)' }} className="text-white flex items-center justify-center p-6 text-center">
        <div>
          <img src={logoNozap} alt="Leilão NoZap" className="w-28 h-28 mx-auto object-contain drop-shadow-xl" />
          <p className="mt-4 text-xl font-black">Entrando no grupo do WhatsApp... 💬</p>
          <p className="text-green-300/70 text-sm mt-2">Se não abrir sozinho, <a href={GROUP_LINK} className="underline text-green-300 font-semibold">toque aqui</a>.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(1200px 600px at 50% -10%, #0f3d2e 0%, #071b14 45%, #05100c 100%)' }} className="text-white w-full overflow-x-hidden">
      <div className="max-w-2xl w-full mx-auto px-4 py-6 pb-24">

        {/* HERO */}
        <div className="text-center">
          <img src={logoNozap} alt="Leilão NoZap" className="mx-auto w-24 h-24 object-contain drop-shadow-xl" />
          <h1 className="font-black -mt-1" style={{ fontSize: 'clamp(1.6rem,7vw,2.2rem)', lineHeight: 1, background: 'linear-gradient(90deg,#f5c451,#22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>🏆 CONCURSO</h1>
          <p className="text-green-200/90 mt-1 font-semibold text-sm">Encha o grupo e ganhe prêmio todo dia! 🚀</p>
        </div>

        {msg && <div className="mt-4 text-center text-sm bg-white/10 rounded-lg py-2 px-3">{msg}</div>}

        {/* LIVE AO VIVO */}
        {liveOn && (
          <div className="mt-5 rounded-2xl p-4" style={{ background: 'linear-gradient(135deg,#7f1d1d,#450a0a)', border: '1px solid rgba(255,80,80,.5)' }}>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" /><span className="font-black text-red-300">AO VIVO AGORA</span>
            </div>
            {config.live_produto && <p className="text-sm mt-1 font-semibold">🔨 {config.live_produto}</p>}
            <div className="mt-2 h-3 rounded-full bg-black/40 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${audPct}%`, background: 'linear-gradient(90deg,#f5c451,#22c55e)' }} />
            </div>
            <p className="text-[11px] text-red-200/80 mt-1">{config.live_audiencia || 0} de {config.live_meta || 300} pessoas na live ({audPct}%)</p>
            {config.live_url && <a href={config.live_url} target="_blank" rel="noreferrer" className="mt-3 block text-center py-3 rounded-xl font-black text-white" style={{ background: 'linear-gradient(90deg,#ef4444,#f97316)' }}>▶️ ENTRAR NA LIVE</a>}
          </div>
        )}

        {/* PRÓXIMA LIVE / DESTAQUE (quando não está ao vivo) */}
        {!liveOn && (config.live_horario || config.propaganda || config.produto_nome) && (
          <div className="mt-5 rounded-2xl p-4" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(245,196,81,.25)' }}>
            {config.live_horario && <p className="text-sm">📺 Próxima live: <b className="text-yellow-300">{config.live_horario}</b></p>}
            {config.produto_nome && (
              <div className="flex items-center gap-3 mt-2">
                {config.produto_foto && <img src={config.produto_foto} alt="" className="w-16 h-16 rounded-lg object-cover" />}
                <div><p className="text-xs text-green-300/80">🎁 Sorteio em destaque</p><p className="font-bold">{config.produto_nome}</p>{config.produto_valor > 0 && <p className="text-xs text-yellow-300">{money(config.produto_valor)}</p>}</div>
              </div>
            )}
            {config.propaganda && <p className="text-xs text-green-100/90 mt-2 whitespace-pre-wrap">{config.propaganda}</p>}
          </div>
        )}

        {/* MEU PAINEL (cadastrado) ou FORM */}
        {myCode ? (
          <div className="mt-5 rounded-2xl p-5" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(245,196,81,.3)' }}>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer relative">
                <Avatar url={me?.foto_url} nome={me?.nome} size={56} />
                <span className="absolute -bottom-1 -right-1 text-xs bg-black/70 rounded-full px-1">📷</span>
                <input type="file" accept="image/*" className="hidden" onChange={trocarFoto} />
              </label>
              <div>
                <p className="font-black">{me?.nome || 'Seu painel'}</p>
                <p className="text-xs text-green-300/70">Seu link de divulgação</p>
              </div>
            </div>
            {/* posições nos 3 períodos */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[['dia', 'Hoje'], ['semana', 'Semana'], ['mes', 'Mês']].map(([k, l]) => (
                <div key={k} className="bg-black/30 rounded-lg p-2 text-center border border-white/10">
                  <p className="text-[10px] text-green-300/70 uppercase">{l}</p>
                  <p className="font-black text-lg">{me?.periodos?.[k]?.posicao ? medal(me.periodos[k].posicao) : '—'}</p>
                  <p className="text-[10px] text-yellow-300">{me?.periodos?.[k]?.pontos || 0} pessoas</p>
                </div>
              ))}
            </div>
            <div className="mt-3 bg-black/30 rounded-lg px-3 py-2 text-xs break-all text-green-100 border border-white/10">{myLink}</div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button onClick={copyLink} className="py-3 rounded-lg font-bold bg-white/10 hover:bg-white/20 border border-white/10">📋 Copiar link</button>
              <button onClick={shareZap} className="py-3 rounded-lg font-bold text-[#052e16]" style={{ background: '#25D366' }}>💬 WhatsApp</button>
            </div>
            {/* Funil: virar Influência Leilão NoZap (dados já foram coletados) */}
            <a href="/Licensing" className="mt-3 block text-center py-3 rounded-xl font-black text-white" style={{ background: 'linear-gradient(90deg,#8b5cf6,#22c55e)' }}>
              💼 Quero ser Influência Leilão NoZap
            </a>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl p-5" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(245,196,81,.3)' }}>
            <p className="font-black text-lg mb-1">🎯 Participe agora</p>
            <p className="text-xs text-green-300/80 mb-4">Preencha pra gerar seu link. CPF é só pra validar o prêmio, não aparece pra ninguém.</p>
            <label className="flex flex-col items-center gap-2 cursor-pointer mb-4">
              {form.foto ? <img src={form.foto} alt="sua foto" className="w-24 h-24 rounded-full object-cover border-2 border-yellow-400" /> : <div className="w-24 h-24 rounded-full bg-black/40 border-2 border-dashed border-white/25 flex items-center justify-center text-3xl">📷</div>}
              <span className="text-xs text-green-300/90 font-semibold">{form.foto ? '✅ Trocar foto' : 'Adicionar sua foto (deixa o ranking mais legal!)'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleFormPhoto} />
            </label>
            <div className="space-y-3">
              <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" className="w-full bg-black/30 border border-white/15 rounded-lg px-4 py-3 outline-none focus:border-yellow-400" />
              <input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: maskCpf(e.target.value) })} inputMode="numeric" placeholder="CPF" className="w-full bg-black/30 border border-white/15 rounded-lg px-4 py-3 outline-none focus:border-yellow-400" />
              <input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: maskZap(e.target.value) })} inputMode="numeric" placeholder="WhatsApp (com DDD)" className="w-full bg-black/30 border border-white/15 rounded-lg px-4 py-3 outline-none focus:border-yellow-400" />
            </div>
            {err && <p className="text-red-300 text-sm mt-2">⚠️ {err}</p>}
            <button onClick={register} disabled={saving} className="mt-4 w-full py-4 rounded-xl font-black text-lg text-[#052e16] disabled:opacity-60" style={{ background: 'linear-gradient(90deg,#f5c451,#22c55e)' }}>{saving ? 'Gerando seu link...' : '🚀 GERAR MEU LINK'}</button>
          </div>
        )}

        {/* RANKING com abas de período */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-lg">🏅 Ranking</h2>
            <span className="text-xs text-green-300/70">{data.total || 0} participando</span>
          </div>
          <div className="flex gap-2 mb-3">
            {PERIODOS.map((p) => (
              <button key={p.id} onClick={() => setPeriodo(p.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${periodo === p.id ? 'text-[#052e16]' : 'bg-white/5 text-green-200 border border-white/10'}`} style={periodo === p.id ? { background: 'linear-gradient(90deg,#f5c451,#22c55e)' } : {}}>{p.l}</button>
            ))}
          </div>
          {premioPeriodo ? <div className="text-center text-xs text-yellow-300 mb-3">🎁 Prêmio {PERIODOS.find((p) => p.id === periodo)?.l}: <b>{premioPeriodo}</b></div> : null}
          {data.ranking.length === 0 ? (
            <p className="text-center text-green-300/60 py-8">Ninguém pontuou nesse período ainda. Seja o primeiro! 🥇</p>
          ) : (
            <div className="space-y-2">
              {data.ranking.slice(0, 30).map((x) => {
                const isMe = x.code === myCode;
                return (
                  <div key={x.code} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border ${isMe ? 'border-yellow-400' : 'border-white/10'}`} style={{ background: x.posicao <= 3 ? 'linear-gradient(90deg,rgba(245,196,81,.15),rgba(34,197,94,.06))' : 'rgba(255,255,255,.04)' }}>
                    <span className="text-2xl w-8 text-center font-black">{medal(x.posicao)}</span>
                    <Avatar url={x.foto_url} nome={x.nome} size={40} />
                    <span className="font-bold flex-1 truncate">{x.nome}{isMe && <span className="text-yellow-300 text-xs ml-2">(você)</span>}</span>
                    <span className="font-black text-yellow-300">{x.pontos}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ADMIN */}
        {isAdmin && (
          <div className="mt-10 rounded-2xl p-5 space-y-5" style={{ background: 'rgba(139,92,246,.08)', border: '1px solid rgba(139,92,246,.4)' }}>
            <p className="font-black text-lg">🛡️ Painel Admin do Concurso</p>

            {/* Produto do dia + propaganda */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-purple-200 uppercase">Destaque / Sorteio do dia</p>
              <input value={cfg.produto_nome || ''} onChange={(e) => setCfg({ ...cfg, produto_nome: e.target.value })} placeholder="Nome do produto do sorteio" className="w-full bg-black/30 border border-white/15 rounded-lg px-3 py-2 text-sm" />
              <input value={cfg.produto_foto || ''} onChange={(e) => setCfg({ ...cfg, produto_foto: e.target.value })} placeholder="URL da foto do produto" className="w-full bg-black/30 border border-white/15 rounded-lg px-3 py-2 text-sm" />
              <input value={cfg.produto_valor || ''} onChange={(e) => setCfg({ ...cfg, produto_valor: Number(e.target.value) || 0 })} inputMode="numeric" placeholder="Valor (R$)" className="w-full bg-black/30 border border-white/15 rounded-lg px-3 py-2 text-sm" />
              <textarea value={cfg.propaganda || ''} onChange={(e) => setCfg({ ...cfg, propaganda: e.target.value })} placeholder="Texto de propaganda / destaque do dia" rows={2} className="w-full bg-black/30 border border-white/15 rounded-lg px-3 py-2 text-sm" />
            </div>

            {/* Live */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-purple-200 uppercase">Live</p>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!cfg.live_ativa} onChange={(e) => setCfg({ ...cfg, live_ativa: e.target.checked })} className="w-5 h-5 accent-red-500" /> Live AO VIVO agora</label>
              <input value={cfg.live_url || ''} onChange={(e) => setCfg({ ...cfg, live_url: e.target.value })} placeholder="Link da live" className="w-full bg-black/30 border border-white/15 rounded-lg px-3 py-2 text-sm" />
              <input value={cfg.live_horario || ''} onChange={(e) => setCfg({ ...cfg, live_horario: e.target.value })} placeholder="Horário da próxima live (ex: hoje 20h)" className="w-full bg-black/30 border border-white/15 rounded-lg px-3 py-2 text-sm" />
              <input value={cfg.live_produto || ''} onChange={(e) => setCfg({ ...cfg, live_produto: e.target.value })} placeholder="Produto que será leiloado na live" className="w-full bg-black/30 border border-white/15 rounded-lg px-3 py-2 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <input value={cfg.live_meta || ''} onChange={(e) => setCfg({ ...cfg, live_meta: Number(e.target.value) || 0 })} inputMode="numeric" placeholder="Meta de audiência" className="bg-black/30 border border-white/15 rounded-lg px-3 py-2 text-sm" />
                <input value={cfg.live_audiencia || ''} onChange={(e) => setCfg({ ...cfg, live_audiencia: Number(e.target.value) || 0 })} inputMode="numeric" placeholder="Assistindo agora" className="bg-black/30 border border-white/15 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            {/* Prêmios por período */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-purple-200 uppercase">Prêmios dos sorteios</p>
              <input value={cfg.premio_dia || ''} onChange={(e) => setCfg({ ...cfg, premio_dia: e.target.value })} placeholder="Prêmio do sorteio DIÁRIO" className="w-full bg-black/30 border border-white/15 rounded-lg px-3 py-2 text-sm" />
              <input value={cfg.premio_semana || ''} onChange={(e) => setCfg({ ...cfg, premio_semana: e.target.value })} placeholder="Prêmio do sorteio SEMANAL" className="w-full bg-black/30 border border-white/15 rounded-lg px-3 py-2 text-sm" />
              <input value={cfg.premio_mes || ''} onChange={(e) => setCfg({ ...cfg, premio_mes: e.target.value })} placeholder="Prêmio do sorteio MENSAL" className="w-full bg-black/30 border border-white/15 rounded-lg px-3 py-2 text-sm" />
            </div>

            <button onClick={saveConfig} disabled={savingCfg} className="w-full py-3 rounded-lg font-bold bg-purple-600 hover:bg-purple-700 disabled:opacity-60">{savingCfg ? 'Salvando...' : 'Salvar configuração'}</button>

            {/* Realizar sorteio */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <p className="text-xs font-bold text-purple-200 uppercase">Realizar sorteio (coroa o 1º do período)</p>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => realizarSorteio('dia')} className="py-2 rounded-lg font-bold bg-yellow-600 hover:bg-yellow-700 text-sm">🥇 Dia</button>
                <button onClick={() => realizarSorteio('semana')} className="py-2 rounded-lg font-bold bg-yellow-600 hover:bg-yellow-700 text-sm">🥇 Semana</button>
                <button onClick={() => realizarSorteio('mes')} className="py-2 rounded-lg font-bold bg-yellow-600 hover:bg-yellow-700 text-sm">🥇 Mês</button>
              </div>
            </div>

            {/* Prêmios do pódio (top 10) */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <p className="text-xs font-bold text-purple-200 uppercase">Prêmios do pódio (top 10)</p>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((pos) => (
                <div key={pos} className="flex items-center gap-2">
                  <span className="w-8 text-center">{medal(pos)}</span>
                  <input value={premiosEdit[pos] ?? ''} onChange={(e) => setPremiosEdit({ ...premiosEdit, [pos]: e.target.value })} placeholder={`Prêmio do ${pos}º`} className="flex-1 bg-black/30 border border-white/15 rounded-lg px-3 py-1.5 text-sm" />
                </div>
              ))}
              <button onClick={savePremios} className="w-full py-2 rounded-lg font-bold bg-purple-600 hover:bg-purple-700 text-sm">Salvar prêmios do pódio</button>
            </div>
          </div>
        )}

        <p className="text-center text-[11px] text-green-300/40 mt-10">Concurso Leilão NoZap · a contagem é por pessoas que entram no grupo pelo seu link.</p>
      </div>
    </div>
  );
}
