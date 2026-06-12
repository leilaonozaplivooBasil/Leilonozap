// Helpers de formatação compartilhados — fonte única (antes duplicados em ~19 arquivos).

// Moeda BR padrão (sempre 2 casas). null/undefined → R$ 0,00.
export const money = (n) =>
  'R$ ' + (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Só os dígitos (telefone/CPF/CEP).
export const onlyDigits = (s) => String(s || '').replace(/\D/g, '');

// Data/hora BR curta. Aceita Date, ISO string ou epoch.
export const formatDate = (d, withTime = false) => {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
};

// "69,80" / "69.80" / "1.234,56" / "6980" → número
export const parseBRL = (s) => {
  if (typeof s === 'number') return s;
  let t = String(s ?? '').trim().replace(/[^\d.,]/g, '');
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
};
