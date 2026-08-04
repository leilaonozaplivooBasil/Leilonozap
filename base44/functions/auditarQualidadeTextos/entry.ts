// 🔍 PONTO 76 — AUDITORIA DE QUALIDADE DE TEXTO (100% SOMENTE LEITURA)
// Varre auctions + catalog_products e classifica defeitos básicos de título/descrição.
// ⚠️ NÃO existe caminho de escrita nesta função: só GET. Nenhum PATCH/POST/DELETE.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const RE_ERRO_IA = /\{\s*"error"|"error"\s*:|fetch failed|Unexpected token|not_implemented|"status"\s*:\s*[45]\d\d|Failed to fetch|<!DOCTYPE|<html/i;
const RE_LIXO_MKT = /frete\s*gr[áa]tis|promo[çc][ãa]o|\b\d{1,2}\s*x\s*(de|sem juros)|R\$\s*\d|envio\s*imediato|aproveite|[uú]ltimas\s*unidades|\bSKU\b|\bCOD\b\s*\d|compre\s*(agora|j[áa])/i;
const RE_EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const MIN_DESC = 80;

const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();

// Texto truncado = texto CORTADO no meio, não texto que simplesmente não tem ponto final.
// Última linha em bullet ("• Compacto e ideal...") ou em ficha técnica ("Total de Itens: 65")
// é formatação legítima — marcá-las como truncadas era falso positivo em massa.
function pareceTruncado(texto) {
  const t = String(texto || '').trim();
  if (t.length < 20) return false;
  if (/(\.\.\.|…)$/.test(t)) return true;
  const ultimaLinha = (t.split('\n').pop() || '').trim();
  if (/^[•\-*–—\d]/.test(ultimaLinha)) return false;      // item de lista
  if (/^[^:\n]{2,40}:\s*\S/.test(ultimaLinha)) return false; // "Chave: valor" (ficha técnica)
  if (/[.!?)"'\]:%]$/.test(ultimaLinha)) return false;
  // Sem pontuação final: só conta como cortado se a frase for longa (parágrafo interrompido)
  return ultimaLinha.split(/\s+/).length >= 8;
}

function tituloTruncado(titulo) {
  const t = String(titulo || '').trim();
  if (t.length < 40) return false;
  // Importação com limite de caracteres corta seco: sem pontuação e ultima palavra colada no limite
  if (/(\.\.\.|…)$/.test(t)) return true;
  const ultima = t.split(/\s+/).pop() || '';
  return t.length >= 55 && ultima.length >= 3 && !/[.!?)]$/.test(t) && /[a-zà-ú]$/i.test(t) === false;
}

function tituloCaixaAlta(titulo) {
  const letras = String(titulo || '').replace(/[^a-zA-ZÀ-ÿ]/g, '');
  if (letras.length < 8) return false;
  const maiusc = letras.replace(/[^A-ZÀ-Þ]/g, '').length;
  return maiusc / letras.length > 0.7;
}

