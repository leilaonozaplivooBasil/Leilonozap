import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, Search, Briefcase, DollarSign, Activity, RefreshCw, Eye, UserPlus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import CadastroArrematanteModal from '@/components/crm/CadastroArrematanteModal';

const AppUser = base44.entities.AppUser;
const Auction = base44.entities.Auction;

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val ?? 0);

export default function CRMInvestidores() {
    const [investidores, setInvestidores] = useState([]);
    const [lotes, setLotes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [busca, setBusca] = useState('');
    const [showCadastro, setShowCadastro] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        loadDados();
    }, []);

    const loadDados = async () => {
        setIsLoading(true);
        try {
            const [usuarios, leiloesData] = await Promise.all([
                AppUser.filter({ role: 'investidor' }),
                Auction.list('-created_date', 100)
            ]);
            setInvestidores(usuarios || []);
            setLotes(leiloesData || []);
        } catch (error) {
            console.error('[CRMInvestidores] Erro ao carregar dados:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const investidoresFiltrados = investidores.filter(inv =>
        !busca ||
        inv.full_name?.toLowerCase().includes(busca.toLowerCase()) ||
        inv.email?.toLowerCase().includes(busca.toLowerCase())
    );

    const totalSaldoGeral = investidores.reduce((acc, inv) => acc + (inv.saldo_disponivel ?? 0) + (inv.saldo_alocado ?? 0), 0);
    const totalAlocado = investidores.reduce((acc, inv) => acc + (inv.saldo_alocado ?? 0), 0);
    const lotesAtivos = lotes.filter(l => l.status === 'active');

    return (
        <><div className="min-h-screen bg-[#0d1117] text-slate-200 font-sans p-4 xl:p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <header className="mb-8">
                    <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold tracking-widest uppercase">
                        <Briefcase size={14} />
                        Painel Administrativo
                    </div>
                    <div className="flex items-center justify-between">
                        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                            CRM de <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Investidores</span>
                        </h1>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowCadastro(true)}
                                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold rounded-lg px-4 py-2 transition-colors"
                            >
                                <UserPlus size={14} /> Cadastrar Arrematante
                            </button>
                            <button onClick={loadDados} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors border border-[#30363d] rounded-lg px-3 py-2">
                                <RefreshCw size={14} /> Atualizar
                            </button>
                        </div>
                    </div>
                </header>

                {/* Métricas */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Investidores', value: investidores.length, icon: Users, color: 'text-violet-400' },
                        { label: 'Capital Total', value: formatCurrency(totalSaldoGeral), icon: DollarSign, color: 'text-emerald-400' },
                        { label: 'Capital Alocado', value: formatCurrency(totalAlocado), icon: Activity, color: 'text-amber-400' },
                        { label: 'Lotes Ativos', value: lotesAtivos.length, icon: TrendingUp, color: 'text-blue-400' },
                    ].map((m, i) => (
                        <div key={i} className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5">
                            <m.icon className={`${m.color} mb-3`} size={22} />
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{m.label}</p>
                            <p className="text-2xl font-black text-white">{m.value}</p>
                        </div>
                    ))}
                </div>

                {/* Busca */}
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Buscar investidor por nome ou email..."
                        value={busca}
                        onChange={e => setBusca(e.target.value)}
                        className="w-full bg-[#161b22] border border-[#30363d] rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
                    />
                </div>

                {/* Tabela de Investidores */}
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
                            {busca ? 'Nenhum investidor encontrado para essa busca.' : 'Nenhum investidor cadastrado ainda.'}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#0d1117] text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                        <th className="px-6 py-4">Investidor</th>
                                        <th className="px-6 py-4">Contato</th>
                                        <th className="px-6 py-4">Saldo Livre</th>
                                        <th className="px-6 py-4">Alocado</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4"></th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {investidoresFiltrados.map(inv => (
                                        <tr key={inv.id} className="border-b border-[#30363d]/50 hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-white">{inv.full_name}</p>
                                                <p className="text-xs text-slate-500">{inv.email}</p>
                                            </td>
                                            <td className="px-6 py-4 text-slate-400 text-xs">
                                                {inv.phone || '—'}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-emerald-400">
                                                {formatCurrency(inv.saldo_disponivel)}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-amber-400">
                                                {formatCurrency(inv.saldo_alocado)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 rounded text-[10px] font-bold tracking-wider bg-emerald-500/10 text-emerald-400">
                                                    Ativo
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => navigate(createPageUrl('Profile') + `?user_id=${inv.id}`)}
                                                    className="text-slate-500 hover:text-violet-400 transition-colors"
                                                >
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
                                            <td className="px-6 py-4 font-semibold text-white max-w-xs">
                                                <p className="truncate">{lote.title}</p>
                                            </td>
                                            <td className="px-6 py-4 text-slate-400 whitespace-nowrap text-xs">
                                                {lote.end_time ? new Date(lote.end_time).toLocaleString('pt-BR') : '—'}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-emerald-400">
                                                {formatCurrency(lote.current_price || lote.starting_price)}
                                            </td>
                                            <td className="px-6 py-4 text-slate-400 text-xs">
                                                {lote.winner_name || '—'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => navigate(createPageUrl('AuctionRoom') + `?id=${lote.id}`)}
                                                    className="text-slate-500 hover:text-blue-400 transition-colors"
                                                >
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
            <CadastroArrematanteModal
                onClose={() => setShowCadastro(false)}
                onSuccess={() => { setShowCadastro(false); loadDados(); }}
            />
        )}
        </>
    );
}