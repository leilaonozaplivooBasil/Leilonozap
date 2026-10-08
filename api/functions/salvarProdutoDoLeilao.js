// salvarProdutoDoLeilao — o produto por trás de um leilão: ler e gravar peso,
// medidas, vídeo e observações (service_role). Ações: 'ler' | 'salvar'.
//
// 📦 DIR-207 (08/10/2026) — "caso eu não importe, tem que ter o espaço manual".
// O editor do leilão não tinha onde gravar medida: o leilão aponta para um
// produto (auctions.product_id) e é o PRODUTO que o frete lê
// (products.peso/altura/largura/comprimento). Quando o leilão foi criado sem
// produto, esta rota cria um — senão a medida não teria onde morar e o frete
// seguiria cotando a caixa padrão de 0,3 kg.
//
// A régua do que é medida válida é UMA (src/lib/medidasDoProduto.js): fora da
// faixa a rota RECUSA com aviso em vez de gravar número errado; vazio é null
// ("não informado"), nunca 0 — para o frete, 0 e null são a mesma caixa padrão.
//
// 🎬 Vídeo: a mesma coluna products.video_urls da gestão de estoque, pela mesma
// lista branca (videosValidos). 'ler' devolve o que está gravado — o editor
// precisa mostrar o vídeo que já existe, não só aceitar um novo.
import { oid } from '../_lib/oid.js';
import { exigirSessao } from '../_lib/sessao.js';
import { normalizarMedidas, CAMPOS_MEDIDA, ORIGENS_MEDIDA } from '../../src/lib/medidasDoProduto.js';
import { videosValidos, entenderVideo } from '../../src/lib/videoDoProduto.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STOCK = ['distribuidor', 'loja_fisica', 'ponto_retirada'];

const COLUNAS_PRODUTO = 'id,description,notes,image_urls,video_urls,peso,altura,largura,comprimento,medidas_origem,medidas_em,source_url';
const COLUNAS_LEILAO = 'id,title,description,image_urls,product_id,product_source,source_url';

/** Vazio de verdade: null, undefined e '' são a mesma coisa pro nosso uso. */
const vazio = (v) => v === null || v === undefined || v === '';

/**
 * Quais campos NÃO voltaram do banco com o valor que a gente mandou — a mesma
 * conferência de productAdminAction ("salvou mas não salvou", 08/09/2026).
 * Só escalares; lista/objeto e os carimbos de data ficam de fora.
 */
export function camposQueNaoGravaram(patch, linha) {
  const fora = [];
  for (const campo of Object.keys(patch || {})) {
    if (['updated_date', 'updated_at', 'created_date', 'created_at', 'medidas_em'].includes(campo)) continue;
    const pedido = patch[campo];
    if (pedido !== null && typeof pedido === 'object') continue;
    const veio = (linha || {})[campo];
    if (vazio(pedido) && vazio(veio)) continue;
    if (vazio(pedido) !== vazio(veio)) { fora.push(campo); continue; }
    const a = Number(pedido), b = Number(veio);
    if (Number.isFinite(a) && Number.isFinite(b)) { if (a !== b) fora.push(campo); continue; }
    if (String(pedido) !== String(veio)) fora.push(campo);
  }
  return fora;
}

/** Alguma das quatro medidas mudou? (null × null não é mudança; 68 × "68" também não) */
export function medidasMudaram(antes, depois) {
  return CAMPOS_MEDIDA.some((c) => {
    const a = vazio(antes?.[c]) ? null : Number(antes[c]);
    const b = vazio(depois?.[c]) ? null : Number(depois[c]);
    return a !== b;
  });
}

