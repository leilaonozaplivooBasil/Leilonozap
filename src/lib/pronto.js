// ⏰ O PRONTO — prazo, carimbo e o enviar-e-voltar. Só conta, sem tela.
//
// DE ONDE VEIO (ditado pelo dono em 06/09/2026): "tem sistema que a gente
// chama de pronto: começar tal hora e entregar até tal hora. Aparece pra ele
// dar o pronto até — pra gente sempre poder cobrar o pronto."
//
// O CICLO (a resposta pra "o que mais melhora o enviar e voltar"):
//   distribuída → (a pessoa) PRONTO → (a gestão) CONFERIDA ✔✔
//                                   ↘ (a gestão) DEVOLVIDA com recado → a pessoa refaz → PRONTO de novo
// Cada seta tem carimbo: prazo_em (até quando), pronto_em (quando deu),
// conferido (o SIM), devolvida_motivo/devolvida_em (por que voltou).

/** Monta o "pronto até" a partir do dia (YYYY-MM-DD) e da hora (HH:MM), no fuso local. */
export function prazoDe(diaISO, horaHHMM) {
  if (!diaISO) return null;
  const [h, m] = String(horaHHMM || '18:00').split(':').map(Number);
  const d = new Date(`${diaISO}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(Number.isFinite(h) ? h : 18, Number.isFinite(m) ? m : 0, 0, 0);
  return d.toISOString();
}

const fmtHora = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const fmtDia = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

/** "pronto até 18:00" (mesmo dia) ou "pronto até 09/09 18:00". */
export function rotuloDoPrazo(prazoISO, hojeISO) {
  if (!prazoISO) return null;
  const d = new Date(prazoISO);
  if (Number.isNaN(d.getTime())) return null;
  const mesmoDia = hojeISO && `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === hojeISO;
  return `pronto até ${mesmoDia ? '' : `${fmtDia(d)} `}${fmtHora(d)}`;
}

/**
 * O estado do pronto de uma tarefa distribuída, agora:
 *   conferida  — feito e o SIM da gestão
 *   pronto     — feito, esperando a conferência (no prazo ou atrasado)
 *   devolvida  — voltou com recado, esperando a pessoa refazer
 *   atrasada   — passou do prazo sem pronto
 *   aguardando — dentro do prazo, sem pronto
 */
export function estadoDoPronto(t, agora = new Date()) {
  const prazo = t?.prazo_em ? new Date(t.prazo_em) : null;
  const pronto = t?.pronto_em ? new Date(t.pronto_em) : null;
  if (t?.feito && t?.conferido === true) return { id: 'conferida', rotulo: 'conferida ✔✔', atrasou: !!(prazo && pronto && pronto > prazo) };
  if (t?.feito) return { id: 'pronto', rotulo: prazo && pronto && pronto > prazo ? 'pronto (atrasado)' : 'pronto', atrasou: !!(prazo && pronto && pronto > prazo) };
  if (t?.devolvida_motivo) return { id: 'devolvida', rotulo: 'devolvida', atrasou: !!(prazo && agora > prazo) };
  if (prazo && agora > prazo) return { id: 'atrasada', rotulo: 'atrasada', atrasou: true };
  return { id: 'aguardando', rotulo: 'aguardando o pronto', atrasou: false };
}

/** O que gravar quando a pessoa marca/desmarca o feito. */
export function carimboDoPronto(feitoNovo, agora = new Date()) {
  return feitoNovo
    ? { feito: true, pronto_em: agora.toISOString(), devolvida_motivo: null, devolvida_em: null }
    : { feito: false, pronto_em: null };
}

/** O que gravar quando a gestão devolve. */
export function carimboDaDevolucao(motivo, agora = new Date()) {
  return { feito: false, pronto_em: null, conferido: null, devolvida_motivo: String(motivo || '').trim() || 'refazer', devolvida_em: agora.toISOString() };
}

const ORDEM = { atrasada: 0, pronto: 1, devolvida: 2, aguardando: 3, conferida: 4 };
/** A fila do pronto: o que precisa de olho primeiro (atrasadas, depois prontos a conferir). */
export function filaDoPronto(tarefas = [], agora = new Date()) {
  return (Array.isArray(tarefas) ? tarefas : [])
    .filter((t) => t && t.origem === 'xperf')
    .map((t) => ({ tarefa: t, estado: estadoDoPronto(t, agora) }))
    .sort((a, b) => ORDEM[a.estado.id] - ORDEM[b.estado.id] || String(a.tarefa.prazo_em || '').localeCompare(String(b.tarefa.prazo_em || '')));
}
