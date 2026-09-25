import React, { useEffect, useRef, useState } from "react";
import { fmtBR } from '@/lib/money';
import { Wallet, X, Loader2, Copy, Check, Zap, QrCode, CheckCircle2, Eye } from "lucide-react";
import { toast } from 'sonner';
import { plataforma } from '@/api/plataformaClient';
import { contaDoLance, contaNaoExplicaRecusa } from '@/lib/saldoDoLance';
import {
  PACOTES_RAPIDOS, pacoteSugerido, valorDigitado, problemaDoValor, podeGerarPixAqui,
  pedidoDoPix, lerRespostaDoPix, estadoDoPagamento, INTERVALO_DO_PIX_MS,
} from '@/lib/recargaRapida';

/**
 * 💰 O aviso de saldo insuficiente — agora uma GAVETA DE RECARGA RÁPIDA.
 *
 * 🔴 11/09/2026 — este aviso mostrava só o lance mínimo, mas a trava do lance
 * exige lance + frete (useBidSubmission.js). Um cliente com R$ 1.000,00 tentando
 * dar R$ 997,00 levou "Saldo Insuficiente" com "Faltam: R$ -3,00" na tela.
 * Agora as duas contas são a mesma, e o frete aparece como linha própria.
 *
 * ⚡ 25/09/2026 — dono (urgente): "O aviso deve vir como um menu suspenso com
 * os pacotes rápidos 27, 50, 100, 500, 1000, 3000 e digite o valor — tipo a
 * tela de adicionar saldo, só que mais rápido, sem sair da tela do leilão."
 * A gaveta sobe de baixo, já marca o menor pacote que cobre o que falta, gera
 * o PIX aqui mesmo (o MESMO createMPWalletDeposit do checkout) e fica
 * perguntando se caiu; confirmado, atualiza o saldo e fecha — a pessoa dá o
 * lance sem ter saído da sala. Cartão e parcelas continuam na tela completa
 * ("cartão e mais opções"), que é o `onAddFunds` de sempre.
 */
