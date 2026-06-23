import React from 'react';
import { base44 } from '@/api/base44Client';
import { Ticket, Plus, Trash2, Loader2, Power } from 'lucide-react';
import { toast } from 'sonner';

const money = (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CuponsAdmin() {
  const [coupons, setCoupons] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({ code: '', tipo: 'percent', valor: '', min_order: '', uso_max: '', validade: '', descricao: '' });

  const load = async () => {
    setLoading(true);
    const r = await base44.functions.invoke('manageCoupons', { action: 'list' });
    setCoupons(r?.coupons || []);
    setLoading(false);
  };
  React.useEffect(() => { load(); }, []);

  const criar = async (e) => {
    e.preventDefault();
    if (!form.code.trim() || !form.valor) { toast.error('Preencha código e valor'); return; }
    setSaving(true);
    const r = await base44.functions.invoke('manageCoupons', {
      action: 'create',
      code: form.code, tipo: form.tipo, valor: Number(form.valor),
      min_order: form.min_order ? Number(form.min_order) : 0,
      uso_max: form.uso_max ? parseInt(form.uso_max, 10) : null,
      validade: form.validade ? new Date(form.validade).toISOString() : null,
      descricao: form.descricao || null,
    });
    setSaving(false);
    if (!r?.success) { toast.error(r?.error || 'Falha ao criar'); return; }
    toast.success('🎟️ Cupom criado!');
    setForm({ code: '', tipo: 'percent', valor: '', min_order: '', uso_max: '', validade: '', descricao: '' });
    load();
  };

  const toggle = async (c) => { await base44.functions.invoke('manageCoupons', { action: 'toggle', id: c.id, active: !c.active }); load(); };
  const excluir = async (c) => { if (!window.confirm(`Excluir o cupom ${c.code}?`)) return; await base44.functions.invoke('manageCoupons', { action: 'delete', id: c.id }); load(); };

  const inp = 'bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-green-500 focus:outline-none w-full';

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2 mb-6"><Ticket className="w-7 h-7 text-yellow-400" /> Cupons de Desconto</h1>

        {/* criar */}
        <form onSubmit={criar} className="bg-gray-800/50 border border-gray-700 rounded-2xl p-5 mb-8">
          <h2 className="font-bold mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-green-400" /> Novo cupom</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-400">Código</label>
              <input className={inp + ' uppercase font-bold'} placeholder="EX: BEMVINDO10" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            </div>
            <div>
              <label className="text-xs text-gray-400">Tipo</label>
              <select className={inp} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                <option value="percent">Percentual (%)</option>
                <option value="fixed">Valor fixo (R$)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400">{form.tipo === 'percent' ? 'Desconto (%)' : 'Desconto (R$)'}</label>
              <input className={inp} type="number" step="0.01" placeholder={form.tipo === 'percent' ? '10' : '20'} value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-gray-400">Pedido mínimo (R$)</label>
              <input className={inp} type="number" step="0.01" placeholder="0" value={form.min_order} onChange={(e) => setForm({ ...form, min_order: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-gray-400">Limite de usos</label>
              <input className={inp} type="number" placeholder="ilimitado" value={form.uso_max} onChange={(e) => setForm({ ...form, uso_max: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-gray-400">Validade</label>
              <input className={inp} type="date" value={form.validade} onChange={(e) => setForm({ ...form, validade: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-400">Descrição (opcional)</label>
              <input className={inp} placeholder="10% de boas-vindas" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>
          </div>
          <button disabled={saving} className="mt-4 px-6 py-2.5 rounded-xl font-bold bg-green-600 hover:bg-green-500 disabled:opacity-60">
            {saving ? 'Criando…' : 'Criar cupom'}
          </button>
        </form>

        {/* lista */}
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-green-400" /></div>
        ) : coupons.length === 0 ? (
          <p className="text-gray-500 text-center py-10">Nenhum cupom criado ainda.</p>
        ) : (
          <div className="space-y-2">
            {coupons.map((c) => (
              <div key={c.id} className={`flex items-center gap-4 bg-gray-800/50 border rounded-xl p-4 ${c.active ? 'border-gray-700' : 'border-gray-800 opacity-60'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-yellow-300">{c.code}</span>
                    <span className="text-xs bg-green-600/20 text-green-300 rounded px-2 py-0.5">{c.tipo === 'percent' ? `${c.valor}%` : money(c.valor)}</span>
                    {!c.active && <span className="text-xs text-gray-500">(inativo)</span>}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {c.descricao && <span>{c.descricao} · </span>}
                    {Number(c.min_order) > 0 && <span>mín. {money(c.min_order)} · </span>}
                    {c.uso_max ? <span>{c.uso_count}/{c.uso_max} usos · </span> : <span>{c.uso_count} usos · </span>}
                    {c.validade ? <span>vence {new Date(c.validade).toLocaleDateString('pt-BR')}</span> : <span>sem validade</span>}
                  </div>
                </div>
                <button onClick={() => toggle(c)} title={c.active ? 'Desativar' : 'Ativar'} className={`p-2 rounded-lg ${c.active ? 'text-green-400 hover:bg-green-500/10' : 'text-gray-500 hover:bg-gray-700'}`}><Power className="w-4 h-4" /></button>
                <button onClick={() => excluir(c)} title="Excluir" className="p-2 rounded-lg text-red-400 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
