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

// 🐛 09/09/2026 — auditoria noturna: igual DIR-129/134, `prazoDe`/`rotuloDoPrazo`
// montavam e liam a hora com Date local do APARELHO (`T12:00:00` sem fuso,
// `.setHours`, `.getHours`/`.getDate`), não Brasília forçada. Um aparelho em
// outro fuso gravaria (ou leria/decidiria atraso de) um "pronto até" errado
// — o mesmo bug de classe já corrigido em dataISO()/minutosBrasilia().
// Brasil não tem mais horário de verão desde 2019: América/São_Paulo é
// SEMPRE UTC-3, então o offset fixo abaixo é seguro e evita puxar
// Intl.DateTimeFormat só pra montar uma data.

/** Monta o "pronto até" a partir do dia (YYYY-MM-DD) e da hora (HH:MM), sempre em Brasília. */
export function prazoDe(diaISO, horaHHMM) {
  if (!diaISO) return null;
  const [h, m] = String(horaHHMM || '18:00').split(':').map(Number);
  const hh = String(Number.isFinite(h) ? h : 18).padStart(2, '0');
  const mm = String(Number.isFinite(m) ? m : 0).padStart(2, '0');
  const d = new Date(`${diaISO}T${hh}:${mm}:00-03:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

const PARTES_BRASILIA = (d) => new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}).formatToParts(d).reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {});

/** "pronto até 18:00" (mesmo dia) ou "pronto até 09/09 18:00" — sempre lido em Brasília. */
export function rotuloDoPrazo(prazoISO, hojeISO) {
  if (!prazoISO) return null;
  const d = new Date(prazoISO);
  if (Number.isNaN(d.getTime())) return null;
  const p = PARTES_BRASILIA(d);
  const diaISO = `${p.year}-${p.month}-${p.day}`;
  const mesmoDia = hojeISO && diaISO === hojeISO;
  return `pronto até ${mesmoDia ? '' : `${p.day}/${p.month} `}${p.hour}:${p.minute}`;
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

// 📲 09/09/2026 — dono, vendo a Fila do Pronto: "tinha um botão WhatsApp
// aqui... a gente tirou porque ia mandar mensagem mais personalizada, mais
// bonita... só um texto mesmo, mas bem bonito." O compartilhamento volta —
// só texto por ora (imagem/banner fica pra outra rodada), pra lembrar a
// pessoa do pronto que está esperando, sem esperar ela atrasar (isso já
// existe, é o "avisar" da tarefa atrasada — este é o lembrete ANTES).
/** O texto pronto pra compartilhar no WhatsApp — um lembrete, não uma cobrança. */
export function textoCompartilharPronto(t, nomeDaPessoa) {
  const primeiroNome = String(nomeDaPessoa || '').trim().split(' ')[0] || 'você';
  const prazo = rotuloDoPrazo(t?.prazo_em, String(t?.data || '').slice(0, 10));
  return [
    '🎯 *X-GAME — seu Pronto*',
    '',
    `Oi ${primeiroNome}! Passando pra lembrar:`,
    `📋 ${t?.titulo || 'sua tarefa'}`,
    prazo ? `⏰ ${prazo}` : null,
    '',
    'Quando terminar, dá o *pronto* na plataforma — é ele que garante seus pontos e o X-Pay do dia. Bora! 💪',
  ].filter(Boolean).join('\n');
}

const ORDEM = { atrasada: 0, pronto: 1, devolvida: 2, aguardando: 3, conferida: 4 };
/** A fila do pronto: o que precisa de olho primeiro (atrasadas, depois prontos a conferir). */
export function filaDoPronto(tarefas = [], agora = new Date()) {
  return (Array.isArray(tarefas) ? tarefas : [])
    .filter((t) => t && t.origem === 'xperf')
    .map((t) => ({ tarefa: t, estado: estadoDoPronto(t, agora) }))
    .sort((a, b) => ORDEM[a.estado.id] - ORDEM[b.estado.id] || String(a.tarefa.prazo_em || '').localeCompare(String(b.tarefa.prazo_em || '')));
}
