import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ShieldCheck, ArrowDownToLine, Loader2, Check, X, ExternalLink } from 'lucide-react';

const money = (n) => 'R$ ' + (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
const cpfMask = (c) => { const d = String(c || '').replace(/\D/g, ''); return d.length === 11 ? `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}` : c; };

export default function AdminFinanceiro() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState({ kyc: [], withdrawals: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  const load = async (u) => {
    const r = await base44.functions.invoke('getAdminFinanceQueue', { actor_id: u.id });
    if (r?.success) setData({ kyc: r.kyc || [], withdrawals: r.withdrawals || [] });
    else if (r?.error) toast.error(r.error);
    setLoading(false);
  };
  useEffect(() => {
    let u = null; try { u = JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { u = null; }
    setUser(u);
    if (u?.id) load(u); else setLoading(false);
  }, []);

  const reviewKyc = async (userId, decision) => {
    let reason = null;
    if (decision === 'reprovado') { reason = window.prompt('Motivo da reprovação:') || 'Documentos inválidos'; }
    setBusy('k' + userId);
    const r = await base44.functions.invoke('reviewKyc', { actor_id: user.id, user_id: userId, decision, reason });
    if (r?.success) { toast.success(decision === 'aprovado' ? 'KYC aprovado' : 'KYC reprovado'); await load(user); } else toast.error(r?.error || 'Erro');
    setBusy('');
  };
  const reviewSaque = async (id, decision) => {
    let reason = null;
    if (decision === 'reject') { reason = window.prompt('Motivo da rejeição:') || 'Rejeitado'; }
    setBusy('w' + id);
    const r = await base44.functions.invoke('approveWithdrawal', { actor_id: user.id, withdrawal_id: id, decision, reason });
    if (r?.success) { toast.success(decision === 'approve' ? 'Saque marcado como pago' : 'Saque rejeitado'); await load(user); } else toast.error(r?.error || 'Erro');
    setBusy('');
  };

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando…</div>;
  if (!user || !['admin', 'super_admin'].includes(user.role)) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-400">Acesso restrito ao admin.</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-black">⚙️ Financeiro — Revisão</h1>

        {/* KYC */}
        <section>
          <h2 className="font-bold flex items-center gap-2 mb-3"><ShieldCheck className="w-5 h-5 text-green-400" /> KYC em análise ({data.kyc.length})</h2>
          {data.kyc.length === 0 ? <p className="text-sm text-gray-400">Nenhum KYC pendente.</p> : (
            <div className="space-y-3">
              {data.kyc.map((k) => (
                <div key={k.user_id} className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div><div className="font-bold">{k.full_name}</div><div className="text-xs text-gray-400">{k.email} · CPF {cpfMask(k.cpf)}</div></div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => reviewKyc(k.user_id, 'aprovado')} disabled={busy === 'k' + k.user_id} className="bg-green-600 hover:bg-green-700"><Check className="w-4 h-4 mr-1" /> Aprovar</Button>
                      <Button size="sm" onClick={() => reviewKyc(k.user_id, 'reprovado')} disabled={busy === 'k' + k.user_id} variant="outline" className="border-red-500 text-red-400"><X className="w-4 h-4 mr-1" /> Reprovar</Button>
                    </div>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    {[['doc_front', 'Doc frente'], ['doc_back', 'Doc verso'], ['selfie', 'Selfie'], ['address_proof', 'Endereço']].map(([f, label]) => k[f] ? (
                      <a key={f} href={k[f]} target="_blank" rel="noreferrer" className="group relative">
                        <img src={k[f]} alt={label} className="w-20 h-20 object-cover rounded-lg border border-gray-600" />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-lg text-[10px]"><ExternalLink className="w-4 h-4" /></span>
                        <span className="text-[10px] text-gray-400 block text-center mt-0.5">{label}</span>
                      </a>
                    ) : null)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Saques */}
        <section>
          <h2 className="font-bold flex items-center gap-2 mb-3"><ArrowDownToLine className="w-5 h-5 text-yellow-400" /> Saques pendentes ({data.withdrawals.length})</h2>
          {data.withdrawals.length === 0 ? <p className="text-sm text-gray-400">Nenhum saque pendente.</p> : (
            <div className="space-y-2">
              {data.withdrawals.map((s) => (
                <div key={s.id} className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 flex items-center justify-between">
                  <div><div className="font-bold">{s.user_name} · <span className="text-green-400">{money(s.valor)}</span></div><div className="text-xs text-gray-400">PIX (CPF): {cpfMask(s.pix_key)}</div></div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => reviewSaque(s.id, 'approve')} disabled={busy === 'w' + s.id} className="bg-green-600 hover:bg-green-700"><Check className="w-4 h-4 mr-1" /> Pago</Button>
                    <Button size="sm" onClick={() => reviewSaque(s.id, 'reject')} disabled={busy === 'w' + s.id} variant="outline" className="border-red-500 text-red-400"><X className="w-4 h-4 mr-1" /> Rejeitar</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
