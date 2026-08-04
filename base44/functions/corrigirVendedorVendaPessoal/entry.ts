// 🛠️ corrigirVendedorVendaPessoal — REGRA DE VENDA PESSOAL (retroativa, uma venda por vez)
//
// REGRA OFICIAL (Santana, 04/08/2026): "comprei na minha própria loja, automaticamente eu
// ganho". Quem tem cargo de rede é SEMPRE o vendedor da própria compra — mesmo comprando
// pelo link de outra pessoa, a venda é puxada para si. Preserva a comissão de quem compra.
//
// Esta função NÃO calcula comissão. Ela só acerta o `seller_id` da venda para o próprio
// comprador. O recálculo/distribuição é feito depois por `acertarComissaoVenda`.
//
// Payload: { sale_id, dry_run?: boolean (default TRUE) }
// dry_run=true  → só relatório, NÃO grava.
// dry_run=false → grava o seller_id.

const RAW = Deno.env.get('SUPABASE_URL') || '';
const SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const BASE = RAW.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');

const sb = (path: string, opts: RequestInit = {}) =>
  fetch(`${BASE}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });

// Cargos de rede que ganham venda pessoal (percentual conforme a posição de cada um).
// Trainee fica FORA de propósito: é papel de mentoria, não tem percentual de venda direta.
const CARGOS_REDE = [
  'influenciador', 'influencer', 'licenciado_aplicativo',
  'vendedor',
  'licenciado', 'licenciado_catalogo',
  'parceiro',
  'ponto_retirada',
  'loja_fisica',
  'distribuidor',
];

const cargosDe = (u: any) => (Array.isArray(u?.career_levels) ? u.career_levels : []);
const temCargoRede = (u: any) => cargosDe(u).some((c: string) => CARGOS_REDE.includes(c));

Deno.serve(async (req) => {
  try {
    if (!BASE || !SR) return Response.json({ error: 'Supabase não configurado' }, { status: 500 });
    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false; // padrão: NÃO grava
    const saleId = String(body.sale_id || '').trim();
    if (!saleId) return Response.json({ error: 'informe sale_id' }, { status: 400 });

    // 1) a venda
    const vendas = await (await sb(`catalog_sales?select=id,buyer_id,buyer_name,seller_id,product_title,total_amount,status&id=eq.${encodeURIComponent(saleId)}&limit=1`)).json();
    const venda = Array.isArray(vendas) ? vendas[0] : null;
    if (!venda) return Response.json({ error: 'venda não encontrada', sale_id: saleId }, { status: 404 });
    if (!venda.buyer_id) return Response.json({ error: 'venda sem buyer_id — não dá pra identificar venda pessoal', venda }, { status: 400 });

    // 2) comprador e vendedor atual
    const ids = [venda.buyer_id, venda.seller_id].filter(Boolean).map((x) => `"${x}"`).join(',');
    const users = await (await sb(`app_users?select=id,full_name,career_levels&id=in.(${ids})`)).json();
    const byId = new Map((Array.isArray(users) ? users : []).map((u: any) => [u.id, u]));
    const comprador = byId.get(venda.buyer_id);
    const vendedorAtual = venda.seller_id ? byId.get(venda.seller_id) : null;

    if (!comprador) return Response.json({ error: 'comprador não existe em app_users', buyer_id: venda.buyer_id }, { status: 404 });

    const elegivel = temCargoRede(comprador);
    const jaCorreta = venda.seller_id === venda.buyer_id;

    const relatorio: any = {
      venda: {
        id: venda.id,
        produto: venda.product_title,
        valor: Number(venda.total_amount),
        status: venda.status,
      },
      comprador: { id: comprador.id, nome: comprador.full_name, cargos: cargosDe(comprador) },
      vendedor_atual: vendedorAtual
        ? { id: vendedorAtual.id, nome: vendedorAtual.full_name, cargos: cargosDe(vendedorAtual) }
        : { id: venda.seller_id || null, nome: '(sem vendedor)' },
      elegivel_venda_pessoal: elegivel,
      ja_estava_correta: jaCorreta,
      dry_run: dryRun,
    };

    if (jaCorreta) {
      return Response.json({ success: true, ...relatorio, aplicado: false, motivo: 'o vendedor já é o próprio comprador — nada a fazer' });
    }
    if (!elegivel) {
      return Response.json({
        success: true, ...relatorio, aplicado: false,
        motivo: 'comprador não tem cargo de rede — venda pessoal não se aplica, vendedor permanece como está',
      });
    }

    relatorio.acao = `trocar seller_id de "${relatorio.vendedor_atual.nome}" para "${comprador.full_name}"`;
    relatorio.proximo_passo = 'rodar acertarComissaoVenda com este sale_id para redistribuir as comissões';

    if (dryRun) return Response.json({ success: true, ...relatorio, aplicado: false });

    const upd = await sb(`catalog_sales?id=eq.${encodeURIComponent(saleId)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ seller_id: venda.buyer_id }),
    });
    if (!upd.ok) {
      return Response.json({ success: false, ...relatorio, aplicado: false, erro: await upd.text() }, { status: 500 });
    }

    return Response.json({ success: true, ...relatorio, aplicado: true });
  } catch (e) {
    return Response.json({ error: String((e as any)?.message || e) }, { status: 500 });
  }
});