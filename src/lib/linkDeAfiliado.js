// 🔗 TODO COMPARTILHAR SAI COM O CÓDIGO DE AFILIADO DE QUEM COMPARTILHA (26/09/2026)
//
// O caso: Luciano e Otavio apertaram "Compartilhar" no leilão da Harley 117
// para indicar pessoas e receberam o MESMO link. O link do leilão era do
// leilão, não da pessoa: quem se cadastrasse por ele não caía na árvore de
// ninguém. Dono: "isso deveria ser padrão — o usuário sempre compartilha com
// o seu link de afiliado".
//
// Regra:
//   1. Logado → o `referral_code` da própria pessoa (todo cadastro tem um).
//   2. Visitante → o código do link que o trouxe (getReferral), como já era:
//      a cadeia de indicação não se perde quando um visitante repassa.
//   3. Sem nada → link limpo.
//
// As rotas de preview (/l/:id e /p/:id) já repassam `?ref=` para a página, e
// o Layout guarda o código por 90 dias — este arquivo só garante que o código
// ENTRE no link.
import { getReferral } from './referral.js';

/** O código de afiliado que deve ir no link, ou ''. */
export function codigoDoAfiliado(usuario) {
  let u = usuario;
  if (u === undefined) {
    try { u = JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { u = null; }
  }
  const proprio = String(u?.referral_code || '').trim();
  if (proprio) return proprio;
  try { return String(getReferral() || '').trim(); } catch { return ''; }
}

/** Acrescenta `?ref=` (ou `&ref=`) ao link, sem duplicar quando já existe. */
export function linkComAfiliado(url, codigo = codigoDoAfiliado()) {
  const base = String(url || '');
  const cod = String(codigo || '').trim();
  if (!base || !cod) return base;
  if (/[?&]ref=/.test(base)) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}ref=${encodeURIComponent(cod)}`;
}
