import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Zap, Image as ImageIcon, Link as LinkIcon, CheckCircle, AlertCircle, Sparkles, Copy } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function ImportadorSteps({
  manualStep,
  isSearchingName,
  isSearchingGtin,
  isLoadingAds,
  isProcessing,
  productName,
  setProductName,
  searchByName,
  gtinCode,
  setGtinCode,
  searchByGtin,
  productUrl,
  setProductUrl,
  selectedMarketplace,
  setSelectedMarketplace,
  onExtractUrl,
  productPreview,
  cancelPreview,
  confirmAndFetchImages,
  foundMlAd,
  setFoundMlAd,
  downloadImagesFromAd,
  downloadedImages,
  extractedData,
  extractedImageUrls,
  setExtractedImageUrls,
  setFormData,
  setManualStep,
  importedData,
  formData,
  coverIndex,
}) {

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

  return (
    <>
      {/* ETAPA 0: TABS PARA ESCOLHER MÉTODO */}
      {manualStep === 0 && (
        <Tabs defaultValue="nome" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-700/50">
            <TabsTrigger value="nome" className="data-[state=active]:bg-purple-600">🌐 Por Nome</TabsTrigger>
            <TabsTrigger value="gtin" className="data-[state=active]:bg-green-600">📷 Código Barras</TabsTrigger>
            <TabsTrigger value="url" className="data-[state=active]:bg-blue-600">🔗 Por URL</TabsTrigger>
          </TabsList>

          <TabsContent value="nome" className="mt-4">
            <div className="bg-purple-900/20 border-2 border-purple-500/50 rounded-xl p-4">
              <Label className="text-sm font-bold text-purple-300 flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4" /> 🌐 Buscar na Internet (Apenas o Nome)
              </Label>
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                onKeyPress={(e) => { if (e.key === 'Enter' && !isSearchingName && productName.trim()) searchByName(); }}
                placeholder="Ex: iPhone 15 Pro, Geladeira Samsung 500L..."
                className="mb-3 bg-gray-900 border-purple-600 text-gray-100 placeholder-gray-500 focus:border-purple-400"
                disabled={isSearchingName}
              />
              <Button onClick={searchByName} disabled={isSearchingName || !productName.trim()} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                {isSearchingName ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Buscando...</> : <><Zap className="w-4 h-4 mr-2" />🔍 Buscar e Importar</>}
              </Button>
              <div className="mt-3 p-2 bg-purple-900/30 rounded-lg border border-purple-700/50">
                <p className="text-xs text-purple-300">✨ IA busca o produto na internet e importa automaticamente!</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="gtin" className="mt-4">
            <div className="bg-green-900/20 border-2 border-green-500/50 rounded-xl p-4">
              <Label className="text-sm font-bold text-green-300 flex items-center gap-2 mb-2">
                <ImageIcon className="w-4 h-4" /> 🔍 Buscar por Código de Barras (GTIN/EAN)
              </Label>
              <div className="relative">
                <Input
                  value={gtinCode}
                  onChange={(e) => setGtinCode(e.target.value)}
                  onKeyPress={(e) => { if (e.key === 'Enter' && !isSearchingGtin && gtinCode.trim()) searchByGtin(); }}
                  placeholder="Digite ou use o leitor de código de barras"
                  className="mb-3 bg-gray-900 border-green-600 text-gray-100 placeholder-gray-500 focus:border-green-400 pr-10"
                  disabled={isSearchingGtin}
                  maxLength={14}
                  autoComplete="off"
                />
                <div className="absolute right-3 top-3 text-green-400">📷</div>
              </div>
              <Button onClick={searchByGtin} disabled={isSearchingGtin || !gtinCode.trim()} className="w-full bg-green-600 hover:bg-green-700 text-white">
                {isSearchingGtin ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Buscando...</> : <><Zap className="w-4 h-4 mr-2" />🔍 Buscar Produto</>}
              </Button>
              <div className="mt-3 p-2 bg-green-900/30 rounded-lg border border-green-700/50">
                <p className="text-xs text-green-300">✨ <strong>Leitor de código de barras:</strong> Clique no campo e use seu leitor!</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="url" className="mt-4">
            <div>
              <Label className="text-sm font-bold text-blue-300 mb-2 block">🔗 Selecione de qual site você vai importar:</Label>
              <Select
                value={selectedMarketplace?.id || ""}
                onValueChange={(value) => {
                  const selected = sites.find(s => s.id === value);
                  setSelectedMarketplace(selected || null);
                }}
              >
                <SelectTrigger className="bg-gray-900 border-blue-600 text-gray-100 mb-4">
                  <SelectValue placeholder="Escolha o site..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-gray-200">
                  {sites.map(s => <SelectItem key={s.id} value={s.id}>• {s.name}</SelectItem>)}
                </SelectContent>
              </Select>

              {selectedMarketplace && (
                <div>
                  <Label className="text-sm font-medium text-gray-400 mb-2 block">🔗 Cole o link do produto:</Label>
                  <Input
                    value={productUrl}
                    onChange={(e) => setProductUrl(e.target.value)}
                    placeholder={selectedMarketplace.placeholder}
                    className="mb-4 bg-gray-900 border-blue-600 text-gray-100 placeholder-gray-500 focus:border-blue-400"
                    disabled={isProcessing}
                  />
                  <Button
                    onClick={onExtractUrl}
                    disabled={isProcessing || !productUrl.trim()}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold"
                  >
                    {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Extraindo de {selectedMarketplace.name}...</> : <><Zap className="w-4 h-4 mr-2" />🤖 Extrair de {selectedMarketplace.name}</>}
                  </Button>
                  <div className="mt-3 p-2 bg-blue-900/30 rounded-lg border border-blue-500/30">
                    <p className="text-xs text-blue-300">
                      ✨ {selectedMarketplace.id === 'mercadolivre' ? 'Extração direta de imagens WebP em alta resolução!' : `A IA buscará dados específicos de ${selectedMarketplace.name}`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* ETAPA 1: PROCESSANDO */}
      {manualStep === 1 && (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-blue-400">
            {isSearchingName ? 'IA buscando produto na internet...' : isSearchingGtin ? 'Buscando produto por código de barras...' : 'Extraindo dados e URLs de imagens...'}
          </p>
        </div>
      )}

      {/* ETAPA 2: URLs EXTRAÍDAS */}
      {manualStep === 2 && (
        <div className="space-y-4">
          <div className="bg-green-900/30 p-4 rounded-lg border border-green-700">
            <h4 className="font-bold text-green-300 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> ✅ Dados Extraídos com Sucesso!
            </h4>
            <div className="space-y-2 text-sm bg-black/30 p-3 rounded">
              <div><span className="text-green-400 font-semibold">Título:</span> {extractedData.title}</div>
              <div><span className="text-green-400 font-semibold">Descrição:</span> {extractedData.description.substring(0, 100)}...</div>
            </div>
          </div>
          <div className="bg-blue-900/30 p-4 rounded-lg border border-blue-700">
            <h4 className="font-bold text-blue-300 mb-3 flex items-center gap-2">
              <LinkIcon className="w-4 h-4" /> 📸 URLs das Imagens Encontradas
            </h4>
            <div className="space-y-2 mb-4 max-h-[300px] overflow-y-auto">
              {extractedImageUrls.filter(u => u.trim()).map((url, index) => (
                <div key={index} className="bg-gray-800 rounded p-3 border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-blue-400">{index === 0 ? '🏆 CAPA' : `Imagem ${index + 1}`}</span>
                    <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(url); toast.success('✅ URL copiada!'); }} className="h-6 text-xs border-gray-600">
                      <Copy className="w-3 h-3 mr-1" />Copiar
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400 break-all font-mono bg-black/30 p-2 rounded">{url}</p>
                </div>
              ))}
            </div>
            <Button
              onClick={() => {
                const validUrls = extractedImageUrls.filter(u => u.trim());
                const finalImages = validUrls.slice(0, 5);
                while (finalImages.length < 5) finalImages.push("");
                setFormData(prev => ({ ...prev, title: extractedData.title, description: extractedData.description, image_urls: finalImages, source_url: productUrl }));
                setProductUrl("");
                setExtractedImageUrls(['', '', '', '', '', '']);
                setManualStep(0);
                toast.success(`✅ Produto + ${validUrls.length} URLs aplicados!`);
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
            >
              <CheckCircle className="w-4 h-4 mr-2" /> 🚀 Aplicar no Formulário
            </Button>
          </div>
        </div>
      )}

      {/* ETAPA 5: PREVIEW DAS IMAGENS - AUTO APPLY */}
      {manualStep === 5 && downloadedImages.length > 0 && (
        <div className="space-y-4">
          <div className="bg-green-900/30 p-4 rounded-lg border border-green-700">
            <h4 className="font-bold text-green-300 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> ✅ Produto Importado com Sucesso!
            </h4>
            <div className="space-y-2 text-sm bg-black/30 p-3 rounded">
              <div><span className="text-green-400 font-semibold">Título:</span> {importedData?.title || extractedData?.title || formData.title}</div>
              {importedData?.price && <div><span className="text-green-400 font-semibold">Preço:</span> R$ {importedData.price.toFixed(2)}</div>}
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <h4 className="font-bold text-white mb-3 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> 📸 Imagens ({downloadedImages.length})
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {downloadedImages.map((img, index) => (
                <div key={index} className="relative border-2 border-gray-700 rounded-lg overflow-hidden">
                  <div className="w-full h-32 bg-gray-900 flex items-center justify-center p-2">
                    <img src={img} alt={`Imagem ${index + 1}`} className="max-w-full max-h-full object-contain" loading="eager"
                      onError={(e) => { e.target.style.display = 'none'; if (e.target.parentElement) e.target.parentElement.innerHTML = `<div class="text-red-400 text-xs">❌ Erro ao carregar</div>`; }}
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
              <Loader2 className="w-4 h-4 animate-spin" /> Aplicando dados no formulário automaticamente...
            </p>
          </div>
        </div>
      )}

      {/* ETAPA 10: PRÉVIA DO PRODUTO */}
      {manualStep === 10 && productPreview && (
        <div className="space-y-4">
          <div className="bg-blue-900/30 border-2 border-blue-500 rounded-xl p-6">
            <h3 className="text-xl font-bold text-blue-300 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5" /> 🔍 Produto Encontrado
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
                <span className="text-blue-400 font-semibold">📸 Imagens disponíveis:</span>
                <span className="text-white font-bold">{productPreview.imageCount} fotos</span>
              </div>
            </div>
            <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-3 mb-4">
              <p className="text-yellow-300 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>⚠️ Buscar as imagens completas irá consumir <strong>1 crédito</strong> da API do Google Shopping</span>
              </p>
            </div>
            <div className="text-center mb-4">
              <p className="text-white font-bold text-lg">❓ Este é o produto correto?</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={cancelPreview} variant="outline" className="border-red-500 text-red-400 hover:bg-red-600 hover:text-white">
                ❌ Não, Buscar Novamente
              </Button>
              <Button onClick={confirmAndFetchImages} disabled={isLoadingAds} className="bg-green-600 hover:bg-green-700 text-white font-bold">
                {isLoadingAds ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Buscando...</> : <>✅ Sim, Confirmar</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ETAPA 13: LINK ÚNICO DO MERCADO LIVRE */}
      {manualStep === 13 && foundMlAd && (
        <div className="space-y-4">
          <div className="bg-blue-900/30 border-2 border-blue-500 rounded-xl p-6">
            <h3 className="text-xl font-bold text-blue-300 mb-2 flex items-center gap-2">
              <img src="https://http2.mlstatic.com/frontend-assets/ml-web-navigation/ui-navigation/5.21.22/mercadolibre/logo__small.png" alt="ML" className="w-6 h-6" />
              Anúncio Encontrado no Mercado Livre
            </h3>
            <p className="text-gray-400 text-sm mb-4">A IA encontrou o anúncio mais relevante para usar como base.</p>
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
              <a href={foundMlAd.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 mt-3 break-all">
                🔗 {foundMlAd.url}
              </a>
            </div>
            <div className="flex gap-3 pt-4">
              <Button onClick={() => { setFoundMlAd(null); setManualStep(10); }} variant="outline" className="flex-1 border-gray-500 text-gray-300 hover:bg-gray-700">
                ⬅️ Voltar
              </Button>
              <Button onClick={() => downloadImagesFromAd({ url: foundMlAd.url, source: foundMlAd.store, title: foundMlAd.title })} disabled={isLoadingAds} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold">
                {isLoadingAds ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Carregando...</> : <><ImageIcon className="w-4 h-4 mr-2" />Usar este anúncio</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}