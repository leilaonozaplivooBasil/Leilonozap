import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingBag, Package, ArrowLeft, Filter, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import AvaliarLojistaModal from '@/components/loja/AvaliarLojistaModal';
import { supabase } from '@/api/supabaseClient';

const CatalogSale = base44.entities.CatalogSale;

// Card + configs de status agora são COMPARTILHADOS com a aba "Meus Pedidos" do
// Profile (extraídos pra components/catalog/CatalogOrderCard.jsx em 25/07).
import CatalogOrderCard from '@/components/catalog/CatalogOrderCard';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function MyCatalogOrders() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeFilter, setActiveFilter] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const filterParam = urlParams.get('filter');
    if (filterParam === 'paid' || filterParam === 'pending_payment') return filterParam;
    return 'todos';
  });
  const navigate = useNavigate();

  const filteredOrders = useMemo(() => {
    let result = activeFilter === 'todos' ? [...orders] : orders.filter(order => order.status === activeFilter);
    // Ordena: mais recentes primeiro
    result.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    return result;
  }, [orders, activeFilter]);

  // Adiciona parâmetro from=catalog na URL para o layout mostrar o menu correto
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has('from')) {
      urlParams.set('from', 'catalog');
      const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const fetchOrders = async (userId) => {
    // Lê direto da tabela catalog_sales (a function getMyCatalogOrders é stub da migração e
    // resolve com {ok:false} sem lançar erro — por isso o fallback antigo nunca rodava).
    try {
      const directResult = await base44.entities.CatalogSale.filter({ buyer_id: userId }, '-created_date', 500);
      const list = Array.isArray(directResult) ? directResult : [];
      // anexa as avaliações que o cliente já deu (pra mostrar "Você avaliou")
      try {
        const { data: ratings } = await supabase.from('seller_ratings').select('sale_id,stars,comment').eq('buyer_id', userId);
        const byS = {}; (ratings || []).forEach((r) => { if (r.sale_id) byS[r.sale_id] = r; });
        list.forEach((o) => { o.minha_avaliacao = byS[o.id] || null; });
      } catch (_) { /* sem avaliação ainda */ }
      return list;
    } catch (e) {
      console.error('fetchOrders falhou:', e.message);
      return [];
    }
  };

  useEffect(() => {
    // IDs já pagos no carregamento inicial — para nunca disparar popup em pedidos históricos
    const initialPaidIds = new Set();
    // Snapshot mutável dos pedidos atuais para comparação no polling
    let currentOrdersSnapshot = [];

    const loadDataAndStartPolling = async () => {
      try {
        const savedUser = localStorage.getItem('currentUser');
        if (!savedUser) { setIsLoading(false); return; }
        const user = JSON.parse(savedUser);
        setCurrentUser(user);

        const orders = await fetchOrders(user.id);
        // Popula o set com todos os IDs que JÁ estão pagos antes do polling começar
        orders.forEach(o => { if (o.status === 'paid') initialPaidIds.add(o.id); });
        currentOrdersSnapshot = orders;
        setOrders(orders);
      } catch (error) {
        console.error("Failed to load catalog orders:", error);
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadDataAndStartPolling();

    // 🔄 Polling: só dispara popup se um pedido mudou de não-pago para pago NESTA sessão
    const pollingTimer = setInterval(async () => {
      const savedUser = localStorage.getItem('currentUser');
      if (!savedUser) return;

      const user = JSON.parse(savedUser);
      try {
        const newOrders = await fetchOrders(user.id);

        newOrders.forEach(order => {
          if (order.status === 'paid' && !initialPaidIds.has(order.id)) {
            const oldOrder = currentOrdersSnapshot.find(o => o.id === order.id);
            if (oldOrder && oldOrder.status !== 'paid') {
              initialPaidIds.add(order.id); // Evita disparar de novo
              window.dispatchEvent(new CustomEvent('paymentConfirmed', {
                detail: {
                  sale_id: order.id,
                  product_title: order.product_title,
                  amount: order.total_amount
                }
              }));
            }
          }
        });

        currentOrdersSnapshot = newOrders;
        setOrders(newOrders);
      } catch (error) {
        console.debug('Polling error:', error);
      }
    }, 5000);

    return () => clearInterval(pollingTimer);
  }, []);

  const [cancelingId, setCancelingId] = useState(null);
  const [ratingOrder, setRatingOrder] = useState(null);
  const [confirmedIds, setConfirmedIds] = useState(new Set());
  const [confirmingId, setConfirmingId] = useState(null);

  // Confirmações DA PLATAFORMA (ConfirmModal) — nada de window.confirm do navegador
  const [confirmAction, setConfirmAction] = useState(null); // { kind: 'receipt'|'delete'|'deleteAll', order? }

  const handleConfirmReceipt = (order) => setConfirmAction({ kind: 'receipt', order });
  const handleDeleteOrder = (order) => setConfirmAction({ kind: 'delete', order });
  const handleDeleteAll = () => { if (deletableOrders.length > 0) setConfirmAction({ kind: 'deleteAll' }); };

  // 🟢 comprador confirma recebimento → libera o saldo a liberar do vendedor na hora
  const doConfirmReceipt = async (order) => {
    if (confirmingId) return;
    setConfirmingId(order.id);
    try {
      const uid = currentUser?.id || JSON.parse(localStorage.getItem('currentUser') || '{}')?.id;
      const r = await base44.functions.invoke('confirmarRecebimento', { user_id: uid, sale_id: order.id });
      if (r?.success) {
        setConfirmedIds(prev => new Set(prev).add(order.id));
        toast.success('Recebimento confirmado! Pagamento liberado pro vendedor.');
      } else {
        toast.error(r?.error || 'Não foi possível confirmar agora.');
      }
    } catch (err) {
      console.error('confirmarRecebimento falhou:', err);
      toast.error('Erro ao confirmar recebimento.');
    } finally {
      setConfirmingId(null);
      setConfirmAction(null);
    }
  };

  const doDeleteOrder = async (order) => {
    setCancelingId(order.id);
    try {
      await CatalogSale.delete(order.id);
      setOrders(prev => prev.filter(o => o.id !== order.id));
      toast.success('Pedido excluído');
    } catch (err) {
      console.error('Erro ao excluir:', err);
      toast.error('Erro ao excluir pedido');
    } finally {
      setCancelingId(null);
      setConfirmAction(null);
    }
  };

  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const deletableOrders = orders.filter(o => o.status === 'pending_payment' || o.status === 'canceled');

  const doDeleteAll = async () => {
    if (deletableOrders.length === 0) { setConfirmAction(null); return; }
    setIsDeletingAll(true);
    let deleted = 0;
    for (const order of deletableOrders) {
      try {
        await CatalogSale.delete(order.id);
        deleted++;
      } catch (err) {
        console.warn('Erro ao excluir:', order.id, err.message);
      }
    }
    setOrders(prev => prev.filter(o => o.status !== 'pending_payment' && o.status !== 'canceled'));
    toast.success(`${deleted} pedido(s) excluído(s)`);
    setIsDeletingAll(false);
    setConfirmAction(null);
  };

  const handleTrackClick = (order) => {
    // Navega para página de acompanhamento do pedido do catálogo
    navigate(createPageUrl('CatalogOrderTracking') + `?sale_id=${order.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-center p-4">
        <ShoppingBag className="w-16 h-16 text-green-400 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Faça Login Para Ver Seus Pedidos</h1>
        <p className="text-gray-400 mb-6">Você precisa estar conectado para acessar seu histórico de compras.</p>
        <Link to={createPageUrl("Catalog")}>
          <Button className="bg-green-600 hover:bg-green-700">Voltar para a Loja Virtual</Button>
        </Link>
      </div>
    );
  }

  const filterOptions = [
    { id: 'todos', label: 'Todos', count: orders.length },
    { id: 'pending_payment', label: 'Aguardando Pagamento', count: orders.filter(o => o.status === 'pending_payment').length },
    { id: 'paid', label: 'Pagos', count: orders.filter(o => o.status === 'paid').length },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 text-white p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 sm:mb-10">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          <div className="flex items-center gap-3 sm:gap-4 mb-2">
            <div className="p-2.5 sm:p-3 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30">
              <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8 text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">Meus Pedidos — Loja Virtual</h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                {orders.length} pedido{orders.length !== 1 ? 's' : ''} no total
              </p>
            </div>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-16 bg-gray-800/30 backdrop-blur-xl rounded-2xl border border-white/5">
            <ShoppingBag className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Você ainda não fez nenhum pedido</h2>
            <p className="text-gray-400 mb-6">Explore nossa loja virtual e faça sua primeira compra!</p>
            <Link to={createPageUrl("Catalog")}>
              <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500">Ver Loja Virtual</Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Filtros */}
            <div className="mb-8 flex flex-wrap gap-2 items-center">
              <div className="flex items-center gap-2 mr-2 text-gray-400 text-sm">
                <Filter className="w-4 h-4" />
                <span className="font-semibold">Filtrar:</span>
              </div>
              {filterOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => setActiveFilter(option.id)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 flex items-center gap-2 ${activeFilter === option.id
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/30'
                      : 'bg-gray-800/50 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600'
                    }`}
                >
                  {option.label}
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${activeFilter === option.id
                      ? 'bg-white/20'
                      : 'bg-gray-700'
                    }`}>
                    {option.count}
                  </span>
                </button>
              ))}

              {deletableOrders.length > 0 && (
                <button
                  onClick={handleDeleteAll}
                  disabled={isDeletingAll}
                  className="ml-auto px-4 py-2 rounded-lg font-semibold text-sm border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeletingAll ? 'Excluindo...' : `Excluir Todos (${deletableOrders.length})`}
                </button>
              )}
            </div>

            {/* Cards */}
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12 bg-gray-800/20 rounded-xl border border-white/5">
                <Package className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                <p className="text-gray-400">Nenhum pedido nesta categoria</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {filteredOrders.map(order => (
                  <CatalogOrderCard
                    key={order.id}
                    order={order}
                    onTrackClick={handleTrackClick}
                    onDeleteClick={handleDeleteOrder}
                    onRateClick={setRatingOrder}
                    onConfirmReceipt={handleConfirmReceipt}
                    confirmado={confirmedIds.has(order.id)}
                    confirmando={confirmingId === order.id}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirmações da plataforma (sem diálogo do navegador) */}
      <ConfirmModal
        open={confirmAction?.kind === 'receipt'}
        title="Confirmar recebimento?"
        message={<>Você confirma que recebeu <b className="text-white">{confirmAction?.order?.product_title}</b>?<br />Isso libera o pagamento pro vendedor.</>}
        confirmLabel="✅ Sim, recebi"
        loading={!!confirmingId}
        onConfirm={() => doConfirmReceipt(confirmAction.order)}
        onClose={() => setConfirmAction(null)}
      />
      <ConfirmModal
        open={confirmAction?.kind === 'delete'}
        danger
        title="Excluir pedido?"
        message={<>O pedido <b className="text-white">{confirmAction?.order?.product_title}</b> será removido permanentemente.</>}
        confirmLabel="🗑️ Excluir"
        loading={!!cancelingId}
        onConfirm={() => doDeleteOrder(confirmAction.order)}
        onClose={() => setConfirmAction(null)}
      />
      <ConfirmModal
        open={confirmAction?.kind === 'deleteAll'}
        danger
        title={`Excluir ${deletableOrders.length} pedido(s)?`}
        message="Somente pendentes/cancelados serão removidos. Essa ação não pode ser desfeita."
        confirmLabel="🗑️ Excluir todos"
        loading={isDeletingAll}
        onConfirm={doDeleteAll}
        onClose={() => setConfirmAction(null)}
      />

      {ratingOrder && (
        <AvaliarLojistaModal
          order={ratingOrder}
          buyer={currentUser}
          onClose={() => setRatingOrder(null)}
          onDone={({ saleId, stars, comment }) => {
            setOrders(prev => prev.map(o => o.id === saleId ? { ...o, minha_avaliacao: { stars, comment } } : o));
            setRatingOrder(null);
            toast.success('⭐ Avaliação enviada! Obrigado.');
          }}
        />
      )}
    </div>
  );
}