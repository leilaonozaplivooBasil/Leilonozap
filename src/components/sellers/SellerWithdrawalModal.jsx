import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { fmtBR } from '@/lib/money';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { plataforma } from "@/api/plataformaClient";
import { podePedirSaque, lerRespostaDoSaque, MOTIVOS } from '@/lib/pedidoDeSaque';

/**
 * 💸 SOLICITAR SAQUE — Painel do Vendedor.
 *
 * 23/09/2026 — reescrito por cima de um modal que falhava de quatro jeitos ao
 * mesmo tempo (ver o cabeçalho de src/lib/pedidoDeSaque.js). O que mudou:
 *   • chama a rota que EXISTE (requestWithdrawal), com o que ela pede (user_id, valor);
 *   • lê a resposta como ela vem (JSON direto), não `response.data`;
 *   • sem KYC aprovado, em vez de um erro genérico, mostra o caminho: validar
 *     identidade na Carteira;
 *   • NÃO pede chave PIX. A rota ignora e força o PIX do CPF validado (antifraude).
 *     Pedir uma chave que não vai ser usada é mentir pra pessoa.
 */
export default function SellerWithdrawalModal({ isOpen, onClose, saldoDisponivel, onSuccess, userId, kycStatus, cpf }) {
  const [valor, setValor] = useState("");
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();

  const irValidar = () => { onClose(); navigate('/Carteira'); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const regra = podePedirSaque({ kycStatus, saldo: saldoDisponivel, valor });
    if (!regra.ok) {
      if (regra.motivo === MOTIVOS.KYC) { toast.error('Valide sua identidade antes de sacar.'); irValidar(); return; }
      if (regra.motivo === MOTIVOS.VALOR) { toast.error('Informe um valor válido.'); return; }
      toast.error(`Saldo insuficiente. Disponível: R$ ${fmtBR(saldoDisponivel)}`); return;
    }
    if (!userId) { toast.error('Sessão inválida. Entre de novo.'); return; }

    setEnviando(true);
    try {
      const r = await plataforma.functions.invoke('requestWithdrawal', { user_id: userId, valor: regra.valor });
      const lido = lerRespostaDoSaque(r);
      if (lido.ok) {
        toast.success(lido.mensagem);
        setValor("");
        onClose();
        onSuccess?.();
      } else if (lido.precisaKyc) {
        toast.error(lido.mensagem);
        irValidar();
      } else {
        toast.error(lido.mensagem);
      }
    } catch (err) {
      toast.error(err?.message || 'Erro ao solicitar saque');
    } finally {
      setEnviando(false);
    }
  };

  const aprovado = kycStatus === 'aprovado';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 max-w-md" data-teste="modal-saque">
        <DialogHeader>
          <DialogTitle className="text-white">Solicitar Saque</DialogTitle>
          <DialogDescription className="text-gray-400">
            Saldo disponível: R$ {fmtBR(saldoDisponivel)}
          </DialogDescription>
        </DialogHeader>

        {!aprovado ? (
          <div className="space-y-4" data-teste="saque-precisa-kyc">
            <div className="flex gap-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3">
              <ShieldAlert className="w-5 h-5 shrink-0 text-yellow-300" />
              <p className="text-sm text-yellow-100">
                Pra sacar com segurança, valide sua identidade primeiro.{' '}
                <strong className="text-white">O saque só vai pro PIX do seu CPF.</strong>
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-gray-600 text-gray-300">Depois</Button>
              <Button type="button" onClick={irValidar} className="flex-1 bg-green-600 hover:bg-green-700" data-teste="ir-validar-identidade">
                Validar identidade
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" data-teste="form-saque">
            <div>
              <Label className="text-gray-300">Valor (R$)</Label>
              <Input
                type="text" inputMode="decimal" placeholder="0,00" value={valor}
                onChange={(e) => setValor(e.target.value)} disabled={enviando}
                className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500"
                data-teste="valor-saque"
              />
            </div>
            <p className="text-xs text-gray-400">
              O PIX vai pro seu CPF{cpf ? <> (<span className="text-white">{cpf}</span>)</> : null}, validado na identidade. Pago após aprovação.
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={enviando} className="flex-1 border-gray-600 text-gray-300">Cancelar</Button>
              <Button type="submit" disabled={enviando || !valor} className="flex-1 bg-green-600 hover:bg-green-700" data-teste="confirmar-saque">
                {enviando ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Solicitando...</> : 'Solicitar Saque'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
