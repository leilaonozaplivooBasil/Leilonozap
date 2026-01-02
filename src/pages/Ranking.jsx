import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AppUser = base44.entities.AppUser;
import { Crown, Star, Medal, Shield, TrendingUp, Gem } from 'lucide-react';
import { useRealtimeRanking, RealtimeStatus } from '../components/system/RealtimeSync';

const PodiumItem = ({ user, rank, color, icon: Icon, size, isSaiDeBaixo }) => (
  <div className={`flex flex-col items-center justify-end ${rank === 1 ? 'h-56' : 'h-48'}`}>
    {/* Avatar com condicional */}
    <div className={`relative ${size} rounded-full flex items-center justify-center mb-2 shadow-lg`}>
        {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.nickname || user.full_name} className="w-full h-full rounded-full object-cover"/>
        ) : (
            <div 
              className={`w-full h-full rounded-full flex items-center justify-center text-white font-bold text-4xl`} 
              style={{ backgroundColor: user.avatar_color || '#25D366' }}
            >
              {(user.nickname || user.full_name || '').charAt(0).toUpperCase()}
            </div>
        )}
        {/* Anel de brilho */}
        <div className={`absolute -inset-1 rounded-full border-4 ${color} z-[-1] opacity-75`} style={{ animation: `pulse-glow 3s infinite ease-in-out` }}></div>
    </div>
    
    {/* Informações do Usuário */}
    <div className="text-center">
      <p className={`font-bold ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'} truncate max-w-[150px]`}>{user.nickname || user.full_name}</p>
      <div className={`flex items-center justify-center gap-1 font-semibold ${color.replace('border-', 'text-')}`}>
        <Icon className="w-5 h-5" />
        <span>{user.points || 0} pts</span>
      </div>
    </div>
    
    {/* Base do Pódio */}
    <div className={`mt-2 w-20 h-16 rounded-t-lg flex items-center justify-center text-4xl font-black text-white shadow-inner ${color.replace('border-', 'bg-')}`}>
      {rank}
    </div>
  </div>
);

