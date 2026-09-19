// ⏳ QUANTO FALTA — e o que a tela faz com essa informação.
//
// 🔴 POR QUE ISTO EXISTE (19/09/2026, dono: "mais interativo").
//
// A home mostrava o relógio de cada leilão em UM tom só: verde menta, igual
// para quem termina em seis dias e para quem termina em oito minutos. O dado
// estava na tela e não dizia nada — quem passa o olho lê "20:31:16" e "6 dias"
// com o mesmo peso, e o que fecha primeiro se perde no meio dos outros.
//
// Num leilão, "quanto falta" NÃO é enfeite: é a informação que decide se a
// pessoa dá o lance agora ou deixa pra depois. Então ela ganha cor e ganha
// pulso — e os dois só aparecem quando há motivo, senão a página inteira pisca
// e nada mais chama atenção.
//
// As faixas saíram do próprio catálogo: dos 49 leilões ativos em 19/09, a
// maioria fecha em dias; a hora final é a exceção, e é exatamente por ser
// exceção que ela merece destaque.

/** Menos que isto e o leilão está fechando AGORA. */
export const MINUTOS_CRITICO = 10;
/** Menos que isto e vale avisar. */
export const MINUTOS_ATENCAO = 60;

/**
 * Em que faixa de urgência este leilão está.
 *
 * @returns {'encerrado'|'critico'|'atencao'|'normal'}
 *   'encerrado' também cobre prazo ausente ou ilegível: sem prazo confiável, a
 *   tela não promete contagem nenhuma.
 */
export function urgenciaDoLeilao(endTime, agora = Date.now()) {
  const fim = new Date(endTime ?? NaN).getTime();
  if (!Number.isFinite(fim)) return 'encerrado';
  const faltamMin = (fim - agora) / 60000;
  if (faltamMin <= 0) return 'encerrado';
  if (faltamMin <= MINUTOS_CRITICO) return 'critico';
  if (faltamMin <= MINUTOS_ATENCAO) return 'atencao';
  return 'normal';
}

/**
 * As classes da pílula do relógio, por faixa.
 *
 * O pulso é só do 'critico': piscar a partir de uma hora deixaria metade da
 * vitrine piscando ao mesmo tempo, e aí nada pisca. `motion-reduce:animate-none`
 * porque aviso não pode depender de movimento para ser lido — a cor sustenta.
 */
export function pilulaDaUrgencia(faixa) {
  switch (faixa) {
    case 'critico':
      return 'border-nz-fogo/60 bg-nz-fogo/15 text-nz-fogo-claro animate-pulse motion-reduce:animate-none';
    case 'atencao':
      return 'border-nz-ouro-claro/50 bg-nz-ouro-claro/10 text-nz-ouro-claro';
    default:
      return 'border-nz-verde-claro/30 bg-nz-verde-claro/10 text-nz-verde-menta group-hover:border-nz-verde-neon/60 group-hover:text-nz-verde-neon';
  }
}

/** O que a pílula diz além do relógio. Vazio quando não há o que avisar. */
export function recadoDaUrgencia(faixa) {
  if (faixa === 'critico') return 'fechando';
  if (faixa === 'atencao') return 'última hora';
  return '';
}
