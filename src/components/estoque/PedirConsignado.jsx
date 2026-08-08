import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/api/supabaseClient';
import { base44 } from '@/api/base44Client';
import { money } from '@/lib/format';
import { toast } from 'sonner';
import { Search, Loader2, Plus, Minus, Package, Handshake, Send } from 'lucide-react';
import ConsignadoCard from '@/components/consignado/ConsignadoCard';

// 🤝 PEDIR CONSIGNADO — o lojista escolhe do estoque central e envia para aprovação.
// Aqui NÃO se paga nada e NADA se move: o pedido nasce pendente e o admin decide.
// O custo real de cada peça é o custo da casa, definido pelo servidor na aprovação.
const imagemDe = (p) => {
  const u = p?.image_urls;
  if (Array.isArray(u)) return u.find((x) => typeof x === 'string' && x.startsWith('http')) || null;
  if (typeof u === 'string' && u.startsWith('http')) return u;
  return null;
};

export default function PedirConsignado({ user }) {
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [termo, setTermo] = useState('');
  const [itens, setItens] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [recarregar, setRecarregar] = useState(0);

  const carregar = useCallback(async (q) => {
    setCarregando(true);
    let query = supabase.from('products').select('*').gt('quantity', 0)
      .order('description', { ascending: true }).limit(200);
    if (q) query = query.ilike('description', `%${q}%`);
    const { data } = await query;
    setProdutos((data || []).map((p) => ({
      id: p.id,
      descricao: p.description || 'Produto',
      preco: Number(p.price_catalog) > 0 ? Number(p.price_catalog) : Number(p.selling_price_retail) || 0,
      quantidade: Number(p.quantity) || 0,
      imagem: imagemDe(p),
    })).filter((p) => p.preco > 0));
    setCarregando(false);
  }, []);

  useEffect(() => { const t = setTimeout(() => carregar(termo), 350); return () => clearTimeout(t); }, [termo, carregar]);

  const add = (p) => setItens((prev) => {
    const ja = prev.find((i) => i.id === p.id);
    if (ja) return prev.map((i) => (i.id === p.id ? { ...i, qtd: Math.min(i.qtd + 1, p.quantidade) } : i));
    return [...prev, { ...p, qtd: 1 }];
  });
  const mudar = (item, qtd) => {
    if (qtd <= 0) return setItens((p) => p.filter((i) => i.id !== item.id));
    setItens((p) => p.map((i) => (i.id === item.id ? { ...i, qtd: Math.min(qtd, i.quantidade) } : i)));
  };

  const totalVitrine = useMemo(() => itens.reduce((s, i) => s + i.preco * i.qtd, 0), [itens]);

  const solicitar = async () => {
    if (!itens.length) return;
    setEnviando(true);
    const r = await base44.functions.invoke('createConsignacao', {
      actorId: user.id,
      items: itens.map((i) => ({ product_id: i.id, quantity: i.qtd })),
    });
    setEnviando(false);
    if (!r?.success) return toast.error(r?.error || 'Não foi possível enviar o pedido.');
    toast.success(r.mensagem || 'Pedido enviado para aprovação.');
    setItens([]);
    setRecarregar((n) => n + 1);
  };

  return (
    <div className="space-y-6">
      <ConsignadoCard key={recarregar} user={user} />

      <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Handshake className="w-5 h-5 text-amber-400" />
          <h3 className="font-black">Pedir mercadoria consignada</h3>
        </div>
        <p className="text-xs text-gray-400">
          Escolha o que quer levar sem pagar agora. O pedido vai para aprovação e, se aprovado,
          você tem 60 dias para vender ou devolver — a cada venda o custo é cobrado na hora.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div>
          <div className="relative mb-4 max-w-md">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={termo} onChange={(e) => setTermo(e.target.value)}
              placeholder="Buscar no estoque central…"
              className="w-full bg-gray-950 border border-gray-700 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-amber-500"
            />
          </div>

          {carregando ? (
            <div className="flex items-center gap-2 text-gray-400 py-10"><Loader2 className="w-5 h-5 animate-spin" /> Carregando…</div>
          ) : !produtos.length ? (
            <div className="bg-gray-800/40 border border-dashed border-gray-700 rounded-xl p-8 text-center text-gray-400">Nenhum produto encontrado.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {produtos.map((p) => (
                <div key={p.id} className="rounded-xl border border-gray-800 bg-gray-950 overflow-hidden flex flex-col">
                  <div className="aspect-square bg-gray-900 flex items-center justify-center overflow-hidden">
                    {p.imagem ? <img src={p.imagem} alt="" loading="lazy" className="w-full h-full object-contain" /> : <Package className="w-8 h-8 text-gray-600" />}
                  </div>
                  <div className="p-3 flex flex-col gap-1.5 flex-1">
                    <p className="text-xs text-gray-300 line-clamp-2 flex-1">{p.descricao}</p>
                    <p className="text-[11px] text-gray-500">{p.quantidade} em estoque</p>
                    <p className="text-sm font-bold text-green-400">{money(p.preco)} <span className="text-[10px] font-normal text-gray-500">de venda</span></p>
                    <button onClick={() => add(p)} className="mt-1 min-h-[44px] rounded-lg bg-amber-600 hover:bg-amber-700 text-xs font-bold flex items-center justify-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" /> Adicionar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-32 lg:self-start rounded-xl border border-gray-800 bg-gray-950 p-4">
          <h4 className="font-black text-sm mb-3">Meu pedido de consignado</h4>
          {!itens.length ? (
            <p className="text-xs text-gray-500">Nenhum item ainda. Escolha os produtos ao lado.</p>
          ) : (
            <div className="space-y-2 mb-4">
              {itens.map((i) => (
                <div key={i.id} className="flex items-center gap-2">
                  <span className="text-xs flex-1 truncate">{i.descricao}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => mudar(i, i.qtd - 1)} className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                    <span className="w-6 text-center text-xs">{i.qtd}</span>
                    <button onClick={() => mudar(i, i.qtd + 1)} className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-gray-800 pt-3 mb-3">
            <p className="text-xs text-gray-400">Valor de venda dos itens</p>
            <p className="text-lg font-black text-green-400">{money(totalVitrine)}</p>
            <p className="text-[11px] text-gray-500 mt-1">O custo que você deve por peça é definido pela casa na aprovação.</p>
          </div>
          <button
            onClick={solicitar}
            disabled={!itens.length || enviando}
            className="w-full min-h-[44px] rounded-lg bg-amber-600 hover:bg-amber-700 disabled:bg-gray-800 disabled:text-gray-500 text-sm font-bold flex items-center justify-center gap-2"
          >
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Solicitar consignação
          </button>
        </div>
      </div>
    </div>
  );
}