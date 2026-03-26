import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import {
    Plus, RefreshCw, Search, Eye, CheckCircle2, XCircle, Package, Users,
    DollarSign, Gavel, ArrowLeft, Trash2, Copy, ChevronDown, ChevronUp,
    TrendingUp, Calendar, Filter, ArrowUpDown, Pencil
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { distributeAuctionCommissions } from '@/functions/distributeAuctionCommissions';
import ImportarLotesModal from '@/components/lotes/ImportarLotesModal';
import AtualizarGradesModal from '@/components/lotes/AtualizarGradesModal';
import ArrematantesModal from '@/components/lotes/ArrematantesModal';

const Auction = base44.entities.Auction;
const AppUser = base44.entities.AppUser;
const Arrematante = base44.entities.Arrematante;

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val ?? 0);

// Modal de confirmação de arremate
function ConfirmarArrematModal({ lote, vencedor, onConfirm, onCancel }) {
    if (!lote || !vencedor) return null;
    const valor = lote.current_price || lote.starting_price;
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-[#161b22] border border-amber-500/40 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                    <Gavel size={18} className="text-amber-400" /> Confirmar Arremate
                </h3>
                <p className="text-slate-400 text-sm mb-4">Revise os dados antes de registrar.</p>
                <div className="space-y-2 bg-[#0d1117] rounded-xl p-4 mb-5">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Lote</span>
                        <span className="text-white font-semibold text-right max-w-[200px] truncate">{lote.title}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Vencedor</span>
                        <span className="text-emerald-400 font-bold">{vencedor.full_name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Valor Final</span>
                        <span className="text-amber-400 font-black text-base">{formatCurrency(valor)}</span>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 bg-[#0d1117] border border-[#30363d] text-slate-400 hover:text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
                        Cancelar
                    </button>
                    <button onClick={onConfirm} className="flex-[2] bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
                        <CheckCircle2 size={16} /> Confirmar Arremate
                    </button>
                </div>
            </div>
        </div>
    );
}

// Modal de detalhes do lote
function LoteDetalheModal({ lote, onClose }) {
    if (!lote) return null;
    const categorias = useMemo(() => {
        if (!lote.lot_categories_json) return [];
        try { return JSON.parse(lote.lot_categories_json); } catch { return []; }
    }, [lote]);
    const vm = lote.market_price || lote.manual_market_price || 0;
    const lance = lote.current_price || lote.starting_price || 0;
    const margem = (vm > 0 && lance > 0) ? (((vm - lance) / lance) * 100).toFixed(0) : null;
    const desc = lote.description || '';
    const linhas = desc.split('\n');
    const get = (prefix) => { const l = linhas.find(x => x.startsWith(prefix)); return l ? l.replace(prefix, '').trim() : null; };
    const localRetirada = get('Local de Retirada:');

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-bold text-white leading-tight pr-4">{lote.title}</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-white shrink-0"><XCircle size={20} /></button>
                </div>

                {lote.image_urls?.[0] && (
                    <img src={lote.image_urls[0]} alt={lote.title} className="w-full h-40 object-cover rounded-xl mb-4 border border-[#30363d]" />
                )}

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-[#0d1117] rounded-xl p-3 border border-[#30363d]">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Lance Atual</p>
                        <p className="text-xl font-black text-emerald-400">{formatCurrency(lance)}</p>
                    </div>
                    {vm > 0 && (
                        <div className="bg-[#0d1117] rounded-xl p-3 border border-[#30363d]">
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Valor de Mercado</p>
                            <p className="text-xl font-black text-blue-400">{formatCurrency(vm)}</p>
                            {margem && <p className="text-[10px] text-emerald-400 mt-0.5">+{margem}% de margem</p>}
                        </div>
                    )}
                </div>

                {localRetirada && (
                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg px-4 py-2 mb-4 text-sm text-blue-300">
                        📍 Local de retirada: <strong>{localRetirada}</strong>
                    </div>
                )}

                {categorias.length > 0 && (
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Categorias</p>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                            {categorias.filter(c => c.nome !== 'Total Geral').map((cat, i) => (
                                <div key={i} className="flex justify-between items-center bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm">
                                    <span className="text-slate-300">{cat.nome}</span>
                                    <div className="flex gap-4 text-xs">
                                        <span className="text-slate-500">{cat.qtd} un</span>
                                        <span className="text-emerald-400 font-semibold">{formatCurrency(cat.valor)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-4 pt-4 border-t border-[#30363d] flex items-center justify-between text-xs text-slate-500">
                    <span>Encerra: {lote.end_time ? new Date(lote.end_time).toLocaleString('pt-BR') : '—'}</span>
                    {lote.winner_name && <span className="text-blue-300 font-semibold">Vencedor: {lote.winner_name}</span>}
                </div>
            </div>
        </div>
    );
}

export default function GestaoLotes() {
    const [lotes, setLotes] = useState([]);
    const [investidores, setInvestidores] = useState([]);
    const [parceiros, setParceiros] = useState([]);
    const [arrematantes, setArrematantes] = useState([]);
    const [arrematantesCadastro, setArrematantesCadastro] = useState([]);
    const [showArremModal, setShowArremModal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [busca, setBusca] = useState('');
    const [filtroStatus, setFiltroStatus] = useState('todos');
    const [filtroValor, setFiltroValor] = useState('todos');
    const [filtroData, setFiltroData] = useState('todos');
    const [isSaving, setIsSaving] = useState(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [gradeUpdateLote, setGradeUpdateLote] = useState(null);
    const [showArrematantesModal, setShowArrematantesModal] = useState(false);
    const [showInvestidoresModal, setShowInvestidoresModal] = useState(false);
    const [loteDetalhe, setLoteDetalhe] = useState(null);
    const [confirmarArremate, setConfirmarArremate] = useState(null); // {lote, vencedor}
    const [sortConfig, setSortConfig] = useState({ key: null, dir: 'asc' });
    const navigate = useNavigate();
    const currentUserRole = (() => { try { return JSON.parse(localStorage.getItem('currentUser'))?.role; } catch { return null; } })();

    useEffect(() => { loadDados(); }, []);

    const loadDados = async () => {
        setIsLoading(true);
        try {
            const [loteData, invData, parcData, arremData] = await Promise.all([
                Auction.filter({ is_investment_plan: true }),
                AppUser.filter({ role: 'investidor' }),
                AppUser.filter({ role: 'leiloeiro' }),
                Arrematante.list('-created_date', 200)
            ]);
            setLotes(loteData || []);
            setInvestidores(invData || []);
            setParceiros(parcData || []);
            setArrematantes(invData || []);
            setArrematantesCadastro(arremData || []);
        } catch (err) {
            console.error('[GestaoLotes] Erro:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // ── LÓGICA DE NEGÓCIO PRESERVADA ──

    const toggleInvestmentPlan = async (lote) => {
        if (!lote.is_investment_plan && !lote.partner_id) {
            toast.error('Defina o parceiro responsável antes de publicar no marketplace.');
            return;
        }
        setIsSaving(lote.id);
        try {
            await Auction.update(lote.id, { is_investment_plan: !lote.is_investment_plan });
            setLotes(prev => prev.map(l => l.id === lote.id ? { ...l, is_investment_plan: !l.is_investment_plan } : l));
        } catch (err) {
            console.error('[GestaoLotes] Erro ao atualizar:', err);
        } finally {
            setIsSaving(null);
        }
    };

    const atualizarParceiro = async (lote, parceiroId) => {
        const parceiro = parceiros.find(p => p.id === parceiroId);
        setIsSaving(lote.id);
        try {
            const platformPct = parceiro?.partner_plan_amount ?? null;
            await Auction.update(lote.id, {
                partner_id: parceiroId || null,
                partner_name: parceiro?.full_name || null,
                platform_commission_percentual: platformPct
            });
            setLotes(prev => prev.map(l => l.id === lote.id
                ? { ...l, partner_id: parceiroId || null, partner_name: parceiro?.full_name || null, platform_commission_percentual: platformPct }
                : l
            ));
            const msg = parceiro
                ? `Parceiro "${parceiro.full_name}" associado.${platformPct != null ? ` Taxa plataforma: ${platformPct}%` : ''}`
                : 'Parceiro removido.';
            toast.success(msg);
        } catch (err) {
            console.error('[GestaoLotes] Erro ao associar parceiro:', err);
            toast.error('Erro ao associar parceiro.');
        } finally {
            setIsSaving(null);
        }
    };

    const atualizarComissaoParceiro = async (lote, pct) => {
        const valor = parseFloat(pct);
        if (isNaN(valor) || valor < 0 || valor > 100) return;
        setIsSaving(lote.id);
        try {
            const updateData = { partner_commission_percentual: valor };
            if (lote.platform_commission_percentual == null) {
                const parceiro = parceiros.find(p => p.id === lote.partner_id);
                const pctAdmin = parceiro?.partner_plan_amount ?? 3;
                updateData.platform_commission_percentual = pctAdmin;
            }
            await Auction.update(lote.id, updateData);
            setLotes(prev => prev.map(l => l.id === lote.id ? { ...l, ...updateData } : l));
            toast.success(`Comissão atualizada: ${valor}%`);
        } catch (err) {
            console.error('[GestaoLotes] Erro ao atualizar comissão:', err);
            toast.error('Erro ao atualizar comissão.');
        } finally {
            setIsSaving(null);
        }
    };

    // Registrar arremate — agora via modal de confirmação
    const iniciarRegistrarArremate = (lote, vencedorId) => {
        if (!vencedorId) return;
        const vencedor = investidores.find(i => i.id === vencedorId);
        if (!vencedor) return;
        setConfirmarArremate({ lote, vencedor });
    };

    const confirmarRegistrarArremate = async () => {
        if (!confirmarArremate) return;
        const { lote, vencedor } = confirmarArremate;
        setConfirmarArremate(null);
        const valorFinal = lote.current_price || lote.starting_price;
        setIsSaving(lote.id);
        try {
            await Auction.update(lote.id, {
                status: 'sold',
                winner_id: vencedor.id,
                winner_name: vencedor.full_name,
                order_status: 'paid'
            });
            try {
                const autorizacoes = await base44.asServiceRole.entities.LanceAutorizado.filter({
                    investidor_id: vencedor.id,
                    auction_id: lote.id,
                    status_autorizacao: 'confirmada'
                });
                if (autorizacoes && autorizacoes.length > 0) {
                    const auth = autorizacoes[0];
                    const depositoTotal = auth.deposito_confirmado || 0;
                    const saldoRestante = Math.max(0, depositoTotal - valorFinal);
                    await base44.entities.AppUser.update(vencedor.id, {
                        saldo_alocado: Math.max(0, (vencedor.saldo_alocado || 0) - depositoTotal),
                        saldo_disponivel: (vencedor.saldo_disponivel || 0) + saldoRestante
                    });
                    await base44.entities.WalletTransaction.create({
                        user_id: vencedor.id, type: 'purchase', direction: 'debit',
                        amount: valorFinal, status: 'confirmed', related_auction_id: lote.id,
                        description: `Arremate: ${lote.title} - ${new Date().toLocaleDateString('pt-BR')}`
                    });
                    if (saldoRestante > 0) {
                        await base44.entities.WalletTransaction.create({
                            user_id: vencedor.id, type: 'refund', direction: 'credit',
                            amount: saldoRestante, status: 'confirmed', related_auction_id: lote.id,
                            description: `Saldo restante liberado: ${lote.title}`
                        });
                    }
                    await base44.asServiceRole.entities.LanceAutorizado.update(auth.id, {
                        status_autorizacao: 'concluida',
                        data_conclusao: new Date().toISOString(),
                        observacoes: `Arremate registrado em ${new Date().toLocaleDateString('pt-BR')} por R$ ${valorFinal.toFixed(2)}. Saldo restante liberado: R$ ${saldoRestante.toFixed(2)}`
                    });
                }
            } catch (saldoErr) {
                console.error('[GestaoLotes] Aviso: erro ao liberar saldo (arremate já registrado):', saldoErr);
            }
            await Auction.update(lote.id, { lot_status: 'arrematado' });
            setLotes(prev => prev.map(l => l.id === lote.id ? {
                ...l, status: 'sold', lot_status: 'arrematado', winner_id: vencedor.id, winner_name: vencedor.full_name
            } : l));
            toast.success(`✅ Arremate registrado para ${vencedor.full_name}`);
        } catch (err) {
            console.error('[GestaoLotes] Erro ao registrar arremate:', err);
            toast.error('Erro ao registrar arremate. Tente novamente.');
        } finally {
            setIsSaving(null);
        }
    };

    const distribuirComissao = async (lote) => {
        if (lote.commissions_distributed) { toast.info('Comissões já foram distribuídas para este lote.'); return; }
        if (!lote.partner_id || !lote.partner_commission_percentual) {
            toast.error('Defina parceiro e percentual de comissão antes de distribuir.');
            return;
        }
        if (!confirm(`Distribuir comissão de ${lote.partner_commission_percentual}% para ${lote.partner_name}?`)) return;
        setIsSaving(lote.id);
        try {
            const res = await distributeAuctionCommissions({ auction_id: lote.id });
            const data = res?.data || res;
            if (data?.status === 'success' || data?.status === 'already_processed') {
                await Auction.update(lote.id, { commissions_distributed: true, lot_status: 'finalizado' });
                setLotes(prev => prev.map(l => l.id === lote.id ? { ...l, commissions_distributed: true, lot_status: 'finalizado' } : l));
                toast.success(`✅ Comissão de R$ ${data.valor_parceiro?.toFixed(2) || '—'} creditada para ${lote.partner_name}`);
            } else {
                toast.error(data?.error || 'Erro ao distribuir comissão.');
            }
        } catch (err) {
            toast.error('Erro ao distribuir comissão: ' + err.message);
        } finally {
            setIsSaving(null);
        }
    };

    const excluirLote = async (lote) => {
        if (!confirm(`Excluir o lote "${lote.title}"? Esta ação não pode ser desfeita.`)) return;
        setIsSaving(lote.id);
        try {
            await Auction.delete(lote.id);
            setLotes(prev => prev.filter(l => l.id !== lote.id));
            toast.success('Lote excluído com sucesso.');
        } catch (err) {
            console.error('[GestaoLotes] Erro ao excluir:', err);
            toast.error('Erro ao excluir lote.');
        } finally {
            setIsSaving(null);
        }
    };

    const compartilharLote = (lote) => {
        const url = `${window.location.origin}/MarketplaceLotes`;
        navigator.clipboard.writeText(url).then(() => toast.success('Link do marketplace copiado!'));
    };

    // ── FILTROS E ORDENAÇÃO ──

    const handleSort = (key) => {
        setSortConfig(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
    };

    const lotesFiltrados = useMemo(() => {
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        const semanaFim = new Date(hoje); semanaFim.setDate(semanaFim.getDate() + 7);

        let resultado = lotes.filter(l => {
            if (busca && !l.title?.toLowerCase().includes(busca.toLowerCase())) return false;
            if (filtroStatus === 'marketplace' && !l.is_investment_plan) return false;
            if (filtroStatus === 'active' && l.status !== 'active') return false;
            if (filtroStatus === 'sold' && l.status !== 'sold') return false;
            if (filtroStatus === 'todos') { /* sem filtro */ }

            const lance = l.current_price || l.starting_price || 0;
            if (filtroValor === 'ate10k' && lance > 10000) return false;
            if (filtroValor === '10k50k' && (lance < 10000 || lance > 50000)) return false;
            if (filtroValor === 'acima50k' && lance < 50000) return false;

            if (filtroData !== 'todos' && l.end_time) {
                const endDate = new Date(l.end_time); endDate.setHours(0, 0, 0, 0);
                if (filtroData === 'hoje' && endDate.getTime() !== hoje.getTime()) return false;
                if (filtroData === 'semana' && (endDate < hoje || endDate > semanaFim)) return false;
                if (filtroData === 'vencidos' && endDate >= hoje) return false;
            }
            return true;
        });

        if (sortConfig.key) {
            resultado = [...resultado].sort((a, b) => {
                let va, vb;
                if (sortConfig.key === 'title') { va = a.title || ''; vb = b.title || ''; }
                else if (sortConfig.key === 'valor') { va = a.current_price || a.starting_price || 0; vb = b.current_price || b.starting_price || 0; }
                else if (sortConfig.key === 'status') { va = a.status || ''; vb = b.status || ''; }
                else if (sortConfig.key === 'data') { va = a.end_time || ''; vb = b.end_time || ''; }
                if (va < vb) return sortConfig.dir === 'asc' ? -1 : 1;
                if (va > vb) return sortConfig.dir === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return resultado;
    }, [lotes, busca, filtroStatus, filtroValor, filtroData, sortConfig]);

    // ── INDICADORES DO HEADER ──
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimDia = new Date(hoje); fimDia.setHours(23, 59, 59, 999);

    const valorCarteiraAtiva = lotes
        .filter(l => l.status === 'active')
        .reduce((sum, l) => sum + (l.current_price || l.starting_price || 0), 0);

    const valorArrematadoMes = lotes
        .filter(l => l.status === 'sold' && l.updated_date && new Date(l.updated_date) >= inicioMes)
        .reduce((sum, l) => sum + (l.current_price || l.starting_price || 0), 0);

    const lotesVencendoHoje = lotes.filter(l => {
        if (!l.end_time || l.status !== 'active') return false;
        const d = new Date(l.end_time); d.setHours(0, 0, 0, 0);
        return d.getTime() === hoje.getTime();
    }).length;

    const lotesMarketplace = lotes.filter(l => l.is_investment_plan).length;
    const lotesSold = lotes.filter(l => l.status === 'sold').length;
    const statsInvestidores = investidores.length;
    const statsArrematantes = arrematantesCadastro.length;

    // Cards clicáveis mapeados para filtros
    const cards = [
        { label: 'Total de Lotes', value: lotes.length, icon: Package, color: 'text-slate-400', filtro: 'todos', borderActive: 'border-slate-500' },
        { label: 'No Marketplace', value: lotesMarketplace, icon: DollarSign, color: 'text-blue-400', filtro: 'marketplace', borderActive: 'border-blue-500' },
        { label: 'Arrematados', value: lotesSold, icon: CheckCircle2, color: 'text-emerald-400', filtro: 'sold', borderActive: 'border-emerald-500' },
        { label: 'Ativos', value: lotes.filter(l => l.status === 'active').length, icon: TrendingUp, color: 'text-amber-400', filtro: 'active', borderActive: 'border-amber-500' },
    ];

    const SortIcon = ({ col }) => (
        <ArrowUpDown size={12} className={`inline ml-1 ${sortConfig.key === col ? 'text-amber-400' : 'text-slate-600'}`} />
    );

    return (
        <div className="min-h-screen bg-[#0d1117] text-slate-200 font-sans p-4 xl:p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <header className="mb-2">
                    <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold tracking-widest uppercase">
                        <Gavel size={14} />
                        Painel Administrativo
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                            Gestão de <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Lotes</span>
                        </h1>
                        <div className="flex gap-2">
                            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm border border-[#30363d] rounded-lg px-3 py-2 transition-colors">
                                <ArrowLeft size={14} /> Voltar
                            </button>
                            <button onClick={loadDados} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm border border-[#30363d] rounded-lg px-3 py-2 transition-colors">
                                <RefreshCw size={14} />
                            </button>
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold rounded-lg px-4 py-2 transition-colors"
                            >
                                <Plus size={14} /> Novo Lote
                            </button>
                        </div>
                    </div>

                    {/* Indicadores do header */}
                    <div className="flex flex-wrap gap-4 mt-4">
                        <div className="bg-[#161b22] border border-[#30363d] rounded-xl px-4 py-2 flex items-center gap-3">
                            <DollarSign size={16} className="text-emerald-400" />
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Carteira Ativa</p>
                                <p className="text-sm font-black text-emerald-400">{formatCurrency(valorCarteiraAtiva)}</p>
                            </div>
                        </div>
                        <div className="bg-[#161b22] border border-[#30363d] rounded-xl px-4 py-2 flex items-center gap-3">
                            <CheckCircle2 size={16} className="text-blue-400" />
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Arrematado no Mês</p>
                                <p className="text-sm font-black text-blue-400">{formatCurrency(valorArrematadoMes)}</p>
                            </div>
                        </div>
                        {lotesVencendoHoje > 0 && (
                            <div className="bg-red-900/30 border border-red-500/40 rounded-xl px-4 py-2 flex items-center gap-3 animate-pulse">
                                <Calendar size={16} className="text-red-400" />
                                <div>
                                    <p className="text-[10px] text-red-400 uppercase tracking-wider font-bold">Vencendo Hoje</p>
                                    <p className="text-sm font-black text-red-300">{lotesVencendoHoje} lote{lotesVencendoHoje > 1 ? 's' : ''}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                {/* Cards clicáveis (filtram tabela) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {cards.map((card, i) => {
                        const isActive = filtroStatus === card.filtro;
                        return (
                            <button
                                key={i}
                                onClick={() => setFiltroStatus(card.filtro)}
                                className={`bg-[#161b22] border-2 rounded-2xl p-5 text-left transition-all cursor-pointer hover:bg-[#1c2230] ${
                                    isActive ? `${card.borderActive} shadow-lg` : 'border-[#30363d] hover:border-slate-500'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <card.icon className={card.color} size={22} />
                                    {isActive && <CheckCircle2 size={14} className="text-amber-400" />}
                                </div>
                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{card.label}</p>
                                <p className="text-2xl font-black text-white">{card.value}</p>
                            </button>
                        );
                    })}
                </div>

                {/* Cards de Arrematantes e Investidores (modais) */}
                <div className={`grid gap-4 ${currentUserRole === 'admin' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    <button
                        onClick={() => setShowArremModal(true)}
                        className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 text-left hover:border-rose-500 hover:bg-[#1c2230] transition-all cursor-pointer flex items-center gap-4"
                    >
                        <Users className="text-rose-400" size={22} />
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider">Arrematantes</p>
                            <p className="text-xl font-black text-white">{statsArrematantes}</p>
                        </div>
                    </button>
                    {currentUserRole === 'admin' && (
                        <button
                            onClick={() => setShowArrematantesModal(true)}
                            className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 text-left hover:border-rose-500 hover:bg-[#1c2230] transition-all cursor-pointer flex items-center gap-4"
                        >
                            <Users className="text-rose-400" size={22} />
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wider">App Users Leiloeiros</p>
                                <p className="text-xl font-black text-white">{arrematantes.length}</p>
                            </div>
                        </button>
                    )}
                    <button
                        onClick={() => setShowInvestidoresModal(true)}
                        className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 text-left hover:border-violet-500 hover:bg-[#1c2230] transition-all cursor-pointer flex items-center gap-4"
                    >
                        <Users className="text-violet-400" size={22} />
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider">Investidores</p>
                            <p className="text-xl font-black text-white">{statsInvestidores}</p>
                        </div>
                    </button>
                </div>

                {/* Filtros avançados */}
                <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Buscar lote por título..."
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                            className="w-full bg-[#161b22] border border-[#30363d] rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                        />
                    </div>
                    <select
                        value={filtroValor}
                        onChange={e => setFiltroValor(e.target.value)}
                        className="bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-amber-500"
                    >
                        <option value="todos">Todos os valores</option>
                        <option value="ate10k">Até R$ 10k</option>
                        <option value="10k50k">R$ 10k – R$ 50k</option>
                        <option value="acima50k">Acima de R$ 50k</option>
                    </select>
                    <select
                        value={filtroData}
                        onChange={e => setFiltroData(e.target.value)}
                        className="bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-amber-500"
                    >
                        <option value="todos">Qualquer data</option>
                        <option value="hoje">Vence hoje</option>
                        <option value="semana">Próximos 7 dias</option>
                        <option value="vencidos">Vencidos</option>
                    </select>
                    {(filtroStatus !== 'todos' || filtroValor !== 'todos' || filtroData !== 'todos' || busca) && (
                        <button
                            onClick={() => { setFiltroStatus('todos'); setFiltroValor('todos'); setFiltroData('todos'); setBusca(''); }}
                            className="px-3 py-2 rounded-lg text-xs font-bold text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors"
                        >
                            Limpar filtros
                        </button>
                    )}
                </div>

                {/* Contagem de resultados */}
                <p className="text-xs text-slate-500">
                    Exibindo <span className="text-slate-300 font-semibold">{lotesFiltrados.length}</span> de {lotes.length} lotes
                </p>

                {/* Tabela */}
                <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl overflow-hidden">
                    {isLoading ? (
                        <div className="flex justify-center py-16">
                            <div className="w-10 h-10 border-4 border-slate-700 border-t-amber-500 rounded-full animate-spin" />
                        </div>
                    ) : lotesFiltrados.length === 0 ? (
                        <div className="py-12 text-center text-slate-500 text-sm">Nenhum lote encontrado.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="bg-[#0d1117] text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                        <th className="px-4 py-4 cursor-pointer hover:text-white" onClick={() => handleSort('title')}>
                                            Lote <SortIcon col="title" />
                                        </th>
                                        <th className="px-4 py-4 cursor-pointer hover:text-white" onClick={() => handleSort('valor')}>
                                            Lance <SortIcon col="valor" />
                                        </th>
                                        <th className="px-4 py-4">Val. Mercado</th>
                                        <th className="px-4 py-4 cursor-pointer hover:text-white" onClick={() => handleSort('status')}>
                                            Status <SortIcon col="status" />
                                        </th>
                                        <th className="px-4 py-4">Parceiro</th>
                                        <th className="px-4 py-4 text-center">Marketplace</th>
                                        <th className="px-4 py-4">Vencedor / Registrar</th>
                                        <th className="px-4 py-4 text-center">Comissão</th>
                                        <th className="px-4 py-4 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lotesFiltrados.map(lote => {
                                        const vm = lote.market_price || lote.manual_market_price || 0;
                                        const lance = lote.current_price || lote.starting_price || 0;
                                        const margem = vm > 0 && lance > 0 ? (((vm - lance) / lance) * 100).toFixed(0) : null;
                                        const thumb = lote.image_urls?.[0];

                                        return (
                                            <tr key={lote.id} className="border-b border-[#30363d]/50 hover:bg-white/[0.02] transition-colors">
                                                {/* Lote + Thumbnail */}
                                                <td className="px-4 py-3 max-w-[220px]">
                                                    <div className="flex items-center gap-3">
                                                        {thumb ? (
                                                            <img src={thumb} alt="" className="w-10 h-10 rounded-lg object-cover border border-[#30363d] shrink-0" />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-lg bg-[#0d1117] border border-[#30363d] flex items-center justify-center shrink-0">
                                                                <Package size={16} className="text-slate-600" />
                                                            </div>
                                                        )}
                                                        <div className="min-w-0">
                                                            <button
                                                                onClick={() => navigate(createPageUrl('VisualizarLote') + `?id=${lote.id}`)}
                                                                className="font-semibold text-amber-400 hover:text-amber-300 truncate text-left transition-colors block max-w-[150px]"
                                                                title={lote.title}
                                                            >
                                                                {lote.title}
                                                            </button>
                                                            <p className="text-[10px] text-slate-500">
                                                                {lote.end_time ? new Date(lote.end_time).toLocaleDateString('pt-BR') : '—'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Lance */}
                                                <td className="px-4 py-3 font-bold text-emerald-400 whitespace-nowrap">
                                                    {formatCurrency(lance)}
                                                </td>

                                                {/* Valor de Mercado + Margem */}
                                                <td className="px-4 py-3">
                                                    {vm > 0 ? (
                                                        <div>
                                                            <p className="text-blue-400 font-semibold text-xs">{formatCurrency(vm)}</p>
                                                            {margem && (
                                                                <p className={`text-[10px] font-bold ${parseInt(margem) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                                    {parseInt(margem) >= 0 ? '+' : ''}{margem}%
                                                                </p>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-600 text-xs">—</span>
                                                    )}
                                                </td>

                                                {/* Status */}
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider ${
                                                        lote.status === 'active' ? 'bg-emerald-500/10 text-emerald-400'
                                                        : lote.status === 'sold' ? 'bg-blue-500/10 text-blue-400'
                                                        : lote.status === 'ended' ? 'bg-slate-500/10 text-slate-400'
                                                        : 'bg-orange-500/10 text-orange-400'
                                                    }`}>
                                                        {lote.status === 'active' ? 'ATIVO'
                                                        : lote.status === 'sold' ? 'ARREMATADO'
                                                        : lote.status === 'ended' ? 'ENCERRADO'
                                                        : lote.status?.toUpperCase() || 'IMPORTADO'}
                                                    </span>
                                                    {lote.lot_status && (
                                                        <p className="text-[9px] text-slate-500 mt-0.5 uppercase tracking-wider">{lote.lot_status.replace(/_/g, ' ')}</p>
                                                    )}
                                                </td>

                                                {/* Parceiro */}
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col gap-1">
                                                        <select
                                                            value={lote.partner_id || ''}
                                                            onChange={e => atualizarParceiro(lote, e.target.value)}
                                                            disabled={isSaving === lote.id}
                                                            className="bg-[#0d1117] border border-[#30363d] rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-amber-500 max-w-[140px]"
                                                        >
                                                            <option value="">Sem parceiro</option>
                                                            {parceiros.map(p => (
                                                                <option key={p.id} value={p.id}>{p.full_name}</option>
                                                            ))}
                                                        </select>
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="number"
                                                                min="0" max="100" step="0.5"
                                                                key={`comm-${lote.id}-${lote.partner_commission_percentual}`}
                                                                defaultValue={lote.partner_commission_percentual || ''}
                                                                onBlur={e => atualizarComissaoParceiro(lote, e.target.value)}
                                                                placeholder="Comissão %"
                                                                disabled={isSaving === lote.id}
                                                                className="bg-[#0d1117] border border-[#30363d] rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-amber-500 w-[90px]"
                                                            />
                                                            <span className="text-slate-500 text-xs">%</span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Marketplace toggle */}
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => toggleInvestmentPlan(lote)}
                                                        disabled={isSaving === lote.id}
                                                        className="transition-colors"
                                                        title={lote.is_investment_plan ? 'Remover do marketplace' : 'Publicar no marketplace'}
                                                    >
                                                        {lote.is_investment_plan
                                                            ? <CheckCircle2 size={20} className="text-emerald-400" />
                                                            : <XCircle size={20} className="text-slate-600 hover:text-slate-400" />
                                                        }
                                                    </button>
                                                </td>

                                                {/* Vencedor / Registrar arremate */}
                                                <td className="px-4 py-3">
                                                    {lote.winner_name ? (
                                                        <span className="text-blue-300 text-xs font-semibold">{lote.winner_name}</span>
                                                    ) : lote.status === 'active' ? (
                                                        <select
                                                            onChange={e => e.target.value && iniciarRegistrarArremate(lote, e.target.value)}
                                                            defaultValue=""
                                                            className="bg-[#0d1117] border border-[#30363d] rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                                                        >
                                                            <option value="">Registrar arremate...</option>
                                                            {investidores.map(inv => (
                                                                <option key={inv.id} value={inv.id}>{inv.full_name}</option>
                                                            ))}
                                                        </select>
                                                    ) : <span className="text-slate-600 text-xs">—</span>}
                                                </td>

                                                {/* Distribuir comissão */}
                                                <td className="px-4 py-3 text-center">
                                                    {lote.status === 'sold' && (
                                                        <button
                                                            onClick={() => distribuirComissao(lote)}
                                                            disabled={isSaving === lote.id || lote.commissions_distributed}
                                                            title={lote.commissions_distributed ? 'Comissão já distribuída' : 'Distribuir comissão ao parceiro'}
                                                            className={`transition-colors ${lote.commissions_distributed ? 'text-emerald-400 cursor-default' : 'text-slate-500 hover:text-amber-400'}`}
                                                        >
                                                            <DollarSign size={16} />
                                                        </button>
                                                    )}
                                                </td>

                                                {/* Ações rápidas */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1.5 justify-center">
                                                        <button
                                                            onClick={() => setLoteDetalhe(lote)}
                                                            title="Ver detalhes"
                                                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                                                        >
                                                            <Eye size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => navigate(createPageUrl('EditAuction') + `?id=${lote.id}`)}
                                                            title="Editar lote"
                                                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                                                        >
                                                            <Pencil size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => compartilharLote(lote)}
                                                            title="Copiar link do marketplace"
                                                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                                        >
                                                            <Copy size={14} />
                                                        </button>
                                                        {!lote.lot_grades_json && (
                                                            <button
                                                                onClick={() => setGradeUpdateLote(lote)}
                                                                disabled={isSaving === lote.id}
                                                                title="Atualizar grades"
                                                                className="text-amber-500/60 hover:text-amber-400 transition-colors disabled:opacity-40 text-xs font-bold px-1"
                                                            >
                                                                ⚡
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => excluirLote(lote)}
                                                            disabled={isSaving === lote.id}
                                                            title="Excluir lote"
                                                            className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modais */}
            <ImportarLotesModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onPublished={() => loadDados()}
            />

            <ArrematantesModal
                isOpen={showArremModal}
                onClose={() => setShowArremModal(false)}
                arrematantes={arrematantesCadastro}
                onRefresh={() => {
                    Arrematante.list('-created_date', 200).then(data => setArrematantesCadastro(data || []));
                }}
            />

            {gradeUpdateLote && (
                <AtualizarGradesModal
                    isOpen={true}
                    onClose={() => setGradeUpdateLote(null)}
                    lote={gradeUpdateLote}
                    onSuccess={loadDados}
                />
            )}

            {loteDetalhe && (
                <LoteDetalheModal lote={loteDetalhe} onClose={() => setLoteDetalhe(null)} />
            )}

            {confirmarArremate && (
                <ConfirmarArrematModal
                    lote={confirmarArremate.lote}
                    vencedor={confirmarArremate.vencedor}
                    onConfirm={confirmarRegistrarArremate}
                    onCancel={() => setConfirmarArremate(null)}
                />
            )}

            {/* Modal Arrematantes */}
            {showArrematantesModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Users size={20} className="text-rose-400" /> Arrematantes ({arrematantes.length})
                            </h2>
                            <button onClick={() => setShowArrematantesModal(false)} className="text-slate-500 hover:text-white">
                                <XCircle size={20} />
                            </button>
                        </div>
                        <div className="space-y-2">
                            {arrematantes.length === 0 ? (
                                <p className="text-slate-500 text-center py-4">Nenhum arrematante cadastrado.</p>
                            ) : arrematantes.map(user => (
                                <div key={user.id} className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 flex items-start justify-between hover:border-rose-500/50 transition-colors">
                                    <div className="flex-1">
                                        <p className="font-semibold text-white">{user.full_name}</p>
                                        <p className="text-xs text-slate-500">{user.email}</p>
                                        {user.phone && <p className="text-xs text-slate-500">{user.phone}</p>}
                                    </div>
                                    {user.partner_plan_amount != null && (
                                        <div className="text-right">
                                            <p className="text-xs text-slate-500">Taxa</p>
                                            <p className="font-bold text-rose-400">{user.partner_plan_amount}%</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Investidores */}
            {showInvestidoresModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Users size={20} className="text-violet-400" /> Investidores ({investidores.length})
                            </h2>
                            <button onClick={() => setShowInvestidoresModal(false)} className="text-slate-500 hover:text-white">
                                <XCircle size={20} />
                            </button>
                        </div>
                        <div className="space-y-2">
                            {investidores.length === 0 ? (
                                <p className="text-slate-500 text-center py-4">Nenhum investidor cadastrado.</p>
                            ) : investidores.map(user => (
                                <div key={user.id} className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 flex items-start justify-between hover:border-violet-500/50 transition-colors">
                                    <div className="flex-1">
                                        <p className="font-semibold text-white">{user.full_name}</p>
                                        <p className="text-xs text-slate-500">{user.email}</p>
                                        {user.phone && <p className="text-xs text-slate-500">{user.phone}</p>}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500">Saldo Disponível</p>
                                        <p className="font-bold text-violet-400">{formatCurrency(user.saldo_disponivel || 0)}</p>
                                        <p className="text-xs text-slate-600 mt-1">Alocado: {formatCurrency(user.saldo_alocado || 0)}</p>
                                    </div>
                                </div>
            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}