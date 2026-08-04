// LojaCheckout — checkout da vitrine de loja da rede (/loja/:slug).
// PONTO 82: passou a cobrar FRETE REAL. Antes o CEP era coletado e ignorado,
// então toda entrega saía com frete pago pela casa.
//
// 🔴 Regra financeira: o servidor RECOTA o frete (o navegador só manda o ID da
// transportadora) e o frete NUNCA entra na base de comissão — quem garante isso
// é api/functions/createStoreOrder.js. Aqui é só a escolha e a exibição.
//
// Extraído de src/pages/LojaVitrine.jsx (que já estava com 299 linhas).
import React, { useState } from 'react';
import { toast } from 'sonner';
import { money } from '@/lib/format';
import { base44 } from '@/api/base44Client';
import { useCopiarPix } from '@/hooks/useCopiarPix';
import CalculadoraFrete from '@/components/frete/CalculadoraFrete';
import { X, Loader2, ShieldCheck, MessageCircle, Copy, CheckCircle2, Truck, Store as StoreIcon } from 'lucide-react';

function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="text-[11px] text-gray-400">{label}</span>
      {/* min-h 44px: alvo de toque confortável no celular */}
      <input {...props} className="w-full mt-0.5 min-h-[44px] bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-600" />
    </label>
  );
}

