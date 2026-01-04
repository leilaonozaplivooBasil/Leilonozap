import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Loader2, CheckCircle, Sparkles, Image as ImageIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ImageAnalyzer({ onAnalysisComplete }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    setSelectedImage(file);
    setAnalysisResult(null);

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!selectedImage) {
      toast.error('Selecione uma imagem primeiro');
      return;
    }

    setIsAnalyzing(true);

    try {
      // Primeiro fazer upload da imagem
      const uploadResult = await base44.integrations.Core.UploadFile({ file: selectedImage });
      
      if (!uploadResult?.file_url) {
        throw new Error('Falha ao fazer upload da imagem');
      }

      // Agora enviar URL para analise
      const response = await base44.functions.invoke('analyzeProductImage', {
        imageUrl: uploadResult.file_url
      });

      if (response.data?.success) {
        setAnalysisResult(response.data.analysis);
        toast.success('✅ Imagem analisada com sucesso!');
        
        // Passar dados para o componente pai
        if (onAnalysisComplete) {
          onAnalysisComplete({
            ...response.data.analysis,
            imageUrl: response.data.imageUrl
          });
        }
      } else {
        throw new Error(response.data?.error || 'Erro na analise');
      }

    } catch (error) {
      console.error('Erro na analise:', error);
      toast.error('Erro ao analisar imagem: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card className="bg-gray-800 border-purple-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Sparkles className="w-5 h-5 text-purple-400" />
          IA - Análise de Imagem
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-purple-500 transition-colors">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
            id="image-upload"
          />
          <label htmlFor="image-upload" className="cursor-pointer">
            <div className="flex flex-col items-center gap-3">
              {preview ? (
                <img src={preview} alt="Preview" className="max-h-48 rounded-lg" />
              ) : (
                <ImageIcon className="w-12 h-12 text-gray-500" />
              )}
              <div>
                <p className="text-white font-semibold mb-1">
                  {selectedImage ? selectedImage.name : 'Clique para escolher imagem'}
                </p>
                <p className="text-sm text-gray-400">
                  A IA vai identificar automaticamente o produto
                </p>
              </div>
            </div>
          </label>
        </div>

        {/* Analyze Button */}
        {selectedImage && !analysisResult && (
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analisando com IA...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analisar Imagem
              </>
            )}
          </Button>
        )}

        {/* Analysis Result */}
        {analysisResult && (
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-green-400 mb-3">
              <CheckCircle className="w-5 h-5" />
              <span className="font-bold">Análise Completa!</span>
            </div>
            <div className="space-y-2 text-sm text-gray-300">
              <p><strong className="text-white">Produto:</strong> {analysisResult.title}</p>
              <p><strong className="text-white">Categoria:</strong> {analysisResult.category}</p>
              <p><strong className="text-white">Estado:</strong> {analysisResult.condition}</p>
              <p><strong className="text-white">Preço Estimado:</strong> R$ {analysisResult.estimated_price?.toFixed(2)}</p>
              <p className="pt-2 border-t border-gray-700">
                <strong className="text-white">Descrição:</strong><br />
                {analysisResult.description}
              </p>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 text-center">
          💡 A IA analisa a imagem e preenche automaticamente título, descrição, categoria e preço
        </div>
      </CardContent>
    </Card>
  );
}