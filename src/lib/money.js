// money.js — matemática financeira exata em centavos inteiros.
// Toda soma/comparação de dinheiro do leilão passa por aqui: float nunca
// entra em aritmética direto (0.1 + 0.2 !== 0.3), centavos inteiros sim.

export const toCents = (n) => Math.round((Number(n) || 0) * 100);
export const fromCents = (c) => c / 100;

/** Normaliza qualquer número para exatamente 2 casas decimais. */
export const money = (n) => fromCents(toCents(n));

/** Soma valores monetários sem erro de ponto flutuante. */
export const addMoney = (...ns) => fromCents(ns.reduce((s, n) => s + toCents(n), 0));

/** Multiplica um valor monetário por um fator inteiro/decimal, exato em centavos. */
export const mulMoney = (n, k) => fromCents(Math.round(toCents(n) * k));

/** Compara a >= b em centavos (evita 23.599999... >= 23.6 falhar). */
export const gteMoney = (a, b) => toCents(a) >= toCents(b);

/** Compara a > b em centavos. */
export const gtMoney = (a, b) => toCents(a) > toCents(b);

/** Formata em pt-BR: 1234.5 -> "1.234,50" (sem prefixo R$). */
export const fmtBR = (n) =>
  money(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Lê dinheiro DIGITADO em português (REL-34.2): "200.000" é duzentos MIL,
 * não duzentos — o dono digitou "200.000" num campo numérico do navegador e
 * o valor ia virar R$ 200,00 em silêncio. Regras:
 *   • vírgula presente → vírgula é o decimal, pontos são milhar ("200.000,50")
 *   • só pontos, cada grupo com 3 dígitos → pontos são milhar ("1.234.567")
 *   • ponto seguido de 1-2 dígitos no fim → decimal ("1500.5", "99.90")
 * Aceita "R$", espaços e número já pronto. Vazio/inválido → 0.
 */
export function parseValorBR(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const s = String(v ?? '').replace(/[R$\s]/g, '');
  if (!s) return 0;
  if (s.includes(',')) {
    const n = Number(s.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }
  if (s.includes('.')) {
    const partes = s.split('.');
    const ehMilhar = partes.slice(1).every((p) => p.length === 3);
    const n = ehMilhar ? Number(partes.join('')) : Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
