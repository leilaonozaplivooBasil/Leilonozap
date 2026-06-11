import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Wallet, ShieldCheck, ShieldAlert, Clock, Upload, ArrowDownToLine, Loader2, CheckCircle2, XCircle } from 'lucide-react';

const money = (n) => 'R$ ' + (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const KYC = {
  nao_iniciado: { label: 'Não validado', cor: 'text-gray-400', Icon: ShieldAlert },
  em_analise: { label: 'Em análise', cor: 'text-yellow-400', Icon: Clock },
  aprovado: { label: 'Validado ✓', cor: 'text-green-400', Icon: ShieldCheck },
  reprovado: { label: 'Reprovado', cor: 'text-red-400', Icon: XCircle },
};
const onlyDigits = (s) => String(s || '').replace(/\D/g, '');

export default function Carteira() {
  const [user, setUser] = useState(null);
  const [w, setW] = useState(null);
  const [loading, setLoading] = useState(true);
  const [valor, setValor] = useState('');
  const [sacando, setSacando] = useState(false);
  // KYC form
  const [cpf, setCpf] = useState('');
  const [docs, setDocs] = useState({ doc_front: '', doc_back: '', selfie: '', address_proof: '' });
  const [uploading, setUploading] = useState('');
  const [enviandoKyc, setEnviandoKyc] = useState(false);

  const load = async (u) => {
    const r = await base44.functions.invoke('getMyWallet', { user_id: u.id });
    if (r?.success) { setW(r); setCpf(r.cpf || ''); }
    setLoading(false);
  };
  useEffect(() => {
    let u = null; try { u = JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { u = null; }
    setUser(u);
    if (u?.id) load(u); else setLoading(false);
  }, []);

  const upload = async (field, file) => {
    if (!file) return;
    setUploading(field);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (file_url) setDocs((d) => ({ ...d, [field]: file_url }));
      else toast.error('Falha no upload');
    } catch { toast.error('Falha no upload'); }
    setUploading('');
  };

  const enviarKyc = async () => {
    if (onlyDigits(cpf).length !== 11) { toast.error('CPF inválido'); return; }
    if (!docs.doc_front || !docs.selfie) { toast.error('Envie o documento (frente) e a selfie'); return; }
    setEnviandoKyc(true);
    const r = await base44.functions.invoke('submitKyc', { user_id: user.id, cpf: onlyDigits(cpf), pix_key: onlyDigits(cpf), pix_tipo: 'cpf', ...docs });
    if (r?.success) { toast.success(r.message || 'Enviado!'); await load(user); } else toast.error(r?.error || 'Erro');
    setEnviandoKyc(false);
  };

  const sacar = async () => {
    const v = Number(String(valor).replace(',', '.'));
    if (!v || v <= 0) { toast.error('Informe um valor válido'); return; }
    setSacando(true);
    const r = await base44.functions.invoke('requestWithdrawal', { user_id: user.id, valor: v });
    if (r?.success) { toast.success(r.message || 'Saque solicitado!'); setValor(''); await load(user); }
    else toast.error(r?.error || 'Erro ao sacar');
    setSacando(false);
  };

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando…</div>;
  if (!user) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-400">Faça login para ver sua carteira.</div>;

  const kyc = KYC[w?.kyc_status] || KYC.nao_iniciado;
  const aprovado = w?.kyc_status === 'aprovado';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center gap-2"><Wallet className="w-6 h-6 text-green-400" /><h1 className="text-2xl font-black">Minha Carteira</h1></div>

        {/* Saldo */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <div className="text-xs text-gray-400">Disponível</div>
            <div className="text-2xl font-black text-green-400">{money(w?.saldo_disponivel)}</div>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <div className="text-xs text-gray-400">Em saque</div>
            <div className="text-2xl font-black text-yellow-400">{money(w?.saldo_alocado)}</div>
          </div>
          <div className="bg-gray-700/40 border border-gray-600 rounded-xl p-4">
            <div className="text-xs text-gray-400">Comissões (total)</div>
            <div className="text-2xl font-black">{money(w?.commission_balance)}</div>
          </div>
        </div>

        {/* KYC */}
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold flex items-center gap-2"><kyc.Icon className={`w-5 h-5 ${kyc.cor}`} /> Validação de identidade (KYC)</h2>
            <span className={`text-sm font-semibold ${kyc.cor}`}>{kyc.label}</span>
          </div>
          {aprovado ? (
            <p className="text-sm text-green-400 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Tudo certo! Você já pode sacar — o PIX vai pro CPF {w?.cpf}.</p>
          ) : w?.kyc_status === 'em_analise' ? (
            <p className="text-sm text-yellow-300">📋 Seus documentos estão em análise. Você poderá sacar assim que for aprovado.</p>
          ) : (
            <div className="space-y-3">
              {w?.kyc_status === 'reprovado' && w?.kyc?.reject_reason && <p className="text-sm text-red-400">❌ Reprovado: {w.kyc.reject_reason}. Reenvie.</p>}
              <p className="text-sm text-gray-300">Pra sacar com segurança, valide sua identidade. <strong>O saque só vai pro PIX do seu CPF.</strong></p>
              <div>
                <label className="text-xs text-gray-400">CPF (sua chave PIX de saque)</label>
                <Input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" className="bg-gray-700 border-gray-600" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[['doc_front', 'Documento (frente) *'], ['doc_back', 'Documento (verso)'], ['selfie', 'Selfie com documento *'], ['address_proof', 'Comprovante de endereço']].map(([f, label]) => (
                  <label key={f} className={`flex flex-col items-center justify-center gap-1 p-3 rounded-lg border-2 border-dashed cursor-pointer ${docs[f] ? 'border-green-500 bg-green-500/10' : 'border-gray-600 hover:border-gray-500'}`}>
                    {uploading === f ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> : docs[f] ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Upload className="w-5 h-5 text-gray-400" />}
                    <span className="text-[11px] text-center text-gray-300">{docs[f] ? 'Enviado ✓' : label}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(f, e.target.files?.[0])} />
                  </label>
                ))}
              </div>
              <Button onClick={enviarKyc} disabled={enviandoKyc} className="w-full bg-green-600 hover:bg-green-700">
                {enviandoKyc ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando…</> : 'Enviar para validação'}
              </Button>
            </div>
          )}
        </div>

        {/* Saque */}
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5">
          <h2 className="font-bold flex items-center gap-2 mb-3"><ArrowDownToLine className="w-5 h-5 text-green-400" /> Sacar saldo</h2>
          {!aprovado ? (
            <p className="text-sm text-gray-400">🔒 Valide sua identidade (acima) para liberar o saque.</p>
          ) : (
            <div className="flex gap-2">
              <Input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Valor a sacar" className="bg-gray-700 border-gray-600" />
              <Button onClick={sacar} disabled={sacando} className="bg-green-600 hover:bg-green-700 whitespace-nowrap">
                {sacando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sacar via PIX'}
              </Button>
            </div>
          )}
        </div>

        {/* Extrato */}
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5">
          <h2 className="font-bold mb-3">Extrato</h2>
          {(!w?.commissions?.length && !w?.withdrawals?.length) ? (
            <p className="text-sm text-gray-400">Nenhuma movimentação ainda.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {(w?.withdrawals || []).map((s, i) => (
                <div key={'w' + i} className="flex items-center justify-between text-sm border-b border-gray-700/50 pb-2">
                  <span className="text-gray-300">Saque · <span className={s.status === 'paid' ? 'text-green-400' : s.status === 'rejected' ? 'text-red-400' : 'text-yellow-400'}>{s.status === 'paid' ? 'pago' : s.status === 'rejected' ? 'rejeitado' : 'pendente'}</span></span>
                  <span className="text-red-300 font-semibold">- {money(s.valor)}</span>
                </div>
              ))}
              {(w?.commissions || []).map((c, i) => (
                <div key={'c' + i} className="flex items-center justify-between text-sm border-b border-gray-700/50 pb-2">
                  <span className="text-gray-300">{c.role_in_sale === 'bonus_adesao' ? 'Bônus de adesão' : c.role_in_sale === 'venda_direta' ? 'Venda direta' : 'Override'} ({c.pct}%)</span>
                  <span className="text-green-400 font-semibold">+ {money(c.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
