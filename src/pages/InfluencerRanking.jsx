import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Crown, Star, Medal, TrendingUp, Users, DollarSign, Award } from 'lucide-react';

export default function InfluencerRanking() {
  const [influencers, setInfluencers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInfluencers = async () => {
      try {
        setIsLoading(true);
        
        // Buscar todos os leads de influenciadores
        const allLeads = await base44.entities.InfluencerLead.list("-created_date", 1000);
        
        // Agrupar por influenciador e calcular métricas
        const influencerMap = {};
        
        allLeads.forEach(lead => {
          if (!influencerMap[lead.influencer_id]) {
            influencerMap[lead.influencer_id] = {
              id: lead.influencer_id,
              name: lead.influencer_name,
              code: lead.influencer_code,
              total_leads: 0,
              total_purchases: 0,
              total_revenue: 0
            };
          }
          
          influencerMap[lead.influencer_id].total_leads++;
          influencerMap[lead.influencer_id].total_purchases += lead.total_purchases || 0;
          influencerMap[lead.influencer_id].total_revenue += lead.total_spent || 0;
        });
        
        // Converter para array e ordenar por receita
        const influencersArray = Object.values(influencerMap)
          .sort((a, b) => b.total_revenue - a.total_revenue);
        
        setInfluencers(influencersArray);
        setError(null);
      } catch (err) {
        console.error("Erro ao buscar influenciadores:", err);
        setError("Não foi possível carregar o ranking. Tente novamente mais tarde.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInfluencers();
  }, []);

  const topInfluencers = influencers.slice(0, 3);
  const otherInfluencers = influencers.slice(3, 20);

  const PodiumItem = ({ influencer, rank, color, icon: Icon, size }) => (
    <div className={`flex flex-col items-center justify-end ${rank === 1 ? 'h-56' : 'h-48'}`}>
      <div className={`relative ${size} rounded-full flex items-center justify-center mb-2 shadow-lg bg-gradient-to-br from-red-500 to-red-700`}>
        <span className="text-white font-bold text-4xl">{influencer.name?.charAt(0).toUpperCase()}</span>
        <div className={`absolute -inset-1 rounded-full border-4 ${color} z-[-1] opacity-75`} style={{ animation: `pulse-glow 3s infinite ease-in-out` }}></div>
      </div>
      
      <div className="text-center">
        <p className="font-bold text-gray-900 truncate max-w-[150px]">{influencer.name}</p>
        <div className={`flex items-center justify-center gap-1 font-semibold ${color.replace('border-', 'text-')}`}>
          <Icon className="w-5 h-5" />
          <span>R$ {influencer.total_revenue.toFixed(0)}</span>
        </div>
      </div>
      
      <div className={`mt-2 w-20 h-16 rounded-t-lg flex items-center justify-center text-4xl font-black text-white shadow-inner ${color.replace('border-', 'bg-')}`}>
        {rank}
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { transform: scale(1); box-shadow: 0 0 10px 0px #facc1530; }
          50% { transform: scale(1.05); box-shadow: 0 0 25px 10px #facc1570; }
        }
      `}</style>
      
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🏆 Ranking de Influenciadores</h1>
              <p className="text-gray-600 mt-1">Os melhores influenciadores da Sai de Baixo</p>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Carregando ranking...</p>
            </div>
          ) : error ? (
            <div className="text-center bg-red-100 p-6 rounded-lg shadow border-2 border-red-300">
              <p className="text-red-700 font-semibold">{error}</p>
            </div>
          ) : influencers.length === 0 ? (
            <div className="text-center bg-white p-12 rounded-lg shadow-lg border-2 border-gray-200">
              <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhum influenciador ainda</h3>
              <p className="text-gray-600">Seja o primeiro a começar sua jornada de influenciador!</p>
            </div>
          ) : (
            <>
              {/* Pódio */}
              {topInfluencers.length > 0 && (
                <div className="relative bg-white border-2 border-gray-200 shadow-2xl rounded-xl p-6 mb-12">
                  <h2 className="text-center text-3xl font-semibold text-red-600 mb-8">Pódio de Honra</h2>
                  <div className="flex justify-around items-end">
                    {topInfluencers[1] && <PodiumItem influencer={topInfluencers[1]} rank={2} color="border-gray-400 bg-gray-400" icon={Medal} size="w-20 h-20" />}
                    {topInfluencers[0] && <PodiumItem influencer={topInfluencers[0]} rank={1} color="border-yellow-500 bg-yellow-500" icon={Crown} size="w-28 h-28" />}
                    {topInfluencers[2] && <PodiumItem influencer={topInfluencers[2]} rank={3} color="border-yellow-700 bg-yellow-700" icon={Award} size="w-20 h-20" />}
                  </div>
                </div>
              )}
              
              {/* Lista */}
              {otherInfluencers.length > 0 && (
                <div className="bg-white border-2 border-gray-200 shadow-xl rounded-xl overflow-hidden">
                  <h2 className="text-xl font-semibold text-red-600 p-4 border-b-2 border-gray-200 flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Top 20 Influenciadores
                  </h2>
                  <ul>
                    {otherInfluencers.map((influencer, index) => (
                      <li key={influencer.id} className="group flex items-center p-4 border-b-2 border-gray-200 hover:bg-gray-50 last:border-b-0 transition-colors duration-200">
                        <span className="font-bold text-gray-600 w-8 text-center text-lg">{index + 4}</span>
                        
                        <div className="mx-4">
                          <div 
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 shadow-sm border-2 border-gray-300 group-hover:scale-110 transition-transform bg-gradient-to-br from-red-500 to-red-700"
                          >
                            {influencer.name?.charAt(0).toUpperCase()}
                          </div>
                        </div>

                        <div className="flex-grow">
                          <p className="font-semibold text-gray-900 text-lg">{influencer.name}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span>{influencer.total_leads} leads</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="w-4 h-4" />
                              <span>{influencer.total_purchases} compras</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 font-bold text-lg px-3 py-1 rounded-full bg-red-100 text-red-700 border-2 border-red-300">
                          <DollarSign className="w-5 h-5" />
                          <span>R$ {influencer.total_revenue.toFixed(0)}</span>
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