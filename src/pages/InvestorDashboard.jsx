import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { getPartnerPurchases } from '@/functions/getPartnerPurchases';
import ParceiroSidebar from '@/components/parceiro/painel/ParceiroSidebar';
import ParceiroPainelGate from '@/components/parceiro/painel/ParceiroPainelGate';
import ParceiroPainelResumo from '@/components/parceiro/painel/ParceiroPainelResumo';
import ParceiroComoFunciona from '@/components/parceiro/painel/ParceiroComoFunciona';
import ParceiroPainelEmBreve from '@/components/parceiro/painel/ParceiroPainelEmBreve';
import ParceiroOperacoesAtivas from '@/components/parceiro/painel/ParceiroOperacoesAtivas';
import ParceiroPlanosModal from '@/components/parceiro/painel/ParceiroPlanosModal';
import ParceiroTermoSigilo from '@/components/parceiro/painel/ParceiroTermoSigilo';
import { isParceiroValidador } from '@/lib/parceiroValidadores';
import {
  LayoutGrid,
  ShieldCheck,
  Factory,
  BarChart3,
  Sparkles,
  FileSignature,
  History,
  Receipt,
} from 'lucide-react';

const FeaturedProduct = base44.entities.FeaturedProduct;

// 🧭 Telas do painel (padrão "tela a tela" do Painel de Alavancagem).
const TELAS = [
  { id: 'visao', rotulo: 'Visão geral', rotuloCurto: 'Visão Geral', icone: LayoutGrid },
  {
    id: 'nda',
    rotulo: 'Confidencialidade',
    rotuloCurto: 'Sigilo',
    icone: ShieldCheck,
    titulo: 'Termo de confidencialidade',
    texto:
      'Assinatura digital do termo de confidencialidade, espelhando a Cláusula 12 do Contrato de Parceria (sigilo por 5 anos), com aceite registrado e download em PDF.',
  },
  {
    id: 'operacao',
    rotulo: 'A operação por dentro',
    rotuloCurto: 'A Operação',
    icone: Factory,
    exigeNda: true,
    titulo: 'A operação por dentro',
    texto:
      'Como compramos (Cláusula 4.1), a estrutura de precificação da operação e como cadastramos e vendemos, com espaço para os vídeos reais da operação. Liberado após a assinatura do termo de confidencialidade.',
  },
  {
    id: 'analisador',
    rotulo: 'Analisador',
    rotuloCurto: 'Analisador',
    icone: BarChart3,
    exigeNda: true,
    titulo: 'Analisador de lotes',
    texto:
      'Acesso em modo consulta ao nosso analisador, com lotes reais já arrematados para o parceiro medir o resultado da operação. Liberado após a assinatura do termo de confidencialidade.',
  },
  {
    id: 'oportunidades',
    rotulo: 'Oportunidades do dia',
    rotuloCurto: 'Oportunidades',
    icone: Sparkles,
    exigeNda: true,
    titulo: 'Oportunidades do dia',
    texto:
      'Lotes disponíveis para comprar junto com a operação, atualizados diariamente. Liberado após a assinatura do termo de confidencialidade.',
  },
  {
    id: 'contrato',
    rotulo: 'Contrato e plano',
    rotuloCurto: 'Contrato',
    icone: FileSignature,
    titulo: 'Contrato de Parceria e plano',
    texto:
      'Leitura do Contrato de Parceria Comercial, aceite eletrônico (Lei nº 14.063/2020 e MP nº 2.200-2/2001) e download do PDF. Por enquanto, use o botão "Contratar novo plano" na visão geral.',
  },
  {
    id: 'linha',
    rotulo: 'Linha do tempo',
    rotuloCurto: 'Linha do Tempo',
    icone: History,
    titulo: 'Linha do tempo do aporte',
    texto:
      'Da assinatura do contrato até o produto no ar na Loja Virtual, etapa por etapa, com registro real da operação. Visível após a assinatura do contrato.',
  },
  {
    id: 'contas',
    rotulo: 'Prestação de contas',
    rotuloCurto: 'Prestação',
    icone: Receipt,
    titulo: 'Prestação de contas',
    texto:
      'Extrato das operações e demonstrativo de resultados previstos na Cláusula 7.4, somente com dados apurados. Aguardando o primeiro ciclo (até 60 dias, Cláusula 8.2).',
  },
];

const COMMON_FEATURES = [
  'Gestão operacional integral',
  'Produtos pré-selecionados por curadoria própria',
  'Primeiro ciclo em até 60 dias (Cláusula 8.2)',
  'Suporte dedicado',
];

