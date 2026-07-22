import React, { useState, useEffect, useCallback } from 'react';
import logoNozap from '@/assets/leilao-nozap-logo.png';

const API = '/api/concurso';

function getVisitorId() {
  let v = localStorage.getItem('concurso_visitor');
  if (!v) { v = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('concurso_visitor', v); }
  return v;
}
const medal = (p) => (p === 1 ? '🥇' : p === 2 ? '🥈' : p === 3 ? '🥉' : `${p}º`);
const maskCpf = (v) => { const d = v.replace(/\D/g, '').slice(0, 11); return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'); };
const maskZap = (v) => { const d = v.replace(/\D/g, '').slice(0, 11); if (d.length <= 2) return d; if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`; return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`; };

// Comprime a foto no navegador (quadrada, ~256px) pra subir leve.
function fileToSmallDataUrl(file, max = 256, q = 0.72) {
  return new Promise((resolve, reject) => {
    const rd = new FileReader();
    rd.onload = () => {
      const img = new Image();
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2, sy = (img.height - side) / 2;
        const c = document.createElement('canvas'); c.width = max; c.height = max;
        c.getContext('2d').drawImage(img, sx, sy, side, side, 0, 0, max, max);
        resolve(c.toDataURL('image/jpeg', q));
      };
      img.onerror = reject; img.src = rd.result;
    };
    rd.onerror = reject; rd.readAsDataURL(file);
  });
}
function Avatar({ url, nome, size = 32 }) {
  const s = { width: size, height: size };
  if (url) return <img src={url} alt={nome} style={s} className="rounded-full object-cover border border-white/20" />;
  return <div style={s} className="rounded-full flex items-center justify-center font-black text-white/90 border border-white/20" >{(nome || '?')[0].toUpperCase()}</div>;
}

