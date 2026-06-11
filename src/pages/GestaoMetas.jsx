import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { ArrowLeft, Target, Search, Trophy, Trash2, Loader2, User as UserIcon } from 'lucide-react';

const money = (n) => 'R$ ' + (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const CARGO = { usuario: 'Usuário', influenciador: 'Influenciador', vendedor: 'Vendedor', licenciado: 'Licenciado', parceiro: 'Parceiro', ponto_retirada: 'Ponto de Retirada', loja_fisica: 'Loja Física', distribuidor: 'Distribuidor', fundador: 'Fundador', ceo: 'CEO', funcionario: 'Funcionário' };

export default function GestaoMetas() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [picked, setPicked] = useState(null);
  const [valor, setValor] = useState('');
  const [metas, setMetas] = useState([]);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    let u = null; try { u = JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { u = null; }
    setUser(u);
    if (u && !['admin', 'super_admin'].includes(u.role)) { navigate('/painel'); return; }
    loadMetas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMetas = async () => {
    const r = await base44.functions.invoke('manageMetas', { action: 'list' });
    setMetas(r?.metas || []);
  };

  useEffect(() => {
    if (!user) return;
    const t = setTimeout(async () => {
      if (q.trim().length < 2) { setResults([]); return; }
      const r = await base44.functions.invoke('manageMetas', { action: 'searchUsers', actorId: user.id, q: q.trim() });
      setResults(r?.users || []);
    }, 350);
    return () => clearTimeout(t);
  }, [q, user]);

  const salvar = async () => {
    if (!picked) { toast.error('Busque e selecione um login primeiro.'); return; }
    const v = Number(String(valor).replace(/[^\d.,]/g, '').replace('.', '').replace(',', '.'));
    if (!(v > 0)) { toast.error('Informe um valor de meta válido.'); return; }
    setBusy('save');
    try {
      const r = await base44.functions.invoke('manageMetas', { action: 'set', actorId: user.id, target_user_id: picked.id, valor: v });
      if (!r?.success) { toast.error(r?.error || 'Falha'); setBusy(''); return; }
      toast.success(`Meta de ${money(v)} definida para a categoria ${CARGO[picked.primary_career_level] || picked.primary_career_level}!`);
      setValor(''); setPicked(null); setQ(''); setResults([]);
      loadMetas();
    } catch { toast.error('Erro'); }
    setBusy('');
  };

  const remover = async (m) => {
    setBusy(m.id);
    try { await base44.functions.invoke('manageMetas', { action: 'remove', actorId: user.id, id: m.id }); setMetas((p) => p.filter((x) => x.id !== m.id)); } catch { toast.error('Erro'); }
    setBusy('');
  };

  if (!user) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-400">Faça login.</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-950 border-b border-gray-800 px-6 py-4 sticky top-16 z-20">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/painel')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-800 border border-gray-700"><ArrowLeft className="w-4 h-4" /> Voltar</button>
          <div className="w-9 h-9 rounded-xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center"><Target className="w-5 h-5 text-yellow-300" /></div>
          <div><h1 className="text-xl font-black leading-none">Metas (CEO)</h1><p className="text-xs text-gray-500 mt-0.5">Defina metas por categoria</p></div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 grid md:grid-cols-2 gap-6">
        {/* definir meta */}
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5 h-fit">
          <h2 className="font-bold mb-1">Definir meta</h2>
          <p className="text-xs text-gray-400 mb-4">Busque um login. A meta vale pra <strong>todos da categoria</strong> dele.</p>
          <div className="relative mb-2">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPicked(null); }} placeholder="Buscar por nome ou e-mail…" className="w-full bg-gray-950 border border-gray-700 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-yellow-500" />
          </div>
          {!picked && results.length > 0 && (
            <div className="space-y-1 mb-3 max-h-52 overflow-y-auto">
              {results.map((u) => (
                <button key={u.id} onClick={() => { setPicked(u); setResults([]); setQ(u.full_name); }} className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-700/50 text-left">
                  <UserIcon className="w-4 h-4 text-gray-500" />
                  <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{u.full_name}</div><div className="text-[11px] text-gray-500 truncate">{u.email}</div></div>
                  <span className="text-[10px] bg-gray-700 rounded-full px-2 py-0.5">{CARGO[u.primary_career_level] || u.primary_career_level}</span>
                </button>
              ))}
            </div>
          )}
          {picked && (
            <div className="bg-gray-950/60 border border-yellow-500/30 rounded-lg p-3 mb-3">
              <div className="text-sm font-bold">{picked.full_name}</div>
              <div className="text-xs text-gray-400">Categoria: <strong className="text-yellow-300">{CARGO[picked.primary_career_level] || picked.primary_career_level}</strong> — a meta vale pra todos dessa categoria</div>
            </div>
          )}
          <label className="text-xs text-gray-400">Meta do dia (R$)</label>
          <input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="8.000,00" className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-yellow-500 mb-3 mt-1" />
          <button onClick={salvar} disabled={busy === 'save'} className="w-full py-2.5 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold flex items-center justify-center gap-2">
            {busy === 'save' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />} Definir meta
          </button>
        </div>

        {/* metas ativas */}
        <div>
          <h2 className="font-bold mb-3 flex items-center gap-2"><Trophy className="w-4 h-4 text-yellow-300" /> Metas ativas ({metas.length})</h2>
          {metas.length === 0 ? (
            <div className="bg-gray-800/40 border border-dashed border-gray-700 rounded-xl p-6 text-center text-gray-400 text-sm">Nenhuma meta ativa.</div>
          ) : (
            <div className="space-y-2">
              {metas.map((m) => (
                <div key={m.id} className="bg-gray-800/60 border border-gray-700 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm">{CARGO[m.categoria] || m.categoria} <span className="text-[11px] text-gray-500">/ {m.periodo}</span></div>
                    <div className="text-green-400 font-black">{money(m.valor)}</div>
                  </div>
                  <button onClick={() => remover(m)} disabled={busy === m.id} className="text-gray-500 hover:text-red-400 p-1.5"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
