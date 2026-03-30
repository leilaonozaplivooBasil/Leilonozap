import React, { useState, useEffect, useMemo } from 'react';
import { Users, TrendingUp, Search, Briefcase, DollarSign, Activity, RefreshCw, Eye, UserPlus, ArrowLeft, FolderOpen, FileSpreadsheet, LayoutList, LayoutGrid } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import CadastroInvestidorModal from '@/components/crm/CadastroInvestidorModal';

const AppUser = base44.entities.AppUser;
const Auction = base44.entities.Auction;

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val ?? 0);

function Avatar({ name }) {
    const initials = (name || '?').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
    const colors = ['bg-violet-600', 'bg-blue-600', 'bg-emerald-600', 'bg-amber-600', 'bg-rose-600', 'bg-indigo-600'];
    const color = colors[(name || '').charCodeAt(0) % colors.length];
    return (
        <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center text-white text-xs font-black shrink-0`}>
            {initials}
        </div>
    );
}

export default function CRMInvestidores() {
    const [investidores, setInvestidores] = useState([]);
    const [arrematantes, setArrematantes] = useState([]);
    const [lotes, setLotes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [busca, setBusca] = useState('');
    const [showCadastro, setShowCadastro] = useState(false);
    const [viewMode, setViewMode] = useState('lista'); // 'lista' | 'arrematante'
    const [filtroCard, setFiltroCard] = useState(null); // null | 'comCapital' | 'alocado' | 'lotes'
    const [userRole, setUserRole] = useState(null);
    const navigate = useNavigate();

    useEffect(() => { loadDados(); }, []);

    const loadDados = async () => {
        setIsLoading(true);
        try {
            const savedUser = localStorage.getItem('currentUser');
            const currentUser = savedUser ? JSON.parse(savedUser) : null;
            setUserRole(currentUser?.role || null);
            const isAdmin = currentUser?.role === 'admin';

            const investidorFilter = isAdmin
                ? { role: 'investidor' }
                : { role: 'investidor', referred_by_id: currentUser?.id };

            const [usuarios, leiloesData, arrData, admData] = await Promise.all([
                AppUser.filter(investidorFilter),
                Auction.filter({ is_investment_plan: true }),
                AppUser.filter({ role: 'leiloeiro' }),
                AppUser.filter({ role: 'admin' })
            ]);

            let todosArrematantes = [...(arrData || []), ...(admData || [])];

            // Busca os responsáveis cuja role pode não ser nem leiloeiro nem strict 'admin'
            const missingIds = [...new Set(
                (usuarios || []).map(u => u.arrematante_responsavel_id || u.referred_by_id)
                .filter(id => id && !todosArrematantes.some(a => a.id === id))
            )];

            if (missingIds.length > 0) {
                const missingUsers = await Promise.all(missingIds.map(id => AppUser.filter({ id })));
                missingUsers.forEach(res => {
                    if (res && res[0]) todosArrematantes.push(res[0]);
                });
            }

            setInvestidores(usuarios || []);
            setLotes(leiloesData || []);
            setArrematantes(todosArrematantes);
        } catch (error) {
            console.error('[CRMInvestidores] Erro ao carregar dados:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const totalSaldoGeral = investidores.reduce((acc, inv) => acc + (inv.saldo_disponivel ?? 0) + (inv.saldo_alocado ?? 0), 0);
    const totalAlocado = investidores.reduce((acc, inv) => acc + (inv.saldo_alocado ?? 0), 0);
    const lotesAtivos = lotes.filter(l => l.status === 'active');

    const investidoresFiltrados = useMemo(() => {
        let lista = investidores.filter(inv =>
            !busca ||
            inv.full_name?.toLowerCase().includes(busca.toLowerCase()) ||
            inv.email?.toLowerCase().includes(busca.toLowerCase())
        );
        if (filtroCard === 'comCapital') lista = lista.filter(inv => (inv.saldo_disponivel ?? 0) + (inv.saldo_alocado ?? 0) > 0);
        if (filtroCard === 'alocado') lista = lista.filter(inv => (inv.saldo_alocado ?? 0) > 0);
        return lista;
    }, [investidores, busca, filtroCard]);

    // Agrupamento por arrematante
    const gruposPorArrematante = useMemo(() => {
        const mapa = {};
        investidores.forEach(inv => {
            const key = inv.arrematante_responsavel_id || inv.referred_by_id || '__sem_arrematante__';
            if (!mapa[key]) mapa[key] = [];
            mapa[key].push(inv);
        });
        return Object.entries(mapa).map(([arrId, invs]) => {
            const arr = arrematantes.find(a => a.id === arrId);
            let arrNome = 'Sem Vínculo/Desconhecido';
            if (arr) {
                arrNome = arr.role === 'admin' ? `Admin: ${arr.full_name || 'Sem Nome'}` : (arr.full_name || 'Desconhecido');
            }
            const capitalTotal = invs.reduce((s, i) => s + (i.saldo_disponivel ?? 0) + (i.saldo_alocado ?? 0), 0);
            return { arrId, arrNome, invs, capitalTotal };
        }).sort((a, b) => b.capitalTotal - a.capitalTotal);
    }, [investidores, arrematantes]);

    const getNomeArrematante = (inv) => {
        const id = inv.arrematante_responsavel_id || inv.referred_by_id;
        if (!id) return '—';
        const arr = arrematantes.find(a => a.id === id);
        if (!arr) return '—';
        return arr.role === 'admin' ? `Admin: ${arr.full_name || 'Sem Nome'}` : arr.full_name;
    };

    const metricas = [
        { label: 'Investidores', value: investidores.length, icon: Users, color: 'text-violet-400', filtro: null },
        { label: 'Capital Total', value: formatCurrency(totalSaldoGeral), icon: DollarSign, color: 'text-emerald-400', filtro: 'comCapital' },
        { label: 'Capital Alocado', value: formatCurrency(totalAlocado), icon: Activity, color: 'text-amber-400', filtro: 'alocado' },
        { label: 'Lotes Ativos', value: lotesAtivos.length, icon: TrendingUp, color: 'text-blue-400', filtro: null },
    ];

    return (
        <><div className="min-h-screen bg-[#0d1117] text-slate-200 font-sans p-4 xl:p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <header className="mb-8">
                    <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold tracking-widest uppercase">
                        <Briefcase size={14} />
                        Painel Administrativo
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                            CRM de <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Investidores</span>
                        </h1>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm border border-[#30363d] rounded-lg px-3 py-2 transition-colors">
                                <ArrowLeft size={14} /> Voltar
                            </button>
                            <button onClick={() => navigate(createPageUrl('GestaoLotes'))} className="flex items-center gap-2 text-slate-300 hover:text-white text-sm font-bold border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg px-4 py-2 transition-colors">
                                <FolderOpen size={14} /> Gestão de Lotes
                            </button>
                            <button onClick={() => navigate(createPageUrl('AnaliseDeLotes'))} className="flex items-center gap-2 text-slate-300 hover:text-white text-sm font-bold border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg px-4 py-2 transition-colors">
                                <FileSpreadsheet size={14} /> Importar & Analisar Planilha
                            </button>
                            <button onClick={() => setShowCadastro(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg px-4 py-2 transition-colors">
                                <UserPlus size={14} /> Cadastrar Investidor
                            </button>
                            <button onClick={loadDados} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors border border-[#30363d] rounded-lg px-3 py-2">
                                <RefreshCw size={14} /> Atualizar
                            </button>
                        </div>
                    </div>
                </header>

                {/* Cards de Métricas — clicáveis para filtrar apenas para admin/leiloeiro */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {metricas.map((m, i) => {
                        const isActive = filtroCard === m.filtro && m.filtro !== null;
                        const canFilter = (userRole === 'admin' || userRole === 'leiloeiro') && m.filtro;
                        return (
                            <button
                                key={i}
                                onClick={() => canFilter ? setFiltroCard(filtroCard === m.filtro ? null : m.filtro) : null}
                                className={`bg-[#161b22] border-2 rounded-2xl p-5 text-left transition-all ${canFilter ? 'cursor-pointer hover:bg-[#1c2230]' : 'cursor-default'} ${isActive ? 'border-violet-500 shadow-lg shadow-violet-500/10' : 'border-[#30363d]'}`}
                            >
                                <m.icon className={`${m.color} mb-3`} size={22} />
                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{m.label}</p>
                                <p className="text-2xl font-black text-white">{m.value}</p>
                                {canFilter && <p className="text-[10px] text-slate-600 mt-1">{isActive ? 'Clique para limpar' : 'Clique para filtrar'}</p>}
                            </button>
                        );
                    })}
                </div>

                {/* Toggle Lista / Por Arrematante */}
                <div className="flex items-center gap-2">
                    <div className="flex bg-[#161b22] border border-[#30363d] rounded-lg p-1 gap-1">
                        <button
                            onClick={() => setViewMode('lista')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${viewMode === 'lista' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            <LayoutList size={14} /> Lista
                        </button>
                        <button
                            onClick={() => setViewMode('arrematante')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${viewMode === 'arrematante' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            <LayoutGrid size={14} /> Por Arrematante
                        </button>
                    </div>
                    {filtroCard && (
                        <button onClick={() => setFiltroCard(null)} className="text-xs text-red-400 border border-red-500/30 rounded-lg px-3 py-2 hover:bg-red-500/10 transition-colors">
                            Limpar filtro
                        </button>
                    )}
                </div>

                {/* Busca e Filtros — apenas na lista */}
                {viewMode === 'lista' && (
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-4">
                        <div className="relative w-full sm:w-auto flex-1">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Buscar investidor por nome ou email..."
                                value={busca}
                                onChange={e => setBusca(e.target.value)}
                                className="w-full bg-[#161b22] border border-[#30363d] rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
                            />
                        </div>
                        {(userRole === 'admin' || userRole === 'leiloeiro') && (
                            <div className="flex items-center gap-3 w-full sm:w-auto bg-[#161b22] border border-[#30363d] px-4 py-2.5 rounded-lg">
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium transition-colors hover:text-white text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={filtroCard === 'comCapital'}
                                        onChange={(e) => setFiltroCard(e.target.checked ? 'comCapital' : null)}
                                        className="w-4 h-4 rounded border-[#30363d] bg-[#0d1117] text-violet-500 focus:ring-violet-500/30 accent-violet-500 cursor-pointer"
                                    />
                                    Ocultar investidores sem saldo
                                </label>
                            </div>
                        )}
                    </div>
                )}

                {/* VISÃO LISTA */}
                {viewMode === 'lista' && (
                    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl overflow-hidden">
                        <div className="p-6 border-b border-[#30363d] flex items-center gap-3">
                            <Users className="text-violet-400" />
                            <h3 className="font-bold text-white text-lg">Investidores Cadastrados</h3>
                            <span className="ml-auto text-xs text-slate-500">{investidoresFiltrados.length} resultado(s)</span>
                        </div>

                        {isLoading ? (
                            <div className="flex justify-center py-16">
                                <div className="w-10 h-10 border-4 border-slate-700 border-t-violet-500 rounded-full animate-spin" />
                            </div>
                        ) : investidoresFiltrados.length === 0 ? (
                            <div className="py-12 text-center text-slate-500 text-sm">
                                {busca
                                    ? 'Nenhum investidor encontrado para essa busca.'
                                    : filtroCard
                                        ? 'Nenhum investidor corresponde ao filtro atual. Tente desativar "Ocultar investidores sem saldo".'
                                        : 'Nenhum investidor cadastrado ainda.'}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-[#0d1117] text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                            <th className="px-6 py-4">Investidor</th>
                                            <th className="px-6 py-4">Contato</th>
                                            <th className="px-6 py-4">Arrematante</th>
                                            <th className="px-6 py-4">Saldo Livre</th>
                                            <th className="px-6 py-4">Alocado</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {investidoresFiltrados.map(inv => {
                                            const capitalTotal = (inv.saldo_disponivel ?? 0) + (inv.saldo_alocado ?? 0);
                                            const isAltoCapital = capitalTotal >= 10000;
                                            return (
                                                <tr key={inv.id} className="border-b border-[#30363d]/50 hover:bg-white/[0.02] transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar name={inv.full_name} />
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-semibold text-white">{inv.full_name}</p>
                                                                    {isAltoCapital && (
                                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                                                            💰 ALTO
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-slate-500">{inv.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-400 text-xs">{inv.phone || '—'}</td>
                                                    <td className="px-6 py-4 text-xs">
                                                        {(inv.arrematante_responsavel_id || inv.referred_by_id) ? (
                                                            <span className="text-emerald-400 font-semibold">{getNomeArrematante(inv)}</span>
                                                        ) : (
                                                            <span className="text-slate-600">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-emerald-400">{formatCurrency(inv.saldo_disponivel)}</td>
                                                    <td className="px-6 py-4 font-bold text-amber-400">{formatCurrency(inv.saldo_alocado)}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="px-2 py-1 rounded text-[10px] font-bold tracking-wider bg-emerald-500/10 text-emerald-400">
                                                            Ativo
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button onClick={() => navigate(createPageUrl('Profile') + `?user_id=${inv.id}`)} className="text-slate-500 hover:text-violet-400 transition-colors">
                                                            <Eye size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* VISÃO POR ARREMATANTE */}
                {viewMode === 'arrematante' && (
                    <div className="space-y-4">
                        {gruposPorArrematante.map(({ arrId, arrNome, invs, capitalTotal }) => (
                            <div key={arrId} className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl overflow-hidden">
                                <div className="p-5 border-b border-[#30363d] bg-[#0d1117]/60 flex items-center justify-between flex-wrap gap-3">
                                    <div className="flex items-center gap-3">
                                        <Avatar name={arrNome} />
                                        <div>
                                            <p className="font-bold text-white text-base">{arrNome}</p>
                                            <p className="text-xs text-slate-500">{invs.length} investidor{invs.length !== 1 ? 'es' : ''} sob gestão</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Capital Captado</p>
                                            <p className="font-black text-emerald-400 text-lg">{formatCurrency(capitalTotal)}</p>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider ${arrId === '__sem_arrematante__' ? 'bg-slate-700 text-slate-400' : 'bg-violet-500/15 text-violet-400 border border-violet-500/30'}`}>
                                            {arrId === '__sem_arrematante__' ? 'SEM VÍNCULO' : 'ATIVO'}
                                        </span>
                                    </div>
                                </div>
                                <div className="divide-y divide-[#30363d]/50">
                                    {invs.map(inv => {
                                        const capitalInv = (inv.saldo_disponivel ?? 0) + (inv.saldo_alocado ?? 0);
                                        const isAlto = capitalInv >= 10000;
                                        return (
                                            <div key={inv.id} className="px-6 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <Avatar name={inv.full_name} />
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-semibold text-white text-sm">{inv.full_name}</p>
                                                            {isAlto && <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">💰 ALTO</span>}
                                                        </div>
                                                        <p className="text-xs text-slate-500">{inv.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6 text-sm">
                                                    <div className="text-right">
                                                        <p className="text-[10px] text-slate-600">Livre</p>
                                                        <p className="font-bold text-emerald-400">{formatCurrency(inv.saldo_disponivel)}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] text-slate-600">Alocado</p>
                                                        <p className="font-bold text-amber-400">{formatCurrency(inv.saldo_alocado)}</p>
                                                    </div>
                                                    <button onClick={() => navigate(createPageUrl('Profile') + `?user_id=${inv.id}`)} className="text-slate-500 hover:text-violet-400 transition-colors">
                                                        <Eye size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Lotes Ativos em Captação */}
                <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl overflow-hidden">
                    <div className="p-6 border-b border-[#30363d] flex items-center gap-3">
                        <TrendingUp className="text-blue-400" />
                        <h3 className="font-bold text-white text-lg">Lotes Ativos</h3>
                    </div>
                    {lotesAtivos.length === 0 ? (
                        <div className="py-10 text-center text-slate-500 text-sm">Nenhum lote ativo no momento.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#0d1117] text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                        <th className="px-6 py-4">Lote</th>
                                        <th className="px-6 py-4">Encerramento</th>
                                        <th className="px-6 py-4">Lance Atual</th>
                                        <th className="px-6 py-4">Vencedor</th>
                                        <th className="px-6 py-4"></th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {lotesAtivos.map(lote => (
                                        <tr key={lote.id} className="border-b border-[#30363d]/50 hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4 font-semibold text-white max-w-xs"><p className="truncate">{lote.title}</p></td>
                                            <td className="px-6 py-4 text-slate-400 whitespace-nowrap text-xs">{lote.end_time ? new Date(lote.end_time).toLocaleString('pt-BR') : '—'}</td>
                                            <td className="px-6 py-4 font-bold text-emerald-400">{formatCurrency(lote.current_price || lote.starting_price)}</td>
                                            <td className="px-6 py-4 text-slate-400 text-xs">{lote.winner_name || '—'}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => navigate(createPageUrl('VisualizarLote') + `?id=${lote.id}`)} className="text-slate-500 hover:text-blue-400 transition-colors">
                                                    <Eye size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>

            {showCadastro && (
                <CadastroInvestidorModal
                    onClose={() => setShowCadastro(false)}
                    onSuccess={() => { setShowCadastro(false); loadDados(); }}
                />
            )}
        </>
    );
}