export default function ConcursoLeilaoNozap() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  const [data, setData] = useState({ ranking: [], premios: [], group_link: '' });
  const [myCode, setMyCode] = useState(localStorage.getItem('concurso_code') || '');
  const [form, setForm] = useState({ nome: '', cpf: '', whatsapp: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [joinMsg, setJoinMsg] = useState('');
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { return null; } })();
  const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'super_admin');
  const [premiosEdit, setPremiosEdit] = useState({});
  const [savingPrizes, setSavingPrizes] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(API, { cache: 'no-store' });
      const j = await r.json();
      setData(j);
      const pe = {}; (j.premios || []).forEach((p) => { pe[p.posicao] = p.premio || ''; });
      setPremiosEdit(pe);
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  const myLink = myCode ? `${window.location.origin}/concursoleilaonozap?ref=${myCode}` : '';
  const myRow = data.ranking.find((x) => x.code === myCode);
  const inviter = ref ? data.ranking.find((x) => x.code === ref) : null;

  const register = async () => {
    setErr(''); setSaving(true);
    try {
      const r = await fetch(`${API}?action=register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || 'Erro ao salvar.'); return; }
      localStorage.setItem('concurso_code', j.code);
      setMyCode(j.code);
      load();
    } catch { setErr('Erro de conexão. Tente de novo.'); }
    finally { setSaving(false); }
  };

  const handleFormPhoto = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    try { const url = await fileToSmallDataUrl(f); setForm((s) => ({ ...s, foto: url })); } catch { /* */ }
  };
  const trocarFoto = async (e) => {
    const f = e.target.files?.[0]; if (!f || !myCode) return;
    try {
      const url = await fileToSmallDataUrl(f);
      await fetch(`${API}?action=photo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: myCode, foto: url }) });
      setJoinMsg('Foto atualizada! 📸'); setTimeout(() => setJoinMsg(''), 3000); load();
    } catch { /* */ }
  };

  const entrarNoGrupo = async () => {
    try {
      const r = await fetch(`${API}?action=join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref, visitor_id: getVisitorId() }) });
      const j = await r.json();
      setJoinMsg(j.inviter ? `Boa! Você entrou pelo convite de ${j.inviter}. Falta só clicar em ENTRAR NO GRUPO no WhatsApp. 🎉` : 'Abrindo o grupo do WhatsApp...');
      window.open(j.group_link || data.group_link, '_blank');
      load();
    } catch { window.open(data.group_link, '_blank'); }
  };

  const copyLink = () => { navigator.clipboard?.writeText(myLink); setJoinMsg('Link copiado! Cole no seu status e mande pros contatos. 🚀'); setTimeout(() => setJoinMsg(''), 4000); };
  const shareZap = () => { const txt = encodeURIComponent(`🏆 Tô participando do Concurso Leilão NoZap! Entra no grupo pelo meu link e me ajuda a ganhar prêmio:\n${myLink}`); window.open(`https://wa.me/?text=${txt}`, '_blank'); };

  const salvarPremios = async () => {
    setSavingPrizes(true);
    try {
      const premios = Object.entries(premiosEdit).map(([posicao, premio]) => ({ posicao: Number(posicao), premio }));
      await fetch(`${API}?action=prizes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: currentUser.id, premios }) });
      await load();
      setJoinMsg('Prêmios atualizados! ✅'); setTimeout(() => setJoinMsg(''), 4000);
    } catch { /* */ } finally { setSavingPrizes(false); }
  };

  const premioDe = (pos) => (data.premios.find((p) => p.posicao === pos) || {}).premio || '';

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(1200px 600px at 50% -10%, #0f3d2e 0%, #071b14 45%, #05100c 100%)' }} className="text-white w-full overflow-x-hidden">
      <div className="max-w-2xl w-full mx-auto px-4 py-8 pb-24">

        {/* HERO */}
        <div className="text-center relative">
          <img src={logoNozap} alt="Leilão NoZap" className="mx-auto w-40 h-40 object-contain drop-shadow-xl" />
          <h1 className="font-black tracking-tight -mt-1" style={{ fontSize: 'clamp(1.7rem,7vw,2.4rem)', lineHeight: 1.05, background: 'linear-gradient(90deg,#f5c451,#22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            🏆 CONCURSO
          </h1>
          <p className="text-green-200/90 mt-2 font-semibold">Encha o grupo e ganhe prêmio! Quem levar mais gente vence. 🚀</p>
        </div>

        {/* CONVITE (chegou por link de alguém) */}
        {ref && (
          <div className="mt-6 rounded-2xl p-5 text-center" style={{ background: 'linear-gradient(135deg,#166534,#052e16)', border: '1px solid rgba(245,196,81,.35)' }}>
            <p className="text-sm text-green-200">Você foi convidado {inviter ? <>por <b className="text-yellow-300">{inviter.nome}</b></> : ''} 💚</p>
            <p className="text-xs text-green-300/80 mt-1">Entre no grupo pra ajudar {inviter ? inviter.nome.split(' ')[0] : 'o convidador'} a subir no ranking!</p>
            <button onClick={entrarNoGrupo} className="mt-4 w-full py-4 rounded-xl font-black text-lg text-[#052e16]" style={{ background: 'linear-gradient(90deg,#25D366,#22c55e)', boxShadow: '0 8px 24px rgba(37,211,102,.4)' }}>
              💬 ENTRAR NO GRUPO DO WHATSAPP
            </button>
          </div>
        )}

        {joinMsg && <div className="mt-4 text-center text-sm bg-white/10 rounded-lg py-2 px-3">{joinMsg}</div>}

        {/* MEU LINK (já cadastrado) ou FORM */}
        {myCode ? (
          <div className="mt-6 rounded-2xl p-5" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(245,196,81,.3)' }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-green-300/80 uppercase tracking-wider font-bold">Seu link de divulgação</p>
                {myRow && <p className="text-2xl font-black mt-1">{medal(myRow.posicao)} lugar · <span className="text-yellow-300">{myRow.pontos} {myRow.pontos === 1 ? 'pessoa' : 'pessoas'}</span></p>}
              </div>
              <label className="cursor-pointer flex flex-col items-center gap-1">
                <div style={{ background: 'linear-gradient(135deg,#166534,#052e16)' }} className="w-16 h-16 rounded-full flex items-center justify-center text-2xl overflow-hidden">
                  <Avatar url={myRow?.foto_url} nome={myRow?.nome} size={64} />
                </div>
                <span className="text-[10px] text-green-300/80">{myRow?.foto_url ? 'trocar foto' : '📷 add foto'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={trocarFoto} />
              </label>
            </div>
            <div className="mt-3 bg-black/30 rounded-lg px-3 py-2 text-xs break-all text-green-100 border border-white/10">{myLink}</div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button onClick={copyLink} className="py-3 rounded-lg font-bold bg-white/10 hover:bg-white/20 border border-white/10">📋 Copiar link</button>
              <button onClick={shareZap} className="py-3 rounded-lg font-bold text-[#052e16]" style={{ background: '#25D366' }}>💬 Enviar no WhatsApp</button>
            </div>
            <p className="text-center text-[11px] text-green-300/60 mt-3">Cada pessoa que entrar no grupo pelo seu link conta 1 ponto (não repete o mesmo aparelho).</p>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl p-5" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(245,196,81,.3)' }}>
            <p className="font-black text-lg mb-1">🎯 Participe agora</p>
            <p className="text-xs text-green-300/80 mb-4">Preencha pra gerar seu link. CPF é só pra validar o prêmio, não aparece pra ninguém.</p>
            <label className="flex flex-col items-center gap-2 cursor-pointer mb-4">
              {form.foto
                ? <img src={form.foto} alt="sua foto" className="w-24 h-24 rounded-full object-cover border-2 border-yellow-400" />
                : <div className="w-24 h-24 rounded-full bg-black/40 border-2 border-dashed border-white/25 flex items-center justify-center text-3xl">📷</div>}
              <span className="text-xs text-green-300/90 font-semibold">{form.foto ? '✅ Trocar foto' : 'Adicionar sua foto (deixa o ranking mais legal!)'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleFormPhoto} />
            </label>
            <div className="space-y-3">
              <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" className="w-full bg-black/30 border border-white/15 rounded-lg px-4 py-3 outline-none focus:border-yellow-400" />
              <input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: maskCpf(e.target.value) })} inputMode="numeric" placeholder="CPF" className="w-full bg-black/30 border border-white/15 rounded-lg px-4 py-3 outline-none focus:border-yellow-400" />
              <input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: maskZap(e.target.value) })} inputMode="numeric" placeholder="WhatsApp (com DDD)" className="w-full bg-black/30 border border-white/15 rounded-lg px-4 py-3 outline-none focus:border-yellow-400" />
            </div>
            {err && <p className="text-red-300 text-sm mt-2">⚠️ {err}</p>}
            <button onClick={register} disabled={saving} className="mt-4 w-full py-4 rounded-xl font-black text-lg text-[#052e16] disabled:opacity-60" style={{ background: 'linear-gradient(90deg,#f5c451,#22c55e)' }}>
              {saving ? 'Gerando seu link...' : '🚀 GERAR MEU LINK'}
            </button>
          </div>
        )}

        {/* PRÊMIOS */}
        {data.premios.some((p) => p.premio) && (
          <div className="mt-8">
            <h2 className="font-black text-lg mb-3">🎁 Prêmios</h2>
            <div className="grid gap-2">
              {data.premios.filter((p) => p.premio).map((p) => (
                <div key={p.posicao} className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-2 border border-white/10">
                  <span className="text-xl w-9 text-center">{medal(p.posicao)}</span>
                  <span className="font-semibold">{p.premio}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RANKING */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-lg">🏅 Quem está ganhando</h2>
            <span className="text-xs text-green-300/70">{data.total || 0} participando</span>
          </div>
          {data.ranking.length === 0 ? (
            <p className="text-center text-green-300/60 py-8">Ninguém pontuou ainda. Seja o primeiro! 🥇</p>
          ) : (
            <div className="space-y-2">
              {data.ranking.slice(0, 20).map((x) => {
                const isMe = x.code === myCode;
                return (
                  <div key={x.code} className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${isMe ? 'border-yellow-400' : 'border-white/10'}`}
                    style={{ background: x.posicao <= 3 ? 'linear-gradient(90deg,rgba(245,196,81,.15),rgba(34,197,94,.06))' : 'rgba(255,255,255,.04)' }}>
                    <span className="text-2xl w-8 text-center font-black">{medal(x.posicao)}</span>
                    <div style={{ background: x.foto_url ? 'transparent' : 'linear-gradient(135deg,#166534,#052e16)' }} className="rounded-full flex items-center justify-center flex-shrink-0"><Avatar url={x.foto_url} nome={x.nome} size={40} /></div>
                    <span className="font-bold flex-1 truncate">{x.nome}{isMe && <span className="text-yellow-300 text-xs ml-2">(você)</span>}</span>
                    <span className="font-black text-yellow-300">{x.pontos}</span>
                    <span className="text-xs text-green-300/60">{x.pontos === 1 ? 'pessoa' : 'pessoas'}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ADMIN: prêmios */}
        {isAdmin && (
          <div className="mt-10 rounded-2xl p-5" style={{ background: 'rgba(139,92,246,.08)', border: '1px solid rgba(139,92,246,.4)' }}>
            <p className="font-black text-lg mb-1">🛡️ Admin — Prêmios (até 10 colocados)</p>
            <p className="text-xs text-purple-200/80 mb-4">Deixe em branco pra não exibir a colocação.</p>
            <div className="grid gap-2">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((pos) => (
                <div key={pos} className="flex items-center gap-3">
                  <span className="w-9 text-center text-lg">{medal(pos)}</span>
                  <input value={premiosEdit[pos] ?? premioDe(pos)} onChange={(e) => setPremiosEdit({ ...premiosEdit, [pos]: e.target.value })}
                    placeholder={`Prêmio do ${pos}º lugar`} className="flex-1 bg-black/30 border border-white/15 rounded-lg px-3 py-2 outline-none focus:border-purple-400 text-sm" />
                </div>
              ))}
            </div>
            <button onClick={salvarPremios} disabled={savingPrizes} className="mt-4 w-full py-3 rounded-lg font-bold bg-purple-600 hover:bg-purple-700 disabled:opacity-60">
              {savingPrizes ? 'Salvando...' : 'Salvar prêmios'}
            </button>
          </div>
        )}

        <p className="text-center text-[11px] text-green-300/40 mt-10">Concurso Leilão NoZap · a contagem é por pessoas que entram no grupo pelo seu link.</p>
      </div>
    </div>
  );
}
