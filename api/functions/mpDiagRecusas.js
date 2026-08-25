// mpDiagRecusas — POR QUE O MERCADO PAGO ESTÁ RECUSANDO OS CARTÕES.
//
// ══════════════════════════════════════════════════════════════════════════════
// PARA QUE SERVE
// ══════════════════════════════════════════════════════════════════════════════
// Quando o Mercado Pago recusa um cartão, ele diz o motivo num campo chamado
// `status_detail`. Esse motivo NUNCA é guardado do nosso lado — o mpWebhook não
// grava, e a tela do cliente só mostra "pagamento recusado".
//
// Resultado: a operação fica às cegas. Sabe-se que recusou, não se sabe por quê.
// E cada motivo pede uma ação completamente diferente:
//
//   cc_rejected_high_risk              antifraude do MP — falta dado do pagador
//   cc_rejected_insufficient_amount    limite/saldo do cliente
//   cc_rejected_bad_filled_card_number número do cartão errado
//   cc_rejected_bad_filled_security_code  CVV errado
//   cc_rejected_bad_filled_date        validade errada
//   cc_rejected_call_for_authorize     o banco pede autorização do titular
//   cc_rejected_card_disabled          cartão bloqueado no emissor
//   cc_rejected_duplicated_payment     mesma compra repetida
//   cc_rejected_max_attempts           tentativas demais
//
// Sem esse dado, qualquer conserto é chute. Este endpoint busca direto na API do
// Mercado Pago, usando a credencial que o servidor já tem — não precisa de acesso
// ao painel deles.
//
// ══════════════════════════════════════════════════════════════════════════════
// SEGURANÇA
// ══════════════════════════════════════════════════════════════════════════════
// • Protegido pela mesma DIAG_KEY das outras ferramentas de diagnóstico.
// • SOMENTE LEITURA — só faz GET na API do Mercado Pago. Não cria, não altera e
//   não cancela pagamento nenhum.
// • NUNCA devolve o MP_ACCESS_TOKEN, nem número de cartão. O que volta do MP já
//   vem mascarado (só os 4 últimos dígitos), e ainda assim escolhemos campo a
//   campo o que sai na resposta.
//
// ══════════════════════════════════════════════════════════════════════════════
// COMO USAR
// ══════════════════════════════════════════════════════════════════════════════
// Últimas recusas (responde "é sistêmico ou foi um caso?"):
//   { "key": "<DIAG_KEY>" }
//
// Uma operação específica (o número que aparece na tela de recusa):
//   { "key": "<DIAG_KEY>", "payment_id": "175549249418" }

const MP_TOKEN = process.env.MP_ACCESS_TOKEN;

// Busca no MP. Só GET — este arquivo não tem nenhum caminho de escrita.
async function mpGet(caminho) {
  try {
    const r = await fetch(`https://api.mercadopago.com${caminho}`, {
      headers: { Authorization: `Bearer ${MP_TOKEN}` },
    });
    const texto = await r.text();
    let json = null;
    try { json = JSON.parse(texto); } catch { /* resposta não era JSON */ }
    return { ok: r.ok, status: r.status, json, texto: json ? undefined : texto.slice(0, 300) };
  } catch (e) {
    return { ok: false, status: 0, erro: String(e?.cause?.code || e?.message || e) };
  }
}