const produtoDaLinha = (p) => (p ? {
  id: p.id, description: p.description ?? null, notes: p.notes ?? null,
  image_urls: Array.isArray(p.image_urls) ? p.image_urls : [],
  video_urls: Array.isArray(p.video_urls) ? p.video_urls : [],
  peso: p.peso ?? null, altura: p.altura ?? null, largura: p.largura ?? null, comprimento: p.comprimento ?? null,
  medidas_origem: p.medidas_origem ?? null, medidas_em: p.medidas_em ?? null, source_url: p.source_url ?? null,
} : null);

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}
async function umaLinha(path) {
  const r = await sb(path);
  // 🔴 08/10/2026 DIR-207 — leitura que FALHA não é "não existe". Se a consulta
  // em products voltasse 400 (coluna ausente, PostgREST fora) e isto devolvesse
  // null, a rota concluiria "leilão sem produto", CRIARIA um produto novo e
  // apontaria auctions.product_id para ele — perdendo o vínculo com o produto
  // de verdade, o que guarda o vídeo que o dono reclamou que sumia. Lançar aqui
  // cai no catch do handler e vira {ok:false}: ninguém grava nada por engano.
  if (!r.ok) throw new Error(`leitura falhou (${r.status}) em ${path.split('?')[0]}`);
  const arr = await r.json();
  return Array.isArray(arr) ? arr[0] || null : arr || null;
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const actorId = String(body?.actor_id || body?.actorId || '').trim();
    const _ses = exigirSessao(req, actorId, 'salvarProdutoDoLeilao');
    if (!_ses.liberado) return res.status(_ses.http).json({ ok: false, error: 'nao_autenticado' });
    const auctionId = String(body?.auction_id || '').trim();
    const acao = String(body?.acao || '').trim();
    if (!actorId || !auctionId || !['ler', 'salvar'].includes(acao)) return res.status(400).json({ ok: false, error: 'actor_id, auction_id e acao (ler|salvar) obrigatórios' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ ok: false, error: 'Config ausente' });

    // guard — o mesmo do productAdminAction: admin/super_admin ou cargo de estoque
    const actor = await umaLinha(`app_users?select=id,role,career_levels&id=eq.${encodeURIComponent(actorId)}&limit=1`);
    const podeEstoque = actor && (['admin', 'super_admin'].includes(actor.role) || (Array.isArray(actor.career_levels) && actor.career_levels.some((c) => STOCK.includes(c))));
    if (!podeEstoque) return res.status(403).json({ ok: false, error: 'Sem permissão' });

    const auction = await umaLinha(`auctions?select=${COLUNAS_LEILAO}&id=eq.${encodeURIComponent(auctionId)}&limit=1`);
    if (!auction) return res.status(200).json({ ok: false, error: 'Leilão não encontrado' });
    const productId = auction.product_id ? String(auction.product_id) : null;
    const atual = productId ? await umaLinha(`products?select=${COLUNAS_PRODUTO}&id=eq.${encodeURIComponent(productId)}&limit=1`) : null;

    if (acao === 'ler') {
      return res.status(200).json({ ok: true, product_id: atual ? productId : null, produto: produtoDaLinha(atual) });
    }

    // ── salvar ──
    const now = new Date().toISOString();
    const patch = {};
    const avisos = [];

    if (body?.medidas && typeof body.medidas === 'object') {
      const { valores, avisos: foraDaFaixa } = normalizarMedidas(body.medidas);
      // Fora da faixa NÃO grava: devolver "salvo" com o número errado seria o bug antigo em outra roupa.
      if (foraDaFaixa.length) return res.status(200).json({ ok: false, error: 'Medida fora da faixa — nada foi salvo', avisos: foraDaFaixa });
      Object.assign(patch, valores);
      const todasVazias = CAMPOS_MEDIDA.every((c) => valores[c] === null);
      const origem = String(body?.medidas_origem || 'manual');
      if (!Object.keys(ORIGENS_MEDIDA).includes(origem)) return res.status(200).json({ ok: false, error: `medidas_origem inválida: ${origem}`, avisos: [`Origem aceita: ${Object.keys(ORIGENS_MEDIDA).join(' | ')}`] });
      patch.medidas_origem = todasVazias ? null : origem;
      if (medidasMudaram(atual, valores)) patch.medidas_em = now;
    }
    if (Array.isArray(body?.video_urls)) {
      const validos = videosValidos(body.video_urls);
      const recusados = body.video_urls.filter((v) => typeof v === 'string' && v.trim() && !entenderVideo(v).ok).length;
      if (recusados > 0) avisos.push(`${recusados} link(s) de vídeo recusado(s): só YouTube, Vimeo ou arquivo nosso.`);
      patch.video_urls = validos;
    }
    if (body?.notes !== undefined) patch.notes = body.notes === null ? null : String(body.notes);

    let criado = false;
    let linha;
    if (atual) {
      if (!Object.keys(patch).length) return res.status(200).json({ ok: true, product_id: productId, criado: false, produto: produtoDaLinha(atual), avisos: ['Nada para salvar.'] });
      patch.updated_date = now; patch.updated_at = now;
      const r = await sb(`products?id=eq.${encodeURIComponent(productId)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(patch) });
      if (!r.ok) { const t = await r.text(); return res.status(200).json({ ok: false, error: 'Falha ao atualizar o produto', details: t.slice(0, 200) }); }
      let linhas = []; try { linhas = await r.json(); } catch { linhas = []; }
      linha = Array.isArray(linhas) ? linhas[0] : linhas;
      if (!linha) return res.status(200).json({ ok: false, error: 'Nada foi salvo: o produto não foi encontrado (0 linhas afetadas)' });
    } else {
      // O leilão não tem produto: cria um, com o que o leilão já sabe, e amarra os dois.
      const id = oid();
      const row = {
        id, base44_id: id,
        description: auction.title || 'Produto do leilão',
        notes: patch.notes !== undefined ? patch.notes : (auction.description ?? null),
        image_urls: Array.isArray(auction.image_urls) ? auction.image_urls : [],
        video_urls: patch.video_urls || [],
        peso: patch.peso ?? null, altura: patch.altura ?? null, largura: patch.largura ?? null, comprimento: patch.comprimento ?? null,
        medidas_origem: patch.medidas_origem ?? null,
        medidas_em: patch.medidas_em ?? null,
        quantity: 1, status: 'ESTOQUE', catalog_active: false,
        product_source: auction.product_source ?? null,
        source_url: auction.source_url ?? null,
        linked_auctions: [auctionId],
        created_date: now, updated_date: now, created_at: now, updated_at: now,
      };
      const r = await sb('products', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) });
      if (!r.ok) { const t = await r.text(); return res.status(200).json({ ok: false, error: 'Falha ao criar o produto', details: t.slice(0, 200) }); }
      let linhas = []; try { linhas = await r.json(); } catch { linhas = []; }
      linha = Array.isArray(linhas) ? linhas[0] : linhas;
      if (!linha) return res.status(200).json({ ok: false, error: 'Nada foi salvo: o banco não devolveu o produto criado' });
      criado = true;
      const ra = await sb(`auctions?id=eq.${encodeURIComponent(auctionId)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ product_id: id }) });
      let la = []; try { la = await ra.json(); } catch { la = []; }
      const leilao = Array.isArray(la) ? la[0] : la;
      if (!ra.ok || String(leilao?.product_id || '') !== id) {
        return res.status(200).json({ ok: false, error: 'Produto criado, mas o leilão não ficou amarrado a ele (auctions.product_id)', product_id: id, criado: true, produto: produtoDaLinha(linha) });
      }
    }

    // Confere o que gravou, relendo o que o banco devolveu (padrão "salvou mas não salvou").
    const conferir = criado
      ? { peso: patch.peso ?? null, altura: patch.altura ?? null, largura: patch.largura ?? null, comprimento: patch.comprimento ?? null, medidas_origem: patch.medidas_origem ?? null, ...(patch.notes !== undefined ? { notes: patch.notes } : {}) }
      : patch;
    const naoGravaram = camposQueNaoGravaram(conferir, linha);
    if (naoGravaram.length) {
      return res.status(200).json({ ok: false, error: `Nada foi salvo em: ${naoGravaram.join(', ')}`, campos_nao_gravados: naoGravaram, product_id: linha.id, criado });
    }
    console.log('[salvarProdutoDoLeilao]', { auction_id: auctionId, product_id: linha.id, criado, campos: Object.keys(patch) });
    return res.status(200).json({ ok: true, product_id: linha.id, criado, produto: produtoDaLinha(linha), avisos });
  } catch (e) {
    console.error('[salvarProdutoDoLeilao] erro', String(e?.message || e));
    return res.status(200).json({ ok: false, error: 'Erro ao salvar o produto do leilão', details: String(e?.message || e).slice(0, 300) });
  }
}