const PORTFOLIOS = [
  {
    id: 1,
    name: 'Plano Visionário',
    minInvestment: 5000,
    expectedReturn: 3,
    duration: 60,
    products: ['Eletrônicos'],
    risk: 'Baixo',
    description: 'Ideal para quem está começando. Produtos de alta liquidez e demanda garantida.',
    features: COMMON_FEATURES,
    imageKey: 'eletronicos',
  },
  {
    id: 2,
    name: 'Plano Sócios de Ouro',
    minInvestment: 15000,
    expectedReturn: 3,
    duration: 60,
    products: ['Eletrodomésticos', 'Eletrônicos', 'Apple'],
    risk: 'Baixo',
    description: 'Para parceiros que buscam maior retorno com segurança.',
    features: COMMON_FEATURES,
    imageKey: 'eletrodomesticos',
  },
  {
    id: 3,
    name: 'Plano Elite',
    minInvestment: 30000,
    expectedReturn: 3,
    duration: 60,
    products: ['Todas as categorias'],
    risk: 'Baixo',
    description: 'Máximo retorno com acesso a todas as oportunidades.',
    features: COMMON_FEATURES,
    imageKey: 'apple',
  },
];

export default function InvestorDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeInvestments, setActiveInvestments] = useState([]);
  const [showInvestments, setShowInvestments] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [planoInicialIndex, setPlanoInicialIndex] = useState(0);
  const [productImages, setProductImages] = useState({});
  const [telaAtiva, setTelaAtiva] = useState('visao');
  const [assinouContrato, setAssinouContrato] = useState(false);
  // 📜 Registro do Termo de Confidencialidade (trilha de auditoria). Fonte de
  // verdade de "assinou o sigilo" — é o que libera Operação/Analisador/Oportunidades.
  const [registroSigilo, setRegistroSigilo] = useState(null);

  // 🔓 Conta validadora (homologação): vê o painel como se já tivesse assinado
  // o termo de confidencialidade e o contrato. Só visualização — nada é alterado
  // no banco nem no cadastro do usuário.
  const ehValidador = isParceiroValidador(currentUser);

  const ndaAssinado = ehValidador || !!registroSigilo || !!currentUser?.parceiro_nda_aceito_em;
  const contratoAssinado = ehValidador || activeInvestments.length > 0 || assinouContrato;

  // 🖤 Tema preto/dourado institucional escopado a esta página.
  useEffect(() => {
    document.body.classList.add('pc-tema');
    return () => document.body.classList.remove('pc-tema');
  }, []);

  // 🔄 Carrega usuário + planos ativos (lógica inalterada)
  const loadUserData = async () => {
    try {
      const savedUserJSON = localStorage.getItem('currentUser');
      if (!savedUserJSON) {
        navigate(createPageUrl('Partners'));
        return;
      }

      const userFromStorage = JSON.parse(savedUserJSON);
      const freshUsers = await base44.entities.AppUser.filter({ id: userFromStorage.id });
      const user = freshUsers && freshUsers.length > 0 ? freshUsers[0] : userFromStorage;

      try {
        await base44.entities.AppUser.update(user.id, {
          last_dashboard_access: new Date().toISOString(),
        });
      } catch (e) {
        console.debug('Registro de acesso ignorado');
      }

      setCurrentUser(user);

      // 📜 Já assinou o Termo de Confidencialidade? (somente leitura)
      try {
        const resp = await base44.functions.invoke('consultarAssinaturaSigilo', {
          user_id: user.id,
          documento: 'termo_confidencialidade',
        });
        const reg = resp?.registro || resp?.data?.registro || null;
        if (reg) setRegistroSigilo(reg);
      } catch (e) {
        console.debug('Consulta do termo de sigilo indisponível');
      }

      try {
        const products = await FeaturedProduct.filter({ is_active: true });
        const imageMap = {};
        products.forEach((product) => {
          const category = product.category?.toLowerCase();
          if (category === 'eletrônicos' || category === 'eletronicos') {
            imageMap.eletronicos = product.image_url;
          } else if (category === 'eletrodomésticos' || category === 'eletrodomesticos') {
            imageMap.eletrodomesticos = product.image_url;
          } else if (category === 'apple') {
            imageMap.apple = product.image_url;
          }
        });
        setProductImages(imageMap);
      } catch (error) {
        console.error('Erro ao carregar imagens:', error);
      }

      const investments = [];

      try {
        if (!user.id) throw new Error('User ID não encontrado');

        const response = await getPartnerPurchases({
          mode: 'user',
          user_id: user.id,
          status_filter: 'active',
          app_user_email: user.email,
          app_user_id: user.id,
        });
        const purchases = response?.data?.purchases || [];

        purchases.forEach((purchase) => {
          const rate = (purchase.investment_rate || 3) / 100;
          const periods = purchase.purchase_periods || [];
          const paidPeriods = periods.filter((p) => p.status === 'paid').length;
          const monthlyProfit = Math.round(purchase.plan_amount * rate);
          const paidProfit = paidPeriods * monthlyProfit;
          const totalEstimatedProfit = 12 * monthlyProfit;

          investments.push({
            id: purchase.id,
            plan: purchase.is_investment
              ? `${purchase.plan_name} - Investimento ${purchase.investment_rate}%`
              : purchase.plan_name,
            amount: purchase.plan_amount,
            startDate: purchase.activated_at,
            currentStep: 0,
            products: [],
            isInvestment: !!purchase.is_investment,
            investmentRate: purchase.investment_rate || 3,
            ...(purchase.is_investment
              ? {
                  accumulatedReturn: purchase.accumulated_return || 0,
                  withdrawalDate: purchase.withdrawal_available_date,
                }
              : {}),
            estimatedProfit: totalEstimatedProfit,
            monthlyProfit,
            paidPeriods,
            paidProfit,
            totalPeriods: 12,
            purchasePeriods: periods,
            estimatedReturn: purchase.is_investment
              ? purchase.withdrawal_available_date ||
                new Date(new Date(purchase.activated_at).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()
              : new Date(new Date(purchase.activated_at).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          });
        });
      } catch (error) {
        console.error('❌ Erro ao buscar PartnerPlanPurchase:', error.message);
      }

      // 2️⃣ FALLBACK legacy no AppUser
      if (investments.length === 0) {
        if (user.active_partner_plan && user.partner_plan_amount && user.partner_plan_activated_at) {
          investments.push({
            id: `legacy_${user.id}`,
            plan: user.active_partner_plan,
            amount: user.partner_plan_amount,
            startDate: user.partner_plan_activated_at,
            currentStep: 0,
            products: [],
            isInvestment: false,
            estimatedProfit: Math.round(user.partner_plan_amount * 0.03),
            estimatedReturn: new Date(
              new Date(user.partner_plan_activated_at).getTime() + 60 * 24 * 60 * 60 * 1000
            ).toISOString(),
          });
        }
      }

      setActiveInvestments(investments);
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
      navigate(createPageUrl('Partners'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();

    // 🔄 Recarrega ao voltar o foco (usuário volta do app do banco)
    const handleFocus = () => loadUserData();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
     
  }, [navigate]);

  // Abre o modal já no plano escolhido na página do Parceiro
  useEffect(() => {
    if (!location.state?.package) return;
    const pkg = location.state.package;
    const idx = PORTFOLIOS.findIndex(
      (p) => p.minInvestment === pkg.minInvestment || p.name === pkg.name
    );
    if (idx !== -1) {
      setPlanoInicialIndex(idx);
      setShowPlansModal(true);
    }
    navigate(location.pathname, { replace: true, state: {} });
     
  }, [location.state?.package]);

  const totalInvested = activeInvestments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaidProfit = activeInvestments.reduce((sum, inv) => sum + (inv.paidProfit || 0), 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  const telaSelecionada = TELAS.find((t) => t.id === telaAtiva);

  return (
    <div className="flex min-h-screen w-full bg-pc-preto text-pc-tinta">
      {/* 🧭 MENU LATERAL (desktop) / barra inferior (mobile) */}
      <ParceiroSidebar
        telas={TELAS.map((t) => ({
          ...t,
          bloqueada: !!t.exigeNda && !ndaAssinado,
        }))}
        telaAtiva={telaAtiva}
        onSelecionar={setTelaAtiva}
      />

      {/* 🖥️ TELA CHEIA: sem max-w/mx-auto — o conteúdo usa toda a largura
          restante, com respiro lateral progressivo (padrão Mercado Pago).
          pb extra no mobile por causa da barra inferior fixa. */}
      <main className="min-w-0 flex-1 px-4 pb-28 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8 xl:px-10 md:pb-8">
        {telaAtiva === 'visao' && (
          <>
            <ParceiroPainelGate
              ndaAssinado={ndaAssinado}
              contratoAssinado={contratoAssinado}
              onIrPara={setTelaAtiva}
            />
            <ParceiroPainelResumo
              user={currentUser}
              totalAportado={totalInvested}
              lucroApurado={totalPaidProfit}
              comprasAtivas={activeInvestments.length}
              planoAtual={activeInvestments[0]?.plan}
              onContratarPlano={() => setShowPlansModal(true)}
              onVerCompras={() => setShowInvestments(!showInvestments)}
            />
          </>
        )}

        {telaAtiva === 'visao' && activeInvestments.length > 0 && showInvestments && (
          <ParceiroOperacoesAtivas investimentos={activeInvestments} />
        )}

        {telaAtiva === 'visao' && <ParceiroComoFunciona />}

        {telaAtiva === 'nda' && (
          <ParceiroTermoSigilo
            user={currentUser}
            registro={registroSigilo}
            liberadoValidacao={ehValidador}
            onAssinado={(reg) => setRegistroSigilo(reg)}
          />
        )}

        {telaAtiva !== 'visao' && telaAtiva !== 'nda' && telaSelecionada && (
          <ParceiroPainelEmBreve
            titulo={telaSelecionada.titulo}
            texto={telaSelecionada.texto}
            exigeNda={!!telaSelecionada.exigeNda && !ndaAssinado}
            onIrParaNda={() => setTelaAtiva('nda')}
            liberado={ehValidador}
          />
        )}

        <ParceiroPlanosModal
          open={showPlansModal}
          onOpenChange={setShowPlansModal}
          portfolios={PORTFOLIOS}
          productImages={productImages}
          currentUser={currentUser}
          planoInicialIndex={planoInicialIndex}
          temPlanosAtivos={activeInvestments.length > 0}
          onPagamentoConfirmado={loadUserData}
          onContratoAssinado={() => setAssinouContrato(true)}
        />
      </main>
    </div>
  );
}