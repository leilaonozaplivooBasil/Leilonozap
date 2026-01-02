import React, { useState, useCallback } from "react";
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
import { Upload, Image as ImageIcon, DollarSign, Link as LinkIcon, Loader2, Trash2, Zap, UploadCloud, AlertCircle } from "lucide-react";
import { createPageUrl } from "@/utils";
import { downloadImage } from "@/functions/downloadImage";
import { toast } from "sonner";
import { addSeconds } from 'date-fns';

const MASTER_ADMIN_EMAIL = 'luizsantanna@tttcorporate.com';

export default function CreateAuctionSaiDeBaixo() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image_urls: ["", "", "", "", ""],
    starting_price: "",
    increment: "10.00",
    buy_now_price: "",
    duration: "86400",
    category: "masculino",
    source_url: "",
    product_source: "return_resale",
    supplier_url: "",
    supplier_logo_url: "",
    comparai_mode: "google_shopping",
    partner_store: 'sai_de_baixo',
    store_id: ""
  });
  
  const [isSubmittingBid, setIsSubmittingBid] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stores, setStores] = useState([]);
  
  const [productUrl, setProductUrl] = useState("");
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
        console.error("Falha ao validar AppUser no DB.", e);
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
        setIsAdmin(true);
      } else {
        alert("Acesso negado. Apenas administradores podem criar leilões.");
        navigate(createPageUrl("SaiDeBaixo"));
      }
    } else {
      alert("Acesso negado. Você precisa estar logado como administrador.");
      navigate(createPageUrl("SaiDeBaixo"));
    }
  }, [navigate]);

  React.useEffect(() => {
    loadCurrentUser();
    loadStores();
  }, [loadCurrentUser]);

  const loadStores = async () => {
    try {
      const StoreEntity = base44.entities.Store;
      const allStores = await StoreEntity.filter({ status: 'active' });
      setStores(allStores);
    } catch (error) {
      console.error("Erro ao carregar lojistas:", error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const extractAllData = async () => {
    if (!productUrl) {
      alert("Cole a URL do produto primeiro!");
      return;
    }
    setIsProcessing(true);
    setManualStep(1);
    
    try {
      const { data: responseData, error } = await extractDataFromUrl({ productUrl });

      if (error || !responseData) {
          throw new Error(error?.message || "A função de extração falhou.");
      }
      
      const { title, description, imageUrls: extractedImageUrls } = responseData;
      
      setExtractedData({ title, description });
      setFormData(prev => ({ ...prev, title, description }));

      const finalUrls = [...(extractedImageUrls || [])];
      while (finalUrls.length < 6) {
        finalUrls.push("");
      }
      setImageUrls(finalUrls.slice(0, 6));
      
      setManualStep(3);

    } catch (error) {
      console.error("Erro ao extrair dados:", error);
      alert("Erro ao extrair dados: " + (error.message || "Verifique a URL e tente novamente."));
      setManualStep(0);
    }
    
    setIsProcessing(false);
  };
  
  const visualizeImages = async () => {
    const validUrls = imageUrls.filter(url => url && url.trim().startsWith('http'));
    
    if (validUrls.length === 0) {
      alert("Nenhuma URL válida para processar. Tente extrair novamente.");
      return;
    }

    setIsProcessing(true);
    setManualStep(4);
    const uploadedImages = [];
    const failedImages = [];

    for (const [index, url] of validUrls.entries()) {
      try {
        const downloadResponse = await downloadImage({ imageUrl: url });
        
        if (downloadResponse.data?.fallbackUrl && !downloadResponse.data?.success) {
          uploadedImages.push(url);
          continue;
        }
        
        if (downloadResponse.status !== 200 || !downloadResponse.data?.dataUrl) {
          throw new Error(downloadResponse.data?.error || 'Falha ao baixar imagem');
        }
        
        const fetchRes = await fetch(downloadResponse.data.dataUrl);
        const imageBlob = await fetchRes.blob();
        
        const fileName = `imported_${index + 1}.${imageBlob.type.split('/')[1] || 'jpg'}`;
        const file = new File([imageBlob], fileName, { type: imageBlob.type });

        const { UploadFile } = await import("@/integrations/Core");
        const uploadResult = await UploadFile({ file });
        
        if (!uploadResult?.file_url) {
          throw new Error("Falha no upload final");
        }
        
        uploadedImages.push(uploadResult.file_url);
        
      } catch (error) {
        failedImages.push({ url, error: error.message });
      }
    }

    setIsProcessing(false);

    if (uploadedImages.length === 0) {
      alert("❌ Nenhuma imagem foi processada. Tente URLs diferentes ou adicione manualmente.");
      setManualStep(3);
      return;
    }

    if (failedImages.length > 0) {
      const successCount = uploadedImages.length;
      const failCount = failedImages.length;
      alert(`⚠️ Processamento parcial:\n✅ ${successCount} imagens OK\n❌ ${failCount} falharam\n\nAs que funcionaram serão exibidas!`);
    } else {
      alert(`✅ Todas as ${uploadedImages.length} imagens foram processadas!`);
    }

    setDownloadedImages(uploadedImages);
    setCoverIndex(0);
    setManualStep(5);
  };

  const selectCover = (index) => {
    setCoverIndex(index);
    setManualStep(6);
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
      image_urls: finalImages,
      source_url: productUrl
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
    setImageUrls(["", "", "", "", "", ""]);
  };

  const handleSupplierLogoUpload = async (file) => {
    if (!file) return;
    
    setIsUploading(true);
    try {
      const { UploadFile } = await import("@/integrations/Core");
      const result = await UploadFile({ file });
      
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
        partner_store: 'sai_de_baixo'
      };
      const newAuction = await Auction.create(auctionData);

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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8 px-4 text-gray-900">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-xl bg-white border-2 border-red-600">
          <CardHeader className="text-center border-b-2 border-red-600 bg-gradient-to-r from-red-600 to-red-500">
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2 text-white">
              <Upload className="w-6 h-6" />
              Criar Novo Leilão - Sai de Baixo
            </CardTitle>
            <p className="text-red-100">Adicione produtos à loja Sai de Baixo</p>
          </CardHeader>

          <CardContent className="p-6 md:p-8">
            <Alert className="bg-red-50 border-red-300 mb-6">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <AlertTitle className="text-red-800 font-bold">Modo Sai de Baixo</AlertTitle>
              <AlertDescription className="text-red-700">
                Este leilão será criado exclusivamente para a página <strong>Sai de Baixo</strong>
              </AlertDescription>
            </Alert>

            <Card className="bg-red-50 border-2 border-red-300 mb-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                  <LinkIcon className="w-5 h-5" /> Importador Automático
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {manualStep === 0 && (
                  <div>
                    <Label htmlFor="productUrl" className="text-sm font-medium text-gray-700">
                      1️⃣ Cole o link do produto:
                    </Label>
                    <Input
                      id="productUrl"
                      value={productUrl}
                      onChange={(e) => setProductUrl(e.target.value)}
                      placeholder="https://www.mercadolivre.com.br/..."
                      className="mb-4 mt-1 bg-white border-red-300 text-gray-900 focus:border-red-600"
                      disabled={isProcessing}
                    />
                    <Button 
                      onClick={extractAllData} 
                      disabled={isProcessing || !productUrl.trim()}
                      className="w-full bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Extrair Dados do Produto
                    </Button>
                  </div>
                )}

                {manualStep === 1 && (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-red-600" />
                    <p className="text-red-700">Extraindo imagens e dados... Aguarde.</p>
                  </div>
                )}
                
                {manualStep === 3 && (
                  <div className="bg-red-50 p-4 rounded-lg border-2 border-red-300">
                    <h4 className="font-bold text-red-700 mb-4 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      2️⃣ Confira as imagens encontradas:
                    </h4>
                    {imageUrls.every(url => !url.trim()) && (
                      <p className="text-red-600 text-sm mb-4">Nenhuma URL de imagem encontrada. Por favor, insira manualmente.</p>
                    )}
                    {imageUrls.map((url, index) => (
                      <div key={index} className="mb-2 flex items-center gap-2">
                        <Label className="w-20 text-right text-gray-700">Imagem {index + 1}:</Label>
                        <Input
                          value={url}
                          onChange={(e) => {
                            const newUrls = [...imageUrls];
                            newUrls[index] = e.target.value;
                            setImageUrls(newUrls);
                          }}
                          placeholder="https://..."
                          className="flex-1 bg-white border-red-300 text-gray-900 focus:border-red-600"
                          disabled={isProcessing}
                        />
                        {url && (
                          <Trash2 
                            className="w-4 h-4 text-gray-500 cursor-pointer hover:text-red-600" 
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
                        onClick={handleClearAllImages}
                        disabled={isProcessing || imageUrls.every(url => !url.trim())}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Limpar
                      </Button>
                      <Button 
                        onClick={visualizeImages} 
                        disabled={isProcessing || imageUrls.every(url => !url.trim().startsWith('http'))} 
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                      >
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Processar Imagens
                      </Button>
                    </div>
                  </div>
                )}

                {manualStep === 4 && (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-red-600" />
                    <p className="text-red-700">Processando imagens...</p>
                  </div>
                )}

                {manualStep === 5 && downloadedImages.length > 0 && (
                  <div className="bg-red-50 p-4 rounded-lg border-2 border-red-300">
                    <h4 className="font-bold text-red-700 mb-4 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      3️⃣ Escolha a imagem de capa:
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {downloadedImages.map((img, index) => (
                        <div
                          key={index}
                          className={`relative group cursor-pointer border-2 rounded-lg overflow-hidden transition-all ${
                              coverIndex === index ? 'border-red-600 ring-2 ring-red-600/30' : 'border-gray-300 hover:border-red-500'
                          }`}
                          onClick={() => selectCover(index)}
                        >
                          <div className="w-full h-24 bg-white flex items-center justify-center">
                            <img src={img} alt={`Imagem ${index + 1}`} className="max-w-full max-h-full object-contain" />
                          </div>
                          
                          <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6 z-10 opacity-0 group-hover:opacity-100"
                              onClick={(e) => {
                                  e.stopPropagation();
                                  const newImages = downloadedImages.filter((_, i) => i !== index);
                                  setDownloadedImages(newImages);

                                  if (newImages.length === 0) {
                                      setManualStep(3);
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

                          <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full">
                            {index + 1}
                          </div>
                          {coverIndex === index && (
                            <div className="absolute inset-0 flex items-center justify-center bg-red-600/40 text-white font-bold">
                                CAPA
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {manualStep === 6 && (
                  <div className="bg-red-50 p-4 rounded-lg border-2 border-red-300 text-center">
                    <h4 className="font-bold text-red-700 mb-2 flex items-center justify-center gap-2">
                      <Upload className="w-4 h-4" />
                      4️⃣ Tudo pronto!
                    </h4>
                    <p className="mb-4 text-red-600">Capa selecionada: Imagem {coverIndex + 1}</p>
                    <Button onClick={applyToForm} className="w-full bg-red-600 hover:bg-red-700 text-white">
                      🚀 Aplicar no Formulário
                    </Button>
                  </div>
                )}

              </CardContent>
            </Card>

            <Card className="bg-red-50 border-2 border-red-300 mb-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between text-red-700">
                  <div className="flex items-center gap-2">
                    <UploadCloud className="w-5 h-5" />
                    Upload Manual de Imagens
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowManualUpload(!showManualUpload)}
                    className="text-red-600 hover:text-red-800"
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
                            ? 'border-red-500 bg-red-100 scale-105' 
                            : 'border-red-400 hover:bg-red-50'
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
                              const { UploadFile } = await import("@/integrations/Core");
                              const result = await UploadFile({ file });
                              
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
                          <Loader2 className="w-12 h-12 mx-auto mb-4 text-red-600 animate-spin" />
                        ) : (
                          <UploadCloud className={`w-12 h-12 mx-auto mb-4 transition-all ${
                            isDragging ? 'text-red-700 scale-110' : 'text-red-600'
                          }`} />
                        )}
                        
                        <h4 className="text-lg font-semibold text-red-700 mb-2">
                          {isUploading ? "Enviando imagens..." : isDragging ? "✨ Solte as imagens aqui" : "📸 Clique ou arraste imagens"}
                        </h4>
                        <p className="text-sm text-gray-600">
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
                              const { UploadFile } = await import("@/integrations/Core");
                              const result = await UploadFile({ file });
                              
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
                      <div className="bg-red-50 p-4 rounded-lg border-2 border-red-300">
                        <h4 className="font-bold text-red-700 mb-4 flex items-center gap-2">
                          <ImageIcon className="w-4 h-4" />
                          Escolha a imagem de capa:
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                          {manualUploadImages.map((img, index) => (
                            <div
                              key={index}
                              className={`relative group cursor-pointer border-2 rounded-lg overflow-hidden transition-all ${
                                manualCoverIndex === index ? 'border-red-600 ring-2 ring-red-600/30' : 'border-gray-300 hover:border-red-500'
                              }`}
                              onClick={() => setManualCoverIndex(index)}
                            >
                              <div className="w-full h-24 bg-white flex items-center justify-center">
                                <img src={img} alt={`Imagem ${index + 1}`} className="max-w-full max-h-full object-contain" />
                              </div>
                              
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-1 right-1 h-6 w-6 z-10 opacity-0 group-hover:opacity-100"
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
                              
                              <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full">
                                {index + 1}
                              </div>
                              {manualCoverIndex === index && (
                                <div className="absolute inset-0 flex items-center justify-center bg-red-600/40 text-white font-bold">
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
                          className="flex-1 border-gray-400 text-gray-700 hover:bg-gray-100"
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
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white"
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
                    <Label htmlFor="store_id" className="text-sm font-medium text-gray-700">
                      Selecionar Lojista *
                    </Label>
                    <Select value={formData.store_id} onValueChange={(value) => handleInputChange("store_id", value)}>
                      <SelectTrigger className="mt-1 bg-white border-red-300 text-gray-900">
                        <SelectValue placeholder="Selecione um lojista" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-red-300 text-gray-900">
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
                    <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                      Nome do Produto *
                    </Label>
                    <Input id="title" value={formData.title} onChange={(e) => handleInputChange("title", e.target.value)} required className="mt-1 bg-white border-red-300 text-gray-900 focus:border-red-600" />
                  </div>
                  <div>
                    <Label htmlFor="category" className="text-sm font-medium text-gray-700"> Categoria * </Label>
                    <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                      <SelectTrigger className="mt-1 bg-white border-red-300 text-gray-900"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white border-red-300 text-gray-900">
                        <SelectItem value="masculino">👔 Masculino</SelectItem>
                        <SelectItem value="feminino">👗 Feminino</SelectItem>
                        <SelectItem value="infantil">👶 Infantil</SelectItem>
                        <SelectItem value="calcados">👟 Calçados</SelectItem>
                        <SelectItem value="acessorios">⌚ Acessórios</SelectItem>
                        <SelectItem value="moda_intima">💝 Moda Íntima</SelectItem>
                        <SelectItem value="plus_size">💜 Plus Size</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="product_source" className="text-sm font-medium text-gray-700"> Origem do Produto * </Label>
                    <Select value={formData.product_source} onValueChange={(value) => {
                      handleInputChange("product_source", value);
                      if (value === 'return_resale') {
                        setFormData(prev => ({ ...prev, supplier_logo_url: "", comparai_mode: "google_shopping" }));
                        setSupplierLogoPreview("");
                      }
                    }}>
                      <SelectTrigger className="mt-1 bg-white border-red-300 text-gray-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-red-300 text-gray-900">
                        <SelectItem value="factory_new">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span>✨ Novo de Fábrica (com garantia)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="return_resale">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                            <span>🔥 Saldão/Devolução</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                      Descrição Detalhada *
                    </Label>
                    <Textarea id="description" value={formData.description} onChange={(e) => handleInputChange("description", e.target.value)} className="mt-1 min-h-[100px] bg-white border-red-300 text-gray-900 focus:border-red-600" required />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-gray-100 rounded-lg p-6 text-center border-2 border-red-300 h-full">
                    {formData.image_urls.filter(url => url).length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {formData.image_urls.filter(url => url).map((url, index) => (
                          <div key={index} className="relative w-full h-24 bg-white rounded overflow-hidden flex items-center justify-center border-2 border-red-200">
                            <img src={url} alt={`Preview ${index + 1}`} className="max-w-full max-h-full object-contain" />
                            <div className="absolute top-1 right-1 bg-red-600 text-white text-xs px-1 rounded">
                              {index === 0 ? 'Capa' : index + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <ImageIcon className="w-12 h-12 mx-auto mb-3 text-red-400 opacity-50" />
                        <p className="text-sm text-gray-600"> As imagens aparecerão aqui </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <Card className="bg-red-50 border-2 border-red-300">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                    <DollarSign className="w-5 h-5" /> Preços e Duração
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="starting_price" className="text-sm font-medium text-gray-700"> Preço Inicial (R$) * </Label>
                    <Input id="starting_price" type="number" step="0.01" value={formData.starting_price} onChange={(e) => handleInputChange("starting_price", e.target.value)} required className="mt-1 bg-white border-red-300 text-gray-900 focus:border-red-600" />
                  </div>
                  <div>
                    <Label htmlFor="increment" className="text-sm font-medium text-gray-700"> Incremento (R$) * </Label>
                    <Input id="increment" type="number" step="0.01" value={formData.increment} onChange={(e) => handleInputChange("increment", e.target.value)} required className="mt-1 bg-white border-red-300 text-gray-900 focus:border-red-600" />
                  </div>
                  <div>
                    <Label htmlFor="buy_now_price" className="text-sm font-medium text-gray-700"> Preço de Compra Rápida </Label>
                    <Input
                        id="buy_now_price"
                        type="number"
                        step="0.01"
                        value={formData.buy_now_price}
                        onChange={(e) => handleInputChange("buy_now_price", e.target.value)}
                        className="mt-1 bg-white border-red-300 text-gray-900 focus:border-red-600"
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration" className="text-sm font-medium text-gray-700"> Duração do Leilão </Label>
                    <Select value={formData.duration} onValueChange={(value) => handleInputChange("duration", value)} >
                      <SelectTrigger className="mt-1 bg-white border-red-300 text-gray-900"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white border-red-300 text-gray-900">
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
                <Button type="button" variant="outline" onClick={() => navigate(createPageUrl("SaiDeBaixo"))} className="flex-1 border-gray-400 text-gray-700 hover:bg-gray-100"> Cancelar </Button>
                <Button type="submit" disabled={isSubmittingBid || isUploading} className="flex-1 bg-red-600 hover:bg-red-700 text-white" >
                  {isSubmittingBid ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Criando... </>
                  ) : (
                    <><Upload className="w-4 h-4 mr-2" /> Criar Leilão </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}