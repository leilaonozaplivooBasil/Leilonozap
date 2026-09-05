import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { fmtBR, parseValorBR } from '@/lib/money';
import { plataforma } from '@/api/plataformaClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  UserPlus, Search, Filter, X, Save, Send, CheckCircle, Package,
  Pencil, Plus, RefreshCw, TriangleAlert, ShieldAlert, Briefcase, DollarSign,
  // 🏛️ DIR-56 — ícones de traço no lugar dos emojis decorativos
  Sparkles, ShieldCheck, Users, PhoneCall, Presentation, Route, Gauge,
  GitBranch, BellRing
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { buildUnifiedCustomers, getNetworkDescendantIds, ROLE_LABEL } from '@/lib/crmUnifiedCustomers';
import { CAREER_LEVELS } from '@/lib/careerLevels';
import { visibilidadeDoUsuario, filtrarKpisPorVisao } from '@/lib/visibilidadePorPapel';
import { calcularCaptacao } from '@/lib/captacaoParceiros';
import { calcularMetaCentral, ritmoDiario } from '@/lib/metaCentral';
import { calcularDashboardDiretoria } from '@/lib/dashboardDiretoria';
import { resumoEscada, ESCADA_LICENCAS } from '@/lib/escadaLicencas';
import { PLANOS_PARCEIRO } from '@/lib/planosParceiro';
import { quemContatarHoje } from '@/lib/quemContatarHoje';
import { alertasEsteira, vendaRealDoCliente, resumoEsteira } from '@/lib/esteiraCaptacao';
import { linhaDoTempoCliente } from '@/lib/linhaDoTempoCliente';
import { membrosDoTopo } from '@/lib/timeCorporativo';
import { isVendaReal, isPosMarco } from '@/lib/dinheiroReal';
import { custoEstoqueRestante } from '@/lib/custoProduto';
import { listarTudo } from '@/lib/listarTudo';
import { montarVendedores } from '@/lib/vendedoresDoCrm';
import CrmStatsCards from './CrmStatsCards';
import CrmParceirosCompra from './CrmParceirosCompra';
import CrmMetaCentral from './CrmMetaCentral';
import CrmDashboardDiretoria from './CrmDashboardDiretoria';
import CrmEscadaLicencas from './CrmEscadaLicencas';
import CrmEsteiraCaptacao from './CrmEsteiraCaptacao';
import CrmEsteiraResumoExecutivo from './CrmEsteiraResumoExecutivo';
import CrmTimeCorporativo from './CrmTimeCorporativo';
import CrmMetodo from './CrmMetodo';
import { reuniaoIminente } from '@/lib/metodo'; // 🔔 DIR-53 — popup de reunião
import CrmResumo from './CrmResumo';
import CrmQuemContatar from './CrmQuemContatar';
import CrmFunilKanban from './CrmFunilKanban';
import CrmCustomersTable from './CrmCustomersTable';
import CrmCustomerDetailModal from './CrmCustomerDetailModal';

