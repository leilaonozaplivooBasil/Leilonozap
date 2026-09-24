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
export default function PagarComissaoManualModal({ isOpen, onClose, pessoa, saldoDisponivel, admin, onSuccess }) {
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
    const regra = podeConfirmarPagamento({ valor, saldo: saldoDisponivel, pixKeyUsada });
    if (!regra.ok) { toast.error(mensagemDoMotivo(regra.motivo, saldoDisponivel)); return; }
    if (!admin?.id) { toast.error('Sessão inválida. Entre de novo.'); return; }

    setEnviando(true);
    try {
      const r = await plataforma.functions.invoke('payCommissionManually', {
        actor_id: admin.id, user_id: pessoa.user_id, valor: regra.valor,
        pix_key_usada: pixKeyUsada.trim(), nota: nota.trim() || null,
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
          <DialogTitle className="text-white">Pagar comissão manualmente</DialogTitle>
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
          <div>
            <Label className="text-gray-300">Valor pago (R$)</Label>
            <Input
              type="text" inputMode="decimal" placeholder="0,00" value={valor}
              onChange={(e) => setValor(e.target.value)} disabled={enviando}
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
              data-teste="valor-pagamento-manual"
            />
          </div>
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
            Ao confirmar, R$ {fmtBR(saldoDisponivel)} vira o novo saldo menos o valor pago — na hora, sem espera.
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={fechar} disabled={enviando} className="flex-1 border-gray-600 text-gray-300">Cancelar</Button>
            <Button type="submit" disabled={enviando || !valor || !pixKeyUsada.trim()} className="flex-1 bg-green-600 hover:bg-green-700" data-teste="confirmar-pagamento-manual">
              {enviando ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Registrando…</> : 'Confirmar pagamento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
