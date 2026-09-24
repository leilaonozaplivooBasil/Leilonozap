import React, { useState } from 'react';
import { fmtBR } from '@/lib/money';
import { ChevronDown, ChevronUp, Banknote } from 'lucide-react';
import { etapaDoKyc, proximoPasso } from '@/lib/comissaoSoConsulta';
import { historicoOrdenado } from '@/lib/pagamentoManualDeComissao';
import PagarComissaoManualModal from './PagarComissaoManualModal';

// 🏦 Cartão de uma pessoa no extrato de comissões: quanto ela tem a receber, em
// que pé está o KYC dela, e o botão "Pagar manualmente" (24/09/2026, pedido da
// Beatriz — ver src/lib/comissaoSoConsulta.js pro histórico da decisão). O
// desconto do saldo é atômico no servidor (payCommissionManually.js): não tem
// como este botão registrar um pagamento sem o saldo realmente sair.
export default function ComissaoUsuarioCard({ grupo, admin, onPago }) {
  const [aberto, setAberto] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const kyc = etapaDoKyc(grupo.kyc_status);
  const pagamentosManuais = historicoOrdenado(grupo.pagamentosManuais || []);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="p-4 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[180px]">
          <div className="font-semibold text-white">{grupo.user_name || 'Sem nome'}</div>
          <div className="text-xs text-gray-500">{grupo.user_id}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${kyc.tom}`} data-teste="etapa-kyc">{kyc.rotulo}</span>
            <span className="text-xs text-gray-400">{proximoPasso(grupo.kyc_status, grupo.totalPendente)}</span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-gray-500">A receber (no saldo)</div>
          <div className="text-lg font-black text-amber-400">R$ {fmtBR(grupo.totalPendente)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Já pago</div>
          <div className="text-sm font-bold text-green-400">R$ {fmtBR(grupo.totalPago)}</div>
        </div>

        {grupo.totalPendente > 0 && (
          <button
            type="button"
            onClick={() => setModalAberto(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-2 whitespace-nowrap"
            data-teste="abrir-pagar-manual"
          >
            <Banknote className="w-3.5 h-3.5" /> Pagar manualmente
          </button>
        )}

        <button onClick={() => setAberto(!aberto)} className="text-gray-400 hover:text-white p-2" aria-label={aberto ? 'Recolher' : 'Ver comissões'}>
          {aberto ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {aberto && (
        <div className="border-t border-gray-800 p-4 bg-gray-950/40 space-y-4">
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/60 text-gray-400">
                <tr>
                  <th className="text-left px-3 py-2">Papel</th>
                  <th className="text-left px-3 py-2">Produto/Venda</th>
                  <th className="text-right px-3 py-2">%</th>
                  <th className="text-right px-3 py-2">Valor</th>
                  <th className="text-left px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {grupo.commissions.map((c) => (
                  <tr key={c.id} className="border-t border-gray-800">
                    <td className="px-3 py-2 text-gray-300">{c.role}</td>
                    <td className="px-3 py-2 text-gray-400">{c.product_title || c.sale_id?.slice(0, 8) || '—'}</td>
                    <td className="px-3 py-2 text-right text-gray-400">{c.percent}%</td>
                    <td className="px-3 py-2 text-right font-bold text-white">R$ {fmtBR(c.amount)}</td>
                    <td className="px-3 py-2">
                      {c.status === 'paid' ? (
                        <span className="text-green-400 text-xs font-bold bg-green-400/10 px-2 py-1 rounded">Pago</span>
                      ) : c.status === 'canceled' || c.status === 'reversed' ? (
                        <span className="text-gray-500 text-xs font-bold bg-gray-500/10 px-2 py-1 rounded">{c.status === 'reversed' ? 'Estornado' : 'Cancelado'}</span>
                      ) : (
                        <span className="text-amber-400 text-xs font-bold bg-amber-400/10 px-2 py-1 rounded">
                          {c.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagamentosManuais.length > 0 && (
            <div data-teste="historico-pagamentos-manuais">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Pagamentos manuais</div>
              <div className="space-y-1.5">
                {pagamentosManuais.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-800 bg-gray-900/60 px-3 py-2 text-xs">
                    <span className="font-bold text-green-400">R$ {fmtBR(p.valor)}</span>
                    <span className="text-gray-500">chave {p.pix_key_usada || '—'}</span>
                    <span className="text-gray-500">pago por {p.pago_por_nome || '—'}</span>
                    <span className="text-gray-600 ml-auto">{p.created_at ? new Date(p.created_at).toLocaleString('pt-BR') : ''}</span>
                    {p.nota && <span className="w-full text-gray-500 italic">"{p.nota}"</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <PagarComissaoManualModal
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        pessoa={grupo}
        saldoDisponivel={grupo.totalPendente}
        admin={admin}
        onSuccess={onPago}
      />
    </div>
  );
}
