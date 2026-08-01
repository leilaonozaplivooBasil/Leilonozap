// Helper (pasta _lib é ignorada pela Vercel — não é rota): recotação de frete NO SERVIDOR.
// PONTO 74 — antifraude: o navegador só manda o ID da transportadora e o CEP.
// O servidor recota na Melhor Envio e usa o preço que ELE apurou. Se o ID não voltar
// na recotação, o pagamento é recusado com mensagem clara (nunca cobra frete zero calado).
//
// ⚠️ O frete NUNCA entra em total_amount da venda. Ele vai em campo separado,
// porque total_amount é a base da comissão (api/_lib/storeFulfill.js) e comissão
// NÃO incide sobre frete — dinheiro de frete é da transportadora, não da rede.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TOKEN = process.env.MELHOR_ENVIO_TOKEN;
const FROM_CEP = String(process.env.MELHOR_ENVIO_FROM_CEP || '').replace(/\D/g, '');

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

// Cota as opções reais na Melhor Envio usando as MEDIDAS DO BANCO (não as do cliente).
export async function cotarOpcoes({ cep, items }) {
  const toCep = String(cep || '').replace(/\D/g, '');
  if (toCep.length !== 8) return { ok: false, error: 'CEP inválido. Informe os 8 números.' };
  if (!TOKEN || FROM_CEP.length !== 8) return { ok: false, error: 'Frete não configurado no servidor.' };

  const lista = Array.isArray(items) && items.length ? items : [];
  const ids = lista.map((i) => String(i.product_id || i.id || '')).filter(Boolean);
  let dims = {};
  if (ids.length) {
    const rows = await (await sb(`products?select=id,peso,altura,largura,comprimento,price_catalog,selling_price_retail&id=in.(${ids.map((x) => `"${x}"`).join(',')})`)).json();
    dims = Object.fromEntries((Array.isArray(rows) ? rows : []).map((p) => [p.id, p]));
  }

  // sem medidas cadastradas usa caixa mínima dos Correios (16x11x2)
  const products = lista.map((it, idx) => {
    const p = dims[String(it.product_id || it.id)] || {};
    const valor = Number(p.price_catalog) > 0 ? Number(p.price_catalog) : Number(p.selling_price_retail) || 0;
    return {
      id: String(it.product_id || it.id || idx + 1),
      width: Math.max(11, Number(p.largura) || 11),
      height: Math.max(2, Number(p.altura) || 4),
      length: Math.max(16, Number(p.comprimento) || 16),
      weight: Math.max(0.1, Number(p.peso) || 0.3),
      insurance_value: Math.max(0, valor),
      quantity: Math.max(1, parseInt(it.quantity || it.quantidade) || 1),
    };
  });
  if (!products.length) return { ok: false, error: 'Itens inválidos para cotação de frete.' };

  const resp = await fetch('https://www.melhorenvio.com.br/api/v2/me/shipment/calculate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'Leilao NoZap (contato@leilaonozap.net)',
    },
    body: JSON.stringify({ from: { postal_code: FROM_CEP }, to: { postal_code: toCep }, products }),
  });
  const raw = await resp.text();
  let cot = null;
  try { cot = JSON.parse(raw); } catch { cot = null; }

  if (!resp.ok || !Array.isArray(cot)) {
    const cepInvalido = /postal_code|cep_destino/i.test(String(raw));
    return { ok: false, error: cepInvalido ? 'CEP não encontrado. Confira os números do seu CEP.' : 'Não conseguimos calcular o frete agora.' };
  }

  const opcoes = cot
    .filter((o) => !o.error && o.price)
    .map((o) => ({
      id: String(o.id),
      nome: o.name || '',
      empresa: o.company?.name || '',
      preco: round2(o.price),
      prazo: Number(o.delivery_time) || null,
    }))
    .sort((a, b) => a.preco - b.preco);

  if (!opcoes.length) return { ok: false, error: 'Nenhuma transportadora atende esse CEP.' };
  return { ok: true, opcoes };
}

// Valida a transportadora escolhida pelo cliente e devolve o valor apurado pelo servidor.
export async function validarFrete({ cep, items, frete_id }) {
  const r = await cotarOpcoes({ cep, items });
  if (!r.ok) return { ok: false, error: r.error };
  const esc = r.opcoes.find((o) => String(o.id) === String(frete_id));
  if (!esc) {
    return { ok: false, error: 'A opção de frete escolhida não está mais disponível. Recalcule o frete e tente de novo.' };
  }
  return {
    ok: true,
    frete: {
      id: esc.id,
      valor: esc.preco,
      empresa: esc.empresa,
      servico: esc.nome,
      prazo: esc.prazo,
      cep: String(cep).replace(/\D/g, ''),
    },
  };
}

// Resolve o frete de um checkout: retirada = zero explícito; entrega = recotação obrigatória.
export async function resolverFreteDoCheckout({ delivery_type, cep, items, frete_id }) {
  if (delivery_type !== 'delivery') {
    return { ok: true, frete: { id: null, valor: 0, empresa: null, servico: 'Retirada na loja', prazo: null, cep: null } };
  }
  if (!frete_id) {
    return { ok: false, error: 'Escolha uma opção de frete antes de pagar.' };
  }
  return validarFrete({ cep, items, frete_id });
}