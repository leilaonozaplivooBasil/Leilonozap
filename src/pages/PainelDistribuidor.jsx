import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import {
  LayoutDashboard, Package, Store, Link2, Network, Truck, Wallet, Building2,
  Loader2, Copy, Check, ExternalLink, TrendingUp, Users, DollarSign, ShoppingCart,
  ArrowRight, MousePointerClick, UserPlus, Megaphone, Briefcase, Send, MapPin, Hash, Mail, Phone,
  UserCog, Factory, Plus, Trash2, KeyRound
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
  const [busy, setBusy] = useState('');
  const [stats, setStats] = useState({
    gmv: 0, vendas: 0, comissao: 0, saldo: 0, cliques: 0,
    rede: 0, vendedores: 0, influenciadores: 0, parceiros: 0, licenciados: 0, pontos: 0, lojas: 0,
  });

  useEffect(() => {
    let u = null; try { u = JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { u = null; }
    // 🧑‍💼 funcionário de PDV não vê o painel do distribuidor — vai direto pro PDV
    if (u && u.is_pdv_operator === true) { navigate('/painel/pdv'); return; }
    setUser(u);
    if (!u?.id) { setLoading(false); return; }
    (async () => {
      try {
        const [allUsers, vendas, wallet, lv, rp, cliques] = await Promise.all([
          supabase.from('app_users').select('id,full_name,email,phone,referred_by_id,primary_career_level,created_date,created_at'),
          supabase.from('catalog_sales').select('total_amount').eq('seller_id', u.id).eq('status', 'paid'),
          base44.functions.invoke('getMyWallet', { user_id: u.id }),
          supabase.from('career_levels').select('id,nome,adesao_valor,ordem').eq('bloco', 'rede').order('ordem'),
          supabase.from('register_permissions').select('can_register_level,bonus_adesao_pct').eq('actor_level', u.primary_career_level),
          supabase.from('catalog_visits').select('id', { count: 'exact', head: true }).eq('referral_code', u.referral_code || '___'),
        ]);

        // monta a árvore (BFS) a partir do distribuidor → toda a rede descendente
        const rows = allUsers.data || [];
        const childrenOf = {};
        rows.forEach((r) => { (childrenOf[r.referred_by_id] ||= []).push(r); });
        const tree = [];
        const queue = [...(childrenOf[u.id] || [])];
        while (queue.length) {
          const node = queue.shift();
          tree.push(node);
          (childrenOf[node.id] || []).forEach((c) => queue.push(c));
        }
        const countBy = (cargo) => tree.filter((x) => x.primary_career_level === cargo).length;

        const vlist = vendas.data || [];
        setDownline(tree.sort((a, b) => new Date(b.created_at || b.created_date || 0) - new Date(a.created_at || a.created_date || 0)));
        setLevels(lv.data || []);
        setPerms(rp.data || []);
        setStats({
          gmv: vlist.reduce((s, x) => s + (Number(x.total_amount) || 0), 0),
          vendas: vlist.length,
          comissao: wallet?.commission_balance || 0,
          saldo: wallet?.saldo_disponivel || 0,
          cliques: cliques.count || 0,
          rede: tree.length,
          vendedores: countBy('vendedor'),
          influenciadores: countBy('influenciador'),
          parceiros: countBy('parceiro'),
          licenciados: countBy('licenciado'),
          pontos: countBy('ponto_retirada'),
          lojas: countBy('loja_fisica'),
        });
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

  const MENU = [
    { id: 'visao', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'cadastrar', label: 'Cadastrar & Vender', icon: Link2, star: true },
    { id: 'rede', label: 'Minha Rede', icon: Network },
    { id: 'pdv', label: 'PDV · Tirar Pedido', icon: ShoppingCart, route: ROUTES.pdv, star: true },
    { id: 'funcionarios', label: 'Funcionários (PDV)', icon: UserCog },
    { id: 'produtos', label: 'Produtos & Estoque', icon: Package, ext: true },
    { id: 'fornecedores', label: 'Fornecedores', icon: Factory },
    { id: 'loja', label: 'Editar Loja Virtual', icon: Store, ext: true },
    { id: 'pedidos', label: 'Pedidos & Envio', icon: Truck, route: ROUTES.pedidos },
    { id: 'financeiro', label: 'Financeiro & Comissões', icon: Wallet, ext: true },
    { id: 'empresa', label: 'Empresa / Perfil', icon: Building2 },
  ];
  const onMenu = (m) => { if (m.route) navigate(m.route); else if (m.ext) navigate(createPageUrl(EXTERNAL[m.id])); else setTab(m.id); };

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
        {/* ───────────────────── VISÃO GERAL ───────────────────── */}
        {tab === 'visao' && (
          <div>
            <h1 className="text-2xl font-black mb-1">Visão Geral</h1>
            <p className="text-gray-400 text-sm mb-6">Resumo completo da sua operação.</p>

            {/* Métricas financeiras */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {[
                [<DollarSign key="1" className="w-4 h-4" />, 'Faturamento (loja)', money(stats.gmv), 'text-green-400'],
                [<ShoppingCart key="2" className="w-4 h-4" />, 'Vendas pagas', stats.vendas, 'text-white'],
                [<TrendingUp key="3" className="w-4 h-4" />, 'Comissões', money(stats.comissao), 'text-yellow-400'],
                [<Wallet key="4" className="w-4 h-4" />, 'Saldo disponível', money(stats.saldo), 'text-emerald-400'],
              ].map((c, i) => (
                <div key={i} className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">{c[0]} {c[1]}</div>
                  <div className={`text-2xl font-black ${c[3]}`}>{c[2]}</div>
                </div>
              ))}
            </div>

            {/* Métricas de rede */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                [<MousePointerClick key="1" className="w-4 h-4" />, 'Cliques na loja', stats.cliques, 'text-blue-400'],
                [<Users key="2" className="w-4 h-4" />, 'Rede total', stats.rede, 'text-white'],
                [<Megaphone key="3" className="w-4 h-4" />, 'Influenciadores', stats.influenciadores, 'text-pink-400'],
                [<UserPlus key="4" className="w-4 h-4" />, 'Vendedores', stats.vendedores, 'text-purple-400'],
              ].map((c, i) => (
                <div key={i} className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">{c[0]} {c[1]}</div>
                  <div className={`text-2xl font-black ${c[3]}`}>{c[2]}</div>
                </div>
              ))}
            </div>

            {/* breakdown cargos pagos */}
            <div className="flex flex-wrap gap-2 mb-8 text-xs">
              <span className="bg-gray-800 border border-gray-700 rounded-full px-3 py-1">Licenciados: <b className="text-white">{stats.licenciados}</b></span>
              <span className="bg-gray-800 border border-gray-700 rounded-full px-3 py-1">Parceiros: <b className="text-white">{stats.parceiros}</b></span>
              <span className="bg-gray-800 border border-gray-700 rounded-full px-3 py-1">Pontos de Retirada: <b className="text-white">{stats.pontos}</b></span>
              <span className="bg-gray-800 border border-gray-700 rounded-full px-3 py-1">Lojas Físicas: <b className="text-white">{stats.lojas}</b></span>
            </div>

            {/* atalhos */}
            <div className="grid md:grid-cols-3 gap-4">
              <button onClick={() => setTab('cadastrar')} className="text-left bg-gradient-to-br from-green-900/40 to-green-800/20 border border-green-500/30 rounded-xl p-5 hover:border-green-400 transition-colors">
                <Link2 className="w-6 h-6 text-green-400 mb-2" />
                <div className="font-bold">Cadastrar & Vender</div>
                <div className="text-sm text-gray-400">Gere e envie links pra montar sua rede.</div>
                <div className="mt-2 text-green-400 text-sm flex items-center gap-1">Abrir <ArrowRight className="w-4 h-4" /></div>
              </button>
              <button onClick={() => navigate(createPageUrl('ProductManagement'))} className="text-left bg-gray-800/60 border border-gray-700 rounded-xl p-5 hover:border-gray-500 transition-colors">
                <Package className="w-6 h-6 text-green-400 mb-2" />
                <div className="font-bold">Subir produtos</div>
                <div className="text-sm text-gray-400">Gerencie o estoque da sua loja.</div>
                <div className="mt-2 text-green-400 text-sm flex items-center gap-1">Abrir <ArrowRight className="w-4 h-4" /></div>
              </button>
              <button onClick={() => navigate(createPageUrl('CatalogManagement'))} className="text-left bg-gray-800/60 border border-gray-700 rounded-xl p-5 hover:border-gray-500 transition-colors">
                <Store className="w-6 h-6 text-green-400 mb-2" />
                <div className="font-bold">Editar loja</div>
                <div className="text-sm text-gray-400">Banner, nome e vitrine da sua loja.</div>
                <div className="mt-2 text-green-400 text-sm flex items-center gap-1">Abrir <ArrowRight className="w-4 h-4" /></div>
              </button>
            </div>
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
            <p className="text-gray-400 text-sm mb-6">{stats.rede} pessoa(s) cadastrada(s) abaixo de você.</p>
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
              <button onClick={() => navigate(createPageUrl('CatalogManagement'))} className="px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-sm font-semibold flex items-center gap-2"><Store className="w-4 h-4" /> Editar loja</button>
            </div>
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
