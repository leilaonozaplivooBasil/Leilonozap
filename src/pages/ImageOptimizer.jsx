import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { convertExistingImages } from "@/functions/convertExistingImages";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Image, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function ImageOptimizer() {
  const navigate = useNavigate();
  const [entity, setEntity] = useState("Auction");
  const [batchSize, setBatchSize] = useState(10);
  const [dryRun, setDryRun] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [history, setHistory] = useState([]);

  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const isAdmin = currentUser?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-red-400 text-lg">Acesso negado. Apenas administradores.</p>
      </div>
    );
  }

  const handleConvert = async () => {
    setIsProcessing(true);
    setResults(null);

    try {
      const response = await convertExistingImages({
        entity,
        batch_size: batchSize,
        dry_run: dryRun,
        quality: 82,
        max_width: 1200,
      });

      const data = response?.data || response;
      setResults(data);
      setHistory(prev => [{ entity, dryRun, timestamp: new Date().toISOString(), ...data }, ...prev.slice(0, 9)]);

      if (dryRun) {
        toast.info(`Simulação: ${data.total_processed} registros analisados`);
      } else {
        toast.success(`${data.total_converted} imagens convertidas!`);
      }
    } catch (error) {
      toast.error("Erro: " + error.message);
      setResults({ error: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-xl text-white flex items-center gap-2">
              <Image className="w-6 h-6 text-green-400" />
              Otimizador de Imagens — Conversão WebP em Lote
            </CardTitle>
            <p className="text-sm text-gray-400 mt-2">
              Converte imagens existentes no banco para WebP. Operação segura: URLs antigas continuam funcionando.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Entidade</Label>
                <Select value={entity} onValueChange={setEntity}>
                  <SelectTrigger className="bg-gray-900 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 text-white">
                    <SelectItem value="Auction">Auction (Leilões)</SelectItem>
                    <SelectItem value="Product">Product (Produtos)</SelectItem>
                    <SelectItem value="BannerImage">BannerImage (Banners)</SelectItem>
                    <SelectItem value="AppUser">AppUser (Avatares)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Lote (registros por vez)</Label>
                <Input
                  type="number"
                  value={batchSize}
                  onChange={(e) => setBatchSize(parseInt(e.target.value) || 5)}
                  min={1}
                  max={50}
                  className="bg-gray-900 border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-yellow-900/20 rounded-lg border border-yellow-600/50">
              <input
                type="checkbox"
                id="dryRun"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="dryRun" className="text-yellow-300 cursor-pointer">
                Modo simulação (não altera dados — recomendado para primeira execução)
              </Label>
            </div>

            <Button
              onClick={handleConvert}
              disabled={isProcessing}
              className={`w-full font-bold ${dryRun ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando {entity}...
                </>
              ) : (
                <>
                  {dryRun ? <AlertCircle className="w-4 h-4 mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  {dryRun ? `Simular conversão (${entity})` : `Converter ${entity} para WebP`}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Resultados */}
        {results && !results.error && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg text-green-400 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Resultado — {results.entity}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-gray-900 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-white">{results.total_processed}</p>
                  <p className="text-xs text-gray-400">Processados</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-400">{results.total_converted}</p>
                  <p className="text-xs text-gray-400">Convertidos</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-yellow-400">{results.total_skipped}</p>
                  <p className="text-xs text-gray-400">Já WebP</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-red-400">{results.total_errors}</p>
                  <p className="text-xs text-gray-400">Erros</p>
                </div>
              </div>

              {results.bytes_saved_mb && parseFloat(results.bytes_saved_mb) > 0 && (
                <div className="bg-green-900/20 border border-green-600/50 rounded-lg p-3 text-center">
                  <p className="text-green-300 font-bold">
                    Economia: {results.bytes_saved_mb} MB
                  </p>
                </div>
              )}

              {results.details?.length > 0 && (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {results.details.map((d, i) => (
                    <div key={i} className="bg-gray-900 rounded p-2 text-sm flex items-center justify-between">
                      <span className="text-gray-300 truncate flex-1">{d.title}</span>
                      <div className="flex gap-3 flex-shrink-0">
                        <span className="text-green-400">{d.converted} conv.</span>
                        <span className="text-yellow-400">{d.skipped} skip</span>
                        {d.errors?.length > 0 && (
                          <span className="text-red-400">{d.errors.length} err</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {results?.error && (
          <Card className="bg-red-900/20 border-red-700">
            <CardContent className="p-4">
              <p className="text-red-400">Erro: {results.error}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}