import React, { useState, useEffect, useCallback, useMemo } from 'react';
import FiltrosVitrine from '@/components/common/FiltrosVitrine';
import { supabase } from '@/api/supabaseClient';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { ShoppingBag, Loader2 } from 'lucide-react';
import VitrineReposicao from '@/components/reposicao/VitrineReposicao';
import ResumoReposicao from '@/components/reposicao/ResumoReposicao';
import PixReposicaoModal from '@/components/reposicao/PixReposicaoModal';

// 🏪 COMPRAR ESTOQUE (reposição) — o lojista compra do estoque central pagando o
// preço de venda menos o percentual da licença dele. Frete por conta dele.
// O preço de venda ao público NUNCA muda: o desconto é só no que ele paga.
// O servidor (createSupplyOrder) refaz toda a conta antes de cobrar.

// Escada da rede, do menor para o maior — espelho da lista do servidor.
const REDE = ['usuario', 'influenciador', 'vendedor', 'licenciado', 'parceiro', 'ponto_retirada', 'loja_fisica', 'distribuidor'];

// 📷 A foto do produto mora em products.image_urls (lista). O card estava caindo
// sempre no ícone de caixa porque procurava campos que não existem nessa tabela.
const imagemDe = (p) => {
  const u = p?.image_urls;
  if (Array.isArray(u)) return u.find((x) => typeof x === 'string' && x.startsWith('http')) || null;
  if (typeof u === 'string' && u.startsWith('http')) return u;
  return null;
};

