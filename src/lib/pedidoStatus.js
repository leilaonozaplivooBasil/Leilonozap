// 🔴 PONTO 118 (21/08/2026) — decide se o status escolhido no dropdown de
// Gestão de Pedidos deve ser promovido pra 'shipped' quando o admin digita um
// rastreio junto. Extraído de CatalogOrdersAdmin.jsx pra dar pra testar sem
// precisar de infraestrutura de teste de componente React (este repo não tem).
//
// Histórico do bug (dois incidentes reais, na mesma tarde):
//   PONTO 117: a versão antiga promovia sempre que o campo de rastreio não
//   estava vazio — e ele quase nunca está, porque todo pedido nasce com um
//   rastreio provisório. Resultado: escolher "Pago" pra corrigir um pedido
//   marcado errado não fazia nada, a promoção ressuscitava 'shipped' por cima.
//   PONTO 118: remover a promoção por completo quebrou o atalho real que a
//   própria tela promete — digitar um rastreio NOVO deveria já marcar como
//   enviado, sem precisar trocar o dropdown também.
// A diferença certa: não é "tem rastreio no campo", é "o rastreio MUDOU" —
// isso é o admin dizendo "acabei de despachar isso agora".
export function decidirStatusAoSalvar({ statusEscolhido, trackingDigitado, trackingAnterior }) {
  const digitado = String(trackingDigitado || '').trim();
  const anterior = String(trackingAnterior || '').trim();
  const trackingMudou = digitado !== '' && digitado !== anterior;
  if (statusEscolhido === 'paid' && trackingMudou) return 'shipped';
  return statusEscolhido;
}
