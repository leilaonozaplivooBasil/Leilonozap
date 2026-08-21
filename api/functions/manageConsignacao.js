// manageConsignacao — aprovar, recusar, devolver e listar consignações.
//
// APROVAR é o único momento em que a mercadoria realmente sai do estoque central
// e entra na mão de alguém — junto com a dívida e o prazo de 60 dias.
// DEVOLVER faz o caminho de volta: o que não vendeu volta pro central e a dívida
// daquele saldo morre.
import { oid } from '../_lib/oid.js';
import { podeEnviarConsignado, PRAZO_CONSIGNADO_DIAS } from '../_lib/consignadoElegibilidade.js';
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

async function somarDivida(ownerId, delta) {
  const uArr = await (await sb(`app_users?select=id,divida_consignado&id=eq.${encodeURIComponent(ownerId)}&limit=1`)).json();
  const atual = round2(Array.isArray(uArr) && uArr[0] ? uArr[0].divida_consignado : 0);
  await sb(`app_users?id=eq.${encodeURIComponent(ownerId)}`, {
    method: 'PATCH', headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ divida_consignado: round2(Math.max(0, atual + delta)) }),
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
    const _ses = exigirSessao(req, actorId, 'manageConsignacao');
    if (!_ses.liberado) return res.status(_ses.http).json({ success: false, error: 'nao_autenticado' });
    const action = String(body?.action || '').trim();
    if (!actorId || !action) return res.status(400).json({ success: false, error: 'Ação inválida' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    const aResp = await sb(`app_users?select=id,full_name,role,career_levels,primary_career_level&id=eq.${encodeURIComponent(actorId)}&limit=1`);
    const aArr = await aResp.json();
    // 🐛 mesma causa-raiz do createConsignacao: erro de consulta virava "usuário inválido" genérico
    if (!aResp.ok || !Array.isArray(aArr)) {
      return res.status(200).json({ success: false, error: 'Não foi possível validar seu usuário agora. Tente novamente em alguns segundos.', details: String(aArr?.message || aArr?.hint || '').slice(0, 200) });
    }
    const actor = aArr[0] || null;
    if (!actor) return res.status(403).json({ success: false, error: 'Sua conta não foi encontrada no cadastro. Saia e entre novamente; se persistir, avise o suporte.' });
    const gestor = podeEnviarConsignado(actor);

    // ───────── LISTAR ─────────
    if (action === 'list') {
      const escopo = String(body?.escopo || 'meu'); // meu | todos
      if (escopo === 'todos' && !gestor) return res.status(403).json({ success: false, error: 'Sem permissão' });
      const filtro = escopo === 'todos'
        ? (body?.status ? `status=eq.${encodeURIComponent(body.status)}&` : '')
        : `owner_id=eq.${encodeURIComponent(actorId)}&`;
      const lista = await (await sb(`consignacoes?select=*&${filtro}order=created_at.desc&limit=200`)).json();
      return res.status(200).json({ success: true, consignacoes: Array.isArray(lista) ? lista : [] });
    }

    const consignacaoId = String(body?.consignacao_id || '').trim();
    if (!consignacaoId) return res.status(400).json({ success: false, error: 'Consignação não informada' });
    const cArr = await (await sb(`consignacoes?select=*&id=eq.${encodeURIComponent(consignacaoId)}&limit=1`)).json();
    const cons = Array.isArray(cArr) ? cArr[0] : null;
    if (!cons) return res.status(404).json({ success: false, error: 'Consignação não encontrada' });

    // ───────── RECUSAR ─────────
    if (action === 'recusar') {
      if (!gestor) return res.status(403).json({ success: false, error: 'Sem permissão para recusar' });
      if (cons.status !== 'pendente') return res.status(200).json({ success: false, error: 'Este pedido já foi respondido.' });
      await sb(`consignacoes?id=eq.${encodeURIComponent(consignacaoId)}&status=eq.pendente`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'recusada', aprovado_por: actorId, motivo_recusa: String(body?.motivo || '').slice(0, 300), encerrada_em: new Date().toISOString() }),
      });
      return res.status(200).json({ success: true, status: 'recusada' });
    }

    // ───────── APROVAR (mercadoria sai de verdade) ─────────
    if (action === 'aprovar') {
      if (!gestor) return res.status(403).json({ success: false, error: 'Sem permissão para aprovar' });

      // 🔒 flip atômico: só UMA aprovação passa, mesmo com dois cliques ou duas abas
      const now = new Date().toISOString();
      const prazoEm = new Date(Date.now() + (Number(cons.prazo_dias) || PRAZO_CONSIGNADO_DIAS) * 86400000).toISOString();
      const flip = await sb(`consignacoes?id=eq.${encodeURIComponent(consignacaoId)}&status=eq.pendente`, {
        method: 'PATCH', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ status: 'aprovada', aprovado_por: actorId, aprovada_em: now, prazo_em: prazoEm }),
      });
      const okFlip = flip.ok ? await flip.json() : null;
      if (!Array.isArray(okFlip) || !okFlip.length) return res.status(200).json({ success: false, error: 'Este pedido já foi respondido.' });

      const itens = Array.isArray(cons.itens_json) ? cons.itens_json : [];
      let dividaGerada = 0; const aplicados = [];

      for (const it of itens) {
        const pid = String(it.product_id || '');
        const qty = Math.max(1, Number(it.qty) || 1);
        const custo = round2(it.custo_unitario);
        if (!pid) continue;

        // baixa do estoque central
        const pArr = await (await sb(`products?select=id,quantity,price_catalog&id=eq.${encodeURIComponent(pid)}&limit=1`)).json();
        const p = Array.isArray(pArr) ? pArr[0] : null;
        if (!p) continue;
        const novaQtd = Math.max(0, (Number(p.quantity) || 0) - qty);
        await sb(`products?id=eq.${encodeURIComponent(pid)}`, {
          method: 'PATCH', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ quantity: novaQtd, status: novaQtd > 0 ? 'ESTOQUE' : 'VENDIDO', updated_date: now }),
        });

        // entra no estoque dele como CONSIGNADO (com dívida e prazo)
        const preco = round2(p.price_catalog || it.preco_venda || 0);
        const siArr = await (await sb(`store_inventory?select=id,quantity,custo_unitario,divida_aberta&owner_id=eq.${encodeURIComponent(cons.owner_id)}&product_id=eq.${encodeURIComponent(pid)}&origem=eq.consignado&limit=1`)).json();
        const si = Array.isArray(siArr) ? siArr[0] : null;
        if (si) {
          const qtdAnterior = Number(si.quantity) || 0;
          const total = qtdAnterior + qty;
          const custoMedio = total > 0 ? round2(((Number(si.custo_unitario) || 0) * qtdAnterior + custo * qty) / total) : custo;
          await sb(`store_inventory?id=eq.${encodeURIComponent(si.id)}`, {
            method: 'PATCH', headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({
              quantity: total, active: true, price: preco, custo_unitario: custoMedio,
              divida_aberta: round2((Number(si.divida_aberta) || 0) + custo * qty),
              consignacao_id: consignacaoId, prazo_em: prazoEm, updated_at: now,
            }),
          });
        } else {
          await sb('store_inventory', {
            method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
            body: JSON.stringify({
              id: oid(), owner_id: cons.owner_id, product_id: pid, quantity: qty, active: true,
              price: preco, origem: 'consignado', custo_unitario: custo,
              divida_aberta: round2(custo * qty), consignacao_id: consignacaoId, prazo_em: prazoEm,
            }),
          });
        }
        dividaGerada = round2(dividaGerada + custo * qty);
        aplicados.push({ product_id: pid, qty, custo_unitario: custo });
      }

      if (dividaGerada > 0) await somarDivida(cons.owner_id, dividaGerada);

      return res.status(200).json({ success: true, status: 'aprovada', divida_gerada: dividaGerada, itens: aplicados.length, prazo_em: prazoEm });
    }

    // ───────── DEVOLVER (o que não vendeu volta pro central) ─────────
    if (action === 'devolver') {
      const dono = String(cons.owner_id) === String(actorId);
      if (!gestor && !dono) return res.status(403).json({ success: false, error: 'Sem permissão' });
      if (cons.status !== 'aprovada') return res.status(200).json({ success: false, error: 'Só consignação ativa pode ser devolvida.' });

      const linhas = await (await sb(`store_inventory?select=id,product_id,quantity,custo_unitario,divida_aberta&consignacao_id=eq.${encodeURIComponent(consignacaoId)}&origem=eq.consignado`)).json();
      const lista = Array.isArray(linhas) ? linhas : [];
      const now = new Date().toISOString();
      let dividaBaixada = 0; let devolvidos = 0;

      for (const li of lista) {
        const qtd = Math.max(0, Number(li.quantity) || 0);
        if (qtd <= 0) continue;
        // volta pro estoque central
        const pArr = await (await sb(`products?select=id,quantity&id=eq.${encodeURIComponent(li.product_id)}&limit=1`)).json();
        const p = Array.isArray(pArr) ? pArr[0] : null;
        if (p) {
          await sb(`products?id=eq.${encodeURIComponent(li.product_id)}`, {
            method: 'PATCH', headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({ quantity: (Number(p.quantity) || 0) + qtd, status: 'ESTOQUE', updated_date: now }),
          });
        }
        // zera a linha e a dívida daquele saldo
        await sb(`store_inventory?id=eq.${encodeURIComponent(li.id)}`, {
          method: 'PATCH', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ quantity: 0, active: false, divida_aberta: 0, updated_at: now }),
        });
        dividaBaixada = round2(dividaBaixada + Math.min(round2(li.divida_aberta), round2(qtd * (Number(li.custo_unitario) || 0))));
        devolvidos += qtd;
      }

      if (dividaBaixada > 0) await somarDivida(cons.owner_id, -dividaBaixada);
      await sb(`consignacoes?id=eq.${encodeURIComponent(consignacaoId)}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'devolvida', encerrada_em: now }),
      });

      return res.status(200).json({ success: true, status: 'devolvida', pecas_devolvidas: devolvidos, divida_baixada: dividaBaixada });
    }

    return res.status(400).json({ success: false, error: 'Ação desconhecida' });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro na consignação', details: String(e?.message || e) });
  }
}