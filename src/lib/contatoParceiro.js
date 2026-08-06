// 🔒 FONTE ÚNICA da regra "Falar Comigo" (contato direto por WhatsApp).
//
// POR QUE ISSO EXISTE: o Influenciador entra de graça, sem validação nenhuma —
// expor o WhatsApp dele como "canal da loja" abre porta pra golpe (a pessoa
// pensa que está falando com a plataforma e paga por fora). Por isso o contato
// direto só existe a partir de VENDEDOR, que tem cadastro oficial validado.
//
// Qualquer tela que mostre "Falar Comigo" deve usar podeFalarComigo() daqui —
// nunca reimplementar a checagem, nunca olhar o campo `role` solto.
import { CAREER_LEVELS, normalizeLevels } from '@/lib/careerLevels';

const ORDEM = CAREER_LEVELS.reduce((m, l) => { m[l.id] = l.ordem; return m; }, {});

// Vendedor é o primeiro nível com cadastro oficial validado (ordem 3 no bloco rede).
const ORDEM_MINIMA = ORDEM.vendedor;

/** Cargo real de maior nível da pessoa (id de careerLevels), ou null. */
export function cargoDoParceiro(parceiro) {
  const ids = normalizeLevels(parceiro?.career_levels);
  const principal = normalizeLevels(parceiro?.primary_career_level);
  const todos = [...new Set([...ids, ...principal])].filter((id) => ORDEM[id] != null);
  if (!todos.length) return null;
  return todos.sort((a, b) => ORDEM[b] - ORDEM[a])[0];
}

/** Parceiro oficial = cargo real igual ou acima de Vendedor. */
export function parceiroOficial(parceiro) {
  const cargo = cargoDoParceiro(parceiro);
  return !!cargo && ORDEM[cargo] >= ORDEM_MINIMA;
}

/** Só dígitos do telefone (vazio se não houver). */
export function telefoneParceiro(parceiro) {
  return String(parceiro?.phone || '').replace(/\D/g, '');
}

/** Mostra "Falar Comigo"? Só parceiro oficial COM telefone cadastrado. */
export function podeFalarComigo(parceiro) {
  return parceiroOficial(parceiro) && telefoneParceiro(parceiro).length >= 10;
}

/** Link do WhatsApp do parceiro (null se não puder falar com ele). */
export function linkWhatsParceiro(parceiro) {
  if (!podeFalarComigo(parceiro)) return null;
  const nome = parceiro?.name || parceiro?.full_name || '';
  const texto = `Olá ${nome}! Estou vendo sua Loja Virtual no Leilão NoZap.`;
  return `https://wa.me/55${telefoneParceiro(parceiro)}?text=${encodeURIComponent(texto)}`;
}