// 🛡️ TEXTOS DO VIGIA E DO FECHAMENTO — puros, testáveis sem banco (07/10/2026, DIR-204).
//
// Dono: "quais automações seriam importantes… tipo equipe sênior"; "cirúrgicas,
// não quebre nada". Aqui mora só a redação das mensagens de WhatsApp: o vigia
// (api/functions/vigiaFinanceiro.js) e o fechamento (fechamentoDiario.js)
// leem o banco e passam por aqui. Nada de regra financeira neste arquivo.

export const reais = (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const n = (v) => Number(v) || 0;
const dataBR = (iso) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }) : '';
};

/** Um alerta do vigia → uma mensagem curta. Vermelho = dinheiro ou regra quebrada; amarelo = precisa de alguém olhar. */
export function textoDoAlerta(a) {
  if (!a || !a.codigo) return '';
  const cor = a.gravidade === 'vermelho' ? '🔴' : '🟡';
  const detalhe = String(a.detalhe || '').trim();
  return `${cor} *Vigia financeiro*\n\n${a.titulo}\n` + (detalhe ? `\n${detalhe.slice(0, 600)}\n` : '') + `\nOnde ver: Pagamentos de Comissões → Relatório · Painel do Investidor → Conciliação.`;
}

/** Só os alertas que merecem mensagem agora (ordem: vermelho antes de amarelo). */
export function alertasParaAvisar(alertas = []) {
  const lista = (Array.isArray(alertas) ? alertas : []).filter((a) => a && a.codigo && a.titulo);
  return [...lista].sort((a, b) => (a.gravidade === 'vermelho' ? 0 : 1) - (b.gravidade === 'vermelho' ? 0 : 1));
}

/** O fechamento do dia, pronto para o WhatsApp. `f` é o retorno de fechamento_diario(). */
export function textoDoFechamento(f) {
  if (!f || typeof f !== 'object') return '';
  const e = f.entradas || {}; const s = f.saidas || {}; const c = f.comissoes || {}; const sa = f.saldos || {}; const m = f.movimento || {}; const b = f.bonus || {}; const au = f.auditoria || {};
  const alertas = Array.isArray(au.alertas) ? au.alertas : [];
  const dia = dataBR(f.de) || String(f.dia || '');
  const linhas = [
    `📊 *Fechamento de ${dia}*`,
    '',
    '*Entrou*',
    `• Depósitos: ${n(e.depositos?.n)} · ${reais(e.depositos?.total)}`,
    `• Loja virtual e balcão: ${n(e.loja?.n)} · ${reais(e.loja?.total)}`,
    `• Arremates pagos: ${n(e.arremates_pagos?.n)} · ${reais(e.arremates_pagos?.total)}`,
    ...(n(e.liquido_gateway) > 0 ? [`• Líquido confirmado no gateway: ${reais(e.liquido_gateway)}`] : []),
    '',
    '*Saiu / travou*',
    `• Avisos de dinheiro saindo (devolução, chargeback, disputa): ${n(s.avisos_dinheiro_saiu)}`,
    `• Bloqueado na carteira por contestação: ${reais(s.bloqueado_na_carteira)}`,
    `• Devoluções feitas pelo gateway: ${n(s.devolucoes_pelo_gateway)}`,
    '',
    '*Comissões*',
    `• Geradas para a rede: ${n(c.geradas?.n)} · ${reais(c.geradas?.total)}`,
    `• Indicação de depósito que entrou em espera: ${n(c.em_espera_criadas?.n)} · ${reais(c.em_espera_criadas?.total)}`,
    `• Liberadas dos 7 dias: ${n(c.liberadas?.n)} · ${reais(c.liberadas?.total)}`,
    `• Pagas na mão: ${n(c.pagas_na_mao?.n)} · ${reais(c.pagas_na_mao?.total)}`,
    ...(n(c.estornadas?.n) > 0 ? [`• Estornadas/canceladas: ${n(c.estornadas.n)} · ${reais(c.estornadas.total)}`] : []),
    ...(n(c.empresa) > 0 ? [`• Ficou com a empresa: ${reais(c.empresa)}`] : []),
    '',
    '*Saldos hoje*',
    `• Rede a receber: ${reais(sa.pessoas)} (+ ${reais(sa.em_espera)} em espera)`,
    `• Carteiras dos clientes: ${reais(sa.carteiras_clientes)} (reservado em lances: ${reais(sa.reservado_em_lances)})`,
    `• Conta oficial (retido): ${reais(sa.empresa)}`,
    `• Bônus Passaporte gastável: ${reais(b.gastavel_total)} (liberado no dia: ${reais(b.liberado)})`,
    '',
    '*Movimento*',
    `• Cadastros: ${n(m.cadastros)} · Lances: ${n(m.lances)}`,
    `• Leilões encerrados com vencedor: ${n(m.leiloes_encerrados?.n)} · ${reais(m.leiloes_encerrados?.total)}`,
    ...(n(m.arremates_a_pagar?.n) > 0 ? [`• Arremates aguardando pagamento: ${n(m.arremates_a_pagar.n)} · ${reais(m.arremates_a_pagar.total)}`] : []),
    '',
    alertas.length === 0
      ? '✅ *Auditoria*: tudo bate (saldo × extrato, liberações, indicações, conciliação).'
      : `⚠️ *Auditoria*: ${alertas.length} alerta(s)\n` + alertas.map((a) => `• ${a.gravidade === 'vermelho' ? '🔴' : '🟡'} ${a.titulo}`).join('\n'),
  ];
  return linhas.join('\n');
}
