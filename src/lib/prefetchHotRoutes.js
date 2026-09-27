// Pré-carrega em segundo plano (rede ociosa) os chunks das páginas mais
// navegadas a partir da loja/leilões/admin, pra o clique abrir instantâneo em vez
// de esperar o download do chunk. Falha de prefetch é inofensiva: o import
// real na navegação tenta de novo.

// 🪶 27/09/2026 — "pode ir com as telas de admin" (dono). Antes TODO visitante,
// inclusive cliente anônimo no celular, pré-baixava as telas de admin e de painel
// (Licenciamento 1,2 MB, Produtos, Lotes, Pedidos…) logo depois de abrir o site.
// Agora cada grupo só vai para quem de fato usa (ver quemPreBaixa abaixo).
const ROTAS_DE_COMPRA = [
  () => import('@/pages/Home'),
  () => import('@/pages/CatalogProductDetails'),
  () => import('@/pages/Cart'),
  () => import('@/pages/CatalogCheckout2'),
];
// telas da conta: só para quem está logado
const ROTAS_DA_CONTA = [
  () => import('@/pages/Portal'),
  () => import('@/pages/Profile'),
  () => import('@/pages/Carteira'),
  () => import('@/pages/Licensing'),
  () => import('@/pages/Partners'),
];
// operação: só para admin
const ROTAS_DE_ADMIN = [
  () => import('@/pages/ProductManagement'),
  () => import('@/pages/RegisterBatches'),
  () => import('@/pages/CatalogOrdersAdmin'),
  () => import('@/pages/EstoqueLotes'),
];

/** Quais grupos pré-baixar para este usuário (null = visitante anônimo). */
export function quemPreBaixa(usuario) {
  const logado = Boolean(usuario && usuario.id);
  const admin = logado && (usuario.role === 'admin' || usuario.role === 'super_admin');
  return { compra: true, conta: logado, admin };
}

function usuarioSalvo() {
  try { return JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { return null; }
}

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
    const grupos = quemPreBaixa(usuarioSalvo());
    ROTAS_DE_COMPRA.forEach((load) => prefetchLoader(load));
    if (grupos.conta) ROTAS_DA_CONTA.forEach((load) => prefetchLoader(load));
    if (grupos.admin) ROTAS_DE_ADMIN.forEach((load) => prefetchLoader(load));
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