// Traduz o código do MP para português de gente, e diz de quem é a ação.
const EXPLICA = {
  // 🔴 CORRIGIDO 25/08/2026 — EU ATRIBUÍA ESSA RECUSA À FALTA DE DADO DO PAGADOR.
  // Estava errado, e o dado provou. Depois da #112 a venda 174621461781 (Veronica)
  // foi ao Mercado Pago com NOME, TELEFONE, ENDEREÇO e ENDEREÇO DE ENTREGA completos
  // — e ainda assim levou cc_rejected_high_risk.
  //
  // Mandar o pagador completo continua certo (é recomendação do próprio MP), mas não
  // era a causa. O que o conjunto das 30 recusas mostra:
  //   • high_risk também em PIX (3× R$ 1.000.000 em 06/08) — e PIX não analisa o
  //     comprador. Recusa por risco em PIX olha para quem RECEBE.
  //   • high_risk também em Link de pagamento, valores de R$ 8 a R$ 1.000.000.
  //   • compradores diferentes, cartões diferentes, IPs diferentes, dias diferentes.
  // O único denominador comum é a conta. Isso não se resolve no código.
  cc_rejected_high_risk: {
    txt: 'Antifraude do Mercado Pago recusou por risco.',
    acao: 'CONTA — se o pagador foi enviado completo, a análise é da nossa conta no MP. Abrir chamado no Mercado Pago.',
  },
  cc_rejected_insufficient_amount: { txt: 'Limite ou saldo insuficiente no cartão.', acao: 'DO CLIENTE.' },
  cc_rejected_bad_filled_card_number: { txt: 'Número do cartão digitado errado.', acao: 'DO CLIENTE.' },
  cc_rejected_bad_filled_security_code: { txt: 'Código de segurança (CVV) errado.', acao: 'DO CLIENTE.' },
  cc_rejected_bad_filled_date: { txt: 'Data de validade errada.', acao: 'DO CLIENTE.' },
  cc_rejected_bad_filled_other: { txt: 'Algum dado do cartão está errado.', acao: 'DO CLIENTE.' },
  cc_rejected_call_for_authorize: { txt: 'O banco pede que o titular autorize a compra.', acao: 'DO CLIENTE — ligar para o banco.' },
  cc_rejected_card_disabled: { txt: 'Cartão bloqueado ou não habilitado para compra online.', acao: 'DO CLIENTE.' },
  cc_rejected_duplicated_payment: { txt: 'Pagamento igual a outro feito há pouco.', acao: 'DO CLIENTE — esperar ou trocar de cartão.' },
  cc_rejected_max_attempts: { txt: 'Tentativas demais no mesmo cartão.', acao: 'DO CLIENTE — aguardar.' },
  cc_rejected_card_type_not_allowed: { txt: 'Tipo de cartão não aceito nesta conta.', acao: 'CONTA — configuração no Mercado Pago.' },
  cc_rejected_blacklist: { txt: 'Cartão em lista de restrição do Mercado Pago.', acao: 'DO CLIENTE.' },
  cc_rejected_other_reason: { txt: 'Recusado pelo emissor, sem motivo detalhado.', acao: 'DO CLIENTE — tentar outro cartão.' },
  rejected_high_risk: { txt: 'Antifraude do Mercado Pago recusou por risco.', acao: 'CONTA — aparece até em PIX, que não analisa comprador. É a nossa conta no MP.' },
  cc_rejected_3ds_challenge: { txt: 'O cartão exigiu a verificação 3-D Secure e ela não foi concluída.', acao: 'DO CLIENTE — refazer e concluir a verificação do banco.' },
};

