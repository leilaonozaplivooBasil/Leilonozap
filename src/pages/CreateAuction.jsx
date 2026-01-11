import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";

const Auction = base44.entities.Auction;
const User = { me: () => base44.auth.me() };
const AppUser = base44.entities.AppUser;
import { extractDataFromUrl } from "@/functions/extractDataFromUrl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, Image as ImageIcon, DollarSign, Link as LinkIcon, Loader2, Trash2, Zap, BeakerIcon, UploadCloud, Beaker, FastForward, RefreshCw, FlaskConical, AlertCircle, Sparkles, CheckCircle, Copy, Package } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createTestAuction } from "@/functions/createTestAuction";
import { simulateTestBids } from "@/functions/simulateTestBids";
import { fastForwardTestAuction } from "@/functions/fastForwardTestAuction";
import { deleteTestAuctions } from "@/functions/deleteTestAuctions";
import { resetTestData } from "@/functions/resetTestData";
import { resetTestValora } from "@/functions/resetTestValora";
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
    supplier_url: "",
    supplier_logo_url: "",
    comparai_mode: "google_shopping",
    partner_store: partnerStore,
    store_id: "",
    product_id: "",
    allowed_regions: []
  });
  
  const [isSubmittingBid, setIsSubmittingBid] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [stores, setStores] = useState([]);
  const [productUrl, setProductUrl] = useState("");
  const [gtinCode, setGtinCode] = useState("");
  const [productName, setProductName] = useState("");
  const [isSearchingGtin, setIsSearchingGtin] = useState(false);
  const [isSearchingName, setIsSearchingName] = useState(false);
  const [productPreview, setProductPreview] = useState(null);
  const [selectedMarketplace, setSelectedMarketplace] = useState(null);
  const [availableAds, setAvailableAds] = useState([]);
  const [isLoadingAds, setIsLoadingAds] = useState(false);
  const [clonedAdData, setClonedAdData] = useState(null);
  const [manualStep, setManualStep] = useState(0);
  const [extractedData, setExtractedData] = useState({ title: "", description: "" });
  const [imageUrls, setImageUrls] = useState(["", "", "", "", "", ""]);
  const [downloadedImages, setDownloadedImages] = useState([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [supplierLogoPreview, setSupplierLogoPreview] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [manualUploadImages, setManualUploadImages] = useState([]);
  const [manualCoverIndex, setManualCoverIndex] = useState(0);
  const [showManualUpload, setShowManualUpload] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [debugError, setDebugError] = useState(null);
  const [catalogActive, setCatalogActive] = useState(false);
  const [priceCatalog, setPriceCatalog] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [extractedImageUrls, setExtractedImageUrls] = useState(['', '', '', '', '', '']);
  const [testAuctions, setTestAuctions] = useState([]);
  const [selectedTestAuction, setSelectedTestAuction] = useState("");
  const [testDuration, setTestDuration] = useState(3);
  const [bidCount, setBidCount] = useState(5);
  const [secondsToSkip, setSecondsToSkip] = useState(60);
  const [isProcessingTest, setIsProcessingTest] = useState(false);
  const [isResettingTestValora, setIsResettingTestValora] = useState(false);

  const loadCurrentUser = useCallback(async () => {
    let userFound = null;
    const savedUserJSON = localStorage.getItem('currentUser');
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    
    if (savedUserJSON && isLoggedIn) {
      const userFromStorage = JSON.parse(savedUserJSON);
      try {
        const usersInDB = await AppUser.filter({ id: userFromStorage.id });
        if (usersInDB.length > 0) {
          userFound = usersInDB[0];
        }
      } catch (e) {
        console.error("Falha ao validar AppUser no DB", e);
      }
    }

    if (!userFound) {
      try {
        const platformUser = await User.me();
        if (platformUser) {
          userFound = platformUser;
        }
      } catch (e) {
        console.log("Nenhum usuário da plataforma encontrado.", e.message);
      }
    }

    if (userFound) {
      if (userFound.email === MASTER_ADMIN_EMAIL) {
        userFound.role = 'admin';
      }

      if (userFound.role === 'admin') {
        setCurrentUser(userFound);
      } else {
        alert("Acesso negado. Apenas administradores podem criar leilões.");
        navigate(createPageUrl("Home"));
      }
    } else {
      alert("Acesso negado. Você precisa estar logado como administrador.");
      navigate(createPageUrl("Home"));
    }
  }, [navigate]);

  React.useEffect(() => {
    loadCurrentUser();
    loadStores();
    
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('product_id');
    
    if (productId) {
      loadProductData(productId);
    }
  }, [loadCurrentUser]);

  const loadProductData = async (productId) => {
    try {
      const Product = base44.entities.Product;
      const products = await Product.filter({ id: productId });
      
      if (products.length > 0) {
        const product = products[0];
        setFormData(prev => ({
          ...prev,
          title: product.description,
          description: product.description + (product.notes ? `\n\n${product.notes}` : ''),
          starting_price: (product.selling_price_retail || product.cost_price * 1.5).toFixed(2),
          product_id: product.id
        }));
      }
    } catch (error) {
      console.error("Erro ao carregar produto:", error);
    }
  };

  const loadStores = async () => {
    try {
      const StoreEntity = base44.entities.Store;
      const allStores = await StoreEntity.filter({ status: 'active' });
      setStores(allStores);
    } catch (error) {
      console.error("Erro ao carregar lojistas:", error);
    }
  };

  const loadTestAuctions = async () => {
    try {
      const allAuctions = await Auction.list("-created_date", 50);
      const tests = allAuctions.filter(a => a.title && a.title.includes('[TESTE]'));
      setTestAuctions(tests);
    } catch (error) {
      console.error("Erro ao carregar testes:", error);
    }
  };

  useEffect(() => {
    loadTestAuctions();
    const interval = setInterval(loadTestAuctions, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateTest = async () => {
    setIsProcessingTest(true);
    try {
      const data = await createTestAuction({ duration: testDuration }); 
      toast.success("✅ Leilão de teste criado!");
      loadTestAuctions();
      navigate(createPageUrl("AuctionRoom") + `?id=${data.auction_id}`);
    } catch (error) {
      toast.error("❌ Erro ao criar teste: " + error.message);
    } finally {
      setIsProcessingTest(false);
    }
  };

  const handleSimulateBids = async () => {
    if (!selectedTestAuction) {
      toast.error("Selecione um leilão de teste");
      return;
    }
    setIsProcessingTest(true);
    try {
      await simulateTestBids({ auction_id: selectedTestAuction, bid_count: bidCount });
      toast.success(`✅ ${bidCount} lances simulados!`);
      loadTestAuctions();
    } catch (error) {
      toast.error("❌ Erro: " + error.message);
    } finally {
      setIsProcessingTest(false);
    }
  };

  const handleFastForward = async () => {
    if (!selectedTestAuction) {
      toast.error("Selecione um leilão de teste");
      return;
    }
    setIsProcessingTest(true);
    try {
      await fastForwardTestAuction({ auction_id: selectedTestAuction, seconds: secondsToSkip });
      toast.success(`⏩ Tempo acelerado em ${secondsToSkip}s!`);
      loadTestAuctions();
    } catch (error) {
      toast.error("❌ Erro: " + error.message);
    } finally {
      setIsProcessingTest(false);
    }
  };

  const handleDeleteTests = async () => {
    if (!confirm("⚠️ Deletar TODOS os leilões de teste?")) return;
    setIsProcessingTest(true);
    try {
      const data = await deleteTestAuctions();
      toast.success(`🗑️ ${data?.deletedAuctions?.length || 0} leilões deletados!`);
      loadTestAuctions();
      setSelectedTestAuction("");
    } catch (error) {
      toast.error("❌ Erro: " + error.message);
    } finally {
      setIsProcessingTest(false);
    }
  };

  const handleResetData = async () => {
    if (!confirm("⚠️ RESETAR TODOS os dados de teste? (Licenciados serão zerados)")) return;
    if (!confirm("🚨 TEM CERTEZA ABSOLUTA? Esta ação é IRREVERSÍVEL!")) return;
    setIsProcessingTest(true);
    try {
      await resetTestData();
      toast.success("🔄 Sistema de testes resetado!");
      loadTestAuctions();
    } catch (error) {
      toast.error("❌ Erro: " + error.message);
    } finally {
      setIsProcessingTest(false);
    }
  };

  const handleResetTestValora = async () => {
    const confirmReset = window.confirm(
      "🧪 ZERAR VALORA PAY DE TESTE?\n\n" +
      "Esta ação vai ZERAR todo o saldo de TESTE (test_valora_balance) de TODOS os usuários.\n\n" +
      "⚠️ O saldo REAL (valora_pay_balance) NÃO será afetado.\n\n" +
      "Deseja continuar?"
    );
    
    if (!confirmReset) return;

    setIsResettingTestValora(true);
    toast.info("🧪 Zerando saldos de teste...");
    
    try {
      const response = await resetTestValora();
      
      if (response.status === 200) {
        const data = response.data;
        toast.success(
          `✅ ${data.usersReset} usuários resetados!\n` +
          `💰 V$ ${data.totalTestValoraZerado} de teste zerado`
        );
      }
    } catch (err) {
      toast.error("❌ Erro ao zerar: " + err.message);
    } finally {
      setIsResettingTestValora(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const searchByName = async () => {
    if (!productName || productName.trim().length < 3) {
      toast.error("Digite pelo menos 3 caracteres do nome do produto");
      return;
    }

    const words = productName.trim().split(' ');
    if (words.length === 1) {
      toast.warning("Seja mais específico: adicione marca e modelo (ex: Samsung Galaxy S23 Ultra)");
      return;
    }

    setIsSearchingName(true);
    setManualStep(1);

    try {
        const response = await base44.functions.invoke('searchProductByName', { 
          productName: productName.trim()
        });

        if (!response || response.status !== 200) {
          throw new Error(response?.data?.error || 'Erro na busca');
        }

        const data = response.data;

        if (!data?.found) {
          toast.error(`Produto não encontrado. Tente com nome mais completo`);
          setManualStep(0);
          return;
        }

        setProductPreview({
          title: data.title,
          description: data.description,
          price: data.price,
          thumbnailUrl: data.thumbnailUrl,
          imageCount: data.imageCount || 0,
          allImages: data.imageUrls || []
        });
        
        setManualStep(10);
        toast.success("✅ Produto encontrado! Confirme para prosseguir.");
      
    } catch (error) {
      console.error("❌ Erro:", error);
      toast.error(`Erro na busca: ${error.message}`);
      setManualStep(0);
    } finally {
      setIsSearchingName(false);
    }
  };

  const confirmAndFetchImages = async () => {
    if (!productPreview) return;

    setIsLoadingAds(true);
    setManualStep(1);

    try {
      const response = await base44.functions.invoke('searchProductByName', {
        productName: productName.trim(),
        listAdsOnly: true
      });

      if (!response || response.status !== 200) {
        throw new Error('Erro ao buscar anúncios');
      }

      const data = response.data;
      
      if (!data.ads || data.ads.length === 0) {
        toast.warning('Nenhum anúncio encontrado. Usando dados básicos.');
        applyPreviewData();
        return;
      }

      setAvailableAds(data.ads);
      setManualStep(11);
      toast.success(`✅ ${data.ads.length} anúncios encontrados!`);
      
    } catch (error) {
      toast.error('Erro ao buscar anúncios. Usando dados básicos.');
      applyPreviewData();
    } finally {
      setIsLoadingAds(false);
    }
  };

  const applyPreviewData = () => {
    setExtractedData({ 
      title: productPreview.title, 
      description: productPreview.description 
    });
    
    setFormData(prev => ({ 
      ...prev, 
      title: productPreview.title, 
      description: productPreview.description,
      starting_price: productPreview.price ? productPreview.price.toString() : prev.starting_price
    }));

    const validUrls = productPreview.allImages.filter(url => url && url.trim());

    if (validUrls.length > 0) {
      setDownloadedImages(validUrls);
      setCoverIndex(0);
      setManualStep(3);
    } else {
      setManualStep(0);
    }

    setProductName("");
    setProductPreview(null);
  };

  const cancelPreview = () => {
    setProductPreview(null);
    setProductName("");
    setManualStep(0);
    toast.info("Busca cancelada. Digite novamente.");
  };

  const searchByGtin = async () => {
    if (!gtinCode || gtinCode.trim().length < 8) {
      toast.error("Digite um código GTIN válido (mínimo 8 dígitos)");
      return;
    }

    setIsSearchingGtin(true);
    setManualStep(1);

    try {
        const response = await base44.functions.invoke('searchProductByGTIN', { 
          gtin: gtinCode.trim() 
        });

      if (!response || response.status !== 200) {
        throw new Error(response?.data?.error || 'Erro GTIN');
      }

      const data = response.data;

      if (!data?.found) {
        toast.error(`GTIN não encontrado. Verifique o código ou use busca por nome/URL`);
        setManualStep(0);
        return;
      }

      const productTitle = data.title || "Produto";
      const productDesc = data.description || `${data.brand || 'Produto'} - GTIN: ${data.gtin}`;

      setExtractedData({ title: productTitle, description: productDesc });
      setFormData(prev => ({ ...prev, title: productTitle, description: productDesc }));

      const validUrls = (data.imageUrls || []).filter(url => url && typeof url === 'string' && url.trim());

      if (validUrls.length === 0) {
        toast.warning(`⚠️ ${productTitle} sem imagens. Use upload manual.`);
        setGtinCode("");
        setManualStep(0);
      } else {
        toast.success(`✅ ${validUrls.length} imagens validadas! (${data.source})`);
        setDownloadedImages(validUrls);
        setCoverIndex(0);
        setManualStep(3);
      }

      setGtinCode("");
      
    } catch (error) {
      console.error("❌ [GTIN] ERRO:", error);
      toast.error(`Erro no código de barras. Tente busca por nome ou URL direta.`);
      setManualStep(0);
    } finally {
      setIsSearchingGtin(false);
    }
  };

  const extractAllData = async () => {
    if (!productUrl) {
      toast.error("Cole a URL do produto primeiro!");
      return;
    }
    setIsProcessing(true);
    setManualStep(1);
    
    try {
      toast.info("🤖 IA extraindo dados e URLs de imagens...");
      
      const response = await extractDataFromUrl({ productUrl });
      
      if (!response || !response.data) {
          throw new Error("Falha na extração");
      }
      
      const { title, description, price, imageUrls } = response.data;
      
      if (!title || !description) {
        throw new Error("Dados incompletos");
      }
      
      setExtractedData({ title, description });
      
      if (imageUrls && imageUrls.length > 0) {
        setExtractedImageUrls(imageUrls.slice(0, 6));
        setManualStep(2);
        toast.success(`✅ ${imageUrls.length} URLs de imagens encontradas!`);
      } else {
        toast.warning("⚠️ Nenhuma imagem encontrada. Use upload manual.");
        
        setFormData(prev => ({
          ...prev,
          title,
          description,
          starting_price: price ? price.toString() : prev.starting_price,
          source_url: productUrl
        }));
        
        setProductUrl("");
        setManualStep(0);
      }
      
    } catch (error) {
      console.error("❌ Erro:", error);
      toast.error("Erro ao extrair. Use outro método.");
      setManualStep(0);
    }
    
    setIsProcessing(false);
  };

  const handleSupplierLogoUpload = async (file) => {
    if (!file) return;
    
    setIsUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      
      if (result?.file_url) {
        setFormData(prev => ({ ...prev, supplier_logo_url: result.file_url }));
        setSupplierLogoPreview(result.file_url);
        alert("✅ Logo enviada com sucesso!");
      } else {
        throw new Error("Falha ao receber URL da logo.");
      }
    } catch (error) {
      console.error("Erro ao enviar logo:", error);
      alert("❌ Erro ao enviar logo: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmDuplication = async ({ includeAuction, includeCatalog }) => {
    setIsSubmittingBid(true);

    try {
      const finalImageUrls = formData.image_urls.filter(url => url && url.trim() !== "");

      if (includeAuction) {
        const now = new Date();
        const endTime = addSeconds(now, parseInt(formData.duration));
        const endTimeISO = endTime.toISOString();

        const auctionData = {
          title: formData.title,
          description: formData.description,
          image_urls: finalImageUrls,
          starting_price: parseFloat(formData.starting_price),
          current_price: parseFloat(formData.starting_price),
          increment: parseFloat(formData.increment),
          buy_now_price: formData.buy_now_price ? parseFloat(formData.buy_now_price) : null,
          end_time: endTimeISO,
          category: formData.category,
          status: 'active',
          seller_id: formData.store_id || currentUser.id,
          seller_name: formData.store_id ? stores.find(s => s.id === formData.store_id)?.store_name : currentUser.full_name,
          source_url: formData.supplier_url || formData.source_url || null,
          product_source: formData.product_source,
          supplier_logo_url: formData.supplier_logo_url || null,
          comparai_mode: formData.comparai_mode || "google_shopping",
          partner_store: formData.partner_store || 'nozap',
          product_id: formData.product_id || null,
          allowed_regions: formData.allowed_regions || [],
        };
        await Auction.create(auctionData);
      }

      if (includeCatalog) {
        const Product = base44.entities.Product;
        const productData = {
          description: formData.title,
          notes: formData.description,
          image_urls: finalImageUrls,
          cost_price: 0,
          price_catalog: parseFloat(priceCatalog) || parseFloat(formData.starting_price) * 1.5,
          quantity: 1, 
          catalog_active: true,
        };
        await Product.create(productData);
      }

      let successMessage = "✅ Operação concluída!";
      if (includeAuction && includeCatalog) {
        successMessage = "✅ Produto adicionado ao Leilão e Catálogo com sucesso!";
      } else if (includeAuction) {
        successMessage = "✅ Produto adicionado ao Leilão com sucesso!";
      } else if (includeCatalog) {
        successMessage = "✅ Produto adicionado ao Catálogo com sucesso!";
      }

      toast.success(successMessage);
      setTimeout(() => navigate(createPageUrl("Home")), 1500);

    } catch (error) {
      console.error("Erro na duplicação:", error);
      toast.error("❌ Erro: " + error.message);
    } finally {
      setIsSubmittingBid(false);
      setShowConfirmModal(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentUser || currentUser.role !== 'admin') {
      toast.error("Apenas administradores podem criar leilões");
      return;
    }

    const finalImageUrls = formData.image_urls.filter(url => url && url.trim() !== "");
    if (!formData.title || !formData.description || finalImageUrls.length === 0 || !formData.starting_price || !formData.increment) {
      toast.error("Por favor, preencha todos os campos obrigatórios (*)");
      return;
    }
    
    if (parseFloat(formData.starting_price) <= 0 || parseFloat(formData.increment) <= 0) {
      toast.error("Preços devem ser maiores que zero");
      return;
    }

    setShowConfirmModal(true);
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

  const formatTestAuctionTime = (endTime, status) => {
    if (status !== 'active') return 'Encerrado';
    const now = new Date();
    const end = new Date(endTime);
    const diff = Math.floor((end.getTime() - now.getTime()) / 1000);
    if (diff <= 0) return 'Encerrado';
    const weeks = Math.floor(diff / (7 * 86400));
    if (weeks > 0) return `${weeks} semana${weeks > 1 ? 's' : ''}`;
    const days = Math.floor(diff / 86400);
    if (days > 0) return `${days} dia${days > 1 ? 's' : ''}`;
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 text-gray-300">
      {showConfirmModal && (
        <ConfirmProductDuplicationModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleConfirmDuplication}
          formData={formData}
          isLoading={isSubmittingBid}
        />
      )}

      <div className="max-w-4xl mx-auto">
        <Card className="shadow-xl bg-gray-800/50 backdrop-blur-sm border border-gray-700">
          <CardHeader className="text-center border-b border-gray-700">
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2 text-white">
              <Upload className="w-6 h-6" />
              Criar Novo Leilão
            </CardTitle>
            <p className="text-gray-400">Importador de produtos com 1 clique!</p>
          </CardHeader>

          <CardContent className="p-6 md:p-8">
            <Tabs defaultValue="criar" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-700/50">
                <TabsTrigger value="criar" className="data-[state=active]:bg-green-600">
                  <Upload className="w-4 h-4 mr-2" />
                  Criar Leilão
                </TabsTrigger>
                <TabsTrigger value="lab" className="data-[state=active]:bg-purple-600">
                  <Beaker className="w-4 h-4 mr-2" />
                  Laboratório de Testes
                </TabsTrigger>
              </TabsList>

              <TabsContent value="criar" className="space-y-6">
                <Alert className="bg-amber-900/50 border-amber-700">
                    <BeakerIcon className="h-5 w-5 text-amber-400" />
                    <AlertTitle className="text-amber-300 font-bold">Modo de Teste Rápido</AlertTitle>
                    <AlertDescription className="text-amber-400">
                        Use o importador automático ou preencha os campos abaixo e selecione uma duração curta (1, 5 ou 15 minutos) para testar rapidamente.
                    </AlertDescription>
                </Alert>

                {debugError && (
                  <Alert className="bg-red-900/50 border-red-700">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <AlertTitle className="text-red-300 font-bold">🔍 Erro Detectado</AlertTitle>
                    <AlertDescription className="text-red-400">
                      <div className="space-y-2 mt-2">
                        <div><strong>Tipo:</strong> {debugError.type}</div>
                        <div><strong>Mensagem:</strong> {debugError.message}</div>
                        <Button size="sm" variant="outline" onClick={() => setDebugError(null)} className="mt-2 border-red-600 text-red-400">
                          Fechar
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <Card className="bg-gray-800 border border-gray-700">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-4">
                      <CardTitle className="text-lg flex items-center gap-2 text-blue-400">
                        <LinkIcon className="w-5 h-5" /> Importador Automático
                      </CardTitle>
                      {(formData.title || formData.description || formData.image_urls.some(url => url)) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (!confirm("🔄 Limpar todos os dados do produto atual e começar novo leilão?")) return;
                            
                            setFormData({
                              title: "", description: "", image_urls: ["", "", "", "", ""],
                              starting_price: "", increment: "10.00", buy_now_price: "", duration: "86400",
                              category: partnerStore === 'sai_de_baixo' ? "masculino" : "outros",
                              source_url: "", product_source: "return_resale", supplier_url: "", supplier_logo_url: "",
                              comparai_mode: "google_shopping", partner_store: partnerStore,
                              store_id: "", product_id: "", allowed_regions: []
                            });
                            setProductUrl(""); setGtinCode(""); setProductName(""); setManualStep(0);
                            setExtractedData({ title: "", description: "" }); setImageUrls(["", "", "", "", "", ""]);
                            setDownloadedImages([]); setCoverIndex(0); setSelectedMarketplace(null);
                            setManualUploadImages([]); setManualCoverIndex(0); setSupplierLogoPreview("");
                            
                            toast.success("✅ Formulário limpo! Comece um novo produto.");
                          }}
                          className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white shrink-0"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Limpar e Começar Novo
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    
                    {manualStep === 0 && (
                      <Tabs defaultValue="nome" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 bg-gray-700/50">
                          <TabsTrigger value="nome" className="data-[state=active]:bg-purple-600">🌐 Por Nome</TabsTrigger>
                          <TabsTrigger value="gtin" className="data-[state=active]:bg-green-600">📷 Código Barras</TabsTrigger>
                          <TabsTrigger value="url" className="data-[state=active]:bg-blue-600">🔗 Por URL</TabsTrigger>
                        </TabsList>

                        <TabsContent value="nome" className="mt-4">
                          <div className="bg-purple-900/20 border-2 border-purple-500/50 rounded-xl p-4">
                            <Label htmlFor="productName" className="text-sm font-bold text-purple-300 flex items-center gap-2 mb-2">
                              <Zap className="w-4 h-4" />
                              🌐 Buscar na Internet (Apenas o Nome)
                            </Label>
                            <Input
                              id="productName"
                              value={productName}
                              onChange={(e) => setProductName(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && !isSearchingName && productName.trim()) {
                                  searchByName();
                                }
                              }}
                              placeholder="Ex: iPhone 15 Pro, Geladeira Samsung 500L..."
                              className="mb-3 bg-gray-900 border-purple-600 text-gray-100 placeholder-gray-500"
                              disabled={isSearchingName}
                            />
                            <Button 
                              onClick={searchByName} 
                              disabled={isSearchingName || !productName.trim()}
                              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                            >
                              {isSearchingName ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Buscando produto...</>
                              ) : (
                                <><Zap className="w-4 h-4 mr-2" />🔍 Buscar e Importar</>
                              )}
                            </Button>
                            <div className="mt-3 p-2 bg-purple-900/30 rounded-lg border border-purple-700/50">
                              <p className="text-xs text-purple-300 flex items-center gap-2">
                                <span className="text-base">✨</span>
                                <span>IA busca o produto na internet e importa automaticamente!</span>
                              </p>
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="gtin" className="mt-4">
                          <div className="bg-green-900/20 border-2 border-green-500/50 rounded-xl p-4">
                            <Label htmlFor="gtinCode" className="text-sm font-bold text-green-300 flex items-center gap-2 mb-2">
                              <ImageIcon className="w-4 h-4" />
                              🔍 Buscar por Código de Barras (GTIN/EAN)
                            </Label>
                            <div className="relative">
                              <Input
                                id="gtinCode"
                                value={gtinCode}
                                onChange={(e) => setGtinCode(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && !isSearchingGtin && gtinCode.trim()) {
                                    searchByGtin();
                                  }
                                }}
                                placeholder="Digite ou use o leitor de código de barras"
                                className="mb-3 bg-gray-900 border-green-600 text-gray-100 placeholder-gray-500 pr-10"
                                disabled={isSearchingGtin}
                                maxLength={14}
                              />
                              <div className="absolute right-3 top-3 text-green-400">📷</div>
                            </div>
                            <Button 
                              onClick={searchByGtin} 
                              disabled={isSearchingGtin || !gtinCode.trim()}
                              className="w-full bg-green-600 hover:bg-green-700 text-white"
                            >
                              {isSearchingGtin ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Buscando...</>
                              ) : (
                                <><Zap className="w-4 h-4 mr-2" />🔍 Buscar Produto</>
                              )}
                            </Button>
                            <div className="mt-3 p-2 bg-green-900/30 rounded-lg border border-green-700/50">
                              <p className="text-xs text-green-300">
                                ✨ Leitor de código: Clique no campo e use seu leitor!
                              </p>
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="url" className="mt-4">
                          <div>
                            <Label className="text-sm font-bold text-blue-300 mb-2 block">
                              🔗 Selecione de qual site você vai importar:
                            </Label>
                            <Select 
                              value={selectedMarketplace?.id || ""} 
                              onValueChange={(value) => {
                                const sites = [
                                  { id: 'mercadolivre', name: 'Mercado Livre', placeholder: 'https://produto.mercadolivre.com.br/...' },
                                  { id: 'amazon', name: 'Amazon', placeholder: 'https://www.amazon.com.br/produto/...' },
                                  { id: 'magazineluiza', name: 'Magazine Luiza', placeholder: 'https://www.magazineluiza.com.br/...' }
                                ];
                                setSelectedMarketplace(sites.find(s => s.id === value) || null);
                              }}
                            >
                              <SelectTrigger className="bg-gray-900 border-blue-600 text-gray-100 mb-4">
                                <SelectValue placeholder="Escolha o site..." />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-800 border-gray-700 text-gray-200">
                                <SelectItem value="mercadolivre">• Mercado Livre</SelectItem>
                                <SelectItem value="amazon">• Amazon</SelectItem>
                                <SelectItem value="magazineluiza">• Magazine Luiza</SelectItem>
                              </SelectContent>
                            </Select>

                            {selectedMarketplace && (
                              <div>
                                <Label className="text-sm font-medium text-gray-400 mb-2 block">
                                  🔗 Cole o link do produto:
                                </Label>
                                <Input
                                  value={productUrl}
                                  onChange={(e) => setProductUrl(e.target.value)}
                                  placeholder={selectedMarketplace.placeholder}
                                  className="mb-4 bg-gray-900 border-blue-600 text-gray-100"
                                  disabled={isProcessing}
                                />
                                <Button 
                                  onClick={extractAllData}
                                  disabled={isProcessing || !productUrl.trim()}
                                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold"
                                >
                                  {isProcessing ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Extraindo de {selectedMarketplace.name}...</>
                                  ) : (
                                    <><Zap className="w-4 h-4 mr-2" />🤖 Extrair de {selectedMarketplace.name}</>
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    )}

                    {manualStep === 1 && (
                      <div className="text-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
                        <p className="text-blue-400">
                          {isSearchingName ? 'IA buscando produto...' : isSearchingGtin ? 'Buscando por código...' : 'Extraindo dados...'}
                        </p>
                      </div>
                    )}

                    {manualStep === 10 && productPreview && (
                      <div className="space-y-4">
                        <div className="bg-blue-900/30 border-2 border-blue-500 rounded-xl p-6">
                          <h3 className="text-xl font-bold text-blue-300 mb-4 flex items-center gap-2">
                            <Sparkles className="w-5 h-5" />
                            🔍 Produto Encontrado
                          </h3>
                          {productPreview.thumbnailUrl && (
                            <div className="w-32 h-32 mx-auto mb-4 bg-white rounded-lg p-2 border-2 border-blue-400">
                              <img src={productPreview.thumbnailUrl} alt="Preview" className="w-full h-full object-contain" />
                            </div>
                          )}
                          <div className="space-y-3 mb-6 bg-black/30 p-4 rounded-lg">
                            <div className="flex items-start gap-2">
                              <span className="text-blue-400 font-semibold">📦 Nome:</span>
                              <span className="text-white">{productPreview.title}</span>
                            </div>
                            {productPreview.price && (
                              <div className="flex items-center gap-2">
                                <span className="text-blue-400 font-semibold">💰 Preço:</span>
                                <span className="text-green-400 font-bold">R$ {productPreview.price.toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="text-blue-400 font-semibold">📸 Imagens:</span>
                              <span className="text-white font-bold">{productPreview.imageCount} fotos</span>
                            </div>
                          </div>
                          <div className="text-center mb-4">
                            <p className="text-white font-bold text-lg">❓ Este é o produto correto?</p>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <Button onClick={cancelPreview} variant="outline" className="border-red-500 text-red-400">
                              ❌ Não, Buscar Novamente
                            </Button>
                            <Button onClick={confirmAndFetchImages} disabled={isLoadingAds} className="bg-green-600 hover:bg-green-700 text-white font-bold">
                              {isLoadingAds ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Buscando...</> : <>✅ Sim, Confirmar</>}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {manualStep === 11 && availableAds.length > 0 && (
                      <div className="space-y-4">
                        <div className="bg-blue-900/30 border-2 border-blue-500 rounded-xl p-6">
                          <h3 className="text-xl font-bold text-blue-300 mb-2 flex items-center gap-2">
                            <Sparkles className="w-5 h-5" />
                            🔍 Escolha o anúncio
                          </h3>
                          <p className="text-gray-400 text-sm mb-4">
                            ✅ {availableAds.length} anúncios encontrados
                          </p>
                          <div className="space-y-3 mb-4">
                            {availableAds.map((ad, index) => (
                              <div
                                key={index}
                                onClick={async () => {
                                  setIsLoadingAds(true);
                                  toast.info('📦 Carregando...');
                                  
                                  try {
                                    const response = await base44.functions.invoke('searchProductByName', { 
                                      productName: productName.trim(),
                                      adUrl: ad.link
                                    });

                                    if (!response || response.status !== 200) throw new Error('Erro ao carregar');
                                    const data = response.data;
                                    const validUrls = data.imageUrls?.filter(url => url && url.trim()) || [];

                                    if (validUrls.length === 0) {
                                      toast.warning('⚠️ Sem imagens');
                                      setIsLoadingAds(false);
                                      return;
                                    }

                                    setClonedAdData({
                                      title: data.title || productPreview.title,
                                      description: data.description || productPreview.description || '',
                                      price: data.price || ad.price,
                                      source: ad.link,
                                      store: ad.store,
                                      imageUrls: validUrls
                                    });
                                    
                                    setManualStep(12);
                                    toast.success('✅ Preview carregado!');
                                    
                                  } catch (error) {
                                    toast.error('Erro: ' + error.message);
                                  } finally {
                                    setIsLoadingAds(false);
                                  }
                                }}
                                className="border-2 rounded-lg p-4 cursor-pointer transition-all bg-gray-800/50 border-gray-600 hover:border-blue-500 hover:bg-blue-900/20"
                              >
                                <div className="flex items-start gap-4">
                                  {ad.thumbnail && (
                                    <div className="w-24 h-24 flex-shrink-0 bg-white rounded-lg p-1 border-2 border-gray-600">
                                      <img src={ad.thumbnail} alt={ad.store} className="w-full h-full object-contain" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">
                                        ANÚNCIO {index + 1}
                                      </span>
                                    </div>
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-blue-400 font-semibold text-xs">🏪 Loja:</span>
                                        <span className="text-white text-sm">{ad.store}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-blue-400 font-semibold text-xs">💰 Preço:</span>
                                        <span className="text-green-400 font-bold text-sm">R$ {ad.price?.toFixed(2)}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <Button onClick={() => { setAvailableAds([]); setManualStep(10); }} variant="outline" className="w-full border-gray-500 text-gray-300">
                            ⬅️ Voltar
                          </Button>
                        </div>
                      </div>
                    )}

                    {manualStep === 12 && clonedAdData && (
                      <div className="space-y-4">
                        <div className="bg-purple-900/30 border-2 border-purple-500 rounded-xl p-6">
                          <h3 className="text-xl font-bold text-purple-300 mb-2 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5" />
                            ✅ Preview do Anúncio
                          </h3>
                          <div className="bg-gray-800/50 rounded-lg border border-gray-600 p-4 mb-4">
                            <h4 className="font-bold text-white mb-2">📦 Título</h4>
                            <p className="text-white text-base">{clonedAdData.title}</p>
                          </div>
                          <div className="bg-gray-800/50 rounded-lg border border-gray-600 p-4 mb-4">
                            <h4 className="font-bold text-white mb-2">📝 Descrição</h4>
                            <div className="bg-gray-900 rounded p-3 max-h-60 overflow-y-auto">
                              <p className="text-sm text-gray-300 whitespace-pre-wrap">{clonedAdData.description || 'Sem descrição'}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3">
                              <p className="text-blue-300 text-xs mb-1">💰 Preço</p>
                              <p className="text-white font-bold">R$ {clonedAdData.price?.toFixed(2)}</p>
                            </div>
                            <div className="bg-green-900/20 border border-green-600 rounded-lg p-3">
                              <p className="text-green-300 text-xs mb-1">📸 Imagens</p>
                              <p className="text-white font-bold">{clonedAdData.imageUrls?.length || 0}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <Button onClick={() => { setClonedAdData(null); setManualStep(11); }} variant="outline" className="border-gray-500 text-gray-300">
                              ⬅️ Voltar
                            </Button>
                            <Button
                              onClick={() => {
                                const validUrls = clonedAdData.imageUrls?.filter(url => url && url.trim()) || [];
                                setExtractedData({ title: clonedAdData.title, description: clonedAdData.description });
                                setFormData(prev => ({ 
                                  ...prev, 
                                  title: clonedAdData.title,
                                  description: clonedAdData.description,
                                  starting_price: clonedAdData.price?.toString() || prev.starting_price,
                                  source_url: clonedAdData.source
                                }));
                                setDownloadedImages(validUrls);
                                setCoverIndex(0);
                                setManualStep(3);
                                setProductName(""); setProductPreview(null); setAvailableAds([]); setClonedAdData(null);
                                toast.success(`✅ Importado: ${validUrls.length} imagens!`);
                              }}
                              className="bg-green-600 hover:bg-green-700 text-white font-bold"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              ✅ Importar
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {manualStep === 2 && (
                      <div className="space-y-4">
                        <div className="bg-green-900/30 p-4 rounded-lg border border-green-700">
                          <h4 className="font-bold text-green-300 mb-3">✅ Dados Extraídos</h4>
                          <div className="space-y-2 text-sm bg-black/30 p-3 rounded">
                            <div><span className="text-green-400 font-semibold">Título:</span> {extractedData.title}</div>
                          </div>
                        </div>
                        <Button 
                          onClick={() => {
                            const validUrls = extractedImageUrls.filter(u => u.trim());
                            const finalImages = validUrls.slice(0, 5);
                            while (finalImages.length < 5) finalImages.push("");
                            
                            setFormData(prev => ({
                              ...prev,
                              title: extractedData.title,
                              description: extractedData.description,
                              image_urls: finalImages,
                              source_url: productUrl
                            }));
                            
                            setProductUrl(""); setExtractedImageUrls(['', '', '', '', '', '']);
                            setExtractedData({ title: "", description: "" }); setManualStep(0);
                            toast.success(`✅ ${validUrls.length} URLs aplicadas!`);
                          }}
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          🚀 Aplicar no Formulário
                        </Button>
                      </div>
                    )}

                    {manualStep === 3 && downloadedImages.length > 0 && (
                      <div className="bg-blue-900/30 p-4 rounded-lg border border-blue-700">
                        <h4 className="font-bold text-blue-300 mb-3 flex items-center gap-2">
                          <ImageIcon className="w-4 h-4" />
                          ✅ {downloadedImages.length} Imagens! Escolha a Capa
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                          {downloadedImages.map((imgUrl, index) => (
                            <div
                              key={index}
                              className={`relative group cursor-pointer border-2 rounded-lg overflow-hidden transition-all ${
                                coverIndex === index ? 'border-blue-500 ring-4 ring-blue-500/50' : 'border-gray-700 hover:border-blue-600'
                              }`}
                              onClick={() => setCoverIndex(index)}
                            >
                              <div className="w-full h-32 bg-gray-900 flex items-center justify-center p-2">
                                <img src={imgUrl} alt={`${index + 1}`} className="max-w-full max-h-full object-contain" />
                              </div>
                              <div className="absolute top-1 left-1 bg-black/90 text-white text-xs px-2 py-1 rounded-full">{index + 1}</div>
                              {coverIndex === index && (
                                <div className="absolute inset-0 flex items-center justify-center bg-blue-600/60 text-white font-bold">
                                  ✅ CAPA
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <Button 
                          onClick={() => {
                            let finalImages = [downloadedImages[coverIndex]];
                            downloadedImages.forEach((img, i) => { if (i !== coverIndex) finalImages.push(img); });
                            finalImages = finalImages.slice(0, 5);
                            while (finalImages.length < 5) finalImages.push("");
                            
                            setFormData(prev => ({
                              ...prev,
                              title: extractedData?.title || prev.title,
                              description: extractedData?.description || prev.description,
                              image_urls: finalImages
                            }));
                            
                            setManualStep(0); setDownloadedImages([]); setProductUrl(""); setCoverIndex(0);
                            setExtractedData({title: "", description: ""});
                            toast.success("✅ Dados aplicados!");
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3"
                        >
                          <CheckCircle className="w-5 h-5 mr-2" />
                          🚀 Aplicar no Formulário
                        </Button>
                      </div>
                    )}

                  </CardContent>
                </Card>

                <Card className="bg-gray-800 border border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between text-purple-400">
                      <div className="flex items-center gap-2">
                        <UploadCloud className="w-5 h-5" />
                        Upload Manual de Imagens
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowManualUpload(!showManualUpload)} className="text-purple-300">
                        {showManualUpload ? "Ocultar" : "Mostrar"}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  
                  {showManualUpload && (
                    <CardContent className="space-y-4">
                      {manualUploadImages.length === 0 ? (
                        <div>
                          <div 
                            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${isDragging ? 'border-purple-400 bg-purple-900/30' : 'border-purple-600'}`}
                            onClick={() => !isUploading && document.getElementById('manual-upload-input').click()}
                          >
                            {isUploading ? <Loader2 className="w-12 h-12 mx-auto mb-4 text-purple-400 animate-spin" /> : <UploadCloud className="w-12 h-12 mx-auto mb-4 text-purple-400" />}
                            <h4 className="text-lg font-semibold text-purple-300 mb-2">
                              {isUploading ? "Enviando..." : "📸 Clique ou arraste imagens"}
                            </h4>
                          </div>
                          <input
                            id="manual-upload-input"
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={async (e) => {
                              if (!e.target.files) return;
                              setIsUploading(true);
                              const files = Array.from(e.target.files).slice(0, 6);
                              const uploadedUrls = [];
                              try {
                                for (const file of files) {
                                  const result = await base44.integrations.Core.UploadFile({ file });
                                  if (result?.file_url) uploadedUrls.push(result.file_url);
                                }
                                if (uploadedUrls.length > 0) {
                                  setManualUploadImages(uploadedUrls);
                                  setManualCoverIndex(0);
                                  toast.success(`✅ ${uploadedUrls.length} imagens!`);
                                }
                              } catch (error) {
                                toast.error("❌ Erro: " + error.message);
                              } finally {
                                setIsUploading(false);
                                e.target.value = '';
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {manualUploadImages.map((img, index) => (
                              <div
                                key={index}
                                className={`relative cursor-pointer border-2 rounded-lg overflow-hidden ${manualCoverIndex === index ? 'border-purple-500 ring-2 ring-purple-500/30' : 'border-gray-700'}`}
                                onClick={() => setManualCoverIndex(index)}
                              >
                                <div className="w-full h-24 bg-gray-900 flex items-center justify-center">
                                  <img src={img} alt={`${index + 1}`} className="max-w-full max-h-full object-contain" />
                                </div>
                                {manualCoverIndex === index && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-purple-500/30 text-white font-bold">CAPA</div>
                                )}
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => { setManualUploadImages([]); setManualCoverIndex(0); }} className="flex-1 border-gray-600 text-gray-300">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Limpar
                            </Button>
                            <Button
                              type="button"
                              onClick={() => {
                                let finalImages = [manualUploadImages[manualCoverIndex]];
                                manualUploadImages.forEach((img, i) => { if (i !== manualCoverIndex) finalImages.push(img); });
                                finalImages = finalImages.slice(0, 5);
                                while (finalImages.length < 5) finalImages.push("");
                                setFormData(prev => ({ ...prev, image_urls: finalImages }));
                                setManualUploadImages([]); setManualCoverIndex(0); setShowManualUpload(false);
                                toast.success("✅ Aplicadas!");
                              }}
                              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Aplicar
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>

                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-400">Lojista *</Label>
                        <Select value={formData.store_id} onValueChange={(value) => handleInputChange("store_id", value)}>
                          <SelectTrigger className="mt-1 bg-gray-900 border-gray-600 text-gray-100">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700 text-gray-200">
                            <SelectItem value={null}>🏢 Admin</SelectItem>
                            {stores.map((store) => (
                              <SelectItem key={store.id} value={store.id}>{store.store_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-400">Nome do Produto *</Label>
                        <Input value={formData.title} onChange={(e) => handleInputChange("title", e.target.value)} required className="mt-1 bg-gray-900 border-gray-600 text-gray-100" />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-400">Categoria *</Label>
                        <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                          <SelectTrigger className="mt-1 bg-gray-900 border-gray-600 text-gray-100"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700 text-gray-200">
                            <SelectItem value="eletronicos">📱 Eletrônicos</SelectItem>
                            <SelectItem value="eletrodomesticos">🔌 Eletrodomésticos</SelectItem>
                            <SelectItem value="outros">🎯 Outros</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-400">Descrição *</Label>
                        <Textarea value={formData.description} onChange={(e) => handleInputChange("description", e.target.value)} className="mt-1 min-h-[100px] bg-gray-900 border-gray-600 text-gray-100" required />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <ProductImagePreview imageUrls={formData.image_urls} />
                    </div>
                  </div>
                  <Card className="bg-gray-800 border border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2 text-green-400">
                        <DollarSign className="w-5 h-5" /> Preços e Duração
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-400">Preço Inicial (R$) *</Label>
                        <Input type="number" step="0.01" value={formData.starting_price} onChange={(e) => handleInputChange("starting_price", e.target.value)} required className="mt-1 bg-gray-900 border-gray-600 text-gray-100" />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-400">Incremento (R$) *</Label>
                        <Input type="number" step="0.01" value={formData.increment} onChange={(e) => handleInputChange("increment", e.target.value)} required className="mt-1 bg-gray-900 border-gray-600 text-gray-100" />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-400">Duração</Label>
                        <Select value={formData.duration} onValueChange={(value) => handleInputChange("duration", value)}>
                          <SelectTrigger className="mt-1 bg-gray-900 border-gray-600 text-gray-100"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700 text-gray-200">
                            <SelectItem value="60">⚡ 1 Minuto</SelectItem>
                            <SelectItem value="300">⚡ 5 Minutos</SelectItem>
                            <SelectItem value="86400">1 dia</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                  <div className="flex gap-4 pt-6">
                    <Button type="button" variant="outline" onClick={() => navigate(createPageUrl("Home"))} className="flex-1 border-gray-600 text-gray-300">Cancelar</Button>
                    <Button type="submit" disabled={isSubmittingBid} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                      {isSubmittingBid ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Criando...</> : <><Upload className="w-4 h-4 mr-2" />Criar Leilão</>}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="lab" className="space-y-6 mt-6">
                <Alert className="bg-purple-900/50 border-purple-700">
                  <Beaker className="h-5 w-5 text-purple-400" />
                  <AlertTitle className="text-purple-300 font-bold">Laboratório de Testes</AlertTitle>
                  <AlertDescription className="text-purple-400">
                    Crie leilões isolados para testes. Todos são marcados com [TESTE].
                  </AlertDescription>
                </Alert>
                <Card className="bg-gray-700/30 border-purple-500/30">
                  <CardHeader>
                    <CardTitle className="text-purple-400 flex items-center gap-2">
                      <FlaskConical className="w-5 h-5" />
                      🧪 Testes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4 p-4 bg-gray-800/50 rounded-lg border border-gray-600">
                      <h3 className="font-semibold text-white">1. Criar Teste</h3>
                      <Input type="number" min="1" max="60" value={testDuration} onChange={(e) => setTestDuration(parseInt(e.target.value))} className="bg-gray-700 border-gray-600 text-white" />
                      <Button onClick={handleCreateTest} disabled={isProcessingTest} className="w-full bg-green-600 hover:bg-green-700">
                        {isProcessingTest ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Criando...</> : <><Zap className="w-4 h-4 mr-2" />Criar Leilão de {testDuration}min</>}
                      </Button>
                    </div>
                    {testAuctions.length > 0 && (
                      <div className="space-y-4 p-4 bg-gray-800/50 rounded-lg border border-gray-600">
                        <h3 className="font-semibold text-white">📋 Leilões de Teste ({testAuctions.length})</h3>
                        <Select value={selectedTestAuction} onValueChange={setSelectedTestAuction}>
                          <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-700 border-gray-600">
                            {testAuctions.map((test) => (
                              <SelectItem key={test.id} value={test.id} className="text-white">
                                {test.title} - R$ {test.current_price?.toFixed(2)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}