// 📝 DESCRIÇÕES EM LOTE — a IA escreve RASCUNHO, o dono aprova (10/10/2026).
//
// POST { action, actorId, ... }   (só admin; crachá conferido como nas outras rotas)
//   fila     { alvo: 'produtos'|'leiloes' }  → quem precisa de descrição + contagem por nível
//   gerar    { alvo, id, semRascunho? }      → UM item: lê nome+fotos+dados, grava RASCUNHO
//                                              (semRascunho: só devolve o texto — botão dentro do Editar)
//   rascunhos{ alvo }                        → rascunhos abertos (para revisar)
//   aprovar  { ids: [...], textos?: {id: texto editado} } → grava no produto/leilão (guarda o anterior)
//   rejeitar { ids: [...] }
//   desfazer { id }                          → devolve o texto anterior
//
// 🔴 O QUE PROTEGE O CLIENTE (regras em src/lib/descricaoDoProduto.js):
//   • a IA só recebe fatos do cadastro + fotos, e é proibida de inventar característica;
//   • o texto passa por `validarDescricaoGerada` ANTES de virar rascunho (preço, frete, garantia,
//     link, origem interna, "lacrado" chutado → recusa);
//   • NADA vai à vitrine sem `aprovar`; o texto anterior fica guardado e `desfazer` o devolve;
//   • só toca produto/leilão cuja descrição ainda é a que o rascunho viu (se alguém editou no
//     meio, a aprovação recusa em vez de pisar no trabalho da pessoa).
//   • produto: o texto vai em `notes` (é o que a página de venda exibe; `description` é o NOME).
//     leilão: vai em `description`.
import { exigirSessao } from '../_lib/sessao.js';
import { clienteIA, opcoesDeReserva, detalhesDoErro } from '../_lib/ia.js';
import { resolverIADeVisao } from './tiraDuvidas.js';
import {
  nivelDaDescricao, fatosDoProduto, SISTEMA, mensagemDoUsuario, validarDescricaoGerada, validarTextoEditado, paraGravar, textoSemHtml,
} from '../../src/lib/descricaoDoProduto.js';

export const config = { maxDuration: 60 };

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAX_FOTOS = 3;

const sb = (caminho, opts = {}) => fetch(`${SUPABASE_URL}/rest/v1/${caminho}`, {
  ...opts,
  headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  signal: AbortSignal.timeout(20000),
});
const q = encodeURIComponent;
const lista = async (r) => { const j = await r.json().catch(() => null); return Array.isArray(j) ? j : []; };

const COLS_PRODUTO = 'id,description,notes,catalog_active,quantity,image_urls,condicao,estado_conservacao,peso,altura,largura,comprimento,product_source,created_date';
const COLS_LEILAO = 'id,title,description,status,image_urls,product_id,end_time,product_source';

