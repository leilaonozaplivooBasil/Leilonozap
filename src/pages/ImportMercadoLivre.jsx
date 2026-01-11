import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ImportMercadoLivre() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleImport = async () => {
    if (!url.trim()) {
      setError("Cole um link do Mercado Livre");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await base44.functions.invoke("importMercadoLivre", { url: url.trim() });
      
      if (response?.data?.error) {
        setError(response.data.error);
      } else {
        setResult(response?.data);
      }
    } catch (err) {
      setError(err.message || "Erro ao importar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 text-gray-300">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* CARD DE ENTRADA */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Importar Anúncio do Mercado Livre</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="url" className="text-gray-300">Cole o link do anúncio do Mercado Livre</Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleImport()}
                placeholder="https://www.mercadolivre.com.br/..."
                className="mt-2 bg-gray-900 border-gray-600 text-white"
                disabled={loading}
              />
            </div>
            <Button
              onClick={handleImport}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {loading ? <Loader2 className="animate-spin mr-2" /> : null}
              {loading ? "Importando..." : "Importar dados"}
            </Button>
          </CardContent>
        </Card>

        {/* ERRO */}
        {error && (
          <Card className="bg-red-900/30 border-red-600">
            <CardContent className="pt-6 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-300">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* RESULTADO */}
        {result && (
          <div className="space-y-6">
            {/* TÍTULO */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-blue-400">Título</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white">{result.title}</p>
              </CardContent>
            </Card>

            {/* DESCRIÇÃO */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-blue-400">Descrição</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 line-clamp-4">{result.description}</p>
              </CardContent>
            </Card>

            {/* IMAGENS */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg text-blue-400">Imagens ({result.images?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                {result.images && result.images.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {result.images.map((imgUrl, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={imgUrl}
                          alt={`Imagem ${idx + 1}`}
                          className="w-full h-40 object-cover rounded bg-gray-900 border border-gray-600"
                          onError={(e) => {
                            e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 24 24' fill='none' stroke='%23666'%3E%3Crect width='18' height='18' x='3' y='3' rx='2'/%3E%3Ccircle cx='9' cy='9' r='2'/%3E%3Cpath d='m21 15-5-5L5 21'/%3E%3C/svg%3E";
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">Nenhuma imagem encontrada</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}