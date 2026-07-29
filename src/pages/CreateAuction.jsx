import React, { useState, useCallback, useEffect } from "react";
import { fmtBR } from '@/lib/money';
import CompareAquiIcon from '@/assets/compareaqui-icon.webp';
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

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, Image as ImageIcon, Link as LinkIcon, Loader2, Trash2, Zap, BeakerIcon, UploadCloud, Beaker, AlertCircle, Sparkles, CheckCircle, Copy, RefreshCw, ArrowLeft } from "lucide-react";
import { createPageUrl } from "@/utils";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AuctionTestLab from "../components/admin/AuctionTestLab";
import DescriptionWithAI from "../components/admin/DescriptionWithAI";
import RegioesSelect from "../components/admin/RegioesSelect"; import { toast } from "sonner"; import { convertToWebP } from "@/lib/convertToWebP";
import { addSeconds } from 'date-fns';
import ProductImagePreview from "../components/admin/ProductImagePreview";
import ConfirmProductDuplicationModal from "../components/admin/ConfirmProductDuplicationModal";
import ManualImageUpload from "../components/admin/ManualImageUpload";
import ValidationReportModal from "../components/admin/ValidationReportModal";
import GoogleShoppingImporter from "../components/admin/GoogleShoppingImporter";
import PriceSection from "../components/admin/PriceSection";

