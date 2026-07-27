import React, { useState, useEffect } from 'react';
import { fmtBR } from '@/lib/money';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Package, X, ArrowLeft, Plus,
  Eye, Trash2, ShoppingCart, CheckCircle, Store, Gavel, Loader2, PackagePlus,
  Paperclip, Boxes, Inbox
} from 'lucide-react';
import { gerarProdutosDoLote } from '@/functions/gerarProdutosDoLote';
import AnalisadorLoteInline from '@/components/lotes/AnalisadorLoteInline';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const MARKETPLACES = [
  'Mercado Livre', 'Shopee', 'Magazine Luiza', 'Casas Bahia', 'Extra',
  'Amazon', 'Americanas', 'Submarino', 'Netshoes', 'Dafiti', 'OLX', 'Outros'
];

// Sem emoji: cada marketplace é identificado por cor no ícone padrão (regra do super admin)
const MARKETPLACE_COLORS = {
  'Mercado Livre': 'text-yellow-400',
  'Shopee': 'text-orange-400',
  'Magazine Luiza': 'text-blue-400',
  'Casas Bahia': 'text-red-400',
  'Extra': 'text-green-400',
  'Amazon': 'text-amber-600',
  'Americanas': 'text-rose-400',
  'Submarino': 'text-sky-400',
  'Netshoes': 'text-lime-400',
  'Dafiti': 'text-fuchsia-400',
  'OLX': 'text-purple-400',
  'Outros': 'text-gray-400',
};

const STATUS_CONFIG = {
  recebido: { label: 'Recebido', color: 'bg-blue-600', next: 'comprado', nextLabel: 'Marcar como Comprado' },
  comprado: { label: 'Comprado', color: 'bg-yellow-600', next: 'enviado_ao_estoque', nextLabel: 'Enviar ao Estoque' },
  enviado_ao_estoque: { label: 'No Estoque', color: 'bg-green-600', next: null, nextLabel: null },
};

