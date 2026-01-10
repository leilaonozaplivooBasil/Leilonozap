import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Plus } from "lucide-react";

const Product = base44.entities.Product;
const Auction = base44.entities.Auction;

export default function EditCatalogProduct() {
  const navigate = useNavigate();
  const location = useLocation();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showCreateAuctionModal, setShowCreateAuctionModal] = useState(false);
  const [linkedAuctions, setLinkedAuctions] = useState([]);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const params = new URLSearchParams(location.search);
        const productId = params.get("id");

        if (!productId) {
          navigate(createPageUrl("Catalog"));
          return;
        }

        const products = await Product.filter({ id: productId });
        if (products && products.length > 0) {
          const prod = products[0];
          setProduct(prod);

          // Carrega leilões vinculados
          if (prod.linked_auctions && prod.linked_auctions.length > 0) {
            const auctions = await Promise.all(
              prod.linked_auctions.map(id => Auction.filter({ id }))
            );
            setLinkedAuctions(auctions.flat().filter(a => a));
          }
        }
      } catch (error) {
        console.error("Erro ao carregar produto:", error);
        alert("Erro ao carregar produto");
        navigate(createPageUrl("Catalog"));
      } finally {
        setIsLoading(false);
      }
    };

    loadProduct();
  }, [location.search, navigate]);

  const handleInputChange = (field, value) => {
    setProduct(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await Product.update(product.id, product);
      alert("✅ Produto atualizado com sucesso!");
      navigate(createPageUrl("Catalog"));
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("❌ Erro ao salvar produto");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddImageUrl = () => {
    const newUrl = prompt("Insira a URL da imagem:");
    if (newUrl) {
      setProduct(prev => ({
        ...prev,
        image_urls: [...(prev.image_urls || []), newUrl]
      }));
    }
  };

  const handleRemoveImage = (index) => {
    setProduct(prev => ({
      ...prev,
      image_urls: prev.image_urls.filter((_, i) => i !== index)
    }));
  };

  if (isLoading) {
    return (
      <div className="bg-gray-900 min-h-screen flex items-center justify-center text-white">
        <p>Carregando...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="bg-gray-900 min-h-screen flex items-center justify-center text-white">
        <p>Produto não encontrado</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(createPageUrl("Catalog"))}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <h1 className="text-3xl font-bold text-white">Editar Produto</h1>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700 text-white font-bold flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </div>

        {/* Informações Básicas */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">Descrição</label>
              <textarea
                value={product.description || ""}
                onChange={(e) => handleInputChange("description", e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-3 focus:border-green-500 focus:outline-none"
                rows="3"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm font-semibold mb-2">Preço de Custo</label>
                <input
                  type="number"
                  value={product.cost_price || ""}
                  onChange={(e) => handleInputChange("cost_price", parseFloat(e.target.value))}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2 focus:border-green-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-semibold mb-2">Preço Catálogo</label>
                <input
                  type="number"
                  value={product.price_catalog || ""}
                  onChange={(e) => handleInputChange("price_catalog", parseFloat(e.target.value))}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2 focus:border-green-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm font-semibold mb-2">Quantidade</label>
                <input
                  type="number"
                  value={product.quantity || ""}
                  onChange={(e) => handleInputChange("quantity", parseFloat(e.target.value))}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2 focus:border-green-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-semibold mb-2">Status</label>
                <select
                  value={product.status || "ESTOQUE"}
                  onChange={(e) => handleInputChange("status", e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2 focus:border-green-500 focus:outline-none"
                >
                  <option value="ESTOQUE">Estoque</option>
                  <option value="VENDIDO PIX">Vendido PIX</option>
                  <option value="VENDIDO DINHEIRO">Vendido Dinheiro</option>
                  <option value="CONSERTO">Conserto</option>
                  <option value="BRINDE VENDEDOR">Brinde Vendedor</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={product.catalog_active || false}
                onChange={(e) => handleInputChange("catalog_active", e.target.checked)}
                className="w-5 h-5"
              />
              <label className="text-gray-300 text-sm">Ativo no Catálogo</label>
            </div>
          </CardContent>
        </Card>

        {/* Imagens */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Imagens</CardTitle>
            <Button
              onClick={handleAddImageUrl}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 gap-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar Imagem
            </Button>
          </CardHeader>
          <CardContent>
            {product.image_urls && product.image_urls.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {product.image_urls.map((url, index) => (
                  <div key={index} className="relative">
                    <img
                      src={url}
                      alt={`Imagem ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border border-gray-600"
                    />
                    <button
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">Nenhuma imagem adicionada</p>
            )}
          </CardContent>
        </Card>

        {/* Leilões Vinculados */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Leilões Vinculados</CardTitle>
            <Button
              onClick={() => setShowCreateAuctionModal(true)}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 gap-2"
            >
              <Plus className="w-4 h-4" />
              Criar Leilão
            </Button>
          </CardHeader>
          <CardContent>
            {linkedAuctions && linkedAuctions.length > 0 ? (
              <div className="space-y-2">
                {linkedAuctions.map((auction) => (
                  <div key={auction.id} className="bg-gray-700 p-3 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="text-white font-semibold">{auction.title}</p>
                      <p className="text-gray-300 text-sm">Status: {auction.status}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(createPageUrl("EditAuction") + `?id=${auction.id}`)}
                      className="text-blue-400"
                    >
                      Editar
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">Nenhum leilão vinculado</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}