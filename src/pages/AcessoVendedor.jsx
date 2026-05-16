import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import bcrypt from 'bcryptjs';
import { Eye, EyeOff, CheckCircle, AlertCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const AppUser = base44.entities.AppUser;

export default function AcessoVendedor() {
  const [view, setView] = useState('loading');
  const [seller, setSeller] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('t');
    if (!t) { setView('error'); return; }
    validateToken(t);
  }, []);

  const validateToken = async (t) => {
    try {
      // Busca todos os vendedores (is_seller=true) e filtra pelo token
      const results = await AppUser.filter({ is_seller: true });
      const user = results.find(u => u.access_token === t);
      if (!user) { setView('error'); return; }
      if (user.access_token_expires && new Date() > new Date(user.access_token_expires)) { setView('error'); return; }
      setSeller(user);
      setView('form');
    } catch (e) { setView('error'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!newPassword || newPassword.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return; }
    if (newPassword !== confirmPassword) { setError('As senhas não coincidem.'); return; }
    setIsSubmitting(true);
    try {
      const hashed = bcrypt.hashSync(newPassword, bcrypt.genSaltSync(10));
      await AppUser.update(seller.id, { password: hashed, access_token: null, access_token_expires: null });
      localStorage.setItem('currentUser', JSON.stringify({ ...seller, password: hashed }));
      sessionStorage.setItem('isLoggedIn', 'true');
      setView('success');
      setTimeout(() => { window.location.href = '/Home'; }, 2000);
    } catch (e) { setError('Erro ao salvar. Tente novamente.'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {view === 'loading' && <div className="text-center text-white">Validando link...</div>}
        {view === 'error' && (
          <div className="bg-gray-800 rounded-2xl p-8 text-center">
            <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Link inválido ou expirado</h2>
            <p className="text-gray-400 mb-6">Solicite um novo link ao administrador.</p>
          </div>
        )}
        {view === 'form' && seller && (
          <div className="bg-gray-800 rounded-2xl p-8">
            <div className="text-center mb-6">
              <Lock className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-white">Olá, {seller.full_name?.split(' ')[0]}! 👋</h2>
              <p className="text-gray-400 mt-1">Defina sua senha para acessar o painel.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-gray-300">Nova senha</Label>
                <div className="relative mt-1">
                  <Input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="bg-gray-700 border-gray-600 text-white pr-10" />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                </div>
              </div>
              <div>
                <Label className="text-gray-300">Confirmar senha</Label>
                <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repita a senha" className="bg-gray-700 border-gray-600 text-white mt-1" />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <Button type="submit" disabled={isSubmitting} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3">
                {isSubmitting ? 'Salvando...' : '✅ Definir senha e entrar'}
              </Button>
            </form>
          </div>
        )}
        {view === 'success' && (
          <div className="bg-gray-800 rounded-2xl p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white">Senha definida! 🎉</h2>
            <p className="text-gray-400">Redirecionando...</p>
          </div>
        )}
      </div>
    </div>
  );
}