import React, { useState } from 'react';
import { fmtBR } from '@/lib/money';
import { ChevronDown, ChevronUp, Banknote, Check } from 'lucide-react';
import { etapaDoKyc, proximoPasso } from '@/lib/comissaoSoConsulta';
import { historicoOrdenado, linhaPagavel, podeMarcarPagas, MOTIVOS_LINHAS } from '@/lib/pagamentoManualDeComissao';
import PagarComissaoManualModal from './PagarComissaoManualModal';

// 🏦 Cartão de uma pessoa no extrato de comissões: quanto ela tem a receber, em
// que pé está o KYC dela, e o botão "Pagar manualmente" (24/09/2026, pedido da
// Beatriz — ver src/lib/comissaoSoConsulta.js pro histórico da decisão). O
// desconto do saldo é atômico no servidor (payCommissionManually.js): não tem
// como este botão registrar um pagamento sem o saldo realmente sair.
export default function ComissaoUsuarioCard({ grupo, admin, onPago }) {
  const [aberto, setAberto] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  // ✅ 28/09/2026 — áudio da Beatriz: tocar em cada "Gerada" ("pago, pago,
  // pago"), ver o total somar, e dar OK. Ver src/lib/pagamentoManualDeComissao.js.
  const [marcadas, setMarcadas] = useState(() => new Set());
  const [modalLinhasAberto, setModalLinhasAberto] = useState(false);
  const pagaveis = grupo.commissions.filter(linhaPagavel);
  const idsMarcados = [...marcadas];
  const regraLinhas = podeMarcarPagas({ comissoes: grupo.commissions, ids: idsMarcados, saldo: grupo.totalPendente });
  const linhasMarcadas = grupo.commissions.filter((c) => marcadas.has(String(c.id)));
  const alternar = (id) => setMarcadas((m) => {
    const n = new Set(m);
    const k = String(id);
    if (n.has(k)) n.delete(k); else n.add(k);
    return n;
  });
  const todasMarcadas = pagaveis.length > 0 && pagaveis.every((c) => marcadas.has(String(c.id)));
  const marcarTodas = () => setMarcadas(todasMarcadas ? new Set() : new Set(pagaveis.map((c) => String(c.id))));
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

        {/* 👀 28/09/2026 — vídeo da Beatriz: "a gente tinha que marcar aqui já como
            pago e já ir descontando da parte de cima". Enquanto ela marca, o
            valor de cima já mostra como fica; o desconto de verdade acontece no
            OK (com a chave PIX usada, que é o comprovante). */}
        <div className="text-right" data-teste="a-receber">
          <div className="text-xs text-gray-500">A receber (no saldo)</div>
          {marcadas.size > 0 && regraLinhas.ok ? (
            <>
              <div className="text-xs text-gray-500 line-through" data-teste="a-receber-antes">R$ {fmtBR(grupo.totalPendente)}</div>
              <div className="text-lg font-black text-amber-400" data-teste="a-receber-depois">R$ {fmtBR(Math.max(0, grupo.totalPendente - regraLinhas.total))}</div>
              <div className="text-[11px] font-bold text-green-400">− R$ {fmtBR(regraLinhas.total)} marcados · confirme no OK</div>
            </>
          ) : (
            <div className="text-lg font-black text-amber-400">R$ {fmtBR(grupo.totalPendente)}</div>
          )}
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
          {/* 24/09/2026 — em produção TODO registro está "confirmed" (1.446) ou
              "reversed" (85); nenhum nunca virou "paid". "Confirmado" só
              quer dizer "comissão gerada" — mostrar isso depois de pagar fazia
              parecer que a pessoa ainda tinha a receber. Quem diz o que falta
              pagar é o saldo lá em cima. */}
          <div className="flex flex-wrap items-end justify-between gap-2 -mb-2">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">Vendas que geraram a comissão</div>
            {pagaveis.length > 0 && (
              <div className="flex items-center gap-3 text-xs">
                <span className="text-gray-500">Toque em "Gerada" para marcar como pago</span>
                <button type="button" onClick={marcarTodas} className="font-bold text-green-400 hover:text-green-300" data-teste="marcar-todas">
                  {todasMarcadas ? 'Desmarcar todas' : 'Marcar todas'}
                </button>
              </div>
            )}
          </div>
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
                      ) : marcadas.has(String(c.id)) ? (
                        <button type="button" onClick={() => alternar(c.id)} aria-pressed="true"
                          className="inline-flex items-center gap-1 text-green-300 text-xs font-bold bg-green-500/20 border border-green-500/60 px-2 py-1 rounded whitespace-nowrap"
                          data-teste="status-marcada">
                          <Check className="w-3.5 h-3.5" /> Pago
                        </button>
                      ) : (
                        <button type="button" onClick={() => alternar(c.id)} aria-pressed="false"
                          className="text-gray-300 text-xs font-bold bg-gray-400/10 border border-transparent hover:border-green-500/50 px-2 py-1 rounded whitespace-nowrap"
                          data-teste="status-gerada">
                          Gerada
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {marcadas.size > 0 && (
            <div className="sticky bottom-2 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-green-500/50 bg-gray-900/95 p-3 shadow-lg backdrop-blur" data-teste="barra-das-marcadas">
              <div className="flex-1 min-w-[160px]">
                <div className="text-xs text-gray-400">{marcadas.size} marcada{marcadas.size === 1 ? '' : 's'} como pago</div>
                <div className="text-lg font-black text-green-400" data-teste="total-marcado">R$ {fmtBR(regraLinhas.total)}</div>
                {regraLinhas.ok && (
                  <div className="text-xs text-gray-300" data-teste="saldo-antes-depois">
                    A receber: <span className="line-through text-gray-500">R$ {fmtBR(grupo.totalPendente)}</span>{' → '}
                    <span className="font-bold text-amber-400">R$ {fmtBR(Math.max(0, grupo.totalPendente - regraLinhas.total))}</span>
                  </div>
                )}
                {regraLinhas.motivo === MOTIVOS_LINHAS.SALDO && (
                  <div className="text-xs text-amber-300" data-teste="aviso-passa-do-saldo">
                    Passa do saldo (R$ {fmtBR(grupo.totalPendente)}). Parte destas comissões já saiu do saldo (saque ou ajuste) — desmarque alguma.
                  </div>
                )}
              </div>
              <button type="button" onClick={() => setMarcadas(new Set())} className="text-xs text-gray-400 hover:text-white px-2 py-2">Limpar</button>
              <button type="button" disabled={!regraLinhas.ok} onClick={() => setModalLinhasAberto(true)}
                className="rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-black px-4 py-2"
                data-teste="ok-marcadas">
                OK · descontar R$ {fmtBR(regraLinhas.total)}
              </button>
            </div>
          )}

          {pagamentosManuais.length > 0 && (
            <div data-teste="historico-pagamentos-manuais">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Pagamentos manuais</div>
              <div className="space-y-1.5">
                {pagamentosManuais.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-800 bg-gray-900/60 px-3 py-2 text-xs">
                    <span className="font-bold text-green-400">R$ {fmtBR(p.valor)}</span>
                    {Array.isArray(p.commission_ids) && p.commission_ids.length > 0 && (
                      <span className="text-gray-400">{p.commission_ids.length} comiss{p.commission_ids.length === 1 ? 'ão' : 'ões'}</span>
                    )}
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
        isOpen={modalLinhasAberto}
        onClose={() => setModalLinhasAberto(false)}
        pessoa={grupo}
        saldoDisponivel={grupo.totalPendente}
        admin={admin}
        linhas={linhasMarcadas}
        onSuccess={() => { setMarcadas(new Set()); onPago?.(); }}
      />
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
