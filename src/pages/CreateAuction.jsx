import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";

const Auction = base44.entities.Auction;
const User = { me: () => base44.auth.me() };
const AppUser = base44.entities.AppUser;
import { extractDataFromUrl } from "@/functions/extractDataFromUrl";
import { searchProductByGTIN } from "@/functions/searchProductByGTIN";
import { searchProductByName } from "@/functions/searchProductByName";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, Image as ImageIcon, DollarSign, Link as LinkIcon, Loader2, Trash2, Zap, BeakerIcon, UploadCloud, Beaker, FastForward, RefreshCw, FlaskConical, AlertCircle } from "lucide-react";
import { createPageUrl } from "@/utils";
import { downloadImage } from "@/functions/downloadImage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createTestAuction } from "@/functions/createTestAuction";
import { simulateTestBids } from "@/functions/simulateTestBids";
import { fastForwardTestAuction } from "@/functions/fastForwardTestAuction";
import { deleteTestAuctions } from "@/functions/deleteTestAuctions";
import { resetTestData } from "@/functions/resetTestData";
import { resetTestValora } from "@/functions/resetTestValora";
import { toast } from "sonner"; // Assuming sonner is used for notifications
import { addSeconds } from 'date-fns';

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
  const [isSearchingGtin, setIsSearchingGtin] = useState(false);
  const [isSearchingName, setIsSearchingName] = useState(false);
  const [selectedMarketplace, setSelectedMarketplace] = useState(null);
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

  // ESTADOS DO LABORATÓRIO DE TESTES
  const [testAuctions, setTestAuctions] = useState([]);
  const [selectedTestAuction, setSelectedTestAuction] = useState("");
  const [testDuration, setTestDuration] = useState(3); // Duration in minutes for test
  const [bidCount, setBidCount] = useState(5);
  const [secondsToSkip, setSecondsToSkip] = useState(60);
  const [isProcessingTest, setIsProcessingTest] = useState(false);
  const [isResettingTestValora, setIsResettingTestValora] = useState(false);

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

  // BUSCA POR NOME DO PRODUTO
  const searchByName = async () => {
    if (!productName || productName.trim().length < 3) {
      toast.error("Digite pelo menos 3 caracteres do nome do produto");
      return;
    }

    setIsSearchingName(true);
    setManualStep(1);

    try {
      const response = await searchProductByName({ productName: productName.trim() });

      console.log('📦 Resposta:', response);

      if (!response || response.status !== 200) {
        throw new Error(response?.data?.error || 'Erro na busca');
      }

      const data = response.data;

      if (data.error) {
        toast.error(data.error + (data.suggestion ? `\n💡 ${data.suggestion}` : ''));
        setManualStep(0);
        setIsSearchingName(false);
        return;
      }

      const productTitle = data.title || "Produto";
      const productDesc = data.description || "Produto encontrado";

      console.log(`✅ Título: ${productTitle}`);
      console.log(`🖼️ Imagens recebidas: ${data.imageUrls?.length || 0}`);

      setExtractedData({ title: productTitle, description: productDesc });
      setFormData(prev => ({ ...prev, title: productTitle, description: productDesc }));

      const validUrls = (data.imageUrls || [])
        .filter(url => url && typeof url === 'string' && url.trim());

      console.log(`🖼️ [NOME] URLs recebidas do backend:`, validUrls);

      if (validUrls.length === 0) {
        toast.warning(`⚠️ ${productTitle} sem imagens. Use upload manual.`);
        setProductName("");
        setManualStep(0);
      } else {
        toast.success(`✅ ${validUrls.length} imagens validadas pelo backend!`);
        setDownloadedImages(validUrls);
        setCoverIndex(0);
        setManualStep(5);
        console.log(`✅ [NOME] manualStep=5, downloadedImages:`, validUrls);
      }

      setProductName("");
      
    } catch (error) {
      console.error("❌ Erro ao buscar por nome:", error);
      toast.error(`Erro: ${error.message}`);
      setManualStep(0);
    } finally {
      setIsSearchingName(false);
    }
  };

  // BUSCA POR GTIN
  const searchByGtin = async () => {
    if (!gtinCode || gtinCode.trim().length < 8) {
      toast.error("Digite um código GTIN válido (mínimo 8 dígitos)");
      return;
    }

    setIsSearchingGtin(true);
    setManualStep(1);

    try {
      const response = await searchProductByGTIN({ gtin: gtinCode.trim() });

      console.log('📦 GTIN Response:', response);

      if (!response || response.status !== 200) {
        throw new Error(response?.data?.error || 'Erro GTIN');
      }

      const data = response.data;

      if (!data?.found) {
        toast.error(`❌ GTIN ${gtinCode} não encontrado`);
        setManualStep(0);
        setIsSearchingGtin(false);
        return;
      }

      const productTitle = data.title || "Produto";
      const productDesc = data.description || `${data.brand || 'Produto'} - GTIN: ${data.gtin}`;

      console.log(`✅ ${productTitle}`);
      console.log(`🖼️ Imagens: ${data.imageUrls?.length || 0}`);

      setExtractedData({ title: productTitle, description: productDesc });
      setFormData(prev => ({ ...prev, title: productTitle, description: productDesc }));

      const validUrls = (data.imageUrls || [])
        .filter(url => url && typeof url === 'string' && url.trim());

      console.log(`🖼️ [GTIN] URLs recebidas do backend:`, validUrls);

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
      console.error("❌ Erro ao buscar GTIN:", error);
      toast.error(`Erro ao buscar produto: ${error.message}`);
      setManualStep(0);
    } finally {
      setIsSearchingGtin(false);
    }
  };

  // ETAPA 1: EXTRAIR TUDO (TÍTULO, DESCRIÇÃO, IMAGENS) DE UMA VEZ
  const extractAllData = async () => {
    if (!productUrl) {
      toast.error("Cole a URL do produto primeiro!");
      return;
    }
    setIsProcessing(true);
    setManualStep(1);
    
    try {
      toast.info("🤖 IA analisando o produto...");
      
      const response = await extractDataFromUrl({ productUrl });

      if (!response || !response.data) {
          throw new Error("Falha na extração");
      }
      
      const responseData = response.data;
      
      // Verifica se houve erro
      if (responseData.error) {
        toast.error(responseData.error);
        if (responseData.suggestion) {
          alert(`❌ ${responseData.error}\n\n💡 ${responseData.suggestion}`);
        }
        setManualStep(0);
        setIsProcessing(false);
        return;
      }
      
      const { title, description, imageUrls: extractedImageUrls, marketplace } = responseData;
      
      if (!title || !description) {
        throw new Error("Dados incompletos");
      }
      
      console.log(`✅ ${marketplace}: ${title}`);
      console.log(`🖼️ Imagens recebidas: ${extractedImageUrls?.length || 0}`);
      
      setExtractedData({ title, description });
      setFormData(prev => ({ ...prev, title, description, source_url: productUrl }));
      
      const validUrls = (extractedImageUrls || [])
        .filter(url => url && typeof url === 'string' && url.trim());

      console.log(`🖼️ [URL] URLs recebidas do backend:`, validUrls);
      
      if (validUrls.length === 0) {
        toast.warning(`⚠️ ${title} sem imagens. Use upload manual.`);
        setManualStep(0);
        setIsProcessing(false);
      } else {
        toast.success(`✅ ${marketplace}: ${validUrls.length} imagens validadas!`);
        setDownloadedImages(validUrls);
        setCoverIndex(0);
        setManualStep(5);
        console.log(`✅ [URL] manualStep=5, downloadedImages:`, validUrls);
      }

    } catch (error) {
      console.error("Erro ao extrair dados:", error);
      toast.error("Erro ao extrair dados: " + (error.message || "Verifique a URL"));
      setManualStep(0);
    }
    
    setIsProcessing(false);
  };
  
  // ETAPA 2: VISUALIZAR IMAGENS - USA URLs ORIGINAIS QUANDO DOWNLOAD FALHAR
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
    
    // VALIDAÇÃO REMOVIDA: Agora permite supplier sem URL (vai usar Google Shopping como fallback)

    if (parseFloat(formData.starting_price) <= 0) {
      toast.error("O preço inicial deve ser maior que zero");
      return;
    }
    if (parseFloat(formData.increment) <= 0) {
      toast.error("O incremento mínimo deve ser maior que zero");
      return;
    }

    setIsSubmittingBid(true);

    try {
      // 🌎 CALCULA END TIME EM UTC (usando Date nativo)
      const now = new Date(); // Gets current date/time in local timezone, but toISOString converts to UTC.
      const endTime = addSeconds(now, parseInt(formData.duration)); // addSeconds from date-fns
      
      const endTimeISO = endTime.toISOString(); // This will be in UTC

      console.log(`⏰ CRIANDO LEILÃO:`);
      console.log(`   Duração: ${formData.duration}s`);
      console.log(`   Termina (UTC): ${endTimeISO}`);
      
      const auctionData = {
        title: formData.title,
        description: formData.description,
        image_urls: finalImageUrls,
        starting_price: parseFloat(formData.starting_price),
        current_price: parseFloat(formData.starting_price),
        increment: parseFloat(formData.increment),
        buy_now_price: formData.buy_now_price ? parseFloat(formData.buy_now_price) : null,
        end_time: endTimeISO, // Salva em UTC
        category: formData.category,
        status: 'active',
        seller_id: formData.store_id || currentUser.id,
        seller_name: formData.store_id ? stores.find(s => s.id === formData.store_id)?.store_name : currentUser.full_name,
        source_url: formData.supplier_url || formData.source_url || null, // PRIORIZA supplier_url
        product_source: formData.product_source,
        supplier_logo_url: formData.supplier_logo_url || null, // SALVA LOGO
        comparai_mode: formData.comparai_mode || "google_shopping", // 🆕 SALVA MODO COMPARAI
        partner_store: formData.partner_store || 'nozap', // 🆕 MARCA PARCEIRO
        product_id: formData.product_id || null, // 🆕 VINCULA PRODUTO
        allowed_regions: formData.allowed_regions || [] // 🆕 SALVA REGIÕES PERMITIDAS
      };
      const newAuction = await Auction.create(auctionData);
      
      // 🆕 ATUALIZA PRODUTO COM ID DO LEILÃO
      if (formData.product_id) {
        try {
          const Product = base44.entities.Product;
          const products = await Product.filter({ id: formData.product_id });
          if (products.length > 0) {
            const product = products[0];
            const updatedAuctions = [...(product.linked_auctions || []), newAuction.id];
            await Product.update(formData.product_id, {
              linked_auctions: updatedAuctions
            });
          }
        } catch (error) {
          console.error("Erro ao vincular produto:", error);
        }
      }

      toast.success("✅ Leilão criado com sucesso!");
      
      setTimeout(() => {
        navigate(createPageUrl("AuctionRoom") + `?id=${newAuction.id}`);
      }, 1000);

    } catch (error) {
      console.error("Erro ao criar leilão:", error);
      toast.error("❌ Erro ao criar leilão. Verifique os campos e tente novamente: " + error.message);
    } finally {
      setIsSubmittingBid(false);
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

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 text-gray-300">
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
                            🌐 Buscar Produto na Internet (Apenas o Nome)
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
                                Buscando na internet...
                              </>
                            ) : (
                              <>
                                <Zap className="w-4 h-4 mr-2" />
                                🌐 Buscar na Internet
                              </>
                            )}
                          </Button>
                          
                          <div className="mt-3 p-2 bg-purple-900/30 rounded-lg border border-purple-700/50">
                            <p className="text-xs text-purple-300 flex items-center gap-2">
                              <span className="text-base">✨</span>
                              <span><strong>IA busca na internet:</strong> Digite apenas o nome do produto e a IA encontra dados e fotos automaticamente!</span>
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
                                  onClick={extractAllData} 
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
                                    ✨ A IA já sabe que vai extrair de <strong>{selectedMarketplace.name}</strong> e buscará dados específicos deste site!
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
                          {isSearchingName ? 'IA buscando produto na internet...' : isSearchingGtin ? 'Buscando produto por código de barras...' : 'Extraindo imagens e dados...'}
                        </p>
                      </div>
                    )}
                    
                    {/* ETAPA 3: INSERIR/CONFIRMAR URLs DAS IMAGENS */}
                    {manualStep === 3 && (
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

                    {/* ETAPA 4: PROCESSANDO IMAGENS */}
                    {manualStep === 4 && (
                      <div className="text-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-yellow-500" />
                        <p className="text-yellow-400">Baixando e enviando imagens, por favor, aguarde...</p>
                      </div>
                    )}

                    {/* ETAPA 5: ESCOLHER CAPA */}
                    {manualStep === 5 && downloadedImages.length > 0 && (
                      <div className="bg-green-900/30 p-4 rounded-lg border border-green-700">
                        <h4 className="font-bold text-green-300 mb-4 flex items-center gap-2">
                          <ImageIcon className="w-4 h-4" />
                          3️⃣ Escolha a imagem de capa:
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {downloadedImages.map((img, index) => (
                            <div
                              key={index}
                              className={`relative group cursor-pointer border-2 rounded-lg overflow-hidden transition-all duration-200 ${
                                  coverIndex === index ? 'border-green-500 ring-2 ring-green-500/30' : 'border-gray-700 hover:border-green-600'
                              }`}
                              onClick={() => selectCover(index)}
                            >
                              <div className="w-full h-24 bg-gray-900 flex items-center justify-center">
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
                                      e.stopPropagation(); // Impede que o clique selecione a imagem como capa
                                      const newImages = downloadedImages.filter((_, i) => i !== index);
                                      setDownloadedImages(newImages);

                                      if (newImages.length === 0) {
                                          setManualStep(3); // Volta para a etapa de URL se não sobrar nenhuma imagem
                                          return;
                                      }

                                      // Ajusta o índice da capa se necessário
                                      if (coverIndex === index) {
                                          // Se a capa foi removida, a primeira imagem restante se torna a capa
                                          setCoverIndex(0); 
                                      } else if (coverIndex > index) {
                                          // Se uma imagem antes da capa foi removida, decrementa o coverIndex
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
                                <div className="absolute inset-0 flex items-center justify-center bg-green-500/30 text-white font-bold pointer-events-none">
                                    CAPA
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ETAPA 6: APLICAR NO FORMULÁRIO */}
                    {manualStep === 6 && (
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
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 mt-1">
                          {formData.product_source === 'factory_new' 
                            ? '✅ Produto novo, lacrado, com garantia do fabricante' 
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
                      <div className="bg-gray-900/50 rounded-lg p-6 text-center text-gray-500 border border-gray-700 h-full">
                        {formData.image_urls.filter(url => url).length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {formData.image_urls.filter(url => url).map((url, index) => (
                              <div key={index} className="relative w-full h-24 bg-gray-800 rounded overflow-hidden flex items-center justify-center border border-gray-700">
                                <img 
                                  src={url} 
                                  alt={`Preview ${index + 1}`} 
                                  className="max-w-full max-h-full object-contain"
                                  crossOrigin="anonymous"
                                  loading="eager"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.parentElement.innerHTML = `<div class="text-xs text-gray-400">❌ Erro</div>`;
                                  }}
                                />
                                <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
                                  {index === 0 ? 'Capa' : index + 1}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full">
                            <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm"> As imagens aparecerão aqui </p>
                          </div>
                        )}
                      </div>
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