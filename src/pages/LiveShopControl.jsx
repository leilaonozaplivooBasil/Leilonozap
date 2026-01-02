import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Video, Tv, Play, Square, Plus, Trash2, Check, Monitor, Smartphone, Zap, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LiveSession = base44.entities.LiveSession;
const Auction = base44.entities.Auction;

export default function LiveShopControl() {
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

  useEffect(() => {
    loadSession();
    loadProducts();
  }, []);

  const loadSession = async () => {
    try {
      const sessions = await LiveSession.filter({ partner_store: 'sai_de_baixo' }, "-created_date", 1);
      if (sessions.length > 0) {
        setSession(sessions[0]);
        setStreamUrl(sessions[0].stream_url || "");
        setFrameType(sessions[0].frame_type || "horizontal");
        setQuality(sessions[0].quality || "1080p");
        setFrameImage(sessions[0].frame_image_url || null);
        setPauseImage(sessions[0].pause_image_url || null);
      } else {
        const newSession = await LiveSession.create({
          partner_store: 'sai_de_baixo',
          is_live: false,
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
        partner_store: 'sai_de_baixo',
        status: 'active'
      }, "-created_date", 50);
      setProducts(allProducts);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
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

  const startLive = async () => {
    try {
      if (!streamUrl) {
        toast.error("Adicione a URL da transmissão!");
        return;
      }

      await LiveSession.update(session.id, {
        is_live: true,
        stream_url: streamUrl,
        frame_type: frameType,
        quality: quality,
        frame_image_url: frameImage
      });

      setSession({ ...session, is_live: true });
      toast.success("🔴 Live iniciada!");
    } catch (error) {
      console.error("Erro ao iniciar live:", error);
      toast.error("Erro ao iniciar live");
    }
  };

  const stopLive = async () => {
    try {
      await LiveSession.update(session.id, {
        is_live: false,
        current_product_id: null
      });

      setSession({ ...session, is_live: false });
      setSelectedProduct(null);
      toast.success("Live encerrada");
    } catch (error) {
      console.error("Erro ao parar live:", error);
      toast.error("Erro ao parar live");
    }
  };

  const addProductToLive = async (productId) => {
    try {
      await LiveSession.update(session.id, {
        current_product_id: productId
      });

      setSelectedProduct(productId);
      toast.success("Produto adicionado à live! 🎯");
    } catch (error) {
      console.error("Erro ao adicionar produto:", error);
      toast.error("Erro ao adicionar produto");
    }
  };

  const removeProductFromLive = async () => {
    try {
      await LiveSession.update(session.id, {
        current_product_id: null
      });

      setSelectedProduct(null);
      toast.success("Produto removido da live");
    } catch (error) {
      console.error("Erro ao remover produto:", error);
      toast.error("Erro ao remover produto");
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
        partner_store: 'sai_de_baixo',
        product_source: 'return_resale'
      });

      toast.success("Produto criado!");
      setQuickProduct({ title: "", description: "", starting_price: "", increment: "", image_url: "" });
      setShowQuickCreate(false);
      loadProducts();
    } catch (error) {
      console.error("Erro ao criar produto:", error);
      toast.error("Erro ao criar produto");
    } finally {
      setIsCreatingProduct(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Video className="w-8 h-8 text-red-600" />
            Controle da Live Shop
          </h1>
          <p className="text-gray-600 mt-2">Gerencie sua transmissão ao vivo e produtos</p>
        </div>

        <div className="grid lg:grid-cols-[2fr,1fr] gap-6">
          
          {/* Painel Principal */}
          <div className="space-y-6">
            
            {/* Preview da Transmissão */}
            <Card className="bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Preview da Transmissão</h2>
                {session?.is_live && (
                  <div className="flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    AO VIVO
                  </div>
                )}
              </div>

              {/* Área de Preview - SEMPRE 16:9 */}
              <div className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
                
                {streamUrl && session?.is_live ? (
                  <>
                    {/* Moldura de Fundo (quando vertical) */}
                    {frameType === "vertical" && frameImage && (
                      <div 
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${frameImage})` }}
                      />
                    )}

                    {/* Video Preview */}
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

                    {/* Logo Overlay */}
                    {frameType !== "none" && (
                      <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-lg z-10">
                        <p className="text-white font-bold">Sai de Baixo Live 🔴</p>
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
            </Card>

            {/* Configurações de Transmissão */}
            <Card className="bg-white p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Configurações</h2>
              
              <div className="space-y-4">
                {/* URL da Transmissão */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    URL da Transmissão (YouTube, Twitch, etc)
                  </label>
                  <Input
                    type="url"
                    value={streamUrl}
                    onChange={(e) => setStreamUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Cole aqui a URL da sua live no YouTube, Twitch ou OBS Studio
                  </p>
                </div>

                {/* Tipo de Moldura */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Formato da Gravação
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setFrameType("horizontal")}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        frameType === "horizontal"
                          ? "border-red-600 bg-red-50"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <Monitor className="w-6 h-6 mx-auto mb-2" />
                      <p className="text-xs font-medium">Horizontal</p>
                      <p className="text-xs text-gray-500">Tela cheia</p>
                    </button>
                    <button
                      onClick={() => setFrameType("vertical")}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        frameType === "vertical"
                          ? "border-purple-600 bg-purple-50"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <Smartphone className="w-6 h-6 mx-auto mb-2" />
                      <p className="text-xs font-medium">Vertical</p>
                      <p className="text-xs text-gray-500">Celular</p>
                    </button>
                    <button
                      onClick={() => setFrameType("none")}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        frameType === "none"
                          ? "border-gray-600 bg-gray-50"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <Tv className="w-6 h-6 mx-auto mb-2" />
                      <p className="text-xs font-medium">Sem Moldura</p>
                      <p className="text-xs text-gray-500">Limpo</p>
                    </button>
                  </div>
                </div>

                {/* Upload de Moldura (só para vertical) */}
                {frameType === "vertical" && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Moldura Personalizada (16:9)
                    </label>
                    <div className="space-y-3">
                      {frameImage && (
                        <div className="relative rounded-lg overflow-hidden border-2 border-gray-300">
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
                      )}
                      <div className="flex gap-2">
                        <label className="flex-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFrameUpload}
                            disabled={isUploadingFrame}
                            className="hidden"
                          />
                          <div className="w-full cursor-pointer border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-purple-600 hover:bg-purple-50 transition-colors text-center">
                            <Plus className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm text-gray-600">
                              {isUploadingFrame ? "Enviando..." : "Adicionar Moldura"}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              Formato 16:9 - preenche as laterais
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Qualidade */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Qualidade da Transmissão
                  </label>
                  <Select value={quality} onValueChange={setQuality}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="720p">HD - 720p (Rápido)</SelectItem>
                      <SelectItem value="1080p">Full HD - 1080p (Recomendado)</SelectItem>
                      <SelectItem value="4k">4K - Ultra HD (Melhor qualidade)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Imagem de Pausa */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Propaganda para Pausas
                  </label>
                  {pauseImage ? (
                    <div className="relative rounded-lg overflow-hidden border-2 border-gray-300">
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
                      <div className="w-full cursor-pointer border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-red-600 hover:bg-red-50 transition-colors text-center">
                        <Plus className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-600">
                          {isUploadingPause ? "Enviando..." : "Adicionar Propaganda"}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Exibida durante pausas
                        </p>
                      </div>
                    </label>
                  )}
                </div>

                {/* Botões de Controle */}
                <div className="space-y-3 pt-4">
                  {!session?.is_live ? (
                    <Button
                      onClick={startLive}
                      className="w-full bg-red-600 hover:bg-red-700 text-lg py-6"
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
                          className="bg-gray-800 hover:bg-gray-900 py-4"
                        >
                          <Square className="w-5 h-5 mr-2" />
                          Encerrar
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Painel Lateral - Produtos */}
          <div className="space-y-6">
            <Card className="bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Produtos Disponíveis
                </h2>
                <Button
                  onClick={() => setShowQuickCreate(!showQuickCreate)}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Novo
                </Button>
              </div>

              {/* Formulário Rápido */}
              {showQuickCreate && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-200 space-y-3">
                  <h3 className="font-bold text-sm text-gray-900">Adicionar Produto Rápido</h3>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Produto</label>
                    <Input
                      placeholder="Ex: Calça Feminina Pantalona"
                      value={quickProduct.title}
                      onChange={(e) => setQuickProduct({ ...quickProduct, title: e.target.value })}
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Descrição (opcional)</label>
                    <Textarea
                      placeholder="Detalhes do produto..."
                      value={quickProduct.description}
                      onChange={(e) => setQuickProduct({ ...quickProduct, description: e.target.value })}
                      className="text-sm h-20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">Valor Inicial</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={quickProduct.starting_price}
                        onChange={(e) => setQuickProduct({ ...quickProduct, starting_price: e.target.value })}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700 mb-1 block">Incremento</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Auto"
                        value={quickProduct.increment}
                        onChange={(e) => setQuickProduct({ ...quickProduct, increment: e.target.value })}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Imagem (opcional)</label>
                    {quickProduct.image_url ? (
                      <div className="relative">
                        <img src={quickProduct.image_url} alt="Preview" className="w-full h-24 object-cover rounded-lg" />
                        <Button
                          onClick={() => setQuickProduct({ ...quickProduct, image_url: "" })}
                          size="sm"
                          variant="destructive"
                          className="absolute top-1 right-1"
                        >
                          Remover
                        </Button>
                      </div>
                    ) : (
                      <label className="block">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleQuickProductImage}
                          className="hidden"
                        />
                        <div className="cursor-pointer border-2 border-dashed border-gray-300 rounded-lg p-3 hover:border-red-600 hover:bg-red-50 transition-colors text-center">
                          <Plus className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                          <p className="text-xs text-gray-600">Adicionar foto</p>
                        </div>
                      </label>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={createQuickProduct}
                      disabled={isCreatingProduct}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      <Zap className="w-4 h-4 mr-1" />
                      {isCreatingProduct ? "Criando..." : "Criar Produto"}
                    </Button>
                    <Button
                      onClick={() => setShowQuickCreate(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {selectedProduct && (
                <div className="mb-4 p-4 bg-green-50 border-2 border-green-600 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-green-800">🔴 Produto na Live</p>
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                  <Button
                    onClick={removeProductFromLive}
                    variant="outline"
                    size="sm"
                    className="w-full border-red-600 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Encerrar Leilão
                  </Button>
                </div>
              )}

              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {products.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Plus className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum produto disponível</p>
                    <p className="text-xs mt-1">Clique em "Novo" para adicionar</p>
                  </div>
                ) : (
                  products.map((product) => (
                    <div
                      key={product.id}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedProduct === product.id
                          ? "border-green-600 bg-green-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex gap-3">
                        {product.image_urls?.[0] ? (
                          <img
                            src={product.image_urls[0]}
                            alt={product.title}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                            <DollarSign className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm text-gray-900 line-clamp-2 mb-1">
                            {product.title}
                          </h3>
                          <p className="text-xs text-gray-600 font-bold">
                            R$ {product.current_price?.toFixed(2)}
                          </p>
                          {selectedProduct !== product.id && (
                            <Button
                              onClick={() => addProductToLive(product.id)}
                              size="sm"
                              className="mt-2 w-full bg-red-600 hover:bg-red-700 text-xs"
                              disabled={!session?.is_live}
                            >
                              <Play className="w-3 h-3 mr-1" />
                              Iniciar Leilão
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}