export default function LowBalanceModal({
  isOpen,
  currentBalance,
  requiredAmount,
  freteValor = 0,
  currentUser = null,
  onSaldoAtualizado,
  onWatchAsSpectator,
  onAddFunds,
  onClose
}) {
  const conta = contaDoLance({ saldo: currentBalance, lanceMinimo: requiredAmount, frete: freteValor });
  // O servidor recota o frete na hora de reservar. Se ele recusou e a conta da
  // tela diz que cabia, não dá para afirmar quanto falta — então não afirma.
  const semExplicacao = contaNaoExplicaRecusa(conta);

  const [valor, setValor] = useState(null);
  const [digitado, setDigitado] = useState('');
  const [gerando, setGerando] = useState(false);
  const [pix, setPix] = useState(null);          // { paymentId, copiaECola, qrImagem }
  const [copiado, setCopiado] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const timer = useRef(null);

  // abre sempre do zero, com o pacote sugerido já marcado
  useEffect(() => {
    if (!isOpen) return;
    setValor(pacoteSugerido(conta.faltam) ?? PACOTES_RAPIDOS[1]);
    setDigitado(''); setPix(null); setCopiado(false); setConfirmado(false); setGerando(false);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // pergunta se o PIX caiu — e na hora em que a pessoa volta do app do banco
  useEffect(() => {
    if (!pix?.paymentId || confirmado) return undefined;
    let vivo = true;
    const checar = async () => {
      try {
        const r = await plataforma.functions.invoke('checkPaymentStatus', { payment_id: pix.paymentId });
        if (!vivo) return;
        const estado = estadoDoPagamento(r);
        if (estado === 'confirmado') {
          setConfirmado(true);
          toast.success('✅ PIX confirmado! Saldo na carteira — já pode dar o lance.');
          try { await onSaldoAtualizado?.(); } catch { /* o saldo recarrega sozinho na sala também */ }
        } else if (estado === 'recusado') {
          toast.error('O pagamento foi recusado. Tente outro valor ou outra forma.');
          setPix(null);
        }
      } catch { /* rede instável: tenta no próximo ciclo */ }
    };
    timer.current = setInterval(checar, INTERVALO_DO_PIX_MS);
    const acordar = () => { if (!document.hidden) checar(); };
    document.addEventListener('visibilitychange', acordar);
    window.addEventListener('focus', acordar);
    return () => {
      vivo = false; clearInterval(timer.current);
      document.removeEventListener('visibilitychange', acordar);
      window.removeEventListener('focus', acordar);
    };
  }, [pix, confirmado]); // eslint-disable-line react-hooks/exhaustive-deps

  // confirmado: mostra o "pronto" um instante e devolve a pessoa pro lance.
  // (Efeito próprio: dentro do polling, a limpeza que roda quando `confirmado`
  // muda cancelava o fechamento e a gaveta ficava aberta — a banca pegou.)
  useEffect(() => {
    if (!confirmado) return undefined;
    const t = setTimeout(() => onClose?.(), 1600);
    return () => clearTimeout(t);
  }, [confirmado]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  const valorFinal = digitado ? valorDigitado(digitado) : valor;
  const problema = problemaDoValor(valorFinal);
  const aquiMesmo = podeGerarPixAqui(currentUser);

  const gerarPix = async () => {
    if (problema) { toast.error(problema); return; }
    if (!aquiMesmo) { onClose?.(); onAddFunds?.(); return; }
    setGerando(true);
    try {
      const r = await plataforma.functions.invoke('createMPWalletDeposit', pedidoDoPix(currentUser, valorFinal));
      const lido = lerRespostaDoPix(r);
      if (!lido.ok) { toast.error(lido.erro); return; }
      setPix(lido);
    } catch {
      toast.error('Não foi possível gerar o PIX agora. Tente de novo.');
    } finally {
      setGerando(false);
    }
  };

  const copiar = async () => {
    if (!pix?.copiaECola) return;
    try {
      await navigator.clipboard.writeText(pix.copiaECola);
      setCopiado(true);
      toast.success('Código PIX copiado — cole no app do banco.');
      setTimeout(() => setCopiado(false), 2500);
    } catch { toast.error('Não consegui copiar — segure o código e copie à mão.'); }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center" data-teste="recarga-rapida">
      {/* fundo: toque fora fecha (menos no meio da geração) */}
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={() => !gerando && onClose?.()} />

      <div
        role="dialog" aria-modal="true" aria-label="Recarga rápida"
        className="relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-emerald-500/25 bg-gradient-to-b from-[#0f1f1a] to-[#0a1512] shadow-2xl animate-in slide-in-from-bottom duration-300"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        data-teste="recarga-gaveta"
      >
        <div className="sm:hidden mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-white/20" />

        {/* cabeçalho: saldo e quanto falta, numa linha */}
        <div className="flex items-start gap-3 px-5 pt-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-500/15"><Zap className="h-5 w-5 text-emerald-300" /></div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-extrabold leading-tight text-white">
              {confirmado ? 'Saldo na carteira!' : semExplicacao ? 'Não deu para reservar o saldo' : 'Recarregue e dê o lance'}
            </h3>
            <p className="text-[12px] text-white/60" data-teste="recarga-conta">
              Saldo <b className="text-white/90">R$ {fmtBR(conta.saldo)}</b>
              {' · '}lance{conta.frete > 0 ? ' + frete' : ''} <b className="text-white/90">R$ {fmtBR(conta.total)}</b>
              {!semExplicacao && conta.faltam > 0 && <> · faltam <b className="text-amber-300" data-teste="recarga-faltam">R$ {fmtBR(conta.faltam)}</b></>}
            </p>
          </div>
          <button type="button" onClick={() => !gerando && onClose?.()} aria-label="Fechar" className="rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white" data-teste="recarga-fechar"><X className="h-5 w-5" /></button>
        </div>

        {semExplicacao && (
          <p className="mx-5 mt-3 rounded-xl bg-amber-500/10 px-3 py-2 text-[12px] text-amber-200">
            O servidor recusou a reserva do lance. Recarregue a página e tente de novo — se continuar, fale com a gente.
          </p>
        )}

        {confirmado ? (
          <div className="px-5 py-8 text-center" data-teste="recarga-confirmada">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" />
            <p className="mt-3 text-sm text-white/80">Pronto — o saldo entrou. Voltando pro lance…</p>
          </div>
        ) : pix ? (
          /* ── o PIX gerado, aqui mesmo ── */
          <div className="px-5 pt-4" data-teste="recarga-pix">
            <div className="rounded-2xl bg-white p-3 text-center">
              {pix.qrImagem
                ? <img src={pix.qrImagem} alt="QR Code do PIX" className="mx-auto h-44 w-44" data-teste="recarga-qr" />
                : <QrCode className="mx-auto h-24 w-24 text-gray-400" />}
              <p className="mt-1 text-[12px] font-semibold text-gray-700">R$ {fmtBR(valorFinal)} · PIX</p>
            </div>
            {pix.copiaECola && (
              <button type="button" onClick={copiar} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-[15px] font-extrabold text-white active:scale-[0.98]" data-teste="recarga-copiar">
                {copiado ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />} {copiado ? 'Copiado!' : 'Copiar código PIX'}
              </button>
            )}
            <p className="mt-3 flex items-center justify-center gap-2 text-[12px] text-white/60" data-teste="recarga-aguardando">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Esperando o pagamento — fica nesta tela, o saldo entra sozinho.
            </p>
            <button type="button" onClick={() => setPix(null)} className="mt-2 w-full text-center text-[12px] font-semibold text-white/50 hover:text-white">trocar o valor</button>
          </div>
        ) : (
          /* ── os pacotes ── */
          <div className="px-5 pt-4">
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Valor da recarga">
              {PACOTES_RAPIDOS.map((p) => {
                const marcado = !digitado && valor === p;
                const sugerido = !semExplicacao && p === pacoteSugerido(conta.faltam);
                return (
                  <button
                    key={p} type="button" role="radio" aria-checked={marcado}
                    onClick={() => { setValor(p); setDigitado(''); }}
                    className={`relative rounded-2xl border py-3 text-center transition-all active:scale-95 ${marcado ? 'border-emerald-400 bg-emerald-500/20 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]' : 'border-white/10 bg-white/[0.04] hover:border-white/25'}`}
                    data-teste={`pacote-${p}`}
                  >
                    <span className={`block text-[15px] font-extrabold tabular-nums ${marcado ? 'text-emerald-200' : 'text-white'}`}>R$ {fmtBR(p)}</span>
                    {sugerido && <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-400 px-1.5 text-[9px] font-black uppercase text-black" data-teste="pacote-sugerido">cobre o lance</span>}
                  </button>
                );
              })}
            </div>
            <label className="mt-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 focus-within:border-emerald-400" data-teste="recarga-outro">
              <span className="text-sm font-bold text-white/50">R$</span>
              <input
                inputMode="decimal" value={digitado}
                onChange={(e) => setDigitado(e.target.value.replace(/[^\d,.]/g, '').slice(0, 10))}
                placeholder="digite o valor"
                className="h-12 w-full bg-transparent text-[16px] font-bold text-white placeholder:font-normal placeholder:text-white/35 outline-none"
                data-teste="recarga-valor"
              />
            </label>
            {digitado && problema && <p className="mt-1.5 text-[12px] text-amber-300" data-teste="recarga-problema">{problema}</p>}

            <button
              type="button" onClick={gerarPix} disabled={gerando || !!problema}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 py-4 text-[16px] font-extrabold text-white shadow-lg disabled:opacity-50 active:scale-[0.98]"
              data-teste="recarga-gerar"
            >
              {gerando ? <Loader2 className="h-5 w-5 animate-spin" /> : <QrCode className="h-5 w-5" />}
              {aquiMesmo ? `Pagar R$ ${fmtBR(valorFinal || 0)} com PIX` : `Adicionar R$ ${fmtBR(valorFinal || 0)}`}
            </button>

            <div className="mt-3 flex items-center justify-between text-[12px]">
              <button type="button" onClick={() => { onClose?.(); onAddFunds?.(); }} className="inline-flex items-center gap-1 font-semibold text-white/55 hover:text-white" data-teste="recarga-mais-opcoes">
                <Wallet className="h-3.5 w-3.5" /> cartão e mais opções
              </button>
              {onWatchAsSpectator && (
                <button type="button" onClick={onWatchAsSpectator} className="inline-flex items-center gap-1 font-semibold text-white/55 hover:text-white" data-teste="recarga-assistir">
                  <Eye className="h-3.5 w-3.5" /> só assistir
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
