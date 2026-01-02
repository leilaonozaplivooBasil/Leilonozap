import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, Loader2, FileText, Package, CheckCircle, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function BatchRegistrationModal({ isOpen, onClose, onSuccess }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [extractedBatches, setExtractedBatches] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = async (file) => {
    if (!file) return;

    setSelectedFile(file);
    setIsProcessing(true);
    setProgress('📤 Enviando arquivo...');
    setExtractedBatches([]);

    try {
      // 1️⃣ UPLOAD DO ARQUIVO
      const { UploadFile } = await import("@/integrations/Core");
      const uploadResult = await UploadFile({ file });

      if (!uploadResult?.file_url) {
        throw new Error('Falha ao fazer upload');
      }

      console.log('✅ Arquivo enviado:', uploadResult.file_url);
      setProgress('🤖 Extraindo dados do recibo...');

      // 2️⃣ USA FUNÇÃO BACKEND CUSTOMIZADA
      const extractResponse = await base44.functions.invoke('extractBatchReceipt', {
        file_url: uploadResult.file_url
      });

      console.log('📦 Resposta:', extractResponse);

      if (!extractResponse?.data?.success || !extractResponse?.data?.data) {
        throw new Error(extractResponse?.data?.error || 'Falha ao extrair dados do recibo');
      }

      const rawData = extractResponse.data.data;
      console.log('📦 Lotes extraídos:', rawData);
      setProgress('🔄 Organizando lotes...');

      // 3️⃣ PROCESSAR LOTES
      const processedBatches = processExtractedBatches(rawData);
      
      setExtractedBatches(processedBatches);
      setShowPreview(true);
      setProgress('✅ Pronto para revisão!');

    } catch (error) {
      console.error('❌ Erro:', error);
      alert(`❌ Erro ao processar recibo: ${error.message}`);
      setProgress('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // 🔥 FUNÇÃO PARA PROCESSAR DADOS EXTRAÍDOS
  const processExtractedBatches = (rawData) => {
    return rawData.map(lote => {
      const totalProdutos = lote.produtos.reduce((sum, p) => sum + (p.quantidade || 1), 0);
      const custoPorUnidade = totalProdutos > 0 ? lote.valor_total / totalProdutos : 0;

      return {
        lote: lote.numero_lote,
        produtos: lote.produtos.map(p => ({
          descricao: p.descricao,
          quantidade: p.quantidade || 1
        })),
        valor_total: lote.valor_total || 0,
        total_produtos: totalProdutos,
        custo_por_unidade: custoPorUnidade
      };
    });
  };

  // 🔥 SALVAR TODOS OS PRODUTOS
  const handleSaveBatches = async () => {
    setIsProcessing(true);
    setProgress('💾 Salvando produtos...');

    try {
      let totalSaved = 0;
      const hoje = new Date().toISOString().split('T')[0];

      for (const batch of extractedBatches) {
        for (const produto of batch.produtos) {
          const productData = {
            date: hoje,
            lot: batch.lote,
            description: produto.descricao,
            quantity: produto.quantidade,
            cost_price: batch.custo_por_unidade || 0,
            condition: 'PERFEITO ESTADO',
            status: 'ESTOQUE',
            selling_price_retail: 0,
            selling_price_wholesale: 0,
            sold_amount: 0,
            profit: 0
          };

          await base44.entities.Product.create(productData);
          totalSaved++;
          setProgress(`💾 ${totalSaved} produtos salvos...`);

          // Pequeno delay para evitar rate limit
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      alert(`✅ ${totalSaved} produtos registrados com sucesso!`);
      onSuccess();
      handleClose();

    } catch (error) {
      console.error('❌ Erro ao salvar:', error);
      alert(`❌ Erro ao salvar produtos: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setProgress('');
    }
  };

  const handleClose = () => {
    setExtractedBatches([]);
    setShowPreview(false);
    setSelectedFile(null);
    setProgress('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Package className="w-6 h-6 text-blue-400" />
            Registrar Lotes de Produtos
          </DialogTitle>
        </DialogHeader>

        {!showPreview ? (
          <div className="space-y-6 py-4">
            {/* UPLOAD AREA */}
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                isDragging 
                  ? 'border-blue-500 bg-blue-500/10' 
                  : 'border-gray-600 hover:border-blue-500'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-blue-500' : 'text-blue-400'}`} />
              <h3 className="text-lg font-bold mb-2">
                {isDragging ? '📂 Solte o arquivo aqui' : 'Envie o Recibo'}
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Arraste e solte ou clique para selecionar
              </p>
              <p className="text-xs text-gray-500 mb-4">
                PDF ou Imagem (PNG, JPG)
              </p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      handleFileSelect(file);
                    }
                    e.target.value = '';
                  }}
                  disabled={isProcessing}
                  className="hidden"
                />
                <Button 
                  disabled={isProcessing} 
                  className="bg-blue-600 hover:bg-blue-700"
                  type="button"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Selecionar Arquivo
                    </>
                  )}
                </Button>
              </label>
            </div>

            {isProcessing && progress && (
              <Card className="bg-blue-900/20 border-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                    <p className="text-blue-300">{progress}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* INSTRUÇÕES */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-sm text-gray-300">📋 Formatos Aceitos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-gray-400">
                <div>
                  <p className="font-bold text-white mb-1">Formato 1: Recibo padrão</p>
                  <ul className="space-y-1 ml-4">
                    <li>• <strong>Lote 3502</strong> - número do lote</li>
                    <li>• <strong>Discriminação:</strong> "2 Airfryer + 1 Micro-ondas"</li>
                    <li>• Produtos separados por <strong>+</strong></li>
                    <li>• Valor total do lote no final</li>
                  </ul>
                </div>
                <div>
                  <p className="font-bold text-white mb-1">Formato 2: Planilha</p>
                  <ul className="space-y-1 ml-4">
                    <li>• <strong>MATERIAL_SAAP</strong> - número do lote</li>
                    <li>• <strong>Descrição</strong> - nome do produto</li>
                    <li>• <strong>Novo estoque</strong> - quantidade</li>
                    <li>• <strong>TOTAL novo estoque</strong> - valor</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between bg-green-900/20 border border-green-500 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <div>
                  <p className="font-bold text-green-400">Dados Extraídos com Sucesso!</p>
                  <p className="text-sm text-gray-300">
                    {extractedBatches.length} lotes • {extractedBatches.reduce((sum, b) => sum + b.total_produtos, 0)} produtos
                  </p>
                </div>
              </div>
            </div>

            {/* PREVIEW DOS LOTES */}
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {extractedBatches.map((batch, batchIdx) => (
                <Card key={batchIdx} className="bg-gray-900 border-gray-700">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-400" />
                        Lote {batch.lote}
                      </CardTitle>
                      <Badge className="bg-green-600">
                        R$ {batch.valor_total.toFixed(2)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {batch.produtos.map((produto, prodIdx) => (
                      <div key={prodIdx} className="flex items-start justify-between bg-gray-800 rounded p-2 text-sm">
                        <div className="flex-1">
                          <p className="text-white">{produto.descricao}</p>
                          <p className="text-xs text-gray-400">
                            Quantidade: {produto.quantidade} • Custo unit.: R$ {batch.custo_por_unidade.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-gray-700 text-xs text-gray-400">
                      Total: {batch.total_produtos} produtos • R$ {batch.valor_total.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* AÇÕES */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSaveBatches}
                disabled={isProcessing}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirmar e Salvar
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setShowPreview(false);
                  setExtractedBatches([]);
                }}
                disabled={isProcessing}
                variant="outline"
                className="border-gray-600 text-gray-300"
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            </div>

            {isProcessing && progress && (
              <Card className="bg-blue-900/20 border-blue-500">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                    <p className="text-sm text-blue-300">{progress}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}