// 🚫 NÃO DEIXA NASCER UM CONTATO REPETIDO — regra pura, testável sem navegador.
//
// 🔴 POR QUE ISTO EXISTE (22/09/2026)
// Pedido do Ávilla: "leads e contatos devem ter aviso para não criar dois iguais
// na lista. Por exemplo, já tenho um joão paim, se tentar cadastrar de novo,
// deve vir um aviso que IMPOSSIBILITE a criação do duplicado."
//
// COMO ESTAVA: já havia aviso (DIR-24 Fase 5), mas com dois furos.
//   1. só olhava E-MAIL e TELEFONE. O exemplo do pedido — o mesmo NOME — passava
//      direto. E é justamente o caso comum: quem cadastra de novo raramente
//      digita o mesmo telefone, senão já teria percebido.
//   2. só AVISAVA. O texto dizia "prefira abrir o perfil que já existe" e o
//      botão Salvar continuava lá, clicável. Aviso que não impede é decoração.
//
// A REGRA QUE PASSA A VALER — e por que ela não é a mesma pros três campos:
//
//   E-MAIL ou TELEFONE iguais  → BLOQUEIO SECO. Esses campos identificam a
//     pessoa. Duas pessoas diferentes com o mesmo celular não existem; é
//     duplicado, ponto.
//
//   NOME igual                 → BLOQUEIO COM CONFIRMAÇÃO. Aqui eu escolhi NÃO
//     trancar de vez, e é uma decisão que vale explicar: "João Silva" existe
//     mais de uma vez no mundo. Trancar pelo nome sozinho impediria de cadastrar
//     um homônimo de verdade — e a pessoa não teria saída nenhuma, porque não dá
//     pra "mudar o nome" de um cliente pra conseguir salvar. Então o caminho
//     fica fechado por padrão (que é o que o pedido quer: não cria sem querer) e
//     só abre se quem cadastra disser, no ato, que é outra pessoa mesmo.
//
// Comparação de nome ignora acento, maiúscula e espaço sobrando: "João Paim",
// "joao paim" e "JOAO  PAIM" são o mesmo nome.

export const POR_EMAIL = 'email';
export const POR_TELEFONE = 'telefone';
export const POR_NOME = 'nome';

/** Os motivos que trancam sem apelação (identificam a pessoa). */
export const MOTIVOS_SECOS = [POR_EMAIL, POR_TELEFONE];

/** Tira acento, caixa e espaço sobrando. "  João  PAIM " → "joao paim" */
export function normalizarNome(nome) {
  return String(nome || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Só os dígitos. Telefone curto demais não identifica ninguém. */
export function sóDigitos(valor) {
  return String(valor || '').replace(/\D/g, '');
}

const MINIMO_TELEFONE = 8;

/**
 * Acha a primeira pessoa já cadastrada que colide com o que está sendo digitado.
 *
 * @returns {{pessoa: object, motivo: 'email'|'telefone'|'nome'}|null}
 *
 * A ordem importa: e-mail e telefone vêm antes do nome de propósito. Se a pessoa
 * colide pelos dois, o motivo mostrado tem que ser o que TRANCA — senão a tela
 * ofereceria "é outra pessoa mesmo" para um duplicado que não admite escapatória.
 */
export function acharDuplicado(cadastrados = [], candidato = {}, { ignorarId = null } = {}) {
  const lista = (cadastrados || []).filter((c) => c && (!ignorarId || c.id !== ignorarId));
  const email = String(candidato.email || '').trim().toLowerCase();
  const fone = sóDigitos(candidato.phone);
  const nome = normalizarNome(candidato.full_name);

  if (email) {
    const achado = lista.find((c) => String(c.email || '').trim().toLowerCase() === email);
    if (achado) return { pessoa: achado, motivo: POR_EMAIL };
  }
  if (fone.length >= MINIMO_TELEFONE) {
    const achado = lista.find((c) => sóDigitos(c.phone) === fone);
    if (achado) return { pessoa: achado, motivo: POR_TELEFONE };
  }
  if (nome) {
    const achado = lista.find((c) => normalizarNome(c.full_name) === nome);
    if (achado) return { pessoa: achado, motivo: POR_NOME };
  }
  return null;
}

/** Este duplicado admite "é outra pessoa mesmo"? Só o de nome. */
export function aceitaConfirmacao(motivo) {
  return motivo === POR_NOME;
}

/**
 * Pode salvar?
 *
 * @param duplicado  o que `acharDuplicado` devolveu (ou null)
 * @param confirmou  a pessoa marcou "é outra pessoa mesmo"
 */
export function podeSalvar(duplicado, confirmou = false) {
  if (!duplicado) return true;
  return aceitaConfirmacao(duplicado.motivo) && confirmou === true;
}

/** O que a tela escreve. Sem nome da pessoa colado aqui — a tela monta. */
export function motivoEmPalavras(motivo) {
  if (motivo === POR_EMAIL) return 'este e-mail';
  if (motivo === POR_TELEFONE) return 'este telefone';
  if (motivo === POR_NOME) return 'este nome';
  return 'estes dados';
}
