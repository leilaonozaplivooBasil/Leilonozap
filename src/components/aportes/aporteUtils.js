import { cabecalhosSessao } from '@/lib/sessaoCliente';
// Helpers de exibição do Extrato de Aportes do Parceiro de Compra.
// SOMENTE formatação/leitura — nenhuma regra financeira vive aqui.

export const formatBRL = (v) =>
  (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatDataHora = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
};

// Status do aporte traduzido para a linguagem do painel.
// 'expirado' = PIX pendente há mais de 24h (o PIX do Mercado Pago não fica válido pra sempre).
export const HORAS_PARA_EXPIRAR = 24;

export function statusDoAporte(aporte) {
  if (aporte?.status === 'paid') return 'pago';
  if (aporte?.status === 'canceled') return 'cancelado';
  const criado = new Date(aporte?.created_date || 0).getTime();
  const horas = (Date.now() - criado) / 36e5;
  if (criado && horas > HORAS_PARA_EXPIRAR) return 'expirado';
  return 'pendente';
}

export const STATUS_VISUAL = {
  pago: { texto: 'PAGO', classe: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  pendente: { texto: 'PENDENTE', classe: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  expirado: { texto: 'EXPIRADO', classe: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' },
  cancelado: { texto: 'CANCELADO', classe: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

// Conferência contra o Mercado Pago reaproveitando a rota que JÁ existe hoje
// (a mesma do botão "Já efetuei o PIX"). Nenhuma lógica de pagamento nova.
export async function conferirNoMercadoPago(mpPaymentId) {
  const r = await fetch('/api/functions/checkPartnerPlanPayment', {
    method: 'POST',
    headers: cabecalhosSessao({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ payment_id: mpPaymentId }),
  });
  const json = await r.json();
  return json?.data || json || {};
}