import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { FileSpreadsheet, BarChart3, ShoppingBag, Wallet, Users, Settings, ArrowRight, ChevronRight, UserPlus } from 'lucide-react';
import CadastroArrematanteModal from '@/components/crm/CadastroArrematanteModal';

const modules = [
  {
    step: '01',
    title: 'Gestão de Lotes',
    desc: 'Publique lotes no marketplace, registre arremates e controle o ciclo de vida de cada lote.',
    icon: Settings,
    color: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
    iconColor: 'text-amber-400',
    page: 'GestaoLotes',
    role: 'admin',
    cta: 'Gerenciar Lotes',
  },
  {
    step: '02',
    title: 'Importar & Analisar Planilha',
    desc: 'Faça upload do Excel do lote. O sistema extrai automaticamente produtos, classificações e valores de mercado.',
    icon: FileSpreadsheet,
    color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    iconColor: 'text-blue-400',
    page: 'AnaliseDeLotes',
    role: 'all',
    cta: 'Analisar Lote',
  },
  {
    step: '03',
    title: 'Marketplace de Lotes',
    desc: 'Investidores visualizam lotes disponíveis, analisam rentabilidade e autorizam lances com capital.',
    icon: ShoppingBag,
    color: 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/30',
    iconColor: 'text-indigo-400',
    page: 'MarketplaceLotes',
    role: 'all',
    cta: 'Ver Marketplace',
  },
  {
    step: '04',
    title: 'Carteira do Investidor',
    desc: 'Saldo disponível, capital alocado em lotes, histórico de depósitos e saques.',
    icon: Wallet,
    color: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
    iconColor: 'text-emerald-400',
    page: 'CarteiraInvestidor',
    role: 'all',
    cta: 'Ver Carteira',
  },
  {
    step: '05',
    title: 'CRM de Investidores',
    desc: 'Lista de investidores, saldos, lotes em participação e histórico de arremates por cliente.',
    icon: Users,
    color: 'from-violet-500/20 to-violet-600/10 border-violet-500/30',
    iconColor: 'text-violet-400',
    page: 'CRMInvestidores',
    role: 'admin',
    cta: 'Abrir CRM',
  },
  {
    step: '06',
    title: 'Cadastrar Arrematante',
    desc: 'Cadastre novos arrematantes diretamente pelo painel. O sistema envia e-mail com link de acesso automático.',
    icon: UserPlus,
    color: 'from-rose-500/20 to-rose-600/10 border-rose-500/30',
    iconColor: 'text-rose-400',
    page: null, // abre modal
    role: 'admin',
    cta: 'Cadastrar Arrematante',
  },
];

const flow = [
  'Importar Planilha',
  'Analisar Lote',
  'Publicar no Marketplace',
  'Investidor Autoriza Lance',
  'Depósito de Capital',
  'Equipe Arremata',
  'Resultado Registrado',
  'Saldo Atualizado',
];

export default function SistemaDeArremate() {
  const navigate = useNavigate();
  const [showCadastro, setShowCadastro] = useState(false);

  const stored = localStorage.getItem('currentUser');
  const currentUser = stored ? JSON.parse(stored) : null;
  const isAdmin = currentUser?.role === 'admin';

  const visibleModules = modules.filter(m => m.role === 'all' || isAdmin);

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-200 font-sans p-4 xl:p-8">
      <div className="max-w-6xl mx-auto space-y-10">

        {/* Header */}
        <header>
          <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-widest uppercase">
            <BarChart3 size={14} />
            Sistema Inteligente de Arremate
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-2">
            Sistema Inteligente de Arremate <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Leilões NoZap</span>
          </h1>
          <p className="text-slate-400 text-sm max-w-2xl">
            Importe planilhas de leilão, analise lotes automaticamente, conecte investidores e gerencie todo o ciclo do arremate em um único lugar.
          </p>
        </header>

        {/* Fluxo Visual */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Fluxo Completo</p>
          <div className="flex flex-wrap gap-2 items-center">
            {flow.map((step, i) => (
              <React.Fragment key={i}>
                <span className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300">
                  {step}
                </span>
                {i < flow.length - 1 && (
                  <ChevronRight size={14} className="text-slate-600 flex-shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Módulos */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {visibleModules.map((mod, i) => {
            const Icon = mod.icon;
            return (
              <div
                key={i}
                className={`bg-gradient-to-br ${mod.color} border rounded-2xl p-6 flex flex-col gap-4 hover:scale-[1.01] transition-transform`}
              >
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-black/20`}>
                    <Icon size={20} className={mod.iconColor} />
                  </div>
                  <span className="text-xs font-black text-slate-600">{mod.step}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white text-base mb-1">{mod.title}</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">{mod.desc}</p>
                </div>
                <button
                  onClick={() => navigate(createPageUrl(mod.page))}
                  className="flex items-center justify-between w-full mt-auto px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold text-white transition-colors"
                >
                  {mod.cta}
                  <ArrowRight size={14} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Modelos de Participação */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6">
            <span className="text-xs font-black text-blue-400 uppercase tracking-widest block mb-3">Modelo A</span>
            <h4 className="font-bold text-white text-lg mb-2">Compra Individual</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              Um único investidor financia o lote inteiro. Define o valor máximo autorizado, realiza o depósito com taxa de operação (10%) e a equipe participa do leilão em seu nome.
            </p>
          </div>
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6">
            <span className="text-xs font-black text-purple-400 uppercase tracking-widest block mb-3">Modelo B</span>
            <h4 className="font-bold text-white text-lg mb-2">Divisão de Capital</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              Vários investidores participam do mesmo lote, cada um com uma cota percentual. O capital é dividido proporcionalmente. Ideal para lotes de maior valor.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}