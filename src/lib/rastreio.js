// 📦 RASTREIO DO PEDIDO — a verdade da entrega, separada da verdade do pagamento.
//
// 🔴 POR QUE ESTE ARQUIVO EXISTE (30/09/2026)
//
// O cliente Herbert abriu "Acompanhar Pedido" e leu "Entregue! 🎉" com as quatro
// etapas verdes. O objeto estava nos Correios com "endereço inexistente", à
// espera de uma unidade de retirada. Ele mandou o print no grupo: "no site fala
// que entregou, mas não entregou".
//
// Duas causas, as duas aqui dentro:
//
//   1. `catalog_sales.status = 'entregue'` é a palavra herdada do Base44 para
//      VENDA PAGA (489 vendas estão assim — ver api/_lib/statusVenda.js). A tela
//      traduzia o status de PAGAMENTO como status de ENTREGA. Toda venda paga
//      aparecia entregue.
//   2. O "código de rastreio" LZCD75EEB9 era o número interno do pedido
//      ("LZ" + começo do id, ver regrasDosAvisos.js). Não rastreia nada.
//
// Regra nova, em JS puro e testada no Node:
//   • a ENTREGA só sai do que a transportadora, o Melhor Envio, a logística
//     (fulfillment_status) ou o próprio cliente (recebimento confirmado) disseram;
//   • o status de pagamento decide só "pago / não pago / cancelado";
//   • "Entregue" só com prova: delivered_at, evento de entrega, ou confirmação.

export const ETAPAS = Object.freeze([
  'aguardando_pagamento', 'preparando', 'postado', 'em_transito', 'saiu_entrega', 'problema', 'entregue', 'cancelado',
]);

const PAGO = ['paid', 'pago', 'confirmado', 'concluido', 'preparando', 'enviado', 'saiu_entrega', 'shipped', 'delivered', 'entregue', 'processing'];
const CANCELADO = ['canceled', 'cancelado', 'cancelled'];

/** "LZ" + 8 hex (loja) ou "AR" + 8 hex (arremate) = número interno do pedido, não rastreio. */
export function ehCodigoInterno(codigo) {
  return /^(LZ|AR)[0-9A-F]{8}$/i.test(String(codigo || '').trim());
}

/** Padrão dos Correios: 2 letras + 9 dígitos + BR. */
export function ehCodigoCorreios(codigo) {
  return /^[A-Z]{2}\d{9}[A-Z]{2}$/i.test(String(codigo || '').trim());
}

/** O código que rastreia de verdade: o da transportadora, nunca o interno. */
export function codigoReal({ tracking_code, melhorEnvio } = {}) {
  const me = String(melhorEnvio?.tracking || '').trim();
  const proprio = String(tracking_code || '').trim();
  if (proprio && !ehCodigoInterno(proprio)) return proprio;
  if (me) return me;
  return '';
}

const LINKS_TRANSPORTADORA = [
  { teste: /correios/i, url: (c) => `https://rastreamento.correios.com.br/app/index.php?objeto=${encodeURIComponent(c)}` },
  { teste: /j&t|jet|j and t/i, url: (c) => `https://www.jtexpress.com.br/trajectoryQuery?waybillNo=${encodeURIComponent(c)}` },
  { teste: /jadlog/i, url: (c) => `https://www.jadlog.com.br/siteInstitucional/tracking.jad?cte=${encodeURIComponent(c)}` },
  { teste: /loggi/i, url: (c) => `https://www.loggi.com/rastreador/${encodeURIComponent(c)}` },
  { teste: /azul/i, url: (c) => `https://www.azulcargoexpress.com.br/Rastreio/Rastreio?codigo=${encodeURIComponent(c)}` },
  { teste: /latam/i, url: (c) => `https://www.latamcargo.com/pt/trackshipment?docNumber=${encodeURIComponent(c)}` },
  { teste: /buslog/i, url: (c) => `https://www.buslog.com.br/rastreio?codigo=${encodeURIComponent(c)}` },
];

/**
 * Onde o cliente confere com os próprios olhos.
 * @returns {{correios?:string, transportadora?:string, melhorRastreio?:string, melhorEnvio?:string}}
 */
