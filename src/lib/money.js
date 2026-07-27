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
