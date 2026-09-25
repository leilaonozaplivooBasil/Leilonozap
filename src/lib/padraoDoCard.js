// 🃏 PADRÃO DOS CARDS DA VITRINE — as regras puras (25/09/2026).
//
// Dono: "devido às informações do produto, término do leilão e se tem ou não
// o 'compre já', os cards acabam ficando sempre diferentes uns dos outros (em
// tamanho e diagramação). Precisamos de um padrão. O espaço do relógio com o
// 'termina … 00/00 às 00:00' ocupa muito espaço e empurra o resto pra baixo."
// Viu a banca com A e B lado a lado e escolheu A (grade fixa):
//   · título SEMPRE em 2 linhas · prazo curto na linha do "Lance atual"
//   · linha do líder sempre reservada · linha de lances/compre-já com altura
//     fixa · card estica até a linha da grade e os botões vão pro rodapé.
import { FUSO_DA_CASA, instanteDeTermino } from './relogioLeilao.js';

/**
 * O prazo que cabe ao lado de "Lance atual" num card de 170px.
 *
 * "4 dias" e "00:09:12" ficam como estão. Em SEMANAS o card mostra a DATA
 * ("até 07/10"), não "1 semana": é a régua de 03/09 (cliente viu "1 semana"
 * duas semanas seguidas e achou o leilão travado) e de 17/09 (a data no card),
 * mantida sem gastar a linha inteira que o bloco antigo gastava.
 *
 * @returns {{texto: string, ehData: boolean, urgente: boolean} | null}
 */
export function prazoDoCard(contagem, endTime) {
  const texto = String(contagem?.text ?? '').trim();
  if (!texto || texto === 'Encerrado') return null;
  const urgente = contagem?.isUrgent === true;
  if (!/semanas?$/.test(texto)) return { texto, ehData: false, urgente };
  const ms = instanteDeTermino(endTime);
  if (ms === null) return { texto: texto.replace(/\s*semanas?$/, ' sem'), ehData: false, urgente };
  try {
    const dia = new Date(ms).toLocaleDateString('pt-BR', { timeZone: FUSO_DA_CASA, day: '2-digit', month: '2-digit' });
    return { texto: `até ${dia}`, ehData: true, urgente };
  } catch {
    return { texto: texto.replace(/\s*semanas?$/, ' sem'), ehData: false, urgente };
  }
}

/**
 * O título ocupa SEMPRE duas linhas (mesmo curto), para o preço nascer na
 * mesma altura em todos os cards: text-xs (leading 1rem) · sm:text-base
 * (1.5rem) · md:text-lg (1.75rem).
 */
export const CLASSES_DO_TITULO_FIXO = 'min-h-[2rem] sm:min-h-[3rem] md:min-h-[3.5rem]';
