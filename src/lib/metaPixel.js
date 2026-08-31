// 📊 META PIXEL — carregamento e disparo, para MAIS DE UM pixel no mesmo site.
//
// Este arquivo existe por causa de uma armadilha concreta (31/08/2026).
//
// O site já tinha o pixel do Rank Premiado (ConcursoLeilaoNozap), carregado
// assim: `if (!window.fbq) { ...carrega...; fbq('init', ID) }`. Enquanto era
// UM pixel só, funcionava. Ao entrar o segundo pixel (o dos leilões), esse
// desenho quebra de duas formas, e as duas em silêncio:
//
//   ① `if (!window.fbq)` protege o SCRIPT, não o `init`. Quem abrisse a Home
//      primeiro carregaria o script e daria init no pixel dos leilões; ao
//      navegar para o Rank Premiado, a condição seria falsa e o pixel DELE
//      nunca receberia init. A campanha do Rank pararia de contar.
//
//   ② `fbq('track', ...)` transmite para TODOS os pixels inicializados. O
//      PageView de uma página cairia também no pixel da outra, inflando as
//      duas contagens com visita que nunca aconteceu ali.
//
// A correção é a que a própria Meta indica para múltiplos pixels:
//   • guardar o `init` POR ID (não pela existência do fbq);
//   • disparar com `trackSingle`, que entrega ao pixel nomeado e só a ele.
//
// Consequência prática: cada página mede a si mesma, e acrescentar um terceiro
// pixel amanhã não quebra os dois que já existem.

// IDs que já receberam `init` nesta sessão de navegação. Módulo ES é singleton,
// então este Set sobrevive à troca de página do SPA — que é justamente o ponto.
const jaIniciados = new Set();

let scriptCarregado = false;

// O snippet oficial da Meta, palavra por palavra. Só o `init` saiu de dentro
// dele, porque aqui ele é chamado uma vez por ID.
function carregarScript() {
  if (scriptCarregado || typeof window === 'undefined') return;
  /* eslint-disable */
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  scriptCarregado = true;
}

/**
 * Garante que este pixel específico está carregado e inicializado.
 * Chamar várias vezes é seguro: o script entra uma vez, o init também.
 */
export function iniciarPixel(pixelId) {
  if (!pixelId || typeof window === 'undefined') return;
  carregarScript();
  if (jaIniciados.has(pixelId)) return;
  try {
    window.fbq('init', pixelId);
    jaIniciados.add(pixelId);
  } catch (e) {
    // Bloqueador de anúncio ou rede fora não podem derrubar a página.
    console.warn('[MetaPixel] não consegui inicializar o pixel:', e);
  }
}

/**
 * Dispara um evento NESTE pixel apenas — nunca nos outros que estiverem no ar.
 * @param {string} pixelId  o pixel dono do evento
 * @param {string} evento   'PageView', 'Lead', 'ViewContent'…
 * @param {object} [dados]  parâmetros opcionais do evento
 */
export function rastrear(pixelId, evento, dados) {
  if (!pixelId || typeof window === 'undefined') return;
  if (typeof window.fbq !== 'function') return;
  try {
    if (dados) window.fbq('trackSingle', pixelId, evento, dados);
    else window.fbq('trackSingle', pixelId, evento);
  } catch (e) {
    console.warn('[MetaPixel] não consegui enviar o evento', evento, e);
  }
}

/** Atalho do par init + PageView, que é o uso de toda página medida. */
export function medirPagina(pixelId) {
  iniciarPixel(pixelId);
  rastrear(pixelId, 'PageView');
}
