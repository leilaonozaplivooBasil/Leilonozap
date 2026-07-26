import React, { useState } from "react";
import { fmtBR } from '@/lib/money';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Check, Image as ImageIcon } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function GoogleShoppingImporter({ onApply }) {
  const [productName, setProductName] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);

  const handleSearch = async () => {
    const name = productName.trim();
    if (name.length < 3) {
      toast.error("Digite pelo menos 3 caracteres");
      return;
    }

    setIsSearching(true);
    setResults(null);
    setSelectedImages([]);

    try {
      const response = await base44.functions.invoke("extractGoogleShoppingImages", {
        productName: name,
      });

      if (response?.data?.status === "success") {
        const data = response.data.data;
        setResults(data);
        // Pre-seleciona todas as imagens disponíveis (máx 5)
        setSelectedImages(data.products.slice(0, 5).map((p, i) => i));
        toast.success(` ${data.imageCount} imagens encontradas!`);
      } else {
        toast.error("Nenhuma imagem encontrada para este produto.");
      }
    } catch (error) {
      toast.error("Erro na busca: " + error.message);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleImage = (index) => {
    setSelectedImages((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : prev.length < 5
        ? [...prev, index]
        : prev
    );
  };

  const handleApply = () => {
    if (!results || selectedImages.length === 0) {
      toast.error("Selecione pelo menos 1 imagem");
      return;
    }

    const selected = selectedImages.sort().map((i) => results.products[i]);
    const imageUrls = selected.map((p) => p.imageUrl);

    // Ordena: capa = primeiro índice selecionado
    const finalImages = [...imageUrls];
    while (finalImages.length < 5) finalImages.push("");

    const bestTitle = results.products[selectedImages[0]]?.title || productName;

    onApply({
      title: bestTitle,
      description: bestTitle,
      image_urls: finalImages,
      starting_price: results.avgPrice ? (results.avgPrice * 0.8).toFixed(2) : "",
      market_price: results.avgPrice,
      source: "google_shopping",
      source_url: results.products[0]?.productUrl || "",
    });

    toast.success(` ${selectedImages.length} imagens aplicadas do Google Shopping!`);
    setResults(null);
    setProductName("");
    setSelectedImages([]);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
        <img
          src="https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png"
          alt="Google"
          className="w-7 h-7"
        />
        <div>
          <p className="text-sm font-bold text-blue-300">Importar do Google Shopping</p>
          <p className="text-xs text-gray-400">
            Digite o nome do produto → escolha as imagens
          </p>
        </div>
      </div>

      {/* Input + Botão */}
      <div className="flex gap-2">
        <Input
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && !isSearching && handleSearch()}
          placeholder="Ex: Notebook Lenovo IdeaPad Slim 3 i7"
          className="bg-gray-900 border-blue-600 text-gray-100 placeholder-gray-500 focus:border-blue-400"
          disabled={isSearching}
        />
        <Button
          onClick={handleSearch}
          disabled={isSearching || productName.trim().length < 3}
          className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
        >
          {isSearching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Resultados */}
      {results && (
        <div className="space-y-3">
          {/* Preço médio */}
          {results.avgPrice && (
            <div className="flex items-center gap-4 text-xs bg-gray-800 rounded-lg px-3 py-2 border border-gray-700">
              <span className="text-gray-400">
                Menor: <span className="text-red-400 font-bold">R$ {fmtBR(results.minPrice)}</span>
              </span>
              <span className="text-gray-400">
                Médio: <span className="text-emerald-400 font-bold">R$ {fmtBR(results.avgPrice)}</span>
              </span>
              <span className="text-gray-400">
                Maior: <span className="text-orange-400 font-bold">R$ {fmtBR(results.maxPrice)}</span>
              </span>
              <span className="text-gray-500 ml-auto">Preço inicial (-20%): <span className="text-sky-400 font-bold">R$ {fmtBR((results.avgPrice * 0.8))}</span></span>
            </div>
          )}

          {/* Grid de imagens */}
          <div>
            <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
              <ImageIcon className="w-3.5 h-3.5" />
              Selecione as imagens (máx. 5) — 1ª selecionada = Capa
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[280px] overflow-y-auto">
              {results.products.map((product, index) => {
                const isSelected = selectedImages.includes(index);
                const selOrder = selectedImages.indexOf(index);
                return (
                  <div
                    key={index}
                    onClick={() => toggleImage(index)}
                    className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                      isSelected
                        ? "border-emerald-500 opacity-100"
                        : "border-gray-700 opacity-60 hover:opacity-90"
                    }`}
                  >
                    <div className="w-full h-24 bg-gray-900 flex items-center justify-center p-1">
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                          e.target.parentElement.style.display = "none";
                        }}
                      />
                    </div>
                    {isSelected && (
                      <div className="absolute top-1 right-1 bg-emerald-500 rounded-full w-5 h-5 flex items-center justify-center text-white text-[10px] font-bold">
                        {selOrder === 0 ? <Star className="w-3 h-3" /> : selOrder + 1}
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5">
                      <p className="text-[9px] text-gray-300 truncate">{product.store}</p>
                      {product.price && (
                        <p className="text-[9px] text-emerald-400 font-bold">R$ {fmtBR(product.price)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botão aplicar */}
          <Button
            onClick={handleApply}
            disabled={selectedImages.length === 0}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            <Check className="w-4 h-4 mr-2" />
            Aplicar {selectedImages.length} imagem(ns) no Formulário
          </Button>
        </div>
      )}
    </div>
  );
}