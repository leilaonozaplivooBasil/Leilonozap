import React, { useState, useEffect, useCallback, useMemo } from 'react';
import FiltrosVitrine from '@/components/common/FiltrosVitrine';
import { money } from '@/lib/format';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { base44 } from '@/api/base44Client';
import { lerSaldos } from '@/lib/carteiraSaldos';
import { toast } from 'sonner';
import BotaoVoltar from '@/components/common/BotaoVoltar';
import PixPdvModal from '@/components/pdv/PixPdvModal';
import NotaPedido from '@/components/pdv/NotaPedido';
import SeletorLicenca from '@/components/pdv/SeletorLicenca';
import DepositoOperacaoModal from '@/components/wallet/DepositoOperacaoModal';
import PixReposicaoModal from '@/components/reposicao/PixReposicaoModal';
import {
  ArrowLeft, Search, Plus, Minus, Trash2, ShoppingCart, Loader2, Check,
  Package, User as UserIcon, Phone, CreditCard, Wallet, QrCode, Store, Truck, Banknote
} from 'lucide-react';

const priceOf = (p) => Number(p.price_catalog || p.selling_price_retail || 0);
// aceita "69,80", "69.80", "1.234,56", "6980" → número
const parseBRL = (s) => {
  if (typeof s === 'number') return s;
  let t = String(s ?? '').trim().replace(/[^\d.,]/g, '');
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.'); // vírgula = separador decimal
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
};
const toText = (n) => (Number(n) || 0).toFixed(2).replace('.', ','); // 69.8 → "69,80"
const CARGO_LABEL = {
  distribuidor: 'Distribuidor', loja_fisica: 'Loja Física', ponto_retirada: 'Ponto de Retirada', parceiro: 'Parceiro',
  licenciado: 'Licenciado', licenciado_catalogo: 'Licenciado Catálogo', licenciado_aplicativo: 'Licenciado App',
  vendedor: 'Vendedor', influenciador: 'Influenciador', plano_lider: 'Líder', trainee: 'Trainee', usuario: 'Usuário',
  fundador: 'Fundador', ceo: 'CEO', socio: 'Sócio',
};
const cargoLabel = (c) => CARGO_LABEL[c] || c || '—';

