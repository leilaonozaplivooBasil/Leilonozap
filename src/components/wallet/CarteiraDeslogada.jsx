import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wallet, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Estado deslogado da /Carteira: antes só aparecia a frase "Faça login para ver
// sua carteira." — sem nenhum botão, deixando a pessoa sem saída na página.
export default function CarteiraDeslogada() {
  const navigate = useNavigate();

  // A /Carteira renderiza fora do Layout, e quem escuta 'openLoginModal' é o
  // Layout. Então navega pra uma página com Layout e só então pede o modal.
  const abrirLogin = () => {
    navigate('/leiloes');
    // o Layout (dono do modal) só monta depois do chunk da rota carregar —
    // por isso o pedido é repetido algumas vezes até alguém escutar.
    [400, 900, 1600].forEach((ms) =>
      setTimeout(() => window.dispatchEvent(new Event('openLoginModal')), ms)
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center bg-emerald-500/15 ring-2 ring-emerald-400/40 mb-5">
          <Wallet className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="font-slab text-2xl font-extrabold mb-2">Sua Carteira NoZap</h1>
        <p className="text-sm text-gray-400 mb-6">
          Entre na sua conta para ver saldo, comissões e sacar via PIX.
        </p>
        <Button onClick={abrirLogin} className="w-full h-12 bg-green-600 hover:bg-green-700 font-bold">
          <LogIn className="w-4 h-4 mr-2" /> Entrar na minha conta
        </Button>
        <p className="text-sm text-gray-400 mt-4">
          Ainda não tem conta?{' '}
          <Link to="/Cadastro" className="text-emerald-400 font-semibold hover:underline">
            Criar conta grátis
          </Link>
        </p>
      </div>
    </div>
  );
}