// buscaPessoa — comparador ÚNICO de busca por pessoa (DIR-33, 30/08/2026).
// Pedido do dono: "buscar o nome realmente funcione — nome completo, apelido,
// e-mail, telefone, qualquer coisa que tenha no cadastro". Compara sem acento
// e sem caixa; telefone e CPF comparam só os dígitos (com ou sem máscara dos
// dois lados). Usado pela Árvore Genealógica — e por qualquer tela futura que
// precise achar gente (uma função, não N buscas caseiras divergentes).

const normalizar = (v) => String(v || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const soDigitos = (v) => String(v || '').replace(/\D/g, '');

/** A pessoa bate com o termo de busca? (qualquer campo do cadastro) */
export function pessoaBateBusca(u, termo) {
  const q = normalizar(termo).trim();
  if (!q) return false;
  const camposTexto = [
    u.full_name, u.nickname, u.display_first_name, u.display_last_name,
    u.email, u.referral_code, u.store_name,
  ];
  if (camposTexto.some((c) => c && normalizar(c).includes(q))) return true;
  // nome de exibição composto ("Luciano Pinheiro" quando são dois campos)
  const exibicao = `${u.display_first_name || ''} ${u.display_last_name || ''}`.trim();
  if (exibicao && normalizar(exibicao).includes(q)) return true;
  const qDigitos = soDigitos(termo);
  if (qDigitos.length >= 3) {
    if (soDigitos(u.phone).includes(qDigitos)) return true;
    if (soDigitos(u.cpf).includes(qDigitos)) return true;
  }
  return false;
}

/** Filtra uma lista de pessoas pelo termo (mesma regra do comparador). */
export function buscarPessoas(users = [], termo) {
  const q = normalizar(termo).trim();
  if (!q) return [];
  return users.filter((u) => pessoaBateBusca(u, termo));
}
