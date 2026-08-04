// ✍️ PONTO 74B — REGERAR DESCRIÇÕES POBRES (leilões cuja descrição ficou igual ao título)
// Sequência da limpeza do PONTO 74: nos 15 leilões limpos a IA nunca escreveu nada, então a
// descrição ficou idêntica ao título. Aqui a descrição é REESCRITA de verdade pela IA.
//
// SEGURANÇA (mesmo padrão do auditarDescricoesIA):
// • Só admin/super_admin.
// • Padrão é PRÉVIA (não grava nada) — mostra o texto que a IA gerou, item por item.
// • Só grava com modo:'aplicar' + ids explícitos (ou ids:'todos' após ver a prévia).
// • Só toca no campo `description`. Nunca título, foto, preço, lance ou comissão.
// • Alvo restrito: leilões cuja descrição está VAZIA ou IGUAL ao título (nada mais entra).
// • Se a IA falhar ou devolver algo suspeito, o registro é PULADO (nada é gravado) —
//   é exatamente o erro que o PONTO 74 veio corrigir.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const SUSPEITO = /\{\s*"error"|"error"\s*:|fetch failed|Unexpected token|not_implemented|Failed to fetch|<!DOCTYPE|desculpe|não posso|as an ai/i;

const normal = (s: unknown) =>
  String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();