export default function Ranking() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const isSaiDeBaixo = sessionStorage.getItem('saiDeBaixoContext') === 'true';

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const allUsers = await AppUser.list("-points", 100);
        setUsers(allUsers);
        setError(null);
      } catch (err) {
        console.error("Erro ao buscar usuários:", err);
        setError("Não foi possível carregar o ranking. Tente novamente mais tarde.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // ============= TEMPO REAL - NOVO! =============
  useRealtimeRanking((freshUsers) => {
    console.log('🏆 Ranking atualizado em tempo real!');
    setUsers(freshUsers);
  });

  const topUsers = users.slice(0, 3);
  const otherUsers = users.slice(3, 20); // Limita a lista para os próximos 17 (total 20)

  return (
    <>
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { transform: scale(1); box-shadow: 0 0 10px 0px ${'#facc15'}30; }
          50% { transform: scale(1.05); box-shadow: 0 0 25px 10px ${'#facc15'}70; }
        }
        .podium-1-glow { animation-name: pulse-glow-gold; }
        @keyframes pulse-glow-gold {
          0%, 100% { box-shadow: 0 0 10px 0px #facc1560; }
          50% { box-shadow: 0 0 30px 10px #facc1590; }
        }
        .podium-2-glow { animation-name: pulse-glow-silver; }
        @keyframes pulse-glow-silver {
          0%, 100% { box-shadow: 0 0 8px 0px #d1d5db60; }
          50% { box-shadow: 0 0 25px 8px #d1d5db90; }
        }
        .podium-3-glow { animation-name: pulse-glow-bronze; }
        @keyframes pulse-glow-bronze {
          0%, 100% { box-shadow: 0 0 6px 0px #d9770660; }
          50% { box-shadow: 0 0 20px 6px #d9770690; }
        }
      `}</style>
      <div className={`min-h-screen ${isSaiDeBaixo ? 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900' : 'bg-gray-900 text-white'} p-6`}>
        <div className="max-w-6xl mx-auto">
          {/* Título e Cabeçalho */}
          <div className="flex items-center justify-between mb-8">
            <h1 className={`text-3xl font-bold ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>🏆 Ranking de Usuários</h1>
            {/* NOVO: Status de atualização */}
            <RealtimeStatus isActive={true} />
          </div>

          {isLoading ? (
            <div className="text-center py-16">
              <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isSaiDeBaixo ? 'border-red-600' : 'border-green-500'} mx-auto`}></div>
              <p className={`mt-4 ${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}`}>Carregando os campeões...</p>
            </div>
          ) : error ? (
            <div className={`text-center ${isSaiDeBaixo ? 'bg-red-100' : 'bg-red-900/50'} p-6 rounded-lg shadow ${isSaiDeBaixo ? 'border-2 border-red-300' : 'border border-red-500/30'}`}>
              <p className={`${isSaiDeBaixo ? 'text-red-700' : 'text-red-400'} font-semibold`}>{error}</p>
            </div>
          ) : (
            <>
              {/* Pódio */}
              {topUsers.length > 0 && (
                <div className={`relative ${isSaiDeBaixo ? 'bg-white border-2 border-gray-200' : 'bg-gray-800/50 border border-gray-700/80 backdrop-blur-sm'} shadow-2xl rounded-xl p-6 mb-12`}>
                  <h2 className={`text-center text-3xl font-semibold ${isSaiDeBaixo ? 'text-red-600' : 'text-green-400'} mb-8`}>Pódio de Honra</h2>
                  <div className="flex justify-around items-end">
                    {topUsers[1] && <PodiumItem user={topUsers[1]} rank={2} color="border-gray-400 bg-gray-400" icon={Medal} size="w-20 h-20" isSaiDeBaixo={isSaiDeBaixo} />}
                    {topUsers[0] && <PodiumItem user={topUsers[0]} rank={1} color="border-yellow-500 bg-yellow-500" icon={Crown} size="w-28 h-28" isSaiDeBaixo={isSaiDeBaixo} />}
                    {topUsers[2] && <PodiumItem user={topUsers[2]} rank={3} color="border-yellow-700 bg-yellow-700" icon={Shield} size="w-20 h-20" isSaiDeBaixo={isSaiDeBaixo} />}
                  </div>
                </div>
              )}
              
              {/* Lista dos Outros Usuários */}
              {otherUsers.length > 0 && (
                <div className={`${isSaiDeBaixo ? 'bg-white border-2 border-gray-200' : 'bg-gray-800/50 border border-gray-700/80 backdrop-blur-sm'} shadow-xl rounded-xl overflow-hidden`}>
                  <h2 className={`text-xl font-semibold ${isSaiDeBaixo ? 'text-red-600' : 'text-green-400'} p-4 ${isSaiDeBaixo ? 'border-b-2 border-gray-200' : 'border-b border-gray-700'} flex items-center gap-2`}>
                    <Gem className="w-5 h-5" />
                    Top 20 Pontuadores
                  </h2>
                  <ul>
                    {otherUsers.map((user, index) => (
                      <li key={user.id} className={`group flex items-center p-4 ${isSaiDeBaixo ? 'border-b-2 border-gray-200 hover:bg-gray-50' : 'border-b border-gray-700/80 hover:bg-gray-700/50'} last:border-b-0 transition-colors duration-200`}>
                        <span className={`font-bold ${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'} w-8 text-center text-lg`}>{index + 4}</span>
                        
                        {/* Avatar com condicional */}
                        <div className="mx-4">
                          {user.avatar_url ? (
                              <img src={user.avatar_url} alt={user.nickname || user.full_name} className={`w-12 h-12 rounded-full object-cover shadow-sm group-hover:scale-110 transition-transform ${isSaiDeBaixo ? 'border-2 border-gray-300' : 'border-2 border-gray-800'}`}/>
                          ) : (
                              <div 
                                className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform ${isSaiDeBaixo ? 'border-2 border-gray-300' : 'border-2 border-gray-800'}`}
                                style={{ backgroundColor: user.avatar_color || '#25D366' }}
                              >
                                {(user.nickname || user.full_name || '').charAt(0).toUpperCase()}
                              </div>
                          )}
                        </div>

                        {/* Nome e stats */}
                        <div className="flex-grow">
                          <p className={`font-semibold ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'} text-lg`}>{user.nickname || user.full_name}</p>
                          <div className={`flex items-center gap-4 text-sm ${isSaiDeBaixo ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="w-4 h-4" />
                              <span>{user.total_bids || 0} lances</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Crown className="w-4 h-4" />
                              <span>{user.won_auctions || 0} vitórias</span>
                            </div>
                          </div>
                        </div>

                        {/* Pontuação */}
                        <div className={`flex items-center gap-2 font-bold text-lg px-3 py-1 rounded-full ${isSaiDeBaixo ? 'bg-red-100 text-red-700 border-2 border-red-300' : 'text-green-400 bg-green-500/10 border border-green-500/20'}`}>
                          <Star className="w-5 h-5" />
                          <span>{user.points || 0}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}