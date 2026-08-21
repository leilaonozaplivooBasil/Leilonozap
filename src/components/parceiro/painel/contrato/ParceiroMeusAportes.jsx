import React, { useState, useEffect, useCallback } from 'react';
import { plataforma } from '@/api/plataformaClient';
import { Loader2, Receipt } from 'lucide-react';
import { formatBRL, formatDataHora, statusDoAporte, STATUS_VISUAL } from '@/components/aportes/aporteUtils';

// 🧾 MEUS APORTES — extrato do PRÓPRIO parceiro dentro de "Contrato e Plano".
// A busca é travada pelo buyer_id do usuário logado: ele nunca vê aporte de outro parceiro.
// Tela 100% de LEITURA — não gera PIX, não altera status, não mexe em comissão.
export default function ParceiroMeusAportes({ user }) {
  const [aportes, setAportes] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    if (!user?.id) { setCarregando(false); return; }
    setCarregando(true);
    const lista = await plataforma.entities.CatalogSale.filter(
      { kind: 'partner_plan', buyer_id: user.id },
      '-created_date',
      50
    );
    setAportes(Array.isArray(lista) ? lista : []);
    setCarregando(false);
  }, [user?.id]);

  useEffect(() => { carregar(); }, [carregar]);

  // Voltar do banco / trocar de aba atualiza na hora (celular pausa timers).
  useEffect(() => {
    const revalidar = () => { if (document.visibilityState === 'visible') carregar(); };
    document.addEventListener('visibilitychange', revalidar);
    window.addEventListener('focus', revalidar);
    return () => {
      document.removeEventListener('visibilitychange', revalidar);
      window.removeEventListener('focus', revalidar);
    };
  }, [carregar]);

  const totalPago = aportes
    .filter((a) => statusDoAporte(a) === 'pago')
    .reduce((s, a) => s + (Number(a.total_amount) || 0), 0);

  return (
    <div className="mt-6 border border-pc-borda bg-pc-preto-2">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-pc-borda px-5 py-4">
        <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-pc-ouro">
          <Receipt className="h-4 w-4" strokeWidth={1.8} /> Meus aportes
        </p>
        <p className="text-[11px] text-pc-tinta-fraca">
          Total confirmado: <strong className="text-pc-ouro">{formatBRL(totalPago)}</strong>
        </p>
      </div>

      {carregando ? (
        <div className="flex items-center justify-center gap-2 py-10 text-xs text-pc-tinta-fraca">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando seus aportes...
        </div>
      ) : aportes.length === 0 ? (
        <p className="px-5 py-8 text-center text-xs leading-relaxed text-pc-tinta-fraca">
          Você ainda não tem nenhum aporte registrado. Ao contratar um plano, cada PIX gerado aparece
          aqui com data, valor e situação.
        </p>
      ) : (
        <ul className="divide-y divide-pc-borda">
          {aportes.map((a) => {
            const s = statusDoAporte(a);
            const visual = STATUS_VISUAL[s] || STATUS_VISUAL.pendente;
            return (
              <li key={a.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-pc-tinta">{a.product_title || 'Aporte'}</p>
                  <p className="text-[11px] text-pc-tinta-fraca">{formatDataHora(a.created_date)}</p>
                </div>
                <div className="flex items-center gap-3 sm:justify-end">
                  <span className="text-base font-bold text-pc-ouro">{formatBRL(a.total_amount)}</span>
                  <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold tracking-wide ${visual.classe}`}>
                    {visual.texto}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}