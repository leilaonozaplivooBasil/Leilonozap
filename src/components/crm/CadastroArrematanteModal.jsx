import React, { useState } from 'react';
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

export default function CadastroArrematanteModal({ onClose, onSuccess }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [platformCommission, setPlatformCommission] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
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

      // Verifica duplicatas
      const [byEmail, byPhone, byCpf] = await Promise.all([
        AppUser.filter({ email: normalizedEmail }),
        phoneDigits ? AppUser.filter({ phone: phoneDigits }) : Promise.resolve([]),
        cpfDigits ? AppUser.filter({ cpf: cpfDigits }) : Promise.resolve([]),
      ]);

      if ((byEmail?.length || 0) > 0) { setError('E-mail já cadastrado.'); setIsLoading(false); return; }
      if (phoneDigits && (byPhone?.length || 0) > 0) { setError('Telefone já cadastrado.'); setIsLoading(false); return; }
      if (cpfDigits && (byCpf?.length || 0) > 0) { setError('CPF já cadastrado.'); setIsLoading(false); return; }

      // Gera senha temporária aleatória
      const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(tempPassword, salt);

      // Gera token de primeiro acesso (válido por 7 dias)
      const resetToken = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      const resetExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const nameParts = fullName.trim().split(/\s+/);
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
        partner_plan_amount: platformCommission ? parseFloat(platformCommission) : undefined,
        password_reset_token: resetToken,
        password_reset_expires: resetExpires,
      });

      // Envia e-mail de boas-vindas via Brevo (backend function)
      if (sendEmail) {
        const resetLink = `https://leilaonozap.net/ResetPassword?token=${encodeURIComponent(resetToken)}`;
        await sendWelcomeArrematante({
          email: normalizedEmail,
          fullName: fullName.trim(),
          resetLink
        });
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
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 w-full max-w-lg shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <UserPlus size={18} className="text-violet-400" />
            </div>
            <h3 className="font-bold text-white text-lg">Cadastrar Arrematante</h3>
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
            <p className="text-white font-bold text-lg">Arrematante cadastrado!</p>
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
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Nome completo"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">E-mail *</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Telefone *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="(XX) XXXXX-XXXX"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">CPF *</label>
                <input
                  type="text"
                  value={cpf}
                  onChange={e => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Cidade</label>
                <input
                  type="text"
                  value={addressCity}
                  onChange={e => setAddressCity(e.target.value)}
                  placeholder="Cidade"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Estado</label>
                <input
                  type="text"
                  value={addressState}
                  onChange={e => setAddressState(e.target.value.toUpperCase())}
                  placeholder="UF"
                  maxLength={2}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 uppercase"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  % Comissão da Plataforma
                  <span className="ml-2 normal-case font-normal text-slate-600">(opcional)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={platformCommission}
                    onChange={e => setPlatformCommission(e.target.value)}
                    placeholder="Ex: 10"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 pr-8 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">%</span>
                </div>
              </div>
            </div>

            {/* Opção de envio de e-mail */}
            <div
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${sendEmail ? 'border-violet-500/50 bg-violet-900/10' : 'border-[#30363d] bg-[#0d1117]'}`}
              onClick={() => setSendEmail(v => !v)}
            >
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${sendEmail ? 'bg-violet-500 border-violet-400' : 'border-slate-600'}`}>
                {sendEmail && <CheckCircle2 size={12} className="text-white" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Enviar e-mail de boas-vindas</p>
                <p className="text-xs text-slate-500">O arrematante receberá um link para definir sua senha de acesso.</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-[#0d1117] border border-[#30363d] text-slate-400 hover:text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
              >
                {isLoading ? <><Loader2 size={14} className="animate-spin" /> Cadastrando...</> : <><UserPlus size={14} /> Cadastrar</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}