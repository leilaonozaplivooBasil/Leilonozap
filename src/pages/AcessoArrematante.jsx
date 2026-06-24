import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import bcrypt from 'bcryptjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, Eye, EyeOff, AlertCircle, Mail, KeyRound, CheckCircle, ArrowLeft } from 'lucide-react';

const AppUser = base44.entities.AppUser;

export default function AcessoArrematante() {
  const navigate = useNavigate();

  // Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [error, setError] = useState('');

  // Recuperação de senha: view = 'login' | 'reset_email' | 'reset_code' | 'reset_password'
  const [view, setView] = useState('login');
  const [resetEmail, setResetEmail] = useState('');
  const [resetUserId, setResetUserId] = useState(null);
  const [generatedCode, setGeneratedCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Preencha e-mail e senha.');
      return;
    }

    setIsLogging(true);
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const users = await AppUser.filter({ email: normalizedEmail });

      if (!users || users.length === 0) {
        setError('E-mail não encontrado.');
        return;
      }

      const user = users[0];
      const stored = user.password;
      const isBcrypt = stored && stored.startsWith('$2');
      const valid = isBcrypt
        ? bcrypt.compareSync(password, stored)
        : stored === password;

      if (!valid) {
        setError('Senha incorreta.');
        return;
      }

      // Auto-migra senha legada para bcrypt (não bloqueante)
      if (!isBcrypt) {
        const hashed = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
        AppUser.update(user.id, { password: hashed }).catch((e) => console.warn('Falha ao migrar senha p/ bcrypt:', e?.message));
      }

      localStorage.setItem('currentUser', JSON.stringify(user));
      sessionStorage.setItem('isLoggedIn', 'true');

      // 🆕 FASE 2: pede ao Layout abrir o seletor de painéis após o reload
      try { sessionStorage.setItem('pendingPanelSelector', '1'); } catch (_) {}

      const isAdmin = user.role === 'admin' || user.email === 'luizsantanna@tttcorporate.com';
      
      // Marca origem do login para o Layout não sobrescrever
      sessionStorage.setItem('loginSource', 'arrematante');
      
      const dest = isAdmin
        ? '/SistemaDeArremate'
        : user.role === 'investidor'
          ? '/MarketplaceLotes'
          : user.role === 'leiloeiro'
            ? '/CRMInvestidores'
            : '/Home';

      console.log('🔑 AcessoArrematante: redirecionando para', dest, 'role:', user.role, 'email:', user.email, 'isAdmin:', isAdmin);
      
      window.location.href = dest;

    } catch (err) {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setIsLogging(false);
    }
  };

  const handleSendCode = async (e) => {
    if (e) e.preventDefault();
    setResetMessage('');
    setIsResetting(true);
    try {
      const normalized = resetEmail.toLowerCase().trim();
      const users = await AppUser.filter({ email: normalized });

      // Segurança: não revela se o e-mail existe
      if (!users || users.length === 0) {
        setResetMessage('Se o e-mail estiver cadastrado, o código foi enviado.');
        setIsResetting(false);
        return;
      }

      const user = users[0];
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedCode(code);
      setResetUserId(user.id);

      await base44.functions.invoke('sendPasswordResetEmail', {
        email: normalized,
        code,
        userName: user.full_name?.split(' ')[0] || 'Usuário'
      });

      setView('reset_code');
      setResetMessage('Código enviado! Verifique seu e-mail.');
    } catch (err) {
      setResetMessage('Erro ao enviar código. Tente novamente.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleVerifyCode = (e) => {
    e.preventDefault();
    if (inputCode.trim() === generatedCode.trim()) {
      setView('reset_password');
      setResetMessage('');
    } else {
      setResetMessage('Código incorreto. Verifique e tente novamente.');
    }
  };

  const handleSetNewPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { setResetMessage('Mínimo 6 caracteres.'); return; }
    if (newPassword !== confirmPassword) { setResetMessage('As senhas não coincidem.'); return; }
    setIsResetting(true);
    try {
      await base44.functions.invoke('updateUserPassword', {
        user_id: resetUserId,
        new_password: newPassword
      });
      // Volta ao login com mensagem de sucesso
      setView('login');
      setError('✅ Senha alterada com sucesso! Faça login com a nova senha.');
      setResetEmail(''); setInputCode(''); setNewPassword('');
      setConfirmPassword(''); setGeneratedCode(''); setResetUserId(null); setResetMessage('');
    } catch (err) {
      setResetMessage('Erro ao salvar senha. Tente novamente.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png"
            alt="Leilão NoZap"
            className="h-16 w-auto mx-auto mb-4"
          />
          <h1 className="text-xl font-bold text-white">Painel do Arrematante</h1>
          <p className="text-slate-400 text-sm mt-1">Acesse sua conta para participar dos lotes</p>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-2xl">

          {/* ── VIEW: LOGIN ── */}
          {view === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <LogIn size={18} className="text-emerald-400" /> Entrar
              </h2>

              {error && (
                <div className={`rounded-lg p-3 flex items-start gap-2 text-sm ${
                  error.startsWith('✅')
                    ? 'bg-emerald-900/20 border border-emerald-500/40 text-emerald-300'
                    : 'bg-red-900/20 border border-red-500/40 text-red-300'
                }`}>
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <div>
                <Label className="text-slate-400 text-xs uppercase tracking-wider">E-mail</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="bg-[#0d1117] border-[#30363d] text-white h-11 mt-1"
                  disabled={isLogging}
                  autoComplete="email"
                />
              </div>

              <div>
                <Label className="text-slate-400 text-xs uppercase tracking-wider">Senha</Label>
                <div className="relative mt-1">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Sua senha"
                    className="bg-[#0d1117] border-[#30363d] text-white h-11 pr-10"
                    disabled={isLogging}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setView('reset_email'); setError(''); setResetMessage(''); }}
                className="text-emerald-400 text-xs hover:underline"
              >
                Esqueci minha senha
              </button>

              <Button
                type="submit"
                disabled={isLogging || !email || !password}
                className="w-full bg-emerald-600 hover:bg-emerald-500 h-11 font-bold"
              >
                {isLogging
                  ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Entrando...</span>
                  : <span className="flex items-center gap-2"><LogIn size={16} /> Entrar</span>
                }
              </Button>
            </form>
          )}

          {/* ── VIEW: INFORME E-MAIL PARA RESET ── */}
          {view === 'reset_email' && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <button type="button" onClick={() => setView('login')} className="text-slate-400 hover:text-white flex items-center gap-1 text-sm">
                <ArrowLeft size={14} /> Voltar
              </button>
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <Mail size={18} className="text-emerald-400" /> Recuperar Senha
              </h2>
              <p className="text-slate-400 text-sm">Informe seu e-mail. Enviaremos um código de verificação.</p>

              {resetMessage && (
                <div className="bg-blue-900/20 border border-blue-500/40 rounded-lg p-3 text-blue-300 text-sm">{resetMessage}</div>
              )}

              <div>
                <Label className="text-slate-400 text-xs uppercase tracking-wider">E-mail</Label>
                <Input
                  type="email"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="bg-[#0d1117] border-[#30363d] text-white h-11 mt-1"
                  disabled={isResetting}
                />
              </div>

              <Button type="submit" disabled={isResetting || !resetEmail} className="w-full bg-emerald-600 hover:bg-emerald-500 h-11 font-bold">
                {isResetting ? 'Enviando...' : 'Enviar Código'}
              </Button>
            </form>
          )}

          {/* ── VIEW: VERIFICAR CÓDIGO ── */}
          {view === 'reset_code' && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <KeyRound size={18} className="text-emerald-400" /> Verificar Código
              </h2>
              <p className="text-slate-400 text-sm">
                Digite o código de 6 dígitos enviado para <strong className="text-white">{resetEmail}</strong>.
              </p>

              {resetMessage && (
                <div className="bg-red-900/20 border border-red-500/40 rounded-lg p-3 text-red-300 text-sm">{resetMessage}</div>
              )}

              <Input
                type="text"
                value={inputCode}
                onChange={e => setInputCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="bg-[#0d1117] border-[#30363d] text-white h-11 text-center text-2xl tracking-widest font-mono"
                maxLength={6}
              />

              <Button type="submit" disabled={inputCode.length !== 6} className="w-full bg-emerald-600 hover:bg-emerald-500 h-11 font-bold">
                Verificar Código
              </Button>
              <button type="button" onClick={handleSendCode} className="text-emerald-400 text-xs hover:underline w-full text-center">
                Não recebeu? Reenviar código
              </button>
            </form>
          )}

          {/* ── VIEW: DEFINIR NOVA SENHA ── */}
          {view === 'reset_password' && (
            <form onSubmit={handleSetNewPassword} className="space-y-4">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <CheckCircle size={18} className="text-emerald-400" /> Nova Senha
              </h2>
              <p className="text-slate-400 text-sm">Defina sua nova senha (mínimo 6 caracteres).</p>

              {resetMessage && (
                <div className="bg-red-900/20 border border-red-500/40 rounded-lg p-3 text-red-300 text-sm">{resetMessage}</div>
              )}

              <div>
                <Label className="text-slate-400 text-xs uppercase tracking-wider">Nova Senha</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="bg-[#0d1117] border-[#30363d] text-white h-11 mt-1"
                  disabled={isResetting}
                />
              </div>
              <div>
                <Label className="text-slate-400 text-xs uppercase tracking-wider">Confirmar Senha</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  className="bg-[#0d1117] border-[#30363d] text-white h-11 mt-1"
                  disabled={isResetting}
                />
              </div>

              <Button
                type="submit"
                disabled={isResetting || !newPassword || newPassword !== confirmPassword}
                className="w-full bg-emerald-600 hover:bg-emerald-500 h-11 font-bold"
              >
                {isResetting ? 'Salvando...' : 'Salvar Nova Senha'}
              </Button>
            </form>
          )}

        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          © Leilão NoZap — Acesso exclusivo para arrematantes cadastrados
        </p>
      </div>
    </div>
  );
}