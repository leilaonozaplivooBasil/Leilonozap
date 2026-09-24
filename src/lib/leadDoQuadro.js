// 🤝 O LEAD PELO QUADRO — as regras do painel "Tudo aqui" do card (24/09/2026).
//
// Dono: "modal no quadro para que tudo possa ser feito lá (lista, contatos, e
// mais). Da qualificação do lead à criação do contato novo. Sem sair da
// página do quadro (abrir um modal ou algo semelhante)."
//
// Nada aqui é regra nova: é a MESMA régua da Lista de Networking e do Hábito 4,
// tirada do meio das telas pra que o card do quadro e a Lista não divirjam:
//   • quem eu vejo: só a minha lista (super admin vê todas) — escopoDoMetodo;
//   • o contato novo: o mesmo payload do "Adicionar pessoa", com o carimbo de
//     quem cadastrou (created_by_id), que é o que dá o escopo depois;
//   • a trava contra duplicado: a mesma do CRM (e-mail/telefone trancam; nome
//     igual só passa se a pessoa disser que é outra pessoa mesmo);
//   • o registro de contato: o mesmo formato append-only de
//     customers.contatos_metodo, com carimbo de quem registrou.
// Puro, sem React — é o que os testes leem; quem grava é LeadDoCartao.jsx.
import { probabilidadeFechamento } from './metodo.js';
import { acharDuplicado, podeSalvar } from './duplicadoDeContato.js';

export const ABAS_DO_MODAL = Object.freeze([
  Object.freeze({ id: 'lista', rotulo: 'Minha lista' }),
  Object.freeze({ id: 'novo', rotulo: 'Novo contato' }),
]);

/** A minha lista: cada um só a própria (created_by_id); o super admin, todas. */
export function meusContatos(todos = [], dono) {
  const lista = Array.isArray(todos) ? todos.filter(Boolean) : [];
  if (dono?.role === 'super_admin') return lista;
  const uid = dono?.id ? String(dono.id) : '';
  return uid ? lista.filter((c) => c.created_by_id && String(c.created_by_id) === uid) : [];
}

/** Busca por nome (sem acento/caixa), no máximo `limite` linhas. */
export function filtrarPorNome(lista = [], termo = '', limite = 8) {
  const t = normalizar(termo);
  const base = Array.isArray(lista) ? lista : [];
  const achados = t ? base.filter((c) => normalizar(c?.full_name).includes(t)) : base;
  return achados.slice(0, Math.max(0, limite));
}
const normalizar = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * O contato novo, pronto pra gravar — o mesmo payload do "Adicionar pessoa"
 * da Lista. Sem nome ou sem dono devolve null: um contato sem created_by_id
 * não aparece na lista de ninguém (escopoDoMetodo), some em silêncio.
 */
export function novoContatoParaGravar({ nome, telefone, email } = {}, dono, hojeISO = null) {
  const full_name = String(nome ?? '').replace(/\s+/g, ' ').trim();
  if (!full_name || !dono?.id) return null;
  return {
    full_name,
    phone: String(telefone ?? '').trim(),
    email: String(email ?? '').trim().toLowerCase(),
    status: 'lead',
    source: 'site',
    last_contact: hojeISO || null,
    created_by_id: String(dono.id),
    created_by: dono.email || null,
  };
}

/** A trava contra duplicado, olhando SÓ a minha lista (é nela que ele entraria). */
export function duplicadoNaMinhaLista(meus = [], candidato = {}) {
  return acharDuplicado(meus, candidato);
}
/** Pode criar? (e-mail/telefone iguais trancam; nome igual pede "é outra pessoa mesmo") */
export function podeCriarContato(duplicado, confirmou = false) {
  return podeSalvar(duplicado, confirmou);
}

/** O registro de contato com o carimbo — o MESMO formato do Hábito 4. */
export function registroComCarimbo(registro, autor, { id = null, em = null } = {}) {
  return {
    ...registro,
    id: id || (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `ct_${Date.now()}`),
    em: em || new Date().toISOString(),
    registrado_por_id: autor?.id || null,
    registrado_por_nome: autor?.full_name || '',
  };
}
/** O histórico append-only: nunca reescreve o que já estava lá. */
export function historicoComRegistro(contato, completo) {
  const h = Array.isArray(contato?.contatos_metodo) ? contato.contatos_metodo : [];
  return [...h, completo];
}

/** "12/15 · 75%" pra linha da lista, ou null se ainda não qualificou. */
export function resumoDaQualificacao(contato) {
  const p = probabilidadeFechamento(contato?.qualificacao_network || {});
  return p ? `${p.total}/15 · ${p.pct}%` : null;
}
