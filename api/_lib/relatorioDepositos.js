// 📊 RELATÓRIO DE DEPÓSITOS PARA O WHATSAPP (26/09/2026)
//
// O dono pediu: "o Zeca envia no WhatsApp individual para o Ailton esse
// relatório de hora em hora — 13:50, 14:50, 15:50… até 17:30 (30 min antes
// do fim do leilão do PS5)". O relatório é o mesmo que sai no chat de hora em
// hora; aqui ele vira texto de WhatsApp.
//
// Este arquivo é só cálculo e texto (puro, testável). Quem lê o banco e manda
// é api/functions/relatorioDepositosZap.js.

/** Desde quando o relatório conta: 24/09/2026 00:00 de Brasília. */
export const DESDE = '2026-09-24T03:00:00.000Z';
/** Leilão em destaque enquanto durar. */
export const LEILAO_DESTAQUE = '5f2b9c81a06d4e7390bb1d44';
/** Dia e horários (Brasília) em que o relatório sai. */
export const DIA = '2026-09-26';
export const HORARIOS = ['13:50', '14:50', '15:50', '16:50', '17:30'];
/** Tolerância: o cron pode atrasar alguns minutos. */
const TOLERANCIA_MIN = 9;

const FUSO = 'America/Sao_Paulo';

/** Partes da data/hora em Brasília. */
export function emBrasilia(agora = Date.now()) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  const p = Object.fromEntries(f.formatToParts(new Date(agora)).map((x) => [x.type, x.value]));
  const hora = p.hour === '24' ? '00' : p.hour;
  return { dia: `${p.year}-${p.month}-${p.day}`, hora: `${hora}:${p.minute}`, minutos: Number(hora) * 60 + Number(p.minute) };
}

/**
 * Qual horário da lista este instante atende (ou null).
 * Só no DIA, e só entre o horário e HORARIO + TOLERANCIA_MIN.
 */
export function horarioAtual(agora = Date.now()) {
  const b = emBrasilia(agora);
  if (b.dia !== DIA) return null;
  for (const h of HORARIOS) {
    const [hh, mm] = h.split(':').map(Number);
    const alvo = hh * 60 + mm;
    if (b.minutos >= alvo && b.minutos <= alvo + TOLERANCIA_MIN) return h;
  }
  return null;
}

export const reais = (v) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDiaHora = (iso) => {
  const d = new Date(iso);
  const f = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  return f.format(d).replace(',', '');
};

/** Nome curto: até 4 palavras fica inteiro; mais que isso, primeira + última. */
export function nomeCurto(nome) {
  const partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '—';
  if (partes.length <= 4) return partes.join(' ');
  return `${partes[0]} ${partes[partes.length - 1]}`;
}

const ordinal = (n) => `${n}º`;

/**
 * Monta o texto do relatório.
 * @param {object} d
 * @param {Array}  d.depositos  catalog_sales (kind wallet_deposit) desde DESDE — mais recentes primeiro
 * @param {Array}  d.pagosAntes  {buyer_id, created_date} de TODOS os depósitos pagos (para saber se é o 1º)
 * @param {Array}  d.lances     {sender_id, created_date} lances desde DESDE
 * @param {Map|object} d.usuarios id → {full_name, saldo_disponivel, saldo_reservado, referred_by_id}
 * @param {Map|object} d.nomes    id → full_name (indicadores)
 * @param {object|null} d.leilao  {title, current_price, winner_name, end_time, status, lances}
 * @param {number} d.agora
 */
export function montarRelatorio(d) {
  const agora = d.agora || Date.now();
  const get = (m, k) => (m instanceof Map ? m.get(k) : (m || {})[k]);
  const deps = [...(d.depositos || [])].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const pagos = deps.filter((x) => x.status === 'paid');
  const pend = deps.filter((x) => x.status === 'pending_payment');
  const soma = (xs) => xs.reduce((s, x) => s + Number(x.total_amount || 0), 0);
  const umaHora = agora - 60 * 60 * 1000;
  const novos = deps.filter((x) => new Date(x.created_date).getTime() >= umaHora || (x.updated_at && new Date(x.updated_at).getTime() >= umaHora));
  const b = emBrasilia(agora);

  const L = [];
  L.push(`📊 *Depósitos 24/09 → 26/09 ${b.hora}*`);
  L.push(`Pagos: ${pagos.length} · ${reais(soma(pagos))}`);
  L.push(`PIX pendentes: ${pend.length} · ${reais(soma(pend))}`);
  L.push('');
  L.push('*Novos na última hora*');
  if (!novos.length) L.push('Sem depósito novo na última hora.');
  for (const x of novos) L.push(`• ${fmtDiaHora(x.created_date)} · ${nomeCurto(x.buyer_name)} · ${reais(x.total_amount)} · ${x.status === 'paid' ? 'pago ✅' : 'PIX não pago ⏳'}`);
  L.push('');
  L.push('*Todos (mais recentes primeiro)*');
  for (const x of deps) {
    const u = get(d.usuarios, x.buyer_id) || {};
    const ind = u.referred_by_id ? nomeCurto(get(d.nomes, u.referred_by_id) || '?') : '—';
    const antes = (d.pagosAntes || []).filter((p) => p.buyer_id === x.buyer_id && new Date(p.created_date) < new Date(x.created_date)).length;
    const primeiro = antes === 0 ? '1º dep.' : `${ordinal(antes + 1)} dep.`;
    const lancesDepois = (d.lances || []).filter((l) => l.sender_id === x.buyer_id && new Date(l.created_date) > new Date(x.created_date)).length;
    const disp = Number(u.saldo_disponivel || 0);
    const res = Number(u.saldo_reservado || 0);
    const saldo = x.status === 'paid' ? `saldo ${reais(disp)}${res > 0 ? ` (+${reais(res)} reservado)` : ''}` : 'saldo —';
    L.push(`• ${fmtDiaHora(x.created_date)} · ${nomeCurto(x.buyer_name)} · ${reais(x.total_amount)} · ${x.status === 'paid' ? 'pago' : 'PIX não pago'} · ind.: ${ind} · ${primeiro} · lance depois: ${lancesDepois ? `sim (${lancesDepois})` : 'não'} · ${saldo}`);
  }
  L.push('');
  L.push('*Para cobrar (PIX pendente há mais de 1h)*');
  const cobrar = pend.filter((x) => new Date(x.created_date).getTime() < umaHora);
  if (!cobrar.length) L.push('Ninguém.');
  for (const x of cobrar) L.push(`• ${nomeCurto(x.buyer_name)} · ${reais(x.total_amount)} (desde ${fmtDiaHora(x.created_date)})`);
  if (d.leilao && d.leilao.status === 'active') {
    L.push('');
    L.push(`🎮 *${d.leilao.title}*: lance atual ${reais(d.leilao.current_price)} · líder ${nomeCurto(d.leilao.winner_name) || '—'} · ${d.leilao.lances || 0} lances · encerra ${fmtDiaHora(d.leilao.end_time)}`);
  }
  L.push('');
  L.push('_Uso interno · não circular_');
  return L.join('\n');
}
