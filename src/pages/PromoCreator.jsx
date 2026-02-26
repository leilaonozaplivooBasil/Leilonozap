import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Image, Type, Sparkles, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import ProductSelector from "@/components/promo/ProductSelector";
import PromoTemplateCard, { TEMPLATES } from "@/components/promo/PromoTemplateCard";
import PromoTextGenerator from "@/components/promo/PromoTextGenerator";
import PromoVideoGenerator from "@/components/promo/PromoVideoGenerator";
import PromoCustomizer from "@/components/promo/PromoCustomizer";
// Layout is now fixed per design - no selector needed
import PromoDesignSelector from "@/components/promo/PromoDesignSelector";

export default function PromoCreator() {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState("oferta");
  const selectedLayout = "square";
  const [selectedDesign, setSelectedDesign] = useState("classic");
  const [overrides, setOverrides] = useState({
    imageUrl: "",
    title: "",
    badgeText: "",
    ctaText: "",
    brandName: "",
    brandSub: "",
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to={createPageUrl("CatalogManagement")}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Criador de Material Promocional</h1>
            <p className="text-sm text-gray-400">
              Gere imagens, textos e materiais para divulgar seus produtos do catálogo
            </p>
          </div>
        </div>

        {/* Step 1: Product Selection */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-sm font-bold">1</div>
            <h2 className="text-lg font-semibold">Selecione o Produto</h2>
          </div>
          <ProductSelector onSelect={(p) => {
            setSelectedProduct(p);
            setOverrides({
              imageUrl: p?.image_urls?.[0] || "",
              title: p?.description || "",
              badgeText: "",
              ctaText: "",
              brandName: "",
              brandSub: "",
            });
          }} selectedProduct={selectedProduct} />
        </div>

        {selectedProduct && (
          <>
            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent mb-8" />

            {/* Step 2: Create Material */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-sm font-bold">2</div>
                <h2 className="text-lg font-semibold">Crie o Material</h2>
              </div>

              <Tabs defaultValue="templates" className="w-full">
                <TabsList className="bg-gray-800 border border-gray-700 mb-6 w-full sm:w-auto">
                  <TabsTrigger value="templates" className="gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                    <Image className="w-4 h-4" />
                    Templates
                  </TabsTrigger>
                  <TabsTrigger value="textos" className="gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                    <Type className="w-4 h-4" />
                    Textos IA
                  </TabsTrigger>
                  <TabsTrigger value="ia" className="gap-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                    <Sparkles className="w-4 h-4" />
                    Imagem IA
                  </TabsTrigger>
                </TabsList>

                {/* Templates Tab */}
                <TabsContent value="templates">
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Coluna 1: Template + Customização */}
                    <div className="xl:col-span-1 space-y-6 max-h-[85vh] overflow-y-auto pr-1">
                      {/* Template Selector */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                          Escolha o Estilo
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-2 gap-2">
                          {Object.entries(TEMPLATES).map(([key, tpl]) => (
                            <button
                              key={key}
                              onClick={() => setSelectedTemplate(key)}
                              className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                                selectedTemplate === key
                                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                                  : "border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:text-white"
                              }`}
                            >
                              <div className="h-2 w-full rounded-full mb-2" style={{ background: tpl.sealGradient || tpl.gradient }} />
                              {tpl.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Design Selector */}
                      <PromoDesignSelector
                        selectedDesign={selectedDesign}
                        onSelect={setSelectedDesign}
                      />

                      {/* Customizer */}
                      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4">
                        <PromoCustomizer
                          product={selectedProduct}
                          overrides={overrides}
                          onChange={setOverrides}
                        />
                      </div>
                    </div>

                    {/* Coluna 2: Preview */}
                    <div className="xl:col-span-2">
                      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        Preview
                      </h3>
                      <PromoTemplateCard
                        product={selectedProduct}
                        templateKey={selectedTemplate}
                        overrides={overrides}
                        layout={selectedLayout}
                        design={selectedDesign}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Textos Tab */}
                <TabsContent value="textos">
                  <div className="max-w-2xl">
                    <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 mb-4">
                      <div className="flex items-center gap-3">
                        {selectedProduct.image_urls?.[0] && (
                          <img
                            src={selectedProduct.image_urls[0]}
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <p className="text-white font-medium text-sm">{selectedProduct.description}</p>
                          <p className="text-emerald-400 font-bold">
                            R$ {(selectedProduct.price_catalog || selectedProduct.selling_price_retail || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <PromoTextGenerator product={selectedProduct} />
                  </div>
                </TabsContent>

                {/* IA Image Tab */}
                <TabsContent value="ia">
                  <div className="max-w-lg">
                    <PromoVideoGenerator product={selectedProduct} />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </div>
    </div>
  );
}