import React, { useState, useEffect, useRef } from 'react';
import { X, UserPlus, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import bcrypt from 'bcryptjs';
import { sendWelcomeArrematante } from '@/functions/sendWelcomeArrematante';

const AppUser = base44.entities.AppUser;

const validateCPF = (raw) => {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  return rest === parseInt(digits[10]);
};

export default function CadastroInvestidorModal({ onClose, onSuccess }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [arrematanteCommission, setArrematanteCommission] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [currentArrematante, setCurrentArrematante] = useState(null);
  const [platformFee, setPlatformFee] = useState(0);
  // SEGURANÇA: Ref para bloquear submits duplicados mesmo se o estado async ainda não atualizou
  const isSubmittingRef = useRef(false);

  // Carrega dados do arrematante logado para pegar a % do admin
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentArrematante(user);
      setPlatformFee(user.partner_plan_amount || 0);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // SEGURANÇA: Bloqueia segundo submit enquanto o primeiro ainda está processando
    if (isSubmittingRef.current || isLoading) return;
    isSubmittingRef.current = true;
    setError('');

    if (!fullName || !email || !phone || !cpf) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }
    if (!email.includes('@')) {
      setError('E-mail inválido.');
      return;
    }
    if (!validateCPF(cpf)) {
      setError('CPF inválido.');
      return;
    }

    setIsLoading(true);
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const phoneDigits = phone.replace(/\D/g, '');
      const cpfDigits = cpf.replace(/\D/g, '');

      const [byEmail, byPhone, byCpf] = await Promise.all([
        AppUser.filter({ email: normalizedEmail }),
        phoneDigits ? AppUser.filter({ phone: phoneDigits }) : Promise.resolve([]),
        cpfDigits ? AppUser.filter({ cpf: cpfDigits }) : Promise.resolve([]),
      ]);

      if ((byEmail?.length || 0) > 0) { setError('E-mail já cadastrado.'); setIsLoading(false); return; }
      if (phoneDigits && (byPhone?.length || 0) > 0) { setError('Telefone já cadastrado.'); setIsLoading(false); return; }
      if (cpfDigits && (byCpf?.length || 0) > 0) { setError('CPF já cadastrado.'); setIsLoading(false); return; }

      const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(tempPassword, salt);

      const resetToken = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      const resetExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const nameParts = fullName.trim().split(/\s+/);
      const arrematanteComm = arrematanteCommission ? parseFloat(arrematanteCommission) : 0;
      const totalFee = platformFee + arrematanteComm;

      const newUser = await AppUser.create({
        full_name: fullName.trim(),
        display_first_name: nameParts[0] || null,
        display_last_name: nameParts.length > 1 ? nameParts[nameParts.length - 1] : null,
        email: normalizedEmail,
        phone: phoneDigits,
        cpf: cpfDigits,
        password: hashedPassword,
        role: 'investidor',
        address_city: addressCity,
        address_state: addressState,
        referred_by_id: currentArrematante?.id || null,
        arrematante_responsavel_id: currentArrematante?.id || null,
        arrematante_commission_percentage: arrematanteComm,
        total_operation_fee_percentage: totalFee,
        password_reset_token: resetToken,
        password_reset_expires: resetExpires,
      });

      if (sendEmail) {
        const resetLink = `https://leilaonozap.net/ResetPassword?token=${encodeURIComponent(resetToken)}`;
        try {
          await sendWelcomeArrematante({
            email: normalizedEmail,
            fullName: fullName.trim(),
            resetLink,
            role: 'investidor'
          });
        } catch (emailErr) {
          console.warn('E-mail de boas-vindas não enviado (não crítico):', emailErr.message);
        }
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess && onSuccess(newUser);
        onClose();
      }, 1800);

    } catch (err) {
      setError('Erro ao cadastrar: ' + (err.message || 'Tente novamente.'));
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false; // SEGURANÇA: Libera para novas tentativas após erro
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <UserPlus size={18} className="text-emerald-400" />
            </div>
            <h3 className="font-bold text-white text-lg">Cadastrar Investidor</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="text-emerald-400" size={28} />
            </div>
            <p className="text-white font-bold text-lg">Investidor cadastrado!</p>
            {sendEmail && <p className="text-slate-400 text-sm mt-2">E-mail enviado com link de acesso.</p>}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-900/20 border border-red-500/40 rounded-lg p-3 flex items-center gap-2">
                <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nome Completo *</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nome completo"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">E-mail *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Telefone *</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(XX) XXXXX-XXXX"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">CPF *</label>
                <input type="text" value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Cidade</label>
                <input type="text" value={addressCity} onChange={e => setAddressCity(e.target.value)} placeholder="Cidade"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Estado</label>
                <input type="text" value={addressState} onChange={e => setAddressState(e.target.value.toUpperCase())} placeholder="UF" maxLength={2}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 uppercase" />
              </div>

              {/* Comissão do Arrematante */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  % Sua Comissão (Arrematante) *
                </label>
                <div className="relative">
                  <input
                    type="number" min="0" max="100" step="0.5"
                    value={arrematanteCommission}
                    onChange={e => setArrematanteCommission(e.target.value)}
                    placeholder="Ex: 5"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 pr-8 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">%</span>
                </div>
              </div>

              {/* Resumo da taxa */}
              <div className="sm:col-span-2 bg-[#0d1117] border border-[#30363d] rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Resumo da Taxa de Operação</p>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Taxa Plataforma (Admin)</span>
                  <span className="text-violet-400 font-bold">{platformFee}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Sua Comissão (Arrematante)</span>
                  <span className="text-emerald-400 font-bold">{arrematanteCommission ? parseFloat(arrematanteCommission) : 0}%</span>
                </div>
                <div className="border-t border-[#30363d] pt-2 flex justify-between text-sm">
                  <span className="text-white font-bold">Taxa Total para o Investidor</span>
                  <span className="text-amber-400 font-black text-base">{(platformFee + (arrematanteCommission ? parseFloat(arrematanteCommission) : 0)).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${sendEmail ? 'border-emerald-500/50 bg-emerald-900/10' : 'border-[#30363d] bg-[#0d1117]'}`}
              onClick={() => setSendEmail(v => !v)}
            >
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${sendEmail ? 'bg-emerald-500 border-emerald-400' : 'border-slate-600'}`}>
                {sendEmail && <CheckCircle2 size={12} className="text-white" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Enviar e-mail de boas-vindas</p>
                <p className="text-xs text-slate-500">O investidor receberá um link para definir sua senha de acesso.</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 bg-[#0d1117] border border-[#30363d] text-slate-400 hover:text-white font-bold py-2.5 rounded-xl transition-colors text-sm">
                Cancelar
              </button>
              <button type="submit" disabled={isLoading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
                {isLoading ? <><Loader2 size={14} className="animate-spin" /> Cadastrando...</> : <><UserPlus size={14} /> Cadastrar</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}