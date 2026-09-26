// 🚀 PRÉ-LANÇAMENTO (26/09/2026)
//
// Dono: "o iPhone 17 deve entrar como pré-lançamento do leilão: em destaque,
// abre hoje às 19h; término, lance inicial, incremento e arremate
// indeterminados — não mostrar".
//
// É um leilão `scheduled` (end_time guarda a hora de ABRIR) marcado com
// raw_base44.pre_lancamento = true, ou simplesmente sem lance inicial. Nesse
// estado a vitrine e a sala mostram só "Abre hoje às 19h": nada de R$ 0,00,
// nada de relógio de término, nada de incremento. Quem abre os lances é o
// dono, depois de definir os números — o cron de agendados pula esse leilão
// enquanto o lance inicial não existir (activateScheduledAuctions.js).
import { instanteDeTermino } from './relogioLeilao.js';

const FUSO = 'America/Sao_Paulo';

/** É pré-lançamento? Só faz sentido em `scheduled`. */
export function ehPreLancamento(auction) {
  if (!auction || auction.status !== 'scheduled') return false;
  const raw = auction.raw_base44;
  if (raw && typeof raw === 'object' && raw.pre_lancamento === true) return true;
  return auction.starting_price === null || auction.starting_price === undefined;
}

const diaEm = (ms) => {
  try { return new Date(ms).toLocaleDateString('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit' }); } catch { return ''; }
};

/**
 * "Abre hoje às 19h" · "Abre amanhã às 19h" · "Abre 28/09 às 19h".
 * Hora cheia vira "19h"; quebrada fica "19:30". Sem data confiável: "Em breve".
 */
export function textoDeAbertura(auction, agora = Date.now()) {
  const ms = instanteDeTermino(auction?.end_time);
  if (ms === null) return 'Em breve';
  let hora;
  try {
    hora = new Date(ms).toLocaleTimeString('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit', hour12: false });
  } catch { return 'Em breve'; }
  const h = hora.endsWith(':00') ? `${hora.slice(0, 2)}h` : hora;
  const dia = diaEm(ms);
  if (dia && dia === diaEm(agora)) return `Abre hoje às ${h}`;
  if (dia && dia === diaEm(agora + 86400000)) return `Abre amanhã às ${h}`;
  return dia ? `Abre ${dia} às ${h}` : 'Em breve';
}
