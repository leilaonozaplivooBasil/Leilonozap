// Helper (pasta _lib é ignorada pela Vercel — não é rota): gera o envio AUTOMÁTICO no
// Melhor Envio quando um pedido físico da loja é pago (carrinho + compra da etiqueta).
//
// 🔴 Risco alto (gasta saldo real da conta Melhor Envio ao comprar a etiqueta). Por isso
// TODA falha aqui é best-effort: nunca lança erro pro chamador (mpWebhook), só loga e
// devolve { ok:false, skipped:'motivo' }. O pagamento e a comissão do cliente JÁ
// aconteceram antes desta função ser chamada — nunca podem ser desfeitos por um problema
// de frete/etiqueta.
//
// Pré-requisitos (se faltar qualquer um, pula sem quebrar nada):
//  1. Token OAuth do Melhor Envio autorizado (melhor_envio_tokens, via melhorEnvioOAuth).
//  2. Dados do remetente (loja) nos secrets MELHOR_ENVIO_FROM_*.
//  3. CPF do comprador cadastrado (app_users.cpf) — exigido pela transportadora.
//  4. sale.raw_base44.frete.id (serviço escolhido no checkout) e delivery_type='delivery'.
//
// Idempotência: se raw_base44.melhor_envio já existe, não gera de novo.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FROM_CEP = String(process.env.MELHOR_ENVIO_FROM_CEP || '').replace(/\D/g, '');

