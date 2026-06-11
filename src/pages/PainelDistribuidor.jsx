import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import MetaBanner from '@/components/painel/MetaBanner';
import RegiaoCard from '@/components/painel/RegiaoCard';
import {
  LayoutDashboard, Package, Store, Link2, Network, Truck, Wallet, Building2,
  Loader2, Copy, Check, ExternalLink, TrendingUp, Users, DollarSign, ShoppingCart,
  ArrowRight, MousePointerClick, UserPlus, Megaphone, Briefcase, Send, MapPin, Hash, Mail, Phone,
  UserCog, Factory, Plus, Trash2, KeyRound, Box, Receipt, Target
} from 'lucide-react';

const money = (n) => 'R$ ' + (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ORIGIN = (typeof window !== 'undefined' ? window.location.origin : 'https://leilaonozap.net');
const CARGO_LABEL = { usuario: 'Usuário', influenciador: 'Influenciador', vendedor: 'Vendedor', licenciado: 'Licenciado', parceiro: 'Parceiro', ponto_retirada: 'Ponto de Retirada', loja_fisica: 'Loja Física', distribuidor: 'Distribuidor' };
const onlyDigits = (s) => String(s || '').replace(/\D/g, '');

// itens que abrem páginas já existentes (recursos completos do app)
const EXTERNAL = {
  produtos: 'ProductManagement',
  loja: 'CatalogManagement',
  financeiro: 'Carteira',
};
// rotas diretas (não passam por createPageUrl)
const ROUTES = {
  pedidos: '/painel/pedidos',
  pdv: '/painel/pdv',
};

export default function PainelDistribuidor() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('visao');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState('');
  const [levels, setLevels] = useState([]);
  const [perms, setPerms] = useState([]);
  const [downline, setDownline] = useState([]); // toda a rede abaixo do distribuidor
  const [suppliers, setSuppliers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [supForm, setSupForm] = useState({ nome: '', cnpj: '', contato: '', telefone: '', email: '', categoria: '', observacao: '' });
  const [empForm, setEmpForm] = useState({ full_name: '', email: '', password: '' });
  const [vendas, setVendas] = useState(null);
  const [vendasResumo, setVendasResumo] = useState({ total_vendas: 0, total_valor: 0 });
  const [lojaStats, setLojaStats] = useState(null);
  const [pwForm, setPwForm] = useState({ atual: '', nova: '', conf: '' });
  const [marketing, setMarketing] = useState(null);
  const [busy, setBusy] = useState('');
  const [stats, setStats] = useState({
    produtos_total: 0, produtos_ativos: 0, estoque_qtd: 0, vendidos_qtd: 0, faturado: 0, valor_estoque: 0,
    pedidos_abrir: 0, pedidos_total: 0, vendas_valor: 0, pdv_hoje: 0,
    funcionarios: 0, fornecedores: 0, comissao: 0, saldo: 0, cliques: 0,
    rede_total: 0, vendedores: 0, influenciadores: 0, licenciados: 0, parceiros: 0, pontos: 0, lojas: 0,
  });

  useEffect(() => {
    let u = null; try { u = JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { u = null; }
    // 🧑‍💼 funcionário de PDV não vê o painel do distribuidor — vai direto pro PDV
    if (u && u.is_pdv_operator === true) { navigate('/painel/pdv'); return; }
    setUser(u);
    if (!u?.id) { setLoading(false); return; }
    const _isLoja = ['loja_fisica', 'ponto_retirada', 'parceiro'].includes(u.primary_career_level);
    (async () => {
      try {
        const [dash, wallet, lv, rp, rede] = await Promise.all([
          _isLoja ? supabase.rpc('loja_dash', { _owner: u.id }) : supabase.rpc('distribuidor_dash', { dist_id: u.id }),
          base44.functions.invoke('getMyWallet', { user_id: u.id }),
          supabase.from('career_levels').select('id,nome,adesao_valor,ordem').eq('bloco', 'rede').order('ordem'),
          supabase.from('register_permissions').select('can_register_level,bonus_adesao_pct').eq('actor_level', u.primary_career_level),
          supabase.rpc('distribuidor_rede', { dist_id: u.id }),
        ]);
        const d = dash?.data || {};
        setLevels(lv.data || []);
        setPerms(rp.data || []);
        setDownline(rede.data || []);
        if (_isLoja) setLojaStats({ ...d, saldo: wallet?.saldo_disponivel || 0, comissao: d.comissao ?? 0 });
        else setStats((s) => ({ ...s, ...d, saldo: wallet?.saldo_disponivel || 0, comissao: d.comissao ?? (wallet?.commission_balance || 0) }));
      } catch (e) { console.error(e); }
      setLoading(false);
      // fornecedores + funcionários (não bloqueiam a tela)
      try {
        const [sup, emp] = await Promise.all([
          base44.functions.invoke('manageSuppliers', { action: 'list', ownerId: u.id }),
          base44.functions.invoke('manageEmployees', { action: 'list', employerId: u.id }),
        ]);
        setSuppliers(sup?.suppliers || []);
        setEmployees(emp?.employees || []);
      } catch (_) { /* silencioso */ }
    })();
  }, []);

  const linkFor = (cargo) => `${ORIGIN}/c/${cargo}?ref=${encodeURIComponent(user?.referral_code || '')}`;
  const copy = (cargo) => { navigator.clipboard.writeText(linkFor(cargo)); setCopied(cargo); toast.success('Link copiado!'); setTimeout(() => setCopied(''), 1500); };
  const sendWhats = (cargo) => {
    const label = CARGO_LABEL[cargo] || cargo;
    const msg = `Olá! Quero te convidar pra fazer parte da Leilão NoZap como *${label}*. É só se cadastrar por este link:\n\n${linkFor(cargo)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Fornecedores
  const addSupplier = async () => {
    if (!supForm.nome.trim()) { toast.error('Nome do fornecedor é obrigatório.'); return; }
    setBusy('add-sup');
    try {
      const r = await base44.functions.invoke('manageSuppliers', { action: 'add', actorId: user.id, ownerId: user.id, ...supForm });
      if (!r?.success) { toast.error(r?.error || 'Falha ao salvar'); setBusy(''); return; }
      toast.success('Fornecedor cadastrado!');
      setSuppliers((p) => [r.supplier, ...p]);
      setSupForm({ nome: '', cnpj: '', contato: '', telefone: '', email: '', categoria: '', observacao: '' });
    } catch { toast.error('Erro'); }
    setBusy('');
  };
  const removeSupplier = async (id) => { setBusy(id); try { await base44.functions.invoke('manageSuppliers', { action: 'remove', actorId: user.id, id }); setSuppliers((p) => p.filter((x) => x.id !== id)); } catch { toast.error('Erro'); } setBusy(''); };

  // Funcionários do PDV
  const addEmployee = async () => {
    if (!empForm.full_name.trim() || !empForm.email.trim() || empForm.password.length < 6) { toast.error('Nome, e-mail e senha (mín. 6).'); return; }
    setBusy('add-emp');
    try {
      const r = await base44.functions.invoke('manageEmployees', { action: 'add', actorId: user.id, employerId: user.id, ...empForm, email: empForm.email.trim().toLowerCase() });
      if (!r?.success) { toast.error(r?.error || 'Falha ao criar'); setBusy(''); return; }
      toast.success('Funcionário criado! Já pode logar e tirar pedidos.');
      setEmployees((p) => [r.employee, ...p]);
      setEmpForm({ full_name: '', email: '', password: '' });
    } catch { toast.error('Erro'); }
    setBusy('');
  };
  const removeEmployee = async (id) => { setBusy(id); try { await base44.functions.invoke('manageEmployees', { action: 'remove', actorId: user.id, id }); setEmployees((p) => p.filter((x) => x.id !== id)); } catch { toast.error('Erro'); } setBusy(''); };

  // Trocar senha
  const trocarSenha = async () => {
    if (pwForm.nova.length < 6) { toast.error('Nova senha: mínimo 6 caracteres.'); return; }
    if (pwForm.nova !== pwForm.conf) { toast.error('A confirmação não bate com a nova senha.'); return; }
    setBusy('senha');
    try {
      const r = await base44.functions.invoke('changeOwnPassword', { userId: user.id, currentPassword: pwForm.atual, newPassword: pwForm.nova });
      if (!r?.success) { toast.error(r?.error || 'Falha'); setBusy(''); return; }
      toast.success('Senha alterada com sucesso!');
      setPwForm({ atual: '', nova: '', conf: '' });
    } catch { toast.error('Erro'); }
    setBusy('');
  };

  // Marketing (lazy)
  const loadMarketing = async () => {
    if (marketing !== null || !user?.id) return;
    try {
      const { data } = await supabase.rpc('marketing_resumo', { _ref: user.referral_code || '___', _owner: user.id });
      setMarketing(data || {});
    } catch (e) { console.error(e); setMarketing({}); }
  };

  // Histórico de vendas (lazy)
  const loadVendas = async () => {
    if (vendas !== null || !user?.id) return;
    try {
      const [list, resumo] = await Promise.all([
        supabase.rpc('distribuidor_vendas', { dist_id: user.id, lim: 300 }),
        supabase.rpc('distribuidor_vendas_resumo', { dist_id: user.id }),
      ]);
      setVendas(list.data || []);
      if (resumo.data) setVendasResumo(resumo.data);
    } catch (e) { console.error(e); setVendas([]); }
  };

  const isLoja = user && ['loja_fisica', 'ponto_retirada', 'parceiro'].includes(user.primary_career_level);
  const MENU = isLoja ? [
    { id: 'visao', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'cadastrar', label: 'Cadastrar & Vender', icon: Link2, star: true },
    { id: 'rede', label: 'Minha Rede', icon: Network },
    { id: 'pdv', label: 'PDV · Tirar Pedido', icon: ShoppingCart, route: ROUTES.pdv, star: true },
    { id: 'estoque', label: 'Meu Estoque', icon: Package, route: '/painel/estoque', star: true },
    { id: 'pedidos', label: 'Pedidos & Envio', icon: Truck, route: ROUTES.pedidos },
    { id: 'vendas', label: 'Vendas / Histórico', icon: Receipt },
    { id: 'marketing', label: 'Marketing & Cliques', icon: Megaphone },
    { id: 'financeiro', label: 'Financeiro & Comissões', icon: Wallet, ext: true },
    { id: 'empresa', label: 'Empresa / Perfil', icon: Building2 },
  ] : [
    { id: 'visao', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'cadastrar', label: 'Cadastrar & Vender', icon: Link2, star: true },
    { id: 'rede', label: 'Minha Rede', icon: Network },
    { id: 'pdv', label: 'PDV · Tirar Pedido', icon: ShoppingCart, route: ROUTES.pdv, star: true },
    { id: 'funcionarios', label: 'Funcionários (PDV)', icon: UserCog },
    { id: 'produtos', label: 'Produtos & Estoque', icon: Package, ext: true },
    { id: 'fornecedores', label: 'Fornecedores', icon: Factory },
    { id: 'loja', label: 'Editar Loja Virtual', icon: Store, ext: true },
    { id: 'pedidos', label: 'Pedidos & Envio', icon: Truck, route: ROUTES.pedidos },
    { id: 'vendas', label: 'Vendas / Histórico', icon: Receipt },
    { id: 'marketing', label: 'Marketing & Cliques', icon: Megaphone },
    { id: 'financeiro', label: 'Financeiro & Comissões', icon: Wallet, ext: true },
    { id: 'empresa', label: 'Empresa / Perfil', icon: Building2 },
  ];
  const onMenu = (m) => { if (m.route) navigate(m.route); else if (m.ext) navigate(createPageUrl(EXTERNAL[m.id])); else { setTab(m.id); if (m.id === 'vendas') loadVendas(); if (m.id === 'marketing') loadMarketing(); } };

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando painel…</div>;
  if (!user) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-400">Faça login.</div>;

  const cargoNome = CARGO_LABEL[user.primary_career_level] || user.primary_career_level;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col md:flex-row">
      {/* MENU LATERAL */}
      <aside className="md:w-64 bg-gray-950 border-r border-gray-800 p-4 md:min-h-screen md:sticky md:top-0 md:self-start">
        <div className="mb-6 px-2">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Painel do</div>
          <div className="text-lg font-black text-green-400">{cargoNome}</div>
          <div className="text-[11px] text-gray-500 truncate">{user.full_name}</div>
        </div>
        <nav className="space-y-1">
          {MENU.map((m) => {
            const active = !m.ext && !m.route && tab === m.id;
            return (
              <button key={m.id} onClick={() => onMenu(m)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${active ? 'bg-green-500/15 text-green-400 font-semibold' : 'text-gray-300 hover:bg-gray-800'}`}>
                <m.icon className="w-[18px] h-[18px] flex-shrink-0" />
                <span className="flex-1 text-left">{m.label}</span>
                {m.star && <span className="text-[9px] bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded">★</span>}
                {m.ext && <ExternalLink className="w-3.5 h-3.5 opacity-40" />}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* CONTEÚDO */}
      <main className="flex-1 p-6 md:p-8">
        {/* ───────────── VISÃO GERAL — LOJA (loja_fisica/ponto/parceiro) ───────────── */}
        {tab === 'visao' && isLoja && (
          <div>
            <MetaBanner userId={user.id} />
            <RegiaoCard user={user} />
            <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
              <div>
                <h1 className="text-2xl font-black mb-1">Visão Geral</h1>
                <p className="text-gray-400 text-sm">{user.store_name || user.full_name} · {cargoNome}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => navigate(ROUTES.pdv)} className="px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-sm font-bold flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Tirar pedido</button>
                <button onClick={() => navigate('/painel/estoque')} className="px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-sm font-bold flex items-center gap-2"><Package className="w-4 h-4" /> Meu Estoque</button>
              </div>
            </div>
            <SectionLabel>📦 Minha loja</SectionLabel>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Stat icon={Package} label="Produtos na loja" value={Number(lojaStats?.itens || 0).toLocaleString('pt-BR')} sub={`${lojaStats?.ativos || 0} ativos`} color="text-white" />
              <Stat icon={Box} label="Em estoque" value={Number(lojaStats?.estoque_qtd || 0).toLocaleString('pt-BR')} sub={`${lojaStats?.sem_estoque || 0} zerados`} color="text-blue-400" />
              <Stat icon={DollarSign} label="Valor em loja" value={money(lojaStats?.valor_loja || 0)} sub="estoque × preço" color="text-amber-400" />
              <Stat icon={Truck} label="Pedidos a despachar" value={lojaStats?.pedidos_abrir || 0} sub="aguardando" color={lojaStats?.pedidos_abrir > 0 ? 'text-orange-400' : 'text-white'} />
            </div>
            <SectionLabel>💰 Vendas & Rede</SectionLabel>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Stat icon={ShoppingCart} label="Vendas" value={money(lojaStats?.vendas_valor || 0)} sub="online + PDV" color="text-green-400" />
              <Stat icon={TrendingUp} label="Comissões" value={money(lojaStats?.comissao || 0)} sub="acumuladas" color="text-yellow-400" />
              <Stat icon={Users} label="Minha rede" value={lojaStats?.rede_total || 0} sub={`${lojaStats?.vendedores || 0} vendedores`} color="text-white" />
              <Stat icon={Wallet} label="Saldo" value={money(lojaStats?.saldo || 0)} sub="pra sacar" color="text-emerald-400" />
            </div>
            <SectionLabel>⚡ Atalhos</SectionLabel>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Shortcut onClick={() => navigate(ROUTES.pdv)} icon={ShoppingCart} title="PDV · Tirar pedido" desc="Venda e baixe estoque." highlight />
              <Shortcut onClick={() => navigate('/painel/estoque')} icon={Package} title="Meu Estoque" desc="Veja e ajuste sua loja." />
              <Shortcut onClick={() => setTab('cadastrar')} icon={Link2} title="Cadastrar & Vender" desc="Monte sua equipe." />
              <Shortcut onClick={() => navigate(ROUTES.pedidos)} icon={Truck} title="Pedidos & Envio" desc="Despache suas vendas." />
            </div>
          </div>
        )}

        {/* ───────────────────── VISÃO GERAL — DISTRIBUIDOR ───────────────────── */}
        {tab === 'visao' && !isLoja && (
          <div>
            <MetaBanner userId={user.id} />
            <RegiaoCard user={user} />
            <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
              <div>
                <h1 className="text-2xl font-black mb-1">Visão Geral</h1>
                <p className="text-gray-400 text-sm">Retrato da operação do Distribuidor 01 (Bangu).</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => navigate(ROUTES.pdv)} className="px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-sm font-bold flex items-center gap-2"><ShoppingCart className="w-4 h-4" /> Tirar pedido</button>
                {stats.pedidos_abrir > 0 && (
                  <button onClick={() => navigate(ROUTES.pedidos)} className="px-4 py-2.5 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-300 text-sm font-bold flex items-center gap-2"><Truck className="w-4 h-4" /> {stats.pedidos_abrir} a despachar</button>
                )}
              </div>
            </div>

            {/* destaque: vendas hoje + faturado */}
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-gradient-to-br from-green-900/50 to-emerald-800/20 border border-green-500/30 rounded-2xl p-5">
                <div className="flex items-center gap-2 text-green-300 text-xs mb-1"><DollarSign className="w-4 h-4" /> Faturado (vendido)</div>
                <div className="text-3xl font-black text-green-400">{money(stats.faturado)}</div>
                <div className="text-xs text-gray-400 mt-1">{Number(stats.vendidos_qtd).toLocaleString('pt-BR')} unidades vendidas</div>
              </div>
              <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-5">
                <div className="flex items-center gap-2 text-gray-400 text-xs mb-1"><ShoppingCart className="w-4 h-4" /> PDV hoje</div>
                <div className="text-3xl font-black text-white">{money(stats.pdv_hoje)}</div>
                <div className="text-xs text-gray-400 mt-1">{stats.pedidos_total} pedido(s) no total</div>
              </div>
            </div>

            {/* ESTOQUE */}
            <SectionLabel>📦 Estoque & Produtos</SectionLabel>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Stat icon={Package} label="Produtos cadastrados" value={Number(stats.produtos_total).toLocaleString('pt-BR')} sub={`${stats.produtos_ativos} ativos na loja`} color="text-white" />
              <Stat icon={Box} label="Em estoque" value={Number(stats.estoque_qtd).toLocaleString('pt-BR')} sub="unidades" color="text-blue-400" />
              <Stat icon={TrendingUp} label="Vendidos" value={Number(stats.vendidos_qtd).toLocaleString('pt-BR')} sub="unidades" color="text-green-400" />
              <Stat icon={DollarSign} label="Capital em estoque" value={money(stats.valor_estoque)} sub="a custo" color="text-amber-400" />
            </div>

            {/* FINANCEIRO */}
            <SectionLabel>💰 Financeiro</SectionLabel>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Stat icon={Truck} label="Pedidos a despachar" value={stats.pedidos_abrir} sub="aguardando envio" color={stats.pedidos_abrir > 0 ? 'text-orange-400' : 'text-white'} />
              <Stat icon={ShoppingCart} label="Vendas (pedidos)" value={money(stats.vendas_valor)} sub="online + PDV" color="text-white" />
              <Stat icon={TrendingUp} label="Comissões" value={money(stats.comissao)} sub="acumuladas" color="text-yellow-400" />
              <Stat icon={Wallet} label="Saldo disponível" value={money(stats.saldo)} sub="pra sacar" color="text-emerald-400" />
            </div>

            {/* REDE & EQUIPE */}
            <SectionLabel>🌐 Rede & Equipe</SectionLabel>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
              <Stat icon={Users} label="Rede total" value={stats.rede_total} sub="pessoas abaixo" color="text-white" />
              <Stat icon={UserCog} label="Funcionários (PDV)" value={stats.funcionarios} sub="logins de balcão" color="text-cyan-400" />
              <Stat icon={Factory} label="Fornecedores" value={stats.fornecedores} sub="cadastrados" color="text-fuchsia-400" />
              <Stat icon={MousePointerClick} label="Cliques na loja" value={stats.cliques} sub="visitas" color="text-blue-400" />
            </div>
            <div className="flex flex-wrap gap-2 mb-8 text-xs">
              <Chip>Influenciadores: {stats.influenciadores}</Chip>
              <Chip>Vendedores: {stats.vendedores}</Chip>
              <Chip>Licenciados: {stats.licenciados}</Chip>
              <Chip>Parceiros: {stats.parceiros}</Chip>
              <Chip>Pontos de Retirada: {stats.pontos}</Chip>
              <Chip>Lojas Físicas: {stats.lojas}</Chip>
            </div>

            {/* atalhos */}
            <SectionLabel>⚡ Atalhos</SectionLabel>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Shortcut onClick={() => navigate(ROUTES.pdv)} icon={ShoppingCart} title="PDV · Tirar pedido" desc="Venda no balcão e baixe estoque." highlight />
              <Shortcut onClick={() => setTab('cadastrar')} icon={Link2} title="Cadastrar & Vender" desc="Links pra montar sua rede." />
              <Shortcut onClick={() => navigate(ROUTES.pedidos)} icon={Truck} title="Pedidos & Envio" desc="Despache e acompanhe entregas." />
              <Shortcut onClick={() => navigate(createPageUrl('CatalogManagement'))} icon={Store} title="Editar loja / Importar" desc="Vitrine, banners e planilha." />
            </div>

            {['admin', 'super_admin'].includes(user.role) && (
              <button onClick={() => navigate('/Metas')} className="mt-4 w-full text-left rounded-xl p-4 border border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/15 transition-colors flex items-center gap-3">
                <Target className="w-6 h-6 text-yellow-300 flex-shrink-0" />
                <div className="flex-1"><div className="font-bold text-yellow-200">Definir Metas (CEO)</div><div className="text-sm text-gray-400">Busque um login e defina a meta da categoria.</div></div>
                <ArrowRight className="w-4 h-4 text-yellow-300" />
              </button>
            )}
          </div>
        )}

        {/* ───────────────────── CADASTRAR & VENDER ───────────────────── */}
        {tab === 'cadastrar' && (
          <div>
            <h1 className="text-2xl font-black mb-1">Cadastrar & Vender</h1>
            <p className="text-gray-400 text-sm mb-6">Compartilhe os links abaixo. Quem entrar por eles fica na <strong>sua rede</strong>. Nos cargos pagos você ganha <strong className="text-yellow-400">20% da adesão</strong> (venda direta).</p>
            <div className="grid md:grid-cols-2 gap-4">
              {perms.map((p) => {
                const lvl = levels.find((l) => l.id === p.can_register_level);
                if (!lvl) return null;
                const pago = Number(lvl.adesao_valor) > 0;
                const bonus = pago ? Number(lvl.adesao_valor) * 0.2 : 0;
                return (
                  <div key={p.can_register_level} className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-bold">{CARGO_LABEL[p.can_register_level]}</div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${pago ? 'bg-yellow-500/15 text-yellow-300' : 'bg-green-500/15 text-green-300'}`}>{pago ? money(lvl.adesao_valor) : 'Grátis'}</span>
                    </div>
                    {pago && <div className="text-[11px] text-gray-400 mb-2">Você ganha <strong className="text-yellow-400">{money(bonus)}</strong> (20%) ao vender este cargo.</div>}
                    <div className="flex gap-2 mb-2">
                      <input readOnly value={linkFor(p.can_register_level)} className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-[11px] text-gray-400 truncate" />
                      <button onClick={() => copy(p.can_register_level)} className="px-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm font-semibold flex items-center gap-1" title="Copiar link">
                        {copied === p.can_register_level ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <button onClick={() => sendWhats(p.can_register_level)} className="w-full py-2 rounded-lg bg-green-600 hover:bg-green-700 text-sm font-semibold flex items-center justify-center gap-2">
                      <Send className="w-4 h-4" /> Enviar pelo WhatsApp
                    </button>
                  </div>
                );
              })}
            </div>
            {perms.length === 0 && <p className="text-gray-400 text-sm">Nenhuma categoria habilitada pra cadastrar.</p>}
          </div>
        )}

        {/* ───────────────────── MINHA REDE ───────────────────── */}
        {tab === 'rede' && (
          <div>
            <h1 className="text-2xl font-black mb-1">Minha Rede</h1>
            <p className="text-gray-400 text-sm mb-6">{stats.rede_total} pessoa(s) cadastrada(s) abaixo de você.</p>
            <div className="flex flex-wrap gap-2 mb-6 text-xs">
              <span className="bg-purple-500/15 text-purple-300 rounded-full px-3 py-1">Vendedores: <b>{stats.vendedores}</b></span>
              <span className="bg-pink-500/15 text-pink-300 rounded-full px-3 py-1">Influenciadores: <b>{stats.influenciadores}</b></span>
              <span className="bg-blue-500/15 text-blue-300 rounded-full px-3 py-1">Licenciados: <b>{stats.licenciados}</b></span>
              <span className="bg-yellow-500/15 text-yellow-300 rounded-full px-3 py-1">Parceiros: <b>{stats.parceiros}</b></span>
            </div>
            {downline.length === 0 ? (
              <div className="bg-gray-800/40 border border-dashed border-gray-700 rounded-xl p-8 text-center text-gray-400">
                Sua rede está vazia. Use <button onClick={() => setTab('cadastrar')} className="text-green-400 underline">Cadastrar & Vender</button> pra começar.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-800">
                <table className="w-full text-sm">
                  <thead className="bg-gray-950 text-gray-400 text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-3">Nome</th>
                      <th className="text-left px-4 py-3">Cargo</th>
                      <th className="text-left px-4 py-3 hidden md:table-cell">E-mail</th>
                      <th className="text-left px-4 py-3 hidden md:table-cell">Entrou em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {downline.map((p) => (
                      <tr key={p.id} className="border-t border-gray-800 hover:bg-gray-800/40">
                        <td className="px-4 py-3 font-medium">{p.full_name || '—'}</td>
                        <td className="px-4 py-3"><span className="text-xs bg-gray-700 rounded-full px-2 py-0.5">{CARGO_LABEL[p.primary_career_level] || p.primary_career_level}</span></td>
                        <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{p.email || '—'}</td>
                        <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{(p.created_at || p.created_date) ? new Date(p.created_at || p.created_date).toLocaleDateString('pt-BR') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ───────────────────── EMPRESA / PERFIL ───────────────────── */}
        {tab === 'empresa' && (
          <div className="max-w-2xl">
            <h1 className="text-2xl font-black mb-1">Empresa / Perfil</h1>
            <p className="text-gray-400 text-sm mb-6">Dados cadastrais da sua conta.</p>

            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5 mb-4">
              <div className="text-lg font-bold mb-1">{user.full_name}</div>
              <div className="inline-block text-xs bg-green-500/15 text-green-300 rounded-full px-3 py-1 mb-4">{cargoNome}</div>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Field icon={Mail} label="E-mail" value={user.email} />
                <Field icon={Phone} label="Telefone" value={user.phone} />
                <Field icon={Hash} label={onlyDigits(user.cpf).length > 11 ? 'CNPJ' : 'CPF/CNPJ'} value={user.cpf} />
                <Field icon={Hash} label="Código de indicação" value={user.referral_code} mono />
              </div>
            </div>

            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5 mb-4">
              <div className="flex items-center gap-2 text-gray-300 font-semibold mb-3"><MapPin className="w-4 h-4" /> Endereço (origem de frete)</div>
              <div className="text-sm text-gray-300 leading-relaxed">
                {user.address_street ? (
                  <>
                    {user.address_street}{user.address_number ? `, ${user.address_number}` : ''}{user.address_complement ? ` — ${user.address_complement}` : ''}<br />
                    {[user.address_neighborhood, user.address_city, user.address_state].filter(Boolean).join(' · ')}<br />
                    {user.address_zip_code ? `CEP ${user.address_zip_code}` : ''}
                  </>
                ) : <span className="text-gray-500">Endereço não cadastrado.</span>}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button onClick={() => navigate(createPageUrl('Carteira'))} className="px-4 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm font-semibold flex items-center gap-2"><Wallet className="w-4 h-4" /> Carteira & KYC</button>
              {isLoja
                ? <button onClick={() => navigate('/painel/estoque')} className="px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-sm font-semibold flex items-center gap-2"><Package className="w-4 h-4" /> Meu Estoque</button>
                : <button onClick={() => navigate(createPageUrl('CatalogManagement'))} className="px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-sm font-semibold flex items-center gap-2"><Store className="w-4 h-4" /> Editar loja</button>}
            </div>

            {/* Trocar senha */}
            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-5 mt-4 max-w-md">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><KeyRound className="w-4 h-4 text-green-400" /> Trocar senha</h3>
              <div className="space-y-2.5">
                <input type="password" value={pwForm.atual} onChange={(e) => setPwForm({ ...pwForm, atual: e.target.value })} placeholder="Senha atual" className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500" />
                <input type="password" value={pwForm.nova} onChange={(e) => setPwForm({ ...pwForm, nova: e.target.value })} placeholder="Nova senha (mín. 6)" className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500" />
                <input type="password" value={pwForm.conf} onChange={(e) => setPwForm({ ...pwForm, conf: e.target.value })} placeholder="Confirmar nova senha" className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500" />
                <button onClick={trocarSenha} disabled={busy === 'senha'} className="w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-700 font-semibold flex items-center justify-center gap-2">{busy === 'senha' ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />} Alterar senha</button>
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────── MARKETING & CLIQUES ───────────────────── */}
        {tab === 'marketing' && (
          <div>
            <h1 className="text-2xl font-black mb-1">Marketing & Cliques</h1>
            <p className="text-gray-400 text-sm mb-6">Cliques na sua loja e desempenho dos seus anúncios.</p>
            {marketing === null ? (
              <div className="flex items-center gap-2 text-gray-400 py-10"><Loader2 className="w-5 h-5 animate-spin" /> Carregando…</div>
            ) : (
              <>
                <SectionLabel>🖱️ Cliques na loja</SectionLabel>
                <div className="grid grid-cols-3 gap-4 mb-8 max-w-2xl">
                  <Stat icon={MousePointerClick} label="Hoje" value={Number(marketing.cliques_hoje || 0).toLocaleString('pt-BR')} sub="visitas" color="text-blue-400" />
                  <Stat icon={MousePointerClick} label="7 dias" value={Number(marketing.cliques_7d || 0).toLocaleString('pt-BR')} sub="visitas" color="text-white" />
                  <Stat icon={MousePointerClick} label="Total" value={Number(marketing.cliques_total || 0).toLocaleString('pt-BR')} sub="visitas" color="text-white" />
                </div>

                <SectionLabel>📣 Anúncios (Ads)</SectionLabel>
                {marketing.tem_ads ? (
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <Stat icon={Megaphone} label="Impressões" value={Number(marketing.ads_impressoes || 0).toLocaleString('pt-BR')} color="text-white" />
                    <Stat icon={MousePointerClick} label="Cliques" value={Number(marketing.ads_cliques || 0).toLocaleString('pt-BR')} color="text-blue-400" />
                    <Stat icon={DollarSign} label="Gasto" value={money(marketing.ads_gasto || 0)} color="text-red-400" />
                    <Stat icon={ShoppingCart} label="Conversões" value={Number(marketing.ads_conversoes || 0).toLocaleString('pt-BR')} color="text-green-400" />
                    <Stat icon={TrendingUp} label="ROAS" value={`${(marketing.ads_gasto > 0 ? (Number(marketing.ads_receita) / Number(marketing.ads_gasto)) : 0).toFixed(2)}x`} sub={money(marketing.ads_receita || 0)} color="text-yellow-400" />
                  </div>
                ) : (
                  <div className="bg-gray-800/40 border border-dashed border-gray-700 rounded-xl p-8 text-center">
                    <Megaphone className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                    <p className="text-gray-300 font-semibold mb-1">Conecte suas campanhas</p>
                    <p className="text-sm text-gray-500">Meta Ads, Google Ads e TikTok aparecem aqui com impressões, cliques, gasto, conversões e ROAS. Em breve.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ───────────────────── VENDAS / HISTÓRICO ───────────────────── */}
        {tab === 'vendas' && (
          <div>
            <h1 className="text-2xl font-black mb-1">Vendas / Histórico</h1>
            <p className="text-gray-400 text-sm mb-4">Todos os registros de venda do Distribuidor 01 — histórico, PDV e loja online.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6 max-w-2xl">
              <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
                <div className="text-xs text-gray-400 mb-1">Vendas registradas</div>
                <div className="text-2xl font-black text-white">{vendasResumo.total_vendas}</div>
              </div>
              <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
                <div className="text-xs text-gray-400 mb-1">Valor registrado</div>
                <div className="text-2xl font-black text-green-400">{money(vendasResumo.total_valor)}</div>
              </div>
              <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
                <div className="text-xs text-gray-400 mb-1">Faturado (estoque)</div>
                <div className="text-2xl font-black text-emerald-400">{money(stats.faturado)}</div>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 mb-4">ℹ️ As {Number(stats.vendidos_qtd).toLocaleString('pt-BR')} unidades vendidas históricas vieram agregadas na migração; abaixo estão os registros detalhados que existem + cada nova venda do PDV/loja.</p>

            {vendas === null ? (
              <div className="flex items-center gap-2 text-gray-400 py-10"><Loader2 className="w-5 h-5 animate-spin" /> Carregando vendas…</div>
            ) : vendas.length === 0 ? (
              <div className="bg-gray-800/40 border border-dashed border-gray-700 rounded-xl p-8 text-center text-gray-400">Nenhuma venda registrada ainda.</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-800">
                <table className="w-full text-sm">
                  <thead className="bg-gray-950 text-gray-400 text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-3">Origem</th>
                      <th className="text-left px-4 py-3">Produto</th>
                      <th className="text-left px-4 py-3 hidden md:table-cell">Vendedor</th>
                      <th className="text-right px-4 py-3">Valor</th>
                      <th className="text-left px-4 py-3 hidden sm:table-cell">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendas.map((v, i) => (
                      <tr key={v.sale_id || i} className="border-t border-gray-800 hover:bg-gray-800/40">
                        <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v.origem === 'PDV' ? 'bg-green-500/15 text-green-300' : v.origem === 'Online' ? 'bg-blue-500/15 text-blue-300' : 'bg-gray-700 text-gray-300'}`}>{v.origem}</span></td>
                        <td className="px-4 py-3 max-w-[280px] truncate">{v.produto || <span className="text-gray-600">—</span>}</td>
                        <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{(v.vendedor || '').trim() || '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-green-400">{v.valor != null ? money(v.valor) : '—'}</td>
                        <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{v.data ? new Date(v.data).toLocaleDateString('pt-BR') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ───────────────────── FUNCIONÁRIOS (PDV) ───────────────────── */}
        {tab === 'funcionarios' && (
          <div className="max-w-4xl">
            <h1 className="text-2xl font-black mb-1">Funcionários (PDV)</h1>
            <p className="text-gray-400 text-sm mb-6">Crie logins de balcão. Cada funcionário entra direto no PDV e cada pedido fica registrado com quem tirou.</p>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 h-fit">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><UserPlus className="w-4 h-4 text-green-400" /> Novo funcionário</h3>
                <div className="space-y-2.5">
                  <input value={empForm.full_name} onChange={(e) => setEmpForm({ ...empForm, full_name: e.target.value })} placeholder="Nome do funcionário" className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500" />
                  <input value={empForm.email} onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })} placeholder="E-mail (login)" className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500" />
                  <input value={empForm.password} onChange={(e) => setEmpForm({ ...empForm, password: e.target.value })} placeholder="Senha (mín. 6)" className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500" />
                  <button onClick={addEmployee} disabled={busy === 'add-emp'} className="w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-700 font-semibold flex items-center justify-center gap-2">{busy === 'add-emp' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Criar login</button>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2"><UserCog className="w-4 h-4 text-green-400" /> Funcionários ({employees.length})</h3>
                {employees.length === 0 ? (
                  <div className="bg-gray-800/40 border border-dashed border-gray-700 rounded-xl p-6 text-center text-gray-400 text-sm">Nenhum funcionário cadastrado.</div>
                ) : (
                  <div className="space-y-2">
                    {employees.map((e) => (
                      <div key={e.id} className="bg-gray-800/60 border border-gray-700 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-9 h-9 rounded-lg bg-green-500/15 flex items-center justify-center flex-shrink-0"><UserCog className="w-4 h-4 text-green-400" /></span>
                          <div className="min-w-0"><div className="font-semibold text-sm truncate">{e.full_name}</div><div className="text-[11px] text-gray-400 truncate">{e.email}{e.active === false ? ' · inativo' : ''}</div></div>
                        </div>
                        <button onClick={() => removeEmployee(e.id)} disabled={busy === e.id} className="text-gray-500 hover:text-red-400 p-1.5"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────── FORNECEDORES ───────────────────── */}
        {tab === 'fornecedores' && (
          <div className="max-w-4xl">
            <h1 className="text-2xl font-black mb-1">Fornecedores</h1>
            <p className="text-gray-400 text-sm mb-6">Cadastre seus fornecedores e mantenha os contatos organizados.</p>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 h-fit">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><Plus className="w-4 h-4 text-green-400" /> Novo fornecedor</h3>
                <div className="space-y-2.5">
                  <input value={supForm.nome} onChange={(e) => setSupForm({ ...supForm, nome: e.target.value })} placeholder="Nome / Razão social *" className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500" />
                  <div className="grid grid-cols-2 gap-2">
                    <input value={supForm.cnpj} onChange={(e) => setSupForm({ ...supForm, cnpj: e.target.value })} placeholder="CNPJ" className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500" />
                    <input value={supForm.categoria} onChange={(e) => setSupForm({ ...supForm, categoria: e.target.value })} placeholder="Categoria" className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={supForm.contato} onChange={(e) => setSupForm({ ...supForm, contato: e.target.value })} placeholder="Contato" className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500" />
                    <input value={supForm.telefone} onChange={(e) => setSupForm({ ...supForm, telefone: e.target.value })} placeholder="Telefone" className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500" />
                  </div>
                  <input value={supForm.email} onChange={(e) => setSupForm({ ...supForm, email: e.target.value })} placeholder="E-mail" className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500" />
                  <input value={supForm.observacao} onChange={(e) => setSupForm({ ...supForm, observacao: e.target.value })} placeholder="Observação" className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-green-500" />
                  <button onClick={addSupplier} disabled={busy === 'add-sup'} className="w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-700 font-semibold flex items-center justify-center gap-2">{busy === 'add-sup' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Adicionar</button>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2"><Factory className="w-4 h-4 text-green-400" /> Cadastrados ({suppliers.length})</h3>
                {suppliers.length === 0 ? (
                  <div className="bg-gray-800/40 border border-dashed border-gray-700 rounded-xl p-6 text-center text-gray-400 text-sm">Nenhum fornecedor cadastrado.</div>
                ) : (
                  <div className="space-y-2">
                    {suppliers.map((s) => (
                      <div key={s.id} className="bg-gray-800/60 border border-gray-700 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-9 h-9 rounded-lg bg-green-500/15 flex items-center justify-center flex-shrink-0"><Factory className="w-4 h-4 text-green-400" /></span>
                          <div className="min-w-0">
                            <div className="font-semibold text-sm truncate">{s.nome}</div>
                            <div className="text-[11px] text-gray-400 truncate">{[s.categoria, s.telefone || s.contato, s.cnpj].filter(Boolean).join(' · ') || '—'}</div>
                          </div>
                        </div>
                        <button onClick={() => removeSupplier(s.id)} disabled={busy === s.id} className="text-gray-500 hover:text-red-400 p-1.5"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Field({ icon: Icon, label, value, mono }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-0.5"><Icon className="w-3.5 h-3.5" /> {label}</div>
      <div className={`text-gray-200 ${mono ? 'font-mono tracking-wide' : ''}`}>{value || <span className="text-gray-600">—</span>}</div>
    </div>
  );
}

function SectionLabel({ children }) {
  return <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">{children}</div>;
}

function Stat({ icon: Icon, label, value, sub, color = 'text-white' }) {
  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center gap-2 text-gray-400 text-xs mb-1"><Icon className="w-4 h-4" /> {label}</div>
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function Chip({ children }) {
  return <span className="bg-gray-800 border border-gray-700 rounded-full px-3 py-1 text-white">{children}</span>;
}

function Shortcut({ onClick, icon: Icon, title, desc, highlight }) {
  return (
    <button onClick={onClick} className={`text-left rounded-xl p-5 transition-colors border ${highlight ? 'bg-gradient-to-br from-green-900/40 to-green-800/20 border-green-500/30 hover:border-green-400' : 'bg-gray-800/60 border-gray-700 hover:border-gray-500'}`}>
      <Icon className="w-6 h-6 text-green-400 mb-2" />
      <div className="font-bold">{title}</div>
      <div className="text-sm text-gray-400">{desc}</div>
      <div className="mt-2 text-green-400 text-sm flex items-center gap-1">Abrir <ArrowRight className="w-4 h-4" /></div>
    </button>
  );
}