export function linksDeRastreio({ codigo, transportadora, melhorEnvioTrackingUrl } = {}) {
  const c = String(codigo || '').trim();
  const links = {};
  if (!c) return links;
  if (ehCodigoCorreios(c)) links.correios = LINKS_TRANSPORTADORA[0].url(c);
  const t = String(transportadora || '');
  const achou = LINKS_TRANSPORTADORA.find((l) => l.teste.test(t));
  if (achou && !(achou === LINKS_TRANSPORTADORA[0] && links.correios)) links.transportadora = achou.url(c);
  links.melhorRastreio = `https://www.melhorrastreio.com.br/rastreio/${encodeURIComponent(c)}`;
  if (melhorEnvioTrackingUrl) links.melhorEnvio = String(melhorEnvioTrackingUrl);
  return links;
}

const RX_ENTREGUE = /objeto entregue|entregue ao destinat|entregue$|^entregue/i;
const RX_NAO_ENTREGUE = /n[ãa]o\s+(foi\s+)?entregue/i;
/** "Objeto entregue ao destinatário" sim; "Objeto não entregue" NUNCA. */
export function ehEventoDeEntrega(descricao) {
  const d = String(descricao || '');
  return RX_ENTREGUE.test(d) && !RX_NAO_ENTREGUE.test(d);
}
const RX_PROBLEMA = /n[ãa]o entregue|endere[çc]o (inexistente|incorreto|insuficiente)|aguardando retirada|dispon[ií]vel para retirada|recusad|extraviad|devolvid|devolu[çc][ãa]o|tentativa de entrega n[ãa]o efetuada|destinat[áa]rio ausente|carteiro n[ãa]o atendido/i;
const RX_SAIU = /saiu para entrega/i;
const RX_TRANSITO = /em tr[âa]nsito|encaminhado|transfer[êe]ncia|unidade de tratamento|unidade de distribui/i;
const RX_POSTADO = /postado|objeto postado|coletado|recebido pela|recebido na unidade/i;

/** Ordena eventos do mais recente para o mais antigo (datas ilegíveis vão pro fim). */
export function ordenarEventos(eventos = []) {
  return [...eventos].filter(Boolean).sort((a, b) => {
    const ta = new Date(a.data || 0).getTime();
    const tb = new Date(b.data || 0).getTime();
    return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
  });
}

/**
 * Em que pé está a ENTREGA — nunca lido do status de pagamento.
 *
 * @param {object} p
 * @param {string} p.status                 status de pagamento da venda
 * @param {string} [p.fulfillment_status]   o que a logística marcou (a_enviar…entregue)
 * @param {string} [p.shipped_at]
 * @param {string} [p.delivered_at]
 * @param {string} [p.tracking_code]
 * @param {object} [p.melhorEnvio]          {status, posted_at, delivered_at, canceled_at, expired_at, tracking}
 * @param {Array}  [p.eventos]              [{descricao, data, local}] da transportadora
 * @param {boolean}[p.recebimentoConfirmado]
 */
