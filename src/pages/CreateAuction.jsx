import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";

const Auction = base44.entities.Auction;
const User = { me: () => base44.auth.me() };
const AppUser = base44.entities.AppUser;
import { extractDataFromUrl } from "@/functions/extractDataFromUrl";
import { importFromUrl } from "@/functions/importFromUrl";
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
import ImageAnalyzer from "../components/admin/ImageAnalyzer";
import ProductImagePreview from "../components/admin/ProductImagePreview";
import ConfirmProductDuplicationModal from "../components/admin/ConfirmProductDuplicationModal";

const MASTER_ADMIN_EMAIL = 'luizsantanna@tttcorporate.com';

export default function CreateAuction() {
  const navigate = useNavigate();
  
  // 🆕 DETECTA ORIGEM DO LEILÃO (Sai de Baixo ou NoZap padrão)
  const urlParams = new URLSearchParams(window.location.search);
  const partnerStore = urlParams.get('partner') || 'nozap'; // Padrão: nozap
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image_urls: ["", "", "", "", ""],
    starting_price: "", // Changed from initial_price
    increment: "10.00",
    buy_now_price: "", // Added buy_now_price
    duration: "86400", // This is in seconds
    category: partnerStore === 'sai_de_baixo' ? "masculino" : "outros",
    source_url: "",
    product_source: "return_resale",
    supplier_url: "",
    supplier_logo_url: "",
    comparai_mode: "google_shopping", // 🆕 Modo padrão: Google Shopping (preço médio)
    partner_store: partnerStore, // 🆕 Marca de onde o leilão foi criado
    store_id: "",
    product_id: "", // 🆕 ID do produto vinculado
    allowed_regions: [] // 🆕 Estados permitidos (vazio = todos)
  });
  const [isSubmittingBid, setIsSubmittingBid] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stores, setStores] = useState([]);
  
  const [productUrl, setProductUrl] = useState("");
  const [gtinCode, setGtinCode] = useState("");
  const [productName, setProductName] = useState("");
  const [confirmedProductName, setConfirmedProductName] = useState(""); // 🆕 Salva o nome confirmado
  const [isSearchingGtin, setIsSearchingGtin] = useState(false);
  const [isSearchingName, setIsSearchingName] = useState(false);
  const [productPreview, setProductPreview] = useState(null); // 🆕 Prévia do produto (com imagens já carregadas)
  const [selectedMarketplace, setSelectedMarketplace] = useState(null);
  const [availableAds, setAvailableAds] = useState([]); // 🆕 Lista de anúncios disponíveis
  const [selectedAd, setSelectedAd] = useState(null); // 🆕 Anúncio selecionado
  const [isLoadingAds, setIsLoadingAds] = useState(false); // 🆕 Loading de anúncios
  const [adImagePool, setAdImagePool] = useState([]); // 🆕 Pool completo de imagens do anúncio
  const [selectedImageIndices, setSelectedImageIndices] = useState([]); // 🆕 Índices das imagens selecionadas
  const [clonedAdData, setClonedAdData] = useState(null); // 🆕 Dados completos do anúncio clonado
  const [foundMlAd, setFoundMlAd] = useState(null); // 🆕 Anúncio único encontrado no ML
  const [manualStep, setManualStep] = useState(0);
  const [extractedData, setExtractedData] = useState({ title: "", description: "" });
  const [imageUrls, setImageUrls] = useState(["", "", "", "", "", ""]);
  const [downloadedImages, setDownloadedImages] = useState([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [supplierLogoPreview, setSupplierLogoPreview] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  
  // 🆕 ESTADOS PARA UPLOAD MANUAL
  const [manualUploadImages, setManualUploadImages] = useState([]);
  const [manualCoverIndex, setManualCoverIndex] = useState(0);
  const [showManualUpload, setShowManualUpload] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [debugError, setDebugError] = useState(null);
  
  // 🆕 ESTADOS PARA CATÁLOGO
  const [catalogActive, setCatalogActive] = useState(false);
  const [priceCatalog, setPriceCatalog] = useState('');

  // 🆕 ESTADOS PARA MODAL DE CONFIRMAÇÃO
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // 🆕 ESTADOS PARA IMPORTADOR INTELIGENTE
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importedData, setImportedData] = useState(null);
  const [suggestedProducts, setSuggestedProducts] = useState([]);
  
  // 🆕 ESTADOS PARA URLs DE IMAGENS EXTRAÍDAS
  const [extractedImageUrls, setExtractedImageUrls] = useState(['', '', '', '', '', '']);

  // ESTADOS DO LABORATÓRIO DE TESTES
  const [testAuctions, setTestAuctions] = useState([]);
  const [selectedTestAuction, setSelectedTestAuction] = useState("");
  const [testDuration, setTestDuration] = useState(3); // Duration in minutes for test
  const [bidCount, setBidCount] = useState(5);
  const [secondsToSkip, setSecondsToSkip] = useState(60);
  const [isProcessingTest, setIsProcessingTest] = useState(false);
  const [isResettingTestValora, setIsResettingTestValora] = useState(false);
  const [validationReport, setValidationReport] = useState(null);



  // CORREÇÃO DEFINITIVA: Lógica de autenticação robusta, igual à do Layout.
  const loadCurrentUser = useCallback(async () => {
    let userFound = null;

    // 1. Tenta carregar usuário do nosso sistema (AppUser) a partir do localStorage
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
        console.error("Falha ao validar AppUser no DB, tentando usuário da plataforma.", e);
      }
    }

    // 2. Se não encontrou um AppUser válido, tenta carregar o usuário da plataforma
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

    // 3. Aplica a regra de "Chave Mestra" e toma a decisão final
    if (userFound) {
      // GARANTIA DE ADMIN: Força a permissão se o email for o correto.
      if (userFound.email === MASTER_ADMIN_EMAIL) {
        userFound.role = 'admin';
      }

      if (userFound.role === 'admin') {
        setCurrentUser(userFound);
        setIsAdmin(true);
      } else {
        // Se o usuário encontrado não for admin, nega o acesso.
        alert("Acesso negado. Apenas administradores podem criar leilões.");
        navigate(createPageUrl("Home"));
      }
    } else {
      // Se nenhum usuário foi encontrado, nega o acesso.
      alert("Acesso negado. Você precisa estar logado como administrador.");
      navigate(createPageUrl("Home"));
    }
  }, [navigate]);

  React.useEffect(() => {
    loadCurrentUser();
    loadStores();
    
    // 🆕 DETECTA PRODUTO VIA URL PARAMETER
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

  // FUNÇÕES DO LABORATÓRIO
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
    const interval = setInterval(loadTestAuctions, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const handleCreateTest = async () => {
    setIsProcessingTest(true);
    try {
      // The backend function `createTestAuction` expects duration in minutes now.
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
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 🆕 BUSCA COM PRÉVIA (UMA ÚNICA CHAMADA À API)
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
    setDebugError(null);

    try {
        console.log('🔍 Buscando produto:', productName);
        
        const response = await base44.functions.invoke('searchProductByName', { 
          productName: productName.trim()
        });

        console.log('📦 Resposta completa:', response);

        if (!response || response.status !== 200) {
          throw new Error(response?.data?.error || 'Erro na busca');
        }

        const data = response.data;

        if (!data?.found) {
          toast.error(`Produto não encontrado. Tente com nome mais completo`);
          setManualStep(0);
          setIsSearchingName(false);
          return;
        }

        // 🆕 Salva o nome do produto confirmado para uso posterior
        setConfirmedProductName(productName.trim());

        // ARMAZENA ANÚNCIOS ENCONTRADOS
         if (data.ads && data.ads.length > 0) {
           setAvailableAds(data.ads);
           setManualStep(11); // Vai direto para seleção de anúncios
           toast.success(`✅ ${data.ads.length} anúncios encontrados!`);
         } else {
           // Se não houver anúncios, mostra preview
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
         }
      
    } catch (error) {
      console.error("❌ Erro:", error);
      
      setDebugError({
        type: 'searchByName',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      toast.error(`Erro na busca: ${error.message}`);
      setManualStep(0);
    } finally {
      setIsSearchingName(false);
    }
  };

  const confirmAndFetchImages = async () => {
    if (!productPreview) return;

    setIsLoadingAds(true);
    setManualStep(1); // Mostra loading

    try {
        const payload = {
            productName: confirmedProductName, // Usa o nome confirmado
            mode: 'single_ml_ad'
        };
        
        console.log('🎯 Buscando anúncio único no Mercado Livre...');
        const response = await base44.functions.invoke('searchProductByName', payload);

        if (!response || response.status !== 200 || !response.data.found) {
            throw new Error(response?.data?.error || 'Anúncio do Mercado Livre não encontrado.');
        }

        const data = response.data;

        console.log('✅ Anúncio do ML encontrado:', data.ml_ad_url);
        
        setFoundMlAd({
            url: data.ml_ad_url,
            title: data.title,
            price: data.price,
            store: data.store
        });
        
        setManualStep(13); // Nova etapa para mostrar o link do ML
        toast.success(`✅ Anúncio encontrado no Mercado Livre!`);
        
    } catch (error) {
        console.error('❌ Erro ao buscar anúncio do ML:', error);
        toast.error(error.message || 'Não foi possível encontrar um anúncio no Mercado Livre.');
        setManualStep(10); // Volta para a tela de preview em caso de erro
    } finally {
        setIsLoadingAds(false);
    }
  };

  // 🆕 APLICAR DADOS DO PREVIEW (FALLBACK)
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
      setManualStep(5);
    } else {
      setManualStep(0);
    }

    setProductName("");
    setProductPreview(null);
  };

  const downloadImagesFromAd = async (adToUse) => {
    const ad = adToUse || selectedAd;
    if (!ad) {
      toast.error('Nenhum anúncio selecionado!');
      return;
    }

    setIsLoadingAds(true);
    toast.info('🤖 Importando dados e imagens do anúncio...');
    
    try {
      const response = await base44.functions.invoke('searchProductByName', { 
        productName: confirmedProductName || productName.trim(),
        adUrl: ad.url
      });

      if (!response || response.status !== 200) {
        throw new Error(response?.data?.error || 'Não foi possível carregar dados deste anúncio.');
      }

      const data = response.data;
      const validUrls = data.imageUrls?.filter(url => url && url.trim()) || [];

      if (validUrls.length === 0) {
        toast.warning('⚠️ Nenhuma imagem encontrada neste anúncio. Tente o upload manual.');
        setManualStep(0);
        return;
      }

      const clonedTitle = data.title || ad.title || confirmedProductName;
      const clonedDescription = data.description || 'Sem descrição';
      const clonedPrice = data.price || ad.price;

      // APLICA DIRETAMENTE, SEM SELEÇÃO
      setExtractedData({ title: clonedTitle, description: clonedDescription });
      setFormData(prev => ({
        ...prev,
        title: clonedTitle,
        description: clonedDescription,
        starting_price: clonedPrice ? clonedPrice.toString() : prev.starting_price,
        source_url: ad.url,
      }));
      setDownloadedImages(validUrls); // Todas as imagens válidas
      setCoverIndex(0);
      setManualStep(5); // Vai para o preview final

      // Limpa estados do fluxo de busca
      setProductName("");
      setProductPreview(null);
      setAvailableAds([]);
      setSelectedAd(null);
      setFoundMlAd(null);

      toast.success(`✅ ${validUrls.length} imagens importadas! Revise antes de criar.`);
      
    } catch (error) {
      console.error('❌ Erro na importação final:', error);
      toast.error(`❌ Erro ao importar: ${error.message}`);
      setManualStep(0); // Volta ao início em caso de falha
    } finally {
      setIsLoadingAds(false);
    }
  };

  // 🆕 APLICAR IMAGENS SELECIONADAS
  const applySelectedImages = () => {
    if (selectedImageIndices.length === 0) {
      toast.error('Selecione pelo menos 1 imagem!');
      return;
    }

    const selectedUrls = selectedImageIndices.map(i => adImagePool[i]);
    
    setExtractedData({ 
      title: clonedAdData.title, 
      description: clonedAdData.description 
    });
    
    setFormData(prev => ({ 
      ...prev, 
      title: clonedAdData.title, 
      description: clonedAdData.description,
      starting_price: clonedAdData.price ? clonedAdData.price.toString() : prev.starting_price,
      source_url: clonedAdData.source
    }));

    setDownloadedImages(selectedUrls);
    setCoverIndex(0);
    setManualStep(5);
    
    // Limpa estados
    setProductName("");
    setProductPreview(null);
    setAvailableAds([]);
    setSelectedAd(null);
    setAdImagePool([]);
    setSelectedImageIndices([]);
    setClonedAdData(null);
    
    toast.success(`✅ ${selectedUrls.length} imagens aplicadas!`);
  };

  // 🆕 CANCELAR PRÉVIA
  const cancelPreview = () => {
    setProductPreview(null);
    setProductName(""); // Limpa para nova busca
    setManualStep(0);
    toast.info("Busca cancelada. Digite novamente.");
  };

  // BUSCA POR GTIN
  const searchByGtin = async () => {
    if (!gtinCode || gtinCode.trim().length < 8) {
      toast.error("Digite um código GTIN válido (mínimo 8 dígitos)");
      return;
    }

    setIsSearchingGtin(true);
    setManualStep(1);
    setDebugError(null);

    try {
        console.log('🚀 [GTIN] Iniciando busca para:', gtinCode);
        const response = await base44.functions.invoke('searchProductByGTIN', { 
          gtin: gtinCode.trim() 
        });

        console.log('📦 [GTIN] Resposta RAW:', response);
      console.log('📦 [GTIN] Status:', response?.status);
      console.log('📦 [GTIN] Data:', response?.data);

      if (!response || response.status !== 200) {
        throw new Error(response?.data?.error || 'Erro GTIN');
      }

      const data = response.data;

      console.log('🔍 [GTIN] RESPOSTA COMPLETA DO BACKEND:', JSON.stringify(data, null, 2));

      if (!data?.found) {
        toast.error(`GTIN não encontrado. Verifique o código ou use busca por nome/URL`);
        setManualStep(0);
        setIsSearchingGtin(false);
        return;
      }

      const productTitle = data.title || "Produto";
      const productDesc = data.description || `${data.brand || 'Produto'} - GTIN: ${data.gtin}`;

      console.log(`✅ Título: ${productTitle}`);
      console.log(`🖼️ Array imageUrls do backend:`, data.imageUrls);
      console.log(`🖼️ Quantidade: ${data.imageUrls?.length || 0}`);

      setExtractedData({ title: productTitle, description: productDesc });
      setFormData(prev => ({ ...prev, title: productTitle, description: productDesc }));

      const validUrls = (data.imageUrls || [])
        .filter(url => url && typeof url === 'string' && url.trim());

      console.log(`🖼️ [GTIN] URLs FILTRADAS:`, validUrls);
      console.log(`🖼️ [GTIN] Quantidade de URLs válidas:`, validUrls.length);

      if (validUrls.length === 0) {
        toast.warning(`⚠️ ${productTitle} sem imagens. Use upload manual.`);
        setGtinCode("");
        setManualStep(0);
      } else {
        toast.success(`✅ ${validUrls.length} imagens validadas! (${data.source})`);
        setDownloadedImages(validUrls);
        setCoverIndex(0);
        setManualStep(5);
        console.log(`✅ [GTIN] manualStep=5, downloadedImages:`, validUrls);
      }

      setGtinCode("");
      
    } catch (error) {
      console.error("❌ [GTIN] ERRO COMPLETO:", error);
      console.error("❌ [GTIN] Stack:", error.stack);
      console.error("❌ [GTIN] Message:", error.message);
      
      setDebugError({
        type: 'searchByGTIN',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      toast.error(`Erro no código de barras. Tente busca por nome ou URL direta.`);
      setManualStep(0);
    } finally {
      setIsSearchingGtin(false);
    }
  };

  // ETAPA 1: EXTRAIR DADOS + URLs DAS IMAGENS (SEM BAIXAR)
  const extractAllData = async () => {
    if (!productUrl) {
      toast.error("Cole a URL do produto primeiro!");
      return;
    }
    setIsProcessing(true);
    setManualStep(1);
    setDebugError(null);
    
    try {
     console.log('🚀 [URL] Iniciando extração para:', productUrl);
     toast.info("🤖 IA extraindo dados e URLs de imagens...");

     const response = await extractDataFromUrl({ productUrl });

     if (!response || !response.data) {
         throw new Error("Falha na extração");
     }

     const data = response.data;
     console.log('📦 RESPOSTA COMPLETA:', data);
     console.log('✅ Dados extraídos:', { 
       title: data.title, 
       description: data.description, 
       price: data.price, 
       imageCount: data.imageUrls?.length 
     });

     if (!data.title || !data.description) {
       throw new Error("Dados incompletos");
     }

     setExtractedData({ title: data.title, description: data.description });
      
      // 📸 MOSTRA URLs EXTRAÍDAS (SEM BAIXAR)
      if (data.imageUrls && data.imageUrls.length > 0) {
        setExtractedImageUrls(data.imageUrls.slice(0, 6));
        setManualStep(2); // Vai para tela de URLs
        toast.success(`✅ ${data.imageUrls.length} URLs de imagens encontradas!`);
      } else {
        toast.warning("⚠️ Nenhuma imagem encontrada. Use upload manual.");

        // Aplica só dados textuais
        setFormData(prev => ({
          ...prev,
          title: data.title,
          description: data.description,
          starting_price: data.price ? data.price.toString() : prev.starting_price,
          source_url: productUrl
        }));

        setProductUrl("");
        setManualStep(0);
      }
      
    } catch (error) {
      console.error("❌ Erro:", error);
      
      setDebugError({
        type: 'extractDataFromUrl',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      toast.error("Erro ao extrair. Use outro método.");
      setManualStep(0);
    }
    
    setIsProcessing(false);
  };


  
  const visualizeImages = async () => {
    const validUrls = imageUrls.filter(url => url && url.trim().startsWith('http'));
    
    if (validUrls.length === 0) {
      toast.error("Nenhuma URL válida para processar. Tente extrair novamente.");
      return;
    }

    setIsProcessing(true);
    setManualStep(4);

    console.log(`📸 Processando ${validUrls.length} imagens...`);

    // Usa as URLs originais diretamente (mais confiável)
    console.log(`📥 Usando ${validUrls.length} URLs originais diretamente`);
    const uploadedImages = [...validUrls];
    
    validUrls.forEach((url, idx) => {
      console.log(`✅ Imagem ${idx + 1}: ${url.substring(0, 80)}...`);
    });

    setIsProcessing(false);

    // Mostra resultado
    if (uploadedImages.length === 0) {
      toast.error("❌ Nenhuma imagem foi processada. Use o upload manual de imagens.");
      setManualStep(3);
      return;
    }

    toast.success(`✅ Todas as ${uploadedImages.length} imagens processadas!`);

    setDownloadedImages(uploadedImages);
    setCoverIndex(0);
    setManualStep(5);
  };

  // ETAPA 3: ESCOLHER CAPA (UI step 5)
  const selectCover = (index) => {
    setCoverIndex(index);
    setManualStep(6);
  };

  // ETAPA 4: APLICAR TUDO NO FORMULÁRIO (UI step 6)
  const applyToForm = () => {
    let finalImages = [];
    if (downloadedImages.length > 0) {
        finalImages.push(downloadedImages[coverIndex]);
        downloadedImages.forEach((img, i) => {
            if (i !== coverIndex) finalImages.push(img);
        });
        finalImages = finalImages.slice(0, 5);
    }
    
    while (finalImages.length < 5) {
      finalImages.push("");
    }

    setFormData(prev => ({
      ...prev,
      image_urls: finalImages,
      source_url: productUrl // SALVA URL ORIGINAL
    }));

    setManualStep(0);
    setProductUrl("");
    setImageUrls(["", "", "", "", "", ""]);
    setDownloadedImages([]);
    setExtractedData({title: "", description: ""});
    setCoverIndex(0);
    
    alert("✅ Dados aplicados com sucesso no formulário!");
  };

  const handleClearAllImages = () => {
    setImageUrls(["", "", "", "", "", ""]); // Clear all image URLs
  };

  // HANDLER PARA UPLOAD DE LOGO
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
      alert("❌ Erro ao enviar logo. Tente novamente: " + (error.message || "Erro desconhecido."));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSmartImport = async () => {
    if (!imageUrlInput) {
      toast.error('Cole a URL da imagem');
      return;
    }

    setIsImporting(true);
    
    try {
      const { data } = await base44.functions.invoke('analyzeImageUrlAndImport', {
        imageUrl: imageUrlInput
      });

      if (data.success) {
        setImportedData(data.productData);
        setSuggestedProducts(data.suggestedProducts || []);

        // PREENCHE FORMULÁRIO AUTOMATICAMENTE
        setFormData(prev => ({
          ...prev,
          title: data.productData.name,
          description: data.productData.description,
          category: data.productData.category || 'outros',
          image_urls: data.productData.images || ["", "", "", "", ""]
        }));

        toast.success('✅ Produto importado! Revise os dados antes de criar.');
      } else {
        toast.error(data.message || 'Erro ao importar produto');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao processar importação');
    } finally {
      setIsImporting(false);
    }
  };

  const handleUseSuggested = (product) => {
    if (product.latest_auction) {
      setFormData(prev => ({
        ...prev,
        title: product.latest_auction.title,
        starting_price: (product.latest_auction.price * 0.9).toFixed(2),
        image_urls: [product.latest_auction.image || "", "", "", "", ""]
      }));
      toast.success(`Dados de "${product.name}" carregados!`);
    }
    setSuggestedProducts([]);
  };

  const handleConfirmDuplication = async ({ includeAuction, includeCatalog }) => {
    setIsSubmittingBid(true);

    try {
      const finalImageUrls = formData.image_urls.filter(url => url && url.trim() !== "");

      // 1. Criar no Leilão
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

      // 2. Criar no Catálogo de Produtos
      if (includeCatalog) {
        const Product = base44.entities.Product;
        const productData = {
          description: formData.title, // Usando o título como descrição principal
          notes: formData.description,
          image_urls: finalImageUrls, // <<< AQUI A CORREÇÃO CRÍTICA
          cost_price: 0, // Custo pode ser ajustado depois
          price_catalog: parseFloat(priceCatalog) || parseFloat(formData.starting_price) * 1.5, // Preço de venda no catálogo
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

      setTimeout(() => {
        navigate(createPageUrl("Home")); // Redireciona para a Home após o sucesso
      }, 1500);

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
    
    if (parseFloat(formData.starting_price) <= 0) {
      toast.error("O preço inicial deve ser maior que zero");
      return;
    }
    if (parseFloat(formData.increment) <= 0) {
      toast.error("O incremento mínimo deve ser maior que zero");
      return;
    }

    // Abre o modal de confirmação em vez de salvar diretamente
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

    // SEMANAS
    const weeks = Math.floor(diff / (7 * 86400));
    if (weeks > 0) return `${weeks} semana${weeks > 1 ? 's' : ''}`;

    // DIAS
    const days = Math.floor(diff / 86400);
    if (days > 0) return `${days} dia${days > 1 ? 's' : ''}`;

    // HORAS:MINUTOS:SEGUNDOS
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Modal de relatório de validação
  const ValidationReportModal = () => {
    if (!validationReport) return null;
    
    const validCount = validationReport.filter(r => r.isImage === '✅ É imagem').length;
    const reportText = `🔍 RELATÓRIO DE VALIDAÇÃO DE IMAGENS\n` +
      `Data: ${new Date().toLocaleString('pt-BR')}\n` +
      `Total: ${validationReport.length} imagens\n` +
      `Válidas: ${validCount}/${validationReport.length}\n\n` +
      validationReport.map(r => 
        `🖼️ Imagem ${r.index}:\n` +
        `   Status: ${r.status}\n` +
        `   Tipo: ${r.contentType}\n` +
        `   Validação: ${r.isImage}\n` +
        `   URL: ${r.url}` +
        (r.error ? `\n   ⚠️ Erro: ${r.error}` : '') + '\n'
      ).join('\n');
    
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
        <Card className="w-full max-w-2xl max-h-[80vh] bg-gray-800 border-gray-700">
          <CardHeader className="border-b border-gray-700">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                Relatório de Validação
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setValidationReport(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 overflow-y-auto max-h-[60vh]">
            <div className="mb-4 p-3 bg-gray-900 rounded-lg border border-gray-700">
              <div className="text-sm text-gray-300">
                <strong className="text-white">Total:</strong> {validationReport.length} imagens
              </div>
              <div className="text-sm text-gray-300">
                <strong className="text-green-400">Válidas:</strong> {validCount}
              </div>
              <div className="text-sm text-gray-300">
                <strong className="text-red-400">Inválidas:</strong> {validationReport.length - validCount}
              </div>
            </div>
            
            <div className="space-y-3">
              {validationReport.map((r, idx) => (
                <div key={idx} className={`p-3 rounded-lg border ${
                  r.isImage === '✅ É imagem' 
                    ? 'bg-green-900/20 border-green-700/50' 
                    : 'bg-red-900/20 border-red-700/50'
                }`}>
                  <div className="font-bold text-white mb-2">🖼️ Imagem {r.index}</div>
                  <div className="text-xs space-y-1 text-gray-300">
                    <div><strong>Status:</strong> {r.status}</div>
                    <div><strong>Tipo:</strong> {r.contentType}</div>
                    <div><strong>Validação:</strong> {r.isImage}</div>
                    <div className="break-all"><strong>URL:</strong> {r.url}</div>
                    {r.error && (
                      <div className="text-red-400"><strong>⚠️ Erro:</strong> {r.error}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <div className="border-t border-gray-700 p-4 flex gap-3">
            <Button
              onClick={() => {
                navigator.clipboard.writeText(reportText);
                toast.success("📋 Relatório copiado!");
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              📋 Copiar Relatório Completo
            </Button>
            <Button
              onClick={() => setValidationReport(null)}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Fechar
            </Button>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 text-gray-300">
      {validationReport && <ValidationReportModal />}

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
                        Use o importador automático ou preencha os campos abaixo e selecione uma **duração curta (1, 5 ou 15 minutos)** para testar rapidamente o ciclo de vida de um leilão.
                    </AlertDescription>
                </Alert>

                {debugError && (
                  <Alert className="bg-red-900/50 border-red-700">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <AlertTitle className="text-red-300 font-bold">🔍 Erro Detectado na Importação</AlertTitle>
                    <AlertDescription className="text-red-400">
                      <div className="space-y-2 mt-2">
                        <div><strong>Tipo:</strong> {debugError.type}</div>
                        <div><strong>Mensagem:</strong> {debugError.message}</div>
                        <div className="text-xs bg-black/30 p-2 rounded mt-2 overflow-auto max-h-32">
                          <strong>Stack:</strong><br/>
                          {debugError.stack}
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setDebugError(null)}
                          className="mt-2 border-red-600 text-red-400"
                        >
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
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!confirm("🔄 Limpar todos os dados do produto atual e começar novo leilão?")) return;
                            
                            // Reset completo
                            setFormData({
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
                            setProductUrl("");
                            setGtinCode("");
                            setProductName("");
                            setManualStep(0);
                            setExtractedData({ title: "", description: "" });
                            setImageUrls(["", "", "", "", "", ""]);
                            setDownloadedImages([]);
                            setCoverIndex(0);
                            setSelectedMarketplace(null);
                            setManualUploadImages([]);
                            setManualCoverIndex(0);
                            setSupplierLogoPreview("");
                            
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
                    
                    {/* ETAPA 0: TABS PARA ESCOLHER MÉTODO */}
                    {manualStep === 0 && (
                      <Tabs defaultValue="nome" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 bg-gray-700/50">
                          <TabsTrigger value="nome" className="data-[state=active]:bg-purple-600">
                            🌐 Por Nome
                          </TabsTrigger>
                          <TabsTrigger value="gtin" className="data-[state=active]:bg-green-600">
                            📷 Código Barras
                          </TabsTrigger>
                          <TabsTrigger value="url" className="data-[state=active]:bg-blue-600">
                            🔗 Por URL
                          </TabsTrigger>
                        </TabsList>

                        {/* ABA: BUSCA POR NOME */}
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
                            className="mb-3 bg-gray-900 border-purple-600 text-gray-100 placeholder-gray-500 focus:border-purple-400"
                            disabled={isSearchingName}
                          />

                          <Button 
                            onClick={searchByName} 
                            disabled={isSearchingName || !productName.trim()}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            {isSearchingName ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Buscando produto...
                              </>
                            ) : (
                              <>
                                <Zap className="w-4 h-4 mr-2" />
                                🔍 Buscar e Importar
                              </>
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

                        {/* ABA: BUSCA POR GTIN */}
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
                              className="mb-3 bg-gray-900 border-green-600 text-gray-100 placeholder-gray-500 focus:border-green-400 pr-10"
                              disabled={isSearchingGtin}
                              maxLength={14}
                              autoComplete="off"
                            />
                            <div className="absolute right-3 top-3 text-green-400">
                              📷
                            </div>
                          </div>

                          <Button 
                            onClick={searchByGtin} 
                            disabled={isSearchingGtin || !gtinCode.trim()}
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                          >
                            {isSearchingGtin ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Buscando...
                              </>
                            ) : (
                              <>
                                <Zap className="w-4 h-4 mr-2" />
                                🔍 Buscar Produto
                              </>
                            )}
                          </Button>
                          
                          <div className="mt-3 p-2 bg-green-900/30 rounded-lg border border-green-700/50">
                            <p className="text-xs text-green-300 flex items-center gap-2">
                              <span className="text-base">✨</span>
                              <span><strong>Leitor de código de barras:</strong> Clique no campo acima e use seu leitor - ele buscará automaticamente!</span>
                            </p>
                            <p className="text-xs text-green-200 mt-1 ml-6">
                              Ou digite manualmente: EAN-13, UPC, GTIN, etc.
                            </p>
                          </div>
                          </div>
                        </TabsContent>

                        {/* ABA: BUSCA POR URL */}
                        <TabsContent value="url" className="mt-4">
                          <div>
                            <Label htmlFor="marketplace" className="text-sm font-bold text-blue-300 mb-2 block">
                              🔗 Selecione de qual site você vai importar:
                            </Label>
                            
                            <Select 
                              value={selectedMarketplace?.id || ""} 
                              onValueChange={(value) => {
                                const sites = [
                                  { id: 'mercadolivre', name: 'Mercado Livre', placeholder: 'https://produto.mercadolivre.com.br/...' },
                                  { id: 'amazon', name: 'Amazon', placeholder: 'https://www.amazon.com.br/produto/...' },
                                  { id: 'shopee', name: 'Shopee', placeholder: 'https://shopee.com.br/produto...' },
                                  { id: 'magazineluiza', name: 'Magazine Luiza', placeholder: 'https://www.magazineluiza.com.br/...' },
                                  { id: 'casasbahia', name: 'Casas Bahia', placeholder: 'https://www.casasbahia.com.br/...' },
                                  { id: 'pontofrio', name: 'Ponto Frio', placeholder: 'https://www.pontofrio.com.br/...' },
                                  { id: 'carrefour', name: 'Carrefour', placeholder: 'https://www.carrefour.com.br/...' },
                                  { id: 'aliexpress', name: 'AliExpress', placeholder: 'https://pt.aliexpress.com/...' }
                                ];
                                const selected = sites.find(s => s.id === value);
                                setSelectedMarketplace(selected || null);
                              }}
                            >
                              <SelectTrigger className="bg-gray-900 border-blue-600 text-gray-100 mb-4">
                                <SelectValue placeholder="Escolha o site..." />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-800 border-gray-700 text-gray-200">
                                <SelectItem value="mercadolivre">• Mercado Livre</SelectItem>
                                <SelectItem value="amazon">• Amazon</SelectItem>
                                <SelectItem value="shopee">• Shopee</SelectItem>
                                <SelectItem value="magazineluiza">• Magazine Luiza</SelectItem>
                                <SelectItem value="casasbahia">• Casas Bahia</SelectItem>
                                <SelectItem value="pontofrio">• Ponto Frio</SelectItem>
                                <SelectItem value="carrefour">• Carrefour</SelectItem>
                                <SelectItem value="aliexpress">• AliExpress</SelectItem>
                              </SelectContent>
                            </Select>

                            {selectedMarketplace && (
                              <div>
                                <Label htmlFor="productUrl" className="text-sm font-medium text-gray-400 mb-2 block">
                                  🔗 Cole o link do produto:
                                </Label>
                                
                                <Input
                                  id="productUrl"
                                  value={productUrl}
                                  onChange={(e) => setProductUrl(e.target.value)}
                                  placeholder={selectedMarketplace.placeholder}
                                  className="mb-4 bg-gray-900 border-blue-600 text-gray-100 placeholder-gray-500 focus:border-blue-400"
                                  disabled={isProcessing}
                                />
                                
                                <Button 
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    if (isProcessing) return;
                                    
                                    // Se for Mercado Livre, usa extração direta
                                    if (selectedMarketplace.id === 'mercadolivre' && productUrl.includes('mercadolivre.com.br')) {
                                      setIsProcessing(true);
                                      setManualStep(1);
                                      
                                      try {
                                        const response = await base44.functions.invoke('extractMLImages', { productUrl });
                                        
                                        console.log('📦 Resposta extractMLImages:', response);
                                        
                                        // Verifica se há erro ou se não encontrou
                                        if (!response || response.status !== 200) {
                                          throw new Error(response?.data?.error || 'Erro na requisição');
                                        }
                                        
                                        const data = response.data;
                                        
                                        if (!data.found || !data.images || data.images.length === 0) {
                                          throw new Error(data.error || 'Nenhuma imagem encontrada. Use upload manual.');
                                        }
                                        
                                        console.log('✅ Imagens ML extraídas:', data.images.length);
                                        console.log('📝 DADOS EXTRAÍDOS:', {
                                          title: data.title,
                                          description: data.description,
                                          price: data.price
                                        });
                                        
                                        setExtractedData({ 
                                          title: data.title || '', 
                                          description: data.description || '' 
                                        });
                                        
                                        setFormData(prev => ({
                                          ...prev,
                                          title: (data.title || prev.title).trim(),
                                          description: (data.description || prev.description).trim(),
                                          starting_price: data.price ? data.price.toString() : prev.starting_price,
                                          source_url: productUrl
                                        }));
                                        
                                        setDownloadedImages(data.images);
                                        setCoverIndex(0);
                                        setManualStep(5); // Vai para preview das imagens
                                        
                                        toast.success(`✅ ${data.images.length} imagens extraídas do Mercado Livre!`);
                                      } catch (error) {
                                        console.error('❌ Erro ML:', error);
                                        toast.error(error.message || 'Erro ao extrair do Mercado Livre');
                                        setManualStep(0);
                                      } finally {
                                        setIsProcessing(false);
                                      }
                                    } else {
                                      // Outros sites usam o fluxo antigo
                                      extractAllData();
                                    }
                                  }}
                                  disabled={isProcessing || !productUrl.trim()}
                                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold"
                                >
                                  {isProcessing ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Extraindo de {selectedMarketplace.name}...
                                    </>
                                  ) : (
                                    <>
                                      <Zap className="w-4 h-4 mr-2" />
                                      🤖 Extrair de {selectedMarketplace.name}
                                    </>
                                  )}
                                </Button>
                                
                                <div className="mt-3 p-2 bg-blue-900/30 rounded-lg border border-blue-500/30">
                                  <p className="text-xs text-blue-300">
                                    ✨ {selectedMarketplace.id === 'mercadolivre' 
                                      ? 'Extração direta de imagens WebP em alta resolução!' 
                                      : `A IA buscará dados específicos de ${selectedMarketplace.name}`}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                    )}

                    {/* ETAPA 1: PROCESSANDO DADOS */}
                    {manualStep === 1 && (
                      <div className="text-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
                        <p className="text-blue-400">
                          {isSearchingName ? 'IA buscando produto na internet...' : isSearchingGtin ? 'Buscando produto por código de barras...' : 'Extraindo dados e URLs de imagens...'}
                        </p>
                      </div>
                    )}

                    {/* 🆕 ETAPA 13: EXIBIR LINK ÚNICO DO MERCADO LIVRE */}
                    {manualStep === 13 && foundMlAd && (
                        <div className="space-y-4">
                        <div className="bg-blue-900/30 border-2 border-blue-500 rounded-xl p-6">
                            <h3 className="text-xl font-bold text-blue-300 mb-2 flex items-center gap-2">
                            <img src="https://http2.mlstatic.com/frontend-assets/ml-web-navigation/ui-navigation/5.21.22/mercadolibre/logo__small.png" alt="Mercado Livre" className="w-6 h-6" />
                            Anúncio Encontrado no Mercado Livre
                            </h3>
                            <p className="text-gray-400 text-sm mb-4">
                            A IA encontrou o anúncio mais relevante para usar como base.
                            </p>

                            <div className="bg-gray-800/50 rounded-lg border border-gray-600 p-4 mb-4">
                            <h4 className="font-bold text-white mb-2 line-clamp-2">{foundMlAd.title}</h4>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-400">Preço:</span>
                                <span className="text-green-400 font-bold">R$ {foundMlAd.price?.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm mt-1">
                                <span className="text-gray-400">Loja:</span>
                                <span className="text-white font-bold">{foundMlAd.store}</span>
                            </div>
                            <a
                                href={foundMlAd.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 mt-3 break-all"
                            >
                                🔗 {foundMlAd.url}
                            </a>
                            </div>

                            <div className="flex gap-3 pt-4">
                            <Button
                                onClick={() => {
                                setFoundMlAd(null);
                                setManualStep(10); // Volta para o preview do produto
                                }}
                                variant="outline"
                                className="flex-1 border-gray-500 text-gray-300 hover:bg-gray-700"
                            >
                                ⬅️ Voltar
                            </Button>
                            <Button
                                onClick={() => {
                                  downloadImagesFromAd({ url: foundMlAd.url, source: foundMlAd.store, title: foundMlAd.title });
                                }}
                                disabled={isLoadingAds}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                            >
                                {isLoadingAds ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Carregando...
                                </>
                                ) : (
                                <>
                                    <ImageIcon className="w-4 h-4 mr-2" />
                                    Usar este anúncio
                                </>
                                )}
                            </Button>
                            </div>
                        </div>
                        </div>
                    )}



                    {/* 🆕 ETAPA 10: PRÉVIA DO PRODUTO (CONFIRMAÇÃO) */}
                    {manualStep === 10 && productPreview && (
                      <div className="space-y-4">
                        <div className="bg-blue-900/30 border-2 border-blue-500 rounded-xl p-6">
                          <h3 className="text-xl font-bold text-blue-300 mb-4 flex items-center gap-2">
                            <Sparkles className="w-5 h-5" />
                            🔍 Produto Encontrado
                          </h3>

                          {/* THUMBNAIL PREVIEW */}
                          {productPreview.thumbnailUrl && (
                            <div className="w-32 h-32 mx-auto mb-4 bg-white rounded-lg p-2 border-2 border-blue-400">
                              <img 
                                src={productPreview.thumbnailUrl} 
                                alt="Preview"
                                className="w-full h-full object-contain"
                              />
                            </div>
                          )}

                          {/* DADOS DO PRODUTO */}
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
                              <span className="text-blue-400 font-semibold">📸 Imagens disponíveis:</span>
                              <span className="text-white font-bold">{productPreview.imageCount} fotos</span>
                            </div>
                          </div>

                          {/* AVISO DE CRÉDITO */}
                          <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-3 mb-4">
                            <p className="text-yellow-300 text-sm flex items-center gap-2">
                              <AlertCircle className="w-4 h-4" />
                              <span>⚠️ Buscar as imagens completas irá consumir <strong>1 crédito</strong> da API do Google Shopping</span>
                            </p>
                          </div>

                          {/* PERGUNTA */}
                          <div className="text-center mb-4">
                            <p className="text-white font-bold text-lg">❓ Este é o produto correto?</p>
                          </div>

                          {/* BOTÕES DE AÇÃO */}
                          <div className="grid grid-cols-2 gap-3">
                            <Button
                              onClick={cancelPreview}
                              variant="outline"
                              className="border-red-500 text-red-400 hover:bg-red-600 hover:text-white"
                            >
                              ❌ Não, Buscar Novamente
                            </Button>
                            <Button
                              onClick={confirmAndFetchImages}
                              disabled={isSearchingName}
                              className="bg-green-600 hover:bg-green-700 text-white font-bold"
                            >
                              {isSearchingName ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Buscando...
                                </>
                              ) : (
                                <>✅ Sim, Confirmar</>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 🆕 ETAPA 5: PREVIEW DAS IMAGENS IMPORTADAS */}
                    {manualStep === 5 && downloadedImages.length > 0 && (
                      <div className="space-y-4">
                        <div className="bg-green-900/30 p-4 rounded-lg border border-green-700">
                          <h4 className="font-bold text-green-300 mb-3 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            ✅ Produto Importado com Sucesso!
                          </h4>
                          <div className="space-y-2 text-sm bg-black/30 p-3 rounded">
                            <div><span className="text-green-400 font-semibold">Título:</span> {importedData?.title || extractedData?.title || formData.title}</div>
                            {importedData?.price && (
                              <div><span className="text-green-400 font-semibold">Preço:</span> R$ {importedData.price.toFixed(2)}</div>
                            )}
                          </div>
                        </div>

                        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                          <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" />
                            📸 Imagens ({downloadedImages.length})
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            {downloadedImages.map((img, index) => (
                              <div key={index} className="relative border-2 border-gray-700 rounded-lg overflow-hidden">
                                <div className="w-full h-32 bg-gray-900 flex items-center justify-center p-2">
                                  <img 
                                    src={img} 
                                    alt={`Imagem ${index + 1}`}
                                    className="max-w-full max-h-full object-contain"
                                    loading="eager"
                                    onError={(e) => {
                                      console.error(`❌ Erro ao carregar imagem ${index + 1}`);
                                      e.target.style.display = 'none';
                                      if (e.target.parentElement) {
                                        e.target.parentElement.innerHTML = `<div class="text-red-400 text-xs">❌ Erro ao carregar</div>`;
                                      }
                                    }}
                                  />
                                </div>
                                <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full">
                                  {index === 0 ? '🏆 CAPA' : `#${index + 1}`}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <Button 
                          onClick={applyToForm}
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-base py-3"
                        >
                          <Upload className="w-5 h-5 mr-2" />
                          🚀 Aplicar no Formulário
                        </Button>
                      </div>
                    )}

                    {/* 🆕 ETAPA 2: URLs DAS IMAGENS EXTRAÍDAS (SEM PREVIEW) */}
                    {manualStep === 2 && (
                      <div className="space-y-4">
                        <div className="bg-green-900/30 p-4 rounded-lg border border-green-700">
                          <h4 className="font-bold text-green-300 mb-3 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            ✅ Dados Extraídos com Sucesso!
                          </h4>
                          <div className="space-y-2 text-sm bg-black/30 p-3 rounded">
                            <div><span className="text-green-400 font-semibold">Título:</span> {extractedData.title}</div>
                            <div><span className="text-green-400 font-semibold">Descrição:</span> {extractedData.description.substring(0, 100)}...</div>
                          </div>
                        </div>

                        <div className="bg-blue-900/30 p-4 rounded-lg border border-blue-700">
                          <h4 className="font-bold text-blue-300 mb-3 flex items-center gap-2">
                            <LinkIcon className="w-4 h-4" />
                            📸 URLs das Imagens Encontradas
                          </h4>
                          
                          <div className="space-y-2 mb-4 max-h-[300px] overflow-y-auto">
                            {extractedImageUrls.filter(u => u.trim()).map((url, index) => (
                              <div key={index} className="bg-gray-800 rounded p-3 border border-gray-700">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-bold text-blue-400">
                                    {index === 0 ? '🏆 CAPA' : `Imagem ${index + 1}`}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      navigator.clipboard.writeText(url);
                                      toast.success('✅ URL copiada!');
                                    }}
                                    className="h-6 text-xs border-gray-600"
                                  >
                                    <Copy className="w-3 h-3 mr-1" />
                                    Copiar
                                  </Button>
                                </div>
                                <p className="text-xs text-gray-400 break-all font-mono bg-black/30 p-2 rounded">
                                  {url}
                                </p>
                              </div>
                            ))}
                          </div>

                          <Button 
                            onClick={() => {
                              // APLICA URLs DIRETO NO FORMULÁRIO
                              const validUrls = extractedImageUrls.filter(u => u.trim());
                              const finalImages = validUrls.slice(0, 5);
                              while (finalImages.length < 5) {
                                finalImages.push("");
                              }
                              
                              setFormData(prev => ({
                                ...prev,
                                title: extractedData.title,
                                description: extractedData.description,
                                image_urls: finalImages,
                                source_url: productUrl
                              }));
                              
                              // Limpa estados
                              setProductUrl("");
                              setExtractedImageUrls(['', '', '', '', '', '']);
                              setExtractedData({ title: "", description: "" });
                              setManualStep(0);
                              
                              toast.success(`✅ Produto + ${validUrls.length} URLs aplicados!`);
                            }}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            🚀 Aplicar no Formulário
                          </Button>

                          <p className="text-xs text-gray-400 mt-3 text-center">
                            💡 As URLs serão usadas diretamente no leilão (sem download)
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 🆕 ETAPA 3: ESCOLHER CAPA DAS IMAGENS BAIXADAS */}
                    {manualStep === 3 && downloadedImages.length > 0 && (
                      <div className="bg-blue-900/30 p-4 rounded-lg border border-blue-700">
                        <h4 className="font-bold text-blue-300 mb-3 flex items-center gap-2">
                          <ImageIcon className="w-4 h-4" />
                          ✅ {downloadedImages.length} Imagem{downloadedImages.length > 1 ? 'ns' : ''} Pronta{downloadedImages.length > 1 ? 's' : ''}! Escolha a Capa
                        </h4>
                        <p className="text-xs text-blue-400 mb-4">Clique na imagem que será a CAPA do leilão (primeira posição)</p>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                          {downloadedImages.map((imgUrl, index) => (
                            <div
                              key={index}
                              className={`relative group cursor-pointer border-2 rounded-lg overflow-hidden transition-all duration-200 ${
                                coverIndex === index 
                                  ? 'border-blue-500 ring-4 ring-blue-500/50 scale-105' 
                                  : 'border-gray-700 hover:border-blue-600'
                              }`}
                              onClick={() => setCoverIndex(index)}
                            >
                              <div className="w-full h-32 bg-gray-900 flex items-center justify-center p-2">
                                <img 
                                  src={imgUrl} 
                                  alt={`Produto ${index + 1}`}
                                  className="max-w-full max-h-full object-contain"
                                  loading="eager"
                                  onError={(e) => {
                                    console.error(`❌ Erro ao carregar imagem ${index + 1}:`, imgUrl);
                                    e.target.style.display = 'none';
                                    if (e.target.parentElement) {
                                      e.target.parentElement.innerHTML = `<div class="text-red-400 text-xs">❌ Erro</div>`;
                                    }
                                  }}
                                />
                              </div>
                              
                              <div className="absolute top-1 left-1 bg-black/90 text-white text-xs px-2 py-1 rounded-full font-bold">
                                {index + 1}
                              </div>
                              
                              {coverIndex === index && (
                                <div className="absolute inset-0 flex items-center justify-center bg-blue-600/60 backdrop-blur-[2px] text-white font-bold text-base">
                                  ✅ CAPA
                                </div>
                              )}
                              
                              {coverIndex !== index && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium">
                                  Clique para capa
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        <Button 
                          onClick={() => {
                            // Reorganiza com capa primeiro
                            let finalImages = [];
                            finalImages.push(downloadedImages[coverIndex]);
                            downloadedImages.forEach((img, i) => {
                              if (i !== coverIndex) finalImages.push(img);
                            });
                            
                            // Aplica no formulário (até 5 imagens)
                            finalImages = finalImages.slice(0, 5);
                            while (finalImages.length < 5) {
                              finalImages.push("");
                            }
                            
                            setFormData(prev => ({
                              ...prev,
                              title: importedData?.title || prev.title,
                              description: importedData?.description || prev.description,
                              starting_price: importedData?.price ? importedData.price.toString() : prev.starting_price,
                              image_urls: finalImages,
                              source_url: productUrl
                            }));
                            
                            // Reseta estados
                            setManualStep(0);
                            setImportedData(null);
                            setExtractedImageUrls(['', '', '', '', '', '']);
                            setDownloadedImages([]);
                            setProductUrl("");
                            setCoverIndex(0);
                            
                            toast.success("✅ Todos os dados aplicados no formulário!");
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-base py-3"
                        >
                          <CheckCircle className="w-5 h-5 mr-2" />
                          🚀 Aplicar no Formulário
                        </Button>
                        
                        <p className="text-xs text-center text-gray-400 mt-3">
                          💡 A imagem {coverIndex + 1} será a capa do leilão
                        </p>
                      </div>
                    )}

                    {/* ETAPA ANTIGA 3 - REMOVIDA (agora é etapa 2 e 3 acima) */}
                    {manualStep === 999 && (
                      <div className="bg-yellow-900/30 p-4 rounded-lg border border-yellow-700">
                        <h4 className="font-bold text-yellow-300 mb-4 flex items-center gap-2">
                          <ImageIcon className="w-4 h-4" />
                          2️⃣ Confira as imagens encontradas:
                        </h4>
                        {imageUrls.every(url => !url.trim()) && (
                          <p className="text-red-400 text-sm mb-4">Nenhuma URL de imagem encontrada. Por favor, insira manualmente.</p>
                        )}
                        {imageUrls.map((url, index) => (
                          <div key={index} className="mb-2 flex items-center gap-2">
                            <Label className="w-20 text-right text-gray-400">Imagem {index + 1}:</Label>
                            <Input
                              value={url}
                              onChange={(e) => {
                                const newUrls = [...imageUrls];
                                newUrls[index] = e.target.value;
                                setImageUrls(newUrls);
                              }}
                              placeholder="https://..."
                              className="flex-1 bg-gray-900 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-yellow-500"
                              disabled={isProcessing}
                            />
                            {url && (
                              <Trash2 
                                className="w-4 h-4 text-gray-500 cursor-pointer hover:text-red-500" 
                                onClick={() => {
                                  const newUrls = [...imageUrls];
                                  newUrls[index] = "";
                                  setImageUrls(newUrls);
                                }}
                              />
                            )}
                          </div>
                        ))}
                        <div className="flex gap-2 mt-4">
                          <Button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleClearAllImages();
                            }}
                            disabled={isProcessing || !imageUrls.some(url => url.trim())}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Limpar Todas
                          </Button>
                          <Button 
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              
                              const validUrls = imageUrls.filter(url => url && url.trim().startsWith('http'));
                              
                              if (validUrls.length === 0) {
                                toast.error("Adicione pelo menos uma URL válida!");
                                return;
                              }
                              
                              // Aplica URLs diretamente no formulário
                              const finalImages = [...validUrls];
                              while (finalImages.length < 5) {
                                finalImages.push("");
                              }
                              
                              setFormData(prev => ({
                                ...prev,
                                image_urls: finalImages.slice(0, 5)
                              }));
                              
                              // Limpa o importador
                              setManualStep(0);
                              setProductUrl("");
                              setImageUrls(["", "", "", "", "", ""]);
                              setExtractedData({title: "", description: ""});
                              
                              toast.success(`✅ ${validUrls.length} imagens aplicadas no formulário!`);
                            }}
                            disabled={isProcessing || !imageUrls.some(url => url.trim().startsWith('http'))} 
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            ✅ Aplicar no Formulário
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* ETAPA ANTIGA 4 - REMOVIDA */}
                    {manualStep === 998 && (
                      <div className="text-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-yellow-500" />
                        <p className="text-yellow-400">Baixando e enviando imagens, por favor, aguarde...</p>
                      </div>
                    )}

                    {/* ETAPA ANTIGA 5 - REMOVIDA (substituída pela nova etapa 3) */}
                    {manualStep === 997 && downloadedImages.length > 0 && (
                      <div className="bg-green-900/30 p-4 rounded-lg border border-green-700">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-green-300 flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" />
                            3️⃣ Escolha a imagem de capa:
                          </h4>
                          <span className="text-xs text-green-400 bg-green-900/40 px-3 py-1 rounded-full">
                            {downloadedImages.length} imagem{downloadedImages.length !== 1 ? 'ns' : ''} encontrada{downloadedImages.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                          {downloadedImages.map((img, index) => (
                            <div
                              key={index}
                              className={`relative group cursor-pointer border-2 rounded-lg overflow-hidden transition-all duration-200 ${
                                  coverIndex === index ? 'border-green-500 ring-2 ring-green-500/30 scale-105' : 'border-gray-700 hover:border-green-600'
                              }`}
                              onClick={() => setCoverIndex(index)}
                            >
                              <div className="w-full h-28 bg-gray-900 flex items-center justify-center">
                                <img 
                                  src={img} 
                                  alt={`Imagem ${index + 1}`} 
                                  className="max-w-full max-h-full object-contain"
                                  crossOrigin="anonymous"
                                  loading="eager"
                                  onError={(e) => {
                                    console.error(`❌ Erro ao carregar imagem ${index + 1}:`, img);
                                    e.target.style.display = 'none';
                                    if (e.target.parentElement) {
                                      e.target.parentElement.innerHTML = `<div class="text-red-400 text-xs text-center p-2">❌ Erro ao carregar</div>`;
                                    }
                                  }}
                                />
                              </div>

                              <Button
                                  variant="destructive"
                                  size="icon"
                                  className="absolute top-1 right-1 h-6 w-6 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      const newImages = downloadedImages.filter((_, i) => i !== index);
                                      setDownloadedImages(newImages);

                                      if (newImages.length === 0) {
                                          setManualStep(3);
                                          setCoverIndex(0);
                                          return;
                                      }

                                      if (coverIndex === index) {
                                          setCoverIndex(0); 
                                      } else if (coverIndex > index) {
                                          setCoverIndex(prev => prev - 1); 
                                      }
                                  }}
                              >
                                  <Trash2 className="w-3 h-3" />
                              </Button>

                              <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full pointer-events-none">
                                {index + 1}
                              </div>
                              {coverIndex === index && (
                                <div className="absolute inset-0 flex items-center justify-center bg-green-500/40 backdrop-blur-[2px] text-white font-bold text-sm pointer-events-none">
                                    ✅ CAPA
                                </div>
                              )}
                              {coverIndex !== index && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium pointer-events-none">
                                  Clique para selecionar
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <Button 
                          onClick={() => setManualStep(6)} 
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          ✅ Confirmar Capa (Imagem {coverIndex + 1})
                        </Button>
                      </div>
                    )}

                    {/* ETAPA ANTIGA 6 - REMOVIDA */}
                    {manualStep === 996 && (
                      <div className="bg-blue-900/30 p-4 rounded-lg border border-blue-700 text-center">
                        <h4 className="font-bold text-blue-300 mb-2 flex items-center justify-center gap-2">
                          <Upload className="w-4 h-4" />
                          4️⃣ Tudo pronto!
                        </h4>
                        <p className="mb-4 text-blue-400">Capa selecionada: Imagem {coverIndex + 1}</p>
                        <Button onClick={applyToForm} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                          🚀 Aplicar Dados no Formulário
                        </Button>
                      </div>
                    )}



                  </CardContent>
                </Card>

                {/* 🆕 SEÇÃO DE UPLOAD MANUAL - ALTERNATIVA AO IMPORTADOR */}
                <Card className="bg-gray-800 border border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between text-purple-400">
                      <div className="flex items-center gap-2">
                        <UploadCloud className="w-5 h-5" />
                        Upload Manual de Imagens
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowManualUpload(!showManualUpload)}
                        className="text-purple-300 hover:text-purple-100"
                      >
                        {showManualUpload ? "Ocultar" : "Mostrar"}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  
                  {showManualUpload && (
                    <CardContent className="space-y-4">
                      {manualUploadImages.length === 0 ? (
                        <div>
                          <div 
                            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
                              isDragging 
                                ? 'border-purple-400 bg-purple-900/30 scale-105' 
                                : 'border-purple-600 hover:bg-purple-900/10'
                            }`}
                            onClick={() => !isUploading && document.getElementById('manual-upload-input').click()}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsDragging(true);
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsDragging(false);
                            }}
                            onDrop={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsDragging(false);
                              
                              if (isUploading) return;
                              
                              const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')).slice(0, 6);
                              if (files.length === 0) {
                                alert("Nenhuma imagem válida encontrada");
                                return;
                              }
                              
                              setIsUploading(true);
                              const uploadedUrls = [];
                              
                              try {
                                for (const file of files) {
                                  const result = await base44.integrations.Core.UploadFile({ file });
                                  
                                  if (result?.file_url) {
                                    uploadedUrls.push(result.file_url);
                                  }
                                }
                                
                                if (uploadedUrls.length > 0) {
                                  setManualUploadImages(uploadedUrls);
                                  setManualCoverIndex(0);
                                  alert(`✅ ${uploadedUrls.length} imagem(ns) enviada(s)!`);
                                }
                              } catch (error) {
                                alert("❌ Erro ao enviar imagens: " + error.message);
                              } finally {
                                setIsUploading(false);
                              }
                            }}
                          >
                            {isUploading ? (
                              <Loader2 className="w-12 h-12 mx-auto mb-4 text-purple-400 animate-spin" />
                            ) : (
                              <UploadCloud className={`w-12 h-12 mx-auto mb-4 transition-all ${
                                isDragging ? 'text-purple-300 scale-110' : 'text-purple-400'
                              }`} />
                            )}
                            
                            <h4 className="text-lg font-semibold text-purple-300 mb-2">
                              {isUploading ? "Enviando imagens..." : isDragging ? "✨ Solte as imagens aqui" : "📸 Clique ou arraste imagens"}
                            </h4>
                            <p className="text-sm text-gray-400">
                              {isDragging ? "Solte para fazer upload" : "Selecione até 6 imagens do seu computador"}
                            </p>
                          </div>
                          
                          <input
                            id="manual-upload-input"
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={async (e) => {
                              if (!e.target.files || e.target.files.length === 0) return;
                              
                              setIsUploading(true);
                              const files = Array.from(e.target.files).slice(0, 6);
                              const uploadedUrls = [];
                              
                              try {
                                for (const file of files) {
                                  const result = await base44.integrations.Core.UploadFile({ file });
                                  
                                  if (result?.file_url) {
                                    uploadedUrls.push(result.file_url);
                                  }
                                }
                                
                                if (uploadedUrls.length > 0) {
                                  setManualUploadImages(uploadedUrls);
                                  setManualCoverIndex(0);
                                  alert(`✅ ${uploadedUrls.length} imagem(ns) enviada(s)!`);
                                }
                              } catch (error) {
                                alert("❌ Erro ao enviar imagens: " + error.message);
                              } finally {
                                setIsUploading(false);
                                e.target.value = '';
                              }
                            }}
                            disabled={isUploading}
                          />
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="bg-purple-900/30 p-4 rounded-lg border border-purple-700">
                            <h4 className="font-bold text-purple-300 mb-4 flex items-center gap-2">
                              <ImageIcon className="w-4 h-4" />
                              Escolha a imagem de capa:
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                              {manualUploadImages.map((img, index) => (
                                <div
                                  key={index}
                                  className={`relative group cursor-pointer border-2 rounded-lg overflow-hidden transition-all duration-200 ${
                                    manualCoverIndex === index ? 'border-purple-500 ring-2 ring-purple-500/30' : 'border-gray-700 hover:border-purple-600'
                                  }`}
                                  onClick={() => setManualCoverIndex(index)}
                                  >
                                  <div className="w-full h-24 bg-gray-900 flex items-center justify-center">
                                    <img 
                                      src={img} 
                                      alt={`Imagem ${index + 1}`} 
                                      className="max-w-full max-h-full object-contain"
                                      crossOrigin="anonymous"
                                      loading="eager"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                        if (e.target.parentElement) {
                                          e.target.parentElement.innerHTML = '<div class="text-xs text-red-400">❌ Erro</div>';
                                        }
                                      }}
                                    />
                                  </div>
                                  
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-1 right-1 h-6 w-6 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newImages = manualUploadImages.filter((_, i) => i !== index);
                                      setManualUploadImages(newImages);
                                      
                                      if (newImages.length === 0) {
                                        return;
                                      }
                                      
                                      if (manualCoverIndex === index) {
                                        setManualCoverIndex(0);
                                      } else if (manualCoverIndex > index) {
                                        setManualCoverIndex(prev => prev - 1);
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                  
                                  <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full pointer-events-none">
                                    {index + 1}
                                  </div>
                                  {manualCoverIndex === index && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-purple-500/30 text-white font-bold pointer-events-none">
                                      CAPA
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setManualUploadImages([]);
                                setManualCoverIndex(0);
                              }}
                              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Limpar Tudo
                            </Button>
                            <Button
                              type="button"
                              onClick={() => {
                                let finalImages = [];
                                finalImages.push(manualUploadImages[manualCoverIndex]);
                                manualUploadImages.forEach((img, i) => {
                                  if (i !== manualCoverIndex) finalImages.push(img);
                                });
                                finalImages = finalImages.slice(0, 5);
                                
                                while (finalImages.length < 5) {
                                  finalImages.push("");
                                }
                                
                                setFormData(prev => ({
                                  ...prev,
                                  image_urls: finalImages
                                }));
                                
                                setManualUploadImages([]);
                                setManualCoverIndex(0);
                                setShowManualUpload(false);
                                
                                alert("✅ Imagens aplicadas no formulário!");
                              }}
                              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              🚀 Aplicar no Formulário
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
                        <Label htmlFor="store_id" className="text-sm font-medium text-gray-400">
                          Selecionar Lojista *
                        </Label>
                        <Select value={formData.store_id} onValueChange={(value) => handleInputChange("store_id", value)}>
                          <SelectTrigger className="mt-1 bg-gray-900 border-gray-600 text-gray-100">
                            <SelectValue placeholder="Selecione um lojista" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700 text-gray-200">
                            <SelectItem value={null}>🏢 Admin (Sem lojista)</SelectItem>
                            {stores.map((store) => (
                              <SelectItem key={store.id} value={store.id}>
                                {store.logo_url && <img src={store.logo_url} alt="" className="inline-block w-4 h-4 mr-2 rounded" />}
                                {store.store_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="title" className="text-sm font-medium text-gray-400">
                          Nome do Produto * (Revise)
                        </Label>
                        <Input id="title" value={formData.title} onChange={(e) => handleInputChange("title", e.target.value)} required className="mt-1 bg-gray-900 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-green-500" />
                      </div>
                      <div>
                        <Label htmlFor="category" className="text-sm font-medium text-gray-400"> Categoria * </Label>
                        <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                          <SelectTrigger className="mt-1 bg-gray-900 border-gray-600 text-gray-100"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700 text-gray-200">
                            {partnerStore === 'sai_de_baixo' ? (
                              <>
                                <SelectItem value="masculino">👔 Masculino</SelectItem>
                                <SelectItem value="feminino">👗 Feminino</SelectItem>
                                <SelectItem value="infantil">👶 Infantil</SelectItem>
                                <SelectItem value="calcados">👟 Calçados</SelectItem>
                                <SelectItem value="acessorios">⌚ Acessórios</SelectItem>
                                <SelectItem value="moda_intima">💝 Moda Íntima</SelectItem>
                                <SelectItem value="plus_size">💜 Plus Size</SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="eletronicos">📱 Eletrônicos & Celulares</SelectItem>
                                <SelectItem value="eletrodomesticos">🔌 Eletrodomésticos</SelectItem>
                                <SelectItem value="moveis_decoracao">🛋️ Móveis & Decoração</SelectItem>
                                <SelectItem value="casa_jardim">🏡 Casa & Jardim</SelectItem>
                                <SelectItem value="ferramentas">🛠️ Ferramentas</SelectItem>
                                <SelectItem value="roupas_acessorios">👕 Roupas & Acessórios</SelectItem>
                                <SelectItem value="esportes_lazer">⚽ Esportes & Lazer</SelectItem>
                                <SelectItem value="brinquedos_hobbies">🧸 Brinquedos & Hobbies</SelectItem>
                                <SelectItem value="livros_midia">📚 Livros & Mídia</SelectItem>
                                <SelectItem value="veiculos_pecas">🚗 Veículos & Peças</SelectItem>
                                <SelectItem value="instrumentos_musicais">🎸 Instrumentos Musicais</SelectItem>
                                <SelectItem value="beleza_cuidado_pessoal">💅 Beleza & Cuidado Pessoal</SelectItem>
                                <SelectItem value="outros">🎯 Outros</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 🆕 REGIÕES PERMITIDAS */}
                      <div>
                        <Label htmlFor="allowed_regions" className="text-sm font-medium text-gray-400"> 📍 Regiões Permitidas (Estados) </Label>
                        <Select 
                          value={formData.allowed_regions.length === 0 ? "todos" : "custom"}
                          onValueChange={(value) => {
                            if (value === "todos") {
                              handleInputChange("allowed_regions", []);
                            }
                          }}
                        >
                          <SelectTrigger className="mt-1 bg-gray-900 border-gray-600 text-gray-100">
                            <SelectValue>
                              {formData.allowed_regions.length === 0 
                                ? "✅ Todo o Brasil" 
                                : `${formData.allowed_regions.length} estado${formData.allowed_regions.length > 1 ? 's' : ''} selecionado${formData.allowed_regions.length > 1 ? 's' : ''}`}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700 text-gray-200 max-h-[400px]">
                            <SelectItem value="todos">✅ Todo o Brasil</SelectItem>
                            <div className="px-2 py-1 text-xs text-gray-400 font-semibold">Selecione os estados:</div>
                            {[
                              { uf: "AC", name: "Acre" },
                              { uf: "AL", name: "Alagoas" },
                              { uf: "AP", name: "Amapá" },
                              { uf: "AM", name: "Amazonas" },
                              { uf: "BA", name: "Bahia" },
                              { uf: "CE", name: "Ceará" },
                              { uf: "DF", name: "Distrito Federal" },
                              { uf: "ES", name: "Espírito Santo" },
                              { uf: "GO", name: "Goiás" },
                              { uf: "MA", name: "Maranhão" },
                              { uf: "MT", name: "Mato Grosso" },
                              { uf: "MS", name: "Mato Grosso do Sul" },
                              { uf: "MG", name: "Minas Gerais" },
                              { uf: "PA", name: "Pará" },
                              { uf: "PB", name: "Paraíba" },
                              { uf: "PR", name: "Paraná" },
                              { uf: "PE", name: "Pernambuco" },
                              { uf: "PI", name: "Piauí" },
                              { uf: "RJ", name: "Rio de Janeiro" },
                              { uf: "RN", name: "Rio Grande do Norte" },
                              { uf: "RS", name: "Rio Grande do Sul" },
                              { uf: "RO", name: "Rondônia" },
                              { uf: "RR", name: "Roraima" },
                              { uf: "SC", name: "Santa Catarina" },
                              { uf: "SP", name: "São Paulo" },
                              { uf: "SE", name: "Sergipe" },
                              { uf: "TO", name: "Tocantins" }
                            ].map((estado) => (
                              <div
                                key={estado.uf}
                                className={`flex items-center gap-2 px-2 py-2 cursor-pointer hover:bg-gray-700 rounded ${
                                  formData.allowed_regions.includes(estado.uf) ? 'bg-green-600/20' : ''
                                }`}
                                onClick={() => {
                                  const newRegions = formData.allowed_regions.includes(estado.uf)
                                    ? formData.allowed_regions.filter((r) => r !== estado.uf)
                                    : [...formData.allowed_regions, estado.uf];
                                  handleInputChange("allowed_regions", newRegions);
                                }}
                              >
                                <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                                  formData.allowed_regions.includes(estado.uf) 
                                    ? 'bg-green-600 border-green-600' 
                                    : 'border-gray-500'
                                }`}>
                                  {formData.allowed_regions.includes(estado.uf) && (
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </div>
                                <span className="font-bold text-sm">{estado.uf}</span>
                                <span className="text-xs text-gray-400">- {estado.name}</span>
                              </div>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 mt-2">
                          {formData.allowed_regions.length === 0
                            ? "✅ Leilão disponível em TODO o Brasil"
                            : `🎯 Disponível em: ${formData.allowed_regions.join(", ")}`}
                        </p>
                      </div>

                      {/* NOVO: ORIGEM DO PRODUTO */}
                      <div>
                        <Label htmlFor="product_source" className="text-sm font-medium text-gray-400"> Origem do Produto * </Label>
                        <Select value={formData.product_source} onValueChange={(value) => {
                          handleInputChange("product_source", value);
                          // LIMPA LOGO SE MUDAR PARA ARREMATE
                          if (value === 'return_resale') {
                            setFormData(prev => ({ ...prev, supplier_logo_url: "", comparai_mode: "google_shopping" }));
                            setSupplierLogoPreview("");
                          }
                          // ATUALIZA PARTNER_STORE SE SELECIONAR SAI DE BAIXO
                          if (value === 'sai_de_baixo') {
                            setFormData(prev => ({ ...prev, partner_store: 'sai_de_baixo' }));
                          } else if (formData.partner_store === 'sai_de_baixo') {
                            setFormData(prev => ({ ...prev, partner_store: 'nozap' }));
                          }
                        }}>
                          <SelectTrigger className="mt-1 bg-gray-900 border-gray-600 text-gray-100">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700 text-gray-200">
                            <SelectItem value="factory_new">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <span>✨ Novo de Fábrica (com garantia)</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="return_resale">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                                <span>🔥 Arremate/Devolução (sem garantia)</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="sai_de_baixo">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                                <span>✨ Sai de Baixo</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 mt-1">
                          {formData.product_source === 'factory_new' 
                            ? '✅ Produto novo, lacrado, com garantia do fabricante' 
                            : formData.product_source === 'sai_de_baixo'
                            ? '✨ Produto da loja Sai de Baixo - aparece apenas na aba Sai de Baixo'
                            : '📦 Produto de arremate ou devolução em até 7 dias, testado e funcional'}
                        </p>
                      </div>

                      {/* 🆕 MODO COMPARAI */}
                      <div>
                        <Label htmlFor="comparai_mode" className="text-sm font-medium text-gray-400"> 
                          🔍 Onde a Comparai vai buscar o preço? 
                        </Label>
                        <Select value={formData.comparai_mode} onValueChange={(value) => handleInputChange("comparai_mode", value)}>
                          <SelectTrigger className="mt-1 bg-gray-900 border-gray-600 text-gray-100">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700 text-gray-200">
                            <SelectItem value="supplier">
                              <div className="flex items-center gap-2">
                                <span>🏭 Site do Fornecedor (preço exato)</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="google_shopping">
                              <div className="flex items-center gap-2">
                                <span>🔎 Usar Comparai (página de arremate)</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 mt-1">
                          {formData.comparai_mode === 'supplier' 
                            ? '🏭 A Comparai buscará o preço diretamente no site do fornecedor (precisa inserir URL abaixo)' 
                            : '🔎 Mesma comparação usada nos produtos de arremate'}
                        </p>
                      </div>

                      {/* URL DO FORNECEDOR (SÓ APARECE SE comparai_mode === 'supplier') */}
                      {formData.comparai_mode === 'supplier' && (
                        <div className="bg-green-900/20 border-2 border-green-500/50 rounded-xl p-4 space-y-4">
                          <div>
                            <Label htmlFor="supplier_url" className="text-sm font-bold text-green-300 flex items-center gap-2 mb-2">
                              <LinkIcon className="w-4 h-4" />
                              🏭 URL do Fornecedor (para Comparai) *
                            </Label>
                            <Input
                              id="supplier_url"
                              value={formData.supplier_url}
                              onChange={(e) => handleInputChange("supplier_url", e.target.value)}
                              placeholder="https://www.fornecedor.com.br/produto/123"
                              className="bg-gray-900 border-green-600 text-gray-100 placeholder-gray-500 focus:border-green-400"
                              required={formData.product_source === 'factory_new'}
                              disabled={isUploading}
                            />
                            <p className="text-xs text-green-300 mt-2 flex items-center gap-1">
                              <img 
                                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/d36767bcd_image.png"
                                alt="Comparai"
                                className="w-4 h-4 rounded-full"
                              />
                              <span>A Comparai usará esta URL para buscar o preço oficial do fornecedor!</span>
                            </p>
                          </div>

                          {/* UPLOAD DE LOGO DO FABRICANTE */}
                          <div>
                            <Label className="text-sm font-bold text-green-300 flex items-center gap-2 mb-2">
                              <Upload className="w-4 h-4" />
                              🎨 Logo do Fabricante (opcional)
                            </Label>
                            
                            {supplierLogoPreview ? (
                              <div className="relative w-32 h-32 mx-auto mb-2">
                                <img 
                                  src={supplierLogoPreview} 
                                  alt="Logo Preview"
                                  className="w-full h-full object-contain rounded-lg border-2 border-green-500 bg-white p-2"
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full"
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, supplier_logo_url: "" }));
                                    setSupplierLogoPreview("");
                                  }}
                                  disabled={isUploading}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="border-2 border-dashed border-green-600 rounded-lg p-4 text-center hover:bg-green-900/10 transition-colors cursor-pointer"
                                onClick={() => !isUploading && document.getElementById('supplier-logo-input').click()}
                              >
                                {isUploading ? (
                                  <Loader2 className="w-8 h-8 mx-auto mb-2 text-green-400 animate-spin" />
                                ) : (
                                  <UploadCloud className="w-8 h-8 mx-auto mb-2 text-green-400" />
                                )}
                                
                                <p className="text-xs text-green-300">
                                  {isUploading ? "Enviando logo..." : "Clique para fazer upload da logo do fabricante"}
                                </p>
                              </div>
                            )}
                            
                            <input
                              id="supplier-logo-input"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleSupplierLogoUpload(e.target.files[0]);
                                }
                              }}
                              disabled={isUploading}
                            />
                            
                            <p className="text-xs text-green-300 mt-2">
                              Esta logo aparecerá no card "Preço no Fabricante" da Comparai
                            </p>
                          </div>
                        </div>
                      )}

                      <div>
                        <Label htmlFor="description" className="text-sm font-medium text-gray-400">
                          Descrição Detalhada * (Revise)
                        </Label>
                        <Textarea id="description" value={formData.description} onChange={(e) => handleInputChange("description", e.target.value)} className="mt-1 min-h-[100px] bg-gray-900 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-green-500" required />
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
                        <Label htmlFor="starting_price" className="text-sm font-medium text-gray-400"> Preço Inicial (R$) * </Label>
                        <Input id="starting_price" type="number" step="0.01" value={formData.starting_price} onChange={(e) => handleInputChange("starting_price", e.target.value)} required className="mt-1 bg-gray-900 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-green-500" />
                      </div>
                      <div>
                        <Label htmlFor="increment" className="text-sm font-medium text-gray-400"> Incremento (R$) * </Label>
                        <Input id="increment" type="number" step="0.01" value={formData.increment} onChange={(e) => handleInputChange("increment", e.target.value)} required className="mt-1 bg-gray-900 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-green-500" />
                      </div>
                      <div>
                        <Label htmlFor="buy_now_price" className="text-sm font-medium text-gray-400"> Preço de Compra Rápida (opcional) </Label>
                        <Input
                            id="buy_now_price"
                            type="number"
                            step="0.01"
                            value={formData.buy_now_price}
                            onChange={(e) => handleInputChange("buy_now_price", e.target.value)}
                            className="mt-1 bg-gray-900 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-green-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Se preenchido, o leilão pode ser encerrado imediatamente por este valor.</p>
                      </div>

                      {/* 🆕 SEÇÃO CATÁLOGO */}
                      <div className="md:col-span-3 mt-4 p-4 bg-yellow-900/20 rounded-lg border border-yellow-600/50 hidden">
                        <div className="flex items-center gap-3 mb-4">
                          <input
                            type="checkbox"
                            id="catalog_active"
                            checked={catalogActive}
                            onChange={(e) => setCatalogActive(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-600 text-yellow-600 cursor-pointer"
                          />
                          <Label htmlFor="catalog_active" className="text-white cursor-pointer flex items-center gap-2 font-medium">
                            <Package className="w-4 h-4 text-yellow-400" />
                            📦 Disponibilizar no Catálogo de Licenciados
                          </Label>
                        </div>
                        
                        {catalogActive && (
                          <div className="space-y-3">
                            <div>
                              <Label className="text-gray-300">Preço do Catálogo (R$) *</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={priceCatalog}
                                onChange={(e) => setPriceCatalog(e.target.value)}
                                placeholder="Ex: 299.90"
                                className="mt-1 bg-gray-900 border-yellow-600 text-gray-100 placeholder-gray-500 focus:border-yellow-400"
                                required={catalogActive}
                              />
                            </div>
                            <p className="text-xs text-yellow-300/80">
                              💡 Este produto ficará disponível para venda direta pelos licenciados através do catálogo.
                              Os licenciados ganharão comissão de 13% a 20% sobre este valor.
                            </p>
                          </div>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="duration" className="text-sm font-medium text-gray-400"> Duração do Leilão </Label>
                        <Select value={formData.duration} onValueChange={(value) => handleInputChange("duration", value)} >
                          <SelectTrigger className="mt-1 bg-gray-900 border-gray-600 text-gray-100"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700 text-gray-200">
                            <SelectItem value="60">⚡ 1 Minuto (Teste)</SelectItem>
                            <SelectItem value="300">⚡ 5 Minutos (Teste)</SelectItem>
                            <SelectItem value="900">⚡ 15 Minutos (Teste)</SelectItem>
                            <SelectItem value="3600">1 hora</SelectItem>
                            <SelectItem value="21600">6 horas</SelectItem>
                            <SelectItem value="43200">12 horas</SelectItem>
                            <SelectItem value="86400">1 dia (24h)</SelectItem>
                            <SelectItem value="172800">2 dias (48h)</SelectItem>
                            <SelectItem value="259200">3 dias (72h)</SelectItem>
                            <SelectItem value="604800">1 semana</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                  <div className="flex gap-4 pt-6">
                    <Button type="button" variant="outline" onClick={() => navigate(createPageUrl("Home"))} className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"> Cancelar </Button>
                    <Button type="submit" disabled={isSubmittingBid || isUploading} className="flex-1 bg-green-600 hover:bg-green-700 text-white" >
                      {isSubmittingBid ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Criando... </>
                      ) : (
                        <><Upload className="w-4 h-4 mr-2" /> Criar Leilão </>
                      )}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              {/* ABA 2: LABORATÓRIO DE TESTES */}
              <TabsContent value="lab" className="space-y-6 mt-6">
                <Alert className="bg-purple-900/50 border-purple-700">
                  <Beaker className="h-5 w-5 text-purple-400" />
                  <AlertTitle className="text-purple-300 font-bold">Laboratório de Testes</AlertTitle>
                  <AlertDescription className="text-purple-400">
                    Crie leilões isolados para testar funcionalidades sem impactar usuários reais. Todos os leilões criados aqui são marcados com [TESTE].
                  </AlertDescription>
                </Alert>

                <Card className="bg-gray-700/30 border-purple-500/30">
                  <CardHeader>
                    <CardTitle className="text-purple-400 flex items-center gap-2">
                      <FlaskConical className="w-5 h-5" />
                      🧪 Laboratório de Testes
                    </CardTitle>
                    <p className="text-sm text-gray-400">
                      Crie leilões de teste para simular lances e testar funcionalidades sem afetar dados reais.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    
                    {/* SEÇÃO 1: CRIAR TESTE */}
                    <div className="space-y-4 p-4 bg-gray-800/50 rounded-lg border border-gray-600">
                      <h3 className="font-semibold text-white flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        1. Criar Leilão de Teste
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="testDuration" className="text-gray-300">
                            Duração (minutos)
                          </Label>
                          <Input
                            id="testDuration"
                            type="number"
                            min="1"
                            max="60"
                            value={testDuration}
                            onChange={(e) => setTestDuration(parseInt(e.target.value))}
                            className="bg-gray-700 border-gray-600 text-white"
                          />
                        </div>
                        <Button
                          onClick={handleCreateTest}
                          disabled={isProcessingTest}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          {isProcessingTest ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                              Criando...
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4 mr-2" />
                              Criar Leilão de {testDuration}min
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="border-t border-gray-700 pt-4 mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="text-sm font-semibold text-yellow-400">💰 Gerenciar Saldo de Teste</h4>
                          <p className="text-xs text-gray-400 mt-1">Zera apenas o Valora Pay de TESTE, mantém o REAL intacto</p>
                        </div>
                      </div>
                      
                      <Button
                        onClick={handleResetTestValora}
                        disabled={isResettingTestValora}
                        variant="outline"
                        className="w-full border-yellow-500 text-yellow-400 hover:bg-yellow-500/10"
                      >
                        {isResettingTestValora ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Zerando Saldo de Teste...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-2" />
                            🧪 Zerar Valora Pay de TESTE
                          </>
                        )}
                      </Button>

                      <div className="mt-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                        <p className="text-xs text-blue-300 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>
                            <strong>Como funciona:</strong><br/>
                            • Leilões marcados como [TESTE] geram comissões em <code className="bg-gray-700 px-1 rounded">test_valora_balance</code><br/>
                            • Leilões normais geram comissões em <code className="bg-gray-700 px-1 rounded">valora_pay_balance</code> (REAL)<br/>
                            • Este botão zera apenas o saldo de teste, preservando o real
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* LISTA DE LEILÕES DE TESTE */}
                    {testAuctions.length > 0 && (
                      <div className="space-y-4 p-4 bg-gray-800/50 rounded-lg border border-gray-600">
                        <h3 className="font-semibold text-white">
                          📋 Leilões de Teste Ativos ({testAuctions.length})
                        </h3>
                        <Select value={selectedTestAuction} onValueChange={setSelectedTestAuction}>
                          <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                            <SelectValue placeholder="Selecione um leilão de teste" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-700 border-gray-600">
                            {testAuctions.map((test) => (
                              <SelectItem key={test.id} value={test.id} className="text-white hover:bg-gray-600">
                                <div className="flex items-center justify-between w-full">
                                  <span>{test.title}</span>
                                  <span className="text-xs text-gray-400 ml-4">
                                    R$ {test.current_price?.toFixed(2)} • {formatTestAuctionTime(test.end_time, test.status)}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* SIMULAR LANCES */}
                    <Card className="bg-gray-800 border border-gray-700">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2 text-orange-400">
                          <Zap className="w-5 h-5" />
                          2. Simular Lances
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-400">Quantidade de lances</Label>
                          <Input
                            type="number"
                            value={bidCount}
                            onChange={(e) => setBidCount(Number(e.target.value))}
                            min="1"
                            max="20"
                            className="mt-1 bg-gray-900 border-gray-600 text-gray-100"
                          />
                        </div>
                        <Button
                          onClick={handleSimulateBids}
                          disabled={isProcessingTest || !selectedTestAuction}
                          className="w-full bg-orange-600 hover:bg-orange-700"
                        >
                          {isProcessingTest ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Simulando...</>
                          ) : (
                            <><Zap className="w-4 h-4 mr-2" /> Simular {bidCount} Lance(s)</>
                          )}
                        </Button>
                      </CardContent>
                    </Card>

                    {/* ACELERAR TEMPO */}
                    <Card className="bg-gray-800 border border-gray-700">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2 text-yellow-400">
                          <FastForward className="w-5 h-5" />
                          3. Acelerar Tempo
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-400">Segundos para pular</Label>
                          <Input
                            type="number"
                            value={secondsToSkip}
                            onChange={(e) => setSecondsToSkip(Number(e.target.value))}
                            min="10"
                            max="3600"
                            className="mt-1 bg-gray-900 border-gray-600 text-gray-100"
                          />
                          <p className="text-xs text-gray-500 mt-1">O leilão terminará em {secondsToSkip} segundos</p>
                        </div>
                        <Button
                          onClick={handleFastForward}
                          disabled={isProcessingTest || !selectedTestAuction}
                          className="w-full bg-yellow-600 hover:bg-yellow-700"
                        >
                          {isProcessingTest ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Acelerando...</>
                          ) : (
                            <><FastForward className="w-4 h-4 mr-2" /> Pular {secondsToSkip} Segundos</>
                          )}
                        </Button>
                      </CardContent>
                    </Card>

                    {/* AÇÕES PERIGOSAS */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <Card className="bg-red-900/20 border border-red-700">
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2 text-red-400">
                            <Trash2 className="w-5 h-5" />
                            Limpar Testes
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Button
                            onClick={handleDeleteTests}
                            disabled={isProcessingTest || testAuctions.length === 0}
                            variant="destructive"
                            className="w-full"
                          >
                            {isProcessingTest ? (
                              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deletando...</>
                            ) : (
                              <><Trash2 className="w-4 h-4 mr-2" /> Deletar Todos os Testes</>
                            )}
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="bg-red-900/20 border border-red-700">
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2 text-red-400">
                            <RefreshCw className="w-5 h-5" />
                            Reset Total
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Button
                            onClick={handleResetData}
                            disabled={isProcessingTest}
                            variant="destructive"
                            className="w-full"
                          >
                            {isProcessingTest ? (
                              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Resetando...</>
                            ) : (
                              <><RefreshCw className="w-4 h-4 mr-2" /> Resetar Sistema de Testes</>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
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