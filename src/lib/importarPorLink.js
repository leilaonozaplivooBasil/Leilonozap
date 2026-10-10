// 🔗 IMPORTAR PRODUTO POR LINK — a opção "automático" da loja, para qualquer marketplace (10/10/2026, DIR-212)
//
// Dono: "o leilão tem a parte de importar automático do Mercado Livre; quero essa
// opção também quando formos adicionar produtos na loja — e não precisa ser só o
// Mercado Livre: pode ser qualquer link de qualquer marketplace (Shopee, Magazine
// Luiza, Mercado Livre etc.)".
//
// Quem lê a página é a rota api/functions/importarProdutoPeloLink.js (DIR-207):
// título, descrição, marca, modelo, medidas, fotos e, desde a DIR-212, o preço
// declarado e o marketplace. Este arquivo é o lado da tela: valida o link,
// chama a rota, normaliza a resposta e busca fotos pelo nome quando a página
// não entregou nenhuma. NÃO importa o cliente da plataforma no topo de
// propósito (import dinâmico): as funções puras daqui rodam nos testes em Node.
//
// Só a tela da loja usa isto, por ordem do dono ("não mexa em nada além de
// adicionar essa opção na loja"). O leilão continua com o importador dele.

/** Os marketplaces que a tela mostra por nome (o servidor tem a mesma lista: api/_lib/fichaDaPagina.js). */
export const MARKETPLACES_CONHECIDOS = Object.freeze([
  { id: 'mercado_livre', nome: 'Mercado Livre', hosts: ['mercadolivre.com', 'mercadolivre.com.br', 'mercadolibre.com'] },
  { id: 'shopee', nome: 'Shopee', hosts: ['shopee.com.br', 'shopee.com', 'shp.ee'] },
  { id: 'magazine_luiza', nome: 'Magazine Luiza', hosts: ['magazineluiza.com.br', 'magalu.com', 'magazinevoce.com.br'] },
  { id: 'amazon', nome: 'Amazon', hosts: ['amazon.com.br', 'amazon.com', 'amzn.to'] },
  { id: 'americanas', nome: 'Americanas', hosts: ['americanas.com.br'] },
  { id: 'casas_bahia', nome: 'Casas Bahia', hosts: ['casasbahia.com.br'] },
  { id: 'aliexpress', nome: 'AliExpress', hosts: ['aliexpress.com', 'aliexpress.us'] },
  { id: 'temu', nome: 'Temu', hosts: ['temu.com'] },
  { id: 'shein', nome: 'Shein', hosts: ['shein.com'] },
  { id: 'kabum', nome: 'KaBuM!', hosts: ['kabum.com.br'] },
  { id: 'olx', nome: 'OLX', hosts: ['olx.com.br'] },
]);

/** http(s)://… com algo depois. */
export function linkValido(url) {
  return /^https?:\/\/[^\s/]+\.[^\s]+$/i.test(String(url || '').trim());
}

/** De qual marketplace é o link ({ id, nome }); desconhecido = { id: 'outro', nome: host }; inválido = null. */
export function marketplaceDoLink(url) {
  let host = '';
  try { host = new URL(String(url || '').trim()).hostname.toLowerCase().replace(/^www\./, ''); } catch { return null; }
  if (!host) return null;
  for (const m of MARKETPLACES_CONHECIDOS) if (m.hosts.some((d) => host === d || host.endsWith(`.${d}`))) return { id: m.id, nome: m.nome };
  return { id: 'outro', nome: host };
}

/** actor_id = quem está logado (a mesma leitura das outras telas). */
export function quemSouEu() {
  try { return JSON.parse(localStorage.getItem('currentUser') || 'null')?.id || null; } catch { return null; }
}

async function invocar(nome, corpo) {
  const { plataforma } = await import('@/api/plataformaClient');
  const r = await plataforma.functions.invoke(nome, corpo);
  return r?.data && typeof r.data === 'object' && !Array.isArray(r.data) ? r.data : r;
}

const soHttp = (lista) => (Array.isArray(lista) ? lista : []).filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u));

/**
 * Lê o anúncio pelo link. NUNCA lança: devolve { ok:false, erro } quando não dá.
 * @param {{url:string, titulo?:string, invoke?:Function}} p  `invoke` só nos testes
 */
export async function importarProdutoPorLink({ url, titulo = '', invoke = invocar } = {}) {
  const alvo = String(url || '').trim();
  if (!linkValido(alvo)) return { ok: false, erro: 'Cole o link completo do produto, começando com https://' };
  try {
    const d = await invoke('importarProdutoPeloLink', { actor_id: quemSouEu(), url: alvo, titulo: String(titulo || '').trim() });
    if (!d || typeof d !== 'object') return { ok: false, erro: 'Sem resposta do servidor.' };
    if (!d.ok) return { ok: false, erro: d.error || 'Não consegui importar pelo link.', detalhes: d.details || null, fotos: soHttp(d.fotos), marketplace: d.marketplace || marketplaceDoLink(alvo) };
    return {
      ok: true,
      titulo: String(d.titulo || '').trim(),
      descricao: String(d.descricao || '').trim(),
      marca: d.marca || null,
      modelo: d.modelo || null,
      medidas: d.medidas && typeof d.medidas === 'object' ? d.medidas : {},
      fotos: soHttp(d.fotos),
      preco: Number(d.preco) > 0 ? Number(d.preco) : null,
      moeda: d.moeda || null,
      fonte: d.fonte === 'pagina' ? 'pagina' : 'estimativa',
      confianca: d.confianca || 'baixa',
      avisos: Array.isArray(d.avisos) ? d.avisos : [],
      observacao: String(d.observacao || ''),
      marketplace: d.marketplace || marketplaceDoLink(alvo),
      pagina: d.pagina || null,
      titulo_de: d.titulo_de || null,
      needs_key: !!d.needs_key,
    };
  } catch (e) {
    return { ok: false, erro: e?.message || 'Erro ao importar pelo link.', marketplace: marketplaceDoLink(alvo) };
  }
}

/** Fotos pelo NOME (busca de imagens), para quando a página não entregou nenhuma. Nunca lança. */
export async function fotosPeloNome(nome, { max = 6, invoke = invocar } = {}) {
  const q = String(nome || '').trim();
  if (q.length < 3) return [];
  try {
    const d = await invoke('extractGoogleShoppingImages', { productName: q });
    return soHttp(d?.images).slice(0, max);
  } catch { return []; }
}

/** Uma frase para o toast/status: o que foi preenchido e quantas fotos vieram. */
export function resumoDaImportacao({ marketplace, preencheu = [], fotos = 0, falharam = 0, preco = null } = {}) {
  const partes = [
    preencheu.length ? `preencheu ${preencheu.join(', ')}` : 'nada novo para preencher (os campos já estavam cheios)',
    fotos ? `${fotos} foto(s) no nosso servidor` : 'nenhuma foto',
    falharam ? `${falharam} foto(s) não vieram` : '',
    preco ? `preço R$ ${Number(preco).toFixed(2).replace('.', ',')}` : '',
  ].filter(Boolean);
  return `Importado de ${marketplace?.nome || 'a página'}: ${partes.join(' · ')}.`;
}
