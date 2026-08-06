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

// Domínios institucionais internos: qualquer conta do domínio é validadora.
const DOMINIOS_VALIDADORES = ['tttcorporate.com', 'tttcorporate.com.br'];

// Casamento também por NOME (pedaço do nome), porque o validador pode entrar
// com outro e-mail e o cadastro varia entre "Santana" e "Santanna".
const NOMES_VALIDADORES = [
  'luciano pinheiro',
  'luiz santan', // cobre Santana e Santanna
];

// remove acento e normaliza espaços para o casamento ser tolerante
function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function isParceiroValidador(user) {
  if (!user) return false;

  // Super admin também enxerga tudo (homologação e suporte)
  if (user.role === 'super_admin') return true;

  const email = normalizar(user.email);
  if (email && EMAILS_VALIDADORES.includes(email)) return true;
  if (email && DOMINIOS_VALIDADORES.some((d) => email.endsWith('@' + d))) return true;

  const nomes = [user.full_name, user.nickname, `${user.display_first_name || ''} ${user.display_last_name || ''}`]
    .map(normalizar)
    .filter(Boolean);

  return nomes.some((n) => NOMES_VALIDADORES.some((v) => n.includes(v)));
}