import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, Loader2, FileText, Package, CheckCircle, X, 
  Edit, Trash2, Save, Plus, ArrowLeft, ArrowRight, ChevronDown, ChevronUp, FileImage 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function RegisterBatches() {
  const [batches, setBatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFreteModal, setShowFreteModal] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [freteValue, setFreteValue] = useState(0);
  const [expandedBatches, setExpandedBatches] = useState({});
  const [showManualModal, setShowManualModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [editFreteValue, setEditFreteValue] = useState(0);
  const [manualFreteValue, setManualFreteValue] = useState(0);
  const [manualBatch, setManualBatch] = useState({
    numero_leilao: '',
    valor_total: 0,
    lotes: [{
      numero_lote: '',
      valor_lote: 0,
      produtos: [{ descricao: '', quantidade: 1 }]
    }]
  });
  const [lotesStatus, setLotesStatus] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    try {
      const allBatches = await base44.entities.BatchRegistration.list('-created_date', 100);
      setBatches(allBatches);

      // Atualiza mapa local de códigos (code -> descrição) com histórico
      try {
        const codeMap = {};
        (allBatches || []).forEach(b => (b.lotes || []).forEach(l => (l.produtos || []).forEach(p => {
          if (p.codigo && p.descricao) codeMap[p.codigo] = { descricao: p.descricao };
        })));
        const old = JSON.parse(localStorage.getItem('productCodeMap') || '{}');
        localStorage.setItem('productCodeMap', JSON.stringify({ ...old, ...codeMap }));
      } catch {}

      // Verifica status de cada lote
      await checkLotesStatus(allBatches);
    } catch (error) {
      console.error('Erro ao carregar leilões:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkLotesStatus = async (batchesList) => {
    // Cache de 10 minutos para evitar verificações repetidas
    const cacheKey = 'lotes_status_cache';
    const cacheTimeKey = 'lotes_status_cache_time';
    const cached = sessionStorage.getItem(cacheKey);
    const cacheTime = sessionStorage.getItem(cacheTimeKey);
    
    if (cached && cacheTime && Date.now() - parseInt(cacheTime) < 600000) {
      setLotesStatus(JSON.parse(cached));
      console.log('⚡ Status dos lotes carregado do cache');
      return;
    }
    
    const statusMap = {};
    let requestCount = 0;
    
    for (const batch of batchesList) {
      if (!batch.lotes) continue;
      
      for (const lote of batch.lotes) {
        const loteKey = `${batch.id}_${lote.numero_lote}`;
        
        try {
          // Delay de 2 segundos a cada 3 requisições para evitar rate limit
          if (requestCount > 0 && requestCount % 3 === 0) {
            console.log('⏳ Aguardando 2s para evitar rate limit...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          const productsInStock = await base44.entities.Product.filter({ lot: lote.numero_lote });
          const expectedCount = lote.produtos?.reduce((sum, p) => sum + (p.quantidade || 1), 0) || 0;
          const foundCount = productsInStock.length;
          
          statusMap[loteKey] = {
            expected: expectedCount,
            found: foundCount,
            missing: expectedCount - foundCount,
            complete: foundCount >= expectedCount
          };
          
          requestCount++;
        } catch (error) {
          console.error(`Erro ao verificar lote ${lote.numero_lote}:`, error.message);
          statusMap[loteKey] = { expected: 0, found: 0, missing: 0, complete: false };
          
          // Se for rate limit, espera 3 segundos antes de continuar
          if (error.message?.includes('Rate limit')) {
            console.log('⚠️ Rate limit detectado - aguardando 3s...');
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
      }
    }
    
    // Salva no cache
    sessionStorage.setItem(cacheKey, JSON.stringify(statusMap));
    sessionStorage.setItem(cacheTimeKey, Date.now().toString());
    
    setLotesStatus(statusMap);
  };

  const handleFileSelect = async (file) => {
    if (!file) return;

    setIsProcessing(true);
    setProgress('📤 Enviando arquivo...');

    try {
      const uploadResult = await base44.integrations.Core.UploadFile({ file });

      if (!uploadResult?.file_url) {
        throw new Error('Falha ao fazer upload');
      }

      setProgress('🤖 Extraindo dados da nota fiscal...');

      const extractResponse = await base44.functions.invoke('extractBatchReceipt', {
        file_url: uploadResult.file_url
      });

      if (!extractResponse?.data?.success || !extractResponse?.data?.data) {
        throw new Error(extractResponse?.data?.error || 'Falha ao extrair dados');
      }

      const rawData = extractResponse.data.data;
      
      setExtractedData({...rawData, recibo_url: uploadResult.file_url});
      setFreteValue(0);
      setShowFreteModal(true);
      setProgress('');

    } catch (error) {
      console.error('❌ Erro:', error);
      alert(`❌ Erro: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setProgress('');
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
    if (file) handleFileSelect(file);
  };

  const handleDeleteBatch = async (batchId) => {
    if (!confirm('Excluir este leilão?')) return;
    try {
      await base44.entities.BatchRegistration.delete(batchId);
      alert('✅ Leilão excluído!');
      await loadBatches();
    } catch (error) {
      console.error('Erro:', error);
      alert('❌ Erro ao excluir');
    }
  };

  const handleConfirmImport = async () => {
    setShowFreteModal(false);
    setIsProcessing(true);
    setProgress('💾 Salvando leilão...');

    try {
      // Calcula total de produtos de TODOS os lotes
      const totalProdutosGlobal = (extractedData.lotes || []).reduce((sum, lote) => {
        return sum + (lote.produtos || []).reduce((pSum, p) => pSum + (p.quantidade || 1), 0);
      }, 0);

      const valorComFrete = (extractedData.valor_total || 0) + (freteValue || 0);
      const custoPorUnidade = totalProdutosGlobal > 0 ? valorComFrete / totalProdutosGlobal : 0;

      await base44.entities.BatchRegistration.create({
        numero_leilao: extractedData.numero_leilao,
        lotes: extractedData.lotes,
        valor_total: valorComFrete,
        frete_value: freteValue || 0,
        total_produtos: totalProdutosGlobal,
        custo_por_unidade: custoPorUnidade,
        status: 'pendente',
        recibo_url: extractedData.recibo_url
      });

      alert(`✅ Leilão ${extractedData.numero_leilao} registrado com ${extractedData.lotes.length} lotes!`);
      setExtractedData(null);
      setFreteValue(0);
      await loadBatches();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('❌ Erro ao salvar leilão');
    } finally {
      setIsProcessing(false);
      setProgress('');
    }
  };

  const handleConvertToProducts = (batch) => {
    navigate(createPageUrl("ProductManagement"), {
      state: { batchData: batch }
    });
  };

  const handleConvertSingleLot = (batch, loteIndex) => {
    const lote = batch.lotes[loteIndex];
    
    // Cria um batch temporário com apenas esse lote
    const singleLotBatch = {
      ...batch,
      lotes: [lote],
      numero_leilao: `${batch.numero_leilao} - Lote ${lote.numero_lote}`
    };
    
    navigate(createPageUrl("ProductManagement"), {
      state: { batchData: singleLotBatch }
    });
  };

  const toggleBatchExpanded = (batchId) => {
    setExpandedBatches(prev => ({
      ...prev,
      [batchId]: !prev[batchId]
    }));
  };

  const handleSaveManualBatch = async () => {
    if (!manualBatch.numero_leilao) {
      alert('Informe o número do leilão');
      return;
    }

    setIsProcessing(true);
    setProgress('💾 Salvando leilão...');

    try {
      const totalProdutosGlobal = manualBatch.lotes.reduce((sum, lote) => {
        return sum + lote.produtos.reduce((pSum, p) => pSum + (p.quantidade || 1), 0);
      }, 0);

      const valorComFrete = manualBatch.valor_total + (manualFreteValue || 0);
      const custoPorUnidade = totalProdutosGlobal > 0 ? valorComFrete / totalProdutosGlobal : 0;

      // Atualiza o mapa de códigos (code -> descrição)
      try {
        const mapJson = localStorage.getItem('productCodeMap');
        const codeMap = mapJson ? JSON.parse(mapJson) : {};
        manualBatch.lotes.forEach(l => (l.produtos || []).forEach(p => {
          if (p.codigo && p.descricao) codeMap[p.codigo] = { descricao: p.descricao };
        }));
        localStorage.setItem('productCodeMap', JSON.stringify(codeMap));
      } catch {}

      await base44.entities.BatchRegistration.create({
        numero_leilao: manualBatch.numero_leilao,
        lotes: manualBatch.lotes,
        valor_total: valorComFrete,
        frete_value: manualFreteValue || 0,
        total_produtos: totalProdutosGlobal,
        custo_por_unidade: custoPorUnidade,
        status: 'pendente'
      });

      alert(`✅ Leilão ${manualBatch.numero_leilao} registrado com ${manualBatch.lotes.length} lotes!`);
      setShowManualModal(false);
      setManualFreteValue(0);
      setManualBatch({
        numero_leilao: '',
        valor_total: 0,
        lotes: [{
          numero_lote: '',
          valor_lote: 0,
          produtos: [{ descricao: '', quantidade: 1 }]
        }]
      });
      await loadBatches();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('❌ Erro ao salvar leilão');
    } finally {
      setIsProcessing(false);
      setProgress('');
    }
  };

  const addLoteManual = () => {
    setManualBatch({
      ...manualBatch,
      lotes: [...manualBatch.lotes, {
        numero_lote: '',
        valor_lote: 0,
        produtos: [{ descricao: '', quantidade: 1 }]
      }]
    });
  };

  const removeLoteManual = (loteIdx) => {
    setManualBatch({
      ...manualBatch,
      lotes: manualBatch.lotes.filter((_, idx) => idx !== loteIdx)
    });
  };

  const addProdutoManual = (loteIdx) => {
    const newLotes = [...manualBatch.lotes];
    newLotes[loteIdx].produtos.push({ descricao: '', quantidade: 1 });
    setManualBatch({ ...manualBatch, lotes: newLotes });
  };

  const removeProdutoManual = (loteIdx, prodIdx) => {
    const newLotes = [...manualBatch.lotes];
    newLotes[loteIdx].produtos = newLotes[loteIdx].produtos.filter((_, idx) => idx !== prodIdx);
    setManualBatch({ ...manualBatch, lotes: newLotes });
  };

  const handleEditBatch = (batch) => {
    setEditingBatch(batch);
    setEditFreteValue(batch.frete_value || 0);
    setManualBatch({
      numero_leilao: batch.numero_leilao,
      valor_total: batch.valor_total - (batch.frete_value || 0),
      lotes: batch.lotes || [{
        numero_lote: '',
        valor_lote: 0,
        produtos: [{ descricao: '', quantidade: 1 }]
      }]
    });
    setShowEditModal(true);
  };

  const handleSaveEditBatch = async () => {
    if (!manualBatch.numero_leilao) {
      alert('Informe o número do leilão');
      return;
    }

    setIsProcessing(true);
    setProgress('💾 Salvando alterações...');

    try {
      const totalProdutosGlobal = manualBatch.lotes.reduce((sum, lote) => {
        return sum + lote.produtos.reduce((pSum, p) => pSum + (p.quantidade || 1), 0);
      }, 0);

      const valorComFrete = manualBatch.valor_total + (editFreteValue || 0);
      const custoPorUnidade = totalProdutosGlobal > 0 ? valorComFrete / totalProdutosGlobal : 0;

      // Atualiza o mapa de códigos (code -> descrição)
      try {
        const mapJson = localStorage.getItem('productCodeMap');
        const codeMap = mapJson ? JSON.parse(mapJson) : {};
        manualBatch.lotes.forEach(l => (l.produtos || []).forEach(p => {
          if (p.codigo && p.descricao) codeMap[p.codigo] = { descricao: p.descricao };
        }));
        localStorage.setItem('productCodeMap', JSON.stringify(codeMap));
      } catch {}

      await base44.entities.BatchRegistration.update(editingBatch.id, {
        numero_leilao: manualBatch.numero_leilao,
        lotes: manualBatch.lotes,
        valor_total: valorComFrete,
        frete_value: editFreteValue || 0,
        total_produtos: totalProdutosGlobal,
        custo_por_unidade: custoPorUnidade
      });

      alert(`✅ Leilão ${manualBatch.numero_leilao} atualizado!`);
      setShowEditModal(false);
      setEditingBatch(null);
      setEditFreteValue(0);
      setManualBatch({
        numero_leilao: '',
        valor_total: 0,
        lotes: [{
          numero_lote: '',
          valor_lote: 0,
          produtos: [{ descricao: '', quantidade: 1 }]
        }]
      });
      await loadBatches();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('❌ Erro ao salvar alterações');
    } finally {
      setIsProcessing(false);
      setProgress('');
    }
  };

  const pendingBatches = batches.filter(b => b.status === 'pendente');
  const convertedBatches = batches.filter(b => b.status === 'convertido');
  
  const filteredBatches = statusFilter === 'all' 
    ? batches 
    : batches.filter(b => b.status === statusFilter);

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl("ProductManagement"))}
              className="bg-white border-gray-300 text-black hover:bg-blue-900 hover:text-white hover:border-blue-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2 text-black hover:text-white" />
              <span className="font-semibold text-black hover:text-white">Voltar</span>
            </Button>
            <h1 className="text-3xl font-bold text-white">📦 Registrar Leilões</h1>
          </div>
          <Button
            onClick={() => setShowManualModal(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Edit className="w-4 h-4 mr-2" />
            Registrar Manualmente
          </Button>
        </div>

        {/* UPLOAD AREA */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardContent className="p-6">
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-blue-500'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-blue-500' : 'text-blue-400'}`} />
              <h3 className="text-lg font-bold text-white mb-2">
                {isDragging ? '📂 Solte o arquivo aqui' : 'Envie a Nota Fiscal'}
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Arraste e solte ou clique para selecionar
              </p>
              <label htmlFor="batch-file-input" className="cursor-pointer">
                <input
                  id="batch-file-input"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileSelect(file);
                      e.target.value = '';
                    }
                  }}
                  disabled={isProcessing}
                  className="hidden"
                />
                <Button 
                  disabled={isProcessing} 
                  className="bg-blue-600 hover:bg-blue-700"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('batch-file-input')?.click();
                  }}
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

              {isProcessing && progress && (
                <div className="mt-4 text-blue-300 text-sm">{progress}</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ESTATÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card 
            onClick={() => setStatusFilter('all')}
            className={`cursor-pointer transition-all ${
              statusFilter === 'all' 
                ? 'bg-blue-900/30 border-blue-500 ring-2 ring-blue-500' 
                : 'bg-gray-800 border-gray-700 hover:bg-gray-750'
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total de Leilões</p>
                  <p className="text-2xl font-bold text-white">{batches.length}</p>
                </div>
                <Package className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card 
            onClick={() => setStatusFilter('pendente')}
            className={`cursor-pointer transition-all ${
              statusFilter === 'pendente' 
                ? 'bg-yellow-900/30 border-yellow-500 ring-2 ring-yellow-500' 
                : 'bg-gray-800 border-gray-700 hover:bg-gray-750'
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Pendentes</p>
                  <p className="text-2xl font-bold text-yellow-400">{pendingBatches.length}</p>
                </div>
                <Package className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card 
            onClick={() => setStatusFilter('convertido')}
            className={`cursor-pointer transition-all ${
              statusFilter === 'convertido' 
                ? 'bg-green-900/30 border-green-500 ring-2 ring-green-500' 
                : 'bg-gray-800 border-gray-700 hover:bg-gray-750'
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Convertidos</p>
                  <p className="text-2xl font-bold text-green-400">{convertedBatches.length}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* LISTA DE LEILÕES */}
        <div className="space-y-4">
          {filteredBatches.map((batch) => {
            const isExpanded = expandedBatches[batch.id];
            return (
              <Card key={batch.id} className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <Package className="w-6 h-6 text-blue-400" />
                      <div className="flex-1">
                        <CardTitle className="text-xl text-white">
                          Leilão #{batch.numero_leilao}
                        </CardTitle>
                        <p className="text-sm text-gray-400">
                          {batch.lotes?.length || 0} lotes • {batch.total_produtos} produtos • R$ {batch.valor_total?.toFixed(2)}
                        </p>
                        <p className="text-xs text-green-400 font-semibold">
                          💰 Custo Unitário: R$ {batch.custo_por_unidade?.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={batch.status === 'pendente' ? 'bg-yellow-600' : 'bg-green-600'}>
                        {batch.status === 'pendente' ? '⏳ Pendente' : '✅ Convertido'}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleBatchExpanded(batch.id)}
                        className="border-gray-600 text-gray-300"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                      {batch.recibo_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(batch.recibo_url, '_blank')}
                          className="border-purple-600 text-purple-400"
                          title="Ver Nota Fiscal"
                        >
                          <FileImage className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditBatch(batch)}
                        className="border-blue-600 text-blue-400"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {batch.status === 'pendente' && (
                        <Button
                          size="sm"
                          onClick={() => handleConvertToProducts(batch)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <ArrowRight className="w-4 h-4 mr-1" />
                          Converter
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteBatch(batch.id)}
                        className="border-red-600 text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent>
                    <div className="space-y-4">
                      {batch.lotes?.map((lote, loteIdx) => (
                        <div key={loteIdx} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-white font-semibold">Lote {lote.numero_lote}</h4>
                                {(() => {
                                  const loteKey = `${batch.id}_${lote.numero_lote}`;
                                  const status = lotesStatus[loteKey];
                                  if (!status) return null;
                                  
                                  if (status.complete && status.found > 0) {
                                    return (
                                      <Badge className="bg-green-600 text-white text-xs">
                                        ✓ Completo ({status.found}/{status.expected})
                                      </Badge>
                                    );
                                  } else if (status.missing > 0) {
                                    return (
                                      <Badge className="bg-red-600 text-white text-xs">
                                        ⚠️ Faltam {status.missing} produto(s)
                                      </Badge>
                                    );
                                  } else if (status.found === 0) {
                                    return (
                                      <Badge className="bg-yellow-600 text-white text-xs">
                                        ⏳ Não lançado
                                      </Badge>
                                    );
                                  }
                                })()}
                              </div>
                              <p className="text-xs text-gray-400">
                                {lote.produtos?.reduce((sum, p) => sum + (p.quantidade || 1), 0)} produtos
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-blue-400 border-blue-400">
                                R$ {lote.valor_lote?.toFixed(2)}
                              </Badge>
                              <Button
                                size="sm"
                                onClick={() => handleConvertSingleLot(batch, loteIdx)}
                                className="bg-purple-600 hover:bg-purple-700 text-xs"
                              >
                                <Package className="w-3 h-3 mr-1" />
                                {batch.status === 'convertido' ? 'Relançar no Estoque' : 'Lançar no Estoque'}
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {lote.produtos?.map((produto, prodIdx) => (
                              <div key={prodIdx} className="flex justify-between bg-gray-900 rounded p-2 text-sm">
                                <span className="text-white">{produto.descricao}</span>
                                <div className="text-gray-400">
                                  Qtd: {produto.quantidade} • Unit: R$ {batch.custo_por_unidade?.toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}

          {filteredBatches.length === 0 && !isLoading && (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-12 text-center">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400">
                  {statusFilter === 'all' 
                    ? 'Nenhum leilão registrado ainda' 
                    : statusFilter === 'pendente'
                    ? 'Nenhum leilão pendente'
                    : 'Nenhum leilão convertido'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* MODAL EDITAR */}
        {showEditModal && editingBatch && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <Card className="bg-gray-800 border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="text-white">✏️ Editar Leilão #{editingBatch.numero_leilao}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-gray-300 text-sm mb-1 block font-semibold">Número do Leilão *</label>
                  <Input
                    value={manualBatch.numero_leilao}
                    onChange={(e) => setManualBatch({...manualBatch, numero_leilao: e.target.value})}
                    className="bg-gray-700 text-white"
                    placeholder="Ex: 186"
                  />
                </div>

                <div>
                  <label className="text-gray-300 text-sm mb-1 block font-semibold">Valor da Nota (R$) *</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={manualBatch.valor_total}
                    onChange={(e) => setManualBatch({...manualBatch, valor_total: parseFloat(e.target.value) || 0})}
                    className="bg-gray-700 text-white"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="text-gray-300 text-sm mb-1 block font-semibold">Valor do Frete (R$)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editFreteValue}
                    onChange={(e) => setEditFreteValue(parseFloat(e.target.value) || 0)}
                    className="bg-gray-700 text-white"
                    placeholder="0.00"
                  />
                </div>

                <div className="bg-blue-900/20 border border-blue-500/30 rounded p-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Valor da Nota:</span>
                    <span className="text-white font-bold">R$ {manualBatch.valor_total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">+ Frete:</span>
                    <span className="text-blue-400 font-bold">R$ {(editFreteValue || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-blue-500/30">
                    <span className="text-white font-bold">Total com Frete:</span>
                    <span className="text-white font-bold">R$ {(manualBatch.valor_total + (editFreteValue || 0)).toFixed(2)}</span>
                  </div>
                  <div className="bg-green-900/30 border border-green-600/50 rounded p-2 mt-3">
                    <p className="text-green-400 font-bold text-center">
                      💰 Custo Unitário: R$ {(() => {
                        const total = manualBatch.valor_total + (editFreteValue || 0);
                        const qtd = manualBatch.lotes.reduce((sum, lote) => {
                          return sum + lote.produtos.reduce((pSum, p) => pSum + (p.quantidade || 1), 0);
                        }, 0);
                        return qtd > 0 ? (total / qtd).toFixed(2) : '0.00';
                      })()}
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-semibold">Lotes</h4>
                    <Button size="sm" onClick={addLoteManual} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar Lote
                    </Button>
                  </div>

                  {manualBatch.lotes.map((lote, loteIdx) => (
                    <Card key={loteIdx} className="bg-gray-900 border-gray-700 mb-3">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-white font-semibold">Lote {loteIdx + 1}</h5>
                          {manualBatch.lotes.length > 1 && (
                            <Button size="sm" variant="outline" onClick={() => removeLoteManual(loteIdx)} className="border-red-600 text-red-400">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-gray-400 text-xs">Número do Lote</label>
                            <Input
                              value={lote.numero_lote}
                              onChange={(e) => {
                                const newLotes = [...manualBatch.lotes];
                                newLotes[loteIdx].numero_lote = e.target.value;
                                setManualBatch({...manualBatch, lotes: newLotes});
                              }}
                              className="bg-gray-800 text-white"
                              placeholder="Ex: 15575"
                            />
                          </div>
                          <div>
                            <label className="text-gray-400 text-xs">Valor do Lote (R$)</label>
                            <Input
                              type="number"
                              step="0.01"
                              value={lote.valor_lote}
                              onChange={(e) => {
                                const newLotes = [...manualBatch.lotes];
                                newLotes[loteIdx].valor_lote = parseFloat(e.target.value) || 0;
                                setManualBatch({...manualBatch, lotes: newLotes});
                              }}
                              className="bg-gray-800 text-white"
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-gray-400 text-xs">Produtos</label>
                            <Button size="sm" variant="outline" onClick={() => addProdutoManual(loteIdx)} className="text-xs h-6 border-gray-600 text-gray-300">
                              <Plus className="w-3 h-3 mr-1" />
                              Produto
                            </Button>
                          </div>

                          {lote.produtos.map((produto, prodIdx) => (
                            <div key={prodIdx} className="flex gap-2">
                              <Input
                                value={produto.codigo || ''}
                                onChange={(e) => {
                                  const newLotes = [...manualBatch.lotes];
                                  const code = e.target.value;
                                  newLotes[loteIdx].produtos[prodIdx].codigo = code;
                                  try {
                                    const map = JSON.parse(localStorage.getItem('productCodeMap') || '{}');
                                    const match = map[code];
                                    if (match?.descricao && !newLotes[loteIdx].produtos[prodIdx].descricao) {
                                      newLotes[loteIdx].produtos[prodIdx].descricao = match.descricao;
                                    }
                                  } catch {}
                                  setManualBatch({ ...manualBatch, lotes: newLotes });
                                }}
                                className="bg-gray-800 text-white w-28"
                                placeholder="Código (ex: 001)"
                              />
                              <Input
                                value={produto.descricao}
                                onChange={(e) => {
                                  const newLotes = [...manualBatch.lotes];
                                  newLotes[loteIdx].produtos[prodIdx].descricao = e.target.value;
                                  setManualBatch({...manualBatch, lotes: newLotes});
                                }}
                                className="bg-gray-800 text-white flex-1"
                                placeholder="Descrição do produto"
                              />
                              <Input
                                type="number"
                                value={produto.quantidade}
                                onChange={(e) => {
                                  const newLotes = [...manualBatch.lotes];
                                  newLotes[loteIdx].produtos[prodIdx].quantidade = parseInt(e.target.value) || 1;
                                  setManualBatch({...manualBatch, lotes: newLotes});
                                }}
                                className="bg-gray-800 text-white w-20"
                                placeholder="Qtd"
                                min="1"
                              />
                              {lote.produtos.length > 1 && (
                                <Button size="sm" variant="outline" onClick={() => removeProdutoManual(loteIdx, prodIdx)} className="border-red-600 text-red-400">
                                  <X className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleSaveEditBatch}
                    disabled={isProcessing}
                    className="bg-green-600 hover:bg-green-700 flex-1"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Alterações
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingBatch(null);
                      setEditFreteValue(0);
                    }}
                    disabled={isProcessing}
                    variant="outline"
                    className="border-gray-600 text-gray-300"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* MODAL MANUAL */}
        {showManualModal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <Card className="bg-gray-800 border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="text-white">✏️ Registrar Leilão Manualmente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-gray-300 text-sm mb-1 block font-semibold">Número do Leilão *</label>
                  <Input
                    value={manualBatch.numero_leilao}
                    onChange={(e) => setManualBatch({...manualBatch, numero_leilao: e.target.value})}
                    className="bg-gray-700 text-white"
                    placeholder="Ex: 186"
                  />
                </div>

                <div>
                  <label className="text-gray-300 text-sm mb-1 block font-semibold">Valor da Nota (R$) *</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={manualBatch.valor_total}
                    onChange={(e) => setManualBatch({...manualBatch, valor_total: parseFloat(e.target.value) || 0})}
                    className="bg-gray-700 text-white"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="text-gray-300 text-sm mb-1 block font-semibold">Valor do Frete (R$)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={manualFreteValue}
                    onChange={(e) => setManualFreteValue(parseFloat(e.target.value) || 0)}
                    className="bg-gray-700 text-white"
                    placeholder="0.00"
                  />
                </div>

                <div className="bg-blue-900/20 border border-blue-500/30 rounded p-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Valor da Nota:</span>
                    <span className="text-white font-bold">R$ {manualBatch.valor_total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">+ Frete:</span>
                    <span className="text-blue-400 font-bold">R$ {(manualFreteValue || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-blue-500/30">
                    <span className="text-white font-bold">Total com Frete:</span>
                    <span className="text-white font-bold">R$ {(manualBatch.valor_total + (manualFreteValue || 0)).toFixed(2)}</span>
                  </div>
                  <div className="bg-green-900/30 border border-green-600/50 rounded p-2 mt-3">
                    <p className="text-green-400 font-bold text-center">
                      💰 Custo Unitário: R$ {(() => {
                        const total = manualBatch.valor_total + (manualFreteValue || 0);
                        const qtd = manualBatch.lotes.reduce((sum, lote) => {
                          return sum + lote.produtos.reduce((pSum, p) => pSum + (p.quantidade || 1), 0);
                        }, 0);
                        return qtd > 0 ? (total / qtd).toFixed(2) : '0.00';
                      })()}
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-semibold">Lotes</h4>
                    <Button size="sm" onClick={addLoteManual} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar Lote
                    </Button>
                  </div>

                  {manualBatch.lotes.map((lote, loteIdx) => (
                    <Card key={loteIdx} className="bg-gray-900 border-gray-700 mb-3">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-white font-semibold">Lote {loteIdx + 1}</h5>
                          {manualBatch.lotes.length > 1 && (
                            <Button size="sm" variant="outline" onClick={() => removeLoteManual(loteIdx)} className="border-red-600 text-red-400">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-gray-400 text-xs">Número do Lote</label>
                            <Input
                              value={lote.numero_lote}
                              onChange={(e) => {
                                const newLotes = [...manualBatch.lotes];
                                newLotes[loteIdx].numero_lote = e.target.value;
                                setManualBatch({...manualBatch, lotes: newLotes});
                              }}
                              className="bg-gray-800 text-white"
                              placeholder="Ex: 15575"
                            />
                          </div>
                          <div>
                            <label className="text-gray-400 text-xs">Valor do Lote (R$)</label>
                            <Input
                              type="number"
                              step="0.01"
                              value={lote.valor_lote}
                              onChange={(e) => {
                                const newLotes = [...manualBatch.lotes];
                                newLotes[loteIdx].valor_lote = parseFloat(e.target.value) || 0;
                                setManualBatch({...manualBatch, lotes: newLotes});
                              }}
                              className="bg-gray-800 text-white"
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-gray-400 text-xs">Produtos</label>
                            <Button size="sm" variant="outline" onClick={() => addProdutoManual(loteIdx)} className="text-xs h-6 border-gray-600 text-gray-300">
                              <Plus className="w-3 h-3 mr-1" />
                              Produto
                            </Button>
                          </div>

                          {lote.produtos.map((produto, prodIdx) => (
                            <div key={prodIdx} className="flex gap-2">
                              <Input
                                value={produto.codigo || ''}
                                onChange={(e) => {
                                  const newLotes = [...manualBatch.lotes];
                                  const code = e.target.value;
                                  newLotes[loteIdx].produtos[prodIdx].codigo = code;
                                  try {
                                    const map = JSON.parse(localStorage.getItem('productCodeMap') || '{}');
                                    const match = map[code];
                                    if (match?.descricao && !newLotes[loteIdx].produtos[prodIdx].descricao) {
                                      newLotes[loteIdx].produtos[prodIdx].descricao = match.descricao;
                                    }
                                  } catch {}
                                  setManualBatch({ ...manualBatch, lotes: newLotes });
                                }}
                                className="bg-gray-800 text-white w-28"
                                placeholder="Código (ex: 001)"
                              />
                              <Input
                                value={produto.descricao}
                                onChange={(e) => {
                                  const newLotes = [...manualBatch.lotes];
                                  newLotes[loteIdx].produtos[prodIdx].descricao = e.target.value;
                                  setManualBatch({...manualBatch, lotes: newLotes});
                                }}
                                className="bg-gray-800 text-white flex-1"
                                placeholder="Descrição do produto"
                              />
                              <Input
                                type="number"
                                value={produto.quantidade}
                                onChange={(e) => {
                                  const newLotes = [...manualBatch.lotes];
                                  newLotes[loteIdx].produtos[prodIdx].quantidade = parseInt(e.target.value) || 1;
                                  setManualBatch({...manualBatch, lotes: newLotes});
                                }}
                                className="bg-gray-800 text-white w-20"
                                placeholder="Qtd"
                                min="1"
                              />
                              {lote.produtos.length > 1 && (
                                <Button size="sm" variant="outline" onClick={() => removeProdutoManual(loteIdx, prodIdx)} className="border-red-600 text-red-400">
                                  <X className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleSaveManualBatch}
                    disabled={isProcessing}
                    className="bg-green-600 hover:bg-green-700 flex-1"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Leilão
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setShowManualModal(false)}
                    disabled={isProcessing}
                    variant="outline"
                    className="border-gray-600 text-gray-300"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* MODAL DE FRETE */}
        {showFreteModal && extractedData && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <Card className="bg-gray-800 border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="text-white">💰 Informar Valor do Frete</CardTitle>
                <p className="text-gray-400 text-sm">Digite o valor do frete para calcular o custo unitário correto</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-gray-300 text-sm mb-1 block font-semibold">Valor do Frete (R$)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={freteValue}
                    onChange={(e) => setFreteValue(parseFloat(e.target.value) || 0)}
                    className="bg-gray-700 text-white text-lg"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>

                <div className="bg-gray-900/50 rounded-lg p-4 space-y-3">
                  <h3 className="text-white font-semibold mb-2">📋 Leilão #{extractedData.numero_leilao}</h3>
                  
                  {/* RESUMO GLOBAL */}
                  <div className="bg-blue-900/20 border border-blue-500/30 rounded p-3 mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Valor da Nota:</span>
                      <span className="text-white font-bold">R$ {(extractedData.valor_total || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">+ Frete:</span>
                      <span className="text-blue-400 font-bold">R$ {(freteValue || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-blue-500/30">
                      <span className="text-white font-bold">Total com Frete:</span>
                      <span className="text-white font-bold">R$ {((extractedData.valor_total || 0) + (freteValue || 0)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-gray-400">Total de Produtos:</span>
                      <span className="text-white font-bold">
                        {(extractedData.lotes || []).reduce((sum, lote) => {
                          return sum + (lote.produtos || []).reduce((pSum, p) => pSum + (p.quantidade || 1), 0);
                        }, 0)} unidades
                      </span>
                    </div>
                    <div className="bg-green-900/30 border border-green-600/50 rounded p-2 mt-3">
                      <p className="text-green-400 font-bold text-center">
                        💰 Custo Unitário: R$ {(() => {
                          const total = (extractedData.valor_total || 0) + (freteValue || 0);
                          const qtd = (extractedData.lotes || []).reduce((sum, lote) => {
                            return sum + (lote.produtos || []).reduce((pSum, p) => pSum + (p.quantidade || 1), 0);
                          }, 0);
                          return qtd > 0 ? (total / qtd).toFixed(2) : '0.00';
                        })()}
                      </p>
                    </div>
                  </div>

                  {/* LOTES */}
                  <h4 className="text-gray-300 font-semibold text-sm mb-2">Lotes:</h4>
                  {(extractedData.lotes || []).map((lote, idx) => {
                    const totalProdutosLote = (lote.produtos || []).reduce((sum, p) => sum + (p.quantidade || 1), 0);
                    return (
                      <div key={idx} className="bg-gray-800 rounded p-3 border border-gray-700">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-white font-semibold">Lote {lote.numero_lote || 'N/A'}</p>
                            <p className="text-gray-400 text-xs">{totalProdutosLote} produtos</p>
                          </div>
                          <Badge variant="outline" className="text-blue-400 border-blue-400">
                            R$ {(lote.valor_lote || 0).toFixed(2)}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          {(lote.produtos || []).map((prod, pIdx) => (
                            <div key={pIdx} className="text-xs text-gray-400 flex justify-between">
                              <span>{prod.descricao || 'Sem descrição'}</span>
                              <span>Qtd: {prod.quantidade || 1}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleConfirmImport}
                    disabled={isProcessing}
                    className="bg-green-600 hover:bg-green-700 flex-1"
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
                      setShowFreteModal(false);
                      setExtractedData(null);
                      setFreteValue(0);
                    }}
                    disabled={isProcessing}
                    variant="outline"
                    className="border-gray-600 text-gray-300"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}