const withRetry = async (fn, max = 3) => {
  let err;
  for (let i = 1; i <= max; i++) {
    try { return await fn(); } catch (e) { err = e; if (i < max) await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i - 1))); }
  }
  throw err;
};

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
  const [importerActiveTab, setImporterActiveTab] = useState("nome"); // 🆕 controla qual aba do importador está ativa

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

    const urlParams = new URLSearchParams(window.location.search);

    // DETECTA PRODUTO VIA URL PARAMETER
    const productId = urlParams.get('product_id');
    if (productId) loadProductData(productId);

    // 🆕 DETECTA URL DO MERCADO LIVRE (vindo do GoogleShoppingModal via ?ml_url=)
    const mlUrl = urlParams.get('ml_url');
    if (mlUrl) {
      const decodedUrl = decodeURIComponent(mlUrl);
      console.log('🔗 [ML_URL] Detectada:', decodedUrl);
      setProductUrl(decodedUrl);
      setSelectedMarketplace({ id: 'mercadolivre', name: 'Mercado Livre', placeholder: 'https://produto.mercadolivre.com.br/...' });
      setImporterActiveTab("url"); // 🆕 força aba "Por URL"
      toast.info('🔗 URL do ML detectada! Extraindo dados...');
      setTimeout(async () => {
        setIsProcessing(true);
        setManualStep(1);
        try {
          console.log('🔍 [ML_URL] Tentando extractMLImages...');
          const mlResponse = await withRetry(() => base44.functions.invoke('extractMLImages', { productUrl: decodedUrl }));
          
          if (mlResponse?.data?.found && mlResponse.data.images?.length > 0) {
            // Sucesso direto via extractMLImages
            const data = { title: mlResponse.data.title || '', description: mlResponse.data.description || mlResponse.data.title || '', price: mlResponse.data.price || null, imageUrls: mlResponse.data.images };
            setExtractedData({ title: data.title, description: data.description });
            setFormData(prev => ({ ...prev, title: data.title.trim(), description: data.description, starting_price: data.price ? data.price.toString() : prev.starting_price, source_url: decodedUrl }));
            setDownloadedImages(data.imageUrls);
            setCoverIndex(0);
            setManualStep(5);
            toast.success(`✅ ${data.imageUrls.length} imagens importadas do ML!`);
          } else {
            // FALLBACK: ML bloqueou scraping direto
            // Extrai o título da URL do ML para buscar pelo nome
            console.log('⚠️ [ML_URL] Scraping direto bloqueado, extraindo título da URL...');
            
            // Extrai título legível da URL (ex: /notebook-lenovo-ideapad-slim-3-.../p/...)
            let productNameFromUrl = '';
            try {
              const urlPath = new URL(decodedUrl).pathname;
              // Pega a parte antes de /p/ ou /MLB
              const match = urlPath.match(/^\/([^/]+)/);
              if (match) {
                productNameFromUrl = match[1].replace(/-/g, ' ').substring(0, 80);
              }
            } catch(e) {}
            
            if (productNameFromUrl) {
              toast.info('🔄 Buscando pelo nome do produto...');
              console.log('🔍 [ML_URL] Buscando por nome:', productNameFromUrl);
              
              const nameResponse = await withRetry(() => base44.functions.invoke('searchProductByName', {
                productName: productNameFromUrl
              }));
              
              if (nameResponse?.data?.found && nameResponse.data.imageUrls?.length > 0) {
                const nd = nameResponse.data;
                setExtractedData({ title: nd.title || productNameFromUrl, description: nd.description || productNameFromUrl });
                setFormData(prev => ({ ...prev, title: (nd.title || productNameFromUrl).trim(), description: nd.description || productNameFromUrl, starting_price: nd.price ? nd.price.toString() : prev.starting_price, source_url: decodedUrl }));
                setDownloadedImages(nd.imageUrls);
                setCoverIndex(0);
                setManualStep(5);
                toast.success(`✅ ${nd.imageUrls.length} imagens importadas!`);
              } else {
                toast.warning('⚠️ Não foi possível extrair imagens automaticamente. Use o Upload Manual de Imagens.');
                setManualStep(0);
              }
            } else {
              toast.warning('⚠️ Não foi possível extrair imagens desta URL. Use o Upload Manual de Imagens.');
              setManualStep(0);
            }
          }
        } catch (err) {
          console.error('❌ [ML_URL] Erro:', err.message);
          toast.error('Erro ao extrair dados: ' + err.message);
          setManualStep(0);
        } finally {
          setIsProcessing(false);
        }
      }, 1500);
    }
  }, [loadCurrentUser]);

  const loadProductData = async (productId) => {
    try {
      const Product = base44.entities.Product;
      const products = await Product.filter({ id: productId });

      if (products.length > 0) {
        const product = products[0];

        // 1. Aplica dados básicos do produto
        const productImages = (product.image_urls || []).filter(u => u && u.trim());
        const finalImages = [...productImages.slice(0, 5)];
        while (finalImages.length < 5) finalImages.push("");

        setFormData(prev => ({
          ...prev,
          title: product.description,
          description: product.description + (product.notes ? `\n\n${product.notes}` : ''),
          starting_price: product.selling_price_retail ? Number(product.selling_price_retail).toFixed(2) : '',
          product_id: product.id,
          source_url: product.source_url || '',
          image_urls: productImages.length > 0 ? finalImages : prev.image_urls
        }));
        if (!product.selling_price_retail || Number(product.selling_price_retail) <= 0) {
          toast.warning('⚠️ Produto sem preço — rode a precificação no estoque antes de publicar no leilão.');
        }

        // 2. Se já tem imagens no estoque → aplica direto
        if (productImages.length > 0) {
          setDownloadedImages(productImages);
          setCoverIndex(0);
          setManualStep(5);
          toast.success(`✅ ${productImages.length} imagens carregadas do estoque!`);
          return;
        }

        // 3. Se tem source_url do ML → tenta extrair imagens
        const sourceUrl = product.source_url || '';
        const isMlUrl = sourceUrl.includes('mercadolivre.com') || sourceUrl.includes('mercadolibre.com');

        const autoSearchByGoogleShopping = async (productDescription) => {
          toast.info('🔎 Buscando imagens no Google Shopping automaticamente...');
          setIsProcessing(true);
          setManualStep(1);
          try {
            const gsResponse = await base44.functions.invoke('extractGoogleShoppingImages', {
              productName: productDescription
            });
            const gsData = gsResponse?.data?.data;
            if (gsData?.products?.length > 0) {
              const imgs = gsData.products.slice(0, 5).map(p => p.imageUrl).filter(Boolean);
              if (imgs.length > 0) {
                const finalImgs = [...imgs];
                while (finalImgs.length < 5) finalImgs.push("");
                setFormData(prev => ({ ...prev, image_urls: finalImgs }));
                setDownloadedImages(imgs);
                setCoverIndex(0);
                setManualStep(5);
                toast.success(`✅ ${imgs.length} imagens encontradas no Google Shopping!`);
                return;
              }
            }
            // Sem resultado
            setManualStep(0);
            toast.warning('⚠️ Nenhuma imagem encontrada automaticamente. Use o importador manual.');
          } catch (err) {
            console.error('❌ Erro Google Shopping automático:', err);
            setManualStep(0);
            toast.warning('⚠️ Não foi possível buscar imagens. Use o importador manual.');
          } finally {
            setIsProcessing(false);
          }
        };

        if (isMlUrl) {
          setProductUrl(sourceUrl);
          toast.info('🔗 Produto tem link do ML! Extraindo imagens automaticamente...');
          setTimeout(async () => {
            setIsProcessing(true);
            setManualStep(1);
            try {
              const mlResponse = await withRetry(() => base44.functions.invoke('extractMLImages', {
                productUrl: sourceUrl
              }));

              if (mlResponse?.data?.found && mlResponse.data.images?.length > 0) {
                const imgs = mlResponse.data.images;
                const finalImgs = imgs.slice(0, 5);
                while (finalImgs.length < 5) finalImgs.push("");

                setFormData(prev => ({
                  ...prev,
                  image_urls: finalImgs,
                  title: mlResponse.data.title?.trim() || prev.title,
                  description: mlResponse.data.description || prev.description,
                  source_url: sourceUrl
                }));
                setDownloadedImages(imgs);
                setCoverIndex(0);
                setExtractedData({ title: mlResponse.data.title || '', description: mlResponse.data.description || '' });
                setManualStep(5);
                toast.success(`✅ ${imgs.length} imagens extraídas do Mercado Livre!`);
              } else {
                // ML bloqueou → fallback automático Google Shopping
                setIsProcessing(false);
                setManualStep(0);
                await autoSearchByGoogleShopping(product.description);
              }
            } catch (err) {
              console.error('❌ Erro ao extrair ML automático:', err);
              setIsProcessing(false);
              setManualStep(0);
              await autoSearchByGoogleShopping(product.description);
            } finally {
              setIsProcessing(false);
            }
          }, 1000);
        } else {
          // Sem URL do ML → busca automática direta no Google Shopping
          setTimeout(() => autoSearchByGoogleShopping(product.description), 800);
        }
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



  // 🆕 AUTO-APPLY QUANDO IMAGENS SÃO CARREGADAS
  useEffect(() => {
    if (manualStep === 5 && downloadedImages.length > 0) {
      const timer = setTimeout(applyToForm, 1000);
      return () => clearTimeout(timer);
    }
  }, [manualStep, downloadedImages.length]);



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

      const response = await withRetry(() => base44.functions.invoke('searchProductByName', {
        productName: productName.trim()
      }));

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
      const response = await withRetry(() => base44.functions.invoke('searchProductByGTIN', {
        gtin: gtinCode.trim()
      }));

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
      title: (importedData?.title || extractedData?.title || prev.title || '').toString(),
      description: (importedData?.description || extractedData?.description || prev.description || ''),
      image_urls: finalImages,
      // Mantém source_url já salvo pelo fluxo ml_url (não sobrescreve com string vazia)
      source_url: productUrl || prev.source_url || ''
    }));

    setManualStep(0);
    setProductUrl("");
    setImageUrls(["", "", "", "", "", ""]);
    setDownloadedImages([]);
    setExtractedData({ title: "", description: "" });
    setCoverIndex(0);

    toast.success("✅ Dados aplicados!");
  };

  // HANDLER PARA UPLOAD DE LOGO
  const handleSupplierLogoUpload = async (file) => {
    if (!file) return;

    setIsUploading(true);
    try {
      const wfLogo = await convertToWebP(file); const result = await base44.integrations.Core.UploadFile({ file: wfLogo });

      if (result?.file_url) {
        setFormData(prev => ({ ...prev, supplier_logo_url: result.file_url }));
        setSupplierLogoPreview(result.file_url);
        toast.success("✅ Logo enviada!");
      } else {
        throw new Error("Falha ao receber URL da logo.");
      }
    } catch (error) {
      console.error("Erro ao enviar logo:", error);
      toast.error("❌ Erro ao enviar logo: " + (error.message || "Erro desconhecido."));
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmDuplication = async ({ includeAuction, includeCatalog, catalogPrice }) => {
    setIsSubmittingBid(true);

    try {
      const finalImageUrls = formData.image_urls.filter(url => url && url.trim() !== "");
      const Product = base44.entities.Product;
      let createdAuction = null;
      // Preço da Loja Virtual = valor digitado pelo admin (já com −20% do mercado real).
      // Sem esse preço, NÃO publicamos nem no leilão nem no catálogo — não há fallback automático.
      const lojaVirtual = parseFloat(formData.starting_price) || 0;

      // 1. Criar no Leilão
      if (includeAuction) {
        const now = new Date();
        const endTime = addSeconds(now, parseInt(formData.duration, 10));
        const endTimeISO = endTime.toISOString();

        // Regra de negócio:
        // starting_price = preço da Loja Virtual (valor digitado pelo admin, já com −20% do mercado real)
        // Mercado real = starting_price ÷ 0.80
        // Loja Virtual = starting_price (o próprio valor)
        // Lance inicial = starting_price × 0.80 (−20% da loja)
        // Arremate Agora = preço da Loja Virtual
        if (lojaVirtual <= 0) {
          toast.error('❌ Preço da Loja Virtual inválido. Defina um preço de mercado válido (ou rode a precificação no estoque) antes de publicar o leilão.');
          setIsSubmittingBid(false);
          setShowConfirmModal(false);
          return;
        }
        const finalCatalogPriceForAuction = catalogPrice || lojaVirtual;
        const auctionStartingPrice = parseFloat((lojaVirtual * 0.80).toFixed(2));
        const auctionBuyNowPrice = parseFloat(finalCatalogPriceForAuction.toFixed(2));

        const auctionData = {
          title: formData.title,
          description: formData.description,
          image_urls: finalImageUrls,
          starting_price: auctionStartingPrice,
          current_price: auctionStartingPrice,
          increment: parseFloat(formData.increment),
          buy_now_price: auctionBuyNowPrice,
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
        createdAuction = await Auction.create(auctionData);

        // Se veio de um produto do estoque, vincula o leilão ao produto
        if (formData.product_id && createdAuction?.id) {
          try {
            const existingProducts = await Product.filter({ id: formData.product_id });
            if (existingProducts.length > 0) {
              const existingLinked = existingProducts[0].linked_auctions || [];
              await Product.update(formData.product_id, {
                linked_auctions: [...existingLinked, createdAuction.id]
              });
            }
          } catch (e) {
            console.warn('Não foi possível vincular leilão ao produto:', e.message);
          }
        }
      }

      // 2. Publicar na Loja Virtual
      if (includeCatalog) {
        // Preço do catálogo = catalogPrice explícito OU preço da Loja Virtual (starting_price).
        // Sem mercado real (catalogPrice vazio E lojaVirtual <= 0) → NÃO ativa, avisa o admin.
        const finalCatalogPrice = catalogPrice || (lojaVirtual > 0 ? lojaVirtual : 0);
        if (!finalCatalogPrice || finalCatalogPrice <= 0) {
          toast.error('❌ Sem preço de mercado para publicar na Loja Virtual. Precifique o produto no estoque antes de ativar no catálogo.');
          setIsSubmittingBid(false);
          setShowConfirmModal(false);
          return;
        }

        if (formData.product_id) {
          // Produto já existe no estoque → atualiza com catalog_active
          await Product.update(formData.product_id, {
            catalog_active: true,
            price_catalog: finalCatalogPrice,
            selling_price_wholesale: finalCatalogPrice,
            image_urls: finalImageUrls.length > 0 ? finalImageUrls : undefined,
          });
        } else {
          // Produto novo → cria no estoque com catalog_active
          await Product.create({
            description: formData.title,
            notes: formData.description,
            image_urls: finalImageUrls,
            cost_price: 0,
            price_catalog: finalCatalogPrice,
            selling_price_wholesale: finalCatalogPrice,
            quantity: 1,
            catalog_active: true,
          });
        }
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

    if (!currentUser || currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
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



  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 text-gray-300">
      <ValidationReportModal validationReport={validationReport} onClose={() => setValidationReport(null)} />

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
          <CardHeader className="border-b border-gray-700">
            {urlParams.get('product_id') && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="mb-2 text-gray-400 hover:text-white w-fit"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Estoque
              </Button>
            )}
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2 text-white">
              <Upload className="w-6 h-6" />
              Criar Novo Leilão
            </CardTitle>
            <p className="text-gray-400 text-center">Importador de produtos com 1 clique!</p>
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
                          <strong>Stack:</strong><br />
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

                    {/* IMPORTADOR ÚNICO: MERCADO LIVRE */}
                    {manualStep === 0 && (
                      <div className="space-y-3">
                        {/* HEADER COM LOGO ML */}
                        <div className="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                          <img
                            src="https://http2.mlstatic.com/frontend-assets/ml-web-navigation/ui-navigation/5.21.22/mercadolibre/logo__small.png"
                            alt="Mercado Livre"
                            className="w-8 h-8 rounded"
                          />
                          <div>
                            <p className="text-sm font-bold text-yellow-300">Importar do Mercado Livre</p>
                            <p className="text-xs text-gray-400">Cole o link do produto e extraímos tudo automaticamente</p>
                          </div>
                        </div>

                        <Input
                          value={productUrl}
                          onChange={(e) => setProductUrl(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && productUrl.trim()) {
                              const isML = productUrl.trim().includes('mercadolivre.com') || productUrl.trim().includes('mercadolibre.com');
                              if (!isML) {
                                toast.error('⚠️ Cole um link válido do Mercado Livre');
                                return;
                              }
                              document.getElementById('btn-importar-ml')?.click();
                            }
                          }}
                          placeholder="https://www.mercadolivre.com.br/produto/..."
                          className="bg-gray-900 border-yellow-600 text-gray-100 placeholder-gray-500 focus:border-yellow-400 text-sm"
                          disabled={isProcessing}
                        />

                        <Button
                          id="btn-importar-ml"
                          onClick={async (e) => {
                            e.preventDefault();
                            if (isProcessing) return;

                            const url = productUrl.trim();
                            const isML = url.includes('mercadolivre.com') || url.includes('mercadolibre.com');
                            if (!isML) {
                              toast.error('⚠️ Cole um link válido do Mercado Livre');
                              return;
                            }

                            setIsProcessing(true);
                            setManualStep(1);
                            try {
                              const mlResponse = await withRetry(() => base44.functions.invoke('extractMLImages', {
                                productUrl: url
                              }));

                              if (mlResponse?.data?.found && mlResponse.data.images?.length > 0) {
                                const data = {
                                  title: mlResponse.data.title || '',
                                  description: mlResponse.data.description || mlResponse.data.title || '',
                                  price: mlResponse.data.price || null,
                                  imageUrls: mlResponse.data.images
                                };

                                // Aplica TUDO de uma vez no formData
                                const finalImages = data.imageUrls.slice(0, 5);
                                while (finalImages.length < 5) finalImages.push("");

                                setFormData(prev => ({
                                  ...prev,
                                  title: data.title.trim(),
                                  description: data.description,
                                  starting_price: data.price ? data.price.toString() : prev.starting_price,
                                  source_url: url,
                                  image_urls: finalImages
                                }));
                                setDownloadedImages(data.imageUrls);
                                setCoverIndex(0);
                                setExtractedData({ title: data.title, description: data.description });
                                setManualStep(5);
                                toast.success(`✅ ${data.imageUrls.length} imagens importadas do ML!`);
                              } else {
                                throw new Error('Nenhuma imagem encontrada. Verifique o link ou use Upload Manual.');
                              }
                            } catch (error) {
                              console.error('❌ Erro importação ML:', error);
                              toast.error(error.message || 'Erro ao importar. Tente novamente.');
                              setManualStep(0);
                              setSelectedMarketplace(null);
                              setProductUrl('');
                            } finally {
                              setIsProcessing(false);
                            }
                          }}
                          disabled={isProcessing || !productUrl.trim()}
                          className="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white font-bold text-sm h-11"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Extraindo dados e imagens...
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4 mr-2" />
                              🤖 Importar do Mercado Livre
                            </>
                          )}
                        </Button>

                        <p className="text-xs text-gray-500 text-center">
                          ✨ Extrai título, descrição, preço e imagens em alta resolução (WebP)
                        </p>
                      </div>
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
                              <span className="text-green-400 font-bold">R$ {fmtBR(foundMlAd.price)}</span>
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
                                <span className="text-green-400 font-bold">R$ {fmtBR(productPreview.price)}</span>
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

                    {/* 🆕 ETAPA 5: PREVIEW DAS IMAGENS IMPORTADAS - AUTO APPLY */}
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
                              <div><span className="text-green-400 font-semibold">Preço:</span> R$ {fmtBR(importedData.price)}</div>
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

                        <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-600 text-center">
                          <p className="text-sm text-blue-300 flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Aplicando dados no formulário automaticamente...
                          </p>
                        </div>
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

                                    {/* Etapa 3 legada removida */}



                  </CardContent>
                </Card>

                {/* IMPORTADOR GOOGLE SHOPPING */}
                <Card className="bg-gray-800 border border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-blue-400">
                      🔎 Importar do Google Shopping
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <GoogleShoppingImporter
                      onApply={(data) => {
                        const finalImages = [...data.image_urls].slice(0, 5);
                        while (finalImages.length < 5) finalImages.push("");
                        setFormData(prev => ({
                          ...prev,
                          title: data.title || prev.title,
                          description: data.description || prev.description,
                          image_urls: finalImages,
                          starting_price: data.starting_price || prev.starting_price,
                          source_url: data.source_url || prev.source_url,
                        }));
                        toast.success("✅ Dados do Google Shopping aplicados!");
                      }}
                    />
                  </CardContent>
                </Card>

                <ManualImageUpload onApply={(urls) => setFormData(prev => ({ ...prev, image_urls: urls }))} />

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
                      <RegioesSelect
                        value={formData.allowed_regions}
                        onChange={(v) => handleInputChange("allowed_regions", v)}
                      />

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
                          🔍 Onde o CompareAQUI vai buscar o preço?
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
                                <span>🔎 Usar CompareAQUI (página de arremate)</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 mt-1">
                          {formData.comparai_mode === 'supplier'
                            ? '🏭 O CompareAQUI buscará o preço diretamente no site do fornecedor (precisa inserir URL abaixo)'
                            : '🔎 Mesma comparação usada nos produtos de arremate'}
                        </p>
                      </div>

                      {/* URL DO FORNECEDOR (SÓ APARECE SE comparai_mode === 'supplier') */}
                      {formData.comparai_mode === 'supplier' && (
                        <div className="bg-green-900/20 border-2 border-green-500/50 rounded-xl p-4 space-y-4">
                          <div>
                            <Label htmlFor="supplier_url" className="text-sm font-bold text-green-300 flex items-center gap-2 mb-2">
                              <LinkIcon className="w-4 h-4" />
                              🏭 URL do Fornecedor (para o CompareAQUI) *
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
                                src={CompareAquiIcon}
                                alt="CompareAQUI"
                                className="w-4 h-4 rounded-full"
                              />
                              <span>O CompareAQUI usará esta URL para buscar o preço oficial do fornecedor!</span>
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
                              Esta logo aparecerá no card "Preço no Fabricante" do CompareAQUI
                            </p>
                          </div>
                        </div>
                      )}

                      <DescriptionWithAI value={formData.description} onChange={(val) => handleInputChange("description", val)} title={formData.title} />
                    </div>
                    <div className="space-y-4">
                      <ProductImagePreview imageUrls={formData.image_urls} />
                    </div>
                  </div>
                  <PriceSection formData={formData} onInputChange={handleInputChange} />
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
              <TabsContent value="lab">
                <AuctionTestLab />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}