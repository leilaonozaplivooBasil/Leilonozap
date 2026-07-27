import React, { useState, useEffect } from "react";
import { fmtBR } from '@/lib/money';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Share2, TrendingUp, Users, DollarSign, CheckCircle, Loader2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { requestWithdrawal } from "@/functions/requestWithdrawal";
import { toast } from "sonner";

const AppUser = base44.entities.AppUser;

export default function Influencers() {
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
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('CPF');
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      const savedUserJSON = localStorage.getItem('currentUser');
      const isLoggedIn = sessionStorage.getItem('isLoggedIn');

      if (!savedUserJSON || !isLoggedIn) {
        navigate(createPageUrl("LandingSaiDeBaixo"));
        return;
      }

      const user = JSON.parse(savedUserJSON);
      setCurrentUser(user);

      // Gera código único do influenciador baseado no ID
      const code = `INF${user.id.substring(0, 8).toUpperCase()}`;
      setInfluencerCode(code);
      
      const link = `${window.location.origin}${createPageUrl("LandingSaiDeBaixo")}?inf=${code}`;
      setInfluencerLink(link);

      // Carrega estatísticas
      try {
        const userLeads = await base44.entities.InfluencerLead.filter({ influencer_id: user.id });
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
    const shareText = `🔥 Confira as ofertas incríveis do Sai de Baixo Leilões!\n\nModa com estilo e preços imbatíveis!\n\n${influencerLink}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Sai de Baixo Leilões",
          text: shareText
        });
      } catch (error) {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
      }
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
    }
  };

  const handleWithdrawalSubmit = async () => {
    setIsProcessing(true);
    try {
      const amount = parseFloat(withdrawalAmount);
      
      if (!amount || amount <= 0) {
        toast.error('Valor inválido');
        return;
      }

      if (amount > currentUser.commission_balance) {
        toast.error('Saldo insuficiente');
        return;
      }

      if (!pixKey) {
        toast.error('Informe a chave PIX');
        return;
      }

      const response = await requestWithdrawal({
        amount,
        pix_key: pixKey,
        pix_key_type: pixKeyType
      });

      if (response?.data?.success) {
        toast.success('Saque solicitado! Aguarde aprovação.');
        setShowWithdrawalModal(false);
        setWithdrawalAmount('');
        setPixKey('');
        
        // Atualiza saldo local
        setCurrentUser({ ...currentUser, commission_balance: currentUser.commission_balance - amount });
      } else {
        toast.error(response?.data?.error || 'Erro ao solicitar saque');
      }
    } catch (error) {
      toast.error('Erro: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Programa de Influenciadores 🎯
          </h1>
          <p className="text-xl text-gray-600">
            Compartilhe e ganhe 3% de comissão a cada compra realizada com seu link!
          </p>
        </div>

        {/* Card do Link */}
        <Card className="mb-8 border-2 border-red-500 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-red-600 to-red-500 text-white">
            <CardTitle className="text-2xl">Seu Link Exclusivo</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 mb-2">Código do Influenciador:</p>
              <p className="text-2xl font-bold text-red-600 mb-4">{influencerCode}</p>
              
              <p className="text-sm text-gray-600 mb-2">Seu Link de Indicação:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={influencerLink}
                  readOnly
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                />
                <Button
                  onClick={handleCopy}
                  className={`${copied ? 'bg-green-600' : 'bg-red-600'} hover:opacity-90`}
                >
                  {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </Button>
              </div>
            </div>

            <Button
              onClick={handleShare}
              className="w-full bg-black hover:bg-gray-900 text-white font-bold py-6 text-lg"
            >
              <Share2 className="w-6 h-6 mr-2" />
              Compartilhar Link
            </Button>
          </CardContent>
        </Card>

        {/* Saldo de Comissão */}
        <Card className="mb-8 border-2 border-green-500 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-green-600 to-green-500 text-white">
            <CardTitle className="text-2xl flex items-center gap-2">
              <DollarSign className="w-6 h-6" />
              Seus Ganhos em Dinheiro
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="bg-green-50 rounded-lg p-6 mb-4 text-center">
              <p className="text-sm text-gray-600 mb-2">Saldo em Dinheiro</p>
              <p className="text-5xl font-bold text-green-600 mb-2">
                R$ {fmtBR((currentUser?.commission_balance || 0))}
              </p>
              <p className="text-sm text-gray-500">3% de comissão a cada compra</p>
            </div>

            <Button
              onClick={() => navigate(createPageUrl("WalletDeposit"))}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4"
            >
              💚 Usar Saldo em Leilões
            </Button>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-2 border-blue-500">
            <CardContent className="p-6 text-center">
              <Users className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <p className="text-4xl font-bold text-gray-900 mb-2">{stats.totalLeads}</p>
              <p className="text-gray-600">Total de Indicações</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-500">
            <CardContent className="p-6 text-center">
              <TrendingUp className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <p className="text-4xl font-bold text-gray-900 mb-2">{stats.totalPurchases}</p>
              <p className="text-gray-600">Compras Realizadas</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-yellow-500">
            <CardContent className="p-6 text-center">
              <DollarSign className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
              <p className="text-4xl font-bold text-gray-900 mb-2">
                R$ {fmtBR(stats.totalRevenue)}
              </p>
              <p className="text-gray-600">Volume Total Gerado</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Indicações */}
        {leads.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Suas Indicações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">
                        {lead.lead_name || lead.lead_email}
                      </p>
                      <p className="text-sm text-gray-600">
                        {lead.total_purchases || 0} compras · R$ {fmtBR((lead.total_spent || 0))}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      lead.status === 'active_buyer' 
                        ? 'bg-green-100 text-green-700' 
                        : lead.status === 'registered'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
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
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Comece a Indicar!
              </h3>
              <p className="text-gray-600 mb-6">
                Compartilhe seu link e comece a ganhar com suas indicações.
              </p>
              <Button
                onClick={handleShare}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Compartilhar Agora
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Modal de Saque */}
        {showWithdrawalModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-2xl font-bold text-gray-900">💸 Solicitar Saque</h3>
                <button
                  onClick={() => setShowWithdrawalModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <p className="text-sm text-gray-600 mb-1">Saldo Disponível:</p>
                  <p className="text-3xl font-bold text-purple-600">
                    R$ {fmtBR((currentUser?.commission_balance || 0))}
                  </p>
                </div>

                <div>
                  <Label className="text-gray-700">Valor do Saque</Label>
                  <Input
                    type="number"
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    placeholder="0.00"
                    className="text-lg"
                    disabled={isProcessing}
                  />
                </div>

                <div>
                  <Label className="text-gray-700">Tipo de Chave PIX</Label>
                  <select
                    value={pixKeyType}
                    onChange={(e) => setPixKeyType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                    disabled={isProcessing}
                  >
                    <option value="CPF">CPF</option>
                    <option value="CNPJ">CNPJ</option>
                    <option value="EMAIL">E-mail</option>
                    <option value="PHONE">Telefone</option>
                    <option value="RANDOM">Chave Aleatória</option>
                  </select>
                </div>

                <div>
                  <Label className="text-gray-700">Chave PIX</Label>
                  <Input
                    type="text"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder="Sua chave PIX"
                    disabled={isProcessing}
                  />
                </div>

                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm text-blue-800">
                    ℹ️ O saque será processado em até 2 dias úteis após aprovação.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => setShowWithdrawalModal(false)}
                    variant="outline"
                    className="flex-1"
                    disabled={isProcessing}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleWithdrawalSubmit}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Solicitar Saque'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}