export default function EstoqueLotes() {
  const [lotes, setLotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroMarketplace, setFiltroMarketplace] = useState('todos');
  const [arrematarLote, setArrematarLote] = useState(null); // lote em processo de arremate
  const [arrematarForm, setArrematarForm] = useState({ valorArremate: '', taxaPct: 7, frete: 1000, outros: 0 });
  const [isSavingArremate, setIsSavingArremate] = useState(false);

  const [form, setForm] = useState({
    nome_lote: '',
    marketplace: '',
    valor_lote: 0,
    observacoes: '',
  });

  const navigate = useNavigate();

  useEffect(() => { loadLotes(); }, []);

  const loadLotes = async () => {
    setIsLoading(true);
    try {
      const data = await base44.entities.LoteRecebido.list('-created_date', 100);
      setLotes(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.nome_lote || !form.marketplace) {
      alert('Informe o nome do lote e o marketplace.');
      return;
    }
    try {
      await base44.entities.LoteRecebido.create({
        ...form,
        data_recebimento: new Date().toISOString(),
        status: 'recebido',
      });
      setShowModal(false);
      setForm({ nome_lote: '', marketplace: '', valor_lote: 0, observacoes: '' });
      await loadLotes();
    } catch (e) {
      alert('Erro ao salvar: ' + e.message);
    }
  };

  const handleAvançarStatus = async (lote) => {
    const cfg = STATUS_CONFIG[lote.status];
    if (!cfg?.next) return;
    try {
      await base44.entities.LoteRecebido.update(lote.id, { status: cfg.next });
      await loadLotes();
    } catch (e) {
      alert('Erro: ' + e.message);
    }
  };

  const handleConfirmarArremate = async () => {
    if (!arrematarLote) return;
    const valorArremate = parseFloat(arrematarForm.valorArremate) || 0;
    if (!valorArremate) { alert('Informe o valor de arremate.'); return; }
    const taxaValor = valorArremate * (arrematarForm.taxaPct / 100);
    const custoTotal = valorArremate + taxaValor + arrematarForm.frete + arrematarForm.outros;
    setIsSavingArremate(true);
    try {
      await base44.entities.LoteRecebido.update(arrematarLote.id, {
        status: 'comprado',
        valor_lote: custoTotal,
        observacoes: `Arremate: R$ ${fmtBR(valorArremate)} | Taxa: ${arrematarForm.taxaPct}% (R$ ${fmtBR(taxaValor)}) | Frete: R$ ${arrematarForm.frete} | Outros: R$ ${arrematarForm.outros} | Custo Total: R$ ${fmtBR(custoTotal)}\n${arrematarLote.observacoes || ''}`,
      });
      setArrematarLote(null);
      setArrematarForm({ valorArremate: '', taxaPct: 7, frete: 1000, outros: 0 });
      await loadLotes();
    } catch (e) {
      alert('Erro: ' + e.message);
    } finally {
      setIsSavingArremate(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Excluir este lote?')) return;
    try {
      await base44.entities.LoteRecebido.delete(id);
      await loadLotes();
    } catch (e) {
      alert('Erro: ' + e.message);
    }
  };

  const handleGerarProdutos = async (lote) => {
    if (!lote.itens_json) {
      alert('Este lote não possui itens detalhados salvos. Só é possível gerar produtos em lotes importados via planilha.');
      return;
    }
    const qtd = lote.quantidade_total || 0;
    const jaGerados = lote.produtos_gerados_count || 0;
    const msgRetomada = jaGerados > 0 && !lote.produtos_gerados
      ? `\n\nATENÇÃO: Este lote já tem ${jaGerados} produtos criados anteriormente. Esta ação vai retomar e criar apenas os que faltam (não duplica).`
      : '';
    const confirmacao = confirm(
      `Gerar produtos no estoque para o lote "${lote.nome_lote}"?\n\n` +
      `• Quantidade total: ${qtd} unidades\n` +
      `• Custo total do lote: R$ ${fmtBR((lote.valor_lote || 0))}\n` +
      `• Custo unitário médio: R$ ${qtd > 0 ? ((lote.valor_lote || 0) / qtd).toFixed(2) : '0.00'}\n` +
      `• Depósito destino: ${lote.deposito_destino || 'Bangu'}${msgRetomada}\n\n` +
      `Esta ação cria os produtos na "Posição de Estoque".`
    );
    if (!confirmacao) return;
    try {
      const res = await gerarProdutosDoLote({ lote_id: lote.id });
      const data = res?.data || res;
      if (data?.status === 'success' || data?.status === 'partial') {
        const msg = data.mensagem || `${data.produtos_criados} produtos criados.`;
        alert(`${data.status === 'success' ? '' : ''} ${msg}\n\nCriados agora: ${data.produtos_criados}\nJá existiam: ${data.ja_existentes || 0}\nTotal no lote: ${data.total_acumulado || data.produtos_criados}\nCusto unitário: R$ ${fmtBR(data.custo_unitario_medio)}`);
        await loadLotes();
      } else {
        alert(`Erro: ${data?.error || 'Resposta inesperada'}`);
      }
    } catch (e) {
      alert(`Erro ao gerar produtos: ${e.message}`);
    }
  };

  const lotesFiltrados = lotes.filter(l => {
    if (filtroStatus !== 'todos' && l.status !== filtroStatus) return false;
    if (filtroMarketplace !== 'todos' && l.marketplace !== filtroMarketplace) return false;
    return true;
  });

  const contadores = {
    recebido: lotes.filter(l => l.status === 'recebido').length,
    comprado: lotes.filter(l => l.status === 'comprado').length,
    enviado_ao_estoque: lotes.filter(l => l.status === 'enviado_ao_estoque').length,
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl('RegisterBatches'))}
              className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2"><Boxes className="w-7 h-7 text-blue-400" />Estoque de Lotes Recebidos</h1>
          </div>
          <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Lote Manual
          </Button>
        </div>

        {/* ANALISADOR INLINE */}
        <AnalisadorLoteInline onEnviado={loadLotes} />

        {/* CARDS DE STATUS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            { key: 'recebido', label: 'Recebidos', icon: Package, color: 'text-blue-400', borderActive: 'ring-blue-500 border-blue-500' },
            { key: 'comprado', label: 'Comprados', icon: ShoppingCart, color: 'text-yellow-400', borderActive: 'ring-yellow-500 border-yellow-500' },
            { key: 'enviado_ao_estoque', label: 'No Estoque', icon: CheckCircle, color: 'text-green-400', borderActive: 'ring-green-500 border-green-500' },
          ].map(({ key, label, icon: Icon, color, borderActive }) => (
            <Card
              key={key}
              onClick={() => setFiltroStatus(filtroStatus === key ? 'todos' : key)}
              className={`cursor-pointer transition-all bg-gray-800 border-gray-700 hover:bg-gray-750 ${filtroStatus === key ? `ring-2 ${borderActive}` : ''}`}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{contadores[key]}</p>
                </div>
                <Icon className={`w-8 h-8 ${color}`} />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FILTRO MARKETPLACE */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setFiltroMarketplace('todos')}
            className={`px-3 py-1 rounded-full text-sm font-semibold transition-all ${filtroMarketplace === 'todos' ? 'bg-white text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            Todos
          </button>
          {MARKETPLACES.map(mp => (
            <button
              key={mp}
              onClick={() => setFiltroMarketplace(filtroMarketplace === mp ? 'todos' : mp)}
              className={`px-3 py-1 rounded-full text-sm font-semibold transition-all ${filtroMarketplace === mp ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              <span className="inline-flex items-center gap-1.5">
                <Store className={`w-3.5 h-3.5 ${MARKETPLACE_COLORS[mp] || 'text-gray-400'}`} />
                {mp}
              </span>
            </button>
          ))}
        </div>

        {/* LISTA */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
          </div>
        ) : lotesFiltrados.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-12 text-center">
              <Store className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400">Nenhum lote encontrado.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {lotesFiltrados.map(lote => {
              const cfg = STATUS_CONFIG[lote.status] || STATUS_CONFIG.recebido;
              return (
                <Card key={lote.id} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Store className={`w-4 h-4 ${MARKETPLACE_COLORS[lote.marketplace] || 'text-gray-400'}`} />
                          <h3 className="text-white font-bold text-base">{lote.nome_lote}</h3>
                          <Badge className={cfg.color}>{cfg.label}</Badge>
                          <Badge variant="outline" className="text-gray-300 border-gray-600 text-xs">{lote.marketplace}</Badge>
                        </div>
                        {lote.valor_lote > 0 && (
                          <p className="text-green-400 text-sm font-semibold">R$ {fmtBR(lote.valor_lote)}</p>
                        )}
                        {lote.observacoes && (
                          <p className="text-gray-400 text-xs mt-1">{lote.observacoes}</p>
                        )}
                        {lote.arquivo_nome && (
                          <p className="text-gray-500 text-xs mt-1 flex items-center gap-1"><Paperclip className="w-3 h-3" />{lote.arquivo_nome}</p>
                        )}
                        <p className="text-gray-600 text-xs mt-1">
                          {lote.data_recebimento ? new Date(lote.data_recebimento).toLocaleDateString('pt-BR') : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Ver arquivo */}
                        {lote.arquivo_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(lote.arquivo_url, '_blank')}
                            className="border-purple-600 text-purple-400 hover:bg-purple-900/20"
                            title="Visualizar Arquivo"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}

                        {/* Botão Arrematamos — apenas para lotes recebidos */}
                        {lote.status === 'recebido' && (
                          <Button
                            size="sm"
                            onClick={() => { setArrematarLote(lote); setArrematarForm({ valorArremate: lote.valor_lote ? String(lote.valor_lote) : '', taxaPct: 7, frete: 1000, outros: 0 }); }}
                            className="bg-amber-600 hover:bg-amber-500 font-bold"
                          >
                            <Gavel className="w-4 h-4 mr-1" /> Arrematamos
                          </Button>
                        )}

                        {/* Avançar status */}
                        {lote.status === 'comprado' && cfg.next && (
                          <Button
                            size="sm"
                            onClick={() => handleAvançarStatus(lote)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {cfg.nextLabel}
                          </Button>
                        )}

                        {/* Gerar Produtos no Estoque — só para lotes 'enviado_ao_estoque' com itens salvos e ainda não completos */}
                        {lote.status === 'enviado_ao_estoque' && lote.itens_json && !lote.produtos_gerados && (
                          <Button
                            size="sm"
                            onClick={() => handleGerarProdutos(lote)}
                            className="bg-emerald-600 hover:bg-emerald-500 font-bold"
                            title={lote.produtos_gerados_count > 0 ? `Retomar geração (${lote.produtos_gerados_count} já criados)` : 'Gera os produtos individuais na Posição de Estoque'}
                          >
                            <PackagePlus className="w-4 h-4 mr-1" />
                            {lote.produtos_gerados_count > 0 ? 'Retomar Geração' : 'Gerar Produtos no Estoque'}
                          </Button>
                        )}

                        {/* Badge: já gerou produtos completo */}
                        {lote.produtos_gerados && (
                          <Badge className="bg-emerald-700 text-white">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {lote.produtos_gerados_count} produtos no estoque
                          </Badge>
                        )}

                        {/* Excluir */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(lote.id)}
                          className="border-red-600 text-red-400 hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL ARREMATAMOS */}
      {arrematarLote && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <Card className="bg-gray-800 border-amber-700/50 max-w-md w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2"><Gavel className="text-amber-400 w-5 h-5" /> Registrar Arremate</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setArrematarLote(null)} className="border-gray-600 text-gray-400"><X className="w-4 h-4" /></Button>
              </div>
              <p className="text-gray-400 text-sm mt-1">{arrematarLote.nome_lote}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-gray-300 text-sm font-semibold block mb-1">Valor de Arremate (R$) *</label>
                <Input type="number" step="0.01" value={arrematarForm.valorArremate}
                  onChange={(e) => setArrematarForm(f => ({ ...f, valorArremate: e.target.value }))}
                  className="bg-gray-700 text-white border-gray-600" placeholder="0.00" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 text-sm font-semibold block mb-1">Taxa de Leilão (%)</label>
                  <Input type="number" value={arrematarForm.taxaPct}
                    onChange={(e) => setArrematarForm(f => ({ ...f, taxaPct: Number(e.target.value) }))}
                    className="bg-gray-700 text-white border-gray-600" />
                </div>
                <div>
                  <label className="text-gray-300 text-sm font-semibold block mb-1">Frete (R$)</label>
                  <Input type="number" value={arrematarForm.frete}
                    onChange={(e) => setArrematarForm(f => ({ ...f, frete: Number(e.target.value) }))}
                    className="bg-gray-700 text-white border-gray-600" />
                </div>
              </div>
              <div>
                <label className="text-gray-300 text-sm font-semibold block mb-1">Outros Custos (R$)</label>
                <Input type="number" value={arrematarForm.outros}
                  onChange={(e) => setArrematarForm(f => ({ ...f, outros: Number(e.target.value) }))}
                  className="bg-gray-700 text-white border-gray-600" />
              </div>
              {arrematarForm.valorArremate && (
                <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg p-3">
                  <div className="flex justify-between text-sm text-gray-300 mb-1">
                    <span>Arremate</span><span>R$ {fmtBR(parseFloat(arrematarForm.valorArremate || 0))}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-300 mb-1">
                    <span>Taxa ({arrematarForm.taxaPct}%)</span><span>R$ {fmtBR((parseFloat(arrematarForm.valorArremate || 0) * arrematarForm.taxaPct / 100))}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-300 mb-1">
                    <span>Frete</span><span>R$ {fmtBR(arrematarForm.frete)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-amber-300 border-t border-amber-700/40 pt-2 mt-1">
                    <span>CUSTO TOTAL</span>
                    <span>R$ {fmtBR((parseFloat(arrematarForm.valorArremate || 0) + parseFloat(arrematarForm.valorArremate || 0) * arrematarForm.taxaPct / 100 + arrematarForm.frete + arrematarForm.outros))}</span>
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button onClick={handleConfirmarArremate} disabled={isSavingArremate} className="bg-amber-600 hover:bg-amber-500 flex-1 font-bold">
                  <Gavel className="w-4 h-4 mr-2" />
                  {isSavingArremate ? 'Salvando...' : 'Confirmar Arremate'}
                </Button>
                <Button variant="outline" onClick={() => setArrematarLote(null)} className="border-gray-600 text-gray-300">Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL ADICIONAR LOTE */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <Card className="bg-gray-800 border-gray-700 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2"><Inbox className="w-5 h-5" />Adicionar Lote Recebido</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowModal(false)} className="border-gray-600 text-gray-400">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* FORMULÁRIO */}
              <div>
                <label className="text-gray-300 text-sm mb-1 block font-semibold">Nome do Lote *</label>
                <Input
                  value={form.nome_lote}
                  onChange={(e) => setForm(f => ({ ...f, nome_lote: e.target.value }))}
                  className="bg-gray-700 text-white"
                  placeholder="Ex: Lote Eletronicos Março 01"
                />
              </div>

              <div>
                <label className="text-gray-300 text-sm mb-1 block font-semibold">Marketplace de Origem *</label>
                <div className="grid grid-cols-2 gap-2">
                  {MARKETPLACES.map(mp => (
                    <button
                      key={mp}
                      onClick={() => setForm(f => ({ ...f, marketplace: mp }))}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold text-left transition-all ${form.marketplace === mp ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Store className={`w-3.5 h-3.5 ${MARKETPLACE_COLORS[mp] || 'text-gray-400'}`} />
                        {mp}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-gray-300 text-sm mb-1 block font-semibold">Valor do Lote (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.valor_lote}
                  onChange={(e) => setForm(f => ({ ...f, valor_lote: parseFloat(e.target.value) || 0 }))}
                  className="bg-gray-700 text-white"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="text-gray-300 text-sm mb-1 block font-semibold">Observações</label>
                <textarea
                  value={form.observacoes}
                  onChange={(e) => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-md p-2 text-sm resize-none"
                  rows={2}
                  placeholder="Detalhes adicionais..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 flex-1">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Salvar no Estoque
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setShowModal(false); setForm({ nome_lote: '', marketplace: '', valor_lote: 0, observacoes: '' }); }}
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
  );
}