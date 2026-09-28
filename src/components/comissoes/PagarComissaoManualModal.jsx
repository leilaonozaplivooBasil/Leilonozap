import React, { useState } from 'react';
import { fmtBR } from '@/lib/money';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { plataforma } from '@/api/plataformaClient';
import { podeConfirmarPagamento, mensagemDoMotivo, lerRespostaDoPagamento } from '@/lib/pagamentoManualDeComissao';

/**
 * 💸 PAGAR COMISSÃO MANUALMENTE — 24/09/2026, pedido da Beatriz.
 *
 * Diferente do SellerWithdrawalModal (saque pela plataforma): aqui NÃO se
 * confere KYC nem se trava a chave PIX no CPF do titular — é exatamente o
 * atalho que foi pedido, pra destravar quem está preso no KYC. O que garante
 * que isto não paga em dobro é o servidor (payCommissionManually.js): o
 * desconto do saldo e o registro do pagamento acontecem juntos, atômicos.
 */
export default function PagarComissaoManualModal({ isOpen, onClose, pessoa, saldoDisponivel, admin, onSuccess, linhas = null }) {
  // ✅ 28/09/2026 — com `linhas`, é o "OK" das linhas marcadas na tabela: o valor
  // é a soma delas, travado, e o servidor marca AQUELAS linhas como pagas.
  const porLinha = Array.isArray(linhas) && linhas.length > 0;
  const totalDasLinhas = porLinha ? Math.round(linhas.reduce((s, c) => s + (Number(c.amount) || 0), 0) * 100) / 100 : 0;
  const [valor, setValor] = useState('');
  const [pixKeyUsada, setPixKeyUsada] = useState('');
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState(false);

  const fechar = () => {
    if (enviando) return;
    setValor(''); setPixKeyUsada(''); setNota('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const regra = podeConfirmarPagamento({ valor: porLinha ? totalDasLinhas : valor, saldo: saldoDisponivel, pixKeyUsada });
    if (!regra.ok) { toast.error(mensagemDoMotivo(regra.motivo, saldoDisponivel)); return; }
    if (!admin?.id) { toast.error('Sessão inválida. Entre de novo.'); return; }

    setEnviando(true);
    try {
      const r = await plataforma.functions.invoke('payCommissionManually', {
        actor_id: admin.id, user_id: pessoa.user_id, valor: regra.valor,
        pix_key_usada: pixKeyUsada.trim(), nota: nota.trim() || null,
        ...(porLinha ? { commission_ids: linhas.map((c) => c.id) } : {}),
      });
      const lido = lerRespostaDoPagamento(r);
      if (lido.ok) {
        toast.success(lido.mensagem);
        onSuccess?.();
        fechar();
      } else {
        toast.error(lido.mensagem);
      }
    } catch (err) {
      toast.error(err?.message || 'Erro ao registrar o pagamento');
    } finally {
      setEnviando(false);
    }
  };

  const kycAprovado = pessoa?.kyc_status === 'aprovado';

  return (
    <Dialog open={isOpen} onOpenChange={fechar}>
      <DialogContent className="bg-gray-800 border-gray-700 max-w-md" data-teste="modal-pagar-comissao-manual">
        <DialogHeader>
          <DialogTitle className="text-white">{porLinha ? `Marcar ${linhas.length} comiss${linhas.length === 1 ? 'ão' : 'ões'} como paga${linhas.length === 1 ? '' : 's'}` : 'Pagar comissão manualmente'}</DialogTitle>
          <DialogDescription className="text-gray-400">
            {pessoa?.user_name} · saldo: R$ {fmtBR(saldoDisponivel)}
          </DialogDescription>
        </DialogHeader>

        {!kycAprovado && (
          <div className="flex gap-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3" data-teste="aviso-sem-kyc">
            <ShieldAlert className="w-5 h-5 shrink-0 text-yellow-300" />
            <p className="text-sm text-yellow-100">
              Esta pessoa não validou a identidade (KYC). Este caminho não confere quem está recebendo —
              confirme que você sabe pra quem está mandando antes de continuar.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" data-teste="form-pagar-comissao-manual">
          {porLinha ? (
            <div className="rounded-lg border border-green-500/40 bg-green-500/10 p-3" data-teste="total-das-linhas">
              <div className="text-xs text-green-200">Total das comissões marcadas</div>
              <div className="text-2xl font-black text-green-400">R$ {fmtBR(totalDasLinhas)}</div>
              <ul className="mt-2 max-h-28 overflow-y-auto space-y-0.5 text-xs text-gray-300">
                {linhas.map((c) => (
                  <li key={c.id} className="flex justify-between gap-2">
                    <span className="truncate">{c.product_title || c.sale_id?.slice(0, 8) || '—'}</span>
                    <span className="shrink-0 font-bold">R$ {fmtBR(c.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
          <div>
            <Label className="text-gray-300">Valor pago (R$)</Label>
            <Input
              type="text" inputMode="decimal" placeholder="0,00" value={valor}
              onChange={(e) => setValor(e.target.value)} disabled={enviando}
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
              data-teste="valor-pagamento-manual"
            />
          </div>
          )}
          <div>
            <Label className="text-gray-300">Chave PIX usada (ou outro dado do pagamento)</Label>
            <Input
              type="text" placeholder="CPF, telefone, e-mail…" value={pixKeyUsada}
              onChange={(e) => setPixKeyUsada(e.target.value)} disabled={enviando}
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
              data-teste="chave-pagamento-manual"
            />
          </div>
          <div>
            <Label className="text-gray-300">Nota (opcional)</Label>
            <Textarea
              placeholder="Comprovante, combinado, o que ajudar a lembrar depois…" value={nota}
              onChange={(e) => setNota(e.target.value)} disabled={enviando} rows={2}
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
              data-teste="nota-pagamento-manual"
            />
          </div>
          <p className="text-xs text-gray-400">
            Ao confirmar, o valor sai do saldo da pessoa na hora e fica registrado no histórico. Faça o PIX antes de confirmar.
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={fechar} disabled={enviando} className="flex-1 bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white">Cancelar</Button>
            <Button type="submit" disabled={enviando || (!porLinha && !valor) || !pixKeyUsada.trim()} className="flex-1 bg-green-600 hover:bg-green-700" data-teste="confirmar-pagamento-manual">
              {enviando ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Registrando…</> : 'Confirmar pagamento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
