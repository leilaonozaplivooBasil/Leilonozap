import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import motivoRecusaPix from '@/lib/motivoRecusaPix';

// 🖤 Aviso de PIX recusado pelo Mercado Pago (com o motivo em português).
// Substitui o "aguardando confirmação" infinito quando a cobrança já nasceu
// reprovada. Puramente informativo: não movimenta valor, saldo nem contrato.
export default function ParceiroPixRecusado({ valor, motivoDetalhe, onGerarNovo }) {
  const m = motivoRecusaPix(motivoDetalhe);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-red-500/50 bg-red-500/10">
          <AlertTriangle className="h-6 w-6 text-red-400" strokeWidth={1.8} />
        </span>
        <h3 className="text-lg font-bold text-pc-tinta">Pagamento não autorizado</h3>
        <p className="text-2xl font-bold text-pc-ouro">R$ {(valor || 0).toLocaleString('pt-BR')}</p>
      </div>

      <div className="border border-red-500/30 bg-pc-preto-2 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-red-400">Motivo</p>
        <p className="mt-1.5 text-sm font-bold text-pc-tinta">{m.titulo}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-pc-tinta-fraca">{m.detalhe}</p>
        <p className="mt-3 border-t border-pc-borda pt-3 text-xs leading-relaxed text-pc-ouro">
          {m.acao}
        </p>
      </div>

      <p className="text-center text-[10px] leading-relaxed text-pc-tinta-fraca">
        Nenhum valor foi cobrado e o código PIX anterior não pode mais ser pago. Seu contrato
        assinado continua válido — basta gerar um novo PIX.
      </p>

      <Button
        onClick={onGerarNovo}
        className="w-full min-h-[48px] bg-pc-ouro py-4 font-bold text-pc-preto hover:bg-pc-ouro-claro"
      >
        Gerar um novo PIX
      </Button>
    </motion.div>
  );
}