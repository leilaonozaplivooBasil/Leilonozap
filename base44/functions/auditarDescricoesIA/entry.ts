// 🔍 PONTO 74 — AUDITORIA DE DESCRIÇÕES CONTAMINADAS (SOMENTE LEITURA por padrão)
// Descrições de leilões/produtos onde a IA falhou e o JSON de erro foi salvo no campo.
// Padrão: só LÊ e mostra "antes / depois". Só grava se modo === 'aplicar' E o admin
// enviar os IDs explicitamente (nada em massa, nada sem lista).
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const PADRAO = /\{\s*"error"|"error"\s*:|fetch failed|Unexpected token|not_implemented|"status"\s*:\s*[45]\d\d|Failed to fetch|<!DOCTYPE/i;

function limpar(texto) {
  if (typeof texto !== 'string') return '';
  if (!PADRAO.test(texto)) return texto;
  // O erro sempre vem como um bloco JSON/HTML colado no fim. Cortamos no INÍCIO
  // desse bloco (primeiro '{' ou '<' cujo restante contenha a marca de erro),
  // e não na palavra "error" — senão sobrava um pedaço tipo {"ok":false,
  let corte = -1;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (c !== '{' && c !== '<') continue;
    if (PADRAO.test(texto.slice(i))) { corte = i; break; }
  }
  if (corte < 0) corte = texto.search(PADRAO);
  if (corte <= 0) return '';
  return texto.slice(0, corte).replace(/[\s\-–—:{[("']+$/g, '').trim();
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
    const modo = corpo?.modo === 'aplicar' ? 'aplicar' : 'previa';
    const idsAutorizados = Array.isArray(corpo?.ids) ? corpo.ids : [];

    // 04/08/2026 — incluído products.notes: a corrupção de JSON de erro da IA estava
    // MAJORITARIAMENTE nesse campo (a auditoria só olhava 'description' e não via nada).
    // 'campo' e 'campo_titulo' variam por tabela — products usa 'notes' e 'description'
    // (em products, 'description' É o título do produto, não o texto longo).
    const tabelas = [
      { tabela: 'auctions', rotulo: 'leilao', campo: 'description', campo_titulo: 'title' },
      { tabela: 'catalog_products', rotulo: 'produto', campo: 'description', campo_titulo: 'title' },
      { tabela: 'products', rotulo: 'produto_estoque', campo: 'notes', campo_titulo: 'description' },
    ];

    const achados = [];
    for (const t of tabelas) {
      let de = 0;
      for (let p = 0; p < 20; p++) {
        const r = await fetch(
          `${SB}/rest/v1/${t.tabela}?select=id,${t.campo_titulo},${t.campo},status&order=created_date.desc`,
          { headers: { ...H, Range: `${de}-${de + 199}` } }
        );
        if (!r.ok) break;
        const linhas = await r.json();
        for (const l of linhas) {
          const valor = l[t.campo];
          if (typeof valor === 'string' && PADRAO.test(valor)) {
            const depois = limpar(valor);
            achados.push({
              tipo: t.rotulo,
              tabela: t.tabela,
              campo: t.campo,
              id: l.id,
              titulo: String(l[t.campo_titulo] || '').slice(0, 60),
              status: l.status,
              tamanho_antes: valor.length,
              antes: valor.slice(0, 160),
              depois: depois ? depois.slice(0, 160) : '(ficaria vazio)',
              ficaria_vazio: !depois,
              texto_final: depois,
            });
          }
        }
        if (!Array.isArray(linhas) || linhas.length < 200) break;
        de += 200;
      }
    }

    if (modo === 'previa') {
      return Response.json({
        ok: true,
        escrita_realizada: false,
        total_contaminados: achados.length,
        por_tipo: achados.reduce((a, x) => ({ ...a, [x.tipo]: (a[x.tipo] || 0) + 1 }), {}),
        ficariam_vazios: achados.filter((x) => x.ficaria_vazio).length,
        itens: achados.map((x) => ({
          id: x.id,
          tipo: x.tipo,
          titulo: x.titulo,
          status: x.status,
          antes: x.antes,
          depois: x.depois,
          ficaria_vazio: x.ficaria_vazio,
        })),
      });
    }

    // 🔴 modo aplicar — só nos IDs que o admin listou, um por um, só o campo description
    // Autorização em bloco: o admin manda ids:'todos' depois de ver a prévia.
    const todos = corpo?.ids === 'todos';
    if (!todos && idsAutorizados.length === 0) {
      return Response.json({ ok: false, escrita_realizada: false, error: 'Envie a lista de ids (ou "todos") para aplicar' }, { status: 400 });
    }

    const resultado = [];
    for (const item of achados) {
      if (!todos && !idsAutorizados.includes(item.id)) continue;
      const r = await fetch(`${SB}/rest/v1/${item.tabela}?id=eq.${encodeURIComponent(item.id)}`, {
        method: 'PATCH',
        headers: { ...H, Prefer: 'return=representation' },
        body: JSON.stringify({ [item.campo]: item.texto_final }),
      });
      resultado.push({
        id: item.id,
        titulo: item.titulo,
        campo: item.campo,
        ok: r.ok,
        detalhe: r.ok ? `${item.campo} limpo` : `erro ${r.status}: ${(await r.text()).slice(0, 120)}`,
      });
    }

    return Response.json({
      ok: true,
      escrita_realizada: resultado.some((x) => x.ok),
      atualizados: resultado.filter((x) => x.ok).length,
      falhas: resultado.filter((x) => !x.ok).length,
      resultado,
    });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});