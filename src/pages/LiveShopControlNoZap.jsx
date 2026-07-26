import React, { useState, useEffect } from "react";
import { fmtBR } from '@/lib/money';
import { base44 } from "@/api/base44Client";
import { Play, Square, Tv, Plus, Zap, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const LiveSession = base44.entities.LiveSession;
const Auction = base44.entities.Auction;

export default function LiveShopControlNoZap() {
  const [session, setSession] = useState(null);
  const [streamUrl, setStreamUrl] = useState("");
  const [frameType, setFrameType] = useState("horizontal");
  const [quality, setQuality] = useState("1080p");
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [frameImage, setFrameImage] = useState(null);
  const [pauseImage, setPauseImage] = useState(null);
  const [isUploadingFrame, setIsUploadingFrame] = useState(false);
  const [isUploadingPause, setIsUploadingPause] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickProduct, setQuickProduct] = useState({
    title: "",
    description: "",
    starting_price: "",
    increment: "",
    image_url: ""
  });
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const savedUserJSON = localStorage.getItem('currentUser');
      if (!savedUserJSON) {
        toast.error("Acesso negado");
        navigate(createPageUrl("Home"));
        return;
      }

      const user = JSON.parse(savedUserJSON);
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        toast.error("Apenas administradores podem acessar");
        navigate(createPageUrl("Home"));
        return;
      }
    };

    const loadSession = async () => {
      try {
        const sessions = await LiveSession.filter({ partner_store: 'nozap' }, "-created_date", 1);
        if (sessions.length > 0) {
          setSession(sessions[0]);
          setStreamUrl(sessions[0].stream_url || "");
          setFrameType(sessions[0].frame_type || "horizontal");
          setQuality(sessions[0].quality || "1080p");
          setFrameImage(sessions[0].frame_image_url || null);
          setPauseImage(sessions[0].pause_image_url || null);
        } else {
          const newSession = await LiveSession.create({
            partner_store: 'nozap',
            is_live: false,
            stream_url: "",
            frame_type: "horizontal",
            quality: "1080p"
          });
          setSession(newSession);
        }
      } catch (error) {
        console.error("Erro ao carregar sessão:", error);
      }
    };

    const loadProducts = async () => {
      try {
        const allProducts = await Auction.filter({ 
          partner_store: { $ne: 'sai_de_baixo' },
          status: 'active'
        }, "-created_date", 20);
        setProducts(allProducts);
      } catch (error) {
        console.error("Erro ao carregar produtos:", error);
      }
    };

    checkAuth();
    loadSession();
    loadProducts();
  }, [navigate]);

  const saveSettings = async () => {
    if (!session) return;

    try {
      await LiveSession.update(session.id, {
        stream_url: streamUrl,
        frame_type: frameType,
        quality: quality
      });

      toast.success("Configurações salvas!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configurações");
    }
  };

  const startLive = async () => {
    if (!streamUrl) {
      toast.error("Adicione a URL da transmissão primeiro!");
      return;
    }

    try {
      await LiveSession.update(session.id, {
        is_live: true,
        stream_url: streamUrl
      });

      setSession({ ...session, is_live: true });
      toast.success("Live iniciada! ");
    } catch (error) {
      console.error("Erro ao iniciar live:", error);
      toast.error("Erro ao iniciar live");
    }
  };

  const stopLive = async () => {
    try {
      await LiveSession.update(session.id, {
        is_live: false,
        is_paused: false,
        current_product_id: null
      });

      setSession({ ...session, is_live: false, is_paused: false });
      setSelectedProduct(null);
      toast.success("Live encerrada");
    } catch (error) {
      console.error("Erro ao encerrar live:", error);
      toast.error("Erro ao encerrar live");
    }
  };

  const pauseLive = async () => {
    try {
      await LiveSession.update(session.id, {
        is_paused: true
      });

      setSession({ ...session, is_paused: true });
      toast.success("Live pausada - Propaganda exibida");
    } catch (error) {
      console.error("Erro ao pausar live:", error);
      toast.error("Erro ao pausar live");
    }
  };

  const resumeLive = async () => {
    try {
      await LiveSession.update(session.id, {
        is_paused: false
      });

      setSession({ ...session, is_paused: false });
      toast.success("Live retomada!");
    } catch (error) {
      console.error("Erro ao retomar live:", error);
      toast.error("Erro ao retomar live");
    }
  };

  const handleFrameUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingFrame(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFrameImage(file_url);
      
      await LiveSession.update(session.id, {
        frame_image_url: file_url
      });

      toast.success("Moldura enviada!");
    } catch (error) {
      console.error("Erro ao enviar moldura:", error);
      toast.error("Erro ao enviar moldura");
    } finally {
      setIsUploadingFrame(false);
    }
  };

  const handlePauseImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingPause(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPauseImage(file_url);
      
      await LiveSession.update(session.id, {
        pause_image_url: file_url
      });

      toast.success("Imagem de pausa enviada!");
    } catch (error) {
      console.error("Erro ao enviar imagem:", error);
      toast.error("Erro ao enviar imagem");
    } finally {
      setIsUploadingPause(false);
    }
  };

  const startAuction = async (productId) => {
    try {
      await LiveSession.update(session.id, {
        current_product_id: productId
      });

      setSelectedProduct(productId);
      toast.success("Leilão iniciado na live!");
    } catch (error) {
      console.error("Erro ao iniciar leilão:", error);
      toast.error("Erro ao iniciar leilão");
    }
  };

  const handleQuickProductImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setQuickProduct({ ...quickProduct, image_url: file_url });
      toast.success("Imagem enviada!");
    } catch (error) {
      console.error("Erro ao enviar imagem:", error);
      toast.error("Erro ao enviar imagem");
    }
  };

  const createQuickProduct = async () => {
    if (!quickProduct.title || !quickProduct.starting_price) {
      toast.error("Preencha título e valor inicial!");
      return;
    }

    setIsCreatingProduct(true);
    try {
      const endTime = new Date();
      endTime.setHours(endTime.getHours() + 24);

      const startingPrice = parseFloat(quickProduct.starting_price);
      const increment = quickProduct.increment 
        ? parseFloat(quickProduct.increment) 
        : Math.max(1, startingPrice * 0.05);

      const newProduct = await Auction.create({
        title: quickProduct.title,
        description: quickProduct.description || quickProduct.title,
        starting_price: startingPrice,
        current_price: startingPrice,
        increment: increment,
        image_urls: quickProduct.image_url ? [quickProduct.image_url] : [],
        end_time: endTime.toISOString(),
        status: 'active',
        product_source: 'return_resale'
      });

      await startAuction(newProduct.id);
      
      toast.success("Produto criado e leilão iniciado!");
      setQuickProduct({ title: "", description: "", starting_price: "", increment: "", image_url: "" });
      setShowQuickCreate(false);
      
      const allProducts = await Auction.filter({ 
        partner_store: { $ne: 'sai_de_baixo' },
        status: 'active'
      }, "-created_date", 20);
      setProducts(allProducts);
    } catch (error) {
      console.error("Erro ao criar produto:", error);
      toast.error("Erro ao criar produto");
    } finally {
      setIsCreatingProduct(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Painel Live Shop NoZap</h1>
            <p className="text-gray-400">Controle sua transmissão e leilões ao vivo</p>
          </div>
          <Button onClick={() => navigate(createPageUrl("LiveShopNoZap"))} variant="outline" className="border-green-600 text-green-500 hover:bg-green-600 hover:text-white">
            Ver Live Shop
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          
          <Card className="bg-gray-800 border-gray-700 p-6">
            <h2 className="text-xl font-bold mb-6">Configurações da Transmissão</h2>
            
            <div className="space-y-6">
              <div className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
                
                {streamUrl && session?.is_live ? (
                  <>
                    {frameType === "vertical" && frameImage && (
                      <div 
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${frameImage})` }}
                      />
                    )}

                    <div className={`absolute inset-0 flex items-center justify-center ${
                      frameType === "vertical" ? "px-[20%]" : ""
                    }`}>
                      <iframe
                        src={streamUrl.includes('youtube.com') 
                          ? streamUrl.replace('watch?v=', 'embed/') 
                          : streamUrl}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>

                    {frameType !== "none" && (
                      <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-lg z-10">
                        <p className="text-white font-bold flex items-center gap-1.5">NoZap Live <Radio className="w-3.5 h-3.5 text-red-500" /></p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <div className="text-center">
                      <Tv className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-400">
                        {streamUrl ? "Clique em 'Iniciar Transmissão' para ver o preview" : "Adicione a URL da transmissão abaixo"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">URL da Transmissão</label>
                <Input
                  value={streamUrl}
                  onChange={(e) => setStreamUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="bg-gray-900 border-gray-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Tipo de Moldura</label>
                  <Select value={frameType} onValueChange={setFrameType}>
                    <SelectTrigger className="bg-gray-900 border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="horizontal">Horizontal</SelectItem>
                      <SelectItem value="vertical">Vertical</SelectItem>
                      <SelectItem value="none">Sem Moldura</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Qualidade</label>
                  <Select value={quality} onValueChange={setQuality}>
                    <SelectTrigger className="bg-gray-900 border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="720p">720p</SelectItem>
                      <SelectItem value="1080p">1080p</SelectItem>
                      <SelectItem value="4k">4K</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {frameType === "vertical" && (
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">
                    Moldura Personalizada
                  </label>
                  {frameImage ? (
                    <div className="relative rounded-lg overflow-hidden border-2 border-gray-700">
                      <img src={frameImage} alt="Moldura" className="w-full h-32 object-cover" />
                      <Button
                        onClick={() => setFrameImage(null)}
                        size="sm"
                        variant="destructive"
                        className="absolute top-2 right-2"
                      >
                        Remover
                      </Button>
                    </div>
                  ) : (
                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFrameUpload}
                        disabled={isUploadingFrame}
                        className="hidden"
                      />
                      <div className="w-full cursor-pointer border-2 border-dashed border-gray-700 rounded-lg p-4 hover:border-green-600 hover:bg-green-900/10 transition-colors text-center">
                        <Plus className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-400">
                          {isUploadingFrame ? "Enviando..." : "Adicionar Moldura"}
                        </p>
                      </div>
                    </label>
                  )}
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Propaganda para Pausas
                </label>
                {pauseImage ? (
                  <div className="relative rounded-lg overflow-hidden border-2 border-gray-700">
                    <img src={pauseImage} alt="Propaganda" className="w-full h-32 object-cover" />
                    <Button
                      onClick={() => setPauseImage(null)}
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2"
                    >
                      Remover
                    </Button>
                  </div>
                ) : (
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePauseImageUpload}
                      disabled={isUploadingPause}
                      className="hidden"
                    />
                    <div className="w-full cursor-pointer border-2 border-dashed border-gray-700 rounded-lg p-4 hover:border-green-600 hover:bg-green-900/10 transition-colors text-center">
                      <Plus className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-400">
                        {isUploadingPause ? "Enviando..." : "Adicionar Propaganda"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Exibida durante pausas
                      </p>
                    </div>
                  </label>
                )}
              </div>

              <div className="space-y-3 pt-4">
                {!session?.is_live ? (
                  <Button
                    onClick={startLive}
                    className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Iniciar Transmissão
                  </Button>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      {session?.is_paused ? (
                        <Button
                          onClick={resumeLive}
                          className="bg-green-600 hover:bg-green-700 py-4"
                        >
                          <Play className="w-5 h-5 mr-2" />
                          Retomar
                        </Button>
                      ) : (
                        <Button
                          onClick={pauseLive}
                          className="bg-yellow-600 hover:bg-yellow-700 py-4"
                        >
                          ⏸️ Pausar
                        </Button>
                      )}
                      <Button
                        onClick={stopLive}
                        className="bg-gray-700 hover:bg-gray-600 py-4"
                      >
                        <Square className="w-5 h-5 mr-2" />
                        Encerrar
                      </Button>
                    </div>
                  </>
                )}
              </div>

              <Button onClick={saveSettings} variant="outline" className="w-full border-gray-700 text-gray-300 hover:bg-gray-700">
                Salvar Configurações
              </Button>
            </div>
          </Card>

          <Card className="bg-gray-800 border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Gerenciar Produtos</h2>
              <Button
                onClick={() => setShowQuickCreate(!showQuickCreate)}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Rápido
              </Button>
            </div>

            {showQuickCreate && (
              <Card className="bg-gray-900 border-gray-700 p-4 mb-4">
                <h3 className="text-sm font-semibold mb-3 text-green-400">Criar Produto Rápido</h3>
                <div className="space-y-3">
                  <Input
                    placeholder="Título do produto"
                    value={quickProduct.title}
                    onChange={(e) => setQuickProduct({ ...quickProduct, title: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-sm"
                  />
                  <Textarea
                    placeholder="Descrição (opcional)"
                    value={quickProduct.description}
                    onChange={(e) => setQuickProduct({ ...quickProduct, description: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-sm h-16"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-gray-400 mb-1 block">Valor Inicial</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={quickProduct.starting_price}
                        onChange={(e) => setQuickProduct({ ...quickProduct, starting_price: e.target.value })}
                        className="bg-gray-800 border-gray-700 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-400 mb-1 block">Incremento</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Auto"
                        value={quickProduct.increment}
                        onChange={(e) => setQuickProduct({ ...quickProduct, increment: e.target.value })}
                        className="bg-gray-800 border-gray-700 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-400 mb-1 block">Imagem</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleQuickProductImage}
                      className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-green-600 file:text-white hover:file:bg-green-700 cursor-pointer"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={createQuickProduct}
                      disabled={isCreatingProduct}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-sm"
                    >
                      {isCreatingProduct ? "Criando..." : "Criar e Iniciar"}
                    </Button>
                    <Button
                      onClick={() => setShowQuickCreate(false)}
                      variant="outline"
                      className="border-gray-700 text-sm"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto pr-2">
              {products.map((product) => (
                <Card key={product.id} className="bg-gray-900 border-gray-700 p-4">
                  <div className="flex gap-3">
                    <img 
                      src={product.image_urls?.[0] || '/placeholder.jpg'} 
                      alt={product.title}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-white truncate">{product.title}</h3>
                      <p className="text-green-400 text-sm font-bold">R$ {fmtBR(product.current_price)}</p>
                      <Button
                        onClick={() => startAuction(product.id)}
                        disabled={selectedProduct === product.id}
                        size="sm"
                        className="mt-2 bg-green-600 hover:bg-green-700 text-xs"
                      >
                        {selectedProduct === product.id ? (
                          <><Zap className="w-3 h-3 mr-1" /> Em Leilão</>
                        ) : (
                          "Iniciar Leilão"
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}