function textoValido(t: unknown, titulo: string) {
  const txt = String(t || '').trim();
  if (txt.length < 80) return null;             // curto demais = não vale trocar
  if (SUSPEITO.test(txt)) return null;          // erro/recusa disfarçada
  if (normal(txt) === normal(titulo)) return null;
  return txt;
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
    const todos = corpo?.ids === 'todos';
    const idsAutorizados = Array.isArray(corpo?.ids) ? corpo.ids : [];
    const limite = Math.min(Number(corpo?.limite) || 20, 30);

    // 🎯 ALVO — dois destinos possíveis, MESMO padrão de segurança nos dois:
    //  • 'leiloes'  (padrão) → auctions.description  [comportamento original, intacto]
    //  • 'produtos' → products.notes  (PONTO 79: em `products`, `description` é o
    //    TÍTULO e o texto longo é `notes`. Confundir os dois apagaria o nome do produto.)
    const alvo = corpo?.alvo === 'produtos' ? 'produtos' : 'leiloes';
    const TABELA = alvo === 'produtos' ? 'products' : 'auctions';
    const CAMPO = alvo === 'produtos' ? 'notes' : 'description';
    const CAMPO_TITULO = alvo === 'produtos' ? 'description' : 'title';
    // `products` não tem as mesmas colunas de `auctions` (category/status) — pedir
    // coluna inexistente faz o PostgREST devolver 400 e a busca voltar vazia.
    const SELECT = alvo === 'produtos'
      ? `id,${CAMPO_TITULO},${CAMPO}`
      : `id,${CAMPO_TITULO},${CAMPO},category,status`;

    // 1) alvos: registros com o texto vazio ou igual ao título
    const alvos: any[] = [];
    let de = 0;
    for (let p = 0; p < 20; p++) {
      const r = await fetch(
        `${SB}/rest/v1/${TABELA}?select=${SELECT}&order=created_date.desc`,
        { headers: { ...H, Range: `${de}-${de + 199}` } }
      );
      if (!r.ok) {
        return Response.json(
          { ok: false, escrita_realizada: false, error: `leitura de ${TABELA} falhou (${r.status})`, detalhe: (await r.text()).slice(0, 200) },
          { status: 500 }
        );
      }
      const linhas = await r.json();
      for (const l of linhas) {
        const titulo = l[CAMPO_TITULO];
        const d = String(l[CAMPO] || '').trim();
        // ⚠️ sem título não há como a IA escrever nada seguro → fica fora
        if (!String(titulo || '').trim()) continue;
        if (!d || normal(d) === normal(titulo)) {
          alvos.push({ id: l.id, title: titulo, category: l.category, status: l.status });
        }
      }
      if (!Array.isArray(linhas) || linhas.length < 200) break;
      de += 200;
    }

    const fila = alvos
      .filter((l) => todos || modo === 'previa' || idsAutorizados.includes(l.id))
      .slice(0, limite);

    // 2) gera texto novo com a IA (um por um, sem paralelismo pra não estourar cota)
    const itens: any[] = [];
    for (const l of fila) {
      const titulo = String(l.title || '').trim();
      let gerado: string | null = null;
      let erro: string | null = null;
      try {
        const resp = await base44.integrations.Core.InvokeLLM({
          prompt:
            `Escreva a descrição comercial de um produto vendido em leilão online no Brasil.\n\n` +
            `PRODUTO: "${titulo}"\nCATEGORIA: ${l.category || 'outros'}\n\n` +
            `REGRAS OBRIGATÓRIAS:\n` +
            `- Português do Brasil, tom vendedor, claro e confiável.\n` +
            `- 2 parágrafos curtos + uma lista de 3 a 5 benefícios com "• ".\n` +
            `- Entre 400 e 900 caracteres no total.\n` +
            `- Fale só do que o título permite afirmar. NÃO invente marca, modelo, voltagem, ` +
            `capacidade, garantia, nota fiscal, cor ou medida que não estejam no título.\n` +
            `- NÃO cite preço, valor, frete, prazo de entrega nem desconto.\n` +
            `- NÃO repita o título como primeira frase e não use títulos/markdown.\n` +
            `- Responda APENAS com o texto final da descrição.`,
        });
        const bruto = typeof resp === 'string' ? resp : (resp?.text ?? resp?.output ?? '');
        gerado = textoValido(bruto, titulo);
        if (!gerado) erro = 'IA devolveu texto inválido/curto — registro pulado';
      } catch (e) {
        erro = `IA indisponível: ${String(e?.message || e).slice(0, 80)}`;
      }

      itens.push({
        id: l.id,
        titulo: titulo.slice(0, 60),
        status: l.status,
        gerado_ok: !!gerado,
        motivo: erro,
        preview: gerado ? gerado.slice(0, 220) : null,
        tamanho: gerado ? gerado.length : 0,
        _texto: gerado,
      });
    }

    if (modo === 'previa') {
      return Response.json({
        ok: true,
        escrita_realizada: false,
        alvo,
        tabela: TABELA,
        campo: CAMPO,
        alvos_encontrados: alvos.length,
        gerados_nesta_previa: itens.filter((x) => x.gerado_ok).length,
        pulados: itens.filter((x) => !x.gerado_ok).length,
        itens: itens.map(({ _texto, ...x }) => x),
      });
    }

    if (!todos && idsAutorizados.length === 0) {
      return Response.json(
        { ok: false, escrita_realizada: false, error: 'Envie a lista de ids (ou "todos") para aplicar' },
        { status: 400 }
      );
    }

    // 3) grava SOMENTE o campo de texto do alvo, um registro por vez
    const resultado: any[] = [];
    for (const it of itens) {
      if (!it._texto) {
        resultado.push({ id: it.id, titulo: it.titulo, ok: false, detalhe: it.motivo });
        continue;
      }
      const r = await fetch(`${SB}/rest/v1/${TABELA}?id=eq.${encodeURIComponent(it.id)}`, {
        method: 'PATCH',
        headers: { ...H, Prefer: 'return=minimal' },
        body: JSON.stringify({ [CAMPO]: it._texto }),
      });
      resultado.push({
        id: it.id,
        titulo: it.titulo,
        campo: CAMPO,
        ok: r.ok,
        detalhe: r.ok ? `${CAMPO} regerado (${it.tamanho} chars)` : `erro ${r.status}: ${(await r.text()).slice(0, 120)}`,
      });
    }

    return Response.json({
      ok: true,
      alvo,
      tabela: TABELA,
      campo: CAMPO,
      escrita_realizada: resultado.some((x) => x.ok),
      atualizados: resultado.filter((x) => x.ok).length,
      falhas: resultado.filter((x) => !x.ok).length,
      resultado,
    });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});