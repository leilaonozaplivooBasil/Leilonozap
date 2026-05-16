import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import bcrypt from 'bcryptjs';
import { Eye, EyeOff, CheckCircle, AlertCircle, Lock, Loader2 } from 'lucide-react';

export default function AcessoVendedor() {
  const [view, setView] = useState('loading'); // loading | form | success | error
  const [seller, setSeller] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('t');
    const userId = params.get('u');

    if (!token) {
      setErrorMsg('Nenhum token encontrado na URL.');
      setView('error');
      return;
    }

    validateToken(token, userId);
  }, []);

  const validateToken = async (token, userId) => {
    try {
      // Busca diretamente na entidade — sem função intermediária
      let users = [];

      if (userId) {
        try {
          const u = await base44.entities.AppUser.filter({ id: userId });
          if (u && u.length > 0 && u[0].access_token === token) {
            users = u;
          }
        } catch (e) { /* fallback abaixo */ }
      }

      if (users.length === 0) {
        users = await base44.entities.AppUser.filter({ access_token: token });
      }

      if (!users || users.length === 0) {
        setErrorMsg('Token não encontrado. Solicite um novo link ao administrador.');
        setView('error');
        return;
      }

      const user = users[0];

      if (user.access_token_expires && new Date(user.access_token_expires) < new Date()) {
        setErrorMsg('Este link expirou. Solicite um novo link ao administrador.');
        setView('error');
        return;
      }

      setSeller(user);
      setView('form');
    } catch (e) {
      console.error('[AcessoVendedor] Erro na validação:', e);
      setErrorMsg('Erro ao validar o link. Tente novamente ou solicite um novo.');
      setView('error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!newPassword || newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setIsSubmitting(true);
    try {
      const hashed = bcrypt.hashSync(newPassword, bcrypt.genSaltSync(10));
      await base44.entities.AppUser.update(seller.id, {
        password: hashed,
        access_token: null,
        access_token_expires: null,
      });

      const updatedUser = { ...seller, password: hashed };
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      sessionStorage.setItem('isLoggedIn', 'true');

      setView('success');
      setTimeout(() => { window.location.href = '/SellerPanel'; }, 2000);
    } catch (e) {
      setError('Erro ao salvar a senha. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* LOADING */}
        {view === 'loading' && (
          <div className="text-center text-white">
            <Loader2 className="h-10 w-10 animate-spin text-green-500 mx-auto mb-3" />
            <p className="text-gray-400">Validando link de acesso...</p>
          </div>
        )}

        {/* ERRO */}
        {view === 'error' && (
          <div className="bg-gray-800 rounded-2xl p-8 text-center border border-gray-700">
            <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Link inválido ou expirado</h2>
            <p className="text-gray-400 text-sm">{errorMsg || 'Solicite um novo link ao administrador.'}</p>
          </div>
        )}

        {/* FORMULÁRIO */}
        {view === 'form' && seller && (
          <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700">
            <div className="text-center mb-6">
              <Lock className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-white">
                Olá, {seller.full_name?.split(' ')[0] || 'Vendedor'}! 👋
              </h2>
              <p className="text-gray-400 mt-1 text-sm">Defina sua senha para acessar o painel.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Nova senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                    onClick={() => setShowPassword(v => !v)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Confirmar senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</>
                ) : (
                  '✅ Definir senha e entrar'
                )}
              </button>
            </form>
          </div>
        )}

        {/* SUCESSO */}
        {view === 'success' && (
          <div className="bg-gray-800 rounded-2xl p-8 text-center border border-gray-700">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white">Senha definida! 🎉</h2>
            <p className="text-gray-400 mt-2">Redirecionando para o painel...</p>
          </div>
        )}

      </div>
    </div>
  );
}