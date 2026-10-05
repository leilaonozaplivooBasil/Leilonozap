// lerCamposSensiveis — LGPD, fase 2, ETAPA 1 (28/09/2026).
//
// Depois da migração `lgpd_etapa_1`, o navegador não lê mais chave PIX de
// saque, código/e-mail/WhatsApp da Collection, dado de cartão das despesas nem
// CPF do comprador (ver src/lib/camposSensiveis.js). Quem é admin continua
// precisando deles para trabalhar — é por aqui que eles chegam.
//
// 🔴 DIFERENTE DAS OUTRAS ROTAS: o crachá de sessão é OBRIGATÓRIO aqui, mesmo
// sem SESSAO_MODO=bloquear. As outras rotas ainda aceitam o id que vem no corpo
// (etapa 1 do crachá, só anota no log) — e os ids de admin aparecem em tela
// pública. Se esta rota acreditasse no corpo, bastaria copiar o id de um admin
// para ler todas as chaves PIX: o buraco só mudaria de endereço. Quem chama é
// quem o CRACHÁ diz, e o cargo vem do BANCO, nunca do navegador.
//
// Admin sem crachá válido (login muito antigo) recebe 401 e a tela segue com as
// colunas públicas — o campo aparece vazio até entrar de novo.
//
// Duas formas de pedir:
//   { table, ids: [...] }         → id + campos devolvidos ao admin, dessas linhas
//   { table, filtro: {col: val} } → as linhas que batem (igualdade simples), com
//                                   as colunas públicas + campos devolvidos
//                                   (é a checagem "esse código já existe?")
import { conferirSessao } from '../_lib/sessao.js';
import {
  COLUNAS_PUBLICAS, DEVOLVIDOS_AO_ADMIN, PAPEIS_QUE_VEEM, ehTabelaProtegida,
} from '../../src/lib/camposSensiveis.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAX_IDS = 500;

function sb(path) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: SR, Authorization: `Bearer ${SR}` } });
}

/** Só letras, números e _ — nome de coluna vindo do navegador nunca vira SQL solto. */
const colunaValida = (c) => /^[a-z_][a-z0-9_]*$/.test(String(c));

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });
  try {
    const sessao = conferirSessao(req);
    if (!sessao.ok) {
      console.warn(`[lerCamposSensiveis] recusado: ${sessao.motivo}`);
      return res.status(401).json({ success: false, error: 'nao_autenticado', motivo: sessao.motivo });
    }
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });

    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const table = String(body?.table || '').trim();
    if (!ehTabelaProtegida(table)) return res.status(400).json({ success: false, error: 'tabela_nao_permitida' });

    // O cargo vem do banco, pelo id do CRACHÁ.
    const r0 = await sb(`app_users?select=id,role&id=eq.${encodeURIComponent(sessao.userId)}&limit=1`);
    const quem = (await r0.json().catch(() => []))?.[0];
    if (!quem || !PAPEIS_QUE_VEEM.includes(quem.role)) {
      console.warn(`[lerCamposSensiveis] sem permissão: ${sessao.userId} (${quem?.role || 'sem cadastro'}) em ${table}`);
      return res.status(403).json({ success: false, error: 'sem_permissao' });
    }

    const devolvidos = DEVOLVIDOS_AO_ADMIN[table] || [];
    if (devolvidos.length === 0) return res.status(200).json({ success: true, rows: [] });

    let caminho;
    if (Array.isArray(body?.ids)) {
      const ids = [...new Set(body.ids.map(String).filter(Boolean))].slice(0, MAX_IDS);
      if (ids.length === 0) return res.status(200).json({ success: true, rows: [] });
      const lista = ids.map((i) => `"${i.replace(/"/g, '')}"`).join(',');
      caminho = `${table}?select=${['id', ...devolvidos].join(',')}&id=in.(${encodeURIComponent(lista)})`;
    } else if (body?.filtro && typeof body.filtro === 'object') {
      const partes = [];
      for (const [col, val] of Object.entries(body.filtro)) {
        if (!colunaValida(col)) return res.status(400).json({ success: false, error: 'filtro_invalido' });
        if (val === null || val === undefined) partes.push(`${col}=is.null`);
        else if (typeof val === 'object') return res.status(400).json({ success: false, error: 'filtro_so_igualdade' });
        else partes.push(`${col}=eq.${encodeURIComponent(String(val))}`);
      }
      if (partes.length === 0) return res.status(400).json({ success: false, error: 'filtro_vazio' });
      caminho = `${table}?select=${COLUNAS_PUBLICAS[table]},${devolvidos.join(',')}&${partes.join('&')}&limit=${MAX_IDS}`;
    } else {
      return res.status(400).json({ success: false, error: 'pedido_invalido' });
    }

    const r = await sb(caminho);
    const rows = await r.json().catch(() => null);
    if (!r.ok) return res.status(200).json({ success: false, error: JSON.stringify(rows || '').slice(0, 200) });
    return res.status(200).json({ success: true, rows: Array.isArray(rows) ? rows : [] });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'erro', details: String(e?.message || e) });
  }
}
