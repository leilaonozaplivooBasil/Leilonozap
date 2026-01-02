import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Share2, TrendingUp, Users, DollarSign, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const AppUser = base44.entities.AppUser;

export default function InfluencersNoZap() {
  const [currentUser, setCurrentUser] = useState(null);
  const [influencerCode, setInfluencerCode] = useState("");
  const [influencerLink, setInfluencerLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({
    totalLeads: 0,
    totalPurchases: 0,
    totalRevenue: 0
  });
  const [leads, setLeads] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      const savedUserJSON = localStorage.getItem('currentUser');
      const isLoggedIn = sessionStorage.getItem('isLoggedIn');

      if (!savedUserJSON || !isLoggedIn) {
        navigate(createPageUrl("Landing"));
        return;
      }

      const user = JSON.parse(savedUserJSON);
      setCurrentUser(user);

      // Gera código único do influenciador baseado no ID
      const code = `INF${user.id.substring(0, 8).toUpperCase()}`;
      setInfluencerCode(code);
      
      const link = `https://leilaonozap.app${createPageUrl("Landing")}?inf=${code}`;
      setInfluencerLink(link);

      // Carrega estatísticas (filtro para contexto nozap)
      try {
        const userLeads = await base44.entities.InfluencerLead.filter({ 
          influencer_id: user.id,
          context: 'nozap'
        });
        setLeads(userLeads);

        const totalLeads = userLeads.length;
        const totalPurchases = userLeads.reduce((sum, lead) => sum + (lead.total_purchases || 0), 0);
        const totalRevenue = userLeads.reduce((sum, lead) => sum + (lead.total_spent || 0), 0);

        setStats({ totalLeads, totalPurchases, totalRevenue });
      } catch (error) {
        console.error("Erro ao carregar estatísticas:", error);
      }
    };

    loadUser();
  }, [navigate]);

  const handleCopy = () => {
    navigator.clipboard.writeText(influencerLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const shareText = `🔥 Confira os leilões incríveis do Leilão NoZap!\n\nAs melhores ofertas e produtos com preços imbatíveis!\n\n${influencerLink}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Leilão NoZap",
          text: shareText
        });
      } catch (error) {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
      }
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
    }
  };

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
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-3">
            Programa de Influenciadores 🎯
          </h1>
          <p className="text-xl text-gray-300">
            Compartilhe e ganhe 3% de comissão a cada compra realizada com seu link!
          </p>
        </div>

        {/* Card do Link */}
        <Card className="mb-8 border-2 border-green-500 shadow-xl bg-gray-800">
          <CardHeader className="bg-gradient-to-r from-green-600 to-green-500">
            <CardTitle className="text-2xl text-white">Seu Link Exclusivo</CardTitle>
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

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
        </div>

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
                    className="flex items-center justify-between p-4 bg-gray-700 rounded-lg border border-gray-600"
                  >
                    <div>
                      <p className="font-semibold text-white">
                        {lead.lead_name || lead.lead_email}
                      </p>
                      <p className="text-sm text-gray-300">
                        {lead.total_purchases || 0} compras · R$ {(lead.total_spent || 0).toFixed(2)}
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
                Comece a Indicar!
              </h3>
              <p className="text-gray-300 mb-6">
                Compartilhe seu link e comece a ganhar com suas indicações.
              </p>
              <Button
                onClick={handleShare}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Compartilhar Agora
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}