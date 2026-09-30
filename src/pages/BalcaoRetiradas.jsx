import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, KeyRound, Store, FileCheck, Package } from 'lucide-react';
import { toast } from 'sonner';
import { plataforma } from '@/api/plataformaClient';
import RegistrarRetiradaModal from '@/components/retirada/RegistrarRetiradaModal';
import ComprovanteRetiradaModal from '@/components/retirada/ComprovanteRetiradaModal';
import { codigoLimpo, quandoRetirou } from '@/lib/retirada';

// 🏪 BALCÃO DE RETIRADAS — 30/09/2026. A tela da equipe que entrega no
// escritório / ponto de retirada: só pedidos de retirada, a busca pelo código
// que o cliente mostra, e o "Registrar retirada" que troca a folha assinada.
// Quem pode ver é decidido no SERVIDOR (retiradaNaLoja.js → podeRegistrarRetirada):
// admin, diretoria, loja física e ponto de retirada.
const dias = (iso) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));

export default function BalcaoRetiradas() {
  const [pedidos, setPedidos] = useState(null);
  const [erro, setErro] = useState('');
  const [aba, setAba] = useState('aguardando');
  const [busca, setBusca] = useState('');
  const [codigo, setCodigo] = useState('');
  const [buscandoCodigo, setBuscandoCodigo] = useState(false);
  const [registrando, setRegistrando] = useState(null);
  const [comprovanteDe, setComprovanteDe] = useState(null);

  const carregar = async () => {
    try {
      const r = await plataforma.functions.invoke('retiradaNaLoja', { acao: 'balcao' });
      if (r?.success) { setPedidos(r.pedidos || []); setErro(''); }
      else setErro(r?.error === 'sem_permissao' || r?.error === 'nao_autenticado' ? 'Esta tela é da equipe do balcão de retirada.' : (r?.error || 'Não foi possível carregar'));
    } catch { setErro('Sem conexão — tente de novo'); }
  };
  useEffect(() => { carregar(); }, []);

  const porCodigo = async (e) => {
    e?.preventDefault();
    const c = codigoLimpo(codigo);
    if (c.length !== 6) { toast.error('Digite os 6 números do código'); return; }
    setBuscandoCodigo(true);
    try {
      const r = await plataforma.functions.invoke('retiradaNaLoja', { acao: 'porCodigo', codigo: c });
      if (!r?.success) toast.error(r?.error || 'Código não encontrado');
      else if (r.pedido.retirada) { toast.message(`Já retirado em ${quandoRetirou(r.pedido.retirada.retiradoEm)} (${r.pedido.retirada.local})`); setComprovanteDe(r.pedido.id); }
      else setRegistrando({ ...r.pedido, codigoDigitado: c });
    } catch { toast.error('Sem conexão — tente de novo'); }
    setBuscandoCodigo(false);
  };

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (pedidos || [])
      .filter((p) => (aba === 'aguardando' ? !p.retirada : !!p.retirada))
      .filter((p) => !q || [p.numero, p.produto, p.comprador].some((t) => String(t || '').toLowerCase().includes(q)));
  }, [pedidos, aba, busca]);
  const aguardando = (pedidos || []).filter((p) => !p.retirada).length;

  if (erro && !pedidos) return <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6"><p className="text-gray-300 text-center">{erro}</p></div>;

  return (
    <div className="min-h-screen bg-gray-900 px-4 py-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Store className="w-5 h-5 text-green-400" />Balcão de retiradas</h1>
          <p className="text-sm text-gray-400">Confira o código do cliente, registre a retirada e o comprovante fica no pedido.</p>
        </div>

        <form onSubmit={porCodigo} className="rounded-2xl border border-gray-700 bg-gray-800 p-4">
          <label className="text-sm font-semibold text-white">Cliente chegou? Digite o código dele</label>
          <div className="mt-2 flex gap-2">
            <div className="relative flex-1">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input data-teste="codigo-balcao" inputMode="numeric" placeholder="000 000" value={codigo} onChange={(e) => setCodigo(codigoLimpo(e.target.value))}
                className="w-full min-h-[48px] rounded-lg border border-gray-600 bg-gray-900 pl-9 pr-3 font-mono text-lg tracking-[0.3em] text-white outline-none focus:border-green-500" />
            </div>
            <button type="submit" disabled={buscandoCodigo} className="min-h-[48px] rounded-lg bg-green-600 hover:bg-green-700 px-5 font-bold text-white disabled:opacity-60">
              {buscandoCodigo ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Buscar'}
            </button>
          </div>
        </form>

        <div className="flex gap-2">
          {[['aguardando', `Aguardando (${aguardando})`], ['retirados', 'Retirados']].map(([v, r]) => (
            <button key={v} type="button" onClick={() => setAba(v)} className={`min-h-[40px] rounded-full px-4 text-sm font-semibold ${aba === v ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-300 border border-gray-700'}`}>{r}</button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input placeholder="Buscar por nome, produto ou número do pedido" value={busca} onChange={(e) => setBusca(e.target.value)}
            className="w-full min-h-[44px] rounded-lg border border-gray-700 bg-gray-800 pl-9 pr-3 text-sm text-white outline-none focus:border-green-500" />
        </div>

        {!pedidos ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-green-500" /></div>
          : lista.length === 0 ? <p className="py-10 text-center text-sm text-gray-400">{aba === 'aguardando' ? 'Nenhum pedido aguardando retirada.' : 'Nenhuma retirada registrada ainda.'}</p>
            : (
              <ul className="space-y-2">
                {lista.map((p) => (
                  <li key={p.id} data-teste="pedido-balcao" className="rounded-xl border border-gray-700 bg-gray-800 p-3">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gray-700"><Package className="w-5 h-5 text-gray-400" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white leading-snug">{p.produto}</p>
                        <p className="truncate text-xs text-gray-400">#{p.numero} · {p.comprador || '—'}{p.arremate ? ' · arremate' : ''}</p>
                        {p.retirada
                          ? <p className="mt-0.5 text-xs text-green-300">Retirado {quandoRetirou(p.retirada.retiradoEm)} · {p.retirada.local} · por {p.retirada.atendente || '—'}</p>
                          : <p className="mt-0.5 text-xs text-gray-400">Pago há {dias(p.pagoEm)} {dias(p.pagoEm) === 1 ? 'dia' : 'dias'}</p>}
                      </div>
                      </div>
                      {p.retirada
                        ? <button type="button" onClick={() => setComprovanteDe(p.id)} className="shrink-0 w-full sm:w-auto min-h-[40px] rounded-lg bg-gray-700 hover:bg-gray-600 px-3 text-xs font-semibold text-white inline-flex items-center justify-center gap-1"><FileCheck className="w-3.5 h-3.5" />Comprovante</button>
                        : <button type="button" onClick={() => setRegistrando(p)} className="shrink-0 w-full sm:w-auto min-h-[44px] rounded-lg bg-green-600 hover:bg-green-700 px-3 text-sm font-bold text-white">Registrar retirada</button>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
      </div>

      {registrando && (
        <RegistrarRetiradaModal pedido={registrando} codigoInicial={registrando.codigoDigitado} onFechar={() => setRegistrando(null)}
          onRegistrada={(r) => {
            setPedidos((lst) => (lst || []).map((p) => (p.id === registrando.id ? { ...p, retirada: { local: r.local, retiradoEm: r.retiradoEm, atendente: 'você' } } : p)));
            setRegistrando(null); setCodigo('');
          }} />
      )}
      {comprovanteDe && <ComprovanteRetiradaModal saleId={comprovanteDe} onFechar={() => setComprovanteDe(null)} />}
    </div>
  );
}