export default function LojaCheckout({ slug, store, cartItems, total, onClose, onPaid }) {
  const { copiado: pixCopiado, copiar: copiarPix } = useCopiarPix();
  const [form, setForm] = useState({ name: '', phone: '', email: '', cep: '', address: '' });
  const [entrega, setEntrega] = useState('delivery'); // 'delivery' | 'pickup'
  const [frete, setFrete] = useState(null);           // opção escolhida na calculadora
  const [gateway, setGateway] = useState('pix');
  const [step, setStep] = useState('form');           // form | pix
  const [sending, setSending] = useState(false);
  const [pix, setPix] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // a calculadora e o servidor esperam product_id
  const itensParaFrete = cartItems.map((i) => ({ product_id: i.id, quantity: i.qty }));

  const isEntrega = entrega === 'delivery';
  const valorFrete = isEntrega && frete ? Number(frete.preco) || 0 : 0;
  const totalFinal = total + valorFrete;
  // Em entrega, sem frete escolhido o pagamento fica travado (senão a venda sai sem frete).
  const bloqueado = sending || (isEntrega && !frete);

  const pay = async () => {
    if (!form.name.trim() || !form.phone.trim()) { toast.error('Preencha nome e WhatsApp'); return; }
    if (isEntrega && !frete) { toast.error('Calcule o CEP e escolha a forma de entrega.'); return; }
    if (isEntrega && !form.address.trim()) { toast.error('Informe o endereço de entrega.'); return; }
    setSending(true);
    try {
      const r = await base44.functions.invoke('createStoreOrder', {
        slug,
        gateway,
        items: itensParaFrete,
        customer: { ...form, cep: isEntrega ? form.cep : '' },
        delivery_type: entrega,
        frete_id: isEntrega && frete ? frete.id : null,
        cep: isEntrega ? form.cep : null,
      });
      if (!r?.success) { toast.error(r?.error || 'Falha ao criar pedido'); setSending(false); return; }
      if (gateway === 'card' && r.url) { window.location.href = r.url; return; }
      setPix(r); setStep('pix');
    } catch (e) { toast.error('Erro ao processar'); }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-[#0c1310] border border-gray-800 rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-[#0c1310] z-10">
          <h2 className="font-bold min-w-0 truncate">{step === 'pix' ? 'Pague com PIX' : `Finalizar — ${store.name}`}</h2>
          <button onClick={onClose} aria-label="Fechar" className="p-1.5 rounded-lg hover:bg-gray-800 shrink-0"><X className="w-5 h-5" /></button>
        </div>

        {step === 'form' && (
          <div className="p-4 space-y-3">
            <div className="bg-gray-900/60 rounded-xl p-3 text-sm flex justify-between gap-2">
              <span className="text-gray-400">{cartItems.length} item(ns)</span>
              <span className="font-black text-emerald-400 text-lg">{money(total)}</span>
            </div>

            <Field label="Nome completo *" value={form.name} onChange={set('name')} placeholder="Seu nome" />
            <Field label="WhatsApp *" value={form.phone} onChange={set('phone')} placeholder="(21) 99999-9999" />
            <Field label="E-mail" value={form.email} onChange={set('email')} placeholder="opcional (recibo)" type="email" />

            {/* ENTREGA OU RETIRADA */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => setEntrega('delivery')}
                className={`min-h-[44px] py-3 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-1.5 ${isEntrega ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-gray-700 text-gray-400'}`}
              >
                <Truck className="w-4 h-4" /> Entrega
              </button>
              <button
                onClick={() => { setEntrega('pickup'); setFrete(null); }}
                className={`min-h-[44px] py-3 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-1.5 ${!isEntrega ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-gray-700 text-gray-400'}`}
              >
                <StoreIcon className="w-4 h-4" /> Retirar na loja
              </button>
            </div>

            {isEntrega ? (
              <>
                <Field label="Endereço de entrega *" value={form.address} onChange={set('address')} placeholder="Rua, nº, bairro, cidade" />
                <CalculadoraFrete
                  items={itensParaFrete}
                  cepInicial={form.cep}
                  titulo="Calcular frete e prazo"
                  onSelecionar={(op) => {
                    setFrete(op);
                    // guarda o CEP cotado no formulário (o servidor recota com ele)
                    if (op?.cep) setForm((f) => ({ ...f, cep: op.cep }));
                  }}
                />
                {/* o CEP fica visível/editável: a calculadora usa o mesmo campo */}
                <Field label="CEP da entrega *" value={form.cep} onChange={set('cep')} placeholder="00000-000" inputMode="numeric" />
                {!frete && (
                  <p className="text-[11px] text-amber-300">Escolha uma opção de entrega acima para liberar o pagamento.</p>
                )}
              </>
            ) : (
              <p className="text-[12px] text-gray-400 bg-gray-900/60 rounded-xl p-3">
                Você combina a retirada direto com a loja pelo WhatsApp. Sem custo de frete.
              </p>
            )}

            {/* RESUMO — nada escondido */}
            <div className="bg-gray-900/60 rounded-xl p-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-300"><span>Produtos</span><span>{money(total)}</span></div>
              <div className="flex justify-between text-gray-300">
                <span>{isEntrega ? 'Frete' : 'Retirada na loja'}</span>
                <span>{isEntrega ? (frete ? money(valorFrete) : 'a calcular') : money(0)}</span>
              </div>
              {isEntrega && frete && (
                <p className="text-[11px] text-gray-500">
                  {[frete.empresa, frete.nome].filter(Boolean).join(' ')}
                  {frete.prazo ? ` · até ${frete.prazo} dia(s) úteis` : ''}
                </p>
              )}
              <div className="flex justify-between font-black text-emerald-400 border-t border-gray-800 pt-2 mt-1">
                <span>Total</span><span className="text-lg">{money(totalFinal)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button onClick={() => setGateway('pix')} className={`min-h-[44px] py-3.5 rounded-xl border-2 font-bold text-sm ${gateway === 'pix' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-gray-700 text-gray-400'}`}>PIX</button>
              <button onClick={() => setGateway('card')} className={`min-h-[44px] py-3.5 rounded-xl border-2 font-bold text-sm ${gateway === 'card' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-gray-700 text-gray-400'}`}>Cartão</button>
            </div>

            <button onClick={pay} disabled={bloqueado} className="w-full min-h-[48px] py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:text-gray-400 font-bold text-white flex items-center justify-center gap-2">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {gateway === 'pix' ? 'Gerar PIX agora' : 'Pagar com Cartão'}
            </button>
            <p className="text-[11px] text-gray-500 text-center flex items-center justify-center gap-1"><ShieldCheck className="w-3 h-3" /> Pagamento seguro · seus dados protegidos</p>
          </div>
        )}

        {step === 'pix' && pix && (
          <div className="p-5 text-center space-y-3">
            <p className="text-emerald-400 font-semibold">Escaneie ou copie o código PIX</p>
            {pix.qr_code_base64 && <img src={`data:image/png;base64,${pix.qr_code_base64}`} alt="QR PIX" className="w-56 h-56 max-w-full mx-auto bg-white rounded-xl p-2" />}
            <div className="text-3xl font-black text-emerald-400">{money(pix.amount)}</div>
            {pix.shipping > 0 && (
              <p className="text-[11px] text-gray-400">
                Produtos {money(pix.amount_products)} + frete {money(pix.shipping)}
                {pix.shipping_carrier ? ` (${pix.shipping_carrier})` : ''}
              </p>
            )}
            <button onClick={() => copiarPix(pix.pix_code || '')} className={`w-full min-h-[48px] py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${pixCopiado ? 'bg-emerald-500' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
              {pixCopiado ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {pixCopiado ? 'Código PIX copiado!' : 'Copiar código PIX'}
            </button>
            <p className="text-[12px] text-gray-400">Pedido <b className="text-emerald-300">{pix.tracking}</b>. Assim que o pagamento cair, a loja recebe e prepara o envio. Você pode fechar esta tela.</p>
            <a href={`https://wa.me/55${(store.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent('Olá! Acabei de fazer o pedido ' + pix.tracking + ' na sua loja.')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-emerald-300"><MessageCircle className="w-4 h-4" /> Falar com a loja</a>
            <button onClick={onPaid} className="w-full min-h-[44px] py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm">Concluir</button>
          </div>
        )}
      </div>
    </div>
  );
}