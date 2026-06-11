import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowUp, Check, Lock, X, Loader2, TrendingUp, Package, Users, Crown } from 'lucide-react';

// descrição de conversão por nível pago
const PITCH = {
  licenciado: { tag: 'Mais vendido', desc: 'Tenha sua própria operação de catálogo e cadastre vendedores e influenciadores.', icon: Package },
  parceiro: { tag: 'Escala', desc: 'Cadastre licenciados e lojistas. Comece a montar sua estrutura de rede.', icon: Users },
  ponto_retirada: { tag: 'Logística', desc: 'Vire ponto de armazenagem e distribuição da sua região.', icon: Package },
  loja_fisica: { tag: 'Presença física', desc: 'Sua loja física completa, cadastrando toda a cadeia abaixo.', icon: Crown },
  distribuidor: { tag: 'Topo', desc: 'O nível máximo: distribua e cadastre toda a estrutura.', icon: Crown },
};
const money = (n) => 'R$ ' + Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 0 });
const LABEL = { usuario: 'Usuário', influenciador: 'Influenciador', vendedor: 'Vendedor', licenciado: 'Licenciado', parceiro: 'Parceiro', ponto_retirada: 'Ponto de Retirada', loja_fisica: 'Loja Física', distribuidor: 'Distribuidor' };

