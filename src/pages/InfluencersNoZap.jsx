import React, { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Share2, TrendingUp, Users, DollarSign, CheckCircle, Calculator, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const AppUser = base44.entities.AppUser;

// Cédulas brasileiras reais
const realNotes = [
  { value: 2, url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Anverso_da_c%C3%A9dula_de_2_reais_%28segunda_fam%C3%ADlia%29.jpg/800px-Anverso_da_c%C3%A9dula_de_2_reais_%28segunda_fam%C3%ADlia%29.jpg", color: "#4A90E2" },
  { value: 5, url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Anverso_da_c%C3%A9dula_de_5_reais_%28segunda_fam%C3%ADlia%29.jpg/800px-Anverso_da_c%C3%A9dula_de_5_reais_%28segunda_fam%C3%ADlia%29.jpg", color: "#9B59B6" },
  { value: 10, url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Anverso_da_c%C3%A9dula_de_10_reais_%28segunda_fam%C3%ADlia%29.jpg/800px-Anverso_da_c%C3%A9dula_de_10_reais_%28segunda_fam%C3%ADlia%29.jpg", color: "#E74C3C" },
  { value: 20, url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Anverso_da_c%C3%A9dula_de_20_reais_%28segunda_fam%C3%ADlia%29.jpg/800px-Anverso_da_c%C3%A9dula_de_20_reais_%28segunda_fam%C3%ADlia%29.jpg", color: "#F39C12" },
  { value: 50, url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Anverso_da_c%C3%A9dula_de_50_reais_%28segunda_fam%C3%ADlia%29.jpg/800px-Anverso_da_c%C3%A9dula_de_50_reais_%28segunda_fam%C3%ADlia%29.jpg", color: "#A0826D" },
  { value: 100, url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Anverso_da_c%C3%A9dula_de_100_reais_%28segunda_fam%C3%ADlia%29.jpg/800px-Anverso_da_c%C3%A9dula_de_100_reais_%28segunda_fam%C3%ADlia%29.jpg", color: "#3498DB" },
  { value: 200, url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Anverso_da_c%C3%A9dula_de_200_reais_%28segunda_fam%C3%ADlia%29.jpg/800px-Anverso_da_c%C3%A9dula_de_200_reais_%28segunda_fam%C3%ADlia%29.jpg", color: "#95A5A6" }
];

const RealNotesCarousel = ({ totalEarnings }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % realNotes.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [isPaused]);

  const currentNote = realNotes[currentIndex];

  return (
    <div className="relative w-full max-w-2xl mx-auto py-8">
      <div className="relative h-64 flex items-center justify-center" style={{ perspective: '1500px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            className="absolute"
            initial={{ opacity: 0, scale: 0.8, rotateY: 20 }}
            animate={{ 
              opacity: 1, 
              scale: isHovered ? 1.05 : 1,
              y: isHovered ? -10 : 0,
              rotateY: 0
            }}
            exit={{ opacity: 0, scale: 0.8, rotateY: -20 }}
            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            onMouseEnter={() => { setIsHovered(true); setIsPaused(true); }}
            onMouseLeave={() => { setIsHovered(false); setIsPaused(false); }}
          >
            <div 
              className="w-full max-w-xl h-56 rounded-2xl shadow-2xl border-4 relative transition-all cursor-pointer overflow-hidden"
              style={{ 
                boxShadow: isHovered ? `0 40px 120px rgba(0,0,0,0.8), 0 0 60px ${currentNote.color}` : '0 30px 80px rgba(0,0,0,0.6)',
                borderColor: isHovered ? currentNote.color : 'rgba(255,255,255,0.2)'
              }}
            >
              <img 
                src={currentNote.url}
                alt={`Cédula R$ ${currentNote.value}`} 
                className="w-full h-full object-cover"
              />

              <button
                onClick={() => {
                  setCurrentIndex(prev => (prev - 1 + realNotes.length) % realNotes.length);
                  setIsPaused(true);
                  setTimeout(() => setIsPaused(false), 4000);
                }}
                className="absolute left-0 top-0 w-1/2 h-full z-10 bg-transparent cursor-pointer"
                aria-label="Anterior"
              />
              
              <button
                onClick={() => {
                  setCurrentIndex(prev => (prev + 1) % realNotes.length);
                  setIsPaused(true);
                  setTimeout(() => setIsPaused(false), 4000);
                }}
                className="absolute right-0 top-0 w-1/2 h-full z-10 bg-transparent cursor-pointer"
                aria-label="Próxima"
              />
            </div>
            
            <motion.div 
              className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 px-8 py-3 rounded-full font-bold text-2xl shadow-lg border-2"
              style={{
                background: isHovered ? `linear-gradient(to right, ${currentNote.color}, #16a34a)` : 'linear-gradient(to right, #1f2937, #111827)',
                borderColor: isHovered ? 'white' : 'rgba(75, 85, 99, 0.3)',
                color: 'white'
              }}
            >
              R$ {currentNote.value}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex justify-center gap-3 mt-12">
        {realNotes.map((note, index) => (
          <button 
            key={note.value} 
            onClick={() => {
              setCurrentIndex(index);
              setIsPaused(true);
              setTimeout(() => setIsPaused(false), 4000);
            }}
            className={`transition-all duration-300 rounded-full ${index === currentIndex ? 'w-10 h-3' : 'w-3 h-3'}`}
            style={{
              backgroundColor: index === currentIndex ? currentNote.color : '#4B5563',
              boxShadow: index === currentIndex ? `0 0 20px ${currentNote.color}` : 'none'
            }}
            aria-label={`Cédula R$ ${note.value}`}
          />
        ))}
      </div>

      <div className="text-center mt-8">
        <p className="text-gray-400 text-lg">
          💰 Ganhe <strong className="text-green-400">3% em dinheiro real</strong> nas compras dos seus indicados!
        </p>
        {totalEarnings > 0 && (
          <p className="text-2xl font-bold text-white mt-4">
            Você já ganhou: <span className="text-green-400">R$ {totalEarnings.toFixed(2)}</span>
          </p>
        )}
      </div>
    </div>
  );
};

const EarningsSimulator = () => {
  const [activeSubscribers, setActiveSubscribers] = useState(100);
  const [avgPurchase, setAvgPurchase] = useState(50);

  const monthlyEarnings = activeSubscribers * avgPurchase * 0.03;
  const yearlyEarnings = monthlyEarnings * 12;

  return (
    <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-green-500/50 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-white text-2xl">
          <Calculator className="w-6 h-6 text-green-400" />
          Simule seus Ganhos
        </CardTitle>
        <CardDescription className="text-gray-400">
          Veja quanto você pode ganhar como influenciador
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label className="text-gray-300 flex items-center gap-2 mb-2">
              Assinantes ativos (pessoas que você indicou e mantém a assinatura)
              <div className="group relative">
                <Info className="w-4 h-4 text-gray-500 cursor-help" />
                <div className="absolute bottom-6 left-0 w-64 bg-gray-700 text-white text-xs p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                  Mínimo para Nível 1 (Explorador): 100 ativos
                </div>
              </div>
            </Label>
            <Input
              type="number"
              min="0"
              value={activeSubscribers}
              onChange={(e) => setActiveSubscribers(Math.max(0, parseInt(e.target.value) || 0))}
              className="bg-gray-700 border-gray-600 text-white text-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              Mínimo para Nível 1 (Explorador): 100 ativos.
            </p>
          </div>

          <div>
            <Label className="text-gray-300 mb-2 block">
              Repasse estimado / mês
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">R$</span>
              <Input
                type="number"
                min="0"
                step="10"
                value={avgPurchase}
                onChange={(e) => setAvgPurchase(Math.max(0, parseFloat(e.target.value) || 0))}
                className="bg-gray-700 border-gray-600 text-white text-lg pl-10"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-6 space-y-4">
          <div className="flex justify-between items-center p-4 bg-green-900/20 rounded-lg border border-green-500/30">
            <span className="text-gray-300 font-medium">Ganho Mensal:</span>
            <span className="text-2xl font-bold text-green-400">
              R$ {monthlyEarnings.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center p-4 bg-yellow-900/20 rounded-lg border border-yellow-500/30">
            <span className="text-gray-300 font-medium">Ganho Anual:</span>
            <span className="text-2xl font-bold text-yellow-400">
              R$ {yearlyEarnings.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <p className="text-sm text-blue-300 leading-relaxed">
            💡 <strong>Cálculo:</strong> Considera assinatura sem o desconto do imposto.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default function InfluencersNoZap() {
  const [currentUser, setCurrentUser] = useState(null);
  const [influencerCode, setInfluencerCode] = useState("");
  const [influencerLink, setInfluencerLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({
    totalLeads: 0,
    totalPurchases: 0,
    totalRevenue: 0,
    totalEarnings: 0
  });
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      const savedUserJSON = localStorage.getItem('currentUser');
      const isLoggedIn = sessionStorage.getItem('isLoggedIn');

      if (!savedUserJSON || !isLoggedIn) {
        navigate(createPageUrl("Home"));
        return;
      }

      const user = JSON.parse(savedUserJSON);
      setCurrentUser(user);

      // Gera código único do influenciador baseado no ID
      const code = `INF${user.id.substring(0, 8).toUpperCase()}`;
      setInfluencerCode(code);
      
      const link = `https://leilaonozap.app${createPageUrl("Home")}?inf=${code}`;
      setInfluencerLink(link);

      // Carrega estatísticas
      try {
        const userLeads = await base44.entities.InfluencerLead.filter({ 
          influencer_id: user.id
        });
        setLeads(userLeads);

        const totalLeads = userLeads.length;
        const totalPurchases = userLeads.reduce((sum, lead) => sum + (lead.total_purchases || 0), 0);
        const totalRevenue = userLeads.reduce((sum, lead) => sum + (lead.total_spent || 0), 0);
        const totalEarnings = totalRevenue * 0.03;

        setStats({ totalLeads, totalPurchases, totalRevenue, totalEarnings });
      } catch (error) {
        console.error("Erro ao carregar estatísticas:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, [navigate]);

  const handleCopy = () => {
    navigator.clipboard.writeText(influencerLink);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const shareText = `🔥 Confira os leilões incríveis do Leilão NoZap!\n\nAs melhores ofertas e produtos com preços imbatíveis!\n\n${influencerLink}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Leilão NoZap - Influenciador",
          text: shareText
        });
      } catch (error) {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
      }
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-3 mb-6 bg-green-500/10 px-6 py-3 rounded-full border border-green-500/30">
              <TrendingUp className="w-6 h-6 text-green-400" />
              <span className="text-green-400 font-semibold">Programa de Influenciadores</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Influencie 🎯
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Compartilhe e ganhe <strong className="text-green-400">3% em dinheiro real (R$)</strong> a cada compra realizada com seu link!
            </p>
          </motion.div>
        </div>

        {/* Carrossel de Cédulas */}
        <RealNotesCarousel totalEarnings={stats.totalEarnings} />

        {/* Card do Link */}
        <Card className="mb-8 border-2 border-green-500 shadow-xl bg-gray-800">
          <CardHeader className="bg-gradient-to-r from-green-600 to-green-500">
            <CardTitle className="text-2xl text-white">Seu Link Exclusivo de Influenciador</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="bg-gray-700 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-300 mb-2">Código do Influenciador:</p>
              <p className="text-2xl font-bold text-green-400 mb-4">{influencerCode}</p>
              
              <p className="text-sm text-gray-300 mb-2">Seu Link de Indicação:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={influencerLink}
                  readOnly
                  className="flex-1 px-4 py-2 border border-gray-600 rounded-lg bg-gray-900 text-white text-sm"
                />
                <Button
                  onClick={handleCopy}
                  className={`${copied ? 'bg-green-600' : 'bg-green-600'} hover:opacity-90`}
                >
                  {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </Button>
              </div>
            </div>

            <Button
              onClick={handleShare}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6 text-lg"
            >
              <Share2 className="w-6 h-6 mr-2" />
              Compartilhar Link
            </Button>
          </CardContent>
        </Card>

        {/* Grid: Estatísticas + Simulador */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Estatísticas */}
          <div className="space-y-6">
            <Card className="border-2 border-blue-500 bg-gray-800">
              <CardContent className="p-6 text-center">
                <Users className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                <p className="text-4xl font-bold text-white mb-2">{stats.totalLeads}</p>
                <p className="text-gray-300">Total de Indicações</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-500 bg-gray-800">
              <CardContent className="p-6 text-center">
                <TrendingUp className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-4xl font-bold text-white mb-2">{stats.totalPurchases}</p>
                <p className="text-gray-300">Compras Realizadas</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-yellow-500 bg-gray-800">
              <CardContent className="p-6 text-center">
                <DollarSign className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
                <p className="text-4xl font-bold text-white mb-2">
                  R$ {stats.totalRevenue.toFixed(2)}
                </p>
                <p className="text-gray-300">Volume Total Gerado</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-400 bg-gradient-to-br from-green-900/30 to-green-800/20">
              <CardContent className="p-6 text-center">
                <div className="text-5xl mb-3">💰</div>
                <p className="text-5xl font-bold text-green-400 mb-2">
                  R$ {stats.totalEarnings.toFixed(2)}
                </p>
                <p className="text-gray-300 font-semibold">Seus Ganhos em Dinheiro Real</p>
              </CardContent>
            </Card>
          </div>

          {/* Simulador */}
          <div>
            <EarningsSimulator />
          </div>
        </div>

        {/* Como Funciona */}
        <Card className="mb-8 bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-2xl">Como Funciona</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold">1</span>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">Compartilhe seu Link</h4>
                <p className="text-gray-400">Envie seu link exclusivo para amigos, família e seguidores.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold">2</span>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">Eles Compram</h4>
                <p className="text-gray-400">Quando seus indicados arrematam produtos, você ganha!</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold">3</span>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-1">Você Recebe 3% em Dinheiro Real</h4>
                <p className="text-gray-400">Comissão paga em dinheiro (R$) direto na sua conta!</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Indicações */}
        {leads.length > 0 && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Suas Indicações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-4 bg-gray-700 rounded-lg border border-gray-600 hover:border-green-500/50 transition-all"
                  >
                    <div>
                      <p className="font-semibold text-white">
                        {lead.lead_name || lead.lead_email}
                      </p>
                      <p className="text-sm text-gray-300">
                        {lead.total_purchases || 0} compras · R$ {(lead.total_spent || 0).toFixed(2)} gerados
                      </p>
                      <p className="text-xs text-green-400 font-semibold mt-1">
                        💰 Você ganhou: R$ {((lead.total_spent || 0) * 0.03).toFixed(2)}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      lead.status === 'active_buyer' 
                        ? 'bg-green-600 text-white' 
                        : lead.status === 'registered'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-600 text-white'
                    }`}>
                      {lead.status === 'active_buyer' ? '✅ Comprador Ativo' : 
                       lead.status === 'registered' ? '📝 Cadastrado' : 
                       '⏳ Pendente'}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {leads.length === 0 && (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-2xl font-bold text-white mb-3">
                Comece a Influenciar!
              </h3>
              <p className="text-gray-300 mb-6">
                Compartilhe seu link e comece a ganhar comissões em dinheiro real.
              </p>
              <Button
                onClick={handleShare}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-6 px-8 text-lg"
              >
                <Share2 className="w-6 h-6 mr-2" />
                Compartilhar Agora
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}