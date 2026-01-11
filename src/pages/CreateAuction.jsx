import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";

const Auction = base44.entities.Auction;
const User = { me: () => base44.auth.me() };
import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Link as LinkIcon, Loader2, Zap } from "lucide-react";
import { createPageUrl } from "@/utils";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { addSeconds } from 'date-fns';
import ProductImagePreview from "../components/admin/ProductImagePreview";
import ConfirmProductDuplicationModal from "../components/admin/ConfirmProductDuplicationModal";
import ProductValidationModal from "../components/admin/ProductValidationModal";

const MASTER_ADMIN_EMAIL = 'luizsantanna@tttcorporate.com';

export default function CreateAuction() {
  const navigate = useNavigate();
  
  const urlParams = new URLSearchParams(window.location.search);
  const partnerStore = urlParams.get('partner') || 'nozap';
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image_urls: ["", "", "", "", ""],
    starting_price: "",
    increment: "10.00",
    buy_now_price: "",
    duration: "86400",
    category: partnerStore === 'sai_de_baixo' ? "masculino" : "outros",
    source_url: "",
    product_source: "return_resale",
    comparai_mode: "google_shopping",
    partner_store: partnerStore,
    product_id: "",
    allowed_regions: []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  const [auctionUrl, setAuctionUrl] = useState("");
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [searchResult, setSearchResult] = useState(null);

  const loadCurrentUser = useCallback(async () => {
    try {
      const user = await User.me();
      if (user && (user.email === MASTER_ADMIN_EMAIL || user.role === 'admin')) {
        setCurrentUser(user);
      } else {
        toast.error("Acesso negado. Apenas administradores podem criar leilões.");
        navigate(createPageUrl("Home"));
      }
    } catch (error) {
      toast.error("Você precisa estar logado como administrador.");
      navigate(createPageUrl("Home"));
    }
  }, [navigate]);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const extractFromUrl = async () => {
    if (!auctionUrl || auctionUrl.trim().length < 10) {
      toast.error("Cole a URL completa do anúncio do Mercado Livre");
      return;
    }
    
    setIsLoadingUrl(true);
    try {
      const response = await base44.functions.invoke('searchProductByName', { 
        adUrl: auctionUrl.trim()
      });

      if (!response?.data?.found) {
        throw new Error(response?.data?.error || 'Erro ao extrair anúncio');
      }

      const imageUrls = response.data.imageUrls || [];
      
      setSearchResult({
        title: response.data.title || "Produto",
        description: response.data.description || "",
        image_urls: imageUrls,
        source: response.data.source || "Mercado Livre"
      });
    } catch (error) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsLoadingUrl(false);
    }
  };

  const handleValidationConfirm = () => {
    if (validationData) {
      const finalImages = validationData.image_urls.slice(0, 5);
      while (finalImages.length < 5) finalImages.push("");
      
      setFormData(prev => ({
        ...prev,
        title: validationData.title,
        description: validationData.description,
        image_urls: finalImages
      }));
      
      setShowValidationModal(false);
      setValidationData(null);
      setAuctionUrl("");
      toast.success(`✅ ${validationData.image_urls.length} imagens importadas!`);
    }
  };

  const handleValidationCancel = () => {
    setShowValidationModal(false);
    setValidationData(null);
    setAuctionUrl("");
  };






  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.email !== MASTER_ADMIN_EMAIL)) {
      toast.error("Apenas administradores podem criar leilões");
      return;
    }
    const finalImageUrls = formData.image_urls.filter(url => url && url.trim() !== "");
    if (!formData.title || !formData.description || finalImageUrls.length === 0 || !formData.starting_price || !formData.increment) {
      toast.error("Por favor, preencha todos os campos obrigatórios (*)");
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmDuplication = async ({ includeAuction }) => {
    setIsSubmitting(true);
    try {
      if (includeAuction) {
        const now = new Date();
        const endTime = addSeconds(now, parseInt(formData.duration));
        const auctionData = {
          ...formData,
          starting_price: parseFloat(formData.starting_price),
          current_price: parseFloat(formData.starting_price),
          increment: parseFloat(formData.increment),
          buy_now_price: formData.buy_now_price ? parseFloat(formData.buy_now_price) : null,
          end_time: endTime.toISOString(),
          status: 'active',
          seller_id: currentUser.id,
          seller_name: currentUser.full_name,
          image_urls: formData.image_urls.filter(url => url)
        };
        await Auction.create(auctionData);
      }
      toast.success("✅ Leilão criado com sucesso!");
      navigate(createPageUrl("Home"));
    } catch (error) {
      toast.error("❌ Erro ao criar leilão: " + error.message);
    } finally {
      setIsSubmitting(false);
      setShowConfirmModal(false);
    }
  };

  if (!currentUser) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 text-gray-300">
      {showConfirmModal && (
        <ConfirmProductDuplicationModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleConfirmDuplication}
          formData={formData}
          isLoading={isSubmitting}
        />
      )}

      <div className="max-w-4xl mx-auto">
        <Card className="shadow-xl bg-gray-800/50 backdrop-blur-sm border border-gray-700">
          <CardHeader className="text-center border-b border-gray-700">
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2 text-white">
              <Upload className="w-6 h-6" />
              Criar Novo Leilão
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            <Tabs defaultValue="criar" className="w-full">
              <TabsList className="grid w-full grid-cols-1 mb-6 bg-gray-700/50">
                <TabsTrigger value="criar" className="data-[state=active]:bg-green-600">
                  <Upload className="w-4 h-4 mr-2" />
                  Criar Leilão
                </TabsTrigger>
              </TabsList>
              <TabsContent value="criar" className="space-y-6">
                <Card className="bg-gray-800 border border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-blue-400">
                      <LinkIcon className="w-5 h-5" /> Importador do Mercado Livre
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-purple-900/20 border-2 border-purple-500/50 rounded-xl p-4">
                      <Label htmlFor="auctionUrl" className="text-sm font-bold text-purple-300 flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4" /> Cole a URL do Anúncio do Mercado Livre
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="auctionUrl"
                          value={auctionUrl}
                          onChange={(e) => setAuctionUrl(e.target.value)}
                          onKeyPress={(e) => { if (e.key === 'Enter') extractFromUrl(); }}
                          placeholder="https://www.mercadolivre.com.br/iphone-17-pro-max..."
                          className="bg-gray-900 border-purple-600 text-gray-100"
                          disabled={isLoadingUrl}
                        />
                        <Button onClick={extractFromUrl} disabled={isLoadingUrl || !auctionUrl.trim()} className="bg-purple-600 hover:bg-purple-700 whitespace-nowrap">
                          {isLoadingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : "Extrair"}
                        </Button>
                      </div>
                      {isLoadingUrl && <p className="text-sm text-purple-300 mt-2">Extraindo URLs das imagens...</p>}
                    </div>

                    {showValidationModal && validationData && (
                      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <Card className="w-full max-w-2xl shadow-2xl bg-gray-800 border border-gray-700">
                          <CardHeader className="border-b border-gray-700">
                            <CardTitle className="text-lg text-blue-400">Validar Dados do Anúncio</CardTitle>
                          </CardHeader>
                          <CardContent className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            {/* TÍTULO */}
                            <div>
                              <h3 className="text-xs font-bold text-blue-300 mb-2">TÍTULO</h3>
                              <p className="bg-gray-900 border border-gray-600 rounded p-3 text-gray-200 text-sm">{validationData.title}</p>
                            </div>

                            {/* DESCRIÇÃO */}
                            <div>
                              <h3 className="text-xs font-bold text-blue-300 mb-2">DESCRIÇÃO</h3>
                              <p className="bg-gray-900 border border-gray-600 rounded p-3 text-gray-200 text-sm max-h-[100px] overflow-y-auto">{validationData.description}</p>
                            </div>

                            {/* IMAGENS - SÓ ENDEREÇOS */}
                            <div>
                              <h3 className="text-xs font-bold text-blue-300 mb-2">IMAGENS ({validationData.image_urls?.length || 0} encontradas)</h3>
                              <div className="bg-gray-900 border border-gray-600 rounded p-3 space-y-2 max-h-[200px] overflow-y-auto">
                                {validationData.image_urls && validationData.image_urls.length > 0 ? (
                                  validationData.image_urls.map((url, idx) => (
                                    <div key={idx} className="text-xs text-gray-400 break-all font-mono bg-gray-950 p-2 rounded border border-gray-700">
                                      {idx + 1}. {url}
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-gray-400 text-xs">Nenhuma imagem extraída</p>
                                )}
                              </div>
                            </div>

                            {/* BOTÕES */}
                            <div className="flex gap-3 pt-4 border-t border-gray-700">
                              <Button onClick={handleValidationCancel} variant="outline" className="flex-1">Rejeitar</Button>
                              <Button onClick={handleValidationConfirm} className="flex-1 bg-green-600 hover:bg-green-700">✅ Confirmar</Button>
                            </div>
                          </CardContent>
                          </Card>
                          </div>
                          )}
                          </CardContent>
                </Card>

                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                  {/* FORM FIELDS */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title" className="text-sm font-medium text-gray-400">Nome do Produto *</Label>
                        <Input id="title" value={formData.title} onChange={(e) => handleInputChange("title", e.target.value)} required className="mt-1 bg-gray-900 border-gray-600"/>
                      </div>
                      <div>
                        <Label htmlFor="description" className="text-sm font-medium text-gray-400">Descrição Detalhada *</Label>
                        <Textarea id="description" value={formData.description} onChange={(e) => handleInputChange("description", e.target.value)} className="mt-1 min-h-[100px] bg-gray-900 border-gray-600" required />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <ProductImagePreview imageUrls={formData.image_urls} />
                    </div>
                  </div>
                  <Card className="bg-gray-800 border-gray-700">
                      <CardHeader><CardTitle className="text-lg text-green-400">Preços e Duração</CardTitle></CardHeader>
                      <CardContent className="grid md:grid-cols-3 gap-4">
                           <div>
                                <Label htmlFor="starting_price">Preço Inicial (R$) *</Label>
                                <Input id="starting_price" type="number" step="0.01" value={formData.starting_price} onChange={(e) => handleInputChange("starting_price", e.target.value)} required className="mt-1 bg-gray-900 border-gray-600" />
                           </div>
                           <div>
                                <Label htmlFor="increment">Incremento (R$) *</Label>
                                <Input id="increment" type="number" step="0.01" value={formData.increment} onChange={(e) => handleInputChange("increment", e.target.value)} required className="mt-1 bg-gray-900 border-gray-600" />
                           </div>
                           <div>
                               <Label htmlFor="duration">Duração</Label>
                                <Select value={formData.duration} onValueChange={(value) => handleInputChange("duration", value)} >
                                  <SelectTrigger className="mt-1 bg-gray-900 border-gray-600"><SelectValue /></SelectTrigger>
                                  <SelectContent className="bg-gray-800">
                                    <SelectItem value="60">1 Minuto</SelectItem>
                                    <SelectItem value="300">5 Minutos</SelectItem>
                                    <SelectItem value="86400">1 Dia</SelectItem>
                                  </SelectContent>
                                </Select>
                           </div>
                      </CardContent>
                  </Card>
                  <div className="flex gap-4 pt-6">
                    <Button type="button" variant="outline" onClick={() => navigate(createPageUrl("Home"))} className="flex-1"> Cancelar </Button>
                    <Button type="submit" disabled={isSubmitting} className="flex-1 bg-green-600 hover:bg-green-700">
                      {isSubmitting ? <Loader2 className="animate-spin" /> : "Criar Leilão"}
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}