// Recorta só o que interessa. Nada de token, nada de número de cartão.
function resumir(p, incluirBruto = false) {
  if (!p) return null;
  const detalhe = p.status_detail || null;
  const e = EXPLICA[detalhe] || null;
  return {
    id: p.id,
    quando: p.date_created,
    valor: p.transaction_amount,
    situacao: p.status,
    motivo_codigo: detalhe,
    motivo: e ? e.txt : '(código não catalogado — me manda que eu traduzo)',
    de_quem_e_a_acao: e ? e.acao : '(a definir)',
    meio: p.payment_method_id,
    bandeira: p.payment_type_id,
    parcelas: p.installments,
    pedido: p.external_reference,

    // 👇 O QUE NÓS MANDAMOS. É aqui que se vê se falta dado do pagador —
    // a causa mais comum de recusa por risco no Brasil.
    // 🔴 CORREÇÃO 25/08/2026 — EU ESTAVA LENDO O CAMPO ERRADO.
    //
    // Num pagamento de Checkout Pro existem DOIS lugares com dado de pagador:
    //   • `payer`                  → a conta Mercado Pago de quem pagou. Fica
    //                                vazia quando a pessoa paga como visitante.
    //   • `additional_info.payer`  → O QUE NÓS ENVIAMOS na preferência.
    //
    // A primeira versão só olhava `payer`, e por isso deu "NÃO ENVIADO" em tudo —
    // inclusive nas vendas de maquininha, que nem passam pelo nosso código. Esse
    // resultado impossível foi o que denunciou o erro.
    //
    // Agora os dois vão na resposta, e o `bruto` vai sem interpretação nenhuma:
    // é o objeto do Mercado Pago do jeito que ele mandou, pra decidir olhando o
    // dado real em vez de adivinhar em qual campo procurar.
    //
    // Seguro de expor: nem `payer` nem `additional_info` carregam número de
    // cartão — isso vive em `card`, que não sai daqui.
    conta_mp_de_quem_pagou: {
      email: p.payer?.email || null,
      cpf: p.payer?.identification?.number ? 'enviado' : 'NÃO ENVIADO',
      nome: p.payer?.first_name ? 'enviado' : 'NÃO ENVIADO',
      telefone: p.payer?.phone?.number ? 'enviado' : 'NÃO ENVIADO',
      endereco: p.payer?.address?.zip_code ? 'enviado' : 'NÃO ENVIADO',
    },
    o_que_nos_enviamos: {
      email: p.additional_info?.payer?.email || null,
      cpf: p.additional_info?.payer?.identification?.number ? 'enviado' : 'NÃO ENVIADO',
      nome: p.additional_info?.payer?.first_name ? 'enviado' : 'NÃO ENVIADO',
      telefone: p.additional_info?.payer?.phone?.number ? 'enviado' : 'NÃO ENVIADO',
      endereco: p.additional_info?.payer?.address?.zip_code ? 'enviado' : 'NÃO ENVIADO',
      entrega: p.additional_info?.shipments?.receiver_address ? 'enviada' : 'NÃO ENVIADA',
      itens: Array.isArray(p.additional_info?.items) ? p.additional_info.items.length : 0,
    },
    ...(incluirBruto ? { bruto: { payer: p.payer || null, additional_info: p.additional_info || null } } : {}),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// A CONFERÊNCIA QUE NÃO DEPENDE DE INTERPRETAÇÃO
// ══════════════════════════════════════════════════════════════════════════════
// `additional_info.payer` é o que o Mercado Pago DECIDIU guardar do que recebeu —
// e não está escrito em lugar nenhum que ele copie tudo pra lá. Olhar só esse campo
// e concluir "não mandamos" é chute com cara de prova.
//
// A requisição original que o nosso servidor mandou fica guardada no MP como
// PREFERÊNCIA, e dá pra pedir ela de volta inteira. O caminho:
//
//   pagamento  →  p.order.id       (o pedido do MP)
//   pedido     →  preference_id    (a nossa requisição)
//   preferência→  payer / shipments  ← o documento que O NOSSO CÓDIGO escreveu
//
// Aqui não tem tradução: é o que saiu daqui, do jeito que saiu.
async function conferirPreferencia(p) {
  // Caminho 1: pagamento → pedido → preferência.
  let prefId = null;
  let comoAchei = null;
  const pedidoId = p?.order?.id;
  if (pedidoId) {
    const pedido = await mpGet(`/merchant_orders/${pedidoId}`);
    if (pedido.json?.preference_id) { prefId = pedido.json.preference_id; comoAchei = 'pelo pedido do MP'; }
  }

  // Caminho 2 (25/08/2026): o caminho 1 voltou 403 na prática — o token não enxerga
  // /merchant_orders. Mas dá pra achar a preferência pelo NOSSO número de venda, que
  // vai na requisição como external_reference. Filtro documentado no SDK oficial
  // (PreferenceSearchOptions.external_reference).
  if (!prefId && p?.external_reference) {
    const busca = await mpGet(`/checkout/preferences/search?external_reference=${encodeURIComponent(p.external_reference)}`);
    const achada = busca.json?.elements?.[0];
    if (achada?.id) { prefId = achada.id; comoAchei = 'pelo número da venda (external_reference)'; }
  }

  if (!prefId) {
    return {
      conferido: false,
      porque: 'não consegui localizar a requisição original nem pelo pedido do MP nem pelo número da venda',
      numero_da_venda: p?.external_reference || null,
    };
  }

  const pref = await mpGet(`/checkout/preferences/${prefId}`);
  if (!pref.ok || !pref.json) return { conferido: false, porque: 'não consegui ler a preferência', resposta_do_mp: pref.status };

  const pf = pref.json.payer || {};
  const sh = pref.json.shipments || {};
  return {
    conferido: true,
    preference_id: prefId,
    achei: comoAchei,
    quando_foi_criada: pref.json.date_created || null,
    // 👇 ISTO é o que o nosso servidor mandou. Sem interpretação.
    o_que_o_nosso_servidor_mandou: {
      nome: pf.name || null,
      sobrenome: pf.surname || null,
      email: pf.email || null,
      cpf: pf.identification?.number ? 'enviado' : 'NÃO ENVIADO',
      telefone: pf.phone?.number ? `enviado (${pf.phone.area_code || '??'}) ${pf.phone.number}` : 'NÃO ENVIADO',
      endereco: pf.address?.zip_code ? `enviado (CEP ${pf.address.zip_code})` : 'NÃO ENVIADO',
      entrega: sh.receiver_address?.zip_code ? `enviada (CEP ${sh.receiver_address.zip_code})` : 'NÃO ENVIADA',
      nome_na_fatura: pref.json.statement_descriptor || 'NÃO ENVIADO',
    },
    // Se estes quatro estiverem preenchidos, a correção de 25/08 está no ar.
    // Se estiverem vazios, esta compra rodou no código antigo (ou caiu na rede
    // de segurança do createMPCatalogCardCheckout — aí o log da Vercel diz por quê).
    veredito: pf.phone?.number
      ? 'A CORREÇÃO ESTÁ NO AR — o telefone saiu daqui.'
      : 'ESTA COMPRA NÃO LEVOU TELEFONE. Ou rodou no código antigo, ou caiu na rede de segurança.',
    bruto: { payer: pref.json.payer || null, shipments: pref.json.shipments || null },
  };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    const body = typeof req.body === 'object' && req.body ? req.body : {};
    if (!process.env.DIAG_KEY || body.key !== process.env.DIAG_KEY) {
      return res.status(403).json({ error: 'forbidden' });
    }
    if (!MP_TOKEN) return res.status(500).json({ error: 'MP_ACCESS_TOKEN ausente no servidor' });

    // ── Modo 1: uma operação específica ──────────────────────────────────────
    const pagamentoId = String(body.payment_id || '').replace(/\D/g, '');
    if (pagamentoId) {
      const r = await mpGet(`/v1/payments/${pagamentoId}`);
      if (!r.ok) {
        return res.status(200).json({
          encontrado: false,
          dica: 'O número da tela de recusa nem sempre é o id do pagamento. Rode sem "payment_id" para ver as últimas recusas.',
          resposta_do_mp: { status: r.status, corpo: r.json || r.texto, erro: r.erro },
        });
      }
      return res.status(200).json({
        encontrado: true,
        pagamento: resumir(r.json, true),
        conferencia_da_requisicao: await conferirPreferencia(r.json),
      });
    }

    // ── Modo 2: últimas recusas — responde se é sistêmico ────────────────────
    const busca = await mpGet('/v1/payments/search?status=rejected&sort=date_created&criteria=desc&limit=30');
    if (!busca.ok) {
      return res.status(200).json({
        erro: 'Não consegui consultar o Mercado Pago',
        resposta_do_mp: { status: busca.status, corpo: busca.json || busca.texto, erro: busca.erro },
      });
    }

    const lista = (busca.json?.results || []).map(resumir);

    // Agrupa por motivo — é isso que mostra se é UM problema ou vários.
    const porMotivo = {};
    for (const p of lista) {
      const k = p.motivo_codigo || '(sem motivo)';
      if (!porMotivo[k]) porMotivo[k] = { vezes: 0, motivo: p.motivo, de_quem_e_a_acao: p.de_quem_e_a_acao };
      porMotivo[k].vezes++;
    }

    // Se o pagador vai incompleto em TODAS, a causa é nossa e é sistêmica.
    // Conta em cima de `o_que_nos_enviamos` — é o único que fala do NOSSO código.
    const semTelefone = lista.filter((p) => p.o_que_nos_enviamos.telefone === 'NÃO ENVIADO').length;
    const semEndereco = lista.filter((p) => p.o_que_nos_enviamos.endereco === 'NÃO ENVIADO').length;
    const semCpf = lista.filter((p) => p.o_que_nos_enviamos.cpf === 'NÃO ENVIADO').length;
    const semEntrega = lista.filter((p) => p.o_que_nos_enviamos.entrega === 'NÃO ENVIADA').length;

    return res.status(200).json({
      total_recusas_recentes: lista.length,
      resumo_por_motivo: Object.entries(porMotivo)
        .sort((a, b) => b[1].vezes - a[1].vezes)
        .map(([codigo, v]) => ({ codigo, ...v })),
      o_que_deixamos_de_enviar: {
        sem_cpf: semCpf,
        sem_telefone: semTelefone,
        sem_endereco: semEndereco,
        sem_dados_de_entrega: semEntrega,
        de: lista.length,
      },
      recusas: lista,
    });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
