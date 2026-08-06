// 🔓 Validadores oficiais do Painel do Parceiro.
//
// Contas usadas para HOMOLOGAR o painel: enxergam todas as telas como se o
// termo de confidencialidade e o Contrato de Parceria já estivessem assinados.
//
// ⚠️ REGRA: isto é APENAS liberação de visualização no frontend. NÃO altera
// role, career_levels, saldo, plano nem qualquer campo do usuário no banco, e
// NÃO cria contrato assinado de verdade — a assinatura real continua sendo
// registrada em ContratoAssinatura, com trilha de auditoria.
const EMAILS_VALIDADORES = [
  'luciano4.100@hotmail.com',
];

export function isParceiroValidador(user) {
  const email = String(user?.email || '').trim().toLowerCase();
  if (!email) return false;
  return EMAILS_VALIDADORES.includes(email);
}