import { useNavigate } from 'react-router-dom';
import { Gavel, ShoppingBag, DollarSign, Search, Home } from 'lucide-react';

const LOGO = 'https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png';

// Página não encontrada — versão Leilão NoZap. Em vez de um beco em inglês, oferece as
// portas principais (o cliente nunca fica preso). Os apelidos de rota (/loja, /entrar…) já
// redirecionam ANTES de chegar aqui; isto é só o fallback de verdade.
const ATALHOS = [
  { icon: Gavel, label: 'Leilões', to: '/leiloes' },
  { icon: ShoppingBag, label: 'Loja Virtual', to: '/Loja-Virtual' },
  { icon: DollarSign, label: 'Ganhe Dinheiro', to: '/Licensing' },
];

export default function PageNotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'radial-gradient(900px 500px at 50% -10%, rgba(16,90,55,.5), transparent), #05100b', color: '#e9f5ef' }}>
      <div className="max-w-md w-full text-center space-y-7">
        <img src={LOGO} alt="Leilão NoZap" className="h-12 mx-auto" style={{ filter: 'drop-shadow(0 4px 20px rgba(16,185,129,.4))' }} />

        <div className="space-y-2">
          <h1 className="text-6xl font-black" style={{ color: '#34d399' }}>404</h1>
          <h2 className="text-xl font-bold">Página não encontrada</h2>
          <p className="text-sm" style={{ color: '#9fb3aa' }}>
            O link pode estar quebrado ou a página mudou de lugar. Sem problema, é só escolher por onde seguir:
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {ATALHOS.map((a) => (
            <button
              key={a.to}
              onClick={() => navigate(a.to)}
              className="flex flex-col items-center gap-2 py-4 rounded-2xl transition-transform hover:scale-105"
              style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)' }}
            >
              <a.icon className="w-6 h-6" style={{ color: '#34d399' }} />
              <span className="text-[12px] font-semibold">{a.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate('/Loja-Virtual')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-sm"
            style={{ background: 'linear-gradient(135deg,#16a34a,#22c55e)' }}
          >
            <Search className="w-4 h-4" /> Buscar produtos
          </button>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm"
            style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.15)', color: '#e9f5ef' }}
          >
            <Home className="w-4 h-4" /> Início
          </button>
        </div>
      </div>
    </div>
  );
}