// ⚠️ A Loja Virtual (tabela `products`) NÃO tem coluna `title`: o NOME do produto está
// gravado em `description` e não existe campo de descrição rica. Então lá auditamos o
// texto como NOME (caixa alta, truncado, lixo de marketplace, duplicado, sem foto) —
// cobrar "descrição curta" de um nome de produto seria falso positivo em 100% dos casos.
function analisar(linha, comoNome) {
  const defeitos = [];
  const titulo = comoNome ? String(linha.description || '') : String(linha.title || '');
  const desc = typeof linha.description === 'string' ? linha.description : '';
  const descLimpa = desc.trim();

  if (comoNome) {
    if (!descLimpa) defeitos.push('NOME_VAZIO');
    if (RE_ERRO_IA.test(descLimpa)) defeitos.push('RESTO_DE_ERRO_IA');
    if (tituloCaixaAlta(titulo)) defeitos.push('TITULO_CAIXA_ALTA');
    if (tituloTruncado(titulo)) defeitos.push('TITULO_TRUNCADO');
    if (RE_LIXO_MKT.test(titulo) || RE_EMOJI.test(titulo) || /\|.*\|/.test(titulo)) {
      defeitos.push('LIXO_DE_MARKETPLACE');
    }
    const fotosN = Array.isArray(linha.image_urls) ? linha.image_urls.filter(Boolean) : [];
    if (fotosN.length === 0) defeitos.push('SEM_FOTO');
    return defeitos;
  }

  if (!descLimpa) defeitos.push('DESCRICAO_VAZIA');
  else {
    if (norm(descLimpa) === norm(titulo)) defeitos.push('DESCRICAO_IGUAL_TITULO');
    if (descLimpa.length < MIN_DESC) defeitos.push('DESCRICAO_CURTA');
    if (RE_ERRO_IA.test(descLimpa)) defeitos.push('RESTO_DE_ERRO_IA');
    if (pareceTruncado(descLimpa)) defeitos.push('TEXTO_TRUNCADO');
  }

  if (tituloTruncado(titulo)) defeitos.push('TITULO_TRUNCADO');
  if (tituloCaixaAlta(titulo)) defeitos.push('TITULO_CAIXA_ALTA');

  const juntos = `${titulo} ${descLimpa}`;
  if (RE_LIXO_MKT.test(juntos) || RE_EMOJI.test(titulo) || /\|.*\|/.test(titulo)) {
    defeitos.push('LIXO_DE_MARKETPLACE');
  }

  const fotos = Array.isArray(linha.image_urls) ? linha.image_urls.filter(Boolean) : [];
  if (fotos.length === 0) defeitos.push('SEM_FOTO');

  return defeitos;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const SB = (Deno.env.get('SUPABASE_URL') || '').replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
    const KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!SB || !KEY) return Response.json({ error: 'Supabase não configurado' }, { status: 500 });
    const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

    const corpo = await req.json().catch(() => ({}));
    const modo = corpo?.modo === 'detalhado' ? 'detalhado' : 'resumo';
    const filtroTabela = corpo?.tabela || null;
    const filtroStatus = corpo?.status || null;
    const limiteLista = Number(corpo?.limite_lista) > 0 ? Number(corpo.limite_lista) : 60;

    const alvos = [
      { tabela: 'auctions', rotulo: 'leilao', comoNome: false, temTitle: true },
      { tabela: 'products', rotulo: 'produto', comoNome: true, temTitle: false },
    ].filter((t) => !filtroTabela || t.tabela === filtroTabela);

    const itens = [];
    const totais = {};
    const contagemDefeito = {};
    const mapaDescricao = new Map();

    for (const t of alvos) {
      let de = 0;
      let lidos = 0;
      for (let p = 0; p < 30; p++) {
        const qs = [
          t.temTitle
            ? 'select=id,title,description,status,product_source,category,image_urls'
            : 'select=id,description,status,catalog_active,image_urls',
          'order=created_date.desc',
          filtroStatus ? `status=eq.${encodeURIComponent(filtroStatus)}` : '',
        ].filter(Boolean).join('&');
        const r = await fetch(`${SB}/rest/v1/${t.tabela}?${qs}`, {
          headers: { ...H, Range: `${de}-${de + 199}` },
        });
        if (!r.ok) break;
        const linhas = await r.json();
        if (!Array.isArray(linhas)) break;
        lidos += linhas.length;

        for (const l of linhas) {
          const defeitos = analisar(l, t.comoNome);
          const chave = norm(l.description);
          // duplicidade de nome de produto conta a partir de 15 chars; descrição rica, 40
          if (chave && chave.length > (t.comoNome ? 15 : 40)) {
            const lista = mapaDescricao.get(chave) || [];
            lista.push(`${t.rotulo}:${l.id}`);
            mapaDescricao.set(chave, lista);
          }
          if (defeitos.length === 0) continue;
          itens.push({
            id: l.id,
            tipo: t.rotulo,
            tabela: t.tabela,
            titulo: String(t.comoNome ? l.description : l.title || '').slice(0, 80),
            status: l.status,
            origem: l.product_source || (t.comoNome ? (l.catalog_active ? 'na_loja' : 'fora_da_loja') : null),
            categoria: l.category || null,
            defeitos,
            amostra: String(l.description || '').slice(0, 120) || '(vazio)',
            final: String(l.description || '').trim().slice(-70) || '(vazio)',
            chave_desc: chave,
          });
        }
        if (linhas.length < 200) break;
        de += 200;
      }
      totais[t.rotulo] = lidos;
    }

    // Descrição duplicada: só marca quando a MESMA descrição aparece em 2+ registros
    const duplicadas = new Set();
    for (const [chave, lista] of mapaDescricao.entries()) {
      if (lista.length > 1) duplicadas.add(chave);
    }
    for (const it of itens) {
      if (it.chave_desc && duplicadas.has(it.chave_desc) && !it.defeitos.includes('DESCRICAO_DUPLICADA')) {
        it.defeitos.push(it.tipo === 'produto' ? 'NOME_DUPLICADO' : 'DESCRICAO_DUPLICADA');
      }
      delete it.chave_desc;
    }

    for (const it of itens) {
      for (const d of it.defeitos) contagemDefeito[d] = (contagemDefeito[d] || 0) + 1;
    }

    const totalAuditado = Object.values(totais).reduce((a, b) => a + b, 0);
    const comDefeito = itens.length;
    const saude = totalAuditado ? Math.round(((totalAuditado - comDefeito) / totalAuditado) * 100) : 100;

    const ranking = Object.entries(contagemDefeito)
      .sort((a, b) => b[1] - a[1])
      .map(([defeito, qtd]) => ({ defeito, qtd, pct: totalAuditado ? Math.round((qtd / totalAuditado) * 100) : 0 }));

    const resposta = {
      ok: true,
      escrita_realizada: false,
      modo,
      total_auditado: totalAuditado,
      auditado_por_tabela: totais,
      registros_com_defeito: comDefeito,
      registros_limpos: totalAuditado - comDefeito,
      saude_geral_pct: saude,
      ranking_defeitos: ranking,
      por_tipo_com_defeito: itens.reduce((a, x) => ({ ...a, [x.tipo]: (a[x.tipo] || 0) + 1 }), {}),
    };

    if (modo === 'detalhado') {
      const filtroDefeito = corpo?.defeito || null;
      const lista = filtroDefeito ? itens.filter((x) => x.defeitos.includes(filtroDefeito)) : itens;
      resposta.filtro_defeito = filtroDefeito;
      resposta.itens = lista.slice(0, limiteLista);
      resposta.ranking_defeitos = ranking;
      resposta.itens_no_filtro = lista.length;
      resposta.itens_total = itens.length;
    }

    return Response.json(resposta);
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});