export function situacaoDaEntrega(p = {}) {
  const status = String(p.status || 'pending_payment').toLowerCase();
  if (CANCELADO.includes(status) || p.melhorEnvio?.canceled_at) {
    return { etapa: 'cancelado', titulo: 'Pedido cancelado', descricao: 'Este pedido foi cancelado.' };
  }
  const pago = PAGO.includes(status);
  const eventos = ordenarEventos(p.eventos || []);
  const ultimo = eventos[0] || null;
  const textoUltimo = String(ultimo?.descricao || '');
  const houveEntrega = Boolean(p.delivered_at) || Boolean(p.melhorEnvio?.delivered_at)
    || eventos.some((e) => ehEventoDeEntrega(e.descricao))
    || p.fulfillment_status === 'entregue' || Boolean(p.recebimentoConfirmado);

  if (houveEntrega) {
    const quando = p.delivered_at || p.melhorEnvio?.delivered_at || eventos.find((e) => ehEventoDeEntrega(e.descricao))?.data || null;
    return { etapa: 'entregue', titulo: 'Entregue', descricao: p.recebimentoConfirmado ? 'Você confirmou o recebimento. Obrigado!' : 'A transportadora confirmou a entrega.', quando };
  }
  if (!pago) {
    return { etapa: 'aguardando_pagamento', titulo: 'Aguardando pagamento', descricao: 'Realize o pagamento para o envio começar.' };
  }
  const codigo = codigoReal({ tracking_code: p.tracking_code, melhorEnvio: p.melhorEnvio });
  const postado = Boolean(p.melhorEnvio?.posted_at) || Boolean(p.shipped_at) || eventos.length > 0
    || ['enviado', 'saiu_entrega'].includes(String(p.fulfillment_status || '')) || (String(p.melhorEnvio?.status || '') === 'posted');

  if (ultimo && RX_PROBLEMA.test(textoUltimo)) {
    return {
      etapa: 'problema', titulo: 'Atenção na entrega', descricao: 'A transportadora registrou uma ocorrência. Veja abaixo o que ela informou e o que fazer.',
      problema: { texto: textoUltimo, detalhe: ultimo.detalhe || '', data: ultimo.data || null, local: ultimo.local || '' },
      orientacao: orientacaoDoProblema(`${textoUltimo} ${ultimo.detalhe || ''}`),
    };
  }
  if ((ultimo && RX_SAIU.test(textoUltimo)) || p.fulfillment_status === 'saiu_entrega') {
    return { etapa: 'saiu_entrega', titulo: 'Saiu para entrega', descricao: 'O objeto está com o entregador. Alguém precisa receber no endereço.', quando: ultimo?.data || null };
  }
  if (ultimo && RX_TRANSITO.test(textoUltimo)) {
    return { etapa: 'em_transito', titulo: 'A caminho', descricao: `Última movimentação: ${textoUltimo}${ultimo.local ? ` (${ultimo.local})` : ''}.`, quando: ultimo.data || null };
  }
  if (postado) {
    return {
      etapa: 'postado', titulo: 'Postado na transportadora',
      descricao: codigo ? 'O objeto já está com a transportadora. Acompanhe pelo código abaixo.' : 'O objeto foi despachado. O código de rastreio aparece aqui assim que a transportadora o registrar.',
      quando: p.melhorEnvio?.posted_at || p.shipped_at || (ultimo && RX_POSTADO.test(textoUltimo) ? ultimo.data : null) || null,
    };
  }
  return { etapa: 'preparando', titulo: 'Pagamento confirmado', descricao: 'Seu pedido está sendo preparado para o envio.' };
}

const ORDEM = ['preparando', 'postado', 'em_transito', 'saiu_entrega', 'entregue'];

/** A data mais antiga entre os eventos que casam com o padrão (quando a etapa começou). */
function inicioDaEtapa(eventos, rx) {
  const lista = ordenarEventos(eventos).filter((e) => rx.test(String(e.descricao || '')));
  return lista.length ? lista[lista.length - 1].data || null : null;
}

/** As etapas da linha do tempo, com o que já aconteceu marcado e datado. */
export function linhaDoTempo(situacao, { criadoEm, pago, postadoEm, eventos = [] } = {}) {
  const etapa = situacao?.etapa || 'preparando';
  const idx = etapa === 'problema' ? ORDEM.indexOf('em_transito') : ORDEM.indexOf(etapa);
  const feito = (nome) => etapa !== 'aguardando_pagamento' && etapa !== 'cancelado' && ORDEM.indexOf(nome) <= idx;
  const evs = eventos.filter((e) => !ehEventoDeEntrega(e?.descricao));
  return [
    { chave: 'pedido', rotulo: 'Pedido realizado', feito: true, quando: criadoEm || null },
    { chave: 'pagamento', rotulo: 'Pagamento confirmado', feito: Boolean(pago) && etapa !== 'aguardando_pagamento', dica: etapa === 'aguardando_pagamento' ? 'Aguardando pagamento' : null },
    { chave: 'postado', rotulo: 'Postado na transportadora', feito: feito('postado'), quando: feito('postado') ? postadoEm || inicioDaEtapa(evs, RX_POSTADO) : null, dica: etapa === 'preparando' ? 'Em preparação pelo vendedor' : null },
    { chave: 'em_transito', rotulo: 'A caminho', feito: feito('em_transito'), quando: feito('em_transito') ? inicioDaEtapa(evs, RX_TRANSITO) : null, dica: etapa === 'problema' ? 'Ocorrência registrada — veja o aviso' : null },
    { chave: 'saiu_entrega', rotulo: 'Saiu para entrega', feito: feito('saiu_entrega'), quando: feito('saiu_entrega') ? inicioDaEtapa(evs, RX_SAIU) : null },
    { chave: 'entregue', rotulo: 'Entregue', feito: etapa === 'entregue', quando: etapa === 'entregue' ? situacao?.quando || null : null },
  ];
}

