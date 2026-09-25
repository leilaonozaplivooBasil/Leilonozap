// 🃏 PADRÃO DOS CARDS DA VITRINE — as regras puras (25/09/2026).
//
// Dono: "devido às informações do produto, término do leilão e se tem ou não
// o 'compre já', os cards acabam ficando sempre diferentes uns dos outros (em
// tamanho e diagramação). Precisamos de um padrão. O espaço do relógio com o
// 'termina … 00/00 às 00:00' ocupa muito espaço e empurra o resto pra baixo."
//
// O card aceita `padrao`: 'atual' (o de hoje, intocado), 'a' (grade fixa:
// título sempre em 2 linhas, preço e prazo curto na MESMA linha, linha do
// líder e linha de lances/compre-já sempre reservadas) e 'b' (prazo e líder
// viram pílulas sobre a foto; o corpo só tem título, preço, lances e botões).
// Enquanto o dono não escolher, produção segue em 'atual'.
export const PADROES_DO_CARD = Object.freeze(['atual', 'a', 'b']);

/** "1 semana" → "1 sem" · "2 semanas" → "2 sem" · "4 dias" e "00:09:12" ficam. */
export function contagemCurta(texto) {
  return String(texto ?? '').replace(/\s*semanas?$/, ' sem');
}

/** O nome do líder que cabe numa pílula: "Ângela Maria Rocha dos Santos" → "Ângela S." */
export function nomeDoLider(nome) {
  const partes = String(nome ?? '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (!partes.length) return '';
  const particulas = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'di', 'du', 'del', 'della', 'van', 'von']);
  const sobrenome = [...partes.slice(1)].reverse().find((p) => !particulas.has(p.toLowerCase()));
  return sobrenome ? `${partes[0]} ${sobrenome[0].toUpperCase()}.` : partes[0];
}

/**
 * O título ocupa SEMPRE duas linhas (mesmo curto), para o preço nascer na
 * mesma altura em todos os cards: text-xs (leading 1rem) · sm:text-base
 * (1.5rem) · md:text-lg (1.75rem).
 */
export const CLASSES_DO_TITULO_FIXO = 'min-h-[2rem] sm:min-h-[3rem] md:min-h-[3.5rem]';