const fotosDe = (v) => (Array.isArray(v) ? v : []).filter((u) => typeof u === 'string' && /^https?:\/\//.test(u)).slice(0, MAX_FOTOS);

/** Normaliza produto/leilão para o mesmo formato. */
function item(alvo, r, produto = null) {
  if (alvo === 'produto') {
    return { id: r.id, nome: r.description || '', atual: r.notes || '', fotos: fotosDe(r.image_urls), dados: r };
  }
  const p = produto || {};
  return {
    id: r.id, nome: r.title || '', atual: r.description || '',
    fotos: fotosDe(r.image_urls).length ? fotosDe(r.image_urls) : fotosDe(p.image_urls),
    dados: { ...p, product_source: r.product_source || p.product_source },
  };
}

async function carregar(alvo, id) {
  if (alvo === 'produto') {
    const [r] = await lista(await sb(`products?select=${COLS_PRODUTO}&id=eq.${q(id)}&limit=1`));
    return r ? item('produto', r) : null;
  }
  const [a] = await lista(await sb(`auctions?select=${COLS_LEILAO}&id=eq.${q(id)}&limit=1`));
  if (!a) return null;
  let p = null;
  if (a.product_id) [p] = await lista(await sb(`products?select=${COLS_PRODUTO}&id=eq.${q(a.product_id)}&limit=1`));
  return item('leilao', a, p);
}

const fatosDoItem = (alvo, it) => fatosDoProduto({
  nome: it.nome,
  condicao: it.dados?.condicao, estado_conservacao: it.dados?.estado_conservacao,
  // observação humana do PRODUTO entra como fato; a descrição atual do leilão NÃO entra (é o que estamos refazendo)
  notes: it.dados?.notes,
  peso: it.dados?.peso, comprimento: it.dados?.comprimento, largura: it.dados?.largura, altura: it.dados?.altura,
  origem: it.dados?.product_source,
});

const alvoValido = (a) => (a === 'produtos' || a === 'produto' ? 'produto' : a === 'leiloes' || a === 'leilao' ? 'leilao' : null);

async function admin(req, body) {
  const actorId = String(body?.actorId || '').trim();
  const s = exigirSessao(req, actorId, 'descricoesEmLote');
  if (!s.liberado) return { erro: [s.http, 'nao_autenticado'] };
  if (!actorId) return { erro: [400, 'actorId obrigatório'] };
  const [u] = await lista(await sb(`app_users?select=id,role&id=eq.${q(actorId)}&limit=1`));
  if (!u || !['admin', 'super_admin'].includes(u.role)) return { erro: [403, 'Sem permissão'] };
  return { actorId };
}

async function acaoFila(alvo) {
  const abertos = new Set((await lista(await sb(`descricoes_sugeridas?select=alvo_id&alvo=eq.${alvo}&status=eq.rascunho&limit=2000`))).map((r) => r.alvo_id));
  let itens;
  if (alvo === 'produto') {
    const rs = await lista(await sb(`products?select=${COLS_PRODUTO}&catalog_active=is.true&order=created_date.desc&limit=1000`));
    itens = rs.map((r) => item('produto', r));
  } else {
    const rs = await lista(await sb(`auctions?select=${COLS_LEILAO}&status=in.(active,scheduled)&order=end_time.asc&limit=500`));
    itens = rs.map((r) => item('leilao', r));
  }
  const contagem = { vazia: 0, interna: 0, so_o_nome: 0, curta: 0, boa: 0 };
  const fila = [];
  for (const it of itens) {
    const nivel = nivelDaDescricao(it.atual, it.nome);
    contagem[nivel] += 1;
    if (nivel === 'boa') continue;
    fila.push({
      id: it.id, nome: it.nome, nivel, fotos: it.fotos.length, tem_rascunho: abertos.has(it.id),
      em_estoque: alvo === 'produto' ? Number(it.dados?.quantity) > 0 : true,
    });
  }
  // quem está à venda vem primeiro
  fila.sort((a, b) => Number(b.em_estoque) - Number(a.em_estoque));
  return { ok: true, total: itens.length, contagem, fila };
}

async function acaoGerar(alvo, id, actorId, semRascunho = false) {
  const ia = await resolverIADeVisao();
  if (!ia) return { ok: false, motivo: 'ia_indisponivel' };
  const it = await carregar(alvo, id);
  if (!it) return { ok: false, motivo: 'nao_encontrado' };
  const nivelAntes = nivelDaDescricao(it.atual, it.nome);
  const fatos = fatosDoItem(alvo, it);
  if (!it.nome.trim()) return { ok: false, motivo: 'sem_nome' };

  const conteudo = [
    ...it.fotos.map((u) => ({ type: 'image', source: { type: 'url', url: u } })),
    { type: 'text', text: mensagemDoUsuario(fatos) },
  ];
  let resposta;
  try {
    resposta = await clienteIA(ia, { timeout: 45_000 }).messages.create({
      model: ia.model, max_tokens: 700, system: SISTEMA,
      messages: [{ role: 'user', content: conteudo }],
      ...opcoesDeReserva(ia),
    });
  } catch (e) {
    const d = detalhesDoErro(e);
    console.error('[descricoesEmLote] IA falhou', { via: ia.via, model: ia.model, ...d });
    return { ok: false, motivo: 'ia_falhou' };
  }
  const texto = (resposta?.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  const v = validarDescricaoGerada(texto, { condicao: it.dados?.condicao });
  if (!v.ok) return { ok: false, motivo: v.motivo, recusado: v.texto?.slice(0, 300) };

  // "Gerar com IA" dentro do Editar: devolve só o texto para a tela (o dono ainda aperta Salvar)
  if (semRascunho) return { ok: true, texto: paraGravar(v.texto), fotos: it.fotos.length };

  // um rascunho aberto por item: gerar de novo SUBSTITUI
  await sb(`descricoes_sugeridas?alvo=eq.${alvo}&alvo_id=eq.${q(id)}&status=eq.rascunho`, { method: 'DELETE' });
  const r = await sb('descricoes_sugeridas', {
    method: 'POST', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      alvo, alvo_id: id, nome: it.nome, texto_novo: paraGravar(v.texto), texto_anterior: it.atual || '',
      nivel_anterior: nivelAntes, fotos_usadas: it.fotos.length, criado_por: actorId,
    }),
  });
  const [linha] = await lista(r);
  if (!linha) return { ok: false, motivo: 'nao_gravou' };
  return { ok: true, rascunho: { id: linha.id, alvo_id: id, nome: it.nome, texto: linha.texto_novo, anterior: linha.texto_anterior, nivel_anterior: nivelAntes, fotos: it.fotos.length } };
}

async function acaoRascunhos(alvo) {
  const rs = await lista(await sb(`descricoes_sugeridas?select=*&alvo=eq.${alvo}&status=eq.rascunho&order=criado_em.desc&limit=500`));
  return { ok: true, rascunhos: rs.map((r) => ({ id: r.id, alvo_id: r.alvo_id, nome: r.nome, texto: r.texto_novo, anterior: textoSemHtml(r.texto_anterior), nivel_anterior: r.nivel_anterior, fotos: r.fotos_usadas })) };
}