export default function ComprarEstoque() {
  const [user, setUser] = useState(null);
  const [saldo, setSaldo] = useState(0);
  const [desconto, setDesconto] = useState({ pct: 0, nome: '' });
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [termo, setTermo] = useState('');
  const [itens, setItens] = useState([]);
  const [entrega, setEntrega] = useState('pickup');
  const [cep, setCep] = useState('');
  const [opcoesFrete, setOpcoesFrete] = useState([]);
  const [freteId, setFreteId] = useState(null);
  const [cotando, setCotando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [pix, setPix] = useState(null);
  const [totalPix, setTotalPix] = useState(0);

  // usuário + desconto da licença + saldo de comissão
  useEffect(() => {
    let u = null; try { u = JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { u = null; }
    setUser(u);
    if (!u?.id) return;
    (async () => {
      const { data: lv } = await supabase.from('career_levels').select('id,nome,venda_direta_pct');
      const levels = {}; (lv || []).forEach((l) => { levels[l.id] = l; });
      const cargos = [...(Array.isArray(u.career_levels) ? u.career_levels : []), u.primary_career_level].filter(Boolean);
      let melhor = null, melhorPct = 0;
      cargos.forEach((c) => {
        if (!REDE.includes(c)) return;
        const pct = Number(levels[c]?.venda_direta_pct || 0);
        if (melhor === null || pct > melhorPct) { melhor = c; melhorPct = pct; }
      });
      setDesconto({ pct: melhorPct, nome: levels[melhor]?.nome || '' });
      const { data: me } = await supabase.from('app_users').select('commission_balance').eq('id', u.id).maybeSingle();
      setSaldo(Number(me?.commission_balance) || 0);
    })();
  }, []);

  const carregarProdutos = useCallback(async (q) => {
    setCarregando(true);
    try {
      // 📦 Vitrine completa: traz TODO o estoque central com peça disponível
      // (antes vinham só 60 itens e o lojista não enxergava o resto do estoque).
      // Busca em páginas de 1000 para não bater no teto de linhas do banco.
      const linhas = [];
      for (let pagina = 0; pagina < 12; pagina++) {
        let query = supabase.from('products').select('*').gt('quantity', 0)
          .order('description', { ascending: true })
          .range(pagina * 1000, pagina * 1000 + 999);
        if (q) query = query.ilike('description', `%${q}%`);
        const { data } = await query;
        linhas.push(...(data || []));
        if (!data || data.length < 1000) break;
      }
      setProdutos(linhas.map((p) => ({
        id: p.id,
        descricao: p.description || 'Produto',
        preco: Number(p.price_catalog) > 0 ? Number(p.price_catalog) : Number(p.selling_price_retail) || 0,
        quantidade: Number(p.quantity) || 0,
        categoria: p.category || '',
        imagem: imagemDe(p),
      })).filter((p) => p.preco > 0));
    } catch (e) { console.error(e); }
    setCarregando(false);
  }, []);

  useEffect(() => { const t = setTimeout(() => carregarProdutos(termo), 350); return () => clearTimeout(t); }, [termo, carregarProdutos]);

  // 🔎 Filtros da vitrine (categoria, ordem, teto de preço, só com foto)
  const [categoria, setCategoria] = useState('');
  const [ordem, setOrdem] = useState('az');
  const [precoMax, setPrecoMax] = useState('');
  const [comFoto, setComFoto] = useState(false);

  const categorias = useMemo(
    () => [...new Set(produtos.map((p) => p.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [produtos]
  );

  const produtosFiltrados = useMemo(() => {
    const teto = Number(String(precoMax).replace(',', '.'));
    let lista = produtos.filter((p) =>
      (!categoria || p.categoria === categoria) &&
      (!comFoto || !!p.imagem) &&
      (!teto || p.preco <= teto)
    );
    const nome = (p) => String(p.descricao || '').trim();
    const cmp = {
      az: (a, b) => nome(a).localeCompare(nome(b), 'pt-BR', { sensitivity: 'base' }),
      za: (a, b) => nome(b).localeCompare(nome(a), 'pt-BR', { sensitivity: 'base' }),
      menor: (a, b) => a.preco - b.preco,
      maior: (a, b) => b.preco - a.preco,
      estoque: (a, b) => b.quantidade - a.quantidade,
    }[ordem];
    return cmp ? [...lista].sort(cmp) : lista;
  }, [produtos, categoria, ordem, precoMax, comFoto]);

  const adicionar = (p) => {
    setItens((prev) => {
      const ja = prev.find((i) => i.id === p.id);
      if (ja) return prev.map((i) => (i.id === p.id ? { ...i, qtd: Math.min(i.qtd + 1, p.quantidade) } : i));
      return [...prev, { ...p, qtd: 1 }];
    });
    setOpcoesFrete([]); setFreteId(null);
  };
  const mudarQtd = (item, qtd) => {
    if (qtd <= 0) return setItens((p) => p.filter((i) => i.id !== item.id));
    setItens((p) => p.map((i) => (i.id === item.id ? { ...i, qtd: Math.min(qtd, i.quantidade) } : i)));
    setOpcoesFrete([]); setFreteId(null);
  };
  const remover = (item) => { setItens((p) => p.filter((i) => i.id !== item.id)); setOpcoesFrete([]); setFreteId(null); };

  const cotarFrete = async () => {
    if (String(cep).replace(/\D/g, '').length !== 8) return toast.error('Informe os 8 números do CEP.');
    setCotando(true);
    const r = await base44.functions.invoke('cotarFrete', { cep, items: itens.map((i) => ({ product_id: i.id, quantity: i.qtd })) });
    setCotando(false);
    if (r?.success && Array.isArray(r.opcoes) && r.opcoes.length) { setOpcoesFrete(r.opcoes); setFreteId(r.opcoes[0].id); }
    else { setOpcoesFrete([]); toast.error(r?.error || 'Não conseguimos calcular o frete agora.'); }
  };

  const pagar = async (forma) => {
    if (!itens.length) return;
    setEnviando(true);
    const r = await base44.functions.invoke('createSupplyOrder', {
      actorId: user.id,
      items: itens.map((i) => ({ product_id: i.id, quantity: i.qtd })),
      payment_method: forma,
      delivery_type: entrega,
      cep, frete_id: freteId,
    });
    setEnviando(false);
    if (!r?.success) return toast.error(r?.error || 'Não foi possível fechar o pedido.');

    if (forma === 'saldo') {
      toast.success('Pedido pago! A mercadoria já entrou no seu estoque.');
      setSaldo(Number(r.saldo_restante) || 0);
      setItens([]); setOpcoesFrete([]); setFreteId(null);
      carregarProdutos(termo);
      return;
    }
    if (forma === 'card' && r.url) { window.location.href = r.url; return; }
    if (forma === 'pix' && r.pix) { setPix(r.pix); setTotalPix(Number(r.total) || 0); }
  };

  const pixConfirmado = () => {
    setPix(null); setItens([]); setOpcoesFrete([]); setFreteId(null);
    carregarProdutos(termo);
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center text-gray-500">Faça login.</div>;

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-nz-borda px-4 sm:px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center"><ShoppingBag className="w-5 h-5 text-nz-verde" /></div>
          <div>
            <h1 className="text-xl font-black text-nz-tinta leading-none">Comprar estoque</h1>
            <p className="text-xs text-gray-500 mt-0.5">Compre do estoque central com o desconto da sua licença e receba na sua loja.</p>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-6 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        <VitrineReposicao
          produtos={produtosFiltrados}
          carregando={carregando}
          termo={termo}
          onTermo={setTermo}
          descontoPct={desconto.pct}
          onAdd={adicionar}
          filtros={(
            <FiltrosVitrine
              categorias={categorias}
              categoria={categoria} onCategoria={setCategoria}
              ordem={ordem} onOrdem={setOrdem}
              precoMax={precoMax} onPrecoMax={setPrecoMax}
              comFoto={comFoto} onComFoto={setComFoto}
              total={produtosFiltrados.length}
            />
          )}
        />
        <div className="lg:sticky lg:top-20 lg:self-start">
          <ResumoReposicao
            itens={itens}
            descontoPct={desconto.pct}
            licencaNome={desconto.nome}
            onQtd={mudarQtd}
            onRemover={remover}
            entrega={entrega}
            onEntrega={(v) => { setEntrega(v); setFreteId(null); }}
            cep={cep}
            onCep={setCep}
            opcoesFrete={opcoesFrete}
            freteId={freteId}
            onFreteId={setFreteId}
            cotando={cotando}
            onCotar={cotarFrete}
            saldo={saldo}
            enviando={enviando}
            onPagar={pagar}
          />
        </div>
      </div>

      {enviando && (
        <div className="fixed inset-0 z-[90] bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-xl px-5 py-4 flex items-center gap-2 text-sm font-semibold text-nz-tinta"><Loader2 className="w-4 h-4 animate-spin" /> Fechando seu pedido…</div>
        </div>
      )}

      {pix && <PixReposicaoModal pix={pix} total={totalPix} onConfirmado={pixConfirmado} onFechar={() => setPix(null)} />}
    </div>
  );
}