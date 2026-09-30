// 📦 RETIRADA DIGITAL — 30/09/2026. Uma rota, quatro ações, sempre com CRACHÁ
// (o id de quem chama vem do crachá, nunca do corpo):
//
//   { acao: 'registrar', saleId, local, localOutro, quem, terceiroNome, terceiroDoc4,
//     codigo, semCodigo, motivoSemCodigo, assinatura, fotoUrl, aceite }   → equipe
//   { acao: 'listar', saleIds: [...] }  → equipe: quais desses já foram retirados
//   { acao: 'ver', saleId }             → equipe OU o comprador: o comprovante
//   { acao: 'meus' }                    → comprador: código e situação dos pedidos com retirada
//   { acao: 'balcao' }                  → equipe: os pedidos de retirada (aguardando e retirados)
//   { acao: 'porCodigo', codigo }       → equipe: acha o pedido pelo código que o cliente mostrou
//
// Registrar: confere o código (o terceiro SEMPRE precisa dele), grava o
// comprovante, marca a venda como entregue, libera o saldo do vendedor (mesma
// RPC do "confirmar recebimento") e avisa o cliente (e-mail + sino).
import { conferirSessao } from '../_lib/sessao.js';
import { codigoDeRetirada, codigoConfere } from '../_lib/codigoDeRetirada.js';
import { enviarAviso } from '../_lib/avisosPorEmail.js';
import { numeroDoPedido } from '../_lib/regrasDosAvisos.js';
import { errosDaRetirada, podeRegistrarRetirada, vendaPodeSerRetirada, ehRetirada, rotuloDoLocal, TERMO, codigoLimpo } from '../../src/lib/retirada.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}
const ler = async (path) => { const r = await sb(path); const j = await r.json().catch(() => []); return Array.isArray(j) ? j : []; };
const VENDA = 'id,kind,status,buyer_id,buyer_name,product_title,total_amount,tracking_code,raw_base44,created_date';
const COMPROVANTE = 'sale_id,local,local_outro,quem,terceiro_nome,terceiro_doc4,com_codigo,motivo_sem_codigo,assinatura,foto_url,termo_versao,termo_texto,atendente_nome,retirado_em';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  const sessao = conferirSessao(req);
  if (!sessao.ok) return res.status(401).json({ success: false, error: 'nao_autenticado' });
  if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'config' });
  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const acao = String(body?.acao || '');
    const eu = (await ler(`app_users?select=id,full_name,role,primary_career_level,career_levels,active&id=eq.${encodeURIComponent(sessao.userId)}&limit=1`))[0];
    if (!eu) return res.status(401).json({ success: false, error: 'nao_autenticado' });
    const equipe = podeRegistrarRetirada(eu);

    if (acao === 'meus') {
      const vendas = await ler(`catalog_sales?select=${VENDA}&buyer_id=eq.${encodeURIComponent(eu.id)}&order=created_date.desc&limit=100`);
      const minhas = vendas.filter(vendaPodeSerRetirada);
      const feitas = minhas.length ? await ler(`retiradas?select=sale_id,local,local_outro,retirado_em&sale_id=in.(${minhas.map((v) => `"${v.id}"`).join(',')})`) : [];
      const porVenda = Object.fromEntries(feitas.map((f) => [f.sale_id, f]));
      return res.status(200).json({
        success: true,
        pedidos: minhas.map((v) => {
          const f = porVenda[v.id];
          // arremate: o leilão mora em raw_base44.auction_id — é por ele que "Meus Arremates" acha o código
          let raw = v.raw_base44; if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch { raw = {}; } }
          const auctionId = v.kind === 'arremate' ? (raw?.auction_id || null) : null;
          return f
            ? { saleId: v.id, auctionId, retirado: true, local: rotuloDoLocal(f.local, f.local_outro), retiradoEm: f.retirado_em }
            : { saleId: v.id, auctionId, retirado: false, codigo: codigoDeRetirada(v.id) };
        }),
      });
    }

    // 🏪 a tela do BALCÃO: só pedidos de retirada, com o mínimo pra conferir
    if (acao === 'balcao' || acao === 'porCodigo') {
      if (!equipe) return res.status(403).json({ success: false, error: 'sem_permissao' });
      const desde = new Date(Date.now() - 120 * 86400000).toISOString();
      const vendas = (await ler(`catalog_sales?select=${VENDA}&created_date=gte.${desde}&order=created_date.desc&limit=1000`)).filter(vendaPodeSerRetirada);
      const feitas = vendas.length ? await ler(`retiradas?select=sale_id,local,local_outro,atendente_nome,retirado_em&sale_id=in.(${vendas.map((v) => `"${v.id}"`).join(',')})`) : [];
      const porVenda = Object.fromEntries(feitas.map((f) => [f.sale_id, f]));
      const resumo = (v) => {
        const f = porVenda[v.id];
        return { id: v.id, numero: numeroDoPedido(v), produto: v.product_title, comprador: v.buyer_name, pagoEm: v.created_date, arremate: v.kind === 'arremate',
          retirada: f ? { local: rotuloDoLocal(f.local, f.local_outro), atendente: f.atendente_nome, retiradoEm: f.retirado_em } : null };
      };
      if (acao === 'porCodigo') {
        const c = codigoLimpo(body.codigo);
        if (c.length !== 6) return res.status(200).json({ success: false, error: 'Digite os 6 números do código' });
        const achou = vendas.find((v) => codigoConfere(v.id, c));
        return achou ? res.status(200).json({ success: true, pedido: resumo(achou) }) : res.status(200).json({ success: false, error: 'Nenhum pedido de retirada com este código' });
      }
      return res.status(200).json({ success: true, pedidos: vendas.map(resumo) });
    }

    if (acao === 'listar') {
      if (!equipe) return res.status(403).json({ success: false, error: 'sem_permissao' });
      const ids = (Array.isArray(body.saleIds) ? body.saleIds : []).map(String).filter((i) => /^[\w-]{6,64}$/.test(i)).slice(0, 300);
      if (!ids.length) return res.status(200).json({ success: true, retiradas: {} });
      const feitas = await ler(`retiradas?select=sale_id,local,local_outro,atendente_nome,retirado_em&sale_id=in.(${ids.map((i) => `"${i}"`).join(',')})`);
      return res.status(200).json({ success: true, retiradas: Object.fromEntries(feitas.map((f) => [f.sale_id, { local: rotuloDoLocal(f.local, f.local_outro), atendente: f.atendente_nome, retiradoEm: f.retirado_em }])) });
    }

    const saleId = String(body?.saleId || '').trim();
    if (!/^[\w-]{6,64}$/.test(saleId)) return res.status(400).json({ success: false, error: 'pedido_invalido' });
    const venda = (await ler(`catalog_sales?select=${VENDA}&id=eq.${encodeURIComponent(saleId)}&limit=1`))[0];
    if (!venda) return res.status(200).json({ success: false, error: 'Pedido não encontrado' });

    if (acao === 'ver') {
      if (!equipe && venda.buyer_id !== eu.id) return res.status(403).json({ success: false, error: 'sem_permissao' });
      const f = (await ler(`retiradas?select=${COMPROVANTE}&sale_id=eq.${encodeURIComponent(saleId)}&limit=1`))[0];
      if (!f) return res.status(200).json({ success: false, error: 'Este pedido ainda não foi retirado' });
      return res.status(200).json({ success: true, comprovante: { ...f, pedido: numeroDoPedido(venda), produto: venda.product_title, comprador: venda.buyer_name, localRotulo: rotuloDoLocal(f.local, f.local_outro) } });
    }

    if (acao !== 'registrar') return res.status(400).json({ success: false, error: 'acao_invalida' });
    if (!equipe) return res.status(403).json({ success: false, error: 'Só a equipe da loja registra retirada' });
    if (!ehRetirada(venda)) return res.status(200).json({ success: false, error: 'Este pedido não é de retirada — é de entrega' });
    if (!vendaPodeSerRetirada(venda)) return res.status(200).json({ success: false, error: 'Pedido sem pagamento confirmado (ou cancelado) — não pode ser entregue' });
    const jaFoi = (await ler(`retiradas?select=local,local_outro,atendente_nome,retirado_em&sale_id=eq.${encodeURIComponent(saleId)}&limit=1`))[0];
    if (jaFoi) return res.status(200).json({ success: false, error: 'ja_retirado', retirada: { local: rotuloDoLocal(jaFoi.local, jaFoi.local_outro), atendente: jaFoi.atendente_nome, retiradoEm: jaFoi.retirado_em } });

    const erros = errosDaRetirada(body);
    if (erros.length) return res.status(200).json({ success: false, error: erros[0], erros });
    if (!body.semCodigo && !codigoConfere(saleId, codigoLimpo(body.codigo))) {
      return res.status(200).json({ success: false, error: 'Código não confere com este pedido. Peça para o cliente conferir em Meus Pedidos.' });
    }
    const pedido = numeroDoPedido(venda);
    const foto = String(body.fotoUrl || '');
    const linha = {
      sale_id: saleId,
      local: body.local, local_outro: body.local === 'outro' ? String(body.localOutro).trim().slice(0, 120) : null,
      quem: body.quem,
      terceiro_nome: body.quem === 'terceiro' ? String(body.terceiroNome).trim().slice(0, 120) : null,
      terceiro_doc4: body.quem === 'terceiro' ? String(body.terceiroDoc4).replace(/\D/g, '').slice(-4) : null,
      com_codigo: !body.semCodigo,
      motivo_sem_codigo: body.semCodigo ? String(body.motivoSemCodigo).trim().slice(0, 300) : null,
      assinatura: String(body.assinatura),
      foto_url: /^https:\/\//.test(foto) ? foto.slice(0, 500) : null,
      termo_versao: TERMO.versao, termo_texto: TERMO.texto(pedido),
      atendente_id: eu.id, atendente_nome: eu.full_name || null,
    };
    // a linha nasce ANTES de mexer na venda: unique(sale_id) segura dois balcões ao mesmo tempo
    const ins = await sb('retiradas', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(linha) });
    if (!ins.ok) {
      const t = await ins.text();
      if (ins.status === 409 || /duplicate key/i.test(t)) return res.status(200).json({ success: false, error: 'ja_retirado' });
      return res.status(200).json({ success: false, error: 'Não foi possível gravar a retirada', details: t.slice(0, 200) });
    }
    const gravada = (await ins.json().catch(() => []))[0] || linha;

    // a venda: entregue (+ etapa da jornada), e o saldo do vendedor liberado como no "recebi"
    let r = await sb(`catalog_sales?id=eq.${encodeURIComponent(saleId)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'entregue', fulfillment_status: 'entregue' }) });
    if (!r.ok) r = await sb(`catalog_sales?id=eq.${encodeURIComponent(saleId)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'entregue' }) });
    await sb('rpc/confirmar_recebimento', { method: 'POST', body: JSON.stringify({ _sale_id: saleId }) }).catch(() => {});
    await sb('system_logs', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ component_name: 'retiradaNaLoja', step: 'RETIRADA', status: 'success', message: `Pedido #${pedido} retirado (${rotuloDoLocal(linha.local, linha.local_outro)}) — registrado por ${eu.full_name || eu.id}`, entity_id: saleId, payload: { local: linha.local, quem: linha.quem, com_codigo: linha.com_codigo, atendente_id: eu.id } }) }).catch(() => {});
    if (venda.buyer_id) {
      await enviarAviso({ tipo: 'retirada_confirmada', userId: venda.buyer_id, chave: saleId, dados: { pedido, local: rotuloDoLocal(linha.local, linha.local_outro), quando: gravada.retirado_em || new Date().toISOString(), terceiro: linha.terceiro_nome || '', arremate: venda.kind === 'arremate' } });
    }
    return res.status(200).json({ success: true, retiradoEm: gravada.retirado_em, pedido });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}
