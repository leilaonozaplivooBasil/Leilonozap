import { DIA_PRIMEIRO_REPASSE } from '@/components/parceiro/painel/linha/etapasOperacao';

const DIA_MS = 24 * 60 * 60 * 1000;

// ⚖️ ENCERRAMENTO DO PLANO DO PARCEIRO.
// Os 12 meses de repasses começam a contar do PRIMEIRO REPASSE (D+30), não da
// assinatura — regra oficial da operação (linha/etapasOperacao.js).
// Antes: assinatura + 365 dias (adiantava ~1 mês) e, no legado, apenas 60 dias
// exibidos sob o rótulo "12 meses".
export function encerramentoPlano(dataAssinatura) {
  if (!dataAssinatura) return null;
  const base = new Date(dataAssinatura).getTime();
  if (isNaN(base)) return null;
  return new Date(base + (DIA_PRIMEIRO_REPASSE + 365) * DIA_MS).toISOString();
}