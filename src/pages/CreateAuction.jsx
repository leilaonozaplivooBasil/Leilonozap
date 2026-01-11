import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";

const Auction = base44.entities.Auction;
const User = { me: () => base44.auth.me() };
const AppUser = base44.entities.AppUser;
import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, Image as ImageIcon, DollarSign, Link as LinkIcon, Loader2, Trash2, Zap, BeakerIcon, UploadCloud, Beaker, FastForward, RefreshCw, FlaskConical, AlertCircle, Sparkles, CheckCircle, Package } from "lucide-react";
import { createPageUrl } from "@/utils";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { addSeconds } from 'date-fns';
import ProductImagePreview from "../components/admin/ProductImagePreview";
import ConfirmProductDuplicationModal from "../components/admin/ConfirmProductDuplicationModal";

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
  
  const [productName, setProductName] = useState("");
  const [confirmedProductName, setConfirmedProductName] = useState("");
  const [isSearchingName, setIsSearchingName] = useState(false);
  const [productPreview, setProductPreview] = useState(null);
  const [availableAds, setAvailableAds] = useState([]);
  const [selectedAd, setSelectedAd] = useState(null);
  const [isLoadingAds, setIsLoadingAds] = useState(false);
  const [adImagePool, setAdImagePool] = useState([]);
  const [manualStep, setManualStep] = useState(0);
  const [debugError, setDebugError] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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

  const searchByName = async () => {
    if (!productName || productName.trim().length < 3) {
      toast.error("Digite pelo menos 3 caracteres do nome do produto");
      return;
    }
    setIsSearchingName(true);
    setManualStep(1);
    setDebugError(null);
    setProductPreview(null);
    setAvailableAds([]);
    setSelectedAd(null);

    try {
        const response = await base44.functions.invoke('searchProductByName', { 
          productName: productName.trim()
        });

        if (!response || response.status !== 200 || !response.data?.found) {
          throw new Error(response?.data?.error || 'Produto não encontrado');
        }
        const data = response.data;
        setConfirmedProductName(productName.trim());
        setProductPreview({
          title: data.title,
          price: data.price,
          thumbnailUrl: data.thumbnailUrl,
          imageCount: data.imageCount || 0,
        });
        setManualStep(10);
        toast.success("✅ Produto encontrado! Confirme para prosseguir.");
    } catch (error) {
      setDebugError({ type: 'searchByName', message: error.message });
      toast.error(`Erro na busca: ${error.message}`);
      setManualStep(0);
    } finally {
      setIsSearchingName(false);
    }
  };


  
  const applyPreviewDataAsFallback = () => {
      setFormData(prev => ({
          ...prev,
          title: productPreview.title,
          starting_price: productPreview.price ? productPreview.price.toString() : prev.starting_price,
      }));
      setAdImagePool(productPreview.thumbnailUrl ? [productPreview.thumbnailUrl] : []);
      setManualStep(12);
      toast.warning("Usando dados básicos do produto.");
  }

  const downloadDataFromAd = async () => {
    if (!selectedAd) {
      toast.error('Selecione um anúncio primeiro!');
      return;
    }
    setIsLoadingAds(true);
    toast.info('🤖 Buscando detalhes e galeria do anúncio...');
    
    try {
      const response = await base44.functions.invoke('searchProductByName', { 
        productName: confirmedProductName,
        adUrl: selectedAd.url
      });

      if (!response || response.status !== 200 || !response.data.imageUrls || response.data.imageUrls.length === 0) {
        throw new Error('Não foi possível carregar as imagens deste anúncio.');
      }
      
      const data = response.data;
      
      setFormData(prev => ({
          ...prev,
          title: data.title,
          description: data.description,
          starting_price: data.price ? data.price.toString() : prev.starting_price,
          source_url: data.source
      }));

      setAdImagePool(data.imageUrls);
      setManualStep(5);
      toast.success(`✅ ${data.imageUrls.length} imagens importadas!`);
      
    } catch (error) {
      toast.error(`❌ ${error.message} Tente outro anúncio.`);
    } finally {
      setIsLoadingAds(false);
    }
  };

  const applyToForm = () => {
    const finalImages = adImagePool.slice(0, 5);
    while (finalImages.length < 5) finalImages.push("");

    setFormData(prev => ({ ...prev, image_urls: finalImages }));
    
    resetImporterState();
    toast.success("✅ Dados aplicados com sucesso no formulário!");
  };

  const resetImporterState = () => {
      setManualStep(0);
      setProductName("");
      setProductPreview(null);
      setConfirmedProductName("");
      setAvailableAds([]);
      setSelectedAd(null);
      setAdImagePool([]);
  }

  const cancelPreview = () => {
    resetImporterState();
    toast.info("Busca cancelada.");
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
                      <LinkIcon className="w-5 h-5" /> Importador Automático Por Nome
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    
                    {manualStep === 0 && (
                      <div className="bg-purple-900/20 border-2 border-purple-500/50 rounded-xl p-4">
                        <Label htmlFor="productName" className="text-sm font-bold text-purple-300 flex items-center gap-2 mb-2">
                          <Zap className="w-4 h-4" /> 1. Buscar Produto Pelo Nome
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="productName"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            onKeyPress={(e) => { if (e.key === 'Enter') searchByName(); }}
                            placeholder="Ex: iPhone 15 Pro, Geladeira Samsung 500L..."
                            className="bg-gray-900 border-purple-600 text-gray-100"
                            disabled={isSearchingName}
                          />
                          <Button onClick={searchByName} disabled={isSearchingName || !productName.trim()} className="bg-purple-600 hover:bg-purple-700">
                            {isSearchingName ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {manualStep === 1 && (
                      <div className="text-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
                        <p className="text-blue-400">Buscando produto na internet...</p>
                      </div>
                    )}
                    

                    


                    {manualStep === 5 && (
                      <div className="bg-green-900/30 p-4 rounded-lg border border-green-700">
                          <h4 className="font-bold text-green-300 mb-3">✅ Produto Importado!</h4>
                          <ProductImagePreview imageUrls={adImagePool} />
                          <Button onClick={applyToForm} className="w-full mt-4 bg-green-600 hover:bg-green-700">🚀 Aplicar no Formulário</Button>
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