export default function Evoluir() {
  const [user, setUser] = useState(null);
  const [levels, setLevels] = useState([]);
  const [perms, setPerms] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [gateway, setGateway] = useState('pix');
  const [processing, setProcessing] = useState(false);
  const [pix, setPix] = useState(null);

  useEffect(() => {
    let u = null; try { u = JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { u = null; }
    setUser(u);
    (async () => {
      try {
        const { data: lv } = await supabase.from('career_levels').select('*').eq('bloco', 'rede').order('ordem');
        setLevels(lv || []);
        const { data: rp } = await supabase.from('register_permissions').select('actor_level,can_register_level');
        const map = {}; (rp || []).forEach((r) => { (map[r.actor_level] = map[r.actor_level] || []).push(r.can_register_level); });
        setPerms(map);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const myLevels = Array.isArray(user?.career_levels) ? user.career_levels : [user?.primary_career_level].filter(Boolean);
  const has = (id) => myLevels.includes(id);
  const paidLevels = levels.filter((l) => Number(l.adesao_valor) > 0);

  const pay = async () => {
    if (!user?.id) { toast.error('Faça login para evoluir.'); return; }
    setProcessing(true);
    try {
      const r = await base44.functions.invoke('createAdesaoPayment', {
        user: { id: user.id, name: user.full_name, email: user.email, cpf: user.cpf }, adesao_level: selected.id, gateway,
      });
      if (!r?.success) { toast.error(r?.error || 'Erro ao iniciar pagamento'); setProcessing(false); return; }
      if (gateway === 'card' && r.url) { window.location.href = r.url; return; }
      setPix(r);
    } catch (e) { toast.error('Erro ao processar'); }
    setProcessing(false);
  };

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando…</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/30 mb-3">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-green-400 text-sm font-semibold">Evolua seu nível</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-2">Quanto mais alto, <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">mais você ganha</span></h1>
          <p className="text-gray-400">Você está como <strong className="text-white">{LABEL[user?.primary_career_level] || 'Usuário'}</strong>. Toda adesão volta 100% em produto.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {paidLevels.map((l) => {
            const owned = has(l.id);
            const pitch = PITCH[l.id] || {};
            const Icon = pitch.icon || ArrowUp;
            const unlocks = (perms[l.id] || []).map((x) => LABEL[x] || x);
            return (
              <div key={l.id} className={`rounded-2xl border-2 p-5 ${owned ? 'border-green-500/40 bg-green-500/5' : 'border-gray-700 bg-gray-800/50'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-green-500/15 border border-green-500/30 flex items-center justify-center"><Icon className="w-5 h-5 text-green-400" /></div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold">{LABEL[l.id]}</h3>
                        {pitch.tag && <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">{pitch.tag}</span>}
                      </div>
                      <div className="text-2xl font-black text-green-400">{money(l.adesao_valor)}</div>
                    </div>
                  </div>
                  {owned && <span className="text-xs flex items-center gap-1 text-green-400"><Check className="w-4 h-4" /> Seu nível</span>}
                </div>
                <p className="text-sm text-gray-300 mb-3">{pitch.desc}</p>
                <div className="space-y-1.5 text-sm mb-4">
                  <div className="flex items-center gap-2 text-gray-300"><Check className="w-4 h-4 text-green-400 flex-shrink-0" /> Comissão direta de <strong className="text-white">{l.venda_direta_pct}%</strong> nas suas vendas</div>
                  <div className="flex items-center gap-2 text-gray-300"><Package className="w-4 h-4 text-yellow-400 flex-shrink-0" /> <strong className="text-white">{money(l.adesao_valor)}</strong> de volta em produtos</div>
                  {unlocks.length > 0 && <div className="flex items-start gap-2 text-gray-300"><Users className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" /> Pode cadastrar: <span className="text-white">{unlocks.join(', ')}</span></div>}
                </div>
                {owned ? (
                  <Button disabled className="w-full bg-green-700/40 text-green-200 cursor-default"><Check className="w-4 h-4 mr-2" /> Você já tem este nível</Button>
                ) : (
                  <Button onClick={() => { setSelected(l); setPix(null); setGateway('pix'); }} className="w-full bg-green-600 hover:bg-green-700"><ArrowUp className="w-4 h-4 mr-2" /> Fazer upgrade agora</Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de pagamento da adesão */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[3000] p-4" onClick={() => !processing && setSelected(null)}>
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Upgrade para {LABEL[selected.id]}</h3>
              <button onClick={() => !processing && setSelected(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            {!pix ? (
              <>
                <div className="bg-gray-900/60 rounded-xl p-4 mb-4 text-center">
                  <div className="text-sm text-gray-400">Investimento (volta em produto)</div>
                  <div className="text-3xl font-black text-green-400">{money(selected.adesao_valor)}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button onClick={() => setGateway('pix')} className={`p-3 rounded-lg border-2 ${gateway === 'pix' ? 'border-green-500 bg-green-500/10' : 'border-gray-600'}`}>💚 PIX</button>
                  <button onClick={() => setGateway('card')} className={`p-3 rounded-lg border-2 ${gateway === 'card' ? 'border-green-500 bg-green-500/10' : 'border-gray-600'}`}>💳 Cartão</button>
                </div>
                <Button onClick={pay} disabled={processing} className="w-full bg-green-600 hover:bg-green-700">
                  {processing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando…</> : (gateway === 'pix' ? 'Gerar PIX' : 'Pagar com Cartão')}
                </Button>
                <p className="text-[11px] text-gray-500 text-center mt-3">Ao confirmar o pagamento, seu nível é ativado automaticamente e seu pedido de produtos é gerado.</p>
              </>
            ) : (
              <div className="text-center">
                <p className="text-green-400 font-semibold mb-3">💚 Pague com PIX para ativar</p>
                {pix.qr_code_base64 && <img src={`data:image/png;base64,${pix.qr_code_base64}`} alt="QR PIX" className="w-56 h-56 mx-auto bg-white rounded-xl p-2" />}
                <div className="text-2xl font-black text-green-400 my-2">{money(pix.amount)}</div>
                <Button onClick={() => { navigator.clipboard.writeText(pix.pix_code || ''); toast.success('Código PIX copiado!'); }} className="w-full bg-green-600 hover:bg-green-700 mb-2">Copiar código PIX</Button>
                <p className="text-[11px] text-gray-500">Assim que o pagamento cair, seu nível ativa sozinho. Pode fechar esta janela.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
