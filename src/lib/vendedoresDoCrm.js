/**
 * vendedoresDoCrm — quem pode ser "Vendedor responsável" de um cliente no CRM.
 *
 * 🔴 POR QUE ESTE ARQUIVO EXISTE (02/09/2026)
 * Um vendedor da rede avisou: "meu nome não está na aba de vendedor do CRM".
 * Não era permissão nem bug de tela. O seletor lia SÓ a tabela `sellers` —
 * uma lista herdada da Base44, mantida na mão, cuja linha mais nova é de
 * 03/04/2026. Cinco meses sem ninguém ser incluído.
 *
 * O retrato de 02/09: 29 nomes em `sellers`, 60 pessoas com cargo comercial no
 * cadastro — e só 2 nomes em comum. Ou seja, 58 das 60 pessoas que vendem de
 * verdade não apareciam para serem escolhidas.
 *
 * Agora a lista é a UNIÃO das duas fontes, sem apagar nada:
 *   • `sellers` ativos — continuam todos, inclusive os que não são pessoa
 *     ("LOJA BANGU", "ESCRITÓRIO BARRA", "LEILÕES CASA E VIDEO");
 *   • cadastro — quem tem cargo comercial.
 *
 * ⚠️ `customers.assigned_seller` guarda o NOME em texto, não um id. Por isso a
 * união deduplica por nome normalizado (maiúsculas, sem espaço sobrando): sem
 * isso "LAIS ANDRADE" e "Lais Andrade " virariam duas opções para a mesma
 * pessoa. E por isso também nenhum nome existente sai da lista — tirar um nome
 * daqui deixaria órfão o cliente que já aponta para ele.
 */

// Cargos que respondem por cliente. É todo o plano de carreira MENOS dois:
//   • 'usuario'      — é o cargo de quem só comprou; não vende.
//   • 'influenciador'— divulga, não é responsável por carteira. Deixá-lo dentro
//     enchia o seletor de cadastro de teste: em 02/09 havia SEIS contas
//     chamadas "Vim pelo wendrel", todas influenciador.
export const CARGOS_COMERCIAIS = [
  'vendedor', 'licenciado', 'licenciado_aplicativo', 'distribuidor',
  'loja_fisica', 'ponto_retirada', 'parceiro', 'executivo_conta',
  'diretoria_operacao', 'diretoria_executiva', 'embaixador', 'conselheiro',
  'fundador', 'ceo', 'livoo_live',
];

/** Chave de comparação de nome: maiúsculas, sem acento de espaço, sem sobra. */
export const chaveNome = (n) => String(n || '').trim().replace(/\s+/g, ' ').toUpperCase();

/** A pessoa tem algum cargo que responde por cliente? */
export function ehComercial(usuario) {
  const cargos = Array.isArray(usuario?.career_levels) ? usuario.career_levels : [];
  const todos = [...cargos, usuario?.primary_career_level].filter(Boolean);
  return todos.some((c) => CARGOS_COMERCIAIS.includes(String(c)));
}

/**
 * Monta o seletor "Vendedor responsável".
 * @param {Array} sellers  linhas da tabela `sellers` (as ativas)
 * @param {Array} usuarios linhas de app_users
 * @returns {Array<{id: string, name: string, origem: 'sellers'|'cadastro'}>}
 *          em ordem alfabética, sem nome repetido.
 */
export function montarVendedores(sellers = [], usuarios = []) {
  const vistos = new Set();
  const saida = [];

  // `sellers` entra primeiro: é a lista que já está em uso, e o nome dela é o
  // que está gravado nos clientes antigos. Quem já está aqui manda no nome.
  for (const s of Array.isArray(sellers) ? sellers : []) {
    const nome = String(s?.name || '').trim();
    if (!nome) continue;
    const k = chaveNome(nome);
    if (vistos.has(k)) continue;
    vistos.add(k);
    saida.push({ id: s.id || `seller-${k}`, name: nome, origem: 'sellers' });
  }

  for (const u of Array.isArray(usuarios) ? usuarios : []) {
    if (u?.active === false) continue;
    const nome = String(u?.full_name || '').trim();
    if (!nome || !ehComercial(u)) continue;
    const k = chaveNome(nome);
    if (vistos.has(k)) continue;   // já veio de `sellers` — não duplica
    vistos.add(k);
    saida.push({ id: u.id || `user-${k}`, name: nome, origem: 'cadastro' });
  }

  return saida.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}
