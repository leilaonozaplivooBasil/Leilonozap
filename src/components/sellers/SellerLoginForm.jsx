import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import bcrypt from 'bcryptjs';
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react';

export default function SellerLoginForm({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Preencha email e senha.');
      return;
    }

    setIsLoading(true);
    try {
      const users = await base44.entities.AppUser.filter({ email: email.trim().toLowerCase() });

      if (!users || users.length === 0) {
        setError('E-mail ou senha incorretos.');
        return;
      }

      const user = users[0];

      if (!user.is_seller && user.role !== 'admin') {
        setError('Acesso não autorizado para este perfil.');
        return;
      }

      const senhaValida = bcrypt.compareSync(password, user.password || '');
      if (!senhaValida) {
        setError('E-mail ou senha incorretos.');
        return;
      }

      // Salva com o ID real do banco
      localStorage.setItem('currentUser', JSON.stringify(user));
      sessionStorage.setItem('isLoggedIn', 'true');

      onSuccess(user);
    } catch (err) {
      console.error('[SellerLogin] Erro:', err);
      setError('Erro ao autenticar. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png"
            alt="Leilão NoZap"
            className="h-12 w-auto mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-white">Painel do Vendedor</h1>
          <p className="text-gray-400 mt-1 text-sm">Entre com suas credenciais</p>
        </div>

        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 placeholder:text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••"
                  autoComplete="current-password"
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-green-500 placeholder:text-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 min-h-[44px]"
            >
              {isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Entrando...</>
              ) : (
                <><LogIn className="h-4 w-4" /> Entrar</>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-500 text-xs mt-4">
          Primeiro acesso? Use o link enviado pelo seu gestor.
        </p>
      </div>
    </div>
  );
}