// ✅ PONTO 111 (21/08/2026) — validação de CPF por dígito verificador.
// MESMA implementação já usada em api/concurso.js:15 — copiada de propósito em
// vez de importada: este arquivo é chamado pelo mpWebhook, e import relativo
// dentro de api/_lib/ pra fora já derrubou fluxo de dinheiro antes (ver o
// cabeçalho de api/functions/submitAtomicBid.js).
//
// Por que precisa existir aqui: nenhum checkout do sistema confere o CPF que o
// cliente digita. O Melhor Envio confere — e recusa o carrinho inteiro com
// "O campo to.document deve ter um CPF válido". Melhor descobrir aqui, com uma
// mensagem que diz o que fazer, do que na transportadora.
function cpfValido(valor) {
  const cpf = String(valor || '').replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;   // 111.111.111-11 e afins
  const calc = (base) => {
    let soma = 0;
    for (let i = 0; i < base; i += 1) soma += parseInt(cpf[i], 10) * (base + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === parseInt(cpf[9], 10) && calc(10) === parseInt(cpf[10], 10);
}
const UA = 'Leilao NoZap (contato@leilaonozap.net)';

function sb(path, opts = {}) {
  const root = String(SUPABASE_URL || '').replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
  return fetch(`${root}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

function baseUrl(ambiente) {
  return ambiente === 'producao' ? 'https://melhorenvio.com.br' : 'https://sandbox.melhorenvio.com.br';
}

function ambienteAtual() {
  return String(process.env.MELHOR_ENVIO_AMBIENTE || 'producao').toLowerCase() === 'sandbox' ? 'sandbox' : 'producao';
}

// Token vigente, renovando pelo refresh_token se estiver a menos de 1 dia de vencer.
async function getAccessToken(ambiente) {
  const r = await sb(`melhor_envio_tokens?select=*&ambiente=eq.${ambiente}&ativo=is.true&order=obtido_em.desc&limit=1`);
  const rows = await r.json().catch(() => null);
  const t = Array.isArray(rows) && rows[0] ? rows[0] : null;
  if (!t) return null;

  const vencido = t.expires_at ? new Date(t.expires_at).getTime() - Date.now() < 24 * 60 * 60 * 1000 : false;
  if (!vencido) return t.access_token;
  if (!t.refresh_token) return t.access_token; // sem refresh_token, tenta usar o que tem

  const CLIENT_ID = process.env.MELHOR_ENVIO_CLIENT_ID;
  const CLIENT_SECRET = process.env.MELHOR_ENVIO_CLIENT_SECRET;
  if (!CLIENT_ID || !CLIENT_SECRET) return t.access_token;

  try {
    const resp = await fetch(`${baseUrl(ambiente)}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': UA },
      body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: t.refresh_token, client_id: CLIENT_ID, client_secret: CLIENT_SECRET }),
    });
    const dados = await resp.json().catch(() => null);
    if (!resp.ok || !dados?.access_token) return t.access_token;

    const agora = new Date();
    const expira = new Date(agora.getTime() + (Number(dados.expires_in) || 2592000) * 1000);
    await sb(`melhor_envio_tokens?id=eq.${t.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ access_token: dados.access_token, refresh_token: dados.refresh_token || t.refresh_token, expires_at: expira.toISOString(), obtido_em: agora.toISOString() }),
    });
    return dados.access_token;
  } catch (_) {
    return t.access_token;
  }
}

function remetente() {
  const campos = {
    name: process.env.MELHOR_ENVIO_FROM_NAME,
    document: String(process.env.MELHOR_ENVIO_FROM_DOCUMENT || '').replace(/\D/g, ''),
    phone: String(process.env.MELHOR_ENVIO_FROM_PHONE || '').replace(/\D/g, ''),
    email: process.env.MELHOR_ENVIO_FROM_EMAIL,
    address: process.env.MELHOR_ENVIO_FROM_ADDRESS,
    number: process.env.MELHOR_ENVIO_FROM_NUMBER,
    district: process.env.MELHOR_ENVIO_FROM_DISTRICT,
    city: process.env.MELHOR_ENVIO_FROM_CITY,
    state_abbr: process.env.MELHOR_ENVIO_FROM_STATE_ABBR,
  };
  const faltando = Object.entries(campos).filter(([, v]) => !v).map(([k]) => k);
  if (faltando.length || FROM_CEP.length !== 8) return null;
  return { ...campos, postal_code: FROM_CEP, country_id: 'BR' };
}

// Motivos que NÃO são problema — não geram log (retirada no balcão é normal;
// "já gerado" é a própria idempotência funcionando). Todo o resto some hoje
// em silêncio total: sem isso, ninguém sabe por que um envio não foi gerado
// até abrir o banco na mão.
const SKIPS_SEM_PROBLEMA = new Set(['retirada_na_loja', 'ja_gerado']);
// Falha de verdade na comunicação com o Melhor Envio (não é config faltando)
const SKIPS_GRAVES = new Set(['cart_falhou', 'checkout_falhou', 'erro_inesperado']);

async function logResultado(sale, resultado) {
  if (!resultado || resultado.ok || SKIPS_SEM_PROBLEMA.has(resultado.skipped)) return;
  try {
    await sb('system_logs', {
      method: 'POST',
      body: JSON.stringify({
        entity_id: sale?.id || null,
        component_name: 'melhorEnvioShipment',
        step: 'ENVIO_AUTOMATICO',
        status: SKIPS_GRAVES.has(resultado.skipped) ? 'error' : 'warning',
        message: `Envio automático não gerado (venda ${sale?.id}): ${resultado.skipped}` + (resultado.detalhe ? ` — ${String(resultado.detalhe).slice(0, 200)}` : ''),
        created_at: new Date().toISOString(),
      }),
    });
  } catch (_) { /* log é opcional, nunca pode quebrar o fluxo */ }
}

export async function gerarEnvioAutomatico(sale) {
  const resultado = await tentarGerarEnvio(sale);
  await logResultado(sale, resultado);
  return resultado;
}

async function tentarGerarEnvio(sale) {
  try {
    let raw = sale.raw_base44;
    if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch { raw = {}; } }
    raw = raw || {};

    // 🔴 BLOQUEADOR 11 (auditoria OpenAI, 21/08/2026) — FRENTE E FUNDO DISCORDAVAM.
    // A tela de pedidos passou a considerar 'delivery_pendente' como "pode gerar
    // etiqueta", mas aqui só 'delivery' passava — e o pedido pendente caía no
    // rótulo 'retirada_na_loja', que é justamente a mentira que o F9 corrigiu:
    // o cliente PAGOU frete, aquilo nunca foi retirada. O operador clicava,
    // recebia "retirada na loja" e não tinha o que fazer com a informação.
    //
    // 'delivery_pendente' agora tem motivo próprio e instrução. A tela deixou de
    // oferecer o botão nesse estado (ver src/pages/CatalogOrdersAdmin.jsx): o
    // pedido vira 'delivery' quando o endereço é completado, e aí a etiqueta sai.
    if (raw.delivery_type === 'delivery_pendente') {
      return {
        ok: false, skipped: 'endereco_incompleto',
        detalhe: 'O comprador pagou o frete mas está sem endereço completo. Complete o endereço do pedido antes de gerar a etiqueta.',
      };
    }
    if (raw.delivery_type !== 'delivery') return { ok: false, skipped: 'retirada_na_loja' };
    if (raw.melhor_envio?.order_id) return { ok: false, skipped: 'ja_gerado' };
    const frete = raw.frete;
    if (!frete?.id) return { ok: false, skipped: 'sem_frete_id' };

    const remet = remetente();
    if (!remet) return { ok: false, skipped: 'remetente_nao_configurado' };

    const ambiente = ambienteAtual();
    const token = await getAccessToken(ambiente);
    if (!token) return { ok: false, skipped: 'melhor_envio_nao_autorizado' };

    // ══════════════════════════════════════════════════════════════════════
    // 🔴 PONTO 110 (21/08/2026) — "O comprador não tem CPF cadastrado"
    // ══════════════════════════════════════════════════════════════════════
    // O checkout da loja PEDE o CPF e o comprador digita (src/pages/Cart.jsx:591
    // manda buyer_cpf). Só que ninguém GRAVA: o createMPWalletDeposit usa esse
    // CPF apenas pra montar o `payer` da cobrança no Mercado Pago e descarta.
    // Aqui a etiqueta procurava só em app_users.cpf — vazio pra quem nunca
    // preencheu o perfil — e travava com 'destinatario_sem_cpf'.
    //
    // Não era regressão: "funcionava" quando o comprador já tinha CPF no
    // cadastro por outro motivo (KYC, cadastro antigo). Quem chegou pelo
    // checkout novo nunca teve.
    //
    // Agora são três fontes, em ordem, e a última resgata o passado:
    //   1. o cadastro (app_users.cpf) — como sempre foi;
    //   2. a própria venda (buyer_cpf na linha ou dentro do raw_base44);
    //   3. o MERCADO PAGO — o CPF que o comprador digitou VIAJOU pra lá como
    //      payer.identification.number. Se o pagamento existe, o dado existe.
    //      É o que destrava os pedidos que já estão parados hoje.
    // Achando pelo caminho 2 ou 3, grava no cadastro pra não precisar de novo.
    // 🔴 PONTO 111 (21/08/2026) — NÃO BASTA TER 11 DÍGITOS, TEM QUE SER VÁLIDO.
    // Depois do PONTO 110 o erro mudou de "comprador não tem CPF cadastrado" para
    // "O campo to.document deve ter um CPF válido": a etiqueta ACHAVA o CPF, mas
    // ele não passava no dígito verificador. Causa: nenhum checkout do sistema
    // confere o CPF digitado — Cart.jsx:591 só faz replace(/\D/g,'') e manda.
    // Então um cliente que digita errado (ou inventa) grava lixo, e o erro só
    // aparece láááá na frente, na transportadora.
    // Agora todo candidato passa por cpfValido() ANTES de ser aceito — e um CPF
    // reprovado não interrompe a busca: a função continua pras outras fontes.
    let cpfDestino = '';
    let cpfRejeitado = '';
    const aceitar = (candidato) => {
      const d = String(candidato || '').replace(/\D/g, '');
      if (!d) return false;
      if (cpfValido(d)) { cpfDestino = d; return true; }
      if (!cpfRejeitado) cpfRejeitado = d;   // guarda o 1º inválido só pro log
      return false;
    };

    let phoneDestino = String(sale.buyer_phone || '').replace(/\D/g, '');
    if (sale.buyer_id) {
      const rows = await (await sb(`app_users?select=cpf,phone&id=eq.${encodeURIComponent(sale.buyer_id)}&limit=1`)).json().catch(() => null);
      const userRow = Array.isArray(rows) ? rows[0] : null;
      aceitar(userRow?.cpf);
      if (!phoneDestino && userRow?.phone) phoneDestino = String(userRow.phone).replace(/\D/g, '');
    }

    // 2) o CPF que veio no checkout, se alguém tiver gravado na venda
    if (!cpfDestino) {
      aceitar(sale.buyer_cpf || raw.buyer_cpf || raw.customer?.cpf);
    }

    // 3) resgate no Mercado Pago — best-effort, nunca derruba a etiqueta
    if (!cpfDestino && sale.mp_payment_id && process.env.MP_ACCESS_TOKEN) {
      try {
        const r = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(sale.mp_payment_id)}`, {
          headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
        });
        if (r.ok) {
          const pay = await r.json();
          const tipo = String(pay?.payer?.identification?.type || 'CPF').toUpperCase();
          if (tipo === 'CPF' && aceitar(pay?.payer?.identification?.number)) {
            console.warn(`[ENVIO] CPF do comprador resgatado do Mercado Pago (venda ${sale.id}). Gravando no cadastro.`);
          }
        }
      } catch (e) {
        console.warn(`[ENVIO] Falha ao resgatar CPF no Mercado Pago (venda ${sale.id}):`, e?.message);
      }
    }

    // achou fora do cadastro → grava, pra próxima etiqueta não depender disso.
    // Só chega aqui CPF já validado — nunca gravamos lixo no cadastro.
    if (cpfDestino && sale.buyer_id) {
      try {
        await sb(`app_users?id=eq.${encodeURIComponent(sale.buyer_id)}&or=(cpf.is.null,cpf.eq.)`, {
          method: 'PATCH', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ cpf: cpfDestino }),
        });
      } catch (_) { /* secundário: a etiqueta sai do mesmo jeito */ }
    }

    if (!cpfDestino) {
      // Separa os dois casos, porque a AÇÃO do operador é diferente em cada um:
      //   sem CPF     → precisa PEDIR o CPF ao cliente;
      //   CPF inválido→ o cliente JÁ deu um, mas está errado/digitado errado —
      //                 conferir e corrigir, não sair pedindo de novo às cegas.
      // Antes os dois caíam na mesma mensagem e a transportadora só recusava o
      // carrinho lá na frente, com um erro que ninguém sabia de onde vinha.
      if (cpfRejeitado) {
        console.warn(`[ENVIO] Venda ${sale.id}: CPF encontrado mas REPROVADO no dígito verificador (${cpfRejeitado.slice(0, 3)}...${cpfRejeitado.slice(-2)}).`);
        return { ok: false, skipped: 'destinatario_cpf_invalido' };
      }
      return { ok: false, skipped: 'destinatario_sem_cpf' };
    }

    const addr = raw.address || {};
    const destinoCep = String(addr.zip || frete.cep || '').replace(/\D/g, '');
    if (destinoCep.length !== 8 || !addr.street || !addr.number || !addr.city || !addr.state) {
      return { ok: false, skipped: 'endereco_destino_incompleto' };
    }

    // itens e dimensões (mesma lógica da cotação, api/_lib/frete.js)
    let items = raw.items;
    if (!Array.isArray(items) || !items.length) {
      items = [{ id: sale.product_id, title: sale.product_title, qty: sale.quantity || 1, price: sale.sale_price || sale.total_amount || 0 }];
    }
    const ids = items.map((i) => String(i.id || i.product_id || '')).filter(Boolean);
    let dims = {};
    if (ids.length) {
      const rows = await (await sb(`products?select=id,peso,altura,largura,comprimento&id=in.(${ids.map((x) => `"${x}"`).join(',')})`)).json().catch(() => null);
      dims = Object.fromEntries((Array.isArray(rows) ? rows : []).map((p) => [p.id, p]));
    }
    const products = items.map((it, idx) => {
      const p = dims[String(it.id || it.product_id)] || {};
      return {
        name: String(it.title || it.desc || 'Produto').slice(0, 250),
        quantity: Math.max(1, parseInt(it.qty || it.quantity) || 1),
        unitary_value: Math.max(0.01, Number(it.price) || 0),
      };
    });
    // volume único agregado (o mesmo padrão da cotação: caixa mínima dos Correios)
    const volume = items.reduce((acc, it) => {
      const p = dims[String(it.id || it.product_id)] || {};
      const qty = Math.max(1, parseInt(it.qty || it.quantity) || 1);
      return {
        width: Math.max(acc.width, Math.max(11, Number(p.largura) || 11)),
        height: acc.height + Math.max(2, Number(p.altura) || 4) * qty,
        length: Math.max(acc.length, Math.max(16, Number(p.comprimento) || 16)),
        weight: acc.weight + Math.max(0.1, Number(p.peso) || 0.3) * qty,
      };
    }, { width: 11, height: 0, length: 16, weight: 0 });

    const cartBody = {
      service: Number(frete.id),
      from: remet,
      to: {
        name: sale.buyer_name || 'Cliente',
        phone: phoneDestino,
        email: sale.buyer_email || undefined,
        document: cpfDestino,
        address: addr.street,
        number: addr.number,
        complement: addr.complement || undefined,
        district: addr.neighborhood || undefined,
        city: addr.city,
        state_abbr: addr.state,
        postal_code: destinoCep,
        country_id: 'BR',
      },
      products,
      volumes: [{ height: Math.max(2, Math.round(volume.height)), width: Math.round(volume.width), length: Math.round(volume.length), weight: Math.max(0.1, Math.round(volume.weight * 100) / 100) }],
      options: { insurance_value: Math.max(0, Number(sale.total_amount) || 0), receipt: false, own_hand: false, reverse: false, non_commercial: true, platform: 'Leilao NoZap' },
    };

    const API = baseUrl(ambiente);
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': UA };

    // 1) adiciona ao carrinho
    const cartResp = await fetch(`${API}/api/v2/me/cart`, { method: 'POST', headers, body: JSON.stringify(cartBody) });
    const cartData = await cartResp.json().catch(() => null);
    if (!cartResp.ok || !cartData?.id) {
      return { ok: false, skipped: 'cart_falhou', detalhe: cartData?.message || JSON.stringify(cartData || {}).slice(0, 300) };
    }
    const orderId = cartData.id;

    // 2) compra a etiqueta (gasta saldo da conta Melhor Envio)
    const checkoutResp = await fetch(`${API}/api/v2/me/shipment/checkout`, { method: 'POST', headers, body: JSON.stringify({ orders: [orderId] }) });
    const checkoutData = await checkoutResp.json().catch(() => null);
    if (!checkoutResp.ok || checkoutData?.purchase?.orders?.[0]?.status === 'error') {
      return { ok: false, skipped: 'checkout_falhou', order_id: orderId, detalhe: checkoutData?.message || JSON.stringify(checkoutData || {}).slice(0, 300) };
    }

    // 3) gera a etiqueta para impressão
    let labelUrl = null;
    try {
      const genResp = await fetch(`${API}/api/v2/me/shipment/generate`, { method: 'POST', headers, body: JSON.stringify({ orders: [orderId] }) });
      const genData = await genResp.json().catch(() => null);
      labelUrl = genData?.[orderId]?.url || null;
    } catch (_) { /* etiqueta pode ser impressa depois manualmente pelo painel do ME */ }

    const protocol = checkoutData?.purchase?.orders?.[0]?.protocol || cartData?.protocol || null;
    await sb(`catalog_sales?id=eq.${sale.id}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ raw_base44: { ...raw, melhor_envio: { order_id: orderId, protocol, label_url: labelUrl, ambiente, criado_em: new Date().toISOString() } } }),
    });

    return { ok: true, order_id: orderId, protocol, label_url: labelUrl };
  } catch (e) {
    console.error(`[MelhorEnvio] Falha ao gerar envio automático (venda ${sale?.id}):`, e?.message);
    return { ok: false, skipped: 'erro_inesperado', detalhe: String(e?.message || e) };
  }
}