export default function TirarPedido() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [payment, setPayment] = useState('saldo');
  const [saldo, setSaldo] = useState(0); // saldo da carteira do balcão (compra saldo da plataforma)
  const [saldoOperacao, setSaldoOperacao] = useState(0); // dinheiro recebido do cliente e depositado
  const [deposito, setDeposito] = useState(false);
  const [pixDeposito, setPixDeposito] = useState(null);
  const [delivered, setDelivered] = useState(true); // retirada no balcão por padrão
  const [processing, setProcessing] = useState(false);
  const [todayTotal, setTodayTotal] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  // 🏷️ quem está levando (licença) — a pessoa leva o desconto do cargo dela e o restante
  // do teto sobe pela linha DESTE balcão. Opcional: sem seleção, a venda fica na casa.
  const [comprador, setComprador] = useState(null); // { id, full_name, nivel_nome, desconto_pct, estrutura }
  const [pix, setPix] = useState(null); // cobrança PIX aberta { payment_id, pix_code, qr_code_base64, sale_id, snapshot }
  const [nota, setNota] = useState(null); // nota de pedido pra mostrar/enviar no WhatsApp
  const isStore = user && ['loja_fisica', 'ponto_retirada', 'parceiro'].includes(user.primary_career_level);

  useEffect(() => {
    let u = null; try { u = JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { u = null; }
    setUser(u);
    loadToday(u);
  }, []);

  const loadToday = async (u = user) => {
    if (!u?.id) return;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    // pedidos PIX aguardando pagamento e cancelados NÃO contam como venda do dia
    const { data } = await supabase.from('catalog_sales').select('total_amount').eq('source', 'pdv').eq('seller_id', u.id).gte('created_at', start.toISOString()).not('status', 'in', '("pending_payment","canceled","cancelled")');
    const list = data || [];
    setTodayCount(list.length);
    setTodayTotal(list.reduce((s, x) => s + (Number(x.total_amount) || 0), 0));
    // 💳 SALDO QUE PAGA NO BALCÃO = SALDO DE COMISSÃO (regra oficial 08/08/2026).
    // ⚠️ Antes lia saldo_disponivel — que é o crédito de DEPÓSITO/LEILÃO (dar lance e
    // arrematar) e pode estar comprometido em lance vivo. Esse dinheiro NÃO compra na
    // loja física. O único saldo que paga pedido é commission_balance — o mesmo card
    // "Comissões de vendas" da tela Minha Carteira.
    // 💵 além da comissão, o SALDO DE OPERAÇÃO: dinheiro que ele recebeu do cliente
    // na rua e depositou aqui. Os dois pagam pedido; leilão continua de fora.
    // ⚠️ leitura SEPARADA das duas carteiras: pedir os dois campos juntos fazia o
    // banco recusar a consulta inteira (o saldo de operação ainda não existe lá) e
    // a comissão real aparecia como R$ 0,00 no balcão.
    const { comissao, operacao } = await lerSaldos(u.id);
    setSaldo(comissao);
    setSaldoOperacao(operacao);
  };

  // 🏪 A loja aparece INTEIRA por padrão (sem digitar nada), em ordem alfabética.
  // Digitar apenas FILTRA essa mesma vitrine — o balcão nunca fica vazio.
  const doSearch = useCallback(async (q) => {
    const termo = String(q || '').trim();
    setSearching(true);
    try {
      const u = (() => { try { return JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { return null; } })();
      const isStore = u && ['loja_fisica', 'ponto_retirada', 'parceiro'].includes(u.primary_career_level);
      if (isStore) {
        // dono de loja vende do PRÓPRIO estoque (store_inventory)
        const { data } = await supabase.rpc('loja_estoque', { _owner: u.id, q: termo, lim: 5000 });
        setResults((data || [])
          .filter((x) => x.ativo && Number(x.quantidade) > 0)
          .map((x) => ({ id: x.product_id, description: x.descricao, price_catalog: x.preco, quantity: x.quantidade, lot: '', image_urls: x.imagem ? [x.imagem] : [] }))
          .sort((a, b) => String(a.description || '').trim().localeCompare(String(b.description || '').trim(), 'pt-BR', { sensitivity: 'base' })));
      } else {
        // 📦 LOJA INTEIRA: o Supabase entrega no máximo 1.000 linhas por requisição —
        // com +1.500 produtos, uma chamada só cortava a loja. Aqui pagina em blocos
        // de 1.000 até acabar, então ordena A→Z ignorando acento/maiúscula.
        const PAGE = 1000;
        const puxar = async (filtro) => {
          const todos = [];
          for (let from = 0; from < 20000; from += PAGE) {
            let query = supabase
              .from('products')
              // ⚠️ NÃO pedir "category" aqui: essa coluna NÃO existe em products
              // (o nome real no banco é category_id). Pedir um campo inexistente
              // faz o banco recusar a consulta inteira e a vitrine do balcão
              // aparecia VAZIA mesmo com 2.582 produtos em estoque (08/08/2026).
              .select('id,description,price_catalog,selling_price_retail,quantity,lot,image_urls')
              .gt('quantity', 0)
              .order('description', { ascending: true })
              .range(from, from + PAGE - 1);
            if (filtro) query = query.or(filtro);
            const { data, error } = await query;
            if (error) break;
            todos.push(...(data || []));
            if (!data || data.length < PAGE) break;
          }
          return todos;
        };
        // 🔤 Digitou "A" → tem que vir o que COMEÇA com A (nome do produto), não
        // qualquer nome que contenha a letra no meio. Só se não achar nada pelo
        // começo é que cai na busca por dentro do nome / SKU-lote.
        let todos = [];
        if (termo) {
          todos = await puxar(`description.ilike.${termo}%`);
          if (!todos.length) todos = await puxar(`description.ilike.%${termo}%,lot.ilike.%${termo}%`);
        } else {
          todos = await puxar(null);
        }
        setResults(todos.sort((a, b) =>
          String(a.description || '').trim().localeCompare(String(b.description || '').trim(), 'pt-BR', { sensitivity: 'base' })
        ));
      }
    } catch (e) { console.error(e); }
    setSearching(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(term), 350);
    return () => clearTimeout(t);
  }, [term, doSearch]);

  // 🔎 Filtros da vitrine do balcão — só reorganizam o que já está carregado
  const [categoria, setCategoria] = useState('');
  const [ordem, setOrdem] = useState('az');
  const [precoMax, setPrecoMax] = useState('');
  const [comFoto, setComFoto] = useState(false);

  const categorias = useMemo(
    () => [...new Set(results.map((p) => p.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [results]
  );

  const vitrine = useMemo(() => {
    const teto = Number(String(precoMax).replace(',', '.'));
    const lista = results.filter((p) =>
      (!categoria || p.category === categoria) &&
      (!comFoto || !!p.image_urls?.[0]) &&
      (!teto || priceOf(p) <= teto)
    );
    const nome = (p) => String(p.description || '').trim();
    const cmp = {
      az: (a, b) => nome(a).localeCompare(nome(b), 'pt-BR', { sensitivity: 'base' }),
      za: (a, b) => nome(b).localeCompare(nome(a), 'pt-BR', { sensitivity: 'base' }),
      menor: (a, b) => priceOf(a) - priceOf(b),
      maior: (a, b) => priceOf(b) - priceOf(a),
      estoque: (a, b) => (Number(b.quantity) || 0) - (Number(a.quantity) || 0),
    }[ordem];
    return cmp ? [...lista].sort(cmp) : lista;
  }, [results, categoria, ordem, precoMax, comFoto]);

  const addToCart = (p) => {
    setCart((prev) => {
      const ex = prev.find((x) => x.id === p.id);
      if (ex) return prev.map((x) => (x.id === p.id ? { ...x, qty: x.qty + 1 } : x));
      return [...prev, { id: p.id, description: p.description, priceText: toText(priceOf(p)), qty: 1, stock: Number(p.quantity) || 0 }];
    });
    // a vitrine PERMANECE na tela (não limpa mais a lista) — dá pra clicar em vários itens seguidos
    setTerm('');
    toast.success('Item adicionado. Pode continuar clicando nos produtos.');
  };
  const setQty = (id, qty) => setCart((prev) => prev.map((x) => (x.id === id ? { ...x, qty: Math.max(1, qty) } : x)));
  // mantém o texto cru (aceita vírgula) — só converte pra número no total/fechamento
  const setPriceText = (id, raw) => setCart((prev) => prev.map((x) => (x.id === id ? { ...x, priceText: String(raw).replace(/[^\d.,]/g, '') } : x)));
  const remove = (id) => setCart((prev) => prev.filter((x) => x.id !== id));

  // 🏪 no balcão NÃO existe desconto: o cliente paga o preço cheio. O percentual da licença
  // de quem compra volta como COMISSÃO no escritório virtual dele (calculado no servidor).
  const total = Math.round(cart.reduce((s, x) => s + parseBRL(x.priceText) * x.qty, 0) * 100) / 100;
  const comissaoPct = Number(comprador?.comissao_pct) || 0;
  const comissaoValor = Math.round(total * comissaoPct) / 100;
  const carteiraAtual = payment === 'operacao' ? saldoOperacao : saldo;
  const saldoInsuficiente = (payment === 'saldo' || payment === 'operacao') && total > carteiraAtual;

  // limpa o balcão pro próximo pedido (chamado após fechar/confirmar)
  const limpar = () => { setCart([]); setCustomer({ name: '', phone: '' }); setComprador(null); loadToday(); };

  const finalize = async () => {
    if (!user?.id) { toast.error('Faça login.'); return; }
    if (!cart.length) { toast.error('Adicione produtos ao pedido.'); return; }
    setProcessing(true);
    // 🧾 retrato do pedido ANTES de limpar — vira a nota e alimenta o modal do PIX
    const snapshot = {
      items: cart.map((x) => ({ description: x.description, qty: x.qty, unit: Math.round(parseBRL(x.priceText) * 100) / 100 })),
      total, customer: { ...customer }, payment, vendedor: comprador?.full_name || null,
      storeName: user.store_name || user.full_name || 'Leilão NoZap',
    };
    try {
      const r = await base44.functions.invoke('createPdvOrder', {
        actorId: user.id,
        items: cart.map((x) => ({ product_id: x.id, quantity: x.qty, price: parseBRL(x.priceText) })),
        customer: { name: customer.name, phone: customer.phone },
        payment_method: payment,
        delivered,
        comprador_id: comprador?.id || null,
      });
      if (!r?.success) { toast.error(r?.error || 'Falha ao finalizar'); setProcessing(false); return; }
      if (r.pix) {
        // 💳 PIX real: o pedido fica AGUARDANDO — QR na tela, confirmação automática
        setPix({ ...r.pix, sale_id: r.sale_id, snapshot: { ...snapshot, total: r.total, saleId: r.sale_id } });
      } else {
        toast.success(`Pedido fechado! ${money(r.total)}${r.comissao ? ` · comissão ${money(r.comissao)}` : ''}`);
        setNota({ ...snapshot, total: r.total, saleId: r.sale_id });
        limpar();
      }
    } catch (e) { toast.error('Erro ao finalizar'); }
    setProcessing(false);
  };

  // pagamento PIX caiu (webhook confirmou) → mostra a nota e libera o balcão
  const pixConfirmado = () => {
    const snap = pix?.snapshot;
    setPix(null);
    toast.success('Pagamento PIX confirmado!');
    if (snap) setNota(snap);
    limpar();
  };
  // cliente desistiu / não pagou → cancela o pedido pendente (o carrinho fica intacto)
  const pixCancelado = async () => {
    const saleId = pix?.sale_id;
    setPix(null);
    if (saleId) { try { await base44.functions.invoke('cancelPdvPix', { sale_id: saleId, actorId: user.id }); } catch (_) {} }
    toast('Cobrança PIX cancelada.');
  };

  if (!user) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-400">Faça login.</div>;

  return (
    /* ☀️ Tema claro institucional (mesmo do Painel de Alavancagem) */
    <div className="min-h-screen bg-white text-nz-tinta nz-painel">
      {/* header */}
      {/* topo gruda logo abaixo da barra do site — 56px no celular, 64px no desktop */}
      <div className="bg-white border-b border-nz-borda px-6 py-4 sticky top-14 sm:top-16 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* ↩️ botão voltar único do sistema (era um botão próprio desta tela) */}
            <BotaoVoltar destino="/painel" tema="claro" />
            <div className="w-9 h-9 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center"><ShoppingCart className="w-5 h-5 text-green-400" /></div>
            <div>
              <h1 className="text-xl font-black leading-none">PDV — Tirar Pedido</h1>
              <p className="text-xs text-gray-500 mt-0.5">Distribuidor 01 · {user.full_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-5 text-right">
            <div>
              <div className="text-[11px] text-gray-500 uppercase">Vendas hoje</div>
              <div className="text-lg font-black text-green-400">{money(todayTotal)} <span className="text-xs text-gray-500">· {todayCount}</span></div>
            </div>
            <div>
              <div className="text-[11px] text-gray-500 uppercase">Saldo de comissão</div>
              <div className={`text-lg font-black ${saldo > 0 ? 'text-nz-verde' : 'text-red-500'}`}>{money(saldo)}</div>
            </div>
            <div>
              <div className="text-[11px] text-gray-500 uppercase">Saldo de operação</div>
              <button onClick={() => setDeposito(true)} className="text-lg font-black text-nz-tinta underline decoration-dotted">{money(saldoOperacao)}</button>
            </div>
          </div>
        </div>
      </div>

      {/* 🖥️ Enquadramento: largura cheia e coluna do Pedido SEMPRE ao lado (não empurra pra baixo).
          A vitrine rola dentro da própria coluna, o painel do pedido fica fixo à direita. */}
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-6 grid lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px] gap-5 items-start">
        {/* busca + vitrine da loja */}
        <div className="min-w-0">
          <div className="relative mb-4">
            <Search className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Filtrar a loja por nome ou SKU/lote…"
              className="w-full bg-white border border-nz-borda rounded-xl pl-11 pr-4 py-3.5 text-nz-tinta outline-none focus:border-green-500"
            />
            {searching && <Loader2 className="w-4 h-4 animate-spin text-gray-500 absolute right-3 top-1/2 -translate-y-1/2" />}
          </div>

          {results.length > 0 && (
            <FiltrosVitrine
              categorias={categorias}
              categoria={categoria} onCategoria={setCategoria}
              ordem={ordem} onOrdem={setOrdem}
              precoMax={precoMax} onPrecoMax={setPrecoMax}
              comFoto={comFoto} onComFoto={setComFoto}
              total={vitrine.length}
            />
          )}

          {vitrine.length > 0 && (
            <div className="space-y-2 mb-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
              <p className="text-[11px] text-nz-tinta-fraca sticky top-0 bg-white py-1">{vitrine.length} produtos {term ? 'encontrados' : 'na loja'} · clique para adicionar</p>
              {vitrine.map((p) => (
                <button key={p.id} onClick={() => addToCart(p)} className="w-full flex items-center gap-3 bg-white hover:bg-nz-cinza-fundo border border-nz-borda rounded-xl p-3 text-left transition-colors">
                  <span className="w-10 h-10 rounded-lg bg-nz-cinza-fundo flex items-center justify-center overflow-hidden flex-shrink-0">
                    {p.image_urls?.[0] ? <img src={p.image_urls[0]} alt="" className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-gray-400" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.description}</div>
                    <div className="text-[11px] text-gray-500">{p.lot || ''} · estoque {Number(p.quantity) || 0}</div>
                  </div>
                  <div className="text-sm font-bold text-green-400">{money(priceOf(p))}</div>
                  <Plus className="w-4 h-4 text-green-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
          {!searching && vitrine.length === 0 && (
            <div className="bg-nz-cinza-fundo border border-dashed border-nz-borda rounded-xl p-10 text-center text-nz-tinta-fraca">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              {term ? 'Nenhum produto encontrado com esse filtro.' : 'Nenhum produto disponível no estoque.'}
            </div>
          )}
        </div>

        {/* carrinho / fechamento */}
        <div className="bg-white border border-nz-borda rounded-2xl p-4 h-fit lg:sticky lg:top-28 shadow-sm lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto">
          <h2 className="font-bold mb-3 flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-green-400" /> Pedido ({cart.length})</h2>

          {cart.length === 0 ? (
            <p className="text-gray-500 text-sm py-6 text-center">Carrinho vazio.</p>
          ) : (
            <div className="space-y-2 mb-4 max-h-[40vh] overflow-y-auto">
              {cart.map((x) => (
                <div key={x.id} className="bg-nz-cinza-fundo border border-nz-borda rounded-lg p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium flex-1 min-w-0 truncate">{x.description}</div>
                    <button onClick={() => remove(x.id)} className="text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setQty(x.id, x.qty - 1)} className="w-9 h-9 rounded bg-white border border-nz-borda hover:bg-nz-cinza-fundo flex items-center justify-center"><Minus className="w-3.5 h-3.5" /></button>
                      <span className="w-8 text-center text-sm font-bold">{x.qty}</span>
                      <button onClick={() => setQty(x.id, x.qty + 1)} className="w-9 h-9 rounded bg-white border border-nz-borda hover:bg-nz-cinza-fundo flex items-center justify-center"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <span className="text-gray-500 text-xs">R$</span>
                      <input
                        inputMode="decimal"
                        value={x.priceText}
                        onChange={(e) => setPriceText(x.id, e.target.value)}
                        onBlur={(e) => setPriceText(x.id, toText(parseBRL(e.target.value)))}
                        placeholder="0,00"
                        className="w-24 bg-white border border-nz-borda rounded px-2 py-1 text-right text-sm outline-none focus:border-green-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* escritório da comissão: quem compra recebe o % da própria licença e o balcão
              fica com o restante do teto — sem desconto no preço */}
          {!isStore && (
            <SeletorLicenca
              ownerId={user.id}
              comprador={comprador}
              onSelect={setComprador}
              onClear={() => setComprador(null)}
            />
          )}

          {/* cliente */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2 bg-white border border-nz-borda rounded-lg px-3">
              <UserIcon className="w-4 h-4 text-gray-500" />
              <input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Cliente (opcional)" className="flex-1 bg-transparent py-2.5 text-sm outline-none" />
            </div>
            <div className="flex items-center gap-2 bg-white border border-nz-borda rounded-lg px-3">
              <Phone className="w-4 h-4 text-gray-500" />
              <input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="WhatsApp (opcional)" className="flex-1 bg-transparent py-2.5 text-sm outline-none" />
            </div>
          </div>

          {/* pagamento */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {[['saldo', 'Comissão', Wallet], ['operacao', 'Operação', Banknote], ['pix', 'PIX', QrCode], ['cartao', 'Cartão', CreditCard]].map(([k, label, Icon]) => (
              <button key={k} onClick={() => setPayment(k)} className={`min-h-[44px] py-2.5 rounded-lg border-2 text-xs font-semibold flex flex-col items-center gap-1 ${payment === k ? 'border-green-500 bg-green-500/10 text-green-700' : 'border-nz-borda text-nz-tinta-fraca'}`}>
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>

          {/* entrega */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button onClick={() => setDelivered(true)} className={`min-h-[44px] py-2.5 rounded-lg border-2 text-xs font-semibold flex items-center justify-center gap-1.5 ${delivered ? 'border-green-500 bg-green-500/10 text-green-700' : 'border-nz-borda text-nz-tinta-fraca'}`}><Store className="w-4 h-4" /> Retirada no balcão</button>
            <button onClick={() => setDelivered(false)} className={`min-h-[44px] py-2.5 rounded-lg border-2 text-xs font-semibold flex items-center justify-center gap-1.5 ${!delivered ? 'border-green-500 bg-green-500/10 text-green-700' : 'border-nz-borda text-nz-tinta-fraca'}`}><Truck className="w-4 h-4" /> Entregar depois</button>
          </div>

          {comissaoPct > 0 && (
            <div className="mb-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs">
              <div className="flex items-center justify-between font-bold text-green-700">
                <span>{comprador?.nivel_nome} · {comissaoPct}% de comissão</span><span>{money(comissaoValor)}</span>
              </div>
              <p className="text-[10px] text-nz-tinta-fraca mt-0.5">Sem desconto no preço — esse valor cai no escritório virtual dele.</p>
            </div>
          )}
          {saldoInsuficiente && (
            <div className="mb-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-700 font-semibold">
              Saldo insuficiente ({money(carteiraAtual)}). Faltam {money(total - carteiraAtual)}.
              <button onClick={() => setDeposito(true)} className="ml-1 underline">Depositar saldo</button>
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400">Total</span>
            <span className="text-2xl font-black text-green-400">{money(total)}</span>
          </div>

          <button onClick={finalize} disabled={processing || !cart.length || saldoInsuficiente} className="w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 font-black flex items-center justify-center gap-2">
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Fechar pedido
          </button>
        </div>
      </div>

      {/* 💳 PIX real no balcão — QR + confirmação automática */}
      {pix && <PixPdvModal pix={pix} total={pix.snapshot?.total || total} onConfirmed={pixConfirmado} onCancel={pixCancelado} />}
      {/* 🧾 nota de pedido — envio em tempo real no WhatsApp do cliente */}
      {nota && <NotaPedido nota={nota} onClose={() => setNota(null)} />}

      {/* 💵 depósito do saldo de operação (dinheiro que ele recebeu do cliente) */}
      {deposito && (
        <DepositoOperacaoModal
          userId={user.id}
          onFechar={() => setDeposito(false)}
          onPix={({ pix: p, total: t }) => { setDeposito(false); setPixDeposito({ pix: p, total: t }); }}
        />
      )}
      {pixDeposito && (
        <PixReposicaoModal
          pix={pixDeposito.pix}
          total={pixDeposito.total}
          mensagem="Assim que o pagamento cair, o saldo entra na sua conta automaticamente."
          onConfirmado={() => { setPixDeposito(null); toast.success('Depósito confirmado! O saldo já está na sua conta.'); loadToday(); }}
          onFechar={() => setPixDeposito(null)}
        />
      )}
    </div>
  );
}