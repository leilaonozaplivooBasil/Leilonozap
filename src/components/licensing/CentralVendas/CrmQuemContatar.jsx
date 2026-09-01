import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PhoneCall, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import StatInfoTooltip from './StatInfoTooltip';
import { linkWhatsApp } from '@/lib/quemContatarHoje';

// 📞 DIR-24 Fase 4 (30/08/2026) — "QUEM CONTATAR HOJE": a fila diária de ação
// do CRM, montada com dado REAL do sistema (pedido não pago, arremate sem
// pagamento, depósito parado, follow-up vencido, cliente sumido), ordenada
// pelo dinheiro em jogo. Um clique abre o WhatsApp com a mensagem pronta do
// motivo. Regra e mensagens: src/lib/quemContatarHoje.js.
const fmtBRL = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const COR_MOTIVO = {
  follow_up: 'bg-nz-verde/10 text-nz-verde border-nz-verde/30',
  pedido_nao_pago: 'bg-amber-50 text-amber-700 border-amber-200',
  arremate_nao_pago: 'bg-amber-50 text-amber-700 border-amber-200',
  deposito_sem_compra: 'bg-sky-50 text-sky-700 border-sky-200',
  sumido_30d: 'bg-nz-cinza-fundo text-nz-tinta-fraca border-nz-borda',
};

const VISIVEIS_FECHADO = 5;

export default function CrmQuemContatar({ fila = [], onAbrirCliente }) {
  const [expandido, setExpandido] = useState(false);
  if (fila.length === 0) return null;
  const visiveis = expandido ? fila : fila.slice(0, VISIVEIS_FECHADO);
  return (
    <Card className="bg-white border-nz-verde/40 mb-4 sm:mb-6 shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <p className="text-sm font-semibold text-nz-tinta mb-3 flex items-center gap-2">
          <PhoneCall className="w-4 h-4 text-nz-verde" />
          Quem contatar hoje ({fila.length})
          <StatInfoTooltip text="Fila diária montada com dado real do sistema, na ordem do dinheiro em jogo: follow-up combinado, pedido gerado e não pago, arremate sem pagamento, depósito parado sem compra e cliente que já comprou e sumiu há 30+ dias. O botão do WhatsApp abre com a mensagem pronta pro motivo." />
        </p>
        <div className="space-y-2">
          {visiveis.map((item) => {
            const wa = linkWhatsApp(item);
            return (
              <div key={item.key} className="flex items-center gap-2 sm:gap-3 rounded-lg border border-nz-borda bg-nz-cinza-fundo/60 p-2.5">
                <button
                  type="button"
                  onClick={() => onAbrirCliente?.(item.cliente)}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="text-sm font-semibold text-nz-tinta truncate">{item.cliente.full_name}</p>
                  <p className="text-[11px] text-nz-tinta-fraca truncate">{item.detalhe}</p>
                  {/* 📖 DIR-41 — FORM (Hábito 4): o que se sabe da pessoa, ANTES de abordar */}
                  {item.cliente.form_metodo && (item.cliente.form_metodo.mensagem || item.cliente.form_metodo.ocupacao || item.cliente.form_metodo.recreacao) && (
                    <p className="text-[11px] text-nz-verde truncate">
                      💡 {item.cliente.form_metodo.mensagem
                        || [item.cliente.form_metodo.ocupacao, item.cliente.form_metodo.recreacao].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </button>
                <span className={`hidden sm:inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${COR_MOTIVO[item.motivo]}`}>
                  {item.label}
                </span>
                {item.valor > 0 && (
                  <span className="text-sm font-bold text-nz-tinta shrink-0">{fmtBRL(item.valor)}</span>
                )}
                {wa ? (
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="shrink-0">
                    <Button size="sm" className="bg-nz-verde hover:bg-nz-verde-claro text-white h-8 px-2.5">
                      <MessageCircle className="w-4 h-4 sm:mr-1" />
                      <span className="hidden sm:inline text-xs">WhatsApp</span>
                    </Button>
                  </a>
                ) : (
                  <span className="text-[11px] text-nz-tinta-fraca shrink-0">sem telefone</span>
                )}
              </div>
            );
          })}
        </div>
        {fila.length > VISIVEIS_FECHADO && (
          <button
            type="button"
            onClick={() => setExpandido((e) => !e)}
            className="mt-2 w-full text-center text-xs font-semibold text-nz-verde hover:underline flex items-center justify-center gap-1"
          >
            {expandido ? (<><ChevronUp className="w-3.5 h-3.5" /> Mostrar menos</>) : (<><ChevronDown className="w-3.5 h-3.5" /> Ver todos os {fila.length}</>)}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
