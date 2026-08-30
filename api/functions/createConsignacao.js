// createConsignacao — SOLICITAÇÃO de mercadoria consignada.
//
// Aqui NÃO sai mercadoria e NÃO nasce dívida: só nasce um pedido, que fica
// aguardando aprovação. A mercadoria só se move em aprovarConsignacao.
//
// Guarda de cargo (regra oficial): Ponto de Retirada, Lojista e Distribuidor
// sempre podem; Vendedor, Licenciado e Parceiro só se forem EXECUTIVOS.
import { oid } from '../_lib/oid.js';
import { podeReceberConsignado, podeEnviarConsignado, PRAZO_CONSIGNADO_DIAS } from '../_lib/consignadoElegibilidade.js';
import { acertoConsignadoUnitario } from '../_lib/custoProduto.js';
import { exigirSessao } from '../_lib/sessao.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const actorId = String(body?.actorId || '').trim();
    // 🔐 CRACHÁ DE SESSÃO — ETAPA 1 (só anota no log). Ver api/_lib/sessao.js.
    // Enquanto SESSAO_MODO não for 'bloquear', isto NUNCA recusa ninguém:
    // serve pra mostrar, com tráfego real, se sobrou tela sem mandar o crachá.
    const _ses = exigirSessao(req, actorId, 'createConsignacao');
    if (!_ses.liberado) return res.status(_ses.http).json({ success: false, error: 'nao_autenticado' });
    const ownerId = String(body?.owner_id || actorId).trim();   // quem vai ficar com a mercadoria
    const items = Array.isArray(body?.items) ? body.items : [];
    if (!actorId || !items.length) return res.status(400).json({ success: false, error: 'Informe quem está pedindo e os itens' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    const campos = 'id,full_name,role,career_levels,primary_career_level,active';
    const actorResp = await sb(`app_users?select=${campos}&id=eq.${encodeURIComponent(actorId)}&limit=1`);
    const actorArr = await actorResp.json();
    // 🐛 CAUSA-RAIZ (13/08/2026): quando a consulta ao Supabase falhava por qualquer
    // motivo (erro de config, conexão, etc.), a resposta virava um objeto de erro (não
    // array) e o código tratava isso como "usuário não encontrado" — todo mundo via
    // "Usuário inválido" mesmo quando o problema era outro. Agora cada caso tem sua
    // própria mensagem, pra dar pra diagnosticar sem adivinhar.
    if (!actorResp.ok || !Array.isArray(actorArr)) {
      return res.status(200).json({ success: false, error: 'Não foi possível validar seu usuário agora. Tente novamente em alguns segundos.', details: String(actorArr?.message || actorArr?.hint || '').slice(0, 200) });
    }
    const actor = actorArr[0] || null;
    if (!actor) return res.status(403).json({ success: false, error: 'Sua conta não foi encontrada no cadastro. Saia e entre novamente; se persistir, avise o suporte.' });
    if (actor.active === false) return res.status(403).json({ success: false, error: 'Sua conta está inativa. Fale com o suporte.' });

    // pedir para OUTRA pessoa só quem envia (admin / distribuidor)
    if (ownerId !== actorId && !podeEnviarConsignado(actor)) {
      return res.status(403).json({ success: false, error: 'Você não pode pedir consignado em nome de outra pessoa.' });
    }

    let owner = actor;
    if (ownerId !== actorId) {
      const oArr = await (await sb(`app_users?select=${campos}&id=eq.${encodeURIComponent(ownerId)}&limit=1`)).json();
      owner = Array.isArray(oArr) ? oArr[0] : null;
      if (!owner) return res.status(404).json({ success: false, error: 'Destinatário não encontrado' });
    }

    const elegivel = podeReceberConsignado(owner);
    if (!elegivel.ok) return res.status(200).json({ success: false, error: elegivel.motivo });

    // 🚧 TRAVA: quem tem consignação VENCIDA em aberto não leva mais mercadoria
    const vencidas = await (await sb(
      `consignacoes?select=id&owner_id=eq.${encodeURIComponent(ownerId)}&status=eq.aprovada&prazo_em=lt.${new Date().toISOString()}&limit=1`
    )).json();
    if (Array.isArray(vencidas) && vencidas.length) {
      return res.status(200).json({ success: false, error: 'Você tem consignado vencido em aberto. Acerte ou devolva antes de pedir mais mercadoria.' });
    }
    // 🚧 TRAVA: pedido em análise não pode virar fila
    const pendentes = await (await sb(`consignacoes?select=id&owner_id=eq.${encodeURIComponent(ownerId)}&status=eq.pendente&limit=1`)).json();
    if (Array.isArray(pendentes) && pendentes.length) {
      return res.status(200).json({ success: false, error: 'Você já tem um pedido de consignado em análise. Aguarde a resposta.' });
    }

    // custo do consignado = preço de custo da casa (o mesmo do estoque central)
    const ids = [...new Set(items.map((i) => String(i.product_id || '')).filter(Boolean))];
    if (!ids.length) return res.status(400).json({ success: false, error: 'Itens inválidos' });
    const inList = ids.map((i) => `"${encodeURIComponent(i)}"`).join(',');
    const prods = await (await sb(`products?select=id,description,price_catalog,cost_price,quantity,quantity_sold,selling_price_wholesale,qty_perfeito,qty_bom,qty_oficina,qty_ruim&id=in.(${inList})`)).json();
    const pmap = {}; (Array.isArray(prods) ? prods : []).forEach((p) => { pmap[p.id] = p; });

    const linhas = []; let valorTotal = 0;
    for (const it of items) {
      const p = pmap[String(it.product_id)];
      if (!p) continue;
      const qty = Math.max(1, Number(it.quantity || it.qty) || 1);
      if ((Number(p.quantity) || 0) < qty) {
        return res.status(200).json({ success: false, error: `Estoque insuficiente de "${String(p.description || '').slice(0, 40)}" (tem ${Number(p.quantity) || 0}).` });
      }
      // 🔴 DIR-19 — regra de mercado: acerto POR UNIDADE (atacado, ou custo
      // unitário da casa, ou catálogo como último recurso). Antes usava
      // cost_price cru, que é o custo do LOTE inteiro — num lote de 9 peças a
      // R$ 2.296, o lojista era debitado R$ 2.296 POR PEÇA em vez de R$ 255.
      // Ver api/_lib/custoProduto.js.
      const custo = round2(acertoConsignadoUnitario(p));
      valorTotal = round2(valorTotal + custo * qty);
      linhas.push({ product_id: p.id, title: String(p.description || '').slice(0, 200), qty, custo_unitario: custo, preco_venda: round2(p.price_catalog || 0) });
    }
    if (!linhas.length) return res.status(400).json({ success: false, error: 'Nenhum produto válido' });

    const id = oid();
    const ins = await sb('consignacoes', {
      method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        id, owner_id: ownerId, owner_nome: owner.full_name || null, solicitado_por: actorId,
        status: 'pendente', itens_json: linhas, valor_total: valorTotal,
        prazo_dias: PRAZO_CONSIGNADO_DIAS, created_at: new Date().toISOString(),
      }),
    });
    if (!ins.ok) { const t = await ins.text(); return res.status(200).json({ success: false, error: 'Falha ao registrar o pedido', details: t.slice(0, 200) }); }

    return res.status(200).json({
      success: true, consignacao_id: id, valor_total: valorTotal, itens: linhas.length,
      prazo_dias: PRAZO_CONSIGNADO_DIAS,
      mensagem: `Pedido enviado para aprovação. Se aprovado, você terá ${PRAZO_CONSIGNADO_DIAS} dias para vender ou devolver.`,
    });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro ao pedir consignado', details: String(e?.message || e) });
  }
}