export function formatDateTimeBR(input) {
  if (!input) return '';
  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d?.getTime?.())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(d);
}

export function formatDateBR(input) {
  if (!input) return '';
  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d?.getTime?.())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

// Converte 'YYYY-MM-DDTHH:mm' (horário de Brasília) para ISO UTC
export function brDateTimeToISOString(brLocal) {
  if (!brLocal) return new Date().toISOString();
  const [datePart, timePart = '00:00'] = String(brLocal).split('T');
  const [y, m, d] = datePart.split('-').map((v) => parseInt(v, 10));
  const [hh, mm = '0', ss = '0'] = timePart.split(':');
  const h = parseInt(hh, 10) || 0;
  const mi = parseInt(mm, 10) || 0;
  const s = parseInt(ss, 10) || 0;
  // Brasília = UTC-3 (sem horário de verão)
  const utcMs = Date.UTC(y, (m || 1) - 1, d || 1, (h + 3), mi, s);
  return new Date(utcMs).toISOString();
}

// Converte ISO UTC para valor de input datetime-local em horário de Brasília
export function isoToBRLocalInput(iso) {
  if (!iso) return '';
  const dt = new Date(iso);
  const brMs = dt.getTime() - 3 * 60 * 60 * 1000; // UTC -> BRT
  const br = new Date(brMs);
  const pad = (n) => String(n).padStart(2, '0');
  const val = `${br.getUTCFullYear()}-${pad(br.getUTCMonth() + 1)}-${pad(br.getUTCDate())}` +
              `T${pad(br.getUTCHours())}:${pad(br.getUTCMinutes())}`;
  return val;
}

// Agora em horário de Brasília para preencher inputs 'datetime-local'
export function nowBRLocalInput() {
  const now = new Date();
  const brMs = now.getTime() - 3 * 60 * 60 * 1000;
  const br = new Date(brMs);
  const pad = (n) => String(n).padStart(2, '0');
  return `${br.getUTCFullYear()}-${pad(br.getUTCMonth() + 1)}-${pad(br.getUTCDate())}` +
         `T${pad(br.getUTCHours())}:${pad(br.getUTCMinutes())}`;
}