async function acaoAprovar(ids, textos, actorId) {
  const resultado = [];
  for (const id of ids) {
    const [d] = await lista(await sb(`descricoes_sugeridas?select=*&id=eq.${q(id)}&status=eq.rascunho&limit=1`));
    if (!d) { resultado.push({ id, ok: false, motivo: 'nao_e_rascunho' }); continue; }
    const editado = typeof textos?.[id] === 'string' ? paraGravar(textos[id]) : '';
    const texto = editado || d.texto_novo;
    if (editado) {
      // texto editado por gente: tamanho e estilo são do dono; erro/HTML/promessa continuam barrados
      const v = validarTextoEditado(editado);
      if (!v.ok) { resultado.push({ id, ok: false, motivo: v.motivo }); continue; }
    }
    const tabela = d.alvo === 'produto' ? 'products' : 'auctions';
    const coluna = d.alvo === 'produto' ? 'notes' : 'description';
    // não pisa em edição feita depois do rascunho
    const [atual] = await lista(await sb(`${tabela}?select=id,${coluna}&id=eq.${q(d.alvo_id)}&limit=1`));
    if (!atual) { resultado.push({ id, ok: false, motivo: 'item_sumiu' }); continue; }
    if (String(atual[coluna] || '') !== String(d.texto_anterior || '')) { resultado.push({ id, ok: false, motivo: 'mudou_depois_do_rascunho' }); continue; }
    const agora = new Date().toISOString();
    const w = await sb(`${tabela}?id=eq.${q(d.alvo_id)}`, { method: 'PATCH', body: JSON.stringify({ [coluna]: texto, updated_date: agora }) });
    if (!w.ok) { resultado.push({ id, ok: false, motivo: 'nao_gravou' }); continue; }
    await sb(`descricoes_sugeridas?id=eq.${q(id)}`, { method: 'PATCH', body: JSON.stringify({ status: 'aprovada', texto_novo: texto, decidido_por: actorId, decidido_em: agora }) });
    resultado.push({ id, ok: true });
  }
  return { ok: true, resultado };
}

async function acaoRejeitar(ids, actorId) {
  const agora = new Date().toISOString();
  for (const id of ids) {
    await sb(`descricoes_sugeridas?id=eq.${q(id)}&status=eq.rascunho`, { method: 'PATCH', body: JSON.stringify({ status: 'rejeitada', decidido_por: actorId, decidido_em: agora }) });
  }
  return { ok: true };
}

async function acaoDesfazer(id, actorId) {
  const [d] = await lista(await sb(`descricoes_sugeridas?select=*&id=eq.${q(id)}&status=eq.aprovada&limit=1`));
  if (!d) return { ok: false, motivo: 'nao_aprovada' };
  const tabela = d.alvo === 'produto' ? 'products' : 'auctions';
  const coluna = d.alvo === 'produto' ? 'notes' : 'description';
  const agora = new Date().toISOString();
  const w = await sb(`${tabela}?id=eq.${q(d.alvo_id)}`, { method: 'PATCH', body: JSON.stringify({ [coluna]: d.texto_anterior || '', updated_date: agora }) });
  if (!w.ok) return { ok: false, motivo: 'nao_gravou' };
  await sb(`descricoes_sugeridas?id=eq.${q(id)}`, { method: 'PATCH', body: JSON.stringify({ status: 'desfeita', decidido_por: actorId, decidido_em: agora }) });
  return { ok: true };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método não permitido' });
  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    if (!SUPABASE_URL || !SR) return res.status(500).json({ ok: false, error: 'Config ausente' });
    const a = await admin(req, body);
    if (a.erro) return res.status(a.erro[0]).json({ ok: false, error: a.erro[1] });

    const action = String(body?.action || '');
    const alvo = alvoValido(body?.alvo);
    const ids = (Array.isArray(body?.ids) ? body.ids : []).map(String).filter(Boolean).slice(0, 200);

    if (action === 'fila' && alvo) return res.status(200).json(await acaoFila(alvo));
    if (action === 'rascunhos' && alvo) return res.status(200).json(await acaoRascunhos(alvo));
    if (action === 'gerar' && alvo && body?.id) return res.status(200).json(await acaoGerar(alvo, String(body.id), a.actorId, body?.semRascunho === true));
    if (action === 'aprovar' && ids.length) return res.status(200).json(await acaoAprovar(ids, body?.textos || {}, a.actorId));
    if (action === 'rejeitar' && ids.length) return res.status(200).json(await acaoRejeitar(ids, a.actorId));
    if (action === 'desfazer' && body?.id) return res.status(200).json(await acaoDesfazer(String(body.id), a.actorId));
    return res.status(400).json({ ok: false, error: 'ação inválida' });
  } catch (e) {
    console.error('[descricoesEmLote] erro', String(e?.message || e));
    return res.status(200).json({ ok: false, motivo: 'erro' });
  }
}
