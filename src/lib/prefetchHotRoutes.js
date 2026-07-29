// Pré-carrega em segundo plano (rede ociosa) os chunks das páginas mais
// navegadas a partir da loja/leilões/admin, pra o clique abrir instantâneo em vez
// de esperar o download do chunk. Falha de prefetch é inofensiva: o import
// real na navegação tenta de novo.

// Rotas quentes — shopper + admin (as que o usuário mais transita no dia a dia).
const HOT_ROUTES = [
  // shopper
  () => import('@/pages/Home'),
  () => import('@/pages/CatalogProductDetails'),
  () => import('@/pages/Cart'),
  () => import('@/pages/CatalogCheckout2'),
  () => import('@/pages/Portal'),
  () => import('@/pages/Profile'),
  () => import('@/pages/Licensing'),
  () => import('@/pages/Partners'),
  // admin / operação
  () => import('@/pages/ProductManagement'),
  () => import('@/pages/RegisterBatches'),
  () => import('@/pages/Carteira'),
  () => import('@/pages/CatalogOrdersAdmin'),
  () => import('@/pages/EstoqueLotes'),
  () => import('@/pages/AnaliseLoteEstoque'),
];

// Mapa path → loader para intent prefetch no hover/focus dos links.
// Só as rotas com nome de arquivo previsível; o resto cai no idle prefetch.
const PATH_LOADERS = {
  '/Home': () => import('@/pages/Home'),
  '/leiloes': () => import('@/pages/Home'),
  '/Loja-Virtual': () => import('@/pages/Catalog'),
  '/Cart': () => import('@/pages/Cart'),
  '/Profile': () => import('@/pages/Profile'),
  '/Carteira': () => import('@/pages/Carteira'),
  '/Licensing': () => import('@/pages/Licensing'),
  '/Partners': () => import('@/pages/Partners'),
  '/ProductManagement': () => import('@/pages/ProductManagement'),
  '/RegisterBatches': () => import('@/pages/RegisterBatches'),
  '/CatalogOrdersAdmin': () => import('@/pages/CatalogOrdersAdmin'),
  '/EstoqueLotes': () => import('@/pages/EstoqueLotes'),
  '/AnaliseLoteEstoque': () => import('@/pages/AnaliseLoteEstoque'),
  '/Portal': () => import('@/pages/Portal'),
  '/CatalogProductDetails': () => import('@/pages/CatalogProductDetails'),
  '/CatalogCheckout2': () => import('@/pages/CatalogCheckout2'),
};

const prefetched = new Set();
function prefetchLoader(loader) {
  if (!loader || prefetched.has(loader)) return;
  prefetched.add(loader);
  loader().catch(() => {});
}

export function prefetchHotRoutes() {
  const run = () => {
    // conexões muito lentas / economia de dados: não disputar banda com a página atual
    const conn = navigator.connection;
    if (conn && (conn.saveData || /(^|-)2g/.test(conn.effectiveType || ''))) return;
    HOT_ROUTES.forEach((load) => prefetchLoader(load));
  };
  if ('requestIdleCallback' in window) {
    requestIdleCallback(run, { timeout: 5000 });
  } else {
    setTimeout(run, 2500);
  }

  // Intent prefetch: quando o usuário passa o mouse/foco num link interno,
  // pré-baixa o chunk da rota alvo. Delegado no document — não precisa mexer
  // em cada <Link>. Só dispara uma vez por rota.
  const onIntent = (e) => {
    const a = e.target.closest && e.target.closest('a[href^="/"]');
    if (!a) return;
    const path = a.getAttribute('href');
    if (!path) return;
    const loader = PATH_LOADERS[path];
    if (loader) prefetchLoader(loader);
  };
  document.addEventListener('mouseover', onIntent, { passive: true });
  document.addEventListener('focusin', onIntent, { passive: true });
}