/** Rótulo curto do pedido na lista — a mesma regra, em uma palavra. */
export function rotuloDaEntrega(situacao) {
  return ({
    aguardando_pagamento: 'Aguardando pagamento',
    preparando: 'Pago · em preparação',
    postado: 'Postado',
    em_transito: 'A caminho',
    saiu_entrega: 'Saiu para entrega',
    problema: 'Atenção na entrega',
    entregue: 'Entregue',
    cancelado: 'Cancelado',
  })[situacao?.etapa] || 'Em andamento';
}

/**
 * Eventos no formato do rastreio público dos Correios (sro-rastro) → nosso formato.
 * Tolerante: qualquer campo faltando vira string vazia, nunca quebra a tela.
 */
export function eventosDosCorreios(json) {
  const obj = Array.isArray(json?.objetos) ? json.objetos[0] : null;
  const lista = Array.isArray(obj?.eventos) ? obj.eventos : [];
  return lista.map((e) => {
    const cidade = e?.unidade?.endereco?.cidade || '';
    const uf = e?.unidade?.endereco?.uf || '';
    const local = [cidade, uf].filter(Boolean).join(' - ');
    return {
      descricao: String(e?.descricao || '').trim(),
      detalhe: String(e?.detalhe || '').trim(),
      data: e?.dtHrCriado || null,
      local,
      fonte: 'correios',
    };
  }).filter((e) => e.descricao);
}

/** A mensagem pronta para o suporte — com número do pedido e código, para ninguém ter que digitar. */
export function mensagemDoSuporte({ numeroPedido, codigo, produto } = {}) {
  const partes = [`Olá! Preciso de ajuda com meu pedido ${numeroPedido || ''}`.trim()];
  if (codigo) partes.push(`Rastreio: ${codigo}`);
  if (produto) partes.push(`Produto: ${produto}`);
  return partes.join(' · ');
}

/** O número que o cliente vê nos avisos: "LZ" + começo do id (loja) ou "AR" (arremate). Não rastreia. */
export function numeroInternoDoPedido(saleId, prefixo = 'LZ') {
  const id = String(saleId || '').trim();
  return id ? `${prefixo}${id.slice(0, 8).toUpperCase()}` : '';
}

/** O que fazer diante da ocorrência — em linguagem de gente, sem culpar o cliente nem a loja. */
export function orientacaoDoProblema(texto) {
  const t = String(texto || '');
  if (/endere[çc]o (inexistente|incorreto|insuficiente)/i.test(t)) {
    return 'A transportadora não localizou o endereço informado. Confira o endereço do pedido abaixo e fale com o suporte: o objeto pode ficar disponível para retirada na unidade indicada ou voltar para a loja.';
  }
  if (/aguardando retirada|dispon[ií]vel para retirada/i.test(t)) {
    return 'O objeto está na unidade indicada, esperando por você. Leve um documento com foto e retire dentro do prazo.';
  }
  if (/destinat[áa]rio ausente|carteiro n[ãa]o atendido|tentativa de entrega n[ãa]o efetuada/i.test(t)) {
    return 'O entregador passou e não encontrou ninguém. Uma nova tentativa será feita; alguém precisa estar no endereço.';
  }
  if (/recusad/i.test(t)) return 'A entrega foi recusada no endereço. Se não foi você, fale com o suporte agora.';
  if (/extraviad/i.test(t)) return 'A transportadora registrou extravio. Fale com o suporte: abrimos a reclamação e cuidamos da reposição ou do reembolso.';
  if (/devolvid|devolu[çc][ãa]o/i.test(t)) return 'O objeto está voltando para a loja. Fale com o suporte para reenviar ou reembolsar.';
  return 'Fale com o suporte com o número do pedido: acompanhamos a ocorrência com a transportadora.';
}
