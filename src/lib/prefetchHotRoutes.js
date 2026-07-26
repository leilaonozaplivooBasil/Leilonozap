// Pré-carrega em segundo plano (rede ociosa) os chunks das páginas mais
// navegadas a partir da loja/leilões, pra o clique abrir instantâneo em vez
// de esperar o download do chunk. Falha de prefetch é inofensiva: o import
// real na navegação tenta de novo.

const HOT_ROUTES = [
  () => import('@/pages/Home'),
  () => import('@/pages/CatalogProductDetails'),
  () => import('@/pages/Cart'),
  () => import('@/pages/CatalogCheckout2'),
  () => import('@/pages/Portal'),
  () => import('@/pages/Profile'),
];

export function prefetchHotRoutes() {
  const run = () => {
    // conexões muito lentas / economia de dados: não disputar banda com a página atual
    const conn = navigator.connection;
    if (conn && (conn.saveData || /(^|-)2g/.test(conn.effectiveType || ''))) return;
    HOT_ROUTES.forEach((load) => { load().catch(() => {}); });
  };
  if ('requestIdleCallback' in window) {
    requestIdleCallback(run, { timeout: 5000 });
  } else {
    setTimeout(run, 2500);
  }
}
