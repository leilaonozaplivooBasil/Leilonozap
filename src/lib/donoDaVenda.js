import { plataforma } from '@/api/plataformaClient';
import { getReferral } from '@/lib/referral';

// 👑 REGRA DE DONO ÚNICO — PARTE 3 (CHECKOUT)
// Resolve QUEM recebe a comissão da venda e devolve o `referral_code` desse dono,
// pra entrar no MESMO campo `ref_code` que o backend já espera hoje.
//
// Precedência (idêntica à da vitrine em Catalog.jsx):
//   1. Logado que é vendedor/licenciado → ele mesmo (venda própria)
//   2. Logado com referred_by_id        → o dono do CADASTRO (link é ignorado)
//   3. Logado sem referred_by_id        → link (?ref=) — carimbo da 1ª atribuição
//   4. Visitante                        → link (?ref=)
//
// ⚠️ NUNCA lança erro: qualquer falha cai no comportamento atual (link),
// pra que a venda jamais seja bloqueada por causa da atribuição.

const CARGOS_VENDA_PROPRIA = [
  'vendedor', 'licenciado', 'licenciado_catalogo', 'licenciado_aplicativo',
  'parceiro', 'distribuidor', 'loja_fisica', 'ponto_retirada',
];

const ehVendedor = (u) =>
  u?.is_seller === true ||
  (Array.isArray(u?.career_levels) && u.career_levels.some((c) => CARGOS_VENDA_PROPRIA.includes(c)));

export async function resolverRefCodeDaVenda(usuario) {
  const doLink = getReferral() || '';
  try {
    if (!usuario?.id) return doLink;

    // 1) Vendedor/licenciado comprando: a venda é dele
    if (ehVendedor(usuario) && usuario.referral_code) return usuario.referral_code;

    // 2) Cliente com dono definido no cadastro: o dono real manda
    if (usuario.referred_by_id) {
      const donos = await plataforma.entities.AppUser.filter({ id: usuario.referred_by_id });
      const dono = donos?.[0];
      if (dono?.referral_code) return dono.referral_code;
    }

    // 3 e 4) Sem dono no cadastro → mantém o link
    return doLink;
  } catch {
    return doLink;
  }
}