// 🧭 CRM realocado (18/08/2026): antes era a página standalone /CRM (acesso só
// admin, com header próprio). Agora vive como seção dentro de Central de
// Vendas no Painel de Alavancagem — mesmos dados, mesma lógica, só o local
// mudou. O controle de acesso (admin/super_admin) passa a vir de fora (prop
// isAdmin), já que aqui dentro não faz sentido "navegar pra Home".
// 🔄 Fontes automáticas (18/08/2026): a lista de clientes agora soma indicados
// (AppUser.referred_by_id) e compradores da Loja Virtual (CatalogSale.licensee_id)
// junto com o cadastro manual — ver src/lib/crmUnifiedCustomers.js.
export default function CrmClientesTab({ isAdmin, currentUser }) {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [purchaseStatusFilter, setPurchaseStatusFilter] = useState('all');
  const [roleTypeFilter, setRoleTypeFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [alertaReuniao, setAlertaReuniao] = useState(null); // 🔔 DIR-53
  const [alertasVistos, setAlertasVistos] = useState(() => new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedSeller, setSelectedSeller] = useState('');
  const [showSellerModal, setShowSellerModal] = useState(false);
  const [sellers, setSellers] = useState([]);
  const [allSellers, setAllSellers] = useState([]);
  const [editingSeller, setEditingSeller] = useState(null);
  const [activeTab, setActiveTab] = useState('customers');
  // 🧭 DIR-24 Fase 3 — o CRM virou 3 seções navegáveis (Visão Executiva /
  // Clientes / Expansão). null = ainda não escolheu: visão total abre na
  // Executiva (os números da diretoria), o resto abre direto em Clientes.
  const [secao, setSecao] = useState(null);
  const [subAcomp, setSubAcomp] = useState('clientes'); // DIR-43 — sub-aba do Hábito 6
  // Lista ou funil kanban na seção Clientes (DIR-24 Fase 5).
  const [visaoClientes, setVisaoClientes] = useState('lista');
  const [negotiations, setNegotiations] = useState([]);
  const [sellerFormData, setSellerFormData] = useState({
    name: '',
    phone: '',
    email: '',
    license_type: '',
    default_commission_percentage: 0,
    default_licenciante_commission_percentage: 0,
    is_active: true
  });
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    cpf: '',
    status: 'lead',
    source: 'site',
    notes: '',
    address_street: '',
    address_number: '',
    address_city: '',
    address_state: '',
    address_zip_code: '',
    last_contact: new Date().toISOString().split('T')[0],
    // 🎯 DIR-25 — acompanhamento no ato do cadastro (colunas já existentes)
    assigned_seller: '',
    follow_up_date: '',
    next_steps: '',
    interested_products: []
  });
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [availableProducts, setAvailableProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Fontes automáticas — visão ADMIN completa: todos os usuários, todas as
  // vendas da Loja Virtual e todos os arremates de Leilões da plataforma.
  const [appUsers, setAppUsers] = useState([]);
  const [catalogSales, setCatalogSales] = useState([]);
  const [auctions, setAuctions] = useState([]);
  // Histórico: na DIR-10 este card virou a comissão real (financial_income);
  // na DIR-21 o dono decidiu que o card do CRM mostra o FATURAMENTO BRUTO da
  // Loja (comprasBrutas) — a comissão continua no módulo Financeiro, que é a
  // fonte oficial de receita/imposto. Por isso financial_income não é mais
  // carregado aqui.
  // 🔴 DIR-20 — TODOS os produtos (galpão inteiro, 2.932 linhas medidas em
  // produção), não só os 302 publicados no catálogo: o "Valor Investido em
  // Estoque" mostrava R$ 9.309 quando o real (validado direto no banco) é
  // R$ 28.133 — a maior parte do estoque físico não está publicada na vitrine.
  const [allProducts, setAllProducts] = useState([]);
  // 🎯 DIR-22 — Parceiros de Compra: planos ativados (manual + Lucre Conosco).
  const [partnerPurchases, setPartnerPurchases] = useState([]);
  // 🏆 DIR-31 — contadores do Rank Premiado (/rankpremiado) pros KPIs da
  // diretoria: cadastros e visitas por link dos últimos 7 dias.
  const [concursoStats, setConcursoStats] = useState(null);
  // 🛤️ DIR-34 — Esteira de Captação (aportes e licenças, do agendamento à
  // assinatura). Tabela nova captacao_oportunidades.
  const [oportunidades, setOportunidades] = useState([]);
  const loadOportunidades = async () => {
    try {
      const ops = await listarTudo(plataforma.entities.CaptacaoOportunidade);
      setOportunidades(Array.isArray(ops) ? ops : []);
    } catch { setOportunidades([]); } // tabela ainda não migrada → esteira vazia, nada quebra
  };

  const loadAutoSources = async () => {
    try {
      const [users, sales, auctionsList, prods, partners] = await Promise.all([
        plataforma.entities.AppUser.list('-created_date', 5000),
        // 🔒 DIR-17 — mesma busca do Painel de Alavancagem (NetworkOverview.jsx),
        // parâmetro por parâmetro: telas que somam o mesmo dinheiro precisam ler
        // as MESMAS linhas, senão divergem por truncamento e não por lógica.
        plataforma.entities.CatalogSale.list('-created_date', 5000),
        plataforma.entities.Auction.list('-end_time', 2000),
        // 🔴 DIR-20 — TODOS os produtos exigem paginação: o Supabase corta em
        // 1000 linhas sem avisar, e a tabela tem ~3000 (ver src/lib/listarTudo.js).
        listarTudo(plataforma.entities.Product),
        plataforma.entities.PartnerPlanPurchase.list('-created_at', 1000).catch(() => []),
      ]);
      setAppUsers(Array.isArray(users) ? users : []);
      setCatalogSales(Array.isArray(sales) ? sales : []);
      setAuctions(Array.isArray(auctionsList) ? auctionsList.filter((a) => !!a.winner_id) : []);
      setAllProducts(Array.isArray(prods) ? prods : []);
      setPartnerPurchases(Array.isArray(partners) ? partners : []);
    } catch (error) {
      console.error('Erro ao carregar fontes automáticas do CRM:', error);
    }
  };

  // 🔓 DIR-24 Fase 2 (30/08/2026) — o CRM deixou de ser só de admin: TODO
  // usuário da Central de Vendas entra e vê o CRM DA PRÓPRIA REDE ("de mim
  // para baixo", árvore de indicação). Admin/super_admin seguem com a visão
  // total. O que é da EMPRESA (estoque do galpão, metas, dashboard da
  // diretoria, escada) continua aparecendo só na visão total — o escopo de
  // rede filtra usuários, vendas, leilões, parceiros, clientes manuais
  // (created_by_id) e negociações. Estrutura EXECUTIVA (executivo/diretor
  // enxergando a carteira designada) continua pendente — DIR-22 Fase 2.
  useEffect(() => {
    if (!currentUser?.id) { setIsLoading(false); return; }
    loadCustomers();
    loadSellers();
    loadNegotiations();
    loadProducts();
    loadAutoSources();
    loadOportunidades();
  }, [currentUser?.id]);

  // 🏆 DIR-31 — contadores do Rank Premiado (só visão total: a API exige
  // admin). Falhou/negou → fica null e os KPIs mostram "sem fonte".
  useEffect(() => {
    if (!currentUser?.id || !['admin', 'super_admin'].includes(currentUser?.role)) return;
    fetch('/api/concurso?action=stats_crm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUser.id }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j && typeof j.cadastros_7d === 'number') setConcursoStats(j); })
      .catch(() => {});
  }, [currentUser?.id, currentUser?.role]);

  // 🌳 ESCOPO DE REDE — "de mim para baixo": nunca a base inteira do app... a
  // menos que quem está olhando seja o super_admin. DIR-10 (27/08/2026), pedido
  // explícito do dono: um licenciado/vendedor precisa ver só a própria rede de
  // indicados (senão o CRM vira uma lista de clientes de todo mundo, inútil pra
  // ele); o super_admin precisa ver o negócio inteiro circulando entre todas as
  // estruturas, sem filtro nenhum — visão clara de tudo.
  // A árvore é construída com TODOS os usuários (precisa do grafo completo pra
  // achar sub-indicados), mas só entram na lista os IDs dentro da minha rede.
  // 🔴 DIR-22 (decisão do dono, 30/08/2026): visão TOTAL é do super_admin E
  // dos administrativos (role 'admin') — "só quem tem a visão geral é o super
  // adm e os administrativos". Executivo/diretor por estrutura vem na Fase 2.
  // 🏛️ DIR-32 — a visão vem da MATRIZ ÚNICA (visibilidadePorPapel.js):
  // visão total = admins + Admin Financeiro + cargos de diretoria
  // (executiva/operacional); dinheiro da empresa (custo/margem/estoque R$)
  // = só super_admin/admin/admin_financeiro; diretoria vê VENDA × META.
  // O nome isSuperAdmin foi mantido nos memos = "bypass do escopo de rede".
  const vis = React.useMemo(() => visibilidadeDoUsuario(currentUser), [currentUser]);
  const isSuperAdmin = vis.visaoTotal;
  const networkIds = React.useMemo(
    () => (!isSuperAdmin && currentUser?.id ? getNetworkDescendantIds(appUsers, currentUser.id) : new Set()),
    [appUsers, currentUser?.id, isSuperAdmin]
  );
  const networkAppUsers = React.useMemo(
    () => (isSuperAdmin ? appUsers : appUsers.filter((u) => networkIds.has(u.id))),
    [appUsers, networkIds, isSuperAdmin]
  );
  // Seletor "Vendedor responsável" — união de `sellers` com quem tem cargo
  // comercial no cadastro (ver src/lib/vendedoresDoCrm.js). Memoizado porque
  // `appUsers` traz até 5.000 linhas: calcular isto dentro do JSX refazia a
  // varredura inteira a cada tecla digitada no formulário de novo cliente.
  const vendedoresDoSeletor = React.useMemo(
    () => montarVendedores(sellers, appUsers),
    [sellers, appUsers]
  );
  // 🔴 DIR-10 — o "dono" de uma venda não vive só em licensee_id: dependendo do
  // canal (loja própria de licenciado, carrinho do site, PDV), fica gravado em
  // seller_id/anchor_id/owner_id (mesma constatação já feita em LicenseeOrders.jsx).
  // Olhar só licensee_id fazia a rede inteira ficar sem nenhuma venda, mesmo real.
  const networkCatalogSales = React.useMemo(
    () => (isSuperAdmin ? catalogSales : catalogSales.filter((s) =>
      [s.licensee_id, s.anchor_id, s.seller_id, s.owner_id].some((id) => id === currentUser?.id || networkIds.has(id))
    )),
    [catalogSales, networkIds, currentUser?.id, isSuperAdmin]
  );
  const networkAuctions = React.useMemo(
    () => (isSuperAdmin ? auctions : auctions.filter((a) => networkIds.has(a.winner_id))),
    [auctions, networkIds, isSuperAdmin]
  );
  // 🎯 DIR-22 — parceiros de compra no MESMO escopo do resto do CRM: visão
  // total pra admin/super_admin, rede própria pra todo o resto.
  const networkPartnerPurchases = React.useMemo(
    () => (isSuperAdmin ? partnerPurchases : partnerPurchases.filter((p) => networkIds.has(p.user_id) || p.user_id === currentUser?.id)),
    [partnerPurchases, networkIds, currentUser?.id, isSuperAdmin]
  );

  // 🔴 DIR-24 — clientes MANUAIS também têm escopo: quem não é visão total só
  // vê os que ELE (ou alguém da rede dele) cadastrou, pelo carimbo
  // created_by_id gravado no cadastro. Cadastro legado sem carimbo fica só na
  // visão total (não dá pra saber de quem é — melhor esconder do que vazar).
  const networkManualCustomers = React.useMemo(
    () => (isSuperAdmin ? customers : customers.filter(
      (c) => c.created_by_id && (c.created_by_id === currentUser?.id || networkIds.has(c.created_by_id))
    )),
    [customers, networkIds, currentUser?.id, isSuperAdmin]
  );
  // Negociação manual segue o cliente: só entra se o cliente dela está no
  // meu escopo (a tabela não tem dono próprio — o vínculo real é o cliente).
  const networkNegotiations = React.useMemo(() => {
    if (isSuperAdmin) return negotiations;
    const meusClientes = new Set(networkManualCustomers.map((c) => c.id));
    return negotiations.filter((n) => meusClientes.has(n.customer_id));
  }, [negotiations, networkManualCustomers, isSuperAdmin]);

  // 👤 DIR-54 — id → nome, pra identificar o DONO de cada cadastro na fila
  // do Hábito 4 (a visão total via de todo mundo sem dizer de quem era).
  const nomePorUsuarioId = React.useMemo(
    () => Object.fromEntries(appUsers.map((u) => [u.id, u.full_name || u.email || 'sem nome'])),
    [appUsers]
  );

  // Lista unificada: indicados + compras da Loja Virtual + cadastro manual (deduplicados)
  const unifiedCustomers = React.useMemo(
    () => buildUnifiedCustomers({ appUsers: networkAppUsers, catalogSales: networkCatalogSales, auctions: networkAuctions, manualCustomers: networkManualCustomers }),
    [networkAppUsers, networkCatalogSales, networkAuctions, networkManualCustomers]
  );

  // 🛤️ DIR-34 — escopo da esteira (prática de mercado): cada responsável vê
  // e move só a própria carteira; visão total (dono/admins/diretoria —
  // esteira é VENDA) vê tudo + ranking do time. PRECISA vir antes da fila
  // de contato, que lê os alertas da esteira — const depois do uso derruba a
  // renderização inteira (TDZ), foi o crash "Detectamos um problema".
  const networkOportunidades = React.useMemo(
    () => (isSuperAdmin ? oportunidades : oportunidades.filter(
      (o) => o.responsavel_id === currentUser?.id || o.criado_por_id === currentUser?.id
    )),
    [oportunidades, currentUser?.id, isSuperAdmin]
  );
  // 🛤️ DIR-36 — forecast da esteira no MESMO escopo (alimenta o card
  // Captação, a faixa da Visão Executiva e o 13º KPI da diretoria).
  const resumoEsteiraGeral = React.useMemo(
    () => resumoEsteira(networkOportunidades),
    [networkOportunidades]
  );
  // 🏛️ DIR-39 — o topo (Sócio Executivo → Fundador) direto do cadastro do
  // app: donos das metas, únicos responsáveis possíveis de contrato.
  const timeCorporativo = React.useMemo(() => membrosDoTopo(appUsers), [appUsers]);

  // 📞 DIR-24 Fase 4 — a fila diária de ação, no MESMO escopo de quem vê.
  const filaContato = React.useMemo(
    () => quemContatarHoje({ unifiedCustomers, sales: networkCatalogSales, alertasEsteiraLista: alertasEsteira(networkOportunidades) }),
    [unifiedCustomers, networkCatalogSales, networkOportunidades]
  );

  const [detailCustomer, setDetailCustomer] = useState(null);
  // 🛤️ DIR-36 — "Nova oportunidade" pré-preenchida a partir do cliente
  const [clientePreenchido, setClientePreenchido] = useState(null);

  // 🔗 DIR-36 — o que o modal do cliente mostra da esteira: as oportunidades
  // DELE e a linha do tempo completa (cadastro → depósitos → compras →
  // esteira → follow-up), tudo do mesmo escopo de quem vê.
  const oportunidadesDoCliente = React.useMemo(() => {
    if (!detailCustomer) return [];
    const email = String(detailCustomer.email || '').toLowerCase();
    return networkOportunidades.filter((o) =>
      (detailCustomer.user_id && o.cliente_user_id === detailCustomer.user_id)
      || (email && String(o.cliente_email || '').toLowerCase() === email));
  }, [detailCustomer, networkOportunidades]);
  const eventosDoCliente = React.useMemo(
    () => linhaDoTempoCliente({ cliente: detailCustomer, sales: networkCatalogSales, oportunidades: networkOportunidades }),
    [detailCustomer, networkCatalogSales, networkOportunidades]
  );
  const criarOportunidadeDoCliente = (c) => {
    setDetailCustomer(null);
    setSecao('acompanhamento');
    setSubAcomp('expansao');
    setClientePreenchido({
      cliente_nome: c.full_name || '',
      cliente_email: c.email || '',
      cliente_telefone: c.phone || '',
      cliente_user_id: c.user_id || null,
    });
  };

  // Carregar produtos automaticamente ao abrir modal
  useEffect(() => {
    if (showAddForm && availableProducts.length === 0) {
      loadProducts();
    }
  }, [showAddForm]);

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      // 🔴 DIR-10 — pegava só os 500 produtos mais recentes por data de criação,
      // sem o mesmo filtro catalog_active usado na vitrine (Catalog.jsx). Com
      // milhares de linhas históricas (produto vendido, amostra, lote zerado), o
      // estoque real podia nunca estar entre os 500 mais novos e o card fechava
      // em zero mesmo havendo produto de verdade. Mesmo filtro do catálogo público.
      const data = await plataforma.entities.Product.filter({ catalog_active: true }, '-created_date', 5000);
      // 🔎 DIR-25 — pedido do dono: "todos os produtos precisam estar
      // aparecendo". Produto sem estoque NÃO some mais (interesse em produto
      // esgotado é sinal de demanda — vale registrar); ele aparece marcado
      // "sem estoque". Quem tem estoque vem primeiro.
      const ordenados = (data || []).sort((a, b) => (Number(b.quantity) || 0 ? 1 : 0) - (Number(a.quantity) || 0 ? 1 : 0));
      setAvailableProducts(ordenados);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      setAvailableProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  // 🔴 DIR-10 — chamava /api/functions/adminDataProxy, uma função que nunca
  // existiu no servidor (404 sempre, "Volume em Negociação" sempre zero).
  // Negotiation já está mapeada no adapter (TABLE_MAP) como qualquer outra
  // entidade — mesmo caminho genérico usado por Customer/Seller/etc.
  const loadNegotiations = async () => {
    try {
      const data = await plataforma.entities.Negotiation.list('-created_date', 1000);
      setNegotiations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar negociações:', error);
      setNegotiations([]);
    }
  };

  // 🔴 02/09/2026 — "meu nome não está na aba de vendedor do CRM".
  // Não era permissão: o seletor lia SÓ a tabela `sellers`, lista herdada da
  // Base44 cuja linha mais nova é de 03/04/2026. Eram 29 nomes lá contra 60
  // pessoas com cargo comercial no cadastro — e só 2 em comum. Agora é a união
  // das duas fontes (ver src/lib/vendedoresDoCrm.js), sem tirar nome nenhum:
  // `assigned_seller` guarda TEXTO, então remover um nome órfãozaria o cliente
  // que aponta pra ele. `appUsers` já é carregado em loadAutoSources.
  const loadSellers = async () => {
    try {
      const activeSellers = await plataforma.entities.Seller.filter({ is_active: true });
      setSellers(Array.isArray(activeSellers) ? activeSellers : []);

      const all = await plataforma.entities.Seller.list('-created_date', 500);
      setAllSellers(all);
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      // 🔴 DIR-49.1 — o spinner de página inteira SÓ na primeira carga. Nas
      // recargas (depois de salvar um registro, qualificar, etc.) a tela fica
      // montada e os dados trocam no lugar — desmontar aqui matava o estado do
      // CrmMetodo (a conexão da Google Agenda "sumia" a cada salvamento).
      if (!customers.length) setIsLoading(true);
      // 🔴 DIR-24 — sem teto de 500 linhas: paginação por id (mesma proteção
      // contra o corte silencioso de 1000 do Supabase usada nos produtos).
      const data = await listarTudo(plataforma.entities.Customer);
      setCustomers(data || []);
      setFilteredCustomers(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      setCustomers([]);
      setFilteredCustomers([]);
      toast.error('Erro ao carregar clientes - tente novamente');
    } finally {
      setIsLoading(false);
    }
  };

  // 🔔 DIR-53 — vigia local: reunião MINHA começando em até 15 min → popup no
  // app (checa nos dados novos e a cada 30s; o alarme com o app FECHADO é o
  // do Google, configurado na criação do evento).
  useEffect(() => {
    const checar = () => {
      const r = reuniaoIminente(customers, currentUser?.id, new Date().toISOString(), 15);
      setAlertaReuniao(r && !alertasVistos.has(r.registro.id) ? r : null);
    };
    checar();
    const timer = setInterval(checar, 30000);
    return () => clearInterval(timer);
  }, [customers, currentUser?.id, alertasVistos]);

  const dispensarAlerta = () => {
    if (alertaReuniao) setAlertasVistos((prev) => new Set(prev).add(alertaReuniao.registro.id));
    setAlertaReuniao(null);
  };

  useEffect(() => {
    let filtered = unifiedCustomers;

    if (searchTerm) {
      // 🔎 DIR-24 Fase 5 — busca também por CPF (comparando só dígitos, com
      // ou sem pontuação nos dois lados).
      const termoDigitos = searchTerm.replace(/\D/g, '');
      filtered = filtered.filter(c =>
        c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm) ||
        (termoDigitos.length >= 3 && String(c.cpf || '').replace(/\D/g, '').includes(termoDigitos))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    if (sourceFilter !== 'all') {
      filtered = filtered.filter(c => (c.source || '').split('+').includes(sourceFilter));
    }

    if (purchaseStatusFilter !== 'all') {
      filtered = filtered.filter(c => (c.purchase_status || 'sem_compra') === purchaseStatusFilter);
    }

    if (roleTypeFilter !== 'all') {
      filtered = filtered.filter(c => c.role_type === roleTypeFilter);
    }

    setFilteredCustomers(filtered);
  }, [searchTerm, statusFilter, sourceFilter, purchaseStatusFilter, roleTypeFilter, unifiedCustomers]);

  // 🎖️ DIR-30 — nome amigável de QUALQUER cargo/licença do vendedor: primeiro
  // o plano de carreira oficial (careerLevels.js), depois as licenças de loja
  // legadas; id desconhecido aparece cru (nunca vira "Usuário" por engano).
  const LOJAS_LEGADO = {
    loja_inicial: 'Loja Inicial', loja_start: 'Loja Start', loja_profissional: 'Loja Profissional',
    loja_lider: 'Loja Líder', loja_distribuidor: 'Loja Distribuidor',
  };
  const nomeLicenca = (id) => {
    if (!id) return '-';
    const nivel = CAREER_LEVELS.find((l) => l.id === id);
    return nivel?.name || LOJAS_LEGADO[id] || id;
  };

  // ✏️ DIR-29 — editar cliente MANUAL direto no modal do CRM (o handleEdit
  // morto da DIR-28 voltou, desta vez LIGADO no botão lápis da tabela).
  // Recebe a linha crua da tabela customers (customer.raw).
  const handleEdit = (raw) => {
    setEditingCustomer(raw);
    setFormData({
      full_name: raw.full_name || '',
      email: raw.email || '',
      phone: raw.phone || '',
      cpf: raw.cpf || '',
      status: raw.status || 'lead',
      source: raw.source || 'site',
      notes: raw.notes || '',
      address_street: raw.address_street || '',
      address_number: raw.address_number || '',
      address_city: raw.address_city || '',
      address_state: raw.address_state || '',
      address_zip_code: raw.address_zip_code || '',
      last_contact: raw.last_contact || new Date().toISOString().split('T')[0],
      assigned_seller: raw.assigned_seller || '',
      follow_up_date: raw.follow_up_date ? String(raw.follow_up_date).slice(0, 10) : '',
      next_steps: raw.next_steps || '',
      interested_products: raw.interested_products || []
    });
    setShowAddForm(true);
  };

  // 🌊 DIR-29 — mover cliente MANUAL de coluna no funil (arrastar e soltar).
  const handleMoverNoFunil = async (customer, novoStatus) => {
    if (!customer.manual_id) {
      toast.warning('Cliente automático não se move na mão — o status vem do pedido real.');
      return;
    }
    try {
      await plataforma.entities.Customer.update(customer.manual_id, { purchase_status: novoStatus });
      toast.success(`${customer.full_name} movido no funil!`);
      await loadCustomers();
    } catch (error) {
      console.error('Erro ao mover no funil:', error);
      toast.error('Erro ao mover no funil');
    }
  };

  // 💼 DIR-25 — INTERESSES tipados: produto do catálogo, plano de parceiro de
  // compra ou licença (escada oficial), cada um com VALOR editável (pré-
  // preenchido com o preço de tabela). Item antigo sem `tipo` é produto
  // (formato legado continua lendo). Chave única evita duplicar.
  const chaveInteresse = (i) => i.chave || `produto_${i.product_id}`;
  const addInteresse = (item) => {
    if (formData.interested_products.some((p) => chaveInteresse(p) === item.chave)) {
      toast.warning('Já está na lista de interesses!');
      return;
    }
    const produtos = formData.interested_products.filter((p) => (p.tipo || 'produto') === 'produto');
    if (item.tipo === 'produto' && produtos.length >= 10) {
      toast.warning('Máximo de 10 produtos!');
      return;
    }
    setFormData({ ...formData, interested_products: [...formData.interested_products, item] });
  };
  const addInterestedProduct = (product) => addInteresse({
    chave: `produto_${product.id}`,
    tipo: 'produto',
    product_id: product.id,
    product_name: product.description,
    valor: Number(product.selling_price_retail) || Number(product.price_catalog) || 0,
  });
  const atualizarValorInteresse = (chave, valor) => {
    setFormData({
      ...formData,
      interested_products: formData.interested_products.map((p) =>
        chaveInteresse(p) === chave ? { ...p, valor: valor === '' ? '' : Number(valor) } : p
      ),
    });
  };
  const removerInteresse = (chave) => {
    setFormData({
      ...formData,
      interested_products: formData.interested_products.filter((p) => chaveInteresse(p) !== chave),
    });
  };
  const totalInteresses = formData.interested_products.reduce((s, p) => s + (Number(p.valor) || 0), 0);

  // 🔎 DIR-25 — "todos os produtos precisam estar aparecendo": sem busca, a
  // lista mostra o catálogo INTEIRO (rolagem própria); a busca só refina.
  const filteredProductsForModal = React.useMemo(() => {
    const search = productSearchTerm.toLowerCase().trim();
    if (!search) return availableProducts;
    return availableProducts.filter(p => {
      const desc = (p.description || '').toLowerCase();
      const lot = (p.lot || '').toLowerCase();
      return desc.includes(search) || lot.includes(search);
    });
  }, [productSearchTerm, availableProducts]);

  // ⚠️ DIR-24 Fase 5 — anti-duplicado NO ATO: enquanto digita e-mail/telefone
  // no cadastro, avisa se a pessoa já existe no CRM (antes o duplicado era
  // escondido depois, silenciosamente — o vendedor nunca ficava sabendo).
  const duplicadoNoCadastro = React.useMemo(() => {
    if (editingCustomer) return null;
    const email = (formData.email || '').trim().toLowerCase();
    const fone = (formData.phone || '').replace(/\D/g, '');
    if (!email && fone.length < 8) return null;
    return unifiedCustomers.find((c) =>
      (email && (c.email || '').toLowerCase() === email) ||
      (fone.length >= 8 && (c.phone || '').replace(/\D/g, '') === fone)
    ) || null;
  }, [formData.email, formData.phone, unifiedCustomers, editingCustomer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 💼 DIR-25 — o total estimado dos interesses (produtos + planos +
      // licenças, valores editáveis) vai junto em purchase_value: é o
      // potencial de negócio da pessoa, que o CRM soma e mostra.
      const payload = {
        ...formData,
        follow_up_date: formData.follow_up_date || null,
        purchase_value: totalInteresses || null,
      };
      if (editingCustomer) {
        await plataforma.entities.Customer.update(editingCustomer.id, payload);
        toast.success('Cliente atualizado!');
      } else {
        // 🔴 DIR-24 — carimbo do dono do cadastro: é o que permite escopo de
        // rede nos clientes manuais (cada um vê os seus, visão total vê tudo).
        await plataforma.entities.Customer.create({
          ...payload,
          created_by_id: currentUser?.id || null,
          created_by: currentUser?.email || null,
        });
        toast.success('Cliente cadastrado!');
      }

      setFormData({
        full_name: '',
        email: '',
        phone: '',
        cpf: '',
        status: 'lead',
        source: 'site',
        notes: '',
        address_street: '',
        address_number: '',
        address_city: '',
        address_state: '',
        address_zip_code: '',
        last_contact: new Date().toISOString().split('T')[0],
        assigned_seller: '',
        follow_up_date: '',
        next_steps: '',
        interested_products: []
      });
      setShowAddForm(false);
      setEditingCustomer(null);
      setShowProductSearch(false);
      setProductSearchTerm('');
      await loadCustomers();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar cliente');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    try {
      await plataforma.entities.Customer.delete(id);
      toast.success('Cliente excluído!');
      await loadCustomers();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir cliente');
    }
  };

  const handleForward = (customer) => {
    setSelectedCustomer(customer);
    setShowForwardModal(true);
  };

  // 📝 DIR-24 Fase 4 — anotações em QUALQUER cliente: se a pessoa já tem
  // registro manual (fundido ou não), atualiza; se é 100% automática, cria um
  // registro na tabela customers só pra segurar nota/follow-up/próximo passo —
  // na recarga ele FUNDE de volta na linha automática (regra da DIR-24 em
  // crmUnifiedCustomers.js). Sempre com o carimbo created_by_id do escopo.
  const handleSaveNotes = async (customer, { notes, follow_up_date, next_steps, form_metodo = null }) => {
    try {
      // 🔧 DIR-28 — sem e-mail E sem telefone não há como fundir a anotação de
      // volta na linha automática (a fusão é por e-mail/telefone): salvar
      // criaria um registro fantasma novo a cada salvamento.
      if (!customer.manual_id && !customer.email && !customer.phone) {
        toast.error('Este cliente não tem e-mail nem telefone — complete o contato antes de anotar.');
        return;
      }
      if (customer.manual_id) {
        await plataforma.entities.Customer.update(customer.manual_id, { notes, follow_up_date, next_steps, form_metodo });
      } else {
        await plataforma.entities.Customer.create({
          full_name: customer.full_name || 'Sem nome',
          email: customer.email || '',
          phone: customer.phone || '',
          status: customer.status || 'lead',
          source: 'outro',
          notes,
          follow_up_date,
          next_steps,
          form_metodo,
          created_by_id: currentUser?.id || null,
          created_by: currentUser?.email || null,
        });
      }
      toast.success('Anotações salvas!');
      await loadCustomers();
    } catch (error) {
      console.error('Erro ao salvar anotações:', error);
      toast.error('Erro ao salvar anotações');
    }
  };

  // ✏️ DIR-37 — corrigir cadastro errado (telefone, nome, CPF) direto do
  // modal, gravando no lugar CERTO por origem do cliente.
  const handleEditarContato = async (customer, dados) => {
    try {
      const payload = {
        full_name: (dados.full_name || '').trim() || 'Sem nome',
        phone: String(dados.phone || '').replace(/\D/g, ''),
        cpf: String(dados.cpf || '').replace(/\D/g, ''),
      };
      if (customer.user_id) {
        // Conta do app: mesmo caminho do painel Admin; e-mail (login) não muda aqui.
        if (!vis.gerirVendedores) {
          toast.error('Cadastro de conta do app só pode ser corrigido por um admin.');
          return;
        }
        await plataforma.entities.AppUser.update(customer.user_id, {
          full_name: payload.full_name,
          phone: payload.phone,
          ...(payload.cpf ? { cpf: payload.cpf } : {}),
        });
        toast.success('Cadastro da conta corrigido!');
        await loadAutoSources();
      } else if (customer.manual_id) {
        await plataforma.entities.Customer.update(customer.manual_id, { ...payload, email: (dados.email || '').trim() });
        toast.success('Cadastro corrigido!');
        await loadCustomers();
      } else {
        // veio só de venda antiga: nasce a linha manual corrigida (funde por
        // e-mail/telefone — DIR-24/DIR-37)
        await plataforma.entities.Customer.create({
          ...payload,
          email: (dados.email || '').trim(),
          status: customer.status || 'lead',
          source: 'outro',
          created_by_id: currentUser?.id || null,
          created_by: currentUser?.email || null,
        });
        toast.success('Cadastro corrigido!');
        await loadCustomers();
      }
      setDetailCustomer(null);
    } catch (error) {
      console.error('Erro ao corrigir cadastro:', error);
      toast.error('Erro ao corrigir o cadastro');
      throw error;
    }
  };

  // 🤝 DIR-43 — qualificação 1-5 da lista de network (Hábito 3)
  // DIR-46 — qualificação completa da lista de network: produto apresentado +
  // 3 notas 1-5. A coluna legada `qualificacao` (estrela única) fica intocada.
  const handleQualificarContato = async (contato, quali) => {
    try {
      await plataforma.entities.Customer.update(contato.id, { qualificacao_network: quali });
      const total = (quali?.confianca || 0) + (quali?.financeiro || 0) + (quali?.apetite || 0);
      toast.success(`${contato.full_name || 'Contato'} qualificado: ${total}/15`);
      await loadCustomers();
      return true;
    } catch (error) {
      console.error('Erro ao qualificar contato:', error);
      toast.error('Erro ao salvar a qualificação — a migração da DIR-46 já foi colada no banco?');
      return false;
    }
  };

  // 📜 DIR-47 — registrar o desfecho de um contato do método (histórico
  // append-only em customers.contatos_metodo, com carimbo de quem registrou).
  const handleRegistrarContatoMetodo = async (contato, registro) => {
    try {
      const historico = Array.isArray(contato.contatos_metodo) ? contato.contatos_metodo : [];
      const completo = {
        ...registro,
        id: (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `ct_${Date.now()}`),
        em: new Date().toISOString(),
        registrado_por_id: currentUser?.id || null,
        registrado_por_nome: currentUser?.full_name || '',
      };
      await plataforma.entities.Customer.update(contato.id, { contatos_metodo: [...historico, completo] });
      // DIR-49.1 — o toast diz PRA ONDE foi: reunião de dia futuro mora na
      // seção "Próximas reuniões", não na agenda de hoje.
      if (registro.resultado === 'agendado' && registro.quando) {
        const d = new Date(registro.quando);
        toast.success(`Reunião agendada — ${Number.isNaN(d.getTime()) ? registro.quando : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · veja na agenda do Hábito 4`);
      } else {
        toast.success(`Contato registrado: ${contato.full_name || ''} — o "último contato" da fila mostra o desfecho`);
      }
      await loadCustomers();
      return true;
    } catch (error) {
      console.error('Erro ao registrar contato:', error);
      toast.error('Erro ao registrar o contato — a migração da DIR-47 já foi colada no banco?');
      return false;
    }
  };

  // ✏️ DIR-50 — edita um registro existente (mesmo id, campos novos)
  const handleEditarRegistroMetodo = async (contato, registroAtualizado) => {
    try {
      const historico = Array.isArray(contato.contatos_metodo) ? contato.contatos_metodo : [];
      const novo = historico.map((r) => (r.id === registroAtualizado.id ? { ...registroAtualizado, editado_em: new Date().toISOString() } : r));
      await plataforma.entities.Customer.update(contato.id, { contatos_metodo: novo });
      const d = new Date(registroAtualizado.quando || '');
      toast.success(`Reunião atualizada${Number.isNaN(d.getTime()) ? '' : ` — ${d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`}`);
      await loadCustomers();
      return true;
    } catch (error) {
      console.error('Erro ao editar registro:', error);
      toast.error('Erro ao salvar a alteração — tente de novo');
      return false;
    }
  };

  // 🗑️ DIR-50 — exclui um registro (o evento do Google é apagado pelo painel)
  const handleExcluirRegistroMetodo = async (contato, registroId) => {
    try {
      const historico = Array.isArray(contato.contatos_metodo) ? contato.contatos_metodo : [];
      await plataforma.entities.Customer.update(contato.id, { contatos_metodo: historico.filter((r) => r.id !== registroId) });
      toast.success('Reunião excluída da agenda.');
      await loadCustomers();
      return true;
    } catch (error) {
      console.error('Erro ao excluir registro:', error);
      toast.error('Erro ao excluir — tente de novo');
      return false;
    }
  };

  // 📤 DIR-24 Fase 5 — exportação CSV da lista filtrada (o que está na tela é
  // o que sai no arquivo), com BOM pro Excel abrir acentuação certa.
  const exportarCsv = () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const linhas = [
      ['Nome', 'Email', 'Telefone', 'CPF', 'Tipo', 'Status', 'Status de compra', 'Origem', 'Último contato', 'Gasto total', 'Leilões arrematados', 'Indicado por'].map(esc).join(';'),
      ...filteredCustomers.map((c) => [
        c.full_name, c.email, c.phone, c.cpf, ROLE_LABEL[c.role_type] || 'Cliente', c.status,
        c.purchase_status, c.source, c.last_contact ? new Date(c.last_contact).toLocaleDateString('pt-BR') : '',
        (c.total_spent || 0).toFixed(2).replace('.', ','), c.auctions_won || 0, c.referred_by_name || '',
      ].map(esc).join(';')),
    ];
    const blob = new Blob([`﻿${linhas.join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crm-clientes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filteredCustomers.length} clientes exportados`);
  };

  const handleEditSeller = (seller) => {
    setEditingSeller(seller);
    setSellerFormData({
      name: seller.name,
      phone: seller.phone,
      email: seller.email || '',
      license_type: seller.license_type || '',
      default_commission_percentage: seller.default_commission_percentage || 0,
      default_licenciante_commission_percentage: seller.default_licenciante_commission_percentage || 0,
      is_active: seller.is_active
    });
    setShowSellerModal(true);
  };

  const handleToggleSellerStatus = async (seller) => {
    try {
      await plataforma.entities.Seller.update(seller.id, {
        is_active: !seller.is_active
      });
      toast.success(`Vendedor ${!seller.is_active ? 'ativado' : 'desativado'}!`);
      await loadSellers();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const handleSaveSeller = async (e) => {
    e.preventDefault();
    try {
      // 📞 DIR-30 — telefone salvo SÓ com dígitos: o link de WhatsApp do
      // encaminhamento (wa.me) e o PDV dependem de número limpo.
      const payloadSeller = { ...sellerFormData, phone: String(sellerFormData.phone || '').replace(/\D/g, '') };
      if (!payloadSeller.phone) {
        toast.warning('Telefone é obrigatório (com DDD).');
        return;
      }
      if (editingSeller) {
        await plataforma.entities.Seller.update(editingSeller.id, payloadSeller);
        toast.success('Vendedor atualizado!');
      } else {
        await plataforma.entities.Seller.create(payloadSeller);
        toast.success('Vendedor cadastrado!');
      }
      setSellerFormData({
        name: '',
        phone: '',
        email: '',
        license_type: '',
        default_commission_percentage: 0,
        default_licenciante_commission_percentage: 0,
        is_active: true
      });
      setShowSellerModal(false);
      setEditingSeller(null);
      await loadSellers();
    } catch (error) {
      console.error('Erro ao salvar vendedor:', error);
      toast.error('Erro ao salvar vendedor');
    }
  };

  const sendToWhatsApp = async () => {
    if (!selectedSeller) {
      toast.warning('Selecione um vendedor!');
      return;
    }

    const seller = sellers.find(s => s.name === selectedSeller);
    const customer = selectedCustomer;

    // Salva o vendedor no cliente
    try {
      await plataforma.entities.Customer.update(customer.id, {
        assigned_seller: selectedSeller
      });
    } catch (error) {
      console.error('Erro ao atualizar vendedor:', error);
    }

    const statusText = customer.status === 'lead' ? 'Lead' : customer.status === 'cliente' ? 'Cliente' : 'Inativo';

    const message = `*NOVO LEAD - LEILÃO NOZAP*
━━━━━━━━━━━━━━━━━━━━

*DADOS DO CLIENTE*

*Nome:* ${customer.full_name}
*Email:* ${customer.email || 'Não informado'}
*Telefone:* ${customer.phone || 'Não informado'}
*CPF:* ${customer.cpf || 'Não informado'}

━━━━━━━━━━━━━━━━━━━━

*INFORMAÇÕES*

*Status:* ${statusText}
*Origem:* ${customer.source || 'Não informado'}
*Último Contato:* ${customer.last_contact ? new Date(customer.last_contact).toLocaleDateString('pt-BR') : 'Não informado'}

━━━━━━━━━━━━━━━━━━━━

*ENDEREÇO*

${customer.address_street ? `Rua: ${customer.address_street}, ${customer.address_number || 'S/N'}` : 'Rua: Não informado'}
${customer.address_city && customer.address_state ? `Cidade: ${customer.address_city} - ${customer.address_state}` : 'Cidade: Não informado'}
CEP: ${customer.address_zip_code || 'Não informado'}

━━━━━━━━━━━━━━━━━━━━

*Gasto Total:* R$ ${fmtBR((customer.total_spent || 0))}

${customer.notes ? `━━━━━━━━━━━━━━━━━━━━

*OBSERVAÇÕES*

${customer.notes}

━━━━━━━━━━━━━━━━━━━━` : ''}

_Entre em contato o mais rápido possível!_

_Enviado via CRM Leilão NoZap_`;

    // 🔧 DIR-28 — telefone com máscara "(21) 9..." quebrava o link wa.me:
    // só dígitos + DDI 55 (mesma regra do linkWhatsApp da fila de contato).
    const digitosVendedor = String(seller.phone || '').replace(/\D/g, '');
    if (!digitosVendedor) {
      toast.error('Este vendedor está sem telefone cadastrado.');
      return;
    }
    const numeroVendedor = digitosVendedor.length <= 11 ? `55${digitosVendedor}` : digitosVendedor;
    const whatsappUrl = `https://wa.me/${numeroVendedor}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    setShowForwardModal(false);
    setSelectedSeller('');
    setSelectedCustomer(null);
    await loadCustomers();
  };

  // 💰 DIR-14/DIR-15 (30/08/2026) — histórico de 3 tentativas erradas antes
  // desta, cada uma com filtro caseiro diferente, nenhuma batendo com o
  // Painel de Alavancagem (NetworkOverview.jsx): primeiro contava depósito
  // pendente/cancelado; depois misturava depósito+adesão+passaporte na
  // "venda bruta" e somava leilão de Plano de Investimento (36 registros de
  // R$ 5.000, ~R$ 180 mil, que não são mercadoria); mesmo depois de tirar
  // isso, ainda sobrava venda de TESTE (pré-lançamento) e sem rastro de
  // gateway, porque nenhuma das versões usava o critério oficial.
  // Critério oficial (docs/MARCO-OFICIAL-AGOSTO-2026.md, seção 1): só é
  // dinheiro real quem está PAGO + tem RASTRO de gateway (ou pagamento por
  // saldo interno) + é a partir de 01/08/2026. Extraído pra
  // src/lib/dinheiroReal.js e agora é o MESMO filtro nas duas telas — não
  // dá mais pra divergir, porque é a mesma função.
  // wallet_deposit só (não soma operacao_deposit/commission_deposit aqui,
  // mesma decisão do Painel de Alavancagem — esse saldo já vira "compra"
  // quando é gasto, contado em comprasBrutas; somar os dois contaria o
  // mesmo real duas vezes).
  const depositosCarteira = networkCatalogSales
    .filter((s) => s.kind === 'wallet_deposit')
    .filter(isVendaReal)
    .reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const comprasBrutas = networkCatalogSales
    .filter((s) => ['loja', 'produto'].includes(s.kind))
    .filter(isVendaReal)
    .reduce((sum, s) => sum + (s.total_amount || 0), 0);
  // Leilão vem de catalog_sales (kind='arremate'), não da tabela auctions —
  // mesma fonte do Painel de Alavancagem. Isso evita de vez o problema do
  // Plano de Investimento (não gera venda kind='arremate' com rastro real)
  // e o problema de "arrematado mas não pago" (isVendaReal já exige status
  // pago + rastro/saldo — um winner_id sozinho na tabela auctions nunca
  // seria suficiente, é exatamente o que causava a inflação anterior).
  const leilaoBruto = networkCatalogSales
    .filter((s) => s.kind === 'arremate')
    .filter(isVendaReal)
    .reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const volumeVendasBruto = comprasBrutas + leilaoBruto;

  // 🎯 DIR-22 — meta de captação de R$ 1 milhão (aportes de parceiro + vendas
  // de adesões de cargo, na ordem oficial do dono). Regra e anti-dupla-contagem
  // em src/lib/captacaoParceiros.js.
  const captacao = React.useMemo(
    () => calcularCaptacao(networkCatalogSales, networkPartnerPurchases, networkOportunidades),
    [networkCatalogSales, networkPartnerPurchases, networkOportunidades]
  );
  // 🚀 DIR-23 — metas internas oficiais (Resumo Executivo do dono). São metas
  // da EMPRESA, calculadas sobre a plataforma inteira, e só renderizam pra
  // visão total (admin/super_admin) — pra quem vê só a própria rede elas não
  // aparecem (não vazam número global pra escopo de rede). Como só rodam com
  // isSuperAdmin, networkCatalogSales/networkAppUsers = plataforma inteira.
  const metaCentral = React.useMemo(
    () => (isSuperAdmin ? calcularMetaCentral(networkCatalogSales) : null),
    [networkCatalogSales, isSuperAdmin]
  );
  const kpisDiretoria = React.useMemo(
    () => (isSuperAdmin ? calcularDashboardDiretoria({ sales: networkCatalogSales, users: networkAppUsers, products: allProducts, concurso: concursoStats, oportunidades: networkOportunidades }) : null),
    [networkCatalogSales, networkAppUsers, allProducts, concursoStats, networkOportunidades, isSuperAdmin]
  );
  const escadaLicencas = React.useMemo(
    () => (isSuperAdmin ? resumoEscada(networkCatalogSales) : null),
    [networkCatalogSales, isSuperAdmin]
  );
  const ritmo = React.useMemo(
    () => (isSuperAdmin ? ritmoDiario(networkCatalogSales) : null),
    [networkCatalogSales, isSuperAdmin]
  );

  // 💾 Salvar oportunidade: mudança de estágio carimba estagio_desde, guarda
  // o histórico e marca fechado_em no 100% (o dinheiro entra pelos fluxos
  // oficiais — aqui é acompanhamento, nunca ativação).
  const handleSalvarOportunidade = async (existente, form) => {
    try {
      const agora = new Date().toISOString();
      const payload = {
        cliente_nome: (form.cliente_nome || '').trim(),
        cliente_email: form.cliente_email || null,
        cliente_telefone: String(form.cliente_telefone || '').replace(/\D/g, '') || null,
        cliente_user_id: form.cliente_user_id || null,
        tipo: form.tipo,
        valor_previsto: parseValorBR(form.valor_previsto) || null, // "200.000" = duzentos MIL (REL-34.2)
        estagio: form.estagio,
        motivo_perda: form.estagio === 'sem_interesse' ? (form.motivo_perda || null) : null,
        reuniao_em: form.reuniao_em ? new Date(form.reuniao_em).toISOString() : null,
        recontato_em: form.recontato_em || null,
        anotacoes: form.anotacoes || null,
        responsavel_id: form.responsavel_id ?? null, // DIR-39: sempre um executivo do topo (o modal exige)
        responsavel_nome: form.responsavel_nome || null,
        indicacao_user_id: form.indicacao_user_id || null, // DIR-39: quem indicou — sempre cadastrado no app
        indicacao_nome: form.indicacao_nome || null,
        objecao: form.objecao || null, // DIR-41: gestão de objeções do método
      };
      // 🔗 DIR-36 — a amarração de aço do 100%: encontrou a venda REAL do
      // cliente (mesma regra do chip "💰 na conta")? Grava o venda_id.
      const vendaProva = form.estagio === 'fechado_100'
        ? vendaRealDoCliente(payload, networkCatalogSales)
        : null;
      payload.venda_id = vendaProva?.id || existente?.venda_id || null;
      if (!existente) {
        await plataforma.entities.CaptacaoOportunidade.create({
          ...payload,
          criado_por_id: currentUser?.id || null,
          estagio_desde: agora,
          fechado_em: form.estagio === 'fechado_100' ? agora : null,
          historico: [{ em: agora, por: currentUser?.full_name || '', para: form.estagio }],
        });
        toast.success('Oportunidade criada na esteira!');
      } else {
        const mudouEstagio = existente.estagio !== form.estagio;
        await plataforma.entities.CaptacaoOportunidade.update(existente.id, {
          ...payload,
          ...(mudouEstagio ? {
            estagio_desde: agora,
            fechado_em: form.estagio === 'fechado_100' ? agora : null,
            historico: [
              ...(Array.isArray(existente.historico) ? existente.historico : []),
              { em: agora, por: currentUser?.full_name || '', de: existente.estagio, para: form.estagio },
            ],
          } : {}),
        });
        toast.success(mudouEstagio ? 'Oportunidade movida na esteira!' : 'Oportunidade atualizada!');
      }
      await loadOportunidades();
    } catch (error) {
      console.error('Erro ao salvar oportunidade:', error);
      toast.error('Erro ao salvar oportunidade — a tabela da esteira já foi criada no banco?');
      throw error;
    }
  };

  // 💵 DIR-40 — registrar aporte que entrou POR FORA (Santander/Itaú), com
  // carimbo de quem registrou e quando. Só quem vê dinheiro da empresa.
  const handleRegistrarAporteExterno = async (existente, { banco, valor, data }) => {
    try {
      if (!vis.verDinheiroEmpresa) {
        toast.error('Só admin/financeiro pode registrar aporte recebido por fora.');
        return;
      }
      await plataforma.entities.CaptacaoOportunidade.update(existente.id, {
        aporte_externo: {
          banco,
          valor: Number(valor) || 0,
          data,
          registrado_por_id: currentUser?.id || null,
          registrado_por: currentUser?.full_name || null,
          em: new Date().toISOString(),
        },
      });
      toast.success('Aporte externo registrado — dinheiro na conta!');
      await loadOportunidades();
    } catch (error) {
      console.error('Erro ao registrar aporte externo:', error);
      toast.error('Erro ao registrar o aporte — a migração do aporte externo já foi colada no banco?');
      throw error;
    }
  };

  const parceirosCompra = React.useMemo(() => {
    // aportes pagos reais por pessoa (venda partner_plan real, somada por buyer)
    const aportadoPorUser = {};
    networkCatalogSales
      .filter((s) => s.kind === 'partner_plan' && isVendaReal(s))
      .forEach((s) => {
        const uid = s.buyer_id || s.buyer_email;
        if (!uid) return;
        aportadoPorUser[uid] = (aportadoPorUser[uid] || 0) + (Number(s.total_amount) || 0);
      });
    return networkPartnerPurchases
      .filter((p) => String(p.status || '') !== 'canceled')
      .map((p) => ({ ...p, aportado: aportadoPorUser[p.user_id] || aportadoPorUser[p.user_email] || 0 }))
      .sort((a, b) => (b.plan_amount || 0) - (a.plan_amount || 0));
  }, [networkPartnerPurchases, networkCatalogSales]);

  // 📋 Espelho do Painel de Alavancagem (30/08/2026) — pedido do dono: "insira
  // exatamente as informações que tem lá, não invente". Mesmas fórmulas,
  // literalmente copiadas de NetworkOverview.jsx (fetchFinanceStats +
  // conversion), só trocando `allUsers`/`financeStats` (a rede DELE) por
  // `networkAppUsers`/`networkCatalogSales` (a rede/plataforma de quem está
  // vendo o CRM) — pra super_admin isso já é a plataforma inteira. "Valor
  // total gerado" aqui é SÓ depósito + compra de Loja, igual ao Painel de
  // Alavancagem — não inclui leilão, de propósito, pra ser comparável
  // número a número, célula a célula.
  const depositsForConversao = networkCatalogSales.filter((s) => s.kind === 'wallet_deposit').filter(isVendaReal);
  const operacaoForConversao = networkCatalogSales.filter((s) => s.kind === 'operacao_deposit').filter(isVendaReal);
  const comprasForConversao = networkCatalogSales.filter((s) => ['loja', 'produto'].includes(s.kind)).filter(isVendaReal);
  const realSalesParaConversao = [...depositsForConversao, ...operacaoForConversao, ...comprasForConversao];
  const CONVERSAO_JANELA_DIAS = 30;
  const cutoff30d = new Date(Date.now() - CONVERSAO_JANELA_DIAS * 24 * 60 * 60 * 1000);
  const totalNaBase = networkAppUsers.length;
  const buyerIdsUnicos = new Set(realSalesParaConversao.map((s) => s.buyer_id).filter(Boolean));
  const novosUltimos30Dias = networkAppUsers.filter((u) => new Date(u.created_date) >= cutoff30d).length;
  const compradoresRecentesUnicos = new Set(
    realSalesParaConversao.filter((s) => new Date(s.created_date) >= cutoff30d).map((s) => s.buyer_id).filter(Boolean)
  );
  const espelhoPainelAlavancagem = {
    totalNaBase,
    novosUltimos30Dias,
    compradoresUnicos: buyerIdsUnicos.size,
    conversaoGeral: totalNaBase ? (buyerIdsUnicos.size / totalNaBase) * 100 : 0,
    compraramUltimos30Dias: compradoresRecentesUnicos.size,
    taxaRecente: novosUltimos30Dias ? (compradoresRecentesUnicos.size / novosUltimos30Dias) * 100 : 0,
    depositosCount: depositsForConversao.length,
    valorTotalGerado: depositosCarteira + comprasBrutas,
    ticketMedio: buyerIdsUnicos.size ? (depositosCarteira + comprasBrutas) / buyerIdsUnicos.size : 0,
  };

  // 🔴 DIR-21 (30/08/2026, decisão do dono) — "Volume em Negociação" deixa de
  // ser só negociação manual (vivia em R$ 0,00) e passa a somar o dinheiro
  // real em jogo mas ainda não fechado, pós-marco (01/08):
  //   • pedido gerado e AINDA NÃO PAGO (chegou no carrinho, gerou pedido,
  //     desistiu ou está aguardando — não existe carrinho persistido no
  //     servidor, o pedido pending_payment é o rastro real disso);
  //   • pedido CANCELADO pela instituição/pagamento.
  const STATUS_CANCELADO_NEG = ['canceled', 'cancelado', 'cancelled', 'estornado'];
  const ehPedidoLoja = (s) => ['loja', 'produto'].includes(s.kind);
  const aguardandoPagamentoValor = networkCatalogSales
    .filter((s) => ehPedidoLoja(s) && s.status === 'pending_payment' && isPosMarco(s))
    .reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const canceladosValor = networkCatalogSales
    .filter((s) => ehPedidoLoja(s) && STATUS_CANCELADO_NEG.includes(String(s.status || '').toLowerCase()) && isPosMarco(s))
    .reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const negociacoesManuaisValor = networkNegotiations
    .filter(n => n.status === 'em_andamento')
    .reduce((sum, n) => sum + (n.total_value || 0), 0);

  const stats = {
    total: unifiedCustomers.length,
    leads: unifiedCustomers.filter(c => c.status === 'lead').length,
    clientes: unifiedCustomers.filter(c => c.status === 'cliente').length,
    // 🔴 DIR-21 (decisão do dono, 30/08/2026): pro super_admin o card vira
    // FATURAMENTO BRUTO — o valor comprado de verdade na Loja Virtual
    // (comprasBrutas, critério oficial de dinheiro real), não a comissão.
    // A comissão continua sendo a receita da empresa no módulo Financeiro
    // (financial_income, DIR-7) e a base do imposto — nada muda lá.
    totalSpent: isSuperAdmin
      ? comprasBrutas
      : unifiedCustomers.reduce((sum, c) => sum + (c.total_spent || 0), 0),
    aguardandoPagamentoValor,
    canceladosValor,
    negociacoesManuaisValor,
    semCompra: unifiedCustomers.filter(c => (c.purchase_status || 'sem_compra') === 'sem_compra').length,
    em_negociacao: unifiedCustomers.filter(c => c.purchase_status === 'em_negociacao').length,
    aguardando_pagamento: unifiedCustomers.filter(c => c.purchase_status === 'aguardando_pagamento').length,
    pago: unifiedCustomers.filter(c => c.purchase_status === 'pago').length,
    enviado: unifiedCustomers.filter(c => c.purchase_status === 'enviado').length,
    entregue: unifiedCustomers.filter(c => c.purchase_status === 'entregue').length,
    cancelado: unifiedCustomers.filter(c => c.purchase_status === 'cancelado').length,
    volumeNegociacao: negociacoesManuaisValor + aguardandoPagamentoValor + canceladosValor,
    leiloesArrematados: unifiedCustomers.reduce((sum, c) => sum + (c.auctions_won || 0), 0),
    vendedores: unifiedCustomers.filter(c => c.role_type === 'vendedor').length,
    licenciados: unifiedCustomers.filter(c => c.role_type === 'licenciado').length,
    influencers: unifiedCustomers.filter(c => c.role_type === 'influencer').length,
    investidores: unifiedCustomers.filter(c => c.role_type === 'investidor').length,
    leiloeiros: unifiedCustomers.filter(c => c.role_type === 'leiloeiro').length,
    arrematantes: unifiedCustomers.filter(c => c.role_type === 'arrematante').length,
    // 🔧 DIR-28 — desde a DIR-25 a lista de produtos inclui itens SEM estoque
    // (pro cadastro de interesse); o card "Produtos no Catálogo" promete
    // "com estoque disponível", então conta só quem tem estoque de verdade.
    produtosDisponiveis: availableProducts.filter((p) => (Number(p.quantity) || 0) > 0).length,
    // 🔴 DIR-18/DIR-20 — cost_price é o custo TOTAL do lote (é assim que a
    // planilha importa), não o unitário; e a soma cobre o GALPÃO INTEIRO
    // (allProducts), não só a vitrine — número validado direto no banco:
    // R$ 28.133,45 parado em estoque. Ver src/lib/custoProduto.js.
    valorEstoque: allProducts.reduce((sum, p) => sum + custoEstoqueRestante(p), 0),
    depositosCarteira,
    volumeVendasBruto,
    // "tudo, tudo, tudo": depósito + venda bruta de Loja/PDV + venda bruta
    // de leilão, somados num só número — volume, não receita.
    volumeFinanceiroTotal: depositosCarteira + volumeVendasBruto,
    espelhoPainelAlavancagem,
  };

  // 🧭 DIR-24 Fase 3 — seção ativa e a faixa de resumo (os 4 números que
  // importam, sempre visíveis, pro leitor apressado e pro alto nível).
  const secaoAtiva = secao || (isSuperAdmin ? 'verificacao' : 'acompanhamento');
  // dentro do Hábito 6: alterna entre 👥 Clientes e 🚀 Esteira/Expansão
  const brl = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const resumoItens = [
    isSuperAdmin
      ? {
          chave: 'faturamento', rotulo: 'Faturamento do mês', destaque: true,
          valor: brl(metaCentral?.total || 0),
          sub: metaCentral ? `${metaCentral.pctTotal.toFixed(1).replace('.', ',')}% da meta de R$ 5 milhões` : null,
          info: 'Venda real de mercadoria (Loja + Leilões) do mês corrente, contra a Meta Central de R$ 5.000.000/mês.',
        }
      : {
          chave: 'volume', rotulo: 'Volume da sua rede', destaque: true,
          valor: brl(stats.totalSpent),
          info: 'Soma do valor que sua rede já comprou/arrematou de verdade — volume transacionado, não a sua comissão.',
        },
    {
      chave: 'negociacao', rotulo: 'Volume em Negociação',
      valor: brl(stats.volumeNegociacao),
      sub: `${brl(stats.aguardandoPagamentoValor)} aguardando pagamento`,
      info: `Dinheiro em jogo mas ainda não fechado, desde 01/08: pedidos gerados e não pagos ${brl(stats.aguardandoPagamentoValor)} + cancelados ${brl(stats.canceladosValor)} + negociações manuais ${brl(stats.negociacoesManuaisValor)}.`,
    },
    {
      chave: 'clientes', rotulo: 'Clientes Ativos',
      valor: stats.clientes,
      sub: `${stats.total} contatos no total`,
      info: 'Pessoas do seu escopo que já compraram na Loja ou arremataram pelo menos um leilão de verdade.',
    },
    {
      chave: 'captacao', rotulo: 'Captação (meta R$ 1 mi)',
      valor: brl(captacao.total),
      // DIR-36: o card mostra também o que está VINDO — forecast da esteira
      sub: resumoEsteiraGeral.pipelinePonderado > 0
        ? `faltam ${brl(captacao.faltam)} · ${brl(resumoEsteiraGeral.pipelinePonderado)} em esteira`
        : `faltam ${brl(captacao.faltam)}`,
      info: 'Aportes de parceiro de compra + vendas de adesões de cargo (dinheiro real). "Em esteira" é o forecast ponderado das negociações ativas da Esteira de Captação — detalhe na seção Expansão.',
    },
  ];

  // 🏆 DIR-43 (correção do dono): o painel É os 8 Hábitos do Sucesso — o CRM
  // mora dentro deles (Hábito 6 = Clientes+Esteira; Hábito 7 = Visão Executiva).
  // 🏛️ DIR-56 — cada Hábito ganha um ícone de traço (no lugar do emoji) e uma
  // faixa do BRANDBOOK oficial, escolhida pelo tema do hábito: o carro pro
  // sonho, "grandes batalhas" pro compromisso, o avião pra duplicação.
  const SECOES = [
    { id: 'sonho', n: 1, nome: 'Sonho', Icone: Sparkles, faixa: '/marca/habito-1-sonho.webp' },
    { id: 'compromisso', n: 2, nome: 'Compromisso', Icone: ShieldCheck, faixa: '/marca/habito-2-compromisso.webp' },
    { id: 'lista', n: 3, nome: 'Lista', Icone: Users, faixa: '/marca/habito-3-lista.webp' },
    { id: 'contato', n: 4, nome: 'Contato', Icone: PhoneCall, faixa: '/marca/habito-4-contato.webp' },
    { id: 'apresentacao', n: 5, nome: 'Apresentação', Icone: Presentation, faixa: '/marca/habito-5-apresentacao.webp' },
    { id: 'acompanhamento', n: 6, nome: 'Acompanhamento', Icone: Route, faixa: '/marca/habito-6-acompanhamento.webp' },
    { id: 'verificacao', n: 7, nome: 'Verificação', Icone: Gauge, faixa: '/marca/habito-7-verificacao.webp' },
    { id: 'duplicacao', n: 8, nome: 'Duplicação', Icone: GitBranch, faixa: '/marca/habito-8-duplicacao.webp' },
  ];
  const secaoAtual = SECOES.find((s) => s.id === secaoAtiva) || SECOES[0];

  // 🔓 DIR-24 Fase 2 — sem gate de admin: quem não é visão total já chega
  // aqui com TODAS as fontes filtradas pela própria rede (memos network*).
  if (!currentUser?.id) {
    return (
      <div className="text-center py-16 bg-white border border-nz-borda rounded-2xl">
        <ShieldAlert className="w-12 h-12 mx-auto text-nz-tinta-fraca/50 mb-3" />
        <p className="text-nz-tinta-fraca">Entre na sua conta para ver o seu CRM.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-nz-tinta-fraca">Carregando...</div>
      </div>
    );
  }

  return (
    /* 🏛️ DIR-56 — O PALCO DA MARCA. A classe .xeos-palco redefine os tokens
       --nz-* aqui dentro; com isso o tema claro do painel (index.css) passa a
       pintar escuro sozinho, sem reescrever classe por classe. Por baixo de
       tudo: o padrão tonal de X do brandbook e o brilho do gradiente Top
       College. Fora deste bloco, nada muda no sistema. */
    <div className="xeos-palco relative overflow-hidden p-4 sm:p-8 rounded-3xl border border-white/10" style={{ background: 'var(--xeos-preto)' }}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.22]"
        style={{ backgroundImage: 'url(/marca/padrao-xeos.webp)', backgroundSize: '760px auto', backgroundPosition: 'top center' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(90% 55% at 8% 0%, rgba(59,111,246,0.20), transparent 58%), radial-gradient(85% 55% at 95% 12%, rgba(230,46,139,0.16), transparent 60%), linear-gradient(180deg, rgba(10,16,32,0.55), rgba(0,2,12,0.92))',
        }}
      />
      {/* 🔔 DIR-53 — o popup do Leilão NoZap: reunião MINHA prestes a começar
          (com o app aberto; o alarme com app fechado é o do Google, já
          configurado na criação do evento). */}
      {alertaReuniao && (
        <div className="xeos-palco fixed bottom-4 right-4 z-40 max-w-sm rounded-2xl border border-white/15 shadow-2xl p-4" style={{ background: 'var(--xeos-fundo)' }}>
          <p className="text-sm font-bold text-nz-tinta flex items-center gap-2"><BellRing className="w-4 h-4 text-[#FBBF24]" />Reunião em {alertaReuniao.minutos <= 0 ? 'instantes' : `${alertaReuniao.minutos} min`}!</p>
          <p className="text-sm text-nz-tinta mt-0.5 truncate">{alertaReuniao.registro.titulo_reuniao || `Reunião — ${alertaReuniao.cliente.full_name || 'contato'}`}</p>
          <p className="text-[11px] text-nz-tinta-fraca">{new Date(alertaReuniao.registro.quando).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}{alertaReuniao.registro.local ? ` · ${alertaReuniao.registro.local}` : ''}</p>
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={() => { setSecao('contato'); dispensarAlerta(); }} className="bg-nz-verde hover:bg-nz-verde-claro text-white h-8">Ver agenda</Button>
            <Button size="sm" variant="outline" onClick={dispensarAlerta} className="border-nz-borda text-nz-tinta-fraca h-8">Dispensar</Button>
          </div>
        </div>
      )}
      <div className="relative max-w-[1800px] mx-auto">

        {/* HEADER — escala de instituição, sem emoji */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6 sm:mb-8">
          <div>
            <p className="text-[11px] sm:text-xs font-semibold tracking-[0.28em] text-white/45 uppercase mb-2">
              Top College &nbsp;·&nbsp; X-eos
            </p>
            <h1 className="text-3xl sm:text-5xl font-extrabold leading-[1.05] tracking-tight text-nz-tinta">
              Os 8 Hábitos<br className="hidden sm:block" /> do Sucesso
            </h1>
          </div>
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
            {vis.gerirVendedores && (
              <Button
                onClick={() => setShowSellerModal(true)}
                className="bg-nz-marrom hover:bg-nz-marrom-claro text-white flex-1 sm:flex-none text-xs sm:text-sm"
              >
                <UserPlus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Novo Vendedor</span>
                <span className="sm:hidden">Vendedor</span>
              </Button>
            )}
            <Button
              onClick={() => {
                setEditingCustomer(null);
                setFormData({
                  full_name: '',
                  email: '',
                  phone: '',
                  cpf: '',
                  status: 'lead',
                  source: 'site',
                  notes: '',
                  address_street: '',
                  address_number: '',
                  address_city: '',
                  address_state: '',
                  address_zip_code: '',
                  last_contact: new Date().toISOString().split('T')[0],
                  assigned_seller: '',
                  follow_up_date: '',
                  next_steps: '',
                  interested_products: []
                });
                setShowProductSearch(false);
                setProductSearchTerm('');
                setShowAddForm(true);
              }}
              className="bg-nz-verde hover:bg-nz-verde-claro text-white flex-1 sm:flex-none text-xs sm:text-sm"
            >
              <UserPlus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Novo Cliente</span>
              <span className="sm:hidden">Cliente</span>
            </Button>
          </div>
        </div>

        {/* 🎓 DIR-63 — o palco das duas marcas saiu daqui. Ele repetia, 300px
            abaixo, exatamente o mesmo par de logos da faixa da academia — e o
            dono viu isso na tela: "está repetindo muito as logos". As frases
            das marcas subiram pra faixa; a identidade continua, uma vez só. */}
        {/* 🧭 DIR-24 Fase 3 — faixa de resumo: 4 números, sempre visíveis */}
        <CrmResumo itens={resumoItens} />

        {/* 🏆 Navegação pelos 8 Hábitos (DIR-43) — trilho escuro, ícone de
            traço no lugar do emoji e o hábito ativo carregando o gradiente
            da Top College (DIR-56). */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5 sm:mb-7">
          {SECOES.map(({ id, n, nome, Icone }) => {
            const ativo = secaoAtiva === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSecao(id)}
                className={`group relative overflow-hidden rounded-xl border px-3 py-3 text-left transition-all ${
                  ativo
                    ? 'border-white/25 shadow-lg'
                    : 'border-white/10 hover:border-white/25 hover:bg-white/[0.04]'
                }`}
                style={ativo ? { background: 'linear-gradient(120deg, var(--topcollege-azul), var(--topcollege-roxo) 55%, var(--topcollege-magenta))' } : undefined}
              >
                <span className="flex items-center gap-2.5">
                  <Icone className={`w-[18px] h-[18px] shrink-0 ${ativo ? 'text-white' : 'text-white/45 group-hover:text-white/75'}`} />
                  <span className="min-w-0">
                    <span className={`block text-[10px] font-bold tracking-[0.18em] ${ativo ? 'text-white/75' : 'text-white/35'}`}>
                      {String(n).padStart(2, '0')}
                    </span>
                    <span className={`block text-[13px] sm:text-sm font-bold leading-tight truncate ${ativo ? 'text-white' : 'text-white/70'}`}>
                      {nome}
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* 🖼️ DIR-56 — a faixa do brandbook do Hábito aberto: cada hábito tem a
            sua imagem oficial, com o nome por cima. É o que amarra o painel ao
            universo da marca em vez de deixar a tela solta. */}
        <div className="relative overflow-hidden rounded-2xl mb-5 sm:mb-7 border border-white/10">
          {/* 🎓 DIR-64 — a imagem do Hábito ganhou altura: o dono disse que as
              imagens do brandbook estão bonitas e precisam APARECER. O véu
              escuro ficou mais curto do lado esquerdo (só o necessário pra
              segurar o texto) e some antes da metade, liberando a foto. */}
          <img
            src={secaoAtual.faixa}
            alt=""
            aria-hidden="true"
            className="w-full h-40 sm:h-60 object-cover"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: 'linear-gradient(90deg, rgba(0,2,12,0.94) 0%, rgba(0,2,12,0.78) 22%, rgba(0,2,12,0.28) 46%, rgba(0,2,12,0) 68%)' }}
          />
          <div className="absolute inset-0 flex flex-col justify-center px-5 sm:px-8">
            <p className="text-[10px] sm:text-[11px] font-bold tracking-[0.28em] text-white/55 uppercase">
              Hábito {String(secaoAtual.n).padStart(2, '0')}
            </p>
            <p className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-none mt-1.5">
              {secaoAtual.nome}
            </p>
          </div>
          <div
            aria-hidden="true"
            className="absolute bottom-0 left-0 h-1.5 w-28 sm:w-48"
            style={{ background: 'linear-gradient(90deg, var(--topcollege-azul), var(--topcollege-roxo), var(--topcollege-magenta))' }}
          />
        </div>

        {/* ══ 🏆 HÁBITOS 1-5 e 8 — O MÉTODO VIVO ══ */}
        {['sonho', 'compromisso', 'lista', 'contato', 'apresentacao', 'duplicacao'].includes(secaoAtiva) && (
          <CrmMetodo
            painel={secaoAtiva}
            currentUser={currentUser}
            visaoTotal={isSuperAdmin}
            nomePorUsuarioId={nomePorUsuarioId}
            clientesManuais={networkManualCustomers}
            oportunidades={networkOportunidades}
            onQualificar={handleQualificarContato}
            onRegistrarContato={handleRegistrarContatoMetodo}
            onEditarRegistro={handleEditarRegistroMetodo}
            onExcluirRegistro={handleExcluirRegistroMetodo}
            onNovoCliente={() => setShowAddForm(true)}
            onIr={(sec, sub) => { setSecao(sec); if (sub) setSubAcomp(sub); }}
          />
        )}

        {/* ══ 📊 HÁBITO 7 — VERIFICAÇÃO DO PROGRESSO (Visão Executiva) ══ */}
        {secaoAtiva === 'verificacao' && (
          <>
            {/* 🏛️ DIR-55/56 — o Hábito 7 É o X-office: "verificando o progresso
                e mapeando processos", sub-marca oficial do sistema X-EOS.
                Agora com o logo original, extraído do brandbook. */}
            <div className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/[0.05] pl-4 pr-5 py-2 mb-4">
              <img src="/marca/xoffice.webp" alt="X-office" className="h-6 w-auto" />
              <span className="text-[11px] sm:text-xs text-nz-tinta-fraca">verificando o progresso e mapeando processos</span>
            </div>
            {isSuperAdmin && metaCentral && <CrmMetaCentral metaCentral={metaCentral} ritmo={ritmo} />}
            {isSuperAdmin && kpisDiretoria && <CrmDashboardDiretoria kpis={filtrarKpisPorVisao(kpisDiretoria, vis)} />}
            {/* 🎯 DIR-38 — centro de comando: esteira em números, agenda do
                dia por pessoa do time e projeção da meta de captação */}
            <CrmEsteiraResumoExecutivo
              oportunidades={networkOportunidades}
              sales={networkCatalogSales}
              visaoTotal={isSuperAdmin}
              onVerEsteira={() => { setSecao('acompanhamento'); setSubAcomp('expansao'); }}
            />
            <CrmStatsCards stats={stats} isSuperAdmin={isSuperAdmin} verDinheiro={vis.verDinheiroEmpresa} parte="executiva" />
          </>
        )}

        {/* seletor interno do Hábito 6: Clientes × Esteira */}
        {secaoAtiva === 'acompanhamento' && (
          <div className="flex gap-2 mb-4">
            {[['clientes', '👥 Clientes'], ['expansao', '🚀 Esteira & Expansão']].map(([id, rotulo]) => (
              <button
                key={id}
                type="button"
                onClick={() => setSubAcomp(id)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${subAcomp === id ? 'bg-nz-verde text-white border-nz-verde' : 'bg-white text-nz-tinta-fraca border-nz-borda hover:text-nz-tinta'}`}
              >
                {rotulo}
              </button>
            ))}
          </div>
        )}

        {/* ══ 🚀 HÁBITO 6b — ESTEIRA/EXPANSÃO — captação, parceiros e escada ══ */}
        {secaoAtiva === 'acompanhamento' && subAcomp === 'expansao' && (
          <>
            {/* 🛤️ DIR-34 — Esteira de Captação (kanban + forecast + ranking) */}
            <CrmEsteiraCaptacao
              oportunidades={networkOportunidades}
              sales={networkCatalogSales}
              executivos={timeCorporativo}
              usuariosApp={appUsers}
              clientes={unifiedCustomers}
              currentUser={currentUser}
              visaoTotal={isSuperAdmin}
              onSalvar={handleSalvarOportunidade}
              onRegistrarAporteExterno={handleRegistrarAporteExterno}
              podeRegistrarAporte={vis.verDinheiroEmpresa}
              clientePreenchido={clientePreenchido}
              onClientePreenchidoConsumido={() => setClientePreenchido(null)}
            />
            <CrmParceirosCompra captacao={captacao} parceiros={parceirosCompra} />
            {isSuperAdmin && escadaLicencas && <CrmEscadaLicencas escada={escadaLicencas} />}
          </>
        )}

        {/* ══ 👥 CLIENTES — a operação do dia a dia ══ */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className={`mb-4 sm:mb-6 ${secaoAtiva === 'acompanhamento' && subAcomp === 'clientes' ? '' : 'hidden'}`}>
          <TabsList className="bg-white border border-nz-borda w-full sm:w-auto">
            <TabsTrigger value="customers" className="data-[state=active]:bg-nz-verde data-[state=active]:text-white text-nz-tinta-fraca flex-1 sm:flex-none">
              Clientes
            </TabsTrigger>
            {vis.gerirVendedores && (
              <TabsTrigger value="sellers" className="data-[state=active]:bg-nz-marrom data-[state=active]:text-white text-nz-tinta-fraca flex-1 sm:flex-none">
                Time Corporativo
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="customers">
            {/* 📞 DIR-24 Fase 4 — a fila de ação vem ANTES de tudo: é o que
                transforma o CRM de relatório em ferramenta de venda. */}
            <CrmQuemContatar fila={filaContato} onAbrirCliente={setDetailCustomer} />

            <CrmStatsCards
              stats={stats}
              isSuperAdmin={isSuperAdmin}
              parte="clientes"
              purchaseStatusFilter={purchaseStatusFilter}
              onPurchaseStatusClick={setPurchaseStatusFilter}
            />
            {/* FILTROS DE CLIENTES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nz-tinta-fraca" />
            <Input
              placeholder="Buscar por nome, email, telefone ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white text-nz-tinta border-nz-borda"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white text-nz-tinta rounded-md px-4 py-2 border border-nz-borda focus:outline-none focus:ring-2 focus:ring-nz-verde/40"
          >
            <option value="all">Todos os Status</option>
            <option value="lead">Leads</option>
            <option value="cliente">Clientes</option>
            <option value="inativo">Inativos</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-white text-nz-tinta rounded-md px-4 py-2 border border-nz-borda focus:outline-none focus:ring-2 focus:ring-nz-verde/40"
          >
            <option value="all">Todas as Origens</option>
            <option value="cadastro">Cadastro na Plataforma</option>
            <option value="loja_virtual">Loja Virtual</option>
            <option value="leilao">Leilão</option>
            <option value="indicacao">Indicação</option>
            <option value="site">Site</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="redes_sociais">Redes Sociais</option>
            <option value="ranking">Ranking Premiado</option>
            <option value="outro">Outro</option>
          </select>

          <select
            value={roleTypeFilter}
            onChange={(e) => setRoleTypeFilter(e.target.value)}
            className="bg-white text-nz-tinta rounded-md px-4 py-2 border border-nz-borda focus:outline-none focus:ring-2 focus:ring-nz-verde/40"
          >
            <option value="all">Todos os Tipos</option>
            {Object.entries(ROLE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <Button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setSourceFilter('all');
              setPurchaseStatusFilter('all');
              setRoleTypeFilter('all');
            }}
            variant="outline"
            className="bg-white border-nz-borda text-nz-tinta hover:bg-nz-cinza-fundo"
          >
            <Filter className="w-4 h-4 mr-2" />
            Limpar Filtros
          </Button>
          </div>

          {/* 🌊 DIR-24 Fase 5 — alternador Lista/Funil + exportação CSV */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex gap-1 rounded-lg border border-nz-borda bg-nz-cinza-fundo p-0.5">
              <button
                type="button"
                onClick={() => setVisaoClientes('lista')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold ${visaoClientes === 'lista' ? 'bg-white text-nz-verde shadow-sm' : 'text-nz-tinta-fraca'}`}
              >
                Lista
              </button>
              <button
                type="button"
                onClick={() => setVisaoClientes('funil')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold ${visaoClientes === 'funil' ? 'bg-white text-nz-verde shadow-sm' : 'text-nz-tinta-fraca'}`}
              >
                Funil
              </button>
            </div>
            <Button onClick={exportarCsv} variant="outline" size="sm" className="border-nz-borda text-nz-tinta hover:bg-nz-cinza-fundo text-xs">
              Exportar CSV ({filteredCustomers.length})
            </Button>
          </div>

          {visaoClientes === 'funil' ? (
            <CrmFunilKanban customers={filteredCustomers} onAbrirCliente={setDetailCustomer} onMoverManual={handleMoverNoFunil} />
          ) : (
            <CrmCustomersTable
              customers={filteredCustomers}
              onForward={handleForward}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onRowClick={setDetailCustomer}
            />
          )}

          {detailCustomer && (
            <CrmCustomerDetailModal
              customer={detailCustomer}
              onClose={() => setDetailCustomer(null)}
              onSaveNotes={handleSaveNotes}
              oportunidades={oportunidadesDoCliente}
              eventos={eventosDoCliente}
              onCriarOportunidade={criarOportunidadeDoCliente}
              onEditarContato={handleEditarContato}
              podeEditarUsuarioApp={vis.gerirVendedores}
            />
          )}
          </TabsContent>

          <TabsContent value="sellers">
            {/* 🏛️ DIR-39 — o topo puxado do cadastro do app pela função
                principal (cadastro manual de vendedor continua no botão
                "Novo Vendedor"; a tabela manual só saiu desta listagem). */}
            <CrmTimeCorporativo membros={timeCorporativo} />
          </TabsContent>
        </Tabs>

        {/* MODAL DE CADASTRO DE VENDEDOR */}
        {showSellerModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="bg-gray-800 border-gray-700 max-w-md w-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">
                    <span className="inline-flex items-center gap-2">
                      {editingSeller ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      {editingSeller ? 'Editar Vendedor' : 'Novo Vendedor'}
                    </span>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowSellerModal(false);
                      setEditingSeller(null);
                      setSellerFormData({
                        name: '',
                        phone: '',
                        email: '',
                        license_type: '',
                        is_active: true
                      });
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveSeller} className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Nome do Vendedor *</Label>
                    <Input
                      value={sellerFormData.name}
                      onChange={(e) => setSellerFormData({ ...sellerFormData, name: e.target.value })}
                      className="bg-gray-700 text-white"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300">Telefone (com código do país) *</Label>
                    <Input
                      value={sellerFormData.phone}
                      onChange={(e) => setSellerFormData({ ...sellerFormData, phone: e.target.value })}
                      className="bg-gray-700 text-white"
                      placeholder="Ex: 5521999999999"
                      required
                    />
                    <p className="text-xs text-gray-400 mt-1">Formato: código do país + DDD + número</p>
                  </div>

                  <div>
                    <Label className="text-gray-300">Email</Label>
                    <Input
                      type="email"
                      value={sellerFormData.email}
                      onChange={(e) => setSellerFormData({ ...sellerFormData, email: e.target.value })}
                      className="bg-gray-700 text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-300">Cargo / Tipo de Licença *</Label>
                    {/* 🎖️ DIR-30 — cargos OFICIAIS do Plano de Carreira (fonte
                        única src/lib/careerLevels.js, a mesma do Painel de
                        Controle): rede com % e adesão, diretoria com os nomes
                        pedidos pelo dono, e as licenças de loja antigas no fim
                        (vendedor legado continua legível). Escolher um cargo do
                        plano pré-preenche a comissão com o % oficial. */}
                    <select
                      value={sellerFormData.license_type}
                      onChange={(e) => {
                        const id = e.target.value;
                        const nivel = CAREER_LEVELS.find((l) => l.id === id);
                        setSellerFormData({
                          ...sellerFormData,
                          license_type: id,
                          ...(nivel && nivel.venda_direta_pct > 0 ? { default_commission_percentage: nivel.venda_direta_pct } : {}),
                        });
                      }}
                      className="w-full bg-gray-700 text-white rounded-md px-4 py-2 border border-gray-600"
                      required
                    >
                      <option value="">-- Selecione --</option>
                      <optgroup label="Plano de Carreira — Rede">
                        {CAREER_LEVELS.filter((l) => l.bloco === 'rede' && l.id !== 'usuario').map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name} · {l.venda_direta_pct}%{l.adesao_valor > 0 ? ` · adesão R$ ${l.adesao_valor.toLocaleString('pt-BR')}` : ''}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Diretoria">
                        {CAREER_LEVELS.filter((l) => l.bloco === 'diretor').map((l) => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Licenças de Loja (legado)">
                        <option value="loja_inicial">Loja Inicial · 13%</option>
                        <option value="loja_start">Loja Start · 15%</option>
                        <option value="loja_profissional">Loja Profissional · 16%</option>
                        <option value="loja_lider">Loja Líder · 19%</option>
                        <option value="loja_distribuidor">Loja Distribuidor · 20%</option>
                      </optgroup>
                    </select>
                    {(() => {
                      const nivel = CAREER_LEVELS.find((l) => l.id === sellerFormData.license_type);
                      return nivel ? (
                        <p className="text-xs text-green-400/90 mt-1.5 leading-snug">📖 {nivel.regra}</p>
                      ) : null;
                    })()}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-gray-300">Comissão do Vendedor (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={sellerFormData.default_commission_percentage}
                        onChange={(e) => setSellerFormData({ ...sellerFormData, default_commission_percentage: parseFloat(e.target.value) || 0 })}
                        className="bg-gray-700 text-white"
                        placeholder="Ex: 10"
                      />
                      <p className="text-xs text-gray-400 mt-1">% aplicada automaticamente no PDV</p>
                    </div>
                    <div>
                      <Label className="text-gray-300">Comissão do Licenciante (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={sellerFormData.default_licenciante_commission_percentage}
                        onChange={(e) => setSellerFormData({ ...sellerFormData, default_licenciante_commission_percentage: parseFloat(e.target.value) || 0 })}
                        className="bg-gray-700 text-white"
                        placeholder="Ex: 5"
                      />
                      <p className="text-xs text-gray-400 mt-1">% do indicador (se houver)</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                      <Save className="w-4 h-4 mr-2" />
                      {editingSeller ? 'Atualizar' : 'Salvar'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowSellerModal(false);
                        setEditingSeller(null);
                        setSellerFormData({
                          name: '',
                          phone: '',
                          email: '',
                          license_type: '',
                          default_commission_percentage: 0,
                          default_licenciante_commission_percentage: 0,
                          is_active: true
                          });
                          }}
                          className="border-gray-600 text-gray-300"
                          >
                          Cancelar
                          </Button>
                          </div>
                          </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* MODAL DE ENCAMINHAR PARA VENDEDOR */}
        {showForwardModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="bg-gray-800 border-gray-700 max-w-md w-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2"><Send className="w-4 h-4" />Encaminhar para Vendedor</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowForwardModal(false);
                      setSelectedSeller('');
                      setSelectedCustomer(null);
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-gray-300 mb-2 block">Cliente Selecionado:</Label>
                  <div className="bg-gray-700 p-3 rounded-lg">
                    <p className="text-white font-semibold">{selectedCustomer?.full_name}</p>
                    <p className="text-gray-400 text-sm">{selectedCustomer?.email}</p>
                    <p className="text-gray-400 text-sm">{selectedCustomer?.phone}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-300 mb-2 block">Selecione o Vendedor:</Label>
                  <select
                    value={selectedSeller}
                    onChange={(e) => setSelectedSeller(e.target.value)}
                    className="w-full bg-gray-700 text-white rounded-md px-4 py-2 border border-gray-600"
                  >
                    <option value="">-- Selecione --</option>
                    {sellers.map((seller, index) => (
                      <option key={index} value={seller.name}>
                        {seller.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={sendToWhatsApp}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={!selectedSeller}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Enviar via WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowForwardModal(false);
                      setSelectedSeller('');
                      setSelectedCustomer(null);
                    }}
                    className="border-gray-600 text-gray-300"
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* MODAL DE FORMULÁRIO */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <Card className="bg-gray-800 border-gray-700 max-w-4xl w-full my-8 max-h-[90vh] overflow-hidden flex flex-col">
              <CardHeader className="border-b border-gray-700 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-xl font-bold">
                    <span className="inline-flex items-center gap-2">
                      {editingCustomer ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                      {editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}
                    </span>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingCustomer(null);
                      setShowProductSearch(false);
                      setProductSearchTerm('');
                    }}
                    className="text-gray-400 hover:text-white hover:bg-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-y-auto flex-1 p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {duplicadoNoCadastro && (
                    <div className="rounded-lg border border-amber-500/60 bg-amber-500/10 p-3 flex items-start gap-2">
                      <TriangleAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-300">
                        <span className="font-semibold">{duplicadoNoCadastro.full_name}</span> já existe no seu CRM com este {(formData.email || '').trim() && (duplicadoNoCadastro.email || '').toLowerCase() === formData.email.trim().toLowerCase() ? 'e-mail' : 'telefone'} — salvar de novo cria um cadastro duplicado. Prefira abrir o perfil que já existe e anotar por lá.
                      </p>
                    </div>
                  )}
                  {/* 🧭 DIR-25 — cadastro organizado em SEÇÕES: dados, endereço,
                      acompanhamento (com vendedor responsável e follow-up) e
                      interesses (produtos + planos de parceiro + licenças,
                      valores editáveis). */}
                  <div className="space-y-6">

                    {/* 👤 DADOS DO CLIENTE */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-green-400 border-b border-gray-700 pb-1.5 mb-3">Dados do cliente</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-gray-300">Nome Completo *</Label>
                          <Input value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className="bg-gray-700 text-white" required />
                        </div>
                        <div>
                          <Label className="text-gray-300">Email</Label>
                          <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="bg-gray-700 text-white" />
                        </div>
                        <div>
                          <Label className="text-gray-300">Telefone (WhatsApp)</Label>
                          <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="(21) 99999-9999" className="bg-gray-700 text-white" />
                        </div>
                        <div>
                          <Label className="text-gray-300">CPF</Label>
                          <Input value={formData.cpf} onChange={(e) => setFormData({ ...formData, cpf: e.target.value })} className="bg-gray-700 text-white" />
                        </div>
                      </div>
                    </div>

                    {/* 📍 ENDEREÇO */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-green-400 border-b border-gray-700 pb-1.5 mb-3">Endereço</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-gray-300">CEP</Label>
                          <Input value={formData.address_zip_code} onChange={(e) => setFormData({ ...formData, address_zip_code: e.target.value })} className="bg-gray-700 text-white" />
                        </div>
                        <div>
                          <Label className="text-gray-300">Endereço</Label>
                          <Input value={formData.address_street} onChange={(e) => setFormData({ ...formData, address_street: e.target.value })} className="bg-gray-700 text-white" />
                        </div>
                        <div>
                          <Label className="text-gray-300">Número</Label>
                          <Input value={formData.address_number} onChange={(e) => setFormData({ ...formData, address_number: e.target.value })} className="bg-gray-700 text-white" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-gray-300">Cidade</Label>
                            <Input value={formData.address_city} onChange={(e) => setFormData({ ...formData, address_city: e.target.value })} className="bg-gray-700 text-white" />
                          </div>
                          <div>
                            <Label className="text-gray-300">Estado</Label>
                            <Input value={formData.address_state} onChange={(e) => setFormData({ ...formData, address_state: e.target.value })} className="bg-gray-700 text-white" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 🎯 ACOMPANHAMENTO */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-green-400 border-b border-gray-700 pb-1.5 mb-3">Acompanhamento</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-gray-300">Status</Label>
                          <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full bg-gray-700 text-white rounded-md px-4 py-2 border border-gray-600">
                            <option value="lead">Lead</option>
                            <option value="cliente">Cliente</option>
                            <option value="inativo">Inativo</option>
                          </select>
                        </div>
                        <div>
                          <Label className="text-gray-300">Origem</Label>
                          <select value={formData.source} onChange={(e) => setFormData({ ...formData, source: e.target.value })} className="w-full bg-gray-700 text-white rounded-md px-4 py-2 border border-gray-600">
                            <option value="site">Site</option>
                            <option value="indicacao">Indicação</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="redes_sociais">Redes Sociais</option>
                            <option value="ranking">Ranking Premiado</option>
                            <option value="outro">Outro</option>
                          </select>
                        </div>
                        <div>
                          <Label className="text-gray-300">Vendedor responsável</Label>
                          <select value={formData.assigned_seller} onChange={(e) => setFormData({ ...formData, assigned_seller: e.target.value })} className="w-full bg-gray-700 text-white rounded-md px-4 py-2 border border-gray-600">
                            <option value="">— Sem vendedor —</option>
                            {vendedoresDoSeletor.map((sel) => (
                              <option key={sel.id} value={sel.name}>{sel.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label className="text-gray-300">Último Contato</Label>
                          <Input type="date" value={formData.last_contact} onChange={(e) => setFormData({ ...formData, last_contact: e.target.value })} className="bg-gray-700 text-white" />
                        </div>
                        <div>
                          <Label className="text-gray-300">Voltar a falar em</Label>
                          <Input type="date" value={formData.follow_up_date} onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })} className="bg-gray-700 text-white" />
                          <p className="text-[11px] text-gray-500 mt-1">Com data marcada, o cliente entra sozinho na fila "Quem contatar hoje".</p>
                        </div>
                        <div>
                          <Label className="text-gray-300">Próximo passo</Label>
                          <Input value={formData.next_steps} onChange={(e) => setFormData({ ...formData, next_steps: e.target.value })} placeholder="ex.: mandar proposta do Plano Elite" className="bg-gray-700 text-white" />
                        </div>
                      </div>
                    </div>

                    {/* 💼 INTERESSES — produtos, planos de parceiro e licenças */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-green-400 border-b border-gray-700 pb-1.5 mb-3">Interesses (produtos, planos e licenças)</p>

                      {/* Produtos do catálogo — TODOS visíveis, busca só refina */}
                      <Label className="text-gray-300 text-sm mb-2 block">
                        <span className="inline-flex items-center gap-2"><Package className="w-4 h-4" />Produtos do catálogo ({availableProducts.length})</span>
                      </Label>
                      <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="Filtrar por nome ou lote (a lista completa já está abaixo)..."
                          value={productSearchTerm}
                          onChange={(e) => setProductSearchTerm(e.target.value)}
                          className="pl-10 bg-gray-700 text-white border-gray-600 focus:border-green-500"
                        />
                      </div>
                      <div className="max-h-56 overflow-y-auto bg-gray-900 rounded-lg border border-gray-600 mb-4">
                        {loadingProducts ? (
                          <div className="px-4 py-8 text-center text-gray-400 text-sm">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto mb-3"></div>
                            <p>Carregando produtos...</p>
                          </div>
                        ) : filteredProductsForModal.length === 0 ? (
                          <div className="px-4 py-8 text-center text-gray-400 text-sm">
                            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>{productSearchTerm ? `Nenhum produto com "${productSearchTerm}"` : 'Nenhum produto no catálogo'}</p>
                            {!productSearchTerm && (
                              <button type="button" onClick={loadProducts} className="mt-3 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition-colors">
                                <span className="inline-flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" />Recarregar Produtos</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <>
                            {filteredProductsForModal.slice(0, 60).map(product => {
                              const qty = Number(product.quantity) || 0;
                              return (
                                <button
                                  key={product.id}
                                  type="button"
                                  onClick={() => addInterestedProduct(product)}
                                  className="w-full text-left px-4 py-2.5 hover:bg-gray-700 border-b border-gray-700 last:border-b-0 text-white transition-colors group"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="font-semibold text-sm group-hover:text-green-400 transition-colors truncate">{product.description}</p>
                                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold ${qty > 0 ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                                      {qty > 0 ? `${qty} un.` : 'sem estoque'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    Lote: {product.lot || 'N/A'}{Number(product.selling_price_retail) > 0 ? ` • R$ ${Number(product.selling_price_retail).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}
                                  </p>
                                </button>
                              );
                            })}
                            {filteredProductsForModal.length > 60 && (
                              <p className="px-4 py-2 text-center text-[11px] text-gray-500">Mostrando 60 de {filteredProductsForModal.length} — use o filtro pra achar mais rápido.</p>
                            )}
                          </>
                        )}
                      </div>

                      {/* Planos de Parceiro de Compra — valor de investimento editável */}
                      <Label className="text-gray-300 text-sm mb-2 block">
                        <span className="inline-flex items-center gap-2"><DollarSign className="w-4 h-4" />Planos de Parceiro de Compra</span>
                      </Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                        {PLANOS_PARCEIRO.map((plano) => {
                          const chave = `plano_${plano.id}`;
                          const marcado = formData.interested_products.some((p) => chaveInteresse(p) === chave);
                          return (
                            <button
                              key={plano.id}
                              type="button"
                              onClick={() => marcado ? removerInteresse(chave) : addInteresse({ chave, tipo: 'plano_parceiro', product_name: plano.name, valor: plano.minInvestment })}
                              className={`rounded-lg border p-2.5 text-left transition-colors ${marcado ? 'border-green-500 bg-green-500/10' : 'border-gray-600 bg-gray-900 hover:border-green-500/50'}`}
                            >
                              <p className="text-xs font-semibold text-white leading-tight">{plano.name.replace('Plano ', '')}</p>
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                {plano.isCustom ? 'valor livre' : `a partir de R$ ${plano.minInvestment.toLocaleString('pt-BR')}`}
                              </p>
                              <p className="text-[10px] text-gray-500">{plano.expectedReturn}%/mês · {plano.duration} meses</p>
                            </button>
                          );
                        })}
                      </div>

                      {/* Licenças — escada oficial, investimento editável */}
                      <Label className="text-gray-300 text-sm mb-2 block">
                        <span className="inline-flex items-center gap-2"><Briefcase className="w-4 h-4" />Licenças (plano oficial)</span>
                      </Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                        {ESCADA_LICENCAS.map((nivel) => {
                          const chave = `licenca_${nivel.id}`;
                          const marcado = formData.interested_products.some((p) => chaveInteresse(p) === chave);
                          return (
                            <button
                              key={nivel.id}
                              type="button"
                              onClick={() => marcado ? removerInteresse(chave) : addInteresse({ chave, tipo: 'licenca', product_name: `Licença ${nivel.label}`, valor: nivel.investimento })}
                              className={`rounded-lg border p-2.5 text-left transition-colors ${marcado ? 'border-green-500 bg-green-500/10' : 'border-gray-600 bg-gray-900 hover:border-green-500/50'}`}
                            >
                              <p className="text-xs font-semibold text-white leading-tight">{nivel.label}</p>
                              <p className="text-[11px] text-gray-400 mt-0.5">{nivel.investimento === 0 ? 'Grátis' : `R$ ${nivel.investimento.toLocaleString('pt-BR')}`}</p>
                              <p className="text-[10px] text-gray-500">{nivel.comissao}% de comissão</p>
                            </button>
                          );
                        })}
                      </div>

                      {/* Selecionados — com valor editável e total */}
                      {formData.interested_products.length > 0 && (
                        <div className="bg-gray-900/60 p-3 rounded-lg border border-gray-700">
                          <Label className="text-gray-400 text-xs mb-2 block">
                            <span className="inline-flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" />Interesses marcados ({formData.interested_products.length}) — ajuste os valores se precisar</span>
                          </Label>
                          <div className="space-y-1.5">
                            {formData.interested_products.map((p) => {
                              const chave = chaveInteresse(p);
                              const tipo = p.tipo || 'produto';
                              const tipoLabel = tipo === 'plano_parceiro' ? 'Plano' : tipo === 'licenca' ? 'Licença' : 'Produto';
                              return (
                                <div key={chave} className="flex items-center gap-2">
                                  <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold ${tipo === 'produto' ? 'bg-gray-700 text-gray-300' : tipo === 'licenca' ? 'bg-purple-500/20 text-purple-300' : 'bg-green-500/20 text-green-400'}`}>{tipoLabel}</span>
                                  <p className="flex-1 min-w-0 text-sm text-white truncate">{p.product_name}</p>
                                  <div className="relative shrink-0 w-32">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">R$</span>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={p.valor ?? ''}
                                      onChange={(e) => atualizarValorInteresse(chave, e.target.value)}
                                      className="bg-gray-700 text-white text-right text-sm h-8 pl-7"
                                    />
                                  </div>
                                  <button type="button" onClick={() => removerInteresse(chave)} className="shrink-0 hover:bg-red-500/20 rounded-full p-1 transition-colors">
                                    <X className="w-3.5 h-3.5 text-gray-400" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex items-center justify-between border-t border-gray-700 mt-3 pt-2">
                            <p className="text-xs text-gray-400">Potencial estimado deste cliente</p>
                            <p className="text-base font-bold text-green-400">R$ {totalInteresses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 📝 OBSERVAÇÕES */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-green-400 border-b border-gray-700 pb-1.5 mb-3">Observações</p>
                      <Textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="O que foi conversado, objeções, contexto..."
                        className="bg-gray-700 text-white"
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-700 sticky bottom-0 bg-gray-800 -mx-6 px-6 -mb-6 pb-6">
                    <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 py-3">
                      <Save className="w-4 h-4 mr-2" />
                      {editingCustomer ? 'Atualizar Cliente' : 'Salvar Cliente'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingCustomer(null);
                        setShowProductSearch(false);
                        setProductSearchTerm('');
                      }}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700 px-6"
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 🖼️ DIR-56 — a frase oficial do brandbook fecha o painel. É imagem da
            marca, não texto solto: o mesmo material das apresentações. */}
        <div className="relative overflow-hidden rounded-2xl mt-8 border border-white/10">
          <img src="/marca/frase.webp" alt="O sucesso é a soma de pequenos esforços repetidos dia após dia." className="w-full h-24 sm:h-36 object-cover" />
        </div>

      </div>
    </div>
  );
}