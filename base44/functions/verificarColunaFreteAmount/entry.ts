// 🔍 TEMPORÁRIA — VERIFICA DE VERDADE se auction_messages.frete_amount existe.
// 100% LEITURA (só GET no PostgREST). Nenhuma escrita, nenhum valor alterado.
//
// ⚠️ POR QUE ESTA FUNÇÃO EXISTE: a `diagnosticoLanceFalha` devolvia a frase
// "frete_amount NAO EXISTE" como TEXTO FIXO no código (resquício da investigação do
// PONTO 83) — ela nunca consultou a coluna. Isso gerou um alarme falso depois da
// migração já ter sido aplicada. Aqui a resposta vem SEMPRE do banco: pedimos a
// coluna ao PostgREST e olhamos o código de erro real (42703 = não existe).
//
// Apagar depois do PONTO 84 estar fechado.

Deno.serve(async (req) => {
  try {
    const SB = (Deno.env.get('SUPABASE_URL') || '').replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
    const KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!SB || !KEY) return Response.json({ ok: false, error: 'Supabase não configurado' }, { status: 500 });

    const h = { apikey: KEY, Authorization: `Bearer ${KEY}` };

    // Pergunta pela coluna. Se ela não existir, o PostgREST responde 400 com code 42703.
    const r = await fetch(
      `${SB}/rest/v1/auction_messages?select=id,bid_amount,frete_amount,created_date,timestamp&message_type=eq.bid&order=created_date.desc&limit=3`,
      { headers: h }
    );
    const texto = await r.text();
    let dados: any; try { dados = JSON.parse(texto); } catch { dados = texto; }

    const naoExiste = dados?.code === '42703';
    const existe = r.ok && !naoExiste;

    return Response.json({
      ok: true,
      escrita_realizada: false,
      coluna_frete_amount_existe: existe,
      veredito: existe
        ? 'COLUNA EXISTE — a API do Supabase já enxerga auction_messages.frete_amount. Liberado reintroduzir o campo no INSERT do lance.'
        : 'COLUNA NÃO EXISTE (ou a API ainda não a enxerga) — NÃO reintroduzir o campo no INSERT.',
      http_status: r.status,
      erro_do_banco: naoExiste ? dados : null,
      amostra_de_lances: existe ? dados : null,
    });
  } catch (error) {
    return Response.json({ ok: false, error: String((error as any)?.message || error) }, { status: 500 });
  }
});