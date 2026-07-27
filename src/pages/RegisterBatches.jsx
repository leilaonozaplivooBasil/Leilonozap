import React, { useState, useEffect } from 'react';
import { fmtBR } from '@/lib/money';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, CheckCircle, X, Trash2, Save, Plus, ArrowLeft,
  Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { brDateTimeToISOString, isoToBRLocalInput, nowBRLocalInput } from '@/components/utils/date';
import BatchCard from '@/components/batches/BatchCard';
import BatchLoteDetail from '@/components/batches/BatchLoteDetail';
import LoteAnalysisView from '@/components/lotes/LoteAnalysisView';

export default function RegisterBatches() {
  const [batches, setBatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [showFreteModal, setShowFreteModal] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [freteValue, setFreteValue] = useState(0);
  const [expandedBatches, setExpandedBatches] = useState({});
  const [showManualModal, setShowManualModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [editFreteValue, setEditFreteValue] = useState(0);
  const [manualFreteValue, setManualFreteValue] = useState(0);
  const [manualDataLancamento, setManualDataLancamento] = useState(() => nowBRLocalInput());
  const [editDataLancamento, setEditDataLancamento] = useState('');
  const [manualBatch, setManualBatch] = useState({
    numero_leilao: '',
    nome_origem: '',
    valor_total: 0,
    lotes: [{
      numero_lote: '',
      valor_lote: 0,
      produtos: [{ codigo: '', descricao: '', variacao: '', quantidade: 1 }]
    }]
  });
  const [lotesStatus, setLotesStatus] = useState({});
  const navigate = useNavigate();

  const [lotesRecebidos, setLotesRecebidos] = useState([]);

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    try {
      const [allBatches, allLotes] = await Promise.all([
        base44.entities.BatchRegistration.list('-created_date', 100),
        base44.entities.LoteRecebido.filter({ status: 'enviado_ao_estoque' })
      ]);
      setBatches(allBatches);
      setLotesRecebidos(allLotes || []);

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
    const cacheKey = 'lotes_status_cache_v2';
    const cacheTimeKey = 'lotes_status_cache_time_v2';
    // Limpa cache antigo v1
    sessionStorage.removeItem('lotes_status_cache');
    sessionStorage.removeItem('lotes_status_cache_time');
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
          const foundQty = productsInStock.reduce((sum, p) => sum + (p.quantity || 0) + (p.quantity_sold || 0), 0);
          
          statusMap[loteKey] = {
            expected: expectedCount,
            found: foundQty,
            missing: Math.max(0, expectedCount - foundQty),
            complete: foundQty >= expectedCount
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

      const isSpreadsheet = file.name.toLowerCase().match(/\.(xlsx|xls|csv)$/);
      setProgress(isSpreadsheet ? '🤖 Extraindo dados da planilha...' : '🤖 Extraindo dados da nota fiscal...');

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
        recibo_url: extractedData.recibo_url,
        data_lancamento: new Date().toISOString()
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

  const handleConvertToProducts = async (batch) => {
    setIsProcessing(true);
    setProgress('🔄 Convertendo produtos para estoque...');
    
    try {
      // Agrupa produtos por nome dentro de cada lote
      const produtosAgrupados = {};
      
      (batch.lotes || []).forEach((lote) => {
        (lote.produtos || []).forEach((produto) => {
          const nomeCompleto = produto.descricao || `Produto ${produto.codigo || 'N/A'}`;
          const chave = `${lote.numero_lote}_${nomeCompleto}`;
          
          if (produtosAgrupados[chave]) {
            // Soma quantidade ao produto existente
            produtosAgrupados[chave].quantidade += (produto.quantidade || 1);
            produtosAgrupados[chave].cost_price += (batch.custo_por_unidade || 0) * (produto.quantidade || 1);
          } else {
            // Cria novo grupo
            produtosAgrupados[chave] = {
              date: batch.data_lancamento ? new Date(batch.data_lancamento).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              lot: lote.numero_lote,
              description: nomeCompleto,
              quantidade: produto.quantidade || 1,
              cost_price: (batch.custo_por_unidade || 0) * (produto.quantidade || 1),
              selling_price_retail: 0,
              selling_price_wholesale: 0,
              status: 'ESTOQUE',
              purchase_order: batch.numero_leilao
            };
          }
        });
      });

      // Cria produtos agrupados
      let totalCriados = 0;
      for (const chave in produtosAgrupados) {
        const prod = produtosAgrupados[chave];
        await base44.entities.Product.create({
          date: prod.date,
          lot: prod.lot,
          description: prod.description,
          quantity: prod.quantidade,
          cost_price: prod.cost_price,
          selling_price_retail: prod.selling_price_retail,
          selling_price_wholesale: prod.selling_price_wholesale,
          status: prod.status,
          purchase_order: prod.purchase_order
        });
        totalCriados++;
      }

      // Atualiza o batch para "convertido"
      await base44.entities.BatchRegistration.update(batch.id, {
        status: 'convertido'
      });

      setProgress('');
      setIsProcessing(false);
      alert(`✅ ${totalCriados} produtos agrupados adicionados ao estoque!`);
      await loadBatches();
      
    } catch (error) {
      console.error('❌ Erro ao converter:', error);
      alert(`❌ Erro: ${error.message}`);
      setProgress('');
      setIsProcessing(false);
    }
  };

  const handleConvertSingleLot = async (batch, loteIndex) => {
    setIsProcessing(true);
    setProgress('🔄 Lançando lote no estoque...');
    
    try {
      const lote = batch.lotes[loteIndex];
      
      // Agrupa produtos por nome
      const produtosAgrupados = {};
      
      (lote.produtos || []).forEach((produto) => {
        const nomeCompleto = produto.descricao || `Produto ${produto.codigo || 'N/A'}`;
        
        if (produtosAgrupados[nomeCompleto]) {
          // Soma quantidade ao produto existente
          produtosAgrupados[nomeCompleto].quantidade += (produto.quantidade || 1);
          produtosAgrupados[nomeCompleto].cost_price += (batch.custo_por_unidade || 0) * (produto.quantidade || 1);
        } else {
          // Cria novo grupo
          produtosAgrupados[nomeCompleto] = {
            date: batch.data_lancamento ? new Date(batch.data_lancamento).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            lot: lote.numero_lote,
            description: nomeCompleto,
            quantidade: produto.quantidade || 1,
            cost_price: (batch.custo_por_unidade || 0) * (produto.quantidade || 1),
            selling_price_retail: 0,
            selling_price_wholesale: 0,
            status: 'ESTOQUE',
            purchase_order: batch.numero_leilao
          };
        }
      });

      // Cria produtos agrupados
      let totalCriados = 0;
      for (const nome in produtosAgrupados) {
        const prod = produtosAgrupados[nome];
        await base44.entities.Product.create({
          date: prod.date,
          lot: prod.lot,
          description: prod.description,
          quantity: prod.quantidade,
          cost_price: prod.cost_price,
          selling_price_retail: prod.selling_price_retail,
          selling_price_wholesale: prod.selling_price_wholesale,
          status: prod.status,
          purchase_order: prod.purchase_order
        });
        totalCriados++;
      }

      // Recarrega o cache de status
      await checkLotesStatus([batch]);

      setProgress('');
      setIsProcessing(false);
      alert(`✅ ${totalCriados} produtos agrupados do lote adicionados ao estoque!`);
      await loadBatches();
    } catch (error) {
      console.error('❌ Erro ao lançar lote:', error);
      alert(`❌ Erro: ${error.message}`);
      setProgress('');
      setIsProcessing(false);
    }
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
        nome_origem: manualBatch.nome_origem || '',
        lotes: manualBatch.lotes,
        valor_total: valorComFrete,
        frete_value: manualFreteValue || 0,
        total_produtos: totalProdutosGlobal,
        custo_por_unidade: custoPorUnidade,
        status: 'pendente',
        data_lancamento: manualDataLancamento ? brDateTimeToISOString(manualDataLancamento) : new Date().toISOString()
      });

      alert(`✅ Leilão ${manualBatch.numero_leilao} registrado com ${manualBatch.lotes.length} lotes!`);
      setShowManualModal(false);
      setManualFreteValue(0);
      setManualBatch({
        numero_leilao: '',
        nome_origem: '',
        valor_total: 0,
        lotes: [{
          numero_lote: '',
          valor_lote: 0,
          produtos: [{ codigo: '', descricao: '', variacao: '', quantidade: 1 }]
        }]
      });
      setManualDataLancamento(nowBRLocalInput());
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
        produtos: [{ codigo: '', descricao: '', variacao: '', quantidade: 1 }]
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
    newLotes[loteIdx].produtos.push({ codigo: '', descricao: '', variacao: '', quantidade: 1 });
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
      nome_origem: batch.nome_origem || '',
      valor_total: batch.valor_total - (batch.frete_value || 0),
      lotes: batch.lotes || [{
        numero_lote: '',
        valor_lote: 0,
        produtos: [{ codigo: '', descricao: '', variacao: '', quantidade: 1 }]
      }]
    });
    setEditDataLancamento(
      batch.data_lancamento ? isoToBRLocalInput(batch.data_lancamento) : nowBRLocalInput()
    );
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
        nome_origem: manualBatch.nome_origem || '',
        lotes: manualBatch.lotes,
        valor_total: valorComFrete,
        frete_value: editFreteValue || 0,
        total_produtos: totalProdutosGlobal,
        custo_por_unidade: custoPorUnidade,
        data_lancamento: editDataLancamento ? brDateTimeToISOString(editDataLancamento) : (editingBatch.data_lancamento || new Date().toISOString())
      });

      alert(`✅ Leilão ${manualBatch.numero_leilao} atualizado!`);
      setShowEditModal(false);
      setEditingBatch(null);
      setEditFreteValue(0);
      setManualBatch({
        numero_leilao: '',
        nome_origem: '',
        valor_total: 0,
        lotes: [{
          numero_lote: '',
          valor_lote: 0,
          produtos: [{ codigo: '', descricao: '', variacao: '', quantidade: 1 }]
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
  const totalArrematados = batches.length + lotesRecebidos.length;
  const totalConvertidos = convertedBatches.length + lotesRecebidos.length;
  
  let filteredBatches = statusFilter === 'all' 
    ? batches 
    : batches.filter(b => b.status === statusFilter);

  if (dateStart) {
    const start = new Date(brDateTimeToISOString(`${dateStart}T00:00`));
    filteredBatches = filteredBatches.filter(b => b.data_lancamento && new Date(b.data_lancamento) >= start);
  }
  if (dateEnd) {
    const end = new Date(brDateTimeToISOString(`${dateEnd}T23:59`));
    filteredBatches = filteredBatches.filter(b => b.data_lancamento && new Date(b.data_lancamento) <= end);
  }

  // Ordenação: mais recente primeiro
  filteredBatches = [...filteredBatches].sort((a, b) => {
    const dateA = a.data_lancamento ? new Date(a.data_lancamento) : new Date(a.created_date || 0);
    const dateB = b.data_lancamento ? new Date(b.data_lancamento) : new Date(b.created_date || 0);
    return dateB - dateA;
  });

  // Lotes recebidos também ordenados por mais recente primeiro
  const sortedLotesRecebidos = [...lotesRecebidos].sort((a, b) => {
    const dateA = a.data_recebimento ? new Date(a.data_recebimento) : new Date(a.created_date || 0);
    const dateB = b.data_recebimento ? new Date(b.data_recebimento) : new Date(b.created_date || 0);
    return dateB - dateA;
  });

  return (
    <div className="min-h-screen bg-gray-950 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(createPageUrl("ProductManagement"))}
              className="text-gray-400 hover:text-white hover:bg-gray-800 h-9 w-9 p-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">Leilões Arrematados</h1>
              <p className="text-xs text-gray-500 mt-0.5">Controle de lotes arrematados e importados</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => navigate(createPageUrl('EstoqueLotes'))}
              className="bg-blue-600/90 hover:bg-blue-600 text-white border-0 h-9"
            >
              <Package className="w-3.5 h-3.5 mr-1.5" />
              Estoque de Lotes
            </Button>
            <Button
              size="sm"
              onClick={() => setShowManualModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 h-9"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Registrar Manual
            </Button>
          </div>
        </div>

        {/* Upload removido — lotes são registrados manualmente ou via EstoqueLotes */}

        {/* ESTATÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <button
            onClick={() => setStatusFilter('all')}
            className={`rounded-2xl border p-4 text-left transition-all duration-200 ${
              statusFilter === 'all' 
                ? 'border-blue-500/50 ring-1 ring-blue-500/30' 
                : 'bg-gray-800/60 border-gray-700/50 hover:bg-gray-800 hover:border-gray-600'
            }`}
            style={statusFilter === 'all' ? { background: 'linear-gradient(135deg, rgba(59,130,246,0.08), transparent)' } : {}}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Total Arrematados</p>
                <p className={`text-3xl font-bold ${statusFilter === 'all' ? 'text-blue-400' : 'text-white'}`}>{totalArrematados}</p>
              </div>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-blue-500/15 border border-blue-500/25">
                <Package className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </button>
          <button
            onClick={() => setStatusFilter('pendente')}
            className={`rounded-2xl border p-4 text-left transition-all duration-200 ${
              statusFilter === 'pendente' 
                ? 'border-amber-500/50 ring-1 ring-amber-500/30' 
                : 'bg-gray-800/60 border-gray-700/50 hover:bg-gray-800 hover:border-gray-600'
            }`}
            style={statusFilter === 'pendente' ? { background: 'linear-gradient(135deg, rgba(245,158,11,0.08), transparent)' } : {}}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Pendentes</p>
                <p className={`text-3xl font-bold ${statusFilter === 'pendente' ? 'text-amber-400' : 'text-white'}`}>{pendingBatches.length}</p>
              </div>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-amber-500/15 border border-amber-500/25">
                <Package className="w-5 h-5 text-amber-400" />
              </div>
            </div>
          </button>
          <button
            onClick={() => setStatusFilter('convertido')}
            className={`rounded-2xl border p-4 text-left transition-all duration-200 ${
              statusFilter === 'convertido' 
                ? 'border-emerald-500/50 ring-1 ring-emerald-500/30' 
                : 'bg-gray-800/60 border-gray-700/50 hover:bg-gray-800 hover:border-gray-600'
            }`}
            style={statusFilter === 'convertido' ? { background: 'linear-gradient(135deg, rgba(16,185,129,0.08), transparent)' } : {}}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">No Estoque</p>
                <p className={`text-3xl font-bold ${statusFilter === 'convertido' ? 'text-emerald-400' : 'text-white'}`}>{totalConvertidos}</p>
              </div>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-emerald-500/15 border border-emerald-500/25">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
          </button>
        </div>

        {/* FILTRO POR DATA */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-5 px-1">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-gray-400 text-xs whitespace-nowrap">De:</span>
            <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="bg-gray-800 border-gray-700 text-white h-9 text-sm" />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-gray-400 text-xs whitespace-nowrap">Até:</span>
            <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="bg-gray-800 border-gray-700 text-white h-9 text-sm" />
          </div>
          {(dateStart || dateEnd) && (
            <Button variant="ghost" size="sm" onClick={() => { setDateStart(''); setDateEnd(''); }} className="text-gray-400 hover:text-white text-xs h-8">
              <X className="w-3.5 h-3.5 mr-1" /> Limpar
            </Button>
          )}
        </div>

        {/* LISTA UNIFICADA — BatchRegistrations + LotesRecebidos, ordenados por data decrescente */}
        <div className="space-y-3">
          {(() => {
            // Monta lista unificada
            const unified = [];

            // BatchRegistrations filtrados
            filteredBatches.forEach((batch) => {
              unified.push({
                type: 'batch',
                sortDate: batch.data_lancamento ? new Date(batch.data_lancamento) : new Date(batch.created_date || 0),
                data: batch,
              });
            });

            // LotesRecebidos (só se filtro permite)
            if (statusFilter === 'all' || statusFilter === 'convertido') {
              sortedLotesRecebidos.forEach((lote) => {
                unified.push({
                  type: 'lote',
                  sortDate: lote.data_recebimento ? new Date(lote.data_recebimento) : new Date(lote.created_date || 0),
                  data: lote,
                });
              });
            }

            // Ordena tudo por data decrescente (mais recente primeiro)
            unified.sort((a, b) => b.sortDate - a.sortDate);

            return unified.map((item) => {
              if (item.type === 'batch') {
                const batch = item.data;
                const isExpanded = expandedBatches[batch.id];
                const origem = batch.recibo_url 
                  ? (batch.recibo_url.match(/\.(xlsx|xls|csv)/i) ? 'planilha' : 'nota_fiscal')
                  : 'manual';
                return (
                  <BatchCard
                    key={batch.id}
                    title={batch.nome_origem || `Leilão #${batch.numero_leilao}`}
                    status={batch.status}
                    totalProdutos={batch.total_produtos}
                    valorTotal={batch.valor_total}
                    custoUnitario={batch.custo_por_unidade}
                    date={batch.data_lancamento}
                    dateLabel="Lançado em"
                    origem={origem}
                    lotesCount={batch.lotes?.length}
                    arquivoUrl={batch.recibo_url}
                    arquivoNome="Nota Fiscal / Planilha"
                    isExpanded={isExpanded}
                    onExpand={() => toggleBatchExpanded(batch.id)}
                    onEdit={() => handleEditBatch(batch)}
                    onDelete={() => handleDeleteBatch(batch.id)}
                    onConvert={batch.status === 'pendente' ? () => handleConvertToProducts(batch) : undefined}
                    onViewFile={batch.recibo_url ? () => window.open(batch.recibo_url, '_blank') : undefined}
                    onRename={async (newName) => {
                      await base44.entities.BatchRegistration.update(batch.id, { nome_origem: newName });
                      await loadBatches();
                    }}
                    expandedContent={
                      <div className="space-y-3">
                        {batch.lotes?.map((lote, loteIdx) => (
                          <BatchLoteDetail
                            key={loteIdx}
                            lote={lote}
                            loteIndex={loteIdx}
                            batch={batch}
                            lotesStatus={lotesStatus}
                            onConvertSingleLot={handleConvertSingleLot}
                          />
                        ))}
                      </div>
                    }
                  />
                );
              } else {
                const lote = item.data;
                const isExpanded = expandedBatches[`lr-${lote.id}`];
                const custoUnit = (lote.valor_lote > 0 && lote.quantidade_total > 0) 
                  ? lote.valor_lote / lote.quantidade_total 
                  : 0;
                let itensLote = [];
                if (lote.itens_json) {
                  try { itensLote = JSON.parse(lote.itens_json); } catch {}
                }
                return (
                  <BatchCard
                    key={`lr-${lote.id}`}
                    title={lote.nome_lote}
                    status="estoque"
                    totalProdutos={lote.quantidade_total || 0}
                    valorTotal={lote.valor_lote || 0}
                    custoUnitario={custoUnit}
                    date={lote.data_recebimento}
                    dateLabel="Recebido em"
                    marketplace={lote.marketplace}
                    origem="estoque_lotes"
                    produtosNoEstoque={lote.produtos_gerados_count}
                    arquivoUrl={lote.arquivo_url}
                    arquivoNome={lote.arquivo_nome}
                    observacoes={lote.observacoes}
                    isExpanded={isExpanded}
                    onExpand={() => toggleBatchExpanded(`lr-${lote.id}`)}
                    onViewFile={lote.arquivo_url ? () => window.open(lote.arquivo_url, '_blank') : undefined}
                    expandedContent={<LoteAnalysisView lote={lote} />}
                  />
                );
              }
            });
          })()}

          {filteredBatches.length === 0 && lotesRecebidos.length === 0 && !isLoading && (
            <div className="rounded-2xl border border-gray-700/40 bg-gray-800/50 p-12 text-center">
              <Package className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400">
                {statusFilter === 'all' 
                  ? 'Nenhum leilão registrado ainda' 
                  : statusFilter === 'pendente'
                  ? 'Nenhum leilão pendente'
                  : 'Nenhum leilão convertido'}
              </p>
            </div>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    <label className="text-gray-300 text-sm mb-1 block font-semibold">Nome / Origem</label>
                    <Input
                      value={manualBatch.nome_origem}
                      onChange={(e) => setManualBatch({...manualBatch, nome_origem: e.target.value})}
                      className="bg-gray-700 text-white"
                      placeholder="Ex: Alcance Leilões, Casa & Vídeo..."
                    />
                  </div>
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

                <div>
                  <label className="text-gray-300 text-sm mb-1 block font-semibold">Data e Hora do Lançamento</label>
                  <Input
                    type="datetime-local"
                    value={editDataLancamento}
                    onChange={(e) => setEditDataLancamento(e.target.value)}
                    className="bg-gray-700 text-white"
                  />
                </div>

                <div className="bg-blue-900/20 border border-blue-500/30 rounded p-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Valor da Nota:</span>
                    <span className="text-white font-bold">R$ {fmtBR(manualBatch.valor_total)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">+ Frete:</span>
                    <span className="text-blue-400 font-bold">R$ {fmtBR((editFreteValue || 0))}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-blue-500/30">
                    <span className="text-white font-bold">Total com Frete:</span>
                    <span className="text-white font-bold">R$ {fmtBR((manualBatch.valor_total + (editFreteValue || 0)))}</span>
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
                                value={produto.variacao || ''}
                                onChange={(e) => {
                                  const newLotes = [...manualBatch.lotes];
                                  newLotes[loteIdx].produtos[prodIdx].variacao = e.target.value;
                                  setManualBatch({ ...manualBatch, lotes: newLotes });
                                }}
                                className="bg-gray-800 text-white w-28"
                                placeholder="Variação (ex: 2L)"
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
                      setEditDataLancamento('');
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    <label className="text-gray-300 text-sm mb-1 block font-semibold">Nome / Origem</label>
                    <Input
                      value={manualBatch.nome_origem}
                      onChange={(e) => setManualBatch({...manualBatch, nome_origem: e.target.value})}
                      className="bg-gray-700 text-white"
                      placeholder="Ex: Alcance Leilões, Casa & Vídeo..."
                    />
                  </div>
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

                <div>
                  <label className="text-gray-300 text-sm mb-1 block font-semibold">Data e Hora do Lançamento</label>
                  <Input
                    type="datetime-local"
                    value={manualDataLancamento}
                    onChange={(e) => setManualDataLancamento(e.target.value)}
                    className="bg-gray-700 text-white"
                  />
                </div>

                <div className="bg-blue-900/20 border border-blue-500/30 rounded p-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Valor da Nota:</span>
                    <span className="text-white font-bold">R$ {fmtBR(manualBatch.valor_total)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">+ Frete:</span>
                    <span className="text-blue-400 font-bold">R$ {fmtBR((manualFreteValue || 0))}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-blue-500/30">
                    <span className="text-white font-bold">Total com Frete:</span>
                    <span className="text-white font-bold">R$ {fmtBR((manualBatch.valor_total + (manualFreteValue || 0)))}</span>
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
                                value={produto.variacao || ''}
                                onChange={(e) => {
                                  const newLotes = [...manualBatch.lotes];
                                  newLotes[loteIdx].produtos[prodIdx].variacao = e.target.value;
                                  setManualBatch({ ...manualBatch, lotes: newLotes });
                                }}
                                className="bg-gray-800 text-white w-28"
                                placeholder="Variação (ex: 2L)"
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">💰 Informar Valor do Frete</CardTitle>
                    <p className="text-gray-400 text-sm">Digite o valor do frete para calcular o custo unitário correto</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setShowFreteModal(false); setExtractedData(null); setFreteValue(0); }}
                    className="border-gray-600 text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
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
                      <span className="text-white font-bold">R$ {fmtBR((extractedData.valor_total || 0))}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">+ Frete:</span>
                      <span className="text-blue-400 font-bold">R$ {fmtBR((freteValue || 0))}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-blue-500/30">
                      <span className="text-white font-bold">Total com Frete:</span>
                      <span className="text-white font-bold">R$ {fmtBR(((extractedData.valor_total || 0) + (freteValue || 0)))}</span>
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
                            R$ {fmtBR((lote.valor_lote || 0))}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          {(lote.produtos || []).map((prod, pIdx) => (
                            <div key={pIdx} className="text-xs text-gray-400 flex justify-between">
                              <span>{prod.codigo ? `(${prod.codigo}) ` : ''}{prod.descricao || 'Sem descrição'}{prod.variacao ? ` • ${prod.variacao}` : ''}</span>
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