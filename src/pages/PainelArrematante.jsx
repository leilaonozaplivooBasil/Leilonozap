import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Gavel } from 'lucide-react';
import usePainelArrematante from '@/components/arrematante/usePainelArrematante';
import ResumoCards from '@/components/arrematante/ResumoCards';
import DisputandoAgora from '@/components/arrematante/DisputandoAgora';
import ExtratoLances from '@/components/arrematante/ExtratoLances';
import UltimosArremates from '@/components/arrematante/UltimosArremates';

// 🎯 PAINEL DO ARREMATANTE — página 100% de LEITURA.
// Mostra onde o usuário está disputando agora, quanto tem livre/reservado,
// o mini extrato dos lances e os últimos arremates. Não escreve nada.
export default function PainelArrematante() {
  const { user, saldo, disputando, lances, arremates, carregando } = usePainelArrematante();

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-center p-6">
        <Gavel className="w-14 h-14 text-emerald-500 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Entre para ver seu painel</h1>
        <p className="text-gray-400 mb-6 max-w-sm">Aqui você acompanha seus lances, o saldo reservado em disputa e seus arremates.</p>
        <Link
          to="/leiloes"
          className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-lg font-bold text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
        >
          Ir para os leilões
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white p-3 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        <header>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Painel do Arrematante</h1>
          <p className="text-sm text-gray-400 mt-1">
            Olá, {(user.display_first_name || user.full_name || '').split(' ')[0]} — aqui está tudo o que você está disputando.
          </p>
        </header>

        <ResumoCards saldo={saldo} totalGanhos={arremates.length} />
        <DisputandoAgora itens={disputando} />
        <ExtratoLances lances={lances} />
        <UltimosArremates arremates={arremates} />
      </div>
    </div>
  );
}