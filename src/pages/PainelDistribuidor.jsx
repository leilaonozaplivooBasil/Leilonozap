import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import {
  LayoutDashboard, Package, Store, Link2, Network, Truck, Wallet, Building2,
  Loader2, Copy, Check, ExternalLink, TrendingUp, Users, DollarSign, ShoppingCart, ArrowRight
} from 'lucide-react';

const money = (n) => 'R$ ' + (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ORIGIN = (typeof window !== 'undefined' ? window.location.origin : 'https://leilaonozap.net');
const CARGO_LABEL = { usuario: 'Usuário', influenciador: 'Influenciador', vendedor: 'Vendedor', licenciado: 'Licenciado', parceiro: 'Parceiro', ponto_retirada: 'Ponto de Retirada', loja_fisica: 'Loja Física', distribuidor: 'Distribuidor' };

// itens que abrem páginas externas já existentes
const EXTERNAL = {
  produtos: 'ProductManagement',
  loja: 'CatalogManagement',
  pedidos: 'CatalogOrdersAdmin',
  rede: 'NetworkOverview',
  carteira: 'Carteira',
  perfil: 'Profile',
};

export default function PainelDistribuidor() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('visao');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ rede: 0, vendas: 0, gmv: 0, comissao: 0, saldo: 0 });
  const [levels, setLevels] = useState([]);
  const [perms, setPerms] = useState([]);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    let u = null; try { u = JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { u = null; }
    setUser(u);
    if (!u?.id) { setLoading(false); return; }
    (async () => {
      try {
        const [rede, vendas, wallet, lv, rp] = await Promise.all([
          supabase.from('app_users').select('id', { count: 'exact', head: true }).eq('referred_by_id', u.id),
          supabase.from('catalog_sales').select('total_amount').eq('seller_id', u.id).eq('status', 'paid'),
          base44.functions.invoke('getMyWallet', { user_id: u.id }),
          supabase.from('career_levels').select('id,nome,adesao_valor,ordem').eq('bloco', 'rede').order('ordem'),
          supabase.from('register_permissions').select('can_register_level,bonus_adesao_pct').eq('actor_level', u.primary_career_level),
        ]);
        const vlist = vendas.data || [];
        setStats({
          rede: rede.count || 0,
          vendas: vlist.length,
          gmv: vlist.reduce((s, x) => s + (Number(x.total_amount) || 0), 0),
          comissao: wallet?.commission_balance || 0,
          saldo: wallet?.saldo_disponivel || 0,
        });
        setLevels(lv.data || []);
        setPerms(rp.data || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const linkFor = (cargo) => `${ORIGIN}/?ref=${encodeURIComponent(user?.referral_code || '')}&as=${cargo}`;
  const copy = (cargo) => { navigator.clipboard.writeText(linkFor(cargo)); setCopied(cargo); toast.success('Link copiado!'); setTimeout(() => setCopied(''), 1500); };

  const MENU = [
    { id: 'visao', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'cadastrar', label: 'Cadastrar & Vender', icon: Link2, star: true },
    { id: 'produtos', label: 'Produtos & Estoque', icon: Package, ext: true },
    { id: 'loja', label: 'Minha Loja Virtual', icon: Store, ext: true },
    { id: 'pedidos', label: 'Pedidos', icon: Truck, ext: true },
    { id: 'rede', label: 'Minha Rede', icon: Network, ext: true },
    { id: 'carteira', label: 'Carteira & Comissões', icon: Wallet, ext: true },
    { id: 'perfil', label: 'Empresa / Perfil', icon: Building2, ext: true },
  ];
  const onMenu = (m) => { if (m.ext) navigate(createPageUrl(EXTERNAL[m.id])); else setTab(m.id); };

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando painel…</div>;
  if (!user) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-400">Faça login.</div>;

  const cargoNome = CARGO_LABEL[user.primary_career_level] || user.primary_career_level;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col md:flex-row">
      {/* MENU LATERAL */}
      <aside className="md:w-64 bg-gray-950 border-r border-gray-800 p-4 md:min-h-screen">
        <div className="mb-6 px-2">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Painel do</div>
          <div className="text-lg font-black text-green-400">{cargoNome}</div>
          <div className="text-[11px] text-gray-500 truncate">{user.full_name}</div>
        </div>
        <nav className="space-y-1">
          {MENU.map((m) => {
            const active = !m.ext && tab === m.id;
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
        {tab === 'visao' && (
          <div>
            <h1 className="text-2xl font-black mb-1">Visão Geral</h1>
            <p className="text-gray-400 text-sm mb-6">Resumo da sua operação.</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                [<DollarSign key="1" />, 'Faturamento (loja)', money(stats.gmv), 'text-green-400'],
                [<ShoppingCart key="2" />, 'Vendas pagas', stats.vendas, 'text-white'],
                [<TrendingUp key="3" />, 'Comissões', money(stats.comissao), 'text-yellow-400'],
                [<Users key="4" />, 'Minha rede (diretos)', stats.rede, 'text-blue-400'],
              ].map((c, i) => (
                <div key={i} className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">{c[0]} {c[1]}</div>
                  <div className={`text-2xl font-black ${c[3]}`}>{c[2]}</div>
                </div>
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <button onClick={() => setTab('cadastrar')} className="text-left bg-gradient-to-br from-green-900/40 to-green-800/20 border border-green-500/30 rounded-xl p-5 hover:border-green-400 transition-colors">
                <Link2 className="w-6 h-6 text-green-400 mb-2" />
                <div className="font-bold">Cadastrar & Vender</div>
                <div className="text-sm text-gray-400">Gere links pra cadastrar sua rede e vender licenças/cotas.</div>
                <div className="mt-2 text-green-400 text-sm flex items-center gap-1">Abrir <ArrowRight className="w-4 h-4" /></div>
              </button>
              <button onClick={() => navigate(createPageUrl('ProductManagement'))} className="text-left bg-gray-800/60 border border-gray-700 rounded-xl p-5 hover:border-gray-500 transition-colors">
                <Package className="w-6 h-6 text-green-400 mb-2" />
                <div className="font-bold">Subir produtos</div>
                <div className="text-sm text-gray-400">Adicione e gerencie os produtos do seu estoque.</div>
                <div className="mt-2 text-green-400 text-sm flex items-center gap-1">Abrir <ArrowRight className="w-4 h-4" /></div>
              </button>
            </div>
          </div>
        )}

        {tab === 'cadastrar' && (
          <div>
            <h1 className="text-2xl font-black mb-1">Cadastrar & Vender</h1>
            <p className="text-gray-400 text-sm mb-6">Compartilhe os links abaixo. Quem entrar por eles fica na <strong>sua rede</strong>. Nos cargos pagos, você ganha <strong className="text-yellow-400">20% da adesão</strong>.</p>
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
                    {pago && <div className="text-[11px] text-gray-400 mb-2">Você ganha <strong className="text-yellow-400">{money(bonus)}</strong> (20%) quando vender este cargo.</div>}
                    <div className="flex gap-2">
                      <input readOnly value={linkFor(p.can_register_level)} className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-[11px] text-gray-400 truncate" />
                      <button onClick={() => copy(p.can_register_level)} className="px-3 rounded-lg bg-green-600 hover:bg-green-700 text-sm font-semibold flex items-center gap-1">
                        {copied === p.can_register_level ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {perms.length === 0 && <p className="text-gray-400 text-sm">Nenhuma categoria habilitada pra cadastrar.</p>}
          </div>
        )}
      </main>
    </div>
  );
}
